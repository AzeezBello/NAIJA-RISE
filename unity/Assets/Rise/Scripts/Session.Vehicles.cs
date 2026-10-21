using UnityEngine;
using Rise.Data;
using Rise.Vehicles;
using Rise.World;

namespace Rise
{
    // Dayo's dealership at Ladipo: vehicle sales, protection weapon, owned vehicles that persist where you
    // parked them, and refuelling at the Mobil filling station.
    public partial class Session
    {
        public const int WeaponPrice = 18000;

        void OpenDealerMenu(ContactSystem.Contact dayo)
        {
            var m = new Menu { Title = dayo.data.name, Subtitle = dayo.data.role, Line = "Bring the motor, I go check am. Or buy one — papers dey inside." };
            foreach (var d in Data.dealer)
            {
                var cls = Data.VehicleClass(d.type); if (cls == null) continue; var deal = d;
                m.Options.Add(new MenuOption { Label = $"{cls.name} · ₦{d.price:N0}", Action = () => BuyVehicle(deal.type) });
            }
            bool hasWeapon = State.Has("weapon");
            m.Options.Add(new MenuOption { Label = hasWeapon ? "Protection weapon · carried" : $"Protection weapon · ₦{WeaponPrice:N0}", Enabled = !hasWeapon, Action = () => BuyProtectionWeapon() });
            foreach (var wId in new[] { "koboko", "baton", "cutlass" })
            {
                var spec = FindWeaponSpec(wId);
                if (!spec.HasValue) continue;
                var w = spec.Value; string id = w.Id;
                bool owned = State.Has(id); bool eq = State.S.equippedWeapon == id;
                m.Options.Add(new MenuOption { Label = owned ? $"{w.Name} · {(eq ? "equipped" : "equip")}" : $"{w.Name} · ₦{w.Price:N0} ({w.Desc})", Enabled = !eq, Action = () => BuyFightWeapon(id) });
            }
            foreach (var v in Parked)
            {
                if (!v.Owned || string.IsNullOrEmpty(v.OwnedId) || (v.transform.position - dayo.pos).magnitude > 30f) continue;
                OwnedVehicle o = null; foreach (var ov in State.S.vehicles) if (ov.id == v.OwnedId) o = ov;
                if (o == null) continue; var vv = v; var oo = o;
                m.Options.Add(new MenuOption { Label = $"My {v.Class.name} · service, insure, customise", Action = () => OpenVehicleMenu(vv, oo) });
            }
            m.Options.Add(new MenuOption { Label = "Not now", Action = null });
            OpenMenu(m);
        }

        public bool BuyProtectionWeapon()
        {
            if (State.Has("weapon")) { State.Toast("You already have a weapon"); return false; }
            if (!State.Pay(WeaponPrice)) { State.Toast("Not enough money"); return false; }
            State.AddItem("weapon");
            if (string.IsNullOrEmpty(State.S.equippedWeapon)) EquipWeapon("weapon");
            State.Toast("Weapon added to your inventory");
            return true;
        }

        public VehicleController BuyVehicle(string type)
        {
            var cls = Data.VehicleClass(type); if (cls == null) return null;
            int price = 0; foreach (var d in Data.dealer) if (d.type == type) price = d.price;
            if (!State.Pay(price)) { State.Toast($"You need ₦{price:N0} across cash and bank"); return null; }
            // Delivered to your gate if you have a home, else to the Ladipo forecourt.
            Vector3 at; float yaw = 180f;
            var home = State.Home;
            if (home != null) { at = home.Door + new Vector3(6f, 0f, 3f); }
            else if (Data.TryPlace("ladipo", out var ladipo)) { at = ladipo.World() + new Vector3(12f, 0f, 14f + State.S.vehicles.Count * 5f); }
            else at = Player.transform.position + Player.transform.right * 4f;
            var owned = new OwnedVehicle { id = System.DateTime.UtcNow.Ticks.ToString("x"), type = type, x = at.x, y = at.y, z = at.z, yaw = yaw };
            State.S.vehicles.Add(owned);
            var vc = SpawnOwned(owned);
            State.AddRep("business", 2);
            State.Toast($"{cls.name} is yours — parked at {(home != null ? "your gate" : "Ladipo")}");
            State.Message("dayo", $"{cls.name} don ready. Papers dey inside. Bring am back when e need service.");
            return vc;
        }

        public VehicleController SpawnOwned(OwnedVehicle o)
        {
            var cls = Data.VehicleClass(o.type) ?? Data.VehicleClass("car");
            var go = VehicleBodies.Build(cls, transform, new System.Random(o.id.GetHashCode()), out var wheels);
            var pos = new Vector3(o.x, 0f, o.z); pos.y = Data.DeckHeightAt(pos) + 0.12f;
            go.transform.position = pos; go.transform.rotation = Quaternion.Euler(0f, o.yaw, 0f);
            var vc = go.AddComponent<VehicleController>(); vc.Setup(cls, wheels); vc.Owned = true; vc.OwnedId = o.id; vc.Condition = o.cond; vc.Insured = o.insured;
            vc.Place(pos, Quaternion.Euler(0f, o.yaw, 0f));
            if (o.livery >= 0 && o.livery < Data.liveries.Length) vc.ApplyLivery(Entities.Mannequin.Hex(Data.liveries[o.livery]));
            if (o.slogan >= 0 && o.slogan < Data.slogans.Length) vc.ApplySlogan(Data.slogans[o.slogan]);
            Parked.Add(vc);
            return vc;
        }

        public void SpawnOwnedFromSave() { foreach (var o in State.S.vehicles) SpawnOwned(o); }

        // Owned vehicles stay where you parked them between sessions.
        void SaveVehicles()
        {
            foreach (var v in Parked)
            {
                if (!v.Owned || string.IsNullOrEmpty(v.OwnedId)) continue;
                foreach (var o in State.S.vehicles) if (o.id == v.OwnedId) { var p = v.transform.position; o.x = p.x; o.y = p.y; o.z = p.z; o.yaw = v.transform.eulerAngles.y; o.cond = v.Condition; }
            }
        }

        bool NearFuel(Vector3 pos) => Data.TryPlace("fuel", out var f) && (f.World() - pos).magnitude < 16f;

        void Refuel()
        {
            if (State.S.fuel >= 99f) { State.Toast("Tank is full"); return; }
            if (!State.Pay(Data.meta.refuel)) { State.Toast("Not enough money to refuel"); return; }
            State.S.fuel = 100f; State.Toast($"Refuelled · ₦{Data.meta.refuel:N0}");
        }
    }
}
