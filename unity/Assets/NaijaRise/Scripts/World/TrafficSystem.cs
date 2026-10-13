using System.Collections.Generic;
using UnityEngine;
using NaijaRise.Data;

namespace NaijaRise.World
{
    // Ambient traffic: danfos, keke napeps and cars follow the road grid in lanes (right-hand traffic), keep their
    // distance from the vehicle ahead, ride the bridge decks, obey the class speed and the bridge rush-hour profile.
    public class TrafficSystem : MonoBehaviour
    {
        public int Count = 110;
        public float BaseSpeed = 13f;   // m/s for a class-1.0 road

        class Vehicle { public Transform t; public RoadData road; public int dir; public int lane; public float along, speed, cruise, length; public Transform[] wheels; }

        WorldData data;
        DayNightCycle clock;
        readonly List<Vehicle> vehicles = new List<Vehicle>();
        readonly Dictionary<string, Material> materials = new Dictionary<string, Material>();
        Shader standard;
        static readonly string[] CarColours = { "#d8d8d8", "#1f1f24", "#8a1c1c", "#2a4d8f", "#b0b7bd", "#5a5a5f", "#e8e3d3", "#3f6b3a" };

        public void Init(WorldData world, DayNightCycle dayNight, Transform parent)
        {
            data = world; clock = dayNight; standard = Shader.Find("Standard");
            var root = new GameObject("Traffic").transform; root.SetParent(parent, false);
            var rng = new System.Random(2026);

            // Pick roads weighted by length × class density.
            var weights = new List<float>(); float total = 0f;
            foreach (var r in data.roads) { float w = Mathf.Max(0f, r.Length) * r.density; weights.Add(w); total += w; }

            for (int i = 0; i < Count; i++)
            {
                float pick = (float)rng.NextDouble() * total; int idx = 0;
                for (; idx < weights.Count - 1; idx++) { pick -= weights[idx]; if (pick <= 0f) break; }
                var road = data.roads[idx];
                var v = new Vehicle { road = road, dir = rng.NextDouble() < 0.5 ? -1 : 1, lane = road.width >= 30f && rng.NextDouble() < 0.5 ? 1 : 0 };
                v.along = Mathf.Lerp(road.from + 6f, road.to - 6f, (float)rng.NextDouble());
                double kind = rng.NextDouble();
                v.t = kind < 0.3 ? Danfo(root, rng) : kind < 0.42 ? Keke(root) : Car(root, rng, out v.wheels);
                v.length = kind < 0.3 ? 5.4f : kind < 0.42 ? 2.8f : 4.5f;
                v.cruise = BaseSpeed * road.speed * (kind < 0.3 ? 0.9f : kind < 0.42 ? 0.7f : 1f) * (0.85f + 0.3f * (float)rng.NextDouble());
                v.speed = v.cruise;
                vehicles.Add(v);
                Place(v);
            }
        }

        Material Mat(string hex, float gloss = 0.6f)
        {
            if (materials.TryGetValue(hex, out var m)) return m;
            m = new Material(standard); ColorUtility.TryParseHtmlString(hex, out var c); m.color = c; m.SetFloat("_Glossiness", gloss);
            return materials[hex] = m;
        }

        Transform Part(Transform parent, PrimitiveType type, Vector3 pos, Vector3 scale, Material m, Quaternion? rot = null)
        {
            var p = GameObject.CreatePrimitive(type);
            p.transform.SetParent(parent, false); p.transform.localPosition = pos; p.transform.localScale = scale;
            if (rot.HasValue) p.transform.localRotation = rot.Value;
            p.GetComponent<MeshRenderer>().sharedMaterial = m;
            Destroy(p.GetComponent<Collider>());
            return p.transform;
        }

        // Vehicles are built with +z forward; the root carries a single box collider for the camera to see.
        Transform Car(Transform root, System.Random rng, out Transform[] wheels)
        {
            var go = new GameObject("Car"); go.transform.SetParent(root, false);
            var paint = Mat(CarColours[rng.Next(CarColours.Length)], 0.8f);
            Part(go.transform, PrimitiveType.Cube, new Vector3(0, 0.55f, 0), new Vector3(1.8f, 0.6f, 4.4f), paint);
            Part(go.transform, PrimitiveType.Cube, new Vector3(0, 1.1f, -0.2f), new Vector3(1.6f, 0.55f, 2.3f), Mat("#1a2530", 0.9f));
            wheels = new Transform[4];
            int i = 0;
            foreach (var x in new[] { -0.85f, 0.85f }) foreach (var z in new[] { 1.4f, -1.4f })
                wheels[i++] = Part(go.transform, PrimitiveType.Cylinder, new Vector3(x, 0.32f, z), new Vector3(0.64f, 0.12f, 0.64f), Mat("#141414", 0.2f), Quaternion.Euler(0, 0, 90));
            var col = go.AddComponent<BoxCollider>(); col.center = new Vector3(0, 0.75f, 0); col.size = new Vector3(1.8f, 1.5f, 4.4f);
            return go.transform;
        }

        Transform Danfo(Transform root, System.Random rng)
        {
            var go = new GameObject("Danfo"); go.transform.SetParent(root, false);
            Part(go.transform, PrimitiveType.Cube, new Vector3(0, 1.15f, 0), new Vector3(2.0f, 1.9f, 5.2f), Mat("#f5c518", 0.5f));
            Part(go.transform, PrimitiveType.Cube, new Vector3(0, 1.0f, 0), new Vector3(2.04f, 0.28f, 5.24f), Mat("#141414", 0.3f));   // the black stripe
            Part(go.transform, PrimitiveType.Cube, new Vector3(0, 1.55f, 0.4f), new Vector3(2.02f, 0.5f, 3.8f), Mat("#1a2530", 0.9f));  // windows
            foreach (var x in new[] { -0.95f, 0.95f }) foreach (var z in new[] { 1.7f, -1.7f })
                Part(go.transform, PrimitiveType.Cylinder, new Vector3(x, 0.36f, z), new Vector3(0.72f, 0.12f, 0.72f), Mat("#141414", 0.2f), Quaternion.Euler(0, 0, 90));
            var col = go.AddComponent<BoxCollider>(); col.center = new Vector3(0, 1.1f, 0); col.size = new Vector3(2f, 2.2f, 5.2f);
            return go.transform;
        }

        Transform Keke(Transform root)
        {
            var go = new GameObject("Keke"); go.transform.SetParent(root, false);
            Part(go.transform, PrimitiveType.Cube, new Vector3(0, 0.75f, 0), new Vector3(1.4f, 1.0f, 2.6f), Mat("#f5c518", 0.5f));
            Part(go.transform, PrimitiveType.Cube, new Vector3(0, 1.5f, 0), new Vector3(1.5f, 0.1f, 2.7f), Mat("#141414", 0.3f));   // canopy
            Part(go.transform, PrimitiveType.Cylinder, new Vector3(0, 0.3f, 1.1f), new Vector3(0.6f, 0.1f, 0.6f), Mat("#141414", 0.2f), Quaternion.Euler(0, 0, 90));
            foreach (var x in new[] { -0.6f, 0.6f })
                Part(go.transform, PrimitiveType.Cylinder, new Vector3(x, 0.3f, -0.9f), new Vector3(0.6f, 0.1f, 0.6f), Mat("#141414", 0.2f), Quaternion.Euler(0, 0, 90));
            var col = go.AddComponent<BoxCollider>(); col.center = new Vector3(0, 0.8f, 0); col.size = new Vector3(1.4f, 1.6f, 2.6f);
            return go.transform;
        }

        float RushFactor(RoadData r, float along)
        {
            if (clock == null) return 1f;
            float h = clock.Clock;
            bool bridge = data.OnBridge(r.axis, r.k, along);
            bool rush = (h >= 7f && h < 10f) || (h >= 16f && h < 19.5f);
            if (bridge) return rush ? 0.45f : (h >= 22f || h < 5f) ? 1.3f : 1f;
            return rush && (r.cls == "highway" || r.cls == "main") ? 0.7f : 1f;
        }

        void Update()
        {
            float dt = Time.deltaTime;
            for (int i = 0; i < vehicles.Count; i++)
            {
                var v = vehicles[i];
                float target = v.cruise * RushFactor(v.road, v.along);
                // Keep distance from the nearest vehicle ahead in the same lane and direction.
                float gap = float.MaxValue; float aheadSpeed = 0f;
                for (int j = 0; j < vehicles.Count; j++)
                {
                    if (i == j) continue; var o = vehicles[j];
                    if (o.road != v.road || o.dir != v.dir || o.lane != v.lane) continue;
                    float d = (o.along - v.along) * v.dir;
                    if (d > 0f && d < gap) { gap = d; aheadSpeed = o.speed; }
                }
                float minGap = v.length * 0.5f + 4f;
                if (gap < minGap) target = 0f;
                else if (gap < minGap + 10f) target = Mathf.Min(target, aheadSpeed * 0.95f);
                v.speed = Mathf.MoveTowards(v.speed, target, (target < v.speed ? 10f : 4f) * dt);
                v.along += v.dir * v.speed * dt;
                if (v.dir > 0 && v.along > v.road.to - 4f) v.along = v.road.from + 4f;
                if (v.dir < 0 && v.along < v.road.from + 4f) v.along = v.road.to - 4f;
                if (v.wheels != null) foreach (var w in v.wheels) w.Rotate(Vector3.up, v.speed * dt * 120f, Space.Self);
                Place(v);
            }
        }

        void Place(Vehicle v)
        {
            var r = v.road;
            var fwd = r.Forward(v.dir);
            var right = Vector3.Cross(Vector3.up, fwd);
            float offset = r.width * (0.25f + 0.17f * v.lane);
            var p = r.Point(v.along, r.k) + right * offset;
            p.y = data.DeckHeightAt(p.x, p.z) + 0.11f;
            v.t.position = p;
            v.t.rotation = Quaternion.LookRotation(fwd, Vector3.up);
        }
    }
}
