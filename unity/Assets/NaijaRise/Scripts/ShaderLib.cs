using UnityEngine;

namespace NaijaRise
{
    // The shaders the game builds materials from at runtime. Shader.Find only works in a player for shaders something
    // references, and runtime-created materials reference nothing, so Lit threw "ArgumentNullException: shader" in the
    // first Awake of every player build while working in the editor. These come from material assets in
    // Resources/Materials (made by Editor/ShaderSetup.cs): referencing them compiles the shader, and the emissive
    // template compiles its _EMISSION variant, into the build. Shader.Find stays as the editor fallback.
    public static class ShaderLib
    {
        static Shader lit, unlit, particles;

        static Shader From(string materialName, string shaderName)
        {
            var m = Resources.Load<Material>("Materials/" + materialName);
            var s = m != null ? m.shader : Shader.Find(shaderName);
            if (s == null) Debug.LogError($"NAIJA RISE: shader '{shaderName}' is missing from the build (Resources/Materials/{materialName}.mat). Run NAIJA RISE ▸ Prepare Shaders.");
            return s;
        }

        public static Shader Lit => lit != null ? lit : lit = From("NR_Lit", "Universal Render Pipeline/Lit");
        public static Shader Unlit => unlit != null ? unlit : unlit = From("NR_Unlit", "Universal Render Pipeline/Unlit");
        public static Shader ParticlesUnlit => particles != null ? particles : particles = From("NR_ParticlesUnlit", "Universal Render Pipeline/Particles/Unlit");
    }
}
