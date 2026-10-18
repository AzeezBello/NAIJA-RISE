using UnityEngine;
using Rise.Data;

namespace Rise
{
    // Living City places: the gym, Chicken Republic, the mall and cinema, the cyber café with its courses and gigs,
    // street football, banks, night venues, the owambe hall, churches and mosques, hotels, Area C police station,
    // PHCN offices, roadside vendors, and enterable building interiors.
    public partial class Session
    {
        LandmarkData targetPlace;
        Vector3 targetVendor;

        public bool VenueOpen => Clock != null && (Clock.Clock >= Data.meta.venueOpen || Clock.Clock < Data.meta.venueClose);
        public bool OwambeOpen => Clock != null && Clock.Clock >= 19f && Clock.Clock < 23.5f;

        LandmarkData NearPlace(Vector3 pos) =>
            Data.NearestLandmark("gym", pos, 12f) ?? Data.NearestLandmark("restaurant", pos, 12f) ?? Data.NearestLandmark("mall", pos, 18f) ??
            Data.NearestLandmark("cafe", pos, 12f) ?? Data.NearestLandmark("pitch", pos, 20f) ?? Data.NearestLandmark("school", pos, 12f) ??
            Data.NearestLandmark("bank", pos, 11f) ?? Data.NearestLandmark("venue", pos, 11f) ?? Data.NearestLandmark("owambe", pos, 16f) ??
            Data.NearestLandmark("worship", pos, 12f) ?? Data.NearestLandmark("hotel", pos, 13f) ??
            (State.S.heat > 0 ? Data.NearestLandmark("police", pos, 13f) : null) ?? Data.NearestLandmark("nepa", pos, 12f);

        bool NearVendor(Vector3 pos, out Vector3 vendor)
        {
            vendor = Vector3.zero; float best = 3.5f * 3.5f;
            if (Data.vendors == null) return false;
            foreach (var v in Data.vendors) { var w = v.World(); float d = (new Vector3(w.x, pos.y, w.z) - pos).sqrMagnitude; if (d < best) { best = d; vendor = w; } }
            return best < 3.5f * 3.5f;
        }

        string PlacePrompt(LandmarkData p) => p.kind switch
        {
            "gym" => "ENTER GYM",
            "restaurant" => $"ENTER {p.name.ToUpper()}",
            "mall" => "ENTER MALL",
            "cafe" => "ENTER CYBER CAFÉ",
            "pitch" => "JOIN THE FOOTBALL",
            "school" => p.id == "yabatech" ? "ENTER YABA TECH" : "VISIT SCHOOL · EVENING CLASS",
            "bank" => $"ENTER {p.shortName}",
            "venue" => VenueOpen ? $"ENTER {p.name.ToUpper()} · ₦{(p.cost > 0 ? p.cost : 5000):N0}" : $"{p.name.ToUpper()} OPENS AT {Data.meta.venueOpen:0}:00",
            "owambe" => OwambeOpen ? $"JOIN THE OWAMBE · ₦{(p.cost > 0 ? p.cost : 3000):N0}" : "OWAMBE TONIGHT FROM 19:00",
            "worship" => $"ENTER {p.name.ToUpper()} · PRAY",
            "hotel" => $"CHECK IN · {p.name.ToUpper()} · ₦{(p.cost > 0 ? p.cost : 15000):N0}",
            "police" => $"SETTLE FINE · ₦{State.S.heat * Data.meta.fineRate:N0}",
            "nepa" => Events != null && Events.Outage > 0f ? "PAY FOR DIESEL · ₦5,000" : "ENTER PHCN OFFICE",
            _ => $"ENTER {p.shortName}"
        };

        void OpenPlaceMenu(LandmarkData p)
        {
            switch (p.kind)
            {
                case "gym": OpenGymMenu(p); break;
                case "restaurant": OpenFoodMenu(p); break;
                case "mall": OpenMallMenu(p); break;
                case "cafe": OpenCafeMenu(p); break;
                case "pitch": OpenFootballMenu(); break;
                case "school": OpenSchoolMenu(p); break;
                case "bank": AppBank(); break;
                case "venue": OpenVenueMenu(p); break;
                case "owambe": OpenOwambeMenu(p); break;
                case "worship": OpenWorshipMenu(p); break;
                case "hotel": OpenHotelMenu(p); break;
                case "police": OpenPoliceMenu(p); break;
                case "nepa": OpenNepaMenu(p); break;
            }
        }

        void Hours(float h) => Clock.Advance(h);

        // ---- enterable building interiors ----
        static readonly Vector3 RoomCenter = new Vector3(0f, 160f, 0f);
        GameObject interiorRoot;
        Vector3 interiorOutdoorPos;
        float interiorOutdoorYaw;
        string interiorName, interiorKind;
        System.Action interiorService;
        public bool InInterior => interiorRoot != null;

        public bool EnterInterior(string name, string kind, System.Action onUseService = null)
        {
            if (InInterior || Vehicle != null || Player == null) return false;
            interiorOutdoorPos = Player.transform.position;
            interiorOutdoorYaw = Player.transform.eulerAngles.y;
            interiorName = name;
            interiorKind = kind;
            interiorService = onUseService;

            interiorRoot = new GameObject("Interior " + name);
            var lit = ShaderLib.Lit;
            Material Mat(Color c) { var m = new Material(lit) { color = c }; m.SetFloat("_Smoothness", 0.2f); return m; }
            void RoomBox(string n, Vector3 localPos, Vector3 scale, Color c, bool col = true)
            {
                var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
                go.name = n; go.transform.SetParent(interiorRoot.transform, false);
                go.transform.position = RoomCenter + localPos; go.transform.localScale = scale;
                go.GetComponent<MeshRenderer>().sharedMaterial = Mat(c);
                if (!col) Destroy(go.GetComponent<Collider>());
            }
            bool home = kind == "home";
            RoomBox("Floor", new Vector3(0f, -0.1f, 0f), new Vector3(home ? 14f : 18f, 0.2f, home ? 12f : 16f), home ? new Color(0.42f, 0.31f, 0.22f) : new Color(0.55f, 0.53f, 0.49f));
            RoomBox("Ceiling", new Vector3(0f, 4.2f, 0f), new Vector3(home ? 14f : 18f, 0.2f, home ? 12f : 16f), new Color(0.88f, 0.86f, 0.82f));
            float hw = home ? 7f : 9f, hd = home ? 6f : 8f;
            RoomBox("NorthWall", new Vector3(0f, 2f, -hd), new Vector3(hw * 2f, 4.2f, 0.3f), new Color(0.82f, 0.78f, 0.70f));
            RoomBox("SouthWall", new Vector3(0f, 2f, hd), new Vector3(hw * 2f, 4.2f, 0.3f), new Color(0.82f, 0.78f, 0.70f));
            RoomBox("WestWall", new Vector3(-hw, 2f, 0f), new Vector3(0.3f, 4.2f, hd * 2f), new Color(0.82f, 0.78f, 0.70f));
            RoomBox("EastWall", new Vector3(hw, 2f, 0f), new Vector3(0.3f, 4.2f, hd * 2f), new Color(0.82f, 0.78f, 0.70f));
            RoomBox("Door", new Vector3(0f, 1.1f, hd - 0.2f), new Vector3(1.4f, 2.2f, 0.18f), new Color(0.29f, 0.19f, 0.12f), false);
            RoomBox(home ? "Bed" : "Counter", new Vector3(0f, 0.55f, -2f), home ? new Vector3(3.2f, 0.8f, 2.2f) : new Vector3(5.6f, 1.1f, 1.4f), home ? new Color(0.75f, 0.28f, 0.24f) : new Color(0.46f, 0.33f, 0.24f));

            var lightGo = new GameObject("RoomLight"); lightGo.transform.SetParent(interiorRoot.transform, false);
            lightGo.transform.position = RoomCenter + new Vector3(0f, 3.6f, 0f);
            var l = lightGo.AddComponent<Light>(); l.type = LightType.Point; l.range = 22f; l.intensity = 1.6f; l.color = new Color(1f, 0.94f, 0.82f);

            ActiveMenu = null;
            Player.Teleport(RoomCenter + new Vector3(0f, 0.5f, hd - 2f), 180f);
            Camera.Yaw = 180f;
            State.Toast($"Inside {name}");
            return true;
        }

        public void LeaveInterior()
        {
            if (!InInterior) return;
            Destroy(interiorRoot);
            interiorRoot = null;
            Player.Teleport(interiorOutdoorPos, interiorOutdoorYaw);
            Camera.Yaw = interiorOutdoorYaw;
            State.Toast("Back on the street");
        }

        bool UpdateInteriorOnFoot()
        {
            if (!InInterior) return false;
            var pos = Player.transform.position;
            float hd = interiorKind == "home" ? 6f : 8f;
            float dDoor = Vector2.Distance(new Vector2(pos.x, pos.z), new Vector2(RoomCenter.x, RoomCenter.z + hd - 0.4f));
            float dDesk = Vector2.Distance(new Vector2(pos.x, pos.z), new Vector2(RoomCenter.x, RoomCenter.z - 2f));
            Prompt = null;
            if (dDoor < 2.8f)
            {
                Prompt = "LEAVE BUILDING";
                if (Interact()) LeaveInterior();
            }
            else if (dDesk < 3.4f)
            {
                Prompt = interiorKind == "home" ? "SLEEP TILL MORNING" : $"USE {interiorName.ToUpper()}";
                if (Interact())
                {
                    if (interiorKind == "home") Sleep();
                    else interiorService?.Invoke();
                }
            }
            else Prompt = interiorName.ToUpper();
            return true;
        }

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

        void OpenGymMenu(LandmarkData p = null)
        {
            var c = Data.gym; bool m = GymMember;
            var menu = new Menu { Title = "Coach Emeka", Subtitle = "Surulere Fitness Gym", Line = m ? $"Member till day {State.S.gymUntil}. Fitness helps you recover faster; strength makes sprinting cost less. Wetin we dey train today?" : $"Day pass ₦{c.dayPass:N0}, monthly ₦{c.monthly:N0}. Fitness helps recovery; strength makes sprinting cost less." };
            menu.Options.Add(new MenuOption { Label = m ? "Strength training" : $"Strength training · day pass ₦{c.dayPass:N0}", Action = () => Train("Strength training", 2, 5, m ? 0 : c.dayPass) });
            menu.Options.Add(new MenuOption { Label = m ? "Cardio" : $"Cardio · day pass ₦{c.dayPass:N0}", Action = () => { if (Train("Cardio", 5, 0, m ? 0 : c.dayPass)) State.S.stamina = Mathf.Min(100f, State.S.stamina + 10f); } });
            menu.Options.Add(new MenuOption { Label = $"Personal trainer · ₦{c.trainer:N0}", Action = () => Train("Trainer session", 5, 6, c.trainer) });
            if (State.S.skills.fitness >= c.boxingMin) menu.Options.Add(new MenuOption { Label = "Boxing class", Action = () => { if (Train("Boxing", 3, 4, m ? 0 : c.dayPass)) State.AddRep("street", 3); } });
            if (!m) menu.Options.Add(new MenuOption { Label = $"Monthly membership · ₦{c.monthly:N0}", Action = () => { if (!State.Pay(c.monthly)) { State.Toast("Not enough money"); return; } State.S.gymUntil = Clock.Day + 30; State.AddRep("social", 2); State.Toast("Member for 30 days"); } });
            if (!InInterior) menu.Options.Add(new MenuOption { Label = "Step inside the gym", Action = () => EnterInterior(p?.name ?? "Surulere Fitness Gym", "gym", () => OpenGymMenu(p)) });
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
            if (!InInterior) menu.Options.Add(new MenuOption { Label = $"Step inside {p.name}", Action = () => EnterInterior(p.name, "restaurant", () => OpenFoodMenu(p)) });
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
        void OpenMallMenu(LandmarkData p = null)
        {
            var c = Data.mall;
            var menu = new Menu { Title = "Mall Attendant", Subtitle = p?.name ?? "Adeniran Ogunsanya Mall", Line = "Clothing, electronics, supermarket, barber — or the cinema upstairs." };
            menu.Options.Add(new MenuOption { Label = $"Buy an outfit · ₦{c.outfit:N0}", Action = () => { if (!State.Pay(c.outfit)) { State.Toast("Not enough money"); return; } State.S.outfits++; NextFabric(); State.GainSkill("charisma", 3); State.AddRep("social", 2); State.Toast($"Fresh fit · {FabricName()} · Charisma +3"); } });
            menu.Options.Add(new MenuOption { Label = State.Has("laptop") ? "Laptop · owned" : $"Laptop · ₦{c.laptop:N0}", Enabled = !State.Has("laptop"), Action = () => { if (!State.Pay(c.laptop)) { State.Toast("Not enough money"); return; } State.AddItem("laptop"); State.Toast("Laptop bought — freelance gigs pay double at the cyber café"); } });
            menu.Options.Add(new MenuOption { Label = $"Supermarket run · ₦{c.groceries:N0}", Action = () => { if (!State.Pay(c.groceries)) { State.Toast("Not enough money"); return; } State.AddItem("water"); State.AddItem("suya"); State.S.stamina = Mathf.Min(100f, State.S.stamina + 30f); State.Toast("Pure water and suya in your bag · stamina +30"); } });
            menu.Options.Add(new MenuOption { Label = $"Barber · ₦{c.barber:N0}", Action = () => { if (!State.Pay(c.barber)) { State.Toast("Not enough money"); return; } State.S.lookHair = (State.S.lookHair + 1) % 5; Player.ApplyLook(State.Look); State.GainSkill("charisma", 1); State.Toast("Fresh cut"); } });
            menu.Options.Add(new MenuOption { Label = "Cinema", Action = OpenCinemaMenu });
            if (!InInterior) menu.Options.Add(new MenuOption { Label = "Step inside the mall", Action = () => EnterInterior(p?.name ?? "Adeniran Ogunsanya Mall", "mall", () => OpenMallMenu(p)) });
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
            menu.Options.Add(new MenuOption { Label = "Back", Action = () => OpenMallMenu() });
            OpenMenu(menu);
        }

        // ---- cyber café ----
        void OpenCafeMenu(LandmarkData p = null)
        {
            var c = Data.cafe; int skilled = State.S.courses.Count; int gig = c.gig * (State.Has("laptop") ? 2 : 1);
            var menu = new Menu { Title = "Cyber Café Oga", Subtitle = p?.name ?? "Surulere Cyber Café", Line = skilled > 0 ? $"You get {skilled} certificate{(skilled > 1 ? "s" : "")}. Freelance gig ₦{gig:N0}. Courses still dey." : "Learn a trade for the digital economy. Certificates open better jobs." };
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
            if (!InInterior) menu.Options.Add(new MenuOption { Label = "Step inside the cyber café", Action = () => EnterInterior(p?.name ?? "Surulere Cyber Café", "cafe", () => OpenCafeMenu(p)) });
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

        // ---- roadside vendor ----
        void OpenVendorMenu()
        {
            var m = new Menu { Title = "Roadside Vendor", Subtitle = "Pure water · Gala · Suya", Line = "Pure water! Gala! Plantain chips! Cold one!" };
            m.Options.Add(new MenuOption { Label = "Pure Water · ₦100", Action = () => { if (!State.Pay(100)) { State.Toast("No money"); return; } State.AddItem("water"); State.Toast("Pure water added"); } });
            m.Options.Add(new MenuOption { Label = "Gala & Coke · ₦800 (stamina +25)", Action = () => { if (!State.Pay(800)) { State.Toast("No money"); return; } State.S.stamina = Mathf.Min(100f, State.S.stamina + 25f); State.Toast("Energy +25"); } });
            m.Options.Add(new MenuOption { Label = "Suya · ₦1,500", Action = () => { if (!State.Pay(1500)) { State.Toast("No money"); return; } State.AddItem("suya"); State.Toast("Suya added"); } });
            m.Options.Add(new MenuOption { Label = "Leave", Action = null });
            OpenMenu(m);
        }

        // ---- night venues, owambe, worship, hotel, police, NEPA ----
        void OpenVenueMenu(LandmarkData p)
        {
            int cost = p.cost > 0 ? p.cost : 5000;
            var m = new Menu { Title = p.name, Subtitle = "Nightlife venue", Line = VenueOpen ? "Music dey play, cold drinks dey. Come unwind." : $"{p.name} opens at {Data.meta.venueOpen:0}:00." };
            m.Options.Add(new MenuOption { Label = $"Night out · ₦{cost:N0} (stamina 100%, +10 health)", Enabled = VenueOpen, Action = () => { if (!State.Pay(cost)) { State.Toast("Not enough money"); return; } State.S.stamina = 100f; State.S.health = Mathf.Min(100f, State.S.health + 10f); State.AddXp(5); State.AddRep("social", 2); State.Toast($"Good vibes at {p.name} · stamina restored"); } });
            if (!InInterior) m.Options.Add(new MenuOption { Label = $"Step inside {p.name}", Action = () => EnterInterior(p.name, "venue", () => OpenVenueMenu(p)) });
            m.Options.Add(new MenuOption { Label = "Leave", Action = null });
            OpenMenu(m);
        }

        void OpenOwambeMenu(LandmarkData p)
        {
            int cost = p.cost > 0 ? p.cost : 3000;
            bool ok = OwambeOpen && State.S.partyDay != Clock.Day;
            var m = new Menu { Title = p.name, Subtitle = "Saturday Owambe", Line = !OwambeOpen ? "Owambe starts at 19:00." : State.S.partyDay == Clock.Day ? "You don spray enough for tonight." : "Live jùjú band, aso-ebi, small chops — spray some naira and network!" };
            m.Options.Add(new MenuOption { Label = $"Join the owambe & spray · ₦{cost:N0}", Enabled = ok, Action = () => { if (!State.Pay(cost)) { State.Toast("Not enough money to spray"); return; } State.S.partyDay = Clock.Day; State.S.stamina = 100f; State.AddXp(15); State.AddRep("social", 8); State.GainSkill("charisma", 3f); State.Toast("You spray, you dance, you network · +15 XP"); State.Message("amaka", "Saw you at the owambe. You sabi dance! Call me when you need work."); } });
            m.Options.Add(new MenuOption { Label = "Leave", Action = null });
            OpenMenu(m);
        }

        public bool Pray(LandmarkData p)
        {
            if (State.S.prayedDay == Clock.Day) { State.Toast("You already prayed today"); return false; }
            State.S.prayedDay = Clock.Day;
            State.S.stamina = Mathf.Min(100f, State.S.stamina + 30f);
            if (State.S.heat > 0) State.S.heat--;
            State.AddXp(5); State.AddRep("public", 3);
            State.Toast($"{p.name} · peace of mind, heat eased");
            return true;
        }

        void OpenWorshipMenu(LandmarkData p)
        {
            var m = new Menu { Title = p.name, Subtitle = "Place of worship", Line = State.S.prayedDay == Clock.Day ? "You already prayed today. Go in peace." : "Step inside for quiet reflection and prayer." };
            m.Options.Add(new MenuOption { Label = "Pray (+30 stamina, −1 heat)", Enabled = State.S.prayedDay != Clock.Day, Action = () => Pray(p) });
            if (!InInterior) m.Options.Add(new MenuOption { Label = $"Step inside {p.name}", Action = () => EnterInterior(p.name, "worship", () => Pray(p)) });
            m.Options.Add(new MenuOption { Label = "Leave", Action = null });
            OpenMenu(m);
        }

        void OpenHotelMenu(LandmarkData p)
        {
            int cost = p.cost > 0 ? p.cost : 15000;
            var m = new Menu { Title = p.name, Subtitle = "Hotel & Suites", Line = $"Check in for the night · ₦{cost:N0}. Rest until 07:00 with full health and stamina." };
            m.Options.Add(new MenuOption { Label = $"Check in · ₦{cost:N0}", Action = () => { if (!State.Pay(cost)) { State.Toast("Not enough money"); return; } Sleep(); } });
            if (!InInterior) m.Options.Add(new MenuOption { Label = $"Step inside {p.name}", Action = () => EnterInterior(p.name, "hotel", () => { if (State.Pay(cost)) Sleep(); }) });
            m.Options.Add(new MenuOption { Label = "Leave", Action = null });
            OpenMenu(m);
        }

        void OpenPoliceMenu(LandmarkData p)
        {
            int fine = State.S.heat * Data.meta.fineRate;
            var m = new Menu { Title = p.name, Subtitle = "Desk Sergeant", Line = State.S.heat > 0 ? $"Settle your fine of ₦{fine:N0} to clear your record." : "No warrant on your head today. Drive carefully." };
            if (State.S.heat > 0) m.Options.Add(new MenuOption { Label = $"Settle fine · ₦{fine:N0}", Action = () => { if (!State.Pay(fine)) { State.Toast("Not enough money to settle the fine"); return; } State.S.heat = 0; State.Toast($"Record cleared · ₦{fine:N0} paid"); } });
            m.Options.Add(new MenuOption { Label = "Leave", Action = null });
            OpenMenu(m);
        }

        void OpenNepaMenu(LandmarkData p)
        {
            bool outage = Events != null && Events.Outage > 0f;
            var m = new Menu { Title = p.name, Subtitle = "PHCN Undertaking", Line = outage ? "Transformer dey on generator backup. Drop ₦5,000 for diesel make light return now." : "PHCN: No outage for now. Pay your bill." };
            if (outage) m.Options.Add(new MenuOption { Label = "Pay for diesel · ₦5,000 (restore light)", Action = () => { if (!State.Pay(5000)) { State.Toast("Not enough money"); return; } Events.RestorePower(); State.Toast("Up NEPA! Light don come back."); } });
            m.Options.Add(new MenuOption { Label = "Leave", Action = null });
            OpenMenu(m);
        }
    }
}
