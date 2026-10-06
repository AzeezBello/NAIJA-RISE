# NAIJA RISE — Lagos Alpha 0.4

A browser-playable vertical slice for **NAIJA RISE**, an original Nigerian open-world life/action game concept.

## What's new in Alpha 0.4 — game HUD
The information-panel interface is replaced by a real game HUD:
- **Top-left** — character portrait, name, level and XP bar, plus a compact mission objective card (title, current objective, distance, progress pips)
- **Top-right** — ₦ Cash, Bank balance and Heat pips
- **Bottom-left** — circular minimap that rotates with the camera, with a GPS route that follows the road grid, off-screen target chevron and distance readout
- **Bottom-center** — context interaction prompt (meet contact, enter/exit vehicle, start shift, refuel) and a dismissible control strip (H)
- **Bottom-right** — Health and Stamina bars on foot; circular speedometer, gear and fuel gauge when driving
- **In-world GPS** — dashed route line drawn on the road toward the active target

## In-game smartphone (J)
The phone is the central navigation system. Home screen with eight apps:
- **Map** — district map with landmarks; tap anywhere or pick a place to set a GPS waypoint
- **Jobs** — Delivery Rider, Shop Assistant, Security Guard, Mechanic Helper; start a job, follow GPS, press E to work the shift for cash and XP
- **Messages** — inbox fed by mission, job, bank and business events, with unread badges
- **Contacts** — Baba K, Amaka, Dayo, Mama Nkechi, RiseBank; call for a line or set GPS to them
- **Bank** — deposit/withdraw between cash and bank, transaction history; business income is paid to the bank
- **Businesses** — buy Roadside Kiosk, Phone & Data Shop, Mama Put Buka or Car Wash for passive income every minute
- **Inventory** — consumables (Pure Water restores stamina, Suya restores health) and mission items (the sealed package)
- **Settings** — player name, camera sensitivity, minimap rotation, shadows, control hints, reset progress

## Systems
- Cash, bank, XP, level and heat (heat decays over time)
- Health (crash damage when driving into buildings at speed), stamina (sprint drain/regen)
- Vehicles with acceleration, steering smoothing, speed readout and fuel; refuel at the Garage with E for ₦3,000
- Mission loop: contact → delivery → payout → level-up
- Progress auto-saves to the browser (localStorage); reset from Settings

## Run
Requires an internet connection because Three.js and fonts are loaded from CDNs.

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## Controls
- WASD — move / drive
- Shift — sprint / faster driving
- E — interact (missions, shifts, refuel)
- F — enter / exit nearby vehicle
- J — toggle phone (Esc closes)
- H — toggle control hints
- Right-mouse drag — camera · wheel — zoom · R — reset camera

## Next target: Alpha 0.5
1. Character customization
2. Traffic AI and better vehicle physics
3. Mission dialogue and branching objectives
4. Housing and property
5. Day/night cycle
6. Persistent save/API layer (server-side)
7. Larger Lagos districts
8. Multiplayer synchronization
# NAIJA-RISE
