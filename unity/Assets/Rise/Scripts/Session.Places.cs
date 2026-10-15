using UnityEngine;
using Rise.Data;

namespace Rise
{
    // Living City places (src/systems/places.js): the gym, Chicken Republic, the mall and cinema, the cyber café
    // with its courses and gigs, and street football. Every activity moves money, stamina, skills, reputation and time.
    public partial class Session
    {
        LandmarkData targetPlace;

        LandmarkData NearPlace(Vector3 pos) =>
            Data.NearestLandmark("gym", pos, 12f) ?? Data.NearestLandmark("restaurant", pos, 12f) ?? Data.NearestLandmark("mall", pos, 18f) ??
            Data.NearestLandmark("cafe", pos, 12f) ?? Data.NearestLandmark("pitch", pos, 20f) ?? Data.NearestLandmark("school", pos, 12f);

        string PlacePrompt(LandmarkData p) => p.kind switch { "gym" => "ENTER GYM", "restaurant" => $"ENTER {p.name.ToUpper()}", "mall" => "ENTER MALL", "cafe" => "ENTER CYBER CAFÉ", "pitch" => "JOIN THE FOOTBALL", "school" => p.id == "yabatech" ? "ENTER YABA TECH" : "VISIT SCHOOL · EVENING CLASS", _ => $"ENTER {p.shortName}" };

        void OpenPlaceMenu(LandmarkData p)
        {
            switch (p.kind) { case "gym": OpenGymMenu(); break; case "restaurant": OpenFoodMenu(p); break; case "mall": OpenMallMenu(); break; case "cafe": OpenCafeMenu(); break; case "pitch": OpenFootballMenu(); break; case "school": OpenSchoolMenu(p); break; }
        }

        void Hours(float h) => Clock.Advance(h);

        // ---- gym ----
        bool GymMember => State.S.gymUntil > Clock.Day;

        public bool Train(string kind, int fitness, int strength, int cost)
        {
            var st = State.S;
            if (st.stamina < 35f) { State.Toast("Too tired to train — eat or rest first"); return false; }
            if (cost > 0 && !State.Pay(cost)) { State.Toast("Not enough money"); return false; }
            st.stamina = Mathf.Max(0f, st.stamina - 35f); st.gymSessions++;
            if (fitness > 0) State.GainSkill("fitness", fitness);
            if (strength > 0) State.GainSkill("strength", strength);
            Hours(1f); State.AddXp(4);
            State.Toast($"{kind} done{(fitness > 0 ? $" · Fitness +{fitness}" : "")}{(strength > 0 ? $" · Strength +{strength}" : "")}");
            if (st.gymSessions == 5) State.Message("coach", "Five sessions. You dey build. Boxing class dey open for you now.");
            return true;
        }

        void OpenGymMenu()
        {
            var c = Data.gym; bool m = GymMember;
            var menu = new Menu { Title = "Coach Emeka", Subtitle = "Surulere Fitness Gym", Line = m ? $"Member till day {State.S.gymUntil}. Fitness helps you recover faster; strength makes sprinting cost less. Wetin we dey train today?" : $"Day pass ₦{c.dayPass:N0}, monthly ₦{c.monthly:N0}. Fitness helps recovery; strength makes sprinting cost less." };
            menu.Options.Add(new MenuOption { Label = m ? "Strength training" : $"Strength training · day pass ₦{c.dayPass:N0}", Action = () => Train("Strength training", 2, 5, m ? 0 : c.dayPass) });
            menu.Options.Add(new MenuOption { Label = m ? "Cardio" : $"Cardio · day pass ₦{c.dayPass:N0}", Action = () => { if (Train("Cardio", 5, 0, m ? 0 : c.dayPass)) State.S.stamina = Mathf.Min(100f, State.S.stamina + 10f); } });
            menu.Options.Add(new MenuOption { Label = $"Personal trainer · ₦{c.trainer:N0}", Action = () => Train("Trainer session", 5, 6, c.trainer) });
            if (State.S.skills.fitness >= c.boxingMin) menu.Options.Add(new MenuOption { Label = "Boxing class", Action = () => { if (Train("Boxing", 3, 4, m ? 0 : c.dayPass)) State.AddRep("street", 3); } });
            if (!m) menu.Options.Add(new MenuOption { Label = $"Monthly membership · ₦{c.monthly:N0}", Action = () => { if (!State.Pay(c.monthly)) { State.Toast("Not enough money"); return; } State.S.gymUntil = Clock.Day + 30; State.AddRep("social", 2); State.Toast("Member for 30 days"); } });
            menu.Options.Add(new MenuOption { Label = "Leave", Action = null });
            OpenMenu(menu);
        }

        // ---- restaurant ----
        void OpenFoodMenu(LandmarkData p)
        {
            var menu = new Menu { Title = "Cashier", Subtitle = p.name, Line = $"Welcome to {p.name}. Wetin you dey chop?" };
            foreach (var f in Data.food)
            {
                if (f.name == "Business lunch" && State.S.biz.Count == 0) continue;
                var item = f;
                menu.Options.Add(new MenuOption { Label = $"{f.name} · ₦{f.price:N0}", Action = () => Eat(item) });
            }
            menu.Options.Add(new MenuOption { Label = "Leave", Action = null });
            OpenMenu(menu);
        }

        public bool Eat(FoodData f)
        {
            if (!State.Pay(f.price)) { State.Toast("Not enough money"); return false; }
            State.S.stamina = Mathf.Min(100f, State.S.stamina + f.stamina); State.S.health = Mathf.Min(100f, State.S.health + f.business); Hours(0.5f);
            if (f.name == "Business lunch") { State.AddRep("business", 3); State.GainSkill("charisma", 2); State.Toast("Good meeting · Business reputation up"); }
            else State.Toast($"{f.name} · energy +{f.stamina}");
            return true;
        }

        // ---- mall and cinema ----
        void OpenMallMenu()
        {
            var c = Data.mall;
            var menu = new Menu { Title = "Mall Attendant", Subtitle = "Adeniran Ogunsanya Mall", Line = "Clothing, electronics, supermarket, barber — or the cinema upstairs." };
            menu.Options.Add(new MenuOption { Label = $"Buy an outfit · ₦{c.outfit:N0}", Action = () => { if (!State.Pay(c.outfit)) { State.Toast("Not enough money"); return; } State.S.outfits++; NextFabric(); State.GainSkill("charisma", 3); State.AddRep("social", 2); State.Toast($"Fresh fit · {FabricName()} · Charisma +3"); } });
            menu.Options.Add(new MenuOption { Label = State.Has("laptop") ? "Laptop · owned" : $"Laptop · ₦{c.laptop:N0}", Enabled = !State.Has("laptop"), Action = () => { if (!State.Pay(c.laptop)) { State.Toast("Not enough money"); return; } State.AddItem("laptop"); State.Toast("Laptop bought — freelance gigs pay double at the cyber café"); } });
            menu.Options.Add(new MenuOption { Label = $"Barber · ₦{c.barber:N0}", Action = () => { if (!State.Pay(c.barber)) { State.Toast("Not enough money"); return; } State.S.lookHair = (State.S.lookHair + 1) % 5; Player.ApplyLook(State.Look); State.GainSkill("charisma", 1); State.Toast("Fresh cut"); } });
            menu.Options.Add(new MenuOption { Label = "Cinema", Action = OpenCinemaMenu });
            menu.Options.Add(new MenuOption { Label = "Leave", Action = null });
            OpenMenu(menu);
        }

        void OpenCinemaMenu()
        {
            var c = Data.mall;
            var menu = new Menu { Title = "Cinema", Subtitle = "Upstairs at the mall", Line = $"Now showing: {string.Join(", ", c.movies ?? new string[0])}. Ticket ₦{c.ticket:N0}." };
            string[] from = { "amaka", "babak", "nkechi" };
            string[] lines = { "You watched King of Boys? That one na Lagos politics. We go talk.", "Danfo Chronicles! That film na my life story.", "Lagos Never Sleeps... true talk. Come buy pure water." };
            for (int i = 0; i < (c.movies?.Length ?? 0); i++)
            {
                int idx = i; string movie = c.movies[i];
                menu.Options.Add(new MenuOption { Label = $"{movie} · ₦{c.ticket:N0}", Action = () =>
                {
                    if (!State.Pay(c.ticket)) { State.Toast("Not enough money"); return; }
                    Hours(2f); State.S.stamina = Mathf.Min(100f, State.S.stamina + 20f); State.AddRep("social", 3); State.AddXp(5);
                    if (idx < from.Length) State.Message(from[idx], lines[idx]);
                    State.Toast($"{movie} · good night out");
                } });
            }
            menu.Options.Add(new MenuOption { Label = "Back", Action = OpenMallMenu });
            OpenMenu(menu);
        }

        // ---- cyber café ----
        void OpenCafeMenu()
        {
            var c = Data.cafe; int skilled = State.S.courses.Count; int gig = c.gig * (State.Has("laptop") ? 2 : 1);
            var menu = new Menu { Title = "Cyber Café Oga", Subtitle = "Surulere Cyber Café", Line = skilled > 0 ? $"You get {skilled} certificate{(skilled > 1 ? "s" : "")}. Freelance gig ₦{gig:N0}. Courses still dey." : "Learn a trade for the digital economy. Certificates open better jobs." };
            foreach (var course in Data.courses)
            {
                if (State.HasCourse(course.id)) continue;
                var cr = course;
                menu.Options.Add(new MenuOption { Label = $"Learn {course.name} · ₦{course.cost:N0} · {course.hours}h", Action = () => Study(cr) });
            }
            if (skilled > 0) menu.Options.Add(new MenuOption { Label = $"Freelance gig · ₦{gig:N0}", Action = () =>
            {
                if (State.S.stamina < 25f) { State.Toast("Too tired to focus"); return; }
                State.Earn(gig); Hours(2f); State.S.stamina -= 25f; State.GainSkill("business", 3); State.AddRep("business", 2); State.AddXp(12); State.Toast($"Gig delivered · +₦{gig:N0}");
            } });
            menu.Options.Add(new MenuOption { Label = $"Browse jobs · ₦{c.browse:N0}", Action = () => { if (!State.Pay(c.browse)) { State.Toast("No money"); return; } Hours(0.5f); State.GainSkill("business", 1); State.Toast("Applications sent — the contacts dey wait"); } });
            menu.Options.Add(new MenuOption { Label = "Leave", Action = null });
            OpenMenu(menu);
        }

        public void NextFabric() { if (Data.fabrics.Length == 0) return; State.S.lookFabric = (State.S.lookFabric + 1) % Data.fabrics.Length; Player.ApplyLook(State.Look); }
        public string FabricName() => Data.fabrics.Length > 0 ? Data.fabrics[Mathf.Clamp(State.S.lookFabric, 0, Data.fabrics.Length - 1)].name : "outfit";

        public bool Study(CourseData c)
        {
            if (State.S.stamina < 20f) { State.Toast("Too tired to study — rest first"); return false; }
            if (!State.Pay(c.cost)) { State.Toast("Not enough money"); return false; }
            State.S.stamina -= 20f; Hours(c.hours > 0 ? c.hours : 3f);
            return State.CompleteCourse(c);
        }

        // ---- street football (Captain Tunde): quick match, neighbourhood tournament, Lagos championship ----
        void OpenFootballMenu()
        {
            var c = Data.football; var st = State.S; int tier = Mathf.Clamp(st.footballTier, 0, Mathf.Max(0, c.tiers.Length - 1));
            int prize = c.prizes != null && tier < c.prizes.Length ? c.prizes[tier] : 0;
            var menu = new Menu { Title = "Captain Tunde", Subtitle = "Street football · Teslim Balogun", Line = st.footballWins > 0 ? $"{st.footballWins} win{(st.footballWins > 1 ? "s" : "")}. Next: {c.tiers[tier]}{(prize > 0 ? $" — ₦{prize:N0} prize" : "")}." : $"Five-a-side. ₦{c.wager:N0} wager or just play. You sabi ball?" };
            menu.Options.Add(new MenuOption { Label = $"{c.tiers[tier]}{(prize > 0 ? "" : $" · ₦{c.wager:N0} wager")}", Action = () => PlayMatch(tier, true) });
            menu.Options.Add(new MenuOption { Label = "Friendly kickabout (no money)", Action = () => PlayMatch(0, false) });
            menu.Options.Add(new MenuOption { Label = "Leave", Action = null });
            OpenMenu(menu);
        }
    }
}
