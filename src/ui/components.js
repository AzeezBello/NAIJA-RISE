// Reusable HTML string components for the phone and HUD. Pure functions: data in, markup out.
import { esc, fmt } from '../core/utils.js';

export const Key = k => `<span class="key">${esc(k)}</span>`;
export const Pill = (label, cls = '') => `<span class="pill ${cls}">${esc(label)}</span>`;
export const Sect = title => `<div class="sect">${esc(title)}</div>`;
export const Empty = text => `<div class="empty">${esc(text)}</div>`;
export const Row = (inner, cls = '') => `<div class="row ${cls}">${inner}</div>`;
export const Spacer = () => '<span class="sp"></span>';
export const Card = (inner, cls = '') => `<div class="card ${cls}">${inner}</div>`;
export const Note = text => `<p class="about">${text}</p>`;
export const Avatar = (c, size = '') => `<div class="avatar ${size}" style="background:${c.c}">${esc(c.name[0])}</div>`;

export function Btn(label, act, { id = '', cls = '', disabled = false } = {}) {
  return `<button class="btn ${cls}" data-act="${act}"${id !== '' ? ` data-id="${esc(id)}"` : ''}${disabled ? ' disabled' : ''}>${label}</button>`;
}
export function Balance(label, value, sub = '') {
  return `<div class="card bal"><p>${esc(label)}</p><h3>${value}</h3>${sub ? `<p>${sub}</p>` : ''}</div>`;
}
export function TxRow(t) {
  return `<div class="tx"><span>${esc(t.label)}</span><b class="${t.amount < 0 ? 'out' : 'in'}">${t.amount < 0 ? '−' : '+'}${fmt(Math.abs(t.amount))}</b></div>`;
}
export function Swatches(key, colors, current) {
  return `<div class="swatches">${colors.map((c, i) => `<button class="swatch ${current === i ? 'on' : ''}" style="background:${c}" data-act="look" data-id="${key}:${i}" title="${key} ${i + 1}"></button>`).join('')}</div>`;
}
export function Chips(key, labels, current) {
  return Row(labels.map((l, i) => `<button class="chip ${current === i ? 'on' : ''}" data-act="look" data-id="${key}:${i}">${esc(l)}</button>`).join(''));
}
export function StatBar(label, id, fillCls) {
  return `<div class="vbar"><span>${esc(label)}</span><div class="track"><i id="${id}" class="${fillCls}"></i></div></div>`;
}
export function Field(label, inputHtml) { return `<label class="field">${label}${inputHtml}</label>`; }
export function Toggle(label, id, checked) { return `<label class="toggle">${esc(label)}<input type="checkbox" id="${id}" ${checked ? 'checked' : ''}></label>`; }
