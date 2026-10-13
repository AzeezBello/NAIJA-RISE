using UnityEngine;
using NaijaRise.Entities;

namespace NaijaRise.Player
{
    // Third-person character: camera-relative movement with ease-in acceleration, sprint, jump and gravity through a
    // CharacterController so kerbs, pavements and bridge decks are walked naturally. Keyboard and gamepad (legacy Input).
    [RequireComponent(typeof(CharacterController))]
    public class PlayerController : MonoBehaviour
    {
        public float WalkSpeed = 4.6f, RunSpeed = 8.5f, Acceleration = 14f, TurnSpeed = 720f, JumpSpeed = 7.2f, Gravity = -24f;
        public Transform CameraTransform;
        public bool InputEnabled = true, CanSprint = true;
        public const int Layer = 8;

        public float Speed01 { get; private set; }   // 0 idle … 1 full sprint, for camera FOV and animation later
        public bool IsRunning { get; private set; }
        public bool IsGrounded => cc.isGrounded;

        CharacterController cc;
        Vector3 spawn, velocity;
        float speed;

        public static PlayerController Create(Vector3 position, float yaw)
        {
            var go = new GameObject("Player") { layer = Layer };
            go.transform.position = position;
            go.transform.rotation = Quaternion.Euler(0, yaw, 0);
            var cc = go.AddComponent<CharacterController>();
            cc.height = 1.8f; cc.radius = 0.38f; cc.center = new Vector3(0, 0.9f, 0); cc.stepOffset = 0.45f; cc.slopeLimit = 50f; cc.skinWidth = 0.04f;
            var pc = go.AddComponent<PlayerController>();
            pc.spawn = position;
            // Placeholder body until a rigged character arrives: ankara top, dark trousers, fila (the default look).
            Mannequin.Build(go.transform, Mannequin.Hex("#e07b1a"), Mannequin.Hex("#26312d"), Mannequin.Hex("#8a5a3c"), Mannequin.Hex("#1f3a5f"), Layer);
            return pc;
        }

        void Awake() { cc = GetComponent<CharacterController>(); }

        public void Teleport(Vector3 position, float yaw)
        {
            bool wasEnabled = cc.enabled; cc.enabled = false;
            transform.position = position; transform.rotation = Quaternion.Euler(0, yaw, 0);
            velocity = Vector3.zero; speed = 0f;
            cc.enabled = wasEnabled;
        }

        void Update()
        {
            var input = InputEnabled ? GameInput.Move : Vector2.zero;
            Vector3 fwd = Vector3.forward, right = Vector3.right;
            if (CameraTransform != null)
            {
                fwd = Vector3.ProjectOnPlane(CameraTransform.forward, Vector3.up).normalized;
                right = Vector3.Cross(Vector3.up, fwd);
            }
            var dir = (fwd * input.y + right * input.x);
            IsRunning = CanSprint && input.sqrMagnitude > 0.01f && GameInput.Sprint;
            float target = input.magnitude * (IsRunning ? RunSpeed : WalkSpeed);
            speed = Mathf.MoveTowards(speed, target, Acceleration * Time.deltaTime * (target < speed ? 1.8f : 1f));
            Speed01 = Mathf.InverseLerp(0f, RunSpeed, speed);

            if (dir.sqrMagnitude > 0.001f)
            {
                var look = Quaternion.LookRotation(dir.normalized, Vector3.up);
                transform.rotation = Quaternion.RotateTowards(transform.rotation, look, TurnSpeed * Time.deltaTime);
            }
            var horizontal = (dir.sqrMagnitude > 0.001f ? dir.normalized : transform.forward) * speed;

            if (cc.isGrounded)
            {
                if (velocity.y < 0f) velocity.y = -2f;
                if (InputEnabled && GameInput.JumpPressed) velocity.y = JumpSpeed;
            }
            velocity.y += Gravity * Time.deltaTime;
            cc.Move((horizontal + Vector3.up * velocity.y) * Time.deltaTime);

            if (transform.position.y < -40f) Teleport(spawn, transform.eulerAngles.y);
        }
    }
}
