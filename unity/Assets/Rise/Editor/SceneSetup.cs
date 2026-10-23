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

        public static readonly (string Name, BuildTarget Target, string Output)[] PlatformTargets = new[]
        {
            ("macOS", BuildTarget.StandaloneOSX, "Builds/Rise.app"),
            ("Windows", BuildTarget.StandaloneWindows64, "Builds/Windows/Rise.exe"),
            ("WebGL", BuildTarget.WebGL, "Builds/WebGL"),
            ("iOS", BuildTarget.iOS, "Builds/iOS"),
            ("Android", BuildTarget.Android, "Builds/Android/Rise.apk"),
            ("PS5", BuildTarget.PS5, "Builds/PS5"),
            ("PS4", BuildTarget.PS4, "Builds/PS4"),
            ("XboxSeries", BuildTarget.GameCoreXboxSeries, "Builds/XboxSeries"),
            ("XboxOne", BuildTarget.GameCoreXboxOne, "Builds/XboxOne"),
            ("Switch", BuildTarget.Switch, "Builds/Switch/Rise.nsp"),
        };

        public static void ConfigurePlatformSettings(BuildTarget target)
        {
            PlayerSettings.companyName = "Rise Studios Lagos";
            PlayerSettings.productName = "Rise: Hustle or Die Trying";
            PlayerSettings.bundleVersion = "1.2.0";
            var group = BuildPipeline.GetBuildTargetGroup(target);
            if (group != BuildTargetGroup.Unknown)
                PlayerSettings.SetApplicationIdentifier(UnityEditor.Build.NamedBuildTarget.FromBuildTargetGroup(group), "com.riselagos.game");

            switch (target)
            {
                case BuildTarget.StandaloneOSX:
                    EditorUserBuildSettings.SetPlatformSettings("Standalone", "OSXUniversal", "Architecture", "x64ARM64");
                    break;
                case BuildTarget.WebGL:
                    PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Gzip;
                    PlayerSettings.WebGL.decompressionFallback = true;
                    break;
                case BuildTarget.iOS:
                    PlayerSettings.iOS.targetOSVersionString = "15.0";
                    PlayerSettings.iOS.requiresFullScreen = true;
                    PlayerSettings.defaultInterfaceOrientation = UIOrientation.AutoRotation;
                    PlayerSettings.allowedAutorotateToLandscapeLeft = true;
                    PlayerSettings.allowedAutorotateToLandscapeRight = true;
                    PlayerSettings.allowedAutorotateToPortrait = false;
                    PlayerSettings.allowedAutorotateToPortraitUpsideDown = false;
                    break;
                case BuildTarget.Android:
                    PlayerSettings.Android.minSdkVersion = AndroidSdkVersions.AndroidApiLevel26;
                    PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
                    PlayerSettings.defaultInterfaceOrientation = UIOrientation.AutoRotation;
                    PlayerSettings.allowedAutorotateToLandscapeLeft = true;
                    PlayerSettings.allowedAutorotateToLandscapeRight = true;
                    PlayerSettings.allowedAutorotateToPortrait = false;
                    PlayerSettings.allowedAutorotateToPortraitUpsideDown = false;
                    break;
            }
        }

        [MenuItem("RISE/Validate All Platform Targets")]
        public static int ValidatePlatformTargets()
        {
            int count = 0;
            foreach (var p in PlatformTargets)
            {
                ConfigurePlatformSettings(p.Target);
                var group = BuildPipeline.GetBuildTargetGroup(p.Target);
                bool moduleInstalled = BuildPipeline.IsBuildTargetSupported(group, p.Target);
                Debug.Log($"RISE platform target [{p.Name}] ({p.Target}) → {p.Output} (module installed: {moduleInstalled})");
                count++;
            }
            return count;
        }

        [MenuItem("RISE/Build macOS Player")]
        public static void BuildMac()
        {
            // Universal (Intel + Apple Silicon): the default is Apple Silicon only, which cannot launch on Intel Macs.
            ConfigurePlatformSettings(BuildTarget.StandaloneOSX);
            BuildPlayer(BuildTarget.StandaloneOSX, "Builds/Rise.app");
        }

        [MenuItem("RISE/Build Windows Player")]
        public static void BuildWindows()
        {
            ConfigurePlatformSettings(BuildTarget.StandaloneWindows64);
            BuildPlayer(BuildTarget.StandaloneWindows64, "Builds/Windows/Rise.exe");
        }

        [MenuItem("RISE/Build WebGL Player")]
        public static void BuildWebGL()
        {
            // Gzip + decompression fallback keeps the .data archive under itch.io's 200 MB per-file cap
            // while allowing static hosts (itch.io, CDNs) to unpack without custom Content-Encoding headers.
            ConfigurePlatformSettings(BuildTarget.WebGL);
            if (System.IO.Directory.Exists("Builds/WebGL/Build"))
                System.IO.Directory.Delete("Builds/WebGL/Build", true);
            BuildPlayer(BuildTarget.WebGL, "Builds/WebGL");
            PatchWebGLIndex("Builds/WebGL/index.html");
        }

        [MenuItem("RISE/Build iOS Player")]
        public static void BuildiOS()
        {
            ConfigurePlatformSettings(BuildTarget.iOS);
            BuildPlayer(BuildTarget.iOS, "Builds/iOS");
        }

        [MenuItem("RISE/Build Android Player")]
        public static void BuildAndroid()
        {
            ConfigurePlatformSettings(BuildTarget.Android);
            BuildPlayer(BuildTarget.Android, "Builds/Android/Rise.apk");
        }

        [MenuItem("RISE/Build PlayStation 5 Player")]
        public static void BuildPS5()
        {
            ConfigurePlatformSettings(BuildTarget.PS5);
            BuildPlayer(BuildTarget.PS5, "Builds/PS5");
        }

        [MenuItem("RISE/Build PlayStation 4 Player")]
        public static void BuildPS4()
        {
            ConfigurePlatformSettings(BuildTarget.PS4);
            BuildPlayer(BuildTarget.PS4, "Builds/PS4");
        }

        [MenuItem("RISE/Build Xbox Series X|S Player")]
        public static void BuildXboxSeries()
        {
            ConfigurePlatformSettings(BuildTarget.GameCoreXboxSeries);
            BuildPlayer(BuildTarget.GameCoreXboxSeries, "Builds/XboxSeries");
        }

        [MenuItem("RISE/Build Xbox One Player")]
        public static void BuildXboxOne()
        {
            ConfigurePlatformSettings(BuildTarget.GameCoreXboxOne);
            BuildPlayer(BuildTarget.GameCoreXboxOne, "Builds/XboxOne");
        }

        [MenuItem("RISE/Build Nintendo Switch Player")]
        public static void BuildSwitch()
        {
            ConfigurePlatformSettings(BuildTarget.Switch);
            BuildPlayer(BuildTarget.Switch, "Builds/Switch/Rise.nsp");
        }

        static void PatchWebGLIndex(string indexPath)
        {
            if (!System.IO.File.Exists(indexPath)) return;
            var html = System.IO.File.ReadAllText(indexPath);
            html = System.Text.RegularExpressions.Regex.Replace(html, @"<title>.*?</title>", "<title>Rise: Hustle or Die Trying</title>");
            html = html.Replace("// config.autoSyncPersistentDataPath = true;", "config.autoSyncPersistentDataPath = true;");
            html = html.Replace(
                "fullscreenContainer.style.width = \"960px\";\n        fullscreenContainer.style.height = \"600px\";",
                "document.querySelector(\"#unity-container\").className = \"unity-mobile\";\n        canvas.className = \"unity-mobile\";");
            if (!html.Contains("overflow:hidden;background:#07100e"))
                html = html.Replace("</head>", "  <style>html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#07100e;}#unity-logo,#unity-footer,#unity-logo-title-footer{display:none!important;}</style>\n  </head>");
            System.IO.File.WriteAllText(indexPath, html);
            var pkgScript = System.IO.Path.GetFullPath("../scripts/package-webgl.mjs");
            if (System.IO.File.Exists(pkgScript))
            {
                try
                {
                    var psi = new System.Diagnostics.ProcessStartInfo("node", $"\"{pkgScript}\"") { UseShellExecute = false, CreateNoWindow = true };
                    using var p = System.Diagnostics.Process.Start(psi);
                    p?.WaitForExit(60000);
                }
                catch { }
            }
        }

        static void BuildPlayer(BuildTarget target, string output)
        {
            if (Application.platform != RuntimePlatform.WindowsEditor)
                System.Environment.SetEnvironmentVariable("USERPROFILE", null);
            Build();
            ShaderSetup.Prepare();
            CharacterImport.Prepare();
            var group = BuildPipeline.GetBuildTargetGroup(target);
            if (!BuildPipeline.IsBuildTargetSupported(group, target))
            {
                Debug.LogWarning($"RISE: {target} settings configured for '{output}', but the {target} playback engine module is not installed in this Unity Editor installation.");
                return;
            }
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
            int runs = 0, badRuns = 0;
            foreach (var c in data.contacts) if (c.runs != null) foreach (var r in c.runs) { runs++; if (!data.TryPlace(r.dest, out _)) badRuns++; }
            Debug.Log($"RISE smoke test: {runs} contact runs ({badRuns} unresolved destinations), {data.items?.Length ?? 0} item names");
            badContacts += badRuns;
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
                rigOk = anim.GetClipCount() >= 7 && rig.HasClip("jump") && rig.HasClip("turn") && rig.HasClip("enter_vehicle") && rig.HasClip("exit_vehicle") && Mathf.Abs(b.size.y - 1.8f) < 0.1f && facesForward && anim.GetClip("walk") != null && anim.GetClip("walk").legacy && printed;
                Debug.Log($"RISE smoke test: rig {anim.GetClipCount()} clips, height {b.size.y:0.00} m, faces +z {facesForward}, skinned renderers {anim.GetComponentsInChildren<SkinnedMeshRenderer>().Length}, top materials {rig.Top.Count}, fabric print applied {printed}");
                Object.DestroyImmediate(probe);
                if (Entities.CharacterRig.CesiumAvailable)
                {
                    var cprobe = new GameObject("CesiumProbe");
                    var crig = Entities.CharacterRig.Build(cprobe.transform, Entities.Look.Default, 0, 1.7f, true);
                    var cb0 = Entities.CharacterRig.Bounds(crig.Root);
                    var wclip = crig.Anim.GetClip("walk");
                    if (wclip != null) wclip.SampleAnimation(crig.Root, 0.25f);
                    var cb = Entities.CharacterRig.Bounds(crig.Root);
                    bool cesiumOk = crig.Cesium && wclip != null && Mathf.Abs(cb.size.y - 1.7f) < 0.25f && cb.size.y > cb.size.x * 1.4f && cb.size.y > cb.size.z * 1.4f;
                    rigOk &= cesiumOk;
                    Debug.Log($"RISE smoke test: CesiumMan rig {(cesiumOk ? "ok" : "FAIL")}, bind {cb0.size.x:0.00}x{cb0.size.y:0.00}x{cb0.size.z:0.00}, sampled {cb.size.x:0.00}x{cb.size.y:0.00}x{cb.size.z:0.00}");
                    Object.DestroyImmediate(cprobe);
                }
                else Debug.Log("RISE smoke test: CesiumMan not available");
                bool uprightModels = true;
                var veg = builder.Root.Find("Vegetation");
                if (veg != null) foreach (Transform tr in veg) { var tb = Entities.CharacterRig.Bounds(tr.gameObject); if (tb.size.y < tb.size.x * 0.7f || tb.size.y < tb.size.z * 0.7f) uprightModels = false; }
                var lms = builder.Root.Find("Landmarks");
                if (lms != null) foreach (Transform lm in lms) if (lm.name.EndsWith(" model")) { var sb = Entities.CharacterRig.Bounds(lm.gameObject); if (sb.size.y > sb.size.x || sb.size.y > sb.size.z) uprightModels = false; }
                Debug.Log($"RISE smoke test: {builder.StadiumModels} stadium models, {builder.Trees} trees placed, upright={uprightModels}");
                int stadiums = 0; foreach (var l in data.landmarks) if (l.stadium) stadiums++;
                rigOk &= builder.StadiumModels == stadiums && builder.Trees >= 20 && uprightModels;
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
                else { fitted++; if (Mathf.Abs(vi.Length - vc.len) > 0.35f || vi.Width > vi.Length || vi.Height > vi.Length) badFit.Add($"{vc.id}:{vi.Model} {vi.Length:0.0}x{vi.Width:0.0}x{vi.Height:0.0}"); }
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
