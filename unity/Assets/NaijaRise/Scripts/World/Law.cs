using System.Collections.Generic;
using UnityEngine;
using NaijaRise.Data;

namespace NaijaRise.World
{
    // Law and order (src/systems/police.js, trafficlights.js): FRSC speeding tickets, the army checkpoint, pedestrian
    // hits, running reds under LASTMA's eye, police pursuit and arrest at Heat 3+, army roadblocks at Heat 4+, and
    // laying low at your own gate.
    public class Law : MonoBehaviour
    {
        Session s; WorldData data; TrafficSystem traffic; PedestrianSystem peds; TrafficLights lights;
        float ticketT, checkT, bustT, flash, lowT, redT;
        (float, float)? lastJunction;
        readonly List<Transform> roadblocks = new List<Transform>();
        class Pursuer { public TrafficSystem.Vehicle v; public Renderer bar; public Material barMat; }
        readonly List<Pursuer> pursuers = new List<Pursuer>();
        public int PursuerCount => pursuers.Count;
        public bool Chasing { get; private set; }

        public void Init(Session session, WorldData world, TrafficSystem t, PedestrianSystem p, TrafficLights l) { s = session; data = world; traffic = t; peds = p; lights = l; }

        void Update()
        {
            if (s == null || s.State == null) return;
            float dt = Time.deltaTime; var st = s.State.S;
            ticketT -= dt; checkT -= dt; redT -= dt;
            var pos = s.Focus.position;

            if (s.Vehicle != null && s.ActiveMenu == null)
            {
                float kmh = s.Vehicle.Kmh;
                if (ticketT <= 0f && kmh > data.meta.ticketKmh && data.TryPlace("frsc", out var frsc) && (frsc.World() - pos).sqrMagnitude < 14f * 14f)
                {
                    ticketT = 60f;
                    if (s.State.Pay(data.meta.speedTicket)) s.State.Toast($"FRSC · speeding ticket ₦{data.meta.speedTicket:N0}"); else s.State.AddHeat(1, "Ran the FRSC checkpoint");
                }
                if (checkT <= 0f && kmh > data.meta.checkpointKmh && data.TryPlace("army", out var army) && (WorldData.W(army.x - 4f, 0f, army.z + 14f) - pos).sqrMagnitude < 12f * 12f)
                { checkT = 45f; s.State.AddHeat(1, "Sped past the army checkpoint"); }
                if (kmh > 25f && peds != null)
                {
                    var hit = peds.Nearest(pos, 1.9f);
                    if (hit != null) { peds.Knock(hit); s.State.AddHeat(1, "Hit a pedestrian"); }
                }
                RedLights(pos, kmh);
            }

            Chasing = st.heat >= data.meta.pursuitHeat && s.ActiveMenu == null && s.Working == null;
            flash += dt;
            if (Chasing) Pursue(pos, dt); else if (pursuers.Count > 0) CallOff();
            Roadblocks(st.heat >= 4);
            LayLow(pos, dt);
        }

        // Running a red light in sight of the LASTMA post: ₦5,000 or heat.
        void RedLights(Vector3 pos, float kmh)
        {
            if (lights == null || kmh < 12f) return;
            var h = data.RoadAt(pos, 0f); if (h == null) { lastJunction = null; return; }
            // Inside a junction means within both carriageways.
            foreach (var j in data.junctions)
            {
                var hr = data.FindRoad("h", j.z); var vr = data.FindRoad("v", j.x);
                if (hr == null || vr == null || !lights.HasLight(vr.k, hr.k)) continue;
                var c = WorldData.W(j.x, 0f, j.z);
                bool inside = Mathf.Abs(pos.x - c.x) < vr.width * 0.5f && Mathf.Abs(pos.z - c.z) < hr.width * 0.5f;
                if (!inside) { if (lastJunction == (vr.k, hr.k)) lastJunction = null; continue; }
                if (lastJunction == (vr.k, hr.k)) return;
                lastJunction = (vr.k, hr.k);
                string axis = Mathf.Abs(s.Vehicle.transform.forward.x) > 0.7f ? "h" : "v";
                if (lights.LightFor(axis) != "red" || redT > 0f) return;
                if (!data.TryPlace("lastma", out var post) || (post.World() - pos).sqrMagnitude > 45f * 45f) return;
                redT = 20f;
                if (s.State.Pay(5000)) s.State.Toast("LASTMA · ran a red light · ₦5,000 fine"); else s.State.AddHeat(1, "Ran a red light");
                return;
            }
        }

        void Pursue(Vector3 target, float dt)
        {
            // Up to two police cars leave the traffic and give chase.
            while (pursuers.Count < 2)
            {
                TrafficSystem.Vehicle best = null; float bestD = float.MaxValue;
                foreach (var v in traffic.Vehicles) { if (v.cls.id != "police") continue; float d = (v.t.position - target).sqrMagnitude; if (d < bestD) { bestD = d; best = v; } }
                if (best == null) break;
                traffic.Detach(best);
                var p = new Pursuer { v = best };
                foreach (var r in best.t.GetComponentsInChildren<Renderer>()) if (r.name == "Lightbar") { p.bar = r; p.barMat = r.material; p.barMat.EnableKeyword("_EMISSION"); }
                pursuers.Add(p);
            }
            bool near = false;
            foreach (var p in pursuers)
            {
                var pos = p.v.t.position; var to = target - pos; to.y = 0f; float d = to.magnitude;
                if (d > 1f)
                {
                    float sp = Mathf.Min(24f, 6f + d * 1.5f);
                    pos += to / d * sp * dt;
                    p.v.t.rotation = Quaternion.Slerp(p.v.t.rotation, Quaternion.LookRotation(to / d, Vector3.up), 1f - Mathf.Exp(-6f * dt));
                }
                pos.y = data.DeckHeightAt(pos) + 0.11f;
                p.v.t.position = pos;
                if (p.barMat != null) { var c = Mathf.FloorToInt(flash * 6f) % 2 == 0 ? new Color(1f, 0.13f, 0.13f) : new Color(0.13f, 0.27f, 1f); p.barMat.color = c; p.barMat.SetColor("_EmissionColor", c * 3f); }
                if (d < 4.5f) near = true;
            }
            if (near) { bustT += dt; if (bustT > data.meta.bustSeconds) { bustT = 0f; Bust(); } } else bustT = 0f;
        }

        void CallOff()
        {
            foreach (var p in pursuers) { if (p.barMat != null) { p.barMat.color = new Color(0.24f, 0.49f, 1f); p.barMat.SetColor("_EmissionColor", Color.black); } traffic.Rejoin(p.v); }
            pursuers.Clear(); bustT = 0f;
        }

        public void Bust()
        {
            var st = s.State.S; int bribe = st.heat * 5000;
            if (s.Vehicle != null) s.Vehicle.Speed = 0f;
            var m = new Menu { Title = "NPF Area C", Subtitle = "Police", Line = $"Oga, pull over. Heat {st.heat}. We fit settle am here for ₦{bribe:N0}, or you follow us go station." };
            m.Options.Add(new MenuOption { Label = $"Settle here · ₦{bribe:N0}", Action = () =>
            {
                if (!s.State.Pay(bribe)) { s.State.Toast("No money — station it is"); Arrest(); return; }
                if (Random.value < 0.6f) { st.heat = 0; CallOff(); s.State.Toast("Settled · dem let you go"); }
                else { s.State.Toast("Dem take the money and still carry you go station"); Arrest(); }
            } });
            m.Options.Add(new MenuOption { Label = "Follow them to Area C", Action = Arrest });
            s.OpenMenu(m);
        }

        public bool PoliceWithin(Vector3 pos, float radius)
        {
            float r2 = radius * radius;
            foreach (var p in pursuers) if ((p.v.t.position - pos).sqrMagnitude < r2) return true;
            foreach (var v in traffic.Vehicles) if (v.cls.id == "police" && (v.t.position - pos).sqrMagnitude < r2) return true;
            return false;
        }

        public void Arrest()
        {
            var st = s.State.S; int fine = st.heat * data.meta.bustRate;
            s.FailTaskOnArrest();
            if (!s.State.Pay(fine)) { st.cash = 0; st.bank = 0; }
            st.heat = 0;
            if (s.Vehicle != null) s.Exit();
            if (data.TryPlace("police", out var station))
            {
                var pos = WorldData.W(station.x, 0f, station.z + 12f); pos.y = data.DeckHeightAt(pos) + 0.5f;
                s.Player.Teleport(pos, 180f); s.Camera.Yaw = 180f;
            }
            CallOff();
            s.State.Toast($"Arrested · ₦{fine:N0} fine · released at Area C");
            s.State.Message("police", $"You were booked at Area C. Fine of ₦{fine:N0} paid. Next time we no go be so gentle.");
        }

        // Heat 4+: the army blocks Funsho Williams at Bode Thomas and Ogunlana Drive at Shitta.
        static readonly (float x, float z, float w, float d)[] Blocks = { (72f, 14f, 18f, 2.5f), (-72f, -14f, 18f, 2.5f) };
        void Roadblocks(bool on)
        {
            if (on && roadblocks.Count == 0)
            {
                var shader = Shader.Find("Universal Render Pipeline/Lit");
                var olive = new Material(shader) { color = new Color(0.25f, 0.35f, 0.16f) }; var cone = new Material(shader) { color = new Color(1f, 0.45f, 0.1f) };
                foreach (var b in Blocks)
                {
                    var g = GameObject.CreatePrimitive(PrimitiveType.Cube); g.name = "Army roadblock";
                    g.transform.position = WorldData.W(b.x, 0.6f, b.z); g.transform.localScale = new Vector3(b.w, 1.2f, b.d);
                    g.GetComponent<MeshRenderer>().sharedMaterial = olive; roadblocks.Add(g.transform);
                    foreach (var ox in new[] { -6f, 0f, 6f })
                    {
                        var c = GameObject.CreatePrimitive(PrimitiveType.Cylinder); c.name = "Cone";
                        c.transform.position = WorldData.W(b.x + ox, 0.4f, b.z - 2.5f); c.transform.localScale = new Vector3(0.5f, 0.4f, 0.5f);
                        c.GetComponent<MeshRenderer>().sharedMaterial = cone; Destroy(c.GetComponent<Collider>()); roadblocks.Add(c.transform);
                    }
                }
                s.State.Toast("ARMY ROADBLOCKS — Funsho Williams and Ogunlana Drive are closed");
            }
            if (!on && roadblocks.Count > 0) { foreach (var r in roadblocks) Destroy(r.gameObject); roadblocks.Clear(); }
        }

        // Stay at your own gate for ten seconds while wanted and the patrols move on (heat drops to 2).
        void LayLow(Vector3 pos, float dt)
        {
            var home = s.State.Home;
            if (Chasing && home != null && s.Vehicle == null && (home.Door - pos).sqrMagnitude < 6f * 6f)
            {
                lowT += dt;
                if (lowT > 10f) { lowT = 0f; s.State.S.heat = 2; CallOff(); s.State.Toast("You lay low at home — the patrols moved on"); }
            }
            else lowT = 0f;
        }
    }
}
