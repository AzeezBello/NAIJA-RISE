// Elevation layer for bridges, flyovers and ramps. Everything else is at y = 0.
// A deck is an axis-aligned strip with a height profile along its axis: ramps rise linearly, spans stay flat.
// Vehicles, the player and the camera read heightAt(x, z); colliders carry a level so deck barriers only
// block things on the deck and ground buildings only block things on the ground.
export const DECKS = [];

// axis 'h': runs along x at fixed z = k; axis 'v': runs along z at fixed x = k. halfW is half the deck width.
export function addDeck({ id, name, axis, k, halfW, profile }) {
  // profile: [[coord, height], ...] sorted by coord; linear between points
  DECKS.push({ id, name, axis, k, halfW, profile, from: profile[0][0], to: profile[profile.length - 1][0] });
}

export function heightAt(x, z) {
  let h = 0;
  for (const d of DECKS) {
    const along = d.axis === 'h' ? x : z, across = d.axis === 'h' ? z : x;
    if (Math.abs(across - d.k) > d.halfW || along < d.from || along > d.to) continue;
    const p = d.profile;
    for (let i = 1; i < p.length; i++) {
      if (along <= p[i][0]) { const t = (along - p[i - 1][0]) / (p[i][0] - p[i - 1][0]); h = Math.max(h, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * t); break; }
    }
  }
  return h;
}
export const onDeck = (x, z) => heightAt(x, z) > 0.5;
export const deckAt = (x, z) => DECKS.find(d => { const along = d.axis === 'h' ? x : z, across = d.axis === 'h' ? z : x; return Math.abs(across - d.k) <= d.halfW && along >= d.from && along <= d.to; }) || null;
