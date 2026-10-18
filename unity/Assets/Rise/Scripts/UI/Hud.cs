using UnityEngine;
using Rise.Data;
using Rise.Player;
using Rise.World;

namespace Rise.UI
{
    // The Lagos Experience HUD: location top-left; clock, day, weather, heat and network top-right; objective card and a
    // north-up minimap with a heading arrow bottom-left; wallet, level, XP and reputation bottom-right (with the portrait
    // on foot and a speed / fuel / condition cluster while driving); vitals and the interaction prompt bottom-centre;
    // toasts, menus, shift overlay and the wanted banner. IMGUI so the slice has no UI package dependency.
    //
    // Look: the website's palette (web/app/globals.css) and its typeface, Inter (Resources/Fonts, SIL OFL), on dark glass
    // cards with rounded corners. Every texture is generated at startup and rebuilt when the screen scale changes, and
    // every card sizes itself to its text. Inter carries ₦, so money reads as naira (the built-in font had no ₦ glyph).
    public class Hud : MonoBehaviour
    {
        WorldData data; DayNightCycle clock; Session session; Minimap minimap;
        public Portrait Portrait;
        float hintUntil;

        static Color Hex(int rgb, float a = 1f) => new Color(((rgb >> 16) & 255) / 255f, ((rgb >> 8) & 255) / 255f, (rgb & 255) / 255f, a);
        static Color A(Color c, float a) => new Color(c.r, c.g, c.b, a);
        static readonly Color Ink = Hex(0x07100E), Green = Hex(0x3DFF79), Gold = Hex(0xFFC52F), Red = Hex(0xFF5D5D), Blue = Hex(0x5DB8FF),
            Text = Hex(0xF2F6F4), Muted = Hex(0x93A39C), Track = new Color(1f, 1f, 1f, 0.12f);

        Font regular, semibold;
        GUIStyle panel, rSmall, rMid, rPill, rKey, field;
        GUIStyle overline, heading, title, big, huge, body, bodyStrong, bodyMuted, bodyWrap, small, smallWrap, smallRight, keyText, promptText, pillText, center, stripText;
        Texture2D disc, arrow;
        readonly System.Collections.Generic.List<Texture2D> owned = new System.Collections.Generic.List<Texture2D>();
        float builtScale = -1f;
        static readonly GUIContent tmp = new GUIContent();

        public void Init(WorldData world, DayNightCycle dayNight, Session s, Minimap map)
        {
            data = world; clock = dayNight; session = s; minimap = map; hintUntil = Time.time + 25f;
        }

        void Awake() { useGUILayout = false; }   // everything is laid out by hand: no Layout pass, fewer allocations

        void OnDestroy() { foreach (var t in owned) if (t != null) Destroy(t); }

        float Scale => Mathf.Round(Mathf.Clamp(Screen.height / 720f, 0.8f, 2.5f) * 20f) / 20f;

        // ---- textures and styles ----

        Texture2D Own(Texture2D t) { t.hideFlags = HideFlags.HideAndDontSave; t.wrapMode = TextureWrapMode.Clamp; t.filterMode = FilterMode.Bilinear; owned.Add(t); return t; }

        // An anti-aliased rounded rectangle, drawn 9-sliced so the corners keep their radius at any size.
        Texture2D Rounded(float radius, Color fill, Color border, float borderW)
        {
            int size = Mathf.CeilToInt(radius * 2f) + 4;
            var t = Own(new Texture2D(size, size, TextureFormat.RGBA32, false));
            var px = new Color[size * size];
            for (int y = 0; y < size; y++)
                for (int x = 0; x < size; x++)
                {
                    float cx = Mathf.Max(radius - (x + 0.5f), 0f, (x + 0.5f) - (size - radius));
                    float cy = Mathf.Max(radius - (y + 0.5f), 0f, (y + 0.5f) - (size - radius));
                    float d = Mathf.Sqrt(cx * cx + cy * cy) - radius;        // signed distance to the edge, negative inside
                    float inner = borderW > 0f ? Mathf.Clamp01(0.5f - (d + borderW)) : 1f;
                    var c = Color.Lerp(border, fill, inner);
                    c.a *= Mathf.Clamp01(0.5f - d);
                    px[y * size + x] = c;
                }
            t.SetPixels(px); t.Apply();
            return t;
        }

        GUIStyle Slice(Texture2D t, float radius)
        {
            int b = Mathf.CeilToInt(radius);
            return new GUIStyle { normal = { background = t }, border = new RectOffset(b, b, b, b) };
        }

        // Navigation arrow (tip up) for the minimap, supersampled.
        Texture2D MakeArrow()
        {
            const int n = 64; var t = Own(new Texture2D(n, n, TextureFormat.RGBA32, false)); var px = new Color[n * n];
            Vector2 tip = new Vector2(32, 60), left = new Vector2(8, 6), notch = new Vector2(32, 20), right = new Vector2(56, 6);
            for (int y = 0; y < n; y++)
                for (int x = 0; x < n; x++)
                {
                    int hit = 0;
                    for (int sy = 0; sy < 4; sy++) for (int sx = 0; sx < 4; sx++)
                    {
                        var p = new Vector2(x + (sx + 0.5f) / 4f, y + (sy + 0.5f) / 4f);
                        if (InTri(p, tip, left, notch) || InTri(p, tip, notch, right)) hit++;
                    }
                    px[y * n + x] = new Color(1f, 1f, 1f, hit / 16f);
                }
            t.SetPixels(px); t.Apply(); return t;
        }

        static bool InTri(Vector2 p, Vector2 a, Vector2 b, Vector2 c)
        {
            float d1 = (p.x - b.x) * (a.y - b.y) - (a.x - b.x) * (p.y - b.y);
            float d2 = (p.x - c.x) * (b.y - c.y) - (b.x - c.x) * (p.y - c.y);
            float d3 = (p.x - a.x) * (c.y - a.y) - (c.x - a.x) * (p.y - a.y);
            return !(((d1 < 0) || (d2 < 0) || (d3 < 0)) && ((d1 > 0) || (d2 > 0) || (d3 > 0)));
        }

        GUIStyle Txt(Font f, float size, Color c, TextAnchor a = TextAnchor.MiddleLeft, bool wrap = false) =>
            new GUIStyle { font = f, fontSize = Mathf.Max(8, Mathf.RoundToInt(size)), alignment = a, wordWrap = wrap, clipping = TextClipping.Overflow, richText = false, normal = { textColor = c } };

        void Build(float s)
        {
            foreach (var t in owned) if (t != null) Destroy(t);
            owned.Clear();
            builtScale = s;
            if (regular == null) regular = Resources.Load<Font>("Fonts/Inter-Regular");
            if (semibold == null) semibold = Resources.Load<Font>("Fonts/Inter-SemiBold");
            var fallback = GUI.skin.font;
            Font R = regular != null ? regular : fallback, B = semibold != null ? semibold : fallback;

            panel = Slice(Rounded(10f * s, Hex(0x060E0C, 0.80f), new Color(1f, 1f, 1f, 0.10f), Mathf.Max(1f, s)), 10f * s);
            rSmall = Slice(Rounded(3f * s, Color.white, Color.white, 0f), 3f * s);
            rMid = Slice(Rounded(8f * s, Color.white, Color.white, 0f), 8f * s);
            rPill = Slice(Rounded(9f * s, Color.white, Color.white, 0f), 9f * s);
            rKey = Slice(Rounded(5f * s, Color.white, Color.white, 0f), 5f * s);
            disc = Own(Rounded(31f, Color.white, Color.white, 0f));
            arrow = MakeArrow();

            var fieldTex = Rounded(7f * s, Hex(0x0C1714, 0.95f), new Color(1f, 1f, 1f, 0.16f), Mathf.Max(1f, s));
            var fieldFocus = Rounded(7f * s, Hex(0x0C1714, 0.95f), A(Green, 0.8f), Mathf.Max(1f, s));
            int fb = Mathf.CeilToInt(7f * s) + 1;
            field = new GUIStyle(GUI.skin.textField)
            {
                font = R, fontSize = Mathf.RoundToInt(14 * s), alignment = TextAnchor.MiddleLeft, border = new RectOffset(fb, fb, fb, fb),
                padding = new RectOffset((int)(10 * s), (int)(10 * s), (int)(4 * s), (int)(4 * s)),
                normal = { background = fieldTex, textColor = Text }, hover = { background = fieldTex, textColor = Text },
                focused = { background = fieldFocus, textColor = Text }, active = { background = fieldFocus, textColor = Text },
            };

            overline = Txt(B, 10 * s, Muted);
            heading = Txt(B, 17 * s, Text);
            title = Txt(B, 20 * s, Gold);
            big = Txt(B, 24 * s, Text);
            huge = Txt(B, 34 * s, Text);
            body = Txt(R, 14 * s, Text);
            bodyStrong = Txt(B, 14 * s, Text);
            bodyMuted = Txt(R, 14 * s, A(Muted, 0.6f));
            bodyWrap = Txt(R, 14 * s, Text, TextAnchor.UpperLeft, true);
            small = Txt(R, 12 * s, Muted);
            smallWrap = Txt(R, 12 * s, Muted, TextAnchor.UpperLeft, true);
            smallRight = Txt(R, 12 * s, Muted, TextAnchor.MiddleRight);
            keyText = Txt(B, 12 * s, Ink, TextAnchor.MiddleCenter);
            promptText = Txt(B, 15 * s, Text);
            pillText = Txt(B, 10 * s, Text, TextAnchor.MiddleCenter);
            center = Txt(R, 12 * s, Muted, TextAnchor.MiddleCenter, true);
            stripText = Txt(B, 14 * s, Text, TextAnchor.MiddleCenter);
        }

        // ---- drawing helpers ----

        static float TW(GUIStyle st, string t) { tmp.text = t; return st.CalcSize(tmp).x; }
        static float TH(GUIStyle st, string t, float w) { tmp.text = t; return st.CalcHeight(tmp, w); }
        static float LH(GUIStyle st) => Mathf.Ceil(st.fontSize * 1.45f);

        static void Box(Rect r, GUIStyle st, Color tint)
        {
            if (Event.current.type != EventType.Repaint || r.width <= 0f || r.height <= 0f) return;
            var o = GUI.color; GUI.color = o * tint; st.Draw(r, false, false, false, false); GUI.color = o;
        }

        void Tex(Rect r, Texture t, Color tint)
        {
            if (Event.current.type != EventType.Repaint) return;
            var o = GUI.color; GUI.color = o * tint; GUI.DrawTexture(r, t, ScaleMode.StretchToFill, true); GUI.color = o;
        }

        static void Label(Rect r, string text, GUIStyle st, Color? tint = null)
        {
            if (tint == null) { GUI.Label(r, text, st); return; }
            var o = GUI.color; GUI.color = o * tint.Value; GUI.Label(r, text, st); GUI.color = o;
        }

        void Bar(Rect r, float t, Color c)
        {
            Box(r, rSmall, Track);
            t = Mathf.Clamp01(t); if (t <= 0f) return;
            Box(new Rect(r.x, r.y, Mathf.Max(r.height, r.width * t), r.height), rSmall, c);
        }

        // A small tinted capsule with a caption, returns its width.
        float Pill(float x, float y, string text, Color c, float s)
        {
            float w = TW(pillText, text) + 14f * s, h = 18f * s;
            Box(new Rect(x, y, w, h), rPill, A(c, 0.18f));
            Label(new Rect(x, y, w, h), text, pillText, c);
            return w;
        }

        // A key cap ("E", "ACT", "1") followed by nothing; returns its width.
        float KeyCap(float x, float y, float h, string key, Color c, float s)
        {
            float w = Mathf.Max(h, TW(keyText, key) + 12f * s);
            Box(new Rect(x, y, w, h), rKey, c);
            Label(new Rect(x, y, w, h), key, keyText);
            return w;
        }

        static string Naira(long v) => (v < 0 ? "-₦" : "₦") + System.Math.Abs(v).ToString("N0");
        static string Distance(float m) => m < 1000f ? $"{m:0} m" : $"{m / 1000f:0.0} km";

        // ---- the HUD ----

        void OnGUI()
        {
            if (data == null || session == null) return;
            float s = Scale;
            if (!Mathf.Approximately(s, builtScale) || panel == null || panel.normal.background == null) Build(s);
            GUI.skin.settings.cursorColor = Green; GUI.skin.settings.selectionColor = A(Green, 0.35f);
            float W = Screen.width, H = Screen.height, m = 16f * s;
            var st = session.State.S;
            bool touch = TouchControls.Active;

            float topY = m;
            if (touch) topY = DrawTouchStrip(s, W, m) + 8f * s;
            DrawLocation(s, m);
            DrawClock(s, W, m, st.heat);
            float mapTop = DrawMinimap(s, H, m);
            DrawObjective(s, m, mapTop - 10f * s, st);
            if (!touch) DrawWallet(s, W, H, m, st);
            DrawCentre(s, W, H, st, touch);

            bool wanted = st.heat >= data.meta.pursuitHeat;
            if (wanted) topY = DrawWanted(s, W, topY, st.heat) + 8f * s;
            if (session.Working != null) DrawShift(s, W, H);
            DrawToasts(s, W, topY);
            if (session.ActiveMenu != null) DrawMenu(session.ActiveMenu, s, W, H);
        }

        // Top-left: brand, district, street (or bridge).
        void DrawLocation(float s, float m)
        {
            var focus = session.Vehicle != null ? session.Vehicle.transform : session.Player.transform;
            var pos = focus.position;
            var region = data.RegionAt(pos);
            var road = data.RoadAt(pos, 9f);
            string street = road != null ? data.RoadNameAt(road, road.Along(pos)) : null;
            data.DeckHeightAt(pos, out var bridge);
            if (bridge != null) street = bridge.name;
            string place = region != null ? region.name : data.meta.name;

            float pad = 12f * s, accent = 3f * s;
            float tw = Mathf.Max(TW(heading, place), string.IsNullOrEmpty(street) ? 0f : TW(small, street), TW(overline, "RISE · HUSTLE OR DIE TRYING"));
            float w = Mathf.Clamp(tw + pad * 2f + accent + 4f * s, 190f * s, 340f * s);
            float h = pad * 2f + LH(overline) + LH(heading) + (string.IsNullOrEmpty(street) ? 0f : LH(small) - 2f * s);
            var r = new Rect(m, m, w, h);
            Box(r, panel, Color.white);
            Box(new Rect(r.x + pad * 0.6f, r.y + pad, accent, h - pad * 2f), rSmall, Gold);
            float x = r.x + pad + accent + 4f * s, y = r.y + pad, iw = r.xMax - pad - x;
            Label(new Rect(x, y, iw, LH(overline)), "RISE · HUSTLE OR DIE TRYING", overline, A(Gold, 1f)); y += LH(overline);
            Label(new Rect(x, y, iw, LH(heading)), place, heading); y += LH(heading) - 2f * s;
            if (!string.IsNullOrEmpty(street)) Label(new Rect(x, y, iw, LH(small)), street, small);
        }

        // Top-right: clock with day/night, day number and weather, heat pips, network status.
        void DrawClock(float s, float W, float m, int heat)
        {
            float pad = 12f * s, w = 214f * s;
            bool weatherRow = true, heatRow = heat > 0, netRow = session.Players != null;
            float h = pad * 2f + LH(big) + LH(small) + (heatRow ? 22f * s : 0f) + (netRow ? 20f * s : 0f);
            var r = new Rect(W - m - w, m, w, h);
            Box(r, panel, Color.white);
            float x = r.x + pad, y = r.y + pad, iw = w - pad * 2f;
            Label(new Rect(x, y, iw, LH(big)), clock.ClockText, big);
            string phase = clock.IsNight ? "NIGHT" : "DAY";
            float pw = TW(pillText, phase) + 14f * s;
            Pill(r.xMax - pad - pw, y + (LH(big) - 18f * s) * 0.5f, phase, clock.IsNight ? Blue : Gold, s);
            y += LH(big);
            if (weatherRow)
            {
                string day = $"Day {clock.Day}";
                Label(new Rect(x, y, iw, LH(small)), day, small);
                var wx = session.Weather;
                string tag = wx == null ? null : wx.Raining ? (wx.Storm ? "STORM" : "RAIN") : wx.Harmattan ? "HARMATTAN" : null;
                if (tag != null) Pill(x + TW(small, day) + 8f * s, y + (LH(small) - 18f * s) * 0.5f, tag, tag == "HARMATTAN" ? Gold : Blue, s);
                y += LH(small);
            }
            if (heatRow)
            {
                y += 4f * s;
                Label(new Rect(x, y, 50f * s, 14f * s), "HEAT", overline, Red);
                float px = x + TW(overline, "HEAT") + 8f * s, d = 9f * s;
                for (int i = 0; i < 5; i++) Tex(new Rect(px + i * (d + 5f * s), y + (14f * s - d) * 0.5f, d, d), disc, i < heat ? Red : Track);
                y += 18f * s;
            }
            if (netRow)
            {
                string status = session.Players.Status;
                bool on = !status.StartsWith("connecting") && status != "offline";
                Color dot = on ? Green : status == "offline" ? Muted : Gold;
                if (!on && status.StartsWith("connecting")) dot = A(Gold, 0.55f + 0.45f * Mathf.Abs(Mathf.Sin(Time.time * 3f)));
                y += 2f * s;
                Tex(new Rect(x, y + 5f * s, 7f * s, 7f * s), disc, dot);
                Label(new Rect(x + 13f * s, y, iw - 13f * s, 17f * s), status, small);
            }
        }

        // Bottom-left: north-up minimap with the player's heading.
        float DrawMinimap(float s, float H, float m)
        {
            float size = 180f * s;
            var r = new Rect(m, H - m - size, size, size);
            if (minimap == null || minimap.Texture == null) return r.yMax;
            float inset = 5f * s;
            Box(new Rect(r.x - inset, r.y - inset, r.width + inset * 2f, r.height + inset * 2f), panel, Color.white);
            if (Event.current.type == EventType.Repaint) GUI.DrawTexture(r, minimap.Texture, ScaleMode.StretchToFill, false);
            // Heading arrow: yaw is clockwise from north, which IMGUI's rotation also is.
            var focus = session.Vehicle != null ? session.Vehicle.transform : session.Player.transform;
            float a = 20f * s; var c = r.center;
            var old = GUI.matrix;
            GUIUtility.RotateAroundPivot(focus.eulerAngles.y, c);
            Tex(new Rect(c.x - a * 0.62f, c.y - a * 0.62f, a * 1.24f, a * 1.24f), arrow, new Color(0f, 0f, 0f, 0.65f));
            Tex(new Rect(c.x - a * 0.5f, c.y - a * 0.5f, a, a), arrow, Gold);
            GUI.matrix = old;
            // North badge on the top edge.
            float nb = 20f * s; var nr = new Rect(r.center.x - nb * 0.5f, r.y - inset - nb * 0.5f, nb, nb);
            Tex(nr, disc, Hex(0x060E0C, 0.95f));
            Label(nr, "N", pillText, Text);
            return r.y - inset;
        }

        // Above the minimap: mission title, objective, route distance, what you carry, crew pins.
        void DrawObjective(float s, float m, float bottom, SaveData st)
        {
            float pad = 12f * s, w = 300f * s, iw = w - pad * 2f - 7f * s;
            string ttl = session.ObjectiveTitle, obj = session.ObjectiveText;
            if (string.IsNullOrEmpty(ttl) && string.IsNullOrEmpty(obj)) return;
            string extra = "";
            if (st.items.Count > 0) extra = "Carrying " + string.Join(", ", st.items.ConvertAll(data.ItemName));
            if (session.Pins.Count > 0) { var pin = session.Pins[session.Pins.Count - 1]; extra += (extra.Length > 0 ? "  ·  " : "") + $"Crew pin: {pin.label} ({pin.by})"; }
            bool route = session.Nav != null && session.Nav.Target != null;
            float objH = string.IsNullOrEmpty(obj) ? 0f : TH(bodyWrap, obj, iw);
            float extraH = extra.Length > 0 ? TH(smallWrap, extra, iw) + 4f * s : 0f;
            float h = pad * 2f + LH(overline) + LH(heading) + objH + (route ? 24f * s : 0f) + extraH;
            var r = new Rect(m, bottom - h, w, h);
            Box(r, panel, Color.white);
            Box(new Rect(r.x + pad * 0.6f, r.y + pad, 3f * s, h - pad * 2f), rSmall, Green);
            float x = r.x + pad + 7f * s, y = r.y + pad;
            Label(new Rect(x, y, iw, LH(overline)), "OBJECTIVE", overline, Green); y += LH(overline);
            Label(new Rect(x, y, iw, LH(heading)), ttl, heading); y += LH(heading);
            if (objH > 0f) { Label(new Rect(x, y, iw, objH), obj, bodyWrap); y += objH; }
            if (route) { y += 6f * s; Pill(x, y, Distance(session.Nav.RouteLength) + " AWAY", Green, s); y += 18f * s; }
            if (extraH > 0f) { y += 4f * s; Label(new Rect(x, y, iw, extraH), extra, smallWrap); }
        }

        // Bottom-right: wallet, level and XP, reputation; portrait on foot; speed, fuel and condition while driving.
        void DrawWallet(float s, float W, float H, float m, SaveData st)
        {
            float pad = 14f * s, w = 300f * s, iw = w - pad * 2f;
            float h = pad * 2f + LH(big) + LH(small) + 10f * s + 20f * s + 12f * s + LH(overline) + LH(bodyStrong);
            var r = new Rect(W - m - w, H - m - h, w, h);
            Box(r, panel, Color.white);
            float x = r.x + pad, y = r.y + pad;
            Label(new Rect(x, y, iw, LH(big)), Naira(st.cash), big);
            if (session.InCrew) { string tag = $"[{session.CrewTag}]"; float pw = TW(pillText, tag) + 14f * s; Pill(r.xMax - pad - pw, y + (LH(big) - 18f * s) * 0.5f, tag, Green, s); }
            y += LH(big);
            Label(new Rect(x, y, iw, LH(small)), $"{Naira(st.bank)} in RiseBank", small); y += LH(small) + 10f * s;
            float lw = Pill(x, y + 1f * s, $"LV {st.level}", Gold, s);
            Label(new Rect(x + lw + 8f * s, y, iw, 20f * s), session.State.Title, bodyStrong);
            Label(new Rect(x, y, iw, 20f * s), $"{st.xp:0} / 100 XP", smallRight);
            y += 24f * s;
            Bar(new Rect(x, y, iw, 6f * s), st.xp / 100f, Gold); y += 14f * s;
            float col = iw / 3f;
            string[] names = { "PUBLIC", "STREET", "BUSINESS" };
            string[] vals = { st.rep.publicRep.ToString(), st.rep.street.ToString(), st.rep.business.ToString() };
            for (int i = 0; i < 3; i++)
            {
                Label(new Rect(x + col * i, y, col, LH(overline)), names[i], overline);
                Label(new Rect(x + col * i, y + LH(overline), col, LH(bodyStrong)), vals[i], bodyStrong);
            }

            // Portrait on foot (inside a vehicle the portrait camera has no one to look at).
            if (session.Vehicle == null && Portrait != null && Portrait.Texture != null)
            {
                float ps = 92f * s, inset = 4f * s;
                var pr = new Rect(r.x - 10f * s - ps, r.yMax - ps, ps, ps);
                Box(pr, panel, Color.white);
                if (Event.current.type == EventType.Repaint) GUI.DrawTexture(new Rect(pr.x + inset, pr.y + inset, ps - inset * 2f, ps - inset * 2f), Portrait.Texture, ScaleMode.ScaleAndCrop, false);
            }

            // Driving cluster above the wallet.
            var v = session.Vehicle;
            if (v != null)
            {
                float ch = 78f * s; var cr = new Rect(r.x, r.y - 10f * s - ch, w, ch);
                Box(cr, panel, Color.white);
                float cx = cr.x + pad, cy = cr.y + 10f * s;
                string kmh = $"{v.Kmh:0}";
                Label(new Rect(cx, cy, 100f * s, LH(huge)), kmh, huge);
                Label(new Rect(cx + TW(huge, kmh) + 6f * s, cy + LH(huge) - LH(small) - 6f * s, 50f * s, LH(small)), "km/h", small);
                float bx = cr.x + 128f * s, bw = cr.xMax - pad - bx, by = cr.y + 14f * s;
                float fuel = st.fuel, cond = v.Condition;
                Label(new Rect(bx, by, bw, 14f * s), "FUEL", overline); Label(new Rect(bx, by, bw, 14f * s), $"{fuel:0}%", smallRight);
                Bar(new Rect(bx, by + 16f * s, bw, 6f * s), fuel / 100f, fuel < 15f ? Red : Gold);
                by += 30f * s;
                Label(new Rect(bx, by, bw, 14f * s), "CONDITION", overline); Label(new Rect(bx, by, bw, 14f * s), $"{cond:0}%", smallRight);
                Bar(new Rect(bx, by + 16f * s, bw, 6f * s), cond / 100f, cond < 30f ? Red : cond < 60f ? Gold : Green);
            }
        }

        // Touch screens: the controls own the bottom corners, so cash, level and speed sit in one strip at the top centre.
        float DrawTouchStrip(float s, float W, float m)
        {
            var st = session.State.S;
            string text = $"{Naira(st.cash)}   ·   LV {st.level}" + (session.Vehicle != null ? $"   ·   {session.Vehicle.Kmh:0} km/h   ·   fuel {st.fuel:0}%" : "");
            float w = TW(bodyStrong, text) + 32f * s, h = 34f * s;
            var r = new Rect(W * 0.5f - w * 0.5f, m, w, h);
            Box(r, panel, Color.white);
            Label(r, text, stripText);
            return r.yMax;
        }

        // Bottom-centre: health and stamina, the interaction prompt (or the controls hint), chat.
        void DrawCentre(float s, float W, float H, SaveData st, bool touch)
        {
            float bw = 300f * s, gap = 12f * s, half = (bw - gap) * 0.5f, x0 = W * 0.5f - bw * 0.5f, by = H - 22f * s;
            Label(new Rect(x0, by - 16f * s, half, 14f * s), "HEALTH", overline); Label(new Rect(x0, by - 16f * s, half, 14f * s), $"{st.health:0}", smallRight);
            Bar(new Rect(x0, by, half, 6f * s), st.health / 100f, st.health < 25f ? Red : Hex(0xE5484D));
            float x1 = x0 + half + gap;
            Label(new Rect(x1, by - 16f * s, half, 14f * s), "STAMINA", overline); Label(new Rect(x1, by - 16f * s, half, 14f * s), $"{st.stamina:0}", smallRight);
            Bar(new Rect(x1, by, half, 6f * s), st.stamina / 100f, Blue);

            float slotBottom = by - 26f * s, ph = 40f * s, py = slotBottom - ph;
            bool free = session.ActiveMenu == null && session.Working == null;
            if (!string.IsNullOrEmpty(session.Prompt) && free)
            {
                string key = touch ? "ACT" : "E", label = session.Prompt.ToUpperInvariant();
                float kh = 26f * s, kw = Mathf.Max(kh, TW(keyText, key) + 12f * s);
                float w = 10f * s + kw + 10f * s + TW(promptText, label) + 16f * s;
                var r = new Rect(W * 0.5f - w * 0.5f, py, w, ph);
                Box(r, panel, Color.white);
                KeyCap(r.x + 10f * s, r.y + (ph - kh) * 0.5f, kh, key, Gold, s);
                Label(new Rect(r.x + 20f * s + kw, r.y, w, ph), label, promptText);
            }
            else if (Time.time < hintUntil && free)
            {
                string hint = touch ? "Left thumb moves  ·  drag right to look  ·  ACT to interact  ·  PHONE for the phone"
                                    : "WASD move  ·  Shift sprint  ·  Space jump  ·  E interact  ·  P phone  ·  Esc frees the cursor";
                float fade = Mathf.Clamp01((hintUntil - Time.time) / 1.5f);
                float room = touch ? W - 40f * s : W - 2f * (16f + 300f + 10f + 92f + 14f) * s;   // between the minimap column and the portrait
                float w = Mathf.Min(Mathf.Max(260f * s, room), TW(small, hint) + 28f * s), h = TH(center, hint, w - 28f * s) + 14f * s;
                var r = new Rect(W * 0.5f - w * 0.5f, slotBottom - h, w, h);
                Box(r, panel, new Color(1f, 1f, 1f, 0.85f * fade));
                Label(new Rect(r.x + 14f * s, r.y, w - 28f * s, h), hint, center, new Color(1f, 1f, 1f, fade));
            }

            // Chat: lines from players in your district, and the input box on T / Enter.
            if (session.Players == null) return;
            float cy = py - 10f * s, cw = 560f * s, cx = W * 0.5f - cw * 0.5f;
            if (session.ChatOpen)
            {
                if (Cursor.lockState == CursorLockMode.Locked) { Cursor.lockState = CursorLockMode.None; Cursor.visible = true; }
                float fh = 32f * s; cy -= fh;
                GUI.SetNextControlName("chat");
                var e = Event.current;
                if (e.type == EventType.KeyDown && (e.keyCode == KeyCode.Return || e.keyCode == KeyCode.KeypadEnter)) { session.SubmitChat(); e.Use(); }
                else if (e.type == EventType.KeyDown && e.keyCode == KeyCode.Escape) { session.ChatOpen = false; e.Use(); }
                else { session.ChatDraft = GUI.TextField(new Rect(cx, cy, cw, fh), session.ChatDraft, 140, field); GUI.FocusControl("chat"); }
                cy -= 6f * s;
            }
            var chat = session.Players.Chat;
            for (int i = chat.Count - 1; i >= 0 && i >= chat.Count - 5; i--)
            {
                var c = chat[i]; string name = c.name + "  ";
                float lh = 24f * s, nw = TW(bodyStrong, name), w = Mathf.Min(cw, nw + TW(body, c.text) + 20f * s);
                cy -= lh;
                Box(new Rect(cx, cy, w, lh - 2f * s), rMid, new Color(0.02f, 0.05f, 0.04f, 0.6f));
                Label(new Rect(cx + 10f * s, cy, nw, lh - 2f * s), name, bodyStrong, Green);
                Label(new Rect(cx + 10f * s + nw, cy, w - nw - 20f * s, lh - 2f * s), c.text, body);
            }
        }

        // Top-centre: pulsing wanted capsule with heat pips. Returns its bottom.
        float DrawWanted(float s, float W, float y, int heat)
        {
            string a = "WANTED", b = "Police dey chase you";
            float d = 9f * s, pips = 5f * d + 4f * 5f * s;
            float w = 18f * s + TW(promptText, a) + 12f * s + pips + 12f * s + TW(small, b) + 18f * s, h = 36f * s;
            var r = new Rect(W * 0.5f - w * 0.5f, y, w, h);
            float pulse = 0.78f + 0.22f * Mathf.Sin(Time.time * 6f);
            Box(r, rPill, new Color(0.55f, 0.08f, 0.1f, 0.92f));
            Box(r, rPill, A(Red, 0.35f * pulse));
            float x = r.x + 18f * s;
            Label(new Rect(x, r.y, w, h), a, promptText); x += TW(promptText, a) + 12f * s;
            for (int i = 0; i < 5; i++) Tex(new Rect(x + i * (d + 4f * s), r.y + (h - d) * 0.5f, d, d), disc, i < heat ? Color.white : new Color(1f, 1f, 1f, 0.25f));
            x += pips + 12f * s;
            Label(new Rect(x, r.y, w, h), b, small, new Color(1.2f, 1.1f, 1.1f, 1f));
            return r.yMax;
        }

        // Centre: shift progress.
        void DrawShift(float s, float W, float H)
        {
            float t = Mathf.Clamp01(session.WorkT / session.WorkDuration), pad = 16f * s, w = 420f * s;
            float h = pad * 2f + LH(overline) + LH(heading) + 14f * s + LH(small);
            var r = new Rect(W * 0.5f - w * 0.5f, H * 0.5f - h * 0.5f, w, h);
            Box(r, panel, Color.white);
            float x = r.x + pad, y = r.y + pad, iw = w - pad * 2f;
            Label(new Rect(x, y, iw, LH(overline)), "WORKING", overline, Gold); Label(new Rect(x, y, iw, LH(overline)), $"{t * 100f:0}%", smallRight);
            y += LH(overline);
            Label(new Rect(x, y, iw, LH(heading)), session.Working.title, heading); y += LH(heading) + 2f * s;
            Bar(new Rect(x, y, iw, 8f * s), t, Gold); y += 14f * s;
            Label(new Rect(x, y, iw, LH(small)), $"{session.Working.where}  ·  {clock.ClockText}", small);
        }

        // Top-centre: toasts that slide in and fade out.
        void DrawToasts(float s, float W, float y)
        {
            float maxW = Mathf.Min(520f * s, W * 0.46f);
            foreach (var toast in session.State.Toasts)
            {
                float left = toast.until - Time.time, age = 3.5f - left;
                float alpha = Mathf.Clamp01(left / 0.35f) * Mathf.Clamp01(age / 0.18f);
                if (alpha <= 0f) continue;
                float tw = Mathf.Min(maxW - 40f * s, TW(body, toast.text) + 4f * s);
                float th = TH(bodyWrap, toast.text, tw), h = Mathf.Max(34f * s, th + 14f * s), w = tw + 40f * s;
                float slide = (1f - Mathf.Clamp01(age / 0.18f)) * -8f * s;
                var r = new Rect(W * 0.5f - w * 0.5f, y + slide, w, h);
                Box(r, panel, new Color(1f, 1f, 1f, alpha));
                Tex(new Rect(r.x + 14f * s, r.y + h * 0.5f - 4f * s, 8f * s, 8f * s), disc, A(Green, alpha));
                Label(new Rect(r.x + 30f * s, r.y + (h - th) * 0.5f, tw, th), toast.text, bodyWrap, new Color(1f, 1f, 1f, alpha));
                y += h + 6f * s;
            }
        }

        // Centre: the menu card (dialogue, agent, home, business, bus stop, kiosk, police, sign-in).
        void DrawMenu(Menu menu, float s, float W, float H)
        {
            bool touchUi = TouchControls.Active;
            float pad = 20f * s, cw = Mathf.Min(560f * s, W - 32f * s), iw = cw - pad * 2f;
            float rowH = (touchUi ? 44f : 36f) * s, fieldH = 34f * s;
            float titleH = LH(title);
            float subH = string.IsNullOrEmpty(menu.Subtitle) ? 0f : TH(smallWrap, menu.Subtitle, iw) + 2f * s;
            string quote = string.IsNullOrEmpty(menu.Line) ? null : $"“{menu.Line}”";
            float quoteH = quote == null ? 0f : TH(bodyWrap, quote, iw - 14f * s);
            float fieldsH = menu.Fields.Count * (fieldH + 8f * s);
            float optsH = menu.Options.Count * (rowH + 4f * s);
            float h = pad + titleH + subH + (quote != null ? quoteH + 16f * s : 0f) + 12f * s + fieldsH + optsH + 10f * s + LH(small) + pad;
            var r = new Rect(W * 0.5f - cw * 0.5f, Mathf.Max(16f * s, H * 0.5f - h * 0.5f), cw, h);
            if (Event.current.type == EventType.Repaint) Box(new Rect(0, 0, W, H), rSmall, new Color(0f, 0f, 0f, 0.25f));   // dim the world behind
            Box(r, panel, Color.white);
            float x = r.x + pad, y = r.y + pad;
            Label(new Rect(x, y, iw, titleH), menu.Title, title); y += titleH;
            if (subH > 0f) { Label(new Rect(x, y, iw, subH), menu.Subtitle, smallWrap); y += subH; }
            if (quote != null)
            {
                y += 8f * s;
                Box(new Rect(x, y, 3f * s, quoteH), rSmall, A(Gold, 0.6f));
                Label(new Rect(x + 14f * s, y, iw - 14f * s, quoteH), quote, bodyWrap);
                y += quoteH + 8f * s;
            }
            y += 12f * s;

            for (int f = 0; f < menu.Fields.Count; f++)
            {
                var fd = menu.Fields[f];
                Label(new Rect(x, y, 110f * s, fieldH), fd.Label, small);
                var fr = new Rect(x + 110f * s, y, iw - 110f * s, fieldH);
                GUI.SetNextControlName("field" + f);
                fd.Value = fd.Password ? GUI.PasswordField(fr, fd.Value ?? "", '•', 64, field) : GUI.TextField(fr, fd.Value ?? "", 64, field);
                y += fieldH + 8f * s;
            }
            if (menu.Fields.Count > 0 && Cursor.lockState == CursorLockMode.Locked) { Cursor.lockState = CursorLockMode.None; Cursor.visible = true; }
            session.Typing = menu.Fields.Count > 0 && GUI.GetNameOfFocusedControl().StartsWith("field");

            if (menu.Rects.Length != menu.Options.Count) menu.Rects = new Rect[menu.Options.Count];
            var e = Event.current;
            bool pointer = !touchUi && Cursor.lockState != CursorLockMode.Locked;   // a free mouse can hover and click rows
            for (int i = 0; i < menu.Options.Count; i++)
            {
                var o = menu.Options[i];
                var row = new Rect(x - 8f * s, y, iw + 16f * s, rowH);
                menu.Rects[i] = row;
                bool sel = i == menu.Index, hover = pointer && o.Enabled && row.Contains(e.mousePosition);
                if (sel) Box(row, rMid, A(Green, 0.14f));
                else if (hover) Box(row, rMid, new Color(1f, 1f, 1f, 0.06f));
                if (sel) Box(new Rect(row.x, row.y + 8f * s, 3f * s, rowH - 16f * s), rSmall, Green);
                float kh = 22f * s;
                float kw = KeyCap(row.x + 14f * s, row.y + (rowH - kh) * 0.5f, kh, (i + 1).ToString(), !o.Enabled ? new Color(1f, 1f, 1f, 0.25f) : sel ? Green : new Color(1f, 1f, 1f, 0.85f), s);
                Label(new Rect(row.x + 14f * s + kw + 12f * s, row.y, row.width - kw - 40f * s, rowH), o.Label, !o.Enabled ? bodyMuted : sel ? bodyStrong : body);
                if (pointer && o.Enabled && e.type == EventType.MouseDown && e.button == 0 && row.Contains(e.mousePosition)) { e.Use(); session.Choose(i); return; }
                y += rowH + 4f * s;
            }
            y += 6f * s;
            Label(new Rect(x, y, iw, LH(small)), touchUi ? "Tap an option  ·  X to close" : $"W/S choose  ·  E confirm  ·  1–{Mathf.Max(1, menu.Options.Count)} pick  ·  X close", small);
        }
    }
}
