import { G } from '../core/context.js';
import { on, emit } from '../core/events.js';
import { $, esc } from '../core/utils.js';
import { contactOf } from '../data/characters.js';
import { Avatar, Key } from '../ui/components.js';
import { toast } from '../ui/feedback.js';
import { tx } from './economy.js';
import { curMission, applyMission } from './navigation.js';
import { startTask } from './missions.js';

// A dialogue is a list of {s: contactId, t: text} lines, optional choices on the last line, and an onDone(choice).
export function startDialog(lines, choices, onDone) { G.dialog = { lines, i: 0, choices: choices || null, onDone }; renderDialog(); }

function renderDialog() {
  const d = $('dialog'), dlg = G.dialog;
  if (!dlg) { d.classList.remove('show'); d.innerHTML = ''; return; }
  const L = dlg.lines[dlg.i], c = contactOf(L.s), last = dlg.i === dlg.lines.length - 1;
  const footer = last && dlg.choices
    ? `<div class="choices">${dlg.choices.map((ch, i) => `<button class="btn ghost" data-choice="${i}">${Key(i + 1)}${esc(ch.label)}</button>`).join('')}</div>`
    : `<div class="dnext">${Key('E')} continue</div>`;
  d.innerHTML = `${Avatar(c)}<div class="dbody"><b>${esc(c.name)}</b><p>${esc(L.t)}</p>${footer}</div>`;
  d.classList.add('show');
}

export function advanceDialog(choiceIdx) {
  const dlg = G.dialog; if (!dlg) return;
  const last = dlg.i === dlg.lines.length - 1;
  if (!last) { dlg.i++; renderDialog(); return; }
  if (dlg.choices) {
    if (choiceIdx === undefined || !dlg.choices[choiceIdx]) return;
    const ch = dlg.choices[choiceIdx], done = dlg.onDone, speaker = dlg.lines[dlg.i].s;
    G.dialog = null; renderDialog();
    if (ch.reply) startDialog([{ s: speaker, t: ch.reply }], null, () => done(ch)); else done(ch);
    return;
  }
  const done = dlg.onDone; G.dialog = null; renderDialog(); done && done();
}

export function runMission() {
  const m = curMission();
  const before = G.state.mission;
  startDialog(m.lines(), m.choices, ch => {
    if (ch && ch.apply) ch.apply();
    if (m.task && G.state.mission === before && !G.task) { startTask(m); return; }   // mission continues as a task
    m.after();
    if (!G.state.done) G.state.mission++;
    applyMission(); emit('hud');
  });
}

export function runAgbero(a) {
  a.cool = 150;
  const where = a.stop.name.replace(' Bus Stop', '');
  startDialog([{ s: 'agbero', t: `Oga! Owo da? This na our ${where} junction. Drop ₦500 for the boys.` }], [
    { label: 'Pay ₦500', reply: 'Correct guy. Waka free.',
      apply() { if (G.state.cash >= 500) { G.state.cash -= 500; tx('Agbero levy', -500); } else toast('No cash — they let it slide this time'); } },
    { label: 'I no get.', reply: 'Ehn? We go see again.',
      apply() { if (Math.random() < 0.5) { G.state.heat = Math.min(5, G.state.heat + 1); toast('The boys remember your face · Heat +1'); } else toast('They hiss and let you pass'); } },
  ], ch => { ch.apply(); emit('hud'); });
}

// Bind once the HUD exists: click choices, Space continues, 1-3 pick.
export function setupDialogue() {
  $('dialog').addEventListener('click', e => { const b = e.target.closest('[data-choice]'); if (b) advanceDialog(+b.dataset.choice); });
  on('key', k => {
    if (!G.dialog) return;
    if (k === ' ') advanceDialog();
    if (/^[1-6]$/.test(k)) advanceDialog(+k - 1);
  });
}
