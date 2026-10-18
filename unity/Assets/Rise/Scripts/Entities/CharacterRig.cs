using System.Collections.Generic;
using UnityEngine;
using Rise.Data;

namespace Rise.Entities
{
    // A character's look: fabric print index, trousers, skin, hair, cap.
    public struct Look
    {
        public int Fabric; public Color Pants, Skin, Hair; public Color? Cap;
        // Wardrobe indices: outfit, bodyType (Slim/Average/Big), hair style, facial hair, accessory
        public int Outfit, BodyType, HairStyle, FacialHair, Accessory;
        public static Look Default => new Look { Fabric = 0, Pants = Mannequin.Hex("#26312d"), Skin = Mannequin.Hex("#714835"), Hair = Mannequin.Hex("#120b08"), Cap = Mannequin.Hex("#1f3a5f"), BodyType = 1, Accessory = 1 };
    }

    // One instanced rig: the Animation driving it and the clothing materials to re-dress it.
    public class RigInstance
    {
        public Animation Anim; public GameObject Root; public bool Cesium;
        public readonly List<Material> Top = new List<Material>(), Bottom = new List<Material>(), Skin = new List<Material>(), Hair = new List<Material>(), Cap = new List<Material>();
        public readonly List<Renderer> HairRenderers = new List<Renderer>(), BeardRenderers = new List<Renderer>(), CapRenderers = new List<Renderer>();
        public Transform Overlay, Glasses, Chain; public Material OverlayMaterial;
        public float BaseScale = 1f;
        public string State = "idle";

        // Cross-fade to a locomotion state; clipSpeed scales the clip to the movement speed.
        public void SetState(string state, float clipSpeed = 1f)
        {
            if (Anim == null) return;
            State = state;
            var st = Anim[state] ?? Anim["walk"];
            if (st == null) return;
            st.speed = state == "idle" && Anim["idle"] == null ? 0f : Mathf.Clamp(clipSpeed, 0.4f, 2.2f);
            if (!Anim.IsPlaying(st.name)) Anim.CrossFade(st.name, 0.22f);
        }
    }

    // Real humans: the Ready Player Me avatar imported with glTFast and driven
    // by a legacy Animation with the Ready Player Me Idle / Walk / Run clips, retargeted by Editor/CharacterImport.cs.
    // One rig loaded once, instanced per character, dressed per look with the
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
        public static bool CesiumAvailable { get { Load(); return (cesiumPrefab != null && cesiumWalk != null) || Available; } }

        public static RigInstance Build(Transform parent, Look look, int layer = 0, float height = 1.8f, bool cesium = false)
        {
            Load();
            var rig = new RigInstance { Cesium = cesium && CesiumAvailable };
            var srcPrefab = prefab != null ? prefab : cesiumPrefab;
            var go = Object.Instantiate(srcPrefab, parent, false);
            go.name = rig.Cesium ? "Rig (CesiumMan)" : "Rig";
            rig.Root = go;
            go.transform.localPosition = Vector3.zero; go.transform.localRotation = srcPrefab.transform.localRotation; go.transform.localScale = Vector3.one;
            foreach (var t in go.GetComponentsInChildren<Transform>(true)) t.gameObject.layer = layer;

            // Scale to the character height and put the feet on the ground.
            var bounds = Bounds(go);
            float k = bounds.size.y > 0.01f ? height / bounds.size.y : 1f;
            go.transform.localScale = Vector3.one * k;
            go.transform.localPosition = new Vector3(0f, -(bounds.min.y - go.transform.position.y) * k, 0f);
            rig.BaseScale = k;

            // Face +z. glTFast keeps glTF +Z as Unity +z, so imported models already face forward; the avatar still
            // checks where its eyes sit relative to the head bone in case a rig was authored the other way.
            var head = Find(go.transform, "Head"); var le = Find(go.transform, "LeftEye"); var re = Find(go.transform, "RightEye");
            if (head != null && le != null && re != null)
            {
                var forward = go.transform.InverseTransformDirection((le.position + re.position) * 0.5f - head.position);
                if (forward.z < 0f) go.transform.localRotation = Quaternion.Euler(0f, 180f, 0f) * go.transform.localRotation;
            }

            // Collect clothing materials (instances, so characters differ) and dress.
            foreach (var r in go.GetComponentsInChildren<Renderer>())
            {
                var mats = r.materials;
                foreach (var m in mats)
                {
                    string n = m.name;
                    if (n.Contains("Outfit_Top")) rig.Top.Add(m);
                    else if (n.Contains("Outfit_Bottom")) rig.Bottom.Add(m);
                    else if (n.Contains("Headwear")) { rig.Cap.Add(m); rig.CapRenderers.Add(r); }
                    else if (n.Contains("Beard")) rig.BeardRenderers.Add(r);
                    else if (n.Contains("Hair")) { rig.Hair.Add(m); rig.HairRenderers.Add(r); }
                    else if ((n.Contains("Body") || n.Contains("Skin")) && !n.Contains("Eye") && !n.Contains("Teeth")) rig.Skin.Add(m);
                    else if (srcPrefab == cesiumPrefab) rig.Top.Add(m);
                }
            }
            if (srcPrefab == prefab) BuildAttachments(rig, go.transform, k);
            Dress(rig, look);

            var anim = go.GetComponent<Animation>();
            if (anim == null) anim = go.AddComponent<Animation>();
            anim.playAutomatically = false; anim.wrapMode = WrapMode.Loop; anim.cullingType = AnimationCullingType.BasedOnRenderers;
            if (srcPrefab == prefab)
            {
                if (anim.GetClip("idle") == null && idle != null) anim.AddClip(idle, "idle");
                if (anim.GetClip("walk") == null && walk != null) anim.AddClip(walk, "walk");
                if (anim.GetClip("run") == null && run != null) anim.AddClip(run, "run");
            }
            else if (cesiumWalk != null && anim.GetClip("walk") == null) anim.AddClip(cesiumWalk, "walk");
            rig.Anim = anim;
            if (Application.isPlaying) rig.SetState("idle");
            return rig;
        }

        // Primitive attachments on the bones: an outfit overlay on the hips
        // (senator kaftan, agbada, gown, skirt), glasses on the head, a chain at the neck. Sized in rig-local metres.
        static void DestroyObj(Object o) { if (o == null) return; if (Application.isPlaying) Object.Destroy(o); else Object.DestroyImmediate(o); }

        static void BuildAttachments(RigInstance rig, Transform root, float k)
        {
            var hips = Find(root, "Hips") ?? Find(root, "Spine"); var head = Find(root, "Head"); var neck = Find(root, "Neck") ?? head;
            if (hips != null)
            {
                var ov = GameObject.CreatePrimitive(PrimitiveType.Cylinder); ov.name = "Outfit overlay"; DestroyObj(ov.GetComponent<Collider>());
                ov.transform.SetParent(hips, false);
                rig.OverlayMaterial = new Material(ShaderLib.Lit) { color = Color.white }; rig.OverlayMaterial.SetFloat("_Smoothness", 0.12f);
                ov.GetComponent<MeshRenderer>().sharedMaterial = rig.OverlayMaterial;
                rig.Overlay = ov.transform; ov.SetActive(false);
            }
            if (head != null)
            {
                var g = GameObject.CreatePrimitive(PrimitiveType.Cube); g.name = "Glasses"; DestroyObj(g.GetComponent<Collider>());
                g.transform.SetParent(head, false); g.GetComponent<MeshRenderer>().sharedMaterial = Mannequin.Mat(new Color(0.07f, 0.07f, 0.07f));
                rig.Glasses = g.transform; g.SetActive(false);
            }
            if (neck != null)
            {
                var c = GameObject.CreatePrimitive(PrimitiveType.Cylinder); c.name = "Chain"; DestroyObj(c.GetComponent<Collider>());
                c.transform.SetParent(neck, false); var gold = new Material(ShaderLib.Lit) { color = new Color(1f, 0.77f, 0.18f) }; gold.SetFloat("_Metallic", 0.9f); gold.SetFloat("_Smoothness", 0.8f);
                c.GetComponent<MeshRenderer>().sharedMaterial = gold;
                rig.Chain = c.transform; c.SetActive(false);
            }
        }

        // Attachments are children of scaled bones; use the magnitude of the bone scale so rotated bones (negative lossyScale components) never invert or explode the attachment.
        static void Fit(Transform t, Transform bone, Vector3 worldSize, Vector3 worldOffset, float fallbackScale = 1f)
        {
            var ls = bone.lossyScale;
            float sx = Mathf.Max(0.25f, Mathf.Abs(ls.x) > 0.01f ? Mathf.Abs(ls.x) : fallbackScale);
            float sy = Mathf.Max(0.25f, Mathf.Abs(ls.y) > 0.01f ? Mathf.Abs(ls.y) : fallbackScale);
            float sz = Mathf.Max(0.25f, Mathf.Abs(ls.z) > 0.01f ? Mathf.Abs(ls.z) : fallbackScale);
            t.localScale = new Vector3(worldSize.x / sx, worldSize.y / sy, worldSize.z / sz);
            t.localPosition = new Vector3(worldOffset.x / sx, worldOffset.y / sy, worldOffset.z / sz);
            t.localRotation = Quaternion.identity;
        }

        static readonly string[] OutfitNames = { "Ankara shirt", "Senator", "Buba & Sokoto", "Agbada", "Super Eagles", "T-shirt & jeans", "Singlet & jeans", "Tank top & shorts", "Jacket & jeans", "Gown", "Skirt & blouse" };

        // Re-dress a rig: the fabric print on the top, trousers, skin, hair and cap colours,
        // then the look slots: body type, hair style, facial hair, accessory and the outfit silhouette.
        public static void Dress(RigInstance rig, Look look)
        {
            DressSlots(rig, look);
            var print = Data != null ? Fabrics.Get(Data, look.Fabric) : null;
            Color fabricColour = Data != null && Data.fabrics.Length > 0 ? Mannequin.Hex(Data.fabrics[Mathf.Clamp(look.Fabric, 0, Data.fabrics.Length - 1)].baseColor) : new Color(0.88f, 0.48f, 0.1f);
            foreach (var m in rig.Top)
            {
                if (print == null) { Tint(m, fabricColour); continue; }
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

        static void DressSlots(RigInstance rig, Look look)
        {
            // Body type: Slim / Average / Big widen or narrow the whole rig.
            float wide = look.BodyType == 2 ? 1.12f : look.BodyType == 0 ? 0.92f : 1f;
            rig.Root.transform.localScale = new Vector3(rig.BaseScale * wide, rig.BaseScale, rig.BaseScale * wide);
            // Hair style: Bald hides the hair; Afro puffs it out; the others keep the mesh and differ by colour.
            string hair = Data != null && look.HairStyle < Data.hairStyles.Length ? Data.hairStyles[look.HairStyle] : "Short";
            foreach (var r in rig.HairRenderers) { r.enabled = hair != "Bald"; r.transform.localScale = hair == "Afro" ? Vector3.one * 1.22f : Vector3.one; }
            string beard = Data != null && look.FacialHair < Data.facialHair.Length ? Data.facialHair[look.FacialHair] : "None";
            foreach (var r in rig.BeardRenderers) r.enabled = beard != "None";
            // Accessory: fila / face cap use the headwear; glasses and chain are attachments.
            string acc = Data != null && look.Accessory < Data.accessories.Length ? Data.accessories[look.Accessory] : "None";
            foreach (var r in rig.CapRenderers) r.enabled = acc == "Fila" || acc == "Face cap";
            if (rig.Glasses != null) { rig.Glasses.gameObject.SetActive(acc == "Glasses"); if (acc == "Glasses") Fit(rig.Glasses, rig.Glasses.parent, new Vector3(0.14f, 0.024f, 0.02f), new Vector3(0f, 0.045f, 0.095f), rig.BaseScale); }
            if (rig.Chain != null) { rig.Chain.gameObject.SetActive(acc == "Chain"); if (acc == "Chain") Fit(rig.Chain, rig.Chain.parent, new Vector3(0.16f, 0.005f, 0.16f), new Vector3(0f, -0.025f, 0.02f), rig.BaseScale); }
            // Outfit silhouette overlays in the fabric print, scaled snugly to the waist so they never protrude like a barrel.
            string outfit = look.Outfit < OutfitNames.Length ? OutfitNames[look.Outfit] : "Ankara shirt";
            if (rig.Overlay != null)
            {
                var hips = rig.Overlay.parent;
                bool show = outfit == "Senator" || outfit == "Agbada" || outfit == "Gown" || outfit == "Skirt & blouse" || outfit == "Buba & Sokoto";
                rig.Overlay.gameObject.SetActive(show);
                if (show)
                {
                    Vector3 size = outfit == "Agbada" ? new Vector3(0.33f, 0.22f, 0.22f) : outfit == "Gown" ? new Vector3(0.31f, 0.30f, 0.21f) : new Vector3(0.30f, 0.20f, 0.20f);
                    Vector3 offset = new Vector3(0f, 0.04f, 0f);
                    Fit(rig.Overlay, hips, size, offset, rig.BaseScale);
                    rig.Overlay.localScale = new Vector3(rig.Overlay.localScale.x, rig.Overlay.localScale.y * 0.5f, rig.Overlay.localScale.z);   // unit cylinder is 2 high
                    var print = Data != null ? Fabrics.Get(Data, look.Fabric) : null;
                    if (print != null && rig.OverlayMaterial != null) { rig.OverlayMaterial.SetTexture("_BaseMap", print); rig.OverlayMaterial.SetTextureScale("_BaseMap", new Vector2(2f, 2f)); rig.OverlayMaterial.color = Color.white; }
                }
            }
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
