// Indexes over the data plus derived state: checklist status, stage progress and the knowledge graph.
// The journey, graph, handbook, readiness dashboard and search all read from here, so they agree.
import { DATA } from '../generated/data.js';
import { store } from './store.js';
export const D = DATA;
const index = (xs) => new Map(xs.map(x => [x.id, x]));
export const sources = index(D.sources);
export const reqs = index(D.requirements);
export const conflicts = index(D.conflicts);
export const resources = index(D.resources);
export const stages = index(D.stages);
export const sections = index(D.research.sections);
export const topics = index(D.handbook);
export const src = (id) => sources.get(id);
export const req = (id) => reqs.get(id);
export const conflict = (id) => conflicts.get(id);
export const res = (id) => resources.get(id);
export const stage = (id) => stages.get(id);
export const allChecks = D.stages.flatMap(s => s.checklist.map(item => ({ item, stage: s })));
const checkIndex = new Map(allChecks.map(c => [c.item.id, c]));
export const check = (id) => checkIndex.get(id);
/** done = ticked; blocked = depends on unticked items; awaiting = needs an answer from the editorial office; open = ready to do. */
export function checkStatus(item) {
    if (store.isChecked(item.id))
        return 'done';
    if ((item.dependsOn || []).some(d => !store.isChecked(d)))
        return 'blocked';
    if (item.conflict && conflict(item.conflict).status === 'unresolved' && !store.get().confirmed[item.conflict])
        return 'awaiting';
    return 'open';
}
export const blockers = (item) => (item.dependsOn || []).filter(d => !store.isChecked(d)).map(d => check(d));
export function stageProgress(s) {
    const done = s.checklist.filter(c => store.isChecked(c.id)).length;
    return { done, total: s.checklist.length, pct: s.checklist.length ? done / s.checklist.length : 0 };
}
export function overallProgress() {
    const done = allChecks.filter(c => store.isChecked(c.item.id)).length;
    return { done, total: allChecks.length, pct: done / allChecks.length };
}
/** The recommended stage: the first one, in order, with unticked items. */
export function currentStage() {
    return D.stages.find(s => stageProgress(s).done < s.checklist.length) || null;
}
export function unmetPrereqs(s) {
    return s.prerequisites.map(stage).filter(p => stageProgress(p).done < p.checklist.length);
}
export const stageLabel = (s) => `Stage ${String(s.num).padStart(2, '0')}: ${s.title}`;
export const reqsForTopic = (t) => D.requirements.filter(r => r.topic === t);
export const reqsForStage = (s) => D.requirements.filter(r => r.stages.includes(s));
export const REL_LABEL = {
    requires: 'requires', depends_on: 'depends on', explained_by: 'explained by', downloaded_from: 'downloaded from',
    submitted_during: 'submitted during', reviewed_under: 'reviewed under', leads_to: 'leads to', conflicts_with: 'conflicts with',
};
export const KIND_LABEL = {
    stage: 'Stage', requirement: 'Requirement', conflict: 'Open question', source: 'Official page', document: 'Document',
    tool: 'Tool', section: 'Manuscript section', process: 'Editorial process', artifact: 'Submission artifact',
};
function buildGraph() {
    const nodes = new Map();
    const stageNum = (id) => (id ? stage(id)?.num : 1) || 1;
    const add = (n, home) => nodes.set(n.id, { ...n, home });
    // a resource that is just a web page or portal is the same thing as its source page
    const alias = (id) => { const r = resources.get(id); return r && (r.kind === 'page' || r.kind === 'portal') ? r.source : id; };
    D.stages.forEach(s => add({ id: s.id, kind: 'stage', label: `${String(s.num).padStart(2, '0')} ${s.title}`, detail: s.short }, s.num));
    D.requirements.forEach(r => add({ id: r.id, kind: 'requirement', label: r.title, detail: r.rule }, stageNum(r.stages[0])));
    D.conflicts.forEach(c => add({ id: c.id, kind: 'conflict', label: c.title, detail: c.recommendation }, stageNum(req(c.affects[0]).stages[0])));
    D.resources.filter(r => r.kind === 'download' || r.kind === 'tool').forEach(r => add({ id: r.id, kind: r.kind === 'download' ? 'document' : 'tool', label: r.title, detail: r.purpose }, stageNum(r.stages[0])));
    D.research.sections.forEach(s => add({ id: s.id, kind: 'section', label: s.name, detail: s.purpose }, 3));
    D.graph.nodes.forEach(n => add(n, stageNum(n.stage)));
    const edges = [];
    const seen = new Set();
    const link = (from, to, rel) => {
        from = alias(from);
        to = alias(to);
        const k = `${from}|${to}|${rel}`;
        if (from === to || seen.has(k))
            return;
        seen.add(k);
        edges.push({ from, to, rel });
    };
    D.stages.forEach((s, i) => {
        if (i < D.stages.length - 1)
            link(s.id, D.stages[i + 1].id, 'leads_to');
        s.prerequisites.filter(p => stageNum(p) !== s.num - 1).forEach(p => link(s.id, p, 'depends_on'));
        s.requirements.forEach(r => link(s.id, r, 'requires'));
        s.resources.forEach(id => { const r = res(id); link(s.id, id, r.required === 'required' ? 'requires' : 'explained_by'); });
    });
    D.requirements.forEach(r => r.sources.forEach(sid => link(r.id, sid, 'explained_by')));
    D.resources.filter(r => r.kind === 'download' || r.kind === 'tool').forEach(r => link(r.id, r.source, r.kind === 'download' ? 'downloaded_from' : 'explained_by'));
    D.conflicts.forEach(c => { c.affects.forEach(r => link(c.id, r, 'conflicts_with')); c.positions.forEach(p => link(c.id, p.source, 'explained_by')); });
    D.research.sections.forEach(s => s.aro.forEach(r => link(s.id, r, 'requires')));
    D.graph.edges.forEach(e => link(e.from, e.to, e.rel));
    // source pages become nodes when something links to them; they sit in the median column of their linkers
    const homes = new Map();
    edges.forEach(e => { const s = sources.get(e.to); if (s && !nodes.has(e.to)) {
        const h = homes.get(e.to) || [];
        const n = nodes.get(e.from);
        if (n)
            h.push(n.home);
        homes.set(e.to, h);
    } });
    homes.forEach((hs, id) => {
        const s = src(id);
        hs.sort((a, b) => a - b);
        add({ id, kind: 'source', label: s.title, detail: s.notes || s.org }, hs[Math.floor(hs.length / 2)] || 1);
    });
    return { nodes, edges: edges.filter(e => nodes.has(e.from) && nodes.has(e.to)) };
}
export const graph = buildGraph();
export function neighbours(id) {
    return {
        out: graph.edges.filter(e => e.from === id),
        in: graph.edges.filter(e => e.to === id),
    };
}
/** Shortest chain from Stage 01 to `target`, following edge direction (BFS). */
export function pathFromStart(target, start = 's01') {
    const prev = new Map([[start, '']]);
    const q = [start];
    while (q.length) {
        const cur = q.shift();
        if (cur === target)
            break;
        for (const e of graph.edges)
            if (e.from === cur && !prev.has(e.to) && e.rel !== 'explained_by') {
                prev.set(e.to, cur);
                q.push(e.to);
            }
    }
    if (!prev.has(target))
        return [];
    const path = [target];
    while (prev.get(path[0]))
        path.unshift(prev.get(path[0]));
    return path;
}
/** Everything `id` transitively requires or depends on. */
export function dependencies(id) {
    const out = new Set();
    const q = [id];
    while (q.length) {
        const cur = q.shift();
        for (const e of graph.edges)
            if (e.from === cur && (e.rel === 'requires' || e.rel === 'depends_on') && !out.has(e.to)) {
                out.add(e.to);
                q.push(e.to);
            }
    }
    return out;
}
/** Where a node lives in the app. */
export function routeFor(id) {
    if (stages.has(id))
        return `#/stage/${id}`;
    if (reqs.has(id))
        return `#/req/${id}`;
    if (conflicts.has(id))
        return `#/questions/${id}`;
    if (resources.has(id))
        return `#/resources?focus=${id}`;
    if (sections.has(id))
        return `#/research?focus=${id}`;
    if (sources.has(id))
        return `#/sources?focus=${id}`;
    return `#/explore?focus=${id}`;
}
export function nameOf(id) {
    return stages.get(id) ? stageLabel(stage(id)) : graph.nodes.get(id)?.label || reqs.get(id)?.title || sources.get(id)?.title || id;
}
