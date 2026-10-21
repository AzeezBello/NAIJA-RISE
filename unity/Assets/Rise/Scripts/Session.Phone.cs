using System.Text;
using UnityEngine;
using Rise.Data;

namespace Rise
{
    // The smartphone: Messages, Jobs, Bank, Property, Businesses, Character, Contacts,
    // Inventory, Crew, Account, Settings, and Map · GPS, as pages of the choice card so they work with keyboard and pad alike. P / Select opens it.
    public partial class Session
    {
        public bool PhoneOpen;

        public void OpenPhone()
        {
            PhoneOpen = true;
            var m = new Menu { Title = "Rise: Hustle or Die Trying", Subtitle = $"{Clock.ClockText} · Day {Clock.Day} · {Data.RegionAt(Focus.position)?.name}", Line = $"₦{State.S.cash:N0} cash · ₦{State.S.bank:N0} bank · Level {State.S.level} {State.Title}" };
            int unread = State.Messages.Count;
            m.Options.Add(new MenuOption { Label = $"Messages ({unread})", Action = AppMessages });
            m.Options.Add(new MenuOption { Label = "Jobs", Action = AppJobs });
            m.Options.Add(new MenuOption { Label = "RiseBank", Action = AppBank });
            m.Options.Add(new MenuOption { Label = State.S.level >= Data.meta.propertyLevel ? "Property" : $"Property (Level {Data.meta.propertyLevel})", Enabled = State.S.level >= Data.meta.propertyLevel, Action = AppProperty });
            m.Options.Add(new MenuOption { Label = State.S.level >= Data.meta.propertyLevel ? "Businesses" : $"Businesses (Level {Data.meta.propertyLevel})", Enabled = State.S.level >= Data.meta.propertyLevel, Action = AppBusinesses });
            m.Options.Add(new MenuOption { Label = "Character", Action = AppCharacter });
            m.Options.Add(new MenuOption { Label = "Contacts", Action = AppContacts });
            m.Options.Add(new MenuOption { Label = "Inventory", Action = AppInventory });
            m.Options.Add(new MenuOption { Label = InCrew ? $"Crew · {State.S.crewName} [{CrewTag}]" : "Crew", Action = AppCrew });
            m.Options.Add(new MenuOption { Label = Account != null && Account.SignedIn ? $"Account · {Account.Email}" : "Account", Action = AppAccount });
            m.Options.Add(new MenuOption { Label = "Settings", Action = AppSettings });
            m.Options.Add(new MenuOption { Label = "Map · GPS", Action = () => AppMap("") });
            m.Options.Add(new MenuOption { Label = "Put the phone away", Action = () => PhoneOpen = false });
            OpenMenu(m);
        }

        void Page(string title, string subtitle, string body, params MenuOption[] options)
        {
            var m = new Menu { Title = title, Subtitle = subtitle, Line = body };
            foreach (var o in options) m.Options.Add(o);
            m.Options.Add(new MenuOption { Label = "Back", Action = OpenPhone });
            OpenMenu(m);
        }

        public void AppMap(string filter = "")
        {
            string q = (filter ?? "").Trim().ToLowerInvariant();
            ResolveWaypoint(State.S.waypointId, out var currentWp);
            var m = new Menu
            {
                Title = "Map · GPS",
                Subtitle = !string.IsNullOrEmpty(currentWp) ? $"Active waypoint: {currentWp}" : $"{Data.landmarks.Length} landmarks · {Data.busStops.Length} bus stops · {Contacts.Contacts.Count} contacts",
                Line = "Search any place, bus stop, property or contact in Lagos and tap to set a GPS route."
            };
            m.Fields.Add(new MenuField { Label = "Search Lagos", Value = filter ?? "" });
            m.Options.Add(new MenuOption { Label = "Search / filter list", Action = () => AppMap(m.Fields[0].Value) });
            if (!string.IsNullOrEmpty(State.S.waypointId))
                m.Options.Add(new MenuOption { Label = $"Clear GPS ({currentWp})", Action = () => { SetWaypoint(""); AppMap(m.Fields[0].Value); } });

            var entries = new System.Collections.Generic.List<(string id, string label, float dist)>();
            var origin = Focus.position;
            foreach (var l in Data.landmarks)
                if (string.IsNullOrEmpty(q) || l.name.ToLowerInvariant().Contains(q) || (l.shortName != null && l.shortName.ToLowerInvariant().Contains(q)))
                    entries.Add((l.id, $"Landmark · {l.name}", Vector3.Distance(origin, l.World())));
            foreach (var b in Data.busStops)
                if (string.IsNullOrEmpty(q) || b.name.ToLowerInvariant().Contains(q) || b.shortName.ToLowerInvariant().Contains(q))
                    entries.Add((b.id, $"Bus Stop · {b.name}", Vector3.Distance(origin, b.World())));
            foreach (var p in Data.properties)
                if (string.IsNullOrEmpty(q) || p.name.ToLowerInvariant().Contains(q))
                    entries.Add((p.id, $"Property · {p.name}", Vector3.Distance(origin, p.Door)));
            foreach (var c in Contacts.Contacts)
                if (string.IsNullOrEmpty(q) || c.data.name.ToLowerInvariant().Contains(q) || (c.data.role != null && c.data.role.ToLowerInvariant().Contains(q)))
                    entries.Add((c.data.id, $"Contact · {c.data.name} ({c.data.role})", Vector3.Distance(origin, c.pos)));

            entries.Sort((a, b) => a.dist.CompareTo(b.dist));
            int count = Mathf.Min(8, entries.Count);
            for (int i = 0; i < count; i++)
            {
                var entry = entries[i];
                m.Options.Add(new MenuOption { Label = $"Set GPS → {entry.label} ({entry.dist:0} m)", Action = () => { SetWaypoint(entry.id); PhoneOpen = false; } });
            }
            m.Options.Add(new MenuOption { Label = "Back", Action = OpenPhone });
            OpenMenu(m);
        }

        void AppMessages()
        {
            var sb = new StringBuilder();
            int from = Mathf.Max(0, State.Messages.Count - 6);
            for (int i = State.Messages.Count - 1; i >= from; i--) sb.Append(Data.ContactName(State.Messages[i].from)).Append(": ").Append(State.Messages[i].text).Append('\n');
            Page("Messages", $"{State.Messages.Count} messages", sb.Length > 0 ? sb.ToString().TrimEnd() : "No messages yet. Lagos go soon call you.");
        }

        void AppJobs()
        {
            var sb = new StringBuilder();
            foreach (var j in Data.jobs)
            {
                bool ok = State.CanTake(j);
                sb.Append(ok ? "✓ " : "✗ ").Append(j.title).Append(" · ").Append(j.where).Append(" · ₦").Append(State.JobPay(j).ToString("N0")).Append(" · ").Append(j.dur).Append("h");
                if (!ok) sb.Append(!string.IsNullOrEmpty(j.needCourse) && !State.HasCourse(j.needCourse) ? $" (needs {j.needCourse} certificate)" : $" (needs {j.skill} {j.min})");
                sb.Append('\n');
            }
            Page("Jobs", "Talk to the contact at the place to work a shift", sb.ToString().TrimEnd());
        }

        void AppBank()
        {
            var st = State.S;
            Page("RiseBank", $"₦{st.cash:N0} cash · ₦{st.bank:N0} in the bank", "Transfers are instant. Businesses and tenants pay into the bank; fines come from cash first.",
                new MenuOption { Label = "Deposit ₦10,000", Enabled = st.cash >= 10000, Action = () => { State.Deposit(10000); AppBank(); } },
                new MenuOption { Label = "Deposit all cash", Enabled = st.cash > 0, Action = () => { State.Deposit(st.cash); AppBank(); } },
                new MenuOption { Label = "Withdraw ₦10,000", Enabled = st.bank >= 10000, Action = () => { State.Withdraw(10000); AppBank(); } },
                new MenuOption { Label = "Withdraw ₦50,000", Enabled = st.bank >= 50000, Action = () => { State.Withdraw(50000); AppBank(); } });
        }

        void AppProperty()
        {
            var st = State.S; var sb = new StringBuilder();
            foreach (var p in Data.properties)
            {
                string status = st.home == p.id ? "HOME" : st.props.Contains(p.id) ? "owned" : st.rentedId == p.id ? $"rented till day {st.rentedUntil}" : p.buy > 0 ? $"rent ₦{p.rent:N0} · buy ₦{p.buy:N0}" : $"rent ₦{p.rent:N0}";
                sb.Append(p.name).Append(" — ").Append(status).Append('\n');
            }
            Page("Property", st.home != "" ? $"Home: {State.Home?.name}" : "No home yet — see Agent Kunle at any gate", sb.ToString().TrimEnd());
        }

        void AppBusinesses()
        {
            var sb = new StringBuilder();
            var opts = new System.Collections.Generic.List<MenuOption>();
            foreach (var b in Data.businesses)
            {
                var biz = b;
                var o = State.Biz(b.id);
                sb.Append(b.name).Append(" — ").Append(o == null ? $"for sale ₦{State.BizPrice(b):N0} · ₦{b.income:N0}/cycle" : $"yours · stock {o.stock:0}% · prices {o.price} · staff {(o.staff.Count > 0 ? string.Join(", ", o.staff) : "none")} · ₦{State.BizIncome(b):N0}/cycle").Append('\n');
                if (o != null)
                    opts.Add(new MenuOption { Label = $"Manage {b.name} (stock {o.stock:0}%, prices {o.price})", Action = () => OpenBusinessMenu(biz) });
                else
                    opts.Add(new MenuOption { Label = $"Buy {b.name} · ₦{State.BizPrice(b):N0}", Enabled = State.S.level >= Data.meta.propertyLevel, Action = () => { State.BuyBusiness(biz); AppBusinesses(); } });
            }
            Page("Businesses", $"{State.S.biz.Count} owned · next pay in {Mathf.Max(0f, State.S.payIn):0} s{(State.RivalOpen ? $" · {Data.rivalName} opened nearby" : "")}", sb.ToString().TrimEnd(), opts.ToArray());
        }

        void AppCharacter()
        {
            var st = State.S; var sk = st.skills;
            string Pick(string[] list, int i, string fallback) => list != null && list.Length > 0 ? list[Mathf.Clamp(i, 0, list.Length - 1)] : fallback;
            string body = $"Skills  driving {sk.driving:0}  business {sk.business:0}  charisma {sk.charisma:0}  fitness {sk.fitness:0}  strength {sk.strength:0}\n" +
                          $"Reputation  public {st.rep.publicRep}  business {st.rep.business}  street {st.rep.street}  social {st.rep.social}\n" +
                          $"Certificates  {(st.courses.Count > 0 ? string.Join(", ", st.courses) : "none")}{(st.collegeGraduated ? ", Yaba Tech diploma" : st.collegeSemester >= 0 ? $", Yaba Tech semester {st.collegeSemester}/{Data.school.semesters}" : "")}\n" +
                          $"Look  {Pick(Data.outfits, st.lookOutfit, "Ankara shirt")} in {FabricName()} · {Pick(Data.bodyTypes, st.lookBody, "Average")} · hair {Pick(Data.hairStyles, st.lookHairStyle, "Short")} · {Pick(Data.facialHair, st.lookFacialHair, "None")} · {Pick(Data.accessories, st.lookAccessory, "None")}\n" +
                          $"Skin {st.lookSkin + 1}/{Mathf.Max(1, Data.skins.Length)} · trousers {st.lookPants + 1}/{Mathf.Max(1, Data.pants.Length)} · hair colour {Pick(Data.hairColors, st.lookHair, "")} · face {Pick(Data.faces, st.lookFace, "Oval")} (face shape is stored; the rig has one face)";
            void Apply() { Player.ApplyLook(State.Look); AppCharacter(); }
            Page("Character", $"Level {st.level} {State.Title} · {st.xp}/100 XP", body,
                new MenuOption { Label = "Next outfit", Action = () => { st.lookOutfit = (st.lookOutfit + 1) % Mathf.Max(1, Data.outfits.Length); Apply(); } },
                new MenuOption { Label = "Next fabric", Action = () => { NextFabric(); AppCharacter(); } },
                new MenuOption { Label = "Next body type", Action = () => { st.lookBody = (st.lookBody + 1) % Mathf.Max(1, Data.bodyTypes.Length); Apply(); } },
                new MenuOption { Label = "Next hair style / colour", Action = () => { st.lookHairStyle = (st.lookHairStyle + 1) % Mathf.Max(1, Data.hairStyles.Length); if (st.lookHairStyle == 0) st.lookHair = (st.lookHair + 1) % Mathf.Max(1, Data.hairColors.Length); Apply(); } },
                new MenuOption { Label = "Next facial hair", Action = () => { st.lookFacialHair = (st.lookFacialHair + 1) % Mathf.Max(1, Data.facialHair.Length); Apply(); } },
                new MenuOption { Label = "Next accessory", Action = () => { st.lookAccessory = (st.lookAccessory + 1) % Mathf.Max(1, Data.accessories.Length); st.lookCap = st.lookAccessory == 1 ? 1 : st.lookAccessory == 2 ? 2 : 0; Apply(); } },
                new MenuOption { Label = "Next skin tone / trousers", Action = () => { st.lookSkin = (st.lookSkin + 1) % Mathf.Max(1, Data.skins.Length); if (st.lookSkin == 0) st.lookPants = (st.lookPants + 1) % Mathf.Max(1, Data.pants.Length); Apply(); } });
        }

        void AppContacts()
        {
            var sb = new StringBuilder();
            foreach (var c in Contacts.Contacts) sb.Append(c.data.name).Append(" · ").Append(c.data.role).Append(" · ").Append(IsFamily(c) ? $"bond {FamilyLabel(c.data.id)} · {FamilyActivity(c.data.id)}" : State.RelTier(c.data.id)).Append(Hubs.ContainsKey(c.data.id) ? " · local runs" : "").Append(Data.JobsAt(c.data.at).Count > 0 ? " · jobs" : "").Append('\n');
            Page("Contacts", $"{Contacts.Contacts.Count} people who know you", sb.ToString().TrimEnd());
        }

        void AppInventory()
        {
            var st = State.S; var sb = new StringBuilder();
            sb.Append(st.items.Count > 0 ? "Carrying: " + string.Join(", ", st.items.ConvertAll(Data.ItemName)) : "Nothing in your hands.").Append('\n');
            sb.Append($"Fight weapon: {EquippedWeaponName}{(WeaponPower() > 0 ? $" (power +{WeaponPower()})" : "")}").Append('\n');
            sb.Append("Vehicles: ").Append(st.vehicles.Count > 0 ? string.Join(", ", st.vehicles.ConvertAll(v => Data.VehicleClass(v.type)?.name ?? v.type)) : "none").Append('\n');
            sb.Append($"Fuel {st.fuel:0}% · stamina {st.stamina:0}% · health {st.health:0}%");
            var opts = new System.Collections.Generic.List<MenuOption>();
            foreach (var w in FightWeapons)
            {
                if (!State.Has(w.Id)) continue;
                var wSpec = w; bool eq = st.equippedWeapon == w.Id;
                opts.Add(new MenuOption { Label = eq ? $"{w.Name} · in hand" : $"Equip {w.Name} (power +{w.Power})", Enabled = !eq, Action = () => { EquipWeapon(wSpec.Id); AppInventory(); } });
            }
            if (!string.IsNullOrEmpty(st.equippedWeapon))
                opts.Add(new MenuOption { Label = "Holster weapon (hide from hand)", Action = () => { EquipWeapon(""); AppInventory(); } });
            Page("Inventory", "What you carry and own", sb.ToString(), opts.ToArray());
        }

        void AppCrew()
        {
            var st = State.S;
            if (!InCrew)
            {
                var m = new Menu { Title = "Crew", Subtitle = "No crew yet", Line = "Form a crew and share the code, or join one with a code. Crews share a treasury, an HQ and GPS pins, and race together." };
                m.Fields.Add(new MenuField { Label = "Name / code" }); m.Fields.Add(new MenuField { Label = "Tag (2–4)" });
                m.Options.Add(new MenuOption { Label = "Form a crew with this name and tag", Action = () => { CreateCrew(m.Fields[0].Value, m.Fields[1].Value); AppCrew(); } });
                m.Options.Add(new MenuOption { Label = "Join the crew with this code", Action = () => { JoinCrew(m.Fields[0].Value); AppCrew(); } });
                m.Options.Add(new MenuOption { Label = "Back", Action = OpenPhone });
                OpenMenu(m);
                return;
            }
            var hq = string.IsNullOrEmpty(st.crewHq) ? null : Data.Property(st.crewHq);
            string body = $"Code {st.crewCode} · treasury ₦{st.crewTreasury:N0} · HQ {(hq != null ? hq.name : "none")}\nPins shared: {Pins.Count} · co-op wins {CoopWins}{(CoopInvitePending ? $"\n{CoopPartnerName} invites you to a co-op race" : "")}{(CoopRace ? "\nCo-op race in progress" : "")}";
            Page($"{st.crewName} [{st.crewTag}]", "Your crew", body,
                new MenuOption { Label = "Deposit ₦10,000 to the treasury", Enabled = st.cash + st.bank >= 10000, Action = () => { CrewDeposit(10000); AppCrew(); } },
                new MenuOption { Label = "Withdraw ₦10,000", Enabled = st.crewTreasury >= 10000, Action = () => { CrewWithdraw(10000); AppCrew(); } },
                new MenuOption { Label = hq != null ? $"HQ: {hq.name}" : "Make my home the HQ", Enabled = hq == null && State.Home != null && State.Owns(State.Home), Action = () => { SetCrewHq(State.Home); AppCrew(); } },
                new MenuOption { Label = "Pin my position for the crew", Action = () => { SharePin(Data.RegionAt(Focus.position)?.name ?? "here"); AppCrew(); } },
                new MenuOption { Label = CoopInvitePending ? $"Accept {CoopPartnerName}'s co-op race" : "Invite the crew to a co-op race", Action = () => { if (CoopInvitePending) AcceptCoopRace(); else InviteCoopRace(); } },
                new MenuOption { Label = "Leave the crew", Action = () => { LeaveCrew(); AppCrew(); } });
        }

        void AppAccount()
        {
            if (Account == null || !Account.Online)
            {
                Page("Account", "Offline", "No backend configured. Copy Resources/cloud.example.json to cloud.json with your Supabase project URL and anon key, and apply supabase/schema.sql to the project. Your progress saves locally either way.");
                return;
            }
            if (Account.SignedIn)
            {
                Page("Account", Account.Status, $"Cloud save: {(Cloud != null ? Cloud.Status : "—")}\nMultiplayer: {(Players != null ? Players.Status : "off")}\nPress T in the city to chat with players in your district.",
                    new MenuOption { Label = "Save to the cloud now", Action = () => { AutoSave(); Cloud?.Push(State.S, ok => State.Toast(ok ? "Saved to the cloud" : "Cloud save failed")); } },
                    new MenuOption { Label = "Load the cloud save", Action = () => Cloud?.Pull(save => { if (save == null) { State.Toast(Cloud.Status); return; } State.S = save; State.Toast("Cloud save loaded — restart to apply the world state"); }) },
                    new MenuOption { Label = "Sign out", Action = () => { Account.SignOut(); AppAccount(); } });
                return;
            }
            var m = new Menu { Title = "Account", Subtitle = Account.Status, Line = "Sign in to save to the cloud and meet other players. Click a field, type, then choose." };
            m.Fields.Add(new MenuField { Label = "Email" }); m.Fields.Add(new MenuField { Label = "Password", Password = true });
            m.Options.Add(new MenuOption { Label = "Sign in", Action = () => Account.SignIn(m.Fields[0].Value, m.Fields[1].Value, (ok, msg) => { State.Toast(msg); AppAccount(); }) });
            m.Options.Add(new MenuOption { Label = "Create account", Action = () => Account.SignUp(m.Fields[0].Value, m.Fields[1].Value, (ok, msg) => { State.Toast(msg); AppAccount(); }) });
            m.Options.Add(new MenuOption { Label = "Back", Action = OpenPhone });
            OpenMenu(m);
        }

        void AppSettings()
        {
            var st = State.S; string[] q = World.QualityGovernor.Names;
            string level = Governor != null ? q[Governor.Level] : q[Mathf.Clamp(st.quality, 0, 2)];
            string perf = Governor != null ? $" · {Governor.Fps:0} fps · render scale {Governor.RenderScale * 100f:0} %" : "";
            Page("Settings", $"Graphics {(st.qualityAuto ? "Auto → " : "")}{level}{perf} · cinematic look {(st.cinematic ? "on" : "off")} · sound {(st.sound ? "on" : "off")}",
                "Auto reads the GPU and steps down whenever frames stay slow; dynamic resolution moves in four steps and climbs back when it can. The cinematic look is the HDR, bloom and tone-mapping pass. " + SystemInfo.graphicsDeviceName,
                new MenuOption { Label = st.qualityAuto ? "Graphics: Auto (tap for Low)" : $"Graphics: {level} (tap for next)", Action = () => { if (st.qualityAuto) { st.qualityAuto = false; st.quality = 0; } else { st.quality = (st.quality + 1) % 3; if (st.quality == 0) st.qualityAuto = true; } ApplyQuality(); AppSettings(); } },
                new MenuOption { Label = "Toggle cinematic look", Action = () => { st.cinematic = !st.cinematic; ApplyQuality(); AppSettings(); } },
                new MenuOption { Label = $"Sound: {(st.sound ? "on" : "off")}", Action = () => { st.sound = !st.sound; AppSettings(); } },
                new MenuOption { Label = $"Mature content (night hustlers): {(st.mature ? "on" : "off")}", Action = () => { st.mature = !st.mature; AppSettings(); } },
                new MenuOption { Label = "Save now", Action = () => { AutoSave(); State.Toast("Saved"); AppSettings(); } },
                new MenuOption { Label = "New game (erases the save)", Action = () => { GameState.ClearSave(); State.Toast("Save erased — restart to begin again"); AppSettings(); } });
        }

        public void ApplyQuality()
        {
            var st = State.S;
            if (Governor == null) return;
            Governor.SetCinematic(st.cinematic);
            if (st.qualityAuto) Governor.SetLevel(World.QualityGovernor.Detect(), true); else Governor.SetLevel(st.quality, false);
            st.quality = Governor.Level;
        }
    }
}
