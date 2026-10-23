using System.Collections.Generic;
using UnityEngine;
using Rise.Data;
using Rise.Entities;

namespace Rise.World
{
    // Ambient Lagosians walking the pavements near the player in everyday wear (fabric prints from the wardrobe
    // data). They stay on pavements, turn back at bridges, water and road ends, and are recycled when far away.
    public class PedestrianSystem : MonoBehaviour
    {
        public int Count = 84;
        public float SpawnRadius = 190f, RecycleRadius = 260f;

        class Ped { public Transform t; public RigInstance rig; public RoadData road; public int side, dir; public float along, speed, phase, hitT; public string role; public bool female; }
        static readonly string[] Roles = { "trader", "office", "youth", "wander" };
        public int RiggedCount { get; private set; }
        public int CesiumCount { get; private set; }
        public int FemaleCount { get; private set; }
        public int Alive => peds.Count;
        public int BodyColliders { get { int n = 0; foreach (var p in peds) if (p.t.GetComponent<CapsuleCollider>() != null) n++; return n; } }

        WorldData data;
        DayNightCycle clock;
        Transform player, root;
        readonly List<Ped> peds = new List<Ped>();
        System.Random rng = new System.Random(7);

        public void Init(WorldData world, Transform playerTransform, Transform parent)
        {
            data = world; player = playerTransform;
            clock = FindAnyObjectByType<DayNightCycle>();
            root = new GameObject("Pedestrians").transform; root.SetParent(parent, false);
            for (int i = 0; i < Count; i++)
            {
                bool isFemale = (i % 2 == 0) || (i % 5 == 0);
                var p = new Ped { role = Roles[i % Roles.Length], female = isFemale };
                p.t = BuildBody(isFemale, out p.rig).transform;
                if (p.rig != null) { RiggedCount++; if (p.rig.Cesium) CesiumCount++; }
                if (!Respawn(p)) { Destroy(p.t.gameObject); continue; }
                if (isFemale) FemaleCount++;
                peds.Add(p);
            }
        }

        GameObject BuildBody(bool isFemale, out RigInstance rig)
        {
            rig = null;
            var go = new GameObject(isFemale ? "Pedestrian (Female)" : "Pedestrian");
            go.transform.SetParent(root, false);
            // A body to bump into: kinematic so the simulation keeps moving them by transform.
            var col = go.AddComponent<CapsuleCollider>(); col.center = new Vector3(0f, 0.9f, 0f); col.radius = 0.3f; col.height = 1.75f;
            var rb = go.AddComponent<Rigidbody>(); rb.isKinematic = true; rb.useGravity = false;
            // The street draws random outfits, fabrics, skin tones, heights and caps/gele headwraps so no two pedestrians look alike.
            int fabric = data.fabrics.Length > 0 ? rng.Next(data.fabrics.Length) : 0;
            Color top = data.fabrics.Length > 0 ? Mannequin.Hex(data.fabrics[fabric].baseColor) : new Color(0.8f, 0.4f, 0.2f);
            Color pants = data.pants.Length > 0 ? Mannequin.Hex(data.pants[rng.Next(data.pants.Length)]) : Color.black;
            Color skin = data.skins.Length > 0 ? Mannequin.Hex(data.skins[rng.Next(data.skins.Length)]) : new Color(0.45f, 0.3f, 0.2f);
            string[] geleColors = { "#f2c230", "#6e1a2c", "#4a2a8c", "#1f7a4d", "#e07b1a" };
            Color? cap = isFemale
                ? (rng.NextDouble() < 0.45 ? (Color?)Mannequin.Hex(geleColors[rng.Next(geleColors.Length)]) : null)
                : (rng.NextDouble() < 0.3 ? (Color?)Mannequin.Hex(rng.NextDouble() < 0.5 ? "#1f3a5f" : "#6e1a2c") : null);
            string[] hair = { "#120b08", "#3a2214", "#6b3e1a", "#b0b0b0", "#d62828" };
            int[] femOutfits = { 9, 10, 0, 9, 10 }; // Gown, Skirt & blouse, Ankara
            int[] femHair = { 3, 2, 3, 0 };         // Braids, Afro, Short
            int outfitIdx = isFemale ? femOutfits[rng.Next(femOutfits.Length)] : rng.Next(Mathf.Max(1, data.outfits.Length));
            int bodyIdx = isFemale ? (rng.NextDouble() < 0.6 ? 0 : 1) : rng.Next(Mathf.Max(1, data.bodyTypes.Length));
            int hairIdx = isFemale ? femHair[rng.Next(femHair.Length)] : rng.Next(Mathf.Max(1, data.hairStyles.Length));
            var look = new Look
            {
                Fabric = fabric, Pants = pants, Skin = skin,
                Hair = Mannequin.Hex(hair[rng.Next(isFemale ? hair.Length : 4)]),
                Cap = cap,
                Outfit = Mathf.Clamp(outfitIdx, 0, Mathf.Max(0, data.outfits.Length - 1)),
                BodyType = Mathf.Clamp(bodyIdx, 0, Mathf.Max(0, data.bodyTypes.Length - 1)),
                HairStyle = Mathf.Clamp(hairIdx, 0, Mathf.Max(0, data.hairStyles.Length - 1)),
                FacialHair = isFemale ? 0 : (rng.NextDouble() < 0.35 ? rng.Next(Mathf.Max(1, data.facialHair.Length)) : 0),
                Accessory = cap.HasValue ? 1 : rng.NextDouble() < 0.25 ? 3 + rng.Next(2) : 0
            };
            // Ready Player Me weight ~0.75, CesiumMan ~0.25.
            float height = isFemale ? (1.58f + (float)rng.NextDouble() * 0.22f) : (1.65f + (float)rng.NextDouble() * 0.28f);
            bool useRig = CharacterRig.Available && (!GameBootstrap.LightWebGL || RiggedCount < 10);
            if (useRig) rig = CharacterRig.Build(go.transform, look, 0, height, rng.NextDouble() < 0.25);
            else Mannequin.Build(go.transform, top, pants, skin, cap, 0, 0.9f + (float)rng.NextDouble() * 0.2f);
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

        // Knocked by a vehicle or street attack: the pedestrian stumbles back, flails, and hurries off.
        public void Knock(Transform t)
        {
            foreach (var p in peds) if (p.t == t) { p.along += p.dir * 2.2f; p.speed = 2.8f; p.hitT = 0.58f; return; }
        }

        float SchedulePace(string role, float h)
        {
            switch (role)
            {
                case "trader": return h >= 6f && h <= 19f ? 1.12f : 0.8f;
                case "office": return (h >= 7f && h <= 9.5f) || (h >= 17f && h <= 19.5f) ? 1.3f : 0.95f;
                case "youth": return h >= 15f && h <= 23.5f ? 1.2f : 0.9f;
                default: return 1f;
            }
        }

        void Update()
        {
            float dt = Time.deltaTime;
            float h = clock != null ? clock.Clock : 12f;
            foreach (var p in peds)
            {
                if (p.hitT > 0f) p.hitT = Mathf.Max(0f, p.hitT - dt);
                float spd = p.speed * SchedulePace(p.role, h);
                p.along += p.dir * spd * dt;
                bool turn = p.along < p.road.from + 3f || p.along > p.road.to - 3f || data.OnBridge(p.road.axis, p.road.k, p.along);
                var pos = Position(p);
                if (!turn && data.InWater(pos)) turn = true;
                if (turn) { p.dir = -p.dir; p.along += p.dir * 2f; pos = Position(p); }
                if (p.rig != null) p.rig.SetState(spd > 2.2f ? "run" : "walk", spd > 2.2f ? spd / CharacterRig.RunClipSpeed : spd / CharacterRig.WalkClipSpeed);
                else pos.y += Mathf.Abs(Mathf.Sin(Time.time * 7f + p.phase)) * 0.04f;
                p.t.position = pos;
                p.t.rotation = Quaternion.LookRotation(p.road.Forward(p.dir), Vector3.up);
                if ((pos - player.position).sqrMagnitude > RecycleRadius * RecycleRadius) Respawn(p);
            }
        }

        void LateUpdate()
        {
            foreach (var p in peds)
            {
                if (p.hitT <= 0.001f || p.t == null) continue;
                float u = 1f - (p.hitT / 0.58f);
                if (p.rig != null) p.rig.ApplyCombatPose(u, 0.8f, 1, "", false);
                else Mannequin.ApplyCombatPose(p.t, u, 0.8f, 1, "", false);
            }
        }
    }
}
