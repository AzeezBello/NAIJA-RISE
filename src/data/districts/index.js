// District registry. Add a module per area and list it here; data/locations.js re-exports the active one.
// Planned: yaba, ikeja (CBD), lekki (luxury), apapa (port), and districts in other Nigerian states.
import * as surulere from './surulere.js';

export const DISTRICTS = { surulere };
export const ACTIVE_DISTRICT = (typeof location !== 'undefined' && new URLSearchParams(location.search).get('district')) || 'surulere';
export const DISTRICT = DISTRICTS[ACTIVE_DISTRICT] || surulere;
export const districtList = () => Object.values(DISTRICTS).map(d => d.META);
