// Phone app registry. Order here is the home-screen order.
import map from './map.js';
import jobs from './jobs.js';
import messages from './messages.js';
import contacts from './contacts.js';
import bank from './bank.js';
import businesses from './businesses.js';
import property from './property.js';
import inventory from './inventory.js';
import character from './character.js';
import settings from './settings.js';

export const APPS = [map, jobs, messages, contacts, bank, businesses, property, inventory, character, settings];

// Shared SVG icon helper (24px line icons).
export const icon = paths => `<svg viewBox="0 0 24 24">${paths}</svg>`;
