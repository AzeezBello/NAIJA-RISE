using System.Collections.Generic;
using UnityEngine;
using Rise.Data;
using Rise.Entities;

namespace Rise.World
{
    // Agberos at the bus stops, uniformed service NPCs
    // standing at their posts, night hustlers outside the clubs after 20:00 (mature content, off by default), the owambe
    // crowd at the event centre from 19:00, and the pet dog that follows you and keeps agberos away.
    public class StreetLife : MonoBehaviour
    {
        public class Agbero
        {
            public Transform t;
            public RigInstance rig;
            public Vector3 pos;
            public BusStopData stop;
            public float cool;
            public float fightT;

            public void TriggerFight(Vector3 attackerPos)
            {
                fightT = 0.68f;
                if (t == null) return;
                Vector3 toAttacker = attackerPos - t.position;
                toAttacker.y = 0f;
                if (toAttacker.sqrMagnitude > 0.01f)
                    t.rotation = Quaternion.LookRotation(toAttacker.normalized, Vector3.up);
            }
        }
        public class GroundItem { public Transform t; public Transform prop; public Vector3 pos; public string id, label; public int cash; public float respawn; public bool Active => respawn <= 0f && t != null && t.gameObject.activeSelf; }
        public class ServicePatrol { public Transform t; public Vector3 home; public Vector3 axis; public float phase, radius; }
        public class FishingBoat { public Transform t; public Vector3 a, b; public float speed, phase; }
        [System.NonSerialized] public readonly List<Agbero> Agberos = new List<Agbero>();
        [System.NonSerialized] public readonly List<GroundItem> GroundItems = new List<GroundItem>();
        public readonly List<Transform> Service = new List<Transform>();
        readonly List<ServicePatrol> servicePatrols = new List<ServicePatrol>();
        readonly List<FishingBoat> fishingBoats = new List<FishingBoat>();
        [System.NonSerialized] public readonly List<(Transform t, string name)> Nightlife = new List<(Transform, string)>();
        readonly List<Transform> crowd = new List<Transform>();
        Transform pet; Animation petAnim; int partyDay = -1;
        WorldData data; Transform player; DayNightCycle clock; Transform root;

        public void Init(WorldData world, Transform playerTransform, DayNightCycle dayNight, Transform parent)
        {
            data = world; player = playerTransform; clock = dayNight;
            root = new GameObject("Street life").transform; root.SetParent(parent, false);
            var rng = new System.Random(23);
            foreach (var b in data.busStops)
                for (int i = 0; i < b.agberos; i++)
                {
                    var pos = WorldData.W(b.x - 6f + i * 12f, 0f, b.z - 2.5f); pos.y = data.DeckHeightAt(pos) + 0.3f;
                    var go = new GameObject("Agbero"); go.transform.SetParent(root, false); go.transform.position = pos; go.transform.rotation = Quaternion.Euler(0, 180, 0);
                    var look = new Look { Fabric = 8, Pants = Mannequin.Hex(rng.NextDouble() < 0.5 ? "#c8d400" : "#2bb34a"), Skin = Mannequin.Hex("#5a3a28"), Hair = Color.black, Cap = Mannequin.Hex("#d62828"), BodyType = 2, Accessory = 2, Outfit = 6 };
                    RigInstance aRig = null;
                    bool rigAgbero = CharacterRig.Available && (!GameBootstrap.LightWebGL || Agberos.Count < 6);
                    if (rigAgbero) aRig = CharacterRig.Build(go.transform, look, 0, 1.9f); else Mannequin.Build(go.transform, look.Pants, Color.black, look.Skin, look.Cap);
                    Mannequin.Label(go.transform, "Agbero", new Color(0.78f, 0.83f, 0f), 2.3f, 0.5f);
                    Agberos.Add(new Agbero { t = go.transform, rig = aRig, pos = pos, stop = b });
                }
            int sIdx = 0;
            foreach (var n in data.serviceNpcs)
            {
                var pos = n.World(); pos.y = data.DeckHeightAt(pos) + 0.3f;
                var go = new GameObject("Service " + n.u); go.transform.SetParent(root, false); go.transform.position = pos; go.transform.rotation = Quaternion.Euler(0, 180, 0);
                GetUniformStyle(n.u, n.color, out var topCol, out var pantsCol, out var capCol, out var badgeText, out var badgeCol);
                var look = new Look
                {
                    Fabric = 8, Pants = pantsCol, Skin = Mannequin.Hex("#6b4423"), Hair = Color.black, Cap = capCol,
                    BodyType = n.u == "politician" ? 2 : 1,
                    Accessory = n.u == "politician" ? 1 : n.u == "fraudster" ? 4 : 2,
                    Outfit = n.u == "politician" ? 3 : n.u == "fraudster" ? 8 : 5
                };
                RigInstance sRig = null;
                string serviceModel = n.u == "army" ? (sIdx % 2 == 0 ? "Models/Characters/hecu_soldier" : "Models/Characters/commando_bill")
                    : n.u == "politician" ? (sIdx % 2 == 0 ? "Models/Characters/obama" : "Models/Characters/executive_suit")
                    : null;
                if (!GameBootstrap.LightWebGL && serviceModel != null && CharacterRig.InstantiateGlb(serviceModel, "BodyModel", pos, new Vector3(0.85f, 1.88f, 0.7f), go.transform, 180f, false) != null)
                {
                    var col = go.AddComponent<CapsuleCollider>(); col.center = new Vector3(0f, 0.92f, 0f); col.radius = 0.28f; col.height = 1.84f;
                }
                else if (CharacterRig.Available && !GameBootstrap.LightWebGL)
                {
                    sRig = CharacterRig.Build(go.transform, look);
                    foreach (var m in sRig.Top)
                    {
                        if (m.HasProperty("baseColorFactor")) m.SetColor("baseColorFactor", topCol);
                        else m.color = topCol;
                        if (m.HasProperty("baseColorTexture")) m.SetTexture("baseColorTexture", null);
                    }
                }
                else Mannequin.Build(go.transform, topCol, pantsCol, Mannequin.Hex("#6b4423"), capCol);
                if (n.u == "boko_haram" || n.u == "bandit")
                    CharacterRig.SetWeapon(sRig, go.transform, "rifle", 0);
                Mannequin.Label(go.transform, badgeText, badgeCol, 2.3f, 0.45f);
                Service.Add(go.transform);
                var road = data.RoadAt(pos, 18f);
                var patrolDir = road != null ? (road.Horizontal ? Vector3.right : Vector3.forward) : (sIdx % 2 == 0 ? Vector3.right : Vector3.forward);
                servicePatrols.Add(new ServicePatrol { t = go.transform, home = pos, axis = patrolDir, phase = sIdx * 1.37f, radius = n.u == "lawma" ? 4.5f : 2.8f });
                sIdx++;
            }
            string[] nightModels = { "Models/Characters/pink_mini_dress", "Models/Characters/bluevinyl", "Models/Characters/tifa_vip" };
            int nIdx = 0;
            foreach (var n in data.nightlife)
            {
                var pos = n.World(); pos.y = data.DeckHeightAt(pos) + 0.3f;
                var go = new GameObject("Night " + n.name); go.transform.SetParent(root, false); go.transform.position = pos; go.transform.rotation = Quaternion.Euler(0, 180, 0);
                var look = new Look { Fabric = 2, Pants = Mannequin.Hex("#6e1a2c"), Skin = Mannequin.Hex("#8a5a3c"), Hair = Mannequin.Hex("#d62828"), Cap = null, BodyType = 0, Outfit = 9, HairStyle = 3 };
                if (!GameBootstrap.LightWebGL && CharacterRig.InstantiateGlb(nightModels[nIdx % nightModels.Length], "BodyModel", pos, new Vector3(0.8f, 1.82f, 0.65f), go.transform, 180f, false) != null)
                {
                    var col = go.AddComponent<CapsuleCollider>(); col.center = new Vector3(0f, 0.9f, 0f); col.radius = 0.26f; col.height = 1.8f;
                }
                else if (CharacterRig.Available && !GameBootstrap.LightWebGL) CharacterRig.Build(go.transform, look);
                else Mannequin.Build(go.transform, Mannequin.Hex("#ff5d9e"), look.Pants, look.Skin, null);
                Mannequin.Label(go.transform, n.name, new Color(1f, 0.36f, 0.62f), 2.3f, 0.5f);
                go.SetActive(false);
                Nightlife.Add((go.transform, n.name));
                nIdx++;
            }
            SpawnFishingBoats();
            SpawnGroundItems();
        }

        static void GetUniformStyle(string u, string fallbackHex, out Color top, out Color pants, out Color cap, out string label, out Color labelCol)
        {
            switch (u)
            {
                case "police":
                    top = Mannequin.Hex("#162442"); pants = Mannequin.Hex("#0e131f"); cap = Mannequin.Hex("#162442");
                    label = "NPF POLICE"; labelCol = new Color(0.62f, 0.78f, 1f);
                    break;
                case "fire":
                    top = Mannequin.Hex("#c62828"); pants = Mannequin.Hex("#1e2026"); cap = Mannequin.Hex("#f5c518");
                    label = "FIREFIGHTER"; labelCol = new Color(1f, 0.55f, 0.25f);
                    break;
                case "army":
                    top = Mannequin.Hex("#3b5323"); pants = Mannequin.Hex("#2a3c18"); cap = Mannequin.Hex("#243614");
                    label = "NIGERIAN ARMY"; labelCol = new Color(0.68f, 0.88f, 0.45f);
                    break;
                case "navy":
                    top = Mannequin.Hex("#13294b"); pants = Mannequin.Hex("#0d1d36"); cap = Mannequin.Hex("#f2f6fa");
                    label = "NIGERIAN NAVY"; labelCol = new Color(0.55f, 0.85f, 1f);
                    break;
                case "lawma":
                    top = Mannequin.Hex("#ff6a00"); pants = Mannequin.Hex("#e05500"); cap = Mannequin.Hex("#ff6a00");
                    label = "LAWMA"; labelCol = new Color(1f, 0.55f, 0.1f);
                    break;
                case "lastma":
                    top = Mannequin.Hex("#eab308"); pants = Mannequin.Hex("#4a1c1c"); cap = Mannequin.Hex("#5c1d24");
                    label = "LASTMA"; labelCol = new Color(1f, 0.86f, 0.25f);
                    break;
                case "frsc":
                    top = Mannequin.Hex("#d8c398"); pants = Mannequin.Hex("#162442"); cap = Mannequin.Hex("#9e1b1b");
                    label = "FRSC"; labelCol = new Color(0.95f, 0.85f, 0.65f);
                    break;
                case "vio":
                    top = Mannequin.Hex("#f0f4f8"); pants = Mannequin.Hex("#16181d"); cap = Mannequin.Hex("#1b4d2e");
                    label = "VIO"; labelCol = Color.white;
                    break;
                case "kai":
                    top = Mannequin.Hex("#1e6b3a"); pants = Mannequin.Hex("#144726"); cap = Mannequin.Hex("#1e6b3a");
                    label = "KAI BRIGADE"; labelCol = new Color(0.45f, 0.95f, 0.6f);
                    break;
                case "civildefence":
                    top = Mannequin.Hex("#182b49"); pants = Mannequin.Hex("#121e33"); cap = Mannequin.Hex("#b91c1c");
                    label = "NSCDC"; labelCol = new Color(0.7f, 0.82f, 1f);
                    break;
                case "cbn":
                    top = Mannequin.Hex("#0f5132"); pants = Mannequin.Hex("#0a2e1d"); cap = Mannequin.Hex("#d4af37");
                    label = "CBN SECURITY"; labelCol = new Color(1f, 0.84f, 0.22f);
                    break;
                case "efcc":
                    top = Mannequin.Hex("#8b1e1e"); pants = Mannequin.Hex("#16181d"); cap = Mannequin.Hex("#8b1e1e");
                    label = "EFCC OPERATIVE"; labelCol = new Color(1f, 0.42f, 0.42f);
                    break;
                case "politician":
                    top = Mannequin.Hex("#f5f2eb"); pants = Mannequin.Hex("#e2dccb"); cap = Mannequin.Hex("#d4af37");
                    label = "POLITICIAN · VIP"; labelCol = new Color(1f, 0.85f, 0.25f);
                    break;
                case "fraudster":
                    top = Mannequin.Hex("#dc2626"); pants = Mannequin.Hex("#111827"); cap = Mannequin.Hex("#f59e0b");
                    label = "FRAUDSTER · 419"; labelCol = new Color(1f, 0.35f, 0.35f);
                    break;
                case "boko_haram":
                    top = Mannequin.Hex("#292524"); pants = Mannequin.Hex("#1c1917"); cap = Mannequin.Hex("#0c0a09");
                    label = "BOKO HARAM INSURGENT"; labelCol = new Color(1f, 0.22f, 0.22f);
                    break;
                case "bandit":
                    top = Mannequin.Hex("#7c2d12"); pants = Mannequin.Hex("#431407"); cap = Mannequin.Hex("#b91c1c");
                    label = "ARMED BANDIT"; labelCol = new Color(1f, 0.48f, 0.18f);
                    break;
                default:
                    top = Mannequin.Hex(fallbackHex, "#444444"); pants = top * 0.8f; cap = top;
                    label = u.ToUpper(); labelCol = Color.white;
                    break;
            }
        }

        void SpawnFishingBoats()
        {
            var routes = new (Vector2 a, Vector2 b, float spd)[]
            {
                (new Vector2(275f, -150f), new Vector2(325f, -110f), 0.18f), // Makoko canoe channel
                (new Vector2(240f, -60f),  new Vector2(315f, -20f),  0.15f), // Eko Bridge north lagoon
                (new Vector2(220f, 45f),   new Vector2(320f, 85f),   0.16f), // Eko Bridge south / Marina Ebute Ero
                (new Vector2(355f, 120f),  new Vector2(418f, 155f),  0.17f), // Five Cowrie Creek / Falomo
                (new Vector2(492f, 40f),   new Vector2(548f, -35f),  0.15f), // Banana Island north lagoon
                (new Vector2(355f, -195f), new Vector2(450f, -135f), 0.14f), // Third Mainland / Bariga lagoon
                (new Vector2(205f, 180f),  new Vector2(310f, 240f),  0.16f), // Victoria Island west lagoon
                (new Vector2(585f, 20f),   new Vector2(690f, 95f),   0.14f), // Lekki lagoon
            };
            var woodMat = Mannequin.Mat(Mannequin.Hex("#5c4028"));
            var trimMat = Mannequin.Mat(Mannequin.Hex("#2980b9"));
            var netMat = Mannequin.Mat(Mannequin.Hex("#d9c79e"));
            var motorMat = Mannequin.Mat(Mannequin.Hex("#1e293b"));

            for (int i = 0; i < routes.Length; i++)
            {
                var r = routes[i];
                var aW = WorldData.W(r.a.x, -0.25f, r.a.y);
                var bW = WorldData.W(r.b.x, -0.25f, r.b.y);
                var boatGo = new GameObject("Lagoon Fishing Boat " + i);
                boatGo.transform.SetParent(root, false);
                boatGo.transform.position = aW;

                void HullPart(string n, Vector3 lp, Vector3 ls, Material m)
                {
                    var p = GameObject.CreatePrimitive(PrimitiveType.Cube);
                    p.name = n; p.transform.SetParent(boatGo.transform, false);
                    p.transform.localPosition = lp; p.transform.localScale = ls;
                    p.GetComponent<MeshRenderer>().sharedMaterial = m;
                    Destroy(p.GetComponent<Collider>());
                }
                HullPart("Hull", new Vector3(0f, 0.18f, 0f), new Vector3(1.65f, 0.45f, 6.4f), woodMat);
                HullPart("Gunwale", new Vector3(0f, 0.42f, 0f), new Vector3(1.78f, 0.14f, 6.6f), trimMat);
                HullPart("FishNetPile", new Vector3(0f, 0.48f, 0.6f), new Vector3(1.1f, 0.32f, 1.4f), netMat);
                HullPart("Outboard", new Vector3(0f, 0.42f, -3.3f), new Vector3(0.38f, 0.65f, 0.48f), motorMat);

                // Captain at the stern and net-caster fisherman at the bow
                for (int f = 0; f < 2; f++)
                {
                    var fGo = new GameObject("Fisherman");
                    fGo.transform.SetParent(boatGo.transform, false);
                    fGo.transform.localPosition = new Vector3(0f, 0.42f, f == 0 ? -1.9f : 1.7f);
                    var topC = Mannequin.Hex(f == 0 ? "#0284c7" : "#eab308");
                    var pantsC = Mannequin.Hex("#1e293b");
                    var skinC = Mannequin.Hex("#5a3a28");
                    var hatC = Mannequin.Hex("#d4a359");
                    Mannequin.Build(fGo.transform, topC, pantsC, skinC, hatC);
                    if (f == 1) Mannequin.Label(fGo.transform, "FISHERMAN", new Color(0.35f, 0.9f, 0.95f), 2.25f, 0.44f);
                }

                fishingBoats.Add(new FishingBoat { t = boatGo.transform, a = aW, b = bW, speed = r.spd, phase = i * 1.1f });
            }
        }

        static readonly (string id, string label, int cash)[] StreetPickups =
        {
            ("plank",    "2x4 Nail Plank",    0),
            ("koboko",   "Koboko Horsewhip",  0),
            ("baton",    "Iron Rod",          0),
            ("knuckles", "Brass Knuckles",    0),
            ("pepper",   "Pepper Spray",      0),
            ("cutlass",  "Cutlass",           0),
            ("cash",     "Dropped Naira",  1500),
        };

        void SpawnGroundItems()
        {
            // A starter 2x4 Nail Plank on Adeniran Ogunsanya Street near spawn so the player can test picking up and fighting right away.
            SpawnGroundItem(data.Spawn + new Vector3(3.2f, 0f, -3.5f), "plank", "2x4 Nail Plank", 0);
            if (data.TryPlace("ladipo", out var ladipo))
            {
                SpawnGroundItem(ladipo.World() + new Vector3(-5f, 0f, 8f), "baton", "Iron Rod", 0);
                SpawnGroundItem(ladipo.World() + new Vector3(6f, 0f, 10f), "cutlass", "Cutlass", 0);
            }
            for (int i = 0; i < data.busStops.Length; i++)
            {
                var b = data.busStops[i];
                var pick = StreetPickups[i % StreetPickups.Length];
                var pos = WorldData.W(b.x + 4.5f, 0f, b.z - 1.8f);
                SpawnGroundItem(pos, pick.id, pick.label, pick.cash);
            }
        }

        public GroundItem DropItem(Vector3 pos, string id, string label, int cash = 0) => SpawnGroundItem(pos, id, label, cash);

        GroundItem SpawnGroundItem(Vector3 pos, string id, string label, int cash)
        {
            pos.y = data.DeckHeightAt(pos) + 0.04f;
            var go = new GameObject("Pickup " + label);
            go.transform.SetParent(root, false);
            go.transform.position = pos;

            // Glowing ground ring
            var ring = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            ring.name = "Ring";
            ring.transform.SetParent(go.transform, false);
            ring.transform.localPosition = new Vector3(0f, 0.02f, 0f);
            ring.transform.localScale = new Vector3(0.72f, 0.015f, 0.72f);
            ring.GetComponent<MeshRenderer>().sharedMaterial = Mannequin.Mat(cash > 0 ? new Color(0.24f, 1f, 0.47f) : new Color(1f, 0.77f, 0.18f));
            Destroy(ring.GetComponent<Collider>());

            // Floating 3D prop
            var prop = new GameObject("Prop").transform;
            prop.SetParent(go.transform, false);
            prop.localPosition = new Vector3(0f, 0.42f, 0f);
            BuildPickupMesh(prop, id);

            Mannequin.Label(go.transform, label, cash > 0 ? new Color(0.24f, 1f, 0.47f) : new Color(1f, 0.85f, 0.3f), 0.95f, 0.36f);
            var gi = new GroundItem { t = go.transform, prop = prop, pos = pos, id = id, label = label, cash = cash };
            GroundItems.Add(gi);
            return gi;
        }

        static void BuildPickupMesh(Transform parent, string id)
        {
            GameObject Part(PrimitiveType type, Vector3 pos, Vector3 scale, Color col, Quaternion? rot = null)
            {
                var p = GameObject.CreatePrimitive(type);
                p.transform.SetParent(parent, false);
                p.transform.localPosition = pos;
                p.transform.localScale = scale;
                if (rot.HasValue) p.transform.localRotation = rot.Value;
                p.GetComponent<MeshRenderer>().sharedMaterial = Mannequin.Mat(col);
                Object.Destroy(p.GetComponent<Collider>());
                return p;
            }
            switch (id)
            {
                case "plank":
                    Part(PrimitiveType.Cube, Vector3.zero, new Vector3(0.08f, 0.04f, 0.58f), Mannequin.Hex("#8b5a2b"), Quaternion.Euler(15f, 0f, 20f));
                    break;
                case "koboko":
                    Part(PrimitiveType.Cylinder, Vector3.zero, new Vector3(0.05f, 0.28f, 0.05f), Mannequin.Hex("#3d2314"), Quaternion.Euler(70f, 0f, 15f));
                    break;
                case "baton":
                case "weapon":
                    Part(PrimitiveType.Cylinder, Vector3.zero, new Vector3(0.05f, 0.30f, 0.05f), Mannequin.Hex("#4a525d"), Quaternion.Euler(75f, 0f, 15f));
                    break;
                case "knuckles":
                    Part(PrimitiveType.Cube, Vector3.zero, new Vector3(0.16f, 0.06f, 0.12f), Mannequin.Hex("#d4af37"), Quaternion.Euler(15f, 0f, 0f));
                    break;
                case "pepper":
                    Part(PrimitiveType.Cylinder, Vector3.zero, new Vector3(0.08f, 0.14f, 0.08f), Mannequin.Hex("#d62828"));
                    break;
                case "cutlass":
                    Part(PrimitiveType.Cube, new Vector3(0f, 0f, -0.18f), new Vector3(0.05f, 0.05f, 0.16f), Mannequin.Hex("#2b1d14"));
                    Part(PrimitiveType.Cube, new Vector3(0f, 0.02f, 0.10f), new Vector3(0.02f, 0.08f, 0.44f), Mannequin.Hex("#cfd6df"));
                    break;
                default:
                    Part(PrimitiveType.Cube, Vector3.zero, new Vector3(0.24f, 0.09f, 0.14f), Mannequin.Hex("#2bb34a"));
                    break;
            }
        }

        public bool NightOpen => clock != null && (clock.Clock >= 20f || clock.Clock < 4f);

        public Agbero NearestAgbero(Vector3 pos, float r) { Agbero best = null; float bd = r * r; foreach (var a in Agberos) { float d = (a.pos - pos).sqrMagnitude; if (d < bd) { bd = d; best = a; } } return best; }
        public GroundItem NearestGroundItem(Vector3 pos, float r)
        {
            GroundItem best = null; float bd = r * r;
            foreach (var g in GroundItems)
            {
                if (!g.Active) continue;
                float d = (g.pos - pos).sqrMagnitude;
                if (d < bd) { bd = d; best = g; }
            }
            return best;
        }
        public (Transform t, string name)? NearestNightlife(Vector3 pos, float r) { (Transform, string)? best = null; float bd = r * r; foreach (var n in Nightlife) { if (!n.t.gameObject.activeSelf) continue; float d = (n.t.position - pos).sqrMagnitude; if (d < bd) { bd = d; best = n; } } return best; }

        public void AdoptDog()
        {
            if (pet != null) return;
            var prefab = Resources.Load<GameObject>("Models/Animals/dog");
            var go = new GameObject("Pet dog"); go.transform.SetParent(root, false); go.transform.position = player.position + player.right * 1.2f;
            if (prefab != null)
            {
                var m = Instantiate(prefab, go.transform, false); var b = CharacterRig.Bounds(m); float k = b.size.y > 0.01f ? 0.62f / b.size.y : 1f; m.transform.localScale = Vector3.one * k;
                b = CharacterRig.Bounds(m); m.transform.localPosition = new Vector3(-(b.center.x - go.transform.position.x), -(b.min.y - go.transform.position.y), -(b.center.z - go.transform.position.z));
                foreach (var c in m.GetComponentsInChildren<Collider>()) Destroy(c);
                var walk = Resources.Load<AnimationClip>("Characters/dog_walk"); var idle = Resources.Load<AnimationClip>("Characters/dog_idle");
                if (walk != null) { petAnim = go.GetComponentInChildren<Animation>(); if (petAnim == null) petAnim = go.AddComponent<Animation>(); petAnim.AddClip(walk, "walk"); if (idle != null) petAnim.AddClip(idle, "idle"); petAnim.wrapMode = WrapMode.Loop; }
            }
            else { var p = GameObject.CreatePrimitive(PrimitiveType.Capsule); p.transform.SetParent(go.transform, false); p.transform.localPosition = new Vector3(0, 0.35f, 0); p.transform.localRotation = Quaternion.Euler(90, 0, 0); p.transform.localScale = new Vector3(0.3f, 0.4f, 0.3f); p.GetComponent<MeshRenderer>().sharedMaterial = Mannequin.Mat(new Color(0.55f, 0.4f, 0.25f)); Destroy(p.GetComponent<Collider>()); }
            pet = go.transform;
        }
        public bool HasPet => pet != null;

        void Update()
        {
            float dt = Time.deltaTime; bool night = NightOpen;
            foreach (var a in Agberos)
            {
                a.cool -= dt;
                if (a.fightT > 0f)
                {
                    a.fightT = Mathf.Max(0f, a.fightT - dt);
                    float u = 1f - a.fightT / 0.68f;
                    float recoil = Mathf.Sin(u * Mathf.PI) * 0.35f;
                    if (a.t != null)
                        a.t.position = a.pos - a.t.forward * recoil;
                }
                else if (a.t != null)
                {
                    a.t.position = Vector3.Lerp(a.t.position, a.pos, 1f - Mathf.Exp(-8f * dt));
                    a.t.rotation = Quaternion.Euler(0f, 180f + Mathf.Sin(Time.time * 1.1f + a.pos.x) * 23f, 0f);
                }
            }
            for (int i = 0; i < servicePatrols.Count; i++)
            {
                var sp = servicePatrols[i];
                if (sp.t == null) continue;
                float wave = Mathf.Sin(Time.time * 0.75f + sp.phase);
                float dir = Mathf.Cos(Time.time * 0.75f + sp.phase) >= 0f ? 1f : -1f;
                var p = sp.home + sp.axis * (wave * sp.radius);
                p.y = data.DeckHeightAt(p) + 0.3f;
                sp.t.position = p;
                var lookDir = sp.axis * dir;
                if (lookDir.sqrMagnitude > 0.01f)
                    sp.t.rotation = Quaternion.Slerp(sp.t.rotation, Quaternion.LookRotation(lookDir, Vector3.up), 1f - Mathf.Exp(-6f * dt));
            }
            for (int i = 0; i < fishingBoats.Count; i++)
            {
                var fb = fishingBoats[i];
                if (fb.t == null) continue;
                float raw = (Time.time * fb.speed * 0.25f + fb.phase) % 2f;
                float u = raw <= 1f ? raw : 2f - raw;
                float smoothU = Mathf.SmoothStep(0f, 1f, u);
                var p = Vector3.Lerp(fb.a, fb.b, smoothU);
                p.y = -0.24f + Mathf.Sin(Time.time * 2.1f + fb.phase) * 0.05f;
                fb.t.position = p;
                var dir = raw <= 1f ? (fb.b - fb.a) : (fb.a - fb.b);
                dir.y = 0f;
                if (dir.sqrMagnitude > 0.01f)
                    fb.t.rotation = Quaternion.LookRotation(dir.normalized, Vector3.up) * Quaternion.Euler(Mathf.Sin(Time.time * 1.8f + fb.phase) * 1.8f, 0f, 0f);
            }
            foreach (var g in GroundItems)
            {
                if (g.respawn > 0f)
                {
                    g.respawn -= dt;
                    if (g.respawn <= 0f && g.t != null) g.t.gameObject.SetActive(true);
                }
                else if (g.prop != null && g.t.gameObject.activeSelf)
                {
                    g.prop.localPosition = new Vector3(0f, 0.40f + Mathf.Sin(Time.time * 3f + g.pos.x) * 0.06f, 0f);
                    g.prop.localRotation = Quaternion.Euler(0f, Time.time * 75f, 0f);
                }
            }
            foreach (var n in Nightlife) n.t.gameObject.SetActive(night && mature);
            if (pet != null)
            {
                var to = player.position - player.right * 1.1f - pet.position; to.y = 0f;
                if (to.magnitude > 1.6f) { pet.position += to.normalized * Mathf.Min(to.magnitude, 6f) * dt; pet.rotation = Quaternion.Slerp(pet.rotation, Quaternion.LookRotation(to.normalized, Vector3.up), 1f - Mathf.Exp(-8f * dt)); if (petAnim != null && !petAnim.IsPlaying("walk")) petAnim.CrossFade("walk", 0.2f); }
                else if (petAnim != null && !petAnim.IsPlaying("idle") && petAnim.GetClip("idle") != null) petAnim.CrossFade("idle", 0.3f);
                var p = pet.position; p.y = data.DeckHeightAt(p) + 0.3f; pet.position = p;
            }
            // Owambe at the Surulere Event Centre, 19:00–23:30.
            bool owambe = clock != null && clock.Clock >= 19f && clock.Clock < 23.5f;
            if (owambe && partyDay != clock.Day && data.TryPlace("owambe", out var hall))
            {
                partyDay = clock.Day;
                var rng = new System.Random(clock.Day);
                string[] cols = { "#d62878", "#2878d6", "#f5c518", "#7a28d6", "#28b57a", "#ff6a1a" };
                for (int i = 0; i < 14; i++)
                {
                    var go = new GameObject("Owambe guest"); go.transform.SetParent(root, false);
                    var pos = hall.World() + new Vector3((float)(rng.NextDouble() * 22 - 11), 0f, -(8f + (float)rng.NextDouble() * 7f)); pos.y = data.DeckHeightAt(pos) + 0.3f; go.transform.position = pos;
                    var col = Mannequin.Hex(cols[rng.Next(cols.Length)]);
                    var look = new Look { Fabric = rng.Next(3), Pants = col, Skin = Mannequin.Hex("#5a3a28"), Hair = Color.black, Cap = col, BodyType = rng.Next(3), Outfit = rng.NextDouble() < 0.5 ? 3 : 9, Accessory = 1 };
                    if (CharacterRig.Available) CharacterRig.Build(go.transform, look); else Mannequin.Build(go.transform, col, col, look.Skin, col);
                    crowd.Add(go.transform);
                }
            }
            if (!owambe && crowd.Count > 0) { foreach (var c in crowd) Destroy(c.gameObject); crowd.Clear(); }
            for (int i = 0; i < crowd.Count; i++) crowd[i].rotation = Quaternion.Euler(0f, Mathf.Sin(Time.time * 0.5f + i) * 30f, 0f);
        }

        void LateUpdate()
        {
            foreach (var a in Agberos)
            {
                if (a.t == null) continue;
                float swing01 = a.fightT > 0f ? 1f - (a.fightT / 0.68f) : 0f;
                float guard01 = a.cool > 105f ? 0.85f : 0f;
                if (swing01 > 0.001f || guard01 > 0.001f)
                {
                    if (a.rig != null) a.rig.ApplyCombatPose(swing01, guard01, 0, "", false);
                    else Mannequin.ApplyCombatPose(a.t, swing01, guard01, 0, "", false);
                }
            }
        }

        [System.NonSerialized] public bool mature;
    }
}
