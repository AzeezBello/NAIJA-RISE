export const LOOK = {
  skin: ['#b07a55', '#8a5a3c', '#714835', '#5a3a28', '#3f2619'],
  hair: ['Short', 'Fade', 'Afro', 'Braids', 'Bald'],
  shirt: ['#3d8b5a', '#ffc52f', '#e8e8e8', '#2f5fd0', '#c9342f', '#1b1b1b'],
  pants: ['#26312d', '#1f2a44', '#4a3b2e', '#2b2b2b'],
};

export const CONTACTS = [
  { id: 'babak', name: 'Baba K', role: 'Fixer · Ojuelegba', at: 'ojuelegba', c: '#ffc52f', line: 'Oya, where you dey? Work no dey wait.' },
  { id: 'amaka', name: 'Amaka', role: 'Logistics · Iponri', at: 'marina', c: '#3dff79', line: 'Iponri yard is busy today. Come through.' },
  { id: 'dayo', name: 'Dayo', role: 'Mechanic · Ladipo', at: 'ladipo', c: '#5db8ff', line: 'Bring the motor, I go check am.' },
  { id: 'nkechi', name: 'Mama Nkechi', role: 'Trader · Yaba Market', at: 'yaba', c: '#ff9a5d', line: 'My customer! Come buy something.' },
  { id: 'driver', name: 'Oga Driver', role: 'Danfo driver · Kilo', at: 'kilo', c: '#f5c518', line: 'Kilo! Kilo! Enter with your change!' },
  { id: 'speedy', name: 'Speedy', role: 'Street racer · Funsho Williams', at: 'stadstop', c: '#ff5d9e', line: 'Two laps. Bring money or bring excuses.' },
  { id: 'bayo', name: 'Coach Bayo', role: 'Steward lead · Stadium', at: 'stadium', c: '#d8dde0', line: 'Match day soon. I need hands.' },
  { id: 'police', name: 'NPF Area C', role: 'Police station', at: 'police', c: '#9fb3ff', line: 'Keep your record clean and we no go have problem.' },
  { id: 'agbero', name: 'Agbero', role: 'Bus stop boys', c: '#c8d400', line: 'Owo da?' },
  { id: 'pos', name: 'POS Agent', role: 'Roadside kiosk', c: '#5db8ff', line: 'Transfer or withdrawal? Network dey.' },
  { id: 'olosho', name: 'Olosho', role: 'Night hustler · clubs', c: '#ff5d9e', line: 'Fine boy, you dey find hook up?' },
  { id: 'imam', name: 'Alfa / Pastor', role: 'Worship', c: '#d9d2c2', line: 'Come and pray. Lagos go better.' },
  { id: 'coach', name: 'Coach Emeka', role: 'Surulere Fitness Gym', at: 'gym', c: '#2a9d8f', line: 'No pain, no gain. Oya, warm up.' },
  { id: 'cashier', name: 'Cashier', role: 'Chicken Republic', c: '#c62828', line: 'Refuel, pepper, or both?' },
  { id: 'mallguy', name: 'Mall Attendant', role: 'Adeniran Ogunsanya Mall', at: 'mall', c: '#8a8f93', line: 'Welcome to the mall. Cinema dey upstairs.' },
  { id: 'cafeguy', name: 'Cyber Café Oga', role: 'Surulere Cyber Café', at: 'cafe', c: '#5db8ff', line: 'Network dey. Wetin you wan learn today?' },
  { id: 'captain', name: 'Captain Tunde', role: 'Street football · Teslim Balogun', at: 'pitch', c: '#2f7d49', line: 'You sabi ball? Prove am.' },
  { id: 'vendor', name: 'Roadside Vendor', role: 'Itire Road', c: '#f5a623', line: 'Pure water! Cold one!' },
  { id: 'agent', name: 'Agent Kunle', role: 'Property agent', c: '#f0a040', line: 'Agent fee na 10%. No agent, no house.' },
  { id: 'landlord', name: 'Landlord', role: 'Baba Landlord · Surulere', c: '#c9b48a', line: 'Rent na yearly, but for you I go take monthly.' },
  { id: 'bank', name: 'RiseBank', role: 'Alerts', c: '#b7b7ff', line: 'Thank you for banking with RiseBank.' },
];
export const contactOf = id => CONTACTS.find(c => c.id === id);
