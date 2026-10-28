// App shell: app bar, navigation, hash router, global search, guided tour, theme.
import { h, icon, clear, qs } from './lib/dom.js';
import { store } from './lib/store.js';
import { search } from './lib/search.js';
import { sfx } from './lib/ui.js';
import { renderJourney, renderStage } from './views/journey.js';
import { renderExplore } from './views/explore.js';
import { renderHandbook, renderRequirement, renderQuestions } from './views/handbook.js';
import { renderResearch } from './views/research.js';
import { renderResources, renderSources } from './views/resources.js';
import { renderReadiness } from './views/readiness.js';
import { renderDirectory } from './views/directory.js';
const NAV = [
    { id: 'journey', label: 'Journey', short: 'Journey', href: '#/', icon: 'a-map' },
    { id: 'explore', label: 'Explore', short: 'Graph', href: '#/explore', icon: 'a-graph' },
    { id: 'handbook', label: 'Handbook', short: 'Rules', href: '#/handbook', icon: 'i-book' },
    { id: 'research', label: 'Your Paper', short: 'Paper', href: '#/research', icon: 'a-flask' },
    { id: 'resources', label: 'Resources', short: 'Files', href: '#/resources', icon: 'a-doc' },
    { id: 'readiness', label: 'Readiness', short: 'Ready', href: '#/readiness', icon: 'a-checklist' },
    { id: 'directory', label: 'Directory', short: 'ARO', href: '#/directory', icon: 'a-users' },
];
const ROUTES = {
    '': { view: renderJourney, nav: 'journey' },
    stage: { view: renderStage, nav: 'journey' },
    explore: { view: renderExplore, nav: 'explore' },
    handbook: { view: renderHandbook, nav: 'handbook' },
    req: { view: renderRequirement, nav: 'handbook' },
    questions: { view: renderQuestions, nav: 'handbook' },
    research: { view: renderResearch, nav: 'research' },
    resources: { view: renderResources, nav: 'resources' },
    sources: { view: renderSources, nav: 'resources' },
    readiness: { view: renderReadiness, nav: 'readiness' },
    directory: { view: renderDirectory, nav: 'directory' },
};
const app = document.getElementById('app');
let main;
let keepCurrent = false;
function shell() {
    clear(app);
    const themeBtn = h('button.icon-btn', { 'aria-label': 'Switch light or dark theme', onclick: toggleTheme }, icon('i-moon', 22));
    const bar = h('header.app-bar', null, h('div.app-bar__inner', null, h('a.app-bar__brand.brand', { href: '#/', 'aria-label': 'ARO Publication Guide, home' }, h('span.brand__logo', { 'aria-hidden': 'true' }, 'ARO'), h('span.brand__text', { 'aria-hidden': 'true' }, 'Publication Guide')), h('nav.app-bar__nav.main-nav', { 'aria-label': 'Primary' }, NAV.map(n => h('a', { href: n.href, 'data-nav': n.id }, icon(n.icon, 16), h('span', null, n.label)))), h('div.app-bar__actions', null, h('button.icon-btn', { 'aria-label': 'Search (press /)', onclick: openSearch, 'data-search-btn': '' }, icon('a-search', 22)), themeBtn, h('a.gh-link', { href: 'https://github.com/SawabS', target: '_blank', rel: 'noopener noreferrer', 'aria-label': 'SawabS on GitHub (opens in a new tab)', title: 'github.com/SawabS' }, icon('a-github', 20), h('span.gh-link__name', { 'aria-hidden': 'true' }, 'SawabS')))));
    main = h('main#main', { tabindex: '-1' });
    const tabbar = h('nav.tabbar', { 'aria-label': 'Primary (mobile)' }, NAV.map(n => h('a', { href: n.href, 'data-nav': n.id }, icon(n.icon, 20), h('span', null, n.short))));
    const footer = h('footer.site-footer.app-footer', null, h('div.app-footer__inner', null, h('p', null, 'ARO Publication Guide is an independent study aid, not an ARO or Koya University service. Official rules live at ', h('a', { href: 'https://aro.koyauniversity.org/', target: '_blank', rel: 'noopener' }, 'aro.koyauniversity.org'), '. Progress is stored only in this browser.'), h('p', null, h('a', { href: '#/sources' }, 'Source registry'), ' · ', h('a', { href: '#/questions' }, 'Open questions'), ' · ', h('button.link-btn', { onclick: startTour }, 'Guided tour'), ' · ', h('button.link-btn', { onclick: resetProgress }, 'Reset progress'))));
    app.append(bar, main, footer, tabbar);
    updateThemeIcon(themeBtn);
}
function toggleTheme(e) {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    const next = dark ? 'light' : 'dark';
    if (window.B)
        window.B.setTheme(next);
    else
        root.dataset.theme = next;
    updateThemeIcon(e.currentTarget);
}
function updateThemeIcon(btn) {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    clear(btn);
    btn.append(icon(dark ? 'i-sun' : 'i-moon', 22));
}
function resetProgress() {
    if (confirm('Clear all ticked items, notes and quiz answers stored in this browser?')) {
        store.reset();
        route();
    }
}
function parse() {
    const raw = location.hash.replace(/^#\/?/, '');
    const [path, qstr] = raw.split('?');
    const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
    return { key: parts[0] || '', params: parts.slice(1), query: new URLSearchParams(qstr || '') };
}
function route() {
    const { key, params, query } = parse();
    const r = ROUTES[key] || ROUTES[''];
    document.querySelectorAll('[data-nav]').forEach(a => a.toggleAttribute('aria-current', a.getAttribute('data-nav') === r.nav));
    clear(main);
    main.classList.remove('view-enter');
    void main.offsetWidth;
    main.classList.add('view-enter');
    const out = r.view(main, params, query);
    keepCurrent = !!(out && out.keep);
    store.setRoute(location.hash || '#/');
    const title = main.querySelector('h1')?.textContent;
    document.title = title ? `ARO Publication Guide · ${title}` : 'ARO Publication Guide';
    if (!query.get('focus') && !query.get('lesson'))
        window.scrollTo({ top: 0 });
}
// re-render the current view after progress changes, keeping scroll position and focus
let pending = 0;
store.subscribe(() => {
    if (keepCurrent)
        return;
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => {
        const y = window.scrollY, focusId = document.activeElement?.id;
        const openDetails = [...main.querySelectorAll('details[open][id]')].map(d => d.id);
        const { params, query } = parse();
        const r = ROUTES[parse().key] || ROUTES[''];
        clear(main);
        r.view(main, params, query);
        openDetails.forEach(id => document.getElementById(id)?.setAttribute('open', ''));
        window.scrollTo({ top: y });
        if (focusId)
            document.getElementById(focusId)?.focus({ preventScroll: true });
    });
});
// ── global search ────────────────────────────────────────────────────────────
function openSearch() {
    if (qs('.search-overlay'))
        return;
    const input = h('input.input.search-input', { type: 'search', placeholder: 'Search requirements, stages, documents, people…', 'aria-label': 'Search', autocomplete: 'off' });
    const list = h('ul.search-results', { role: 'listbox', id: 'search-results', 'aria-label': 'Results' });
    let sel = 0, results = [];
    const render = () => {
        clear(list);
        results = search(input.value);
        if (input.value.trim().length > 1 && !results.length)
            list.append(h('li.search-empty', null, 'No matches. Try “abstract”, “ORCID”, “template” or “preprint”.'));
        results.forEach((d, i) => list.append(h('li', { role: 'option', 'aria-selected': i === sel }, h('a', { href: d.route, onclick: () => close(false) }, h('span.badge.badge--subtle.badge--blue', null, d.type), h('span.search-title', null, d.title)))));
    };
    const close = (refocus = true) => { overlay.remove(); document.removeEventListener('keydown', keys); if (refocus)
        qs('[data-search-btn]')?.focus();
    else
        main.focus({ preventScroll: true }); };
    const keys = (e) => {
        if (e.key === 'Escape')
            close();
        else if (e.key === 'ArrowDown') {
            sel = Math.min(sel + 1, results.length - 1);
            render();
            e.preventDefault();
        }
        else if (e.key === 'ArrowUp') {
            sel = Math.max(sel - 1, 0);
            render();
            e.preventDefault();
        }
        else if (e.key === 'Enter' && results[sel]) {
            e.preventDefault();
            location.hash = results[sel].route;
            close(false);
        }
    };
    input.addEventListener('input', () => { sel = 0; render(); });
    const overlay = h('div.overlay.search-overlay', { onclick: (e) => { if (e.target === overlay)
            close(); } }, h('div.modal.search-modal', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Search' }, h('div.row.search-row', null, icon('a-search', 22), input, h('button.icon-btn', { 'aria-label': 'Close search', onclick: close }, icon('i-x', 20))), list, h('p.kbd-hint', null, '↑ ↓ to move · Enter to open · Esc to close')));
    document.body.appendChild(overlay);
    document.addEventListener('keydown', keys);
    input.focus();
}
// ── guided tour ──────────────────────────────────────────────────────────────
const TOUR = [
    ['journey', 'Start with the journey', 'Ten stages take you from understanding ARO to sharing the published paper. Each plate opens a lesson with actions, rules, sources and a checklist. Nothing is locked; the coloured plate is the stage we suggest next.'],
    ['explore', 'See how rules connect', 'The knowledge graph links stages, ARO rules, documents and open questions. Pick any node to see what it requires and the shortest path to it from the start.'],
    ['handbook', 'Read the rules, explained', 'Every ARO rule from the author pages, in plain English, with how to comply and the exact source. Interactive modules cover Harvard referencing, abstracts, figures and anonymisation.'],
    ['research', 'Plan your paper', 'Section-by-section guidance for a research article and a matrix of the evidence each claim needs. This is advice, not journal rules.'],
    ['resources', 'Get the official files', 'The Stage-One template and every official page, with format, purpose and the date each link was checked.'],
    ['readiness', 'Check you are ready', 'All checklist items in one place, an in-browser .docx check, and exports to Markdown or PDF.'],
    ['directory', 'Know who is who', 'Editors, the advisory board, the management office, and a ready-to-send email for the open questions.'],
];
function startTour() {
    let i = 0;
    const body = h('div.stack');
    const close = () => { overlay.remove(); document.querySelectorAll('.tour-spot').forEach(e => e.classList.remove('tour-spot')); store.setTourDone(); };
    const render = () => {
        clear(body);
        const [nav, title, text] = TOUR[i];
        document.querySelectorAll('.tour-spot').forEach(e => e.classList.remove('tour-spot'));
        document.querySelectorAll(`[data-nav="${nav}"]`).forEach(e => e.classList.add('tour-spot'));
        body.append(h('div.steps', { 'aria-hidden': 'true' }, TOUR.map((_, k) => h(`span.steps__seg${k < i ? '.steps__seg--correct' : k === i ? '.steps__seg--current' : ''}`, { style: `--f: ${k <= i ? 1 : 0}` }))), h('div.eyebrow', null, `Step ${i + 1} of ${TOUR.length}`), h('h2.modal__title', { id: 'tour-title' }, title), h('p.c-secondary', null, text), h('div.row.tour-actions', null, h('button.btn3d.btn3d--white.btn3d--sm', { onclick: () => { if (i > 0) {
                i--;
                render();
            } }, disabled: i === 0 }, h('span.btn3d__face', null, 'Back')), h('a.btn.btn--ghost.btn--sm', { href: NAV.find(n => n.id === nav).href, onclick: close }, 'Show me'), h('button.btn3d.btn3d--blue.btn3d--sm', { onclick: () => { if (i < TOUR.length - 1) {
                i++;
                render();
                sfx('reveal');
            }
            else
                close(); } }, h('span.btn3d__face', null, i < TOUR.length - 1 ? 'Continue' : 'Finish'))));
    };
    const overlay = h('div.overlay.tour-overlay', null, h('div.modal.tour-modal', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'tour-title' }, h('button.icon-btn.tour-close', { 'aria-label': 'Close tour', onclick: close }, icon('i-x', 20)), body));
    document.body.appendChild(overlay);
    render();
    overlay.querySelector('.btn3d--blue')?.focus();
}
window.startTour = startTour;
document.addEventListener('keydown', e => {
    const t = e.target;
    if (e.key === '/' && !/input|textarea|select/i.test(t.tagName) && !t.isContentEditable) {
        e.preventDefault();
        openSearch();
    }
});
window.addEventListener('hashchange', route);
// Tables become stacked cards on phones: each cell gets its column name for CSS to show.
function labelTables(root) {
    root.querySelectorAll('table.table:not([data-labelled])').forEach(t => {
        const heads = [...t.querySelectorAll('thead th')].map(th => th.textContent || '');
        t.querySelectorAll('tbody tr').forEach(tr => [...tr.children].forEach((td, i) => td.setAttribute('data-label', heads[i] || '')));
        t.classList.add('table--stack');
        t.dataset.labelled = '';
    });
}
new MutationObserver(() => labelTables(document)).observe(document.body, { childList: true, subtree: true });
function boot() { shell(); route(); }
if (window.B)
    boot();
else
    window.addEventListener('DOMContentLoaded', boot);
