// District registry. Add a module per area and list it here; data/locations.js re-exports the active one.
// Planned: yaba, ikeja (CBD), lekki (luxury), apapa (port), and districts in other Nigerian states.
import * as surulere from './surulere.js';
import * as ikoyi from './ikoyi.js';
import * as lekki from './lekki.js';
import * as ikorodu from './ikorodu.js';
import * as apapa from './apapa.js';
import * as ikeja from './ikeja.js';
import * as oyingbo from './oyingbo.js';
import * as yaba from './yaba.js';
import * as ajegunle from './ajegunle.js';
import * as makoko from './makoko.js';
import * as agege from './agege.js';
import * as ojoBadagry from './ojo-badagry.js';
import * as lagos from './lagos.js';

export const DISTRICTS = { lagos, surulere, ikoyi, lekki, ikorodu, apapa, ikeja, oyingbo, yaba, ajegunle, makoko, agege, 'ojo-badagry': ojoBadagry };
export const ACTIVE_DISTRICT = (typeof location !== 'undefined' && new URLSearchParams(location.search).get('district')) || 'lagos';
export const DISTRICT = DISTRICTS[ACTIVE_DISTRICT] || surulere;
export const districtList = () => Object.values(DISTRICTS).map(d => d.META);
