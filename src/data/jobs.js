// at = place id (data/locations.js); by = contact who messages you after the shift.
// skill = the attribute this job trains and that raises its pay; min = skill level needed to take it.
export const JOBS = [
  { id: 'rider', title: 'Delivery Rider', where: 'Yaba Market', at: 'yaba', pay: 8000, xp: 15, dur: 4, by: 'nkechi', skill: 'driving' },
  { id: 'shop', title: 'Shop Assistant', where: 'Ojuelegba', at: 'ojuelegba', pay: 6000, xp: 10, dur: 3, by: 'babak', skill: 'business' },
  { id: 'guard', title: 'Security Guard', where: 'Iponri', at: 'marina', pay: 10000, xp: 18, dur: 5, by: 'amaka', skill: 'fitness' },
  { id: 'mech', title: 'Mechanic Helper', where: 'Ladipo Garage', at: 'ladipo', pay: 9000, xp: 16, dur: 4, by: 'dayo', skill: 'driving' },
  { id: 'conductor', title: 'Danfo Conductor', where: 'Kilo Bus Stop', at: 'kilo', pay: 7000, xp: 14, dur: 4, by: 'driver', skill: 'charisma' },
  { id: 'steward', title: 'Stadium Steward', where: 'National Stadium', at: 'stadstop', pay: 9500, xp: 17, dur: 5, by: 'bayo', skill: 'fitness' },
  { id: 'porter', title: 'Market Porter', where: 'Shitta Market', at: 'shitta', pay: 5000, xp: 9, dur: 3, by: 'nkechi', skill: 'fitness' },
  { id: 'posagent', title: 'POS Agent', where: 'Mushin Bus Stop', at: 'mushinstop', pay: 12000, xp: 20, dur: 5, by: 'driver', skill: 'business', min: 10 },
  { id: 'bouncer', title: 'Bouncer', where: 'Lust Club', at: 'lust', pay: 15000, xp: 22, dur: 5, by: 'amaka', skill: 'fitness', min: 15, night: true },
  { id: 'courier', title: 'Island Courier', where: 'CMS, Lagos Island', at: 'cms', pay: 14000, xp: 22, dur: 4, by: 'amaka', skill: 'driving', min: 10 },
  { id: 'tanker', title: 'Tanker Driver', where: 'Mobil Filling Station', at: 'fuel', pay: 18000, xp: 25, dur: 6, by: 'dayo', skill: 'driving', min: 20 },
  // long-distance runs over the corridors (the trip is the job)
  { id: 'lekki', title: 'Lekki Dispatch Rider', where: 'Lekki Toll Gate', at: 'lekkitoll', pay: 30000, xp: 32, dur: 5, by: 'amaka', skill: 'driving', min: 15, far: true },
  { id: 'yabarun', title: 'Campus Courier', where: 'Yaba College of Technology', at: 'yabatech', pay: 22000, xp: 26, dur: 4, by: 'nkechi', skill: 'driving', min: 10, far: true },
  { id: 'ikorodu', title: 'Ikorodu Haulage', where: 'Ikorodu Garage', at: 'ikorodu-garage-town', pay: 35000, xp: 36, dur: 6, by: 'dayo', skill: 'driving', min: 25, far: true },
  // Education unlocks (Alpha 1.1 C2) — need the certificate from the cyber café
  { id: 'webdev', title: 'Web Freelancer', where: 'Cyber Café · Surulere', at: 'cafe', pay: 28000, xp: 28, dur: 4, by: 'cafeguy', skill: 'business', min: 12, needCourse: 'web' },
  { id: 'designer', title: 'Graphics Freelancer', where: 'Cyber Café · Surulere', at: 'cafe', pay: 24000, xp: 24, dur: 4, by: 'cafeguy', skill: 'business', min: 8, needCourse: 'graphic' },
  { id: 'coder', title: 'Junior Coder', where: 'Yaba · Tech errands', at: 'yaba', pay: 35000, xp: 32, dur: 5, by: 'cafeguy', skill: 'business', min: 15, needCourse: 'code' },
  { id: 'it-support', title: 'IT Support Technician', where: 'Alagomeji Tech Hub', at: 'alagomeji-tech', pay: 42000, xp: 38, dur: 6, by: 'cafeguy', skill: 'business', min: 10, needCourse: 'yabatech' },
  // Fishing, Maritime & Emergency Service shifts
  { id: 'lagoon_fisher', title: 'Lagoon Fishing Crew', where: 'Makoko Canoe Landing', at: 'makoko-canoe-landing', pay: 11000, xp: 18, dur: 4, by: 'baale_fisherman', skill: 'fitness' },
  { id: 'fish_smoker', title: 'Smoked Fish & Jetty Run', where: 'Bariga Fishing Jetty', at: 'bariga-jetty', pay: 10500, xp: 17, dur: 4, by: 'tolu_fisherman', skill: 'business' },
  { id: 'boat_charter', title: 'Lagoon Boat Skipper', where: 'Five Cowrie Creek Jetty', at: 'falomo-jetty', pay: 16000, xp: 24, dur: 5, by: 'musa_fisherman', skill: 'driving', min: 8 },
  { id: 'firefighter_shift', title: 'Fire & Rescue Auxiliary', where: 'Lagos State Fire Service', at: 'fire', pay: 14500, xp: 22, dur: 5, by: 'fire_chief', skill: 'fitness', min: 8 },
  { id: 'cbn_escort', title: 'CBN Bullion Vault Escort', where: 'Central Bank · Tinubu Square', at: 'cbn-lagos', pay: 26000, xp: 30, dur: 5, by: 'cbn_director', skill: 'driving', min: 10 },
  { id: 'efcc_analyst', title: 'EFCC Financial Compliance Aide', where: 'EFCC Command · Ikoyi', at: 'efcc-ikoyi', pay: 28000, xp: 32, dur: 5, by: 'efcc_commander', skill: 'business', min: 10 },
  // Megacorridor jobs (Alimosho/Oshodi, Amuwo/Trade Fair, Kosofe/Mile 12, Ibeju-Lekki/Epe, Badagry/Seme Border)
  { id: 'oshodi_dispatch', title: 'Oshodi Interchange Dispatch', where: 'Oshodi 3-Terminal Interchange', at: 'oshodi-interchange', pay: 24000, xp: 28, dur: 5, by: 'alimosho_hub', skill: 'driving', min: 10 },
  { id: 'aspamda_clearing', title: 'Trade Fair & Alaba Clearing Agent', where: 'Trade Fair Complex · ASPAMDA', at: 'trade-fair-aspamda', pay: 32000, xp: 34, dur: 5, by: 'amuwo_trade_hub', skill: 'business', min: 12, far: true },
  { id: 'mile12_produce', title: 'Mile 12 Produce Logistics', where: 'Mile 12 International Market', at: 'mile12-market', pay: 25000, xp: 28, dur: 5, by: 'kosofe_mile12_hub', skill: 'business', min: 8, far: true },
  { id: 'refinery_haulage', title: 'Refinery & Deep Port Haulage', where: 'Dangote Refinery · Ibeju-Lekki', at: 'dangote-refinery', pay: 45000, xp: 42, dur: 6, by: 'ibeju_epe_hub', skill: 'driving', min: 20, far: true },
  { id: 'seme_customs', title: 'Seme ECOWAS Border Escort', where: 'Seme–Krake Border Post', at: 'seme-krake-border', pay: 38000, xp: 36, dur: 6, by: 'badagry_border_hub', skill: 'driving', min: 15, far: true },
  // Multi-State Geopolitical Zone Jobs (Ogun/Oyo, FCT Abuja, Rivers/Niger Delta, Anambra/East, Kano/North)
  { id: 'ota_ibadan_haulage', title: 'Ota Factory & Cocoa House Logistics', where: 'Cocoa House · Ibadan', at: 'cocoa-house', pay: 46000, xp: 42, dur: 6, by: 'southwest_ogun_oyo_hub', skill: 'driving', min: 15, far: true },
  { id: 'federal_tender_convoy', title: 'Three Arms Federal Tender Convoy', where: 'National Assembly · Abuja', at: 'nass-complex', pay: 65000, xp: 52, dur: 6, by: 'abuja_federal_hub', skill: 'business', min: 20, far: true },
  { id: 'bonny_lng_offshore', title: 'Bonny LNG & Trans-Amadi Logistics', where: 'Nigeria LNG · Bonny Island', at: 'bonny-lng', pay: 58000, xp: 48, dur: 6, by: 'niger_delta_oil_hub', skill: 'driving', min: 18, far: true },
  { id: 'onitsha_nnewi_trade', title: 'Onitsha Market & Nnewi Auto Supply', where: 'Onitsha Main Market', at: 'onitsha-main-mkt', pay: 54000, xp: 46, dur: 6, by: 'eastern_commerce_hub', skill: 'business', min: 16, far: true },
  { id: 'dawanau_trans_saharan', title: 'Dawanau Grains & Frontier Convoy', where: 'Kurmi & Dawanau Market · Kano', at: 'kurmi-market', pay: 60000, xp: 50, dur: 6, by: 'northern_trade_hub', skill: 'driving', min: 18, far: true },
];
export const jobOf = id => JOBS.find(j => j.id === id) || null;
export const jobPay = (j, skills) => Math.round(j.pay * (1 + (skills?.[j.skill] || 0) * 0.01));   // +1% per skill point
