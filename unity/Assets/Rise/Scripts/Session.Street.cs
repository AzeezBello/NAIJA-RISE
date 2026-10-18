using UnityEngine;
using Rise.Data;
using Rise.World;

namespace Rise
{
    // Street encounters: the agbero levy (pay or risk heat; a pet dog or a home with security keeps them off), the
    // night hustlers outside the clubs (hookup, pickpockets), Mama Nkechi's dog, and tenants, upgrades, staff and
    // vehicle customisation menus (src/systems/dialogue.js, interaction.js, ui/apps/businesses.js).
    public partial class Session
    {
        [System.NonSerialized] public StreetLife Street;
        StreetLife.Agbero targetNight; (Transform t, string name)? targetHustler;

        public void ForceStreetUpdate() => UpdateStreet();

        void UpdateStreet()
        {
            if (Street == null || Vehicle != null || ActiveMenu != null || Working != null) return;
            Street.mature = State.S.mature;
            if (State.S.pet && !Street.HasPet) Street.AdoptDog();
            var pos = Player.transform.position;
            var a = Street.NearestAgbero(pos, 3.6f);
            bool guarded = State.S.pet || State.HomeHas("security");
            if (a != null && a.cool <= 0f && !guarded) { a.cool = 150f; OpenAgberoMenu(a); }
        }

        void OpenAgberoMenu(StreetLife.Agbero a)
        {
            string where = a.stop.name.Replace(" Bus Stop", "").Replace(" Bus Terminal", "");
            var m = new Menu { Title = "Agbero", Subtitle = a.stop.name, Line = $"Oga! Owo da? This na our {where} junction. Drop ₦500 for the boys." };
            m.Options.Add(new MenuOption { Label = "Pay ₦500", Action = () => { if (State.S.cash >= 500) { State.S.cash -= 500; State.Toast("Correct guy. Waka free."); } else State.Toast("No cash — they let it slide this time"); } });
            m.Options.Add(new MenuOption { Label = "I no get.", Action = () => { if (Random.value < 0.5f) State.AddHeat(1, "The boys remember your face"); else State.Toast("They hiss and let you pass"); } });
            OpenMenu(m);
        }

        void OpenHustlerMenu((Transform t, string name) n)
        {
            var m = new Menu { Title = n.name, Subtitle = "Night hustler", Line = $"{n.name}: Fine boy, you dey find hook up? ₦{Data.hookupPrice:N0} make we go inside." };
            m.Options.Add(new MenuOption { Label = $"Hook up ₦{Data.hookupPrice:N0}", Action = () =>
            {
                if (!State.Pay(Data.hookupPrice)) { State.Toast("Not enough money"); return; }
                Clock.Advance(1f); State.S.stamina = 100f; State.AddRep("social", 2);
                if (Random.value < 0.25f && !State.HomeHas("security")) { int loss = Mathf.Min(State.S.cash, 10000); State.S.cash -= loss; State.Toast($"Pocket picked · −₦{loss:N0}"); }
                else State.Toast("Night well spent");
            } });
            m.Options.Add(new MenuOption { Label = "Not tonight", Action = null });
            OpenMenu(m);
        }

        // Mama Nkechi sells the dog that keeps agberos away.
        void AddDogOption(Menu m, ContactSystem.Contact c)
        {
            if (c.data.id != "nkechi" || State.S.pet) return;
            m.Options.Add(new MenuOption { Label = $"Adopt the dog · ₦{Data.petPrice:N0}", Action = () => { if (!State.Pay(Data.petPrice)) { State.Toast("Not enough money"); return; } State.S.pet = true; Street?.AdoptDog(); State.Toast("You now have a dog. Agberos will keep their distance."); } });
        }

        // ---- tenants and upgrades (Agent Kunle, the home) ----
        void AddPropertyOptions(Menu m, PropertyData p)
        {
            if (!State.Owns(p)) return;
            if (State.S.let.Contains(p.id)) m.Options.Add(new MenuOption { Label = "Give the tenants notice", Action = () => State.TakeBack(p) });
            else if (State.S.home != p.id) m.Options.Add(new MenuOption { Label = $"Let to tenants · ₦{Mathf.RoundToInt(p.rent * Data.tenantShare):N0} a day", Action = () => State.LetOut(p) });
            var u = State.Upgrades(p.id);
            if (!string.IsNullOrEmpty(u.complaint)) m.Options.Add(new MenuOption { Label = $"Fix: {u.complaint} · ₦15,000", Action = () => State.FixComplaint(p) });
        }

        void AddUpgradeOptions(Menu m, PropertyData p)
        {
            if (!State.Owns(p)) return;
            foreach (var up in Data.upgrades) { var u = up; bool has = State.HasUpgrade(p.id, up.id); m.Options.Add(new MenuOption { Label = has ? $"{up.name} · installed" : $"{up.name} · ₦{up.price:N0} — {up.desc}", Enabled = !has, Action = () => State.BuyUpgrade(p, u) }); }
        }

        // ---- business staff ----
        void AddStaffOptions(Menu m, BusinessData b)
        {
            var o = State.Biz(b.id); if (o == null) return;
            m.Options.Add(new MenuOption { Label = o.staff.Count >= Data.maxStaff ? $"Staff: {string.Join(", ", o.staff)} (full)" : $"Hire staff · ₦{Data.staffCost:N0} (+{Mathf.RoundToInt(Data.staffBonus * 100)}% income){(o.staff.Count > 0 ? " · " + string.Join(", ", o.staff) : "")}", Enabled = o.staff.Count < Data.maxStaff, Action = () => State.HireStaff(b) });
            for (int i = 0; i < o.staff.Count; i++)
            {
                int idx = i; string name = o.staff[i];
                string shift = GameState.ShiftLabel(State.StaffShift(o, i));
                bool onDuty = State.StaffIsOnDuty(o, i, Clock.Clock);
                m.Options.Add(new MenuOption { Label = $"{name} · {shift}{(onDuty ? " · ON SHIFT" : " · off duty")} (cycle shift)", Action = () => State.CycleStaffShift(b, idx) });
            }
            if (State.RivalOpen) m.Options.Add(new MenuOption { Label = $"{Data.rivalName} dey undercut you — low prices keep your customers", Enabled = false });
        }

        // ---- vehicle customisation at Dayo's ----
        void OpenVehicleMenu(Vehicles.VehicleController v, OwnedVehicle o)
        {
            int price = 0; foreach (var d in Data.dealer) if (d.type == o.type) price = d.price; if (price == 0) price = 1000000;
            var m = new Menu { Title = "Dayo", Subtitle = $"{v.Class.name} · condition {v.Condition:0}%{(o.insured ? " · insured" : "")}", Line = "Wetin we dey do?" };
            if (v.Condition < 100f) { int c = Mathf.RoundToInt((100f - v.Condition) * 500f * (o.insured ? 0.5f : 1f)); m.Options.Add(new MenuOption { Label = $"Service · ₦{c:N0}{(o.insured ? " (insured)" : "")}", Action = () => { if (!State.Pay(c)) { State.Toast("Not enough money"); return; } v.Condition = 100f; o.cond = 100f; State.Toast("Serviced"); } }); }
            if (!o.insured) { int c = Mathf.RoundToInt(price * 0.08f); m.Options.Add(new MenuOption { Label = $"Insure · ₦{c:N0}", Action = () => { if (!State.Pay(c)) { State.Toast("Not enough money"); return; } o.insured = true; v.Insured = true; State.Toast("Insured: half-price service, half crash damage"); } }); }
            if (Data.liveries.Length > 0) m.Options.Add(new MenuOption { Label = "Livery · ₦20,000", Action = () => { if (!State.Pay(20000)) { State.Toast("Not enough money"); return; } o.livery = (o.livery + 1) % Data.liveries.Length; v.ApplyLivery(Entities.Mannequin.Hex(Data.liveries[o.livery])); State.Toast("Fresh paint"); } });
            if ((o.type == "danfo" || o.type == "korope") && Data.slogans.Length > 0) m.Options.Add(new MenuOption { Label = "Slogan · ₦5,000", Action = () => { if (!State.Pay(5000)) { State.Toast("Not enough money"); return; } o.slogan = (o.slogan + 1) % Data.slogans.Length; v.ApplySlogan(Data.slogans[o.slogan]); State.Toast("“" + Data.slogans[o.slogan] + "”"); } });
            m.Options.Add(new MenuOption { Label = "Back", Action = () => { var dayo = Contacts.Get("dayo"); if (dayo != null) OpenDealerMenu(dayo); } });
            OpenMenu(m);
        }
    }
}
