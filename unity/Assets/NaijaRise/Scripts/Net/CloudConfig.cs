using UnityEngine;

namespace NaijaRise.Net
{
    // Backend settings: Resources/cloud.json with the Supabase project URL and anon key. Absent → the game runs offline
    // (local save only, no accounts, no other players), exactly as before. The anon key is public by design; row-level
    // security in supabase/schema.sql keeps every player to their own rows.
    [System.Serializable]
    public class CloudConfig
    {
        public string url = "", anonKey = "";
        public bool Enabled => !string.IsNullOrEmpty(url) && !string.IsNullOrEmpty(anonKey);
        public string RealtimeUrl => url.Replace("https://", "wss://").Replace("http://", "ws://") + "/realtime/v1/websocket?apikey=" + anonKey + "&vsn=1.0.0";

        public static CloudConfig Load()
        {
            var text = Resources.Load<TextAsset>("cloud");
            if (text == null) return new CloudConfig();
            try { return JsonUtility.FromJson<CloudConfig>(text.text) ?? new CloudConfig(); }
            catch { return new CloudConfig(); }
        }
    }
}
