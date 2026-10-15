#if UNITY_EDITOR
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Rise.EditorTools
{
    // Creates the Lagos scene (camera, sun, GameBootstrap) and builds players. Also callable headless:
    //   Unity -batchmode -quit -projectPath unity -executeMethod Rise.EditorTools.SceneSetup.Build
    //   Unity -batchmode -quit -projectPath unity -executeMethod Rise.EditorTools.SceneSetup.BuildMac
    public static class SceneSetup
    {
        public const string ScenePath = "Assets/Rise/Scenes/Lagos.unity";

        [MenuItem("RISE/Create Lagos Scene")]
        public static void Build()
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.DefaultGameObjects, NewSceneMode.Single);
            var game = new GameObject("Game");
            game.AddComponent<GameBootstrap>();
            System.IO.Directory.CreateDirectory("Assets/Rise/Scenes");
            EditorSceneManager.SaveScene(scene, ScenePath);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
            AssetDatabase.SaveAssets();
            Debug.Log("RISE: Lagos scene saved to " + ScenePath);
        }

        [MenuItem("RISE/Build macOS Player")]
        public static void BuildMac()
        {
            // Universal (Intel + Apple Silicon): the default is Apple Silicon only, which cannot launch on Intel Macs.
            EditorUserBuildSettings.SetPlatformSettings("Standalone", "OSXUniversal", "Architecture", "x64ARM64");
            BuildPlayer(BuildTarget.StandaloneOSX, "Builds/Rise-Lagos.app");
        }

        [MenuItem("RISE/Build Windows Player")]
        public static void BuildWindows() => BuildPlayer(BuildTarget.StandaloneWindows64, "Builds/Windows/Rise-Lagos.exe");

        [MenuItem("RISE/Build WebGL Player")]
        public static void BuildWebGL() => BuildPlayer(BuildTarget.WebGL, "Builds/WebGL");

        static void BuildPlayer(BuildTarget target, string output)
        {
            if (!System.IO.File.Exists(ScenePath)) Build();
            ShaderSetup.Prepare();
            CharacterImport.Prepare();
            var options = new BuildPlayerOptions { scenes = new[] { ScenePath }, locationPathName = output, target = target, options = BuildOptions.None };
            var report = BuildPipeline.BuildPlayer(options);
            var summary = report.summary;
            Debug.Log($"RISE: {target} build {summary.result}, {summary.totalSize / (1024 * 1024)} MB, {summary.totalErrors} errors → {summary.outputPath}");
            if (Application.isBatchMode && summary.result != BuildResult.Succeeded) EditorApplication.Exit(1);
        }

        // Headless check: load the exported map and build the whole city in edit mode, then report counts.
        //   Unity -batchmode -quit -projectPath unity -executeMethod Rise.EditorTools.SceneSetup.SmokeTest
        [MenuItem("RISE/Smoke Test World Build")]
        public static void SmokeTest()
        {
            EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            ShaderSetup.Prepare();
            CharacterImport.Prepare();
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
            Debug.Log($"RISE smoke test: {data.roads.Length} roads, {data.landmarks.Length} landmarks, {builder.ObjectCount} objects, {renderers} renderers in {t0.ElapsedMilliseconds} ms; " +
                      $"spawn in '{region?.name}' near '{(road != null ? data.RoadNameAt(road, road.Along(spawn)) : "no road")}'; Eko Bridge deck at x=250 is {eko} m, ground at spawn {ground} m");
            // Jobs and contacts must resolve to places, and the mirror must put Lagos Island east (+x) of Surulere with north at +z.
            int badJobs = 0, badContacts = 0, placedContacts = 0;
            foreach (var j in data.jobs) if (!data.TryPlace(j.at, out _)) badJobs++;
            foreach (var c in data.contacts) if (data.ContactSpot(c, out _)) placedContacts++; else badContacts++;
            var cmsWorld = Data.WorldData.W(372f, 0f, -15f);   // CMS Bus Terminal, data (372, -15)
            bool mirrorOk = cmsWorld.x > spawn.x && cmsWorld.z > 0f && data.RoadAt(cmsWorld, 30f) != null;
            Debug.Log($"RISE smoke test: {data.jobs.Length} jobs ({badJobs} unresolved), {placedContacts} contacts placed ({badContacts} unresolved), {data.vehicleClasses.Length} vehicle classes; CMS at world {cmsWorld}, mirror {(mirrorOk ? "ok" : "WRONG")}");
            // Imported models: the Ready Player Me rig with its three retargeted clips, and a Kenney sedan.
            bool rigOk = false, carOk = false;
            if (Entities.CharacterRig.Available)
            {
                Entities.CharacterRig.Data = data;
                var probe = new GameObject("RigProbe");
                var rig = Entities.CharacterRig.Build(probe.transform, Entities.Look.Default);
                var anim = rig.Anim;
                var b = Entities.CharacterRig.Bounds(anim.gameObject);
                var le = Entities.CharacterRig.Find(anim.transform, "LeftEye"); var head = Entities.CharacterRig.Find(anim.transform, "Head");
                bool facesForward = le == null || head == null || probe.transform.InverseTransformDirection(le.position - head.position).z > 0f;
                var print = Entities.Fabrics.Get(data, 0);
                bool printed = print != null && print.width == 128 && rig.Top.Count > 0 && rig.Top[0].HasProperty("baseColorTexture") && rig.Top[0].GetTexture("baseColorTexture") == print;
                rigOk = anim.GetClipCount() == 3 && Mathf.Abs(b.size.y - 1.8f) < 0.1f && facesForward && anim.GetClip("walk") != null && anim.GetClip("walk").legacy && printed;
                Debug.Log($"RISE smoke test: rig {anim.GetClipCount()} clips, height {b.size.y:0.00} m, faces +z {facesForward}, skinned renderers {anim.GetComponentsInChildren<SkinnedMeshRenderer>().Length}, top materials {rig.Top.Count}, fabric print applied {printed}");
                Object.DestroyImmediate(probe);
                if (Entities.CharacterRig.CesiumAvailable)
                {
                    var cprobe = new GameObject("CesiumProbe");
                    var crig = Entities.CharacterRig.Build(cprobe.transform, Entities.Look.Default, 0, 1.7f, true);
                    var cb = Entities.CharacterRig.Bounds(crig.Root);
                    bool cesiumOk = crig.Cesium && crig.Anim.GetClip("walk") != null && Mathf.Abs(cb.size.y - 1.7f) < 0.1f;
                    rigOk &= cesiumOk;
                    Debug.Log($"RISE smoke test: CesiumMan rig {(cesiumOk ? "ok" : "FAIL")}, height {cb.size.y:0.00} m");
                    Object.DestroyImmediate(cprobe);
                }
                else Debug.Log("RISE smoke test: CesiumMan not available");
                Debug.Log($"RISE smoke test: {builder.StadiumModels} stadium models, {builder.Trees} trees placed");
                int stadiums = 0; foreach (var l in data.landmarks) if (l.stadium) stadiums++;
                rigOk &= builder.StadiumModels == stadiums && builder.Trees >= 20;
            }
            else Debug.Log("RISE smoke test: character rig not available (glTFast import or clips missing)");
            var sedan = data.VehicleClass("car");
            if (sedan != null)
            {
                var vprobe = new GameObject("CarProbe");
                var car = Vehicles.VehicleBodies.Build(sedan, vprobe.transform, new System.Random(1), out var wheels);
                var cb = Entities.CharacterRig.Bounds(car);
                carOk = car.transform.Find("Model") != null && Mathf.Abs(cb.size.z - sedan.len) < 0.2f && wheels.Length == 4;
                Debug.Log($"RISE smoke test: sedan {(car.transform.Find("Model") != null ? "Kenney model" : "procedural")}, length {cb.size.z:0.00} m (class {sedan.len}), {wheels.Length} wheels");
                Object.DestroyImmediate(vprobe);
            }
            // Every vehicle class with a mapped model must fit it at the class length, long axis along z.
            int fitted = 0, procedural = 0; var badFit = new System.Collections.Generic.List<string>();
            foreach (var vc in data.vehicleClasses)
            {
                var probeHost = new GameObject("FitProbe"); var vb = Vehicles.VehicleBodies.Build(vc, probeHost.transform, new System.Random(3), out _);
                var vi = vb.GetComponent<Vehicles.VehicleModelInfo>();
                if (vi == null) procedural++;
                else { fitted++; if (Mathf.Abs(vi.Length - vc.len) > 0.35f || vi.Width > vi.Length) badFit.Add($"{vc.id}:{vi.Model} {vi.Length:0.0}x{vi.Width:0.0}"); }
                Object.DestroyImmediate(probeHost);
            }
            Debug.Log($"RISE smoke test: vehicle models fitted for {fitted} classes, {procedural} procedural, bad fits: {(badFit.Count == 0 ? "none" : string.Join("; ", badFit))}");
            bool shadersOk = ShaderSetup.AllPresent(out var shaderDetail) && badFit.Count == 0 && fitted >= 12;
            Debug.Log($"RISE smoke test: shaders for players: {shaderDetail}");
            bool ok = shadersOk && builder.ObjectCount > 1000 && renderers > 1000 && region != null && Mathf.Approximately(eko, 9f) && Mathf.Approximately(ground, 0f)
                      && badJobs == 0 && badContacts == 0 && placedContacts > 10 && data.vehicleClasses.Length > 5 && mirrorOk && rigOk && carOk;
            Debug.Log(ok ? "RISE smoke test: PASS" : "RISE smoke test: FAIL");
            Object.DestroyImmediate(host);
            if (Application.isBatchMode && !ok) EditorApplication.Exit(1);
        }
    }
}
#endif
