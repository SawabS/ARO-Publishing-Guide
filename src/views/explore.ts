// Explore: the publication knowledge graph. Same data model as the journey; stage nodes show live progress.
// Cards sit on a pannable, zoomable board. Every card can be dragged; links stay attached and light up
// (with a travelling pulse) for the selected card. Lanes, type panels and a focus view are three ways to lay it out.
import { h, icon, svg, clear, reducedMotion } from '../lib/dom.js';
import { graph, neighbours, pathFromStart, dependencies, routeFor, REL_LABEL, KIND_LABEL, stage, stageProgress, conflict, D } from '../lib/model.js';
import { guidanceBadge, statusBadge, sfx } from '../lib/ui.js';
import { req } from '../lib/model.js';
import { NW, NH, PAD, KIND_ORDER, laneLayout, typeLayout, focusLayout, type Layout, type Pos } from '../lib/graphlayout.js';
import type { NodeKind, Relation, GraphEdge } from '../types.js';
import type { GNode } from '../lib/model.js';

const KINDS = KIND_ORDER;
const RELS = Object.keys(REL_LABEL) as Relation[];
type LayoutMode = 'stage' | 'type';
type LinkMode = 'smart' | 'all' | 'off';

// remembered between visits: layout, link style and where each card was dragged to
const KEY = 'aro-graph-v2';
const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } })();
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify({ layout: ui.layout, links: ui.links, pos: ui.pos })); } catch { /* storage unavailable */ } };

const ui = {
  kinds: new Set<NodeKind>(['stage', 'process', 'artifact', 'section', 'requirement', 'conflict', 'document']),
  rels: new Set<Relation>(RELS),
  mode: (matchMedia('(max-width: 768px)').matches ? 'list' : 'graph') as 'graph' | 'list',
  layout: (saved.layout === 'type' ? 'type' : 'stage') as LayoutMode,
  links: (['smart', 'all', 'off'].includes(saved.links) ? saved.links : 'smart') as LinkMode,
  pos: (saved.pos || { stage: {}, type: {} }) as Record<LayoutMode, Record<string, [number, number]>>,
  focus: false,
  depth: 1,
  selected: '' as string,
  hover: '' as string,
  highlight: null as null | { kind: 'path' | 'deps'; ids: Set<string> },
  view: { x: 0, y: 0, k: 0.8 },
};

interface Placed { n: GNode; x: number; y: number }
interface Scene { placed: Map<string, Placed>; edges: GraphEdge[]; frames: Layout['frames']; tags: Layout['tags']; w: number; h: number }

const trunc = (s: string, n = 27) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

/** Smooth connector between two cards, leaving and entering through the sides that face each other. */
function edgePath(a: Pos, b: Pos): string {
  const ay = a.y + NH / 2, by = b.y + NH / 2;
  if (b.x >= a.x + NW - 24) {
    const ax = a.x + NW, bx = b.x, dx = Math.max(48, (bx - ax) / 2);
    return `M${ax} ${ay} C${ax + dx} ${ay}, ${bx - dx} ${by}, ${bx} ${by}`;
  }
  if (b.x + NW <= a.x + 24) {
    const ax = a.x, bx = b.x + NW, dx = Math.max(48, (ax - bx) / 2);
    return `M${ax} ${ay} C${ax - dx} ${ay}, ${bx + dx} ${by}, ${bx} ${by}`;
  }
  const x = Math.max(a.x, b.x) + NW, bend = 44 + Math.min(90, Math.abs(ay - by) / 5);
  return `M${a.x + NW} ${ay} C${x + bend} ${ay}, ${x + bend} ${by}, ${b.x + NW} ${by}`;
}

export function renderExplore(root: HTMLElement, _p: string[], query: URLSearchParams) {
  const focusId = query.get('focus');
  if (focusId && graph.nodes.has(focusId)) {
    ui.kinds.add(graph.nodes.get(focusId)!.kind);
    if (ui.selected !== focusId) ui.highlight = null;
    ui.selected = focusId;
  } else if (!focusId) { ui.selected = ''; ui.highlight = null; ui.focus = false; }

  const wrap = h('div.explore');
  root.append(wrap);
  const head = h('header.explore-head', null,
    h('div.kicker.kicker--purple', null, 'Explore'),
    h('h1.ts-heading-2xl', null, 'Every ARO rule, connected to where it applies'),
    h('p.ts-body-sm.c-secondary', null, `${graph.nodes.size} cards and ${graph.edges.length} relationships from the same data as the journey. Select a card to light up what it needs and what depends on it. Drag any card to rearrange the board; your layout is remembered on this device.`));

  const searchIn = h('input.input.graph-search', { type: 'search', placeholder: 'Find a card…', 'aria-label': 'Find a node in the graph', list: 'graph-nodes' }) as HTMLInputElement;
  const dl = h('datalist#graph-nodes', null, [...graph.nodes.values()].map(n => h('option', { value: n.label })));
  searchIn.addEventListener('change', () => {
    const n = [...graph.nodes.values()].find(x => x.label.toLowerCase() === searchIn.value.toLowerCase()) ||
      [...graph.nodes.values()].find(x => x.label.toLowerCase().includes(searchIn.value.toLowerCase()));
    if (n) { ui.kinds.add(n.kind); select(n.id, true); }
  });

  const modeSeg = h('div.segmented.mode-seg', { role: 'tablist', 'aria-label': 'View', style: `--n: 2; --i: ${ui.mode === 'graph' ? 0 : 1}` },
    h('span.segmented__thumb'),
    h('button', { role: 'tab', 'aria-selected': ui.mode === 'graph', onclick: () => { ui.mode = 'graph'; rerender(); } }, icon('a-graph', 16), ' Graph'),
    h('button', { role: 'tab', 'aria-selected': ui.mode === 'list', onclick: () => { ui.mode = 'list'; rerender(); } }, icon('a-list', 16), ' List'));

  const kindChips = h('div.row.chip-row', { role: 'group', 'aria-label': 'Show node types' }, KINDS.map(k =>
    h(`button.chip.chip--sm.kind-chip.kind-chip--${k}`, { 'aria-pressed': ui.kinds.has(k), onclick: () => { ui.kinds.has(k) ? ui.kinds.delete(k) : ui.kinds.add(k); sfx('toggle'); rerender(); } },
      h('span.kind-dot', { 'aria-hidden': 'true' }), KIND_LABEL[k])));
  const relSel = h('select.input.rel-select', { 'aria-label': 'Relationship filter', onchange: (e: Event) => {
    const v = (e.target as HTMLSelectElement).value; ui.rels = new Set(v === 'all' ? RELS : [v as Relation]); rerender();
  } }, h('option', { value: 'all' }, 'All relationships'), RELS.map(r => h('option', { value: r, selected: ui.rels.size === 1 && ui.rels.has(r) }, REL_LABEL[r])));

  const legendRow = ui.mode === 'graph' ? h('div.graph-legend-row', null, buildLegend(), h('span.graph-hint', null, 'Drag cards to move them · scroll or pinch to zoom · drag the background to pan')) : null;
  const toolbar = h('div.explore-toolbar', null, h('div.row', null, searchIn, dl, relSel, modeSeg), kindChips, legendRow);
  const stageEl = h('div.explore-stage');
  const panel = h('aside.explore-panel', { 'aria-live': 'polite', 'aria-label': 'Node details' });
  wrap.append(head, toolbar, h('div.explore-body', null, stageEl, panel));

  // ── scene: which cards are shown, and where ─────────────────────────────
  let svgRoot: SVGSVGElement | null = null, world: SVGGElement | null = null;
  let L: Scene = { placed: new Map(), edges: [], frames: [], tags: [], w: 0, h: 0 };
  let nodeEls = new Map<string, SVGGElement>(), edgeEls: SVGPathElement[] = [], pulseEls = new Map<number, SVGPathElement>(), byNode = new Map<string, number[]>();
  let miniSvg: SVGSVGElement | null = null, zoomLabel: HTMLElement | null = null;
  const focusPos = new Map<string, [number, number]>();      // moves made while in focus view are not remembered
  const undo: string[] = [], redo: string[] = [];

  const overrides = () => ui.pos[ui.layout] || (ui.pos[ui.layout] = {});

  function focusAllowed(): Set<string> {
    const sel = ui.selected, s = new Set<string>([sel]);
    const depth = ui.highlight ? 8 : ui.depth;
    if (ui.highlight) ui.highlight.ids.forEach(id => s.add(id));
    let frontier = [sel];
    for (let d = 0; d < (ui.highlight ? 1 : depth); d++) {
      const next: string[] = [];
      for (const id of frontier) graph.edges.forEach(e => {
        if (!ui.rels.has(e.rel)) return;
        const o = e.from === id ? e.to : e.to === id ? e.from : '';
        if (o && !s.has(o)) { s.add(o); next.push(o); }
      });
      frontier = next;
    }
    return s;
  }

  function buildScene(): Scene {
    const placed = new Map<string, Placed>();
    let lay: Layout, vis: GNode[];
    if (ui.focus && ui.selected && graph.nodes.has(ui.selected)) {
      const allowed = focusAllowed();
      const f = focusLayout(ui.selected, allowed, graph.edges.filter(e => ui.rels.has(e.rel)), ui.highlight ? 8 : ui.depth);
      lay = f.layout; vis = [...f.shown].map(id => graph.nodes.get(id)!).filter(Boolean);
      lay.pos.forEach((p, id) => { const o = focusPos.get(id); placed.set(id, { n: graph.nodes.get(id)!, x: o ? o[0] : p.x, y: o ? o[1] : p.y }); });
    } else {
      vis = [...graph.nodes.values()].filter(n => ui.kinds.has(n.kind));
      lay = ui.layout === 'type' ? typeLayout(vis) : laneLayout(vis);
      const ov = overrides();
      lay.pos.forEach((p, id) => { const o = ov[id]; placed.set(id, { n: graph.nodes.get(id)!, x: o ? o[0] : p.x, y: o ? o[1] : p.y }); });
    }
    const edges = graph.edges.filter(e => placed.has(e.from) && placed.has(e.to) && ui.rels.has(e.rel));
    const sc: Scene = { placed, edges, frames: lay.frames, tags: lay.tags, w: 0, h: 0 };
    measure(sc);
    return sc;
  }
  function measure(sc: Scene) {
    let w = 0, hh = 0;
    sc.placed.forEach(p => { w = Math.max(w, p.x + NW); hh = Math.max(hh, p.y + NH); });
    sc.frames.forEach(f => { w = Math.max(w, f.x + f.w); hh = Math.max(hh, f.y + f.h); });
    sc.w = w + PAD; sc.h = hh + PAD;
  }

  // ── view: pan, zoom, fit ────────────────────────────────────────────────
  function applyView() {
    world?.setAttribute('transform', `translate(${ui.view.x} ${ui.view.y}) scale(${ui.view.k})`);
    if (zoomLabel) zoomLabel.textContent = Math.round(ui.view.k * 100) + '%';
    drawMiniView();
  }
  function fit() {
    if (!svgRoot) return;
    const r = svgRoot.getBoundingClientRect();
    const k = Math.min(1.1, Math.max(0.15, Math.min((r.width - 24) / L.w, (r.height - 90) / L.h)));
    ui.view = { k, x: (r.width - L.w * k) / 2, y: Math.max(8, (r.height - 70 - L.h * k) / 2) };
    applyView();
  }
  // first view: legible labels, anchored top-left; "Fit" and the overview map show the whole board
  function readable() {
    if (!svgRoot) return;
    const r = svgRoot.getBoundingClientRect();
    const k = ui.focus ? Math.min(1, Math.max(0.45, (r.width - 24) / L.w)) : Math.max(0.7, Math.min(1, r.width / L.w));
    ui.view = { k, x: k * L.w < r.width ? (r.width - L.w * k) / 2 : 12, y: 12 };
    applyView();
  }
  function zoom(f: number, cx?: number, cy?: number) {
    if (!svgRoot) return;
    const r = svgRoot.getBoundingClientRect();
    cx ??= r.width / 2; cy ??= r.height / 2;
    const k = Math.min(2.5, Math.max(0.15, ui.view.k * f));
    ui.view.x = cx - (cx - ui.view.x) * (k / ui.view.k); ui.view.y = cy - (cy - ui.view.y) * (k / ui.view.k); ui.view.k = k;
    applyView();
  }
  function center(id: string) {
    const p = L.placed.get(id); if (!p || !svgRoot) return;
    const r = svgRoot.getBoundingClientRect();
    const k = Math.max(ui.view.k, 0.85);
    const target = { k, x: r.width / 2 - (p.x + NW / 2) * k, y: r.height / 2 - (p.y + NH / 2) * k };
    if (reducedMotion()) { ui.view = target; applyView(); return; }
    const from = { ...ui.view }, t0 = performance.now();
    const step = (t: number) => {
      const e = Math.min(1, (t - t0) / 380), s = 1 - Math.pow(1 - e, 3);
      ui.view = { k: from.k + (target.k - from.k) * s, x: from.x + (target.x - from.x) * s, y: from.y + (target.y - from.y) * s };
      applyView(); if (e < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ── what is lit, what is dimmed ─────────────────────────────────────────
  const focusOf = () => ui.selected || ui.hover;
  function litSet(): Set<string> | null {
    if (ui.highlight) return new Set([...ui.highlight.ids, ui.selected]);
    const f = focusOf();
    if (!f) return null;
    const nb = neighbours(f);
    return new Set([f, ...nb.out.map(e => e.to), ...nb.in.map(e => e.from)]);
  }
  function edgeLit(e: GraphEdge, lit: Set<string> | null) {
    if (!lit) return '';
    if (ui.highlight?.kind === 'path') {
      const ids = [...ui.highlight.ids]; const i = ids.indexOf(e.from);
      return i >= 0 && ids[i + 1] === e.to ? 'is-lit' : 'is-dim';
    }
    if (ui.highlight) return ui.highlight.ids.has(e.to) && (ui.highlight.ids.has(e.from) || e.from === ui.selected) ? 'is-lit' : 'is-dim';
    const f = focusOf();
    return e.from === f || e.to === f ? 'is-lit' : 'is-dim';
  }
  function edgeClass(e: GraphEdge, lit: Set<string> | null) {
    const state = edgeLit(e, lit);
    if (state) return `gedge gedge--${e.rel} ${state}`;
    const backbone = e.rel === 'leads_to';
    const tone = ui.links === 'all' ? 'is-base' : ui.links === 'smart' ? (backbone ? 'is-base' : 'is-faint') : (backbone ? 'is-faint' : 'is-off');
    return `gedge gedge--${e.rel} ${tone}`;
  }
  function nodeClasses(id: string) {
    const n = graph.nodes.get(id)!;
    const cls = ['gnode', 'gnode--' + n.kind];
    if (n.kind === 'conflict' && conflict(id).status === 'unresolved') cls.push('gnode--unresolved');
    if (n.kind === 'stage') { const p = stageProgress(stage(id)); if (p.done === p.total) cls.push('gnode--done'); }
    const lit = litSet();
    if (lit) cls.push(lit.has(id) ? 'is-lit' : 'is-dim');
    if (ui.selected === id) cls.push('is-selected');
    return cls.join(' ');
  }

  // ── drawing ─────────────────────────────────────────────────────────────
  function drawGraph() {
    clear(stageEl);
    L = buildScene();
    nodeEls = new Map(); edgeEls = []; pulseEls = new Map(); byNode = new Map();
    svgRoot = svg('svg', { class: 'graph-svg', role: 'application', 'aria-label': 'Publication knowledge graph. Tab moves between cards, Enter selects, Shift with arrow keys moves the focused card.', tabindex: '0' }) as SVGSVGElement;
    const defs = svg('defs');
    // arrowheads keep a constant size (not tied to line width); lit links get a larger head in the same colour
    RELS.forEach(r => [['arr-', 11], ['arrl-', 15]].forEach(([pre, size]) => defs.appendChild(svg('marker', { id: pre + r, viewBox: '0 0 10 10', refX: 9.5, refY: 5, markerWidth: size, markerHeight: size, markerUnits: 'userSpaceOnUse', orient: 'auto' },
      svg('path', { d: 'M0 .5 L10 5 L0 9.5 L2.4 5 z', class: 'arrow arrow--' + r })))));
    svgRoot.appendChild(defs);
    world = svg('g', { class: 'graph-world' }) as SVGGElement;

    L.frames.forEach(f => {
      const g = svg('g', { class: 'graph-frame' });
      g.appendChild(svg('rect', { x: f.x, y: f.y, width: f.w, height: f.h, rx: 22, class: 'graph-col' }));
      const t = svg('text', { x: f.x + 16, y: f.y + 25, class: 'graph-frame__title' }); t.textContent = f.title; g.appendChild(t);
      if (f.sub) { const c = svg('text', { x: f.x + f.w - 16, y: f.y + 25, class: 'graph-frame__sub', 'text-anchor': 'end' }); c.textContent = f.sub; g.appendChild(c); }
      world!.appendChild(g);
    });
    L.tags.forEach(t => { const el = svg('text', { x: t.x, y: t.y, class: 'graph-tag' }); el.textContent = t.text; world!.appendChild(el); });

    const lit = litSet();
    const eg = svg('g', { class: 'graph-edges' });
    L.edges.forEach((e, i) => {
      const a = L.placed.get(e.from)!, b = L.placed.get(e.to)!;
      const cls = edgeClass(e, lit);
      const path = svg('path', { d: edgePath(a, b), class: cls, 'marker-end': `url(#${cls.includes('is-lit') ? 'arrl-' : 'arr-'}${e.rel})` }) as SVGPathElement;
      const t = svg('title'); t.textContent = `${a.n.label} → ${REL_LABEL[e.rel]} → ${b.n.label}`; path.appendChild(t);
      eg.appendChild(path); edgeEls.push(path);
      [e.from, e.to].forEach(id => byNode.set(id, [...(byNode.get(id) || []), i]));
    });
    world.appendChild(eg);
    const pg = svg('g', { class: 'graph-pulses', 'aria-hidden': 'true' });
    world.appendChild(pg);
    const ng = svg('g', { class: 'graph-nodes' });
    L.placed.forEach(p => { const g = renderNode(p); nodeEls.set(p.n.id, g); ng.appendChild(g); });
    world.appendChild(ng);
    svgRoot.appendChild(world);
    refreshPulses();

    stageEl.append(svgRoot, buildBar(), buildMini());
    attachPointer();
    requestAnimationFrame(() => { readable(); if (ui.selected && !ui.focus) center(ui.selected); drawMini(); });
  }

  function renderNode(p: Placed): SVGGElement {
    const n = p.n, round = n.kind === 'stage' || n.kind === 'process' ? NH / 2 : 13;
    const g = svg('g', { class: nodeClasses(n.id), transform: `translate(${p.x} ${p.y})`, tabindex: '0', role: 'button', 'data-id': n.id,
      'aria-label': `${KIND_LABEL[n.kind]}: ${n.label}`, 'aria-pressed': String(ui.selected === n.id) }) as SVGGElement;
    g.appendChild(svg('rect', { class: 'gnode__lip', x: 0, y: 3, width: NW, height: NH, rx: round }));
    g.appendChild(svg('rect', { class: 'gnode__box', x: 0, y: 0, width: NW, height: NH, rx: round }));
    g.appendChild(svg('circle', { class: 'gnode__dot', cx: 15, cy: 15, r: 4 }));
    const kind = svg('text', { class: 'gnode__kind', x: 26, y: 18 }); kind.textContent = KIND_LABEL[n.kind].toUpperCase(); g.appendChild(kind);
    const label = svg('text', { class: 'gnode__label', x: 14, y: 36 }); label.textContent = trunc(n.label); g.appendChild(label);
    if (n.kind === 'stage') {
      const pr = stageProgress(stage(n.id));
      const t = svg('text', { class: 'gnode__prog', x: NW - 16, y: 18, 'text-anchor': 'end' }); t.textContent = `${pr.done}/${pr.total}`; g.appendChild(t);
      g.appendChild(svg('rect', { class: 'gnode__bar-bg', x: 14, y: NH - 7, width: NW - 28, height: 3, rx: 1.5 }));
      if (pr.done) g.appendChild(svg('rect', { class: 'gnode__bar', x: 14, y: NH - 7, width: (NW - 28) * pr.done / pr.total, height: 3, rx: 1.5 }));
    }
    const tt = svg('title'); tt.textContent = n.label; g.appendChild(tt);
    g.addEventListener('keydown', ev => {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); select(n.id, false); return; }
      const m: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (ev.shiftKey && m[ev.key]) { ev.preventDefault(); ev.stopPropagation(); pushUndo(); moveNode(n.id, p.x + m[ev.key][0] * 16, p.y + m[ev.key][1] * 16); commitMove(); }
    });
    return g;
  }

  /** Update one card and every link attached to it while it is being dragged. */
  function moveNode(id: string, x: number, y: number) {
    const p = L.placed.get(id); if (!p) return;
    p.x = Math.round(x); p.y = Math.round(y);
    nodeEls.get(id)?.setAttribute('transform', `translate(${p.x} ${p.y})`);
    (byNode.get(id) || []).forEach(i => {
      const e = L.edges[i], d = edgePath(L.placed.get(e.from)!, L.placed.get(e.to)!);
      edgeEls[i].setAttribute('d', d); pulseEls.get(i)?.setAttribute('d', d);
    });
    scheduleMini();
  }
  function commitMove() {
    if (ui.focus) L.placed.forEach((p, id) => focusPos.set(id, [p.x, p.y]));
    else { const ov = overrides(); L.placed.forEach((p, id) => { ov[id] = [p.x, p.y]; }); persist(); }
    measure(L); drawMini(); syncUndoButtons();
  }
  const snapshot = () => JSON.stringify([...L.placed].map(([id, p]) => [id, p.x, p.y]));
  function pushUndo() { undo.push(snapshot()); if (undo.length > 30) undo.shift(); redo.length = 0; }
  function restore(s: string) {
    (JSON.parse(s) as [string, number, number][]).forEach(([id, x, y]) => moveNode(id, x, y));
    commitMove();
  }

  // pulses: a travelling dash on every lit link, from source card to target card
  function refreshPulses() {
    const pg = world?.querySelector('.graph-pulses'); if (!pg) return;
    clear(pg as unknown as HTMLElement); pulseEls = new Map();
    if (reducedMotion()) return;
    let n = 0;
    L.edges.forEach((e, i) => {
      if (n >= 36 || !edgeEls[i]?.classList.contains('is-lit')) return;
      const p = svg('path', { d: edgeEls[i].getAttribute('d')!, class: `gpulse gpulse--${e.rel}`, pathLength: 100 }) as SVGPathElement;
      pg.appendChild(p); pulseEls.set(i, p); n++;
    });
  }

  function restyle() {
    if (ui.mode !== 'graph' || !svgRoot) return;
    const lit = litSet();
    nodeEls.forEach((g, id) => { g.setAttribute('class', nodeClasses(id)); g.setAttribute('aria-pressed', String(ui.selected === id)); });
    L.edges.forEach((e, i) => { const cls = edgeClass(e, lit); edgeEls[i]?.setAttribute('class', cls); edgeEls[i]?.setAttribute('marker-end', `url(#${cls.includes('is-lit') ? 'arrl-' : 'arr-'}${e.rel})`); });
    refreshPulses();
    // lit cards and links rise above the dimmed ones
    const ng = world?.querySelector('.graph-nodes');
    if (ng) nodeEls.forEach(g => { if (g.classList.contains('is-selected')) ng.appendChild(g); });
    drawMini();
  }

  // ── floating toolbar, legend and overview map ───────────────────────────
  let undoBtn: HTMLButtonElement, redoBtn: HTMLButtonElement;
  function syncUndoButtons() { if (undoBtn) undoBtn.disabled = !undo.length; if (redoBtn) redoBtn.disabled = !redo.length; }
  function buildBar(): HTMLElement {
    const btn = (label: string, ic: string, fn: () => void, extra: Record<string, unknown> = {}) =>
      h('button.icon-btn', { 'aria-label': label, title: label, onclick: fn, ...extra }, icon(ic, 20)) as HTMLButtonElement;
    zoomLabel = h('span.graph-zoom', { 'aria-hidden': 'true' }, Math.round(ui.view.k * 100) + '%');
    undoBtn = btn('Undo move', 'a-undo', () => { const s = undo.pop(); if (!s) return; redo.push(snapshot()); restore(s); sfx('toggle'); }, { disabled: true });
    redoBtn = btn('Redo move', 'a-redo', () => { const s = redo.pop(); if (!s) return; undo.push(snapshot()); restore(s); sfx('toggle'); }, { disabled: true });
    const seg = (label: string, pressed: boolean, fn: () => void) => h('button.bar-btn', { 'aria-pressed': String(pressed), onclick: fn }, label);
    const arrange = h('div.bar-group', { role: 'group', 'aria-label': 'Arrange cards' },
      seg('By stage', ui.layout === 'stage' && !ui.focus, () => { ui.layout = 'stage'; ui.focus = false; persist(); sfx('toggle'); drawGraph(); showPanel(); }),
      seg('By type', ui.layout === 'type' && !ui.focus, () => { ui.layout = 'type'; ui.focus = false; persist(); sfx('toggle'); drawGraph(); showPanel(); }));
    const links = h('div.bar-group.bar-group--links', { role: 'group', 'aria-label': 'Which links to draw' },
      (['smart', 'all', 'off'] as LinkMode[]).map(m => seg({ smart: 'Smart', all: 'All', off: 'None' }[m], ui.links === m, () => { ui.links = m; persist(); sfx('toggle'); syncBar(links, m); restyle(); })));
    const focusBtn = h('button.bar-btn.bar-btn--focus', { 'aria-pressed': String(ui.focus), title: 'Show only the selected card and what it connects to',
      onclick: () => { ui.focus = !ui.focus; focusPos.clear(); sfx('toggle'); drawGraph(); showPanel(); } }, icon('a-target', 16), ' Focus');
    const tidy = h('button.bar-btn', { title: 'Put every card back in its tidy place', 'aria-label': 'Tidy up', onclick: () => {
      if (ui.focus) focusPos.clear(); else { pushUndo(); ui.pos[ui.layout] = {}; persist(); }
      sfx('reveal'); drawGraph();
    } }, icon('a-arrange', 18));
    syncUndoButtons();
    return h('div.graph-bar', { role: 'toolbar', 'aria-label': 'Graph tools' },
      h('div.bar-group', null, btn('Zoom out', 'a-minus', () => zoom(0.8)), zoomLabel, btn('Zoom in', 'a-plus', () => zoom(1.25)), btn('Fit to view', 'a-fit', fit)),
      h('span.bar-sep', { 'aria-hidden': 'true' }), arrange, tidy,
      h('span.bar-sep', { 'aria-hidden': 'true' }), links, focusBtn,
      h('span.bar-sep.bar-sep--history', { 'aria-hidden': 'true' }), h('div.bar-group.bar-group--history', null, undoBtn, redoBtn));
  }
  function syncBar(group: HTMLElement, m: LinkMode) {
    const order: LinkMode[] = ['smart', 'all', 'off'];
    group.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(order[i] === m)));
  }
  function buildLegend(): HTMLElement {
    return h('div.graph-legend', { 'aria-label': 'Relationship colours' }, RELS.map(r => h('span', null, h(`i.rel-swatch.rel-swatch--${r}`), REL_LABEL[r])));
  }

  let miniQueued = false;
  function scheduleMini() { if (miniQueued) return; miniQueued = true; requestAnimationFrame(() => { miniQueued = false; drawMini(); }); }
  function buildMini(): HTMLElement {
    miniSvg = svg('svg', { class: 'graph-mini__svg', 'aria-hidden': 'true' }) as SVGSVGElement;
    const wrapEl = h('div.graph-mini', null, h('span.graph-mini__label', null, 'Overview'), miniSvg);
    const go = (e: PointerEvent) => {
      const m = miniSvg!.getScreenCTM(); if (!m || !svgRoot) return;
      const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()), r = svgRoot.getBoundingClientRect();
      ui.view.x = r.width / 2 - pt.x * ui.view.k; ui.view.y = r.height / 2 - pt.y * ui.view.k; applyView();
    };
    let down = false;
    miniSvg.addEventListener('pointerdown', e => { down = true; miniSvg!.setPointerCapture(e.pointerId); go(e); });
    miniSvg.addEventListener('pointermove', e => { if (down) go(e); });
    miniSvg.addEventListener('pointerup', () => { down = false; });
    miniSvg.addEventListener('pointercancel', () => { down = false; });
    return wrapEl;
  }
  function drawMini() {
    if (!miniSvg) return;
    const pad = 40;
    miniSvg.setAttribute('viewBox', `${-pad} ${-pad} ${L.w + pad * 2} ${L.h + pad * 2}`);
    miniSvg.innerHTML = '';
    L.frames.forEach(f => miniSvg!.appendChild(svg('rect', { x: f.x, y: f.y, width: f.w, height: f.h, rx: 22, class: 'mini-frame' })));
    const sel = litSet();
    L.placed.forEach(p => miniSvg!.appendChild(svg('rect', { x: p.x, y: p.y, width: NW, height: NH, rx: 12, class: `mini-node mini-node--${p.n.kind}${ui.selected === p.n.id ? ' is-selected' : ''}${sel && !sel.has(p.n.id) ? ' is-dim' : ''}` })));
    miniSvg.appendChild(svg('rect', { class: 'mini-view', x: 0, y: 0, width: 10, height: 10 }));
    drawMiniView();
  }
  function drawMiniView() {
    const v = miniSvg?.querySelector('.mini-view'); if (!v || !svgRoot) return;
    const r = svgRoot.getBoundingClientRect(), k = ui.view.k;
    v.setAttribute('x', String(-ui.view.x / k)); v.setAttribute('y', String(-ui.view.y / k));
    v.setAttribute('width', String(r.width / k)); v.setAttribute('height', String(r.height / k));
  }

  // ── pointer: drag cards, pan the board, pinch to zoom ───────────────────
  function attachPointer() {
    const sv = svgRoot!;
    type Drag = { type: 'pan'; x: number; y: number; vx: number; vy: number } | { type: 'node'; id: string; x: number; y: number; ox: number; oy: number; moved: boolean };
    let drag: Drag | null = null, pinch: null | { d: number; k: number } = null;
    const pts = new Map<number, { x: number; y: number }>();
    const dist = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };

    sv.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { sv.setPointerCapture(e.pointerId); } catch { /* synthetic or already-released pointer */ }
      if (pts.size === 2) { pinch = { d: dist(), k: ui.view.k }; drag = null; sv.classList.remove('is-panning'); return; }
      if (pts.size > 2) return;
      const g = (e.target as Element).closest('.gnode') as SVGGElement | null;
      if (g) {
        const p = L.placed.get(g.dataset.id!)!;
        drag = { type: 'node', id: p.n.id, x: e.clientX, y: e.clientY, ox: p.x, oy: p.y, moved: false };
      } else { drag = { type: 'pan', x: e.clientX, y: e.clientY, vx: ui.view.x, vy: ui.view.y }; sv.classList.add('is-panning'); }
    });
    sv.addEventListener('pointermove', e => {
      if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pts.size === 2) {
        const r = sv.getBoundingClientRect(), [a, b] = [...pts.values()];
        zoom((pinch.k * dist() / pinch.d) / ui.view.k, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      } else if (drag?.type === 'pan') { ui.view.x = drag.vx + e.clientX - drag.x; ui.view.y = drag.vy + e.clientY - drag.y; applyView(); }
      else if (drag?.type === 'node') {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) > 4) { drag.moved = true; pushUndo(); nodeEls.get(drag.id)?.classList.add('is-dragging'); sv.classList.add('is-dragging'); }
        if (drag.moved) moveNode(drag.id, drag.ox + dx / ui.view.k, drag.oy + dy / ui.view.k);
      } else if (e.pointerType === 'mouse' && !pts.size) hoverFrom(e.target as Element);
    });
    const end = (e: PointerEvent) => {
      const d = drag;
      if (d?.type === 'node') {
        nodeEls.get(d.id)?.classList.remove('is-dragging'); sv.classList.remove('is-dragging');
        if (d.moved) { commitMove(); sfx('select'); } else select(d.id, false);
      } else if (d?.type === 'pan' && !pinch && Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) < 6 && ui.selected) {
        ui.selected = ''; ui.highlight = null; if (ui.focus) { ui.focus = false; drawGraph(); } else restyle(); showPanel();
      }
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (!pts.size) { drag = null; sv.classList.remove('is-panning'); }
    };
    sv.addEventListener('pointerup', end);
    sv.addEventListener('pointercancel', end);
    sv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && ui.hover) { ui.hover = ''; restyle(); } });
    sv.addEventListener('wheel', e => { e.preventDefault(); const r = sv.getBoundingClientRect(); zoom(e.deltaY < 0 ? 1.1 : 0.9, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    sv.addEventListener('keydown', e => {
      if ((e.target as Element) !== sv) return;
      const step = 60, m: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
      if (m[e.key]) { e.preventDefault(); ui.view.x += m[e.key][0]; ui.view.y += m[e.key][1]; applyView(); }
      if (e.key === '+' || e.key === '=') zoom(1.2); if (e.key === '-') zoom(0.83); if (e.key === '0') fit();
    });
  }
  // hovering a card (mouse only) previews its links when nothing is selected
  let hoverQueued = false;
  function hoverFrom(target: Element) {
    const id = (target.closest('.gnode') as SVGGElement | null)?.dataset.id || '';
    if (id === ui.hover || ui.selected) return;
    ui.hover = id;
    if (hoverQueued) return; hoverQueued = true;
    requestAnimationFrame(() => { hoverQueued = false; restyle(); });
  }

  function drawList() {
    clear(stageEl);
    const groups = h('div.graph-list');
    D.stages.forEach(s => {
      const ns = [...graph.nodes.values()].filter(n => n.home === s.num && ui.kinds.has(n.kind))
        .sort((a, b) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind) || a.label.localeCompare(b.label));
      groups.append(h('details.graph-list__group', { open: s.num === 1 || ns.some(n => n.id === ui.selected) },
        h('summary', null, h('b', null, `${String(s.num).padStart(2, '0')} ${s.title}`), h('span.c-tertiary', null, ` · ${ns.length} nodes`)),
        h('ul', null, ns.map(n => h('li', null, h(`button.graph-list__node.gnode-chip--${n.kind}`, { 'aria-pressed': ui.selected === n.id, onclick: () => select(n.id, false) },
          h('span.kind-dot', { 'aria-hidden': 'true' }), h('span.c-tertiary.graph-list__kind', null, KIND_LABEL[n.kind]), ' ', n.label))))));
    });
    stageEl.append(groups);
  }

  function relList(title: string, es: GraphEdge[], dir: 'out' | 'in') {
    if (!es.length) return null;
    const by = new Map<Relation, GraphEdge[]>();
    es.forEach(e => by.set(e.rel, [...(by.get(e.rel) || []), e]));
    return h('div.rel-block', null, h('div.eyebrow', null, title),
      [...by.entries()].map(([rel, xs]) => h('div.rel-group', null,
        h('span.rel-name', null, h(`i.rel-swatch.rel-swatch--${rel}`), dir === 'out' ? REL_LABEL[rel] : `${REL_LABEL[rel]} ←`),
        h('ul', null, xs.map(e => { const id = dir === 'out' ? e.to : e.from; const n = graph.nodes.get(id)!;
          return h('li', null, h('button.link-btn', { onclick: () => { ui.kinds.add(n.kind); select(id, true); } }, n.label), h('span.c-tertiary', null, ` · ${KIND_LABEL[n.kind]}`)); })))));
  }

  function showPanel() {
    clear(panel);
    panel.classList.toggle('has-sel', !!ui.selected);
    if (!ui.selected) {
      panel.append(h('div.stack', null, h('div.eyebrow', null, 'Node details'),
        h('p.ts-body-sm.c-secondary', null, 'Select any node. Its neighbours light up; the panel lists every relationship, with links to the full explanation and the official source.'),
        h('div.callout.callout--oat', null, h('div.callout__title', null, icon('a-route', 18), 'Try a path'),
          h('p.ts-body-sm', null, 'Select “Double-blind peer review” or “Figure resolution and captions”, then choose “Path from Stage 01”.'))));
      return;
    }
    const n = graph.nodes.get(ui.selected)!;
    const nb = neighbours(n.id);
    const r = n.kind === 'requirement' ? req(n.id) : null;
    panel.append(h('div.stack', null,
      h('div.row', { style: 'justify-content: space-between' }, h('span.eyebrow', null, KIND_LABEL[n.kind]),
        h('button.icon-btn', { 'aria-label': 'Clear selection', onclick: () => { ui.selected = ''; ui.highlight = null; const was = ui.focus; ui.focus = false; if (ui.mode === 'graph') { was ? drawGraph() : restyle(); } showPanel(); if (ui.mode === 'list') drawList(); } }, icon('i-x', 18))),
      h('h2.ts-heading-md', null, n.label),
      r ? h('div.row', { style: '--row-gap: 6px' }, guidanceBadge('official'), statusBadge(r.status)) : null,
      n.detail ? h('p.ts-body-sm', null, n.detail) : null,
      h('div.row', { style: '--row-gap: 8px' },
        h('a.btn.btn--outline.btn--sm', { href: routeFor(n.id) }, 'Open full page'),
        h('button.btn.btn--ghost.btn--sm', { onclick: () => { const p = pathFromStart(n.id); ui.highlight = { kind: 'path', ids: new Set(p) }; refresh(); showPanel(); sfx('reveal'); } }, icon('a-route', 16), 'Path from Stage 01'),
        h('button.btn.btn--ghost.btn--sm', { onclick: () => { const d = dependencies(n.id); d.forEach(id => ui.kinds.add(graph.nodes.get(id)!.kind)); ui.highlight = { kind: 'deps', ids: d }; rerender(); } }, icon('a-checklist', 16), 'Everything it needs')),
      ui.highlight ? highlightInfo() : null,
      relList('Outgoing', nb.out, 'out'),
      relList('Incoming', nb.in, 'in')));
  }
  function highlightInfo() {
    const ids = [...ui.highlight!.ids];
    if (ui.highlight!.kind === 'path') return ids.length ? h('div.callout.callout--teal', null, h('div.callout__title', null, icon('a-route', 18), `Shortest path: ${ids.length - 1} step${ids.length === 2 ? '' : 's'}`),
      h('ol.path-steps', null, ids.map(id => h('li', null, graph.nodes.get(id)?.label || id))))
      : h('p.ts-body-sm.c-secondary', null, 'No forward path from Stage 01 reaches this node (it is a source or an explanation, not a step).');
    return h('div.callout.callout--teal', null, h('div.callout__title', null, icon('a-checklist', 18), `${ids.length} prerequisites`),
      h('p.ts-body-sm', null, ids.length ? 'Everything this node requires or depends on, transitively, is highlighted.' : 'This node requires nothing else.'));
  }

  function refresh() { if (ui.mode !== 'graph') return; if (ui.focus) { focusPos.clear(); drawGraph(); } else restyle(); }

  function select(id: string, recentre: boolean) {
    if (ui.selected !== id) ui.highlight = null;
    ui.selected = id;
    if (ui.mode === 'graph') { if (ui.focus || !L.placed.has(id)) { focusPos.clear(); drawGraph(); } else restyle(); }
    showPanel();
    if (ui.mode === 'list') drawList();
    if (recentre) center(id);
    history.replaceState(null, '', `#/explore?focus=${id}`);
    sfx('select');
    if (matchMedia('(max-width: 991px)').matches) panel.scrollTop = 0; // on phones the panel is a bottom sheet
  }

  function rerender() {
    clear(root); renderExplore(root, [], new URLSearchParams(ui.selected ? `focus=${ui.selected}` : ''));
  }

  if (ui.mode === 'graph') drawGraph(); else drawList();
  showPanel();
  return { keep: true }; // the graph keeps its own pan/zoom state; progress changes elsewhere re-render on next visit
}
