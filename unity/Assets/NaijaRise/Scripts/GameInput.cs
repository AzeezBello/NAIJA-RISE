using UnityEngine;
using UnityEngine.InputSystem;

namespace NaijaRise
{
    // Input through the Input System package. The action maps in Resources/Input/NaijaRise.inputactions carry the
    // keyboard + mouse and gamepad bindings (the Gamepad layout covers DualShock, Xbox and Switch controllers, which is
    // what console ports rebind); when the asset is missing the same accessors poll the devices directly. Every accessor
    // is null-safe for headless runs.
    //
    //   Move      WASD / arrows, left stick          Look      mouse, right stick, Z / C
    //   Sprint    Shift, Square / X button           Jump      Space, Triangle / Y button
    //   Interact  E, Cross / A button                Decline   X, Backspace, Circle / B button
    //   Driving   W/S or triggers for gas and brake, A/D or left stick to steer, Shift boost, Space handbrake
    //   Phone     P, Tab, Select                     Chat      T, Enter, D-pad up       Menu / cursor   Esc, Start
    public static class GameInput
    {
        static Keyboard K => Keyboard.current;
        static Mouse M => Mouse.current;
        static Gamepad G => Gamepad.current;
        static InputActionAsset asset; static InputActionMap map; static bool loaded;
        static InputAction move, look, sprint, jump, interact, decline, phone, chat, menu, gas, brake, handbrake;

        public static bool UsingActions { get { Load(); return map != null; } }

        static void Load()
        {
            if (loaded) return; loaded = true;
            asset = Resources.Load<InputActionAsset>("Input/NaijaRise");
            if (asset == null) return;
            map = asset.FindActionMap("Gameplay");
            if (map == null) return;
            move = map.FindAction("Move"); look = map.FindAction("Look"); sprint = map.FindAction("Sprint"); jump = map.FindAction("Jump"); interact = map.FindAction("Interact"); decline = map.FindAction("Decline");
            phone = map.FindAction("Phone"); chat = map.FindAction("Chat"); menu = map.FindAction("Menu"); gas = map.FindAction("Gas"); brake = map.FindAction("Brake"); handbrake = map.FindAction("Handbrake");
            map.Enable();
        }

        public static Vector2 Move
        {
            get
            {
                Load();
                if (move != null) return Vector2.ClampMagnitude(move.ReadValue<Vector2>(), 1f);
                var v = Vector2.zero;
                if (K != null)
                {
                    if (K.aKey.isPressed || K.leftArrowKey.isPressed) v.x -= 1f;
                    if (K.dKey.isPressed || K.rightArrowKey.isPressed) v.x += 1f;
                    if (K.wKey.isPressed || K.upArrowKey.isPressed) v.y += 1f;
                    if (K.sKey.isPressed || K.downArrowKey.isPressed) v.y -= 1f;
                }
                if (G != null && v == Vector2.zero) v = G.leftStick.ReadValue();
                return Vector2.ClampMagnitude(v, 1f);
            }
        }

        // In the legacy "Mouse X" scale (pixels × 0.1); the right stick is folded in at about 120°/s at full tilt.
        public static Vector2 LookDelta
        {
            get
            {
                Load();
                if (look != null)
                {
                    var l = look.ReadValue<Vector2>();
                    bool fromMouse = look.activeControl != null && look.activeControl.device is Mouse;
                    if (fromMouse) return Cursor.lockState == CursorLockMode.Locked ? l : Vector2.zero;
                    return l * new Vector2(34f, 33f) * Time.deltaTime;   // stick: per-second rate
                }
                var d = Vector2.zero;
                if (M != null && Cursor.lockState == CursorLockMode.Locked) d = M.delta.ReadValue() * 0.1f;
                if (G != null) d += G.rightStick.ReadValue() * new Vector2(55f, 40f) * Time.deltaTime;
                return d;
            }
        }

        static bool Pressed(InputAction a, bool fallback) { Load(); return a != null ? a.WasPressedThisFrame() : fallback; }
        static bool Held(InputAction a, bool fallback) { Load(); return a != null ? a.IsPressed() : fallback; }
        static float Axis(InputAction a, float fallback) { Load(); return a != null ? Mathf.Clamp01(a.ReadValue<float>()) : fallback; }

        public static bool LookLeftKey => K != null && K.zKey.isPressed;
        public static bool LookRightKey => K != null && K.cKey.isPressed;
        public static bool Sprint => Held(sprint, (K != null && (K.leftShiftKey.isPressed || K.rightShiftKey.isPressed)) || (G != null && G.buttonWest.isPressed));
        public static bool JumpPressed => Pressed(jump, (K != null && K.spaceKey.wasPressedThisFrame) || (G != null && G.buttonNorth.wasPressedThisFrame));
        public static bool InteractPressed => Pressed(interact, (K != null && K.eKey.wasPressedThisFrame) || (G != null && G.buttonSouth.wasPressedThisFrame));
        public static bool DeclinePressed => Pressed(decline, (K != null && (K.xKey.wasPressedThisFrame || K.backspaceKey.wasPressedThisFrame)) || (G != null && G.buttonEast.wasPressedThisFrame));
        public static bool Handbrake => Held(handbrake, (K != null && K.spaceKey.isPressed) || (G != null && G.buttonEast.isPressed));
        public static float Gas => Mathf.Max(Axis(gas, G != null ? G.rightTrigger.ReadValue() : 0f), Mathf.Max(0f, Move.y));
        public static float Brake => Mathf.Max(Axis(brake, G != null ? G.leftTrigger.ReadValue() : 0f), Mathf.Max(0f, -Move.y));
        public static float Steer => Move.x;
        public static bool EscapePressed => Pressed(menu, (K != null && K.escapeKey.wasPressedThisFrame) || (G != null && G.startButton.wasPressedThisFrame));
        public static bool ClickPressed => M != null && M.leftButton.wasPressedThisFrame;
        public static bool ChatPressed => Pressed(chat, K != null && (K.tKey.wasPressedThisFrame || K.enterKey.wasPressedThisFrame));
        public static bool PhonePressed => Pressed(phone, (K != null && (K.pKey.wasPressedThisFrame || K.tabKey.wasPressedThisFrame)) || (G != null && G.selectButton.wasPressedThisFrame));

        // 1–5 on the keyboard for menu options, 0 when none was pressed this frame.
        public static int DigitPressed
        {
            get
            {
                if (K == null) return 0;
                if (K.digit1Key.wasPressedThisFrame) return 1; if (K.digit2Key.wasPressedThisFrame) return 2; if (K.digit3Key.wasPressedThisFrame) return 3;
                if (K.digit4Key.wasPressedThisFrame) return 4; if (K.digit5Key.wasPressedThisFrame) return 5;
                return 0;
            }
        }
    }
}
