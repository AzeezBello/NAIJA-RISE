using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace Rise.World
{
    // Graphics compatibility: three levels, "auto" picks one from the GPU and then steps down
    // whenever frames stay slow; dynamic resolution moves URP's render scale in four steps with hysteresis, steps back up
    // after sustained fast frames (needing longer each time a recovery fails), and gives up shrinking when it buys
    // nothing (CPU-bound or a capped display). Also owns the environment reflection probe that follows the player.
    public class QualityGovernor : MonoBehaviour
    {
        public static readonly string[] Names = { "Low", "Medium", "High" };
        static readonly float[] ScaleCap = { 0.75f, 0.9f, 1f };
        static readonly float[] ShadowRange = { 60f, 120f, 160f };
        static readonly float[] DynSteps = { 1f, 0.85f, 0.7f, 0.55f };

        public int Level { get; private set; } = 2;
        public bool Auto = true;
        public int DynIndex { get; private set; }
        public float Ema { get; private set; } = 1f / 60f;
        public float Fps => Ema > 0f ? 1f / Ema : 0f;
        public float RenderScale => ScaleCap[Level] * DynSteps[DynIndex];
        [System.NonSerialized] public System.Action<string> Notify;
        public ReflectionProbe Probe { get; private set; }

        float tick, fastT; int slowTicks, fastTicks, recoverTicks = 5; float streakBase; float noGainUntil, levelLockUntil; float probeT; int probeHour = -1;
        Transform follow; DayNightCycle clock; bool cinematic = true;
        [System.NonSerialized] public bool SimulateSlow;   // test hook: pretend every frame is slow

        public static int Detect()
        {
            if (GameBootstrap.Mobile) return 0;
            string gpu = (SystemInfo.graphicsDeviceName ?? "").ToLower();
            if (SystemInfo.graphicsDeviceType == GraphicsDeviceType.Null || SystemInfo.graphicsMemorySize > 0 && SystemInfo.graphicsMemorySize < 1024) return 0;
            if (gpu.Contains("apple m") || gpu.Contains("apple gpu") || gpu.Contains("nvidia") || gpu.Contains("geforce") || gpu.Contains("rtx") || gpu.Contains("radeon") || gpu.Contains("amd")) return 2;
            return 1;
        }

        public void Init(int savedLevel, bool auto, bool cinematicLook, Transform playerTransform, DayNightCycle dayNight)
        {
            Auto = auto; cinematic = cinematicLook; follow = playerTransform; clock = dayNight;
            Level = Auto ? Detect() : Mathf.Clamp(savedLevel, 0, 2);
            Apply();
            if (!GameBootstrap.Mobile && SystemInfo.graphicsDeviceType != GraphicsDeviceType.Null && !DiagFlags.Has("noprobe"))
            {
                var go = new GameObject("Environment probe"); go.transform.SetParent(transform, false);
                Probe = go.AddComponent<ReflectionProbe>();
                Probe.mode = ReflectionProbeMode.Realtime; Probe.refreshMode = ReflectionProbeRefreshMode.ViaScripting; Probe.timeSlicingMode = ReflectionProbeTimeSlicingMode.AllFacesAtOnce;
                Probe.resolution = 128; Probe.size = new Vector3(600f, 200f, 600f); Probe.boxProjection = false; Probe.farClipPlane = 400f; Probe.hdr = true;
                Probe.cullingMask = ~(1 << Player.PlayerController.Layer);
                RenderSettings.defaultReflectionMode = DefaultReflectionMode.Custom;
            }
        }

        public void SetLevel(int level, bool auto) { Auto = auto; Level = Mathf.Clamp(level, 0, 2); DynIndex = 0; slowTicks = 0; fastTicks = 0; noGainUntil = 0f; levelLockUntil = 0f; Apply(); }
        public void SetCinematic(bool on) { cinematic = on; Apply(); }

        void Apply()
        {
            if (GraphicsSettings.currentRenderPipeline is UniversalRenderPipelineAsset urp)
            {
                urp.renderScale = RenderScale;
                urp.shadowDistance = ShadowRange[Level];
                urp.supportsHDR = Level > 0 && cinematic && !DiagFlags.Has("nohdr");
            }
            bool post = cinematic && Level > 0 && !DiagFlags.Has("nopost");
            var volume = GetComponent<Volume>(); if (volume != null) volume.enabled = post;
            var cam = UnityEngine.Camera.main;
            if (cam != null) { var cd = cam.GetComponent<UniversalAdditionalCameraData>(); if (cd != null) { cd.renderPostProcessing = post; cd.antialiasing = Level == 2 ? AntialiasingMode.FastApproximateAntialiasing : AntialiasingMode.None; } }
            QualitySettings.shadows = Level == 0 ? UnityEngine.ShadowQuality.Disable : UnityEngine.ShadowQuality.All;
        }

        void Update()
        {
            float dt = Time.unscaledDeltaTime;
            Ema = Mathf.Lerp(Ema, SimulateSlow ? 0.05f : dt, 0.08f);
            tick += dt;
            if (tick >= 0.6f) { tick = 0f; Evaluate(); }

            // Reflections: re-render the probe when the hour changes or every 20 s as the player moves.
            if (Probe != null && follow != null)
            {
                probeT -= dt; int hour = clock != null ? Mathf.FloorToInt(clock.Clock) : 0;
                if (probeT <= 0f || hour != probeHour) { probeT = 20f; probeHour = hour; Probe.transform.position = follow.position + Vector3.up * 6f; Probe.RenderProbe(); }
            }
        }

        void Evaluate()
        {
            bool slow = Ema > 1f / 48f, fast = Ema < 1f / 75f;
            slowTicks = slow ? slowTicks + 1 : 0; fastTicks = fast ? fastTicks + 1 : 0;
            if (slowTicks >= 3)
            {
                slowTicks = 0;
                bool locked = Time.unscaledTime < noGainUntil;   // a shrink that bought nothing: CPU-bound or a capped display
                if (!locked && DynIndex < DynSteps.Length - 1)
                {
                    if (DynIndex == 0) streakBase = Ema;
                    DynIndex++; Apply();
                    if (DynIndex == DynSteps.Length - 1 && Ema > streakBase * 0.92f) noGainUntil = Time.unscaledTime + 60f;
                }
                else if (Auto && Level > 0 && Time.unscaledTime >= levelLockUntil)
                {
                    // Shrinking alone is not enough: drop a level (shadows, post-processing, scale cap), then wait before dropping again.
                    Level--; DynIndex = 0; levelLockUntil = Time.unscaledTime + 20f; Apply();
                    Notify?.Invoke($"Graphics stepped down to {Names[Level]} to keep the frame rate up");
                }
            }
            if (fastTicks >= recoverTicks && DynIndex > 0)
            {
                fastTicks = 0; float before = Ema; DynIndex--; Apply();
                // If the next evaluation is slow again, wait twice as long before trying.
                recoverTicks = Ema > before * 1.1f ? Mathf.Min(40, recoverTicks * 2) : 5;
            }
        }
    }
}
