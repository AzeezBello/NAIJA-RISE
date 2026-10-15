#if UNITY_EDITOR
using System.IO;
using UnityEditor;
using UnityEngine;

namespace Rise.EditorTools
{
    // Makes the runtime-created materials work in players: creates the template materials ShaderLib loads from Resources
    // (so the shader and its keyword variants are compiled into the build) and lists the shaders under Always Included
    // Shaders as a second guarantee. Idempotent; runs before every build and the smoke test.
    public static class ShaderSetup
    {
        const string Dir = "Assets/Rise/Resources/Materials";
        static readonly (string asset, string shader, bool emissive)[] Templates =
        {
            ("NR_Lit", "Universal Render Pipeline/Lit", false),
            ("NR_LitEmissive", "Universal Render Pipeline/Lit", true),    // lamps, traffic lights and the objective arrow enable _EMISSION at runtime
            ("NR_Unlit", "Universal Render Pipeline/Unlit", false),
            ("NR_ParticlesUnlit", "Universal Render Pipeline/Particles/Unlit", false),
        };

        [MenuItem("RISE/Prepare Shaders")]
        public static void Prepare()
        {
            Directory.CreateDirectory(Dir);
            int made = 0, listed = 0;
            foreach (var (asset, shaderName, emissive) in Templates)
            {
                var shader = Shader.Find(shaderName);
                if (shader == null) { Debug.LogError($"RISE: shader '{shaderName}' not found in the editor"); continue; }
                string path = $"{Dir}/{asset}.mat";
                var mat = AssetDatabase.LoadAssetAtPath<Material>(path);
                if (mat == null) { mat = new Material(shader); AssetDatabase.CreateAsset(mat, path); made++; }
                else mat.shader = shader;
                if (emissive) { mat.EnableKeyword("_EMISSION"); mat.globalIlluminationFlags = MaterialGlobalIlluminationFlags.RealtimeEmissive; mat.SetColor("_EmissionColor", Color.white); }
                EditorUtility.SetDirty(mat);
                listed += AlwaysInclude(shader) ? 1 : 0;
            }
            AssetDatabase.SaveAssets();
            Debug.Log($"RISE: shaders prepared ({made} material assets created, {listed} shaders added to Always Included)");
        }

        static bool AlwaysInclude(Shader shader)
        {
            var graphics = AssetDatabase.LoadAssetAtPath<Object>("ProjectSettings/GraphicsSettings.asset");
            var so = new SerializedObject(graphics);
            var list = so.FindProperty("m_AlwaysIncludedShaders");
            for (int i = 0; i < list.arraySize; i++) if (list.GetArrayElementAtIndex(i).objectReferenceValue == shader) return false;
            list.arraySize++; list.GetArrayElementAtIndex(list.arraySize - 1).objectReferenceValue = shader;
            so.ApplyModifiedPropertiesWithoutUndo();
            return true;
        }

        public static bool AllPresent(out string detail)
        {
            var missing = new System.Collections.Generic.List<string>();
            foreach (var (asset, _, _) in Templates) if (AssetDatabase.LoadAssetAtPath<Material>($"{Dir}/{asset}.mat") == null) missing.Add(asset);
            var so = new SerializedObject(AssetDatabase.LoadAssetAtPath<Object>("ProjectSettings/GraphicsSettings.asset"));
            var list = so.FindProperty("m_AlwaysIncludedShaders"); int always = 0;
            for (int i = 0; i < list.arraySize; i++) { var s = list.GetArrayElementAtIndex(i).objectReferenceValue as Shader; if (s != null && s.name.StartsWith("Universal Render Pipeline/")) always++; }
            detail = $"{Templates.Length - missing.Count}/{Templates.Length} template materials, {always} URP shaders in Always Included" + (missing.Count > 0 ? " (missing " + string.Join(", ", missing) + ")" : "");
            return missing.Count == 0 && always >= 3;
        }
    }
}
#endif
