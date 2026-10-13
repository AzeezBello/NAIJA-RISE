using UnityEngine;
using NaijaRise.Data;
using NaijaRise.Player;
using NaijaRise.Vehicles;
using NaijaRise.World;

namespace NaijaRise
{
    // The game loop around the player: interaction prompts (talk, work, enter / exit vehicles, buy from kiosks),
    // dialogue, shifts, driving input, vitals (stamina, fuel, driving skill), heat decay and autosave.
    public class Session : MonoBehaviour
    {
        // Runtime state only: nothing here is meant to be serialized into the scene or inspected as an asset.
        [System.NonSerialized] public WorldData Data; [System.NonSerialized] public GameState State; [System.NonSerialized] public DayNightCycle Clock;
        [System.NonSerialized] public PlayerController Player; [System.NonSerialized] public ThirdPersonCamera Camera;
        [System.NonSerialized] public TrafficSystem Traffic; [System.NonSerialized] public ContactSystem Contacts;

        [System.NonSerialized] public VehicleController Vehicle;        // the vehicle being driven, if any
        [System.NonSerialized] public string Prompt;                    // "TALK TO BABA K", "ENTER DANFO", …
        [System.NonSerialized] public ContactSystem.Contact Dialogue;   // open dialogue, if any
        [System.NonSerialized] public JobData DialogueJob;
        [System.NonSerialized] public JobData Working; [System.NonSerialized] public float WorkT, WorkDuration;   // shift in progress (real seconds)
        [System.NonSerialized] public readonly System.Collections.Generic.List<VehicleController> Parked = new System.Collections.Generic.List<VehicleController>();

        enum Target { None, Contact, Vehicle, TrafficVehicle, Kiosk }
        Target target; ContactSystem.Contact targetContact; VehicleController targetVehicle; TrafficSystem.Vehicle targetTraffic; Vector3 targetKiosk;
        float saveT, heatT = 45f;

        public void Init(WorldData data, GameState state, DayNightCycle clock, PlayerController player, ThirdPersonCamera camera, TrafficSystem traffic, ContactSystem contacts)
        {
            Data = data; State = state; Clock = clock; Player = player; Camera = camera; Traffic = traffic; Contacts = contacts;
            SpawnParkedVehicles();
            Traffic.PlayerObstacle = Player.transform;
        }

        // Starter vehicles parked on the kerb of Adeniran Ogunsanya Street, just south of the spawn.
        void SpawnParkedVehicles()
        {
            var rng = new System.Random(5);
            var root = new GameObject("Parked").transform; root.SetParent(transform, false);
            var road = Data.RoadAt(Data.Spawn, 2f) ?? Data.roads[0];
            float along0 = road.Along(Data.Spawn);
            int i = 0;
            foreach (var id in new[] { "car", "danfo", "keke" })
            {
                var cls = Data.VehicleClass(id); if (cls == null) continue;
                var go = VehicleBodies.Build(cls, root, rng, out var wheels);
                // Nose-to-tail along the kerb with the sedan at the front, so the first drive has open road ahead.
                float along = along0 + 14f + (2 - i) * 9f, across = road.k + road.width * 0.5f - 2.2f;
                var pos = road.Point(along, across); pos.y = Data.DeckHeightAt(pos) + 0.12f;
                go.transform.position = pos;
                go.transform.rotation = Quaternion.LookRotation(road.Forward(1), Vector3.up);
                var vc = go.AddComponent<VehicleController>(); vc.Setup(cls, wheels); vc.Owned = true;
                Parked.Add(vc);
                i++;
            }
        }

        void Update()
        {
            float dt = Time.deltaTime;
            State.PruneToasts();
            Vitals(dt);
            heatT -= dt; if (heatT <= 0f) { heatT = 45f; if (State.S.heat > 0) State.S.heat--; }
            saveT += dt; if (saveT > 15f) { saveT = 0f; AutoSave(); }

            if (Working != null) { UpdateShift(dt); return; }
            if (Dialogue != null) { UpdateDialogue(); return; }
            if (Vehicle != null) { UpdateDriving(dt); return; }
            UpdateOnFoot();
        }

        // ---- vitals (src/systems/vitals.js) ----
        void Vitals(float dt)
        {
            var s = State.S;
            if (Vehicle != null)
            {
                float v = Mathf.Abs(Vehicle.Speed);
                if (v > 0.5f) { s.fuel = Mathf.Max(0f, s.fuel - dt * 0.4f * (v / 24f)); State.GainSkill("driving", dt * 0.03f * Mathf.Min(1f, v / 15f)); }
                s.stamina = Mathf.Min(100f, s.stamina + dt * 6f);
            }
            else
            {
                bool sprinting = Player.IsRunning && Player.Speed01 > 0.6f;
                float recovery = 10f + Mathf.Min(5f, s.skills.fitness * 0.05f);
                float sprintCost = 16f * (1f - Mathf.Min(0.25f, s.skills.strength * 0.0025f));
                s.stamina = Mathf.Clamp(s.stamina + (sprinting ? -sprintCost : recovery) * dt, 0f, 100f);
                if (sprinting) State.GainSkill("fitness", dt * 0.05f);
                Player.CanSprint = s.stamina > 0f;
            }
        }

        // ---- on foot ----
        void UpdateOnFoot()
        {
            Player.InputEnabled = true;
            var pos = Player.transform.position;
            target = Target.None; Prompt = null;

            targetVehicle = null; float best = 3.6f;
            foreach (var v in Parked) { float d = Vector3.Distance(v.transform.position, pos) - v.Class.len * 0.5f; if (d < best) { best = d; targetVehicle = v; } }
            targetTraffic = Traffic.Nearest(pos, 4.2f);
            targetContact = Contacts.Nearest(pos, 3.4f);

            if (targetVehicle != null) { target = Target.Vehicle; Prompt = $"ENTER {targetVehicle.Class.name.ToUpper()}"; }
            else if (targetContact != null) { target = Target.Contact; Prompt = $"TALK TO {targetContact.data.name.ToUpper()}"; }
            else if (targetTraffic != null && targetTraffic.speed < 1f) { target = Target.TrafficVehicle; Prompt = $"TAKE {targetTraffic.cls.name.ToUpper()}"; }
            else if (NearKiosk(pos, out targetKiosk)) { target = Target.Kiosk; Prompt = $"BUY PURE WATER · ₦{Data.meta.priceWater:N0}"; }

            if (!Interact()) return;
            switch (target)
            {
                case Target.Vehicle: Enter(targetVehicle); break;
                case Target.TrafficVehicle: { var vc = Traffic.TakeVehicle(targetTraffic); Enter(vc); State.AddHeat(1, "Vehicle taken"); break; }
                case Target.Contact: OpenDialogue(targetContact); break;
                case Target.Kiosk:
                    if (!State.Pay(Data.meta.priceWater)) State.Toast("No money");
                    else { State.S.stamina = Mathf.Min(100f, State.S.stamina + 20f); State.Toast("Pure water · cold one. Stamina +20"); }
                    break;
            }
        }

        bool NearKiosk(Vector3 pos, out Vector3 kiosk)
        {
            kiosk = Vector3.zero; float best = 3.2f * 3.2f;
            foreach (var k in Data.kiosks) { var w = k.World(); float d = (new Vector3(w.x, pos.y, w.z) - pos).sqrMagnitude; if (d < best) { best = d; kiosk = w; } }
            return best < 3.2f * 3.2f;
        }

        static bool Interact() => Input.GetKeyDown(KeyCode.E) || Input.GetKeyDown(KeyCode.JoystickButton0);
        static bool Decline() => Input.GetKeyDown(KeyCode.X) || Input.GetKeyDown(KeyCode.JoystickButton1) || Input.GetKeyDown(KeyCode.Backspace);

        // ---- dialogue and shifts (src/systems/interaction.js) ----
        public void OpenDialogue(ContactSystem.Contact c)
        {
            Dialogue = c; DialogueJob = null;
            foreach (var j in Data.JobsAt(c.data.at)) { DialogueJob = j; if (State.CanTake(j)) break; }
            Player.InputEnabled = false;
        }

        void UpdateDialogue()
        {
            if (Decline()) { Dialogue = null; State.Toast("Not now — I go find another hustle"); return; }
            if (!Interact()) return;
            if (DialogueJob != null && State.CanTake(DialogueJob) && (!DialogueJob.night || Clock.IsNight)) { StartShift(DialogueJob); return; }
            Dialogue = null;
        }

        public void StartShift(JobData job, float realSeconds = 3.5f)
        {
            Working = job; WorkT = 0f; WorkDuration = realSeconds; Dialogue = null;
        }

        // Scripted input (play test, cutscenes): when on, driving reads these instead of the keyboard / pad.
        [System.NonSerialized] public bool ScriptedInput; [System.NonSerialized] public float ScriptGas, ScriptBrake, ScriptSteer;
        public void Script(float gas, float brake, float steer) { ScriptedInput = true; ScriptGas = gas; ScriptBrake = brake; ScriptSteer = steer; }
        public void EndScript() => ScriptedInput = false;

        void UpdateShift(float dt)
        {
            Player.InputEnabled = false;
            float before = WorkT; WorkT += dt;
            // The shift takes `dur` game hours, compressed into WorkDuration real seconds.
            Clock.Advance(Working.dur * Mathf.Clamp01(WorkT / WorkDuration) - Working.dur * Mathf.Clamp01(before / WorkDuration));
            if (WorkT < WorkDuration) return;
            int pay = State.JobPay(Working);
            State.Earn(pay); State.GainSkill(Working.skill, 2f); State.AddXp(Working.xp);
            State.Toast($"Shift done · +₦{pay:N0}{(pay > Working.pay ? " (skill bonus)" : "")}");
            if (!string.IsNullOrEmpty(Working.by)) State.Message(Working.by, $"Thanks for the shift. ₦{Working.pay:N0} don enter your hand.");
            Working = null;
        }

        // ---- driving ----
        public void Enter(VehicleController v)
        {
            Vehicle = v; v.SetDriven(true);
            Player.gameObject.SetActive(false);
            Camera.SetDriving(v.transform);
            Traffic.PlayerObstacle = v.transform;
            Prompt = null;
        }

        public void Exit()
        {
            var v = Vehicle; Vehicle = null;
            v.SetDriven(false);
            var pos = v.transform.position - v.transform.right * (v.Class.wid * 0.5f + 1.2f) + Vector3.up * 0.5f;
            Player.Teleport(pos, v.transform.eulerAngles.y);
            Player.gameObject.SetActive(true);
            Camera.SetDriving(null);
            Traffic.PlayerObstacle = Player.transform;
            if (!v.Owned && !Parked.Contains(v)) Parked.Add(v);   // a taken vehicle can be re-entered where you left it
        }

        void UpdateDriving(float dt)
        {
            float v = Input.GetAxisRaw("Vertical"), h = Input.GetAxisRaw("Horizontal");
            bool boost = Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift) || Input.GetKey(KeyCode.JoystickButton2);
            bool hand = Input.GetKey(KeyCode.Space);
            float gas = Mathf.Max(0f, v), brake = Mathf.Max(0f, -v);
            if (ScriptedInput) { gas = ScriptGas; brake = ScriptBrake; h = ScriptSteer; boost = false; hand = false; }
            Vehicle.Drive(gas, brake, boost, hand, h, State.S.fuel / 100f, dt);
            if (Vehicle.LastImpact > 2f) { State.Toast(Vehicle.LastImpact > 8f ? "Crash! Vehicle damaged" : "Scrape"); Vehicle.LastImpact = 0f; }
            Prompt = Mathf.Abs(Vehicle.Speed) < 2f ? "EXIT VEHICLE" : null;
            if (Mathf.Abs(Vehicle.Speed) < 2f && Interact()) Exit();
        }

        // ---- save ----
        public void AutoSave()
        {
            var t = Vehicle != null ? Vehicle.transform : Player.transform;
            State.Save(t.position, t.eulerAngles.y, Clock.Clock, Clock.Day);
        }

        void OnApplicationQuit() => AutoSave();
    }
}
