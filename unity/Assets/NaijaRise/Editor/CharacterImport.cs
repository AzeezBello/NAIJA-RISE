#if UNITY_EDITOR
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEngine;

namespace NaijaRise.EditorTools
{
    // Turns the imported Ready Player Me animation GLBs into legacy clips that bind to the avatar's hierarchy.
    // glTFast imports each GLB as a prefab with its own clip paths ("RootNode/Armature/Hips/…"); the avatar's bones sit
    // under a different root, so every curve is rebound by bone name onto the avatar. Idempotent; run by the smoke test
    // and before builds, or from NAIJA RISE ▸ Prepare Character Assets.
    public static class CharacterImport
    {
        const string Avatar = "Assets/NaijaRise/Resources/Models/Characters/readyplayer.me.glb";
        const string OutDir = "Assets/NaijaRise/Resources/Characters";
        static readonly (string file, string key)[] Clips = {
            ("Assets/NaijaRise/Resources/Models/Characters/M_Standing_Idle_001.glb", "idle"),
            ("Assets/NaijaRise/Resources/Models/Characters/M_Walk_001.glb", "walk"),
            ("Assets/NaijaRise/Resources/Models/Characters/M_Run_001.glb", "run"),
        };

        [MenuItem("NAIJA RISE/Prepare Character Assets")]
        public static void Prepare()
        {
            var avatar = AssetDatabase.LoadAssetAtPath<GameObject>(Avatar);
            if (avatar == null) { Debug.LogWarning("NAIJA RISE: avatar not imported at " + Avatar + " (is com.unity.cloud.gltfast installed?)"); return; }
            Directory.CreateDirectory(OutDir);
            var bones = new Dictionary<string, string>();
            foreach (var t in avatar.GetComponentsInChildren<Transform>(true)) if (t != avatar.transform && !bones.ContainsKey(t.name)) bones[t.name] = AnimationUtility.CalculateTransformPath(t, avatar.transform);
            int made = 0;
            foreach (var (file, key) in Clips)
            {
                string outPath = $"{OutDir}/rpm_{key}.anim";
                AnimationClip src = null;
                foreach (var o in AssetDatabase.LoadAllAssetRepresentationsAtPath(file)) if (o is AnimationClip c) { src = c; break; }
                if (src == null) { Debug.LogWarning("NAIJA RISE: no animation clip in " + file); continue; }
                var dst = new AnimationClip { legacy = true, wrapMode = WrapMode.Loop, frameRate = src.frameRate, name = "rpm_" + key };
                int bound = 0, dropped = 0;
                foreach (var b in AnimationUtility.GetCurveBindings(src))
                {
                    string bone = b.path.Substring(b.path.LastIndexOf('/') + 1);
                    if (!bones.TryGetValue(bone, out var path)) { dropped++; continue; }
                    var nb = b; nb.path = path;
                    AnimationUtility.SetEditorCurve(dst, nb, AnimationUtility.GetEditorCurve(src, b));
                    bound++;
                }
                var existing = AssetDatabase.LoadAssetAtPath<AnimationClip>(outPath);
                if (existing != null) { EditorUtility.CopySerialized(dst, existing); EditorUtility.SetDirty(existing); }
                else AssetDatabase.CreateAsset(dst, outPath);
                made++;
                Debug.Log($"NAIJA RISE: {outPath} ← {Path.GetFileName(file)}: {bound} curves bound, {dropped} dropped, {src.length:0.00} s");
            }
            // CesiumMan carries its own walk clip; keep it as a legacy clip on its own hierarchy (no rebinding needed).
            const string cesium = "Assets/NaijaRise/Resources/Models/Characters/CesiumMan.glb";
            AnimationClip cesiumSrc = null;
            foreach (var o in AssetDatabase.LoadAllAssetRepresentationsAtPath(cesium)) if (o is AnimationClip c) { cesiumSrc = c; break; }
            if (cesiumSrc != null)
            {
                string outPath = $"{OutDir}/cesium_walk.anim";
                var dst = new AnimationClip { legacy = true, wrapMode = WrapMode.Loop, frameRate = cesiumSrc.frameRate, name = "cesium_walk" };
                foreach (var b in AnimationUtility.GetCurveBindings(cesiumSrc)) AnimationUtility.SetEditorCurve(dst, b, AnimationUtility.GetEditorCurve(cesiumSrc, b));
                var existing = AssetDatabase.LoadAssetAtPath<AnimationClip>(outPath);
                if (existing != null) { EditorUtility.CopySerialized(dst, existing); EditorUtility.SetDirty(existing); } else AssetDatabase.CreateAsset(dst, outPath);
                made++;
                Debug.Log($"NAIJA RISE: {outPath} ← CesiumMan.glb: {cesiumSrc.length:0.00} s");
            }
            // The stray dog's walk and idle clips, as legacy clips on their own hierarchy.
            const string dog = "Assets/NaijaRise/Resources/Models/Animals/dog.glb";
            foreach (var (clipName, key) in new[] { ("walk", "dog_walk"), ("iddle", "dog_idle") })
            {
                AnimationClip src = null;
                foreach (var o in AssetDatabase.LoadAllAssetRepresentationsAtPath(dog)) if (o is AnimationClip c && c.name == clipName) { src = c; break; }
                if (src == null) continue;
                string outPath = $"{OutDir}/{key}.anim";
                var dst = new AnimationClip { legacy = true, wrapMode = WrapMode.Loop, frameRate = src.frameRate, name = key };
                foreach (var b in AnimationUtility.GetCurveBindings(src)) AnimationUtility.SetEditorCurve(dst, b, AnimationUtility.GetEditorCurve(src, b));
                var existing = AssetDatabase.LoadAssetAtPath<AnimationClip>(outPath);
                if (existing != null) { EditorUtility.CopySerialized(dst, existing); EditorUtility.SetDirty(existing); } else AssetDatabase.CreateAsset(dst, outPath);
                made++;
            }
            AssetDatabase.SaveAssets();
            Debug.Log($"NAIJA RISE: character assets prepared ({made} clips, {bones.Count} bones on the avatar)");
        }
    }
}
#endif
