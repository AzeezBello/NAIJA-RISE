using System.Collections.Generic;
using UnityEngine;
using Rise.Data;
using Rise.Entities;
using Rise.Story;
using Rise.World;

namespace Rise
{
    // Firearms shooting mechanics (Pistol, Shotgun, Navy MP5 SMG, AK-47 Rifle, M24 Sniper, PKM LMG),
    // 3D bullet tracers, Call of Duty-style Nigerian Military (81 Division) & Nigerian Navy (SBS) multi-wave
    // Spec-Ops missions with allied AI fireteams, armoured HVT bosses, tactical radio callouts, and hitmarkers.
    public partial class Session
    {
        public class ActionOp
        {
            public string Id, Title, Who, Dest, Briefing, Rep;
            public string Branch = "";          // "" (street), "army" (Nigerian Army 81 Div), or "navy" (Nigerian Navy SBS)
            public string Callsign = "";        // e.g. "ALPHA-1", "NEPTUNE-1"
            public string Overwatch = "";       // e.g. "81 Div TOC", "NNS Beecroft Ops"
            public string BossName = "";        // HVT Commander in the final wave
            public int Waves = 1;               // Multi-wave CoD-style progression
            public int EnemyCount, EnemyHp, Reward, Xp, Heat;
        }

        public static readonly ActionOp[] ActionOps =
        {
            // ---- Street Action Shootout Missions ----
            new ActionOp
            {
                Id = "apapa_pirates",
                Title = "Port Creek Pirate Raid",
                Who = "beecroft_officer",
                Dest = "apapa-wharf",
                Waves = 1, EnemyCount = 4, EnemyHp = 100, Reward = 75000, Xp = 35, Heat = 0, Rep = "public",
                Briefing = "Armed creek pirates have seized a container berth at Apapa Wharf. Equip a firearm and neutralize all 4 gunmen."
            },
            new ActionOp
            {
                Id = "ladipo_syndicate",
                Title = "Ladipo Chop-Shop Ambush",
                Who = "dayo",
                Dest = "mushin",
                Waves = 1, EnemyCount = 5, EnemyHp = 100, Reward = 85000, Xp = 40, Heat = 1, Rep = "street",
                Briefing = "An armed hijacking syndicate in Mushin is ambushing Ladipo parts trucks. Bring a gun and clear out all 5 gunmen."
            },
            new ActionOp
            {
                Id = "abalti_armory",
                Title = "Joint Task Force Bunker Sweep",
                Who = "abalti_quartermaster",
                Dest = "dodan-barracks",
                Waves = 1, EnemyCount = 5, EnemyHp = 110, Reward = 95000, Xp = 45, Heat = 0, Rep = "public",
                Briefing = "Armed smugglers are moving contraband near the Obalende perimeter. Take your rifle or pistol and eliminate all 5 gunmen."
            },
            new ActionOp
            {
                Id = "iponri_convoy_defense",
                Title = "Iponri Yard Armed Defense",
                Who = "amaka",
                Dest = "marina",
                Waves = 1, EnemyCount = 4, EnemyHp = 100, Reward = 70000, Xp = 35, Heat = 0, Rep = "business",
                Briefing = "Rival gunmen are moving on the Iponri Logistics Yard to hijack night haulage. Equip a firearm and eliminate all 4 attackers."
            },
            new ActionOp
            {
                Id = "banana_vip_extraction",
                Title = "Island VIP Armed Extraction",
                Who = "police",
                Dest = "banana-mansion",
                Waves = 1, EnemyCount = 6, EnemyHp = 120, Reward = 120000, Xp = 50, Heat = 0, Rep = "public",
                Briefing = "Kidnappers with automatic rifles have cornered a VIP convoy on Banana Island. Bring heavy firepower and neutralize all 6 gunmen."
            },
            new ActionOp
            {
                Id = "cbn_bullion_defense",
                Title = "CBN Bullion Convoy Defense",
                Who = "cbn_director",
                Dest = "cbn-lagos",
                Waves = 1, EnemyCount = 5, EnemyHp = 110, Reward = 110000, Xp = 48, Heat = 0, Rep = "business",
                Briefing = "Armed bullion robbers are staging a heist outside Central Bank of Nigeria at Tinubu Square. Equip a firearm and neutralize all 5 gunmen."
            },
            new ActionOp
            {
                Id = "efcc_cyber_raid",
                Title = "EFCC Syndicate Asset Raid",
                Who = "efcc_commander",
                Dest = "efcc-ikoyi",
                Waves = 1, EnemyCount = 5, EnemyHp = 110, Reward = 115000, Xp = 50, Heat = 0, Rep = "public",
                Briefing = "EFCC Zonal Command is executing a high-risk asset seizure against an armed money-laundering syndicate in Ikoyi. Neutralize all 5 syndicate guards."
            },

            // ---- Call of Duty–Style Nigerian Military (81 Division / JTF) Spec-Ops ----
            new ActionOp
            {
                Id = "cod_army_thunder",
                Title = "OP IRON THUNDER · Cantonment Breach",
                Who = "abalti_quartermaster",
                Dest = "ikeja-cantonment",
                Branch = "army", Callsign = "ALPHA-1", Overwatch = "81 Div Tactical TOC", BossName = "Commander Vektor",
                Waves = 2, EnemyCount = 4, EnemyHp = 110, Reward = 150000, Xp = 60, Heat = 0, Rep = "public",
                Briefing = "[OP IRON THUNDER] 81 Div TOC to Alpha-1: Insurgent strike cells are breaching Ikeja Cantonment perimeter. Deploy with Bravo fireteam, repel 2 assault waves, and eliminate HVT Commander Vektor."
            },
            new ActionOp
            {
                Id = "cod_army_shield",
                Title = "OP DESERT SHIELD · Badagry Corridor Ambush",
                Who = "abalti_quartermaster",
                Dest = "ojo-cantonment",
                Branch = "army", Callsign = "RECCE-1", Overwatch = "244 Recce Command", BossName = "Warlord Garba",
                Waves = 2, EnemyCount = 4, EnemyHp = 115, Reward = 165000, Xp = 65, Heat = 0, Rep = "public",
                Briefing = "[OP DESERT SHIELD] Cross-border arms militia have staged a heavy ambush near Ojo Cantonment. Advance with Recce fireteam, clear 2 waves, and neutralize Warlord Garba."
            },
            new ActionOp
            {
                Id = "cod_army_citadel",
                Title = "OP LION CITADEL · Dodan Counter-Strike",
                Who = "abalti_quartermaster",
                Dest = "dodan-barracks",
                Branch = "army", Callsign = "GUARD-1", Overwatch = "Dodan Command Bunker", BossName = "Col. Kazeem (Rogue)",
                Waves = 3, EnemyCount = 3, EnemyHp = 120, Reward = 195000, Xp = 75, Heat = 0, Rep = "public",
                Briefing = "[OP LION CITADEL] Mercenary strike units are assaulting the Obalende communications relay. Hold the sector across 3 waves with Guards Brigade troopers and eliminate the Rogue Commander."
            },
            new ActionOp
            {
                Id = "cod_jtf_boko_haram",
                Title = "OP LAFIYA DOLE · Boko Haram Cell Raid",
                Who = "abalti_quartermaster",
                Dest = "berger-interstate",
                Branch = "army", Callsign = "JTF-1", Overwatch = "JTF Counter-Terror TOC", BossName = "Commander Abubakar (Boko Haram)",
                Waves = 2, EnemyCount = 4, EnemyHp = 115, Reward = 185000, Xp = 70, Heat = 0, Rep = "public",
                Briefing = "[OP LAFIYA DOLE] JTF Counter-Terrorism TOC to JTF-1: A heavily armed Boko Haram insurgent sleeper cell has been tracked near the Northern Interstate Corridor. Deploy with 81 Div troopers across 2 waves and neutralize HVT Commander Abubakar."
            },
            new ActionOp
            {
                Id = "cod_army_bandit_sweep",
                Title = "OP HADARIN DAJI · Armed Bandit Kingpin Sweep",
                Who = "abalti_quartermaster",
                Dest = "ojo-cantonment",
                Branch = "army", Callsign = "STRIKE-1", Overwatch = "81 Div Anti-Banditry TOC", BossName = "Bandit Kingpin Kachalla Turji",
                Waves = 2, EnemyCount = 4, EnemyHp = 115, Reward = 175000, Xp = 65, Heat = 0, Rep = "public",
                Briefing = "[OP HADARIN DAJI] Armed highway bandits led by Kingpin Kachalla Turji have set up an ambush camp along the outer bush corridor. Advance with 81 Div Recce soldiers across 2 waves and eliminate Bandit Kingpin Kachalla Turji."
            },

            // ---- Call of Duty–Style Nigerian Navy (Western Naval Command / SBS) Spec-Ops ----
            new ActionOp
            {
                Id = "cod_navy_trident",
                Title = "OP BLACK TRIDENT · Harbour Board & Clear",
                Who = "beecroft_officer",
                Dest = "nns-beecroft",
                Branch = "navy", Callsign = "NEPTUNE-1", Overwatch = "NNS Beecroft Ops", BossName = "Captain Blackwater",
                Waves = 2, EnemyCount = 4, EnemyHp = 110, Reward = 160000, Xp = 60, Heat = 0, Rep = "public",
                Briefing = "[OP BLACK TRIDENT] NNS Beecroft to Neptune-1: Sea pirates have boarded a fuel vessel off Apapa channel. Breach with your SBS commando squad, clear 2 waves, and eliminate Captain Blackwater."
            },
            new ActionOp
            {
                Id = "cod_navy_riptide",
                Title = "OP LAGOON RIPTIDE · Dockyard Sabotage Defense",
                Who = "beecroft_officer",
                Dest = "naval-dockyard",
                Branch = "navy", Callsign = "TRIDENT-1", Overwatch = "Naval Dockyard HQ", BossName = "Saboteur Chief Drago",
                Waves = 2, EnemyCount = 4, EnemyHp = 115, Reward = 175000, Xp = 65, Heat = 0, Rep = "public",
                Briefing = "[OP LAGOON RIPTIDE] Armed frogmen saboteurs have landed at Victoria Island Naval Dockyard to plant limpet mines. Engage with SBS fireteam and clear both waves."
            },
            new ActionOp
            {
                Id = "cod_navy_hurricane",
                Title = "OP ATLANTIC HURRICANE · Creek Gunboat Strike",
                Who = "beecroft_officer",
                Dest = "navy-town",
                Branch = "navy", Callsign = "STORM-1", Overwatch = "Fleet Command Ojo", BossName = "Admiral Kraken",
                Waves = 3, EnemyCount = 3, EnemyHp = 120, Reward = 210000, Xp = 80, Heat = 0, Rep = "public",
                Briefing = "[OP ATLANTIC HURRICANE] High-threat oil-bunkering gunboats are staging an assault at Ojo Creek. Lead the SBS strike team through 3 waves and eliminate Admiral Kraken."
            },
        };

        public class ShootoutEnemy
        {
            public GameObject Root;
            public RigInstance Rig;
            public Transform Ring;
            public Vector3 Anchor;
            public float Hp, MaxHp;
            public float FireTimer, StrafePhase, HitFlash;
            public string GunId, Label;
            public bool IsBoss;
            public bool Alive => Hp > 0f && Root != null;
        }

        public class AlliedSoldier
        {
            public GameObject Root;
            public RigInstance Rig;
            public Transform Ring;
            public Vector3 Offset;
            public string Callsign;
            public float FireTimer;
            public bool Alive => Root != null;
        }

        class ShotTracer
        {
            public GameObject Go;
            public float Until;
        }

        [System.NonSerialized] public ActionOp ActiveActionOp;
        [System.NonSerialized] public int CurrentWave = 1;
        [System.NonSerialized] public readonly List<ShootoutEnemy> ActiveEnemies = new List<ShootoutEnemy>();
        [System.NonSerialized] public readonly List<AlliedSoldier> ActiveSquad = new List<AlliedSoldier>();
        [System.NonSerialized] public float LastHitTime = -10f, LastKillTime = -10f;
        [System.NonSerialized] public string LastKillLabel = "";
        readonly List<ShotTracer> tracers = new List<ShotTracer>();
        Transform shootoutHost;

        public bool IsSpecOpActive => ActiveActionOp != null && !string.IsNullOrEmpty(ActiveActionOp.Branch);

        public int RemainingEnemies
        {
            get
            {
                int n = 0;
                foreach (var e in ActiveEnemies) if (e != null && e.Alive) n++;
                return n;
            }
        }

        public static ActionOp FindActionOp(string id)
        {
            if (string.IsNullOrEmpty(id)) return null;
            foreach (var op in ActionOps) if (op.Id == id) return op;
            return null;
        }

        public static List<ActionOp> ActionOpsForContact(string contactId)
        {
            var list = new List<ActionOp>();
            if (string.IsNullOrEmpty(contactId)) return list;
            foreach (var op in ActionOps)
            {
                if (op.Who == contactId
                    || (contactId == "babak" && op.Id == "ladipo_syndicate")
                    || (contactId == "egbon" && op.Id == "iponri_convoy_defense")
                    || (contactId == "apapa_dispatch" && op.Id == "apapa_pirates")
                    || (contactId == "ikoyi_merchant" && op.Id == "banana_vip_extraction"))
                    list.Add(op);
            }
            return list;
        }

        public bool StartActionOp(string opId)
        {
            if (HasTask) { State.Toast("Finish your current mission first"); return false; }
            var op = FindActionOp(opId);
            if (op == null) return false;
            if (!HasGun())
            {
                State.Toast("Mission requires a firearm! Buy a Pistol, SMG, Shotgun, AK-47, Sniper, or LMG first.");
                return false;
            }
            if (!IsGunEquipped) EquipWeapon(BestGunId());
            bool specOp = !string.IsNullOrEmpty(op.Branch);
            if (specOp)
            {
                State.S.armor = 100f;
                if (State.S.ammo < 60) State.S.ammo = 60;
            }
            else if (State.S.ammo < 12) State.S.ammo = 24;

            ActiveActionOp = op;
            CurrentWave = 1;
            ActiveChainId = "";
            ActiveRun = null;

            var st = State.S;
            st.taskType = "shootout";
            st.taskDest = op.Dest;
            st.taskItem = "";
            st.taskMission = -1;

            ClearShootoutEnemies();
            SpawnShootoutWave(op, CurrentWave);
            if (specOp) SpawnAlliedSquad(op);

            UpdateShootoutObjectiveText();
            if (specOp)
            {
                State.Toast($"{op.Overwatch} → {op.Callsign}: Weapons free! Wave 1/{op.Waves} · +100% Kevlar Armor issued");
                State.Message(op.Who, op.Briefing);
            }
            else
            {
                State.Toast($"ACTION MISSION · {op.Title} — {EquippedWeaponName} ready ({st.ammo} ammo)");
            }
            RefreshNav();
            return true;
        }

        void UpdateShootoutObjectiveText()
        {
            if (ActiveActionOp == null) return;
            var op = ActiveActionOp;
            if (!string.IsNullOrEmpty(op.Branch))
            {
                State.S.taskObj = $"[{op.Callsign}] Wave {CurrentWave}/{op.Waves} · Hostiles: {RemainingEnemies} · Squad: {ActiveSquad.Count} active — Shoot (F / Click)";
            }
            else
            {
                State.S.taskObj = $"{op.Title}: Eliminate armed gunmen ({RemainingEnemies}/{op.EnemyCount} remaining) — shoot with F / Left Click";
            }
        }

        void EnsureShootoutHost()
        {
            if (shootoutHost == null)
            {
                shootoutHost = new GameObject("ShootoutHost").transform;
                shootoutHost.SetParent(transform, false);
            }
        }

        void SpawnAlliedSquad(ActionOp op)
        {
            ClearAlliedSquad();
            if (!Data.TryPlace(op.Dest, out var dest)) return;
            EnsureShootoutHost();
            var center = dest.World();
            bool navy = op.Branch == "navy";
            string[] names = navy ? new[] { "SBS PO Okafor", "SBS LS Briggs" } : new[] { "81 Div Sgt. Musa", "81 Div Cpl. Bello" };

            for (int i = 0; i < 2; i++)
            {
                Vector3 offset = new Vector3(i == 0 ? -3.2f : 3.2f, 0f, -8.5f);
                Vector3 pos = center + offset;
                pos.y = Data.DeckHeightAt(pos);

                var go = new GameObject(names[i]);
                go.transform.SetParent(shootoutHost, false);
                go.transform.position = pos;

                var look = Look.Default;
                look.Outfit = 8;
                look.Fabric = navy ? 3 : 1; // Navy indigo vs Army emerald camo
                look.Pants = navy ? new Color(0.08f, 0.14f, 0.26f) : new Color(0.18f, 0.26f, 0.15f);
                look.Cap = navy ? new Color(0.10f, 0.20f, 0.38f) : new Color(0.22f, 0.34f, 0.16f);

                RigInstance rig = null;
                if (CharacterRig.Available) rig = CharacterRig.Build(go.transform, look, 0, 1.78f);
                else Mannequin.Build(go.transform, navy ? new Color(0.10f, 0.22f, 0.42f) : new Color(0.22f, 0.36f, 0.18f), look.Pants, look.Skin, look.Cap, 0);

                CharacterRig.SetWeapon(rig, go.transform, navy ? "smg" : "rifle", 0);

                var ringGo = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                ringGo.name = "SquadRing";
                ringGo.transform.SetParent(go.transform, false);
                ringGo.transform.localPosition = new Vector3(0f, 0.06f, 0f);
                ringGo.transform.localScale = new Vector3(1.25f, 0.04f, 1.25f);
                Destroy(ringGo.GetComponent<Collider>());
                var rm = new Material(ShaderLib.Unlit) { color = navy ? new Color(0.22f, 0.72f, 1f, 0.85f) : new Color(0.24f, 0.95f, 0.48f, 0.85f) };
                ringGo.GetComponent<MeshRenderer>().sharedMaterial = rm;

                ActiveSquad.Add(new AlliedSoldier
                {
                    Root = go,
                    Rig = rig,
                    Ring = ringGo.transform,
                    Offset = offset,
                    Callsign = names[i],
                    FireTimer = 1.1f + i * 0.5f
                });
            }
        }

        void SpawnShootoutWave(ActionOp op, int wave)
        {
            foreach (var e in ActiveEnemies)
                if (e?.Root != null) Destroy(e.Root);
            ActiveEnemies.Clear();

            if (!Data.TryPlace(op.Dest, out var dest)) return;
            EnsureShootoutHost();
            var center = dest.World();
            bool finalWaveWithBoss = !string.IsNullOrEmpty(op.BossName) && wave == op.Waves;
            int count = op.EnemyCount + (finalWaveWithBoss ? 1 : 0);

            for (int i = 0; i < count; i++)
            {
                bool isBoss = finalWaveWithBoss && i == count - 1;
                float ang = (i / (float)count) * Mathf.PI * 2f + wave * 0.5f;
                float rad = isBoss ? 3.5f : (5.5f + (i % 2) * 2.5f);
                var pos = center + new Vector3(Mathf.Cos(ang) * rad, 0f, Mathf.Sin(ang) * rad);
                pos.y = Data.DeckHeightAt(pos);

                string label = isBoss ? $"[HVT] {op.BossName}" : $"Hostile_{wave}_{i + 1}";
                var go = new GameObject(label);
                go.transform.SetParent(shootoutHost, false);
                go.transform.position = pos;
                go.transform.rotation = Quaternion.Euler(0f, (ang * Mathf.Rad2Deg) + 180f, 0f);

                var look = Look.Default;
                look.Outfit = 8;
                look.Fabric = isBoss ? 4 : 8;
                look.Pants = new Color(0.14f, 0.16f, 0.18f);
                look.Cap = isBoss ? new Color(0.95f, 0.75f, 0.15f) : new Color(0.75f, 0.12f, 0.14f);

                RigInstance rig = null;
                float height = isBoss ? 1.90f : 1.78f;
                if (CharacterRig.Available) rig = CharacterRig.Build(go.transform, look, 0, height);
                else Mannequin.Build(go.transform, isBoss ? new Color(0.55f, 0.12f, 0.16f) : new Color(0.18f, 0.18f, 0.20f), look.Pants, look.Skin, look.Cap, 0);

                string gun = isBoss ? "lmg" : (i % 2 == 0 ? "rifle" : "pistol");
                CharacterRig.SetWeapon(rig, go.transform, gun, 0);

                var ringGo = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                ringGo.name = "TargetRing";
                ringGo.transform.SetParent(go.transform, false);
                ringGo.transform.localPosition = new Vector3(0f, 0.06f, 0f);
                ringGo.transform.localScale = isBoss ? new Vector3(1.85f, 0.06f, 1.85f) : new Vector3(1.35f, 0.04f, 1.35f);
                Destroy(ringGo.GetComponent<Collider>());
                var rm = new Material(ShaderLib.Unlit) { color = isBoss ? new Color(1f, 0.75f, 0.12f, 0.92f) : new Color(0.95f, 0.18f, 0.20f, 0.85f) };
                ringGo.GetComponent<MeshRenderer>().sharedMaterial = rm;

                float hp = isBoss ? op.EnemyHp * 1.8f : op.EnemyHp;
                string gruntLabel = op.Id == "cod_jtf_boko_haram" ? "Boko Haram Insurgent"
                                  : op.Id == "cod_army_bandit_sweep" ? "Armed Bandit"
                                  : "Hostile Gunman";
                ActiveEnemies.Add(new ShootoutEnemy
                {
                    Root = go,
                    Rig = rig,
                    Ring = ringGo.transform,
                    Anchor = pos,
                    Hp = hp,
                    MaxHp = hp,
                    FireTimer = 1.4f + i * 0.4f,
                    StrafePhase = i * 1.3f,
                    GunId = gun,
                    Label = isBoss ? op.BossName : gruntLabel,
                    IsBoss = isBoss
                });
            }
        }

        public ShootoutEnemy SpawnIndoorHostile(Vector3 pos, string label, string weaponId, float hp, bool isBoss, Transform parent)
        {
            var go = new GameObject(label);
            go.transform.SetParent(parent != null ? parent : transform, false);
            go.transform.position = pos;
            go.transform.rotation = Quaternion.Euler(0f, 0f, 0f);

            var look = Look.Default;
            look.Outfit = 8;
            look.Fabric = isBoss ? 4 : 8;
            look.Pants = new Color(0.14f, 0.16f, 0.18f);
            look.Cap = isBoss ? new Color(0.95f, 0.75f, 0.15f) : new Color(0.80f, 0.14f, 0.16f);

            RigInstance rig = null;
            if (CharacterRig.Available) rig = CharacterRig.Build(go.transform, look, 0, isBoss ? 1.88f : 1.78f);
            else Mannequin.Build(go.transform, new Color(0.45f, 0.12f, 0.16f), look.Pants, look.Skin, look.Cap, 0);

            if (!string.IsNullOrEmpty(weaponId))
                CharacterRig.SetWeapon(rig, go.transform, weaponId, 0);

            var ringGo = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            ringGo.name = "IndoorTargetRing";
            ringGo.transform.SetParent(go.transform, false);
            ringGo.transform.localPosition = new Vector3(0f, 0.05f, 0f);
            ringGo.transform.localScale = new Vector3(1.25f, 0.04f, 1.25f);
            Destroy(ringGo.GetComponent<Collider>());
            ringGo.GetComponent<MeshRenderer>().sharedMaterial = new Material(ShaderLib.Unlit) { color = new Color(0.95f, 0.20f, 0.22f, 0.85f) };

            var enemy = new ShootoutEnemy
            {
                Root = go,
                Rig = rig,
                Ring = ringGo.transform,
                Anchor = pos,
                Hp = hp,
                MaxHp = hp,
                FireTimer = 2.0f,
                StrafePhase = ActiveEnemies.Count * 1.1f,
                GunId = weaponId ?? "pistol",
                Label = label,
                IsBoss = isBoss
            };
            ActiveEnemies.Add(enemy);
            return enemy;
        }

        public void ClearAlliedSquad()
        {
            foreach (var s in ActiveSquad)
                if (s?.Root != null) Destroy(s.Root);
            ActiveSquad.Clear();
        }

        public void ClearShootoutEnemies()
        {
            foreach (var e in ActiveEnemies)
                if (e?.Root != null) Destroy(e.Root);
            ActiveEnemies.Clear();
            ClearAlliedSquad();
        }

        public ShootoutEnemy NearestEnemy(Vector3 pos, float maxDist)
        {
            ShootoutEnemy best = null;
            float bestD = maxDist;
            foreach (var e in ActiveEnemies)
            {
                if (e == null || !e.Alive) continue;
                float d = Vector3.Distance(pos, e.Root.transform.position);
                if (d < bestD) { bestD = d; best = e; }
            }
            return best;
        }

        ShootoutEnemy SelectShootTarget(Vector3 origin, Vector3 aimDir, float range)
        {
            ShootoutEnemy bestCone = null;
            float bestConeScore = float.MaxValue;
            ShootoutEnemy closest = null;
            float closestDist = range;

            foreach (var e in ActiveEnemies)
            {
                if (e == null || !e.Alive) continue;
                Vector3 to = e.Root.transform.position - origin;
                to.y = 0f;
                float dist = to.magnitude;
                if (dist > range) continue;
                if (dist < closestDist) { closestDist = dist; closest = e; }
                if (dist > 0.05f)
                {
                    float dot = Vector3.Dot(aimDir, to.normalized);
                    if (dot >= 0.35f)
                    {
                        float score = dist * (1.25f - dot);
                        if (score < bestConeScore) { bestConeScore = score; bestCone = e; }
                    }
                }
            }
            return bestCone ?? closest;
        }

        void SpawnTracer(Vector3 start, Vector3 end, Color color)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = "BulletTracer";
            Destroy(go.GetComponent<Collider>());
            Vector3 diff = end - start;
            float len = Mathf.Max(0.25f, diff.magnitude);
            go.transform.position = start + diff * 0.5f;
            if (diff.sqrMagnitude > 0.001f)
                go.transform.rotation = Quaternion.LookRotation(diff.normalized, Vector3.up);
            go.transform.localScale = new Vector3(0.045f, 0.045f, len);
            var mat = new Material(ShaderLib.Unlit) { color = color };
            go.GetComponent<MeshRenderer>().sharedMaterial = mat;
            tracers.Add(new ShotTracer { Go = go, Until = Time.time + 0.09f });
        }

        // Fires the currently equipped firearm (F / Left Click / RB / FIGHT button).
        public bool FireGun()
        {
            if (Player == null || Vehicle != null || !IsGunEquipped) return false;
            if (State.S.ammo <= 0)
            {
                State.Toast("Out of ammo! Pick up an Ammo Box (G) or resupply at any Barracks / Naval Base / Dayo.");
                return false;
            }
            State.S.ammo--;
            Player.SwingWeapon();
            UI.SoundSystem.I?.PlayGunshot(0.65f);

            float range = WeaponRange();
            int dmg = WeaponPower();
            Vector3 origin = Player.transform.position + Vector3.up * 1.35f;
            Vector3 aimDir = Camera != null ? Vector3.ProjectOnPlane(Camera.transform.forward, Vector3.up).normalized : Player.transform.forward;
            if (aimDir.sqrMagnitude < 0.01f) aimDir = Player.transform.forward;

            // 1. Active shootout / Spec-Ops enemies
            var enemy = SelectShootTarget(Player.transform.position, aimDir, range);
            if (enemy != null)
            {
                Vector3 enemyChest = enemy.Root.transform.position + Vector3.up * 1.25f;
                Vector3 faceDir = enemy.Root.transform.position - Player.transform.position;
                faceDir.y = 0f;
                if (faceDir.sqrMagnitude > 0.01f)
                    Player.transform.rotation = Quaternion.LookRotation(faceDir.normalized, Vector3.up);

                SpawnTracer(origin + Player.transform.forward * 0.45f, enemyChest, new Color(1f, 0.88f, 0.32f, 0.95f));
                enemy.Hp -= dmg;
                enemy.HitFlash = 0.18f;
                LastHitTime = Time.time;
                enemy.Root.transform.position += faceDir.normalized * 0.35f;

                if (enemy.Hp <= 0f)
                {
                    OnEnemyNeutralized(enemy);
                }
                else
                {
                    State.Toast($"Hit {enemy.Label} with {EquippedWeaponName} (-{dmg} HP · {enemy.Hp:0} HP left)");
                }
                return true;
            }

            // 2. Street agbero within firearm range
            var agbero = Street != null ? Street.NearestAgbero(Player.transform.position, Mathf.Min(range, 18f)) : null;
            if (agbero != null)
            {
                SpawnTracer(origin + aimDir * 0.45f, agbero.pos + Vector3.up * 1.2f, new Color(1f, 0.88f, 0.32f, 0.95f));
                agbero.cool = 180f;
                LastHitTime = Time.time;
                State.Earn(1500);
                State.AddRep("street", 4);
                if (Law != null && Law.PoliceWithin(Player.transform.position, 65f))
                    State.AddHeat(2, "Gunfire in public");
                State.Toast($"Fired {EquippedWeaponName} — agberos scattered! +₦1,500");
                return true;
            }

            // 3. Warning shot / tracer into the distance
            SpawnTracer(origin + aimDir * 0.45f, origin + aimDir * Mathf.Min(range, 26f), new Color(1f, 0.88f, 0.32f, 0.95f));
            if (ActiveActionOp == null && Law != null && Law.PoliceWithin(Player.transform.position, 55f))
                State.AddHeat(1, "Discharging a firearm near police");
            if (Time.time - lastSwingToast > 1.2f)
            {
                lastSwingToast = Time.time;
                State.Toast($"Fired {EquippedWeaponName} ({State.S.ammo} ammo remaining)");
            }
            return true;
        }

        void OnEnemyNeutralized(ShootoutEnemy enemy)
        {
            Vector3 dropPos = enemy.Root != null ? enemy.Root.transform.position : Focus.position;
            bool wasBoss = enemy.IsBoss;
            string label = enemy.Label;
            if (enemy.Root != null) Destroy(enemy.Root);
            enemy.Root = null;
            enemy.Hp = 0f;

            LastKillTime = Time.time;
            LastKillLabel = wasBoss ? $"HVT ELIMINATED · {label}" : $"{label} Neutralized";
            State.GainSkill("strength", wasBoss ? 1.5f : 0.6f);
            State.AddXp(wasBoss ? 20 : 8);

            if (Street != null && !InInterior)
            {
                Street.DropItem(dropPos + new Vector3(0.4f, 0f, 0.2f), "ammo_box", "Ammo Box (24 rounds)", 0);
                Street.DropItem(dropPos + new Vector3(-0.4f, 0f, -0.2f), "cash", wasBoss ? "HVT Bounty Cash" : "Raider Cash", wasBoss ? 10000 : 2500);
            }

            if (ActiveIndoorMission != null)
            {
                CheckIndoorMissionProgress();
            }

            if (ActiveActionOp != null)
            {
                int rem = RemainingEnemies;
                UpdateShootoutObjectiveText();
                if (rem == 0)
                {
                    AdvanceWaveOrComplete();
                }
                else
                {
                    State.Toast($"{LastKillLabel}! ({rem} hostiles remaining in Wave {CurrentWave}/{ActiveActionOp.Waves})");
                }
            }
        }

        void AdvanceWaveOrComplete()
        {
            var op = ActiveActionOp;
            if (op == null) return;
            if (CurrentWave < op.Waves)
            {
                CurrentWave++;
                SpawnShootoutWave(op, CurrentWave);
                UpdateShootoutObjectiveText();
                bool bossWave = !string.IsNullOrEmpty(op.BossName) && CurrentWave == op.Waves;
                State.Toast(bossWave
                    ? $"[OVERWATCH] Wave {CurrentWave}/{op.Waves} incoming — HVT '{op.BossName}' deployed! Take him down!"
                    : $"[OVERWATCH] Wave {CurrentWave - 1} cleared! Wave {CurrentWave}/{op.Waves} incoming — hold your sector!");
                return;
            }
            CompleteActionOp();
        }

        void CompleteActionOp()
        {
            var op = ActiveActionOp;
            ActiveActionOp = null;
            ClearShootoutEnemies();
            var st = State.S;
            st.taskType = ""; st.taskDest = ""; st.taskItem = ""; st.taskObj = "";
            if (op != null)
            {
                int reward = Missions.Reward(op.Id, op.Reward);
                State.Earn(reward);
                State.AddRep(op.Rep, !string.IsNullOrEmpty(op.Branch) ? 14 : 8);
                State.AddRep("street", 6);
                State.AddXp(op.Xp);
                if (op.Heat > 0) State.AddHeat(op.Heat, op.Title);
                string prefix = op.Branch == "army" ? "81 DIV MISSION ACCOMPLISHED" : op.Branch == "navy" ? "NAVAL SBS MISSION ACCOMPLISHED" : "ACTION MISSION COMPLETE";
                State.Toast($"{prefix} · {op.Title} · +₦{reward:N0}");
                State.Message(op.Who, $"[{(!string.IsNullOrEmpty(op.Overwatch) ? op.Overwatch : "Debrief")}] Outstanding work on '{op.Title}'. ₦{reward:N0} combat commendation transferred.");
            }
            RefreshNav();
        }

        void ApplyBulletDamageToPlayer(float dmg)
        {
            if (State.S.armor > 0f)
            {
                float absorbed = Mathf.Min(State.S.armor, dmg);
                State.S.armor -= absorbed;
                dmg -= absorbed;
            }
            if (dmg > 0f)
                State.S.health = Mathf.Max(15f, State.S.health - dmg);
        }

        public void ForceShootoutUpdate(float dt) => UpdateShootout(dt);

        void UpdateShootout(float dt)
        {
            for (int i = tracers.Count - 1; i >= 0; i--)
            {
                if (Time.time >= tracers[i].Until)
                {
                    if (tracers[i].Go != null) Destroy(tracers[i].Go);
                    tracers.RemoveAt(i);
                }
            }

            if (ActiveActionOp == null && State.S.taskType == "shootout")
            {
                foreach (var op in ActionOps)
                    if (op.Dest == State.S.taskDest) { ActiveActionOp = op; CurrentWave = 1; SpawnShootoutWave(op, 1); if (!string.IsNullOrEmpty(op.Branch)) SpawnAlliedSquad(op); break; }
            }

            if (ActiveEnemies.Count == 0) return;

            Vector3 playerPos = Focus.position;

            // Update allied Military / Navy SBS fireteam AI
            bool navy = ActiveActionOp != null && ActiveActionOp.Branch == "navy";
            Color allyTracerCol = navy ? new Color(0.25f, 0.85f, 1f, 0.95f) : new Color(0.30f, 1f, 0.52f, 0.95f);
            foreach (var ally in ActiveSquad)
            {
                if (ally == null || !ally.Alive) continue;
                var target = NearestEnemy(ally.Root.transform.position, 52f);
                if (target != null && target.Alive)
                {
                    Vector3 toEnemy = target.Root.transform.position - ally.Root.transform.position;
                    toEnemy.y = 0f;
                    if (toEnemy.sqrMagnitude > 0.01f)
                        ally.Root.transform.rotation = Quaternion.LookRotation(toEnemy.normalized, Vector3.up);
                    ally.Rig?.SetState("idle", 1f);
                    ally.FireTimer -= dt;
                    if (ally.FireTimer <= 0f && Vector3.Distance(playerPos, ally.Root.transform.position) < 60f)
                    {
                        ally.FireTimer = Random.Range(1.4f, 2.2f);
                        Vector3 muzzle = ally.Root.transform.position + Vector3.up * 1.3f + toEnemy.normalized * 0.4f;
                        Vector3 hitPt = target.Root.transform.position + Vector3.up * 1.2f;
                        SpawnTracer(muzzle, hitPt, allyTracerCol);
                        UI.SoundSystem.I?.PlayGunshot(0.28f);
                        // Assistive fire from squad leaves the killing blow for the player if HP is low
                        if (target.Hp > 25f) target.Hp = Mathf.Max(20f, target.Hp - 12f);
                    }
                }
            }

            // Update hostile gunmen AI
            for (int i = ActiveEnemies.Count - 1; i >= 0; i--)
            {
                var e = ActiveEnemies[i];
                if (e == null || !e.Alive) continue;

                if (e.Ring != null) e.Ring.Rotate(Vector3.up, dt * 140f);

                Vector3 toPlayer = playerPos - e.Root.transform.position;
                toPlayer.y = 0f;
                float dist = toPlayer.magnitude;

                if (dist < 48f && dist > 0.1f)
                {
                    e.Root.transform.rotation = Quaternion.LookRotation(toPlayer.normalized, Vector3.up);
                    e.StrafePhase += dt * 2.1f;
                    Vector3 right = Vector3.Cross(Vector3.up, toPlayer.normalized);
                    Vector3 desired = e.Anchor + right * (Mathf.Sin(e.StrafePhase) * 2.2f);
                    desired.y = Data.DeckHeightAt(desired);
                    e.Root.transform.position = Vector3.MoveTowards(e.Root.transform.position, desired, 2.4f * dt);
                    e.Rig?.SetState("walk", 0.85f);

                    e.FireTimer -= dt;
                    if (e.FireTimer <= 0f)
                    {
                        e.FireTimer = e.IsBoss ? Random.Range(1.2f, 1.9f) : Random.Range(1.9f, 2.8f);
                        Vector3 muzzle = e.Root.transform.position + Vector3.up * 1.3f + toPlayer.normalized * 0.4f;
                        Vector3 targetPt = playerPos + Vector3.up * 1.1f + new Vector3(Random.Range(-0.6f, 0.6f), 0f, Random.Range(-0.6f, 0.6f));
                        SpawnTracer(muzzle, targetPt, new Color(1f, 0.25f, 0.22f, 0.9f));
                        UI.SoundSystem.I?.PlayGunshot(0.32f);
                        if (dist < 38f && Random.value < 0.55f)
                        {
                            ApplyBulletDamageToPlayer(e.IsBoss ? 6f : 4f);
                        }
                    }
                }
                else
                {
                    e.Rig?.SetState("idle", 1f);
                }
            }

            if (ActiveActionOp != null && RemainingEnemies == 0)
                AdvanceWaveOrComplete();
        }

        // Walking up to any of the 12 Military Barracks (kind="army") or Naval Bases (kind="navy") opens the Command & Spec-Ops menu.
        public void OpenBarracksMenu(LandmarkData p)
        {
            bool navy = p.kind == "navy";
            var m = new Menu
            {
                Title = p.name,
                Subtitle = navy ? "Western Naval Command · SBS Special Boat Service Ops" : "Nigerian Army 81 Division · Tactical Command & Armory",
                Line = navy
                    ? $"Welcome to {p.shortName}. Requisition naval firearms, Kevlar body armor, and deploy on Call of Duty–style SBS maritime & creek operations."
                    : $"Welcome to {p.shortName}. Requisition military firearms, Kevlar body armor, and deploy on Call of Duty–style 81 Division joint strike operations."
            };
            m.Options.Add(new MenuOption
            {
                Label = State.S.armor >= 100f ? "Kevlar Tactical Vest · 100% Armor Equipped" : $"Equip Kevlar Tactical Vest (+100 Armor) · ₦15,000 (now {State.S.armor:0}%)",
                Enabled = State.S.armor < 100f,
                Action = () => { BuyTacticalArmor(15000); OpenBarracksMenu(p); }
            });
            foreach (var gId in new[] { "pistol", "smg", "shotgun", "rifle", "sniper", "lmg" })
            {
                var spec = FindWeaponSpec(gId);
                if (!spec.HasValue) continue;
                var w = spec.Value; string id = w.Id;
                bool owned = State.Has(id); bool eq = State.S.equippedWeapon == id;
                m.Options.Add(new MenuOption
                {
                    Label = owned ? $"Armory: {w.Name} · {(eq ? $"equipped ({State.S.ammo} ammo)" : "equip")}" : $"Requisition {w.Name} · ₦{w.Price:N0} ({w.Desc})",
                    Enabled = !eq,
                    Action = () => { BuyFightWeapon(id); OpenBarracksMenu(p); }
                });
            }
            m.Options.Add(new MenuOption
            {
                Label = $"Buy Ammo Crate (30 rounds) · ₦6,000 (carrying {State.S.ammo} rounds)",
                Action = () => { BuyAmmo(30, 6000); OpenBarracksMenu(p); }
            });

            string branch = navy ? "navy" : "army";
            foreach (var op in ActionOps)
            {
                if (op.Branch != branch) continue;
                var curOp = op;
                m.Options.Add(new MenuOption
                {
                    Label = $"Spec-Op [{curOp.Waves} Waves + HVT]: {curOp.Title} · ₦{curOp.Reward:N0}{(HasGun() ? "" : " [Need Firearm]")}",
                    Enabled = !HasTask,
                    Action = () => StartActionOp(curOp.Id)
                });
            }
            m.Options.Add(new MenuOption { Label = "Dismiss", Action = null });
            OpenMenu(m);
        }

        // Adds Firearm Armory & Action / Spec-Ops Missions to relevant contact menus (Dayo, Baba K, Amaka, Barracks, Navy, Police, Hubs).
        public void AddActionOpsToMenu(Menu m, string contactId)
        {
            bool armoryContact = contactId == "dayo" || contactId == "abalti_quartermaster" || contactId == "beecroft_officer" || contactId == "babak";
            if (armoryContact)
            {
                m.Options.Add(new MenuOption
                {
                    Label = State.S.armor >= 100f ? "Kevlar Tactical Vest · 100% Armor Equipped" : $"Buy Kevlar Tactical Vest (+100 Armor) · ₦15,000 (now {State.S.armor:0}%)",
                    Enabled = State.S.armor < 100f,
                    Action = () => BuyTacticalArmor(15000)
                });
                foreach (var gId in new[] { "pistol", "smg", "shotgun", "rifle", "sniper", "lmg" })
                {
                    var spec = FindWeaponSpec(gId);
                    if (!spec.HasValue) continue;
                    var w = spec.Value; string id = w.Id;
                    bool owned = State.Has(id); bool eq = State.S.equippedWeapon == id;
                    m.Options.Add(new MenuOption
                    {
                        Label = owned ? $"Firearm: {w.Name} · {(eq ? $"equipped ({State.S.ammo} ammo)" : "equip")}" : $"Buy Firearm: {w.Name} · ₦{w.Price:N0} ({w.Desc})",
                        Enabled = !eq,
                        Action = () => BuyFightWeapon(id)
                    });
                }
                m.Options.Add(new MenuOption
                {
                    Label = $"Buy Ammo Box (30 rounds) · ₦6,000 (carrying {State.S.ammo} rounds)",
                    Action = () => BuyAmmo(30, 6000)
                });
            }

            var ops = ActionOpsForContact(contactId);
            foreach (var op in ops)
            {
                var curOp = op;
                bool hasGun = HasGun();
                string tag = curOp.Branch == "army" ? $"81 Div Spec-Op ({curOp.Waves} Waves)" : curOp.Branch == "navy" ? $"Navy SBS Spec-Op ({curOp.Waves} Waves)" : "Action Mission";
                m.Options.Add(new MenuOption
                {
                    Label = $"{tag} — {curOp.Title} · ₦{curOp.Reward:N0}{(hasGun ? "" : " [Need Firearm]")}",
                    Enabled = !HasTask,
                    Action = () => StartActionOp(curOp.Id)
                });
            }
        }
    }
}
