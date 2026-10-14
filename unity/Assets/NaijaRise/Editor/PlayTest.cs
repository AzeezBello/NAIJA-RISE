#if UNITY_EDITOR
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;

namespace NaijaRise.EditorTools
{
    // Headless play-mode test. Enters play mode on the Lagos scene, lets the game boot, then drives the session
    // through its main interactions (talk to Baba K, work a shift, enter and drive a parked car, exit, save and reload)
    // and exits the editor with 0 on success or 1 on failure.
    //   Unity -batchmode -nographics -projectPath unity -executeMethod NaijaRise.EditorTools.PlayTest.Run -logFile -
    [InitializeOnLoad]
    public static class PlayTest
    {
        const string Flag = "NaijaRise.PlayTest.Active";
        static int frame; static int stage; static readonly List<string> errors = new List<string>(); static readonly List<string> notes = new List<string>();
        static float stageT; static Vector3 carStart; static int cashBefore;

        static PlayTest()
        {
            if (!EditorPrefs.GetBool(Flag, false)) return;
            if (EditorApplication.isPlayingOrWillChangePlaymode) { EditorApplication.update += Tick; Application.logMessageReceived += OnLog; }
        }

        [MenuItem("NAIJA RISE/Run Play Test")]
        public static void Run()
        {
            GameState.ClearSave();
            if (!System.IO.File.Exists(SceneSetup.ScenePath)) SceneSetup.Build();
            UnityEditor.SceneManagement.EditorSceneManager.OpenScene(SceneSetup.ScenePath);
            EditorPrefs.SetBool(Flag, true);
            EditorApplication.EnterPlaymode();
        }

        static void OnLog(string msg, string stack, LogType type)
        {
            if (type != LogType.Exception && type != LogType.Error) return;
            // With -nographics there is no GPU: render targets cannot be created and URP passes complain every frame.
            // Those are not game bugs, so they are ignored on the null graphics device only.
            bool nullDevice = SystemInfo.graphicsDeviceType == UnityEngine.Rendering.GraphicsDeviceType.Null;
            if (nullDevice && (msg.Contains("RenderTexture.Create failed") || msg.Contains("Renderpass") || msg.Contains("Unable to find surface") || msg.Contains("RenderPass"))) return;
            errors.Add(type + ": " + msg);
        }

        static void Fail(string why) { errors.Add(why); Finish(); }
        static void Check(bool cond, string what) { if (cond) notes.Add("ok: " + what); else errors.Add("FAIL: " + what); }

        static void Tick()
        {
            if (!EditorApplication.isPlaying) return;
            try { Step(); }
            catch (System.Exception e) { Fail("exception in play test stage " + stage + ": " + e.Message); }
        }

        static void Step()
        {
            frame++;
            var boot = Object.FindAnyObjectByType<GameBootstrap>();
            if (boot == null || boot.Session == null) { if (frame > 300) Fail("game did not boot"); return; }
            var s = boot.Session; float dt = Time.deltaTime > 0f ? Time.deltaTime : 1f / 60f;
            stageT += dt;
            switch (stage)
            {
                case 0:   // let the city settle
                    if (frame < 30) return;
                    var traffic = boot.GetComponent<World.TrafficSystem>(); var peds = boot.GetComponent<World.PedestrianSystem>();
                    Check(traffic != null && traffic.Vehicles.Count > 50, $"traffic running ({traffic?.Vehicles.Count} vehicles)");
                    Check(s.Contacts.Contacts.Count > 10, $"contacts placed ({s.Contacts.Contacts.Count})");
                    Check(s.Parked.Count == 1 && s.Parked[0].Owned, $"starter keke parked ({s.Parked.Count})");
                    Check(boot.Player.transform.position.y > -5f && boot.Player.transform.position.y < 5f, $"player on the ground at {boot.Player.transform.position}");
                    Check(boot.Player.HasRig && boot.Player.GetComponentsInChildren<SkinnedMeshRenderer>().Length > 0 && boot.Player.AnimState == "idle", $"player wears the Ready Player Me rig, state {boot.Player.AnimState}");
                    Check(peds != null && peds.RiggedCount > 50, $"pedestrians rigged ({peds?.RiggedCount})");
                    // Walk over to Baba K and talk.
                    World.ContactSystem.Contact babak = null;
                    foreach (var c in s.Contacts.Contacts) if (c.data.id == "babak") babak = c;
                    Check(babak != null, "Baba K stands outside Ojuelegba Junction");
                    if (babak == null) { Finish(); return; }
                    boot.Player.Teleport(babak.pos + new Vector3(1.5f, 0.3f, 0f), 0f);
                    // Story: The First Run. Take the clean path.
                    Check(s.MissionActive && s.CurrentMission.Title == "The First Run" && s.Nav != null && s.Nav.Target != null, $"objective '{s.ObjectiveText}', GPS {s.Nav?.RouteLength:0} m");
                    s.TalkTo(babak);
                    Check(s.ActiveMenu != null && s.ActiveMenu.Subtitle == "The First Run" && s.ActiveMenu.Options.Count == 3, "story dialogue with two choices");
                    s.Choose(1);
                    Check(s.State.S.path == "legit" && s.State.Has("documents") && s.State.S.mission == 1, $"took the clean one: carrying {string.Join(",", s.State.S.items)}, mission {s.State.S.mission}");
                    cashBefore = s.State.S.cash;
                    s.OpenDialogue(babak);
                    Check(s.ActiveMenu != null && s.ActiveMenu.Options.Count >= 2 && s.ActiveMenu.Options[0].Enabled, $"dialogue menu open: '{s.ActiveMenu?.Options[0].Label}'");
                    if (s.ActiveMenu == null) { Finish(); return; }
                    s.Choose(0);   // take the job
                    s.WorkDuration = 0.5f;
                    Check(s.Working != null, $"shift started: {s.Working?.title}");
                    stage = 1; stageT = 0f; return;
                case 1:   // the shift runs, pays and advances the clock
                    if (s.Working != null) { if (stageT > 10f) Fail("shift never finished"); return; }
                    Check(s.State.S.cash > cashBefore, $"shift paid: ₦{cashBefore:N0} → ₦{s.State.S.cash:N0}");
                    Check(s.State.S.xp > 0 || s.State.S.level > 1, $"xp awarded ({s.State.S.xp}, level {s.State.S.level})");
                    Check(boot.Clock.Clock > 8.5f + 2f || boot.Clock.Day > 1, $"clock advanced to {boot.Clock.ClockText}");
                    // Buy a sedan from Dayo and drive it.
                    s.State.S.cash += 4000000;
                    var car = s.BuyVehicle("car");
                    Check(car != null && s.Parked.Count == 2 && s.State.S.vehicles.Count == 2, $"bought a sedan from Dayo ({s.Parked.Count} owned vehicles)");
                    if (car == null) { Finish(); return; }
                    var road = boot.Data.RoadAt(boot.Data.Spawn, 2f);
                    car.Place(road.Point(road.Along(boot.Data.Spawn) + 40f, road.k + road.width * 0.5f - 2.2f) + Vector3.up * 0.12f, Quaternion.LookRotation(road.Forward(1), Vector3.up));
                    s.Enter(car);
                    Check((car.transform.position - boot.Data.Spawn).magnitude < 60f, $"sedan placed on Adeniran Ogunsanya at {car.transform.position}");
                    Check(s.Vehicle == car && !boot.Player.gameObject.activeSelf, "entered the sedan");
                    carStart = car.transform.position;
                    s.Script(1f, 0f, 0f);
                    stage = 2; stageT = 0f; return;
                case 2:   // accelerate for two seconds
                    if (stageT < 2f) return;
                    float moved = Vector3.Distance(s.Vehicle.transform.position, carStart);
                    Check(s.Vehicle.Speed > 5f, $"car accelerates ({s.Vehicle.Kmh:0} km/h)");
                    s.Script(0f, 1f, 0f);
                    Check(moved > 5f, $"car moved {moved:0.0} m");
                    Check(s.State.S.skills.driving > 0f, $"driving skill trained ({s.State.S.skills.driving:0.000})");
                    Check(s.Vehicle.Condition > 95f, $"no phantom crashes on open road (condition {s.Vehicle.Condition:0}%, last hit: {s.Vehicle.LastHit ?? "none"}, car at {s.Vehicle.transform.position})");
                    stage = 3; stageT = 0f; return;
                case 3:   // brake, exit, save, reload
                    s.Script(0f, 1f, 0f);
                    if (Mathf.Abs(s.Vehicle.Speed) > 0.1f && stageT < 6f) return;
                    s.EndScript();
                    s.Exit();
                    Check(s.Vehicle == null && boot.Player.gameObject.activeSelf, "exited the vehicle");
                    s.AutoSave();
                    var reloaded = new GameState(boot.Data);
                    Check(reloaded.Load() && reloaded.S.cash == s.State.S.cash && reloaded.S.day == boot.Clock.Day, $"save round-trips (cash ₦{reloaded.S?.cash:N0}, day {reloaded.S?.day})");
                    Check(Mathf.Abs(reloaded.S.px - boot.Player.transform.position.x) < 0.01f, "save keeps the player position");
                    stage = 4; stageT = 0f; return;
                case 4:   // housing: rent the room, sleep till morning
                    {
                        var room = boot.Data.properties[0]; int cash = s.State.S.cash + s.State.S.bank; int day = boot.Clock.Day;
                        Check(s.State.Rent(room), "rented the room through Agent Kunle");
                        Check(s.State.S.home == room.id && s.State.S.cash + s.State.S.bank < cash, $"home set to '{room.name}', paid rent and fee");
                        s.Sleep();
                        Check(boot.Clock.Day == day + 1 && Mathf.Abs(boot.Clock.Clock - 7f) < 0.01f && s.State.S.stamina >= 100f, $"slept: day {boot.Clock.Day} at {boot.Clock.ClockText}");
                        stage = 5; stageT = 0f; return;
                    }
                case 5:   // business: buy the kiosk at Level 2 and run a pay cycle
                    {
                        var kiosk = boot.Data.businesses[0]; s.State.S.level = 2; s.State.S.cash = 1000000; int bank = s.State.S.bank;
                        Check(s.State.BuyBusiness(kiosk), $"bought '{kiosk.name}'");
                        s.State.TickEconomy(boot.Data.meta.payCycle + 1f);
                        Check(s.State.S.bank > bank, $"business income credited: ₦{bank:N0} → ₦{s.State.S.bank:N0}");
                        stage = 6; stageT = 0f; return;
                    }
                case 6:   // transit: board a danfo to the nearest stop
                    {
                        var kilo = boot.Data.busStops[0]; var dests = s.Destinations(kilo);
                        Check(dests.Count > 0, $"{dests.Count} danfo destinations from {kilo.name}");
                        if (dests.Count > 0) { float clock = boot.Clock.Clock; s.Board(kilo, dests[0]); Check((boot.Player.transform.position - dests[0].World()).magnitude < 8f && boot.Clock.Clock > clock, $"rode to {dests[0].name}, clock {boot.Clock.ClockText}"); }
                        stage = 7; stageT = 0f; return;
                    }
                case 7:   // law: heat 3 brings the police; arrest clears it at Area C
                    {
                        var law = boot.GetComponent<World.Law>(); var lights = boot.GetComponent<World.TrafficLights>();
                        if (stageT < 0.5f) { s.State.S.heat = 3; return; }
                        Check(lights != null && lights.Count > 50, $"traffic lights at {lights?.Count} junctions, h is {lights?.LightFor("h")}");
                        Check(law != null && law.Chasing && law.PursuerCount > 0, $"police pursuing ({law?.PursuerCount} cars)");
                        s.State.S.cash = 100000;
                        law.Arrest();
                        boot.Data.TryPlace("police", out var station);
                        Check(s.State.S.heat == 0 && (boot.Player.transform.position - station.World()).magnitude < 20f, "arrested: heat 0, released at Area C");
                        stage = 8; stageT = 0f; return;
                    }
                case 8:   // story: deliver the documents to Amaka, then a timed cold-chain task to the school
                    {
                        World.ContactSystem.Contact amaka = null; foreach (var c in s.Contacts.Contacts) if (c.data.id == "amaka") amaka = c;
                        Check(amaka != null, "Amaka stands at the Iponri yard");
                        if (amaka == null) { Finish(); return; }
                        s.State.S.mission = 1; s.State.S.storyPaused = false; int cash = s.State.S.cash;
                        boot.Player.Teleport(amaka.pos + new Vector3(1.5f, 0.3f, 0f), 0f);
                        s.TalkTo(amaka);
                        Check(s.ActiveMenu != null && s.ActiveMenu.Subtitle == "Make the Delivery" && s.ActiveMenu.Options[0].Label == "Continue", "delivery dialogue");
                        s.Choose(0);
                        Check(s.State.S.cash == cash + 12000 && !s.State.Has("documents") && s.State.S.mission == 2, $"documents delivered: +₦12,000, mission {s.State.S.mission}");
                        // Jump the story to Cold Chain and start the timed task.
                        s.State.S.mission = 7; s.State.S.arc = "legit";
                        s.TalkTo(amaka); s.Choose(0);
                        Check(s.HasTask && s.State.Has("coldbox") && s.State.S.taskType == "timed", $"cold chain task running: '{s.ObjectiveText}'");
                        s.RefreshNav();
                        Check(s.Nav.Target != null && s.Nav.RouteLength > 90f, $"GPS route to the school: {s.Nav.RouteLength:0} m (straight line 93 m)");
                        boot.Data.TryPlace("school", out var school);
                        boot.Player.Teleport(school.World() + new Vector3(0, 0.3f, 12f), 0f);
                        Check(s.TaskDeliverable(), "delivery prompt at the school");
                        cash = s.State.S.cash; s.FinishTask(true);
                        Check(!s.HasTask && s.State.S.cash == cash + 40000 && s.State.S.mission == 8, $"vaccine box delivered: +₦40,000, mission {s.State.S.mission}");
                        stage = 9; stageT = 0f; return;
                    }
                case 9:   // education, gym, food, racing
                    {
                        var web = boot.Data.Course("web"); s.State.S.cash += 500000; s.State.S.stamina = 100f;
                        var webdev = System.Array.Find(boot.Data.jobs, j => j.id == "webdev");
                        Check(webdev != null && !s.State.CanTake(webdev), "Web Freelancer locked without the certificate");
                        Check(s.Study(web) && s.State.HasCourse("web"), $"learned {web?.name}: certificates {string.Join(",", s.State.S.courses)}");
                        s.State.S.skills.business = Mathf.Max(s.State.S.skills.business, 12f);
                        Check(webdev != null && s.State.CanTake(webdev), "Web Freelancer unlocked by the certificate");
                        int fabric = s.State.S.lookFabric; s.NextFabric();
                        Check(s.State.S.lookFabric == fabric + 1 && boot.Player.Fabric == fabric + 1, $"outfit changed to {s.FabricName()}");
                        var pedSys = boot.GetComponent<World.PedestrianSystem>();
                        Check(pedSys != null && pedSys.CesiumCount > 5 && pedSys.CesiumCount < 40, $"pedestrian bodies mixed ({pedSys?.CesiumCount} CesiumMan of {pedSys?.RiggedCount})");
                        float fit = s.State.S.skills.fitness; s.State.S.stamina = 100f;
                        Check(s.Train("Cardio", 5, 0, boot.Data.gym.dayPass) && s.State.S.skills.fitness == fit + 5, $"gym cardio: fitness {s.State.S.skills.fitness}");
                        s.State.S.stamina = 10f;
                        Check(boot.Data.food.Length > 0 && s.Eat(boot.Data.food[0]) && s.State.S.stamina > 60f, $"ate {boot.Data.food[0].name}: stamina {s.State.S.stamina:0}");
                        // Race: start it, drive the sedan through the four checkpoints by teleport.
                        var sedan = s.Parked.Find(v => v.Class.id == "car");
                        Check(s.StartRace(boot.Data.raceWager, false) && s.Racing, $"race started: {s.RaceStatus}");
                        s.Enter(sedan);
                        stage = 10; stageT = 0f; return;
                    }
                case 10:  // one checkpoint per quarter second
                    {
                        if (!s.Racing) { Check(s.Vehicle != null && s.State.S.skills.driving >= 6f, $"race won: driving {s.State.S.skills.driving:0.0}, cash ₦{s.State.S.cash:N0}"); s.Exit(); stage = 11; stageT = 0f; return; }
                        if (stageT < 0.25f) return; stageT = 0f;
                        var cp = s.ActiveRace.Cps[s.ActiveRace.I]; cp.y = s.Vehicle.transform.position.y;
                        s.Vehicle.Place(cp, s.Vehicle.transform.rotation);
                        return;
                    }
                case 11:  // a few more frames with everything running, then save
                    if (stageT < 1f) return;
                    s.AutoSave();
                    var again = new GameState(boot.Data);
                    Check(again.Load() && again.S.home == s.State.S.home && again.S.biz.Count == 1 && again.S.vehicles.Count == 2 && again.S.mission == 8 && again.S.courses.Count == 1, "save keeps home, business, vehicles, story and certificates");
                    Finish(); return;
            }
        }

        static void Finish()
        {
            EditorApplication.update -= Tick;
            Application.logMessageReceived -= OnLog;
            EditorPrefs.SetBool(Flag, false);
            foreach (var n in notes) Debug.Log("NAIJA RISE play test " + n);
            foreach (var e in errors) Debug.Log("NAIJA RISE play test " + e);
            bool ok = errors.Count == 0;
            Debug.Log(ok ? $"NAIJA RISE play test: PASS ({notes.Count} checks, {frame} frames)" : $"NAIJA RISE play test: FAIL ({errors.Count} problems)");
            GameState.ClearSave();
            if (Application.isBatchMode) EditorApplication.Exit(ok ? 0 : 1);
            else EditorApplication.ExitPlaymode();
        }
    }
}
#endif
