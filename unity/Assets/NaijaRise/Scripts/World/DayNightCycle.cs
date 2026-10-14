using UnityEngine;

namespace NaijaRise.World
{
    // Game clock (one game hour per 45 real seconds by default, a new game starts at 08:30) driving the sun, ambient
    // light, fog and the street-lamp glow. Natural Lagos light: warm low sun, neutral noon, moonlit night.
    public class DayNightCycle : MonoBehaviour
    {
        public float Clock = 8.5f;          // hours, 0–24
        public int Day = 1;
        public float HoursPerSecond = 1f / 45f;

        Light sun;
        Material lampHead;
        [System.NonSerialized] public Weather Weather;
        [System.NonSerialized] public Events Events;
        static readonly Color NightAmbient = new Color(0.10f, 0.12f, 0.20f), DayAmbient = new Color(0.56f, 0.58f, 0.62f);
        static readonly Color NightFog = new Color(0.07f, 0.09f, 0.14f), DayFog = new Color(0.78f, 0.80f, 0.82f);
        static readonly Color LowSun = new Color(1f, 0.62f, 0.36f), NoonSun = new Color(1f, 0.97f, 0.92f), Moon = new Color(0.55f, 0.65f, 0.9f);

        public float SunElevation01 { get; private set; }   // -1 midnight … 1 noon
        public bool IsNight => SunElevation01 < 0.05f;
        public string ClockText => $"{Mathf.FloorToInt(Clock):00}:{Mathf.FloorToInt((Clock % 1f) * 60f):00}";

        public void Init(Light sunLight, float startClock, float hoursPerSecond, Material lamp)
        {
            sun = sunLight; Clock = startClock; HoursPerSecond = hoursPerSecond; lampHead = lamp;
            RenderSettings.sun = sun;
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
            RenderSettings.fog = true;
            RenderSettings.fogMode = FogMode.ExponentialSquared;
            RenderSettings.fogDensity = 0.0022f;
            sun.shadows = LightShadows.Soft;
            sun.shadowStrength = 0.85f;
            if (UnityEngine.Rendering.GraphicsSettings.currentRenderPipeline is UnityEngine.Rendering.Universal.UniversalRenderPipelineAsset urp) urp.shadowDistance = 160f;
            Apply();
        }

        void Update() => Advance(Time.deltaTime * HoursPerSecond);

        public void SetTime(float clock, int day) { Clock = Mathf.Repeat(clock, 24f); Day = day; Apply(); }

        // Move the clock forward by game hours (a shift, sleep, a danfo ride), rolling the day over.
        public void Advance(float hours)
        {
            Clock += hours;
            while (Clock >= 24f) { Clock -= 24f; Day++; }
            Apply();
        }

        void Apply()
        {
            if (sun == null) return;
            float e = Mathf.Sin((Clock - 6f) / 24f * Mathf.PI * 2f);   // 0 at 06:00, 1 at noon, 0 at 18:00, -1 at midnight
            SunElevation01 = e;
            float sunAngle = (Clock / 24f) * 360f - 90f;
            sun.transform.rotation = Quaternion.Euler(sunAngle, 38f, 0f);
            float dayAmount = Mathf.Clamp01(e * 1.6f);
            if (e > 0f)
            {
                sun.color = Color.Lerp(LowSun, NoonSun, Mathf.Clamp01(e * 2.2f));
                sun.intensity = Mathf.Lerp(0.25f, 1.35f, dayAmount);
            }
            else
            {
                // Moonlight from the opposite side of the sky so the night still has shape.
                sun.transform.rotation = Quaternion.Euler(sunAngle + 180f, 38f, 0f);
                sun.color = Moon;
                sun.intensity = 0.16f;
            }
            float t = Mathf.Clamp01(e * 1.4f + 0.15f);
            var ambient = Color.Lerp(NightAmbient, DayAmbient, t); var fog = Color.Lerp(NightFog, DayFog, t); float density = 0.0022f, intensity = sun.intensity;
            if (Weather != null) Weather.Grade(ref ambient, ref fog, ref density, ref intensity);
            RenderSettings.ambientLight = ambient; RenderSettings.fogColor = fog; RenderSettings.fogDensity = density; sun.intensity = intensity;
            if (lampHead != null) lampHead.SetColor("_EmissionColor", Events != null && Events.Outage > 0f ? Color.black : Color.Lerp(new Color(1f, 0.72f, 0.3f) * 2.4f, Color.black, Mathf.Clamp01(e * 3f + 0.3f)));
        }
    }
}
