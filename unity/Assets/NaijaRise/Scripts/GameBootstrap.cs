using UnityEngine;
using NaijaRise.Data;
using NaijaRise.World;
using NaijaRise.Player;
using NaijaRise.UI;

namespace NaijaRise
{
    // The only component the Lagos scene needs. It loads the exported map, builds the city, spawns the player and
    // wires the camera, clock, traffic and HUD. Everything else is created from code so the scene stays data-driven.
    public class GameBootstrap : MonoBehaviour
    {
        public string WorldResource = "world/lagos";
        public int TrafficCount = 110;

        public WorldData Data { get; private set; }
        public WorldBuilder Builder { get; private set; }
        public DayNightCycle Clock { get; private set; }
        public PlayerController Player { get; private set; }

        void Awake()
        {
            Data = WorldData.LoadFromResources(WorldResource);
            QualitySettings.vSyncCount = 1;
            Application.targetFrameRate = -1;

            Builder = gameObject.AddComponent<WorldBuilder>();
            Builder.Build(Data);

            var sun = FindSun();
            Clock = gameObject.AddComponent<DayNightCycle>();
            Clock.Init(sun, Data.meta.startClock, Data.meta.hoursPerSecond, Builder.LampHead);

            var spawn = new Vector3(Data.meta.spawnX, 0f, Data.meta.spawnZ);
            spawn.y = Data.DeckHeightAt(spawn.x, spawn.z) + 0.6f;
            Player = PlayerController.Create(spawn);

            var cam = Camera.main;
            if (cam == null) { cam = new GameObject("Main Camera").AddComponent<Camera>(); cam.tag = "MainCamera"; }
            cam.nearClipPlane = 0.3f; cam.farClipPlane = 1800f; cam.fieldOfView = 60f;
            var follow = cam.gameObject.GetComponent<ThirdPersonCamera>() ?? cam.gameObject.AddComponent<ThirdPersonCamera>();
            follow.Target = Player.transform; follow.Player = Player;
            Player.CameraTransform = cam.transform;

            var traffic = gameObject.AddComponent<TrafficSystem>();
            traffic.Count = TrafficCount;
            traffic.Init(Data, Clock, Builder.Root);

            var hud = gameObject.AddComponent<Hud>();
            hud.Init(Data, Clock, Player);

            Debug.Log($"NAIJA RISE — {Data.meta.name} {Data.meta.version}: {Data.roads.Length} roads, {Data.landmarks.Length} landmarks, {Builder.ObjectCount} world objects.");
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
