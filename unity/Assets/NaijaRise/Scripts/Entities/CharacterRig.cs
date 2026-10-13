using UnityEngine;

namespace NaijaRise.Entities
{
    // Real humans: the Ready Player Me avatar imported with glTFast, driven by a legacy Animation component with the
    // Ready Player Me Idle / Walk / Run clips (retargeted onto the avatar hierarchy by Editor/CharacterImport.cs).
    // Mirrors src/entities/character.js: one rig loaded once, instanced per character, clothing tinted per look.
    // Falls back to the mannequin when the assets are missing so the game always runs.
    public static class CharacterRig
    {
        static GameObject prefab; static AnimationClip idle, walk, run; static bool loaded;
        public const float WalkClipSpeed = 1.5f, RunClipSpeed = 5.5f;   // m/s the clips were authored for

        static void Load()
        {
            if (loaded) return; loaded = true;
            prefab = Resources.Load<GameObject>("Models/Characters/readyplayer.me");
            idle = Resources.Load<AnimationClip>("Characters/rpm_idle");
            walk = Resources.Load<AnimationClip>("Characters/rpm_walk");
            run = Resources.Load<AnimationClip>("Characters/rpm_run");
        }

        public static bool Available { get { Load(); return prefab != null && idle != null && walk != null && run != null; } }

        public static Animation Build(Transform parent, Color top, Color pants, Color skin, Color? cap, int layer = 0, float height = 1.8f)
        {
            Load();
            var go = Object.Instantiate(prefab, parent, false);
            go.name = "Rig";
            go.transform.localPosition = Vector3.zero; go.transform.localRotation = Quaternion.identity; go.transform.localScale = Vector3.one;
            foreach (var t in go.GetComponentsInChildren<Transform>(true)) t.gameObject.layer = layer;

            // Scale to the character height and put the feet on the ground.
            var bounds = Bounds(go);
            float k = bounds.size.y > 0.01f ? height / bounds.size.y : 1f;
            go.transform.localScale = Vector3.one * k;
            go.transform.localPosition = new Vector3(0f, -(bounds.min.y - go.transform.position.y) * k, 0f);

            // Face +z (the way everyone else faces): the eyes sit in front of the head bone.
            var head = Find(go.transform, "Head"); var le = Find(go.transform, "LeftEye"); var re = Find(go.transform, "RightEye");
            if (head != null && le != null && re != null)
            {
                var forward = go.transform.InverseTransformDirection((le.position + re.position) * 0.5f - head.position);
                if (forward.z < 0f) go.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            }

            // Wardrobe: tint the outfit, trousers, skin and headwear materials (instances, so characters differ).
            foreach (var r in go.GetComponentsInChildren<Renderer>())
            {
                var mats = r.materials;
                for (int i = 0; i < mats.Length; i++)
                {
                    string n = mats[i].name;
                    if (n.Contains("Outfit_Top")) Tint(mats[i], top);
                    else if (n.Contains("Outfit_Bottom")) Tint(mats[i], pants);
                    else if (n.Contains("Headwear")) { if (cap.HasValue) Tint(mats[i], cap.Value); else r.enabled = !r.sharedMaterial.name.Contains("Headwear"); }
                    else if ((n.Contains("Body") || n.Contains("Skin")) && !n.Contains("Eye") && !n.Contains("Teeth")) Tint(mats[i], Color.Lerp(skin, Color.white, 0.35f));
                }
            }

            var anim = go.GetComponent<Animation>();
            if (anim == null) anim = go.AddComponent<Animation>();
            anim.playAutomatically = false; anim.wrapMode = WrapMode.Loop; anim.cullingType = AnimationCullingType.BasedOnRenderers;
            if (anim.GetClip("idle") == null) anim.AddClip(idle, "idle");
            if (anim.GetClip("walk") == null) anim.AddClip(walk, "walk");
            if (anim.GetClip("run") == null) anim.AddClip(run, "run");
            if (Application.isPlaying) anim.Play("idle");
            return anim;
        }

        // Cross-fade to a locomotion state; speed scales the clip to the movement speed.
        public static void SetState(Animation anim, string state, float clipSpeed = 1f)
        {
            if (anim == null) return;
            var st = anim[state]; if (st == null) return;
            st.speed = Mathf.Clamp(clipSpeed, 0.4f, 2.2f);
            if (!anim.IsPlaying(state)) anim.CrossFade(state, 0.22f);
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
