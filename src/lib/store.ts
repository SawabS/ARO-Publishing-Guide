// Local-first progress store. Everything stays in this browser's localStorage; nothing is sent anywhere.
import type { ProgressRecord } from '../types.js';

const KEY = 'aro-navigator-progress-v1';
const empty = (): ProgressRecord => ({ checked: {}, confirmed: {}, visited: {}, research: {}, lastRoute: '', quiz: {}, tourDone: false, auto: {}, autoFile: '' });

function load(): ProgressRecord {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...empty(), ...JSON.parse(raw) } : empty();
  } catch { return empty(); }
}

let state: ProgressRecord = load();
const listeners = new Set<() => void>();
let storageOk = true;

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); storageOk = true; }
  catch { storageOk = false; }
  listeners.forEach(fn => fn());
}

export const store = {
  get: () => state,
  storageOk: () => storageOk,
  subscribe(fn: () => void) { listeners.add(fn); return () => listeners.delete(fn); },
  isChecked: (id: string) => !!state.checked[id],
  toggle(id: string, on?: boolean) {
    const next = on ?? !state.checked[id];
    if (next) state.checked[id] = new Date().toISOString(); else delete state.checked[id];
    save();
  },
  confirm(conflictId: string, note: string) {
    if (note.trim()) state.confirmed[conflictId] = note.trim(); else delete state.confirmed[conflictId];
    save();
  },
  visit(stageId: string) { // silent: recording a visit must not trigger a re-render
    state.visited[stageId] = new Date().toISOString();
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  },
  setResearch(id: string, on: boolean) { state.research[id] = on; save(); },
  setRoute(route: string) {
    if (state.lastRoute === route) return;
    state.lastRoute = route;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  },
  answer(quizId: string, choice: string) { state.quiz[quizId] = choice; save(); },
  setAuto(file: string, verdicts: Record<string, string>) {
    const at = new Date().toISOString();
    state.auto = Object.fromEntries(Object.entries(verdicts).map(([k, v]) => [k, { verdict: v, at }]));
    state.autoFile = file; save();
  },
  clearAuto() { state.auto = {}; state.autoFile = ''; save(); },
  setTourDone() { state.tourDone = true; save(); },
  reset() { state = empty(); save(); },
  exportJson: () => JSON.stringify(state, null, 2),
  importJson(text: string) { state = { ...empty(), ...JSON.parse(text) }; save(); },
};

// keep several open tabs in sync
window.addEventListener('storage', e => { if (e.key === KEY) { state = load(); listeners.forEach(fn => fn()); } });
