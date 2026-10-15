using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.EnhancedTouch;
using ETouch = UnityEngine.InputSystem.EnhancedTouch.Touch;

namespace Rise.UI
{
    // Touch controls for phones and tablets (the iPhone Safari WebGL build had none): a floating joystick on the left half
    // (walk, or steer and gas in a vehicle), drag anywhere on the right to look, action buttons (ACT, JUMP, RUN or BOOST,
    // HAND brake, PHONE, and X when a menu is open) and tappable menu rows. Everything is routed through GameInput, so the
    // player, camera and vehicle controllers are unchanged. Active on mobile platforms, with ?diag=touch (desktop testing:
    // the mouse then stands in for a finger), or after the first real touch on a touch-screen laptop.
    public class TouchControls : MonoBehaviour
    {
        public static TouchControls I { get; private set; }
        public static bool Active => I != null && I.active;

        // Provided by the HUD / session.
        public System.Func<Rect[]> MenuRects;    // GUI-space (top-left origin) rects of the open menu's rows, or null
        public System.Func<bool> MenuOpen, Driving;

        public Vector2 Move { get; private set; }
        public bool SprintHeld { get; private set; }
        public bool HandbrakeHeld { get; private set; }
        bool jump, interact, decline, phone; int menuTap = -1; Vector2 look;
        bool active, touchedOnce;

        int joyFinger = -1, lookFinger = -1; Vector2 joyOrigin, joyNow; float joyRadius;
        readonly System.Collections.Generic.Dictionary<int, Button> held = new System.Collections.Generic.Dictionary<int, Button>();
        enum Button { None, Act, Jump, Sprint, Hand, Phone, Close }
        Texture2D disc;

        public static bool TakeJump() { var t = I; if (t == null || !t.jump) return false; t.jump = false; return true; }
        public static bool TakeInteract() { var t = I; if (t == null || !t.interact) return false; t.interact = false; return true; }
        public static bool TakeDecline() { var t = I; if (t == null || !t.decline) return false; t.decline = false; return true; }
        public static bool TakePhone() { var t = I; if (t == null || !t.phone) return false; t.phone = false; return true; }
        public static int TakeMenuTap() { var t = I; if (t == null || t.menuTap < 0) return -1; int r = t.menuTap; t.menuTap = -1; return r; }
        public static Vector2 TakeLook() { var t = I; if (t == null) return Vector2.zero; var l = t.look; t.look = Vector2.zero; return l; }

        void Awake()
        {
            I = this;
            EnhancedTouchSupport.Enable();
            if (DiagFlags.Has("touch")) { TouchSimulation.Enable(); active = true; }
            else if (Application.isMobilePlatform) active = true;
            disc = new Texture2D(64, 64, TextureFormat.RGBA32, false) { filterMode = FilterMode.Bilinear };
            for (int y = 0; y < 64; y++) for (int x = 0; x < 64; x++) { float d = Vector2.Distance(new Vector2(x, y), new Vector2(31.5f, 31.5f)); float a = Mathf.Clamp01(31f - d); disc.SetPixel(x, y, new Color(1f, 1f, 1f, a)); }
            disc.Apply();
        }

        void OnDestroy() { if (I == this) I = null; }

        // Layout unit: a tenth of the shorter side, kept finger-sized.
        float U => Mathf.Clamp(Mathf.Min(Screen.width, Screen.height) * 0.16f, 56f, 130f);

        // Buttons in screen space (bottom-left origin): centre and radius.
        bool Rect(Button b, out Vector2 c, out float r)
        {
            float u = U, W = Screen.width, H = Screen.height; bool menu = MenuOpen != null && MenuOpen(); bool drive = Driving != null && Driving();
            c = Vector2.zero; r = 0.5f * u;
            switch (b)
            {
                case Button.Act: if (menu) return false; c = new Vector2(W - 1.2f * u, 1.2f * u); r = 0.62f * u; return true;
                case Button.Jump: if (menu || drive) return false; c = new Vector2(W - 2.75f * u, 0.85f * u); r = 0.46f * u; return true;
                case Button.Sprint: if (menu) return false; c = new Vector2(W - 0.85f * u, 2.55f * u); r = 0.46f * u; return true;
                case Button.Hand: if (menu || !drive) return false; c = new Vector2(W - 2.75f * u, 0.85f * u); r = 0.46f * u; return true;
                case Button.Phone: if (menu) return false; c = new Vector2(W - 0.65f * u, H - 2.1f * u); r = 0.36f * u; return true;
                case Button.Close: if (!menu) return false; c = new Vector2(W - 1.2f * u, 1.2f * u); r = 0.62f * u; return true;
            }
            return false;
        }

        Button ButtonAt(Vector2 p)
        {
            foreach (Button b in System.Enum.GetValues(typeof(Button)))
                if (b != Button.None && Rect(b, out var c, out var r) && Vector2.Distance(p, c) <= r * 1.25f) return b;
            return Button.None;
        }

        void Update()
        {
            var touches = ETouch.activeTouches;
            if (!active && touches.Count > 0 && Touchscreen.current != null) { active = true; touchedOnce = true; }
            if (!active) { Move = Vector2.zero; return; }
            bool menuOpen = MenuOpen != null && MenuOpen();
            joyRadius = U * 1.1f;
            bool joyAlive = false, lookAlive = false;
            var alive = new System.Collections.Generic.HashSet<int>();
            foreach (var t in touches)
            {
                int id = t.finger.index; alive.Add(id); var pos = t.screenPosition;
                if (t.phase == UnityEngine.InputSystem.TouchPhase.Began)
                {
                    var b = ButtonAt(pos);
                    if (b != Button.None) { held[id] = b; Press(b); }
                    else if (menuOpen) { held[id] = Button.None; menuStart[id] = (pos, Time.unscaledTime); }
                    else if (pos.x < Screen.width * 0.45f && joyFinger < 0) { joyFinger = id; joyOrigin = joyNow = pos; }
                    else if (lookFinger < 0) lookFinger = id;
                }
                if (id == joyFinger) { joyAlive = true; joyNow = pos; }
                if (id == lookFinger) { lookAlive = true; look += t.delta * 0.22f; }
                if (t.phase == UnityEngine.InputSystem.TouchPhase.Ended || t.phase == UnityEngine.InputSystem.TouchPhase.Canceled)
                {
                    if (menuStart.TryGetValue(id, out var st) && (pos - st.pos).magnitude < 24f && Time.unscaledTime - st.t < 0.6f) TapMenu(pos);
                }
            }
            if (!joyAlive) joyFinger = -1; if (!lookAlive) lookFinger = -1;
            var dead = new System.Collections.Generic.List<int>(); foreach (var k in held.Keys) if (!alive.Contains(k)) dead.Add(k); foreach (var k in dead) held.Remove(k);
            var dead2 = new System.Collections.Generic.List<int>(); foreach (var k in menuStart.Keys) if (!alive.Contains(k)) dead2.Add(k); foreach (var k in dead2) menuStart.Remove(k);
            Move = joyFinger >= 0 ? Vector2.ClampMagnitude((joyNow - joyOrigin) / joyRadius, 1f) : Vector2.zero;
            if (Move.magnitude < 0.12f) Move = Vector2.zero;
            SprintHeld = false; HandbrakeHeld = false;
            foreach (var b in held.Values) { if (b == Button.Sprint) SprintHeld = true; if (b == Button.Hand) HandbrakeHeld = true; }
            if (menuOpen) { Move = Vector2.zero; look = Vector2.zero; }
        }

        readonly System.Collections.Generic.Dictionary<int, (Vector2 pos, float t)> menuStart = new System.Collections.Generic.Dictionary<int, (Vector2, float)>();

        void Press(Button b) { switch (b) { case Button.Act: interact = true; break; case Button.Jump: jump = true; break; case Button.Phone: phone = true; break; case Button.Close: decline = true; break; } }

        void TapMenu(Vector2 screenPos)
        {
            var rects = MenuRects?.Invoke(); if (rects == null) return;
            var gui = new Vector2(screenPos.x, Screen.height - screenPos.y);
            for (int i = 0; i < rects.Length; i++) if (rects[i].width > 0f && rects[i].Contains(gui)) { menuTap = i; return; }
        }

        // ---- drawing ----
        void OnGUI()
        {
            if (!active || Event.current.type != EventType.Repaint) return;
            float u = U, H = Screen.height; var old = GUI.color;
            void Circle(Vector2 c, float r, Color col) { GUI.color = col; GUI.DrawTexture(new Rect(c.x - r, H - c.y - r, r * 2f, r * 2f), disc); }
            // Joystick: a faint hint ring when idle, base and thumb while held.
            Vector2 rest = new Vector2(1.9f * u, 1.7f * u);
            if (joyFinger >= 0) { Circle(joyOrigin, joyRadius, new Color(1f, 1f, 1f, 0.16f)); Circle(joyOrigin + Vector2.ClampMagnitude(joyNow - joyOrigin, joyRadius), 0.42f * u, new Color(0.96f, 0.77f, 0.09f, 0.6f)); }
            else if (!(MenuOpen != null && MenuOpen())) { Circle(rest, joyRadius, new Color(1f, 1f, 1f, 0.07f)); Circle(rest, 0.42f * u, new Color(1f, 1f, 1f, 0.1f)); }
            var style = new GUIStyle(GUI.skin.label) { alignment = TextAnchor.MiddleCenter, fontStyle = FontStyle.Bold, fontSize = Mathf.RoundToInt(0.26f * u), normal = { textColor = Color.white } };
            bool drive = Driving != null && Driving();
            foreach (Button b in System.Enum.GetValues(typeof(Button)))
            {
                if (b == Button.None || !Rect(b, out var c, out var r)) continue;
                bool down = false; foreach (var h in held.Values) if (h == b) down = true;
                Circle(c, r, b == Button.Act ? new Color(0.96f, 0.77f, 0.09f, down ? 0.75f : 0.5f) : new Color(1f, 1f, 1f, down ? 0.45f : 0.22f));
                string label = b == Button.Act ? "ACT" : b == Button.Jump ? "JUMP" : b == Button.Sprint ? (drive ? "BOOST" : "RUN") : b == Button.Hand ? "BRAKE" : b == Button.Phone ? "☎" : "X";
                GUI.color = Color.white; GUI.Label(new Rect(c.x - r, H - c.y - r, r * 2f, r * 2f), label, style);
            }
            GUI.color = old;
        }
    }
}
