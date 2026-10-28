const KEY = 'aro-navigator-progress-v1';
const empty = () => ({ checked: {}, confirmed: {}, visited: {}, research: {}, lastRoute: '', quiz: {}, tourDone: false, auto: {}, autoFile: '' });
function load() {
    try {
        const raw = localStorage.getItem(KEY);
        return raw ? { ...empty(), ...JSON.parse(raw) } : empty();
    }
    catch {
        return empty();
    }
}
let state = load();
const listeners = new Set();
let storageOk = true;
function save() {
    try {
        localStorage.setItem(KEY, JSON.stringify(state));
        storageOk = true;
    }
    catch {
        storageOk = false;
    }
    listeners.forEach(fn => fn());
}
export const store = {
    get: () => state,
    storageOk: () => storageOk,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    isChecked: (id) => !!state.checked[id],
    toggle(id, on) {
        const next = on ?? !state.checked[id];
        if (next)
            state.checked[id] = new Date().toISOString();
        else
            delete state.checked[id];
        save();
    },
    confirm(conflictId, note) {
        if (note.trim())
            state.confirmed[conflictId] = note.trim();
        else
            delete state.confirmed[conflictId];
        save();
    },
    visit(stageId) {
        state.visited[stageId] = new Date().toISOString();
        try {
            localStorage.setItem(KEY, JSON.stringify(state));
        }
        catch { /* ignore */ }
    },
    setResearch(id, on) { state.research[id] = on; save(); },
    setRoute(route) {
        if (state.lastRoute === route)
            return;
        state.lastRoute = route;
        try {
            localStorage.setItem(KEY, JSON.stringify(state));
        }
        catch { /* ignore */ }
    },
    answer(quizId, choice) { state.quiz[quizId] = choice; save(); },
    setAuto(file, verdicts) {
        const at = new Date().toISOString();
        state.auto = Object.fromEntries(Object.entries(verdicts).map(([k, v]) => [k, { verdict: v, at }]));
        state.autoFile = file;
        save();
    },
    clearAuto() { state.auto = {}; state.autoFile = ''; save(); },
    setTourDone() { state.tourDone = true; save(); },
    reset() { state = empty(); save(); },
    exportJson: () => JSON.stringify(state, null, 2),
    importJson(text) { state = { ...empty(), ...JSON.parse(text) }; save(); },
};
// keep several open tabs in sync
window.addEventListener('storage', e => { if (e.key === KEY) {
    state = load();
    listeners.forEach(fn => fn());
} });
