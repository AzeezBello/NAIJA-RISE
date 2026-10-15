using UnityEngine;
using Rise.Data;
using Rise.Player;
using Rise.World;

namespace Rise.UI
{
    // The Lagos Experience HUD: brand, district and street top-left; clock and day top-right; minimap bottom-left;
    // money, level and XP bottom-right; health and stamina bars with the interaction prompt bottom-centre; toasts;
    // dialogue and shift overlays; speed and fuel while driving. IMGUI so the slice has no UI package dependency.
    public class Hud : MonoBehaviour
    {
        WorldData data; DayNightCycle clock; Session session; Minimap minimap;
        public Portrait Portrait;
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
            small = new GUIStyle(GUI.skin.label) { fontSize = (int)(12 * s), normal = { textColor = new Color(0.75f, 0.77f, 0.8f) }, alignment = TextAnchor.MiddleLeft, wordWrap = true };
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
            GUILayout.Label("RISE", brand);
            GUILayout.Label(region != null ? region.name : data.meta.name, title);
            if (!string.IsNullOrEmpty(street)) GUILayout.Label(street, body);
            GUILayout.EndArea();

            // Top-right: clock, day, heat.
            GUILayout.BeginArea(new Rect(W - 238 * s, 16 * s, 220 * s, 96 * s), cardStyle);
            GUILayout.Label($"{clock.ClockText}  {(clock.IsNight ? "NIGHT" : "DAY")}", title);
            GUILayout.Label($"Day {clock.Day}" + (session.Weather != null && session.Weather.Raining ? (session.Weather.Storm ? "  ·  STORM" : "  ·  RAIN") : session.Weather != null && session.Weather.Harmattan ? "  ·  HARMATTAN" : "") + (st.heat > 0 ? $"   HEAT {new string('★', st.heat)}{new string('☆', 5 - st.heat)}" : ""), body);
            GUILayout.EndArea();

            // Objective card above the minimap: mission title, objective, route distance, what you carry.
            {
                float m = 190 * s; float cardH = 96 * s;
                GUILayout.BeginArea(new Rect(18 * s, H - m - 18 * s - cardH - 10 * s, 300 * s, cardH), cardStyle);
                GUILayout.Label(session.ObjectiveTitle, title);
                var objective = session.ObjectiveText;
                if (!string.IsNullOrEmpty(objective)) GUILayout.Label(objective, body);
                string extra = "";
                if (session.Nav != null && session.Nav.Target != null) extra = $"{session.Nav.RouteLength:0} m along the road";
                if (st.items.Count > 0) extra += (extra.Length > 0 ? "  ·  " : "") + "carrying " + string.Join(", ", st.items);
                if (session.Pins.Count > 0) extra += (extra.Length > 0 ? "  ·  " : "") + $"crew pin: {session.Pins[session.Pins.Count - 1].label} ({session.Pins[session.Pins.Count - 1].by})";
                if (!string.IsNullOrEmpty(extra)) GUILayout.Label(extra, small);
                GUILayout.EndArea();
            }

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
            if (Portrait != null && Portrait.Texture != null)
            {
                var pr = new Rect(W - 318 * s - 92 * s, H - 172 * s, 84 * s, 84 * s);
                GUI.Box(new Rect(pr.x - 3, pr.y - 3, pr.width + 6, pr.height + 6), GUIContent.none, barBg);
                GUI.DrawTexture(pr, Portrait.Texture, ScaleMode.StretchToFill);
            }
            GUILayout.BeginArea(new Rect(W - 318 * s, H - 172 * s, 300 * s, 156 * s), cardStyle);
            GUILayout.Label($"₦{st.cash:N0} cash{(session.InCrew ? $"   [{session.CrewTag}]" : "")}", title);
            GUILayout.Label($"₦{st.bank:N0} RiseBank  ·  Level {st.level} {session.State.Title}", body);
            GUILayout.Label($"Rep  public {st.rep.publicRep}  ·  street {st.rep.street}  ·  business {st.rep.business}", small);
            var xpRect = GUILayoutUtility.GetRect(260 * s, 8 * s); Bar(xpRect, st.xp / 100f, new Color(0.96f, 0.77f, 0.09f));
            if (session.Vehicle != null) GUILayout.Label($"{session.Vehicle.Kmh:0} km/h  ·  fuel {st.fuel:0}%  ·  condition {session.Vehicle.Condition:0}%", body);
            GUILayout.EndArea();

            // Bottom-centre: health, stamina, prompt or hint.
            float cw = 420 * s, cx = W * 0.5f - cw * 0.5f;
            Bar(new Rect(cx, H - 86 * s, cw * 0.49f, 10 * s), st.health / 100f, new Color(0.85f, 0.2f, 0.2f));
            Bar(new Rect(cx + cw * 0.51f, H - 86 * s, cw * 0.49f, 10 * s), st.stamina / 100f, new Color(0.25f, 0.75f, 0.95f));
            if (!string.IsNullOrEmpty(session.Prompt) && session.ActiveMenu == null && session.Working == null)
                GUI.Label(new Rect(cx, H - 70 * s, cw, 40 * s), $"[{(TouchControls.Active ? "ACT" : "E")}]  {session.Prompt}", prompt);
            else if (Time.time < hintUntil && session.ActiveMenu == null && session.Working == null)
                GUI.Label(new Rect(cx - 120 * s, H - 66 * s, cw + 240 * s, 32 * s), TouchControls.Active ? "Left thumb moves  ·  drag right to look  ·  ACT to interact  ·  ☎ phone" : "WASD / left stick move  ·  Shift sprint  ·  Space jump  ·  Mouse or Z/C look  ·  E interact  ·  P phone  ·  Esc frees the cursor", small);

            // Menu card (dialogue, agent, home, business, bus stop, kiosk, police).
            var menu = session.ActiveMenu;
            if (menu != null)
            {
                float mh = (120 + (TouchControls.Active ? 40 : 30) * menu.Options.Count) * s;
                GUILayout.BeginArea(new Rect(W * 0.5f - 300 * s, H * 0.5f - mh * 0.5f, 600 * s, mh), cardStyle);
                GUILayout.Label(menu.Title, brand);
                if (!string.IsNullOrEmpty(menu.Subtitle)) GUILayout.Label(menu.Subtitle, small);
                if (!string.IsNullOrEmpty(menu.Line)) { GUILayout.Space(4 * s); GUILayout.Label($"“{menu.Line}”", body); }
                GUILayout.Space(6 * s);
                for (int f = 0; f < menu.Fields.Count; f++)
                {
                    GUILayout.BeginHorizontal(); GUILayout.Label(menu.Fields[f].Label, body, GUILayout.Width(110 * s));
                    GUI.SetNextControlName("field" + f);
                    menu.Fields[f].Value = menu.Fields[f].Password ? GUILayout.PasswordField(menu.Fields[f].Value ?? "", '•', 64) : GUILayout.TextField(menu.Fields[f].Value ?? "", 64);
                    GUILayout.EndHorizontal();
                }
                if (menu.Fields.Count > 0 && Cursor.lockState == CursorLockMode.Locked) { Cursor.lockState = CursorLockMode.None; Cursor.visible = true; }
                session.Typing = menu.Fields.Count > 0 && GUI.GetNameOfFocusedControl().StartsWith("field");
                bool touchUi = TouchControls.Active;
                var areaOrigin = new Vector2(W * 0.5f - 300 * s, H * 0.5f - mh * 0.5f);
                if (menu.Rects.Length != menu.Options.Count) menu.Rects = new Rect[menu.Options.Count];
                for (int i = 0; i < menu.Options.Count; i++)
                {
                    var o = menu.Options[i];
                    var style = !o.Enabled ? small : i == menu.Index ? title : body;
                    GUILayout.Label($"{(i == menu.Index ? "▶" : " ")} {i + 1}.  {o.Label}", style, touchUi ? new[] { GUILayout.MinHeight(34 * s) } : new GUILayoutOption[0]);
                    if (Event.current.type == EventType.Repaint) { var r = GUILayoutUtility.GetLastRect(); menu.Rects[i] = new Rect(areaOrigin.x + r.x, areaOrigin.y + r.y, r.width, r.height); }
                }
                GUILayout.Label(touchUi ? "Tap an option  ·  X to close" : "W/S choose · E confirm · X close", small);
                GUILayout.EndArea();
            }

            // Chat: lines from players in your district, and the input box on T / Enter.
            if (session.Players != null)
            {
                float cy = H - 230 * s;
                for (int i = session.Players.Chat.Count - 1; i >= 0 && i >= session.Players.Chat.Count - 5; i--) { var c = session.Players.Chat[i]; GUI.Label(new Rect(W * 0.5f - 300 * s, cy, 600 * s, 22 * s), $"{c.name}: {c.text}", body); cy -= 22 * s; }
                if (session.ChatOpen)
                {
                    if (Cursor.lockState == CursorLockMode.Locked) { Cursor.lockState = CursorLockMode.None; Cursor.visible = true; }
                    GUI.SetNextControlName("chat");
                    var e = Event.current;
                    if (e.type == EventType.KeyDown && (e.keyCode == KeyCode.Return || e.keyCode == KeyCode.KeypadEnter)) { session.SubmitChat(); e.Use(); }
                    else if (e.type == EventType.KeyDown && e.keyCode == KeyCode.Escape) { session.ChatOpen = false; e.Use(); }
                    else { session.ChatDraft = GUI.TextField(new Rect(W * 0.5f - 300 * s, H - 118 * s, 600 * s, 26 * s), session.ChatDraft, 140); GUI.FocusControl("chat"); }
                }
                GUI.Label(new Rect(W - 238 * s, 118 * s, 220 * s, 20 * s), session.Players.Status, small);
            }

            // Wanted banner.
            if (st.heat >= data.meta.pursuitHeat && Mathf.FloorToInt(Time.time * 2f) % 2 == 0)
                GUI.Label(new Rect(W * 0.5f - 220 * s, 110 * s, 440 * s, 36 * s), $"WANTED · HEAT {st.heat} · POLICE DEY CHASE YOU", prompt);

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
