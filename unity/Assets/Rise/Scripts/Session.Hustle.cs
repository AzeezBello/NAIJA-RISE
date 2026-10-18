using System.Collections.Generic;
using UnityEngine;
using Rise.Data;
using Rise.World;

namespace Rise
{
    // District hustle hubs (src/systems/places.js HUSTLE_HUBS): repeatable timed deliveries offered by local contacts;
    // Community Grammar School and Yaba Tech (schoolMenu); street football tiers (footballMenu / playMatch).
    public partial class Session
    {
        public class HubRun { public string Text, Dest, Item, Label, Rep; public float Minutes; public int Reward, Heat; }
        static HubRun R(string text, string dest, string item, float minutes, int reward, string label, string rep) => new HubRun { Text = text, Dest = dest, Item = item, Minutes = minutes, Reward = reward, Label = label, Rep = rep };

        public static readonly Dictionary<string, (string name, string intro, HubRun[] runs)> Hubs = new Dictionary<string, (string name, string intro, HubRun[] runs)>
        {
            ["egbon"] = ("Surulere", null, new[] { R("Deliver a workshop parts crate to Ladipo Garage", "ladipo", "phone_parts", 35, 18000, "Parts Crate", "business"), R("Take community notices to the Iponri Logistics Yard", "marina", "event_flyers", 30, 15000, "Community Notices", "social") }),
            ["ikoyi_merchant"] = ("Ikoyi", null, new[] { R("Deliver a market basket to Ikoyi Club", "ikoyi-club", "market_basket", 30, 20000, "Market Basket", "business"), R("Take supplies to the Ikoyi Boulevard service desk", "ikoyi-boulevard", "school_supplies", 35, 24000, "Supplies", "business") }),
            ["lekki_keeper"] = ("Lekki–Epe", null, new[] { R("Carry field supplies to Lekki Conservation Centre", "lekki-conservation", "conservation_kit", 40, 22000, "Conservation Kit", "public"), R("Deliver school materials to Ajah Community School", "ajah-school", "school_supplies", 35, 18000, "School Supplies", "public") }),
            ["ikorodu_trader"] = ("Ikorodu", null, new[] { R("Take a market basket to Ikorodu Garage", "ikorodu-garage-town", "market_basket", 35, 16000, "Market Basket", "business"), R("Deliver school supplies to Ikorodu Senior Grammar School", "ikorodu-school", "school_supplies", 35, 18000, "School Supplies", "public") }),
            ["cv_oga"] = ("Computer Village", null, new[] { R("Deliver replacement phone parts to Ikeja Senior High School", "ikeja-school", "phone_parts", 30, 18000, "Phone Parts", "business"), R("Run laptop parts to the airport service desk", "ikeja-airport", "laptop_parts", 40, 26000, "Laptop Parts", "business"), R("Set up a POS terminal at Ikeja City Centre", "ikeja-city", "pos_terminal", 35, 22000, "POS Terminal", "business") }),
            ["balogun_osoanya"] = ("Balogun Market", "Osoanya — also called Oso-ahia — are commission agents who connect shoppers with market traders. Pick a customer order and earn your cut on delivery.", new[] { R("Carry a fabric order from Balogun Market to Shitta Market", "shitta", "fabric_order", 30, 18000, "Fabric Order", "business"), R("Deliver a customer parcel from Balogun Market to Yaba Market", "yaba", "market_basket", 35, 22000, "Customer Parcel", "business") }),
            ["yaba_osoanya"] = ("Yaba Market", "We connect Yaba shoppers with traders and earn commission for each completed order. Help us get this purchase to the buyer.", new[] { R("Deliver a Yaba Market order to Computer Village", "ikeja-tech", "phone_parts", 40, 26000, "Electronics Order", "business"), R("Carry a clothing parcel from Yaba Market to Tejuosho Market", "tejuosho", "fabric_order", 25, 16000, "Clothing Parcel", "business") }),
            ["computer_village_osoanya"] = ("Computer Village", "We be Osoanya, commission agents. We match customers with trusted phone and computer traders, then earn when the order reaches its buyer.", new[] { R("Deliver a phone repair order from Computer Village to Yaba Market", "yaba", "phone_parts", 40, 24000, "Repair Order", "business"), R("Carry a laptop order from Computer Village to Ikeja City Centre", "ikeja-city", "laptop_parts", 25, 18000, "Laptop Order", "business") }),
            ["sisi"] = ("AJ City", null, new[] { R("Take donated football boots to Baba Goal at the AJ City Street Pitch", "ajpitch", "football_boots", 25, 12000, "Football Boots", "street") }),
            ["makoko_fisher"] = ("Makoko", null, new[] { R("Carry the fresh fish crate to the Makoko Canoe Landing", "makoko-canoe-landing", "fish_crate", 18, 9000, "Fish Crate", "business") }),
            ["shrine_host"] = ("New Afrika Shrine", null, new[] { R("Deliver audio cables to the Ikeja City Centre event crew", "ikeja-city", "event_cables", 45, 24000, "Event Cables", "social"), R("Take spare stage connectors to Kalakuta Republic", "kalakuta-republic", "event_cables", 50, 28000, "Event Cables", "social") }),
            ["kalakuta_guide"] = ("Kalakuta Republic", null, new[] { R("Deliver an archive box to the New Afrika Shrine history room", "new-afrika-shrine", "archive_box", 50, 28000, "Archive Box", "social") }),
        };

        [System.NonSerialized] public HubRun ActiveRun;   // side task in progress (uses the task fields with taskMission = -1)

        // Hard-coded hubs, plus any contact whose data carries runs (the Surulere street people, src/data/characters.js).
        bool IsHub(ContactSystem.Contact c) => Hubs.ContainsKey(c.data.id) || (c.data.runs != null && c.data.runs.Length > 0);

        static HubRun FromData(RunData r) => new HubRun { Text = r.text, Dest = r.dest, Item = r.item, Minutes = r.minutes, Reward = r.reward, Label = r.label, Rep = r.rep, Heat = r.heat };

        public (string name, string intro, HubRun[] runs) HubFor(ContactSystem.Contact c)
        {
            if (Hubs.TryGetValue(c.data.id, out var hub)) return hub;
            var runs = new HubRun[c.data.runs.Length];
            for (int i = 0; i < runs.Length; i++) runs[i] = FromData(c.data.runs[i]);
            return (c.data.role, c.data.line, runs);
        }

        void OpenHubMenu(ContactSystem.Contact c)
        {
            var hub = HubFor(c);
            bool dataHub = !Hubs.ContainsKey(c.data.id);
            var menu = new Menu { Title = c.data.name, Subtitle = dataHub ? $"{hub.name} · {State.RelTier(c.data.id)}" : hub.name, Line = dataHub ? hub.intro : $"{hub.intro ?? $"Welcome to {hub.name}."} Choose a local run. Deliveries pay when you reach the destination before the deadline." };
            if (!HasTask) foreach (var run in hub.runs) { var r = run; menu.Options.Add(new MenuOption { Label = $"{run.Text} · ₦{run.Reward:N0} · {run.Minutes:0} min{(run.Heat > 0 ? " · risky" : "")}", Enabled = Data.TryPlace(run.Dest, out _), Action = () => StartRun(c, r) }); }
            else menu.Options.Add(new MenuOption { Label = "Finish your current mission first", Enabled = false });
            foreach (var j in Data.JobsAt(c.data.at)) { var job = j; bool ok = State.CanTake(j); menu.Options.Add(new MenuOption { Label = ok ? $"Work shift — {j.title} · ₦{State.JobPay(j):N0} · {j.dur}h" : $"{j.title} (needs {j.skill} {j.min})", Enabled = ok, Action = () => StartShift(job) }); }
            AddRelationshipOptions(menu, c);
            menu.Options.Add(new MenuOption { Label = "Not now", Action = null });
            OpenMenu(menu);
        }

        public void StartRun(ContactSystem.Contact c, HubRun run)
        {
            var st = State.S;
            ActiveRun = run;
            st.taskType = "timed"; st.taskDest = run.Dest; st.taskItem = run.Item; st.taskObj = run.Text; st.taskMission = -1; st.taskDeadline = Clock.Clock + run.Minutes / 60f;
            State.AddItem(run.Item);
            State.Toast("Side mission started · follow the GPS");
            RefreshNav();
        }

        // Called by FinishTask when taskMission is -1.
        void FinishRun(bool ok)
        {
            var run = ActiveRun; ActiveRun = null;
            if (run == null) return;
            if (ok)
            {
                State.Earn(run.Reward); State.AddRep(run.Rep, 3); State.AddXp(15); State.Toast($"{run.Label} delivered · +₦{run.Reward:N0}");
                if (run.Heat > 0) State.AddHeat(run.Heat, run.Label);
            }
            else State.Toast($"{run.Label} not delivered in time");
        }

        // ---- schools ----
        void OpenSchoolMenu(LandmarkData p)
        {
            var cfg = Data.school; var st = State.S;
            if (p.id == "yabatech")
            {
                var menu = new Menu { Title = "Yaba College of Technology", Subtitle = "Computer Systems diploma", Line = st.collegeGraduated ? "Your Yaba Tech Diploma don complete. The Alagomeji Tech Hub dey hire." : st.collegeSemester >= 0 ? $"Welcome back. You don complete {st.collegeSemester} of {cfg.semesters} semesters for Computer Systems." : $"Enrol for the Computer Systems diploma, study {cfg.semesters} semesters, and qualify for IT support work." };
                if (st.collegeSemester < 0) menu.Options.Add(new MenuOption { Label = $"Enrol · Computer Systems diploma · ₦{cfg.enrollment:N0}", Action = () => Enrol() });
                else if (!st.collegeGraduated) menu.Options.Add(new MenuOption { Label = $"Study semester {st.collegeSemester + 1} · ₦{cfg.semester:N0} · {cfg.duration}h", Action = () => StudySemester() });
                menu.Options.Add(new MenuOption { Label = "Leave", Action = null });
                OpenMenu(menu);
                return;
            }
            var m = new Menu { Title = "Community Grammar School", Subtitle = p.name, Line = "Evening adult classes — or support a student." };
            m.Options.Add(new MenuOption { Label = $"Evening class · ₦{cfg.eveningClass:N0}", Action = () => EveningClass() });
            m.Options.Add(new MenuOption { Label = "Leave", Action = null });
            OpenMenu(m);
        }

        public bool Enrol()
        {
            if (State.S.collegeSemester >= 0) return false;
            if (!State.Pay(Data.school.enrollment)) { State.Toast("Not enough money to enrol"); return false; }
            State.S.collegeSemester = 0; Hours(1f); State.AddXp(5); State.Toast("Enrolled at Yaba Tech · Computer Systems");
            return true;
        }

        public bool StudySemester()
        {
            var cfg = Data.school;
            if (State.S.stamina < cfg.stamina) { State.Toast("Too tired to study — rest first"); return false; }
            if (!State.Pay(cfg.semester)) { State.Toast("Not enough money for semester fees"); return false; }
            State.S.stamina -= cfg.stamina; Hours(cfg.duration);
            return State.CompleteSemester();
        }

        public bool EveningClass()
        {
            var cfg = Data.school;
            if (State.S.stamina < 15f) { State.Toast("Too tired"); return false; }
            if (!State.Pay(cfg.eveningClass)) { State.Toast("Not enough money"); return false; }
            State.S.stamina -= 15f; Hours(2f);
            if (cfg.eveningSkill != null) foreach (var sp in cfg.eveningSkill) State.GainSkill(sp.skill, sp.points);
            State.AddXp(8); State.Toast("Class done");
            return true;
        }

        // ---- street football tiers (playMatch) ----
        public bool PlayMatch(int tier, bool stakes)
        {
            var c = Data.football; var st = State.S;
            tier = Mathf.Clamp(tier, 0, Mathf.Max(0, c.tiers.Length - 1));
            int prize = c.prizes != null && tier < c.prizes.Length ? c.prizes[tier] : 0;
            if (st.stamina < 40f) { State.Toast("Too tired to play"); return false; }
            if (stakes && prize == 0 && !State.Pay(c.wager)) { State.Toast("Not enough money for the wager"); return false; }
            float chance = 0.35f + st.skills.fitness * 0.006f - tier * 0.12f;
            bool won = Random.value < chance;
            st.stamina -= 40f; Hours(1.5f); State.GainSkill("fitness", 3); State.AddRep("social", 2);
            if (won)
            {
                st.footballWins++; State.AddRep("street", 3); State.AddXp(10);
                if (stakes) { int pay = prize > 0 ? prize : c.wager * 2; State.Earn(pay); State.Toast($"You won {c.tiers[tier]} · +₦{pay:N0}"); if (prize > 0) st.footballTier = Mathf.Min(tier + 1, c.tiers.Length - 1); }
                else State.Toast("Won the kickabout · Fitness up");
                if (st.footballWins == 3) { st.footballTier = Mathf.Max(st.footballTier, 1); State.Message("captain", "Omo, you sabi ball! Neighbourhood tournament dey next week. ₦20,000 prize."); }
                if (st.footballWins == 6) State.Message("amaka", "Heard you dey win tournaments. Iponri crews want a sponsor deal — come see me.");
            }
            else State.Toast(stakes ? "Lost the match" : "Lost the kickabout");
            return won;
        }
    }
}
