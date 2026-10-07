import { $, esc } from '../core/utils.js';

let toastT;
const queue = [];
let pumping = false;

/** Centre-screen confirmation, ~2.2 s. */
export function toast(text) {
  const e = $('toast'); if (!e) return;
  e.textContent = text;
  e.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => e.classList.remove('show'), 2200);
}

/**
 * Top notification. kind: 'good' | 'warn' | 'bad' (default good).
 * Queues so rapid msgs don't overwrite.
 */
export function notify(from, text, kind = 'good') {
  queue.push({ from, text, kind });
  if (!pumping) pump();
}

function pump() {
  const stack = $('notifStack') || $('notif');
  if (!stack || !queue.length) { pumping = false; return; }
  pumping = true;
  const { from, text, kind } = queue.shift();

  // Prefer stack container
  const host = $('notifStack');
  if (host) {
    const el = document.createElement('div');
    el.className = `notif glass show kind-${kind || 'good'}`;
    el.innerHTML = `<b>${esc(from)}</b><span>${esc(text)}</span>`;
    host.appendChild(el);
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 280);
      pump();
    }, 3200);
    return;
  }

  // Fallback single bubble
  const e = $('notif');
  e.innerHTML = `<b>${esc(from)}</b><span>${esc(text)}</span>`;
  e.className = `notif glass show kind-${kind || 'good'}`;
  setTimeout(() => {
    e.classList.remove('show');
    setTimeout(pump, 300);
  }, 3200);
}