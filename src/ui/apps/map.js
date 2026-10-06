import { G, pos } from '../../core/context.js';
import { emit } from '../../core/events.js';
import { esc, dist } from '../../core/utils.js';
import { PLACES, PROPERTIES, placeOf } from '../../data/locations.js';
import { contactOf } from '../../data/characters.js';
import { Card, Btn, Sect, Row, Spacer } from '../components.js';
import { toast } from '../feedback.js';
import { gpsTarget, setWaypoint, applyWaypoint } from '../../systems/navigation.js';
import { phoneMapDraw } from '../minimap.js';

export default {
  id: 'map', title: 'Map', tint: '#1f6b4a',
  headerExtra: '<span class="pill green">Tap to set GPS</span>',
  icon: '<svg viewBox="0 0 24 24"><path d="M12 21s-6-5.2-6-10a6 6 0 0 1 12 0c0 4.8-6 10-6 10z"/><circle cx="12" cy="11" r="2"/></svg>',
  render(body) {
    if (!body.querySelector('#pmap')) {
      body.innerHTML = `<canvas id="pmap" class="pmap" width="504" height="504"></canvas>
      <div class="legend"><span><i style="background:#fff"></i>You</span><span><i style="background:#ffc52f"></i>Mission</span><span><i style="background:#5db8ff"></i>Job</span><span><i style="background:#c77dff"></i>Waypoint</span><span><i style="background:#3dff79"></i>Home</span><span><i style="background:#7fa0ff"></i>Police</span></div><div id="mapList"></div>`;
      import('../minimap.js').then(m => m.bindPhoneMap());
    }
    phoneMapDraw();
    const t = gpsTarget(), p = pos();
    body.querySelector('#mapList').innerHTML =
      Card(`<h6>GPS</h6><p>${t ? esc(t.label) + ' · ' + Math.round(G.routeLen) + ' m' : 'No active route'}</p>${G.state.waypoint ? Row(Btn('Clear waypoint', 'clearWp', { cls: 'ghost sm' })) : ''}`) +
      Sect('Places') +
      PLACES.map(l => Card(`<div class="sp"><h6>${esc(l.name)}</h6><p>${Math.round(dist(p, l))} m away</p></div>${Btn('GPS', 'gpsPlace', { id: l.id, cls: 'sm' })}`, 'row')).join('');
  },
  actions: {
    gpsPlace: id => { const l = placeOf(id); setWaypoint({ x: l.x, z: l.z, label: l.name }); toast(`GPS set to ${l.name}`); },
    gpsContact: id => { const c = contactOf(id), p = placeOf(c.at); setWaypoint({ x: p.x, z: p.z, label: c.name }); toast(`GPS set to ${c.name}`); },
    gpsProp: id => { const p = PROPERTIES.find(p => p.id === id); setWaypoint({ x: p.door.x, z: p.door.z, label: p.name }); toast(`GPS set to ${p.name}`); },
    clearWp: () => { G.state.waypoint = null; applyWaypoint(); emit('hud'); },
  },
};
