// Elevation layer for bridges, flyovers and ramps.
//
// Important:
// A bridge occupies the same X/Z coordinates as the road underneath it.
// Therefore heightAt() cannot blindly return the bridge height.
//
// Objects already travelling at bridge elevation use the deck.
// Objects at ground elevation remain underneath the bridge.
//
// This prevents the player/car from being teleported vertically onto
// the flyover when travelling underneath it.

export const DECKS = [];

export function addDeck({
  id,
  name,
  axis,
  k,
  halfW,
  profile,
}) {
  DECKS.push({
    id,
    name,
    axis,
    k,
    halfW,
    profile,
    from: profile[0][0],
    to: profile[profile.length - 1][0],
  });
}

// Returns the height of a deck at this X/Z coordinate.
export function deckHeightAt(x, z) {
  let h = 0;
  let deck = null;

  for (const d of DECKS) {
    const along =
      d.axis === 'h' ? x : z;

    const across =
      d.axis === 'h' ? z : x;

    if (
      Math.abs(across - d.k) >
        d.halfW ||
      along < d.from ||
      along > d.to
    ) {
      continue;
    }

    const p = d.profile;

    for (let i = 1; i < p.length; i++) {
      if (along <= p[i][0]) {
        const a = p[i - 1];
        const b = p[i];

        const span =
          b[0] - a[0];

        const t =
          span === 0
            ? 0
            : (along - a[0]) / span;

        const value =
          a[1] +
          (b[1] - a[1]) * t;

        if (value > h) {
          h = value;
          deck = d;
        }

        break;
      }
    }
  }

  return {
    height: h,
    deck,
  };
}

// Ground-aware elevation.
//
// yHint is the object's current elevation.
//
// If the object is already near the deck elevation,
// it stays on the bridge.
//
// If it is at ground level underneath a high bridge,
// it remains on the ground.
//
// Low ramps are allowed to raise the player/car naturally.
export function heightAt(
  x,
  z,
  yHint = 0
) {
  const result =
    deckHeightAt(x, z);

  if (!result.deck) {
    return 0;
  }

  const h = result.height;

  // Ground-level / low ramp.
  //
  // This lets the player climb the first part of a bridge ramp.
  if (h <= 2.25) {
    return h;
  }

  // Already travelling on the elevated deck.
  //
  // A tolerance of 2m allows small numerical differences while
  // transitioning between deck and ramp.
  if (
    Math.abs(yHint - h) <= 2.0
  ) {
    return h;
  }

  // High bridge above the player:
  // stay on the ground underneath it.
  return 0;
}

export const onDeck = (
  x,
  z,
  yHint = 0
) => {
  const result =
    deckHeightAt(x, z);

  if (!result.deck) {
    return false;
  }

  return (
    result.height > 2.25 &&
    Math.abs(yHint - result.height) <= 2.0
  );
};

export const deckAt = (
  x,
  z
) =>
  DECKS.find(d => {
    const along =
      d.axis === 'h'
        ? x
        : z;

    const across =
      d.axis === 'h'
        ? z
        : x;

    return (
      Math.abs(across - d.k) <=
        d.halfW &&
      along >= d.from &&
      along <= d.to
    );
  }) || null;