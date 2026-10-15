using System;
using System.Collections.Generic;
using UnityEngine;
using Rise.Data;
using Rise.Net;

namespace Rise
{
    // Crews (PLAN Phase 5): create or join by code, a shared treasury, an HQ at a member's owned property, the crew tag
    // on your card and labels, shared GPS pins, and the co-op race: a crew member in your district races the two laps
    // with you and the purse is split. Online, the crew lives in Supabase (crews, crew_members) and its channel; offline
    // it lives in the save and the loopback bus, which is how the play test exercises it.
    public partial class Session
    {
        [Serializable] public class PinMsg { public string from, name, label; public float x, y, z; }
        [Serializable] public class RaceMsg { public string from, name, kind; public float time; }   // kind: invite | accept | finish
        public class SharedPin { public string by, label; public Vector3 pos; public float until; }

        [NonSerialized] public IRealtimeTransport CrewLink;
        [NonSerialized] public readonly List<SharedPin> Pins = new List<SharedPin>();
        [NonSerialized] public string CoopPartner = "", CoopPartnerName = ""; [NonSerialized] public bool CoopInvitePending, CoopRace; [NonSerialized] public float CoopFinishTime = -1f, PartnerFinishTime = -1f;
        public int CoopWins { get; private set; }

        public bool InCrew => !string.IsNullOrEmpty(State.S.crewId);
        public string CrewTag => InCrew ? State.S.crewTag : "";

        static string MakeCode() { const string a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; var r = new System.Random(); var c = new char[6]; for (int i = 0; i < 6; i++) c[i] = a[r.Next(a.Length)]; return new string(c); }

        public void CreateCrew(string name, string tag)
        {
            if (InCrew) { State.Toast("Leave your crew first"); return; }
            if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(tag)) { State.Toast("Give the crew a name and a tag"); return; }
            var st = State.S; st.crewId = Guid.NewGuid().ToString("N"); st.crewName = name.Trim(); st.crewTag = tag.Trim().ToUpper().Substring(0, Mathf.Min(4, tag.Trim().Length)); st.crewCode = MakeCode(); st.crewTreasury = 0; st.crewHq = "";
            JoinCrewChannel();
            State.AddRep("street", 2);
            State.Toast($"Crew {st.crewName} [{st.crewTag}] formed · code {st.crewCode}");
        }

        // Offline the code is a local token; online the crew row is looked up by code (not exercised without a project).
        public void JoinCrew(string code, string name = "Crew", string tag = "CRW")
        {
            if (InCrew) { State.Toast("Leave your crew first"); return; }
            if (string.IsNullOrWhiteSpace(code)) { State.Toast("Enter a crew code"); return; }
            var st = State.S; st.crewId = "code-" + code.Trim().ToUpper(); st.crewName = name; st.crewTag = tag; st.crewCode = code.Trim().ToUpper(); st.crewTreasury = 0;
            JoinCrewChannel();
            State.Toast($"Joined crew {name} [{tag}]");
        }

        public void LeaveCrew() { var st = State.S; st.crewId = ""; st.crewName = ""; st.crewTag = ""; st.crewCode = ""; st.crewHq = ""; st.crewTreasury = 0; CrewLink?.Leave(); CrewLink = null; Pins.Clear(); State.Toast("You left the crew"); }

        void JoinCrewChannel()
        {
            CrewLink?.Leave();
            CrewLink = Players != null && Players.Transport is SupabaseRealtimeTransport && Account != null && Account.Config.Enabled ? new SupabaseRealtimeTransport(Account.Config.RealtimeUrl) : new LoopbackTransport();
            CrewLink.Join("crew:" + State.S.crewId, Players != null ? Players.SelfId : "me");
        }

        public bool CrewDeposit(int n) { if (!InCrew || !State.Pay(n)) { State.Toast("No money"); return false; } State.S.crewTreasury += n; State.Toast($"₦{n:N0} into the crew treasury · ₦{State.S.crewTreasury:N0}"); return true; }
        public bool CrewWithdraw(int n) { if (!InCrew || State.S.crewTreasury < n) { State.Toast("The treasury no reach"); return false; } State.S.crewTreasury -= n; State.Earn(n); State.Toast($"₦{n:N0} from the crew treasury"); return true; }
        public bool SetCrewHq(PropertyData p) { if (!InCrew || !State.Owns(p)) { State.Toast("The HQ must be a property you own"); return false; } State.S.crewHq = p.id; State.Toast($"Crew HQ: {p.name}"); return true; }

        public void SharePin(string label)
        {
            if (CrewLink == null) return;
            var pos = Focus.position;
            var m = new PinMsg { from = Players?.SelfId ?? "me", name = Players?.DisplayName ?? "Tunde", label = label, x = pos.x, y = pos.y, z = pos.z };
            CrewLink.Send("pin", JsonUtility.ToJson(m));
            Pins.Add(new SharedPin { by = m.name, label = label, pos = pos, until = Time.time + 300f });
            State.Toast($"Pin shared with the crew: {label}");
        }

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

        public void ForceCrewUpdate(float dt) => UpdateCrew(dt);

        void UpdateCrew(float dt)
        {
            if (CrewLink == null) return;
            CrewLink.Poll(OnCrewMessage);
            Pins.RemoveAll(p => p.until < Time.time);
            // Our own race finished: tell the partner; settle when both times are in (or the partner never finishes).
            if (CoopRace && ActiveRace == null && CoopFinishTime < 0f) { CoopFinishTime = Time.time; CrewLink.Send("race", JsonUtility.ToJson(new RaceMsg { from = Players?.SelfId ?? "me", name = Players?.DisplayName ?? "Tunde", kind = "finish", time = CoopFinishTime })); }
            if (CoopRace && CoopFinishTime >= 0f && (PartnerFinishTime >= 0f || Time.time - CoopFinishTime > 30f)) SettleCoop();
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

        void OnCrewMessage(string from, string eventName, string json)
        {
            if (eventName == "pin") { var p = JsonUtility.FromJson<PinMsg>(json); if (p != null) { Pins.Add(new SharedPin { by = p.name, label = p.label, pos = new Vector3(p.x, p.y, p.z), until = Time.time + 300f }); State.Toast($"{p.name} pinned: {p.label}"); } return; }
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
        public Vector3? NearestPin(Vector3 from) { SharedPin best = null; float bd = float.MaxValue; foreach (var p in Pins) { float d = (p.pos - from).sqrMagnitude; if (d < bd) { bd = d; best = p; } } return best?.pos; }
    }
}
