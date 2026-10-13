using System.Collections.Generic;
using UnityEngine;
using NaijaRise.Data;
using NaijaRise.Vehicles;

namespace NaijaRise.World
{
    // Ambient traffic: danfos, kekes, koropes, okadas and cars follow the road grid in lanes (right-hand traffic),
    // keep their distance from the vehicle ahead and from the player, ride the bridge decks, obey the class speed and
    // the bridge rush-hour profile. Any vehicle can be taken by the player (TakeVehicle), which removes it from here.
    public class TrafficSystem : MonoBehaviour
    {
        public int Count = 110;
        public float BaseSpeed = 13f;   // m/s for a class-1.0 road

        public class Vehicle { public Transform t; public VehicleClassData cls; public RoadData road; public int dir, lane; public float along, speed, cruise; public Transform[] wheels; }

        WorldData data;
        DayNightCycle clock;
        Transform root;
        readonly List<Vehicle> vehicles = new List<Vehicle>();
        public IReadOnlyList<Vehicle> Vehicles => vehicles;
        [System.NonSerialized] public Transform PlayerObstacle;   // the player (on foot or driving); traffic brakes for it
        [System.NonSerialized] public TrafficLights Lights;
        static readonly string[] Mix = { "danfo", "danfo", "danfo", "keke", "keke", "korope", "car", "car", "car", "car", "okada", "car", "danfo", "police", "lawma", "tanker", "van", "pickup" };

        public void Init(WorldData world, DayNightCycle dayNight, Transform parent)
        {
            data = world; clock = dayNight;
            root = new GameObject("Traffic").transform; root.SetParent(parent, false);
            var rng = new System.Random(2026);
            var weights = new List<float>(); float total = 0f;
            foreach (var r in data.roads) { float w = Mathf.Max(0f, r.Length) * r.density; weights.Add(w); total += w; }
            for (int i = 0; i < Count; i++)
            {
                float pick = (float)rng.NextDouble() * total; int idx = 0;
                for (; idx < weights.Count - 1; idx++) { pick -= weights[idx]; if (pick <= 0f) break; }
                var road = data.roads[idx];
                var cls = data.VehicleClass(Mix[rng.Next(Mix.Length)]) ?? data.VehicleClass("car");
                if (cls == null) break;
                var v = new Vehicle { cls = cls, road = road, dir = rng.NextDouble() < 0.5 ? -1 : 1, lane = road.width >= 30f && rng.NextDouble() < 0.5 ? 1 : 0 };
                v.along = Mathf.Lerp(road.from + 6f, road.to - 6f, (float)rng.NextDouble());
                v.t = VehicleBodies.Build(cls, root, rng, out v.wheels).transform;
                v.cruise = Mathf.Min(cls.max, BaseSpeed * road.speed) * (0.85f + 0.3f * (float)rng.NextDouble());
                v.speed = v.cruise;
                vehicles.Add(v);
                Place(v);
            }
        }

        // The player takes this vehicle: it leaves the traffic simulation and becomes a drivable VehicleController.
        public VehicleController TakeVehicle(Vehicle v)
        {
            vehicles.Remove(v);
            var vc = v.t.gameObject.AddComponent<VehicleController>();
            vc.Setup(v.cls, v.wheels);
            return vc;
        }

        // Leave the simulation (police pursuit) and come back to it afterwards.
        public void Detach(Vehicle v) => vehicles.Remove(v);
        public void Rejoin(Vehicle v) { if (!vehicles.Contains(v)) { vehicles.Add(v); v.speed = 0f; Place(v); } }

        public Vehicle Nearest(Vector3 pos, float maxDist)
        {
            Vehicle best = null; float bestD = maxDist * maxDist;
            foreach (var v in vehicles) { float d = (v.t.position - pos).sqrMagnitude; if (d < bestD) { bestD = d; best = v; } }
            return best;
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
                float gap = float.MaxValue, aheadSpeed = 0f;
                for (int j = 0; j < vehicles.Count; j++)
                {
                    if (i == j) continue; var o = vehicles[j];
                    if (o.road != v.road || o.dir != v.dir || o.lane != v.lane) continue;
                    float d = (o.along - v.along) * v.dir;
                    if (d > 0f && d < gap) { gap = d; aheadSpeed = o.speed; }
                }
                // The player (on foot or driving) ahead in our lane: stop for them.
                if (PlayerObstacle != null)
                {
                    float pAlong = v.road.Along(PlayerObstacle.position), pAcross = v.road.Across(PlayerObstacle.position);
                    float d = (pAlong - v.along) * v.dir;
                    float laneAcross = v.road.k + LaneOffsetSign(v) * LaneOffset(v);
                    if (d > 0f && d < 16f && Mathf.Abs(pAcross - laneAcross) < 2.6f && Mathf.Abs(PlayerObstacle.position.y - v.t.position.y) < 3f) { gap = Mathf.Min(gap, d); aheadSpeed = 0f; }
                }
                // Red or amber light at the next junction ahead: stop short of it unless already inside.
                if (Lights != null)
                {
                    string light = Lights.LightFor(v.road.axis);
                    if (light != "green")
                        foreach (var o in data.roads)
                        {
                            if (o.axis == v.road.axis) continue;
                            if (v.road.k < o.from || v.road.k > o.to || o.k < v.road.from || o.k > v.road.to) continue;
                            bool hasLight = v.road.Horizontal ? Lights.HasLight(o.k, v.road.k) : Lights.HasLight(v.road.k, o.k);
                            if (!hasLight) continue;
                            float d = (o.k - v.along) * v.dir - o.width * 0.5f;   // distance to the junction edge
                            if (d > 0.5f && d < 9f) { gap = Mathf.Min(gap, d + v.cls.len * 0.5f + 4.5f - 1f); aheadSpeed = 0f; }
                        }
                }
                float minGap = v.cls.len * 0.5f + 4.5f;
                if (gap < minGap) target = 0f;
                else if (gap < minGap + 10f) target = Mathf.Min(target, aheadSpeed * 0.95f);
                v.speed = Mathf.MoveTowards(v.speed, target, (target < v.speed ? 12f : v.cls.accel * 0.6f) * dt);
                v.along += v.dir * v.speed * dt;
                if (v.dir > 0 && v.along > v.road.to - 4f) v.along = v.road.from + 4f;
                if (v.dir < 0 && v.along < v.road.from + 4f) v.along = v.road.to - 4f;
                if (v.wheels != null) foreach (var w in v.wheels) w.Rotate(Vector3.up, v.speed * dt * 120f, Space.Self);
                Place(v);
            }
        }

        float LaneOffset(Vehicle v) => v.road.width * (0.25f + 0.17f * v.lane);
        // Right-hand traffic: the lane is on the right of the direction of travel. In data units the sign of
        // "right" depends on the axis and direction; derive it from the world right vector.
        float LaneOffsetSign(Vehicle v)
        {
            var right = Vector3.Cross(Vector3.up, v.road.Forward(v.dir));
            return v.road.Horizontal ? -right.z : right.x;   // data across for h roads is -world z; for v roads it is world x
        }

        void Place(Vehicle v)
        {
            var r = v.road;
            var fwd = r.Forward(v.dir);
            var right = Vector3.Cross(Vector3.up, fwd);
            var p = r.Point(v.along, r.k) + right * LaneOffset(v);
            p.y = data.DeckHeightAt(p) + 0.11f;
            v.t.position = p;
            v.t.rotation = Quaternion.LookRotation(fwd, Vector3.up);
        }
    }
}
