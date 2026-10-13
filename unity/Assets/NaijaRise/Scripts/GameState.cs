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
        // Housing and business (src/core/state.js: home, rented, props, owned, biz)
        public string home = "", rentedId = ""; public int rentedUntil;
        public List<string> props = new List<string>();
        public List<OwnedBusiness> biz = new List<OwnedBusiness>();
        public float payIn = 60f;
    }

    [Serializable] public class OwnedBusiness { public string id; public float stock = 100f; public string price = "normal"; }

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
        // ---- housing (src/systems/interaction.js rentProperty / buyProperty, economy.js day handler) ----
        public PropertyData Home => string.IsNullOrEmpty(S.home) ? null : data.Property(S.home);
        public bool Owns(PropertyData p) => S.props.Contains(p.id);

        public bool Rent(PropertyData p)
        {
            int fee = Mathf.RoundToInt(p.rent * data.meta.agentFeeRate);
            if (!Pay(p.rent + fee)) { Toast($"You need ₦{p.rent + fee:N0} (rent + ₦{fee:N0} agent fee)"); return false; }
            S.rentedId = p.id; S.rentedUntil = S.day + data.meta.leaseDays; S.home = p.id;
            Toast($"Lease signed · {p.type} for {data.meta.leaseDays} days");
            Message("landlord", $"Welcome. {p.type} na yours for {data.meta.leaseDays} days. No late rent, no wahala. Agent Kunle don collect him ₦{fee:N0}.");
            return true;
        }

        public bool Buy(PropertyData p)
        {
            if (p.buy <= 0) { Toast("This one na rent only"); return false; }
            if (S.level < data.meta.propertyLevel) { Toast($"Property unlocks at Level {data.meta.propertyLevel}"); return false; }
            if (!Pay(p.buy)) { Toast($"You need ₦{p.buy:N0} across cash and bank"); return false; }
            S.props.Add(p.id);
            if (S.rentedId == p.id) S.rentedId = "";
            if (string.IsNullOrEmpty(S.home)) S.home = p.id;
            Toast($"{p.name} is yours");
            Message("landlord", $"Papers signed. {p.name} na your own now.");
            return true;
        }

        // Called when the game day rolls over: leases run out.
        public void NewDay(int day)
        {
            S.day = day;
            if (!string.IsNullOrEmpty(S.rentedId) && day > S.rentedUntil)
            {
                var p = data.Property(S.rentedId);
                Toast($"Your lease on {(p != null ? p.name : "your place")} has ended");
                if (S.home == S.rentedId) S.home = "";
                S.rentedId = "";
            }
            else if (!string.IsNullOrEmpty(S.rentedId) && S.rentedUntil - day == 3) Toast("Your lease ends in 3 days");
        }

        // ---- businesses (src/data/businesses.js, economy.js updateEconomy) ----
        public OwnedBusiness Biz(string id) { foreach (var b in S.biz) if (b.id == id) return b; return null; }
        public float PriceEffect(string price) => price == "low" ? data.meta.priceLow : price == "high" ? data.meta.priceHigh : 1f;
        public int BizIncome(BusinessData b) { var o = Biz(b.id); if (o == null) return 0; return Mathf.RoundToInt(b.income * PriceEffect(o.price) * (1f + S.skills.business * 0.005f) * (o.stock / 100f)); }
        public int RestockCost(BusinessData b) => Mathf.RoundToInt(b.income * 1.5f);

        public bool BuyBusiness(BusinessData b)
        {
            if (Biz(b.id) != null) { Toast("You own this one already"); return false; }
            if (S.level < data.meta.propertyLevel) { Toast($"Businesses unlock at Level {data.meta.propertyLevel}"); return false; }
            if (!Pay(b.price)) { Toast($"You need ₦{b.price:N0} across cash and bank"); return false; }
            S.biz.Add(new OwnedBusiness { id = b.id });
            Toast($"{b.name} is yours · ₦{BizIncome(b):N0} per pay cycle");
            Message("bank", $"Business account opened for {b.name}. Income lands in your RiseBank account.");
            return true;
        }

        public bool Restock(BusinessData b)
        {
            var o = Biz(b.id); if (o == null) return false;
            if (!Pay(RestockCost(b))) { Toast("No money to restock"); return false; }
            o.stock = 100f; Toast($"{b.name} restocked"); return true;
        }

        public void CyclePrice(BusinessData b) { var o = Biz(b.id); if (o == null) return; o.price = o.price == "low" ? "normal" : o.price == "normal" ? "high" : "low"; Toast($"{b.name} · prices {o.price}"); }

        // Owned businesses pay into the bank every pay cycle and drain stock.
        public void TickEconomy(float dt)
        {
            if (S.biz.Count == 0) return;
            S.payIn -= dt;
            if (S.payIn > 0f) return;
            S.payIn = data.meta.payCycle;
            int total = 0;
            foreach (var o in S.biz)
            {
                var b = data.Business(o.id); if (b == null) continue;
                total += BizIncome(b);
                o.stock = Mathf.Max(0f, o.stock - 15f);
                if (Mathf.Approximately(o.stock, 30f)) Toast($"{b.name} is running low on stock");
            }
            S.bank += total;
            Toast($"RiseBank · Credit alert · ₦{total:N0} business income");
        }

        public void PruneToasts() { Toasts.RemoveAll(t => t.until < Time.time); if (Toasts.Count > 4) Toasts.RemoveRange(0, Toasts.Count - 4); }
    }
}
