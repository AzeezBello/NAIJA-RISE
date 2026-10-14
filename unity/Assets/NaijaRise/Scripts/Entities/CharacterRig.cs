using System.Collections.Generic;
using UnityEngine;
using NaijaRise.Data;

namespace NaijaRise.Entities
{
    // A character's look (src/data/characters.js LOOK): fabric print index, trousers, skin, hair, cap.
    public struct Look
    {
        public int Fabric; public Color Pants, Skin, Hair; public Color? Cap;
        public static Look Default => new Look { Fabric = 0, Pants = Mannequin.Hex("#26312d"), Skin = Mannequin.Hex("#714835"), Hair = Mannequin.Hex("#120b08"), Cap = Mannequin.Hex("#1f3a5f") };
    }

    // One instanced rig: the Animation driving it and the clothing materials to re-dress it.
    public class RigInstance
    {
        public Animation Anim; public GameObject Root; public bool Cesium;
        public readonly List<Material> Top = new List<Material>(), Bottom = new List<Material>(), Skin = new List<Material>(), Hair = new List<Material>(), Cap = new List<Material>();
        public string State = "idle";

        // Cross-fade to a locomotion state; clipSpeed scales the clip to the movement speed. CesiumMan has one clip and
        // freezes when idle, as the web edition's idleFreeze does.
        public void SetState(string state, float clipSpeed = 1f)
        {
            if (Anim == null) return;
            State = state;
            if (Cesium) { var w = Anim["walk"]; if (w == null) return; if (!Anim.IsPlaying("walk")) Anim.Play("walk"); w.speed = state == "idle" ? 0f : Mathf.Clamp(clipSpeed, 0.4f, 2.2f); return; }
            var st = Anim[state]; if (st == null) return;
            st.speed = Mathf.Clamp(clipSpeed, 0.4f, 2.2f);
            if (!Anim.IsPlaying(state)) Anim.CrossFade(state, 0.22f);
        }
    }

    // Real humans: the Ready Player Me avatar (and CesiumMan for part of the street) imported with glTFast and driven
    // by a legacy Animation with the Ready Player Me Idle / Walk / Run clips, retargeted by Editor/CharacterImport.cs.
    // Mirrors src/entities/character.js: one rig loaded once, instanced per character, dressed per look with the
    // procedural fabric prints. Falls back to the mannequin when the assets are missing so the game always runs.
    public static class CharacterRig
    {
        static GameObject prefab, cesiumPrefab; static AnimationClip idle, walk, run, cesiumWalk; static bool loaded;
        public const float WalkClipSpeed = 1.5f, RunClipSpeed = 5.5f;   // m/s the clips were authored for
        public static WorldData Data;                                  // for the fabric prints

        static void Load()
        {
            if (loaded) return; loaded = true;
            prefab = Resources.Load<GameObject>("Models/Characters/readyplayer.me");
            idle = Resources.Load<AnimationClip>("Characters/rpm_idle");
            walk = Resources.Load<AnimationClip>("Characters/rpm_walk");
            run = Resources.Load<AnimationClip>("Characters/rpm_run");
            cesiumPrefab = Resources.Load<GameObject>("Models/Characters/CesiumMan");
            cesiumWalk = Resources.Load<AnimationClip>("Characters/cesium_walk");
        }

        public static bool Available { get { Load(); return prefab != null && idle != null && walk != null && run != null; } }
        public static bool CesiumAvailable { get { Load(); return cesiumPrefab != null && cesiumWalk != null; } }

        public static RigInstance Build(Transform parent, Look look, int layer = 0, float height = 1.8f, bool cesium = false)
        {
            Load();
            var rig = new RigInstance { Cesium = cesium && CesiumAvailable };
            var go = Object.Instantiate(rig.Cesium ? cesiumPrefab : prefab, parent, false);
            go.name = rig.Cesium ? "Rig (CesiumMan)" : "Rig";
            rig.Root = go;
            go.transform.localPosition = Vector3.zero; go.transform.localRotation = Quaternion.identity; go.transform.localScale = Vector3.one;
            foreach (var t in go.GetComponentsInChildren<Transform>(true)) t.gameObject.layer = layer;

            // Scale to the character height and put the feet on the ground.
            var bounds = Bounds(go);
            float k = bounds.size.y > 0.01f ? height / bounds.size.y : 1f;
            go.transform.localScale = Vector3.one * k;
            go.transform.localPosition = new Vector3(0f, -(bounds.min.y - go.transform.position.y) * k, 0f);

            // Face +z. glTFast keeps glTF +Z as Unity +z, so imported models already face forward; the avatar still
            // checks where its eyes sit relative to the head bone in case a rig was authored the other way.
            var head = Find(go.transform, "Head"); var le = Find(go.transform, "LeftEye"); var re = Find(go.transform, "RightEye");
            if (head != null && le != null && re != null)
            {
                var forward = go.transform.InverseTransformDirection((le.position + re.position) * 0.5f - head.position);
                if (forward.z < 0f) go.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            }

            // Collect clothing materials (instances, so characters differ) and dress.
            foreach (var r in go.GetComponentsInChildren<Renderer>())
            {
                var mats = r.materials;
                foreach (var m in mats)
                {
                    string n = m.name;
                    if (rig.Cesium) { rig.Top.Add(m); continue; }
                    if (n.Contains("Outfit_Top")) rig.Top.Add(m);
                    else if (n.Contains("Outfit_Bottom")) rig.Bottom.Add(m);
                    else if (n.Contains("Headwear")) rig.Cap.Add(m);
                    else if (n.Contains("Hair")) rig.Hair.Add(m);
                    else if ((n.Contains("Body") || n.Contains("Skin")) && !n.Contains("Eye") && !n.Contains("Teeth")) rig.Skin.Add(m);
                }
            }
            Dress(rig, look);

            var anim = go.GetComponent<Animation>();
            if (anim == null) anim = go.AddComponent<Animation>();
            anim.playAutomatically = false; anim.wrapMode = WrapMode.Loop; anim.cullingType = AnimationCullingType.BasedOnRenderers;
            if (rig.Cesium) { if (anim.GetClip("walk") == null) anim.AddClip(cesiumWalk, "walk"); }
            else
            {
                if (anim.GetClip("idle") == null) anim.AddClip(idle, "idle");
                if (anim.GetClip("walk") == null) anim.AddClip(walk, "walk");
                if (anim.GetClip("run") == null) anim.AddClip(run, "run");
            }
            rig.Anim = anim;
            if (Application.isPlaying) rig.SetState("idle");
            return rig;
        }

        // Re-dress a rig: the fabric print on the top (or a tint on CesiumMan), trousers, skin, hair and cap colours.
        public static void Dress(RigInstance rig, Look look)
        {
            var print = Data != null ? Fabrics.Get(Data, look.Fabric) : null;
            Color fabricColour = Data != null && Data.fabrics.Length > 0 ? Mannequin.Hex(Data.fabrics[Mathf.Clamp(look.Fabric, 0, Data.fabrics.Length - 1)].baseColor) : new Color(0.88f, 0.48f, 0.1f);
            foreach (var m in rig.Top)
            {
                if (rig.Cesium || print == null) { Tint(m, fabricColour); continue; }
                Tint(m, Color.white);
                if (m.HasProperty("baseColorTexture")) { m.SetTexture("baseColorTexture", print); if (m.HasProperty("baseColorTexture_ST")) m.SetVector("baseColorTexture_ST", new Vector4(2f, 2f, 0f, 0f)); }
                else if (m.HasProperty("_BaseMap")) { m.SetTexture("_BaseMap", print); m.SetTextureScale("_BaseMap", new Vector2(2f, 2f)); }
                else m.mainTexture = print;
            }
            foreach (var m in rig.Bottom) Tint(m, look.Pants);
            foreach (var m in rig.Skin) Tint(m, Color.Lerp(look.Skin, Color.white, 0.35f));
            foreach (var m in rig.Hair) Tint(m, look.Hair);
            foreach (var m in rig.Cap) Tint(m, look.Cap ?? Color.white);
            if (!look.Cap.HasValue) foreach (var r in rig.Root.GetComponentsInChildren<Renderer>()) if (r.sharedMaterial != null && r.sharedMaterial.name.Contains("Headwear")) r.enabled = false;
        }

        static void Tint(Material m, Color c)
        {
            if (m.HasProperty("baseColorFactor")) m.SetColor("baseColorFactor", c);
            else if (m.HasProperty("_BaseColor")) m.SetColor("_BaseColor", c);
            else m.color = c;
        }

        public static Bounds Bounds(GameObject go)
        {
            var rends = go.GetComponentsInChildren<Renderer>();
            if (rends.Length == 0) return new Bounds(go.transform.position, Vector3.one);
            var b = rends[0].bounds; foreach (var r in rends) b.Encapsulate(r.bounds); return b;
        }

        public static Transform Find(Transform root, string name)
        {
            foreach (var t in root.GetComponentsInChildren<Transform>(true)) if (t.name == name) return t;
            return null;
        }
    }
}
