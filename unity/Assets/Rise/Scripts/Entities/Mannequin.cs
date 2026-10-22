using UnityEngine;

namespace Rise.Entities
{
    // Detailed anatomical streetwear human used for characters, guards, and fallback rigs:
    // sculpted V-taper torso, shoulders, upper/forearms with tattoo & wristwatch, belt, tapered trousers,
    // two-tone streetwear sneakers, sculpted head with beard/hair fade, sunglasses, and Cuban link chain.
    public static class Mannequin
    {
        static Shader standard;
        static readonly System.Collections.Generic.Dictionary<string, Material> cache = new System.Collections.Generic.Dictionary<string, Material>();

        public static Material Mat(Color c, float smoothness = 0.28f, float metallic = 0.04f)
        {
            string key = $"{c.r:F2}_{c.g:F2}_{c.b:F2}_{smoothness:F2}_{metallic:F2}";
            if (cache.TryGetValue(key, out var m) && m != null) return m;
            standard ??= ShaderLib.Lit;
            m = new Material(standard) { color = c };
            if (m.HasProperty("_BaseColor")) m.SetColor("_BaseColor", c);
            m.SetFloat("_Smoothness", smoothness);
            if (m.HasProperty("_Metallic")) m.SetFloat("_Metallic", metallic);
            return cache[key] = m;
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

            var skinMat = Mat(skin, 0.36f, 0.04f);
            var topMat = Mat(top, 0.28f, 0.05f);
            var pantsMat = Mat(pants, 0.26f, 0.04f);
            var hairMat = Mat(new Color(0.08f, 0.06f, 0.05f), 0.25f, 0.02f);
            var soleMat = Mat(new Color(0.94f, 0.95f, 0.96f), 0.45f, 0.05f);
            var shoeUpperMat = Mat(Color.Lerp(pants, new Color(0.14f, 0.15f, 0.18f), 0.6f), 0.42f, 0.08f);
            var beltMat = Mat(new Color(0.12f, 0.11f, 0.10f), 0.55f, 0.2f);
            var chainMat = Mat(new Color(0.92f, 0.85f, 0.65f), 0.88f, 0.92f);
            var shadowMat = Mat(new Color(0.03f, 0.04f, 0.04f), 0.1f, 0f);

            // Ground contact shadow
            Part(root, PrimitiveType.Cylinder, new Vector3(0f, 0.01f, 0f), new Vector3(0.58f, 0.006f, 0.58f), shadowMat, layer);

            // Two-tone streetwear sneakers (white vulcanized midsole + upper + toe cap) & crew socks
            foreach (float sx in new[] { -0.115f, 0.115f })
            {
                Part(root, PrimitiveType.Cube, new Vector3(sx, 0.03f, 0.03f), new Vector3(0.115f, 0.055f, 0.25f), soleMat, layer);
                Part(root, PrimitiveType.Cube, new Vector3(sx, 0.075f, 0.02f), new Vector3(0.11f, 0.065f, 0.22f), shoeUpperMat, layer);
                Part(root, PrimitiveType.Cylinder, new Vector3(sx, 0.16f, 0f), new Vector3(0.105f, 0.07f, 0.105f), soleMat, layer);
                // Tapered trouser legs (thigh + calf)
                Part(root, PrimitiveType.Capsule, new Vector3(sx, 0.36f, 0f), new Vector3(0.145f, 0.24f, 0.145f), pantsMat, layer);
                Part(root, PrimitiveType.Capsule, new Vector3(sx, 0.68f, 0f), new Vector3(0.165f, 0.24f, 0.165f), pantsMat, layer);
            }

            // Pelvis & leather belt with metallic buckle
            Part(root, PrimitiveType.Cube, new Vector3(0f, 0.88f, 0f), new Vector3(0.36f, 0.12f, 0.23f), pantsMat, layer);
            Part(root, PrimitiveType.Cube, new Vector3(0f, 0.94f, 0f), new Vector3(0.37f, 0.045f, 0.24f), beltMat, layer);
            Part(root, PrimitiveType.Cube, new Vector3(0f, 0.94f, 0.122f), new Vector3(0.065f, 0.048f, 0.015f), chainMat, layer);

            // Sculpted V-taper waist + athletic upper chest + collar rib
            Part(root, PrimitiveType.Cube, new Vector3(0f, 1.08f, 0f), new Vector3(0.37f, 0.24f, 0.23f), topMat, layer);
            Part(root, PrimitiveType.Cube, new Vector3(0f, 1.30f, 0f), new Vector3(0.44f, 0.28f, 0.26f), topMat, layer);
            Part(root, PrimitiveType.Cylinder, new Vector3(0f, 1.45f, 0f), new Vector3(0.17f, 0.025f, 0.17f), topMat, layer);

            // Cuban link neck chain resting on collarbone
            Part(root, PrimitiveType.Cylinder, new Vector3(0f, 1.42f, 0.04f), new Vector3(0.21f, 0.012f, 0.20f), chainMat, layer, Quaternion.Euler(18f, 0f, 0f));

            // Deltoid shoulders, upper arms, forearms & wristwatch
            foreach (float side in new[] { -1f, 1f })
            {
                float ax = side * 0.27f;
                Part(root, PrimitiveType.Sphere, new Vector3(side * 0.24f, 1.38f, 0f), new Vector3(0.15f, 0.15f, 0.15f), topMat, layer);
                Part(root, PrimitiveType.Cylinder, new Vector3(ax, 1.28f, 0f), new Vector3(0.125f, 0.11f, 0.125f), topMat, layer);
                Part(root, PrimitiveType.Capsule, new Vector3(ax, 1.05f, 0.02f), new Vector3(0.105f, 0.18f, 0.105f), skinMat, layer);
                Part(root, PrimitiveType.Sphere, new Vector3(ax, 0.87f, 0.03f), new Vector3(0.095f, 0.11f, 0.095f), skinMat, layer);
                if (side < 0f)
                    Part(root, PrimitiveType.Cylinder, new Vector3(ax, 0.93f, 0.025f), new Vector3(0.112f, 0.018f, 0.112f), chainMat, layer);
            }

            // Neck, sculpted head, jawline beard, eyes, fade hair & headwear
            Part(root, PrimitiveType.Cylinder, new Vector3(0f, 1.50f, 0f), new Vector3(0.125f, 0.06f, 0.125f), skinMat, layer);
            Part(root, PrimitiveType.Sphere, new Vector3(0f, 1.66f, 0f), new Vector3(0.24f, 0.28f, 0.25f), skinMat, layer);
            Part(root, PrimitiveType.Cube, new Vector3(0f, 1.58f, 0.04f), new Vector3(0.18f, 0.09f, 0.17f), hairMat, layer); // sculpted beard / jawline
            Part(root, PrimitiveType.Sphere, new Vector3(0f, 1.74f, -0.01f), new Vector3(0.25f, 0.15f, 0.26f), hairMat, layer); // fade / afro hair top
            Part(root, PrimitiveType.Cube, new Vector3(0f, 1.68f, 0.12f), new Vector3(0.18f, 0.042f, 0.04f), Mat(new Color(0.06f, 0.08f, 0.11f), 0.92f, 0.4f), layer); // visor/sunglasses

            if (fila.HasValue)
                Part(root, PrimitiveType.Cylinder, new Vector3(0f, 1.81f, 0f), new Vector3(0.25f, 0.055f, 0.25f), Mat(fila.Value, 0.35f), layer);
            return root;
        }

        static void Part(GameObject root, PrimitiveType type, Vector3 pos, Vector3 scale, Material mat, int layer, Quaternion? rot = null)
        {
            var p = GameObject.CreatePrimitive(type);
            p.layer = layer; p.transform.SetParent(root.transform, false); p.transform.localPosition = pos; p.transform.localScale = scale;
            if (rot.HasValue) p.transform.localRotation = rot.Value;
            p.GetComponent<MeshRenderer>().sharedMaterial = mat;
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
