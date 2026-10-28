// My Research: section-by-section preparation guidance for the Kurdish tokenizer paper.
// Everything here is advice (project-specific or general), kept visibly separate from ARO's rules.
import { h, icon } from '../lib/dom.js';
import { D, req } from '../lib/model.js';
import { store } from '../lib/store.js';
import { crumbs, pageHead, guidanceBadge, statusBadge, progressBar, sfx } from '../lib/ui.js';

const critId = (sec: string, i: number) => `${sec}:${i}`;

export function renderResearch(root: HTMLElement, _p: string[], query: URLSearchParams) {
  const R = D.research;
  const focus = query.get('focus');
  const total = R.sections.reduce((n, s) => n + s.done.length, 0);
  const done = R.sections.reduce((n, s) => n + s.done.filter((_, i) => store.get().research[critId(s.id, i)]).length, 0);

  const wrap = h('div.container.research.stack', { style: '--stack-gap: 32px' },
    crumbs(['My research']),
    pageHead('My research · Kurdish tokenization', 'Plan the paper section by section',
      'For each section: its purpose, the evidence a reviewer will look for, suggested content, an example, the ARO rules that apply, and when you can call it done.', 'orange'),
    h('div.callout.callout--orange', { role: 'note' },
      h('div.callout__title', null, icon('a-flask', 18), 'Advice, not journal rules'),
      h('p.ts-body-sm', null, 'Suggested experiments and content here are recommendations for this project. ARO does not require any particular experiment. ARO\'s own rules appear only as linked requirement badges. No results are filled in: every bracket is yours to complete.'),
      h('div.row', { style: '--row-gap: 8px' }, guidanceBadge('project'), guidanceBadge('official'))),
    h('section.card.card--oat.research-summary', null,
      h('div.eyebrow', null, 'The study'), h('p.ts-body-lg', null, R.summary),
      h('div.row', { style: '--row-gap: 12px' }, progressBar(total ? done / total : 0, 'Research readiness'), h('span.ts-body-sm.c-secondary', null, `${done} of ${total} completion criteria met`))));

  // sections
  const secWrap = h('section.stack', { 'aria-labelledby': 'sec-h' }, h('h2.ts-heading-xl', { id: 'sec-h' }, 'Manuscript sections'),
    h('p.ts-body-sm.c-secondary.flow-legend', null, 'Purpose → evidence → suggested content → example → ARO requirements → completion criteria'));
  R.sections.forEach((s, si) => {
    const met = s.done.filter((_, i) => store.get().research[critId(s.id, i)]).length;
    secWrap.append(h('details.deeper.res-sec', { id: s.id, open: focus ? focus === s.id : si === 0 },
      h('summary', null,
        h('span.deeper__icon.res-sec__num', null, String(si + 1)),
        h('span.deeper__t', null, h('b', null, s.name), h('small', null, `${met}/${s.done.length} criteria met`)),
        h('span.deeper__chev')),
      h('div.deeper__body', null,
        h('ol.res-flow', null,
          h('li', null, h('span.eyebrow', null, 'Purpose'), h('p', null, s.purpose)),
          h('li', null, h('span.eyebrow', null, 'Evidence a reviewer expects'), h('p', null, s.evidence)),
          h('li', null, h('span.eyebrow', null, 'Suggested content'), h('ul.tight-list', null, s.content.map(c => h('li', null, c)))),
          h('li', null, h('span.eyebrow', null, 'Example'), h('p.res-example', null, s.example)),
          h('li', null, h('span.eyebrow', null, 'ARO requirements'), h('div.row', { style: '--row-gap: 8px' }, s.aro.map(id => h('a.chip.chip--outline.chip--sm', { href: `#/req/${id}` }, req(id).title, ' ', statusBadge(req(id).status))))),
          h('li', null, h('span.eyebrow', null, 'Completion criteria (your judgement)'),
            h('div.check-list', null, s.done.map((c, i) => {
              const id = 'rc-' + critId(s.id, i).replace(':', '-');
              const inp = h('input.check', { type: 'checkbox', id, checked: !!store.get().research[critId(s.id, i)] }) as HTMLInputElement;
              inp.addEventListener('change', () => { store.setResearch(critId(s.id, i), inp.checked); sfx(inp.checked ? 'select' : 'toggle'); });
              return h('div.check-row', { 'data-status': inp.checked ? 'done' : 'open' }, inp, h('label', { for: id }, c));
            })))),
        guidanceBadge('project'))));
  });
  wrap.append(secWrap);

  // topics
  wrap.append(h('section.stack', { 'aria-labelledby': 'top-h' },
    h('h2.ts-heading-xl', { id: 'top-h' }, 'Topics the paper should address'),
    h('p.ts-body-sm.c-secondary', null, 'A map of what reviewers of a tokenization paper commonly look for. Cover what fits your study; say explicitly what is out of scope.'),
    h('div.topic-grid', null, R.topics.map((t, i) => h('div.card.topic-card', null,
      h('span.topic-card__n', { 'aria-hidden': 'true' }, String(i + 1).padStart(2, '0')),
      h('h3.ts-heading-sm', null, t.name), h('p.ts-body-sm.c-secondary', null, t.note)))),
    guidanceBadge('general')));

  // matrix
  wrap.append(h('section.stack', { 'aria-labelledby': 'mx-h' },
    h('h2.ts-heading-xl', { id: 'mx-h' }, 'Research readiness matrix'),
    h('p.ts-body-sm.c-secondary', null, 'Every claim in the paper needs the evidence in its row. If you cannot fill the row, soften or drop the claim.'),
    h('div.table-wrap', null, h('table.table.matrix', null,
      h('thead', null, h('tr', null, ['Claim (template)', 'Evidence required', 'Where it goes', 'What makes it convincing'].map(t => h('th', { scope: 'col' }, t)))),
      h('tbody', null, R.matrix.map(m => h('tr', null, h('td', null, m.claim), h('td', null, m.evidence), h('td', null, m.where), h('td', null, m.strength)))))),
    guidanceBadge('project')));

  root.append(wrap);
  if (focus) requestAnimationFrame(() => document.getElementById(focus)?.scrollIntoView({ block: 'start' }));
}
