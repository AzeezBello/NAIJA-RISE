using System.Collections.Generic;
using UnityEngine;
using Rise.Data;
using Rise.Vehicles;

namespace Rise.World
{
    // Dynamic city events & street encounters: go-slow jams, road-construction diversions that close a lane
    // with cones, barriers and a DIVERSION sign, an overturned keke, the storm flood at the Ojuelegba underpass,
    // NEPA outages that take the street lights at night, and interactive roadside encounters (broken-down danfo,
    // roadside dispute, stranded executive).
    public class Events : MonoBehaviour
    {
        public class Jam { public RoadData road; public float from, to, until; public bool works, wreck, flood; }
        public class Encounter { public string kind, title, prompt, rep; public Vector3 pos; public int reward, repAmount, xp; public float until; }

        public Jam Current { get; private set; }
        public Encounter ActiveEncounter { get; private set; }
        public float Outage { get; private set; }
        WorldData data; DayNightCycle clock; Weather weather;
        readonly List<GameObject> props = new List<GameObject>();
        readonly List<GameObject> encounterProps = new List<GameObject>();
        float jamT = 60f, outageT = 120f, encounterT = 75f;
        [System.NonSerialized] public System.Action<string, string> Notify;   // (who, text)

        public void Init(WorldData world, DayNightCycle dayNight, Weather w) { data = world; clock = dayNight; weather = w; }
        public void RestorePower() { Outage = 0f; }

        public bool InJam(RoadData road, float along) => Current != null && Current.road == road && along > Current.from && along < Current.to;
        public bool FloodedAt(Vector3 pos) => Current != null && Current.flood && Current.road != null && Mathf.Abs(Current.road.Across(pos) - Current.road.k) < 9f && InJam(Current.road, Current.road.Along(pos));

        void Update()
        {
            float dt = Time.deltaTime; bool night = clock != null && (clock.Clock > 18.5f || clock.Clock < 6f);
            if (Outage > 0f) { Outage -= dt; if (Outage <= 0f) { Outage = 0f; Notify?.Invoke("NEPA", "Up NEPA! Light don come back."); } }
            else { outageT -= dt; if (outageT <= 0f) { outageT = Random.Range(120f, 260f); if (night && Random.value < 0.6f) { Outage = Random.Range(50f, 120f); Notify?.Invoke("NEPA", "NEPA don take light! Generators dey hum across Surulere."); } } }

            if (Current != null)
            {
                Current.until -= dt;
                if (Current.until <= 0f) { bool works = Current.works; Clear(); Notify?.Invoke(works ? "LASTMA" : "Traffic", works ? "Road works done — lane open again." : "Go-slow don clear."); }
            }
            else
            {
                if (weather != null && weather.Storm) { StartFlood(); return; }
                jamT -= dt; if (jamT <= 0f) { jamT = Random.Range(90f, 200f); if (Random.value < 0.7f) StartJam(); }
            }

            if (ActiveEncounter != null)
            {
                ActiveEncounter.until -= dt;
                if (ActiveEncounter.until <= 0f) ClearEncounter();
            }
            else
            {
                encounterT -= dt;
                if (encounterT <= 0f)
                {
                    encounterT = Random.Range(85f, 160f);
                    if (Random.value < 0.75f) StartEncounter();
                }
            }
        }

        public void StartEncounter(int? forceKind = null, Vector3? atPos = null)
        {
            ClearEncounter();
            var road = data.FindRoad("v", 0f) ?? data.roads[Random.Range(0, data.roads.Length)];
            Vector3 pos = atPos ?? road.Point(Mathf.Clamp(0f, road.from + 25f, road.to - 25f), road.k + road.width * 0.5f - 1.8f, 0.12f);
            pos.y = data.DeckHeightAt(pos) + 0.12f;
            int k = forceKind ?? Random.Range(0, 3);
            if (k == 0)
            {
                ActiveEncounter = new Encounter
                {
                    kind = "breakdown",
                    title = "Broken-Down Danfo",
                    prompt = "HELP PUSH BROKEN DANFO · +₦8,000",
                    rep = "public",
                    repAmount = 4,
                    reward = 8000,
                    xp = 15,
                    pos = pos,
                    until = 180f,
                };
                var cls = data.VehicleClass("danfo") ?? data.VehicleClass("car");
                if (cls != null)
                {
                    var v = VehicleBodies.Build(cls, transform, new System.Random(41), out _);
                    v.transform.position = pos;
                    encounterProps.Add(v);
                }
            }
            else if (k == 1)
            {
                ActiveEncounter = new Encounter
                {
                    kind = "dispute",
                    title = "Roadside Dispute",
                    prompt = "SETTLE ROADSIDE WAHALA · +₦10,000",
                    rep = "social",
                    repAmount = 5,
                    reward = 10000,
                    xp = 15,
                    pos = pos,
                    until = 180f,
                };
                var cls = data.VehicleClass("taxi") ?? data.VehicleClass("car");
                if (cls != null)
                {
                    var v = VehicleBodies.Build(cls, transform, new System.Random(42), out _);
                    v.transform.position = pos;
                    encounterProps.Add(v);
                }
            }
            else
            {
                ActiveEncounter = new Encounter
                {
                    kind = "vip_escort",
                    title = "Stranded Island Executive",
                    prompt = "ASSIST STRANDED EXECUTIVE · +₦15,000",
                    rep = "business",
                    repAmount = 5,
                    reward = 15000,
                    xp = 20,
                    pos = pos,
                    until = 180f,
                };
                var cls = data.VehicleClass("luxury") ?? data.VehicleClass("suv") ?? data.VehicleClass("car");
                if (cls != null)
                {
                    var v = VehicleBodies.Build(cls, transform, new System.Random(43), out _);
                    v.transform.position = pos;
                    encounterProps.Add(v);
                }
            }

            var beacon = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            beacon.name = "Encounter beacon";
            Destroy(beacon.GetComponent<Collider>());
            beacon.transform.SetParent(transform, false);
            beacon.transform.position = pos + Vector3.up * 2.8f;
            beacon.transform.localScale = new Vector3(0.45f, 0.45f, 0.45f);
            beacon.GetComponent<MeshRenderer>().sharedMaterial = Mat("#ffc52f");
            Label(beacon.transform, ActiveEncounter.title.ToUpper());
            encounterProps.Add(beacon);
            Notify?.Invoke("Street", $"{ActiveEncounter.title} spotted nearby — lend a hand for ₦{ActiveEncounter.reward:N0}.");
        }

        public void ClearEncounter()
        {
            ActiveEncounter = null;
            foreach (var p in encounterProps) if (p != null) Destroy(p);
            encounterProps.Clear();
        }

        public void StartFlood()
        {
            var road = data.FindRoad("h", -66f); if (road == null) return;
            Current = new Jam { road = road, from = -20f, to = 60f, until = 150f, flood = true };
            var water = GameObject.CreatePrimitive(PrimitiveType.Cube); water.name = "Flood"; Destroy(water.GetComponent<Collider>());
            water.transform.position = road.Point(20f, road.k, 0.22f); water.transform.localScale = new Vector3(80f, 0.12f, road.width + 6f);
            var m = new Material(ShaderLib.Lit) { color = new Color(0.35f, 0.3f, 0.2f, 1f) }; m.SetFloat("_Smoothness", 0.9f); water.GetComponent<MeshRenderer>().sharedMaterial = m;
            props.Add(water);
            Notify?.Invoke("Weather", "Storm! Ojuelegba underpass don flood — Itire Road is a go-slow.");
        }

        public void StartJam(RoadData pick = null, float? at = null, int? kind = null)
        {
            var road = pick ?? data.roads[Random.Range(0, data.roads.Length)];
            if (road.Length < 120f) return;
            float from = at ?? Random.Range(road.from + 20f, road.to - 80f);
            Current = new Jam { road = road, from = from, to = from + 60f, until = Random.Range(60f, 120f) };
            float r = kind.HasValue ? kind.Value * 0.3f + 0.01f : Random.value;
            string name = data.RoadNameAt(road, from + 30f);
            bool h = road.Horizontal;
            if (r < 0.3f)
            {
                Current.until = Random.Range(150f, 260f); Current.works = true;
                var cone = Mat("#ff6a1a"); var barrier = Mat("#bfb8a6"); var board = Mat("#ff6a1a");
                for (float c = from; c <= from + 60f; c += 6f) Prop(PrimitiveType.Cylinder, road.Point(c, road.k - 4.5f, 0.45f), new Vector3(0.5f, 0.35f, 0.5f), cone);
                for (float c = from + 3f; c <= from + 57f; c += 12f) Prop(PrimitiveType.Cube, road.Point(c, road.k - 2.2f, 0.55f), h ? new Vector3(8f, 0.9f, 0.6f) : new Vector3(0.6f, 0.9f, 8f), barrier);
                var sign = Prop(PrimitiveType.Cube, road.Point(from - 6f, road.k - 7f, 3f), h ? new Vector3(6.5f, 1.3f, 0.2f) : new Vector3(0.2f, 1.3f, 6.5f), board);
                Label(sign.transform, "ROAD WORKS · DIVERSION");
                Notify?.Invoke("LASTMA", $"Road construction on {name} — one lane closed, follow the diversion.");
            }
            else if (r < 0.6f)
            {
                Current.wreck = true;
                var keke = data.VehicleClass("keke");
                if (keke != null)
                {
                    var wreck = VehicleBodies.Build(keke, transform, new System.Random(9), out _);
                    wreck.transform.position = road.Point(from + 30f, road.k - 4.5f, 0.9f); wreck.transform.rotation = Quaternion.Euler(0f, Random.Range(0f, 360f), 82f);
                    props.Add(wreck);
                    for (float c = from + 22f; c <= from + 38f; c += 4f) Prop(PrimitiveType.Cylinder, road.Point(c, road.k - 6f, 0.45f), new Vector3(0.5f, 0.35f, 0.5f), Mat("#ff6a1a"));
                }
                Notify?.Invoke("Traffic", $"Accident on {name} — keke don tumble. Expect go-slow.");
            }
            else Notify?.Invoke("Traffic", $"Go-slow on {name} — danfos dey crawl. Find another route.");
        }

        static Material Mat(string hex) { var m = new Material(ShaderLib.Lit); ColorUtility.TryParseHtmlString(hex, out var c); m.color = c; return m; }
        GameObject Prop(PrimitiveType type, Vector3 pos, Vector3 scale, Material m)
        {
            var go = GameObject.CreatePrimitive(type); go.transform.SetParent(transform, false); go.transform.position = pos; go.transform.localScale = scale; go.GetComponent<MeshRenderer>().sharedMaterial = m;
            props.Add(go); return go;
        }
        static void Label(Transform parent, string text)
        {
            var font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            var go = new GameObject("Label"); go.transform.SetParent(parent, false); go.transform.localPosition = new Vector3(0, 0, -0.6f);
            go.transform.localScale = new Vector3(1f / Mathf.Max(0.01f, parent.localScale.x), 1f / Mathf.Max(0.01f, parent.localScale.y), 1f);
            var tm = go.AddComponent<TextMesh>(); tm.text = text; tm.font = font; tm.fontSize = 48; tm.characterSize = 0.06f; tm.fontStyle = FontStyle.Bold;
            tm.anchor = TextAnchor.MiddleCenter; tm.alignment = TextAlignment.Center; tm.color = new Color(0.03f, 0.06f, 0.05f);
            go.GetComponent<MeshRenderer>().sharedMaterial = font.material;
            go.AddComponent<Entities.FacingLabel>();
        }

        public void Clear() { Current = null; foreach (var p in props) if (p != null) Destroy(p); props.Clear(); }
    }
}
