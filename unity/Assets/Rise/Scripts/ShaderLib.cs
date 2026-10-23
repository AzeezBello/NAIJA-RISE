using UnityEngine;

namespace Rise
{
    // The shaders and procedural micro-detail textures the game builds materials from at runtime.
    public static class ShaderLib
    {
        static Shader lit, unlit, particles;
        static Texture2D asphaltTex, pavementTex, brickTex, checkerTex, tattooTex, skyDomeTex;
        static Cubemap envCubemap;

        static Shader From(string materialName, string shaderName)
        {
            var m = Resources.Load<Material>("Materials/" + materialName);
            var s = m != null ? m.shader : Shader.Find(shaderName);
            if (s == null) Debug.LogError($"RISE: shader '{shaderName}' is missing from the build (Resources/Materials/{materialName}.mat). Run RISE ▸ Prepare Shaders.");
            return s;
        }

        public static Shader Lit => lit != null ? lit : lit = From("NR_Lit", "Universal Render Pipeline/Lit");
        public static Shader Unlit => unlit != null ? unlit : unlit = From("NR_Unlit", "Universal Render Pipeline/Unlit");
        public static Shader ParticlesUnlit => particles != null ? particles : particles = From("NR_ParticlesUnlit", "Universal Render Pipeline/Particles/Unlit");

        static float Hash(int x, int y)
        {
            int n = x * 374761393 + y * 668265263;
            n = (n ^ (n >> 13)) * 1274126177;
            return ((n ^ (n >> 16)) & 0x7fffffff) / (float)0x7fffffff;
        }

        // Tileable asphalt aggregate texture for realistic road surfaces.
        public static Texture2D AsphaltTex
        {
            get
            {
                if (asphaltTex != null) return asphaltTex;
                const int S = 128;
                asphaltTex = new Texture2D(S, S, TextureFormat.RGBA32, true) { name = "NR_AsphaltTex", wrapMode = TextureWrapMode.Repeat, filterMode = FilterMode.Bilinear };
                var px = new Color[S * S];
                for (int y = 0; y < S; y++)
                {
                    for (int x = 0; x < S; x++)
                    {
                        float n1 = Hash(x, y);
                        float n2 = Hash(x / 2, y / 2);
                        float streak = Mathf.Sin((y / (float)S) * Mathf.PI * 4f) * 0.03f;
                        float v = 0.84f + (n1 - 0.5f) * 0.18f + (n2 - 0.5f) * 0.10f + streak;
                        px[y * S + x] = new Color(v * 0.96f, v * 0.98f, v * 1.02f, 1f);
                    }
                }
                asphaltTex.SetPixels(px);
                asphaltTex.Apply(true, false);
                return asphaltTex;
            }
        }

        // Tileable concrete sidewalk / boardwalk paver texture with joints.
        public static Texture2D PavementTex
        {
            get
            {
                if (pavementTex != null) return pavementTex;
                const int S = 128;
                pavementTex = new Texture2D(S, S, TextureFormat.RGBA32, true) { name = "NR_PavementTex", wrapMode = TextureWrapMode.Repeat, filterMode = FilterMode.Bilinear };
                var px = new Color[S * S];
                for (int y = 0; y < S; y++)
                {
                    for (int x = 0; x < S; x++)
                    {
                        int row = y / 32;
                        int ox = (x + (row % 2) * 32) % S;
                        bool seam = (y % 32 <= 1) || (ox % 64 <= 1);
                        float grain = (Hash(x, y) - 0.5f) * 0.10f;
                        float tileTone = (Hash(ox / 64, row) - 0.5f) * 0.06f;
                        float v = (seam ? 0.72f : 0.94f) + grain + tileTone;
                        px[y * S + x] = new Color(v, v * 0.98f, v * 0.94f, 1f);
                    }
                }
                pavementTex.SetPixels(px);
                pavementTex.Apply(true, false);
                return pavementTex;
            }
        }

        // Tileable weathered masonry / brick facade texture for urban buildings.
        public static Texture2D BrickTex
        {
            get
            {
                if (brickTex != null) return brickTex;
                const int S = 128;
                brickTex = new Texture2D(S, S, TextureFormat.RGBA32, true) { name = "NR_BrickTex", wrapMode = TextureWrapMode.Repeat, filterMode = FilterMode.Bilinear };
                var px = new Color[S * S];
                for (int y = 0; y < S; y++)
                {
                    int row = y / 16;
                    for (int x = 0; x < S; x++)
                    {
                        int bx = (x + (row % 2) * 16) % 32;
                        int by = y % 16;
                        bool mortar = by <= 1 || bx <= 1;
                        float bVar = (Hash(x / 32 + row * 7, row) - 0.5f) * 0.14f;
                        float grain = (Hash(x, y) - 0.5f) * 0.08f;
                        float v = mortar ? 0.78f + grain : Mathf.Clamp01(0.92f + bVar + grain);
                        px[y * S + x] = new Color(v, v * 0.97f, v * 0.94f, 1f);
                    }
                }
                brickTex.SetPixels(px);
                brickTex.Apply(true, false);
                return brickTex;
            }
        }

        // Crisp black-and-gold checkered taxi / commercial graphic pattern.
        public static Texture2D CheckerTex
        {
            get
            {
                if (checkerTex != null) return checkerTex;
                const int S = 64;
                checkerTex = new Texture2D(S, S, TextureFormat.RGBA32, false) { name = "NR_CheckerTex", wrapMode = TextureWrapMode.Repeat, filterMode = FilterMode.Point };
                var px = new Color[S * S];
                var gold = new Color(0.96f, 0.64f, 0.08f, 1f);
                var dark = new Color(0.08f, 0.08f, 0.10f, 1f);
                for (int y = 0; y < S; y++)
                {
                    for (int x = 0; x < S; x++)
                    {
                        int cx = (x + (y / 16) * 4) / 16;
                        int cy = y / 16;
                        px[y * S + x] = ((cx + cy) & 1) == 0 ? dark : gold;
                    }
                }
                checkerTex.SetPixels(px);
                checkerTex.Apply(false, false);
                return checkerTex;
            }
        }

        // Forearm tattoo sleeve pattern for streetwear characters.
        public static Texture2D TattooTex
        {
            get
            {
                if (tattooTex != null) return tattooTex;
                const int S = 64;
                tattooTex = new Texture2D(S, S, TextureFormat.RGBA32, false) { name = "NR_TattooTex", wrapMode = TextureWrapMode.Repeat, filterMode = FilterMode.Bilinear };
                var px = new Color[S * S];
                for (int y = 0; y < S; y++)
                {
                    for (int x = 0; x < S; x++)
                    {
                        float wave = Mathf.Sin(x * 0.35f + Mathf.Cos(y * 0.28f) * 2.2f) * Mathf.Cos(y * 0.42f - x * 0.18f);
                        bool ink = wave > 0.12f || (y % 16 == 2) || (y % 16 == 13);
                        float v = ink ? 0.18f : 0.72f;
                        px[y * S + x] = new Color(v, v * 0.78f, v * 0.64f, 1f);
                    }
                }
                tattooTex.SetPixels(px);
                tattooTex.Apply(false, false);
                return tattooTex;
            }
        }

        // Procedural atmospheric sky texture (horizon glow, warm sunset/golden-hour clouds, zenith gradient).
        public static Texture2D SkyDomeTex
        {
            get
            {
                if (skyDomeTex != null) return skyDomeTex;
                const int W = 256, H = 128;
                skyDomeTex = new Texture2D(W, H, TextureFormat.RGBA32, false) { name = "NR_SkyDomeTex", wrapMode = TextureWrapMode.Repeat, filterMode = FilterMode.Bilinear };
                var px = new Color[W * H];
                var horizon = new Color(1.00f, 0.76f, 0.48f);
                var midSky = new Color(0.94f, 0.64f, 0.52f);
                var upperSky = new Color(0.38f, 0.56f, 0.78f);
                var zenith = new Color(0.22f, 0.38f, 0.64f);
                for (int y = 0; y < H; y++)
                {
                    float v = y / (float)(H - 1);
                    float elev = Mathf.Clamp01((v - 0.42f) / 0.58f);
                    Color baseCol;
                    if (v < 0.42f)
                        baseCol = Color.Lerp(new Color(0.28f, 0.24f, 0.22f), horizon, Mathf.Pow(v / 0.42f, 0.6f));
                    else if (elev < 0.28f)
                        baseCol = Color.Lerp(horizon, midSky, elev / 0.28f);
                    else if (elev < 0.65f)
                        baseCol = Color.Lerp(midSky, upperSky, (elev - 0.28f) / 0.37f);
                    else
                        baseCol = Color.Lerp(upperSky, zenith, (elev - 0.65f) / 0.35f);

                    for (int x = 0; x < W; x++)
                    {
                        float u = x / (float)W;
                        float c1 = Mathf.Sin(u * Mathf.PI * 6f + Mathf.Cos(v * 14f) * 1.4f) * Mathf.Cos(v * Mathf.PI * 5f + u * 6.28f);
                        float c2 = Mathf.Sin(u * Mathf.PI * 14f - v * 9f) * 0.5f;
                        float cloudMask = v > 0.44f && v < 0.84f ? Mathf.SmoothStep(0.15f, 0.68f, (c1 + c2) * 0.55f + 0.35f) * Mathf.Sin((v - 0.44f) / 0.40f * Mathf.PI) : 0f;
                        var cloudCol = Color.Lerp(new Color(0.98f, 0.78f, 0.56f), new Color(1.0f, 0.94f, 0.86f), elev);
                        px[y * W + x] = Color.Lerp(baseCol, cloudCol, cloudMask * 0.55f);
                    }
                }
                skyDomeTex.SetPixels(px);
                skyDomeTex.Apply(false, false);
                return skyDomeTex;
            }
        }

        // 6-face environment reflection Cubemap so glossy vehicle clear-coats and windows reflect the golden sky & horizon.
        public static Cubemap EnvCubemap
        {
            get
            {
                if (envCubemap != null) return envCubemap;
                const int S = 64;
                envCubemap = new Cubemap(S, TextureFormat.RGBA32, true) { name = "NR_EnvCubemap" };
                var skyTop = new Color(0.32f, 0.52f, 0.78f, 1f);
                var horizon = new Color(1.00f, 0.78f, 0.50f, 1f);
                var ground = new Color(0.18f, 0.17f, 0.16f, 1f);
                CubemapFace[] faces = { CubemapFace.PositiveX, CubemapFace.NegativeX, CubemapFace.PositiveY, CubemapFace.NegativeY, CubemapFace.PositiveZ, CubemapFace.NegativeZ };
                foreach (var face in faces)
                {
                    var px = new Color[S * S];
                    for (int y = 0; y < S; y++)
                    {
                        float ty = (y / (float)(S - 1)) * 2f - 1f;
                        for (int x = 0; x < S; x++)
                        {
                            float tx = (x / (float)(S - 1)) * 2f - 1f;
                            Vector3 dir = face switch
                            {
                                CubemapFace.PositiveX => new Vector3(1f, -ty, -tx),
                                CubemapFace.NegativeX => new Vector3(-1f, -ty, tx),
                                CubemapFace.PositiveY => new Vector3(tx, 1f, ty),
                                CubemapFace.NegativeY => new Vector3(tx, -1f, -ty),
                                CubemapFace.PositiveZ => new Vector3(tx, -ty, 1f),
                                _ => new Vector3(-tx, -ty, -1f),
                            };
                            dir.Normalize();
                            Color col;
                            if (dir.y >= 0f)
                            {
                                col = Color.Lerp(horizon, skyTop, Mathf.Pow(dir.y, 0.55f));
                                float sunDot = Mathf.Max(0f, Vector3.Dot(dir, new Vector3(0.45f, 0.32f, 0.83f).normalized));
                                col += new Color(1.0f, 0.85f, 0.55f) * Mathf.Pow(sunDot, 16f) * 0.85f;
                            }
                            else
                            {
                                col = Color.Lerp(horizon * 0.65f, ground, Mathf.Pow(-dir.y, 0.45f));
                            }
                            px[y * S + x] = col;
                        }
                    }
                    envCubemap.SetPixels(px, face);
                }
                envCubemap.Apply(true, false);
                return envCubemap;
            }
        }
    }
}
