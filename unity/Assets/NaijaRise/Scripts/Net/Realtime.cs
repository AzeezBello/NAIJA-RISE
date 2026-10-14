using System;
using System.Collections.Generic;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using UnityEngine;

namespace NaijaRise.Net
{
    // A room transport: join a room, send a JSON message to everyone else in it, receive theirs.
    public interface IRealtimeTransport
    {
        bool Connected { get; }
        void Join(string room, string selfId);
        void Send(string eventName, string json);
        void Leave();
        void Poll(Action<string, string, string> onMessage);   // (fromId, eventName, json), called on the main thread
    }

    // In-process bus: every LoopbackTransport in the same room sees the others' messages. Used by the headless tests and
    // as a "local play" mode; it exercises the whole multiplayer path without a server.
    public class LoopbackTransport : IRealtimeTransport
    {
        static readonly Dictionary<string, List<LoopbackTransport>> rooms = new Dictionary<string, List<LoopbackTransport>>();
        readonly Queue<(string, string, string)> inbox = new Queue<(string, string, string)>();
        string room, self;
        public bool Connected => room != null;
        public void Join(string r, string selfId) { Leave(); room = r; self = selfId; if (!rooms.TryGetValue(r, out var l)) rooms[r] = l = new List<LoopbackTransport>(); l.Add(this); }
        public void Send(string eventName, string json) { if (room == null || !rooms.TryGetValue(room, out var l)) return; foreach (var t in l) if (t != this) t.inbox.Enqueue((self, eventName, json)); }
        // Leaving drops anything still queued: messages from the room you left must not surface in the next one.
        public void Leave() { if (room != null && rooms.TryGetValue(room, out var l)) l.Remove(this); room = null; inbox.Clear(); }
        public void Poll(Action<string, string, string> onMessage) { while (inbox.Count > 0) { var (f, e, j) = inbox.Dequeue(); onMessage(f, e, j); } }
        public static int InRoom(string r) => rooms.TryGetValue(r, out var l) ? l.Count : 0;
    }

    // Supabase Realtime (Phoenix channels over WebSocket): one channel per district, broadcast for positions and chat.
    // Messages are parsed on a background task and queued for the main thread.
    public class SupabaseRealtimeTransport : IRealtimeTransport
    {
        readonly string url; ClientWebSocket ws; CancellationTokenSource cts; string topic, self; int refCounter;
        readonly System.Collections.Concurrent.ConcurrentQueue<(string, string, string)> inbox = new System.Collections.Concurrent.ConcurrentQueue<(string, string, string)>();
        float lastHeartbeat;
        public bool Connected => ws != null && ws.State == WebSocketState.Open;
        public string Error { get; private set; } = "";

        public SupabaseRealtimeTransport(string websocketUrl) { url = websocketUrl; }

        public void Join(string room, string selfId)
        {
            Leave(); topic = "realtime:" + room; self = selfId; cts = new CancellationTokenSource();
            _ = Run();
        }

        async Task Run()
        {
            try
            {
                ws = new ClientWebSocket();
                await ws.ConnectAsync(new Uri(url), cts.Token);
                await SendRaw($"{{\"topic\":\"{topic}\",\"event\":\"phx_join\",\"payload\":{{\"config\":{{\"broadcast\":{{\"self\":false,\"ack\":false}},\"presence\":{{\"key\":\"{self}\"}}}}}},\"ref\":\"{++refCounter}\"}}");
                var buffer = new byte[64 * 1024]; var sb = new StringBuilder();
                while (ws.State == WebSocketState.Open && !cts.IsCancellationRequested)
                {
                    var result = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), cts.Token);
                    if (result.MessageType == WebSocketMessageType.Close) break;
                    sb.Append(Encoding.UTF8.GetString(buffer, 0, result.Count));
                    if (!result.EndOfMessage) continue;
                    Parse(sb.ToString()); sb.Clear();
                }
            }
            catch (Exception e) { Error = e.Message; }
        }

        // Minimal parse of the envelope: {"event":"broadcast","payload":{"event":"pos","payload":{...}}} — the inner
        // payload carries "from" so we never need a full JSON parser here.
        void Parse(string msg)
        {
            if (!msg.Contains("\"event\":\"broadcast\"")) return;
            string inner = Extract(msg, "\"event\":\"", "\"", msg.IndexOf("\"payload\":", StringComparison.Ordinal));
            int p = msg.IndexOf("\"payload\":{", msg.IndexOf("\"payload\":{", StringComparison.Ordinal) + 10, StringComparison.Ordinal);
            if (p < 0) return;
            string json = Balanced(msg, p + 10);
            string from = Extract(json, "\"from\":\"", "\"", 0);
            if (!string.IsNullOrEmpty(inner) && from != self) inbox.Enqueue((from, inner, json));
        }

        static string Extract(string s, string start, string end, int from) { int a = s.IndexOf(start, Math.Max(0, from), StringComparison.Ordinal); if (a < 0) return ""; a += start.Length; int b = s.IndexOf(end, a, StringComparison.Ordinal); return b < 0 ? "" : s.Substring(a, b - a); }
        static string Balanced(string s, int open) { int depth = 0; for (int i = open; i < s.Length; i++) { if (s[i] == '{') depth++; else if (s[i] == '}') { depth--; if (depth == 0) return s.Substring(open, i - open + 1); } } return s.Substring(open); }

        async Task SendRaw(string text) { if (ws == null || ws.State != WebSocketState.Open) return; var bytes = Encoding.UTF8.GetBytes(text); await ws.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, cts.Token); }

        public void Send(string eventName, string json)
        {
            if (!Connected) return;
            _ = SendRaw($"{{\"topic\":\"{topic}\",\"event\":\"broadcast\",\"payload\":{{\"type\":\"broadcast\",\"event\":\"{eventName}\",\"payload\":{json}}},\"ref\":\"{++refCounter}\"}}");
        }

        public void Leave() { try { cts?.Cancel(); ws?.Dispose(); } catch { } ws = null; while (inbox.TryDequeue(out _)) { } }   // drop stale messages from the old channel

        public void Poll(Action<string, string, string> onMessage)
        {
            if (Connected && Time.unscaledTime - lastHeartbeat > 25f) { lastHeartbeat = Time.unscaledTime; _ = SendRaw($"{{\"topic\":\"phoenix\",\"event\":\"heartbeat\",\"payload\":{{}},\"ref\":\"{++refCounter}\"}}"); }
            while (inbox.TryDequeue(out var m)) onMessage(m.Item1, m.Item2, m.Item3);
        }
    }
}
