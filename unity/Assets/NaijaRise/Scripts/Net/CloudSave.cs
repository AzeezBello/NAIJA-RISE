using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace NaijaRise.Net
{
    // Server-side save (PRD §27 `saves`): the whole SaveData blob upserted to Supabase for the signed-in player, pulled
    // on sign-in. The local file stays the offline fallback and the newest `lastSeen` wins when both exist.
    public class CloudSave : MonoBehaviour
    {
        [Serializable] class Row { public string user_id, slot, state, updated_at; }
        [Serializable] class Rows { public Row[] items; }

        Account account; public string Status { get; private set; } = "local only";
        public DateTime LastPush { get; private set; }
        public bool Busy { get; private set; }

        public void Init(Account acc) { account = acc; }

        public void Push(SaveData save, Action<bool> done = null)
        {
            if (account == null || !account.SignedIn || Busy) { done?.Invoke(false); return; }
            StartCoroutine(PushRoutine(save, done));
        }

        IEnumerator PushRoutine(SaveData save, Action<bool> done)
        {
            Busy = true;
            string state = Account.Escape(JsonUtility.ToJson(save));
            string body = $"[{{\"user_id\":\"{account.UserId}\",\"slot\":\"main\",\"state\":\"{state}\",\"updated_at\":\"{DateTime.UtcNow:o}\"}}]";
            using var req = new UnityWebRequest(account.Config.url + "/rest/v1/saves?on_conflict=user_id,slot", "POST");
            req.uploadHandler = new UploadHandlerRaw(System.Text.Encoding.UTF8.GetBytes(body)); req.downloadHandler = new DownloadHandlerBuffer();
            req.SetRequestHeader("Content-Type", "application/json"); req.SetRequestHeader("apikey", account.Config.anonKey); req.SetRequestHeader("Authorization", "Bearer " + account.AccessToken);
            req.SetRequestHeader("Prefer", "resolution=merge-duplicates,return=minimal");
            yield return req.SendWebRequest();
            Busy = false;
            bool ok = req.result == UnityWebRequest.Result.Success;
            Status = ok ? $"saved to the cloud {DateTime.Now:HH:mm}" : "cloud save failed: " + req.error;
            if (ok) LastPush = DateTime.UtcNow;
            done?.Invoke(ok);
        }

        public void Pull(Action<SaveData> done)
        {
            if (account == null || !account.SignedIn) { done?.Invoke(null); return; }
            StartCoroutine(PullRoutine(done));
        }

        IEnumerator PullRoutine(Action<SaveData> done)
        {
            using var req = UnityWebRequest.Get(account.Config.url + $"/rest/v1/saves?select=state,updated_at&user_id=eq.{account.UserId}&slot=eq.main");
            req.SetRequestHeader("apikey", account.Config.anonKey); req.SetRequestHeader("Authorization", "Bearer " + account.AccessToken);
            yield return req.SendWebRequest();
            if (req.result != UnityWebRequest.Result.Success) { Status = "cloud load failed: " + req.error; done?.Invoke(null); yield break; }
            var rows = JsonUtility.FromJson<Rows>("{\"items\":" + req.downloadHandler.text + "}");
            if (rows?.items == null || rows.items.Length == 0) { Status = "no cloud save yet"; done?.Invoke(null); yield break; }
            try { var save = JsonUtility.FromJson<SaveData>(rows.items[0].state); Status = "cloud save loaded"; done?.Invoke(save); }
            catch (Exception e) { Status = "cloud save unreadable: " + e.Message; done?.Invoke(null); }
        }

        // Newest lastSeen wins.
        public static SaveData Newer(SaveData local, SaveData cloud)
        {
            if (cloud == null) return local; if (local == null) return cloud;
            DateTime.TryParse(local.lastSeen ?? "", null, System.Globalization.DateTimeStyles.RoundtripKind, out var l);
            DateTime.TryParse(cloud.lastSeen ?? "", null, System.Globalization.DateTimeStyles.RoundtripKind, out var c);
            return c > l ? cloud : local;
        }
    }
}
