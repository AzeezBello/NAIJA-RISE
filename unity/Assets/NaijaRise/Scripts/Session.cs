using UnityEngine;
using NaijaRise.Data;
using NaijaRise.Player;
using NaijaRise.Vehicles;
using NaijaRise.World;

namespace NaijaRise
{
    // The game loop around the player: interaction prompts (talk, work, enter / exit vehicles, buy from kiosks),
    // dialogue, shifts, driving input, vitals (stamina, fuel, driving skill), heat decay and autosave.
    public partial class Session : MonoBehaviour
    {
        // Runtime state only: nothing here is meant to be serialized into the scene or inspected as an asset.
        [System.NonSerialized] public WorldData Data; [System.NonSerialized] public GameState State; [System.NonSerialized] public DayNightCycle Clock;
        [System.NonSerialized] public PlayerController Player; [System.NonSerialized] public ThirdPersonCamera Camera;
        [System.NonSerialized] public TrafficSystem Traffic; [System.NonSerialized] public ContactSystem Contacts;

        [System.NonSerialized] public VehicleController Vehicle;        // the vehicle being driven, if any
        [System.NonSerialized] public string Prompt;                    // "TALK TO BABA K", "ENTER DANFO", …
        [System.NonSerialized] public JobData Working; [System.NonSerialized] public float WorkT, WorkDuration;   // shift in progress (real seconds)
        [System.NonSerialized] public readonly System.Collections.Generic.List<VehicleController> Parked = new System.Collections.Generic.List<VehicleController>();

        enum Target { None, Contact, Vehicle, TrafficVehicle, Kiosk, Gate, Home, Business, BusStop, Deliver, Place }
        Target target; ContactSystem.Contact targetContact; VehicleController targetVehicle; TrafficSystem.Vehicle targetTraffic; Vector3 targetKiosk;
        PropertyData targetProperty; BusinessData targetBusiness; BusStopData targetStop;
        float saveT, heatT = 45f;

        [System.NonSerialized] public TrafficLights Lights;
        int lastDay;

        public void Init(WorldData data, GameState state, DayNightCycle clock, PlayerController player, ThirdPersonCamera camera, TrafficSystem traffic, ContactSystem contacts, TrafficLights lights)
        {
            Data = data; State = state; Clock = clock; Player = player; Camera = camera; Traffic = traffic; Contacts = contacts; Lights = lights;
            lastDay = clock.Day;
            SpawnParkedVehicles();
            Traffic.PlayerObstacle = Player.transform;
        }

        public Transform Focus => Vehicle != null ? Vehicle.transform : Player.transform;

        // A new game starts with one keke of your own on the kerb of Adeniran Ogunsanya Street; buy the rest from Dayo.
        void SpawnParkedVehicles()
        {
            if (State.S.vehicles.Count > 0) { SpawnOwnedFromSave(); return; }
            var road = Data.RoadAt(Data.Spawn, 2f) ?? Data.roads[0];
            var pos = road.Point(road.Along(Data.Spawn) + 32f, road.k + road.width * 0.5f - 2.2f);
            var keke = new OwnedVehicle { id = "starter-keke", type = "keke", x = pos.x, y = 0f, z = pos.z, yaw = Quaternion.LookRotation(road.Forward(1), Vector3.up).eulerAngles.y };
            State.S.vehicles.Add(keke);
            SpawnOwned(keke);
        }

        void Update()
        {
            float dt = Time.deltaTime;
            State.PruneToasts();
            Vitals(dt);
            heatT -= dt; if (heatT <= 0f) { heatT = 45f; if (State.S.heat > 0) State.S.heat--; }
            saveT += dt; if (saveT > 15f) { saveT = 0f; AutoSave(); }

            State.TickEconomy(dt);
            if (Clock.Day != lastDay) { lastDay = Clock.Day; State.NewDay(Clock.Day); }
            UpdateTolls();
            UpdateTask(dt);
            UpdateRace(dt);
            if (Nav != null) { Nav.Target = ObjectivePosition; Nav.Tick(Focus.position); }
            Contacts.SetArrow(!HasTask && MissionActive ? CurrentMission.Who : null);

            if (Working != null) { UpdateShift(dt); return; }
            if (ActiveMenu != null) { UpdateMenu(); return; }
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

            targetProperty = NearGate(pos); targetBusiness = NearBusiness(pos); targetStop = NearBusStop(pos);

            if (TaskDeliverable()) { target = Target.Deliver; Prompt = DeliverLabel(); }
            else if (targetVehicle != null) { target = Target.Vehicle; Prompt = $"ENTER {targetVehicle.Class.name.ToUpper()}"; }
            else if (targetContact != null) { target = Target.Contact; Prompt = $"TALK TO {targetContact.data.name.ToUpper()}"; }
            else if (targetProperty != null && IsHome(targetProperty)) { target = Target.Home; Prompt = "ENTER HOME"; }
            else if (targetProperty != null) { target = Target.Gate; Prompt = $"SEE AGENT KUNLE · {targetProperty.type.ToUpper()}"; }
            else if (targetBusiness != null) { target = Target.Business; Prompt = (State.Biz(targetBusiness.id) != null ? "MANAGE " : "BUY ") + targetBusiness.name.ToUpper(); }
            else if ((targetPlace = NearPlace(pos)) != null) { target = Target.Place; Prompt = PlacePrompt(targetPlace); }
            else if (targetTraffic != null && targetTraffic.speed < 1f) { target = Target.TrafficVehicle; Prompt = $"TAKE {targetTraffic.cls.name.ToUpper()}"; }
            else if (targetStop != null) { target = Target.BusStop; Prompt = $"TAKE DANFO FROM {targetStop.shortName}"; }
            else if (NearKiosk(pos, out targetKiosk)) { target = Target.Kiosk; Prompt = "POS KIOSK · PURE WATER, SUYA"; }

            if (!Interact()) return;
            switch (target)
            {
                case Target.Vehicle: Enter(targetVehicle); break;
                case Target.TrafficVehicle: { var vc = Traffic.TakeVehicle(targetTraffic); Enter(vc); State.AddHeat(1, "Vehicle taken"); break; }
                case Target.Deliver: FinishTask(true); break;
                case Target.Contact: TalkTo(targetContact); break;
                case Target.Home: OpenHomeMenu(targetProperty); break;
                case Target.Gate: OpenGateMenu(targetProperty); break;
                case Target.Business: OpenBusinessMenu(targetBusiness); break;
                case Target.Place: OpenPlaceMenu(targetPlace); break;
                case Target.BusStop: OpenTransitMenu(targetStop); break;
                case Target.Kiosk: OpenKioskMenu(); break;
            }
        }

        string DeliverLabel()
        {
            var st = State.S;
            if (st.taskType == "steal") return "HAND THE SEDAN TO DAYO";
            if (Data.TryPlace(st.taskDest, out var d)) return $"DELIVER TO {d.name.ToUpper()}";
            return "DELIVER";
        }

        // Story first, then Dayo's dealership, then plain job dialogue.
        public void TalkTo(ContactSystem.Contact c)
        {
            if (IsMissionContact(c)) { OpenStoryDialogue(c); return; }
            if (c.data.id == "dayo") { OpenDealerMenu(c); return; }
            if (c.data.id == "speedy") { OpenRaceMenu(c); return; }
            OpenDialogue(c);
        }

        bool NearKiosk(Vector3 pos, out Vector3 kiosk)
        {
            kiosk = Vector3.zero; float best = 3.2f * 3.2f;
            foreach (var k in Data.kiosks) { var w = k.World(); float d = (new Vector3(w.x, pos.y, w.z) - pos).sqrMagnitude; if (d < best) { best = d; kiosk = w; } }
            return best < 3.2f * 3.2f;
        }

        static bool Interact() => GameInput.InteractPressed;
        static bool Decline() => GameInput.DeclinePressed;

        // ---- dialogue and shifts (src/systems/interaction.js) ----
        public void OpenDialogue(ContactSystem.Contact c)
        {
            var menu = new Menu { Title = c.data.name, Subtitle = c.data.role, Line = c.data.line };
            foreach (var j in Data.JobsAt(c.data.at))
            {
                bool ok = State.CanTake(j) && (!j.night || Clock.IsNight);
                string why = !string.IsNullOrEmpty(j.needCourse) ? $"needs the {j.needCourse} certificate" : State.S.skills.Get(j.skill) < j.min ? $"needs {j.skill} {j.min}" : j.night && !Clock.IsNight ? "night shift only" : "";
                var job = j;
                menu.Options.Add(new MenuOption { Label = ok ? $"Work shift — {j.title} · ₦{State.JobPay(j):N0} · {j.dur}h" : $"{j.title} ({why})", Enabled = ok, Action = () => StartShift(job) });
            }
            menu.Options.Add(new MenuOption { Label = "Not now — I go find another hustle", Action = () => State.Toast("The story can wait. Jobs, courses, the gym and business dey.") });
            OpenMenu(menu);
        }

        public void StartShift(JobData job, float realSeconds = 3.5f)
        {
            Working = job; WorkT = 0f; WorkDuration = realSeconds; ActiveMenu = null;
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
            float h = GameInput.Steer, gas = GameInput.Gas, brake = GameInput.Brake;
            bool boost = GameInput.Sprint, hand = GameInput.Handbrake;
            if (ScriptedInput) { gas = ScriptGas; brake = ScriptBrake; h = ScriptSteer; boost = false; hand = false; }
            Vehicle.Drive(gas, brake, boost, hand, h, State.S.fuel / 100f, dt);
            if (Vehicle.LastImpact > 2f) { State.Toast(Vehicle.LastImpact > 8f ? "Crash! Vehicle damaged" : "Scrape"); Vehicle.LastImpact = 0f; }
            bool slow = Mathf.Abs(Vehicle.Speed) < 2f;
            Prompt = null;
            if (slow && TaskDeliverable()) { Prompt = DeliverLabel(); if (Interact()) { FinishTask(true); return; } }
            else if (slow && NearFuel(Vehicle.transform.position) && State.S.fuel < 99f) { Prompt = $"REFUEL · ₦{Data.meta.refuel:N0}"; if (Interact()) { Refuel(); return; } }
            else if (slow) { Prompt = "EXIT VEHICLE"; if (Interact()) Exit(); }
        }

        // ---- save ----
        public void AutoSave()
        {
            SaveVehicles();
            var t = Vehicle != null ? Vehicle.transform : Player.transform;
            State.Save(t.position, t.eulerAngles.y, Clock.Clock, Clock.Day);
        }

        void OnApplicationQuit() => AutoSave();
    }
}
