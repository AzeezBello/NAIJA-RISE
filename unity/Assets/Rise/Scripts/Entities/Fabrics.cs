using System.Collections.Generic;
using UnityEngine;
using Rise.Data;

namespace Rise.Entities
{
    // Procedural Nigerian fabric prints, ported from src/entities/wardrobe.js fabricCanvas(): a 128×128 tile per fabric
    // (ankara, adire, aso-oke stripe, lace, jersey, plain), drawn once and shared by every character wearing it.
    public static class Fabrics
    {
        const int S = 128;
        static readonly Dictionary<int, Texture2D> cache = new Dictionary<int, Texture2D>();
        static Color[] px;

        public static Texture2D Get(WorldData data, int index)
        {
            if (data.fabrics.Length == 0) return null;
            index = Mathf.Clamp(index, 0, data.fabrics.Length - 1);
            if (cache.TryGetValue(index, out var t)) return t;
            var f = data.fabrics[index];
            Color baseC = Mannequin.Hex(f.baseColor, "#e07b1a"), accent = Mannequin.Hex(f.accent, "#1b4d8c"), dark = baseC * 0.6f; dark.a = 1f;
            px = new Color[S * S];
            Fill(baseC);
            switch (f.pattern)
            {
                case "ankara":
                    for (int y = 0; y < 4; y++) for (int x = 0; x < 4; x++)
                    {
                        int cx = x * 32 + 16, cy = y * 32 + 16; bool alt = (x + y) % 2 == 1;
                        Disc(cx, cy, 11, alt ? accent : dark); Disc(cx, cy, 5, alt ? dark : accent); Disc(cx, cy, 2, baseC);
                    }
                    for (int d = -S; d < S * 2; d += 32) Line(d, 0, d + S, S, Color.Lerp(baseC, accent, 0.55f), 2);
                    break;
                case "adire":
                    for (int y = 0; y < 2; y++) for (int x = 0; x < 2; x++) for (int r = 6; r <= 26; r += 7) Ring(x * 64 + 32, y * 64 + 32, r, accent);
                    for (int y = 0; y < S; y += 16) for (int x = 0; x < S; x += 16) if ((x + y) % 32 == 0) Rect(x + 6, y + 6, 3, 3, accent);
                    break;
                case "stripe":
                    for (int y = 0; y < S; y += 16) { Rect(0, y, S, 16, (y / 16) % 2 == 1 ? baseC * 0.85f : baseC); Rect(0, y + 13, S, 2, accent); }
                    break;
                case "lace":
                    for (int y = 0; y < S; y += 8) for (int x = 0; x < S; x += 8) Disc(x + 4 + ((y / 8) % 2) * 2, y + 4, 1, accent);
                    for (int y = 0; y < S; y += 32) Rect(0, y, S, 1, baseC * 0.9f);
                    break;
                case "jersey":
                    Rect(0, 0, 12, S, accent); Rect(S - 12, 0, 12, S, accent);
                    Chevron(accent);
                    break;
            }
            t = new Texture2D(S, S, TextureFormat.RGBA32, true) { name = "fabric-" + f.name, wrapMode = TextureWrapMode.Repeat, filterMode = FilterMode.Bilinear };
            t.SetPixels(px); t.Apply(true, false);
            cache[index] = t;
            return t;
        }

        static void Set(int x, int y, Color c) { if (x < 0 || y < 0 || x >= S || y >= S) return; c.a = 1f; px[y * S + x] = c; }
        static void Fill(Color c) { for (int i = 0; i < px.Length; i++) { c.a = 1f; px[i] = c; } }
        static void Rect(int x, int y, int w, int h, Color c) { for (int j = y; j < y + h; j++) for (int i = x; i < x + w; i++) Set(i, j, c); }
        static void Disc(int cx, int cy, int r, Color c) { for (int j = -r; j <= r; j++) for (int i = -r; i <= r; i++) if (i * i + j * j <= r * r) Set(cx + i, cy + j, c); }
        static void Ring(int cx, int cy, int r, Color c) { for (int j = -r - 1; j <= r + 1; j++) for (int i = -r - 1; i <= r + 1; i++) { float d = Mathf.Sqrt(i * i + j * j); if (Mathf.Abs(d - r) <= 1f) Set(cx + i, cy + j, c); } }
        static void Line(int x0, int y0, int x1, int y1, Color c, int width)
        {
            int steps = Mathf.Max(Mathf.Abs(x1 - x0), Mathf.Abs(y1 - y0));
            for (int s = 0; s <= steps; s++) { float t = steps == 0 ? 0f : (float)s / steps; int x = Mathf.RoundToInt(Mathf.Lerp(x0, x1, t)), y = Mathf.RoundToInt(Mathf.Lerp(y0, y1, t)); for (int w = 0; w < width; w++) Set(x + w, y, c); }
        }
        static void Chevron(Color c)
        {
            // The Super Eagles chevron: two bands meeting at the top.
            for (int x = 32; x <= 96; x++) { int y = 70 - Mathf.Abs(x - 64) * 30 / 32; for (int w = 0; w < 10; w++) Set(x, y + w, c); }
        }
    }
}
