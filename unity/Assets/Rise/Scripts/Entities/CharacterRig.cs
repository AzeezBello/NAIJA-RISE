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
        public Transform Overlay, Glasses, Chain, Watch, TattooL, TattooR, WeaponRoot; public Material OverlayMaterial, TattooMaterial;
        public Transform Hips, Spine, Spine1, Spine2, Neck, Head;
        public Transform RightShoulder, RightArm, RightForeArm, RightHand;
        public Transform LeftShoulder, LeftArm, LeftForeArm, LeftHand;
        public Transform RightUpLeg, RightLeg, LeftUpLeg, LeftLeg;
        public float BaseScale = 1f;
        public string State = "idle";

        // Cross-fade to a locomotion or action state (idle, walk, run, jump, turn, enter_vehicle, exit_vehicle, attack); clipSpeed scales the clip to the movement speed.
        public void SetState(string state, float clipSpeed = 1f)
        {
            if (Anim == null) return;
            State = state;
            // During an upper-body/full-body combat strike ("attack"), keep the base idle/walk clip refreshing bone bind poses each frame so LateUpdate procedural combat overrides never accumulate.
            string clipName = state == "attack" ? (clipSpeed > 1.05f ? "walk" : "idle") : state;
            var st = Anim[clipName] ?? Anim["walk"];
            if (st == null) return;
            st.speed = clipName == "idle" && Anim["idle"] == null ? 0f : Mathf.Clamp(clipSpeed, 0.4f, 2.2f);
            if (!Anim.IsPlaying(st.name)) Anim.CrossFade(st.name, 0.14f);
        }

        public bool HasClip(string name) => Anim != null && Anim.GetClip(name) != null;

        static void WorldRot(Transform bone, Vector3 right, Vector3 up, Vector3 fwd, float pitch, float yaw, float roll)
        {
            if (bone == null) return;
            if (Mathf.Abs(pitch) > 0.01f) bone.Rotate(right, pitch, Space.World);
            if (Mathf.Abs(yaw) > 0.01f) bone.Rotate(up, yaw, Space.World);
            if (Mathf.Abs(roll) > 0.01f) bone.Rotate(fwd, roll, Space.World);
        }

        // Full-body 3D combat pose evaluated in LateUpdate after Animation updates the base locomotion pose.
        // swing01: 0 (no active swing) or 0..1 progress through the active attack.
        // guard01: 0..1 blend weight for boxing/weapon ready stance between swings.
        public void ApplyCombatPose(float swing01, float guard01, int comboStep, string weaponId, bool isGun)
        {
            if (Root == null) return;
            bool hasWeapon = !string.IsNullOrEmpty(weaponId);
            if (swing01 <= 0.001f && guard01 <= 0.001f && !hasWeapon) return;

            var tr = Root.transform;
            Vector3 right = tr.right, up = tr.up, fwd = tr.forward;

            // 1. Firearm aiming & recoil stance
            if (isGun)
            {
                bool twoHand = weaponId == "shotgun" || weaponId == "smg" || weaponId == "rifle" || weaponId == "sniper" || weaponId == "lmg";
                float aim = Mathf.Max(guard01, swing01 > 0f ? 1f : 0.42f);
                float kick = swing01 > 0f ? Mathf.Sin(swing01 * Mathf.PI) : 0f;

                WorldRot(Spine ?? Hips, right, up, fwd, 6f * aim - 7f * kick, twoHand ? 14f * aim : 8f * aim, 0f);
                WorldRot(RightArm, right, up, fwd, -82f * aim - 16f * kick, -8f * aim, 10f * aim);
                WorldRot(RightForeArm, right, up, fwd, -16f * aim - 8f * kick, -6f * aim, 0f);
                if (twoHand)
                {
                    WorldRot(LeftArm, right, up, fwd, -74f * aim - 10f * kick, 32f * aim, -12f * aim);
                    WorldRot(LeftForeArm, right, up, fwd, -28f * aim, 18f * aim, 0f);
                }
                if (WeaponRoot != null)
                    WeaponRoot.localRotation = Quaternion.Euler(75f - kick * 18f, 0f, 0f);
                return;
            }

            // 2. Active melee weapon slash or bare-knuckle 3-hit street brawl combo
            if (swing01 > 0.001f)
            {
                float s = Mathf.Sin(swing01 * Mathf.PI); // 0 -> 1 -> 0 envelope
                if (hasWeapon)
                {
                    int step = Mathf.Abs(comboStep) % 3;
                    if (step == 0)
                    {
                        // Overhead diagonal cleave (windup 0..0.28 -> slash 0.28..0.72 -> recover)
                        float slash = Mathf.SmoothStep(0f, 1f, Mathf.InverseLerp(0.18f, 0.65f, swing01));
                        float torsoYaw = Mathf.Lerp(26f, -38f, slash) * s;
                        float torsoPitch = Mathf.Lerp(-8f, 20f, slash) * s;
                        WorldRot(Spine ?? Hips, right, up, fwd, torsoPitch, torsoYaw, 0f);
                        WorldRot(Spine2, right, up, fwd, torsoPitch * 0.6f, torsoYaw * 0.7f, 0f);
                        WorldRot(RightArm, right, up, fwd, Mathf.Lerp(-138f, -36f, slash) * s, Mathf.Lerp(28f, -34f, slash) * s, 22f * s);
                        WorldRot(RightForeArm, right, up, fwd, Mathf.Lerp(-48f, -8f, slash) * s, 0f, 0f);
                        WorldRot(LeftArm, right, up, fwd, -42f * s, -22f * s, -18f * s);
                        WorldRot(LeftForeArm, right, up, fwd, -55f * s, 0f, 0f);
                        if (WeaponRoot != null)
                            WeaponRoot.localRotation = Quaternion.Euler(75f + Mathf.Lerp(-45f, 82f, slash) * s, -slash * 28f * s, 0f);
                    }
                    else if (step == 1)
                    {
                        // Wide horizontal backhand sweep across chest
                        float sweep = Mathf.SmoothStep(0f, 1f, Mathf.InverseLerp(0.15f, 0.68f, swing01));
                        float yaw = Mathf.Lerp(-46f, 48f, sweep) * s;
                        WorldRot(Spine ?? Hips, right, up, fwd, 14f * s, yaw * 0.75f, 0f);
                        WorldRot(RightArm, right, up, fwd, -88f * s, yaw, 28f * s);
                        WorldRot(RightForeArm, right, up, fwd, -20f * s, yaw * 0.35f, 0f);
                        WorldRot(LeftArm, right, up, fwd, -48f * s, -25f * s, -20f * s);
                        if (WeaponRoot != null)
                            WeaponRoot.localRotation = Quaternion.Euler(75f + 55f * s, yaw * 0.6f, 45f * s);
                    }
                    else
                    {
                        // Heavy lunging overhead smash + front kick
                        float smash = Mathf.SmoothStep(0f, 1f, Mathf.InverseLerp(0.20f, 0.65f, swing01));
                        WorldRot(Spine ?? Hips, right, up, fwd, Mathf.Lerp(-14f, 24f, smash) * s, -18f * s, 0f);
                        WorldRot(RightArm, right, up, fwd, Mathf.Lerp(-145f, -30f, smash) * s, -14f * s, 16f * s);
                        WorldRot(RightForeArm, right, up, fwd, -18f * s, 0f, 0f);
                        WorldRot(LeftArm, right, up, fwd, Mathf.Lerp(-115f, -40f, smash) * s, 22f * s, -14f * s);
                        WorldRot(RightUpLeg, right, up, fwd, -62f * s, 0f, 0f);
                        WorldRot(RightLeg, right, up, fwd, 24f * s, 0f, 0f);
                        if (WeaponRoot != null)
                            WeaponRoot.localRotation = Quaternion.Euler(75f + Mathf.Lerp(-35f, 90f, smash) * s, 0f, 0f);
                    }
                }
                else
                {
                    // Bare-fists 3-hit street fight combo (Right Cross -> Left Hook -> Street Front Kick & Uppercut)
                    int step = Mathf.Abs(comboStep) % 3;
                    if (step == 0)
                    {
                        // Right Cross / Haymaker
                        float punch = Mathf.SmoothStep(0f, 1f, Mathf.InverseLerp(0.15f, 0.55f, swing01));
                        WorldRot(Spine ?? Hips, right, up, fwd, 16f * s, Mathf.Lerp(24f, -38f, punch) * s, 0f);
                        WorldRot(Spine2, right, up, fwd, 8f * s, Mathf.Lerp(16f, -28f, punch) * s, 0f);
                        WorldRot(RightArm, right, up, fwd, Mathf.Lerp(-42f, -96f, punch) * s, -18f * punch * s, 16f * s);
                        WorldRot(RightForeArm, right, up, fwd, Mathf.Lerp(-78f, -8f, punch) * s, -10f * s, 0f);
                        // Left hand tucked high in boxing guard
                        WorldRot(LeftArm, right, up, fwd, -52f * s, 18f * s, -14f * s);
                        WorldRot(LeftForeArm, right, up, fwd, -82f * s, 22f * s, 0f);
                    }
                    else if (step == 1)
                    {
                        // Left Hook / Jab
                        float hook = Mathf.SmoothStep(0f, 1f, Mathf.InverseLerp(0.15f, 0.55f, swing01));
                        WorldRot(Spine ?? Hips, right, up, fwd, 16f * s, Mathf.Lerp(-24f, 38f, hook) * s, 0f);
                        WorldRot(Spine2, right, up, fwd, 8f * s, Mathf.Lerp(-16f, 28f, hook) * s, 0f);
                        WorldRot(LeftArm, right, up, fwd, Mathf.Lerp(-45f, -94f, hook) * s, 28f * hook * s, -20f * s);
                        WorldRot(LeftForeArm, right, up, fwd, Mathf.Lerp(-78f, -24f, hook) * s, 24f * hook * s, 0f);
                        // Right hand tucked high in boxing guard
                        WorldRot(RightArm, right, up, fwd, -52f * s, -18f * s, 14f * s);
                        WorldRot(RightForeArm, right, up, fwd, -82f * s, -22f * s, 0f);
                    }
                    else
                    {
                        // Street Front Kick + Double-Handed Uppercut
                        float kick = Mathf.SmoothStep(0f, 1f, Mathf.InverseLerp(0.12f, 0.52f, swing01));
                        WorldRot(Spine ?? Hips, right, up, fwd, -10f * s, -14f * s, 0f);
                        WorldRot(RightUpLeg, right, up, fwd, -88f * kick * s, 0f, 6f * s);
                        WorldRot(RightLeg, right, up, fwd, 28f * kick * s, 0f, 0f);
                        WorldRot(RightArm, right, up, fwd, -84f * s, -16f * s, 18f * s);
                        WorldRot(RightForeArm, right, up, fwd, -48f * s, 0f, 0f);
                        WorldRot(LeftArm, right, up, fwd, -65f * s, 16f * s, -18f * s);
                        WorldRot(LeftForeArm, right, up, fwd, -68f * s, 0f, 0f);
                    }
                }
                return;
            }

            // 3. Between swings: Fighter guard stance or melee weapon ready carry
            float g = Mathf.Clamp01(guard01);
            if (hasWeapon)
            {
                float w = Mathf.Max(0.45f, g);
                WorldRot(RightArm, right, up, fwd, -28f * w, -6f * w, 14f * w);
                WorldRot(RightForeArm, right, up, fwd, -36f * w, 0f, 0f);
                if (g > 0.05f)
                {
                    WorldRot(LeftArm, right, up, fwd, -42f * g, 16f * g, -12f * g);
                    WorldRot(LeftForeArm, right, up, fwd, -68f * g, 14f * g, 0f);
                }
                if (WeaponRoot != null)
                    WeaponRoot.localRotation = Quaternion.Euler(75f, 0f, 0f);
            }
            else if (g > 0.01f)
            {
                WorldRot(Spine ?? Hips, right, up, fwd, 8f * g, 12f * g, 0f);
                WorldRot(RightArm, right, up, fwd, -46f * g, -14f * g, 12f * g);
                WorldRot(RightForeArm, right, up, fwd, -78f * g, -18f * g, 0f);
                WorldRot(LeftArm, right, up, fwd, -54f * g, 16f * g, -12f * g);
                WorldRot(LeftForeArm, right, up, fwd, -82f * g, 20f * g, 0f);
            }
        }
    }

    // Real humans: the Ready Player Me avatar imported with glTFast and driven
    // by a legacy Animation with the Ready Player Me Idle / Walk / Run clips plus dedicated Jump, Turn, Vehicle Enter/Exit, and Attack clips.
    // One rig loaded once, instanced per character, dressed per look with the
    // procedural fabric prints. Falls back to the mannequin when the assets are missing so the game always runs.
    public static class CharacterRig
    {
        static GameObject prefab, cesiumPrefab;
        static AnimationClip idle, walk, run, jump, turn, enterVehicle, exitVehicle, attack, cesiumWalk;
        static bool loaded;
        public const float WalkClipSpeed = 1.5f, RunClipSpeed = 5.5f;   // m/s the clips were authored for
        public static WorldData Data;                                  // for the fabric prints

        static void Load()
        {
            if (loaded) return; loaded = true;
            prefab = Resources.Load<GameObject>("Models/Characters/readyplayer.me");
            idle = Resources.Load<AnimationClip>("Characters/rpm_idle");
            walk = Resources.Load<AnimationClip>("Characters/rpm_walk");
            run = Resources.Load<AnimationClip>("Characters/rpm_run");
            jump = Resources.Load<AnimationClip>("Characters/rpm_jump") ?? MakeJumpClip();
            turn = Resources.Load<AnimationClip>("Characters/rpm_turn") ?? MakeTurnClip();
            enterVehicle = Resources.Load<AnimationClip>("Characters/rpm_enter_vehicle") ?? MakeEnterVehicleClip();
            exitVehicle = Resources.Load<AnimationClip>("Characters/rpm_exit_vehicle") ?? MakeExitVehicleClip();
            attack = Resources.Load<AnimationClip>("Characters/rpm_attack") ?? MakeAttackClip();
            cesiumPrefab = Resources.Load<GameObject>("Models/Characters/CesiumMan");
            cesiumWalk = Resources.Load<AnimationClip>("Characters/cesium_walk");
        }

        static AnimationClip MakeAttackClip()
        {
            var c = new AnimationClip { name = "rpm_attack", legacy = true, wrapMode = WrapMode.Once };
            c.SetCurve("", typeof(Transform), "localPosition.z", new AnimationCurve(
                new Keyframe(0f, 0f), new Keyframe(0.16f, 0.14f), new Keyframe(0.42f, 0f)));
            return c;
        }

        static AnimationClip MakeJumpClip()
        {
            var c = new AnimationClip { name = "rpm_jump", legacy = true, wrapMode = WrapMode.Once };
            c.SetCurve("", typeof(Transform), "localPosition.y", new AnimationCurve(
                new Keyframe(0f, 0f), new Keyframe(0.12f, -0.08f), new Keyframe(0.32f, 0.22f), new Keyframe(0.55f, 0f)));
            c.SetCurve("Hips", typeof(Transform), "localEulerAngles.x", new AnimationCurve(
                new Keyframe(0f, 0f), new Keyframe(0.15f, 14f), new Keyframe(0.35f, -8f), new Keyframe(0.55f, 0f)));
            return c;
        }

        static AnimationClip MakeTurnClip()
        {
            var c = new AnimationClip { name = "rpm_turn", legacy = true, wrapMode = WrapMode.Loop };
            c.SetCurve("", typeof(Transform), "localPosition.y", new AnimationCurve(
                new Keyframe(0f, 0f), new Keyframe(0.20f, 0.04f), new Keyframe(0.40f, 0f)));
            c.SetCurve("Hips", typeof(Transform), "localEulerAngles.y", new AnimationCurve(
                new Keyframe(0f, -12f), new Keyframe(0.20f, 12f), new Keyframe(0.40f, -12f)));
            return c;
        }

        static AnimationClip MakeEnterVehicleClip()
        {
            var c = new AnimationClip { name = "rpm_enter_vehicle", legacy = true, wrapMode = WrapMode.Once };
            c.SetCurve("", typeof(Transform), "localPosition.x", new AnimationCurve(
                new Keyframe(0f, 0f), new Keyframe(0.25f, 0.18f), new Keyframe(0.50f, 0.32f)));
            c.SetCurve("", typeof(Transform), "localPosition.y", new AnimationCurve(
                new Keyframe(0f, 0f), new Keyframe(0.25f, -0.14f), new Keyframe(0.50f, -0.25f)));
            c.SetCurve("Hips", typeof(Transform), "localEulerAngles.x", new AnimationCurve(
                new Keyframe(0f, 0f), new Keyframe(0.30f, 24f), new Keyframe(0.50f, 18f)));
            return c;
        }

        static AnimationClip MakeExitVehicleClip()
        {
            var c = new AnimationClip { name = "rpm_exit_vehicle", legacy = true, wrapMode = WrapMode.Once };
            c.SetCurve("", typeof(Transform), "localPosition.x", new AnimationCurve(
                new Keyframe(0f, 0.28f), new Keyframe(0.25f, 0.10f), new Keyframe(0.50f, 0f)));
            c.SetCurve("", typeof(Transform), "localPosition.y", new AnimationCurve(
                new Keyframe(0f, -0.22f), new Keyframe(0.25f, -0.06f), new Keyframe(0.50f, 0f)));
            c.SetCurve("Hips", typeof(Transform), "localEulerAngles.x", new AnimationCurve(
                new Keyframe(0f, 20f), new Keyframe(0.30f, 6f), new Keyframe(0.50f, 0f)));
            return c;
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
            BindBones(rig, go.transform);
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
            if (jump != null && anim.GetClip("jump") == null) anim.AddClip(jump, "jump");
            if (turn != null && anim.GetClip("turn") == null) anim.AddClip(turn, "turn");
            if (enterVehicle != null && anim.GetClip("enter_vehicle") == null) anim.AddClip(enterVehicle, "enter_vehicle");
            if (exitVehicle != null && anim.GetClip("exit_vehicle") == null) anim.AddClip(exitVehicle, "exit_vehicle");
            if (attack != null && anim.GetClip("attack") == null) anim.AddClip(attack, "attack");
            rig.Anim = anim;
            if (Application.isPlaying) rig.SetState("idle");
            return rig;
        }

        static void BindBones(RigInstance rig, Transform root)
        {
            rig.Hips = Find(root, "Hips");
            rig.Spine = Find(root, "Spine");
            rig.Spine1 = Find(root, "Spine1");
            rig.Spine2 = Find(root, "Spine2");
            rig.Neck = Find(root, "Neck");
            rig.Head = Find(root, "Head");
            rig.RightShoulder = Find(root, "RightShoulder");
            rig.RightArm = Find(root, "RightArm");
            rig.RightForeArm = Find(root, "RightForeArm");
            rig.RightHand = Find(root, "RightHand");
            rig.LeftShoulder = Find(root, "LeftShoulder");
            rig.LeftArm = Find(root, "LeftArm");
            rig.LeftForeArm = Find(root, "LeftForeArm");
            rig.LeftHand = Find(root, "LeftHand");
            rig.RightUpLeg = Find(root, "RightUpLeg");
            rig.RightLeg = Find(root, "RightLeg");
            rig.LeftUpLeg = Find(root, "LeftUpLeg");
            rig.LeftLeg = Find(root, "LeftLeg");
        }

        // Primitive attachments on the bones: an outfit overlay on the hips
        // (senator kaftan, agbada, gown, skirt), glasses on the head, a chain at the neck. Sized in rig-local metres.
        static void DestroyObj(Object o) { if (o == null) return; if (Application.isPlaying) Object.Destroy(o); else Object.DestroyImmediate(o); }

        static Material sharedLensMat, sharedFrameMat, sharedSilverMat, sharedWatchMetalMat, sharedWatchDialMat, sharedTattooMat;
        static readonly Dictionary<string, Material> weaponMatCache = new Dictionary<string, Material>();

        static void EnsureAccessoryMaterials()
        {
            if (sharedLensMat == null) { sharedLensMat = new Material(ShaderLib.Lit) { color = new Color(0.05f, 0.07f, 0.10f) }; sharedLensMat.SetFloat("_Smoothness", 0.95f); sharedLensMat.SetFloat("_Metallic", 0.45f); }
            if (sharedFrameMat == null) { sharedFrameMat = new Material(ShaderLib.Lit) { color = new Color(0.90f, 0.92f, 0.95f) }; sharedFrameMat.SetFloat("_Smoothness", 0.85f); sharedFrameMat.SetFloat("_Metallic", 0.70f); }
            if (sharedSilverMat == null) { sharedSilverMat = new Material(ShaderLib.Lit) { color = new Color(0.92f, 0.86f, 0.68f) }; sharedSilverMat.SetFloat("_Metallic", 0.92f); sharedSilverMat.SetFloat("_Smoothness", 0.88f); }
            if (sharedWatchMetalMat == null) { sharedWatchMetalMat = new Material(ShaderLib.Lit) { color = new Color(0.88f, 0.86f, 0.78f) }; sharedWatchMetalMat.SetFloat("_Metallic", 0.92f); sharedWatchMetalMat.SetFloat("_Smoothness", 0.88f); }
            if (sharedWatchDialMat == null) { sharedWatchDialMat = new Material(ShaderLib.Lit) { color = new Color(0.08f, 0.12f, 0.18f) }; sharedWatchDialMat.SetFloat("_Smoothness", 0.92f); }
            if (sharedTattooMat == null)
            {
                sharedTattooMat = new Material(ShaderLib.Lit) { color = Color.white };
                sharedTattooMat.SetFloat("_Smoothness", 0.34f);
                if (sharedTattooMat.HasProperty("_BaseMap")) sharedTattooMat.SetTexture("_BaseMap", ShaderLib.TattooTex);
                sharedTattooMat.mainTexture = ShaderLib.TattooTex;
            }
        }

        static void BuildAttachments(RigInstance rig, Transform root, float k)
        {
            EnsureAccessoryMaterials();
            var hips = Find(root, "Hips") ?? Find(root, "Spine");
            var head = Find(root, "Head");
            var neck = Find(root, "Neck") ?? head;
            var leftForeArm = Find(root, "LeftForeArm");
            var rightForeArm = Find(root, "RightForeArm");
            int layer = root.gameObject.layer;

            Transform SubPart(Transform parent, string name, PrimitiveType pt, Vector3 pos, Vector3 sc, Material mat, Quaternion? rot = null)
            {
                var p = GameObject.CreatePrimitive(pt); p.name = name; p.layer = layer; DestroyObj(p.GetComponent<Collider>());
                p.transform.SetParent(parent, false); p.transform.localPosition = pos; p.transform.localScale = sc;
                if (rot.HasValue) p.transform.localRotation = rot.Value;
                p.GetComponent<MeshRenderer>().sharedMaterial = mat;
                return p.transform;
            }

            if (hips != null)
            {
                var ov = GameObject.CreatePrimitive(PrimitiveType.Cylinder); ov.name = "Outfit overlay"; ov.layer = layer; DestroyObj(ov.GetComponent<Collider>());
                ov.transform.SetParent(hips, false);
                rig.OverlayMaterial = new Material(ShaderLib.Lit) { color = Color.white }; rig.OverlayMaterial.SetFloat("_Smoothness", 0.22f);
                ov.GetComponent<MeshRenderer>().sharedMaterial = rig.OverlayMaterial;
                rig.Overlay = ov.transform; ov.SetActive(false);
            }
            if (head != null)
            {
                var gRoot = new GameObject("Glasses") { layer = layer }.transform;
                gRoot.SetParent(head, false);
                SubPart(gRoot, "LeftLens", PrimitiveType.Cube, new Vector3(-0.30f, 0f, 0f), new Vector3(0.42f, 0.86f, 0.24f), sharedLensMat);
                SubPart(gRoot, "RightLens", PrimitiveType.Cube, new Vector3(0.30f, 0f, 0f), new Vector3(0.42f, 0.86f, 0.24f), sharedLensMat);
                SubPart(gRoot, "TopBar", PrimitiveType.Cube, new Vector3(0f, 0.42f, 0.04f), new Vector3(1.04f, 0.20f, 0.28f), sharedFrameMat);
                SubPart(gRoot, "Bridge", PrimitiveType.Cube, new Vector3(0f, 0.08f, 0.06f), new Vector3(0.22f, 0.18f, 0.26f), sharedFrameMat);
                SubPart(gRoot, "LeftTemple", PrimitiveType.Cube, new Vector3(-0.51f, 0.12f, -1.6f), new Vector3(0.08f, 0.22f, 3.2f), sharedFrameMat);
                SubPart(gRoot, "RightTemple", PrimitiveType.Cube, new Vector3(0.51f, 0.12f, -1.6f), new Vector3(0.08f, 0.22f, 3.2f), sharedFrameMat);
                rig.Glasses = gRoot; gRoot.gameObject.SetActive(false);
            }
            if (neck != null)
            {
                var cRoot = new GameObject("Chain") { layer = layer }.transform;
                cRoot.SetParent(neck, false);
                SubPart(cRoot, "LeftLink", PrimitiveType.Cylinder, new Vector3(-0.28f, -0.35f, 0.32f), new Vector3(0.10f, 0.48f, 0.10f), sharedSilverMat, Quaternion.Euler(28f, 0f, 26f));
                SubPart(cRoot, "RightLink", PrimitiveType.Cylinder, new Vector3(0.28f, -0.35f, 0.32f), new Vector3(0.10f, 0.48f, 0.10f), sharedSilverMat, Quaternion.Euler(28f, 0f, -26f));
                SubPart(cRoot, "BottomCurve", PrimitiveType.Cylinder, new Vector3(0f, -0.78f, 0.50f), new Vector3(0.11f, 0.24f, 0.11f), sharedSilverMat, Quaternion.Euler(0f, 0f, 90f));
                SubPart(cRoot, "Medallion", PrimitiveType.Cylinder, new Vector3(0f, -0.94f, 0.54f), new Vector3(0.24f, 0.04f, 0.24f), sharedSilverMat, Quaternion.Euler(90f, 0f, 0f));
                rig.Chain = cRoot; cRoot.gameObject.SetActive(false);
            }
            if (leftForeArm != null)
            {
                var wRoot = new GameObject("Wristwatch") { layer = layer }.transform;
                wRoot.SetParent(leftForeArm, false);
                SubPart(wRoot, "Band", PrimitiveType.Cylinder, Vector3.zero, new Vector3(1.0f, 0.35f, 1.0f), sharedWatchMetalMat);
                SubPart(wRoot, "Face", PrimitiveType.Cylinder, new Vector3(0f, 0f, 0.48f), new Vector3(0.65f, 0.12f, 0.65f), sharedWatchDialMat, Quaternion.Euler(90f, 0f, 0f));
                rig.Watch = wRoot;

                rig.TattooMaterial = sharedTattooMat;
                rig.TattooL = SubPart(leftForeArm, "TattooSleeveL", PrimitiveType.Cylinder, Vector3.zero, Vector3.one, rig.TattooMaterial);
                if (rightForeArm != null)
                    rig.TattooR = SubPart(rightForeArm, "TattooSleeveR", PrimitiveType.Cylinder, Vector3.zero, Vector3.one, rig.TattooMaterial);
            }
        }

        public static Transform BuildWeaponProp(Transform hand, int layer = 0)
        {
            var wRoot = new GameObject("WeaponProp") { layer = layer }.transform;
            wRoot.SetParent(hand, false);
            var ls = hand.lossyScale;
            float inv = 1f / Mathf.Max(0.2f, Mathf.Abs(ls.y) > 0.01f ? Mathf.Abs(ls.y) : 1f);
            wRoot.localScale = Vector3.one * inv;
            wRoot.localPosition = new Vector3(0.02f * inv, 0.05f * inv, 0.04f * inv);
            wRoot.localRotation = Quaternion.Euler(75f, 0f, 0f);

            Transform Prim(Transform p, string n, PrimitiveType pt, Vector3 pos, Vector3 sc, Color col, float metal = 0.1f, float smooth = 0.4f, Quaternion? rot = null)
            {
                var g = GameObject.CreatePrimitive(pt); g.name = n; g.layer = layer; DestroyObj(g.GetComponent<Collider>());
                g.transform.SetParent(p, false); g.transform.localPosition = pos; g.transform.localScale = sc;
                if (rot.HasValue) g.transform.localRotation = rot.Value;
                string mKey = $"{ColorUtility.ToHtmlStringRGB(col)}:{metal:0.00}:{smooth:0.00}";
                if (!weaponMatCache.TryGetValue(mKey, out var m) || m == null)
                {
                    m = new Material(ShaderLib.Lit) { color = col }; m.SetFloat("_Metallic", metal); m.SetFloat("_Smoothness", smooth);
                    weaponMatCache[mKey] = m;
                }
                g.GetComponent<MeshRenderer>().sharedMaterial = m;
                return g.transform;
            }
            Transform Group(string id)
            {
                var g = new GameObject(id) { layer = layer }.transform;
                g.SetParent(wRoot, false); g.gameObject.SetActive(false);
                return g;
            }

            // 1. 2x4 Nail Plank
            var plank = Group("plank");
            Prim(plank, "Board", PrimitiveType.Cube, new Vector3(0f, 0.24f, 0f), new Vector3(0.045f, 0.58f, 0.09f), new Color(0.58f, 0.38f, 0.20f), 0f, 0.2f);
            Prim(plank, "Nail1", PrimitiveType.Cylinder, new Vector3(0f, 0.46f, 0.06f), new Vector3(0.012f, 0.05f, 0.012f), new Color(0.78f, 0.80f, 0.84f), 0.8f, 0.7f, Quaternion.Euler(90f, 0f, 0f));
            Prim(plank, "Nail2", PrimitiveType.Cylinder, new Vector3(0f, 0.40f, -0.06f), new Vector3(0.012f, 0.05f, 0.012f), new Color(0.78f, 0.80f, 0.84f), 0.8f, 0.7f, Quaternion.Euler(90f, 0f, 0f));

            // 2. Pepper Spray
            var pepper = Group("pepper");
            Prim(pepper, "Canister", PrimitiveType.Cylinder, new Vector3(0f, 0.04f, 0f), new Vector3(0.045f, 0.07f, 0.045f), new Color(0.84f, 0.16f, 0.16f), 0.3f, 0.7f);
            Prim(pepper, "Nozzle", PrimitiveType.Cylinder, new Vector3(0f, 0.12f, 0f), new Vector3(0.032f, 0.02f, 0.032f), new Color(0.10f, 0.10f, 0.12f), 0.1f, 0.5f);

            // 3. Koboko Horsewhip
            var koboko = Group("koboko");
            Prim(koboko, "Grip", PrimitiveType.Cylinder, new Vector3(0f, 0.06f, 0f), new Vector3(0.038f, 0.11f, 0.038f), new Color(0.28f, 0.15f, 0.08f), 0f, 0.35f);
            Prim(koboko, "Lash1", PrimitiveType.Capsule, new Vector3(0f, 0.28f, 0.03f), new Vector3(0.024f, 0.18f, 0.024f), new Color(0.18f, 0.10f, 0.05f), 0f, 0.3f, Quaternion.Euler(14f, 0f, 0f));
            Prim(koboko, "Lash2", PrimitiveType.Capsule, new Vector3(0f, 0.54f, 0.12f), new Vector3(0.016f, 0.16f, 0.016f), new Color(0.16f, 0.09f, 0.04f), 0f, 0.3f, Quaternion.Euler(28f, 0f, 0f));

            // 4. Brass Knuckles
            var knuckles = Group("knuckles");
            Prim(knuckles, "Band", PrimitiveType.Cube, new Vector3(0f, 0.02f, 0.04f), new Vector3(0.035f, 0.11f, 0.045f), new Color(0.85f, 0.68f, 0.20f), 0.85f, 0.75f);

            // 5. Iron Rod / Baton (also used for generic "weapon")
            var baton = Group("baton");
            Prim(baton, "Grip", PrimitiveType.Cylinder, new Vector3(0f, 0.05f, 0f), new Vector3(0.038f, 0.09f, 0.038f), new Color(0.12f, 0.12f, 0.14f), 0.1f, 0.3f);
            Prim(baton, "Rod", PrimitiveType.Cylinder, new Vector3(0f, 0.30f, 0f), new Vector3(0.030f, 0.24f, 0.030f), new Color(0.32f, 0.35f, 0.39f), 0.75f, 0.65f);

            // 6. Cutlass / Machete
            var cutlass = Group("cutlass");
            Prim(cutlass, "Handle", PrimitiveType.Cube, new Vector3(0f, 0.04f, 0f), new Vector3(0.032f, 0.12f, 0.042f), new Color(0.32f, 0.18f, 0.09f), 0f, 0.3f);
            Prim(cutlass, "Guard", PrimitiveType.Cube, new Vector3(0f, 0.11f, 0f), new Vector3(0.042f, 0.018f, 0.085f), new Color(0.78f, 0.62f, 0.18f), 0.7f, 0.6f);
            Prim(cutlass, "Blade", PrimitiveType.Cube, new Vector3(0f, 0.36f, 0.01f), new Vector3(0.012f, 0.48f, 0.068f), new Color(0.82f, 0.85f, 0.89f), 0.85f, 0.8f);

            // 7. 9mm Beretta Pistol
            var pistol = Group("pistol");
            Prim(pistol, "Grip", PrimitiveType.Cube, new Vector3(0f, 0.03f, -0.01f), new Vector3(0.032f, 0.11f, 0.046f), new Color(0.14f, 0.15f, 0.17f), 0.4f, 0.5f, Quaternion.Euler(-14f, 0f, 0f));
            Prim(pistol, "Slide", PrimitiveType.Cube, new Vector3(0f, 0.13f, 0.03f), new Vector3(0.034f, 0.20f, 0.042f), new Color(0.22f, 0.24f, 0.28f), 0.85f, 0.75f);
            Prim(pistol, "Barrel", PrimitiveType.Cylinder, new Vector3(0f, 0.24f, 0.03f), new Vector3(0.018f, 0.04f, 0.018f), new Color(0.10f, 0.10f, 0.12f), 0.9f, 0.8f);

            // 8. Pump-Action Shotgun
            var shotgun = Group("shotgun");
            Prim(shotgun, "Stock", PrimitiveType.Cube, new Vector3(0f, -0.04f, -0.02f), new Vector3(0.038f, 0.18f, 0.065f), new Color(0.42f, 0.24f, 0.11f), 0.05f, 0.35f, Quaternion.Euler(-10f, 0f, 0f));
            Prim(shotgun, "Receiver", PrimitiveType.Cube, new Vector3(0f, 0.12f, 0f), new Vector3(0.040f, 0.18f, 0.055f), new Color(0.18f, 0.20f, 0.22f), 0.8f, 0.7f);
            Prim(shotgun, "Barrel", PrimitiveType.Cylinder, new Vector3(0f, 0.40f, 0.012f), new Vector3(0.022f, 0.24f, 0.022f), new Color(0.15f, 0.16f, 0.18f), 0.85f, 0.75f);
            Prim(shotgun, "Pump", PrimitiveType.Cylinder, new Vector3(0f, 0.32f, -0.014f), new Vector3(0.034f, 0.10f, 0.034f), new Color(0.45f, 0.26f, 0.12f), 0.05f, 0.35f);

            // 9. Tactical AK-47 Rifle
            var rifle = Group("rifle");
            Prim(rifle, "Stock", PrimitiveType.Cube, new Vector3(0f, -0.06f, -0.02f), new Vector3(0.036f, 0.18f, 0.062f), new Color(0.46f, 0.25f, 0.11f), 0.05f, 0.35f, Quaternion.Euler(-8f, 0f, 0f));
            Prim(rifle, "Receiver", PrimitiveType.Cube, new Vector3(0f, 0.12f, 0f), new Vector3(0.040f, 0.22f, 0.058f), new Color(0.16f, 0.18f, 0.20f), 0.82f, 0.7f);
            Prim(rifle, "Handguard", PrimitiveType.Cube, new Vector3(0f, 0.30f, 0f), new Vector3(0.038f, 0.14f, 0.050f), new Color(0.48f, 0.26f, 0.12f), 0.05f, 0.35f);
            Prim(rifle, "Magazine", PrimitiveType.Cube, new Vector3(0f, 0.16f, 0.075f), new Vector3(0.028f, 0.065f, 0.13f), new Color(0.22f, 0.22f, 0.25f), 0.75f, 0.65f, Quaternion.Euler(22f, 0f, 0f));
            Prim(rifle, "Barrel", PrimitiveType.Cylinder, new Vector3(0f, 0.48f, 0.008f), new Vector3(0.018f, 0.18f, 0.018f), new Color(0.12f, 0.13f, 0.15f), 0.9f, 0.8f);

            // 10. Navy MP5 Tactical SMG
            var smg = Group("smg");
            Prim(smg, "Stock", PrimitiveType.Cube, new Vector3(0f, -0.04f, -0.01f), new Vector3(0.030f, 0.14f, 0.050f), new Color(0.12f, 0.14f, 0.18f), 0.7f, 0.6f);
            Prim(smg, "Receiver", PrimitiveType.Cube, new Vector3(0f, 0.12f, 0f), new Vector3(0.038f, 0.20f, 0.054f), new Color(0.15f, 0.18f, 0.24f), 0.85f, 0.75f);
            Prim(smg, "Magazine", PrimitiveType.Cube, new Vector3(0f, 0.16f, 0.07f), new Vector3(0.024f, 0.05f, 0.12f), new Color(0.10f, 0.12f, 0.15f), 0.8f, 0.7f, Quaternion.Euler(16f, 0f, 0f));
            Prim(smg, "Suppressor", PrimitiveType.Cylinder, new Vector3(0f, 0.34f, 0.005f), new Vector3(0.028f, 0.12f, 0.028f), new Color(0.08f, 0.10f, 0.12f), 0.8f, 0.65f);

            // 11. M24 Marksman Sniper Rifle
            var sniper = Group("sniper");
            Prim(sniper, "Stock", PrimitiveType.Cube, new Vector3(0f, -0.08f, -0.02f), new Vector3(0.036f, 0.22f, 0.064f), new Color(0.22f, 0.28f, 0.18f), 0.2f, 0.4f);
            Prim(sniper, "Receiver", PrimitiveType.Cube, new Vector3(0f, 0.16f, 0f), new Vector3(0.038f, 0.26f, 0.052f), new Color(0.16f, 0.18f, 0.18f), 0.85f, 0.75f);
            Prim(sniper, "Scope", PrimitiveType.Cylinder, new Vector3(0f, 0.16f, -0.045f), new Vector3(0.028f, 0.11f, 0.028f), new Color(0.08f, 0.09f, 0.10f), 0.9f, 0.85f);
            Prim(sniper, "Barrel", PrimitiveType.Cylinder, new Vector3(0f, 0.52f, 0.006f), new Vector3(0.018f, 0.26f, 0.018f), new Color(0.12f, 0.13f, 0.15f), 0.9f, 0.85f);

            // 12. PKM Heavy Machine Gun
            var lmg = Group("lmg");
            Prim(lmg, "Stock", PrimitiveType.Cube, new Vector3(0f, -0.07f, -0.02f), new Vector3(0.042f, 0.20f, 0.068f), new Color(0.42f, 0.24f, 0.10f), 0.1f, 0.35f);
            Prim(lmg, "Receiver", PrimitiveType.Cube, new Vector3(0f, 0.15f, 0f), new Vector3(0.048f, 0.26f, 0.064f), new Color(0.18f, 0.20f, 0.22f), 0.82f, 0.7f);
            Prim(lmg, "AmmoBox", PrimitiveType.Cube, new Vector3(0.032f, 0.16f, 0.065f), new Vector3(0.055f, 0.10f, 0.095f), new Color(0.24f, 0.32f, 0.20f), 0.6f, 0.5f);
            Prim(lmg, "Barrel", PrimitiveType.Cylinder, new Vector3(0f, 0.48f, 0.008f), new Vector3(0.024f, 0.22f, 0.024f), new Color(0.12f, 0.14f, 0.16f), 0.9f, 0.8f);

            wRoot.gameObject.SetActive(false);
            return wRoot;
        }

        public static void SetWeapon(RigInstance rig, Transform host, string weaponId, int layer = 0)
        {
            string key = string.IsNullOrEmpty(weaponId) || weaponId == "fists" ? "" : (weaponId == "weapon" ? "baton" : weaponId);
            Transform wRoot = rig != null ? rig.WeaponRoot : null;
            if (wRoot == null && host != null)
                wRoot = Find(host, "WeaponProp");
            if (wRoot == null)
            {
                if (string.IsNullOrEmpty(key)) return;
                Transform attach = (rig != null ? rig.RightHand ?? rig.RightForeArm ?? rig.Hips : null) ?? (host != null ? Find(host, "RightHand") ?? host : null);
                if (attach == null) return;
                wRoot = BuildWeaponProp(attach, layer);
                if (host != null && attach == host)
                {
                    wRoot.localPosition = new Vector3(0.34f, 0.95f, 0.26f);
                    wRoot.localRotation = Quaternion.Euler(45f, 0f, 0f);
                }
                if (rig != null) rig.WeaponRoot = wRoot;
            }
            bool any = false;
            for (int i = 0; i < wRoot.childCount; i++)
            {
                var ch = wRoot.GetChild(i);
                bool match = !string.IsNullOrEmpty(key) && ch.name == key;
                ch.gameObject.SetActive(match);
                if (match) any = true;
            }
            wRoot.gameObject.SetActive(any);
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
                if (m.HasProperty("_Smoothness")) m.SetFloat("_Smoothness", 0.28f);
                if (print == null) { Tint(m, fabricColour); continue; }
                Tint(m, Color.white);
                if (m.HasProperty("baseColorTexture")) { m.SetTexture("baseColorTexture", print); if (m.HasProperty("baseColorTexture_ST")) m.SetVector("baseColorTexture_ST", new Vector4(2f, 2f, 0f, 0f)); }
                else if (m.HasProperty("_BaseMap")) { m.SetTexture("_BaseMap", print); m.SetTextureScale("_BaseMap", new Vector2(2f, 2f)); }
                else m.mainTexture = print;
            }
            foreach (var m in rig.Bottom)
            {
                if (m.HasProperty("_Smoothness")) m.SetFloat("_Smoothness", 0.26f);
                Tint(m, look.Pants);
            }
            Color richSkin = Color.Lerp(look.Skin, new Color(0.84f, 0.58f, 0.40f), 0.10f);
            foreach (var m in rig.Skin)
            {
                if (m.HasProperty("_Smoothness")) m.SetFloat("_Smoothness", 0.36f);
                Tint(m, richSkin);
            }
            if (rig.TattooMaterial != null) Tint(rig.TattooMaterial, richSkin);
            foreach (var m in rig.Hair)
            {
                if (m.HasProperty("_Smoothness")) m.SetFloat("_Smoothness", 0.30f);
                Tint(m, look.Hair);
            }
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
            string outfit = look.Outfit < OutfitNames.Length ? OutfitNames[look.Outfit] : "Ankara shirt";
            bool showGlasses = acc == "Glasses";
            bool showChain = acc == "Chain" || outfit == "T-shirt & jeans" || outfit == "Singlet & jeans" || outfit == "Tank top & shorts" || outfit == "Super Eagles";
            bool bareArms = outfit == "T-shirt & jeans" || outfit == "Singlet & jeans" || outfit == "Tank top & shorts" || outfit == "Super Eagles" || outfit == "Ankara shirt";
            if (rig.Glasses != null) { rig.Glasses.gameObject.SetActive(showGlasses); if (showGlasses) Fit(rig.Glasses, rig.Glasses.parent, new Vector3(0.145f, 0.032f, 0.028f), new Vector3(0f, 0.042f, 0.098f), rig.BaseScale); }
            if (rig.Chain != null) { rig.Chain.gameObject.SetActive(showChain); if (showChain) Fit(rig.Chain, rig.Chain.parent, new Vector3(0.14f, 0.09f, 0.14f), new Vector3(0f, -0.02f, 0.02f), rig.BaseScale); }
            if (rig.Watch != null) { rig.Watch.gameObject.SetActive(true); Fit(rig.Watch, rig.Watch.parent, new Vector3(0.068f, 0.028f, 0.068f), new Vector3(0f, 0.14f, 0f), rig.BaseScale); }
            if (rig.TattooL != null) { rig.TattooL.gameObject.SetActive(bareArms); if (bareArms) Fit(rig.TattooL, rig.TattooL.parent, new Vector3(0.072f, 0.085f, 0.072f), new Vector3(0f, 0.06f, 0f), rig.BaseScale); }
            if (rig.TattooR != null) { rig.TattooR.gameObject.SetActive(bareArms); if (bareArms) Fit(rig.TattooR, rig.TattooR.parent, new Vector3(0.072f, 0.085f, 0.072f), new Vector3(0f, 0.06f, 0f), rig.BaseScale); }
            // Outfit silhouette overlays in the fabric print, scaled snugly to the waist so they never protrude like a barrel.
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
