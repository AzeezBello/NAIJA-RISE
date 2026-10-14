using System.Collections.Generic;
using UnityEngine;
using NaijaRise.Data;
using NaijaRise.Entities;

namespace NaijaRise.World
{
    // Story and job contacts stand outside their places as people: Baba K outside Ojuelegba Junction, Amaka at the
    // Iponri yard, Dayo at Ladipo… They carry a name label and turn to face you as you approach.
    public class ContactSystem : MonoBehaviour
    {
        public class Contact { public ContactData data; public Transform t; public Vector3 pos; public Quaternion rest; }

        readonly List<Contact> contacts = new List<Contact>();
        public IReadOnlyList<Contact> Contacts => contacts;
        Transform player, arrow;
        string arrowFor;

        public void Init(WorldData world, Transform playerTransform, Transform parent)
        {
            player = playerTransform;
            var root = new GameObject("Contacts").transform; root.SetParent(parent, false);
            var rng = new System.Random(11);
            foreach (var c in world.contacts)
            {
                if (!world.ContactSpot(c, out var pos)) continue;
                pos.y = world.DeckHeightAt(pos) + 0.3f;
                var go = new GameObject("Contact " + c.name);
                go.transform.SetParent(root, false);
                go.transform.position = pos;
                go.transform.rotation = Quaternion.Euler(0, 180f, 0);   // face the street (north, +z)
                var accent = Mannequin.Hex(c.color, "#ffc52f");
                Color top = Color.Lerp(accent, new Color(0.9f, 0.85f, 0.75f), 0.35f);
                Color pants = Mannequin.Hex(world.pants.Length > 0 ? world.pants[rng.Next(world.pants.Length)] : "#26312d");
                Color skin = Mannequin.Hex(world.skins.Length > 0 ? world.skins[rng.Next(world.skins.Length)] : "#8a5a3c");
                Color? cap = c.id == "babak" || c.id == "ikorodu_trader" ? (Color?)new Color(0.12f, 0.23f, 0.37f) : null;
                int fabric = Mathf.Abs(c.id.GetHashCode()) % Mathf.Max(1, world.fabrics.Length);
                var look = new Look { Fabric = fabric, Pants = pants, Skin = skin, Hair = Mannequin.Hex("#120b08"), Cap = cap, BodyType = 1, Accessory = cap.HasValue ? 1 : 0, FacialHair = c.id == "babak" ? 1 : 0 };
                foreach (var f in world.family) if (f.id == c.id) { look.Outfit = f.outfit; look.Fabric = f.fabric; look.BodyType = f.bodyType; look.HairStyle = f.hair; if (world.skins.Length > 0) look.Skin = Mannequin.Hex(world.skins[Mathf.Clamp(f.skin, 0, world.skins.Length - 1)]); if (world.pants.Length > 0) look.Pants = Mannequin.Hex(world.pants[Mathf.Clamp(f.pants, 0, world.pants.Length - 1)]); }
                if (CharacterRig.Available) CharacterRig.Build(go.transform, look);
                else Mannequin.Build(go.transform, top, pants, skin, cap);
                Mannequin.Label(go.transform, c.name, accent);
                contacts.Add(new Contact { data = c, t = go.transform, pos = pos, rest = go.transform.rotation });
            }
        }

        // The current objective's contact carries a bobbing yellow arrow over their head.
        public void SetArrow(string contactId)
        {
            if (arrow == null)
            {
                var go = GameObject.CreatePrimitive(PrimitiveType.Cylinder); go.name = "Objective arrow";
                go.transform.localScale = new Vector3(0.9f, 0.45f, 0.9f);
                var m = new Material(Shader.Find("Universal Render Pipeline/Lit")) { color = new Color(1f, 0.77f, 0.18f) }; m.EnableKeyword("_EMISSION"); m.SetColor("_EmissionColor", new Color(1f, 0.77f, 0.18f) * 1.5f);
                go.GetComponent<MeshRenderer>().sharedMaterial = m; Destroy(go.GetComponent<Collider>());
                arrow = go.transform; arrow.SetParent(transform, false);
            }
            arrowFor = contactId;
            arrow.gameObject.SetActive(!string.IsNullOrEmpty(contactId));
        }

        public Contact Get(string id) { foreach (var c in contacts) if (c.data.id == id) return c; return null; }
        public void Move(string id, Vector3 pos) { var c = Get(id); if (c == null) return; c.pos = pos; c.t.position = pos; }

        public Contact Nearest(Vector3 pos, float maxDist)
        {
            Contact best = null; float bestD = maxDist * maxDist;
            foreach (var c in contacts) { float d = (c.pos - pos).sqrMagnitude; if (d < bestD) { bestD = d; best = c; } }
            return best;
        }

        void Update()
        {
            if (player == null) return;
            if (arrow != null && arrow.gameObject.activeSelf)
                foreach (var c in contacts) if (c.data.id == arrowFor) { arrow.position = c.pos + Vector3.up * (2.9f + Mathf.Sin(Time.time * 4f) * 0.15f); arrow.Rotate(Vector3.up, Time.deltaTime * 90f); break; }
            foreach (var c in contacts)
            {
                var to = player.position - c.pos; to.y = 0f;
                if (to.sqrMagnitude < 14f * 14f && to.sqrMagnitude > 0.01f)
                    c.t.rotation = Quaternion.Slerp(c.t.rotation, Quaternion.LookRotation(to.normalized, Vector3.up), 1f - Mathf.Exp(-5f * Time.deltaTime));
                else
                    c.t.rotation = Quaternion.Slerp(c.t.rotation, c.rest, 1f - Mathf.Exp(-2f * Time.deltaTime));
            }
        }
    }
}
