// Tiny event bus. Systems emit, UI subscribes, so modules never import each other in cycles.
//   'hud'             → HUD/phone should re-render from state
//   'key' (k, event)  → a non-input keydown
//   'clock'           → game clock ticked (about twice a second)
//   'mission:refresh' → mission marker/availability may have changed
//   'scene' (name)    → scene switched
const subs = {};
export const on = (name, fn) => { (subs[name] ??= []).push(fn); return () => off(name, fn); };
export const off = (name, fn) => { subs[name] = (subs[name] || []).filter(f => f !== fn); };
export const emit = (name, ...args) => { for (const fn of subs[name] || []) fn(...args); };
