using System;
using System.Collections.Generic;
using UnityEngine;

namespace Rise.Data
{
    // Mirrors the JSON written by scripts/export-world.mjs from the district and gameplay data modules.
    //
    // Coordinates: the data is in map units (metres, +x east, +z south). Unity is left-handed, so placing
    // the data as-is mirrors the city (east ends up on your left when you face north). We therefore map data (x, z)
    // to Unity (x, -z): north is +z in the scene. Every conversion goes through W() / DataZ() below; the query methods
    // take Unity world positions unless their name ends in "Data".
    [Serializable] public class MetaData
    {
        public string id, name, version;
        public float spawnX, spawnZ, minX, maxX, minZ, maxZ;
        public float startClock = 8.5f, hoursPerSecond = 1f / 45f, venueOpen = 20f, venueClose = 4f;
        public int startCash, startBank, priceWater = 100, priceSuya = 1500, posFee = 200, posAmount = 20000, refuel = 3000;
        public int awayMinMinutes = 2, awayCapMinutes = 480;
        // Law and economy rules (LAW, ECON, RENT, BIZ).
        public int pursuitHeat = 3, ticketKmh = 90, checkpointKmh = 60, fineRate = 10000, bustRate = 15000, speedTicket = 2000, leaseDays = 30, propertyLevel = 2;
        public float bustSeconds = 2.5f, payCycle = 60f, agentFeeRate = 0.1f, priceLow = 0.8f, priceHigh = 1.2f;
    }
    [Serializable] public class RegionData { public string id, name, state = "lagos", biome = "coastal"; public float minX, maxX, minZ, maxZ; public float Area => (maxX - minX) * (maxZ - minZ); public bool ContainsData(float x, float z) => x >= minX && x <= maxX && z >= minZ && z <= maxZ; }
    [Serializable] public class RoadData
    {
        public string axis; public float k, from, to, width; public string name, cls;
        public float speed = 1f, limit = 80f, density = 1f; public bool median, lights = true, vendors;
        public bool Horizontal => axis == "h";
        public float Length => to - from;
        // Along / across (data units) of a Unity world position relative to this road.
        public float Along(Vector3 w) => Horizontal ? w.x : WorldData.DataZ(w.z);
        public float Across(Vector3 w) => Horizontal ? WorldData.DataZ(w.z) : w.x;
        // Unity world position for an along / across pair.
        public Vector3 Point(float along, float across, float y = 0f) => Horizontal ? WorldData.W(along, y, across) : WorldData.W(across, y, along);
        // Unity direction of travel for increasing (+1) or decreasing (-1) along.
        public Vector3 Forward(int dir) => Horizontal ? new Vector3(dir, 0, 0) : new Vector3(0, 0, -dir);
    }
    [Serializable] public class SegmentData { public string axis; public float k, from, to; public string name; }
    [Serializable] public class ProfilePoint { public float along, height; }
    [Serializable] public class BridgeData { public string id, name, axis; public float k, halfW; public ProfilePoint[] profile; public float From => profile[0].along; public float To => profile[profile.Length - 1].along; }
    [Serializable] public class PointData { public float x, z; public Vector3 World(float y = 0f) => WorldData.W(x, y, z); }
    [Serializable] public class LandmarkData { public string id, name, shortName, kind, color, sign, region; public float x, z, h; public int cost; public bool big, stadium, waterfront; public Vector3 World(float y = 0f) => WorldData.W(x, y, z); }
    [Serializable] public class BusStopData { public string id, name, shortName; public float x, z; public int agberos; public Vector3 World(float y = 0f) => WorldData.W(x, y, z); }
    [Serializable] public class PropertyData { public string id, name, type, style, color, sign, perk; public float x, z, h; public int rent, buy; public Vector3 World(float y = 0f) => WorldData.W(x, y, z); public Vector3 Door => WorldData.W(x, 0f, z - 10.5f); }
    [Serializable] public class DealerData { public string type; public int price; }
    [Serializable] public class GymData { public int dayPass = 2000, monthly = 25000, trainer = 10000, boxingMin = 20; }
    [Serializable] public class FoodData { public string name; public int price, stamina, business; }
    [Serializable] public class MallData { public int outfit = 15000, laptop = 250000, groceries = 6000, barber = 2000, ticket = 5000; public string[] movies; }
    [Serializable] public class CafeData { public int browse = 500, gig = 25000; }
    [Serializable] public class SkillPoint { public string skill; public int points; }
    [Serializable] public class CourseData { public string id, name; public int cost; public float hours; public SkillPoint[] skills; public string[] unlocks; }
    [Serializable] public class FootballData { public int wager = 5000; public string[] tiers; public int[] prizes; }
    [Serializable] public class SchoolData { public int levyHelp = 2000, eveningClass = 15000, enrollment = 25000, semester = 18000, semesters = 3; public float duration = 4f, stamina = 25f; public SkillPoint[] eveningSkill; }
    [Serializable] public class WeatherData { public float rainChance = 0.15f, rainMinMinutes = 2f, rainMaxMinutes = 5f; }
    [Serializable] public class FamilyMemberData { public string id, name, role, color, line; public float offsetX, offsetZ; public int outfit, fabric, pants, skin, hair, bodyType; }
    [Serializable] public class FamilyRequestData { public string id, who, title, blurb, kind, item, need, msg, done; public int amount, threshold, restore, xp, repSocial; }
    [Serializable] public class FamilySpotData { public string id; public float x, z; public Vector3 World(float y = 0f) => WorldData.W(x, y, z); }
    [Serializable] public class FamilyScheduleData { public string who, spot, label; public float from, to; }
    [Serializable] public class RelationshipLevelData { public int min; public string label; }
    [Serializable] public class ServiceNpcData { public float x, z; public string u, color; public Vector3 World(float y = 0f) => WorldData.W(x, y, z); }
    [Serializable] public class NightlifeData { public float x, z; public string name; public Vector3 World(float y = 0f) => WorldData.W(x, y, z); }
    [Serializable] public class UpgradeData { public string id, name, desc; public int price; }
    [Serializable] public class AnimalData { public string kind; public float x, z; public Vector3 World(float y = 0f) => WorldData.W(x, y, z); }
    [Serializable] public class BusinessData { public string id, name; public int price, income; public float x, z; public Vector3 World(float y = 0f) => WorldData.W(x, y, z); }
    [Serializable] public class WaterData { public string id, name; public float minX, maxX, minZ, maxZ; public bool ContainsData(float x, float z) => x >= minX && x <= maxX && z >= minZ && z <= maxZ; }
    [Serializable] public class TollData { public string id, name, axis; public float k, at; public int fee; }
    [Serializable] public class RoadPointData { public string axis, name; public float k, at; }
    [Serializable] public class CellData { public string style; public float x, z; public Vector3 World(float y = 0f) => WorldData.W(x, y, z); }
    [Serializable] public class JobData { public string id, title, where, at, by, skill, needCourse; public int pay, xp, min; public float dur; public bool night, far; }
    [Serializable] public class ContactData { public string id, name, role, at, color, line; public float offsetX, offsetZ; public RunData[] runs; }
    // A contact's own timed delivery: offered through the hub menu in Session.Hustle.
    [Serializable] public class RunData { public string text, dest, item, label, rep; public float minutes; public int reward, heat; }
    [Serializable] public class ItemData { public string id, name, desc; }
    [Serializable] public class NameData { public string id, name; }
    [Serializable] public class VehicleClassData { public string id, name; public float len, wid, max, boost, accel; public bool commercial; public int fare; }
    [Serializable] public class FabricData { public string name, baseColor, accent, pattern; }
    [Serializable] public class LevelData { public int level; public string title; }
    [Serializable] public class UnlockData { public int level; public string text; }
    [Serializable] public class StateData { public string id, name, capital, zone, slogan, corridor, status; public int distanceKm, fare; }

    // A place any id can resolve to: landmark, bus stop or property.
    public struct Place
    {
        public string id, name, kind; public float x, z; public bool stadium, big, busStop;
        public Vector3 World(float y = 0f) => WorldData.W(x, y, z);
        public float Depth => stadium ? 34f : big ? 20f : (kind == "hotel" || kind == "bank") ? 16f : kind == "street" ? 0f : 14f;
    }

    [Serializable]
    public class WorldData
    {
        public MetaData meta;
        public RegionData[] regions;
        public RoadData[] roads;
        public SegmentData[] segments;
        public BridgeData[] bridges;
        public PointData[] junctions;
        public LandmarkData[] landmarks;
        public BusStopData[] busStops;
        public PropertyData[] properties;
        public BusinessData[] businesses;
        public DealerData[] dealer;
        public GymData gym; public FoodData[] food; public MallData mall; public CafeData cafe; public CourseData[] courses; public FootballData football; public int raceWager = 20000;
        public SchoolData school; public WeatherData weather; public AnimalData[] animals; public int petPrice = 25000;
        public ServiceNpcData[] serviceNpcs; public NightlifeData[] nightlife; public UpgradeData[] upgrades; public string[] liveries, slogans, staffNames;
        public int hookupPrice = 20000, staffCost = 50000, maxStaff = 3, rivalAfter = 2; public float staffBonus = 0.3f, rivalPenalty = 0.85f, tenantShare = 1f / 30f; public string rivalName = "Chidi's Corner";
        public FamilyMemberData[] family; public FamilyRequestData[] familyRequests; public FamilySpotData[] familySpots; public FamilyScheduleData[] familySchedules; public RelationshipLevelData[] relationshipLevels;
        public string[] outfits, hairStyles, faces, bodyTypes, accessories, facialHair, hairColors;
        public WaterData[] waters;
        public TollData[] tolls;
        public RoadPointData[] footbridges;
        public RoadPointData[] uTurns;
        public PointData[] kiosks;
        public PointData[] vendors;
        public JobData[] jobs;
        public ContactData[] contacts;
        public ItemData[] items;
        [NonSerialized] Dictionary<string, string> itemNames;
        // Display name of an inventory item ("food_cooler" → "Jollof Cooler"); unknown ids are tidied.
        public string ItemName(string id)
        {
            if (itemNames == null) { itemNames = new Dictionary<string, string>(); if (items != null) foreach (var i in items) itemNames[i.id] = i.name; }
            return itemNames.TryGetValue(id ?? "", out var n) ? n : (id ?? "").Replace('_', ' ');
        }
        public NameData[] allContacts;
        public VehicleClassData[] vehicleClasses;
        public FabricData[] fabrics;
        public string[] skins, pants;
        public LevelData[] levels;
        public UnlockData[] unlocks;
        public CellData[] cells;
        public StateData[] states;

        [NonSerialized] RegionData[] regionsByArea;
        [NonSerialized] Dictionary<string, List<SegmentData>> segmentIndex;
        [NonSerialized] Dictionary<string, Place> places;

        // ---- coordinate mapping (the only place that knows about the mirror) ----
        public static Vector3 W(float x, float y, float z) => new Vector3(x, y, -z);
        public static float DataZ(float worldZ) => -worldZ;
        public Vector3 Spawn => W(meta.spawnX, 0f, meta.spawnZ);

        public static WorldData LoadFromResources(string path = "world/lagos")
        {
            var text = Resources.Load<TextAsset>(path);
            if (text == null) throw new InvalidOperationException($"World data '{path}' not found under Resources. Run `npm run export:unity` in the repo root.");
            var data = JsonUtility.FromJson<WorldData>(text.text);
            data.Prepare();
            return data;
        }

        public void Prepare()
        {
            regionsByArea = (RegionData[])regions.Clone();
            Array.Sort(regionsByArea, (a, b) => a.Area.CompareTo(b.Area));   // smallest region wins
            segmentIndex = new Dictionary<string, List<SegmentData>>();
            foreach (var s in segments)
            {
                var key = s.axis + ":" + s.k;
                if (!segmentIndex.TryGetValue(key, out var list)) segmentIndex[key] = list = new List<SegmentData>();
                list.Add(s);
            }
            places = new Dictionary<string, Place>();
            foreach (var l in landmarks) if (!places.ContainsKey(l.id)) places[l.id] = new Place { id = l.id, name = l.name, kind = l.kind, x = l.x, z = l.z, stadium = l.stadium, big = l.big };
            foreach (var b in busStops) if (!places.ContainsKey(b.id)) places[b.id] = new Place { id = b.id, name = b.name, kind = "busstop", x = b.x, z = b.z, busStop = true };
            foreach (var p in properties) if (!places.ContainsKey(p.id)) places[p.id] = new Place { id = p.id, name = p.name, kind = "property", x = p.x, z = p.z };
            if (bridges != null)
                foreach (var b in bridges)
                {
                    var r = FindRoad(b.axis, b.k);
                    if (r != null) b.halfW = Mathf.Max(b.halfW, r.width * 0.5f + 1.5f);
                }
            businesses ??= new BusinessData[0]; dealer ??= new DealerData[0]; gym ??= new GymData(); food ??= new FoodData[0]; mall ??= new MallData(); cafe ??= new CafeData(); courses ??= new CourseData[0]; football ??= new FootballData(); school ??= new SchoolData(); weather ??= new WeatherData(); animals ??= new AnimalData[0]; family ??= new FamilyMemberData[0]; serviceNpcs ??= new ServiceNpcData[0]; nightlife ??= new NightlifeData[0]; upgrades ??= new UpgradeData[0]; liveries ??= new string[0]; slogans ??= new string[0]; staffNames ??= new string[0]; familyRequests ??= new FamilyRequestData[0]; familySpots ??= new FamilySpotData[0]; familySchedules ??= new FamilyScheduleData[0]; relationshipLevels ??= new RelationshipLevelData[0];
            outfits ??= new string[0]; hairStyles ??= new string[0]; faces ??= new string[0]; bodyTypes ??= new string[0]; accessories ??= new string[0]; facialHair ??= new string[0]; hairColors ??= new string[0]; jobs ??= new JobData[0]; contacts ??= new ContactData[0]; allContacts ??= new NameData[0]; vehicleClasses ??= new VehicleClassData[0];
            fabrics ??= new FabricData[0]; skins ??= new string[0]; pants ??= new string[0]; levels ??= new LevelData[0]; unlocks ??= new UnlockData[0]; states ??= new StateData[0];
        }

        // ---- places, contacts, jobs ----
        public bool TryPlace(string id, out Place place) => places.TryGetValue(id ?? "", out place);

        // Where a contact stands: on the street side (north, data -z) of their building, by the shelter at a bus stop.
        public bool ContactSpot(ContactData c, out Vector3 world)
        {
            world = Vector3.zero;
            if (!TryPlace(c.at, out var p)) return false;
            float x, z;
            if (p.stadium) { x = p.x; z = p.z - 27f; }
            else if (p.kind == "pitch") { x = p.x + 8f; z = p.z - 13f; }
            else if (p.busStop) { x = p.x + 5f; z = p.z + 3f; }
            else if (p.kind == "street") { x = p.x; z = p.z; }
            else { x = p.x + 3f; z = p.z - p.Depth * 0.5f - 2f; }
            world = W(x + c.offsetX, 0f, z + c.offsetZ);
            return true;
        }

        public PropertyData Property(string id) { foreach (var p in properties) if (p.id == id) return p; return null; }
        public BusinessData Business(string id) { foreach (var b in businesses) if (b.id == id) return b; return null; }
        public FamilySpotData FamilySpot(string id) { foreach (var sp in familySpots) if (sp.id == id) return sp; return null; }
        public FamilyScheduleData ScheduleFor(string who, float clock) { float h = Mathf.Repeat(clock, 24f); FamilyScheduleData first = null; foreach (var w in familySchedules) { if (w.who != who) continue; first ??= w; if (h >= w.from && h < w.to) return w; } return first; }
        public string RelationshipLabel(float score) { string label = relationshipLevels.Length > 0 ? relationshipLevels[0].label : "Distant"; foreach (var l in relationshipLevels) if (score >= l.min) label = l.label; return label; }
        public CourseData Course(string id) { foreach (var c in courses) if (c.id == id) return c; return null; }
        public LandmarkData NearestLandmark(string kind, Vector3 pos, float radius) { LandmarkData best = null; float bestD = radius * radius; foreach (var l in landmarks) { if (l.kind != kind) continue; var w = l.World(pos.y); float d = (w - pos).sqrMagnitude; if (d < bestD) { bestD = d; best = l; } } return best; }
        public string ContactName(string id) { foreach (var c in allContacts) if (c.id == id) return c.name; return id; }
        public List<JobData> JobsAt(string placeId) { var l = new List<JobData>(); foreach (var j in jobs) if (j.at == placeId) l.Add(j); return l; }
        public VehicleClassData VehicleClass(string id) { foreach (var v in vehicleClasses) if (v.id == id) return v; return null; }
        public string TitleFor(int level) { string t = "Newcomer"; foreach (var l in levels) if (level >= l.level) t = l.title; return t; }
        public string UnlockFor(int level) { foreach (var u in unlocks) if (u.level == level) return u.text; return null; }

        // ---- geometry queries (Unity world positions) ----
        public RegionData RegionAt(Vector3 w) => RegionAtData(w.x, DataZ(w.z));
        public RegionData RegionAtData(float x, float z)
        {
            if (regionsByArea == null || regionsByArea.Length == 0) return null;
            foreach (var r in regionsByArea) if (r.ContainsData(x, z)) return r;
            RegionData best = regionsByArea[0];
            float bestD = float.MaxValue;
            foreach (var r in regionsByArea)
            {
                float dx = x < r.minX ? r.minX - x : (x > r.maxX ? x - r.maxX : 0f);
                float dz = z < r.minZ ? r.minZ - z : (z > r.maxZ ? z - r.maxZ : 0f);
                float d = dx * dx + dz * dz;
                if (d < bestD) { bestD = d; best = r; }
            }
            return best;
        }
        public string StateAt(Vector3 w) { var r = RegionAt(w); return r != null && !string.IsNullOrEmpty(r.state) ? r.state : "lagos"; }
        public string BiomeAt(Vector3 w) { var r = RegionAt(w); return r != null && !string.IsNullOrEmpty(r.biome) ? r.biome : "coastal"; }

        public bool InWater(Vector3 w) => InWaterData(w.x, DataZ(w.z));
        public bool InWaterData(float x, float z) { foreach (var wa in waters) if (wa.ContainsData(x, z)) return true; return false; }

        public RoadData FindRoad(string axis, float k) { foreach (var r in roads) if (r.axis == axis && Mathf.Approximately(r.k, k)) return r; return null; }

        // The road whose carriageway (plus margin) contains the point; the nearest centreline wins.
        public RoadData RoadAt(Vector3 w, float margin = 8f)
        {
            RoadData best = null; float bestScore = float.MaxValue;
            foreach (var r in roads)
            {
                float along = r.Along(w), across = Mathf.Abs(r.Across(w) - r.k);
                if (along < r.from || along > r.to || across > r.width * 0.5f + margin) continue;
                float hDiff = Mathf.Abs(w.y - RoadHeightAt(r, along));
                float score = across + (hDiff > 2.2f ? hDiff * 4f : 0f);
                if (score < bestScore) { bestScore = score; best = r; }
            }
            return best;
        }

        public string RoadNameAt(RoadData r, float along)
        {
            if (r != null && segmentIndex.TryGetValue(r.axis + ":" + r.k, out var list))
                foreach (var s in list) if (along >= s.from && along < s.to) return s.name;
            return r?.name ?? "the main road";
        }

        // Deck height along a specific road (only considers bridges on that road's own axis and k).
        public float RoadHeightAt(RoadData r, float along)
        {
            if (r == null || bridges == null) return 0f;
            float best = 0f;
            foreach (var b in bridges)
            {
                if (b.axis != r.axis || !Mathf.Approximately(b.k, r.k)) continue;
                if (along < b.From || along > b.To) continue;
                var p = b.profile;
                for (int i = 1; i < p.Length; i++)
                {
                    if (along > p[i].along) continue;
                    var a = p[i - 1]; var c = p[i];
                    float t = Mathf.Approximately(c.along, a.along) ? 0f : (along - a.along) / (c.along - a.along);
                    float height = Mathf.Lerp(a.height, c.height, t);
                    if (height > best) best = height;
                    break;
                }
            }
            return best;
        }

        // Deck height at a position (0 at ground).
        public float DeckHeightAt(Vector3 w) => DeckHeightAtData(w.x, DataZ(w.z), out _);
        public float DeckHeightAt(Vector3 w, out BridgeData bridge) => DeckHeightAtData(w.x, DataZ(w.z), out bridge);
        public float DeckHeightAtData(float x, float z) => DeckHeightAtData(x, z, out _);
        public float DeckHeightAtData(float x, float z, out BridgeData bridge)
        {
            float best = 0f; bridge = null;
            foreach (var b in bridges)
            {
                bool h = b.axis == "h";
                float along = h ? x : z, across = h ? z : x;
                if (Mathf.Abs(across - b.k) > b.halfW || along < b.From || along > b.To) continue;
                var p = b.profile;
                for (int i = 1; i < p.Length; i++)
                {
                    if (along > p[i].along) continue;
                    var a = p[i - 1]; var c = p[i];
                    float t = Mathf.Approximately(c.along, a.along) ? 0f : (along - a.along) / (c.along - a.along);
                    float height = Mathf.Lerp(a.height, c.height, t);
                    if (height > best) { best = height; bridge = b; }
                    break;
                }
            }
            return best;
        }

        public bool OnBridge(string axis, float k, float along)
        {
            foreach (var b in bridges) if (b.axis == axis && Mathf.Approximately(b.k, k) && along > b.From && along < b.To) return true;
            return false;
        }
    }
}
