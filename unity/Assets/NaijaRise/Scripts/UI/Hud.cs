using UnityEngine;
using NaijaRise.Data;
using NaijaRise.Player;
using NaijaRise.World;

namespace NaijaRise.UI
{
    // The Lagos Experience HUD: brand, district and street top-left; clock and day top-right; minimap bottom-left;
    // money, level and XP bottom-right; health and stamina bars with the interaction prompt bottom-centre; toasts;
    // dialogue and shift overlays; speed and fuel while driving. IMGUI so the slice has no UI package dependency.
    public class Hud : MonoBehaviour
    {
        WorldData data; DayNightCycle clock; Session session; Minimap minimap;
        GUIStyle brand, title, body, small, prompt, cardStyle, barBg;
        Texture2D cardTex, white;
        float hintUntil;

        public void Init(WorldData world, DayNightCycle dayNight, Session s, Minimap map)
        {
            data = world; clock = dayNight; session = s; minimap = map; hintUntil = Time.time + 25f;
        }

        void EnsureStyles()
        {
            if (brand != null) return;
            float s = Scale;
            cardTex = new Texture2D(1, 1); cardTex.SetPixel(0, 0, new Color(0.04f, 0.05f, 0.08f, 0.66f)); cardTex.Apply();
            white = new Texture2D(1, 1); white.SetPixel(0, 0, Color.white); white.Apply();
            cardStyle = new GUIStyle(GUI.skin.box) { normal = { background = cardTex }, padding = new RectOffset((int)(14 * s), (int)(14 * s), (int)(10 * s), (int)(10 * s)) };
            barBg = new GUIStyle(GUI.skin.box) { normal = { background = cardTex }, padding = new RectOffset(0, 0, 0, 0), margin = new RectOffset(0, 0, 0, 0) };
            brand = new GUIStyle(GUI.skin.label) { fontSize = (int)(22 * s), fontStyle = FontStyle.Bold, normal = { textColor = new Color(0.96f, 0.77f, 0.09f) } };
            title = new GUIStyle(GUI.skin.label) { fontSize = (int)(17 * s), fontStyle = FontStyle.Bold, normal = { textColor = Color.white } };
            body = new GUIStyle(GUI.skin.label) { fontSize = (int)(14 * s), normal = { textColor = new Color(0.9f, 0.9f, 0.92f) }, wordWrap = true };
            small = new GUIStyle(GUI.skin.label) { fontSize = (int)(12 * s), normal = { textColor = new Color(0.75f, 0.77f, 0.8f) }, alignment = TextAnchor.MiddleCenter };
            prompt = new GUIStyle(GUI.skin.label) { fontSize = (int)(18 * s), fontStyle = FontStyle.Bold, normal = { textColor = new Color(0.96f, 0.77f, 0.09f) }, alignment = TextAnchor.MiddleCenter };
        }

        float Scale => Mathf.Max(0.8f, Screen.height / 720f);

        void Bar(Rect r, float t, Color c)
        {
            GUI.Box(r, GUIContent.none, barBg);
            var old = GUI.color; GUI.color = c;
            GUI.DrawTexture(new Rect(r.x + 2, r.y + 2, (r.width - 4) * Mathf.Clamp01(t), r.height - 4), white);
            GUI.color = old;
        }

        void OnGUI()
        {
            if (data == null || session == null) return;
            EnsureStyles();
            float s = Scale, W = Screen.width, H = Screen.height;
            var st = session.State.S;
            var focus = session.Vehicle != null ? session.Vehicle.transform : session.Player.transform;
            var pos = focus.position;
            var region = data.RegionAt(pos);
            var road = data.RoadAt(pos, 9f);
            string street = road != null ? data.RoadNameAt(road, road.Along(pos)) : null;
            data.DeckHeightAt(pos, out var bridge);
            if (bridge != null) street = bridge.name;

            // Top-left: brand, district, street.
            GUILayout.BeginArea(new Rect(18 * s, 16 * s, 420 * s, 130 * s), cardStyle);
            GUILayout.Label("NAIJA RISE", brand);
            GUILayout.Label(region != null ? region.name : data.meta.name, title);
            if (!string.IsNullOrEmpty(street)) GUILayout.Label(street, body);
            GUILayout.EndArea();

            // Top-right: clock, day, heat.
            GUILayout.BeginArea(new Rect(W - 238 * s, 16 * s, 220 * s, 96 * s), cardStyle);
            GUILayout.Label($"{clock.ClockText}  {(clock.IsNight ? "NIGHT" : "DAY")}", title);
            GUILayout.Label($"Day {clock.Day}" + (st.heat > 0 ? $"   HEAT {new string('★', st.heat)}{new string('☆', 5 - st.heat)}" : ""), body);
            GUILayout.EndArea();

            // Bottom-left: minimap.
            if (minimap != null && minimap.Texture != null)
            {
                float m = 190 * s; var r = new Rect(18 * s, H - m - 18 * s, m, m);
                GUI.Box(new Rect(r.x - 4, r.y - 4, r.width + 8, r.height + 8), GUIContent.none, barBg);
                GUI.DrawTexture(r, minimap.Texture, ScaleMode.StretchToFill);
                var old = GUI.color; GUI.color = new Color(0.96f, 0.77f, 0.09f);
                GUI.DrawTexture(new Rect(r.center.x - 4 * s, r.center.y - 4 * s, 8 * s, 8 * s), white);
                GUI.color = old;
                GUI.Label(new Rect(r.x, r.y - 24 * s, r.width, 22 * s), "N ▲", small);
            }

            // Bottom-right: money, level, XP (and speed / fuel while driving).
            GUILayout.BeginArea(new Rect(W - 318 * s, H - 150 * s, 300 * s, 134 * s), cardStyle);
            GUILayout.Label($"₦{st.cash:N0} cash", title);
            GUILayout.Label($"₦{st.bank:N0} RiseBank  ·  Level {st.level} {session.State.Title}", body);
            var xpRect = GUILayoutUtility.GetRect(260 * s, 8 * s); Bar(xpRect, st.xp / 100f, new Color(0.96f, 0.77f, 0.09f));
            if (session.Vehicle != null) GUILayout.Label($"{session.Vehicle.Kmh:0} km/h  ·  fuel {st.fuel:0}%  ·  condition {session.Vehicle.Condition:0}%", body);
            GUILayout.EndArea();

            // Bottom-centre: health, stamina, prompt or hint.
            float cw = 420 * s, cx = W * 0.5f - cw * 0.5f;
            Bar(new Rect(cx, H - 86 * s, cw * 0.49f, 10 * s), st.health / 100f, new Color(0.85f, 0.2f, 0.2f));
            Bar(new Rect(cx + cw * 0.51f, H - 86 * s, cw * 0.49f, 10 * s), st.stamina / 100f, new Color(0.25f, 0.75f, 0.95f));
            if (!string.IsNullOrEmpty(session.Prompt) && session.Dialogue == null && session.Working == null)
                GUI.Label(new Rect(cx, H - 70 * s, cw, 40 * s), $"[E]  {session.Prompt}", prompt);
            else if (Time.time < hintUntil && session.Dialogue == null && session.Working == null)
                GUI.Label(new Rect(cx - 120 * s, H - 66 * s, cw + 240 * s, 32 * s), "WASD / left stick move  ·  Shift sprint  ·  Space jump  ·  Mouse or Z/C look  ·  E interact  ·  Esc frees the cursor", small);

            // Dialogue card.
            if (session.Dialogue != null)
            {
                var c = session.Dialogue.data; var j = session.DialogueJob;
                GUILayout.BeginArea(new Rect(W * 0.5f - 280 * s, H * 0.5f - 20 * s, 560 * s, 200 * s), cardStyle);
                GUILayout.Label(c.name, brand); GUILayout.Label(c.role, small); GUILayout.Space(6 * s);
                GUILayout.Label($"“{c.line}”", body); GUILayout.Space(8 * s);
                if (j != null)
                {
                    bool ok = session.State.CanTake(j) && (!j.night || clock.IsNight);
                    string why = !string.IsNullOrEmpty(j.needCourse) ? $"needs the {j.needCourse} certificate" : session.State.S.skills.Get(j.skill) < j.min ? $"needs {j.skill} {j.min}" : j.night && !clock.IsNight ? "night shift only" : "";
                    GUILayout.Label(ok ? $"[E]  Work shift — {j.title} · ₦{session.State.JobPay(j):N0} · {j.dur}h" : $"—  {j.title} ({why})", ok ? title : body);
                }
                GUILayout.Label("[X]  Not now — I go find another hustle", body);
                GUILayout.EndArea();
            }

            // Shift overlay.
            if (session.Working != null)
            {
                float t = Mathf.Clamp01(session.WorkT / session.WorkDuration);
                GUILayout.BeginArea(new Rect(W * 0.5f - 220 * s, H * 0.5f - 40 * s, 440 * s, 90 * s), cardStyle);
                GUILayout.Label($"Working · {session.Working.title}", title);
                var r = GUILayoutUtility.GetRect(400 * s, 10 * s); Bar(r, t, new Color(0.96f, 0.77f, 0.09f));
                GUILayout.Label($"{session.Working.where}  ·  {clock.ClockText}", small);
                GUILayout.EndArea();
            }

            // Toasts.
            float ty = 160 * s;
            foreach (var toast in session.State.Toasts)
            {
                GUILayout.BeginArea(new Rect(W * 0.5f - 260 * s, ty, 520 * s, 40 * s), cardStyle);
                GUILayout.Label(toast.text, small);
                GUILayout.EndArea();
                ty += 42 * s;
            }
        }
    }
}
