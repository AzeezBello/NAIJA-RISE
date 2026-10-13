using UnityEngine;
using UnityEngine.InputSystem;

namespace NaijaRise
{
    // Input through the Input System package (the legacy Input Manager is deprecated). Keyboard and mouse plus a
    // standard gamepad, polled directly so no actions asset is needed. Every accessor is null-safe for headless runs.
    //
    //   Move      WASD / arrows, left stick          Look      mouse, right stick, Z / C
    //   Sprint    Shift, Square / X button           Jump      Space, Triangle / Y button
    //   Interact  E, Cross / A button                Decline   X, Backspace, Circle / B button
    //   Driving   W/S or triggers for gas and brake, A/D or left stick to steer, Shift boost, Space handbrake
    //   Escape / Start frees or locks the cursor
    public static class GameInput
    {
        static Keyboard K => Keyboard.current;
        static Mouse M => Mouse.current;
        static Gamepad G => Gamepad.current;

        public static Vector2 Move
        {
            get
            {
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
                var d = Vector2.zero;
                if (M != null && Cursor.lockState == CursorLockMode.Locked) d = M.delta.ReadValue() * 0.1f;
                if (G != null) d += G.rightStick.ReadValue() * new Vector2(55f, 40f) * Time.deltaTime;
                return d;
            }
        }

        public static bool LookLeftKey => K != null && K.zKey.isPressed;
        public static bool LookRightKey => K != null && K.cKey.isPressed;
        public static bool Sprint => (K != null && (K.leftShiftKey.isPressed || K.rightShiftKey.isPressed)) || (G != null && G.buttonWest.isPressed);
        public static bool JumpPressed => (K != null && K.spaceKey.wasPressedThisFrame) || (G != null && G.buttonNorth.wasPressedThisFrame);
        public static bool InteractPressed => (K != null && K.eKey.wasPressedThisFrame) || (G != null && G.buttonSouth.wasPressedThisFrame);
        public static bool DeclinePressed => (K != null && (K.xKey.wasPressedThisFrame || K.backspaceKey.wasPressedThisFrame)) || (G != null && G.buttonEast.wasPressedThisFrame);
        public static bool Handbrake => (K != null && K.spaceKey.isPressed) || (G != null && G.buttonEast.isPressed);
        public static float Gas => Mathf.Max(Mathf.Max(0f, Move.y), G != null ? G.rightTrigger.ReadValue() : 0f);
        public static float Brake => Mathf.Max(Mathf.Max(0f, -Move.y), G != null ? G.leftTrigger.ReadValue() : 0f);
        public static float Steer => Move.x;
        public static bool EscapePressed => (K != null && K.escapeKey.wasPressedThisFrame) || (G != null && G.startButton.wasPressedThisFrame);
        public static bool ClickPressed => M != null && M.leftButton.wasPressedThisFrame;
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
