using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace Rise.World
{
    // The poster look (src/core/postfx.js) on URP: an HDR frame, a soft bloom that only really shows on neon and street
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
            bloom.threshold.Override(1.05f);
            bloom.intensity.Override(0.55f);
            bloom.scatter.Override(0.7f);
            var tone = profile.Add<Tonemapping>(true);
            tone.mode.Override(TonemappingMode.ACES);
            var grade = profile.Add<ColorAdjustments>(true);
            grade.postExposure.Override(0.15f);
            grade.contrast.Override(6f);
            grade.saturation.Override(4f);
            var vignette = profile.Add<Vignette>(true);
            vignette.intensity.Override(0.18f);
            vignette.smoothness.Override(0.5f);

            var volume = host.AddComponent<Volume>();
            volume.isGlobal = true;
            volume.priority = 1f;
            volume.profile = profile;
            return volume;
        }
    }
}
