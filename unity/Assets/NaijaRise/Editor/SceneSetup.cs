#if UNITY_EDITOR
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace NaijaRise.EditorTools
{
    // Creates the Lagos scene (camera, sun, GameBootstrap) and builds players. Also callable headless:
    //   Unity -batchmode -quit -projectPath unity -executeMethod NaijaRise.EditorTools.SceneSetup.Build
    //   Unity -batchmode -quit -projectPath unity -executeMethod NaijaRise.EditorTools.SceneSetup.BuildMac
    public static class SceneSetup
    {
        public const string ScenePath = "Assets/NaijaRise/Scenes/Lagos.unity";

        [MenuItem("NAIJA RISE/Create Lagos Scene")]
        public static void Build()
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.DefaultGameObjects, NewSceneMode.Single);
            var game = new GameObject("Game");
            game.AddComponent<GameBootstrap>();
            System.IO.Directory.CreateDirectory("Assets/NaijaRise/Scenes");
            EditorSceneManager.SaveScene(scene, ScenePath);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
            AssetDatabase.SaveAssets();
            Debug.Log("NAIJA RISE: Lagos scene saved to " + ScenePath);
        }

        [MenuItem("NAIJA RISE/Build macOS Player")]
        public static void BuildMac() => BuildPlayer(BuildTarget.StandaloneOSX, "Builds/NaijaRise-Lagos.app");

        [MenuItem("NAIJA RISE/Build WebGL Player")]
        public static void BuildWebGL() => BuildPlayer(BuildTarget.WebGL, "Builds/WebGL");

        static void BuildPlayer(BuildTarget target, string output)
        {
            if (!System.IO.File.Exists(ScenePath)) Build();
            var options = new BuildPlayerOptions { scenes = new[] { ScenePath }, locationPathName = output, target = target, options = BuildOptions.None };
            var report = BuildPipeline.BuildPlayer(options);
            var summary = report.summary;
            Debug.Log($"NAIJA RISE: {target} build {summary.result}, {summary.totalSize / (1024 * 1024)} MB, {summary.totalErrors} errors → {summary.outputPath}");
            if (Application.isBatchMode && summary.result != BuildResult.Succeeded) EditorApplication.Exit(1);
        }

        // Headless check: load the exported map and build the whole city in edit mode, then report counts.
        //   Unity -batchmode -quit -projectPath unity -executeMethod NaijaRise.EditorTools.SceneSetup.SmokeTest
        [MenuItem("NAIJA RISE/Smoke Test World Build")]
        public static void SmokeTest()
        {
            EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var data = Data.WorldData.LoadFromResources();
            var host = new GameObject("SmokeTest");
            var builder = host.AddComponent<World.WorldBuilder>();
            var t0 = System.Diagnostics.Stopwatch.StartNew();
            builder.Build(data);
            t0.Stop();
            int renderers = host.GetComponentsInChildren<MeshRenderer>().Length;
            var spawn = data.Spawn;
            var region = data.RegionAt(spawn);
            var road = data.RoadAt(spawn, 9f);
            float eko = data.DeckHeightAtData(250f, 0f), ground = data.DeckHeightAt(spawn);
            Debug.Log($"NAIJA RISE smoke test: {data.roads.Length} roads, {data.landmarks.Length} landmarks, {builder.ObjectCount} objects, {renderers} renderers in {t0.ElapsedMilliseconds} ms; " +
                      $"spawn in '{region?.name}' near '{(road != null ? data.RoadNameAt(road, road.Along(spawn)) : "no road")}'; Eko Bridge deck at x=250 is {eko} m, ground at spawn {ground} m");
            // Jobs and contacts must resolve to places, and the mirror must put Lagos Island east (+x) of Surulere with north at +z.
            int badJobs = 0, badContacts = 0, placedContacts = 0;
            foreach (var j in data.jobs) if (!data.TryPlace(j.at, out _)) badJobs++;
            foreach (var c in data.contacts) if (data.ContactSpot(c, out _)) placedContacts++; else badContacts++;
            var cmsWorld = Data.WorldData.W(372f, 0f, -15f);   // CMS Bus Terminal, data (372, -15)
            bool mirrorOk = cmsWorld.x > spawn.x && cmsWorld.z > 0f && data.RoadAt(cmsWorld, 30f) != null;
            Debug.Log($"NAIJA RISE smoke test: {data.jobs.Length} jobs ({badJobs} unresolved), {placedContacts} contacts placed ({badContacts} unresolved), {data.vehicleClasses.Length} vehicle classes; CMS at world {cmsWorld}, mirror {(mirrorOk ? "ok" : "WRONG")}");
            bool ok = builder.ObjectCount > 1000 && renderers > 1000 && region != null && Mathf.Approximately(eko, 9f) && Mathf.Approximately(ground, 0f)
                      && badJobs == 0 && badContacts == 0 && placedContacts > 10 && data.vehicleClasses.Length > 5 && mirrorOk;
            Debug.Log(ok ? "NAIJA RISE smoke test: PASS" : "NAIJA RISE smoke test: FAIL");
            Object.DestroyImmediate(host);
            if (Application.isBatchMode && !ok) EditorApplication.Exit(1);
        }
    }
}
#endif
