import * as THREE from 'three';
import { G, frozen } from '../core/context.js';
import { dist } from '../core/utils.js';
import { CONTACTS } from '../data/characters.js';
import { placeOf, SERVICE_NPCS } from '../data/locations.js';
import { createCharacter } from './character.js';
import { buildPrimitive } from './wardrobe.js';
import { missionActive, curMission } from '../systems/navigation.js';
import { FAMILY, FAMILY_HOME } from '../data/family.js';
import { activeFamilyRequest } from '../systems/family.js';

// Story and job contacts stand in the world as people, not buildings: Baba K outside Ojuelegba Junction, Amaka at the
// Iponri yard, Dayo at Ladipo, Mama Nkechi at Yaba Market… The contact who owns the current objective carries a
// bobbing arrow over their head, and the mission marker, GPS and talk prompt all point at them (G.contactPos).
const LOOKS = {
  babak:   { rig: 0, look: { outfit: 3, shirt: 2, pants: 2, skin: 3, hair: 4, hairColor: 3, bodyType: 2, accessory: 1, facialHair: 1, face: 1 } },   // agbada and fila, grey beard
  amaka:   { rig: 0, look: { outfit: 9, shirt: 1, pants: 0, skin: 2, hair: 3 } },
  dayo:    { rig: 0, look: { outfit: 6, shirt: 8, pants: 1, skin: 3, hair: 1, accessory: 2 } },                                                      // singlet, face cap
  nkechi:  { rig: 0, look: { outfit: 10, shirt: 0, pants: 5, skin: 3, hair: 3, bodyType: 2 } },
  driver:  { rig: 0, look: { outfit: 5, shirt: 7, pants: 0, skin: 4, accessory: 2 } },
  bayo:    { rig: 0, look: { outfit: 4, shirt: 7, pants: 1, skin: 2, hair: 1 } },
  coach:   { rig: 0, look: { outfit: 7, shirt: 8, pants: 3, skin: 3, hair: 1, bodyType: 2 } },
  mallguy: { rig: 0, look: { outfit: 8, shirt: 6, pants: 1, skin: 2 } },
  cafeguy: { rig: 0, look: { outfit: 5, shirt: 6, pants: 1, skin: 3, accessory: 3 } },
  captain: { rig: 0, look: { outfit: 4, shirt: 7, pants: 4, skin: 4 } },
  sisi: { rig: 0, look: { outfit: 2, shirt: 1, pants: 2, skin: 3, hair: 3, bodyType: 2 } },
  cv_oga: { rig: 0, look: { outfit: 5, shirt: 6, pants: 1, skin: 3, accessory: 2 } },
  shrine_host: { rig: 0, look: { outfit: 10, shirt: 0, pants: 5, skin: 2, hair: 3 } },
  kalakuta_guide: { rig: 0, look: { outfit: 2, shirt: 3, pants: 1, skin: 2 } },
  makoko_fisher: { rig: 0, look: { outfit: 2, shirt: 1, pants: 2, skin: 4, accessory: 2 } },
  ikoyi_merchant: { rig: 0, look: { outfit: 1, shirt: 4, pants: 2, skin: 2, accessory: 1 } },
  lekki_keeper: { rig: 0, look: { outfit: 10, shirt: 1, pants: 5, skin: 2, hair: 3 } },
  ikorodu_trader: { rig: 0, look: { outfit: 3, shirt: 2, pants: 2, skin: 3, accessory: 1, facialHair: 1 } },
  apapa_dispatch: { rig: 0, look: { outfit: 5, shirt: 7, pants: 3, skin: 4, accessory: 2 } },
  oyingbo_trader: { rig: 0, look: { outfit: 10, shirt: 0, pants: 5, skin: 3, hair: 3 } },
  yaba_connector: { rig: 0, look: { outfit: 5, shirt: 6, pants: 1, skin: 2, accessory: 3 } },
  agege_baker: { rig: 0, look: { outfit: 10, shirt: 0, pants: 5, skin: 3, hair: 3, bodyType: 2 } },
  ojo_trader: { rig: 0, look: { outfit: 2, shirt: 1, pants: 2, skin: 4, accessory: 2 } },
  balogun_osoanya: { rig: 0, look: { outfit: 5, shirt: 4, pants: 2, skin: 3, hair: 1, accessory: 2 } },
  yaba_osoanya: { rig: 0, look: { outfit: 5, shirt: 1, pants: 1, skin: 2, hair: 2, accessory: 2 } },
  computer_village_osoanya: { rig: 0, look: { outfit: 8, shirt: 6, pants: 1, skin: 4, hair: 1, accessory: 3 } },
  mum:     { rig: 0, look: { outfit: 9, shirt: 0, pants: 5, skin: 3, hair: 3, bodyType: 2 } },
  sibling: { rig: 0, look: { outfit: 10, shirt: 1, pants: 0, skin: 2, hair: 3, bodyType: 0 } },
  egbon:   { rig: 0, look: { outfit: 1, shirt: 4, pants: 2, skin: 3, hair: 2, accessory: 1, bodyType: 2 } },
};
// Where a contact stands: on the street side of their building, by the shelter at a bus stop.
function spotFor(c) {
  const p = placeOf(c.at); if (!p) return null;
  if (p.stadium) return { x: p.x + (c.offset?.x || 0), z: p.z - 27 + (c.offset?.z || 0) };
  if (p.kind === 'pitch') return { x: p.x + 8 + (c.offset?.x || 0), z: p.z - 13 + (c.offset?.z || 0) };
  if (p.agberos !== undefined) return { x: p.x + 5 + (c.offset?.x || 0), z: p.z + 3 + (c.offset?.z || 0) };
  const depth = p.big ? 20 : (p.kind === 'hotel' || p.kind === 'bank') ? 16 : 14;
  return { x: p.x + 3 + (c.offset?.x || 0), z: p.z - depth / 2 - 2 + (c.offset?.z || 0) };
}
function arrowMesh() {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0xffc52f, emissive: 0xffc52f, emissiveIntensity: 0.9 });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.7, 12), m); cone.rotation.x = Math.PI; cone.position.y = 0;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.55, 10), m); shaft.position.y = 0.62;
  g.add(cone, shaft); g.visible = false; G.scene.add(g); return g;
}

export function spawnContacts() {
  G.contacts = []; G.contactPos = {};
  for (const c of CONTACTS) {
    const cfg = LOOKS[c.id]; if (!cfg) continue;
    const at = spotFor(c); if (!at) continue;
    const ch = createCharacter({ build: (l, t) => buildPrimitive(l, { scale: 0.86, tint: t }), look: cfg.look, rig: cfg.rig, scale: 0.95 + (cfg.look.bodyType === 2 ? 0.05 : 0) });
    ch.group.position.set(at.x, 0, at.z); ch.group.rotation.y = Math.PI;   // face the street
    G.scene.add(ch.group);
    G.contacts.push({ id: c.id, name: c.name, g: ch.group, c: ch, arrow: arrowMesh(), x: at.x, z: at.z });
    G.contactPos[c.id] = at;
  }
  // Speedy is the racer already standing at the Stadium bus stop
  const racer = SERVICE_NPCS.find(s => s.u === 'racer'); if (racer) { G.contactPos.speedy = { x: racer.x, z: racer.z }; G.contacts.push({ id: 'speedy', name: 'Speedy', g: null, arrow: arrowMesh(), x: racer.x, z: racer.z }); }
  // Family compound (Alpha 1.1)
  for (const f of FAMILY) {
    const at = { x: FAMILY_HOME.x + f.offset.x, z: FAMILY_HOME.z + f.offset.z };
    const ch = createCharacter({
      build: (l, t) => buildPrimitive(l, { scale: 0.86, tint: t }),
      look: f.look, rig: 0, scale: 0.92 + (f.look.bodyType === 2 ? 0.06 : 0),
    });
    ch.group.position.set(at.x, 0, at.z);
    ch.group.rotation.y = Math.PI;
    G.scene.add(ch.group);
    G.contacts.push({ id: f.id, name: f.name, g: ch.group, c: ch, arrow: arrowMesh(), x: at.x, z: at.z });
    G.contactPos[f.id] = at;
  }
}

export const missionWho = m => m.who || (typeof m.lines === 'function' ? m.lines()[0]?.s : null);

export function updateContacts(dt) {
  if (!G.contacts) return;
  const p = G.player?.position, t = performance.now() / 1000;
  const active = missionActive() && !G.task ? missionWho(curMission()) : null;
  for (const c of G.contacts) {
    if (c.g && p && !frozen()) { const d = dist(p, c); if (d < 10) { c.g.rotation.y = Math.atan2(p.x - c.x, p.z - c.z); c.c?.setState('idle', 0); } }
    const on = c.id === active;
    c.arrow.visible = on;
    if (on) { c.arrow.position.set(c.x, 3.3 + Math.sin(t * 3) * 0.18, c.z); c.arrow.rotation.y = t * 1.6; }
  }

  const fam = activeFamilyRequest();
  for (const c of G.contacts) {
    if (c.g && p && !frozen()) {
      const d = dist(p, c);
      if (d < 10) { c.g.rotation.y = Math.atan2(p.x - c.x, p.z - c.z); c.c?.setState('idle', 0); }
    }
    const on = c.id === active || (fam && c.id === fam.who);
    c.arrow.visible = on;
    if (on) {
      c.arrow.position.set(c.x, 3.3 + Math.sin(t * 3) * 0.18, c.z);
      c.arrow.rotation.y = t * 1.6;
    }
  }
}
