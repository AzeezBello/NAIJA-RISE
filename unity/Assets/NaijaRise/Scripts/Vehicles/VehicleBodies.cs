using System.Collections.Generic;
using UnityEngine;
using NaijaRise.Data;

namespace NaijaRise.Vehicles
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
            standard ??= Shader.Find("Universal Render Pipeline/Lit");
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

        // Kenney Car Kit models (CC0, Resources/Models/Vehicles) per class; procedural bodies for the Lagos-specific ones.
        static readonly Dictionary<string, string[]> Models = new Dictionary<string, string[]>
        {
            ["car"] = new[] { "sedan", "sedan-sports", "suv", "suv-luxury", "hatchback-sports", "taxi" },
            ["police"] = new[] { "police" }, ["lawma"] = new[] { "garbage-truck" }, ["fire"] = new[] { "firetruck" },
            ["ambulance"] = new[] { "ambulance" }, ["van"] = new[] { "van" }, ["delivery"] = new[] { "delivery", "delivery-flat" },
            ["truck"] = new[] { "truck", "truck-flat" }, ["army"] = new[] { "truck" }, ["pickup"] = new[] { "truck-flat" },
        };
        public static bool UseModels = true;

        // Spin a wheel by its axle: imported wheels (named "wheel-…") turn about their local x, procedural ones about y.
        public static void Spin(Transform w, float degrees) => w.Rotate(w.name.StartsWith("wheel") ? Vector3.right : Vector3.up, degrees, Space.Self);

        static GameObject TryModel(VehicleClassData cls, Transform parent, System.Random rng, out Transform[] wheels)
        {
            wheels = null;
            if (!UseModels || !Models.TryGetValue(cls.id, out var names)) return null;
            var prefab = Resources.Load<GameObject>("Models/Vehicles/" + names[rng.Next(names.Length)]);
            if (prefab == null) return null;
            var go = new GameObject(cls.name); go.transform.SetParent(parent, false);
            var model = Object.Instantiate(prefab, go.transform, false);
            model.name = "Model";
            model.transform.localRotation = Quaternion.identity;   // glTFast keeps glTF +Z as Unity +z: the models already face forward
            // Scale to the class length, feet on the ground, centred on the axle line.
            var b = Entities.CharacterRig.Bounds(model);
            float k = b.size.z > 0.01f ? cls.len / b.size.z : 1f;
            model.transform.localScale = Vector3.one * k;
            b = Entities.CharacterRig.Bounds(model);
            model.transform.localPosition = new Vector3(-(b.center.x - go.transform.position.x), -(b.min.y - go.transform.position.y), -(b.center.z - go.transform.position.z));
            b = Entities.CharacterRig.Bounds(model);
            if (cls.id == "army") foreach (var r in model.GetComponentsInChildren<Renderer>()) foreach (var m in r.materials) { if (m.HasProperty("baseColorFactor")) m.SetColor("baseColorFactor", new Color(0.55f, 0.6f, 0.4f)); else m.color = new Color(0.55f, 0.6f, 0.4f); }
            var ws = new List<Transform>();
            foreach (var t in model.GetComponentsInChildren<Transform>()) if (t.name.StartsWith("wheel")) ws.Add(t);
            wheels = ws.ToArray();
            foreach (var c in model.GetComponentsInChildren<Collider>()) Object.Destroy(c);
            var col = go.AddComponent<BoxCollider>();
            col.center = new Vector3(0f, b.size.y * 0.5f, 0f); col.size = new Vector3(cls.wid, b.size.y, cls.len);   // class width: the data's lanes assume it
            return go;
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
