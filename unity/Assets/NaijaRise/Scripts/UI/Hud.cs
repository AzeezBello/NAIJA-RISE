using UnityEngine;
using NaijaRise.Data;
using NaijaRise.Player;
using NaijaRise.World;

namespace NaijaRise.UI
{
    // The Lagos Experience HUD, first pass: brand, district and street top-left; clock and day top-right;
    // money and level bottom-right; controls hint bottom-centre. IMGUI so the slice has no UI package dependency.
    public class Hud : MonoBehaviour
    {
        WorldData data; DayNightCycle clock; PlayerController player;
        GUIStyle brand, title, body, small, cardStyle;
        Texture2D cardTex;
        int cash, bank;

        public void Init(WorldData world, DayNightCycle dayNight, PlayerController p)
        {
            data = world; clock = dayNight; player = p; cash = world.meta.startCash; bank = world.meta.startBank;
        }

        void EnsureStyles()
        {
            if (brand != null) return;
            float s = Mathf.Max(0.8f, Screen.height / 720f);
            cardTex = new Texture2D(1, 1); cardTex.SetPixel(0, 0, new Color(0.04f, 0.05f, 0.08f, 0.62f)); cardTex.Apply();
            cardStyle = new GUIStyle(GUI.skin.box) { normal = { background = cardTex }, padding = new RectOffset((int)(14 * s), (int)(14 * s), (int)(10 * s), (int)(10 * s)) };
            brand = new GUIStyle(GUI.skin.label) { fontSize = (int)(22 * s), fontStyle = FontStyle.Bold, normal = { textColor = new Color(0.96f, 0.77f, 0.09f) } };
            title = new GUIStyle(GUI.skin.label) { fontSize = (int)(17 * s), fontStyle = FontStyle.Bold, normal = { textColor = Color.white } };
            body = new GUIStyle(GUI.skin.label) { fontSize = (int)(14 * s), normal = { textColor = new Color(0.9f, 0.9f, 0.92f) } };
            small = new GUIStyle(GUI.skin.label) { fontSize = (int)(12 * s), normal = { textColor = new Color(0.75f, 0.77f, 0.8f) }, alignment = TextAnchor.MiddleCenter };
        }

        void OnGUI()
        {
            if (data == null || player == null) return;
            EnsureStyles();
            float s = Mathf.Max(0.8f, Screen.height / 720f);
            var pos = player.transform.position;
            var region = data.RegionAt(pos.x, pos.z);
            var road = data.RoadAt(pos.x, pos.z, 9f);
            string street = road != null ? data.RoadNameAt(road, road.Along(pos.x, pos.z)) : null;
            data.DeckHeightAt(pos.x, pos.z, out var bridge);
            if (bridge != null) street = bridge.name;

            // Top-left: brand, district, street.
            GUILayout.BeginArea(new Rect(18 * s, 16 * s, 420 * s, 130 * s), cardStyle);
            GUILayout.Label("NAIJA RISE", brand);
            GUILayout.Label(region != null ? region.name : data.meta.name, title);
            if (!string.IsNullOrEmpty(street)) GUILayout.Label(street, body);
            GUILayout.EndArea();

            // Top-right: clock, day.
            GUILayout.BeginArea(new Rect(Screen.width - 238 * s, 16 * s, 220 * s, 80 * s), cardStyle);
            GUILayout.Label($"{clock.ClockText}  {(clock.IsNight ? "NIGHT" : "DAY")}", title);
            GUILayout.Label($"Day {clock.Day}", body);
            GUILayout.EndArea();

            // Bottom-right: money and level.
            GUILayout.BeginArea(new Rect(Screen.width - 298 * s, Screen.height - 112 * s, 280 * s, 96 * s), cardStyle);
            GUILayout.Label($"₦{cash:N0} cash", title);
            GUILayout.Label($"₦{bank:N0} RiseBank  ·  Newcomer", body);
            GUILayout.EndArea();

            // Bottom-centre: controls.
            GUILayout.BeginArea(new Rect(Screen.width * 0.5f - 300 * s, Screen.height - 46 * s, 600 * s, 32 * s), cardStyle);
            GUILayout.Label("WASD / left stick move  ·  Shift sprint  ·  Space jump  ·  Mouse or Q/E look  ·  Esc frees the cursor", small);
            GUILayout.EndArea();
        }
    }
}
