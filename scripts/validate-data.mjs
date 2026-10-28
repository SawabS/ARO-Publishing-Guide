// Validates the structured data in /data: ids are unique, every reference resolves,
// and every official requirement cites at least one official ARO source.
// Run: node scripts/validate-data.mjs   (also runs as part of the build)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = f => JSON.parse(readFileSync(join(root, 'data', f), 'utf8'));

export function loadData() {
  const sources = read('sources.json');
  const people = read('people.json');
  return {
    verifiedDate: sources.verifiedDate,
    sources: sources.sources,
    requirements: read('requirements.json').requirements,
    conflicts: read('conflicts.json').conflicts,
    resources: read('resources.json').resources,
    stages: read('stages.json').stages,
    journal: people.journal,
    people: people.people,
    research: (({ $comment, ...r }) => r)(read('research.json')),
    graph: (({ $comment, ...g }) => g)(read('graph.json')),
    handbook: read('handbook.json').topics,
  };
}

export function validate(d) {
  const errors = [];
  const ids = new Map();
  const reg = (kind, id) => { if (ids.has(id)) errors.push(`duplicate id ${id} (${kind} and ${ids.get(id)})`); ids.set(id, kind); };
  d.sources.forEach(s => reg('source', s.id));
  d.requirements.forEach(r => reg('requirement', r.id));
  d.conflicts.forEach(c => reg('conflict', c.id));
  d.resources.forEach(r => reg('resource', r.id));
  d.stages.forEach(s => reg('stage', s.id));
  d.research.sections.forEach(s => reg('section', s.id));
  d.graph.nodes.forEach(n => reg('graph node', n.id));
  const checkIds = new Set();
  d.stages.forEach(s => s.checklist.forEach(c => { if (checkIds.has(c.id)) errors.push(`duplicate checklist id ${c.id}`); checkIds.add(c.id); }));

  const src = new Map(d.sources.map(s => [s.id, s]));
  const is = (kind, id) => ids.get(id) === kind;
  const topics = new Set(d.handbook.map(t => t.id));
  for (const s of d.sources) if (!/^https?:\/\//.test(s.url)) errors.push(`source ${s.id}: bad url`);
  for (const r of d.requirements) {
    if (!r.sources.length) errors.push(`requirement ${r.id}: no source`);
    if (!r.sources.some(id => src.get(id)?.official)) errors.push(`requirement ${r.id}: no official ARO source`);
    r.sources.forEach(id => is('source', id) || errors.push(`requirement ${r.id}: unknown source ${id}`));
    r.stages.forEach(id => is('stage', id) || errors.push(`requirement ${r.id}: unknown stage ${id}`));
    (r.conflicts || []).forEach(id => is('conflict', id) || errors.push(`requirement ${r.id}: unknown conflict ${id}`));
    if (!topics.has(r.topic)) errors.push(`requirement ${r.id}: unknown topic ${r.topic}`);
    if (!['mandatory', 'conditional', 'recommended', 'informational'].includes(r.status)) errors.push(`requirement ${r.id}: bad status`);
  }
  for (const c of d.conflicts) {
    c.positions.forEach(p => is('source', p.source) || errors.push(`conflict ${c.id}: unknown source ${p.source}`));
    c.affects.forEach(id => is('requirement', id) || errors.push(`conflict ${c.id}: unknown requirement ${id}`));
  }
  for (const r of d.resources) {
    is('source', r.source) || errors.push(`resource ${r.id}: unknown source ${r.source}`);
    r.stages.forEach(id => is('stage', id) || errors.push(`resource ${r.id}: unknown stage ${id}`));
  }
  for (const s of d.stages) {
    s.requirements.forEach(id => is('requirement', id) || errors.push(`stage ${s.id}: unknown requirement ${id}`));
    s.resources.forEach(id => is('resource', id) || errors.push(`stage ${s.id}: unknown resource ${id}`));
    s.prerequisites.forEach(id => is('stage', id) || errors.push(`stage ${s.id}: unknown prerequisite ${id}`));
    s.checklist.forEach(c => {
      (c.dependsOn || []).forEach(id => checkIds.has(id) || errors.push(`check ${c.id}: unknown dependency ${id}`));
      if (c.conflict && !is('conflict', c.conflict)) errors.push(`check ${c.id}: unknown conflict ${c.conflict}`);
    });
    s.lessons.forEach(l => ['official', 'general', 'project'].includes(l.tag) || errors.push(`lesson ${l.id}: bad tag`));
  }
  for (const s of d.research.sections) s.aro.forEach(id => is('requirement', id) || errors.push(`section ${s.id}: unknown requirement ${id}`));
  for (const e of d.graph.edges) {
    if (!ids.has(e.from)) errors.push(`edge: unknown from ${e.from}`);
    if (!ids.has(e.to)) errors.push(`edge: unknown to ${e.to}`);
  }
  for (const p of d.people) if (/@/.test(JSON.stringify(p))) errors.push(`person ${p.name}: contains an email address`);
  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const d = loadData();
  const errors = validate(d);
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
  console.log(`data ok: ${d.sources.length} sources, ${d.requirements.length} requirements, ${d.conflicts.length} conflicts, ${d.resources.length} resources, ${d.stages.length} stages, ${d.people.length} people`);
}
