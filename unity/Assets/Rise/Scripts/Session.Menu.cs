using System.Collections.Generic;
using UnityEngine;

namespace Rise
{
    // A generic choice card: title, subtitle, a spoken line and up to a handful of options. Used for contact dialogue,
    // Agent Kunle, the home, businesses, bus stops, kiosks and the police. W/S or the stick to move, E to choose,
    // X to close, or press the option's number.
    public class MenuOption { public string Label; public bool Enabled = true; public System.Action Action; }
    public class MenuField { public string Label, Value = ""; public bool Password; }
    public class Menu { public string Title, Subtitle, Line; public List<MenuOption> Options = new List<MenuOption>(); public List<MenuField> Fields = new List<MenuField>(); public int Index; public Rect[] Rects = new Rect[0]; }

    public partial class Session
    {
        [System.NonSerialized] public Menu ActiveMenu;
        float menuNavT;

        public void OpenMenu(Menu m)
        {
            ActiveMenu = m; m.Index = 0;
            for (int i = 0; i < m.Options.Count; i++) if (m.Options[i].Enabled) { m.Index = i; break; }
            Player.InputEnabled = false;
            Prompt = null;
        }

        public void CloseMenu() { ActiveMenu = null; }

        // Pick an option (from input or a script); the action may open another menu.
        public void Choose(int index)
        {
            var m = ActiveMenu; if (m == null || index < 0 || index >= m.Options.Count) return;
            var opt = m.Options[index]; if (!opt.Enabled) return;
            ActiveMenu = null;
            opt.Action?.Invoke();
        }

        void UpdateMenu()
        {
            var m = ActiveMenu;
            Player.InputEnabled = false;
            if (m.Fields.Count > 0 && Typing) return;   // a text field has the keyboard
            menuNavT -= Time.deltaTime;
            float v = GameInput.MenuNavigate.y;
            float scroll = GameInput.MenuScrollDelta;
            if (Mathf.Abs(scroll) > 0.1f && m.Options.Count > 1)
            {
                int sDir = scroll > 0f ? -1 : 1;
                for (int step = 0; step < m.Options.Count; step++) { m.Index = (m.Index + sDir + m.Options.Count) % m.Options.Count; if (m.Options[m.Index].Enabled) break; }
            }
            else if (menuNavT <= 0f && Mathf.Abs(v) > 0.5f && m.Options.Count > 1)
            {
                menuNavT = 0.22f;
                int dir = v > 0f ? -1 : 1;
                for (int step = 0; step < m.Options.Count; step++) { m.Index = (m.Index + dir + m.Options.Count) % m.Options.Count; if (m.Options[m.Index].Enabled) break; }
            }
            else if (Mathf.Abs(v) < 0.2f) menuNavT = 0f;
            int tap = GameInput.MenuTap; if (tap >= 0 && tap < m.Options.Count) { Choose(tap); return; }
            int digit = GameInput.DigitPressed;
            if (digit > 0 && digit <= m.Options.Count) { Choose(digit - 1); return; }
            if (Decline()) { CloseMenu(); return; }
            if (Interact()) Choose(m.Index);
        }
    }
}
