using System.Collections.Generic;
using UnityEngine;
using Rise.Data;

namespace Rise.Entities
{
    // Procedural Nigerian & Lagos streetwear fabric prints: a 128×128 tile per fabric
    // (ankara wax print, adire indigo tie-dye, aso-oke metallic stripe, guipure lace, Super Eagles jersey, tailored cotton/kaftan),
    // plus cached selvedge denim / chino trouser textures, two-tone sneaker uppers, and woven Fila cap damask.
    public static class Fabrics
    {
        const int S = 128;
        static readonly Dictionary<int, Texture2D> cache = new Dictionary<int, Texture2D>();
        static readonly Dictionary<string, Texture2D> garmentCache = new Dictionary<string, Texture2D>();
        static Color[] px;

        public static Texture2D Get(WorldData data, int index)
        {
            if (data == null || data.fabrics == null || data.fabrics.Length == 0) return null;
            index = Mathf.Clamp(index, 0, data.fabrics.Length - 1);
            if (cache.TryGetValue(index, out var t) && t != null) return t;
            var f = data.fabrics[index];
            Color baseC = Mannequin.Hex(f.baseColor, "#e07b1a");
            Color accent = Mannequin.Hex(f.accent, "#1b4d8c");
            Color dark = Color.Lerp(baseC, Color.black, 0.42f); dark.a = 1f;
            Color light = Color.Lerp(baseC, Color.white, 0.25f); light.a = 1f;
            Color gold = new Color(0.95f, 0.76f, 0.22f, 1f);
            px = new Color[S * S];

            // Base woven cloth micro-grain + subtle tailored torso fold shading
            FillWeave(baseC);

            switch (f.pattern)
            {
                case "ankara":
                    // Multi-layered African wax print: diamond lattice + concentric sunburst medallions + petal scallops + wax crackle
                    for (int d = -S; d < S * 2; d += 32)
                    {
                        Line(d, 0, d + S, S, Color.Lerp(baseC, accent, 0.65f), 2);
                        Line(d, S, d + S, 0, Color.Lerp(baseC, dark, 0.55f), 2);
                    }
                    for (int y = 0; y < 4; y++)
                    {
                        for (int x = 0; x < 4; x++)
                        {
                            int cx = x * 32 + 16, cy = y * 32 + 16;
                            bool alt = (x + y) % 2 == 1;
                            Color cOuter = alt ? accent : dark;
                            Color cInner = alt ? gold : accent;
                            // Scalloped outer petals
                            for (int a = 0; a < 8; a++)
                            {
                                float rad = a * Mathf.PI * 0.25f;
                                int px0 = cx + Mathf.RoundToInt(Mathf.Cos(rad) * 11f);
                                int py0 = cy + Mathf.RoundToInt(Mathf.Sin(rad) * 11f);
                                Disc(px0, py0, 3, cInner);
                            }
                            Disc(cx, cy, 11, cOuter);
                            Ring(cx, cy, 12, gold);
                            Disc(cx, cy, 7, cInner);
                            Disc(cx, cy, 4, dark);
                            Disc(cx, cy, 2, light);
                        }
                    }
                    break;

                case "adire":
                    // Authentic Yoruba Adire Eleko indigo tie-dye: hand-painted cassava resist grid + concentric tie-dye rings + stipple dots
                    for (int g = 0; g < S; g += 32)
                    {
                        Rect(g, 0, 2, S, Color.Lerp(baseC, accent, 0.45f));
                        Rect(0, g, S, 2, Color.Lerp(baseC, accent, 0.45f));
                    }
                    for (int y = 0; y < 2; y++)
                    {
                        for (int x = 0; x < 2; x++)
                        {
                            int cx = x * 64 + 32, cy = y * 64 + 32;
                            for (int r = 5; r <= 27; r += 5)
                                Ring(cx, cy, r, r % 10 == 0 ? accent : Color.Lerp(baseC, accent, 0.72f));
                            Disc(cx, cy, 3, accent);
                        }
                    }
                    for (int y = 8; y < S; y += 16)
                        for (int x = 8; x < S; x += 16)
                            if (((x + y) / 16) % 2 == 0) Disc(x, y, 2, accent);
                    break;

                case "stripe":
                    // Hand-loomed Yoruba Aso-Oke strips with metallic gold lurex warp threads and ikat dash embroidery
                    for (int y = 0; y < S; y += 16)
                    {
                        bool odd = (y / 16) % 2 == 1;
                        Color band = odd ? Color.Lerp(baseC, Color.black, 0.18f) : baseC;
                        Rect(0, y, S, 16, band);
                        Rect(0, y + 12, S, 3, accent);
                        Rect(0, y + 6, S, 1, Color.Lerp(accent, Color.white, 0.35f));
                        for (int x = (odd ? 4 : 0); x < S; x += 8)
                            Rect(x, y + 3, 4, 2, accent);
                    }
                    break;

                case "lace":
                    // Nigerian Guipure lace: scalloped floral eyelets, embroidered trellis mesh, and warm ivory highlights
                    for (int d = -S; d < S * 2; d += 16)
                    {
                        Line(d, 0, d + S, S, Color.Lerp(baseC, accent, 0.45f), 1);
                        Line(d, S, d + S, 0, Color.Lerp(baseC, accent, 0.45f), 1);
                    }
                    for (int y = 8; y < S; y += 16)
                    {
                        for (int x = 8; x < S; x += 16)
                        {
                            Ring(x, y, 5, accent);
                            Disc(x, y, 2, Color.Lerp(accent, Color.black, 0.15f));
                            Disc(x + 4, y, 1, Color.white);
                            Disc(x - 4, y, 1, Color.white);
                            Disc(x, y + 4, 1, Color.white);
                            Disc(x, y - 4, 1, Color.white);
                        }
                    }
                    break;

                case "jersey":
                    // Super Eagles iconic feather-chevron kit + white/dark-green shoulder stripes + chest number "23"
                    Color deepGreen = new Color(0.05f, 0.32f, 0.14f, 1f);
                    for (int y = 0; y < S; y += 8)
                    {
                        for (int x = 0; x < S; x += 16)
                        {
                            int zig = Mathf.Abs((x % 32) - 16) / 2;
                            Line(x, (y + zig) % S, x + 8, (y + zig + 4) % S, deepGreen, 2);
                        }
                    }
                    Rect(0, 0, 12, S, accent);
                    Rect(S - 12, 0, 12, S, accent);
                    Rect(12, 0, 4, S, deepGreen);
                    Rect(S - 16, 0, 4, S, deepGreen);
                    Chevron(accent);
                    // Bold chest number "23"
                    DrawNumber23(46, 40, accent, deepGreen);
                    break;

                default:
                    // Tailored cotton / kaftan / streetwear tee: subtle vertical center placket, chest pocket stitch, and hem trim
                    Color seam = Color.Lerp(baseC, Color.black, 0.16f);
                    Color hi = Color.Lerp(baseC, Color.white, 0.12f);
                    Rect(62, 54, 4, S - 54, seam);
                    Rect(63, 54, 2, S - 54, hi);
                    // Subtle chest pocket outline on left chest
                    Rect(74, 72, 18, 1, seam);
                    Rect(74, 54, 18, 1, seam);
                    Rect(74, 54, 1, 19, seam);
                    Rect(91, 54, 1, 19, seam);
                    Rect(0, 0, S, 4, seam);
                    break;
            }

            t = new Texture2D(S, S, TextureFormat.RGBA32, true)
            {
                name = "fabric-" + f.name,
                wrapMode = TextureWrapMode.Repeat,
                filterMode = FilterMode.Bilinear
            };
            t.SetPixels(px);
            t.Apply(true, false);
            cache[index] = t;
            return t;
        }

        // Procedural selvedge denim / tailored chino / basketball shorts texture so trousers never look like muddy wedding suit pants.
        public static Texture2D GetPantsTexture(Color pantsCol, bool denim, bool shorts)
        {
            string key = $"pants:{ColorUtility.ToHtmlStringRGB(pantsCol)}:{(denim ? 1 : 0)}:{(shorts ? 1 : 0)}";
            if (garmentCache.TryGetValue(key, out var tex) && tex != null) return tex;

            const int W = 64;
            var cols = new Color[W * W];
            Color baseC = new Color(
                Mathf.Max(0.10f, pantsCol.r),
                Mathf.Max(0.11f, pantsCol.g),
                Mathf.Max(0.12f, pantsCol.b), 1f);
            Color fade = Color.Lerp(baseC, new Color(0.65f, 0.72f, 0.82f, 1f), denim ? 0.22f : 0.10f);
            Color seam = Color.Lerp(baseC, Color.black, 0.35f);
            Color stitch = denim ? new Color(0.82f, 0.62f, 0.24f, 1f) : Color.Lerp(baseC, Color.white, 0.28f);

            for (int y = 0; y < W; y++)
            {
                float ny = (float)y / (W - 1);
                for (int x = 0; x < W; x++)
                {
                    float nx = (float)x / (W - 1);
                    // Diagonal twill weave grain
                    float twill = ((x + y) % 3 == 0) ? 1.04f : ((x - y + 64) % 4 == 0 ? 0.96f : 1f);
                    // Thigh center highlight / whisker fade
                    float centerDist = Mathf.Abs((nx * 2f) % 1f - 0.5f) * 2f;
                    float thighFade = Mathf.Clamp01(1f - centerDist * 1.35f) * (ny > 0.35f && ny < 0.85f ? 1f : 0.3f);
                    Color c = Color.Lerp(baseC, fade, thighFade) * twill;

                    // Side outseam double-stitching
                    if (x <= 1 || x >= W - 2 || Mathf.Abs(x - W / 2) <= 1)
                        c = seam;
                    else if (x == 2 || x == W - 3)
                        c = (y % 2 == 0) ? stitch : seam;

                    // Athletic side trim for shorts or cuff stitch at hem
                    if (shorts && (x >= 3 && x <= 5 || x >= W - 6 && x <= W - 4))
                        c = Color.white;
                    if (y <= 2)
                        c = shorts ? Color.white : seam;

                    c.a = 1f;
                    cols[y * W + x] = c;
                }
            }

            tex = new Texture2D(W, W, TextureFormat.RGBA32, true)
            {
                name = key,
                wrapMode = TextureWrapMode.Repeat,
                filterMode = FilterMode.Bilinear
            };
            tex.SetPixels(cols);
            tex.Apply(true, false);
            garmentCache[key] = tex;
            return tex;
        }

        // Two-tone suede/leather streetwear sneaker upper with crisp white laces and heel tab.
        public static Texture2D GetSneakerTexture(Color upperCol)
        {
            string key = $"sneaker:{ColorUtility.ToHtmlStringRGB(upperCol)}";
            if (garmentCache.TryGetValue(key, out var tex) && tex != null) return tex;

            const int W = 64;
            var cols = new Color[W * W];
            Color suede = new Color(
                Mathf.Clamp(upperCol.r, 0.12f, 0.85f),
                Mathf.Clamp(upperCol.g, 0.12f, 0.85f),
                Mathf.Clamp(upperCol.b, 0.14f, 0.85f), 1f);
            Color panel = Color.Lerp(suede, Color.black, 0.28f);
            Color white = new Color(0.95f, 0.96f, 0.98f, 1f);

            for (int y = 0; y < W; y++)
            {
                for (int x = 0; x < W; x++)
                {
                    Color c = ((x + y) % 2 == 0) ? suede : suede * 0.96f;
                    // Toe-box & quarter panel stitch
                    if (y < 14 || y > 52) c = panel;
                    // Crisp white vamp lace bars across the instep
                    if (x >= 20 && x <= 44 && y >= 22 && y <= 46 && (y % 6 <= 1))
                        c = white;
                    // Side stripe accent
                    if (Mathf.Abs((x - 12) - (y - 16) * 0.6f) < 2.2f && y >= 14 && y <= 44)
                        c = white;
                    c.a = 1f;
                    cols[y * W + x] = c;
                }
            }

            tex = new Texture2D(W, W, TextureFormat.RGBA32, true)
            {
                name = key,
                wrapMode = TextureWrapMode.Repeat,
                filterMode = FilterMode.Bilinear
            };
            tex.SetPixels(cols);
            tex.Apply(true, false);
            garmentCache[key] = tex;
            return tex;
        }

        // Woven Aso-Oke / damask Yoruba Fila cap texture with embroidered geometric brow band.
        public static Texture2D GetFilaTexture(Color capCol)
        {
            string key = $"fila:{ColorUtility.ToHtmlStringRGB(capCol)}";
            if (garmentCache.TryGetValue(key, out var tex) && tex != null) return tex;

            const int W = 64;
            var cols = new Color[W * W];
            Color gold = new Color(0.92f, 0.74f, 0.22f, 1f);
            Color dark = Color.Lerp(capCol, Color.black, 0.25f);

            for (int y = 0; y < W; y++)
            {
                for (int x = 0; x < W; x++)
                {
                    Color c = ((x / 2 + y / 2) % 2 == 0) ? capCol : Color.Lerp(capCol, dark, 0.35f);
                    if (y >= 6 && y <= 14)
                    {
                        bool zig = ((x + y) % 8) < 4;
                        c = zig ? gold : dark;
                    }
                    c.a = 1f;
                    cols[y * W + x] = c;
                }
            }

            tex = new Texture2D(W, W, TextureFormat.RGBA32, true)
            {
                name = key,
                wrapMode = TextureWrapMode.Repeat,
                filterMode = FilterMode.Bilinear
            };
            tex.SetPixels(cols);
            tex.Apply(true, false);
            garmentCache[key] = tex;
            return tex;
        }

        static void FillWeave(Color baseC)
        {
            for (int y = 0; y < S; y++)
            {
                float vShade = 0.94f + 0.08f * Mathf.Sin((float)y / S * Mathf.PI);
                for (int x = 0; x < S; x++)
                {
                    float hFold = 1f - 0.06f * Mathf.Cos((float)x / S * Mathf.PI * 4f);
                    float grain = ((x + y) & 1) == 0 ? 1.015f : 0.985f;
                    Color c = baseC * (vShade * hFold * grain);
                    c.a = 1f;
                    px[y * S + x] = c;
                }
            }
        }

        static void Set(int x, int y, Color c)
        {
            if (x < 0 || y < 0 || x >= S || y >= S) return;
            c.a = 1f;
            px[y * S + x] = c;
        }

        static void Rect(int x, int y, int w, int h, Color c)
        {
            for (int j = y; j < y + h; j++)
                for (int i = x; i < x + w; i++)
                    Set((i + S) % S, (j + S) % S, c);
        }

        static void Disc(int cx, int cy, int r, Color c)
        {
            for (int j = -r; j <= r; j++)
                for (int i = -r; i <= r; i++)
                    if (i * i + j * j <= r * r)
                        Set((cx + i + S) % S, (cy + j + S) % S, c);
        }

        static void Ring(int cx, int cy, int r, Color c)
        {
            for (int j = -r - 1; j <= r + 1; j++)
                for (int i = -r - 1; i <= r + 1; i++)
                {
                    float d = Mathf.Sqrt(i * i + j * j);
                    if (Mathf.Abs(d - r) <= 1.1f)
                        Set((cx + i + S) % S, (cy + j + S) % S, c);
                }
        }

        static void Line(int x0, int y0, int x1, int y1, Color c, int width)
        {
            int steps = Mathf.Max(Mathf.Abs(x1 - x0), Mathf.Abs(y1 - y0));
            for (int s = 0; s <= steps; s++)
            {
                float t = steps == 0 ? 0f : (float)s / steps;
                int x = Mathf.RoundToInt(Mathf.Lerp(x0, x1, t));
                int y = Mathf.RoundToInt(Mathf.Lerp(y0, y1, t));
                for (int w = 0; w < width; w++)
                    Set((x + w + S * 2) % S, (y + S * 2) % S, c);
            }
        }

        static void Chevron(Color c)
        {
            // The Super Eagles double chevron across the chest.
            for (int x = 24; x <= 104; x++)
            {
                int y = 84 - Mathf.Abs(x - 64) * 30 / 40;
                for (int w = 0; w < 9; w++) Set(x, y + w, c);
                for (int w = 0; w < 5; w++) Set(x, y - 10 + w, c);
            }
        }

        static void DrawNumber23(int ox, int oy, Color fg, Color outline)
        {
            // Bold jersey "2" and "3" on chest
            Rect(ox - 1, oy - 1, 16, 26, outline);
            Rect(ox + 19, oy - 1, 16, 26, outline);
            // Digit '2' (bottom-up y)
            Rect(ox, oy + 20, 14, 4, fg);
            Rect(ox + 10, oy + 11, 4, 10, fg);
            Rect(ox, oy + 10, 14, 4, fg);
            Rect(ox, oy + 1, 4, 10, fg);
            Rect(ox, oy, 14, 4, fg);
            // Digit '3'
            Rect(ox + 20, oy + 20, 14, 4, fg);
            Rect(ox + 30, oy + 1, 4, 22, fg);
            Rect(ox + 22, oy + 10, 12, 4, fg);
            Rect(ox + 20, oy, 14, 4, fg);
        }
    }
}
