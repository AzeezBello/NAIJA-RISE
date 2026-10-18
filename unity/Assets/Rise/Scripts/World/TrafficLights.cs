using System.Collections.Generic;
using UnityEngine;
using Rise.Data;

namespace Rise.World
{
    // Traffic lights at every grid junction whose roads carry lights (expressways excluded). One shared cycle:
    // h-green 12 s, amber 2 s, v-green 12 s, amber 2 s. Traffic stops on red; the player
    // running a red within sight of the LASTMA post pays ₦5,000 or picks up heat.
    public class TrafficLights : MonoBehaviour
    {
        public const float Cycle = 28f;
        public float T;
        readonly HashSet<(float, float)> lit = new HashSet<(float, float)>();   // (vRoadK, hRoadK)
        Material hLamp, vLamp;
        static readonly Color Green = new Color(0.1f, 0.77f, 0.35f), Amber = new Color(1f, 0.69f, 0.13f), Red = new Color(1f, 0.18f, 0.18f);
        public int Count => lit.Count;

        public string LightFor(string axis)
        {
            float p = T % Cycle;
            if (axis == "h") return p < 12f ? "green" : p < 14f ? "amber" : "red";
            return p < 14f ? "red" : p < 26f ? "green" : "amber";
        }

        public bool HasLight(float vK, float hK) => lit.Contains((vK, hK));

        public void Build(WorldData data, Transform parent)
        {
            var root = new GameObject("Traffic lights").transform; root.SetParent(parent, false);
            var shader = ShaderLib.Lit;
            hLamp = Lamp(shader, "lamp-h"); vLamp = Lamp(shader, "lamp-v");
            var pole = new Material(shader) { color = new Color(0.25f, 0.26f, 0.28f) };
            var head = new Material(shader) { color = new Color(0.1f, 0.1f, 0.11f) };
            foreach (var j in data.junctions)
            {
                var h = data.FindRoad("h", j.z); var v = data.FindRoad("v", j.x);
                if (h == null || v == null || !h.lights) continue;
                lit.Add((v.k, h.k));
                float hw = v.width * 0.5f + 1.5f, hd = h.width * 0.5f + 1.5f;
                foreach (var (sx, sz, axis) in new[] { (1, 1, "h"), (-1, -1, "h"), (1, -1, "v"), (-1, 1, "v") })
                {
                    var basePos = WorldData.W(j.x + sx * hw, 0.3f, j.z + sz * hd);
                    var p = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                    p.name = "Pole"; p.transform.SetParent(root, false); p.transform.position = basePos + Vector3.up * 2.3f; p.transform.localScale = new Vector3(0.2f, 2.3f, 0.2f);
                    p.GetComponent<MeshRenderer>().sharedMaterial = pole; p.isStatic = true;
                    var hb = GameObject.CreatePrimitive(PrimitiveType.Cube);
                    hb.name = "Head"; hb.transform.SetParent(root, false); hb.transform.position = basePos + Vector3.up * 5.25f; hb.transform.localScale = new Vector3(0.5f, 1.3f, 0.5f);
                    hb.GetComponent<MeshRenderer>().sharedMaterial = head; Remove(hb.GetComponent<Collider>()); hb.isStatic = true;
                    var lamp = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                    lamp.name = "Lamp " + axis; lamp.transform.SetParent(root, false);
                    // The lamp faces the traffic it controls: along world x for h roads, along world z for v roads.
                    lamp.transform.position = basePos + Vector3.up * 5.55f + (axis == "h" ? new Vector3(0, 0, -sz * 0.26f) : new Vector3(-sx * 0.26f, 0, 0));
                    lamp.transform.localScale = Vector3.one * 0.32f;
                    lamp.GetComponent<MeshRenderer>().sharedMaterial = axis == "h" ? hLamp : vLamp; Remove(lamp.GetComponent<Collider>());
                }
            }
            StaticBatchingUtility.Combine(root.gameObject);
            Apply();
        }

        static Material Lamp(Shader shader, string name)
        {
            var m = new Material(shader) { name = name, color = Red };
            m.EnableKeyword("_EMISSION"); m.globalIlluminationFlags = MaterialGlobalIlluminationFlags.RealtimeEmissive;
            return m;
        }

        static void Remove(Object o) { if (Application.isPlaying) Destroy(o); else DestroyImmediate(o); }

        void Update() { T += Time.deltaTime; Apply(); }

        void Apply()
        {
            if (hLamp == null) return;
            Set(hLamp, LightFor("h")); Set(vLamp, LightFor("v"));
        }

        static void Set(Material m, string state)
        {
            var c = state == "green" ? Green : state == "amber" ? Amber : Red;
            if (m.color == c) return;
            m.color = c; m.SetColor("_EmissionColor", c * 2.2f);
        }
    }
}
