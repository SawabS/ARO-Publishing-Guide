// Resources: the verified document directory, and the full source registry.
import { h, icon, clear, external, download, toast, fmtDate } from '../lib/dom.js';
import { D, src, stage, stageLabel, reqs } from '../lib/model.js';
import { crumbs, pageHead, verifiedNote, sfx } from '../lib/ui.js';
import { checklistMarkdown } from './readiness.js';
const KIND = {
    download: { label: 'Document', icon: 'a-download', action: 'Open to download' },
    page: { label: 'Web page', icon: 'a-doc', action: 'Open official source' },
    portal: { label: 'Portal', icon: 'i-arrow-right', action: 'Open portal' },
    tool: { label: 'Tool', icon: 'i-puzzle', action: 'Open tool' },
};
const ui = { stage: 'all', kind: 'all', req: 'all' };
export function renderResources(root, _p, query) {
    const focus = query.get('focus');
    if (focus) {
        ui.stage = 'all';
        ui.kind = 'all';
        ui.req = 'all';
    }
    const list = h('div.res-grid', { 'aria-live': 'polite' });
    const count = h('p.ts-body-sm.c-secondary');
    const fill = () => {
        clear(list);
        const xs = D.resources.filter(r => (ui.stage === 'all' || r.stages.includes(ui.stage)) && (ui.kind === 'all' || r.kind === ui.kind) && (ui.req === 'all' || r.required === ui.req));
        count.textContent = `${xs.length} of ${D.resources.length} resources`;
        xs.forEach(r => list.append(resCard(r, r.id === focus)));
        if (!xs.length)
            list.append(h('p.c-secondary', null, 'Nothing matches these filters.'));
    };
    const sel = (label, key, opts) => {
        const s = h('select.input', { 'aria-label': label }, opts.map(([v, l]) => h('option', { value: v, selected: ui[key] === v }, l)));
        s.addEventListener('change', () => { ui[key] = s.value; sfx('toggle'); fill(); });
        return h('label.res-filter', null, h('span.field__label', null, label), s);
    };
    root.append(h('div.container.resources.stack', { style: '--stack-gap: 24px' }, crumbs(['Resources']), pageHead('Resources & downloads', 'The official files and pages, checked', 'Every link points to the original ARO page or file. Nothing is re-hosted here: ARO\'s templates live on Google Docs and Google Drive, so they open there for you to download.', 'teal'), h('div.callout.callout--blue', { role: 'note' }, h('div.callout__title', null, icon('i-info', 18), 'Start with the Stage-One template'), h('p.ts-body-sm', null, 'The Submissions checklist links ARO_Submission.docx in Google Docs; the Guide to Authors links ARO_Template.dotx on Google Drive. Use the .docx from the checklist page for your first submission, and compare it with the .dotx if the two ever look different.')), h('div.res-filters', null, sel('Stage', 'stage', [['all', 'All stages'], ...D.stages.map(s => [s.id, stageLabel(s)])]), sel('Type', 'kind', [['all', 'All types'], ['download', 'Documents'], ['page', 'Web pages'], ['portal', 'Portals'], ['tool', 'Tools']]), sel('Requirement', 'req', [['all', 'Required or optional'], ['required', 'Required'], ['conditional', 'Conditional'], ['optional', 'Optional']]), h('div.res-export', null, h('span.field__label', null, 'Your checklist'), h('button.btn.btn--outline', { onclick: () => { download('aro-preparation-checklist.md', checklistMarkdown()); toast('Checklist downloaded'); } }, icon('a-download', 16), 'Download my preparation checklist'))), count, list, h('p', null, h('a', { href: '#/sources' }, 'See the full source registry'), ` (${D.sources.length} sources, with verification status)`), verifiedNote()));
    fill();
    if (focus)
        requestAnimationFrame(() => document.getElementById('res-' + focus)?.scrollIntoView({ block: 'center' }));
    return { keep: true };
}
function resCard(r, focused) {
    const s = src(r.source), k = KIND[r.kind];
    return h(`article.card.res-card${focused ? '.is-focused' : ''}`, { id: 'res-' + r.id }, h('div.row', { style: 'justify-content: space-between; --row-gap: 8px' }, h('span.res-card__kind', null, icon(k.icon, 16), k.label), h(`span.badge.badge--subtle.${r.required === 'required' ? 'badge--red' : r.required === 'conditional' ? 'badge--yellow' : 'badge--primary'}`, null, r.required)), h('h3.ts-heading-sm', null, r.title), h('p.ts-body-sm', null, r.purpose), h('dl.res-meta', null, h('dt', null, 'Format'), h('dd', null, r.format), h('dt', null, 'Source'), h('dd', null, `${r.org}${s.official ? ' (official)' : s.aroLinked ? ' (linked from ARO)' : ''}`), h('dt', null, 'Stages'), h('dd', null, r.stages.map((id, i) => [i ? ', ' : '', h('a', { href: `#/stage/${id}` }, String(stage(id).num).padStart(2, '0'))])), h('dt', null, 'Verified'), h('dd', null, fmtDate(s.verified), s.check === 'partial' ? ' · opens in Google; content needs a browser' : s.check === 'unreachable' ? ' · unreachable when checked' : s.check === 'listed' ? ' · link taken from an ARO page' : '')), r.howTo ? h('p.ts-body-sm.c-secondary', null, r.howTo) : null, h('div.row.res-actions', null, external(s.url, k.action, `btn ${r.kind === 'download' ? 'btn--inverse' : 'btn--outline'} btn--sm`)), h('p.res-url', null, s.url));
}
export function renderSources(root, _p, query) {
    const focus = query.get('focus');
    const used = new Map();
    D.requirements.forEach(r => r.sources.forEach(id => used.set(id, (used.get(id) || 0) + 1)));
    const statusLabel = { fetched: 'Read', partial: 'Partly readable', unreachable: 'Unreachable', listed: 'Linked, not opened' };
    root.append(h('div.container.stack', { style: '--stack-gap: 24px' }, crumbs(['Resources', '#/resources'], ['Source registry']), pageHead('Source integrity', 'Every source this site relies on', 'Official ARO pages first. “Read” means the page was opened and its content used; “Linked, not opened” means the URL comes from an ARO page but its content was not needed. Verification date is when we checked, not when ARO last edited the page.', 'teal'), h('div.table-wrap', null, h('table.table.src-table', null, h('thead', null, h('tr', null, ['Source', 'Organisation', 'Status', 'Verified', 'Rules citing it'].map(t => h('th', { scope: 'col' }, t)))), h('tbody', null, D.sources.map(s => h('tr', { id: 'src-' + s.id, 'aria-selected': focus === s.id ? 'true' : undefined }, h('td', null, external(s.url, s.title), s.notes ? h('div.ts-body-xs.c-secondary', null, s.notes) : null), h('td', null, s.org, h('div', null, h(`span.badge.badge--subtle.${s.official ? 'badge--blue' : 'badge--primary'}`, null, s.official ? 'official ARO' : s.aroLinked ? 'linked by ARO' : 'external'))), h('td', null, statusLabel[s.check]), h('td', null, fmtDate(s.verified)), h('td.num', null, String(used.get(s.id) || 0))))))), h('p.ts-body-sm.c-secondary', null, `${[...reqs.values()].length} requirements cite these sources. The registry is also published as `, h('a', { href: new URL('../../sources.json', import.meta.url).href }, 'sources.json'), '.'), verifiedNote()));
    if (focus)
        requestAnimationFrame(() => document.getElementById('src-' + focus)?.scrollIntoView({ block: 'center' }));
}
