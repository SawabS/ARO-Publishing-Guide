// Global search over stages, lessons, requirements, open questions, documents, sources, people and handbook chapters.
import { D, routeFor, stageLabel } from './model.js';

export interface Doc { id: string; type: string; title: string; text: string; route: string }

const docs: Doc[] = [
  ...D.stages.map(s => ({ id: s.id, type: 'Stage', title: stageLabel(s), text: [s.short, s.accomplishes, ...s.actions, s.next].join(' '), route: routeFor(s.id) })),
  ...D.stages.flatMap(s => s.lessons.map(l => ({ id: l.id, type: 'Lesson', title: l.title, text: `${s.title} ${l.body.join(' ')}`, route: `#/stage/${s.id}?lesson=${l.id}` }))),
  ...D.stages.flatMap(s => s.checklist.map(c => ({ id: c.id, type: 'Checklist', title: c.label, text: s.title, route: `#/stage/${s.id}` }))),
  ...D.requirements.map(r => ({ id: r.id, type: 'Requirement', title: r.title, text: `${r.rule} ${r.explain} ${r.how} ${r.status}`, route: routeFor(r.id) })),
  ...D.conflicts.map(c => ({ id: c.id, type: 'Open question', title: c.title, text: `${c.analysis} ${c.recommendation} ${c.positions.map(p => p.claim).join(' ')}`, route: routeFor(c.id) })),
  ...D.resources.map(r => ({ id: r.id, type: 'Resource', title: r.title, text: `${r.purpose} ${r.format} ${r.org}`, route: routeFor(r.id) })),
  ...D.sources.map(s => ({ id: s.id, type: 'Source', title: s.title, text: `${s.org} ${s.url} ${s.notes || ''}`, route: routeFor(s.id) })),
  ...D.people.map((p, i) => ({ id: 'person-' + i, type: 'Person', title: p.name, text: `${p.role} ${p.affiliation} ${p.country}`, route: `#/directory?q=${encodeURIComponent(p.name)}` })),
  ...D.handbook.map(t => ({ id: t.id, type: 'Handbook', title: t.title, text: t.intro, route: `#/handbook/${t.id}` })),
  ...D.research.sections.map(s => ({ id: s.id, type: 'Your paper', title: s.name, text: `${s.purpose} ${s.evidence} ${s.content.join(' ')}`, route: routeFor(s.id) })),
  { id: 'harvard', type: 'Module', title: 'Harvard referencing module', text: 'citation reference list author-date et al DOI practice quiz', route: '#/handbook/references' },
  { id: 'docx', type: 'Tool', title: 'Check my .docx manuscript', text: 'upload word count abstract keywords margins font anonymisation', route: '#/readiness' },
  { id: 'email', type: 'Tool', title: 'Email to the editorial office', text: 'contact aro.journal@koyauniversity.org question anonymisation discipline format', route: '#/directory' },
];

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
const prepared = docs.map(d => ({ d, t: norm(d.title), x: norm(d.text) }));

export function search(q: string, limit = 30): Doc[] {
  const terms = norm(q).split(/[^a-z0-9.%-]+/).filter(t => t.length > 1);
  if (!terms.length) return [];
  const out: { d: Doc; score: number }[] = [];
  for (const p of prepared) {
    let score = 0, all = true;
    for (const t of terms) {
      const inT = p.t.includes(t), inX = p.x.includes(t);
      if (!inT && !inX) { all = false; break; }
      score += (inT ? 6 : 0) + (inX ? 1 : 0) + (p.t.startsWith(t) ? 3 : 0);
    }
    if (all) out.push({ d: p.d, score: score + (p.d.type === 'Requirement' || p.d.type === 'Stage' ? 1 : 0) });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit).map(o => o.d);
}
