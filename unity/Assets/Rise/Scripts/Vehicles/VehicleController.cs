using UnityEngine;
using Rise.Data;

namespace Rise.Vehicles
{
    // Arcade driving model: approach-based speed with class max / boost / accel,
    // braking, slow reverse, handbrake, steering that firms up with speed and loosens as condition drops.
    // The Rigidbody carries the vehicle so bridge ramps, kerbs and buildings behave; rotation is driven by code.
    public class VehicleController : MonoBehaviour
    {
        [System.NonSerialized] public VehicleClassData Class;
        public float Speed;                 // m/s, negative when reversing
        public float Condition = 100f;      // 0–100, crashes wear it down
        public bool Driven;
        [System.NonSerialized] public float Wet = 1f;   // 0.7 in the rain: less grip, weaker brakes
        [System.NonSerialized] public bool Insured;     // half crash damage
        TextMesh slogan;
        public bool Owned;
        [System.NonSerialized] public string OwnedId;
        public Transform[] Wheels;
        public float LastImpact;            // m/s lost in the last crash, read and cleared by the session
        [System.NonSerialized] public string LastHit;   // what the last crash was against (diagnostics)

        Rigidbody rb;
        float yaw, doorAnimT;
        Transform occRoot, driverOcc, passengersOcc, doorPivot;

        public bool HasDriver => driverOcc != null && driverOcc.gameObject.activeSelf && driverOcc.childCount > 0;
        public int PassengerCount => passengersOcc != null && passengersOcc.gameObject.activeSelf ? passengersOcc.childCount : 0;

        public void Setup(VehicleClassData cls, Transform[] wheels)
        {
            Class = cls; Wheels = wheels;
            yaw = transform.eulerAngles.y;
            rb = GetComponent<Rigidbody>();
            if (rb == null) rb = gameObject.AddComponent<Rigidbody>();   // Unity's fake-null objects defeat ??
            rb.mass = Mathf.Max(300f, cls.len * cls.wid * 120f);
            rb.constraints = RigidbodyConstraints.FreezeRotation;
            rb.interpolation = RigidbodyInterpolation.Interpolate;
            rb.collisionDetectionMode = CollisionDetectionMode.ContinuousSpeculative;
            rb.linearDamping = 0.2f;
            rb.isKinematic = true;          // parked until someone drives it
            occRoot = transform.Find("Occupants");
            doorPivot = transform.Find("DoorPivot");
            if (occRoot != null)
            {
                driverOcc = occRoot.Find("Driver");
                passengersOcc = occRoot.Find("Passengers");
            }
            SetOccupants(false, false);     // parked vehicles have no driver inside until entered
        }

        public void TriggerDoorSwing() => doorAnimT = 0.85f;

        public void SetOccupants(bool showDriver, bool showPassengers)
        {
            if (driverOcc != null) driverOcc.gameObject.SetActive(showDriver);
            if (passengersOcc != null) passengersOcc.gameObject.SetActive(showPassengers);
        }

        public void StyleDriver(Color skin, Color top)
        {
            if (driverOcc == null) return;
            foreach (var r in driverOcc.GetComponentsInChildren<MeshRenderer>(true))
            {
                if (r.name == "Head" || r.name == "WindowArm") r.material.color = skin;
                else if (r.name == "Torso" || r.name == "TorsoWindow") r.material.color = top;
            }
        }

        // Move a vehicle: the Rigidbody (interpolated) keeps its own pose, so the transform alone is not enough.
        public void Place(Vector3 position, Quaternion rotation)
        {
            transform.SetPositionAndRotation(position, rotation);
            if (rb != null) { rb.position = position; rb.rotation = rotation; if (!rb.isKinematic) { rb.linearVelocity = Vector3.zero; rb.angularVelocity = Vector3.zero; } }   // kinematic (parked) bodies have no velocity to clear
            yaw = rotation.eulerAngles.y;
            Physics.SyncTransforms();
        }

        public void SetDriven(bool driven)
        {
            Driven = driven;
            rb.isKinematic = !driven;
            if (!driven) Speed = 0f;
            yaw = transform.eulerAngles.y;
            SetOccupants(driven, false);
            TriggerDoorSwing();
        }

        void Update()
        {
            if (doorPivot == null) return;
            if (doorAnimT > 0f)
            {
                doorAnimT = Mathf.Max(0f, doorAnimT - Time.deltaTime);
                float phase = 1f - (doorAnimT / 0.85f);
                float open = Mathf.Sin(phase * Mathf.PI);
                doorPivot.localRotation = Quaternion.Euler(0f, -open * 54f, 0f);
            }
            else if (doorPivot.localRotation != Quaternion.identity)
            {
                doorPivot.localRotation = Quaternion.identity;
            }
        }

        // gas / brake 0–1, steer -1 (left) … 1 (right)
        public void Drive(float gas, float brake, bool boost, bool handbrake, float steer, float fuel01, float dt)
        {
            float maxF = (boost ? Class.boost : Class.max) * (fuel01 > 0f ? 1f : 0.2f) * (Condition < 30f ? 0.5f : 1f) * Wet;
            if (handbrake) Speed = Mathf.MoveTowards(Speed, 0f, 45f * dt);
            else if (gas > 0.05f) Speed = Mathf.Min(maxF, Speed + (Speed < 0f ? 30f : boost ? Class.accel * 1.3f : Class.accel) * gas * dt);
            else if (brake > 0.05f) Speed = Speed > 0.5f ? Mathf.Max(0f, Speed - 28f * Wet * brake * dt) : Mathf.Max(-7f, Speed - 10f * brake * dt);
            else Speed = Mathf.MoveTowards(Speed, 0f, 6f * dt);

            if (Mathf.Abs(Speed) > 0.3f)
                yaw += steer * 2.3f * Wet * Mathf.Rad2Deg * (0.6f + 0.4f * Condition / 100f) * Mathf.Min(1f, Mathf.Abs(Speed) / 9f) * dt * Mathf.Sign(Speed);

            if (Wheels != null) foreach (var w in Wheels) VehicleBodies.Spin(w, Speed * dt * 120f);
        }

        void FixedUpdate()
        {
            if (!Driven || rb == null || rb.isKinematic) return;
            var v = transform.forward * Speed;
            v.y = rb.linearVelocity.y;
            rb.linearVelocity = v;
            rb.MoveRotation(Quaternion.Euler(0f, yaw, 0f));
        }

        void OnCollisionEnter(Collision c)
        {
            if (!Driven || c.contactCount == 0) return;
            // Ground contacts (road, bridge deck, kerb top) are not crashes: ignore road/bridge surfaces and low wheel-level
            // contacts, and only count horizontal impacts above bumper height.
            string hitName = c.gameObject.name;
            if (hitName == "Deck" || hitName == "Carriageway" || hitName == "Ground" || hitName == "Pavement") return;
            var contact = c.GetContact(0);
            if (contact.point.y < transform.position.y + 0.45f) return;
            var n = contact.normal;
            if (Mathf.Abs(n.y) > 0.5f) return;
            float square = Mathf.Abs(Vector3.Dot(n, transform.forward));   // 1 head-on, 0 side scrape
            float closing = Mathf.Abs(Vector3.Dot(c.relativeVelocity, n));
            if (closing < 3.5f) return;
            float lost = Mathf.Abs(Speed) * Mathf.Clamp(0.15f + 0.75f * square, 0f, 0.9f);
            Speed -= Mathf.Sign(Speed) * lost;
            Condition = Mathf.Max(0f, Condition - lost * 1.2f * (Insured ? 0.5f : 1f));
            LastImpact = lost;
            LastHit = $"{hitName} n={n} closing={closing:0.0} square={square:0.00} at {contact.point}";
        }

        public float Kmh => Mathf.Abs(Speed) * 3.6f;

        // Repaint: the body of a procedural vehicle, or every painted part of a model (wheels, glass and occupants stay).
        public void ApplyLivery(Color c)
        {
            foreach (var r in GetComponentsInChildren<MeshRenderer>())
            {
                if (r.name.StartsWith("wheel") || r.GetComponent<TextMesh>() != null) continue;
                if (occRoot != null && r.transform.IsChildOf(occRoot)) continue;
                var mats = r.materials;
                foreach (var m in mats) { if (m.name.Contains("1a2530") || m.color == new Color(0.1f, 0.145f, 0.19f)) continue; if (m.HasProperty("baseColorFactor")) m.SetColor("baseColorFactor", c); else m.color = c; }
            }
        }

        // A danfo slogan painted above the windscreen.
        public void ApplySlogan(string text)
        {
            if (slogan == null)
            {
                var font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
                var go = new GameObject("Slogan"); go.transform.SetParent(transform, false);
                float roof = GetComponent<VehicleModelInfo>() != null ? GetComponent<VehicleModelInfo>().Height : 2.1f; go.transform.localPosition = new Vector3(0f, roof + 0.45f, 0f); go.transform.localRotation = Quaternion.identity;
                slogan = go.AddComponent<TextMesh>(); slogan.font = font; slogan.fontSize = 56; slogan.characterSize = 0.05f; slogan.fontStyle = FontStyle.Bold; slogan.anchor = TextAnchor.MiddleCenter; slogan.alignment = TextAlignment.Center; slogan.color = new Color(0.03f, 0.06f, 0.05f);
                go.GetComponent<MeshRenderer>().sharedMaterial = font.material;
                var board = GameObject.CreatePrimitive(PrimitiveType.Cube); board.name = "Slogan board"; Destroy(board.GetComponent<Collider>()); board.transform.SetParent(transform, false); board.transform.localPosition = new Vector3(0f, roof + 0.45f, 0.05f); board.transform.localScale = new Vector3(2.1f, 0.4f, 0.05f);
                board.GetComponent<MeshRenderer>().sharedMaterial = VehicleBodies.Mat("#f5c518", 0.5f);
            }
            slogan.text = text;
        }
    }
}
