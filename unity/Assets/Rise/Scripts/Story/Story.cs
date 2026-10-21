using System;
using System.Collections.Generic;
using UnityEngine;

namespace Rise.Story
{
    // The story missions, hand-ported from src/data/missions.js. After the shared prologue (0–6) the road forks at
    // Crossroads by reputation: Amaka's legit arc or Baba K's risk arc, each closing with a race against Speedy's driver.
    // Mission payouts can be overridden live from Supabase via CloudEconomy (/admin dashboard) without a client rebuild.
    public class Line { public string Speaker, Text; public Line(string s, string t) { Speaker = s; Text = t; } }
    public class Choice { public string Label, Reply; public Func<Session, bool> Apply; }   // Apply returns false to cancel
    public class TaskSpec { public string Type, Dest, Item, Obj; public float Minutes, MaxKmh; public int Heat; public string VehicleType; }
    public class Mission
    {
        public string Title, At, Who, Arc;
        public Func<Session, string> Objective;
        public Func<Session, Line[]> Lines;
        public Choice[] Choices;
        public TaskSpec Task;
        public Action<Session> After, Fail;
        public Func<Session, bool> Requires;
    }

    public static class Missions
    {
        static readonly Choice[] None = new Choice[0];
        static string Risk(Session s) => s.State.S.path == "risk" ? "the package" : "the documents";

        static readonly Dictionary<string, int> DefaultRewards = new Dictionary<string, int>
        {
            ["first_run_risk"] = 25000,
            ["first_run_legit"] = 12000,
            ["get_paid_bonus"] = 10000,
            ["hot_delivery"] = 60000,
            ["cold_chain"] = 40000,
            ["warehouse_run"] = 50000,
            ["iponri_race"] = 80000,
            ["vehicle_recovery"] = 45000,
            ["getaway"] = 60000,
            ["rival_operation"] = 100000,
            ["coop_getaway"] = 60000,
            ["coop_convoy"] = 90000,
            ["apapa_pirates"] = 75000,
            ["ladipo_syndicate"] = 85000,
            ["abalti_armory"] = 95000,
            ["iponri_convoy_defense"] = 70000,
            ["banana_vip_extraction"] = 120000,
            ["cod_army_thunder"] = 150000,
            ["cod_army_shield"] = 165000,
            ["cod_army_citadel"] = 195000,
            ["cod_navy_trident"] = 160000,
            ["cod_navy_riptide"] = 175000,
            ["cod_navy_hurricane"] = 210000,
        };
        static readonly Dictionary<string, int> LiveRewards = new Dictionary<string, int>();

        public static int Reward(string id, int fallback = 0)
        {
            if (LiveRewards.TryGetValue(id, out var v)) return v;
            if (DefaultRewards.TryGetValue(id, out var d)) return d;
            return fallback;
        }

        public static void SetReward(string id, int amount)
        {
            if (amount >= 0) LiveRewards[id] = amount;
        }

        public static void ResetRewards() => LiveRewards.Clear();

        public static readonly List<Mission> All = new List<Mission>
        {
            new Mission { Title = "The First Run", At = "ojuelegba", Who = "babak",
                Objective = s => "Meet Baba K at Ojuelegba Junction",
                Lines = s => new[] { new Line("babak", "Tunde! You finally show. Lagos no dey wait for anybody."), new Line("babak", "I get two kinds of work for you. Fast money wey get risk, or slow money wey clean.") },
                Choices = new[] {
                    new Choice { Label = "The fast one.", Reply = "Ehen. Carry this package go Iponri, Amaka dey wait. Stake na ₦5,000, you go collect ₦25,000.",
                        Apply = s => { if (!s.State.Pay(5000)) { s.State.Toast("You need ₦5,000 for the stake"); return false; } s.State.S.path = "risk"; s.State.AddItem("package"); return true; } },
                    new Choice { Label = "The clean one.", Reply = "Wise man. Carry these documents go Iponri for Amaka. ₦12,000, no wahala.",
                        Apply = s => { s.State.S.path = "legit"; s.State.AddItem("documents"); return true; } } },
                After = s => { s.State.Message("babak", s.State.S.path == "risk" ? "Package dey your hand. Amaka dey wait for Iponri. No waste time." : "Documents dey your hand. Amaka dey Iponri. Do am well."); s.State.AddXp(20); } },

            new Mission { Title = "Make the Delivery", At = "marina", Who = "amaka",
                Objective = s => $"Deliver {Risk(s)} to Amaka at Iponri",
                Lines = s => s.State.S.path == "risk"
                    ? new[] { new Line("amaka", "You carry am come? Give me quick, eyes dey everywhere."), new Line("amaka", $"Clean work. ₦{Reward("first_run_risk"):N0}. But police go hear about this one.") }
                    : new[] { new Line("amaka", "Ah, the documents. Baba K said you were reliable."), new Line("amaka", $"Here is ₦{Reward("first_run_legit"):N0}. Honest money spends the same.") },
                After = s => {
                    if (s.State.S.path == "risk") { int pay = Reward("first_run_risk"); s.State.Earn(pay); s.State.RemoveItem("package"); s.State.AddHeat(1, null); s.State.Toast($"+₦{pay:N0} · Heat +1"); s.State.AddRep("street", 5); }
                    else { int pay = Reward("first_run_legit"); s.State.Earn(pay); s.State.RemoveItem("documents"); s.State.Toast($"+₦{pay:N0}"); s.State.AddRep("public", 5); }
                    s.State.Message("amaka", "Received. Baba K go settle you at Ojuelegba."); s.State.AddXp(35); } },

            new Mission { Title = "Get Paid", At = "ojuelegba", Who = "babak",
                Objective = s => "Return to Baba K at Ojuelegba Junction",
                Lines = s => new[] { new Line("babak", "My guy! Amaka talk say you do well."), new Line("babak", "I fit add something on top. Wetin you want?") },
                Choices = new[] {
                    new Choice { Label = "Cash bonus.", Reply = "Straight to the point. ₦10,000 on top.", Apply = s => { s.State.Earn(Reward("get_paid_bonus")); return true; } },
                    new Choice { Label = "Introduce me to Mama Nkechi.", Reply = "Smart. She go sell you her kiosk for cheap.",
                        Apply = s => { s.State.S.kioskDeal = true; s.State.Message("nkechi", "Baba K talk say you serious. My Roadside Kiosk na 40% off for you."); return true; } } },
                After = s => { s.State.Message("babak", "Reach Level 2, then come back. I go show you bigger things."); s.State.AddXp(45); } },

            new Mission { Title = "Raise Your Game", At = "ojuelegba", Who = "babak",
                Requires = s => s.State.S.level >= 2,
                Objective = s => s.State.S.level >= 2 ? "Return to Baba K at Ojuelegba Junction" : "Reach Level 2 — work shifts with the contacts",
                Lines = s => new[] { new Line("babak", "Level 2 already? Lagos dey favour you."), new Line("babak", "This na just the beginning. Buy property, buy business, build your empire.") },
                After = s => { s.State.Message("babak", "You don rise small. Property and Businesses dey open for you. Amaka get one hot job for you at Iponri — if you get liver."); s.State.AddRep("street", 5); s.State.AddXp(20); } },

            new Mission { Title = "Hot Delivery", At = "marina", Who = "amaka",
                Objective = s => "See Amaka at Iponri for the hot job",
                Lines = s => new[] { new Line("amaka", "This package na hot one. Police dey watch Iponri. The moment you carry am, dem go follow you."), new Line("amaka", $"Get am to Baba K at Ojuelegba. If dem catch you, na you sabi. ₦{Reward("hot_delivery"):N0} if you deliver.") },
                Choices = new[] {
                    new Choice { Label = "I go deliver am.", Reply = "Sharp. Go!", Apply = s => { s.State.S.chase = true; s.State.AddItem("package"); s.State.S.heat = Mathf.Max(s.State.S.heat, 3); return true; } },
                    new Choice { Label = "Not today.", Reply = "Come back when you ready.", Apply = s => false } },
                After = s => s.State.Message("babak", "Dem dey follow you? Lose them and come. I dey Ojuelegba.") },

            new Mission { Title = "Hot Delivery · Drop", At = "ojuelegba", Who = "babak", Requires = s => s.State.S.chase,
                Objective = s => "Reach Baba K at Ojuelegba with the package — don't get arrested",
                Lines = s => new[] { new Line("babak", "You reach! With police for your back. Na so we dey do am."), new Line("babak", $"₦{Reward("hot_delivery"):N0}. Lagos don hear your name now.") },
                After = s => { s.State.S.chase = false; s.State.RemoveItem("package"); s.State.Earn(Reward("hot_delivery")); s.State.S.heat = 0; s.State.AddRep("street", 15); s.State.AddRep("public", -5);
                    s.State.Message("amaka", "Two roads from here. Come see me at Iponri if you want clean money. Baba K go call you if you want the other thing."); s.State.AddXp(40); } },

            new Mission { Title = "Crossroads", At = "marina", Who = "amaka",
                Objective = s => "Choose your road — see Amaka at Iponri",
                Lines = s => new[] { new Line("amaka", $"Street rep {s.State.S.rep.street}, public rep {s.State.S.rep.publicRep}. Lagos don notice you."), new Line("amaka", "I run clean logistics — convoys, cold chain. Baba K runs the other kind. Wetin you be?") },
                Choices = new[] {
                    new Choice { Label = "Legit with Amaka (needs Public 0+)", Reply = "Good. First job na cold chain — vaccines for the school clinic. Time matters.",
                        Apply = s => { if (s.State.S.rep.publicRep < 0) { s.State.Toast("Your public reputation is too low. Work shifts, settle fines."); return false; } s.State.S.arc = "legit"; s.State.S.mission = 6; s.State.AddRep("public", 3); return true; } },
                    new Choice { Label = "Run with Baba K (needs Street 10+)", Reply = "Then Baba K dey wait for you at Ojuelegba. No tell me anything.",
                        Apply = s => { if (s.State.S.rep.street < 10) { s.State.Toast("The street does not know you yet. Take risks, hustle."); return false; } s.State.S.arc = "risk"; s.State.S.mission = 10; return true; } } } },

            // ---- Legit arc (Amaka) 7–9 ----
            new Mission { Title = "Cold Chain", At = "marina", Who = "amaka", Arc = "legit",
                Objective = s => "Collect the vaccine box from Amaka at Iponri",
                Lines = s => new[] { new Line("amaka", "Vaccine box. Community Grammar School clinic. You get 20 minutes of Lagos time before e spoil.") },
                Task = new TaskSpec { Type = "timed", Dest = "school", Minutes = 20, Item = "coldbox", Obj = "Deliver the vaccine box to the school before it spoils" },
                After = s => { s.State.Earn(Reward("cold_chain")); s.State.AddRep("public", 6); s.State.AddRep("business", 4); s.State.Message("amaka", "Clinic got it cold. Next: a warehouse run. No speeding, the cargo is fragile."); s.State.AddXp(30); },
                Fail = s => s.State.Message("amaka", "The box spoiled. We lost the batch. Come back, I go give you one more chance.") },
            new Mission { Title = "Warehouse Run", At = "lawma", Who = "amaka", Arc = "legit",
                Objective = s => "Pick up the fragile cargo at the LAWMA depot",
                Lines = s => new[] { new Line("amaka", "Glassware for the filling station shop. Keep it under 90 km/h the whole way or everything breaks.") },
                Task = new TaskSpec { Type = "cargo", Dest = "fuel", MaxKmh = 90, Item = "cargo", Obj = "Deliver the glassware to Mobil — stay under 90 km/h" },
                After = s => { s.State.Earn(Reward("warehouse_run")); s.State.AddRep("business", 6); s.State.Message("amaka", "Not one crack. The Iponri crews race Funsho Williams tonight — win it and they will respect our name."); s.State.AddXp(30); },
                Fail = s => s.State.Message("amaka", "Everything broke. Fragile means fragile. Try again.") },
            new Mission { Title = "The Iponri Race", At = "stadstop", Who = "speedy", Arc = "legit",
                Objective = s => "Meet Speedy at the Stadium bus stop to race for Amaka",
                Lines = s => new[] { new Line("speedy", "Amaka's boy? Funsho Williams, two laps, my crew versus you. Lose and Marina pays.") },
                Task = new TaskSpec { Type = "race", Obj = "Win the race on Funsho Williams Avenue" },
                After = s => { s.State.Earn(Reward("iponri_race")); s.State.AddRep("street", 10); s.State.AddRep("social", 6); s.State.S.done = true; s.State.Toast("AMAKA'S ARC COMPLETE — Lagos respects clean money"); s.State.Message("amaka", "You won. Marina is ours. Keep building — more work soon."); s.State.AddXp(60); },
                Fail = s => s.State.Message("speedy", "Dem beat you. Come back when your motor get sense.") },

            // ---- Risk arc (Baba K) 10–12 ----
            new Mission { Title = "Vehicle Recovery", At = "ojuelegba", Who = "babak", Arc = "risk",
                Objective = s => "See Baba K at Ojuelegba",
                Lines = s => new[] { new Line("babak", "One sedan dey park near Bode Thomas — the owner owe me. Carry am come Ladipo, Dayo go change the plate.") },
                Task = new TaskSpec { Type = "steal", VehicleType = "car", Dest = "ladipo", Obj = "Take the sedan near Bode Thomas to Dayo at Ladipo" },
                After = s => { s.State.Earn(Reward("vehicle_recovery")); s.State.AddRep("street", 8); s.State.Message("babak", "Plates changed. Next one hot: start at Ojuelegba with the police on you and disappear."); s.State.AddXp(30); } },
            new Mission { Title = "Getaway", At = "ojuelegba", Who = "babak", Arc = "risk",
                Objective = s => "See Baba K at Ojuelegba for the getaway",
                Lines = s => new[] { new Line("babak", "Police go chase you the moment you leave. Lose them — no police within 60 metres for 8 seconds. Then we talk.") },
                Task = new TaskSpec { Type = "escape", Heat = 4, Obj = "Lose the police — stay 60 m clear of every patrol for 8 seconds" },
                After = s => { s.State.Earn(Reward("getaway")); s.State.S.heat = 0; s.State.AddRep("street", 10); s.State.AddRep("public", -6); s.State.Message("babak", "Ghost! Last thing: a rival crew dey claim Funsho Williams. Race their driver. Winner keeps the road."); s.State.AddXp(35); },
                Fail = s => s.State.Message("babak", "Dem catch you. Pay your fine and come back.") },
            new Mission { Title = "Rival Operation", At = "stadstop", Who = "speedy", Arc = "risk",
                Objective = s => "Meet Speedy at the Stadium bus stop — the rival crew's driver",
                Lines = s => new[] { new Line("speedy", "Baba K sent you? Two laps. You lose, Funsho Williams na our own. You win, we respect am.") },
                Task = new TaskSpec { Type = "race", Obj = "Win the race on Funsho Williams Avenue" },
                After = s => { s.State.Earn(Reward("rival_operation")); s.State.AddRep("street", 15); s.State.S.done = true; s.State.Toast("BABA K'S ARC COMPLETE — Funsho Williams is yours"); s.State.Message("babak", "The road na your own. More work soon. Lagos no dey sleep."); s.State.AddXp(60); },
                Fail = s => s.State.Message("babak", "You lose the road. Race again when you ready.") },
        };

        // The place where a contact is met, for the mission marker when the contact is not placed.
        public static Mission Current(GameState state) => All[Mathf.Clamp(state.S.mission, 0, All.Count - 1)];
    }
}
