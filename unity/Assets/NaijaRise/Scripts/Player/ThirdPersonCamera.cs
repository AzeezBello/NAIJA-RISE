using UnityEngine;

namespace NaijaRise.Player
{
    // Follows the player with a little lag, eased look-at, mouse / Q-E orbit, occlusion pull-in that eases back out,
    // and a wider field of view when sprinting: the feel described in README "Camera and controller feel".
    public class ThirdPersonCamera : MonoBehaviour
    {
        public Transform Target;
        public PlayerController Player;
        public float Distance = 6.8f, Height = 1.9f, Yaw = 180f, Pitch = 14f;
        public float MouseSensitivity = 2.2f, KeyYawSpeed = 110f, BaseFov = 60f, SprintFov = 69f;

        Camera cam;
        Vector3 posVelocity, lookPoint;
        float currentDistance;
        bool lookPointReady;

        void Awake()
        {
            cam = GetComponent<Camera>();
            currentDistance = Distance;
            Cursor.lockState = CursorLockMode.Locked;
            Cursor.visible = false;
        }

        void Update()
        {
            if (Input.GetKeyDown(KeyCode.Escape)) { bool locked = Cursor.lockState == CursorLockMode.Locked; Cursor.lockState = locked ? CursorLockMode.None : CursorLockMode.Locked; Cursor.visible = locked; }
            if (Cursor.lockState != CursorLockMode.Locked && Input.GetMouseButtonDown(0)) { Cursor.lockState = CursorLockMode.Locked; Cursor.visible = false; }
        }

        void LateUpdate()
        {
            if (Target == null) return;
            if (Cursor.lockState == CursorLockMode.Locked)
            {
                Yaw += Input.GetAxis("Mouse X") * MouseSensitivity;
                Pitch -= Input.GetAxis("Mouse Y") * MouseSensitivity * 0.8f;
            }
            if (Input.GetKey(KeyCode.Q)) Yaw -= KeyYawSpeed * Time.deltaTime;
            if (Input.GetKey(KeyCode.E)) Yaw += KeyYawSpeed * Time.deltaTime;
            Pitch = Mathf.Clamp(Pitch, -18f, 62f);

            var pivot = Target.position + Vector3.up * Height;
            var rot = Quaternion.Euler(Pitch, Yaw, 0f);
            var back = rot * Vector3.back;

            // Occlusion: pull in quickly when something is between the pivot and the camera, ease back out.
            float wanted = Distance;
            int mask = ~(1 << PlayerController.Layer);
            if (Physics.SphereCast(pivot, 0.3f, back, out var hit, Distance, mask, QueryTriggerInteraction.Ignore)) wanted = Mathf.Max(1.2f, hit.distance - 0.15f);
            currentDistance = wanted < currentDistance ? Mathf.Lerp(currentDistance, wanted, 1f - Mathf.Exp(-22f * Time.deltaTime)) : Mathf.Lerp(currentDistance, wanted, 1f - Mathf.Exp(-3.5f * Time.deltaTime));

            var desired = pivot + back * currentDistance;
            transform.position = Vector3.SmoothDamp(transform.position, desired, ref posVelocity, 0.07f);

            if (!lookPointReady) { lookPoint = pivot; lookPointReady = true; }
            lookPoint = Vector3.Lerp(lookPoint, pivot, 1f - Mathf.Exp(-12f * Time.deltaTime));
            transform.rotation = Quaternion.LookRotation(lookPoint - transform.position, Vector3.up);

            if (cam != null && Player != null) cam.fieldOfView = Mathf.Lerp(cam.fieldOfView, Mathf.Lerp(BaseFov, SprintFov, Player.IsRunning ? Player.Speed01 : 0f), 1f - Mathf.Exp(-4f * Time.deltaTime));
        }
    }
}
