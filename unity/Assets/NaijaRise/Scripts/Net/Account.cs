using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace NaijaRise.Net
{
    // Accounts through Supabase Auth (email + password): sign up, sign in, refresh, sign out. The session (tokens and
    // user id) is kept in PlayerPrefs so the game resumes signed in. Offline when there is no cloud.json.
    public class Account : MonoBehaviour
    {
        [Serializable] class TokenResponse { public string access_token, refresh_token, token_type; public int expires_in; public AuthUser user; }
        [Serializable] class AuthUser { public string id, email; }
        [Serializable] class AuthError { public string msg, error_description, message; }

        public CloudConfig Config { get; private set; }
        public string AccessToken { get; private set; } = "";
        public string RefreshToken { get; private set; } = "";
        public string UserId { get; private set; } = "";
        public string Email { get; private set; } = "";
        public string Status { get; private set; } = "offline";
        public bool Online => Config != null && Config.Enabled;
        public bool SignedIn => Online && !string.IsNullOrEmpty(AccessToken) && !string.IsNullOrEmpty(UserId);
        public event Action OnChanged;

        public void Init(CloudConfig config)
        {
            Config = config;
            if (!Online) { Status = "offline (no cloud.json)"; return; }
            AccessToken = PlayerPrefs.GetString("nr.access", ""); RefreshToken = PlayerPrefs.GetString("nr.refresh", ""); UserId = PlayerPrefs.GetString("nr.user", ""); Email = PlayerPrefs.GetString("nr.email", "");
            Status = SignedIn ? $"signed in as {Email}" : "signed out";
            if (!string.IsNullOrEmpty(RefreshToken)) StartCoroutine(Refresh());
        }

        public void SignUp(string email, string password, Action<bool, string> done) => StartCoroutine(Post("/auth/v1/signup", $"{{\"email\":\"{Escape(email)}\",\"password\":\"{Escape(password)}\"}}", done, true));
        public void SignIn(string email, string password, Action<bool, string> done) => StartCoroutine(Post("/auth/v1/token?grant_type=password", $"{{\"email\":\"{Escape(email)}\",\"password\":\"{Escape(password)}\"}}", done, true));
        IEnumerator Refresh() { yield return Post("/auth/v1/token?grant_type=refresh_token", $"{{\"refresh_token\":\"{Escape(RefreshToken)}\"}}", null, true); }

        public void SignOut()
        {
            if (SignedIn) StartCoroutine(Post("/auth/v1/logout", "{}", null, false));
            AccessToken = RefreshToken = UserId = Email = "";
            PlayerPrefs.DeleteKey("nr.access"); PlayerPrefs.DeleteKey("nr.refresh"); PlayerPrefs.DeleteKey("nr.user"); PlayerPrefs.DeleteKey("nr.email");
            Status = "signed out"; OnChanged?.Invoke();
        }

        IEnumerator Post(string path, string body, Action<bool, string> done, bool expectSession)
        {
            if (!Online) { done?.Invoke(false, "offline"); yield break; }
            using var req = new UnityWebRequest(Config.url + path, "POST");
            req.uploadHandler = new UploadHandlerRaw(System.Text.Encoding.UTF8.GetBytes(body)); req.downloadHandler = new DownloadHandlerBuffer();
            req.SetRequestHeader("Content-Type", "application/json"); req.SetRequestHeader("apikey", Config.anonKey);
            if (!string.IsNullOrEmpty(AccessToken)) req.SetRequestHeader("Authorization", "Bearer " + AccessToken);
            yield return req.SendWebRequest();
            if (req.result != UnityWebRequest.Result.Success)
            {
                string msg = req.error; try { var e = JsonUtility.FromJson<AuthError>(req.downloadHandler.text); msg = e?.msg ?? e?.error_description ?? e?.message ?? msg; } catch { }
                Status = "error: " + msg; OnChanged?.Invoke(); done?.Invoke(false, msg); yield break;
            }
            if (expectSession)
            {
                var t = JsonUtility.FromJson<TokenResponse>(req.downloadHandler.text);
                if (t != null && !string.IsNullOrEmpty(t.access_token))
                {
                    AccessToken = t.access_token; RefreshToken = t.refresh_token ?? RefreshToken; UserId = t.user?.id ?? UserId; Email = t.user?.email ?? Email;
                    PlayerPrefs.SetString("nr.access", AccessToken); PlayerPrefs.SetString("nr.refresh", RefreshToken); PlayerPrefs.SetString("nr.user", UserId); PlayerPrefs.SetString("nr.email", Email); PlayerPrefs.Save();
                    Status = $"signed in as {Email}";
                }
                else Status = "check your email to confirm the account";   // sign-up with confirmation on returns no session
            }
            OnChanged?.Invoke(); done?.Invoke(true, Status);
        }

        public static string Escape(string s) => (s ?? "").Replace("\\", "\\\\").Replace("\"", "\\\"");
    }
}
