using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Networking;
using Rise.Data;
using Rise.Net;
using Rise.Story;

namespace Rise
{
    // Crews (PLAN Phase 5 & Alpha 1.1): create or join by code, shared treasury, HQ at a member's owned property, crew tag
    // on your card and labels, shared GPS pins, and multi-player Crew Co-op operations:
    //   1. Co-op Street Race (Funsho Williams two-lap race, purse split)
    //   2. Co-op Getaway (Heat-4 coordinated police escape across the district, purse split + treasury bonus)
    //   3. Co-op Convoy (3-checkpoint armoured logistics convoy from Iponri → Costain → Apapa Wharf, purse split + treasury bonus)
    // Online, the crew syncs with Supabase RPCs (create_crew, join_crew, leave_crew, crew_deposit, crew_withdraw, set_crew_hq)
    // and broadcasts over realtime:crew:<crewId>; offline it uses the local save and loopback bus.
    public partial class Session
    {
        [Serializable] public class PinMsg { public string from, name, label; public float x, y, z; }
        [Serializable] public class RaceMsg { public string from, name, kind; public float time; }   // kind: invite | accept | finish
        [Serializable] public class CoopOpMsg { public string from, name, op, kind; public float time; public int step; } // op: getaway | convoy; kind: invite | accept | finish
        [Serializable] class CrewRpcRow { public string id, name, tag, code, hq_property; public long treasury; }
        public class SharedPin { public string by, label; public Vector3 pos; public float until; }

        [NonSerialized] public IRealtimeTransport CrewLink;
        [NonSerialized] public readonly List<SharedPin> Pins = new List<SharedPin>();
        [NonSerialized] public string CoopPartner = "", CoopPartnerName = "";
        [NonSerialized] public bool CoopInvitePending, CoopRace;
        [NonSerialized] public float CoopFinishTime = -1f, PartnerFinishTime = -1f;

        // Co-op Getaway & Convoy state
        [NonSerialized] public string CoopOpInviteKind = ""; // "getaway" | "convoy"
        [NonSerialized] public bool CoopGetaway, CoopConvoy;
        [NonSerialized] public float CoopGetawayClear, CoopOpFinishTime = -1f, PartnerOpFinishTime = -1f;
        [NonSerialized] public int CoopConvoyIndex;
        static readonly string[] ConvoyRoute = { "marina", "costain", "apapa-wharf" };
        Transform convoyRing;

        public int CoopWins { get; private set; }
        public int CoopGetawayWins { get; private set; }
        public int CoopConvoyWins { get; private set; }

        public bool InCrew => !string.IsNullOrEmpty(State.S.crewId);
        public string CrewTag => InCrew ? State.S.crewTag : "";

        public Vector3? ActiveConvoyTarget
        {
            get
            {
                if (!CoopConvoy || CoopConvoyIndex < 0 || CoopConvoyIndex >= ConvoyRoute.Length) return null;
                return Data.TryPlace(ConvoyRoute[CoopConvoyIndex], out var p) ? p.World() : (Vector3?)null;
            }
        }

        static string MakeCode() { const string a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; var r = new System.Random(); var c = new char[6]; for (int i = 0; i < 6; i++) c[i] = a[r.Next(a.Length)]; return new string(c); }

        public void CreateCrew(string name, string tag)
        {
            if (InCrew) { State.Toast("Leave your crew first"); return; }
            if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(tag)) { State.Toast("Give the crew a name and a tag"); return; }
            var st = State.S; st.crewId = Guid.NewGuid().ToString("N"); st.crewName = name.Trim(); st.crewTag = tag.Trim().ToUpper().Substring(0, Mathf.Min(4, tag.Trim().Length)); st.crewCode = MakeCode(); st.crewTreasury = 0; st.crewHq = "";
            JoinCrewChannel();
            State.AddRep("street", 2);
            State.Toast($"Crew {st.crewName} [{st.crewTag}] formed · code {st.crewCode}");
            if (Account != null && Account.SignedIn)
                StartCoroutine(CallCrewRpc("create_crew", $"{{\"p_name\":\"{Account.Escape(st.crewName)}\",\"p_tag\":\"{Account.Escape(st.crewTag)}\"}}", SyncCrewRow));
        }

        public void JoinCrew(string code, string name = "Crew", string tag = "CRW")
        {
            if (InCrew) { State.Toast("Leave your crew first"); return; }
            if (string.IsNullOrWhiteSpace(code)) { State.Toast("Enter a crew code"); return; }
            var st = State.S; st.crewId = "code-" + code.Trim().ToUpper(); st.crewName = name; st.crewTag = tag; st.crewCode = code.Trim().ToUpper(); st.crewTreasury = 0;
            JoinCrewChannel();
            State.Toast($"Joined crew {name} [{tag}]");
            if (Account != null && Account.SignedIn)
                StartCoroutine(CallCrewRpc("join_crew", $"{{\"p_code\":\"{Account.Escape(st.crewCode)}\"}}", SyncCrewRow));
        }

        public void LeaveCrew()
        {
            string oldId = State.S.crewId;
            var st = State.S; st.crewId = ""; st.crewName = ""; st.crewTag = ""; st.crewCode = ""; st.crewHq = ""; st.crewTreasury = 0;
            CrewLink?.Leave(); CrewLink = null; Pins.Clear();
            State.Toast("You left the crew");
            if (Account != null && Account.SignedIn && Guid.TryParse(oldId, out var g))
                StartCoroutine(CallCrewRpc("leave_crew", $"{{\"p_crew\":\"{g}\"}}", null));
        }

        void SyncCrewRow(string json)
        {
            if (string.IsNullOrEmpty(json)) return;
            try
            {
                var row = JsonUtility.FromJson<CrewRpcRow>(json);
                if (row != null && !string.IsNullOrEmpty(row.id))
                {
                    var st = State.S;
                    st.crewId = row.id;
                    if (!string.IsNullOrEmpty(row.name)) st.crewName = row.name;
                    if (!string.IsNullOrEmpty(row.tag)) st.crewTag = row.tag;
                    if (!string.IsNullOrEmpty(row.code)) st.crewCode = row.code;
                    st.crewTreasury = (int)Mathf.Clamp(row.treasury, 0, int.MaxValue);
                    if (!string.IsNullOrEmpty(row.hq_property)) st.crewHq = row.hq_property;
                    JoinCrewChannel();
                }
            }
            catch { }
        }

        IEnumerator CallCrewRpc(string fn, string body, Action<string> onSuccess)
        {
            if (Account == null || !Account.SignedIn) yield break;
            using var req = new UnityWebRequest(Account.Config.url + "/rest/v1/rpc/" + fn, "POST");
            req.uploadHandler = new UploadHandlerRaw(System.Text.Encoding.UTF8.GetBytes(body));
            req.downloadHandler = new DownloadHandlerBuffer();
            req.SetRequestHeader("Content-Type", "application/json");
            req.SetRequestHeader("apikey", Account.Config.anonKey);
            req.SetRequestHeader("Authorization", "Bearer " + Account.AccessToken);
            yield return req.SendWebRequest();
            if (req.result == UnityWebRequest.Result.Success)
                onSuccess?.Invoke(req.downloadHandler.text);
        }

        void JoinCrewChannel()
        {
            CrewLink?.Leave();
            CrewLink = Players != null && Players.Transport is SupabaseRealtimeTransport && Account != null && Account.Config.Enabled ? new SupabaseRealtimeTransport(Account.Config.RealtimeUrl) : new LoopbackTransport();
            CrewLink.Join("crew:" + State.S.crewId, Players != null ? Players.SelfId : "me");
        }

        public bool CrewDeposit(int n)
        {
            if (!InCrew || !State.Pay(n)) { State.Toast("No money"); return false; }
            State.S.crewTreasury += n;
            State.Toast($"₦{n:N0} into the crew treasury · ₦{State.S.crewTreasury:N0}");
            if (Account != null && Account.SignedIn && Guid.TryParse(State.S.crewId, out var g))
                StartCoroutine(CallCrewRpc("crew_deposit", $"{{\"p_crew\":\"{g}\",\"p_amount\":{n}}}", null));
            return true;
        }

        public bool CrewWithdraw(int n)
        {
            if (!InCrew || State.S.crewTreasury < n) { State.Toast("The treasury no reach"); return false; }
            State.S.crewTreasury -= n;
            State.Earn(n);
            State.Toast($"₦{n:N0} from the crew treasury");
            if (Account != null && Account.SignedIn && Guid.TryParse(State.S.crewId, out var g))
                StartCoroutine(CallCrewRpc("crew_withdraw", $"{{\"p_crew\":\"{g}\",\"p_amount\":{n}}}", null));
            return true;
        }

        public bool SetCrewHq(PropertyData p)
        {
            if (!InCrew || !State.Owns(p)) { State.Toast("The HQ must be a property you own"); return false; }
            State.S.crewHq = p.id;
            State.Toast($"Crew HQ: {p.name}");
            if (Account != null && Account.SignedIn && Guid.TryParse(State.S.crewId, out var g))
                StartCoroutine(CallCrewRpc("set_crew_hq", $"{{\"p_crew\":\"{g}\",\"p_property\":\"{Account.Escape(p.id)}\"}}", null));
            return true;
        }

        public void SharePin(string label)
        {
            if (CrewLink == null) return;
            var pos = Focus.position;
            var m = new PinMsg { from = Players?.SelfId ?? "me", name = Players?.DisplayName ?? "Tunde", label = label, x = pos.x, y = pos.y, z = pos.z };
            CrewLink.Send("pin", JsonUtility.ToJson(m));
            Pins.Add(new SharedPin { by = m.name, label = label, pos = pos, until = Time.time + 300f });
            State.Toast($"Pin shared with the crew: {label}");
        }

        // ---- 1. Co-op Street Race ----
        public void InviteCoopRace()
        {
            if (CrewLink == null) { State.Toast("No crew channel"); return; }
            CrewLink.Send("race", JsonUtility.ToJson(new RaceMsg { from = Players?.SelfId ?? "me", name = Players?.DisplayName ?? "Tunde", kind = "invite" }));
            State.Toast("Co-op race invite sent to the crew");
        }

        public void AcceptCoopRace()
        {
            if (!CoopInvitePending || CrewLink == null) return;
            CoopInvitePending = false; CoopRace = true; CoopFinishTime = PartnerFinishTime = -1f;
            CrewLink.Send("race", JsonUtility.ToJson(new RaceMsg { from = Players?.SelfId ?? "me", name = Players?.DisplayName ?? "Tunde", kind = "accept" }));
            StartRace(0, false);
            State.Toast($"Co-op race with {CoopPartnerName} · two laps, purse split");
        }

        // ---- 2. Co-op Getaway (multi-player police escape) ----
        public void InviteCoopGetaway()
        {
            if (CrewLink == null) { State.Toast("No crew channel"); return; }
            CrewLink.Send("coop_op", JsonUtility.ToJson(new CoopOpMsg { from = Players?.SelfId ?? "me", name = Players?.DisplayName ?? "Tunde", op = "getaway", kind = "invite" }));
            State.Toast("Co-op Getaway invite sent to the crew");
        }

        public void AcceptCoopGetaway()
        {
            if (CrewLink == null || CoopOpInviteKind != "getaway") return;
            CoopOpInviteKind = "";
            CrewLink.Send("coop_op", JsonUtility.ToJson(new CoopOpMsg { from = Players?.SelfId ?? "me", name = Players?.DisplayName ?? "Tunde", op = "getaway", kind = "accept" }));
            BeginCoopGetaway();
        }

        void BeginCoopGetaway()
        {
            CoopGetaway = true; CoopConvoy = false;
            CoopGetawayClear = 0f;
            CoopOpFinishTime = PartnerOpFinishTime = -1f;
            State.S.heat = Mathf.Max(State.S.heat, 4);
            State.Toast($"CO-OP GETAWAY with {CoopPartnerName} · lose Heat 4 patrols for 8 s!");
            RefreshNav();
        }

        // ---- 3. Co-op Convoy (multi-player 3-checkpoint logistics convoy) ----
        public void InviteCoopConvoy()
        {
            if (CrewLink == null) { State.Toast("No crew channel"); return; }
            CrewLink.Send("coop_op", JsonUtility.ToJson(new CoopOpMsg { from = Players?.SelfId ?? "me", name = Players?.DisplayName ?? "Tunde", op = "convoy", kind = "invite" }));
            State.Toast("Co-op Convoy invite sent to the crew");
        }

        public void AcceptCoopConvoy()
        {
            if (CrewLink == null || CoopOpInviteKind != "convoy") return;
            CoopOpInviteKind = "";
            CrewLink.Send("coop_op", JsonUtility.ToJson(new CoopOpMsg { from = Players?.SelfId ?? "me", name = Players?.DisplayName ?? "Tunde", op = "convoy", kind = "accept" }));
            BeginCoopConvoy();
        }

        void BeginCoopConvoy()
        {
            CoopConvoy = true; CoopGetaway = false;
            CoopConvoyIndex = 0;
            CoopOpFinishTime = PartnerOpFinishTime = -1f;
            UpdateConvoyRing();
            State.Toast($"CO-OP CONVOY with {CoopPartnerName} · escort cargo Iponri → Costain → Apapa Wharf!");
            RefreshNav();
        }

        void UpdateConvoyRing()
        {
            var target = ActiveConvoyTarget;
            if (!target.HasValue)
            {
                if (convoyRing != null) convoyRing.gameObject.SetActive(false);
                return;
            }
            if (convoyRing == null)
            {
                var g = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                g.name = "Convoy ring";
                g.transform.SetParent(transform, false);
                g.transform.localScale = new Vector3(7f, 0.14f, 7f);
                var m = new Material(ShaderLib.Unlit) { color = new Color(1f, 0.78f, 0.18f, 0.92f) };
                g.GetComponent<MeshRenderer>().sharedMaterial = m;
                Destroy(g.GetComponent<Collider>());
                convoyRing = g.transform;
            }
            convoyRing.gameObject.SetActive(true);
            var p = target.Value;
            p.y = Data.DeckHeightAt(p) + 0.45f;
            convoyRing.position = p;
        }

        public void ForceCrewUpdate(float dt) => UpdateCrew(dt);

        void UpdateCrew(float dt)
        {
            if (CrewLink == null) return;
            CrewLink.Poll(OnCrewMessage);
            Pins.RemoveAll(p => p.until < Time.time);

            // 1. Co-op Race settlement
            if (CoopRace && ActiveRace == null && CoopFinishTime < 0f)
            {
                CoopFinishTime = Time.time;
                CrewLink.Send("race", JsonUtility.ToJson(new RaceMsg { from = Players?.SelfId ?? "me", name = Players?.DisplayName ?? "Tunde", kind = "finish", time = CoopFinishTime }));
            }
            if (CoopRace && CoopFinishTime >= 0f && (PartnerFinishTime >= 0f || Time.time - CoopFinishTime > 30f)) SettleCoop();

            // 2. Co-op Getaway progression & settlement
            if (CoopGetaway)
            {
                if (CoopOpFinishTime < 0f)
                {
                    bool near = CoopGetawayClear < 8f && Law != null && Law.PoliceWithin(Focus.position, 60f);
                    CoopGetawayClear = near ? 0f : CoopGetawayClear + dt;
                    if (CoopGetawayClear >= 8f)
                    {
                        CoopOpFinishTime = Time.time;
                        State.S.heat = 0;
                        CrewLink.Send("coop_op", JsonUtility.ToJson(new CoopOpMsg { from = Players?.SelfId ?? "me", name = Players?.DisplayName ?? "Tunde", op = "getaway", kind = "finish", time = CoopOpFinishTime }));
                        State.Toast("You lost the police! Waiting on your crew partner…");
                    }
                }
                if (CoopOpFinishTime >= 0f && (PartnerOpFinishTime >= 0f || Time.time - CoopOpFinishTime > 30f))
                    SettleCoopGetaway();
            }

            // 3. Co-op Convoy progression & settlement
            if (CoopConvoy)
            {
                if (convoyRing != null && convoyRing.gameObject.activeSelf) convoyRing.Rotate(Vector3.up, dt * 110f);
                var target = ActiveConvoyTarget;
                if (target.HasValue && Vector2.Distance(new Vector2(Focus.position.x, Focus.position.z), new Vector2(target.Value.x, target.Value.z)) < 14f)
                {
                    CoopConvoyIndex++;
                    if (CoopConvoyIndex >= ConvoyRoute.Length)
                    {
                        UpdateConvoyRing();
                        CoopOpFinishTime = Time.time;
                        CrewLink.Send("coop_op", JsonUtility.ToJson(new CoopOpMsg { from = Players?.SelfId ?? "me", name = Players?.DisplayName ?? "Tunde", op = "convoy", kind = "finish", time = CoopOpFinishTime, step = CoopConvoyIndex }));
                        State.Toast("Convoy reached Apapa Wharf! Waiting on your crew partner…");
                        RefreshNav();
                    }
                    else
                    {
                        UpdateConvoyRing();
                        State.Toast($"Convoy checkpoint {CoopConvoyIndex}/{ConvoyRoute.Length} cleared");
                        RefreshNav();
                    }
                }
                if (CoopOpFinishTime >= 0f && (PartnerOpFinishTime >= 0f || Time.time - CoopOpFinishTime > 30f))
                    SettleCoopConvoy();
            }
        }

        void SettleCoop()
        {
            CoopRace = false;
            bool first = PartnerFinishTime < 0f || CoopFinishTime <= PartnerFinishTime;
            int purse = Data.raceWager * 2, share = purse / 2;
            State.Earn(share); State.AddRep("street", first ? 6 : 3); State.AddRep("social", 4); CoopWins += first ? 1 : 0;
            State.Toast(first ? $"You led the crew home · ₦{share:N0} (purse split)" : $"{CoopPartnerName} led, you backed them · ₦{share:N0} (purse split)");
            CoopPartner = ""; CoopPartnerName = "";
        }

        void SettleCoopGetaway()
        {
            CoopGetaway = false;
            int share = Missions.Reward("coop_getaway", 60000);
            int treasuryBonus = 15000;
            State.S.heat = 0;
            State.Earn(share);
            State.S.crewTreasury += treasuryBonus;
            State.AddRep("street", 10); State.AddRep("social", 5); State.AddXp(35);
            CoopWins++; CoopGetawayWins++;
            State.Toast($"Co-op Getaway clean! +₦{share:N0} each · +₦{treasuryBonus:N0} to crew treasury");
            CoopPartner = ""; CoopPartnerName = "";
            RefreshNav();
        }

        void SettleCoopConvoy()
        {
            CoopConvoy = false;
            if (convoyRing != null) convoyRing.gameObject.SetActive(false);
            int share = Missions.Reward("coop_convoy", 90000);
            int treasuryBonus = 20000;
            State.Earn(share);
            State.S.crewTreasury += treasuryBonus;
            State.AddRep("business", 8); State.AddRep("public", 6); State.AddRep("social", 5); State.AddXp(40);
            CoopWins++; CoopConvoyWins++;
            State.Toast($"Co-op Convoy delivered! +₦{share:N0} each · +₦{treasuryBonus:N0} to crew treasury");
            CoopPartner = ""; CoopPartnerName = "";
            RefreshNav();
        }

        void OnCrewMessage(string from, string eventName, string json)
        {
            if (eventName == "pin")
            {
                var p = JsonUtility.FromJson<PinMsg>(json);
                if (p != null) { Pins.Add(new SharedPin { by = p.name, label = p.label, pos = new Vector3(p.x, p.y, p.z), until = Time.time + 300f }); State.Toast($"{p.name} pinned: {p.label}"); }
                return;
            }
            if (eventName == "coop_op")
            {
                var op = JsonUtility.FromJson<CoopOpMsg>(json);
                if (op == null) return;
                switch (op.kind)
                {
                    case "invite":
                        CoopPartner = from; CoopPartnerName = op.name; CoopOpInviteKind = op.op;
                        State.Toast($"{op.name} invites you to a Co-op {(op.op == "getaway" ? "Getaway" : "Convoy")} — accept in the Crew app");
                        break;
                    case "accept":
                        CoopPartner = from; CoopPartnerName = op.name; CoopOpInviteKind = "";
                        if (op.op == "getaway" && !CoopGetaway) BeginCoopGetaway();
                        else if (op.op == "convoy" && !CoopConvoy) BeginCoopConvoy();
                        break;
                    case "finish":
                        PartnerOpFinishTime = op.time;
                        break;
                }
                return;
            }
            if (eventName != "race") return;
            var r = JsonUtility.FromJson<RaceMsg>(json); if (r == null) return;
            switch (r.kind)
            {
                case "invite": CoopPartner = from; CoopPartnerName = r.name; CoopInvitePending = true; State.Toast($"{r.name} invites you to a co-op race — accept from the Crew app"); break;
                case "accept": CoopPartner = from; CoopPartnerName = r.name; CoopRace = true; CoopFinishTime = PartnerFinishTime = -1f; if (!Racing) StartRace(0, false); State.Toast($"{r.name} accepted · race on!"); break;
                case "finish": PartnerFinishTime = r.time; break;
            }
        }

        // Pins the GPS can point at: the nearest shared pin becomes the objective when there is no mission target.
        public Vector3? NearestPin(Vector3 from)
        {
            if (CoopConvoy && ActiveConvoyTarget.HasValue) return ActiveConvoyTarget;
            SharedPin best = null; float bd = float.MaxValue;
            foreach (var p in Pins) { float d = (p.pos - from).sqrMagnitude; if (d < bd) { bd = d; best = p; } }
            return best?.pos;
        }
    }
}
