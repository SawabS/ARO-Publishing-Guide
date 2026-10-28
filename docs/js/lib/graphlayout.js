// Layouts for the knowledge graph. Pure functions: they only compute where cards start out;
// the person can then drag any card and the new positions are remembered.
import { graph, KIND_LABEL } from './model.js';
export const NW = 208, NH = 48, COLW = 276, ROWH = 58, PAD = 44;
export const KIND_ORDER = ['stage', 'process', 'artifact', 'section', 'requirement', 'conflict', 'document', 'tool', 'source'];
const byKind = (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.label.localeCompare(b.label);
/** One lane per stage, cards grouped by type under small headings. */
export function laneLayout(vis) {
    const lanes = new Map();
    vis.forEach(n => lanes.set(n.home, [...(lanes.get(n.home) || []), n]));
    const pos = new Map(), frames = [], tags = [];
    let tallest = 0;
    const homes = [...lanes.keys()].sort((a, b) => a - b);
    homes.forEach((home, ci) => {
        const x = PAD + ci * COLW;
        let y = PAD + 36, last = '';
        lanes.get(home).sort(byKind).forEach(n => {
            if (n.kind !== last) {
                if (n.kind !== 'stage') {
                    y += last ? 10 : 6;
                    tags.push({ x: x + 2, y: y + 12, text: KIND_LABEL[n.kind].toUpperCase() });
                    y += 22;
                }
                last = n.kind;
            }
            pos.set(n.id, { x, y });
            y += ROWH;
        });
        tallest = Math.max(tallest, y);
        frames.push({ x: x - 14, y: PAD - 6, w: NW + 28, h: 0, title: `Stage ${String(home).padStart(2, '0')}` });
    });
    frames.forEach(f => { f.h = tallest - PAD + 16; });
    return { pos, frames, tags };
}
/** One panel per card type: what the rules are, what the documents are, and so on. */
export function typeLayout(vis) {
    const COLS = 3, IN = 2, GAP = 14, PW = IN * (NW + GAP) + GAP, PGAP = 28;
    const colH = Array(COLS).fill(PAD);
    const pos = new Map(), frames = [];
    KIND_ORDER.forEach(k => {
        const ns = vis.filter(n => n.kind === k).sort((a, b) => a.home - b.home || a.label.localeCompare(b.label));
        if (!ns.length)
            return;
        const c = colH.indexOf(Math.min(...colH)), px = PAD + c * (PW + PGAP), py = colH[c];
        const rows = Math.ceil(ns.length / IN), ph = 46 + rows * ROWH + 8;
        frames.push({ x: px, y: py, w: PW, h: ph, title: KIND_LABEL[k], sub: `${ns.length}` });
        ns.forEach((n, i) => pos.set(n.id, { x: px + GAP + (i % IN) * (NW + GAP), y: py + 46 + Math.floor(i / IN) * ROWH }));
        colH[c] = py + ph + PGAP;
    });
    return { pos, frames, tags: [] };
}
/** The chosen card in the middle, what points at it on the left, what it points to on the right. */
export function focusLayout(sel, allowed, edges, maxDepth) {
    const layer = new Map([[sel, 0]]);
    const walk = (dir) => {
        let frontier = [sel];
        for (let d = 1; d <= maxDepth && frontier.length; d++) {
            const next = [];
            for (const id of frontier)
                for (const e of edges) {
                    const other = dir === 1 ? (e.from === id ? e.to : null) : (e.to === id ? e.from : null);
                    if (other && allowed.has(other) && !layer.has(other)) {
                        layer.set(other, d * dir);
                        next.push(other);
                    }
                }
            frontier = next;
        }
    };
    walk(1);
    walk(-1);
    const cols = new Map();
    layer.forEach((l, id) => { const n = graph.nodes.get(id); if (n)
        cols.set(l, [...(cols.get(l) || []), n]); });
    const minL = Math.min(...cols.keys());
    const tallest = Math.max(...[...cols.values()].map(c => c.length));
    const pos = new Map(), frames = [], tags = [];
    const H = tallest * ROWH + 60, mid = PAD + H / 2;
    cols.forEach((ns, l) => {
        const x = PAD + (l - minL) * (COLW + 40);
        ns.sort(byKind).forEach((n, i) => pos.set(n.id, { x, y: mid + (i - (ns.length - 1) / 2) * ROWH - NH / 2 }));
        frames.push({ x: x - 14, y: PAD - 6, w: NW + 28, h: H + 12, title: l === 0 ? 'Selected' : l < 0 ? (l === -1 ? 'Points to it' : l === -2 ? 'Two steps back' : `${-l} steps back`) : (l === 1 ? 'It points to' : l === 2 ? 'Two steps on' : `${l} steps on`) });
    });
    return { layout: { pos, frames, tags }, shown: new Set(layer.keys()) };
}
