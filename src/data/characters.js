export const LOOK = {
  skin: ['#b07a55', '#8a5a3c', '#714835', '#5a3a28', '#3f2619'],
  hair: ['Short', 'Fade', 'Afro', 'Braids', 'Bald'],
  shirt: ['#3d8b5a', '#ffc52f', '#e8e8e8', '#2f5fd0', '#c9342f', '#1b1b1b'],
  pants: ['#26312d', '#1f2a44', '#4a3b2e', '#2b2b2b'],
};

export const CONTACTS = [
  { id: 'babak', name: 'Baba K', role: 'Fixer · Ojuelegba', at: 'ojuelegba', c: '#ffc52f', line: 'Oya, where you dey? Work no dey wait.' },
  { id: 'amaka', name: 'Amaka', role: 'Logistics · Marina', at: 'marina', c: '#3dff79', line: 'Marina is busy today. Come through.' },
  { id: 'dayo', name: 'Dayo', role: 'Mechanic · Ladipo', at: 'ladipo', c: '#5db8ff', line: 'Bring the motor, I go check am.' },
  { id: 'nkechi', name: 'Mama Nkechi', role: 'Trader · Yaba Market', at: 'yaba', c: '#ff9a5d', line: 'My customer! Come buy something.' },
  { id: 'driver', name: 'Oga Driver', role: 'Danfo driver · Kilo', at: 'kilo', c: '#f5c518', line: 'Kilo! Kilo! Enter with your change!' },
  { id: 'bayo', name: 'Coach Bayo', role: 'Steward lead · Stadium', at: 'stadium', c: '#d8dde0', line: 'Match day soon. I need hands.' },
  { id: 'police', name: 'NPF Area C', role: 'Police station', at: 'police', c: '#9fb3ff', line: 'Keep your record clean and we no go have problem.' },
  { id: 'agbero', name: 'Agbero', role: 'Bus stop boys', c: '#c8d400', line: 'Owo da?' },
  { id: 'pos', name: 'POS Agent', role: 'Roadside kiosk', c: '#5db8ff', line: 'Transfer or withdrawal? Network dey.' },
  { id: 'olosho', name: 'Olosho', role: 'Night hustler · clubs', c: '#ff5d9e', line: 'Fine boy, you dey find hook up?' },
  { id: 'imam', name: 'Alfa / Pastor', role: 'Worship', c: '#d9d2c2', line: 'Come and pray. Lagos go better.' },
  { id: 'bank', name: 'RiseBank', role: 'Alerts', c: '#b7b7ff', line: 'Thank you for banking with RiseBank.' },
];
export const contactOf = id => CONTACTS.find(c => c.id === id);
