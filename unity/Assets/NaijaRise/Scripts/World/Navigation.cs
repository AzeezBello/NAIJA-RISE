using System.Collections.Generic;
using UnityEngine;
using NaijaRise.Data;

namespace NaijaRise.World
{
    // GPS (src/systems/navigation.js): a bobbing marker on the objective and a dashed-feel route line along the road
    // grid. Junctions are nodes, stretches between neighbouring junctions are edges, and the endpoints join the graph
    // along their own road; Dijkstra finds the way. Everything in data coordinates, drawn in world coordinates.
    public class Navigation : MonoBehaviour
    {
        WorldData data;
        LineRenderer line;
        Transform marker, arrow;
        float refreshT;
        class Node { public float x, z; public List<(Node to, float w)> edges = new List<(Node, float)>(); }
        readonly List<Node> nodes = new List<Node>();
        readonly Dictionary<string, List<Node>> onRoad = new Dictionary<string, List<Node>>();

        [System.NonSerialized] public Vector3? Target;   // world position of the objective, or null (runtime only)
        public float RouteLength { get; private set; }
        public Vector3 NextWaypoint { get; private set; }

        public void Init(WorldData world, Transform parent)
        {
            data = world;
            foreach (var j in data.junctions)
            {
                var n = new Node { x = j.x, z = j.z }; nodes.Add(n);
                Key("h", j.z).Add(n); Key("v", j.x).Add(n);
            }
            foreach (var r in data.roads)
            {
                if (!onRoad.TryGetValue(r.axis + ":" + r.k, out var list)) continue;
                list.Sort((a, b) => (r.Horizontal ? a.x : a.z).CompareTo(r.Horizontal ? b.x : b.z));
                for (int i = 1; i < list.Count; i++)
                {
                    var u = list[i - 1]; var v = list[i]; float d = Mathf.Sqrt((u.x - v.x) * (u.x - v.x) + (u.z - v.z) * (u.z - v.z));
                    u.edges.Add((v, d)); v.edges.Add((u, d));
                }
            }
            var unlit = ShaderLib.Unlit;
            var go = new GameObject("GPS route"); go.transform.SetParent(parent, false);
            line = go.AddComponent<LineRenderer>();
            line.material = new Material(unlit) { color = new Color(0.24f, 1f, 0.47f, 0.85f) };
            line.widthMultiplier = 0.7f; line.numCornerVertices = 2; line.alignment = LineAlignment.View; line.positionCount = 0;
            line.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;

            marker = GameObject.CreatePrimitive(PrimitiveType.Cylinder).transform;
            marker.name = "Mission marker"; marker.SetParent(parent, false); marker.localScale = new Vector3(3.4f, 0.09f, 3.4f);
            marker.GetComponent<MeshRenderer>().sharedMaterial = new Material(unlit) { color = new Color(0.24f, 1f, 0.47f, 0.9f) };
            Destroy(marker.GetComponent<Collider>());
            marker.gameObject.SetActive(false);
        }

        List<Node> Key(string axis, float k) { var key = axis + ":" + k; if (!onRoad.TryGetValue(key, out var l)) onRoad[key] = l = new List<Node>(); return l; }

        // Nearest road to a data point, with the snapped point on it.
        bool Snap(float x, float z, out RoadData road, out float sx, out float sz, out float d)
        {
            road = null; sx = x; sz = z; d = float.MaxValue;
            foreach (var r in data.roads)
            {
                float along = r.Horizontal ? x : z, across = r.Horizontal ? z : x;
                if (along < r.from - 20f || along > r.to + 20f) continue;
                float dd = Mathf.Abs(across - r.k);
                if (dd < d) { d = dd; road = r; float a = Mathf.Clamp(along, r.from, r.to); sx = r.Horizontal ? a : r.k; sz = r.Horizontal ? r.k : a; }
            }
            return road != null;
        }

        // Route between two world positions as a list of world points along the roads.
        public List<Vector3> Route(Vector3 fromW, Vector3 toW)
        {
            float ax = fromW.x, az = WorldData.DataZ(fromW.z), bx = toW.x, bz = WorldData.DataZ(toW.z);
            var pts = new List<Vector2> { new Vector2(ax, az) };
            if (!Snap(ax, az, out var A, out float asx, out float asz, out float ad) || !Snap(bx, bz, out var B, out float bsx, out float bsz, out float bd)) { pts.Add(new Vector2(bx, bz)); return ToWorld(pts); }
            if (ad > 3f) pts.Add(new Vector2(asx, asz));
            if (!(A == B))
            {
                var starts = new List<(Node, float)>(); foreach (var n in Key(A.axis, A.k)) starts.Add((n, Mathf.Abs((A.Horizontal ? n.x : n.z) - (A.Horizontal ? asx : asz))));
                var goals = new Dictionary<Node, float>(); foreach (var n in Key(B.axis, B.k)) goals[n] = Mathf.Abs((B.Horizontal ? n.x : n.z) - (B.Horizontal ? bsx : bsz));
                var path = Dijkstra(starts, goals);
                if (path != null) foreach (var n in path) pts.Add(new Vector2(n.x, n.z));
            }
            if (bd > 3f) pts.Add(new Vector2(bsx, bsz));
            pts.Add(new Vector2(bx, bz));
            var clean = new List<Vector2>();
            foreach (var p in pts) if (clean.Count == 0 || (p - clean[clean.Count - 1]).magnitude > 0.5f) clean.Add(p);
            return ToWorld(clean);
        }

        List<Vector3> ToWorld(List<Vector2> pts)
        {
            var w = new List<Vector3>(pts.Count);
            foreach (var p in pts) { var v = WorldData.W(p.x, 0f, p.y); v.y = data.DeckHeightAtData(p.x, p.y) + 0.35f; w.Add(v); }
            return w;
        }

        List<Node> Dijkstra(List<(Node n, float d)> starts, Dictionary<Node, float> goals)
        {
            var dist = new Dictionary<Node, float>(); var prev = new Dictionary<Node, Node>(); var open = new List<Node>();
            foreach (var (n, d) in starts) { if (!dist.ContainsKey(n) || d < dist[n]) dist[n] = d; if (!open.Contains(n)) open.Add(n); }
            Node best = null; float bestD = float.MaxValue;
            while (open.Count > 0)
            {
                open.Sort((p, q) => dist[p].CompareTo(dist[q]));
                var u = open[0]; open.RemoveAt(0); float du = dist[u];
                if (goals.TryGetValue(u, out var g) && du + g < bestD) { bestD = du + g; best = u; }
                if (du > bestD) break;
                foreach (var (v, w) in u.edges)
                {
                    float nd = du + w;
                    if (!dist.TryGetValue(v, out var old) || nd < old) { dist[v] = nd; prev[v] = u; if (!open.Contains(v)) open.Add(v); }
                }
            }
            if (best == null) return null;
            var path = new List<Node>(); for (var n = best; n != null; n = prev.TryGetValue(n, out var p) ? p : null) path.Insert(0, n);
            return path;
        }

        public void Refresh(Vector3 from)
        {
            if (Target == null) { line.positionCount = 0; marker.gameObject.SetActive(false); RouteLength = 0f; return; }
            var pts = Route(from, Target.Value);
            line.positionCount = pts.Count; line.SetPositions(pts.ToArray());
            float len = 0f; for (int i = 1; i < pts.Count; i++) len += Vector3.Distance(pts[i], pts[i - 1]);
            RouteLength = len;
            NextWaypoint = pts.Count > 1 ? pts[1] : Target.Value;
            marker.gameObject.SetActive(true);
            var m = Target.Value; m.y = data.DeckHeightAt(m) + 0.25f; marker.position = m;
        }

        public void Tick(Vector3 from)
        {
            refreshT -= Time.deltaTime;
            if (refreshT <= 0f) { refreshT = 0.5f; Refresh(from); }
            if (marker.gameObject.activeSelf) { marker.Rotate(Vector3.up, Time.deltaTime * 60f); var p = marker.position; p.y = data.DeckHeightAt(p) + 0.25f + Mathf.Sin(Time.time * 3.6f) * 0.1f; marker.position = p; }
        }
    }
}
