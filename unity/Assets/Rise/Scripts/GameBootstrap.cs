using UnityEngine;
using Rise.Data;
using Rise.World;
using Rise.Player;
using Rise.UI;

namespace Rise
{
    // The only component the Lagos scene needs. It loads the exported map, builds the city, restores or starts a
    // save, spawns the player and wires the camera, clock, traffic, pedestrians, contacts, session, minimap and HUD.
    public class GameBootstrap : MonoBehaviour
    {
        // Keeps the collider classes CreatePrimitive needs out of engine code stripping (belt and braces with Assets/link.xml).
        static readonly System.Type[] KeepPhysics = { typeof(SphereCollider), typeof(CapsuleCollider), typeof(BoxCollider), typeof(MeshCollider) };

        public string WorldResource = "world/lagos";
        public int TrafficCount = 210, PedestrianCount = 70;
        public bool ContinueSave = true;

        public WorldData Data { get; private set; }
        public WorldBuilder Builder { get; private set; }
        public DayNightCycle Clock { get; private set; }
        public PlayerController Player { get; private set; }
        public Session Session { get; private set; }

        // Phones and tablets (or ?diag=mobile on a desktop): lighter crowds, no stadium models, 30 fps cap, Low graphics.
        public static bool Mobile => Application.isMobilePlatform || SystemInfo.deviceType == DeviceType.Handheld || DiagFlags.Has("mobile");

        void Awake()
        {
            Data = WorldData.LoadFromResources(WorldResource);
            QualitySettings.vSyncCount = 1;
            if (Mobile) { TrafficCount = Mathf.Min(TrafficCount, 54); PedestrianCount = Mathf.Min(PedestrianCount, 32); Application.targetFrameRate = 30; QualitySettings.vSyncCount = 0; }
            gameObject.AddComponent<UI.TouchControls>();

            Builder = gameObject.AddComponent<WorldBuilder>();
            Builder.Build(Data);

            var state = new GameState(Data);
            bool restored = ContinueSave && state.Load();
            if (!restored) state.NewGame();

            // Accounts, cloud save, and live economy overrides (Supabase; offline without Resources/cloud.json).
            var cloudConfig = DiagFlags.Has("offline") ? new Net.CloudConfig() : Net.CloudConfig.Load();
            var account = gameObject.AddComponent<Net.Account>(); account.Init(cloudConfig);
            var cloud = gameObject.AddComponent<Net.CloudSave>(); cloud.Init(account);
            var economy = gameObject.AddComponent<Net.CloudEconomy>(); economy.Init(cloudConfig, Data);

            var sun = FindSun();
            Clock = gameObject.AddComponent<DayNightCycle>();
            Clock.Init(sun, state.S.clock, Data.meta.hoursPerSecond, Builder.LampHead);
            Clock.Day = state.S.day;

            var spawn = new Vector3(state.S.px, state.S.py, state.S.pz);
            if (!restored) spawn.y = Data.DeckHeightAt(spawn) + 0.6f;
            Entities.CharacterRig.Data = Data;
            Player = PlayerController.Create(spawn, state.S.yaw, state.Look);

            var cam = Camera.main;
            if (cam == null) { cam = new GameObject("Main Camera").AddComponent<Camera>(); cam.tag = "MainCamera"; }
            cam.nearClipPlane = 0.3f; cam.farClipPlane = 1800f; cam.fieldOfView = 60f;
            PostFx.Setup(cam, gameObject);
            var follow = cam.gameObject.GetComponent<ThirdPersonCamera>();
            if (follow == null) follow = cam.gameObject.AddComponent<ThirdPersonCamera>();
            follow.Target = Player.transform; follow.Player = Player; follow.Yaw = state.S.yaw;
            Player.CameraTransform = cam.transform;

            var lights = gameObject.AddComponent<TrafficLights>();
            lights.Build(Data, Builder.Root);

            var traffic = gameObject.AddComponent<TrafficSystem>();
            traffic.Count = TrafficCount;
            traffic.Lights = lights;
            traffic.Init(Data, Clock, Builder.Root);

            var peds = gameObject.AddComponent<PedestrianSystem>();
            peds.Count = PedestrianCount;
            peds.Init(Data, Player.transform, Builder.Root);

            var contacts = gameObject.AddComponent<ContactSystem>();
            contacts.Init(Data, Player.transform, Builder.Root);

            Session = gameObject.AddComponent<Session>();
            Session.Pedestrians = peds;
            Session.Init(Data, state, Clock, Player, follow, traffic, contacts, lights);

            var law = gameObject.AddComponent<Law>();
            law.Init(Session, Data, traffic, peds, lights);
            Session.Law = law;

            var nav = gameObject.AddComponent<Navigation>();
            nav.Init(Data, Builder.Root);
            Session.Nav = nav;

            var weather = gameObject.AddComponent<Weather>();
            weather.Init(Data, Clock, cam.transform);
            weather.Notify = t => state.Toast("Weather · " + t);
            weather.OnWet = wet => Builder.SetWet(wet);
            Clock.Weather = weather; Session.Weather = weather;

            var animals = gameObject.AddComponent<AnimalSystem>();
            animals.Init(Data, Builder.Root);

            var events = gameObject.AddComponent<Events>();
            events.Init(Data, Clock, weather);
            events.Notify = (who, t) => state.Toast(who + " · " + t);
            Clock.Events = events; Session.Events = events; traffic.Events = events; traffic.Weather = weather;

            var street = gameObject.AddComponent<StreetLife>();
            street.Init(Data, Player.transform, Clock, Builder.Root);
            Session.Street = street;

            Session.Account = account; Session.Cloud = cloud;
            if (account.SignedIn) cloud.Pull(remote => { var newer = Net.CloudSave.Newer(state.S, remote); if (newer != state.S) { state.S = newer; state.Toast("Cloud save is newer — restart to continue from it"); } });

            // Multiplayer: Supabase Realtime when configured, else the local loopback bus (single player, same code path).
            string selfId = PlayerPrefs.GetString("nr.player", ""); if (string.IsNullOrEmpty(selfId)) { selfId = System.Guid.NewGuid().ToString("N").Substring(0, 12); PlayerPrefs.SetString("nr.player", selfId); }
            Net.IRealtimeTransport transport = cloudConfig.Enabled ? new Net.SupabaseRealtimeTransport(cloudConfig.RealtimeUrl) : new Net.LoopbackTransport();
            var net = gameObject.AddComponent<Net.Multiplayer>();
            net.DisplayName = account.SignedIn && !string.IsNullOrEmpty(account.Email) ? account.Email.Split('@')[0] : "Tunde";
            net.Init(Data, transport, selfId, Player.transform, Session.NetState, Builder.Root);
            Session.Players = net;
            Session.AfterNetInit();

            var governor = gameObject.AddComponent<QualityGovernor>();
            governor.Init(state.S.quality, state.S.qualityAuto, state.S.cinematic, Player.transform, Clock);
            governor.Notify = t => state.Toast(t);
            Session.Governor = governor;
            if (DiagFlags.Has("showroom")) Debug.Log($"RISE showroom: {World.Showroom.Build(Data, Player.transform, Builder.Root)} vehicle classes laid out");
            // Diagnostic switches (see DiagFlags): remove one feature at a time from a player build.
            if (DiagFlags.Has("noshadows")) sun.shadows = LightShadows.None;
            if (DiagFlags.Has("norain")) weather.enabled = false;
            if (UnityEngine.Rendering.GraphicsSettings.currentRenderPipeline is UnityEngine.Rendering.Universal.UniversalRenderPipelineAsset diagUrp)
            {
                if (DiagFlags.Has("noaddlights")) typeof(UnityEngine.Rendering.Universal.UniversalRenderPipelineAsset).GetField("m_AdditionalLightsRenderingMode", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)?.SetValue(diagUrp, UnityEngine.Rendering.Universal.LightRenderingMode.Disabled);
                if (DiagFlags.Has("nomsaa")) diagUrp.msaaSampleCount = 1;
                if (DiagFlags.Has("noshadowasset")) diagUrp.shadowDistance = 0.1f;
            }
            if (state.S.qualityAuto) state.S.quality = governor.Level;

            var minimap = gameObject.AddComponent<Minimap>();
            minimap.Init(Player.transform);

            var portrait = gameObject.AddComponent<Portrait>();
            portrait.Init(Player.transform);

            var hud = gameObject.AddComponent<Hud>();
            hud.Init(Data, Clock, Session, minimap);
            hud.Portrait = portrait;

            var sound = gameObject.AddComponent<UI.SoundSystem>();
            sound.Init(Session);

            if (DiagFlags.Has("shots")) gameObject.AddComponent<DiagShots>().Session = Session;
            if (UI.TouchControls.I != null) { UI.TouchControls.I.MenuOpen = () => Session.ActiveMenu != null; UI.TouchControls.I.Driving = () => Session.Vehicle != null; UI.TouchControls.I.MenuRects = () => Session.ActiveMenu?.Rects; }

            var away = restored ? state.ApplyAwayEarnings() : null;
            state.Toast(restored ? (away.HasValue && away.Value.net > 0 ? $"Welcome back to Lagos · Day {state.S.day} · +₦{away.Value.net:N0} while away" : $"Welcome back to Lagos · Day {state.S.day}") : "Welcome to Lagos. Baba K dey wait for you at Ojuelegba.");
            Debug.Log($"Rise: Hustle or Die Trying · {Data.meta.name} {Data.meta.version}: {Data.roads.Length} roads, {Data.landmarks.Length} landmarks, {Builder.ObjectCount} world objects ({Builder.StadiumModels} stadium models, {Builder.Trees} trees), {lights.Count} lit junctions, {contacts.Contacts.Count} contacts, save {(restored ? "restored" : "new")}.");
        }

        void LateUpdate()
        {
            // The minimap follows whatever the camera follows.
            var map = GetComponent<Minimap>();
            if (map != null && Session != null) map.SetTarget(Session.Vehicle != null ? Session.Vehicle.transform : Player.transform);
        }

        Light FindSun()
        {
            foreach (var l in FindObjectsByType<Light>()) if (l.type == LightType.Directional) return l;
            var go = new GameObject("Sun");
            var light = go.AddComponent<Light>();
            light.type = LightType.Directional;
            light.shadows = LightShadows.Soft;
            return light;
        }
    }
}
