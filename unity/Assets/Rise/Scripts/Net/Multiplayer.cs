using System;
using System.Collections.Generic;
using UnityEngine;
using Rise.Data;
using Rise.Entities;

namespace Rise.Net
{
    // Basic multiplayer (PLAN Phase 5): a room per district; your position, heading, vehicle and look go out at 10 Hz,
    // other players appear as the same rigged characters (or their vehicle class) with a name label, interpolated;
    // chat lines float over the HUD. The transport is Supabase Realtime, or the loopback bus when offline / in tests.
    public class Multiplayer : MonoBehaviour
    {
        [Serializable] public class PosMsg { public string from, name; public float x, y, z, yaw; public string vehicle = ""; public int fabric, skin, body; public bool swimming; }
        [Serializable] public class ChatMsg { public string from, name, text; }
        public class Remote { public string id, name; public Transform t; public RigInstance rig; public Vector3 target; public float yaw; public float lastSeen; public string vehicle; public Transform vehicleBody; }

        public IRealtimeTransport Transport { get; private set; }
        public string Room { get; private set; } = "";
        public string SelfId { get; private set; } = "";
        public string DisplayName = "Tunde";
        [System.NonSerialized] public readonly Dictionary<string, Remote> Remotes = new Dictionary<string, Remote>();
        [System.NonSerialized] public readonly List<(string name, string text, float until)> Chat = new List<(string, string, float)>();
        public int Sent { get; private set; }
        public string Status => Transport == null ? "offline" : Transport.Connected ? $"{Room} · {Remotes.Count} other{(Remotes.Count == 1 ? "" : "s")}" : "connecting…";

        WorldData data; Transform follow; Func<PosMsg> state; Transform root; float sendT; float roomT;
        [System.NonSerialized] public Func<Vector3, string> RoomFor;   // world position → room id (district)

        public void Init(WorldData world, IRealtimeTransport transport, string selfId, Transform followTransform, Func<PosMsg> stateProvider, Transform parent)
        {
            data = world; Transport = transport; SelfId = selfId; follow = followTransform; state = stateProvider;
            root = new GameObject("Other players").transform; root.SetParent(parent, false);
            RoomFor ??= pos => "district:" + (data.RegionAt(pos)?.id ?? "lagos");
        }

        public void SendChat(string text)
        {
            if (Transport == null || string.IsNullOrWhiteSpace(text)) return;
            var m = new ChatMsg { from = SelfId, name = DisplayName, text = text.Trim() };
            Transport.Send("chat", JsonUtility.ToJson(m));
            Chat.Add((DisplayName, m.text, Time.time + 12f));
        }

        // Test hook: run the per-frame work now.
        public void Tick(float dt) => Step(dt);

        void Update() => Step(Time.deltaTime);

        void Step(float dt)
        {
            if (Transport == null || follow == null) return;
            roomT -= dt;
            if (roomT <= 0f)
            {
                roomT = 1f; string room = RoomFor(follow.position);
                if (room != Room) { Room = room; Transport.Join(Room, SelfId); foreach (var r in Remotes.Values) Destroy(r.t.gameObject); Remotes.Clear(); }
            }
            sendT -= dt;
            if (sendT <= 0f && Transport.Connected) { sendT = 0.1f; var p = state(); p.from = SelfId; p.name = DisplayName; Transport.Send("pos", JsonUtility.ToJson(p)); Sent++; }
            Transport.Poll(OnMessage);
            var gone = new List<string>();
            foreach (var r in Remotes.Values)
            {
                float speed = (r.target - r.t.position).magnitude / Mathf.Max(dt, 0.001f);
                r.t.position = Vector3.Lerp(r.t.position, r.target, 1f - Mathf.Exp(-10f * dt));
                r.t.rotation = Quaternion.Slerp(r.t.rotation, Quaternion.Euler(0f, r.yaw, 0f), 1f - Mathf.Exp(-10f * dt));
                r.rig?.SetState(speed < 0.3f ? "idle" : speed > 5.5f ? "run" : "walk", speed > 5.5f ? speed / CharacterRig.RunClipSpeed : speed / CharacterRig.WalkClipSpeed);
                if (Time.time - r.lastSeen > 5f) gone.Add(r.id);
            }
            foreach (var id in gone) { Destroy(Remotes[id].t.gameObject); Remotes.Remove(id); }
            Chat.RemoveAll(c => c.until < Time.time);
        }

        void OnMessage(string from, string eventName, string json)
        {
            if (from == SelfId) return;
            if (eventName == "chat") { var c = JsonUtility.FromJson<ChatMsg>(json); if (c != null) Chat.Add((c.name, c.text, Time.time + 12f)); return; }
            if (eventName != "pos") return;
            var p = JsonUtility.FromJson<PosMsg>(json); if (p == null) return;
            if (!Remotes.TryGetValue(from, out var r))
            {
                var go = new GameObject("Player " + p.name); go.transform.SetParent(root, false); go.transform.position = new Vector3(p.x, p.y, p.z);
                r = new Remote { id = from, name = p.name, t = go.transform, target = go.transform.position };
                var look = Look.Default; look.Fabric = p.fabric; look.BodyType = p.body;
                if (data.skins.Length > 0) look.Skin = Mannequin.Hex(data.skins[Mathf.Clamp(p.skin, 0, data.skins.Length - 1)]);
                if (CharacterRig.Available) r.rig = CharacterRig.Build(go.transform, look); else Mannequin.Build(go.transform, Mannequin.Hex("#e07b1a"), look.Pants, look.Skin, look.Cap);
                Mannequin.Label(go.transform, p.name, new Color(0.36f, 0.8f, 1f));
                Remotes[from] = r;
            }
            r.target = new Vector3(p.x, p.y, p.z); r.yaw = p.yaw; r.lastSeen = Time.time; r.name = p.name;
            if (p.vehicle != r.vehicle)
            {
                r.vehicle = p.vehicle;
                if (r.vehicleBody != null) { Destroy(r.vehicleBody.gameObject); r.vehicleBody = null; }
                bool driving = !string.IsNullOrEmpty(p.vehicle);
                if (r.rig != null) r.rig.Root.SetActive(!driving);
                if (driving) { var cls = data.VehicleClass(p.vehicle); if (cls != null) { var body = Vehicles.VehicleBodies.Build(cls, r.t, new System.Random(from.GetHashCode()), out _); foreach (var c in body.GetComponentsInChildren<Collider>()) Destroy(c); r.vehicleBody = body.transform; } }
            }
        }

        void OnDestroy() { Transport?.Leave(); }
    }
}
