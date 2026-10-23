using System.Collections;
using System.IO;
using UnityEngine;

namespace Rise
{
    // ?diag=shots (desktop: NR_DIAG=shots): captures the HUD on foot, with a menu open, driving and wanted, then quits.
    // Pair it with nosave (and offline) so the run never touches a real save or backend:
    //   NR_DIAG=shots,nosave,offline,norain NR_SHOTS=/tmp Rise.app/Contents/MacOS/Rise -screen-width 1280 -screen-height 720
    // Images go to NR_SHOTS, or Application.persistentDataPath.
    public class DiagShots : MonoBehaviour
    {
        [System.NonSerialized] public Session Session;
        string dir;

        IEnumerator Start()
        {
            Application.runInBackground = true;   // launched from a script the window is not focused, and an unfocused player pauses
            dir = System.Environment.GetEnvironmentVariable("NR_SHOTS");
            if (string.IsNullOrEmpty(dir)) dir = Application.persistentDataPath;
            yield return new WaitForSeconds(10f);   // world built, intro toast gone, models streamed
            Session.State.Toast("Toasts slide in here and fade out");
            yield return new WaitForSeconds(0.5f);
            yield return Shot("hud-foot");

            var menu = new Menu { Title = "Baba K", Subtitle = "Ojuelegba Junction  ·  The First Run", Line = "Tunde! You finally show. Lagos no dey wait for anybody." };
            menu.Options.Add(new MenuOption { Label = "The fast one." });
            menu.Options.Add(new MenuOption { Label = "The clean one." });
            menu.Options.Add(new MenuOption { Label = "Buy the danfo (needs Level 3)", Enabled = false });
            Session.OpenMenu(menu);
            yield return new WaitForSeconds(0.4f);
            yield return Shot("hud-menu");
            Session.CloseMenu();

            Vehicles.VehicleController nearest = null; float best = float.MaxValue;
            foreach (var v in FindObjectsByType<Vehicles.VehicleController>())
            {
                float d = (v.transform.position - Session.Player.transform.position).sqrMagnitude;
                if (d < best) { best = d; nearest = v; }
            }
            if (nearest != null)
            {
                Session.Enter(nearest);
                yield return new WaitForSeconds(1.5f);
                yield return Shot("hud-drive");
            }

            int heat = Session.State.S.heat;
            Session.State.S.heat = 4;
            yield return new WaitForSeconds(0.3f);
            yield return Shot("hud-wanted");
            Session.State.S.heat = heat;
            yield return new WaitForSeconds(0.3f);
            Application.Quit();
        }

        IEnumerator Shot(string name)
        {
            var path = Path.Combine(dir, name + ".png");
            ScreenCapture.CaptureScreenshot(path);
            yield return null; yield return null;
            Debug.Log("RISE diag shot: " + path);
        }
    }
}
