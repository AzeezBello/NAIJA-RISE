using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace Rise.World
{
    // The poster look on URP: an HDR frame, a soft bloom that only really shows on neon and street
    // lights at night, a neutral grade and ACES tone mapping, with a light vignette. One global Volume, built in code.
    public static class PostFx
    {
        public static Volume Setup(Camera cam, GameObject host)
        {
            var camData = cam.GetUniversalAdditionalCameraData();
            camData.renderPostProcessing = true;
            camData.antialiasing = AntialiasingMode.FastApproximateAntialiasing;
            camData.renderShadows = true;
            cam.allowHDR = true;

            var profile = ScriptableObject.CreateInstance<VolumeProfile>();
            profile.name = "Lagos Look";
            var bloom = profile.Add<Bloom>(true);
            bloom.threshold.Override(0.92f);
            bloom.intensity.Override(0.68f);
            bloom.scatter.Override(0.72f);
            var tone = profile.Add<Tonemapping>(true);
            tone.mode.Override(TonemappingMode.ACES);
            var grade = profile.Add<ColorAdjustments>(true);
            grade.postExposure.Override(0.22f);
            grade.contrast.Override(12f);
            grade.saturation.Override(10f);
            grade.colorFilter.Override(new Color(1.02f, 0.99f, 0.95f));
            var vignette = profile.Add<Vignette>(true);
            vignette.intensity.Override(0.16f);
            vignette.smoothness.Override(0.55f);

            var volume = host.AddComponent<Volume>();
            volume.isGlobal = true;
            volume.priority = 1f;
            volume.profile = profile;
            return volume;
        }
    }
}
