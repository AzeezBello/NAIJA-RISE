using System;
using System.Collections.Generic;
using UnityEngine;

namespace NaijaRise.Data
{
    // Mirrors the JSON written by scripts/export-world.mjs from src/data/districts/lagos.js.
    // World units are metres; +x east, +z south (down on the map), exactly as in the Three.js edition.
    [Serializable] public class MetaData
    {
        public string id, name, version;
        public float spawnX, spawnZ, minX, maxX, minZ, maxZ;
        public float startClock = 8.5f, hoursPerSecond = 1f / 45f;
        public int startCash, startBank;
    }
    [Serializable] public class RegionData { public string id, name; public float minX, maxX, minZ, maxZ; public float Area => (maxX - minX) * (maxZ - minZ); public bool Contains(float x, float z) => x >= minX && x < maxX && z >= minZ && z < maxZ; }
    [Serializable] public class RoadData
    {
        public string axis; public float k, from, to, width; public string name, cls;
        public float speed = 1f, limit = 80f, density = 1f; public bool median, lights = true, vendors;
        public bool Horizontal => axis == "h";
        public float Length => to - from;
        // Along/across of a world position relative to this road.
        public float Along(float x, float z) => Horizontal ? x : z;
        public float Across(float x, float z) => Horizontal ? z : x;
        public Vector3 Point(float along, float across, float y = 0f) => Horizontal ? new Vector3(along, y, across) : new Vector3(across, y, along);
        public Vector3 Forward(int dir) => Horizontal ? new Vector3(dir, 0, 0) : new Vector3(0, 0, dir);
    }
    [Serializable] public class SegmentData { public string axis; public float k, from, to; public string name; }
    [Serializable] public class ProfilePoint { public float along, height; }
    [Serializable] public class BridgeData { public string id, name, axis; public float k, halfW; public ProfilePoint[] profile; public float From => profile[0].along; public float To => profile[profile.Length - 1].along; }
    [Serializable] public class PointData { public float x, z; }
    [Serializable] public class LandmarkData { public string id, name, shortName, kind, color, sign, region; public float x, z, h; public bool big, stadium, waterfront; }
    [Serializable] public class BusStopData { public string id, name, shortName; public float x, z; public int agberos; }
    [Serializable] public class PropertyData { public string id, name, type, style, color, sign; public float x, z, h; public int rent, buy; }
    [Serializable] public class WaterData { public string id, name; public float minX, maxX, minZ, maxZ; public bool Contains(float x, float z) => x >= minX && x <= maxX && z >= minZ && z <= maxZ; }
    [Serializable] public class TollData { public string id, name, axis; public float k, at; public int fee; }
    [Serializable] public class RoadPointData { public string axis, name; public float k, at; }
    [Serializable] public class CellData { public string style; public float x, z; }

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
        public WaterData[] waters;
        public TollData[] tolls;
        public RoadPointData[] footbridges;
        public RoadPointData[] uTurns;
        public PointData[] kiosks;
        public PointData[] vendors;
        public CellData[] cells;

        [NonSerialized] RegionData[] regionsByArea;
        [NonSerialized] Dictionary<string, List<SegmentData>> segmentIndex;

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
            Array.Sort(regionsByArea, (a, b) => a.Area.CompareTo(b.Area));   // smallest region wins, as in lagos.js
            segmentIndex = new Dictionary<string, List<SegmentData>>();
            foreach (var s in segments)
            {
                var key = s.axis + ":" + s.k;
                if (!segmentIndex.TryGetValue(key, out var list)) segmentIndex[key] = list = new List<SegmentData>();
                list.Add(s);
            }
        }

        public RegionData RegionAt(float x, float z)
        {
            foreach (var r in regionsByArea) if (r.Contains(x, z)) return r;
            return null;
        }

        public bool InWater(float x, float z)
        {
            foreach (var w in waters) if (w.Contains(x, z)) return true;
            return false;
        }

        public RoadData FindRoad(string axis, float k)
        {
            foreach (var r in roads) if (r.axis == axis && Mathf.Approximately(r.k, k)) return r;
            return null;
        }

        // The road whose carriageway (plus margin) contains the point; the nearest centreline wins.
        public RoadData RoadAt(float x, float z, float margin = 8f)
        {
            RoadData best = null; float bestD = float.MaxValue;
            foreach (var r in roads)
            {
                float along = r.Along(x, z), across = Mathf.Abs(r.Across(x, z) - r.k);
                if (along < r.from || along > r.to || across > r.width * 0.5f + margin) continue;
                if (across < bestD) { bestD = across; best = r; }
            }
            return best;
        }

        public string RoadNameAt(RoadData r, float along)
        {
            if (r != null && segmentIndex.TryGetValue(r.axis + ":" + r.k, out var list))
                foreach (var s in list) if (along >= s.from && along < s.to) return s.name;
            return r?.name ?? "the main road";
        }

        // Deck height at a position (0 at ground). Mirrors src/world/terrain.js deckHeightAt.
        public float DeckHeightAt(float x, float z) => DeckHeightAt(x, z, out _);
        public float DeckHeightAt(float x, float z, out BridgeData bridge)
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
