// Explore: the publication knowledge graph. Same data model as the journey; stage nodes show live progress.
// SVG rendering with pan, zoom, fit, search, kind/relation filters, dependency paths and a list view.
import { h, icon, svg, clear, reducedMotion } from '../lib/dom.js';
import { graph, neighbours, pathFromStart, dependencies, routeFor, REL_LABEL, KIND_LABEL, stage, stageProgress, conflict, D, type GNode } from '../lib/model.js';
import { guidanceBadge, statusBadge, sfx } from '../lib/ui.js';
import { req } from '../lib/model.js';
import type { NodeKind, Relation, GraphEdge } from '../types.js';

const KINDS: NodeKind[] = ['stage', 'process', 'artifact', 'section', 'requirement', 'conflict', 'document', 'tool', 'source'];
const RELS = Object.keys(REL_LABEL) as Relation[];
const NW = 200, NH = 44, COLW = 248, ROWH = 58, PAD = 40;

const ui = {
  kinds: new Set<NodeKind>(['stage', 'process', 'artifact', 'section', 'requirement', 'conflict', 'document']),
  rels: new Set<Relation>(RELS),
  mode: (matchMedia('(max-width: 768px)').matches ? 'list' : 'graph') as 'graph' | 'list',
  selected: '' as string,
  highlight: null as null | { kind: 'path' | 'deps'; ids: Set<string> },
  view: { x: 0, y: 0, k: 0.8 },
};

interface Placed { n: GNode; x: number; y: number }

function layout(): { placed: Map<string, Placed>; edges: GraphEdge[]; w: number; h: number } {
  const vis = [...graph.nodes.values()].filter(n => ui.kinds.has(n.kind));
  const cols = new Map<number, GNode[]>();
  vis.forEach(n => { const c = cols.get(n.home) || []; c.push(n); cols.set(n.home, c); });
  const placed = new Map<string, Placed>();
  let maxRows = 0;
  [...cols.keys()].sort((a, b) => a - b).forEach((home, ci) => {
    const ns = cols.get(home)!.sort((a, b) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind) || a.label.localeCompare(b.label));
    ns.forEach((n, ri) => placed.set(n.id, { n, x: PAD + ci * COLW, y: PAD + ri * ROWH + (n.kind === 'stage' ? 0 : 18) }));
    maxRows = Math.max(maxRows, ns.length);
  });
  const edges = graph.edges.filter(e => placed.has(e.from) && placed.has(e.to) && ui.rels.has(e.rel));
  return { placed, edges, w: PAD * 2 + cols.size * COLW, h: PAD * 2 + maxRows * ROWH + 18 };
}

function edgePath(a: Placed, b: Placed): string {
  const ax = a.x + NW, ay = a.y + NH / 2, bx = b.x, by = b.y + NH / 2;
  if (Math.abs(a.x - b.x) < 1) { // same column: loop out to the right
    const x = a.x + NW, bend = 36 + Math.min(80, Math.abs(ay - by) / 6);
    return `M${x} ${ay} C${x + bend} ${ay}, ${x + bend} ${by}, ${x} ${by}`;
  }
  if (b.x < a.x) { // backwards: leave from the left, enter from the right
    const sx = a.x, ex = b.x + NW, dx = Math.max(40, (sx - ex) / 2);
    return `M${sx} ${ay} C${sx - dx} ${ay}, ${ex + dx} ${by}, ${ex} ${by}`;
  }
  const dx = Math.max(40, (bx - ax) / 2);
  return `M${ax} ${ay} C${ax + dx} ${ay}, ${bx - dx} ${by}, ${bx} ${by}`;
}

const trunc = (s: string, n = 28) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

export function renderExplore(root: HTMLElement, _p: string[], query: URLSearchParams) {
  const focus = query.get('focus');
  if (focus && graph.nodes.has(focus)) {
    ui.kinds.add(graph.nodes.get(focus)!.kind);
    if (ui.selected !== focus) ui.highlight = null;
    ui.selected = focus;
  } else if (!focus) { ui.selected = ''; ui.highlight = null; }

  const wrap = h('div.explore');
  root.append(wrap);
  const head = h('header.explore-head', null,
    h('div.kicker.kicker--purple', null, 'Explore'),
    h('h1.ts-heading-2xl', null, 'Every ARO rule, connected to where it applies'),
    h('p.ts-body-sm.c-secondary', null, `${graph.nodes.size} nodes and ${graph.edges.length} relationships from the same data as the journey. Select a node to see what it requires, what explains it, and how you get there from Stage 01.`));

  const searchIn = h('input.input.graph-search', { type: 'search', placeholder: 'Find a node…', 'aria-label': 'Find a node in the graph', list: 'graph-nodes' }) as HTMLInputElement;
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

  const toolbar = h('div.explore-toolbar', null, h('div.row', null, searchIn, dl, relSel, modeSeg), kindChips);
  const stageEl = h('div.explore-stage');
  const panel = h('aside.explore-panel', { 'aria-live': 'polite', 'aria-label': 'Node details' });
  wrap.append(head, toolbar, h('div.explore-body', null, stageEl, panel));

  let svgRoot: SVGSVGElement | null = null, world: SVGGElement | null = null, L = layout();

  function applyView() { world?.setAttribute('transform', `translate(${ui.view.x} ${ui.view.y}) scale(${ui.view.k})`); }
  function fit() {
    if (!svgRoot) return;
    const r = svgRoot.getBoundingClientRect();
    const k = Math.min(1.1, Math.max(0.25, Math.min(r.width / L.w, r.height / L.h)));
    ui.view = { k, x: (r.width - L.w * k) / 2, y: Math.max(0, (r.height - L.h * k) / 2) };
    applyView();
  }
  // first view: legible labels, anchored at the top-left (Stage 01); 'Fit to view' still shows everything
  function readable() {
    if (!svgRoot) return;
    const r = svgRoot.getBoundingClientRect();
    const k = Math.max(0.7, Math.min(1, r.width / L.w));
    ui.view = { k, x: k * L.w < r.width ? (r.width - L.w * k) / 2 : 8, y: 8 };
    applyView();
  }
  function zoom(f: number, cx?: number, cy?: number) {
    if (!svgRoot) return;
    const r = svgRoot.getBoundingClientRect();
    cx ??= r.width / 2; cy ??= r.height / 2;
    const k = Math.min(2.5, Math.max(0.2, ui.view.k * f));
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
  function litSet(): Set<string> | null {
    if (ui.highlight) return new Set([...ui.highlight.ids, ui.selected]);
    if (!ui.selected) return null;
    const nb = neighbours(ui.selected);
    return new Set([ui.selected, ...nb.out.map(e => e.to), ...nb.in.map(e => e.from)]);
  }
  function edgeLit(e: GraphEdge, lit: Set<string> | null) {
    if (!lit) return '';
    if (ui.highlight?.kind === 'path') {
      const ids = [...ui.highlight.ids]; const i = ids.indexOf(e.from);
      return i >= 0 && ids[i + 1] === e.to ? 'is-lit' : 'is-dim';
    }
    if (ui.highlight) return ui.highlight.ids.has(e.to) && (ui.highlight.ids.has(e.from) || e.from === ui.selected) ? 'is-lit' : 'is-dim';
    return e.from === ui.selected || e.to === ui.selected ? 'is-lit' : 'is-dim';
  }

  function drawGraph() {
    clear(stageEl);
    L = layout();
    svgRoot = svg('svg', { class: 'graph-svg', role: 'application', 'aria-label': 'Publication knowledge graph. Use Tab to move between nodes and Enter to select.', tabindex: '0' }) as SVGSVGElement;
    const defs = svg('defs');
    RELS.forEach(r => defs.appendChild(svg('marker', { id: 'arr-' + r, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' },
      svg('path', { d: 'M0 1 L9 5 L0 9 z', class: 'arrow arrow--' + r }))));
    svgRoot.appendChild(defs);
    world = svg('g', { class: 'graph-world' }) as SVGGElement;
    // stage column guides
    const colsSeen = new Set<number>();
    L.placed.forEach(p => { if (!colsSeen.has(p.x)) { colsSeen.add(p.x); world!.appendChild(svg('rect', { x: p.x - 14, y: PAD - 16, width: NW + 28, height: L.h - PAD, rx: 20, class: 'graph-col' })); } });
    const lit = litSet();
    const eg = svg('g', { class: 'graph-edges' });
    L.edges.forEach(e => {
      const a = L.placed.get(e.from)!, b = L.placed.get(e.to)!;
      const path = svg('path', { d: edgePath(a, b), class: `gedge gedge--${e.rel} ${edgeLit(e, lit)}`, 'marker-end': `url(#arr-${e.rel})` });
      const t = svg('title'); t.textContent = `${a.n.label} → ${REL_LABEL[e.rel]} → ${b.n.label}`; path.appendChild(t);
      eg.appendChild(path);
    });
    world.appendChild(eg);
    const ng = svg('g', { class: 'graph-nodes' });
    L.placed.forEach(p => {
      const g = svg('g', { class: nodeClasses(p.n.id), transform: `translate(${p.x} ${p.y})`, tabindex: '0', role: 'button', 'data-id': p.n.id,
        'aria-label': `${KIND_LABEL[p.n.kind]}: ${p.n.label}`, 'aria-pressed': String(ui.selected === p.n.id) });
      g.appendChild(svg('rect', { class: 'gnode__lip', x: 0, y: 3, width: NW, height: NH, rx: p.n.kind === 'stage' || p.n.kind === 'process' ? NH / 2 : 12 }));
      g.appendChild(svg('rect', { class: 'gnode__box', x: 0, y: 0, width: NW, height: NH, rx: p.n.kind === 'stage' || p.n.kind === 'process' ? NH / 2 : 12 }));
      const kind = svg('text', { class: 'gnode__kind', x: 14, y: 16 }); kind.textContent = KIND_LABEL[p.n.kind].toUpperCase(); g.appendChild(kind);
      const label = svg('text', { class: 'gnode__label', x: 14, y: 33 }); label.textContent = trunc(p.n.label); g.appendChild(label);
      if (p.n.kind === 'stage') {
        const pr = stageProgress(stage(p.n.id));
        const t = svg('text', { class: 'gnode__prog', x: NW - 14, y: 16, 'text-anchor': 'end' }); t.textContent = `${pr.done}/${pr.total}`; g.appendChild(t);
      }
      const tt = svg('title'); tt.textContent = p.n.label; g.appendChild(tt);
      g.addEventListener('click', ev => { ev.stopPropagation(); select(p.n.id, false); });
      g.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); select(p.n.id, false); } });
      ng.appendChild(g);
    });
    world.appendChild(ng);
    svgRoot.appendChild(world);

    const controls = h('div.graph-controls', { role: 'toolbar', 'aria-label': 'Zoom' },
      h('button.icon-btn', { 'aria-label': 'Zoom in', onclick: () => zoom(1.25) }, icon('a-plus', 20)),
      h('button.icon-btn', { 'aria-label': 'Zoom out', onclick: () => zoom(0.8) }, icon('a-minus', 20)),
      h('button.icon-btn', { 'aria-label': 'Fit to view', onclick: fit }, icon('a-fit', 20)));
    const legendEl = h('div.graph-legend', { 'aria-label': 'Relationship colours' }, RELS.map(r => h('span', null, h(`i.rel-swatch.rel-swatch--${r}`), REL_LABEL[r])));
    stageEl.append(svgRoot, controls, legendEl);

    // pan & zoom
    let drag: null | { x: number; y: number; vx: number; vy: number } = null;
    svgRoot.addEventListener('pointerdown', e => { if ((e.target as Element).closest('.gnode')) return; drag = { x: e.clientX, y: e.clientY, vx: ui.view.x, vy: ui.view.y }; svgRoot!.setPointerCapture(e.pointerId); svgRoot!.classList.add('is-panning'); });
    svgRoot.addEventListener('pointermove', e => { if (!drag) return; ui.view.x = drag.vx + e.clientX - drag.x; ui.view.y = drag.vy + e.clientY - drag.y; applyView(); });
    svgRoot.addEventListener('pointerup', e => { if (drag && Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) < 4 && !(e.target as Element).closest('.gnode')) { ui.selected = ''; ui.highlight = null; restyle(); showPanel(); } drag = null; svgRoot!.classList.remove('is-panning'); });
    svgRoot.addEventListener('wheel', e => { e.preventDefault(); const r = svgRoot!.getBoundingClientRect(); zoom(e.deltaY < 0 ? 1.1 : 0.9, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    svgRoot.addEventListener('keydown', e => {
      if ((e.target as Element) !== svgRoot) return;
      const step = 60, m: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
      if (m[e.key]) { e.preventDefault(); ui.view.x += m[e.key][0]; ui.view.y += m[e.key][1]; applyView(); }
      if (e.key === '+' || e.key === '=') zoom(1.2); if (e.key === '-') zoom(0.83); if (e.key === '0') fit();
    });
    requestAnimationFrame(() => { readable(); if (ui.selected) center(ui.selected); });
  }

  function restyle() {
    if (ui.mode !== 'graph' || !svgRoot) return;
    const lit = litSet();
    svgRoot.querySelectorAll<SVGGElement>('.gnode').forEach(g => { g.setAttribute('class', nodeClasses(g.dataset.id!)); g.setAttribute('aria-pressed', String(ui.selected === g.dataset.id)); });
    const paths = svgRoot.querySelectorAll('.gedge');
    L.edges.forEach((e, i) => paths[i]?.setAttribute('class', `gedge gedge--${e.rel} ${edgeLit(e, lit)}`));
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
        h('button.icon-btn', { 'aria-label': 'Clear selection', onclick: () => { ui.selected = ''; ui.highlight = null; restyle(); showPanel(); if (ui.mode === 'list') drawList(); } }, icon('i-x', 18))),
      h('h2.ts-heading-md', null, n.label),
      r ? h('div.row', { style: '--row-gap: 6px' }, guidanceBadge('official'), statusBadge(r.status)) : null,
      n.detail ? h('p.ts-body-sm', null, n.detail) : null,
      h('div.row', { style: '--row-gap: 8px' },
        h('a.btn.btn--outline.btn--sm', { href: routeFor(n.id) }, 'Open full page'),
        h('button.btn.btn--ghost.btn--sm', { onclick: () => { const p = pathFromStart(n.id); ui.highlight = { kind: 'path', ids: new Set(p) }; restyle(); showPanel(); sfx('reveal'); } }, icon('a-route', 16), 'Path from Stage 01'),
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

  function select(id: string, recentre: boolean) {
    if (ui.selected !== id) ui.highlight = null;
    ui.selected = id;
    if (!L.placed.has(id) && ui.mode === 'graph') { drawGraph(); }
    restyle(); showPanel();
    if (ui.mode === 'list') drawList();
    if (recentre) center(id);
    history.replaceState(null, '', `#/explore?focus=${id}`);
    sfx('select');
    if (matchMedia('(max-width: 991px)').matches) panel.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
  }

  function rerender() {
    clear(root); renderExplore(root, [], new URLSearchParams(ui.selected ? `focus=${ui.selected}` : ''));
  }

  if (ui.mode === 'graph') drawGraph(); else drawList();
  showPanel();
  return { keep: true }; // the graph keeps its own pan/zoom state; progress changes elsewhere re-render on next visit
}
