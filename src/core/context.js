// Shared runtime context. One mutable object so modules read live values without circular imports.
export const G = {
  state: null,          // persisted player state (core/state.js)
  scene: null, camera: null, renderer: null, clock: null, sun: null, hemi: null, water: null,
  player: null, parked: [], traffic: [], npcs: [], agberos: [],
  car: null, inCar: false, carSpeed: 0, curSpeed: 0,
  keys: {}, camYaw: 0, camPitch: 0.38, camDistance: 10.5, dragging: false,
  working: null, dialog: null, sleeping: false,
  app: 'home', currentRoute: null, routeLen: 0,
  markers: {},          // missionMarker, jobMarker, wpMarker, routeLine (systems/navigation.js)
  debug: location.hash.includes('debug'),
};
export const frozen = () => !!(G.dialogOpen || G.dialog || (G.vehicleT > 0));
const FAR = { x: 9999, y: 0, z: 9999 };
export const pos = () => (G.inCar ? G.car.position : G.player ? G.player.position : FAR);
