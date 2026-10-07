import { $, esc } from '../core/utils.js';

let toastT;
const queue = [];
let showing = false;

/** Centre-screen confirmation, ~2.2 s. */
export function toast(text) {
  const e = $('toast'); if (!e) return;
  e.textContent = text; e.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => e.classList.remove('show'), 2200);
}

/**
 * Queue a top notification. Kinds: 'good' | 'warn' | 'bad' | default.
 * Stacks up to 3; each shows ~3.6 s.
 */
export function notify(from, text, kind = '') {
  queue.push({ from, text, kind });
  if (queue.length > 5) queue.shift();
  pump();
}

function pump() {
  if (showing || !queue.length) return;
  const stack = $('notifStack'); if (!stack) return;
  showing = true;
  const { from, text, kind } = queue.shift();
  const el = document.createElement('div');
  el.className = 'notif glass' + (kind ? ` kind-${kind}` : '');
  el.innerHTML = `<b>${esc(from)}</b><span>${esc(text)}</span>`;
  stack.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => { el.remove(); showing = false; pump(); }, 320);
  }, 3600);
}

/** Clear queue (e.g. on scene exit). */
export function clearNotifs() {
  queue.length = 0;
  const stack = $('notifStack');
  if (stack) stack.innerHTML = '';
  showing = false;
}