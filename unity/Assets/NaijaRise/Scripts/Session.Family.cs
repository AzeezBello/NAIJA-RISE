using UnityEngine;
using NaijaRise.Data;
using NaijaRise.World;

namespace NaijaRise
{
    // Family life (src/systems/family.js): Mama Tunde and Chioma follow their day plans between the compound, the
    // market, the school gate and church; household needs drift down each day and raise requests (chop money, a visit,
    // suya or sachet water, the school levy); completing them restores the need, bonds the family and pays XP and
    // social reputation. Family bond labels come from the data (Strained … Unshakable).
    public partial class Session
    {
        int familyDay = -1;
        float familyT;

        public FamilyRequestData ActiveFamilyRequest { get { foreach (var r in Data.familyRequests) if (r.id == State.S.familyRequest) return r; return null; } }

        void UpdateFamily(float dt)
        {
            if (Data.family.Length == 0) return;
            familyT -= dt;
            if (familyT <= 0f) { familyT = 1f; foreach (var f in Data.family) PlaceFamilyMember(f); }
            if (Clock.Day != familyDay)
            {
                familyDay = Clock.Day;
                foreach (var f in Data.family) { var rel = State.Family(f.id); rel.food = Mathf.Max(0f, rel.food - 18f); rel.companionship = Mathf.Max(0f, rel.companionship - 14f); rel.education = Mathf.Max(0f, rel.education - 9f); if (Clock.Day - rel.lastVisitDay > 4) rel.score = Mathf.Max(0f, rel.score - 3f); }
                MaybeIssueRequest();
            }
        }

        // Mum and Chioma stand where their schedule says (home yard, home door, market edge, school gate).
        void PlaceFamilyMember(FamilyMemberData f)
        {
            var slot = Data.ScheduleFor(f.id, Clock.Clock); if (slot == null) return;
            var spot = Data.FamilySpot(slot.spot); if (spot == null) return;
            var pos = WorldData.W(spot.x + f.offsetX, 0f, spot.z + f.offsetZ);
            if (slot.spot == "school_gate" && Data.TryPlace("school", out var school)) pos = school.World() + new Vector3(f.offsetX, 0f, 10f);
            pos.y = Data.DeckHeightAt(pos) + 0.3f;
            Contacts.Move(f.id, pos);
        }

        public string FamilyLabel(string who) => $"{Data.RelationshipLabel(State.Family(who).score)} ({State.Family(who).score:0})";
        public string FamilyActivity(string who) => Data.ScheduleFor(who, Clock.Clock)?.label ?? "home";

        void MaybeIssueRequest()
        {
            if (!string.IsNullOrEmpty(State.S.familyRequest) || State.S.familyRequestDay == Clock.Day) return;
            foreach (var r in Data.familyRequests)
            {
                var rel = State.Family(r.who);
                float need = r.need == "food" ? rel.food : r.need == "education" ? rel.education : rel.companionship;
                if (need >= r.threshold) continue;
                if (r.kind == "money" && State.S.familyDone.Contains(r.id) && Clock.Day % 5 != 0) continue;   // paid-for things come back every few days
                State.S.familyRequest = r.id; State.S.familyRequestDay = Clock.Day;
                State.Message(r.who, r.msg);
                return;
            }
        }

        // Test / script hook: raise a specific request now.
        public void IssueFamilyRequest(string id) { State.S.familyRequest = id; State.S.familyRequestDay = Clock.Day; }

        public bool IsFamily(ContactSystem.Contact c) { foreach (var f in Data.family) if (f.id == c.data.id) return true; return false; }

        void OpenFamilyMenu(ContactSystem.Contact c)
        {
            var who = c.data.id; var rel = State.Family(who); var req = ActiveFamilyRequest;
            var m = new Menu { Title = c.data.name, Subtitle = $"{c.data.role} · bond {FamilyLabel(who)} · {FamilyActivity(who)}", Line = req != null && req.who == who ? req.msg : c.data.line };
            if (req != null && req.who == who)
            {
                var r = req;
                switch (req.kind)
                {
                    case "money": m.Options.Add(new MenuOption { Label = $"Give ₦{req.amount:N0} — {req.title}", Enabled = State.S.cash + State.S.bank >= req.amount, Action = () => { if (State.Pay(r.amount)) CompleteRequest(r); } }); break;
                    case "fetch": m.Options.Add(new MenuOption { Label = $"Hand over the {req.item} — {req.title}", Enabled = State.Has(req.item), Action = () => { State.RemoveItem(r.item); CompleteRequest(r); } }); if (!State.Has(req.item)) m.Options.Add(new MenuOption { Label = $"(buy {req.item} at a POS kiosk first)", Enabled = false }); break;
                    default: m.Options.Add(new MenuOption { Label = $"Sit down a while — {req.title}", Action = () => CompleteRequest(r) }); break;
                }
            }
            m.Options.Add(new MenuOption { Label = "Greet and catch up", Action = () => Greet(who) });
            m.Options.Add(new MenuOption { Label = $"Give ₦2,000 for the house", Enabled = State.S.cash >= 2000, Action = () => { if (State.Pay(2000)) { var f = State.Family(who); f.food = Mathf.Min(100f, f.food + 15f); f.score = Mathf.Min(100f, f.score + 2f); State.AddRep("social", 1); State.Toast($"{c.data.name} · bond {FamilyLabel(who)}"); } } });
            m.Options.Add(new MenuOption { Label = "Leave", Action = null });
            OpenMenu(m);
        }

        void Greet(string who)
        {
            var f = State.Family(who);
            if (f.lastVisitDay == Clock.Day) { State.Toast("You already spent time together today"); return; }
            f.lastVisitDay = Clock.Day; f.companionship = Mathf.Min(100f, f.companionship + 20f); f.score = Mathf.Min(100f, f.score + 3f);
            State.AddRep("social", 1); State.AddXp(2);
            State.Toast($"{Data.ContactName(who)} · bond {FamilyLabel(who)}");
        }

        public void CompleteRequest(FamilyRequestData r)
        {
            var f = State.Family(r.who);
            if (r.need == "food") f.food = Mathf.Min(100f, f.food + r.restore); else if (r.need == "education") f.education = Mathf.Min(100f, f.education + r.restore); else f.companionship = Mathf.Min(100f, f.companionship + r.restore);
            f.score = Mathf.Min(100f, f.score + 8f); f.lastVisitDay = Clock.Day;
            if (!State.S.familyDone.Contains(r.id)) State.S.familyDone.Add(r.id);
            State.S.familyRequest = "";
            State.AddXp(r.xp); State.AddRep("social", r.repSocial);
            State.Message(r.who, r.done);
            State.Toast($"{r.title} · bond {FamilyLabel(r.who)}");
        }
    }
}
