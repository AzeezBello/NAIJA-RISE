using UnityEngine;

namespace Rise.UI
{
    // Procedural audio synthesis: engine hum pitched to vehicle speed, rain loop, generator drone during NEPA outages,
    // horn on crash, and two-tone cash chime on transactions. Generated in memory so no audio files are required.
    public class SoundSystem : MonoBehaviour
    {
        public static SoundSystem I { get; private set; }

        Session session;
        AudioSource engineSrc, rainSrc, genSrc, sfxSrc;
        AudioClip chimeClip, hornClip;
        public bool Initialized { get; private set; }

        const int SampleRate = 22050;

        public void Init(Session s)
        {
            I = this;
            session = s;
            if ( gameObject.GetComponent<AudioListener>() == null && FindAnyObjectByType<AudioListener>() == null)
                gameObject.AddComponent<AudioListener>();

            engineSrc = MakeLoopSource("Engine Audio", MakeEngineClip());
            rainSrc = MakeLoopSource("Rain Audio", MakeRainClip());
            genSrc = MakeLoopSource("Generator Audio", MakeGeneratorClip());
            sfxSrc = gameObject.AddComponent<AudioSource>();
            sfxSrc.playOnAwake = false;
            sfxSrc.spatialBlend = 0f;

            chimeClip = MakeChimeClip();
            hornClip = MakeHornClip();
            Initialized = true;
        }

        AudioSource MakeLoopSource(string label, AudioClip clip)
        {
            var go = new GameObject(label);
            go.transform.SetParent(transform, false);
            var src = go.AddComponent<AudioSource>();
            src.clip = clip;
            src.loop = true;
            src.volume = 0f;
            src.spatialBlend = 0f;
            src.playOnAwake = false;
            src.Play();
            return src;
        }

        static AudioClip MakeEngineClip()
        {
            // One second of lowpass-smoothed 55 Hz sawtooth (110 cycles in 22050 samples for seamless loop).
            int n = SampleRate;
            var data = new float[n];
            float prev = 0f;
            const float freq = 55f;
            for (int i = 0; i < n; i++)
            {
                float t = (float)i / SampleRate;
                float raw = 2f * ((t * freq) - Mathf.Floor(0.5f + t * freq));
                prev = prev + 0.12f * (raw - prev);
                data[i] = prev * 0.6f;
            }
            var clip = AudioClip.Create("EngineHum", n, 1, SampleRate, false);
            clip.SetData(data, 0);
            return clip;
        }

        static AudioClip MakeRainClip()
        {
            int n = SampleRate * 2;
            var data = new float[n];
            var rng = new System.Random(101);
            float prev = 0f;
            for (int i = 0; i < n; i++)
            {
                float white = (float)(rng.NextDouble() * 2.0 - 1.0);
                float hp = white - prev;
                prev = white * 0.85f;
                data[i] = Mathf.Clamp(hp * 0.35f, -1f, 1f);
            }
            var clip = AudioClip.Create("RainLoop", n, 1, SampleRate, false);
            clip.SetData(data, 0);
            return clip;
        }

        static AudioClip MakeGeneratorClip()
        {
            int n = SampleRate;
            var data = new float[n];
            for (int i = 0; i < n; i++)
            {
                float t = (float)i / SampleRate;
                float wave = Mathf.Sin(t * 120f * Mathf.PI * 2f) * 0.6f + Mathf.Sin(t * 240f * Mathf.PI * 2f) * 0.3f + Mathf.Sin(t * 60f * Mathf.PI * 2f) * 0.25f;
                data[i] = wave * 0.5f;
            }
            var clip = AudioClip.Create("GeneratorHum", n, 1, SampleRate, false);
            clip.SetData(data, 0);
            return clip;
        }

        static AudioClip MakeChimeClip()
        {
            int n = Mathf.RoundToInt(SampleRate * 0.4f);
            var data = new float[n];
            for (int i = 0; i < n; i++)
            {
                float t = (float)i / SampleRate;
                float freq = t < 0.08f ? 880f : 1320f;
                float env = Mathf.Exp(-t * 12f);
                data[i] = Mathf.Sin(t * freq * Mathf.PI * 2f) * env * 0.3f;
            }
            var clip = AudioClip.Create("CashChime", n, 1, SampleRate, false);
            clip.SetData(data, 0);
            return clip;
        }

        static AudioClip MakeHornClip()
        {
            int n = Mathf.RoundToInt(SampleRate * 0.5f);
            var data = new float[n];
            for (int i = 0; i < n; i++)
            {
                float t = (float)i / SampleRate;
                float env = Mathf.Exp(-t * 8f);
                float sq = Mathf.Sin(t * 180f * Mathf.PI * 2f) >= 0f ? 1f : -1f;
                data[i] = sq * env * 0.22f;
            }
            var clip = AudioClip.Create("CrashHorn", n, 1, SampleRate, false);
            clip.SetData(data, 0);
            return clip;
        }

        public void PlayCash()
        {
            if (!Initialized || session?.State?.S == null || !session.State.S.sound || sfxSrc == null || chimeClip == null) return;
            sfxSrc.PlayOneShot(chimeClip, 0.5f);
        }

        public void PlayHorn()
        {
            if (!Initialized || session?.State?.S == null || !session.State.S.sound || sfxSrc == null || hornClip == null) return;
            sfxSrc.PlayOneShot(hornClip, 0.5f);
        }

        void Update()
        {
            if (!Initialized || session == null || session.State?.S == null) return;
            bool on = session.State.S.sound;
            float master = on ? 0.5f : 0f;
            float dt = Time.deltaTime;

            bool driving = on && session.Vehicle != null;
            float kmh = driving ? session.Vehicle.Kmh : 0f;
            float targetPitch = driving ? 1f + (kmh * 1.6f) / 55f : 1f;
            float targetEngineVol = driving ? (0.08f + Mathf.Min(0.12f, kmh / 600f)) * master : 0f;
            engineSrc.pitch = Mathf.Lerp(engineSrc.pitch, targetPitch, 1f - Mathf.Exp(-10f * dt));
            engineSrc.volume = Mathf.Lerp(engineSrc.volume, targetEngineVol, 1f - Mathf.Exp(-7f * dt));

            bool raining = on && session.Weather != null && session.Weather.Raining;
            rainSrc.volume = Mathf.Lerp(rainSrc.volume, raining ? 0.035f * master : 0f, 1f - Mathf.Exp(-2f * dt));

            bool outage = on && session.Events != null && session.Events.Outage > 0f;
            genSrc.volume = Mathf.Lerp(genSrc.volume, outage ? 0.07f * master : 0f, 1f - Mathf.Exp(-2f * dt));
        }
    }
}
