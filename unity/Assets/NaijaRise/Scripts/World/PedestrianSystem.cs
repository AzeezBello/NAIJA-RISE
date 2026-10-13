using System.Collections.Generic;
using UnityEngine;
using NaijaRise.Data;
using NaijaRise.Entities;

namespace NaijaRise.World
{
    // Ambient Lagosians walking the pavements near the player in everyday wear (fabric prints from the wardrobe
    // data). They stay on pavements, turn back at bridges, water and road ends, and are recycled when far away.
    public class PedestrianSystem : MonoBehaviour
    {
        public int Count = 70;
        public float SpawnRadius = 190f, RecycleRadius = 260f;

        class Ped { public Transform t; public RoadData road; public int side, dir; public float along, speed, phase; }

        WorldData data;
        Transform player, root;
        readonly List<Ped> peds = new List<Ped>();
        System.Random rng = new System.Random(7);

        public void Init(WorldData world, Transform playerTransform, Transform parent)
        {
            data = world; player = playerTransform;
            root = new GameObject("Pedestrians").transform; root.SetParent(parent, false);
            for (int i = 0; i < Count; i++)
            {
                var p = new Ped { t = BuildBody().transform };
                if (!Respawn(p)) { Destroy(p.t.gameObject); continue; }
                peds.Add(p);
            }
        }

        GameObject BuildBody()
        {
            var go = new GameObject("Pedestrian");
            go.transform.SetParent(root, false);
            Color top = data.fabrics.Length > 0 ? Mannequin.Hex(data.fabrics[rng.Next(data.fabrics.Length)].baseColor) : new Color(0.8f, 0.4f, 0.2f);
            Color pants = data.pants.Length > 0 ? Mannequin.Hex(data.pants[rng.Next(data.pants.Length)]) : Color.black;
            Color skin = data.skins.Length > 0 ? Mannequin.Hex(data.skins[rng.Next(data.skins.Length)]) : new Color(0.45f, 0.3f, 0.2f);
            Color? fila = rng.NextDouble() < 0.3 ? (Color?)Mannequin.Hex(rng.NextDouble() < 0.5 ? "#1f3a5f" : "#6e1a2c") : null;
            Mannequin.Build(go.transform, top, pants, skin, fila, 0, 0.9f + (float)rng.NextDouble() * 0.2f);
            return go;
        }

        bool Respawn(Ped p)
        {
            for (int attempt = 0; attempt < 12; attempt++)
            {
                var road = data.roads[rng.Next(data.roads.Length)];
                if (road.cls == "expressway") continue;
                // Pick a point on this road within SpawnRadius of the player.
                float pAlong = road.Along(player.position), pAcross = road.Across(player.position);
                if (Mathf.Abs(pAcross - road.k) > SpawnRadius) continue;
                float a = Mathf.Clamp(pAlong + ((float)rng.NextDouble() * 2f - 1f) * SpawnRadius, road.from + 4f, road.to - 4f);
                if (data.OnBridge(road.axis, road.k, a)) continue;
                p.road = road; p.along = a; p.side = rng.NextDouble() < 0.5 ? -1 : 1; p.dir = rng.NextDouble() < 0.5 ? -1 : 1;
                p.speed = 1.1f + (float)rng.NextDouble() * 0.8f; p.phase = (float)rng.NextDouble() * 6.28f;
                var pos = Position(p);
                if (data.InWater(pos)) continue;
                p.t.position = pos;
                return true;
            }
            return false;
        }

        Vector3 Position(Ped p) => p.road.Point(p.along, p.road.k + p.side * (p.road.width * 0.5f + 1.6f), 0.3f);

        public Transform Nearest(Vector3 pos, float maxDist)
        {
            Transform best = null; float bestD = maxDist * maxDist;
            foreach (var p in peds) { var d = p.t.position - pos; d.y = 0f; if (d.sqrMagnitude < bestD) { bestD = d.sqrMagnitude; best = p.t; } }
            return best;
        }

        // Knocked by a vehicle: the pedestrian is thrown clear and hurries off.
        public void Knock(Transform t)
        {
            foreach (var p in peds) if (p.t == t) { p.along += p.dir * 4f; p.speed = 2.6f; return; }
        }

        void Update()
        {
            float dt = Time.deltaTime;
            foreach (var p in peds)
            {
                p.along += p.dir * p.speed * dt;
                bool turn = p.along < p.road.from + 3f || p.along > p.road.to - 3f || data.OnBridge(p.road.axis, p.road.k, p.along);
                var pos = Position(p);
                if (!turn && data.InWater(pos)) turn = true;
                if (turn) { p.dir = -p.dir; p.along += p.dir * 2f; pos = Position(p); }
                pos.y += Mathf.Abs(Mathf.Sin(Time.time * 7f + p.phase)) * 0.04f;
                p.t.position = pos;
                p.t.rotation = Quaternion.LookRotation(p.road.Forward(p.dir), Vector3.up);
                if ((pos - player.position).sqrMagnitude > RecycleRadius * RecycleRadius) Respawn(p);
            }
        }
    }
}
