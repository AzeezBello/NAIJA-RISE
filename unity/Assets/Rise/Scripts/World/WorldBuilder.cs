using System.Collections.Generic;
using UnityEngine;
using Rise.Data;

namespace Rise.World
{
    // Builds the Lagos map from the exported district data: ground, water, roads with pavements, medians and street
    // lights, bridge decks with barriers and pillars, landmarks with signs, bus stops, properties, compound cells,
    // procedural housing, toll plazas and footbridges. Everything is static geometry and is batched at the end.
    public class WorldBuilder : MonoBehaviour
    {
        public int MaxHouses = 2600;
        public float HouseGrid = 26f;

        public WorldData Data { get; private set; }
        public Transform Root { get; private set; }
        public Material LampHead { get; private set; }
        public int ObjectCount { get; private set; }

        readonly Dictionary<string, Material> materials = new Dictionary<string, Material>();
        Font font;
        Shader standard;

        // Palette
        const string Earth = "#6f6a5c", Asphalt = "#3a3a3d", AsphaltLight = "#45454a", Pavement = "#9a958a", Concrete = "#b9b5aa",
            Water = "#2b6e8f", Sand = "#d9c8a0", Pitch = "#4f8a3a", Zinc = "#5b5f63", Glass = "#7fa6c4", Yellow = "#f5c518",
            Black = "#141414", Steel = "#7d8287", LampWarm = "#ffd27a", Cream = "#e2d6bf";
        static readonly string[] HouseColours = { "#e2d6bf", "#d8b98c", "#c9c2b3", "#b8c4cc", "#d9a66e", "#c7b7a2", "#e8e0d0", "#a9b7a1" };

        public void Build(WorldData data)
        {
            Data = data;
            standard = ShaderLib.Lit;
            font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            Root = new GameObject("Lagos").transform;
            Root.SetParent(transform, false);
            LampHead = Mat("lamp", LampWarm, 0.3f, true);

            BuildGround();
            BuildWater();
            BuildRoads();
            BuildBridges();
            BuildLandmarks();
            BuildBusStops();
            BuildProperties();
            BuildCells();
            BuildHousing();
            BuildTolls();
            BuildFootbridges();
            BuildStreetFurniture();
            BuildBusinesses();
            BuildVegetation();

            StaticBatchingUtility.Combine(Root.gameObject);
        }

        // ---------- materials and primitives ----------

        Material Mat(string key, string hex, float smoothness = 0.15f, bool emissive = false)
        {
            if (materials.TryGetValue(key, out var m)) return m;
            m = new Material(standard) { name = key };
            m.color = Hex(hex);
            m.SetFloat("_Smoothness", smoothness);
            if (emissive) { m.EnableKeyword("_EMISSION"); m.globalIlluminationFlags = MaterialGlobalIlluminationFlags.RealtimeEmissive; m.SetColor("_EmissionColor", Color.black); }
            materials[key] = m;
            return m;
        }
        Material Mat(string hex, float smoothness = 0.15f) => Mat(hex, hex, smoothness);

        public static Color Hex(string hex, string fallback = "#8a7d6a")
        {
            if (!string.IsNullOrEmpty(hex) && ColorUtility.TryParseHtmlString(hex, out var c)) return c;
            ColorUtility.TryParseHtmlString(fallback, out c);
            return c;
        }

        GameObject Box(string name, Vector3 center, Vector3 size, Material m, Transform parent = null, bool collider = true, Quaternion? rotation = null)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = name;
            go.transform.SetParent(parent ?? Root, false);
            go.transform.position = center;
            go.transform.localScale = size;
            if (rotation.HasValue) go.transform.rotation = rotation.Value;
            go.GetComponent<MeshRenderer>().sharedMaterial = m;
            if (!collider) Remove(go.GetComponent<Collider>());
            go.isStatic = true;
            ObjectCount++;
            return go;
        }

        static void Remove(Object o) { if (Application.isPlaying) Destroy(o); else DestroyImmediate(o); }

        GameObject Cylinder(string name, Vector3 baseCenter, float radius, float height, Material m, Transform parent = null, bool collider = true)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cylinder);   // unit cylinder: height 2, radius 0.5
            go.name = name;
            go.transform.SetParent(parent ?? Root, false);
            go.transform.position = baseCenter + Vector3.up * height * 0.5f;
            go.transform.localScale = new Vector3(radius * 2f, height * 0.5f, radius * 2f);
            go.GetComponent<MeshRenderer>().sharedMaterial = m;
            if (!collider) Remove(go.GetComponent<Collider>());
            go.isStatic = true;
            ObjectCount++;
            return go;
        }

        void Sign(string text, Vector3 position, string colour, float size = 1f, Transform parent = null)
        {
            var go = new GameObject("Sign " + text);
            go.transform.SetParent(parent ?? Root, false);
            go.transform.position = position;
            var tm = go.AddComponent<TextMesh>();
            tm.text = text; tm.font = font; tm.fontSize = 64; tm.characterSize = 0.07f * size; tm.fontStyle = FontStyle.Bold;
            tm.anchor = TextAnchor.MiddleCenter; tm.alignment = TextAlignment.Center; tm.color = Hex(colour, "#ffc52f");
            go.GetComponent<MeshRenderer>().sharedMaterial = font.material;
            // A second copy facing the other way so the sign reads from both sides of the street.
            var back = Instantiate(go, go.transform.position, Quaternion.Euler(0, 180, 0), go.transform.parent);
            back.name = go.name + " (back)";
            ObjectCount += 2;
        }

        // ---------- ground and water ----------

        void BuildGround()
        {
            var m = Data.meta;
            float w = m.maxX - m.minX + 400f, d = m.maxZ - m.minZ + 400f;
            Box("Ground", WorldData.W((m.minX + m.maxX) * 0.5f, -0.5f, (m.minZ + m.maxZ) * 0.5f), new Vector3(w, 1f, d), Mat(Earth));
        }

        void BuildWater()
        {
            var water = Mat("water", Water, 0.92f);
            foreach (var w in Data.waters)
                Box(w.name, WorldData.W((w.minX + w.maxX) * 0.5f, 0.06f, (w.minZ + w.maxZ) * 0.5f),
                    new Vector3(w.maxX - w.minX, 0.12f, w.maxZ - w.minZ), water, null, false);   // no collider: you swim, vehicles sink
        }

        // ---------- roads ----------

        // Intervals along `r` where a crossing road passes (plus a margin), so pavements and medians leave gaps.
        List<Vector2> CrossingGaps(RoadData r, float margin)
        {
            var gaps = new List<Vector2>();
            foreach (var o in Data.roads)
            {
                if (o.axis == r.axis) continue;
                if (r.k < o.from - 0.01f || r.k > o.to + 0.01f) continue;       // the crossing road must reach us
                if (o.k < r.from - 0.01f || o.k > r.to + 0.01f) continue;       // and we must reach it
                gaps.Add(new Vector2(o.k - o.width * 0.5f - margin, o.k + o.width * 0.5f + margin));
            }
            return gaps;
        }

        static List<Vector2> Split(float from, float to, List<Vector2> cuts)
        {
            var spans = new List<Vector2> { new Vector2(from, to) };
            foreach (var c in cuts)
            {
                var next = new List<Vector2>();
                foreach (var s in spans)
                {
                    if (c.y <= s.x || c.x >= s.y) { next.Add(s); continue; }
                    if (c.x > s.x) next.Add(new Vector2(s.x, c.x));
                    if (c.y < s.y) next.Add(new Vector2(c.y, s.y));
                }
                spans = next;
            }
            spans.RemoveAll(s => s.y - s.x < 0.5f);
            return spans;
        }

        void BuildRoads()
        {
            var roadsRoot = new GameObject("Roads").transform; roadsRoot.SetParent(Root, false);
            var pavement = Mat("pavement", Pavement);
            var concrete = Mat("concrete", Concrete);
            var pole = Mat("pole", Steel, 0.4f);
            var line = Mat("line", "#e8e2c8");
            foreach (var r in Data.roads)
            {
                bool h = r.Horizontal;
                var asphalt = Mat(r.cls == "expressway" || r.cls == "highway" ? "asphalt-hi" : "asphalt", r.cls == "expressway" || r.cls == "highway" ? AsphaltLight : Asphalt);
                var bridgeCuts = new List<Vector2>();
                foreach (var b in Data.bridges) if (b.axis == r.axis && Mathf.Approximately(b.k, r.k)) bridgeCuts.Add(new Vector2(b.From, b.To));
                float y = h ? 0.05f : 0.055f;   // tiny offset so crossing carriageways do not z-fight
                var group = new GameObject(r.name).transform; group.SetParent(roadsRoot, false);

                foreach (var span in Split(r.from, r.to, bridgeCuts))
                {
                    float len = span.y - span.x, mid = (span.x + span.y) * 0.5f;
                    Box("Carriageway", r.Point(mid, r.k, y), h ? new Vector3(len, 0.1f, r.width) : new Vector3(r.width, 0.1f, len), asphalt, group);
                }

                var gaps = CrossingGaps(r, 3f);
                foreach (var span in Split(r.from, r.to, Merge(gaps, bridgeCuts)))
                {
                    float len = span.y - span.x, mid = (span.x + span.y) * 0.5f;
                    for (int s = -1; s <= 1; s += 2)
                    {
                        float across = r.k + s * (r.width * 0.5f + 1.6f);
                        Box("Pavement", r.Point(mid, across, 0.15f), h ? new Vector3(len, 0.3f, 3.2f) : new Vector3(3.2f, 0.3f, len), pavement, group);
                    }
                    // Centre line (or median) between the carriageways.
                    if (r.median)
                        Box("Median", r.Point(mid, r.k, 0.3f), h ? new Vector3(len, 0.5f, 1.4f) : new Vector3(1.4f, 0.5f, len), concrete, group);
                    else
                        Box("Centre line", r.Point(mid, r.k, 0.106f), h ? new Vector3(len, 0.01f, 0.25f) : new Vector3(0.25f, 0.01f, len), line, group, false);
                }

                if (!r.lights) continue;
                var lightGaps = Merge(CrossingGaps(r, 6f), bridgeCuts);
                for (float along = r.from + 12f; along < r.to - 6f; along += 36f)
                {
                    if (Inside(along, lightGaps)) continue;
                    for (int s = -1; s <= 1; s += 2)
                    {
                        float across = r.k + s * (r.width * 0.5f + 2.4f);
                        var basePos = r.Point(along, across, 0.3f);
                        if (Data.InWater(basePos)) continue;
                        Cylinder("Lamp post", basePos, 0.12f, 7f, pole, group);
                        // The arm leans over the carriageway (towards the centreline).
                        var toCentre = (r.Point(along, r.k, 0.3f) - basePos).normalized;
                        var head = basePos + Vector3.up * 7.1f + toCentre * 1.1f;
                        Box("Lamp", head, h ? new Vector3(0.5f, 0.22f, 2.2f) : new Vector3(2.2f, 0.22f, 0.5f), LampHead, group, false);
                    }
                }
            }
        }

        static List<Vector2> Merge(List<Vector2> a, List<Vector2> b) { var l = new List<Vector2>(a); l.AddRange(b); return l; }
        static bool Inside(float v, List<Vector2> gaps) { foreach (var g in gaps) if (v > g.x && v < g.y) return true; return false; }

        // ---------- bridges ----------

        void BuildBridges()
        {
            var concrete = Mat("deck", "#a7a39a", 0.1f);
            var barrier = Mat("barrier", Concrete);
            var pillar = Mat("pillar", "#8f8b82");
            foreach (var b in Data.bridges)
            {
                bool h = b.axis == "h";
                var road = Data.FindRoad(b.axis, b.k);
                float deckW = Mathf.Max(b.halfW * 2f, road?.width ?? 0f);
                var group = new GameObject(b.name).transform; group.SetParent(Root, false);
                var p = b.profile;
                for (int i = 1; i < p.Length; i++)
                {
                    float dA = p[i].along - p[i - 1].along, dH = p[i].height - p[i - 1].height;
                    float len = Mathf.Sqrt(dA * dA + dH * dH) + 0.6f;
                    float midA = (p[i].along + p[i - 1].along) * 0.5f, midH = (p[i].height + p[i - 1].height) * 0.5f;
                    float tilt = Mathf.Atan2(dH, dA) * Mathf.Rad2Deg;
                    // World +z is data -z, so a deck rising with data z falls with world z: positive x-rotation.
                    var rot = h ? Quaternion.Euler(0, 0, tilt) : Quaternion.Euler(tilt, 0, 0);
                    var center = h ? WorldData.W(midA, midH - 0.5f, b.k) : WorldData.W(b.k, midH - 0.5f, midA);
                    Box("Deck", center, h ? new Vector3(len, 1f, deckW) : new Vector3(deckW, 1f, len), concrete, group, true, rot);
                    for (int s = -1; s <= 1; s += 2)
                    {
                        float across = b.k + s * (deckW * 0.5f - 0.3f);
                        var c = h ? WorldData.W(midA, midH + 0.5f, across) : WorldData.W(across, midH + 0.5f, midA);
                        Box("Barrier", c, h ? new Vector3(len, 1.0f, 0.5f) : new Vector3(0.5f, 1.0f, len), barrier, group, true, rot);
                    }
                }
                for (float along = b.From + 11f; along < b.To - 6f; along += 22f)
                {
                    float height = h ? Data.DeckHeightAtData(along, b.k) : Data.DeckHeightAtData(b.k, along);
                    if (height < 2f) continue;
                    for (int s = -1; s <= 1; s += 2)
                    {
                        float across = b.k + s * deckW * 0.28f;
                        var basePos = h ? WorldData.W(along, -3f, across) : WorldData.W(across, -3f, along);
                        Cylinder("Pillar", basePos, 1.1f, height + 2.2f, pillar, group);
                    }
                }
            }
        }

        // ---------- places ----------

        static Vector2 Footprint(LandmarkData l)
        {
            if (l.kind == "artisan") return new Vector2(16, 13);
            if (l.big) return new Vector2(26, 20);
            if (l.kind == "hotel" || l.kind == "bank") return new Vector2(20, 16);
            return new Vector2(18, 14);
        }

        void BuildLandmarks()
        {
            var group = new GameObject("Landmarks").transform; group.SetParent(Root, false);
            var grey = Mat("stadium", "#8a8f93", 0.3f);
            var booth = Mat("booth", "#e4d14b");
            foreach (var l in Data.landmarks)
            {
                var pos = l.World();
                var body = Mat("lm-" + l.color, l.color, l.kind == "bank" || l.kind == "hotel" ? 0.45f : 0.15f);
                if (l.stadium)
                {
                    if (!BuildStadiumModel(l, pos, group))
                    {
                        Cylinder(l.name, pos, 34f, 14f, grey, group);
                        Cylinder(l.name + " bowl", pos + Vector3.up * 14f, 26f, 1.5f, Mat("pitch", Pitch), group);
                    }
                    Sign(l.shortName, pos + new Vector3(0, 18f, 36f), l.sign, 2.2f, group);
                    continue;
                }
                switch (l.kind)
                {
                    case "checkpoint": case "post": case "toll":
                        Box(l.name, pos + Vector3.up * 1.6f, new Vector3(5f, 3.2f, 3.5f), Mat("lm-" + l.color, l.color), group);
                        Sign(l.shortName, pos + new Vector3(0, 4.2f, 0), l.sign, 0.8f, group);
                        continue;
                    case "pitch":
                    {
                        Box(l.name, pos + Vector3.up * 0.12f, new Vector3(44f, 0.24f, 30f), Mat("pitch", Pitch), group);
                        var white = Mat("pitchline", "#f5f5f0");
                        var postMat = Mat("goalpost", "#eeeeee", 0.5f);
                        Box("Center line", pos + Vector3.up * 0.25f, new Vector3(0.25f, 0.02f, 28f), white, group, false);
                        for (int side = -1; side <= 1; side += 2)
                        {
                            float gx = pos.x + side * 20.5f;
                            Cylinder("Goal post L", new Vector3(gx, pos.y + 0.2f, pos.z - 2.8f), 0.08f, 2.4f, postMat, group, false);
                            Cylinder("Goal post R", new Vector3(gx, pos.y + 0.2f, pos.z + 2.8f), 0.08f, 2.4f, postMat, group, false);
                            Box("Crossbar", new Vector3(gx, pos.y + 2.6f, pos.z), new Vector3(0.14f, 0.14f, 5.76f), postMat, group, false);
                        }
                        for (int sx = -1; sx <= 1; sx += 2)
                            for (int sz = -1; sz <= 1; sz += 2)
                            {
                                var fPos = pos + new Vector3(sx * 23f, 0.2f, sz * 16f);
                                Cylinder("Floodlight pole", fPos, 0.15f, 10f, Mat("pole", Steel, 0.4f), group);
                                Box("Floodlight head", fPos + Vector3.up * 10.2f, new Vector3(1.2f, 0.4f, 0.6f), LampHead, group, false);
                            }
                        Sign(l.shortName, pos + new Vector3(0, 3.5f, 16f), l.sign, 1.2f, group);
                        continue;
                    }
                    case "beach":
                        Box(l.name, pos + Vector3.up * 0.1f, new Vector3(60f, 0.2f, 40f), Mat("sand", Sand), group);
                        Sign(l.shortName, pos + new Vector3(0, 3.5f, 22f), l.sign, 1.2f, group);
                        continue;
                    case "airport":
                    {
                        var apron = Mat("apron", AsphaltLight);
                        Box(l.name + " apron", pos + Vector3.up * 0.12f, new Vector3(70f, 0.24f, 48f), apron, group);
                        Box(l.name + " terminal", pos + new Vector3(0f, 4.5f, 12f), new Vector3(36f, 9f, 14f), body, group);
                        Box(l.name + " glass", pos + new Vector3(0f, 4.2f, 4.9f), new Vector3(32f, 5.5f, 0.3f), Mat("glass", Glass, 0.85f), group, false);
                        Cylinder(l.name + " tower", pos + new Vector3(22f, 0.2f, 12f), 2.2f, 18f, Mat("concrete", Concrete), group);
                        Box(l.name + " cab", pos + new Vector3(22f, 19.2f, 12f), new Vector3(6f, 2.6f, 6f), Mat("glass", Glass, 0.85f), group, false);
                        // Runway strip & parked aircraft
                        Box(l.name + " runway", pos + new Vector3(0f, 0.16f, -12f), new Vector3(66f, 0.1f, 12f), Mat("asphalt", Asphalt), group);
                        var planeWhite = Mat("plane-white", "#f2f4f7", 0.6f);
                        var planePos = pos + new Vector3(-8f, 1.8f, -12f);
                        Box("Aircraft fuselage", planePos, new Vector3(18f, 2.2f, 2.2f), planeWhite, group);
                        Box("Aircraft wings", planePos + new Vector3(0f, -0.2f, 0f), new Vector3(3.2f, 0.22f, 16f), planeWhite, group, false);
                        Box("Aircraft tail", planePos + new Vector3(-8.2f, 1.8f, 0f), new Vector3(2.2f, 3.0f, 0.25f), Mat("plane-tail", "#1b6b3a", 0.5f), group, false);
                        Sign(l.shortName, pos + new Vector3(0, 10.5f, 19.5f), l.sign, 1.4f, group);
                        continue;
                    }
                    case "settlement": case "waterfront":
                    {
                        Box(l.name, pos + Vector3.up * 0.2f, new Vector3(50f, 0.4f, 40f), body, group);
                        var wood = Mat("wood-stilt", "#5c4028");
                        var zinc = Mat("zinc", Zinc, 0.5f);
                        for (int i = -2; i <= 2; i++)
                        {
                            var hutPos = pos + new Vector3(i * 9f, 1.6f, -8f + (i % 2) * 5f);
                            Box("Stilt hut", hutPos + Vector3.up * 1.2f, new Vector3(5.5f, 2.6f, 4.5f), wood, group);
                            Box("Hut roof", hutPos + Vector3.up * 2.65f, new Vector3(6.1f, 0.22f, 5.1f), zinc, group, false);
                            var canoePos = pos + new Vector3(i * 8f + 3f, 0.25f, -16f);
                            Box("Canoe", canoePos, new Vector3(1.1f, 0.35f, 4.8f), wood, group, false);
                        }
                        Sign(l.shortName, pos + new Vector3(0, 4f, 22f), l.sign, 1.4f, group);
                        continue;
                    }
                    case "waypoint":
                        Box(l.name, pos + Vector3.up * 0.2f, new Vector3(50f, 0.4f, 40f), body, group);
                        Sign(l.shortName, pos + new Vector3(0, 4f, 22f), l.sign, 1.4f, group);
                        continue;
                    case "street":
                    {
                        // A street-name sign on the pavement: a pole and a green board readable from both sides.
                        Box(l.name + " pole", pos + Vector3.up * 1.6f, new Vector3(0.12f, 3.2f, 0.12f), Mat("signpole", "#5a5f63"), group, false);
                        float bw = 1.2f + l.shortName.Length * 0.32f;
                        Box(l.name + " board", pos + Vector3.up * 3.35f, new Vector3(bw, 0.55f, 0.06f), body, group, false);
                        Sign(l.shortName, pos + new Vector3(0, 3.35f, 0.05f), l.sign, 0.42f, group);
                        var back = new GameObject("Sign back"); back.transform.SetParent(group, false);
                        back.transform.SetPositionAndRotation(pos + new Vector3(0, 3.35f, -0.05f), Quaternion.Euler(0f, 180f, 0f));
                        Sign(l.shortName, back.transform.position, l.sign, 0.42f, back.transform);
                        back.transform.GetChild(0).localRotation = Quaternion.identity;
                        continue;
                    }
                }
                var fp = Footprint(l);
                float h = Mathf.Max(3f, l.h);
                Box(l.name, pos + Vector3.up * h * 0.5f, new Vector3(fp.x, h, fp.y), body, group);
                Box(l.name + " parapet", pos + Vector3.up * (h + 0.3f), new Vector3(fp.x + 0.6f, 0.6f, fp.y + 0.6f), Mat("parapet", "#6b655a"), group, false);
                // Sign board on the street-facing side (north: data -z, world +z).
                var signPos = pos + new Vector3(0, h + 1.3f, fp.y * 0.5f + 0.2f);
                Box(l.name + " board", signPos, new Vector3(Mathf.Min(fp.x * 0.9f, 2.2f + l.shortName.Length * 1.05f), 1.8f, 0.25f), Mat("board", "#1b1b1f"), group, false);
                Sign(l.shortName, signPos + new Vector3(0, 0, 0.2f), l.sign, 1f, group);
                if (l.kind == "market") BuildMarketStalls(pos, fp, group);
            }
        }

        // Wet asphalt reflects the lamps and the sky: raise the roads' smoothness while it rains.
        public void SetWet(bool wet) { foreach (var key in new[] { "asphalt", "asphalt-hi" }) if (materials.TryGetValue(key, out var m)) m.SetFloat("_Smoothness", wet ? 0.82f : 0.15f); }

        public int StadiumModels { get; private set; }
        public int Trees { get; private set; }

        // The real stadium models: fitted to the stadium footprint, feet on the ground.
        bool BuildStadiumModel(LandmarkData l, Vector3 pos, Transform group)
        {
            if (GameBootstrap.Mobile) return false;   // 182k-triangle model: too heavy for a phone, the procedural stand is used
            bool teslim = (l.id + l.name).ToLower().Contains("teslim");
            var prefab = Resources.Load<GameObject>("Models/Landmarks/" + (teslim ? "teslim_balogun_stadium" : "national_stadium"));
            if (prefab == null) return false;
            Vector3 target = teslim ? new Vector3(50f, 23f, 46f) : new Vector3(54f, 25f, 50f);
            var go = Instantiate(prefab, group); go.name = l.name + " model";
            go.transform.position = pos; go.transform.rotation = Quaternion.identity; go.transform.localScale = Vector3.one;
            var b = Entities.CharacterRig.Bounds(go);
            if (b.size.x <= 0f || b.size.y <= 0f || b.size.z <= 0f) { Remove(go); return false; }
            float fit = Mathf.Min(target.x / b.size.x, target.z / b.size.z, target.y / b.size.y);
            go.transform.localScale = Vector3.one * fit;
            b = Entities.CharacterRig.Bounds(go);
            go.transform.position += new Vector3(pos.x - b.center.x, pos.y - b.min.y, pos.z - b.center.z);
            b = Entities.CharacterRig.Bounds(go);
            foreach (var c in go.GetComponentsInChildren<Collider>()) Remove(c);
            var col = go.AddComponent<BoxCollider>(); col.center = go.transform.InverseTransformPoint(b.center); col.size = new Vector3(b.size.x / fit, b.size.y / fit, b.size.z / fit);
            foreach (var t in go.GetComponentsInChildren<Transform>()) t.gameObject.isStatic = true;
            StadiumModels++; ObjectCount++;
            return true;
        }

        // Trees: tropical, maple and pine models in the Surulere plot interiors
        // and along the Eko Atlantic shore, height-fitted with a little jitter, kept off the road shoulders.
        void BuildVegetation()
        {
            var group = new GameObject("Vegetation").transform; group.SetParent(Root, false);
            var plan = new (string model, int count, float height)[] { ("jabami_anime_tree-grass_v1", 18, 6f), ("maple_tree", 8, 5.5f), ("tree_spruce_pine", 5, 7f) };
            var zones = new (float x0, float x1, float z0, float z1)[] { (-120, -22, -120, -22), (22, 120, -120, -22), (-120, -22, 22, 120), (22, 120, 22, 120), (346, 614, 315, 330) };
            var rng = new System.Random(42);
            foreach (var (model, count, height) in plan)
            {
                var prefab = Resources.Load<GameObject>("Models/Vegetation/" + model);
                if (prefab == null) continue;
                for (int i = 0; i < count; i++)
                {
                    var z = zones[rng.Next(zones.Length)];
                    bool placed = false;
                    for (int attempt = 0; attempt < 48 && !placed; attempt++)
                    {
                        float dx = Mathf.Lerp(z.x0 + 2f, z.x1 - 2f, (float)rng.NextDouble()), dz = Mathf.Lerp(z.z0 + 2f, z.z1 - 2f, (float)rng.NextDouble());
                        if (Data.InWaterData(dx, dz) || NearRoadData(dx, dz, 7f) || ReservedData(dx, dz)) continue;
                        var tree = Instantiate(prefab, group); tree.name = model;
                        var pos = WorldData.W(dx, 0f, dz); pos.y = Data.DeckHeightAtData(dx, dz);
                        tree.transform.position = pos; tree.transform.rotation = Quaternion.Euler(0f, (float)rng.NextDouble() * 360f, 0f); tree.transform.localScale = Vector3.one;
                        var b = Entities.CharacterRig.Bounds(tree);
                        float jitter = 0.85f + (float)rng.NextDouble() * 0.3f, k = b.size.y > 0.01f ? height * jitter / b.size.y : 1f;
                        tree.transform.localScale = Vector3.one * k;
                        b = Entities.CharacterRig.Bounds(tree);
                        tree.transform.position += new Vector3(pos.x - b.center.x, pos.y - b.min.y, pos.z - b.center.z);
                        foreach (var c in tree.GetComponentsInChildren<Collider>()) Remove(c);
                        var trunk = tree.AddComponent<BoxCollider>(); trunk.center = tree.transform.InverseTransformPoint(new Vector3(pos.x, pos.y + height * 0.5f, pos.z)); trunk.size = new Vector3(0.6f / k, height / k, 0.6f / k);
                        foreach (var t in tree.GetComponentsInChildren<Transform>()) t.gameObject.isStatic = true;
                        Trees++; ObjectCount++; placed = true;
                    }
                }
            }
        }

        void BuildMarketStalls(Vector3 pos, Vector2 fp, Transform group)
        {
            var rng = new System.Random((int)(pos.x * 7 + pos.z * 13));
            string[] tarps = { "#d9534f", "#f0ad4e", "#5bc0de", "#5cb85c", "#f5c518" };
            for (int i = 0; i < 6; i++)
            {
                float x = pos.x + (float)(rng.NextDouble() - 0.5) * (fp.x + 14f), z = pos.z - (fp.y * 0.5f + 4f + (float)rng.NextDouble() * 6f);
                var basePos = new Vector3(x, 0.15f, z);
                Box("Stall", basePos + Vector3.up * 0.5f, new Vector3(2.4f, 1f, 1.4f), Mat("stall", "#7a5a3a"), group);
                Box("Tarp", basePos + Vector3.up * 2.3f, new Vector3(3f, 0.1f, 2.2f), Mat("tarp" + i % tarps.Length, tarps[i % tarps.Length]), group, false);
            }
        }

        void BuildBusStops()
        {
            var group = new GameObject("Bus stops").transform; group.SetParent(Root, false);
            var yellow = Mat("yellow", Yellow, 0.3f);
            var pole = Mat("pole", Steel, 0.4f);
            foreach (var b in Data.busStops)
            {
                var pos = b.World(0.3f);
                Cylinder("Post", pos + new Vector3(-2.2f, 0, 0), 0.08f, 2.8f, pole, group);
                Cylinder("Post", pos + new Vector3(2.2f, 0, 0), 0.08f, 2.8f, pole, group);
                Box("Roof", pos + Vector3.up * 2.9f, new Vector3(5.4f, 0.18f, 2.4f), yellow, group, false);
                Box("Bench", pos + Vector3.up * 0.5f, new Vector3(4.2f, 0.12f, 0.5f), Mat("bench", "#4a3a2a"), group);
                Sign(b.shortName, pos + new Vector3(0, 3.7f, 0), "#141414", 0.7f, group);
            }
        }

        void BuildProperties()
        {
            var group = new GameObject("Properties").transform; group.SetParent(Root, false);
            foreach (var p in Data.properties)
            {
                var pos = p.World();
                float h = Mathf.Max(3.2f, p.h);
                Compound(pos, 20f, 18f, group);
                Box(p.name, pos + Vector3.up * h * 0.5f, new Vector3(13f, h, 10f), Mat("pr-" + p.color, p.color), group);
                if (p.style == "bungalow") Box("Roof", pos + Vector3.up * (h + 0.2f), new Vector3(14f, 0.4f, 11f), Mat("zinc", Zinc, 0.5f), group, false);
                if (!string.IsNullOrEmpty(p.sign)) Sign(p.sign, pos + new Vector3(0, 2.6f, 10.6f), "#ffffff", 0.6f, group);
            }
        }

        void Compound(Vector3 pos, float w, float d, Transform group)
        {
            var fence = Mat("fence", "#9b9484");
            Box("Fence", pos + new Vector3(0, 0.9f, -d * 0.5f), new Vector3(w, 1.8f, 0.3f), fence, group);
            Box("Fence", pos + new Vector3(0, 0.9f, d * 0.5f), new Vector3(w, 1.8f, 0.3f), fence, group);
            Box("Fence", pos + new Vector3(-w * 0.5f, 0.9f, 0), new Vector3(0.3f, 1.8f, d), fence, group);
            Box("Fence", pos + new Vector3(w * 0.5f, 0.9f, 0), new Vector3(0.3f, 1.8f, d), fence, group);
        }

        void BuildCells()
        {
            var group = new GameObject("Compound cells").transform; group.SetParent(Root, false);
            foreach (var c in Data.cells)
            {
                var rng = new System.Random((int)(c.x * 31 + c.z * 17));
                var pos = c.World();
                switch (c.style)
                {
                    case "island": Tower(pos, 16f, 16f, 24f + (float)rng.NextDouble() * 26f, group, rng); break;
                    case "vi": Tower(pos, 14f, 14f, 18f + (float)rng.NextDouble() * 24f, group, rng); break;
                    case "yaba": House(pos, 12f, 10f, 7f + (float)rng.Next(0, 2) * 3.5f, HouseColours[rng.Next(HouseColours.Length)], false, group); break;
                    case "lekki": Compound(pos, 22f, 20f, group); House(pos, 13f, 11f, 8f, Cream, false, group); break;
                    default: Compound(pos, 22f, 20f, group); House(pos, 11f, 9f, rng.NextDouble() < 0.5 ? 3.6f : 7f, HouseColours[rng.Next(HouseColours.Length)], true, group); break;
                }
            }
        }

        void Tower(Vector3 pos, float w, float d, float h, Transform group, System.Random rng)
        {
            var glass = rng.NextDouble() < 0.5 ? Mat("glass", Glass, 0.85f) : Mat("tower", "#cfd3d6", 0.5f);
            Box("Tower", pos + Vector3.up * h * 0.5f, new Vector3(w, h, d), glass, group);
            Box("Crown", pos + Vector3.up * (h + 0.6f), new Vector3(w * 0.6f, 1.2f, d * 0.6f), Mat("parapet", "#6b655a"), group, false);
        }

        void House(Vector3 pos, float w, float d, float h, string colour, bool zincRoof, Transform group)
        {
            Box("House", pos + Vector3.up * h * 0.5f, new Vector3(w, h, d), Mat("house-" + colour, colour), group);
            if (zincRoof && h < 5f) Box("Roof", pos + Vector3.up * (h + 0.15f), new Vector3(w + 1f, 0.3f, d + 1f), Mat("zinc", Zinc, 0.5f), group, false);
            else Box("Parapet", pos + Vector3.up * (h + 0.25f), new Vector3(w + 0.4f, 0.5f, d + 0.4f), Mat("parapet", "#6b655a"), group, false);
            // Water tank, AC unit, balcony, and generator: Lagos compound details.
            Cylinder("Tank", pos + new Vector3(w * 0.3f, h + (zincRoof && h < 5f ? 0.3f : 0.5f), d * 0.25f), 0.7f, 1.2f, Mat("tank", Black), group, false);
            Box("AC unit", pos + new Vector3(-w * 0.28f, Mathf.Min(h - 0.8f, 2.6f), d * 0.5f + 0.18f), new Vector3(0.85f, 0.55f, 0.35f), Mat("ac-unit", "#d8dce0"), group, false);
            Box("Generator", pos + new Vector3(w * 0.5f + 0.7f, 0.45f, -d * 0.25f), new Vector3(1.1f, 0.9f, 0.75f), Mat("gen-box", Yellow), group, false);
            if (h >= 6.5f) Box("Balcony", pos + new Vector3(0f, 3.6f, d * 0.5f + 0.6f), new Vector3(w * 0.55f, 0.25f, 1.2f), Mat("concrete", Concrete), group, false);
        }

        // Fill the blocks between roads with housing where nothing else is placed, region-aware.
        void BuildHousing()
        {
            var group = new GameObject("Housing").transform; group.SetParent(Root, false);
            var m = Data.meta;
            int built = 0;
            for (float z = m.minZ + HouseGrid * 0.5f; z < m.maxZ && built < MaxHouses; z += HouseGrid)
            for (float x = m.minX + HouseGrid * 0.5f; x < m.maxX && built < MaxHouses; x += HouseGrid)
            {
                var region = Data.RegionAtData(x, z);
                if (region == null || Data.InWaterData(x, z) || NearRoadData(x, z, 8f) || ReservedData(x, z)) continue;
                var rng = new System.Random(Mathf.RoundToInt(x * 73f + z * 151f));
                if (rng.NextDouble() < 0.18) continue;   // leave some open ground
                float jx = ((float)rng.NextDouble() - 0.5f) * 4f, jz = ((float)rng.NextDouble() - 0.5f) * 4f;
                var pos = WorldData.W(x + jx, 0, z + jz);
                string id = region.id;
                bool dense = id.Contains("island") || id == "obalende" || id == "vi" || id.Contains("marina");
                bool estate = id.Contains("lekki") || id.Contains("ajah") || id.Contains("ikoyi") || id.Contains("oniru") || id.Contains("eleko");
                if (dense) Tower(pos, 14f, 12f, 12f + (float)rng.NextDouble() * 30f, group, rng);
                else if (estate) { Compound(pos, 20f, 18f, group); House(pos, 12f, 10f, 8f, Cream, false, group); }
                else
                {
                    double roll = rng.NextDouble();
                    Compound(pos, 20f, 18f, group);
                    if (roll < 0.55) House(pos, 11f, 9f, 3.6f, HouseColours[rng.Next(HouseColours.Length)], true, group);
                    else if (roll < 0.9) House(pos, 12f, 10f, 7f + rng.Next(0, 2) * 3.5f, HouseColours[rng.Next(HouseColours.Length)], false, group);
                    else House(pos, 13f, 11f, 18f + (float)rng.NextDouble() * 10f, "#c9c2b3", false, group);
                }
                built++;
            }
        }

        bool NearRoadData(float x, float z, float margin)
        {
            foreach (var r in Data.roads)
            {
                float along = r.Horizontal ? x : z, across = r.Horizontal ? z : x;
                if (along < r.from - margin || along > r.to + margin) continue;
                if (Mathf.Abs(across - r.k) < r.width * 0.5f + margin) return true;
            }
            return false;
        }

        bool ReservedData(float x, float z)
        {
            foreach (var l in Data.landmarks)
            {
                float r = l.stadium ? 40f : l.kind == "pitch" ? 30f : l.waterfront || l.kind == "settlement" || l.kind == "beach" ? 52f : l.big ? 24f : l.kind == "street" ? 12f : 19f;
                if ((l.x - x) * (l.x - x) + (l.z - z) * (l.z - z) < r * r) return true;
            }
            foreach (var b in Data.busStops) if ((b.x - x) * (b.x - x) + (b.z - z) * (b.z - z) < 14f * 14f) return true;
            foreach (var p in Data.properties) if ((p.x - x) * (p.x - x) + (p.z - z) * (p.z - z) < 19f * 19f) return true;
            foreach (var c in Data.cells) if ((c.x - x) * (c.x - x) + (c.z - z) * (c.z - z) < 16f * 16f) return true;
            return false;
        }

        // ---------- road furniture ----------

        void BuildTolls()
        {
            var group = new GameObject("Tolls").transform; group.SetParent(Root, false);
            foreach (var t in Data.tolls)
            {
                var r = Data.FindRoad(t.axis, t.k); if (r == null) continue;
                bool h = r.Horizontal;
                float width = r.width;
                Box("Canopy", r.Point(t.at, r.k, 6f), h ? new Vector3(8f, 0.5f, width + 4f) : new Vector3(width + 4f, 0.5f, 8f), Mat("canopy", "#2f5d8a"), group, false);
                int booths = Mathf.Max(2, Mathf.FloorToInt(width / 9f));
                for (int i = 0; i < booths; i++)
                {
                    float across = r.k - width * 0.5f + width * (i + 0.5f) / booths;
                    Box("Booth", r.Point(t.at, across, 1.5f), h ? new Vector3(2.2f, 3f, 1.6f) : new Vector3(1.6f, 3f, 2.2f), Mat("booth", "#e4d14b"), group);
                    Box("Pillar", r.Point(t.at, across, 4.4f), new Vector3(0.6f, 2.9f, 0.6f), Mat("pillar", "#8f8b82"), group, false);
                }
                Sign(t.name.ToUpper(), r.Point(t.at, r.k, 7.4f), "#ffffff", 1.2f, group);
            }
        }

        void BuildFootbridges()
        {
            var group = new GameObject("Footbridges").transform; group.SetParent(Root, false);
            var steel = Mat("steel", Steel, 0.4f);
            foreach (var f in Data.footbridges)
            {
                var r = Data.FindRoad(f.axis, f.k); if (r == null) continue;
                bool h = r.Horizontal;
                float span = r.width + 10f;
                Box("Span", r.Point(f.at, r.k, 6.2f), h ? new Vector3(3f, 0.4f, span) : new Vector3(span, 0.4f, 3f), steel, group);
                for (int s = -1; s <= 1; s += 2)
                {
                    float across = r.k + s * (span * 0.5f - 1f);
                    Box("Tower", r.Point(f.at, across, 3.1f), new Vector3(2.6f, 6.2f, 2.6f), steel, group);
                    Box("Rail", r.Point(f.at + 1.5f * (h ? 1 : 0), r.k + (h ? 0 : 1.5f), 7.0f), h ? new Vector3(0.1f, 1.2f, span) : new Vector3(span, 1.2f, 0.1f), steel, group, false);
                }
            }
        }

        // The four businesses for sale: small shops with a painted sign.
        void BuildBusinesses()
        {
            var group = new GameObject("Businesses").transform; group.SetParent(Root, false);
            foreach (var b in Data.businesses)
            {
                var pos = b.World();
                string colour = b.id == "kiosk" ? "#2e7d32" : b.id == "phone" ? "#1565c0" : b.id == "buka" ? "#c0392b" : "#f39c12";
                Box(b.name, pos + Vector3.up * 2f, new Vector3(8f, 4f, 6f), Mat("biz-" + colour, colour), group);
                Box(b.name + " awning", pos + new Vector3(0, 3.3f, 3.6f), new Vector3(8.4f, 0.15f, 1.6f), Mat("awning", "#f1ecdf"), group, false);
                Sign(b.name.ToUpper(), pos + new Vector3(0, 4.9f, 3.2f), "#ffffff", 0.8f, group);
            }
        }

        void BuildStreetFurniture()
        {
            var group = new GameObject("Kiosks and vendors").transform; group.SetParent(Root, false);
            foreach (var k in Data.kiosks)
            {
                var pos = k.World(0.3f);
                Box("Kiosk", pos + Vector3.up * 1.3f, new Vector3(2.6f, 2.6f, 2.2f), Mat("kiosk", "#2e7d32"), group);
                Sign("POS", pos + new Vector3(0, 3.1f, 0), "#ffffff", 0.6f, group);
            }
            foreach (var v in Data.vendors)
            {
                var pos = v.World(0.3f);
                Box("Table", pos + Vector3.up * 0.5f, new Vector3(2f, 0.9f, 1.2f), Mat("stall", "#7a5a3a"), group);
                Box("Umbrella", pos + Vector3.up * 2.4f, new Vector3(2.6f, 0.12f, 2.6f), Mat("umbrella", "#d9534f"), group, false);
            }
        }
    }
}
