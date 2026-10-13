using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using NaijaRise.Data;

namespace NaijaRise
{
    // The saved player state (mirrors src/core/state.js DEFAULT): money, XP and level, heat, vitals, skills, time and
    // position. Saved as JSON under Application.persistentDataPath.
    [Serializable]
    public class SkillSet { public float driving, business, charisma, fitness, strength;
        public float Get(string k) => k == "driving" ? driving : k == "business" ? business : k == "charisma" ? charisma : k == "fitness" ? fitness : k == "strength" ? strength : 0f;
        public void Add(string k, float n) { switch (k) { case "driving": driving += n; break; case "business": business += n; break; case "charisma": charisma += n; break; case "fitness": fitness += n; break; case "strength": strength += n; break; } }
    }

    [Serializable]
    public class SaveData
    {
        public int version = 1;
        public int cash, bank, xp, level = 1, heat, day = 1;
        public float health = 100f, stamina = 100f, fuel = 100f, clock = 8.5f;
        public float px, py, pz, yaw;
        public SkillSet skills = new SkillSet();
        public string lastSeen;
    }

    public class GameState
    {
        public SaveData S;
        readonly WorldData data;
        public readonly List<(string text, float until)> Toasts = new List<(string, float)>();
        public readonly List<(string from, string text)> Messages = new List<(string, string)>();

        public static string SavePath => Path.Combine(Application.persistentDataPath, "naijarise-save.json");

        public GameState(WorldData world) { data = world; }

        public void NewGame()
        {
            S = new SaveData { cash = data.meta.startCash, bank = data.meta.startBank, clock = data.meta.startClock };
            var sp = data.Spawn; S.px = sp.x; S.py = sp.y; S.pz = sp.z; S.yaw = 180f;
        }

        public bool Load()
        {
            try
            {
                if (!File.Exists(SavePath)) return false;
                S = JsonUtility.FromJson<SaveData>(File.ReadAllText(SavePath));
                S.skills ??= new SkillSet();
                return S != null;
            }
            catch (Exception e) { Debug.LogWarning("Save could not be read: " + e.Message); return false; }
        }

        public void Save(Vector3 pos, float yaw, float clock, int day)
        {
            S.px = pos.x; S.py = pos.y; S.pz = pos.z; S.yaw = yaw; S.clock = clock; S.day = day; S.lastSeen = DateTime.UtcNow.ToString("o");
            try { File.WriteAllText(SavePath, JsonUtility.ToJson(S)); }
            catch (Exception e) { Debug.LogWarning("Save failed: " + e.Message); }
        }

        public static void ClearSave() { try { if (File.Exists(SavePath)) File.Delete(SavePath); } catch { } }

        // ---- economy (src/systems/economy.js) ----
        public string Title => data.TitleFor(S.level);

        public bool Pay(int n)
        {
            if (S.cash + S.bank < n) return false;
            int c = Mathf.Min(S.cash, n); S.cash -= c; S.bank -= n - c;
            return true;
        }

        public void Earn(int n) => S.cash += n;

        public void AddXp(int n)
        {
            S.xp += n;
            while (S.xp >= 100)
            {
                S.xp -= 100; S.level++;
                var unlock = data.UnlockFor(S.level);
                Toast($"LEVEL UP — Level {S.level}{(unlock != null ? " · " + unlock : "")}");
                Message("bank", $"Congratulations on reaching Level {S.level}. {unlock ?? "Keep rising."}");
            }
        }

        public void GainSkill(string skill, float n) => S.skills.Add(skill, n);
        public int JobPay(JobData j) => Mathf.RoundToInt(j.pay * (1f + S.skills.Get(j.skill) * 0.01f));   // +1% per skill point
        public bool CanTake(JobData j) => S.skills.Get(j.skill) >= j.min && string.IsNullOrEmpty(j.needCourse);

        public void AddHeat(int n, string why)
        {
            int before = S.heat;
            S.heat = Mathf.Clamp(S.heat + n, 0, 5);
            if (!string.IsNullOrEmpty(why) && S.heat != before) Toast($"{why} · Heat {(n > 0 ? "+" : "")}{n}");
        }

        public void Toast(string text) => Toasts.Add((text, Time.time + 3.5f));
        public void Message(string from, string text) { Messages.Add((from, text)); Toast($"{data.ContactName(from)}: {text}"); }
        public void PruneToasts() { Toasts.RemoveAll(t => t.until < Time.time); if (Toasts.Count > 4) Toasts.RemoveRange(0, Toasts.Count - 4); }
    }
}
