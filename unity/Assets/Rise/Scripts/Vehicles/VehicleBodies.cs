using System.Collections.Generic;
using UnityEngine;
using Rise.Data;

namespace Rise.Vehicles
{
    // Procedural vehicle bodies (danfo, keke, korope, sedan, okada, generic) sized from the exported vehicle classes.
    // +z is forward. Each body gets one BoxCollider on the root so the camera and traffic can see it.
    public static class VehicleBodies
    {
        static Shader standard;
        static readonly Dictionary<string, Material> materials = new Dictionary<string, Material>();
        public static readonly string[] CarColours = { "#d8d8d8", "#1f1f24", "#8a1c1c", "#2a4d8f", "#b0b7bd", "#5a5a5f", "#e8e3d3", "#3f6b3a", "#c47a1e" };

        public static Material Mat(string hex, float gloss = 0.6f)
        {
            string key = hex + gloss;
            if (materials.TryGetValue(key, out var m)) return m;
            standard ??= ShaderLib.Lit;
            m = new Material(standard); ColorUtility.TryParseHtmlString(hex, out var c); m.color = c; m.SetFloat("_Smoothness", gloss);
            return materials[key] = m;
        }

        static Transform Part(Transform parent, PrimitiveType type, Vector3 pos, Vector3 scale, Material m, Quaternion? rot = null)
        {
            var p = GameObject.CreatePrimitive(type);
            p.transform.SetParent(parent, false); p.transform.localPosition = pos; p.transform.localScale = scale;
            if (rot.HasValue) p.transform.localRotation = rot.Value;
            p.GetComponent<MeshRenderer>().sharedMaterial = m;
            var col = p.GetComponent<Collider>();
            if (Application.isPlaying) Object.Destroy(col); else Object.DestroyImmediate(col);
            return p.transform;
        }

        static Transform Wheel(Transform parent, Vector3 pos, float radius) =>
            Part(parent, PrimitiveType.Cylinder, pos, new Vector3(radius * 2f, 0.12f, radius * 2f), Mat("#141414", 0.2f), Quaternion.Euler(0, 0, 90));

        // Models per class (Resources/Models/Vehicles), the same assignment as MODELS in src/data/vehicles.js: Kenney's Car Kit
        // (CC0) for cars and services, and the owner's Lagos fleet (danfo, keke, korope, okada, BRT, army, tanker, pickup,
        // motorcycles, vans). A class with no model, or whose model fails to load, falls back to the procedural body.
        static readonly Dictionary<string, string[]> Models = new Dictionary<string, string[]>
        {
            ["car"] = new[] { "sedan", "sedan-sports", "suv", "suv-luxury", "hatchback-sports", "taxi" },
            ["police"] = new[] { "police" }, ["lawma"] = new[] { "garbage-truck" }, ["fire"] = new[] { "firetruck" }, ["ambulance"] = new[] { "ambulance" },
            ["delivery"] = new[] { "delivery", "delivery-flat" }, ["truck"] = new[] { "truck", "truck-flat" },
            ["danfo"] = new[] { "danfo_vanagon" }, ["keke"] = new[] { "keke_bajaj_re" }, ["korope"] = new[] { "suzuki_carry_minivan" }, ["okada"] = new[] { "suzuki_gsx-r750" },
            ["brt"] = new[] { "volkswagen_crafter" }, ["army"] = new[] { "2003-gmc-topkick-c6500" }, ["tanker"] = new[] { "heavy_commercial_vehicle_hcv" },
            ["pickup"] = new[] { "lightbody_90_md_pickup_-_low_poly_model" }, ["van"] = new[] { "van" },   // the ID. Buzz (552k triangles, 207 meshes) does not import and is far too heavy; the Kenney van stands in
            ["motorcycle"] = new[] { "2008_kawasaki_ninja_zx-10r-em", "suzuki_hayabusa_gsx-1300r-k8" },
        };
        // Extra yaw (degrees) to bring a model's native front onto +z. glTFast keeps glTF +Z as Unity +z, so most models need
        // none; the keke's front is along glTF +X, which is -x in Unity (the web edition's MODEL_ROTATION says π/2 for it).
        static readonly Dictionary<string, float> ModelYaw = new Dictionary<string, float> { ["keke_bajaj_re"] = 90f, ["suzuki_carry_minivan"] = -45f };   // the korope is modelled 45° off its axis
        // Up-axis corrections (Euler degrees, applied before ModelYaw) for models exported with Z up or lying on a side,
        // which otherwise import standing on end or on their side. Found with RISE ▸ Render Vehicle Sheet (Editor/VehicleSheet.cs).
        public static readonly Dictionary<string, Vector3> ModelFix = new Dictionary<string, Vector3>
        {
            ["suzuki_carry_minivan"] = new Vector3(-90f, 0f, 0f),          // korope: lay on its wheels
            ["keke_bajaj_re"] = new Vector3(-90f, 0f, 0f),                 // keke: was on its side
            ["suzuki_gsx-r750"] = new Vector3(-90f, 0f, 0f),               // okada: stood on its tail
            ["2008_kawasaki_ninja_zx-10r-em"] = new Vector3(-90f, 0f, 0f), // motorcycle: was on its side
            ["suzuki_hayabusa_gsx-1300r-k8"] = new Vector3(-90f, 0f, 0f),  // motorcycle: stood on its tail
            ["2003-gmc-topkick-c6500"] = new Vector3(-90f, 0f, 0f),        // army: stood on its tail
            ["heavy_commercial_vehicle_hcv"] = new Vector3(-90f, 180f, 0f), // tanker: on its side and facing backwards
            ["lightbody_90_md_pickup_-_low_poly_model"] = new Vector3(-90f, 0f, 0f),   // pickup: was on its side
        };
        // Tools can try other corrections without editing the table (VehicleSheet.RenderCandidates).
        public static System.Func<string, Vector3?> FixOverride;
        public static bool UseModels = true;

        // Spin a wheel by its axle: imported wheels (named "wheel-…") turn about their local x, procedural ones about y.
        public static void Spin(Transform w, float degrees) => w.Rotate(w.name.StartsWith("wheel") ? Vector3.right : Vector3.up, degrees, Space.Self);

        public static string LastModelName;   // the model the last TryModel call picked (diagnostics, smoke test)

        static GameObject TryModel(VehicleClassData cls, Transform parent, System.Random rng, out Transform[] wheels)
        {
            wheels = null; LastModelName = null;
            if (!UseModels || !Models.TryGetValue(cls.id, out var names)) return null;
            return BuildModel(cls, names[rng.Next(names.Length)], parent, out wheels);
        }

        public static string[] ModelsFor(string classId) => Models.TryGetValue(classId, out var n) ? n : new string[0];

        // Fit one named model to a class: up-axis fix, yaw, class length, wheels on the ground. Null if it does not load.
        public static GameObject BuildModel(VehicleClassData cls, string name, Transform parent, out Transform[] wheels)
        {
            wheels = null; LastModelName = null;
            var prefab = Resources.Load<GameObject>("Models/Vehicles/" + name);
            if (prefab == null) return null;
            var go = new GameObject(cls.name); go.transform.SetParent(parent, false);
            var model = Object.Instantiate(prefab, go.transform, false);
            model.name = "Model";
            // The Suzuki bikes come from a game rig: motion-blur copies of each wheel layered over the real ones, and light
            // "glow" quads (a headlight beam among them) that need an additive shader and otherwise show as a black blade.
            foreach (var rend in model.GetComponentsInChildren<Renderer>(true))
            {
                var n = rend.gameObject.name;
                if ((n.StartsWith("Wheel_") && n.Contains("_Motion")) || (n.StartsWith("lights_") && n.Contains("_glows_"))) rend.gameObject.SetActive(false);   // inactive: also out of the fitting bounds
            }
            if (LitRemap.Contains(name)) RemapToLit(model);
            var fix = FixOverride?.Invoke(name) ?? (ModelFix.TryGetValue(name, out var f) ? f : Vector3.zero);
            model.transform.localRotation = Quaternion.Euler(0f, ModelYaw.TryGetValue(name, out var yaw) ? yaw : 0f, 0f) * Quaternion.Euler(fix);
            // A model whose long axis lies along x is turned a quarter so its length runs along z (the front/back ambiguity
            // cannot be read from bounds; ModelYaw carries the known cases).
            bool tight = TightFit.Contains(name);
            var b = Measure(model, tight);
            if (b.size.x > b.size.z * 1.15f) { model.transform.localRotation = Quaternion.Euler(0f, 90f, 0f) * model.transform.localRotation; b = Measure(model, tight); }
            // Scale to the class length, feet on the ground, centred on the axle line.
            float k = b.size.z > 0.01f ? cls.len / b.size.z : 1f;
            model.transform.localScale = Vector3.one * k;
            b = Measure(model, tight);
            model.transform.localPosition = new Vector3(-(b.center.x - go.transform.position.x), -(b.min.y - go.transform.position.y), -(b.center.z - go.transform.position.z));
            b = Measure(model, tight);
            var ws = new List<Transform>();
            foreach (var t in model.GetComponentsInChildren<Transform>()) if (t.name.StartsWith("wheel")) ws.Add(t);   // Kenney names its wheels; the Lagos models bake them into the body
            wheels = ws.ToArray();
            foreach (var c in model.GetComponentsInChildren<Collider>()) { if (Application.isPlaying) Object.Destroy(c); else Object.DestroyImmediate(c); }
            var info = go.AddComponent<VehicleModelInfo>(); info.Model = name; info.Height = b.size.y; info.Length = b.size.z; info.Width = b.size.x;
            var col = go.AddComponent<BoxCollider>();
            col.center = new Vector3(0f, b.size.y * 0.5f, 0f); col.size = new Vector3(cls.wid, b.size.y, cls.len);   // class width: the data's lanes assume it
            LastModelName = name;
            return go;
        }

        // Models whose parts carry rotated local boxes, so renderer bounds overstate them (the korope's read 3.8 m square):
        // these are fitted on their vertices instead.
        static readonly HashSet<string> TightFit = new HashSet<string> { "suzuki_carry_minivan" };
        static readonly Dictionary<Mesh, Vector3[]> vertexCache = new Dictionary<Mesh, Vector3[]>();
        static bool warnedUnreadable;

        // Models whose glTF materials render black in player builds (the keke's uses KHR_materials_specular, which works in
        // the editor only): their materials are rebuilt on URP Lit from the base colour texture and factor.
        static readonly HashSet<string> LitRemap = new HashSet<string> { "keke_bajaj_re" };
        static readonly Dictionary<Material, Material> litCache = new Dictionary<Material, Material>();

        static void RemapToLit(GameObject model)
        {
            foreach (var r in model.GetComponentsInChildren<Renderer>(true))
            {
                var mats = r.sharedMaterials;
                for (int i = 0; i < mats.Length; i++)
                {
                    var src = mats[i]; if (src == null) continue;
                    if (!litCache.TryGetValue(src, out var lit))
                    {
                        lit = new Material(ShaderLib.Lit) { name = src.name + " (Lit)" };
                        if (src.HasProperty("baseColorTexture")) lit.SetTexture("_BaseMap", src.GetTexture("baseColorTexture"));
                        if (src.HasProperty("baseColorFactor")) lit.SetColor("_BaseColor", src.GetColor("baseColorFactor"));
                        lit.SetFloat("_Smoothness", 0.35f);
                        litCache[src] = lit;
                    }
                    mats[i] = lit;
                }
                r.sharedMaterials = mats;
            }
        }

        static Bounds Measure(GameObject model, bool tight)
        {
            if (!tight) return Entities.CharacterRig.Bounds(model);
            bool any = false; var b = new Bounds();
            foreach (var mf in model.GetComponentsInChildren<MeshFilter>())
            {
                var mesh = mf.sharedMesh; if (mesh == null) continue;
                if (!mesh.isReadable) { if (!warnedUnreadable) { warnedUnreadable = true; Debug.LogWarning($"RISE: mesh '{mesh.name}' is not readable; fitting {model.transform.parent?.name} on renderer bounds"); } return Entities.CharacterRig.Bounds(model); }
                if (!vertexCache.TryGetValue(mesh, out var verts)) vertexCache[mesh] = verts = mesh.vertices;
                var m = mf.transform.localToWorldMatrix;
                foreach (var v in verts) { var p = m.MultiplyPoint3x4(v); if (any) b.Encapsulate(p); else { b = new Bounds(p, Vector3.zero); any = true; } }
            }
            return any ? b : Entities.CharacterRig.Bounds(model);
        }

        public static GameObject Build(VehicleClassData cls, Transform parent, System.Random rng, out Transform[] wheels)
        {
            var modelled = TryModel(cls, parent, rng, out wheels);
            if (modelled != null) return modelled;
            var go = new GameObject(cls.name);
            go.transform.SetParent(parent, false);
            var t = go.transform;
            float len = cls.len, wid = cls.wid;
            var black = Mat("#141414", 0.3f); var glass = Mat("#1a2530", 0.9f); var yellow = Mat("#f5c518", 0.5f);
            var w = new List<Transform>();
            float height;
            switch (cls.id)
            {
                case "danfo": case "korope": case "brt":
                    height = cls.id == "brt" ? 3f : 2.1f;
                    Part(t, PrimitiveType.Cube, new Vector3(0, height * 0.5f + 0.2f, 0), new Vector3(wid, height, len), cls.id == "brt" ? Mat("#1c4fa0", 0.5f) : yellow);
                    Part(t, PrimitiveType.Cube, new Vector3(0, 1.0f, 0), new Vector3(wid + 0.04f, 0.28f, len + 0.04f), black);          // the black stripe
                    Part(t, PrimitiveType.Cube, new Vector3(0, height * 0.5f + 0.65f, 0.3f), new Vector3(wid + 0.02f, 0.5f, len * 0.7f), glass);
                    foreach (var x in new[] { -wid * 0.42f, wid * 0.42f }) foreach (var z in new[] { len * 0.32f, -len * 0.32f }) w.Add(Wheel(t, new Vector3(x, 0.36f, z), 0.36f));
                    break;
                case "keke":
                    height = 1.0f;
                    Part(t, PrimitiveType.Cube, new Vector3(0, 0.75f, 0), new Vector3(wid, height, len), yellow);
                    Part(t, PrimitiveType.Cube, new Vector3(0, 1.5f, 0), new Vector3(wid + 0.1f, 0.1f, len + 0.1f), black);             // canopy
                    w.Add(Wheel(t, new Vector3(0, 0.3f, len * 0.42f), 0.3f));
                    foreach (var x in new[] { -wid * 0.4f, wid * 0.4f }) w.Add(Wheel(t, new Vector3(x, 0.3f, -len * 0.35f), 0.3f));
                    height = 1.6f;
                    break;
                case "okada": case "motorcycle":
                    Part(t, PrimitiveType.Cube, new Vector3(0, 0.7f, 0), new Vector3(0.4f, 0.4f, len * 0.7f), Mat(CarColours[rng.Next(CarColours.Length)], 0.7f));
                    Part(t, PrimitiveType.Cube, new Vector3(0, 0.95f, -0.3f), new Vector3(0.5f, 0.15f, 0.8f), black);                   // seat
                    w.Add(Wheel(t, new Vector3(0, 0.33f, len * 0.38f), 0.33f)); w.Add(Wheel(t, new Vector3(0, 0.33f, -len * 0.38f), 0.33f));
                    height = 1.2f;
                    break;
                case "police":
                    height = 1.5f;
                    Part(t, PrimitiveType.Cube, new Vector3(0, 0.55f, 0), new Vector3(wid * 0.72f, 0.6f, len), Mat("#1f2b45", 0.8f));
                    Part(t, PrimitiveType.Cube, new Vector3(0, 1.1f, -0.2f), new Vector3(wid * 0.64f, 0.55f, len * 0.5f), glass);
                    Part(t, PrimitiveType.Cube, new Vector3(0, 1.45f, -0.2f), new Vector3(wid * 0.5f, 0.15f, 0.3f), Mat("#3d7cff", 0.9f)).name = "Lightbar";
                    foreach (var x in new[] { -wid * 0.34f, wid * 0.34f }) foreach (var z in new[] { len * 0.3f, -len * 0.3f }) w.Add(Wheel(t, new Vector3(x, 0.32f, z), 0.32f));
                    break;
                case "car": case "pickup": case "van": case "delivery": case "ambulance":
                    height = 1.5f;
                    var paint = Mat(CarColours[rng.Next(CarColours.Length)], 0.92f);
                    Part(t, PrimitiveType.Cube, new Vector3(0, 0.55f, 0), new Vector3(wid * 0.72f, 0.6f, len), paint);
                    Part(t, PrimitiveType.Cube, new Vector3(0, 1.1f, -0.2f), new Vector3(wid * 0.64f, 0.55f, len * 0.5f), glass);
                    foreach (var x in new[] { -wid * 0.34f, wid * 0.34f }) foreach (var z in new[] { len * 0.3f, -len * 0.3f }) w.Add(Wheel(t, new Vector3(x, 0.32f, z), 0.32f));
                    break;
                default:   // trucks, tanker, fire, army, lawma
                    height = 2.8f;
                    string body = cls.id == "fire" ? "#b71c1c" : cls.id == "army" ? "#4b5a2a" : cls.id == "lawma" ? "#e2711d" : cls.id == "tanker" ? "#c9c9c9" : "#6c7a89";
                    Part(t, PrimitiveType.Cube, new Vector3(0, 1.3f, len * 0.3f), new Vector3(wid, 2.2f, len * 0.3f), Mat(body, 0.5f));            // cab
                    Part(t, PrimitiveType.Cube, new Vector3(0, 1.7f, len * 0.3f), new Vector3(wid + 0.02f, 0.6f, len * 0.3f * 0.6f), glass);
                    if (cls.id == "tanker") Part(t, PrimitiveType.Cylinder, new Vector3(0, 1.6f, -len * 0.15f), new Vector3(wid * 0.9f, len * 0.3f, wid * 0.9f), Mat(body, 0.7f), Quaternion.Euler(90, 0, 0));
                    else Part(t, PrimitiveType.Cube, new Vector3(0, 1.5f, -len * 0.18f), new Vector3(wid, 2.4f, len * 0.6f), Mat(body, 0.4f));
                    foreach (var x in new[] { -wid * 0.42f, wid * 0.42f }) foreach (var z in new[] { len * 0.35f, -len * 0.1f, -len * 0.35f }) w.Add(Wheel(t, new Vector3(x, 0.45f, z), 0.45f));
                    break;
            }
            var col = go.AddComponent<BoxCollider>();
            col.center = new Vector3(0, height * 0.5f + 0.1f, 0);
            col.size = new Vector3(wid, height, len);
            wheels = w.ToArray();
            return go;
        }
    }
}
