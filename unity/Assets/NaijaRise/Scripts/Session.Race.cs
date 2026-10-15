using UnityEngine;
using NaijaRise.Data;
using NaijaRise.Vehicles;
using NaijaRise.World;

namespace NaijaRise
{
    // Street racing (src/systems/racing.js): two laps on Funsho Williams Avenue between the Itire Road junction and the
    // south end, against Speedy's driver. Checkpoints are pink rings; the next one is the GPS target.
    public partial class Session
    {
        public class Race { public Vector3[] Cps; public int I, RivalI; public float T; public Transform Rival; public float RivalSpeed; public int Wager; public bool Mission, Finished, Won; }
        [System.NonSerialized] public Race ActiveRace;
        Transform ring;
        static readonly (float x, float z)[] Lap = { (72f, -40f), (72f, 120f), (72f, -40f), (72f, 120f) };

        public bool Racing => ActiveRace != null && !ActiveRace.Finished;
        public string RaceStatus => Racing ? $"Race · checkpoint {ActiveRace.I + 1}/{ActiveRace.Cps.Length} · rival at {ActiveRace.RivalI + 1}/{ActiveRace.Cps.Length}" : null;

        void OpenRaceMenu(ContactSystem.Contact speedy)
        {
            var menu = new Menu { Title = speedy.data.name, Subtitle = speedy.data.role, Line = speedy.data.line };
            menu.Options.Add(new MenuOption { Label = $"Race · two laps on Funsho Williams · wager ₦{Data.raceWager:N0}", Enabled = Parked.Exists(v => v.Owned), Action = () => StartRace(Data.raceWager, false) });
            menu.Options.Add(new MenuOption { Label = "Not now", Action = null });
            OpenMenu(menu);
        }

        public bool StartRace(int wager, bool mission, float rivalSpeed = 19f)
        {
            if (Racing) return false;
            if (wager > 0 && !State.Pay(wager)) { State.Toast($"You need ₦{wager:N0} for the wager"); return false; }
            var cps = new Vector3[Lap.Length];
            for (int i = 0; i < Lap.Length; i++) { cps[i] = WorldData.W(Lap[i].x, 0f, Lap[i].z); cps[i].y = Data.DeckHeightAt(cps[i]); }
            var cls = Data.VehicleClass("car");
            var rival = VehicleBodies.Build(cls, transform, new System.Random(99), out _).transform;
            foreach (var r in rival.GetComponentsInChildren<MeshRenderer>()) if (r.name == "Cube" || r.name.StartsWith("Cube")) { r.material = VehicleBodies.Mat("#d62828", 0.8f); break; }
            rival.position = WorldData.W(75f, 0.11f, -50f); rival.rotation = Quaternion.LookRotation(Vector3.back, Vector3.up);
            if (ring == null)
            {
                var g = GameObject.CreatePrimitive(PrimitiveType.Cylinder); g.name = "Race ring"; g.transform.SetParent(transform, false); g.transform.localScale = new Vector3(6.4f, 0.12f, 6.4f);
                var m = new Material(ShaderLib.Unlit) { color = new Color(1f, 0.36f, 0.62f, 0.9f) };
                g.GetComponent<MeshRenderer>().sharedMaterial = m; Destroy(g.GetComponent<Collider>()); ring = g.transform;
            }
            ring.gameObject.SetActive(true); ring.position = cps[0] + Vector3.up * 0.4f;
            ActiveRace = new Race { Cps = cps, Rival = rival, RivalSpeed = rivalSpeed, Wager = wager, Mission = mission };
            State.Toast("RACE · reach the pink ring, two laps on Funsho Williams");
            RefreshNav();
            return true;
        }

        void EndRace(bool won)
        {
            var r = ActiveRace; r.Finished = true; r.Won = won;
            if (r.Rival != null) Destroy(r.Rival.gameObject);
            if (ring != null) ring.gameObject.SetActive(false);
            if (won) { State.GainSkill("driving", 6); State.AddRep("street", 6); if (r.Wager > 0) State.Earn(r.Wager * 2); State.Toast($"You won{(r.Wager > 0 ? $" · ₦{r.Wager * 2:N0}" : "")}"); }
            else State.Toast("Speedy's crew took it");
            if (Random.value < 0.3f) State.AddHeat(1, "LASTMA clocked the race");
            if (r.Mission && HasTask && State.S.taskType == "race") FinishTask(won);
            ActiveRace = null;
            RefreshNav();
        }

        void UpdateRace(float dt)
        {
            var r = ActiveRace; if (r == null || r.Finished) return;
            r.T += dt;
            var cp = r.Cps[r.I];
            if (Vehicle != null && Vector3.Distance(Flat(Vehicle.transform.position), Flat(cp)) < 5f)
            {
                r.I++;
                if (r.I >= r.Cps.Length) { EndRace(true); return; }
                ring.position = r.Cps[r.I] + Vector3.up * 0.4f;
                State.Toast($"Checkpoint {r.I}/{r.Cps.Length}");
            }
            if (r.T > 2f && r.Rival != null)
            {
                var rc = r.Cps[r.RivalI]; var to = Flat(rc) - Flat(r.Rival.position); float d = to.magnitude;
                if (d < 3f) { r.RivalI++; if (r.RivalI >= r.Cps.Length) { EndRace(false); return; } }
                else
                {
                    var p = r.Rival.position + to / d * r.RivalSpeed * dt; p.y = Data.DeckHeightAt(p) + 0.11f;
                    r.Rival.position = p; r.Rival.rotation = Quaternion.LookRotation(to / d, Vector3.up);
                }
            }
            ring.Rotate(Vector3.up, dt * 120f);
            if (HasTask && State.S.taskType == "race") State.S.taskObj = RaceStatus;
        }

        static Vector3 Flat(Vector3 v) => new Vector3(v.x, 0f, v.z);
    }
}
