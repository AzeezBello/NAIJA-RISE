using UnityEngine;
using NaijaRise.World;

namespace NaijaRise
{
    // Contact relationships (src/systems/relationships.js): trust and respect per contact, moved by one greeting and
    // one work chat a day, with tiers stranger → known → friend → close that change the greeting and open leads.
    public partial class Session
    {
        public string GreetLine(ContactSystem.Contact c)
        {
            switch (State.RelTier(c.data.id))
            {
                case "known": return "Ah, Tunde. How far?";
                case "friend": return "My guy! You don show. Wetin dey?";
                case "close": return "My person. Anything you need, talk.";
                default: return c.data.line;
            }
        }

        // Appended to every contact menu.
        void AddRelationshipOptions(Menu m, ContactSystem.Contact c)
        {
            string id = c.data.id; bool talked = State.TalkedToday(id);
            m.Options.Add(new MenuOption { Label = talked ? "Small talk (caught up today)" : "Greet / small talk", Enabled = !talked, Action = () => Talk(c, 2f, 1f, null) });
            m.Options.Add(new MenuOption { Label = talked ? "Ask about work (caught up today)" : "Ask about work", Enabled = !talked, Action = () => Talk(c, 1f, 2f, "work") });
        }

        void Talk(ContactSystem.Contact c, float trust, float respect, string topic)
        {
            string id = c.data.id; string before = State.RelTier(id);
            if (State.TalkedToday(id)) { State.Toast($"You already caught up with {c.data.name} today"); return; }
            State.Rel(id).talkDay = State.S.day;
            State.BumpRel(id, trust, respect);
            if (before == "stranger") State.AddRep("social", 1);
            string after = State.RelTier(id);
            if (after != before) State.Toast($"{c.data.name} now sees you as a {after}");
            if (topic == "work")
            {
                if (after == "friend" || after == "close") { var jobs = Data.JobsAt(c.data.at); State.Toast(jobs.Count > 0 ? $"{c.data.name}: '{jobs[0].title} pays better when your {jobs[0].skill} is up.'" : $"{c.data.name} gives you a useful tip"); }
                else State.Toast($"{c.data.name}: 'Hustle hard, my friend.'");
            }
            else State.Toast($"{c.data.name} · trust {State.Rel(id).trust:0} · respect {State.Rel(id).respect:0}");
        }
    }
}
