using System;
using UnityEngine;

namespace NaijaRise
{
    // Diagnostic switches for player builds, read from the page URL (WebGL: index.html?diag=noshadows,noprobe) or the
    // NR_DIAG environment variable (desktop). One build can then be tested with features removed one at a time.
    //   noshadows  main light casts no shadows        noprobe     no realtime reflection probe
    //   nopost     no post-processing volume          nohdr       HDR off in the URP asset
    //   norain     weather never starts               noaddlights additional lights off
    //   nomsaa     MSAA off                           noshadowasset  shadows disabled in the URP asset itself
    public static class DiagFlags
    {
        static string[] flags;
        public static bool Has(string flag)
        {
            if (flags == null)
            {
                string raw = "";
                try
                {
                    string url = Application.absoluteURL ?? "";
                    int q = url.IndexOf("diag=", StringComparison.OrdinalIgnoreCase);
                    if (q >= 0) { raw = url.Substring(q + 5); int amp = raw.IndexOfAny(new[] { '&', '#' }); if (amp >= 0) raw = raw.Substring(0, amp); }
                    if (raw.Length == 0) raw = Environment.GetEnvironmentVariable("NR_DIAG") ?? "";
                }
                catch { }
                flags = raw.ToLowerInvariant().Split(new[] { ',', ';', '+' }, StringSplitOptions.RemoveEmptyEntries);
                if (flags.Length > 0) Debug.Log("NAIJA RISE diag flags: " + string.Join(",", flags));
            }
            foreach (var f in flags) if (f == flag) return true;
            return false;
        }
    }
}
