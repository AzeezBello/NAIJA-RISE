using System.Collections.Generic;
using UnityEngine;
using NaijaRise.Data;
using NaijaRise.Entities;

namespace NaijaRise.World
{
    // Agberos at the bus stops (src/entities/npcs.js spawnAgberos, dialogue.js runAgbero), uniformed service NPCs
    // standing at their posts, night hustlers outside the clubs after 20:00 (mature content, off by default), the owambe
    // crowd at the event centre from 19:00, and the pet dog that follows you and keeps agberos away.
    public class StreetLife : MonoBehaviour
    {
        public class Agbero { public Transform t; public Vector3 pos; public BusStopData stop; public float cool; }
        [System.NonSerialized] public readonly List<Agbero> Agberos = new List<Agbero>();
        public readonly List<Transform> Service = new List<Transform>();
        [System.NonSerialized] public readonly List<(Transform t, string name)> Nightlife = new List<(Transform, string)>();
        readonly List<Transform> crowd = new List<Transform>();
        Transform pet; Animation petAnim; int partyDay = -1;
        WorldData data; Transform player; DayNightCycle clock; Transform root;

        public void Init(WorldData world, Transform playerTransform, DayNightCycle dayNight, Transform parent)
        {
            data = world; player = playerTransform; clock = dayNight;
            root = new GameObject("Street life").transform; root.SetParent(parent, false);
            var rng = new System.Random(23);
            foreach (var b in data.busStops)
                for (int i = 0; i < b.agberos; i++)
                {
                    var pos = WorldData.W(b.x - 6f + i * 12f, 0f, b.z - 2.5f); pos.y = data.DeckHeightAt(pos) + 0.3f;
                    var go = new GameObject("Agbero"); go.transform.SetParent(root, false); go.transform.position = pos; go.transform.rotation = Quaternion.Euler(0, 180, 0);
                    var look = new Look { Fabric = 8, Pants = Mannequin.Hex(rng.NextDouble() < 0.5 ? "#c8d400" : "#2bb34a"), Skin = Mannequin.Hex("#5a3a28"), Hair = Color.black, Cap = Mannequin.Hex("#d62828"), BodyType = 2, Accessory = 2, Outfit = 6 };
                    if (CharacterRig.Available) CharacterRig.Build(go.transform, look, 0, 1.9f); else Mannequin.Build(go.transform, look.Pants, Color.black, look.Skin, look.Cap);
                    Mannequin.Label(go.transform, "Agbero", new Color(0.78f, 0.83f, 0f), 2.3f, 0.5f);
                    Agberos.Add(new Agbero { t = go.transform, pos = pos, stop = b });
                }
            foreach (var n in data.serviceNpcs)
            {
                var pos = n.World(); pos.y = data.DeckHeightAt(pos) + 0.3f;
                var go = new GameObject("Service " + n.u); go.transform.SetParent(root, false); go.transform.position = pos; go.transform.rotation = Quaternion.Euler(0, 180, 0);
                var c = Mannequin.Hex(n.color, "#444444");
                var look = new Look { Fabric = 8, Pants = c * 0.8f, Skin = Mannequin.Hex("#6b4423"), Hair = Color.black, Cap = c, BodyType = 1, Accessory = 2, Outfit = 5 };
                if (CharacterRig.Available) { var rig = CharacterRig.Build(go.transform, look); foreach (var m in rig.Top) { if (m.HasProperty("baseColorFactor")) m.SetColor("baseColorFactor", c); else m.color = c; if (m.HasProperty("baseColorTexture")) m.SetTexture("baseColorTexture", null); } }
                else Mannequin.Build(go.transform, c, c * 0.8f, Mannequin.Hex("#6b4423"), c);
                Mannequin.Label(go.transform, n.u.ToUpper(), Color.white, 2.3f, 0.45f);
                Service.Add(go.transform);
            }
            foreach (var n in data.nightlife)
            {
                var pos = n.World(); pos.y = data.DeckHeightAt(pos) + 0.3f;
                var go = new GameObject("Night " + n.name); go.transform.SetParent(root, false); go.transform.position = pos; go.transform.rotation = Quaternion.Euler(0, 180, 0);
                var look = new Look { Fabric = 2, Pants = Mannequin.Hex("#6e1a2c"), Skin = Mannequin.Hex("#8a5a3c"), Hair = Mannequin.Hex("#d62828"), Cap = null, BodyType = 0, Outfit = 9, HairStyle = 3 };
                if (CharacterRig.Available) CharacterRig.Build(go.transform, look); else Mannequin.Build(go.transform, Mannequin.Hex("#ff5d9e"), look.Pants, look.Skin, null);
                Mannequin.Label(go.transform, n.name, new Color(1f, 0.36f, 0.62f), 2.3f, 0.5f);
                go.SetActive(false);
                Nightlife.Add((go.transform, n.name));
            }
        }

        public bool NightOpen => clock != null && (clock.Clock >= 20f || clock.Clock < 4f);

        public Agbero NearestAgbero(Vector3 pos, float r) { Agbero best = null; float bd = r * r; foreach (var a in Agberos) { float d = (a.pos - pos).sqrMagnitude; if (d < bd) { bd = d; best = a; } } return best; }
        public (Transform t, string name)? NearestNightlife(Vector3 pos, float r) { (Transform, string)? best = null; float bd = r * r; foreach (var n in Nightlife) { if (!n.t.gameObject.activeSelf) continue; float d = (n.t.position - pos).sqrMagnitude; if (d < bd) { bd = d; best = n; } } return best; }

        public void AdoptDog()
        {
            if (pet != null) return;
            var prefab = Resources.Load<GameObject>("Models/Animals/dog");
            var go = new GameObject("Pet dog"); go.transform.SetParent(root, false); go.transform.position = player.position + player.right * 1.2f;
            if (prefab != null)
            {
                var m = Instantiate(prefab, go.transform, false); var b = CharacterRig.Bounds(m); float k = b.size.y > 0.01f ? 0.62f / b.size.y : 1f; m.transform.localScale = Vector3.one * k;
                b = CharacterRig.Bounds(m); m.transform.localPosition = new Vector3(-(b.center.x - go.transform.position.x), -(b.min.y - go.transform.position.y), -(b.center.z - go.transform.position.z));
                foreach (var c in m.GetComponentsInChildren<Collider>()) Destroy(c);
                var walk = Resources.Load<AnimationClip>("Characters/dog_walk"); var idle = Resources.Load<AnimationClip>("Characters/dog_idle");
                if (walk != null) { petAnim = go.GetComponentInChildren<Animation>(); if (petAnim == null) petAnim = go.AddComponent<Animation>(); petAnim.AddClip(walk, "walk"); if (idle != null) petAnim.AddClip(idle, "idle"); petAnim.wrapMode = WrapMode.Loop; }
            }
            else { var p = GameObject.CreatePrimitive(PrimitiveType.Capsule); p.transform.SetParent(go.transform, false); p.transform.localPosition = new Vector3(0, 0.35f, 0); p.transform.localRotation = Quaternion.Euler(90, 0, 0); p.transform.localScale = new Vector3(0.3f, 0.4f, 0.3f); p.GetComponent<MeshRenderer>().sharedMaterial = Mannequin.Mat(new Color(0.55f, 0.4f, 0.25f)); Destroy(p.GetComponent<Collider>()); }
            pet = go.transform;
        }
        public bool HasPet => pet != null;

        void Update()
        {
            float dt = Time.deltaTime; bool night = NightOpen;
            foreach (var a in Agberos) { a.cool -= dt; a.t.rotation = Quaternion.Euler(0f, 180f + Mathf.Sin(Time.time * 1.1f + a.pos.x) * 23f, 0f); }
            foreach (var n in Nightlife) n.t.gameObject.SetActive(night && mature);
            if (pet != null)
            {
                var to = player.position - player.right * 1.1f - pet.position; to.y = 0f;
                if (to.magnitude > 1.6f) { pet.position += to.normalized * Mathf.Min(to.magnitude, 6f) * dt; pet.rotation = Quaternion.Slerp(pet.rotation, Quaternion.LookRotation(to.normalized, Vector3.up), 1f - Mathf.Exp(-8f * dt)); if (petAnim != null && !petAnim.IsPlaying("walk")) petAnim.CrossFade("walk", 0.2f); }
                else if (petAnim != null && !petAnim.IsPlaying("idle") && petAnim.GetClip("idle") != null) petAnim.CrossFade("idle", 0.3f);
                var p = pet.position; p.y = data.DeckHeightAt(p) + 0.3f; pet.position = p;
            }
            // Owambe at the Surulere Event Centre, 19:00–23:30.
            bool owambe = clock != null && clock.Clock >= 19f && clock.Clock < 23.5f;
            if (owambe && partyDay != clock.Day && data.TryPlace("owambe", out var hall))
            {
                partyDay = clock.Day;
                var rng = new System.Random(clock.Day);
                string[] cols = { "#d62878", "#2878d6", "#f5c518", "#7a28d6", "#28b57a", "#ff6a1a" };
                for (int i = 0; i < 14; i++)
                {
                    var go = new GameObject("Owambe guest"); go.transform.SetParent(root, false);
                    var pos = hall.World() + new Vector3((float)(rng.NextDouble() * 22 - 11), 0f, -(8f + (float)rng.NextDouble() * 7f)); pos.y = data.DeckHeightAt(pos) + 0.3f; go.transform.position = pos;
                    var col = Mannequin.Hex(cols[rng.Next(cols.Length)]);
                    var look = new Look { Fabric = rng.Next(3), Pants = col, Skin = Mannequin.Hex("#5a3a28"), Hair = Color.black, Cap = col, BodyType = rng.Next(3), Outfit = rng.NextDouble() < 0.5 ? 3 : 9, Accessory = 1 };
                    if (CharacterRig.Available) CharacterRig.Build(go.transform, look); else Mannequin.Build(go.transform, col, col, look.Skin, col);
                    crowd.Add(go.transform);
                }
            }
            if (!owambe && crowd.Count > 0) { foreach (var c in crowd) Destroy(c.gameObject); crowd.Clear(); }
            for (int i = 0; i < crowd.Count; i++) crowd[i].rotation = Quaternion.Euler(0f, Mathf.Sin(Time.time * 0.5f + i) * 30f, 0f);
        }

        [System.NonSerialized] public bool mature;
    }
}
