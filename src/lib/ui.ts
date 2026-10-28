// Shared building blocks, all composed from the Brilliant Web Skill components (badges, cards, callouts,
// lip tiles, check boxes, progress bars, lesson nodes).
import { h, icon, external, type Child, fmtDate } from './dom.js';
import { D, src, req, conflict, checkStatus, blockers, routeFor, stage, stageLabel, type CheckStatus } from './model.js';
import { store } from './store.js';
import type { ChecklistItem, Guidance, Requirement, Status, Hue } from '../types.js';

declare global { interface Window { B?: { node(o: Record<string, unknown>): string; sfx: Record<string, () => void>; setTheme(t: string): void } } }

export const GUIDANCE: Record<Guidance, { label: string; badge: string }> = {
  official: { label: 'Official ARO requirement', badge: 'badge--blue' },
  general: { label: 'General academic recommendation', badge: 'badge--purple' },
  project: { label: 'Practical tip, not a journal rule', badge: 'badge--orange' },
};
export const guidanceBadge = (g: Guidance) => h(`span.badge.badge--subtle.${GUIDANCE[g].badge}.g-badge`, { 'data-guidance': g }, GUIDANCE[g].label);

const STATUS_BADGE: Record<Status, string> = { mandatory: 'badge--red', conditional: 'badge--yellow', recommended: 'badge--teal', informational: 'badge--minimal' };
export const statusBadge = (s: Status) => h(`span.badge.badge--outline.${STATUS_BADGE[s]}`, null, s);

export function sfx(name: string) { try { window.B?.sfx?.[name]?.(); } catch { /* audio is optional */ } }

/** A lesson node plate rendered by the skill's own B.node() (isometric plate with split progress ring). */
export function lessonNode(opts: { state: 'locked' | 'current' | 'done'; hue: Hue; segments: number; progress: number; shape?: 'lesson' | 'review'; small?: boolean }) {
  const el = h('span.lesson-node', { 'data-state': opts.state, 'data-hue': opts.hue, 'data-rendered': '' });
  if (opts.small) el.classList.add('lesson-node--sm');
  const seg = Math.max(1, Math.min(opts.segments, 8));
  const prog = Math.round(opts.progress / Math.max(1, opts.segments) * seg);
  const markup = window.B?.node({ shape: opts.shape || 'lesson', segments: seg, progress: opts.state === 'done' ? seg : prog }) || '';
  el.innerHTML = markup;
  return el;
}

export function sourceLink(id: string, compact = false): HTMLElement {
  const s = src(id);
  const label = compact ? s.title : `${s.title}`;
  const tag = s.official ? 'Official ARO' : s.aroLinked ? 'Linked by ARO' : 'External';
  return h('span.src-link', null,
    external(s.url, label),
    compact ? null : h('span.src-meta', null, ` · ${tag} · verified ${fmtDate(s.verified)}${s.check === 'partial' ? ' · needs a browser session' : s.check === 'unreachable' ? ' · unreachable when checked' : ''}`));
}

export function sourcesList(ids: string[]): HTMLElement {
  return h('ul.src-list', null, ids.map(id => h('li', null, sourceLink(id))));
}

export function conflictCallout(id: string, compact = false): HTMLElement {
  const c = conflict(id);
  const tone = c.status === 'unresolved' ? 'yellow' : c.status === 'reconciled' ? 'green' : 'oat';
  const note = store.get().confirmed[id];
  return h(`div.callout.callout--${tone}.conflict-callout`, null,
    h('div.callout__title', null, icon(c.status === 'unresolved' ? 'i-alert' : 'i-info', 18),
      c.status === 'unresolved' ? 'Sources disagree: confirm with the office' : c.status === 'reconciled' ? 'Sources differ: one action satisfies all' : 'Worth knowing'),
    h('p', null, h('b', null, c.title), compact ? null : ' — ' + c.recommendation),
    note ? h('p.c-secondary', null, 'Your note: ' + note) : null,
    h('a.c-link', { href: routeFor(id) }, compact ? 'See both sources and the recommendation' : 'Open the comparison'));
}

/** A collapsible requirement card: rule, explanation, how to comply, sources, stages, conflicts. */
export function requirementCard(r: Requirement, open = false): HTMLElement {
  return h('details.req-card.card--lip', { open, id: 'req-' + r.id },
    h('summary', null,
      h('span.req-card__title', null, r.title),
      h('span.req-card__badges', null, statusBadge(r.status), r.conflicts?.some(c => conflict(c).status === 'unresolved') ? h('span.badge.badge--subtle.badge--yellow', null, 'needs confirmation') : null),
      h('span.deeper__chev', { 'aria-hidden': 'true' })),
    h('div.req-card__body.stack', null,
      guidanceBadge('official'),
      h('p.req-rule', null, r.rule),
      h('p', null, h('b', null, 'What it means. '), r.explain),
      h('p', null, h('b', null, 'How to comply. '), r.how),
      (r.conflicts || []).map(c => conflictCallout(c, true)),
      h('div.req-meta', null,
        h('div', null, h('div.eyebrow', null, 'Sources'), sourcesList(r.sources)),
        h('div', null, h('div.eyebrow', null, 'Applies at'), h('div.row', { style: '--row-gap: 8px' }, r.stages.map(s => h('a.chip.chip--outline.chip--sm', { href: `#/stage/${s}` }, stageLabel(stage(s))))))),
      h('div.row', null,
        h('a.btn.btn--outline.btn--sm', { href: `#/req/${r.id}` }, 'Open requirement page'),
        h('a.btn.btn--ghost.btn--sm', { href: `#/explore?focus=${r.id}` }, icon('a-graph', 16), 'Show in graph'))));
}

const CHECK_LABEL: Record<CheckStatus, string> = { done: 'Done', blocked: 'Blocked', awaiting: 'Awaiting office answer', open: 'To do' };
export function checkRow(item: ChecklistItem, onChange?: () => void): HTMLElement {
  const st = checkStatus(item);
  const id = 'chk-' + item.id;
  const input = h('input.check', { type: 'checkbox', id, checked: st === 'done', 'aria-describedby': id + '-st' }) as HTMLInputElement;
  input.addEventListener('change', () => {
    if (input.checked && st === 'blocked' && !confirm('Some items this depends on are not done yet. Mark it done anyway?')) { input.checked = false; return; }
    store.toggle(item.id, input.checked); sfx(input.checked ? 'select' : 'toggle'); onChange?.();
  });
  const auto = item.auto ? store.get().auto[item.auto] : undefined;
  const bl = st === 'blocked' ? blockers(item) : [];
  return h(`div.check-row`, { 'data-status': st },
    input,
    h('label', { for: id }, item.label,
      h('span.check-row__meta', { id: id + '-st' },
        h(`span.dot.dot--${st}`, { 'aria-hidden': 'true' }), CHECK_LABEL[st],
        bl.length ? ` · waiting on: ${bl.map(b => b.item.label).join('; ')}` : '',
        st === 'awaiting' && item.conflict ? h('a.c-link', { href: routeFor(item.conflict) }, ' · see open question') : null,
        auto ? h(`span.auto-chip.auto-chip--${auto.verdict}`, { title: 'Last automated .docx check (advisory)' }, `auto: ${auto.verdict}`) : null)));
}

export function progressBar(pct: number, label: string, cls = ''): HTMLElement {
  return h(`div.progress.${cls || 'progress--sm'}`, { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(pct * 100), 'aria-label': label },
    h('div.progress__fill', { style: `--value: ${Math.round(pct * 100)}%` }));
}

export function crumbs(...items: [string, string?][]): HTMLElement {
  return h('nav.crumbs', { 'aria-label': 'Breadcrumb' }, h('ol', null, items.map(([label, href], i) =>
    h('li', null, href && i < items.length - 1 ? h('a', { href }, label) : h('span', { 'aria-current': i === items.length - 1 ? 'page' : undefined }, label)))));
}

export function pageHead(kicker: string, title: string, sub?: Child, hue = 'blue'): HTMLElement {
  return h('header.page-head', null,
    h(`div.kicker.kicker--${hue}`, null, kicker),
    h('h1.ts-display-3xl.page-title', null, title),
    sub ? h('p.ts-body-lg.c-secondary.page-sub', null, sub) : null);
}

export const verifiedNote = () => h('p.verified-note', null, icon('a-shield', 14), ` Journal policies last verified ${fmtDate(D.verifiedDate)} against aro.koyauniversity.org. Verification date ≠ the date ARO last updated a page.`);

export function legend(): HTMLElement {
  return h('div.guidance-legend', { role: 'note' },
    h('span.eyebrow', null, 'How to read this site'),
    h('div.row', { style: '--row-gap: 8px' }, guidanceBadge('official'), guidanceBadge('general'), guidanceBadge('project')));
}

export { req };
