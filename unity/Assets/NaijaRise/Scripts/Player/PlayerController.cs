using UnityEngine;

namespace NaijaRise.Player
{
    // Third-person character: camera-relative movement with ease-in acceleration, sprint, jump and gravity through a
    // CharacterController so kerbs, pavements and bridge decks are walked naturally. Keyboard and gamepad (legacy Input).
    [RequireComponent(typeof(CharacterController))]
    public class PlayerController : MonoBehaviour
    {
        public float WalkSpeed = 4.6f, RunSpeed = 8.6f, Acceleration = 14f, TurnSpeed = 720f, JumpSpeed = 7.2f, Gravity = -24f;
        public Transform CameraTransform;
        public const int Layer = 8;

        public float Speed01 { get; private set; }   // 0 idle … 1 full sprint, for camera FOV and animation later
        public bool IsRunning { get; private set; }
        public bool IsGrounded => cc.isGrounded;

        CharacterController cc;
        Vector3 spawn, velocity;
        float speed;

        public static PlayerController Create(Vector3 position)
        {
            var go = new GameObject("Player") { layer = Layer };
            go.transform.position = position;
            var cc = go.AddComponent<CharacterController>();
            cc.height = 1.8f; cc.radius = 0.38f; cc.center = new Vector3(0, 0.9f, 0); cc.stepOffset = 0.45f; cc.slopeLimit = 50f; cc.skinWidth = 0.04f;
            var pc = go.AddComponent<PlayerController>();
            pc.spawn = position;
            pc.BuildBody();
            return pc;
        }

        // Placeholder body until a rigged character (Ready Player Me / Mixamo FBX) is dropped in: ankara top, dark trousers, fila.
        void BuildBody()
        {
            var std = Shader.Find("Standard");
            Material M(string hex) { var m = new Material(std); ColorUtility.TryParseHtmlString(hex, out var c); m.color = c; return m; }
            void Part(PrimitiveType type, Vector3 pos, Vector3 scale, Material m)
            {
                var p = GameObject.CreatePrimitive(type);
                p.layer = Layer; p.transform.SetParent(transform, false); p.transform.localPosition = pos; p.transform.localScale = scale;
                p.GetComponent<MeshRenderer>().sharedMaterial = m;
                Destroy(p.GetComponent<Collider>());
            }
            Part(PrimitiveType.Capsule, new Vector3(0, 0.5f, 0), new Vector3(0.44f, 0.5f, 0.44f), M("#2b2b33"));          // trousers
            Part(PrimitiveType.Capsule, new Vector3(0, 1.15f, 0), new Vector3(0.56f, 0.38f, 0.42f), M("#d9542b"));        // ankara top
            Part(PrimitiveType.Sphere, new Vector3(0, 1.66f, 0), new Vector3(0.3f, 0.32f, 0.3f), M("#6b4423"));            // head
            Part(PrimitiveType.Cylinder, new Vector3(0, 1.84f, 0), new Vector3(0.28f, 0.05f, 0.28f), M("#1f3a5f"));        // fila
            Part(PrimitiveType.Capsule, new Vector3(-0.36f, 1.12f, 0), new Vector3(0.14f, 0.34f, 0.14f), M("#6b4423"));   // arms
            Part(PrimitiveType.Capsule, new Vector3(0.36f, 1.12f, 0), new Vector3(0.14f, 0.34f, 0.14f), M("#6b4423"));
        }

        void Awake() { cc = GetComponent<CharacterController>(); }

        void Update()
        {
            float h = Input.GetAxisRaw("Horizontal"), v = Input.GetAxisRaw("Vertical");
            var input = Vector2.ClampMagnitude(new Vector2(h, v), 1f);
            Vector3 fwd = Vector3.forward, right = Vector3.right;
            if (CameraTransform != null)
            {
                fwd = Vector3.ProjectOnPlane(CameraTransform.forward, Vector3.up).normalized;
                right = Vector3.Cross(Vector3.up, fwd);
            }
            var dir = (fwd * input.y + right * input.x);
            IsRunning = input.sqrMagnitude > 0.01f && (Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift) || Input.GetKey(KeyCode.JoystickButton2));
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
                if (Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.JoystickButton1)) velocity.y = JumpSpeed;
            }
            velocity.y += Gravity * Time.deltaTime;
            cc.Move((horizontal + Vector3.up * velocity.y) * Time.deltaTime);

            if (transform.position.y < -40f) { cc.enabled = false; transform.position = spawn; velocity = Vector3.zero; cc.enabled = true; }
        }
    }
}
