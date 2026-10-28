// Readiness: the submission readiness dashboard. Self-declared ticks (from every stage) sit beside advisory
// automated checks of a local .docx. Exports to Markdown, print/PDF, and a progress backup.
import { h, icon, clear, download, toast, fmtDate } from '../lib/dom.js';
import { D, allChecks, checkStatus, stageLabel, overallProgress, conflict } from '../lib/model.js';
import { store } from '../lib/store.js';
import { crumbs, pageHead, checkRow, progressBar, sfx, verifiedNote } from '../lib/ui.js';
import { dashboardTiles } from './journey.js';
import { analyse } from '../lib/docx.js';
let report = null;
let busy = false;
let error = '';
const STATUS_WORD = { done: 'done', open: 'to do', blocked: 'blocked', awaiting: 'awaiting the office' };
export function checklistMarkdown() {
    const p = overallProgress();
    const auto = store.get().auto;
    const lines = [
        '# ARO submission preparation checklist',
        '',
        `Generated ${new Date().toLocaleString('en-GB')} by ARO Publication Guide. Journal policies last verified ${D.verifiedDate}.`,
        '',
        `Progress: ${p.done} of ${p.total} items ticked.`,
        '',
        '> Ticks are self-declared. Automated notes come from an in-browser .docx check and are advisory. Neither means ARO has approved anything.',
        '',
    ];
    D.stages.forEach(s => {
        lines.push(`## ${stageLabel(s)}`, '');
        s.checklist.forEach(c => {
            const st = checkStatus(c);
            const a = c.auto && auto[c.auto] ? ` — automated check: ${auto[c.auto].verdict}` : '';
            lines.push(`- [${st === 'done' ? 'x' : ' '}] ${c.label} (${STATUS_WORD[st]})${a}`);
        });
        lines.push('');
    });
    const open = D.conflicts.filter(c => c.status === 'unresolved');
    lines.push('## Questions for the editorial office', '');
    open.forEach(c => lines.push(`- ${c.title}${store.get().confirmed[c.id] ? ` — answer recorded: ${store.get().confirmed[c.id]}` : ' — not yet answered'}`));
    lines.push('', 'Official journal site: https://aro.koyauniversity.org/', '');
    return lines.join('\n');
}
export function renderReadiness(root, _p, query) {
    const show = (query.get('show') || 'all');
    const p = overallProgress();
    const wrap = h('div.container.readiness.stack', { style: '--stack-gap: 28px' }, crumbs(['Readiness']), pageHead('Submission readiness', p.done === p.total ? 'Every item is ticked. Read it once more before you submit' : `${p.total - p.done} items stand between you and submission`, 'Ticks are your own judgement. The automated .docx check is advisory. Neither one means ARO has accepted, approved or even seen your manuscript.', 'green'), h('div.row', { style: '--row-gap: 12px' }, progressBar(p.pct, 'Overall readiness', 'progress--lg'), h('span.ts-body-sm.c-secondary', null, `${p.done} of ${p.total} ticked`)), dashboardTiles());
    // docx checker
    wrap.append(docxCard());
    // checklist
    const filters = [['all', 'All'], ['open', 'To do'], ['blocked', 'Blocked'], ['done', 'Done']];
    const seg = h('div.segmented.ready-seg', { role: 'tablist', 'aria-label': 'Filter checklist', style: `--n: 4; --i: ${filters.findIndex(f => f[0] === show)}` }, h('span.segmented__thumb'), filters.map(([v, l]) => h('button', { role: 'tab', 'aria-selected': v === show, onclick: () => { location.hash = v === 'all' ? '#/readiness' : `#/readiness?show=${v}`; } }, l)));
    const groups = h('div.stack.ready-groups');
    D.stages.forEach(s => {
        const items = s.checklist.filter(c => {
            const st = checkStatus(c);
            return show === 'all' || (show === 'done' ? st === 'done' : show === 'open' ? st === 'open' : st === 'blocked' || st === 'awaiting');
        });
        if (!items.length)
            return;
        groups.append(h('section.card.ready-group', { 'aria-labelledby': 'rg-' + s.id }, h('div.row', { style: 'justify-content: space-between' }, h('h3.ts-heading-sm', { id: 'rg-' + s.id }, h('a', { href: `#/stage/${s.id}` }, stageLabel(s))), h('span.ts-body-sm.c-secondary', null, `${s.checklist.filter(c => store.isChecked(c.id)).length}/${s.checklist.length}`)), h('div.check-list', null, items.map(c => checkRow(c)))));
    });
    if (!groups.childElementCount)
        groups.append(h('p.c-secondary', null, 'Nothing in this view.'));
    wrap.append(h('section.stack', { 'aria-labelledby': 'cl-h' }, h('div.row', { style: 'justify-content: space-between' }, h('h2.ts-heading-xl', { id: 'cl-h' }, 'All checklist items'), seg), h('p.ts-body-sm.c-secondary', null, 'Grey “auto” chips show the last automated .docx verdict next to the item it informs. Blocked items wait on other items; some wait on an answer from the editorial office.'), groups));
    // exports
    const fileIn = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, 'aria-label': 'Import progress file' });
    fileIn.addEventListener('change', async () => {
        const f = fileIn.files?.[0];
        if (!f)
            return;
        try {
            store.importJson(await f.text());
            toast('Progress imported');
        }
        catch {
            toast('That file is not a progress backup.');
        }
    });
    wrap.append(h('section.card.stack.no-print', { 'aria-labelledby': 'ex-h' }, h('h2.ts-heading-md', { id: 'ex-h' }, 'Export'), h('div.row', null, h('button.btn.btn--outline', { onclick: () => { download('aro-readiness.md', checklistMarkdown()); toast('Markdown downloaded'); } }, icon('a-download', 16), 'Markdown'), h('button.btn.btn--outline', { onclick: () => window.print() }, icon('a-print', 16), 'Print or save as PDF'), h('button.btn.btn--ghost', { onclick: () => { download('aro-navigator-progress.json', store.exportJson(), 'application/json'); toast('Backup downloaded'); } }, 'Back up progress'), h('button.btn.btn--ghost', { onclick: () => fileIn.click() }, 'Restore backup'), fileIn), h('p.ts-body-sm.c-secondary', null, store.storageOk() ? 'Progress is saved in this browser only. Back it up to move it to another device.' : 'This browser is blocking storage, so progress will be lost when you close the tab. Back it up now.')));
    wrap.append(verifiedNote());
    root.append(wrap);
}
function docxCard() {
    const input = h('input.visually-hidden', { type: 'file', id: 'docx-in', accept: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const body = h('div.stack', { 'aria-live': 'polite' });
    const run = async (f) => {
        busy = true;
        error = '';
        report = null;
        draw();
        try {
            report = await analyse(f);
            sfx('complete');
        }
        catch (e) {
            error = e instanceof Error ? e.message : 'The file could not be read.';
            sfx('wrong');
        }
        busy = false;
        draw();
    };
    input.addEventListener('change', () => { const f = input.files?.[0]; if (f)
        run(f); input.value = ''; });
    const drop = h('label.dropzone', { for: 'docx-in' }, icon('a-upload', 28), h('b', null, 'Choose a .docx manuscript'), h('span.ts-body-sm.c-secondary', null, 'or drop it here. It is read in this browser and never uploaded.'));
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('is-over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
    drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('is-over'); const f = e.dataTransfer?.files?.[0]; if (f)
        run(f); });
    const draw = () => {
        clear(body);
        const saved = store.get();
        if (busy) {
            body.append(h('div.skeleton', { style: 'height: 120px' }), h('p.c-secondary', null, 'Reading the document…'));
            return;
        }
        if (error)
            body.append(h('div.callout.callout--red', { role: 'alert' }, h('div.callout__title', null, icon('i-alert', 18), 'Could not check this file'), h('p.ts-body-sm', null, error)));
        if (report) {
            const r = report;
            const n = { pass: 0, warn: 0, fail: 0, info: 0 };
            r.findings.forEach(f => n[f.verdict]++);
            body.append(h('div.row', { style: 'justify-content: space-between' }, h('div', null, h('b', null, r.fileName), h('div.ts-body-sm.c-secondary', null, `≈ ${r.words.toLocaleString()} words · ${n.pass} pass · ${n.warn} warn · ${n.fail} fail`)), h('div.row', null, h('button.btn3d.btn3d--sm', { onclick: () => { store.setAuto(r.fileName, Object.fromEntries(r.findings.map(f => [f.id, f.verdict]))); toast('Verdicts linked to your checklist'); } }, h('span.btn3d__face', null, 'Link verdicts to checklist')), h('button.btn.btn--ghost.btn--sm', { onclick: () => { report = null; draw(); } }, 'Clear'))), h('div.table-wrap', null, h('table.table.docx-table', null, h('thead', null, h('tr', null, ['Check', 'Result', 'Confidence', 'Detail'].map(t => h('th', { scope: 'col' }, t)))), h('tbody', null, r.findings.map(f => h('tr', null, h('td', null, f.label), h('td', null, h(`span.verdict.verdict--${f.verdict}`, null, icon(f.verdict === 'pass' ? 'i-check' : f.verdict === 'info' ? 'i-info' : 'i-alert', 14), f.verdict)), h('td', null, f.confidence), h('td.ts-body-sm', null, f.detail)))))), h('details.sources-drawer', null, h('summary', null, 'What this check cannot do'), h('ul.tight-list.ts-body-sm', null, r.limits.map(l => h('li', null, l)))));
        }
        else if (saved.autoFile) {
            body.append(h('p.ts-body-sm.c-secondary', null, `Verdicts from “${saved.autoFile}” (checked ${fmtDate(Object.values(saved.auto)[0]?.at.slice(0, 10) || new Date().toISOString().slice(0, 10))}) are shown on the checklist. The manuscript itself was not stored.`), h('button.btn.btn--ghost.btn--sm', { onclick: () => store.clearAuto() }, 'Remove automated verdicts'));
        }
    };
    draw();
    return h('section.card.stack.docx-card', { 'aria-labelledby': 'dx-h' }, h('div.row', { style: 'justify-content: space-between' }, h('h2.ts-heading-lg', { id: 'dx-h' }, 'Automated manuscript check'), h('span.badge.badge--subtle.badge--purple', null, 'advisory')), h('p.ts-body-sm.c-secondary', null, 'Approximate checks of word count, abstract length, keywords, sections, title, length band, references, preprints, DOIs, font, spacing, page size, margins, figures, tables, template markers and identity signals. It cannot judge similarity, originality, correctness or AI use.'), input, drop, body, unresolvedNote());
}
function unresolvedNote() {
    const open = D.conflicts.filter(c => c.status === 'unresolved' && !store.get().confirmed[c.id] && c.severity === 'high');
    if (!open.length)
        return null;
    return h('p.ts-body-sm', null, icon('i-alert', 14), ' Before uploading to ARO, settle: ', open.map((c, i) => [i ? '; ' : '', h('a', { href: `#/questions/${c.id}` }, conflict(c.id).title)]));
}
export { allChecks };
