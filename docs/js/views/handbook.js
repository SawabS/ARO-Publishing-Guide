// Handbook: every ARO rule grouped into chapters, each explained, sourced and paired with an interactive module.
// Also the single-requirement page and the open-questions (source conflicts) pages.
import { h, icon, clear, external, download, toast } from '../lib/dom.js';
import { D, req, conflict, src, stage, stageLabel, reqsForTopic, topics, routeFor, res } from '../lib/model.js';
import { store } from '../lib/store.js';
import { requirementCard, conflictCallout, crumbs, pageHead, guidanceBadge, statusBadge, sourcesList, sourceLink, verifiedNote, legend, sfx } from '../lib/ui.js';
import { quiz } from '../lib/quiz.js';
// ── index ────────────────────────────────────────────────────────────────────
const ui = { status: 'all', q: '' };
export function renderHandbook(root, params) {
    if (params[0])
        return renderTopic(root, params[0]);
    const wrap = h('div.container.handbook');
    wrap.append(crumbs(['Handbook']), pageHead('Manuscript handbook', 'Every ARO rule, explained and sourced', `${D.requirements.length} requirements from ARO's author and policy pages, in ${D.handbook.length} chapters. Each rule says what it means for you, how to comply, and where ARO says it.`, 'purple'), h('div.row.hb-top', null, legend(), verifiedNote()));
    const restrictions = h('section.hb-critical', { 'aria-labelledby': 'crit-h' }, h('h2.ts-heading-lg', { id: 'crit-h' }, 'Restrictions that sink submissions'), h('div.crit-grid', null, [
        ['r-ai-text', 'No AI-generated text', 'Text produced by AI or similar tools is misconduct under ARO\'s Guide.'],
        ['r-no-preprints', 'No preprint-only citations', 'arXiv papers without formal peer review may not be cited.'],
        ['r-similarity', 'Similarity above 15% is declined', 'Your own earlier text counts towards it.'],
        ['r-length', 'Words trade against figures', 'More words, fewer figures; never more than 12 tables.'],
        ['r-template', 'Stage-One template only', 'Keep its first-page fields and tick boxes.'],
        ['r-double-blind', 'Double-blind review', 'Names are not the only thing that identifies you.'],
    ].map(([id, t, s]) => h('a.card.card--lip.crit-card', { href: `#/req/${id}` }, h('span.crit-card__t', null, icon('i-alert', 18), t), h('span.ts-body-sm.c-secondary', null, s), statusBadge(req(id).status)))));
    wrap.append(restrictions);
    // filter
    const list = h('div.hb-topics');
    const input = h('input.input.hb-filter', { type: 'search', placeholder: 'Filter rules (e.g. abstract, ORCID, dpi)…', 'aria-label': 'Filter rules', value: ui.q });
    const statusSel = h('select.input.hb-status', { 'aria-label': 'Requirement status' }, ['all', 'mandatory', 'conditional', 'recommended', 'informational'].map(s => h('option', { value: s, selected: ui.status === s }, s === 'all' ? 'All statuses' : s)));
    const fill = () => {
        clear(list);
        const q = ui.q.trim().toLowerCase();
        let shown = 0;
        D.handbook.forEach(t => {
            const rs = reqsForTopic(t.id).filter(r => (ui.status === 'all' || r.status === ui.status) && (!q || `${r.title} ${r.rule} ${r.explain}`.toLowerCase().includes(q)));
            if ((q || ui.status !== 'all') && !rs.length)
                return;
            shown++;
            list.append(h('article.card.hb-topic', null, h('div.row', { style: 'justify-content: space-between' }, h('h3.ts-heading-md', null, h('a', { href: `#/handbook/${t.id}` }, t.title)), t.module ? h('span.badge.badge--subtle.badge--purple', null, 'interactive') : null), h('p.ts-body-sm.c-secondary', null, t.intro), rs.length ? h('ul.hb-rules', null, rs.map(r => h('li', null, h('a', { href: `#/req/${r.id}` }, r.title), ' ', statusBadge(r.status)))) : null, h('a.btn.btn--outline.btn--sm', { href: `#/handbook/${t.id}` }, 'Open chapter', icon('i-arrow-right', 16))));
        });
        if (!shown)
            list.append(h('p.c-secondary', null, 'No rules match. Try a broader word, or reset the status filter.'));
    };
    input.addEventListener('input', () => { ui.q = input.value; fill(); });
    statusSel.addEventListener('change', () => { ui.status = statusSel.value; fill(); });
    wrap.append(h('section', { 'aria-labelledby': 'ch-h' }, h('div.row.hb-filter-row', null, h('h2.ts-heading-lg', { id: 'ch-h' }, 'Chapters'), h('div.row', null, input, statusSel)), list));
    fill();
    root.append(wrap);
    return { keep: true };
}
// ── chapter page ─────────────────────────────────────────────────────────────
function renderTopic(root, id) {
    const t = topics.get(id);
    if (!t) {
        root.append(h('div.container', null, h('h1', null, 'Chapter not found'), h('a', { href: '#/handbook' }, 'Back to the handbook')));
        return;
    }
    const i = D.handbook.indexOf(t);
    const prev = D.handbook[i - 1], next = D.handbook[i + 1];
    const rs = reqsForTopic(id);
    const conflictIds = [...new Set(rs.flatMap(r => r.conflicts || []))];
    const page = h('div.container.hb-page');
    const nav = h('nav.hb-toc', { 'aria-label': 'Handbook chapters' }, h('div.eyebrow', null, 'Chapters'), h('ol', null, D.handbook.map(x => h('li', null, h('a', { href: `#/handbook/${x.id}`, 'aria-current': x.id === id ? 'page' : undefined }, x.title)))));
    const body = h('article.hb-body.stack', { style: '--stack-gap: 28px' }, crumbs(['Handbook', '#/handbook'], [t.title]), pageHead(`Chapter ${i + 1} of ${D.handbook.length}`, t.title, t.intro, 'purple'), t.module ? h('a.btn.btn--outline.btn--sm.jump-module', { href: '#module', onclick: (e) => { e.preventDefault(); document.getElementById('module')?.scrollIntoView({ block: 'start' }); } }, icon('i-play', 14), `Jump to the interactive part: ${MODULE_TITLE[t.module] || 'module'}`) : null, conflictIds.filter(c => conflict(c).status === 'unresolved').map(c => conflictCallout(c)), rs.length ? h('section.stack', { 'aria-labelledby': 'rules-h' }, h('h2.ts-heading-lg', { id: 'rules-h' }, `ARO rules in this chapter (${rs.length})`), h('div.stack.req-stack', null, rs.map((r, k) => requirementCard(r, k === 0 && !matchMedia('(max-width: 768px)').matches)))) : null, t.module ? h('section.stack.module', { 'aria-labelledby': 'mod-h', id: 'module' }, h('div.row', null, h('h2.ts-heading-lg', { id: 'mod-h' }, MODULE_TITLE[t.module] || 'Interactive module')), (MODULES[t.module] || (() => null))()) : null, h('nav.hb-pager', { 'aria-label': 'Chapter navigation' }, prev ? h('a.btn3d.btn3d--white', { href: `#/handbook/${prev.id}` }, h('span.btn3d__face', null, icon('i-arrow-left', 16), prev.title)) : h('span'), next ? h('a.btn3d', { href: `#/handbook/${next.id}` }, h('span.btn3d__face', null, next.title, icon('i-arrow-right', 16))) : h('a.btn3d.btn3d--green', { href: '#/readiness' }, h('span.btn3d__face', null, 'Check readiness'))));
    page.append(nav, body);
    root.append(page);
    return { keep: true };
}
// ── requirement page ─────────────────────────────────────────────────────────
export function renderRequirement(root, params) {
    const r = req(params[0]);
    if (!r) {
        root.append(h('div.container', null, h('h1', null, 'Requirement not found'), h('a', { href: '#/handbook' }, 'Back to the handbook')));
        return;
    }
    const t = topics.get(r.topic);
    const related = D.requirements.filter(x => x.id !== r.id && x.topic === r.topic);
    const resHere = D.resources.filter(x => x.stages.some(s => r.stages.includes(s)) && (x.kind === 'download' || r.sources.includes(x.source)));
    root.append(h('div.container.container--read.req-page.stack', { style: '--stack-gap: 24px' }, crumbs(['Handbook', '#/handbook'], [t.title, `#/handbook/${t.id}`], [r.title]), h('header.page-head', null, h('div.row', { style: '--row-gap: 8px' }, guidanceBadge('official'), statusBadge(r.status)), h('h1.ts-display-3xl.page-title', null, r.title)), h('section.card.req-rule-card.stack', null, h('div.eyebrow', null, 'The rule (paraphrased from ARO)'), h('p.ts-body-lg', null, r.rule), h('div.eyebrow', null, 'What it means for you'), h('p', null, r.explain), h('div.eyebrow', null, 'How to comply'), h('p', null, r.how)), (r.conflicts || []).map(c => conflictCallout(c)), h('section.stack', { 'aria-labelledby': 'src-h' }, h('h2.ts-heading-md', { id: 'src-h' }, 'Where ARO says it'), sourcesList(r.sources), verifiedNote()), h('section.stack', { 'aria-labelledby': 'st-h' }, h('h2.ts-heading-md', { id: 'st-h' }, 'Publication stages that depend on it'), h('div.row', null, r.stages.map(s => h('a.chip.chip--outline', { href: `#/stage/${s}` }, stageLabel(stage(s)))))), resHere.length ? h('section.stack', { 'aria-labelledby': 'rs-h' }, h('h2.ts-heading-md', { id: 'rs-h' }, 'Related documents'), h('ul.src-list', null, resHere.slice(0, 6).map(x => h('li', null, h('a', { href: routeFor(x.id) }, x.title), h('span.src-meta', null, ` · ${x.format}`))))) : null, h('div.row', null, h('a.btn.btn--outline', { href: `#/explore?focus=${r.id}` }, icon('a-graph', 16), 'Show in knowledge graph'), h('a.btn.btn--ghost', { href: `#/handbook/${t.id}` }, `Chapter: ${t.title}`)), related.length ? h('section.stack', { 'aria-labelledby': 'rel-h' }, h('h2.ts-heading-md', { id: 'rel-h' }, 'Also in this chapter'), h('ul.tight-list', null, related.map(x => h('li', null, h('a', { href: `#/req/${x.id}` }, x.title))))) : null));
}
// ── open questions (conflicting sources) ─────────────────────────────────────
export function renderQuestions(root, params) {
    const id = params[0];
    if (id && D.conflicts.some(c => c.id === id))
        return renderQuestion(root, id);
    const order = { unresolved: 0, informational: 2, reconciled: 1 };
    const sev = { high: 0, medium: 1, low: 2 };
    const cs = [...D.conflicts].sort((a, b) => order[a.status] - order[b.status] || sev[a.severity] - sev[b.severity]);
    root.append(h('div.container.container--read.stack', { style: '--stack-gap: 24px' }, crumbs(['Handbook', '#/handbook'], ['Open questions']), pageHead('Source integrity', 'Where ARO\'s own pages disagree', 'Each item shows every official statement side by side, what we concluded, and what to do. Unresolved items need an answer from the editorial office; record it here when you get one.', 'orange'), h('div.row', null, h('a.btn3d.btn3d--blue', { href: '#/directory?focus=email' }, h('span.btn3d__face', null, icon('a-mail', 16), 'Draft the email to ARO'))), h('div.stack.q-list', null, cs.map(c => {
        const note = store.get().confirmed[c.id];
        return h('a.card.card--lip.q-card', { href: `#/questions/${c.id}` }, h('div.row', { style: '--row-gap: 8px' }, h(`span.badge.badge--subtle.${c.status === 'unresolved' ? 'badge--yellow' : c.status === 'reconciled' ? 'badge--green' : 'badge--primary'}`, null, note ? 'answered by office' : c.status), h(`span.badge.badge--outline.${c.severity === 'high' ? 'badge--red' : c.severity === 'medium' ? 'badge--orange' : 'badge--minimal'}`, null, `${c.severity} impact`)), h('span.ts-heading-sm', null, c.title), h('span.ts-body-sm.c-secondary', null, c.recommendation));
    }))));
}
function renderQuestion(root, id) {
    const c = conflict(id);
    const note = store.get().confirmed[id] || '';
    const ta = h('textarea.input.q-note', { id: 'q-note', rows: 3, placeholder: 'e.g. 3 Nov 2026, office replied: upload the completed Stage-One file; they anonymise it.' }, note);
    root.append(h('div.container.container--read.stack', { style: '--stack-gap: 24px' }, crumbs(['Handbook', '#/handbook'], ['Open questions', '#/questions'], [c.title]), h('header.page-head', null, h('div.kicker.kicker--orange', null, c.status === 'unresolved' ? 'Unresolved: confirm with the editorial office' : c.status === 'reconciled' ? 'Reconciled' : 'Informational'), h('h1.ts-display-3xl.page-title', null, c.title)), h('section.stack', { 'aria-labelledby': 'pos-h' }, h('h2.ts-heading-md', { id: 'pos-h' }, 'What each official source says'), h('div.pos-grid', null, c.positions.map(p => h('figure.card.pos-card', null, h('blockquote.ts-body-base', null, p.claim), h('figcaption', null, sourceLink(p.source)))))), h('section.card.card--oat.stack', null, h('div.eyebrow', null, 'Analysis'), h('p', null, c.analysis), h('div.eyebrow', null, 'Recommendation'), h('p.ts-body-lg', null, c.recommendation), guidanceBadge('general')), h('section.stack', { 'aria-labelledby': 'aff-h' }, h('h2.ts-heading-md', { id: 'aff-h' }, 'Requirements affected'), h('ul.tight-list', null, c.affects.map(r => h('li', null, h('a', { href: `#/req/${r}` }, req(r).title))))), c.status === 'unresolved' ? h('section.card.stack', { 'aria-labelledby': 'note-h' }, h('h2.ts-heading-md', { id: 'note-h' }, 'Record the office\'s answer'), h('p.ts-body-sm.c-secondary', null, 'Once recorded, checklist items waiting on this question become ready to do. Saved only in this browser.'), h('label.field__label', { for: 'q-note' }, 'Answer and date'), ta, h('div.row', null, h('button.btn3d.btn3d--sm', { onclick: () => { store.confirm(id, ta.value); toast(ta.value.trim() ? 'Answer recorded' : 'Answer cleared'); sfx('select'); } }, h('span.btn3d__face', null, 'Save answer')), h('a.btn.btn--ghost.btn--sm', { href: '#/directory?focus=email' }, icon('a-mail', 16), 'Draft the email'))) : null));
}
// ── interactive modules ──────────────────────────────────────────────────────
const MODULE_TITLE = {
    structure: 'Put ARO\'s sections in order', length: 'Length and figure calculator', abstract: 'Abstract workbench',
    equations: 'Explorable: define a metric as a numbered equation', figures: 'Figure resolution calculator',
    harvard: 'Harvard referencing, ARO style', ai: 'Which uses of AI are allowed?', anonymization: 'Find what gives you away',
    submit: 'Submission walkthrough', response: 'Review simulator and response guide',
};
const MODULES = {
    structure: structureModule, length: lengthModule, abstract: abstractModule, equations: equationsModule, figures: figuresModule,
    harvard: harvardModule, ai: aiModule, anonymization: anonModule, submit: submitModule, response: responseModule,
};
const officialNote = (...ids) => h('p.ts-body-sm.c-secondary.mod-src', null, 'Based on: ', ids.map((id, i) => [i ? ' · ' : '', sourceLink(id, true)]));
// structure: reorder exercise
function structureModule() {
    const correct = ['Title, authors and first-page fields', 'Abstract and Index Terms', 'Introduction (no subheadings)', 'Materials and Methods', 'Results and Discussion', 'Conclusions', 'Appendix (if any)', 'Acknowledgment', 'References'];
    let order = [3, 0, 5, 1, 8, 2, 7, 4, 6].map(i => correct[i]);
    let result = '';
    const box = h('div.widget.stack');
    const draw = () => {
        clear(box);
        const list = h('ol.order-list', { 'aria-label': 'Sections, in your order' }, order.map((s, i) => h(`li.order-item${result === 'ok' ? '.is-ok' : result === 'no' && s !== correct[i] ? '.is-off' : ''}`, null, h('span.order-num', null, String(i + 1)), h('span.order-t', null, s), h('span.row.order-btns', { style: '--row-gap: 4px' }, h('button.icon-btn.order-btn', { 'aria-label': `Move ${s} up`, disabled: i === 0, onclick: () => { [order[i - 1], order[i]] = [order[i], order[i - 1]]; result = ''; sfx('toggle'); draw(); box.querySelectorAll('.order-btn')[Math.max(0, (i - 1) * 2)]?.focus(); } }, h('span.arrow-up', { 'aria-hidden': 'true' }, '↑')), h('button.icon-btn.order-btn', { 'aria-label': `Move ${s} down`, disabled: i === order.length - 1, onclick: () => { [order[i + 1], order[i]] = [order[i], order[i + 1]]; result = ''; sfx('toggle'); draw(); box.querySelectorAll('.order-btn')[Math.min(order.length * 2 - 1, (i + 1) * 2 + 1)]?.focus(); } }, h('span', { 'aria-hidden': 'true' }, '↓'))))));
        box.append(h('div.eyebrow', null, 'Interactive'), h('p.widget__prompt', null, 'Use the arrows to put the sections in the order ARO\'s Guide and template expect, then check.'), list, h('div.row', null, h('button.btn3d.btn3d--sm', { onclick: () => { result = order.every((s, i) => s === correct[i]) ? 'ok' : 'no'; sfx(result === 'ok' ? 'correct' : 'wrong'); draw(); } }, h('span.btn3d__face', null, 'Check')), h('button.btn3d.btn3d--white.btn3d--sm', { onclick: () => { order = [...correct]; result = 'ok'; draw(); } }, h('span.btn3d__face', null, 'Show me'))), result ? h(`div.quiz-fb__bar.quiz-fb__bar--${result === 'ok' ? 'correct' : 'incorrect'}`, { role: 'status' }, h('span.quiz-fb__icon', null, icon(result === 'ok' ? 'i-check' : 'i-x', 18)), h('div', null, h('b', null, result === 'ok' ? 'Correct!' : 'Not quite'), h('p', null, result === 'ok' ? 'Appendices sit before the Acknowledgment, and related work lives inside the Introduction because ARO lists no separate section for it.' : 'The rows marked in grey are out of place. Look at where the template puts the Appendix and the Acknowledgment.'))) : '', officialNote('aro-guide', 'tpl-stage-one'));
    };
    draw();
    return box;
}
// length: band calculator
export function lengthVerdict(type, words, figs, tables) {
    const out = [];
    if (type === 'research') {
        const bands = [[2500, 3000, 15], [3000, 4500, 12], [4500, 5000, 10], [5000, 6000, 8]];
        if (words > 6000)
            out.push({ ok: false, text: `${words.toLocaleString()} words is over 6,000, which ARO treats as overlong whatever the figure count.` });
        else if (words < 2500)
            out.push({ ok: false, text: `${words.toLocaleString()} words is below 2,500. That is the template's Letter length; a research article starts at 2,500.` });
        else {
            const b = bands.find(([lo, hi]) => words >= lo && words <= hi);
            out.push(figs < b[2] ? { ok: true, text: `${words.toLocaleString()} words falls in the ${b[0].toLocaleString()}–${b[1].toLocaleString()} band, which allows fewer than ${b[2]} figures. ${figs} is fine.` }
                : { ok: false, text: `${words.toLocaleString()} words falls in the ${b[0].toLocaleString()}–${b[1].toLocaleString()} band, which allows fewer than ${b[2]} figures. ${figs} makes the paper overlong: combine plots into panels or cut words to reach a band with a higher figure cap.` });
        }
    }
    else if (type === 'review') {
        out.push(words <= 10000 ? { ok: true, text: `${words.toLocaleString()} words is within the 10,000-word review limit.` } : { ok: false, text: 'Reviews over 10,000 words are overlong.' });
        out.push(figs < 20 ? { ok: true, text: `${figs} figures is under the review cap of 20.` } : { ok: false, text: 'Reviews need fewer than 20 figures.' });
    }
    else {
        out.push(words < 2500 ? { ok: true, text: `${words.toLocaleString()} words fits a Letter (under 2,500).` } : { ok: false, text: 'Letters are under 2,500 words; this length is a research article.' });
    }
    out.push(tables <= 12 ? { ok: true, text: `${tables} table${tables === 1 ? '' : 's'}: within the 12-table maximum.` } : { ok: false, text: `${tables} tables is over the 12-table maximum. Move detail tables to supplementary files.` });
    return out;
}
function lengthModule() {
    const st = { type: 'research', words: 5200, figs: 9, tables: 6 };
    const box = h('div.widget.stack');
    const out = h('div.stack', { 'aria-live': 'polite' });
    const num = (label, key, max, step) => {
        const id = 'len-' + key;
        const range = h('input.slider', { type: 'range', id, min: 0, max, step, value: st[key], 'aria-label': label });
        const box2 = h('input.input.len-num', { type: 'number', min: 0, max, step, value: st[key], 'aria-label': `${label} (number)` });
        const sync = (v) => { st[key] = v; range.value = String(v); box2.value = String(v); range.style.setProperty('--value', `${(v / max) * 100}%`); calc(); };
        range.addEventListener('input', () => sync(+range.value));
        box2.addEventListener('input', () => sync(Math.max(0, +box2.value || 0)));
        range.style.setProperty('--value', `${(st[key] / max) * 100}%`);
        return h('div.len-field', null, h('label.field__label', { for: id }, label), h('div.row', null, range, box2));
    };
    const calc = () => {
        clear(out);
        lengthVerdict(st.type, st.words, st.figs, st.tables).forEach(v => out.append(h(`div.len-v.len-v--${v.ok ? 'ok' : 'no'}`, null, icon(v.ok ? 'i-check' : 'i-alert', 18), h('span', null, v.text))));
    };
    const seg = h('div.segmented', { role: 'tablist', 'aria-label': 'Article type', style: '--n: 3; --i: 0' }, h('span.segmented__thumb'), [['research', 'Research article'], ['review', 'Review'], ['letter', 'Letter']].map(([v, l], i) => h('button', { role: 'tab', 'aria-selected': i === 0, onclick: (e) => {
            st.type = v;
            seg.style.setProperty('--i', String(i));
            seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', String(b === e.currentTarget)));
            sfx('toggle');
            calc();
        } }, l)));
    box.append(h('div.eyebrow', null, 'Interactive'), h('p.widget__prompt', null, 'Count words including the abstract, references and appendices, but not figure captions or table contents.'), seg, num('Words', 'words', 11000, 50), num('Figures', 'figs', 25, 1), num('Tables', 'tables', 20, 1), out, officialNote('aro-guide', 'tpl-stage-one'));
    calc();
    return box;
}
// abstract workbench
const ABS_KEY = 'aro-navigator-abstract-draft';
export function abstractStats(text) {
    const words = (text.trim().match(/\S+/g) || []).length;
    const citations = (text.match(/\([A-Z][^()]*\d{4}[a-z]?\)|\[\d+(?:[,–-]\s*\d+)*\]|et al\./g) || []);
    const acronyms = [...new Set(text.match(/\b[A-Z]{2,}[a-z]?\b/g) || [])];
    const undefinedAcr = acronyms.filter(a => !new RegExp(`\\(${a}\\)`).test(text));
    const sentences = (text.match(/[^.!?]+[.!?]+/g) || []).length;
    return { words, citations, undefinedAcr, sentences };
}
function abstractModule() {
    let saved = '';
    try {
        saved = localStorage.getItem(ABS_KEY) || '';
    }
    catch { /* storage off */ }
    const ta = h('textarea.input.abs-ta', { id: 'abs-ta', rows: 9, placeholder: 'Paste or write your abstract here. It stays in this browser.' }, saved);
    const meter = h('div.abs-meter');
    const checks = h('ul.abs-checks', { 'aria-live': 'polite' });
    const moves = ['Why: the problem or gap (what is missing or not yet solved…)', 'What: what you did (the study, method or experiment…)', 'How: data and method (materials, design, settings, measures)', 'Found: the main results, stated concretely', 'Matters: significance and who can use it'];
    const moveBox = h('div.stack', { style: '--stack-gap: 6px' }, h('div.eyebrow', null, 'The five moves ARO asks for (tick what your abstract does)'), moves.map((m, i) => h('label.row.abs-move', { style: '--row-gap: 10px' }, h('input.check', { type: 'checkbox', id: 'mv' + i }), h('span.ts-body-sm', null, m))));
    const paint = () => {
        const s = abstractStats(ta.value);
        try {
            localStorage.setItem(ABS_KEY, ta.value);
        }
        catch { /* ignore */ }
        const pct = Math.min(1, s.words / 300);
        const tone = s.words === 0 ? 'idle' : s.words < 150 ? 'low' : s.words <= 250 ? 'ok' : 'high';
        clear(meter);
        meter.append(h('div.row', { style: 'justify-content: space-between' }, h('span.readout.readout--lg', null, `${s.words} words`), h('span.ts-body-sm.c-secondary', null, 'target 150–250')), h(`div.abs-bar.abs-bar--${tone}`, { role: 'meter', 'aria-valuemin': 0, 'aria-valuemax': 300, 'aria-valuenow': s.words, 'aria-label': 'Abstract length' }, h('span.abs-bar__band'), h('span.abs-bar__fill', { style: `width: ${pct * 100}%` })));
        clear(checks);
        const row = (ok, text) => checks.append(h(`li.len-v.len-v--${ok ? 'ok' : 'no'}`, null, icon(ok ? 'i-check' : 'i-alert', 18), h('span', null, text)));
        if (!s.words) {
            checks.append(h('li.c-secondary.ts-body-sm', null, 'Checks appear as you type.'));
            return;
        }
        row(s.words >= 150 && s.words <= 250, s.words < 150 ? `${150 - s.words} more words to reach 150.` : s.words > 250 ? `${s.words - 250} words over the 250 limit.` : 'Length is within 150–250.');
        row(!s.citations.length, s.citations.length ? `Looks like ${s.citations.length} citation(s) (“${s.citations[0]}”). ARO abstracts contain none.` : 'No citations detected.');
        row(!s.undefinedAcr.length, s.undefinedAcr.length ? `Abbreviations not defined in brackets: ${s.undefinedAcr.slice(0, 6).join(', ')}. Spell them out at first use.` : 'Every abbreviation appears to be defined.');
        row(s.sentences >= 4, `${s.sentences} sentence(s). Five moves usually need at least five.`);
    };
    ta.addEventListener('input', paint);
    const box = h('div.widget.stack', null, h('div.eyebrow', null, 'Interactive'), h('label.field__label', { for: 'abs-ta' }, 'Your abstract'), ta, meter, checks, moveBox, h('p.ts-body-sm.c-secondary', null, 'This tool counts and pattern-matches; it does not judge quality. Your text never leaves this browser.'), h('div.callout.callout--oat', null, h('div.callout__title', null, icon('i-lightbulb', 18), 'Illustrative skeleton (not results)'), h('p.ts-body-sm', null, '[Problem] matters because [reason], yet [gap]. We [do what] using [data or method] and compare it with [baseline]. [Main finding with a number]. [Second finding]. [Why it matters and who can use it].'), guidanceBadge('project')), officialNote('aro-guide', 'aro-submissions', 'tpl-stage-one'), sourceLink('uci-abstract'));
    paint();
    return box;
}
// equations explorable
function equationsModule() {
    const st = { t: 920, w: 1000, b: 40 };
    const out = h('div.stack', { 'aria-live': 'polite' });
    const field = (label, key, max, hue) => {
        const id = 'eq-' + key;
        const r = h('input.slider', { type: 'range', id, min: 1, max, value: st[key], style: `--slider-fill: var(--bg-${hue}-primary); --value: ${st[key] / max * 100}%` });
        const ro = h('span.readout', null, String(st[key]));
        r.addEventListener('input', () => { st[key] = +r.value; r.style.setProperty('--value', `${+r.value / max * 100}%`); ro.textContent = r.value; paint(); });
        return h('div.len-field', null, h('div.row', { style: 'justify-content: space-between' }, h('label.field__label', { for: id }, h(`span.eq-var.eq-var--${hue}`, null, label)), ro), r);
    };
    const paint = () => {
        clear(out);
        const f = st.t / st.w, c = st.w / st.b;
        out.append(h('div.eq-display', { role: 'math', 'aria-label': `A equals C over N equals ${f.toFixed(2)}` }, h('span', null, h('i', null, 'A'), ' = ', h('i.eq-var--blue', null, 'C'), ' / ', h('i.eq-var--orange', null, 'N'), ` = ${f.toFixed(2)}`), h('span.eq-num', null, '(1)')), h('div.eq-display', { role: 'math', 'aria-label': `R equals N over T equals ${c.toFixed(2)}` }, h('span', null, h('i', null, 'R'), ' = ', h('i.eq-var--orange', null, 'N'), ' / ', h('i.eq-var--purple', null, 'T'), ` = ${c.toFixed(2)} cases per second`), h('span.eq-num', null, '(2)')), h('p.ts-body-sm', null, `Read it in words: ${(f * 100).toFixed(0)}% of the test cases are classified correctly. In the text you would write “as (1) shows”, not “Eq. (1)”, except at the start of a sentence.`));
    };
    const box = h('div.widget.stack', null, h('div.eyebrow', null, 'Explorable · illustrative numbers'), h('p.widget__prompt', null, 'Any measure you define yourself, such as accuracy and processing rate here, belongs in Methods as a numbered equation. Move the sliders to see how the numbered equations behave, then copy the pattern into Methods.'), h('div.stage.eq-stage', null, out), field('C: correct predictions', 't', 2000, 'blue'), field('N: test cases', 'w', 2000, 'orange'), field('T: seconds taken', 'b', 600, 'purple'), h('div.callout.callout--purple', null, h('div.callout__title', null, icon('i-sigma', 18), 'ARO\'s equation rules'), h('ul.ts-body-sm.tight-list', null, h('li', null, 'Number consecutively in parentheses, flush right.'), h('li', null, 'Italicise variables; define every symbol right before or after the equation.'), h('li', null, 'Use Word\'s equation editor or MathType, never “float over text”.'), h('li', null, 'SI units; never mix SI and CGS in one equation.'))), officialNote('aro-guide', 'tpl-stage-one'));
    paint();
    return box;
}
// figure dpi calculator
function figuresModule() {
    const st = { px: 2100, width: 3.5, kind: 'line' };
    const need = { line: 600, photo: 300, colour: 400 };
    const out = h('div', { 'aria-live': 'polite' });
    const pxIn = h('input.input', { type: 'number', id: 'fig-px', min: 100, value: st.px });
    const wSel = h('select.input', { id: 'fig-w' }, h('option', { value: '3.5' }, 'One column (3.5 in)'), h('option', { value: '7.0625' }, 'Two columns (7 1/16 in)'));
    const kSel = h('select.input', { id: 'fig-k' }, h('option', { value: 'line' }, 'Line art / plot (600 dpi)'), h('option', { value: 'photo' }, 'Photo or greyscale (300 dpi)'), h('option', { value: 'colour' }, 'Colour image (400 dpi)'));
    const paint = () => {
        st.px = +pxIn.value || 0;
        st.width = +wSel.value;
        st.kind = kSel.value;
        const dpi = Math.round(st.px / st.width), req2 = need[st.kind], minPx = Math.ceil(req2 * st.width);
        clear(out);
        out.append(h(`div.len-v.len-v--${dpi >= req2 ? 'ok' : 'no'}`, null, icon(dpi >= req2 ? 'i-check' : 'i-alert', 18), h('span', null, `${st.px} px across ${st.width} in = ${dpi} dpi. ${dpi >= req2 ? `Meets the template's ${req2} dpi for this kind of figure.` : `Below ${req2} dpi: export at least ${minPx} px wide.`} The Guide's floor for any bitmap is 300 dpi.`)));
    };
    [pxIn, wSel, kSel].forEach(x => x.addEventListener('input', paint));
    const box = h('div.widget.stack', null, h('div.eyebrow', null, 'Interactive'), h('div.fig-grid', null, h('div.len-field', null, h('label.field__label', { for: 'fig-px' }, 'Image width in pixels'), pxIn), h('div.len-field', null, h('label.field__label', { for: 'fig-w' }, 'Printed width'), wSel), h('div.len-field', null, h('label.field__label', { for: 'fig-k' }, 'Figure type'), kSel)), out, h('pre.code', { 'aria-label': 'Python example' }, h('code', null, '# matplotlib: size in inches × dpi = pixels\nfig, ax = plt.subplots(figsize=(3.5, 2.4))\n...\nfig.savefig("fig1.tif", dpi=600)  # line plot, one column')), h('div.callout.callout--oat', null, h('div.callout__title', null, icon('i-info', 18), 'Captions and placement'), h('p.ts-body-sm', null, 'Place each figure in the text right after the paragraph that first cites it. Caption style: “Fig. 1.” then a sentence that says what the reader should see, e.g. “Fig. 1. Accuracy of the three methods as training size grows, on the test set.”')), officialNote('aro-guide', 'tpl-stage-one', 'aro-submissions'));
    paint();
    return box;
}
// Harvard
function harvardModule() {
    const ex = (label, pattern, example) => h('div.harv-ex', null, h('div.eyebrow', null, label), h('code.harv-pattern', null, pattern), h('p.harv-example', null, example));
    const pair = (bad, good, why) => h('div.harv-pair', null, h('div.harv-bad', null, h('span.harv-tag', null, icon('i-x', 14), 'Incorrect'), h('p', null, bad)), h('div.harv-good', null, h('span.harv-tag', null, icon('i-check', 14), 'Correct'), h('p', null, good)), h('p.ts-body-sm.c-secondary.harv-why', null, why));
    const step = (n, title, ...kids) => h('details.deeper.harv-step', { open: n === 1 }, h('summary', null, h('span.deeper__icon', null, String(n)), h('span.deeper__t', null, h('b', null, title), h('small', null, `Part ${n} of 10`)), h('span.deeper__chev')), h('div.deeper__body', null, ...kids));
    return h('div.stack.harvard', null, h('div.callout.callout--oat', null, h('div.callout__title', null, icon('i-info', 18), 'About the examples'), h('p.ts-body-sm', null, 'All authors, titles, journals and DOIs below are invented to show the format. The patterns come from ARO\'s Stage-One template examples and the Anglia Ruskin University Harvard guide that ARO links to.')), step(1, 'How author–date works', h('p', null, 'Harvard ties each citation in the text to one entry in an alphabetical reference list through the author\'s surname and the year. There are no numbers. A reader who sees (Karim, 2019) looks up “Karim” in the list.'), h('p', null, 'If the author is part of your sentence, only the year goes in brackets: “Karim (2019) showed…”. Otherwise both go in brackets: “…as shown before (Karim, 2019).”'), guidanceBadge('official')), step(2, 'In-text citations: one, two, three, four or more authors', h('div.table-wrap', null, h('table.table', null, h('thead', null, h('tr', null, h('th', null, 'Authors'), h('th', null, 'In brackets'), h('th', null, 'In your sentence'))), h('tbody', null, [
        ['One', '(Karim, 2019)', 'Karim (2019)'],
        ['Two', '(Hassan and Omar, 2021)', 'Hassan and Omar (2021)'],
        ['Three', '(Ali, Bakr and Chro, 2020)', 'Ali, Bakr and Chro (2020)'],
        ['Four or more', '(Dara et al., 2023)', 'Dara et al. (2023)'],
        ['With a page', '(Karim, 2019, p.12)', 'Karim (2019, pp.12-14)'],
    ].map(r => h('tr', null, r.map(c => h('td', null, c))))))), h('p.ts-body-sm', null, 'Use “and”, never “&”. “et al.” has no full stop after “et”. The four-author threshold for et al. comes from the ARU guide; ARO\'s own pages do not set one.')), step(3, 'Reference list: journal article, book, website, conference paper', ex('Journal article (ARO template pattern)', 'Surname, I. and Surname, I., Year. Title. Journal Name, Volume(Issue), pp.first-last. Retrieved from DOI link.', 'Hassan, R.K. and Omar, L., 2021. Subword units for a low-resource language. Journal of Example Linguistics, 12(3), pp.45-60. Retrieved from http://dx.doi.org/10.0000/example.123.'), ex('Book (ARO template pattern)', 'Surname, I., Year. Title. Edition ed. Place: Publisher.', 'Karim, S.A., 2019. Introduction to text processing. 2nd ed. Erbil: Example Press.'), ex('Website (ARU pattern)', 'Author or Organisation, Year. Page title. [online] Available at: <URL> [Accessed Day Month Year].', 'Example Statistics Institute, 2024. Annual survey results. [online] Available at: <https://example.org/survey> [Accessed 3 March 2026].'), ex('Conference paper (ARO template pattern)', 'Surname, I., Year. Paper title. In: Organiser, Conference name. Place, Dates. Place: Publisher.', 'Rahman, D., 2022. Evaluating methods for noisy sensor data. In: Example Association for Engineering, Proceedings of the 5th Example Workshop. Online, 10-12 May 2022. Example City: Example Publisher.')), step(4, 'DOI and URL placement', h('p', null, 'ARO\'s template ends a journal reference with the DOI as a link: “Retrieved from http://dx.doi.org/…”. The submission checklist asks for URLs wherever available. For web pages, the URL follows “Available at:” and the access date follows in square brackets.'), h('p', null, 'Find missing DOIs by pasting your reference list into Crossref Simple Text Query, which the Guide recommends.'), sourceLink('crossref-stq')), step(5, 'Several sources in one bracket', h('p', null, 'Separate with semicolons, earliest first: (Karim, 2019; Hassan and Omar, 2021; Dara et al., 2023). Same author, same year: add letters, (Karim, 2019a; 2019b), and use the same letters in the list.')), step(6, 'Common mistakes', h('ul.tight-list', null, h('li', null, 'Numbered citations like [3] left over from an ACL or IEEE LaTeX template.'), h('li', null, '“&” instead of “and”; “et. al” instead of “et al.”'), h('li', null, '“et al.” in the reference list. In the list, name every author.'), h('li', null, 'A reference list in citation order instead of alphabetical order.'), h('li', null, 'arXiv-only papers. ARO does not accept non-peer-reviewed preprints.'), h('li', null, 'Copying the small inconsistencies in the template examples (a missing comma between two authors, no space before “[e-book]”).'))), step(7, 'Incorrect vs correct', pair('[3] R. K. Hassan & L. Omar, "Subword units for a low-resource language," J. Ex. Ling., vol. 12, 2021.', 'Hassan, R.K. and Omar, L., 2021. Subword units for a low-resource language. Journal of Example Linguistics, 12(3), pp.45-60. Retrieved from http://dx.doi.org/10.0000/example.123.', 'IEEE style → ARO Harvard: surname first, year after the names, journal in full, volume(issue), pp. range, DOI link.'), pair('(Dara, Ezat, Faraj and Gona 2023)', '(Dara et al., 2023)', 'Four or more authors become “et al.” in the text, with a comma before the year.'), pair('Example Institute (2024). Annual survey results. https://example.org/survey', 'Example Statistics Institute, 2024. Annual survey results. [online] Available at: <https://example.org/survey> [Accessed 3 March 2026].', 'Web pages need “Available at:” and an access date.')), step(8, 'Practice', quiz({ id: 'hv1', prompt: 'Which in-text citation of a two-author paper follows ARO\'s Harvard style?', correct: 'b', hint: 'Look at the word between the names and the punctuation before the year.',
        options: [{ id: 'a', text: '(Hassan & Omar, 2021)', why: '' }, { id: 'b', text: '(Hassan and Omar, 2021)', why: 'Harvard uses “and” between two authors and a comma before the year.' }, { id: 'c', text: '[2]', why: '' }, { id: 'd', text: '(Hassan, Omar 2021)', why: '' }] }, true), quiz({ id: 'hv2', prompt: 'Which reference-list entry matches the pattern in ARO\'s Stage-One template?', correct: 'c', hint: 'Check where the year sits and how the pages are written.',
        options: [{ id: 'a', text: 'Hassan, R.K., Omar, L. (2021) “Subword units…”, Journal of Example Linguistics 12:45–60.', why: '' },
            { id: 'b', text: 'R. K. Hassan and L. Omar. 2021. Subword units… In Journal of Example Linguistics.', why: '' },
            { id: 'c', text: 'Hassan, R.K. and Omar, L., 2021. Subword units for a low-resource language. Journal of Example Linguistics, 12(3), pp.45-60.', why: 'Surname and initials, comma, year, full stop, title, journal, volume(issue), pp. range: the template\'s journal pattern.' }] }, true), quiz({ id: 'hv3', prompt: 'A key paper in your field exists only on arXiv and was never peer reviewed. What should you do?', correct: 'c', hint: 'Re-read the References section of the Guide to Authors.',
        options: [{ id: 'a', text: 'Cite it normally with its arXiv number', why: '' }, { id: 'b', text: 'Cite it but mark it [Preprint]', why: '' },
            { id: 'c', text: 'Look for a peer-reviewed version (e.g. in a journal or conference proceedings); if none exists, do not cite it, or ask the office', why: 'ARO does not accept citations of non-peer-reviewed preprints. Published versions are fine.' }] })), step(9, 'Where ARO says it', sourcesList(['aro-guide', 'tpl-stage-one', 'aru-harvard', 'aro-submissions']), h('p.ts-body-sm.c-secondary', null, 'How ARO differs from generic Harvard, as far as the official pages document it: the template\'s DOI form (“Retrieved from http://dx.doi.org/…”), a minimum of 15 references, URLs wherever available, and the preprint ban. Note that published ARO articles show a different “How to cite” format, which is the journal\'s production style, not what you submit.')), step(10, 'Tools that help', h('p', null, 'A reference manager stores your sources and formats them. Choose a Harvard style, then compare one journal entry and one book entry with the patterns above and fix any differences by hand.'), h('ul.src-list', null, ['zotero', 'mendeley', 'crossref-stq', 'acl-anthology'].map(id => h('li', null, sourceLink(id)))), guidanceBadge('general')));
}
// AI policy scenarios
function aiModule() {
    const sc = [
        { id: 'ai1', text: 'Word\'s spelling and grammar checker corrects a sentence you wrote', v: 'ok', why: 'The Guide encourages grammar-check software. It corrects your sentence rather than generating new text.' },
        { id: 'ai2', text: 'A chatbot drafts your related-work paragraphs, which you then edit', v: 'no', why: 'That is AI-generated text. ARO calls it scientific misconduct, even after editing.' },
        { id: 'ai3', text: 'A paraphrasing tool rewrites a paragraph to lower the similarity score', v: 'no', why: 'Generated text, and an attempt to game the similarity check. Rewrite it yourself or quote and cite.' },
        { id: 'ai4', text: 'Machine-translating your own draft, written in another language, into English', v: 'ask', why: 'Not addressed explicitly. Translation output is generated text, so the safe path is to write in English or ask the office first.' },
        { id: 'ai5', text: 'Benchmarking existing AI models (such as GPT or Llama) as part of your experiments', v: 'ok', why: 'Language models are the object of your research, not authors of your text. Describe them fully in Methods.' },
        { id: 'ai6', text: 'An AI image tool draws your architecture diagram', v: 'ask', why: 'ARO\'s rule names text only. Draw figures yourself, or ask the office and disclose it.' },
    ];
    const label = { ok: 'Allowed', no: 'Not allowed', ask: 'Ask the office' };
    const box = h('div.stack');
    const ans = {};
    const list = h('div.stack.ai-list');
    const draw = () => {
        clear(list);
        sc.forEach(s => {
            const a = ans[s.id];
            list.append(h(`div.card.ai-row${a ? (a === s.v ? '.is-ok' : '.is-no') : ''}`, null, h('p.ai-q', null, s.text), h('div.row.ai-btns', { role: 'group', 'aria-label': s.text }, ['ok', 'no', 'ask'].map(v => h('button.chip.chip--sm', {
                'aria-pressed': a === v, onclick: () => { ans[s.id] = v; sfx(v === s.v ? 'correct' : 'wrong'); draw(); },
            }, label[v]))), a ? h('p.ts-body-sm.ai-why', { role: 'status' }, h('b', null, a === s.v ? 'Correct! ' : `Not quite: ${label[s.v].toLowerCase()}. `), s.why) : null));
        });
    };
    draw();
    box.append(h('div.callout.callout--red', null, h('div.callout__title', null, icon('i-alert', 18), 'The rule'), h('p', null, 'ARO\'s Guide to Authors, under Plagiarism: text generated from AI, machine learning or similar algorithmic tools is not allowed in submitted papers, and a violation is scientific misconduct.')), h('div.callout.callout--yellow', null, h('div.callout__title', null, icon('i-info', 18), 'The contradiction on the same page'), h('p.ts-body-sm', null, 'The Guide also encourages grammar software and links “Free AI writing tools” (grammar checkers, paraphrasers, summarisers). It never says which of those are exempt.'), h('a.c-link', { href: '#/questions/c-ai-tools' }, 'Read the analysis')), h('div.widget.stack', null, h('div.eyebrow', null, 'Interactive · our reading, not an ARO ruling'), h('p.widget__prompt', null, 'For each use, choose what ARO\'s rules imply.'), list), h('div.card.stack', null, h('h3.ts-heading-sm', null, 'Protect yourself'), guidanceBadge('general'), h('ul.tight-list', null, h('li', null, 'Keep drafts and version history (Word, Google Docs or Git) as evidence of authorship.'), h('li', null, 'Ask every co-author to confirm they wrote their parts.'), h('li', null, 'Ask the office whether grammar-tool use should be declared.'))), officialNote('aro-guide'));
    return box;
}
// anonymisation exercise
function anonModule() {
    const parts = [
        { t: 'We extend ' }, { t: 'our previous work (Ahmed and Sarkawt, 2025)', leak: 'First-person self-citation. Write “Ahmed and Sarkawt (2025) proposed…” in the third person.' },
        { t: ' on sensor calibration. Code is available at ' }, { t: 'github.com/example-lab/calibration-tool', leak: 'A repository URL with your lab or username. Use an anonymised link or say it will be released after review.' },
        { t: '. Experiments ran on ' }, { t: 'the Koya University GPU cluster', leak: 'Names your institution. Write “a university GPU cluster”.' },
        { t: ' using 16 GPUs. ' }, { t: 'We thank Dr. Example for comments.', leak: 'Acknowledgments identify you. Keep them out of the anonymised copy.' },
        { t: ' The dataset contains 1.2 million records collected from public sources.' },
    ];
    const found = new Set();
    let reveal = false;
    const box = h('div.widget.stack');
    const total = parts.filter(p => p.leak).length;
    const draw = () => {
        clear(box);
        const para = h('p.anon-text', null, parts.map((p, i) => p.leak || reveal ? h(`button.anon-span${found.has(i) || (reveal && p.leak) ? '.is-found' : ''}${!p.leak ? '.is-plain' : ''}`, {
            'aria-pressed': found.has(i), disabled: !p.leak && reveal, onclick: () => { if (!p.leak)
                return; found.has(i) ? found.delete(i) : found.add(i); sfx(found.has(i) ? 'select' : 'toggle'); draw(); },
        }, p.t) : h('span', null, p.t)));
        box.append(h('div.eyebrow', null, 'Interactive · invented text'), h('p.widget__prompt', null, `This paragraph from an “anonymised” manuscript still identifies its authors in ${total} places. Tap each one.`), h('div.stage.anon-stage', null, para), h('div.row', null, h('span.readout', null, `${found.size} of ${total} found`), h('button.btn3d.btn3d--white.btn3d--sm', { onclick: () => { reveal = true; parts.forEach((p, i) => p.leak && found.add(i)); draw(); } }, h('span.btn3d__face', null, 'Show me'))), h('ul.stack.anon-found', { style: '--stack-gap: 8px', 'aria-live': 'polite' }, [...found].map(i => h('li.len-v.len-v--ok', null, icon('i-check', 18), h('span', null, h('b', null, parts[i].t + ': '), parts[i].leak)))), found.size === total ? h('div.quiz-fb__bar.quiz-fb__bar--correct', { role: 'status' }, h('span.quiz-fb__icon', null, icon('i-check', 18)), h('div', null, h('b', null, 'Correct!'), h('p', null, 'Names are the easy part. Self-citations, links, places and acknowledgements give authors away just as surely.'))) : '', h('div.card.stack', null, h('h3.ts-heading-sm', null, 'Making the anonymised copy'), guidanceBadge('general'), h('ol.tight-list', null, h('li', null, 'Save a copy of the Stage-One file; delete the author block on page 1 (names, emails, ORCID, Scholar links). Keep the article-type and discipline ticks.'), h('li', null, 'Rewrite self-citations in the third person; keep them in the reference list.'), h('li', null, 'Replace lab, university and repository names with neutral wording.'), h('li', null, 'Remove acknowledgements and funding from this copy.'), h('li', null, 'Word: File → Info → Check for Issues → Inspect Document → remove Document Properties and Personal Information.'), h('li', null, 'Run the .docx check on the Readiness page: it flags author properties, emails, ORCIDs and repository links.'))), h('div.callout.callout--yellow', null, h('div.callout__title', null, icon('i-alert', 18), 'Which file to upload is an open question'), h('p.ts-body-sm', null, 'ARO\'s Guide and template say the office removes author details; the checklist says submit without names.'), h('a.c-link', { href: '#/questions/c-anonymization' }, 'See the comparison')));
    };
    draw();
    return box;
}
// submission walkthrough (conceptual: authenticated screens not inspected)
function submitModule() {
    const steps = [
        { title: 'Prepare the manuscript', page: 'Guide to Authors and Submissions checklist', source: 'aro-guide', action: 'Finish the Stage-One file and the anonymised copy; work through the Readiness page.', enter: [], docs: ['Stage-One .docx', 'Anonymised .docx (pending the office\'s answer)', 'Supplementary files'], verify: 'Every checklist item you will tick is true.', expect: 'Nothing yet.' },
        { title: 'Register an account', page: 'Register', source: 'aro-register', action: 'Fill in the public registration form and choose Register.', enter: ['Given name*, family name', 'Affiliation*, country*', 'Email* (your official university address)', 'Username*, password*', 'Privacy consent; optional reviewer interest'], docs: [], verify: 'The email is your institutional one, as the checklist requires.', expect: 'An account you can log in with (fields marked * were required when checked).' },
        { title: 'Log in and start a submission', page: 'Login → Make a Submission', source: 'aro-login', action: 'Log in and choose the option to start a new submission (the How to Submit page calls it “Submit Manuscript” or similar).', enter: [], docs: [], verify: 'You are in the ARO journal, not another journal on the same platform.', expect: 'The first submission screen. Exact labels may differ: we could not inspect logged-in screens.' },
        { title: 'Confirm the checklist and comments', page: 'Submission start', source: 'aro-submissions', action: 'Tick each checklist item and write Comments to the Editor.', enter: ['Earlier versions of the work, if any', 'Which manuscript copy you uploaded and why (see the anonymisation question)'], docs: [], verify: 'The section (Articles) matches your article type.', expect: 'The upload step.' },
        { title: 'Upload files', page: 'Upload', source: 'aro-howto', action: 'Upload the main manuscript, then each supplementary file separately.', enter: ['A file type label for each upload'], docs: ['Manuscript .docx', 'Supplementary files'], verify: 'Opening the uploaded file shows the right version.', expect: 'A list of uploaded files.' },
        { title: 'Enter metadata', page: 'Metadata', source: 'aro-guide', action: 'Enter title, abstract, keywords and every author with affiliation, ORCID and Google Scholar URL; mark the corresponding author.', enter: ['Title and abstract pasted from the final file', 'About five keywords', 'Per author: name, email, affiliation, country, ORCID, Scholar URL, biography'], docs: [], verify: 'Spelling of every name and affiliation matches the manuscript and ORCID.', expect: 'A review screen.' },
        { title: 'Review and submit', page: 'Confirmation', source: 'aro-howto', action: 'Review files and metadata, then submit.', enter: [], docs: [], verify: 'Nothing will change after this: ARO does not allow edits during review.', expect: 'A confirmation email acknowledging receipt.' },
        { title: 'Track status', page: 'Your dashboard', source: 'aro-faq', action: 'Log in to see whether the paper is in review, under revision or accepted.', enter: [], docs: [], verify: 'The confirmation email arrived; save it.', expect: 'First review in about 4–6 weeks; a decision typically 8–12 weeks after submission.' },
    ];
    let i = 0;
    const box = h('div.widget.stack');
    const draw = () => {
        clear(box);
        const s = steps[i];
        box.append(h('div.callout.callout--yellow', null, h('div.callout__title', null, icon('i-info', 18), 'Conceptual simulation'), h('p.ts-body-sm', null, 'Built from ARO\'s public pages and the public registration form. The logged-in submission screens were not inspected, so button labels and step order may differ. This site never submits or contacts anyone for you.')), h('div.steps', { 'aria-hidden': 'true' }, steps.map((_, k) => h(`span.steps__seg${k < i ? '.steps__seg--correct' : k === i ? '.steps__seg--current' : ''}`, { style: `--f: ${k <= i ? 1 : 0}` }))), h('div.eyebrow', null, `Step ${i + 1} of ${steps.length}`), h('h3.ts-heading-lg', null, s.title), h('dl.walk', null, h('dt', null, 'Where'), h('dd', null, s.page, ' · ', sourceLink(s.source, true)), h('dt', null, 'What to do'), h('dd', null, s.action), s.enter.length ? [h('dt', null, 'Information to enter'), h('dd', null, h('ul.tight-list', null, s.enter.map(x => h('li', null, x))))] : null, s.docs.length ? [h('dt', null, 'Documents'), h('dd', null, h('ul.tight-list', null, s.docs.map(x => h('li', null, x))))] : null, h('dt', null, 'Check before continuing'), h('dd', null, s.verify), h('dt', null, 'What you should see'), h('dd', null, s.expect)), h('div.row', null, h('button.btn3d.btn3d--white.btn3d--sm', { disabled: i === 0, onclick: () => { i--; draw(); } }, h('span.btn3d__face', null, icon('i-arrow-left', 16), 'Back')), i < steps.length - 1 ? h('button.btn3d.btn3d--sm', { onclick: () => { i++; sfx('reveal'); draw(); } }, h('span.btn3d__face', null, 'Continue', icon('i-arrow-right', 16)))
            : h('a.btn3d.btn3d--green.btn3d--sm', { href: '#/stage/s07' }, h('span.btn3d__face', null, 'Open stage 07'))), h('div.row', null, external(src('aro-register').url, 'Register'), external(src('aro-login').url, 'Log in'), external(src('aro-submissions').url, 'Make a Submission')));
    };
    draw();
    return box;
}
// review simulator + response guide
function responseModule() {
    const nodes = {
        sub: { id: 'sub', label: 'Submitted', official: true, text: 'You receive a confirmation email. You cannot change the manuscript while it is under review.', next: [{ label: 'Editorial screening', to: 'screen' }] },
        screen: { id: 'screen', label: 'Editorial screening', official: true, text: 'Checked for completeness, scope and similarity (Crossref CrossCheck). A similarity report above 15% is declined at this point. The office removes author details before review (per the Guide).', next: [{ label: 'Sent to review', to: 'review' }, { label: 'Declined at screening', to: 'reject' }] },
        review: { id: 'review', label: 'Double-blind peer review', official: true, text: 'At least two subject experts, at least one not suggested by you. Identities are hidden both ways. The FAQ puts first review at about 4–6 weeks.', next: [{ label: 'Associate Editor recommends', to: 'ae' }] },
        ae: { id: 'ae', label: 'Recommendation and decision', official: true, text: 'An Associate Editor recommends acceptance, revision or rejection to the Editor-in-Chief, who decides. Typical time to a decision: 8–12 weeks from submission.', next: [{ label: 'Acceptance', to: 'accept' }, { label: 'Revision', to: 'revise' }, { label: 'Rejection', to: 'reject' }] },
        revise: { id: 'revise', label: 'Revision', official: true, text: 'ARO names revision as an outcome. Journals often split it into minor and major revision; ARO\'s pages do not, so treat that split as illustrative. Revise in consultation with the editor and reviewers, answer every comment, and resubmit.', next: [{ label: 'Resubmit for another look', to: 'review' }, { label: 'Accepted after revision', to: 'accept' }] },
        accept: { id: 'accept', label: 'Acceptance', official: true, text: 'Stage Two: ARO\'s contracted editing company edits and proofreads the paper free of charge, and the production team prepares the camera-ready version. It goes online ahead of print with a DOI, then into the next issue.', next: [{ label: 'Start again', to: 'sub' }] },
        reject: { id: 'reject', label: 'Rejection', official: true, text: 'Rejected authors are notified promptly. ARO\'s public pages describe no appeal procedure; if you think there was a factual error, write to the office politely with evidence.', next: [{ label: 'Start again', to: 'sub' }] },
    };
    const order = ['sub', 'screen', 'review', 'ae', 'revise', 'accept', 'reject'];
    let cur = 'sub';
    const visited = new Set(['sub']);
    const sim = h('div.widget.stack');
    const draw = () => {
        clear(sim);
        const n = nodes[cur];
        sim.append(h('div.eyebrow', null, 'Interactive · ARO-documented states'), h('div.flow', { role: 'list', 'aria-label': 'Review stages' }, order.map(id => h(`button.flow-node${id === cur ? '.is-current' : visited.has(id) ? '.is-seen' : ''}${id === 'accept' ? '.flow-node--good' : id === 'reject' ? '.flow-node--bad' : ''}`, {
            role: 'listitem', 'aria-current': id === cur ? 'step' : undefined, onclick: () => { cur = id; visited.add(id); draw(); },
        }, nodes[id].label))), h('div.card.stack.flow-card', { 'aria-live': 'polite' }, h('h3.ts-heading-md', null, n.label), h('p', null, n.text), h('div.row', null, n.next.map(x => h('button.btn3d.btn3d--sm.btn3d--white', { onclick: () => { cur = x.to; visited.add(x.to); sfx('reveal'); draw(); } }, h('span.btn3d__face', null, x.label, icon('i-arrow-right', 16)))))), officialNote('aro-review-process', 'aro-review-policy', 'aro-faq', 'aro-guide', 'aro-mes'));
    };
    draw();
    const tpl = `# Response to reviewers\n\nManuscript: [title]\nSubmission ID: [number]\n\nWe thank the editor and reviewers for their comments. Below, reviewer comments are in quotes; our responses follow, with the location of each change in the revised manuscript. Changes are highlighted in the revised file.\n\n## Reviewer 1\n\n**Comment 1.1** "[paste the comment exactly]"\n\n**Response.** [Agree / partly agree / respectfully disagree, and why. Evidence or new analysis.]\n\n**Change.** [What changed, with section, page and line.]\n\n## Reviewer 2\n\n**Comment 2.1** "…"\n\n**Response.** …\n\n**Change.** …\n`;
    return h('div.stack', null, sim, h('section.card.stack', { 'aria-labelledby': 'resp-h' }, h('h3.ts-heading-md', { id: 'resp-h' }, 'Writing a point-by-point response'), guidanceBadge('general'), h('ol.tight-list', null, h('li', null, 'Read everything, then wait a day before replying.'), h('li', null, 'Number every comment (1.1, 1.2, 2.1…) and copy it exactly.'), h('li', null, 'Answer each one: what you did, why, and where in the manuscript. Never answer only “Done”.'), h('li', null, 'Disagree with evidence and courtesy; offer a smaller change where you can.'), h('li', null, 'Mark changes (tracked changes or highlighting), and keep the revised file anonymous.'), h('li', null, 'Re-run the length, reference and similarity checks: revisions often add words and citations.')), h('div.row', null, h('button.btn.btn--outline.btn--sm', { onclick: () => { download('response-to-reviewers.md', tpl); toast('Template downloaded'); } }, icon('a-download', 16), 'Download response template (.md)'))), h('p.ts-body-sm.c-secondary', null, 'Educational guidance only. Follow the instructions in your decision letter if they differ.'), h('p.ts-body-sm', null, 'Related: ', h('a', { href: `#/stage/s08` }, stageLabel(stage('s08'))), ' · ', h('a', { href: '#/req/r-no-changes' }, req('r-no-changes').title), ' · ', h('a', { href: routeFor(res('res-mes').id) }, res('res-mes').title)));
}
