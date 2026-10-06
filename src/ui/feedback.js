import { $, esc } from '../core/utils.js';

let toastT, notifT;
// Centre-screen confirmation, 2.2 s.
export function toast(text) {
  const e = $('toast'); if (!e) return;
  e.textContent = text; e.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('show'), 2200);
}
// Top-centre notification bubble (messages, bank alerts), 3.4 s.
export function notify(from, text) {
  const e = $('notif'); if (!e) return;
  e.innerHTML = `<b>${esc(from)}</b><span>${esc(text)}</span>`; e.classList.add('show');
  clearTimeout(notifT); notifT = setTimeout(() => e.classList.remove('show'), 3400);
}
