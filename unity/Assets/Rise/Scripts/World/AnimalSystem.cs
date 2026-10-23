using System.Collections.Generic;
using UnityEngine;
using Rise.Data;
using Rise.Entities;

namespace Rise.World
{
    // Goats around the markets, chickens near compounds, stray dogs and cats.
    // The dog is the rigged GLB with its walk and idle clips; the cat is the static GLB; goats and chickens are
    // primitives. Each wanders a small patch around its home spot.
    public class AnimalSystem : MonoBehaviour
    {
        class Animal { public Transform t; public Vector3 home, target; public float speed, pause; public Animation anim; public string kind; }
        readonly List<Animal> animals = new List<Animal>();
        public int Count => animals.Count;
        public int Dogs { get; private set; }
        WorldData data;

        public void Init(WorldData world, Transform parent)
        {
            data = world;
            var root = new GameObject("Animals").transform; root.SetParent(parent, false);
            var rng = new System.Random(17);
            var dog = Resources.Load<GameObject>("Models/Animals/dog"); var cat = Resources.Load<GameObject>("Models/Animals/cat");
            var cow = Resources.Load<GameObject>("Models/Animals/cow");
            var dogWalk = Resources.Load<AnimationClip>("Characters/dog_walk"); var dogIdle = Resources.Load<AnimationClip>("Characters/dog_idle");
            foreach (var a in data.animals)
            {
                var go = new GameObject(a.kind); go.transform.SetParent(root, false);
                var pos = a.World(); pos.y = data.DeckHeightAt(pos);
                go.transform.position = pos;
                var an = new Animal { t = go.transform, home = pos, target = pos, kind = a.kind, speed = a.kind == "chicken" ? 0.6f : a.kind == "goat" ? 0.9f : 1.6f, pause = (float)rng.NextDouble() * 3f };
                if (a.kind == "dog" && dog != null) { Model(go.transform, dog, 0.62f); Dogs++; if (dogWalk != null) { var anim = go.GetComponentInChildren<Animation>(); if (anim == null) anim = go.AddComponent<Animation>(); anim.AddClip(dogWalk, "walk"); if (dogIdle != null) anim.AddClip(dogIdle, "idle"); anim.wrapMode = WrapMode.Loop; anim.playAutomatically = false; an.anim = anim; } }
                else if (a.kind == "cat" && cat != null) Model(go.transform, cat, 0.35f);
                else if ((a.kind == "goat" || a.kind == "cow") && cow != null) Model(go.transform, cow, a.kind == "cow" ? 1.25f : 0.72f);
                else Primitive(go.transform, a.kind);
                animals.Add(an);
            }
            // Stray cats and grazing cattle by the markets.
            foreach (var l in data.landmarks) if (l.kind == "market" && animals.Count < data.animals.Length + 6)
            {
                if (cat != null)
                {
                    var go = new GameObject("cat"); go.transform.SetParent(root, false);
                    var pos = l.World() + new Vector3(6f, 0f, 9f); pos.y = data.DeckHeightAt(pos); go.transform.position = pos;
                    Model(go.transform, cat, 0.35f);
                    animals.Add(new Animal { t = go.transform, home = pos, target = pos, kind = "cat", speed = 1.1f });
                }
                if (cow != null)
                {
                    var cgo = new GameObject("cow"); cgo.transform.SetParent(root, false);
                    var cpos = l.World() + new Vector3(-7f, 0f, 10f); cpos.y = data.DeckHeightAt(cpos); cgo.transform.position = cpos;
                    Model(cgo.transform, cow, 1.22f);
                    animals.Add(new Animal { t = cgo.transform, home = cpos, target = cpos, kind = "cow", speed = 0.8f });
                }
            }
        }

        static void Model(Transform parent, GameObject prefab, float height)
        {
            var m = Instantiate(prefab, parent, false); m.name = "Model";
            CharacterRig.RemapGlbMaterialsToLit(m, 0.25f);
            var b = CharacterRig.Bounds(m); float k = b.size.y > 0.01f ? height / b.size.y : 1f;
            m.transform.localScale = Vector3.one * k;
            b = CharacterRig.Bounds(m);
            m.transform.localPosition = new Vector3(-(b.center.x - parent.position.x), -(b.min.y - parent.position.y), -(b.center.z - parent.position.z));
            foreach (var c in m.GetComponentsInChildren<Collider>()) Destroy(c);
        }

        static void Primitive(Transform parent, string kind)
        {
            Color body = kind == "goat" ? new Color(0.85f, 0.82f, 0.75f) : new Color(0.9f, 0.6f, 0.3f);
            var b = GameObject.CreatePrimitive(PrimitiveType.Capsule); b.transform.SetParent(parent, false); Destroy(b.GetComponent<Collider>());
            if (kind == "goat") { b.transform.localPosition = new Vector3(0, 0.45f, 0); b.transform.localRotation = Quaternion.Euler(90, 0, 0); b.transform.localScale = new Vector3(0.35f, 0.45f, 0.35f); }
            else { b.transform.localPosition = new Vector3(0, 0.18f, 0); b.transform.localScale = new Vector3(0.22f, 0.16f, 0.22f); }
            b.GetComponent<MeshRenderer>().sharedMaterial = Mannequin.Mat(body);
            var h = GameObject.CreatePrimitive(PrimitiveType.Sphere); h.transform.SetParent(parent, false); Destroy(h.GetComponent<Collider>());
            h.transform.localPosition = kind == "goat" ? new Vector3(0, 0.62f, 0.45f) : new Vector3(0, 0.34f, 0.14f); h.transform.localScale = Vector3.one * (kind == "goat" ? 0.22f : 0.1f);
            h.GetComponent<MeshRenderer>().sharedMaterial = Mannequin.Mat(kind == "goat" ? body * 0.8f : new Color(0.8f, 0.2f, 0.15f));
            if (kind == "goat") foreach (var x in new[] { -0.12f, 0.12f }) foreach (var z in new[] { -0.3f, 0.3f }) { var leg = GameObject.CreatePrimitive(PrimitiveType.Cylinder); leg.transform.SetParent(parent, false); Destroy(leg.GetComponent<Collider>()); leg.transform.localPosition = new Vector3(x, 0.15f, z); leg.transform.localScale = new Vector3(0.06f, 0.15f, 0.06f); leg.GetComponent<MeshRenderer>().sharedMaterial = Mannequin.Mat(body * 0.7f); }
        }

        void Update()
        {
            float dt = Time.deltaTime;
            foreach (var a in animals)
            {
                if (a.pause > 0f) { a.pause -= dt; a.anim?.Play("idle"); continue; }
                var to = a.target - a.t.position; to.y = 0f;
                if (to.magnitude < 0.3f)
                {
                    a.pause = Random.Range(1f, 5f);
                    var r = Random.insideUnitCircle * (a.kind == "chicken" ? 4f : 10f);
                    a.target = a.home + new Vector3(r.x, 0f, r.y);
                    if (data.InWater(a.target)) a.target = a.home;
                    continue;
                }
                if (a.anim != null && !a.anim.IsPlaying("walk")) a.anim.CrossFade("walk", 0.2f);
                var nextPos = a.t.position + to.normalized * a.speed * dt;
                nextPos.y = data.DeckHeightAt(nextPos);
                a.t.position = nextPos;
                a.t.rotation = Quaternion.Slerp(a.t.rotation, Quaternion.LookRotation(to.normalized, Vector3.up), 1f - Mathf.Exp(-6f * dt));
            }
        }
    }
}
