using UnityEngine;
using Rise.Data;

namespace Rise.World
{
    // Rain: a 15 % chance every minute of 2–5 minutes of rain with a particle curtain around
    // the camera, darker light, wet roads (less grip) and slower traffic; a storm floods nothing yet. Harmattan haze on
    // days 7–9 of every ten.
    public class Weather : MonoBehaviour
    {
        WorldData data; DayNightCycle clock; Transform follow;
        ParticleSystem rain;
        float rainLeft, nextCheck = 60f;
        public bool Raining => rainLeft > 0f;
        public bool Storm { get; private set; }
        public bool Harmattan => clock != null && clock.Day % 10 >= 7;
        public float Wet => Raining ? 0.7f : 1f;   // grip factor for driving
        [System.NonSerialized] public System.Action<string> Notify;
        [System.NonSerialized] public System.Action<bool> OnWet;

        public void Init(WorldData world, DayNightCycle dayNight, Transform cameraTransform)
        {
            data = world; clock = dayNight; follow = cameraTransform;
            var go = new GameObject("Rain"); go.transform.SetParent(transform, false);
            rain = go.AddComponent<ParticleSystem>();
            var main = rain.main; main.loop = true; main.startLifetime = 1.4f; main.startSpeed = 0f; main.startSize = new ParticleSystem.MinMaxCurve(0.012f, 0.022f); main.maxParticles = 2400; main.startColor = new Color(0.78f, 0.85f, 0.92f, 0.4f); main.gravityModifier = 2.6f; main.simulationSpace = ParticleSystemSimulationSpace.World; main.playOnAwake = false;
            var emission = rain.emission; emission.rateOverTime = 1500f;
            var shape = rain.shape; shape.shapeType = ParticleSystemShapeType.Box; shape.scale = new Vector3(80f, 1f, 80f); shape.position = new Vector3(0f, 22f, 0f);
            var r = rain.GetComponent<ParticleSystemRenderer>(); r.renderMode = ParticleSystemRenderMode.Stretch; r.lengthScale = 22f; r.velocityScale = 0.018f;
            var shader = ShaderLib.ParticlesUnlit; if (shader == null) shader = ShaderLib.Unlit;
            r.sharedMaterial = new Material(shader) { color = new Color(0.78f, 0.85f, 0.92f, 0.4f) };
            r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            rain.Stop();
        }

        public void StartRain(float minutes, bool storm)
        {
            rainLeft = minutes * 60f; Storm = storm;
            rain.Play(); OnWet?.Invoke(true);
            Notify?.Invoke(storm ? "Storm! Roads slippery — go-slow everywhere." : "Rain don start — roads slippery, go-slow everywhere.");
        }

        public void StopRain() { rainLeft = 0f; Storm = false; rain.Stop(); OnWet?.Invoke(false); Notify?.Invoke("Rain don stop."); }

        void Update()
        {
            float dt = Time.deltaTime;
            if (Raining)
            {
                rainLeft -= dt; if (rainLeft <= 0f) { StopRain(); return; }
                if (follow != null) rain.transform.position = new Vector3(follow.position.x, follow.position.y, follow.position.z);
            }
            else
            {
                nextCheck -= dt;
                if (nextCheck <= 0f) { nextCheck = 60f; if (Random.value < data.weather.rainChance) StartRain(Random.Range(data.weather.rainMinMinutes, data.weather.rainMaxMinutes), Random.value < 0.35f); }
            }
        }

        // Light and fog adjustments the clock applies on top of its own: rain darkens, harmattan hazes and warms.
        public void Grade(ref Color ambient, ref Color fog, ref float fogDensity, ref float sunIntensity)
        {
            if (Raining) { ambient *= 0.7f; fog = Color.Lerp(fog, new Color(0.45f, 0.5f, 0.55f), 0.6f); fogDensity *= 1.8f; sunIntensity *= 0.55f; }
            if (Harmattan) { fog = Color.Lerp(fog, new Color(0.78f, 0.7f, 0.55f), 0.5f); fogDensity *= 2.2f; ambient = Color.Lerp(ambient, new Color(0.7f, 0.62f, 0.5f), 0.3f); }
        }
    }
}
