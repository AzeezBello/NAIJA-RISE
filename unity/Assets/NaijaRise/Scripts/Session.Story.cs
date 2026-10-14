using System.Collections.Generic;
using UnityEngine;
using NaijaRise.Data;
using NaijaRise.Story;
using NaijaRise.Vehicles;
using NaijaRise.World;

namespace NaijaRise
{
    // Story flow (src/systems/navigation.js, missions.js): the current mission, who to talk to, tasks (timed,
    // fragile cargo, escape, vehicle recovery), completion at the destination, failure on arrest, and the objective
    // the HUD and GPS show.
    public partial class Session
    {
        [System.NonSerialized] public Navigation Nav;
        [System.NonSerialized] public Law Law;
        VehicleController markedVehicle;

        public Mission CurrentMission => Missions.Current(State);
        public bool MissionAvailable { get { var m = CurrentMission; var st = State.S; return !st.done && (m.Requires == null || m.Requires(this)) && (string.IsNullOrEmpty(m.Arc) || m.Arc == st.arc); } }
        public bool MissionActive => MissionAvailable && !State.S.storyPaused;
        public bool HasTask => !string.IsNullOrEmpty(State.S.taskType);

        public string ObjectiveTitle => HasTask && State.S.taskMission < 0 ? "Side mission" : HasTask ? Missions.All[Mathf.Clamp(State.S.taskMission, 0, Missions.All.Count - 1)].Title : MissionAvailable ? CurrentMission.Title : State.S.done ? "Lagos is yours" : "Free roam";
        public string ObjectiveText => Racing ? RaceStatus : HasTask ? State.S.taskObj : State.S.storyPaused ? "Story paused — talk to " + Data.ContactName(CurrentMission.Who) + " to resume" : MissionAvailable ? CurrentMission.Objective(this) : State.S.done ? "Build your empire: jobs, property, business." : "";

        // Where the GPS points: the task destination, else the mission contact.
        public Vector3? ObjectivePosition
        {
            get
            {
                var st = State.S;
                if (Racing) return ActiveRace.Cps[ActiveRace.I];
                if (HasTask)
                {
                    if (st.taskType == "steal" && !st.taskTaken && markedVehicle != null) return markedVehicle.transform.position;
                    if (st.taskType == "escape") return null;
                    if (Data.TryPlace(st.taskDest, out var d)) return d.World();
                    return null;
                }
                if (!MissionActive) return null;
                var m = CurrentMission;
                foreach (var c in Contacts.Contacts) if (c.data.id == m.Who) return c.pos;
                return Data.TryPlace(m.At, out var p) ? p.World() : (Vector3?)null;
            }
        }

        // Point the GPS at the current objective right away (the per-frame update would lag one frame).
        public void RefreshNav() { if (Nav == null) return; Nav.Target = ObjectivePosition; Nav.Refresh(Focus.position); }

        bool IsMissionContact(ContactSystem.Contact c) => MissionAvailable && !HasTask && CurrentMission.Who == c.data.id;

        // The story dialogue for the mission's contact: the lines, then the choices (or Continue), then the jobs.
        void OpenStoryDialogue(ContactSystem.Contact c)
        {
            var m = CurrentMission;
            State.S.storyPaused = false;
            var text = new System.Text.StringBuilder();
            foreach (var l in m.Lines(this)) text.Append(text.Length > 0 ? "\n" : "").Append(l.Text);
            var menu = new Menu { Title = c.data.name, Subtitle = m.Title, Line = text.ToString() };
            if (m.Choices != null && m.Choices.Length > 0)
                foreach (var ch in m.Choices) { var choice = ch; menu.Options.Add(new MenuOption { Label = ch.Label, Action = () => { if (choice.Apply == null || choice.Apply(this)) { State.Message(c.data.id, choice.Reply); CompleteMission(m); } } }); }
            else menu.Options.Add(new MenuOption { Label = "Continue", Action = () => CompleteMission(m) });
            menu.Options.Add(new MenuOption { Label = "Not now — I go find another hustle", Action = () => { State.S.storyPaused = true; State.Toast("Story paused. The objective card points you to jobs, property and business."); } });
            OpenMenu(menu);
        }

        void CompleteMission(Mission m)
        {
            int before = State.S.mission;
            if (m.Task != null) { StartTask(m, Missions.All.IndexOf(m)); return; }
            m.After?.Invoke(this);
            if (State.S.mission == before && !State.S.done) State.S.mission++;   // a choice may have moved the index itself (Crossroads)
            RefreshNav();
        }

        // ---- tasks (src/systems/missions.js) ----
        void StartTask(Mission m, int index)
        {
            var t = m.Task; var st = State.S;
            st.taskType = t.Type; st.taskDest = t.Dest ?? ""; st.taskItem = t.Item ?? ""; st.taskObj = t.Obj; st.taskMission = index; st.taskClear = 0f; st.taskTaken = false; st.taskMaxKmh = t.MaxKmh;
            if (!string.IsNullOrEmpty(t.Item)) State.AddItem(t.Item);
            if (t.Type == "timed") st.taskDeadline = Clock.Clock + t.Minutes / 60f;
            if (t.Type == "escape") st.heat = Mathf.Max(st.heat, t.Heat);
            if (t.Type == "steal") SpawnMarkedVehicle(t.VehicleType);
            if (t.Type == "race") StartRace(0, true);
            State.Toast("Mission started · follow the GPS");
            RefreshNav();
        }

        // The sedan "near Bode Thomas" whose owner owes Baba K.
        void SpawnMarkedVehicle(string type)
        {
            var cls = Data.VehicleClass(type) ?? Data.VehicleClass("car");
            var road = Data.FindRoad("h", 0f) ?? Data.roads[0];
            var go = VehicleBodies.Build(cls, transform, new System.Random(3), out var wheels);
            var pos = road.Point(30f, road.k + road.width * 0.5f - 2.2f); pos.y = Data.DeckHeightAt(pos) + 0.12f;
            go.transform.position = pos; go.transform.rotation = Quaternion.LookRotation(road.Forward(1), Vector3.up);
            markedVehicle = go.AddComponent<VehicleController>(); markedVehicle.Setup(cls, wheels);
            Parked.Add(markedVehicle);
        }

        void UpdateTask(float dt)
        {
            if (!HasTask) return;
            var st = State.S;
            switch (st.taskType)
            {
                case "timed":
                    if (Clock.Clock > st.taskDeadline && !(Clock.Clock < 1f && st.taskDeadline > 23f)) FinishTask(false);
                    break;
                case "cargo":
                    if (Vehicle != null && Vehicle.Kmh > st.taskMaxKmh) { State.Toast("Too fast — the glassware shattered"); FinishTask(false); }
                    break;
                case "escape":
                    {
                        bool near = Law != null && Law.PoliceWithin(Focus.position, 60f);
                        st.taskClear = near ? 0f : st.taskClear + dt;
                        st.taskObj = $"Lose the police — {Mathf.Max(0f, 8f - st.taskClear):0} s clear needed{(near ? " · police nearby!" : "")}";
                        if (st.taskClear >= 8f) FinishTask(true);
                        else if (st.heat == 0) FinishTask(false);
                        break;
                    }
                case "steal":
                    if (!st.taskTaken && Vehicle != null && Vehicle == markedVehicle) { st.taskTaken = true; st.taskObj = "Drive the sedan to Dayo at Ladipo"; State.AddHeat(1, "Vehicle taken"); }
                    break;
            }
        }

        // Pressing E at the destination (src/systems/missions.js tryCompleteTask).
        public bool TaskDeliverable()
        {
            if (!HasTask) return false;
            var st = State.S;
            if (st.taskType != "timed" && st.taskType != "cargo" && st.taskType != "steal") return false;
            if (st.taskType == "steal" && (Vehicle == null || Vehicle != markedVehicle)) return false;
            return Data.TryPlace(st.taskDest, out var d) && (d.World() - Focus.position).magnitude < 13f;
        }

        public void FinishTask(bool ok)
        {
            var st = State.S;
            if (st.taskMission < 0)
            {
                if (!string.IsNullOrEmpty(st.taskItem)) State.RemoveItem(st.taskItem);
                st.taskType = ""; st.taskDest = ""; st.taskItem = ""; st.taskObj = "";
                FinishRun(ok); RefreshNav(); return;
            }
            var m = Missions.All[Mathf.Clamp(st.taskMission, 0, Missions.All.Count - 1)];
            if (!string.IsNullOrEmpty(st.taskItem)) State.RemoveItem(st.taskItem);
            st.taskType = ""; st.taskDest = ""; st.taskItem = ""; st.taskObj = "";
            if (markedVehicle != null && st.taskType == "") { if (ok) markedVehicle.Owned = true; markedVehicle = null; }
            if (ok) { m.After?.Invoke(this); if (!st.done) st.mission++; }
            else { m.Fail?.Invoke(this); State.Toast("Mission failed"); }
            RefreshNav();
        }

        // Arrest ends escapes, recoveries and deliveries; the hot delivery is lost.
        public void FailTaskOnArrest()
        {
            if (HasTask) FinishTask(false);
            if (State.S.chase) { State.S.chase = false; State.RemoveItem("package"); State.S.mission = Mathf.Max(0, State.S.mission - 1); State.Message("amaka", "Dem catch you with the package? Wahala. Come back when the heat don cool, we go try again."); }
        }
    }
}
