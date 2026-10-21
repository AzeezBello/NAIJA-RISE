using System;
using System.Collections;
using System.Globalization;
using System.Text.RegularExpressions;
using UnityEngine;
using UnityEngine.Networking;
using Rise.Data;
using Rise.Story;

namespace Rise.Net
{
    // Live Economy & Rewards override (PLAN Phase 6): pulls job payouts, mission rewards, and economy constants from
    // Supabase (`economy_config` table or `game-config/economy.json` storage bucket) on boot and periodically during
    // active sessions so `/admin` edits propagate to running game sessions without rebuilding or restarting the client.
    public class CloudEconomy : MonoBehaviour
    {
        public string Status { get; private set; } = "default";
        public int AppliedOverrides { get; private set; }
        public string LastUpdatedAt { get; private set; } = "";
        public float PollIntervalSeconds = 45f;
        public Action<int> OnLiveUpdate;

        CloudConfig activeConfig;
        WorldData activeData;
        bool initialSyncDone;

        public void Init(CloudConfig config, WorldData data)
        {
            activeConfig = config;
            activeData = data;
            if (config == null || !config.Enabled || data == null) return;
            StartCoroutine(LivePollLoop());
        }

        public void RefreshNow()
        {
            if (activeConfig == null || !activeConfig.Enabled || activeData == null) return;
            StartCoroutine(FetchRoutine(activeConfig, activeData));
        }

        IEnumerator LivePollLoop()
        {
            while (activeConfig != null && activeConfig.Enabled && activeData != null)
            {
                yield return FetchRoutine(activeConfig, activeData);
                yield return new WaitForSecondsRealtime(Mathf.Max(15f, PollIntervalSeconds));
            }
        }

        IEnumerator FetchRoutine(CloudConfig config, WorldData data)
        {
            // 1. Try public.economy_config table via PostgREST
            using (var req = UnityWebRequest.Get(config.url + "/rest/v1/economy_config?id=eq.default&select=constants,job_payouts,mission_rewards,updated_at"))
            {
                req.SetRequestHeader("apikey", config.anonKey);
                req.SetRequestHeader("Cache-Control", "no-cache");
                yield return req.SendWebRequest();
                if (req.result == UnityWebRequest.Result.Success && !string.IsNullOrEmpty(req.downloadHandler.text) && req.downloadHandler.text.Contains("constants"))
                {
                    if (ApplyAndTrack(data, req.downloadHandler.text, "synced (table)"))
                        yield break;
                }
            }

            // 2. Fallback to public Supabase Storage bucket `game-config/economy.json`
            using (var req = UnityWebRequest.Get(config.url + "/storage/v1/object/public/game-config/economy.json?t=" + DateTimeOffset.UtcNow.ToUnixTimeSeconds()))
            {
                req.SetRequestHeader("Cache-Control", "no-cache");
                yield return req.SendWebRequest();
                if (req.result == UnityWebRequest.Result.Success && !string.IsNullOrEmpty(req.downloadHandler.text))
                {
                    ApplyAndTrack(data, req.downloadHandler.text, "synced (storage)");
                }
            }
        }

        bool ApplyAndTrack(WorldData data, string json, string statusLabel)
        {
            string stamp = ExtractString(json, "updated_at");
            int n = ApplyJson(data, json);
            if (n <= 0) return false;
            AppliedOverrides = n;
            Status = statusLabel;
            bool changed = !string.IsNullOrEmpty(stamp) && stamp != LastUpdatedAt;
            if (!string.IsNullOrEmpty(stamp)) LastUpdatedAt = stamp;
            if (initialSyncDone && changed)
                OnLiveUpdate?.Invoke(n);
            initialSyncDone = true;
            return true;
        }

        static string ExtractString(string json, string key)
        {
            if (string.IsNullOrEmpty(json)) return "";
            var m = Regex.Match(json, "\"" + Regex.Escape(key) + "\"\\s*:\\s*\"([^\"]+)\"");
            return m.Success ? m.Groups[1].Value : "";
        }

        // Parses a JSON payload containing { constants: {...}, job_payouts: {...}, mission_rewards: {...} }
        // and applies the values to WorldData and Story.Missions in memory. Returns the number of applied fields.
        public static int ApplyJson(WorldData data, string json)
        {
            if (data == null || string.IsNullOrEmpty(json)) return 0;
            int count = 0;

            string constantsBlock = ExtractObject(json, "constants");
            if (!string.IsNullOrEmpty(constantsBlock) && data.meta != null)
            {
                if (TryInt(constantsBlock, "priceWater", out int v)) { data.meta.priceWater = v; count++; }
                if (TryInt(constantsBlock, "priceSuya", out v)) { data.meta.priceSuya = v; count++; }
                if (TryInt(constantsBlock, "posFee", out v)) { data.meta.posFee = v; count++; }
                if (TryInt(constantsBlock, "posAmount", out v)) { data.meta.posAmount = v; count++; }
                if (TryInt(constantsBlock, "refuel", out v)) { data.meta.refuel = v; count++; }
                if (TryInt(constantsBlock, "fineRate", out v)) { data.meta.fineRate = v; count++; }
                if (TryInt(constantsBlock, "bustRate", out v)) { data.meta.bustRate = v; count++; }
                if (TryInt(constantsBlock, "speedTicket", out v)) { data.meta.speedTicket = v; count++; }
                if (TryFloat(constantsBlock, "payCycle", out float f) && f > 1f) { data.meta.payCycle = f; count++; }
                if (TryInt(constantsBlock, "raceWager", out v)) { data.raceWager = v; count++; }
            }

            string jobsBlock = ExtractObject(json, "job_payouts");
            if (!string.IsNullOrEmpty(jobsBlock) && data.jobs != null)
            {
                foreach (var j in data.jobs)
                {
                    if (j != null && TryInt(jobsBlock, j.id, out int pay) && pay >= 0)
                    {
                        j.pay = pay;
                        count++;
                    }
                }
            }

            string missionsBlock = ExtractObject(json, "mission_rewards");
            if (!string.IsNullOrEmpty(missionsBlock))
            {
                foreach (Match m in Regex.Matches(missionsBlock, "\"([a-zA-Z0-9_\\-]+)\"\\s*:\\s*([0-9]+)"))
                {
                    if (int.TryParse(m.Groups[2].Value, NumberStyles.Integer, CultureInfo.InvariantCulture, out int reward))
                    {
                        Missions.SetReward(m.Groups[1].Value, reward);
                        count++;
                    }
                }
            }

            return count;
        }

        static string ExtractObject(string json, string key)
        {
            string needle = "\"" + key + "\"";
            int idx = json.IndexOf(needle, StringComparison.Ordinal);
            if (idx < 0) return "";
            int open = json.IndexOf('{', idx + needle.Length);
            if (open < 0) return "";
            int depth = 0;
            for (int i = open; i < json.Length; i++)
            {
                if (json[i] == '{') depth++;
                else if (json[i] == '}')
                {
                    depth--;
                    if (depth == 0) return json.Substring(open, i - open + 1);
                }
            }
            return "";
        }

        static bool TryInt(string block, string key, out int value)
        {
            value = 0;
            var m = Regex.Match(block, "\"" + Regex.Escape(key) + "\"\\s*:\\s*([0-9]+)");
            return m.Success && int.TryParse(m.Groups[1].Value, NumberStyles.Integer, CultureInfo.InvariantCulture, out value);
        }

        static bool TryFloat(string block, string key, out float value)
        {
            value = 0f;
            var m = Regex.Match(block, "\"" + Regex.Escape(key) + "\"\\s*:\\s*([0-9]+(?:\\.[0-9]+)?)");
            return m.Success && float.TryParse(m.Groups[1].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out value);
        }

        // State-level commodity price multipliers for interstate trade & supply-chain arbitrage (Section 5.4).
        public static float GetStateCommodityMultiplier(string stateId, string commodity)
        {
            string st = string.IsNullOrEmpty(stateId) ? "lagos" : stateId.ToLowerInvariant();
            string c = string.IsNullOrEmpty(commodity) ? "produce" : commodity.ToLowerInvariant();
            switch (st)
            {
                case "ogun":
                    return c == "produce" ? 0.88f : c == "electronics" ? 1.05f : c == "fuel" ? 0.98f : 0.90f;
                case "oyo":
                    return c == "produce" ? 0.82f : c == "electronics" ? 1.08f : c == "fuel" ? 1.02f : 0.85f;
                case "fct":
                    return c == "produce" ? 1.15f : c == "electronics" ? 1.12f : c == "fuel" ? 1.08f : 1.45f;
                case "rivers":
                    return c == "produce" ? 1.10f : c == "electronics" ? 1.06f : c == "fuel" ? 0.75f : 1.18f;
                case "anambra":
                    return c == "produce" ? 0.95f : c == "electronics" ? 0.78f : c == "fuel" ? 1.04f : 1.10f;
                case "kano":
                    return c == "produce" ? 0.72f : c == "electronics" ? 1.14f : c == "fuel" ? 1.12f : 0.95f;
                default: // lagos
                    return c == "produce" ? 1.00f : c == "electronics" ? 0.92f : c == "fuel" ? 0.95f : 1.25f;
            }
        }
    }
}
