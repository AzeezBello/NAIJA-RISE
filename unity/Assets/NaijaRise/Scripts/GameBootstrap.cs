using UnityEngine;
using NaijaRise.Data;
using NaijaRise.World;
using NaijaRise.Player;
using NaijaRise.UI;

namespace NaijaRise
{
    // The only component the Lagos scene needs. It loads the exported map, builds the city, restores or starts a
    // save, spawns the player and wires the camera, clock, traffic, pedestrians, contacts, session, minimap and HUD.
    public class GameBootstrap : MonoBehaviour
    {
        public string WorldResource = "world/lagos";
        public int TrafficCount = 110, PedestrianCount = 70;
        public bool ContinueSave = true;

        public WorldData Data { get; private set; }
        public WorldBuilder Builder { get; private set; }
        public DayNightCycle Clock { get; private set; }
        public PlayerController Player { get; private set; }
        public Session Session { get; private set; }

        void Awake()
        {
            Data = WorldData.LoadFromResources(WorldResource);
            QualitySettings.vSyncCount = 1;

            Builder = gameObject.AddComponent<WorldBuilder>();
            Builder.Build(Data);

            var state = new GameState(Data);
            bool restored = ContinueSave && state.Load();
            if (!restored) state.NewGame();

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
            Clock.Weather = weather; Session.Weather = weather;

            var animals = gameObject.AddComponent<AnimalSystem>();
            animals.Init(Data, Builder.Root);

            Session.ApplyQuality();

            var minimap = gameObject.AddComponent<Minimap>();
            minimap.Init(Player.transform);

            var portrait = gameObject.AddComponent<Portrait>();
            portrait.Init(Player.transform);

            var hud = gameObject.AddComponent<Hud>();
            hud.Init(Data, Clock, Session, minimap);
            hud.Portrait = portrait;

            state.Toast(restored ? $"Welcome back to Lagos · Day {state.S.day}" : "Welcome to Lagos. Baba K dey wait for you at Ojuelegba.");
            Debug.Log($"NAIJA RISE — {Data.meta.name} {Data.meta.version}: {Data.roads.Length} roads, {Data.landmarks.Length} landmarks, {Builder.ObjectCount} world objects ({Builder.StadiumModels} stadium models, {Builder.Trees} trees), {lights.Count} lit junctions, {contacts.Contacts.Count} contacts, save {(restored ? "restored" : "new")}.");
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
