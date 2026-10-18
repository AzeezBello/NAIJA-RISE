using UnityEngine;

namespace Rise.Entities
{
    // The primitive human used for the player, contacts and pedestrians until rigged characters arrive:
    // trousers, top (ankara / senator / jersey colour), head, optional fila, arms. No colliders.
    public static class Mannequin
    {
        static Shader standard;
        static readonly System.Collections.Generic.Dictionary<Color, Material> cache = new System.Collections.Generic.Dictionary<Color, Material>();

        public static Material Mat(Color c)
        {
            if (cache.TryGetValue(c, out var m)) return m;
            standard ??= ShaderLib.Lit;
            m = new Material(standard) { color = c };
            m.SetFloat("_Smoothness", 0.2f);
            return cache[c] = m;
        }

        public static Color Hex(string hex, string fallback = "#b07a55")
        {
            if (!string.IsNullOrEmpty(hex) && ColorUtility.TryParseHtmlString(hex, out var c)) return c;
            ColorUtility.TryParseHtmlString(fallback, out c);
            return c;
        }

        public static GameObject Build(Transform parent, Color top, Color pants, Color skin, Color? fila, int layer = 0, float scale = 1f)
        {
            var root = new GameObject("Body") { layer = layer };
            root.transform.SetParent(parent, false);
            root.transform.localScale = Vector3.one * scale;
            Part(root, PrimitiveType.Capsule, new Vector3(0, 0.5f, 0), new Vector3(0.44f, 0.5f, 0.44f), pants, layer);
            Part(root, PrimitiveType.Capsule, new Vector3(0, 1.15f, 0), new Vector3(0.56f, 0.38f, 0.42f), top, layer);
            Part(root, PrimitiveType.Sphere, new Vector3(0, 1.66f, 0), new Vector3(0.3f, 0.32f, 0.3f), skin, layer);
            Part(root, PrimitiveType.Capsule, new Vector3(-0.36f, 1.12f, 0), new Vector3(0.14f, 0.34f, 0.14f), skin, layer);
            Part(root, PrimitiveType.Capsule, new Vector3(0.36f, 1.12f, 0), new Vector3(0.14f, 0.34f, 0.14f), skin, layer);
            if (fila.HasValue) Part(root, PrimitiveType.Cylinder, new Vector3(0, 1.84f, 0), new Vector3(0.28f, 0.05f, 0.28f), fila.Value, layer);
            return root;
        }

        static void Part(GameObject root, PrimitiveType type, Vector3 pos, Vector3 scale, Color c, int layer)
        {
            var p = GameObject.CreatePrimitive(type);
            p.layer = layer; p.transform.SetParent(root.transform, false); p.transform.localPosition = pos; p.transform.localScale = scale;
            p.GetComponent<MeshRenderer>().sharedMaterial = Mat(c);
            var col = p.GetComponent<Collider>();
            if (Application.isPlaying) Object.Destroy(col); else Object.DestroyImmediate(col);
        }

        // A floating name label that faces the camera horizontally so it never renders mirrored or overlapping.
        public static void Label(Transform parent, string text, Color colour, float height = 2.25f, float size = 0.6f)
        {
            var font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            var go = new GameObject("Label");
            go.transform.SetParent(parent, false);
            go.transform.localPosition = new Vector3(0, height, 0);
            var tm = go.AddComponent<TextMesh>();
            tm.text = text; tm.font = font; tm.fontSize = 64; tm.characterSize = 0.07f * size; tm.fontStyle = FontStyle.Bold;
            tm.anchor = TextAnchor.MiddleCenter; tm.alignment = TextAlignment.Center; tm.color = colour;
            go.GetComponent<MeshRenderer>().sharedMaterial = font.material;
            go.AddComponent<FacingLabel>();
        }
    }

    public class FacingLabel : MonoBehaviour
    {
        public bool BoardSign;
        public Vector3 BasePos;
        public float OffsetZ = 0.18f;

        void LateUpdate()
        {
            var cam = Camera.main;
            if (cam == null) return;
            if (BoardSign)
            {
                bool north = cam.transform.position.z >= BasePos.z;
                transform.position = new Vector3(BasePos.x, BasePos.y, BasePos.z + (north ? OffsetZ : -OffsetZ));
                transform.rotation = north ? Quaternion.Euler(0f, 180f, 0f) : Quaternion.identity;
                return;
            }
            var d = transform.position - cam.transform.position;
            d.y = 0f;
            if (d.sqrMagnitude > 0.001f) transform.rotation = Quaternion.LookRotation(d, Vector3.up);
        }
    }
}
