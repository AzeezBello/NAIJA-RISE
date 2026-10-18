#if UNITY_EDITOR
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Rise.EditorTools
{
    // Renders vehicle models to a contact sheet so one that imports upright, on its side or backwards shows up without
    // playing the game. Each tile is one model seen from the front-left and above; the red bar on the ground marks the
    // front (+z) the vehicle should face. The log lists tile numbers with the model and its fitted size.
    //   Render            every model of every class, with the corrections in VehicleBodies.ModelFix
    //   RenderCandidates  the models in RISE_SHEET_MODELS (comma separated), each under six up-axis corrections
    //   Unity -batchmode -quit -projectPath unity -executeMethod Rise.EditorTools.VehicleSheet.Render -logFile -
    // Needs a graphics device (no -nographics). Output: Builds/vehicle-sheet.png, or the path in RISE_SHEET_OUT.
    public static class VehicleSheet
    {
        static readonly Vector3[] Candidates = { Vector3.zero, new Vector3(-90f, 0f, 0f), new Vector3(90f, 0f, 0f), new Vector3(0f, 0f, 90f), new Vector3(0f, 0f, -90f), new Vector3(180f, 0f, 0f) };

        [MenuItem("RISE/Render Vehicle Sheet")]
        public static void Render()
        {
            var data = Setup();
            var items = new List<(Data.VehicleClassData cls, string model, Vector3? fix)>();
            foreach (var vc in data.vehicleClasses)
            {
                var models = Vehicles.VehicleBodies.ModelsFor(vc.id);
                if (models.Length == 0) items.Add((vc, null, null));
                foreach (var m in models) items.Add((vc, m, null));
            }
            Sheet(items);
        }

        public static void RenderCandidates()
        {
            var data = Setup();
            var wanted = (System.Environment.GetEnvironmentVariable("RISE_SHEET_MODELS") ?? "").Split(',');
            // RISE_SHEET_FIXES="-90,0,0;-90,180,0" replaces the default six corrections.
            var candidates = new List<Vector3>(Candidates);
            var fixes = System.Environment.GetEnvironmentVariable("RISE_SHEET_FIXES");
            if (!string.IsNullOrEmpty(fixes))
            {
                candidates.Clear();
                foreach (var f in fixes.Split(';')) { var p = f.Split(','); if (p.Length == 3) candidates.Add(new Vector3(float.Parse(p[0]), float.Parse(p[1]), float.Parse(p[2]))); }
            }
            var items = new List<(Data.VehicleClassData cls, string model, Vector3? fix)>();
            foreach (var vc in data.vehicleClasses)
                foreach (var m in Vehicles.VehicleBodies.ModelsFor(vc.id))
                    if (System.Array.IndexOf(wanted, m) >= 0) foreach (var c in candidates) items.Add((vc, m, c));
            Sheet(items);
        }

        static Data.WorldData Setup()
        {
            EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            ShaderSetup.Prepare();
            var sun = new GameObject("Sun").AddComponent<Light>(); sun.type = LightType.Directional; sun.intensity = 1.2f;
            sun.transform.rotation = Quaternion.Euler(50f, -30f, 0f);
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat; RenderSettings.ambientLight = new Color(0.6f, 0.62f, 0.66f);
            return Data.WorldData.LoadFromResources();
        }

        static void Sheet(List<(Data.VehicleClassData cls, string model, Vector3? fix)> items)
        {
            const int tw = 320, th = 240, cols = 6;
            int rows = Mathf.Max(1, Mathf.CeilToInt(items.Count / (float)cols));
            var sheet = new Texture2D(tw * cols, th * rows, TextureFormat.RGB24, false);
            var fillPx = new Color[sheet.width * sheet.height]; for (int i = 0; i < fillPx.Length; i++) fillPx[i] = new Color(0.15f, 0.15f, 0.17f); sheet.SetPixels(fillPx);
            var rt = new RenderTexture(tw, th, 24) { antiAliasing = 4 };
            var cam = new GameObject("SheetCam").AddComponent<Camera>();
            cam.fieldOfView = 30f; cam.targetTexture = rt; cam.clearFlags = CameraClearFlags.SolidColor; cam.backgroundColor = new Color(0.62f, 0.72f, 0.82f);
            cam.nearClipPlane = 0.1f; cam.farClipPlane = 400f;
            var ground = GameObject.CreatePrimitive(PrimitiveType.Plane); ground.transform.localScale = new Vector3(6f, 1f, 6f);
            ground.GetComponent<MeshRenderer>().sharedMaterial = new Material(ShaderLib.Lit) { color = new Color(0.36f, 0.37f, 0.39f) };
            var red = new Material(ShaderLib.Unlit) { color = Color.red };
            var lines = new List<string>();
            Vehicles.VehicleBodies.FixOverride = null;
            for (int i = 0; i < items.Count; i++)
            {
                var (cls, model, fix) = items[i];
                var host = new GameObject("Tile " + i);
                Vehicles.VehicleBodies.FixOverride = fix.HasValue ? (_ => fix.Value) : (System.Func<string, Vector3?>)null;
                GameObject body = model != null ? Vehicles.VehicleBodies.BuildModel(cls, model, host.transform, out var wheels) : Vehicles.VehicleBodies.Build(cls, host.transform, new System.Random(3), out wheels);
                if (body == null) { lines.Add($"#{i,-3} {cls.id,-11} {model} FAILED TO LOAD"); Object.DestroyImmediate(host); continue; }
                var b = Entities.CharacterRig.Bounds(body);
                lines.Add($"#{i,-3} {cls.id,-11} {model ?? "procedural",-44} fix {(fix.HasValue ? fix.Value.ToString("0") : "table")}  size x{b.size.x:0.00} y{b.size.y:0.00} z{b.size.z:0.00} (class {cls.wid}x{cls.len})");
                // RISE_SHEET_PARTS=<model>: list every part's bounds, to find a stray mesh that distorts the fit.
                if (model != null && model == System.Environment.GetEnvironmentVariable("RISE_SHEET_PARTS"))
                    foreach (var pr in body.GetComponentsInChildren<Renderer>())
                        lines.Add($"      part {pr.gameObject.name,-48} center {pr.bounds.center - b.center:0.00} size {pr.bounds.size:0.00}");
                var post = GameObject.CreatePrimitive(PrimitiveType.Cube); post.transform.SetParent(host.transform, false);
                post.transform.localPosition = new Vector3(0f, 0.03f, cls.len * 0.5f + 0.8f); post.transform.localScale = new Vector3(0.5f, 0.06f, 1.0f);
                post.GetComponent<MeshRenderer>().sharedMaterial = red;
                // Frame the vehicle from the front-left, above (or square from the left with RISE_SHEET_VIEW=side).
                var dir = System.Environment.GetEnvironmentVariable("RISE_SHEET_VIEW") == "side" ? new Vector3(-1f, 0.12f, 0f).normalized : new Vector3(-1f, 0.65f, 1.15f).normalized;
                float radius = Mathf.Max(b.extents.magnitude, cls.len * 0.55f);
                float dist = radius / Mathf.Sin(cam.fieldOfView * 0.5f * Mathf.Deg2Rad) * 1.05f;
                cam.transform.position = b.center + dir * dist; cam.transform.LookAt(b.center);
                cam.Render();
                RenderTexture.active = rt;
                int col = i % cols, row = rows - 1 - i / cols;
                sheet.ReadPixels(new Rect(0, 0, tw, th), col * tw, row * th);
                RenderTexture.active = null;
                Object.DestroyImmediate(host);
            }
            Vehicles.VehicleBodies.FixOverride = null;
            sheet.Apply();
            Debug.Log("RISE vehicle sheet (tiles left to right, top to bottom, " + cols + " per row):\n" + string.Join("\n", lines));
            string outPath = System.Environment.GetEnvironmentVariable("RISE_SHEET_OUT");
            if (string.IsNullOrEmpty(outPath)) outPath = Path.GetFullPath("Builds/vehicle-sheet.png");
            Directory.CreateDirectory(Path.GetDirectoryName(outPath));
            File.WriteAllBytes(outPath, sheet.EncodeToPNG());
            Debug.Log("RISE vehicle sheet written to " + outPath);
            Object.DestroyImmediate(cam.gameObject); Object.DestroyImmediate(ground);
            rt.Release();
        }
    }
}
#endif
