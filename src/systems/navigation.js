import * as THREE from 'three';
import { G, pos } from '../core/context.js';
import { on, emit } from '../core/events.js';
import { MISSIONS } from '../data/missions.js';
import { jobOf } from '../data/jobs.js';
import { ROADS, PROPERTIES, placeOf, roadExtent, JUNCTIONS } from '../data/locations.js';
import { heightAt } from '../world/terrain.js';

/* ---------- mission / job / home lookups ---------- */
export const curMission = () => MISSIONS[Math.min(G.state.mission, MISSIONS.length - 1)];
const taskDest = () => { const t = G.task; if (!t) return null; if (t.type === 'steal' && !G.inCar) return t.destPos; return t.dest ? placeOf(t.dest) : null; };
// The mission's contact stands in the world (entities/contacts.js); fall back to the place when there is no one to meet.
const contactPos = m => { const who = m.who || (typeof m.lines === 'function' ? m.lines()[0]?.s : null); return who && G.contactPos?.[who] || null; };
export const missionPos = () => taskDest() || contactPos(curMission()) || placeOf(curMission().at);
export const missionAvailable = () => { const m = curMission(); return !G.state.done && (!m.requires || m.requires()) && (!m.arc || m.arc === G.state.arc); };
export const missionActive = () => missionAvailable() && !G.state.storyPaused;
export const jobPos = j => placeOf(j.at);
export const homeProp = () => PROPERTIES.find(p => p.id === G.state.home) || null;

/* ---------- 3D markers and route line ---------- */
function flatMarker(color) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.18, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }));
  m.visible = false; G.scene.add(m); return m;
}
export function createMarkers() {
  const routeGeo = new THREE.BufferGeometry();
  routeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(32 * 3), 3));
  const routeLine = new THREE.Line(routeGeo, new THREE.LineDashedMaterial({ color: 0x3dff79, dashSize: 2, gapSize: 1.3, transparent: true, opacity: 0.85 }));
  routeLine.frustumCulled = false; routeLine.visible = false; G.scene.add(routeLine);
  G.markers = { mission: flatMarker(0x3dff79), job: flatMarker(0x5db8ff), wp: flatMarker(0xc77dff), routeLine, routeGeo };
  on('mission:refresh', applyMission);
  applyMission(); applyJob(); applyWaypoint();
}
export function applyMission() {
  const m = G.markers.mission;
  if (!missionActive() || (G.task && (G.task.type === 'escape' || G.task.type === 'race'))) { m.visible = false; return; }
  const p = missionPos(); if (!p) { m.visible = false; return; } m.visible = true; m.position.set(p.x, 0.22, p.z);
}
export function applyJob() {
  const j = jobOf(G.state.job), m = G.markers.job;
  if (j) { const p = jobPos(j); m.visible = true; m.position.set(p.x, 0.22, p.z); } else m.visible = false;
}
export function applyWaypoint() {
  const w = G.state.waypoint, m = G.markers.wp;
  if (w) { m.visible = true; m.position.set(w.x, 0.22, w.z); } else m.visible = false;
}
export function setWaypoint(w) { G.state.waypoint = w; applyWaypoint(); emit('hud'); }
export function updateMarkers(dt) {
  const bob = 0.22 + Math.sin(performance.now() / 280) * 0.12;
  for (const k of ['mission', 'job', 'wp']) { const m = G.markers[k]; m.rotation.y += dt * 2; m.position.y = bob; }
}

/* ---------- GPS: waypoint > job > mission, routed along the road grid ---------- */
export function gpsTarget() {
  const s = G.state;
  if (G.race && !G.race.finished) { const c = G.race.cps[G.race.i]; return { x: c.x, z: c.z, label: `Race · checkpoint ${G.race.i + 1}/${G.race.cps.length}`, kind: 'mission' }; }
  if (G.task && G.task.type !== 'escape') { const p = taskDest(); if (p) return { x: p.x, z: p.z, label: G.task.obj.split(' — ')[0], kind: 'mission' }; }
  if (s.waypoint) return { x: s.waypoint.x, z: s.waypoint.z, label: s.waypoint.label || 'Waypoint', kind: 'wp' };
  const j = jobOf(s.job);
  if (j) { const p = jobPos(j); return { x: p.x, z: p.z, label: `${j.title} · ${j.where}`, kind: 'job' }; }
  if (missionActive()) { const p = missionPos(); return { x: p.x, z: p.z, label: curMission().title, kind: 'mission' }; }
  return null;
}
function snap(p) {
  let best = null;
  for (const z of ROADS.h) { const [a, b] = roadExtent('h', z); if (p.x < a - 20 || p.x > b + 20) continue; const d = Math.abs(p.z - z); if (!best || d < best.d) best = { d, type: 'h', k: z, x: Math.min(b, Math.max(a, p.x)), z }; }
  for (const x of ROADS.v) { const [a, b] = roadExtent('v', x); if (p.z < a - 20 || p.z > b + 20) continue; const d = Math.abs(p.x - x); if (!best || d < best.d) best = { d, type: 'v', k: x, x, z: Math.min(b, Math.max(a, p.z)) }; }
  return best;
}
// Shortest path over the road graph: junctions are nodes, stretches of road between neighbouring junctions are edges,
// and the two snapped endpoints join the graph along their own road. Bridges and corridors route like any other road.
let graph = null;
function buildGraph() {
  const nodes = JUNCTIONS.map(j => ({ x: j.x, z: j.z, roads: [['h', j.z], ['v', j.x]] }));
  const onRoad = (axis, k) => nodes.filter(n => n.roads.some(([ax, kk]) => ax === axis && kk === k)).sort((p, q) => (axis === 'h' ? p.x - q.x : p.z - q.z));
  const edges = new Map(nodes.map(n => [n, []]));
  for (const axis of ['h', 'v']) for (const k of ROADS[axis]) { const line = onRoad(axis, k); for (let i = 1; i < line.length; i++) { const u = line[i - 1], v = line[i], d = Math.hypot(u.x - v.x, u.z - v.z); edges.get(u).push([v, d]); edges.get(v).push([u, d]); } }
  graph = { nodes, edges, onRoad };
}
function dijkstra(starts, goals) {
  const dist = new Map(), prev = new Map(), open = [];
  for (const [n, d] of starts) { dist.set(n, d); open.push(n); }
  const goalD = new Map(goals);
  let best = null, bestD = Infinity;
  while (open.length) {
    open.sort((p, q) => dist.get(p) - dist.get(q)); const u = open.shift(), du = dist.get(u);
    if (goalD.has(u) && du + goalD.get(u) < bestD) { bestD = du + goalD.get(u); best = u; }
    if (du > bestD) break;
    for (const [v, w] of graph.edges.get(u)) { const nd = du + w; if (nd < (dist.get(v) ?? Infinity)) { dist.set(v, nd); prev.set(v, u); if (!open.includes(v)) open.push(v); } }
  }
  if (!best) return null;
  const path = []; for (let n = best; n; n = prev.get(n)) path.unshift(n); return path;
}
export function route(a, b) {
  if (!graph) buildGraph();
  const A = snap(a), B = snap(b), pts = [[a.x, a.z]];
  if (!A || !B) { pts.push([b.x, b.z]); return pts; }
  if (A.d > 3) pts.push([A.x, A.z]);
  if (A.type === B.type && A.k === B.k) { /* same road: straight along it */ }
  else {
    const along = n => (A.type === 'h' ? n.x : n.z), alongB = n => (B.type === 'h' ? n.x : n.z);
    const starts = graph.onRoad(A.type, A.k).map(n => [n, Math.abs(along(n) - (A.type === 'h' ? A.x : A.z))]);
    const goals = graph.onRoad(B.type, B.k).map(n => [n, Math.abs(alongB(n) - (B.type === 'h' ? B.x : B.z))]);
    const path = dijkstra(starts, goals);
    if (path) for (const n of path) pts.push([n.x, n.z]);
  }
  if (B.d > 3) pts.push([B.x, B.z]);
  pts.push([b.x, b.z]);
  return pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 0.5);
}
export function updateRoute() {
  const t = gpsTarget(), { routeLine, routeGeo } = G.markers;
  if (!t) { routeLine.visible = false; G.currentRoute = null; G.routeLen = 0; return; }
  const pts = route(pos(), t);
  let len = 0;
  const a = routeGeo.attributes.position;
  pts.forEach(([x, z], i) => { a.setXYZ(i, x, 0.25 + heightAt(x, z), z); if (i) len += Math.hypot(x - pts[i - 1][0], z - pts[i - 1][1]); });
  a.needsUpdate = true; routeGeo.setDrawRange(0, pts.length); routeLine.computeLineDistances(); routeLine.visible = true;
  G.currentRoute = pts; G.routeLen = len;
}
