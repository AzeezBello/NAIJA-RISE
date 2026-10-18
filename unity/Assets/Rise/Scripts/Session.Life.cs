using System.Collections.Generic;
using UnityEngine;
using Rise.Data;

namespace Rise
{
    // Life in the city: kiosks, Agent Kunle and the landlord, home and sleep, businesses, danfo transit, tolls.
    public partial class Session
    {
        // ---- kiosks ----
        void OpenKioskMenu()
        {
            int posAmt = Data.meta.posAmount > 0 ? Data.meta.posAmount : 20000;
            int posFee = Data.meta.posFee > 0 ? Data.meta.posFee : 200;
            var m = new Menu { Title = "POS Agent", Subtitle = "Roadside kiosk", Line = "Transfer or withdrawal? Network dey." };
            m.Options.Add(new MenuOption { Label = $"Pure water · ₦{Data.meta.priceWater:N0}  (stamina +20)", Action = () => { if (State.Pay(Data.meta.priceWater)) { State.S.stamina = Mathf.Min(100f, State.S.stamina + 20f); State.Toast("Pure water · cold one"); } else State.Toast("No money"); } });
            m.Options.Add(new MenuOption { Label = $"Suya · ₦{Data.meta.priceSuya:N0}  (stamina +40, health +10)", Action = () => { if (State.Pay(Data.meta.priceSuya)) { State.S.stamina = Mathf.Min(100f, State.S.stamina + 40f); State.S.health = Mathf.Min(100f, State.S.health + 10f); State.Toast("Suya · pepper dey"); } else State.Toast("No money"); } });
            m.Options.Add(new MenuOption { Label = $"Sachet water to carry · ₦{Data.meta.priceWater:N0}", Action = () => { if (State.Pay(Data.meta.priceWater)) { State.AddItem("water"); State.Toast("Pure water in your bag"); } else State.Toast("No money"); } });
            m.Options.Add(new MenuOption { Label = $"Suya to carry · ₦{Data.meta.priceSuya:N0}", Action = () => { if (State.Pay(Data.meta.priceSuya)) { State.AddItem("suya"); State.Toast("Suya wrapped for the road"); } else State.Toast("No money"); } });
            m.Options.Add(new MenuOption { Label = $"Withdraw ₦{posAmt:N0} (fee ₦{posFee:N0})", Enabled = State.S.bank >= posAmt + posFee, Action = () => { if (State.S.bank >= posAmt + posFee) { State.S.bank -= posAmt + posFee; State.S.cash += posAmt; UI.SoundSystem.I?.PlayCash(); State.Toast($"POS withdrawal · +₦{posAmt:N0} cash (₦{posFee:N0} fee)"); } else State.Toast($"Need ₦{posAmt + posFee:N0} in bank"); } });
            m.Options.Add(new MenuOption { Label = "Leave", Action = null });
            OpenMenu(m);
        }

        // ---- housing ----
        bool IsHome(PropertyData p) => p != null && State.S.home == p.id;

        PropertyData NearGate(Vector3 pos)
        {
            PropertyData best = null; float bestD = 6f * 6f;
            foreach (var p in Data.properties) { var d = p.Door; d.y = pos.y; float dd = (d - pos).sqrMagnitude; if (dd < bestD) { bestD = dd; best = p; } }
            return best;
        }

        void OpenGateMenu(PropertyData p)
        {
            int fee = Mathf.RoundToInt(p.rent * Data.meta.agentFeeRate);
            var m = new Menu { Title = "Agent Kunle", Subtitle = p.name, Line = "Agent fee na 10%. No agent, no house." };
            if (State.Owns(p)) { m.Options.Add(new MenuOption { Label = "Make this my home", Enabled = State.S.home != p.id, Action = () => { State.S.home = p.id; State.S.let.Remove(p.id); State.Toast($"You now live at {p.name}"); } }); AddPropertyOptions(m, p); }
            else
            {
                m.Options.Add(new MenuOption { Label = $"Rent · ₦{p.rent:N0} + ₦{fee:N0} agent fee · {Data.meta.leaseDays} days", Action = () => State.Rent(p) });
                if (p.buy > 0) m.Options.Add(new MenuOption { Label = $"Buy from the landlord · ₦{p.buy:N0}" + (State.S.level < Data.meta.propertyLevel ? $"  (Level {Data.meta.propertyLevel})" : ""), Enabled = State.S.level >= Data.meta.propertyLevel, Action = () => State.Buy(p) });
                else m.Options.Add(new MenuOption { Label = "Buy (rent only)", Enabled = false });
            }
            m.Options.Add(new MenuOption { Label = "Not now", Action = null });
            OpenMenu(m);
        }

        void OpenHomeMenu(PropertyData p)
        {
            var m = new Menu { Title = p.name, Subtitle = p.type, Line = p.perk == "heat0" ? "Gated, quiet. Sleeping here clears all heat and fills your last vehicle." : p.perk == "heat1" ? "Your own place. Sleeping here clears one heat." : "Shared bathroom, landlord upstairs. Home is home." };
            m.Options.Add(new MenuOption { Label = "Sleep till morning", Action = Sleep });
            m.Options.Add(new MenuOption { Label = "Step inside", Action = () => EnterInterior(p.name, "home") });
            AddUpgradeOptions(m, p);
            m.Options.Add(new MenuOption { Label = "Leave", Action = null });
            OpenMenu(m);
        }

        // Sleep until 07:00 next day, restoring full health and stamina, and clearing heat per the home's perk.
        public void Sleep()
        {
            var p = State.Home;
            Clock.SetTime(7f, Clock.Day + 1);
            lastDay = Clock.Day; State.NewDay(Clock.Day);
            State.S.health = 100f; State.S.stamina = 100f;
            if (p != null && p.perk == "heat0") { State.S.heat = 0; State.S.fuel = 100f; }
            else if (p != null && p.perk == "heat1") State.S.heat = Mathf.Max(0, State.S.heat - 1);
            AutoSave();
            State.Toast($"Day {Clock.Day} · Good morning");
        }

        // ---- businesses ----
        BusinessData NearBusiness(Vector3 pos)
        {
            BusinessData best = null; float bestD = 6f * 6f;
            foreach (var b in Data.businesses) { var w = b.World(pos.y); float dd = (w - pos).sqrMagnitude; if (dd < bestD) { bestD = dd; best = b; } }
            return best;
        }

        void OpenBusinessMenu(BusinessData b)
        {
            var o = State.Biz(b.id);
            var m = new Menu { Title = b.name, Subtitle = o == null ? "For sale" : $"Yours · stock {o.stock:0}% · prices {o.price} · ₦{State.BizIncome(b):N0} per pay cycle", Line = o == null ? "Oga, this place dey make money. Buy am and let the shop work for you." : "Business dey move. Keep stock up and watch your prices." };
            if (o == null) m.Options.Add(new MenuOption { Label = $"Buy · ₦{b.price:N0} · ₦{b.income:N0} per pay cycle" + (State.S.level < Data.meta.propertyLevel ? $"  (Level {Data.meta.propertyLevel})" : ""), Enabled = State.S.level >= Data.meta.propertyLevel, Action = () => State.BuyBusiness(b) });
            else
            {
                m.Options.Add(new MenuOption { Label = $"Restock · ₦{State.RestockCost(b):N0}", Enabled = o.stock < 100f, Action = () => State.Restock(b) });
                m.Options.Add(new MenuOption { Label = $"Change prices (now {o.price})", Action = () => State.CyclePrice(b) });
                AddStaffOptions(m, b);
            }
            m.Options.Add(new MenuOption { Label = "Leave", Action = null });
            OpenMenu(m);
        }

        // ---- danfo transit ----
        BusStopData NearBusStop(Vector3 pos)
        {
            BusStopData best = null; float bestD = 7f * 7f;
            foreach (var b in Data.busStops) { var w = b.World(pos.y); float dd = (w - pos).sqrMagnitude; if (dd < bestD) { bestD = dd; best = b; } }
            return best;
        }

        public List<BusStopData> Destinations(BusStopData from, int count = 4)
        {
            var list = new List<BusStopData>();
            var origin = from.World();
            foreach (var b in Data.busStops) if (b != from && (b.World() - origin).magnitude > 40f) list.Add(b);
            list.Sort((a, c) => (a.World() - origin).sqrMagnitude.CompareTo((c.World() - origin).sqrMagnitude));
            if (list.Count > count) list.RemoveRange(count, list.Count - count);
            return list;
        }

        public int Fare(BusStopData from, BusStopData to)
        {
            var danfo = Data.VehicleClass("danfo");
            float km = (to.World() - from.World()).magnitude / 1000f;
            return (danfo != null ? danfo.fare : 300) + Mathf.FloorToInt(km) * 100;
        }

        void OpenTransitMenu(BusStopData stop)
        {
            var m = new Menu { Title = "Oga Driver", Subtitle = stop.name, Line = $"{stop.shortName}! {stop.shortName}! Where you dey go? Enter with your change." };
            foreach (var dest in Destinations(stop))
            {
                var d = dest;
                m.Options.Add(new MenuOption { Label = $"{dest.name} · ₦{Fare(stop, dest):N0}", Action = () => Board(stop, d) });
            }
            foreach (var dest in Destinations(stop))
            {
                var d = dest;
                int haggleFare = Mathf.RoundToInt(Fare(stop, dest) * 0.7f);
                m.Options.Add(new MenuOption { Label = $"Negotiate · {dest.shortName} · ₦{haggleFare:N0} (70% fare)", Action = () => BoardNegotiated(stop, d) });
            }
            m.Options.Add(new MenuOption { Label = "Wait for another bus", Action = null });
            OpenMenu(m);
        }

        public bool BoardNegotiated(BusStopData from, BusStopData to)
        {
            float chance = 0.45f + State.S.skills.charisma * 0.006f;
            if (Random.value > chance)
            {
                State.AddRep("social", -1);
                State.Toast("Conductor: 'Oga enter with your complete change or trek!'");
                return false;
            }
            int fare = Mathf.RoundToInt(Fare(from, to) * 0.7f);
            if (!State.Pay(fare)) { State.Toast("Not enough money for that fare"); return false; }
            State.GainSkill("charisma", 0.5f);
            float km = (to.World() - from.World()).magnitude / 1000f;
            Clock.Advance(0.15f + km * 0.6f);
            var pos = to.World(); pos.z += 4f; pos.y = Data.DeckHeightAt(pos) + 0.5f;
            Player.Teleport(pos, 0f);
            Camera.Yaw = 180f;
            State.AddXp(1);
            State.Toast($"Conductor agreed! Arrived at {to.name} · ₦{fare:N0}");
            return true;
        }

        public bool Board(BusStopData from, BusStopData to)
        {
            int fare = Fare(from, to);
            if (!State.Pay(fare)) { State.Toast("Not enough money for that fare"); return false; }
            float km = (to.World() - from.World()).magnitude / 1000f;
            Clock.Advance(0.15f + km * 0.6f);   // a Lagos danfo: about 40 game minutes per kilometre with stops
            var pos = to.World(); pos.z += 4f; pos.y = Data.DeckHeightAt(pos) + 0.5f;
            Player.Teleport(pos, 0f);
            Camera.Yaw = 180f;
            State.AddXp(1);
            State.Toast($"Arrived at {to.name} · ₦{fare:N0}");
            return true;
        }

        // ---- tolls: crossing the barrier line in a vehicle charges the fee ----
        readonly Dictionary<string, int> tollSide = new Dictionary<string, int>();
        void UpdateTolls()
        {
            if (Vehicle == null) { tollSide.Clear(); return; }
            var pos = Vehicle.transform.position;
            foreach (var t in Data.tolls)
            {
                var road = Data.FindRoad(t.axis, t.k); if (road == null) continue;
                float along = road.Along(pos), across = road.Across(pos);
                bool onRoad = Mathf.Abs(across - t.k) < road.width * 0.5f + 1f;
                int side = along < t.at ? -1 : 1;
                if (!onRoad) { tollSide.Remove(t.id); continue; }
                if (tollSide.TryGetValue(t.id, out var prev) && prev != side)
                {
                    if (State.Pay(t.fee)) State.Toast($"{t.name} · ₦{t.fee:N0} paid");
                    else { State.AddHeat(1, null); State.Message("police", $"LASTMA: you jumped the {t.name}. Plate noted — heat +1."); }
                }
                tollSide[t.id] = side;
            }
        }
    }
}
