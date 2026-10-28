// ARO Directory: journal identity, searchable editorial directory, contacts, and a draft email for the open questions.
// No personal contact details are shown: only the journal's own published office address.
import { h, icon, clear, external, toast } from '../lib/dom.js';
import { D, src, conflict } from '../lib/model.js';
import { store } from '../lib/store.js';
import { crumbs, pageHead, sourcesList, verifiedNote, sfx } from '../lib/ui.js';
const GROUP = { executive: 'Executive editors', advisory: 'Editorial advisory board', management: 'Management office' };
const ui = { q: '', group: 'all' };
const FACT_LABEL = {
    name: 'Journal', publisher: 'Publisher', launched: 'Launched', eissn: 'e-ISSN', pissn: 'p-ISSN', doiPrefix: 'Journal DOI', frequency: 'Frequency',
    language: 'Language', platform: 'Platform', licence: 'Licence and copyright', charges: 'Charges', review: 'Peer review', currentIssue: 'Current issue',
    email: 'Editorial office email', address: 'Postal address', supportContact: 'Support contact', metrics: 'Metrics (as stated by ARO)',
};
export function emailDraft() {
    const qs = D.conflicts.filter(c => c.status === 'unresolved' && !store.get().confirmed[c.id]);
    const ask = {
        'c-anonymization': 'The Guide to Authors and the Stage-One template ask for all author details on the first page and say the office removes them before review, while submission checklist item 7 asks for a file without author names. Which version should I upload: the completed Stage-One file, an anonymised copy, or both?',
        'c-file-format': 'Should the first submission include a PDF alongside the .docx, as the template mentions?',
        'c-ai-tools': 'The Guide bans AI-generated text but recommends grammar-checking software. Is the use of grammar and spelling correction on author-written text acceptable, and should it be disclosed?',
        'c-biography': 'Is the author biography (up to 100 words) required for every author, or optional as the Guide describes?',
        'c-discipline': 'My paper is on natural language processing (tokenization for Kurdish language models). Which submission field should I tick on the Stage-One template, given that the Computer Science group lists Software Engineering?',
    };
    const lines = qs.filter(c => ask[c.id]).map((c, i) => `${i + 1}. ${ask[c.id]}`);
    return {
        subject: 'Pre-submission questions: Stage-One manuscript on Kurdish tokenization',
        body: `Dear ARO Editorial Office,\n\nI am preparing a research article on tokenization for Kurdish in large language models for submission to ARO. Before submitting, I would be grateful for clarification on the following points from the author guidelines:\n\n${lines.join('\n\n') || '[No open questions remain.]'}\n\nThank you for your help.\n\nKind regards,\n[Your name]\n[Department, university]\n[Institutional email]`,
    };
}
export function renderDirectory(root, _p, query) {
    const initialQ = query.get('q');
    if (initialQ !== null)
        ui.q = initialQ;
    const J = D.journal;
    const facts = h('section.card.stack', { 'aria-labelledby': 'facts-h' }, h('h2.ts-heading-lg', { id: 'facts-h' }, 'Journal identity'), h('dl.facts', null, Object.entries(J).map(([k, v]) => [h('dt', null, FACT_LABEL[k] || k), h('dd', null, k === 'email' ? h('a', { href: `mailto:${v}` }, v) : v)])), h('div.eyebrow', null, 'Sources'), sourcesList(['aro-about', 'aro-publishing', 'aro-contact', 'aro-indexing', 'aro-current']));
    // directory
    const list = h('div.people', { 'aria-live': 'polite' });
    const count = h('p.ts-body-sm.c-secondary');
    const fill = () => {
        clear(list);
        const q = ui.q.trim().toLowerCase();
        const ps = D.people.filter(p => (ui.group === 'all' || p.group === ui.group) && (!q || `${p.name} ${p.role} ${p.affiliation} ${p.country}`.toLowerCase().includes(q)));
        count.textContent = `${ps.length} of ${D.people.length} people`;
        Object.keys(GROUP).forEach(g => {
            const xs = ps.filter(p => p.group === g);
            if (!xs.length)
                return;
            list.append(h('section.stack', { style: '--stack-gap: 12px' }, h('h3.ts-heading-md', null, GROUP[g]), h('div.people-grid', null, xs.map(p => h('article.card.person', null, h('div.row', { style: 'justify-content: space-between; --row-gap: 6px' }, h('span.person__role', null, p.role), p.decides ? h('span.badge.badge--subtle.badge--blue', null, 'editorial decisions') : p.group === 'management' ? h('span.badge.badge--subtle.badge--primary', null, 'administration') : null), h('h4.ts-heading-sm', null, p.name), h('p.ts-body-sm.c-secondary', null, `${p.affiliation} · ${p.country}`), p.duties ? h('p.ts-body-sm', null, p.duties) : null, p.profiles.length ? h('div.row', { style: '--row-gap: 10px' }, p.profiles.map(pr => external(pr.url, pr.label))) : null)))));
        });
        if (!ps.length)
            list.append(h('p.c-secondary', null, 'No one matches. Try a surname, a country or “software”.'));
    };
    const input = h('input.input', { type: 'search', placeholder: 'Search names, roles, affiliations…', 'aria-label': 'Search the editorial directory', value: ui.q });
    input.addEventListener('input', () => { ui.q = input.value; fill(); });
    const chips = h('div.row', { role: 'group', 'aria-label': 'Group' }, [['all', 'Everyone'], ...Object.entries(GROUP)].map(([v, l]) => h('button.chip.chip--sm', { 'aria-pressed': ui.group === v, onclick: (e) => { ui.group = v; chips.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === e.currentTarget))); sfx('toggle'); fill(); } }, l)));
    // email
    const d = emailDraft();
    const mail = `mailto:${J.email}?subject=${encodeURIComponent(d.subject)}&body=${encodeURIComponent(d.body)}`;
    const emailSec = h('section.card.stack#email', { 'aria-labelledby': 'mail-h' }, h('h2.ts-heading-lg', { id: 'mail-h' }, 'Ask the editorial office before you submit'), h('p.ts-body-sm.c-secondary', null, 'ARO does not take pre-submission enquiries about scope, but the Guide invites questions to the office. This draft lists only the questions still open in your progress. Nothing is sent from this site: the button opens your own email app.'), h('div.field', null, h('div.field__label', null, 'Subject'), h('p.mail-subject', null, d.subject)), h('pre.mail-body', { tabindex: '0', 'aria-label': 'Email body' }, d.body), h('div.row', null, h('a.btn3d.btn3d--blue', { href: mail }, h('span.btn3d__face', null, icon('a-mail', 16), 'Open in my email app')), h('button.btn.btn--outline', { onclick: async () => { try {
            await navigator.clipboard.writeText(`${d.subject}\n\n${d.body}`);
            toast('Copied');
        }
        catch {
            toast('Copy failed: select the text instead');
        } } }, 'Copy text')), h('p.ts-body-sm.c-secondary', null, 'When they answer, record it on each question page so dependent checklist items unlock: ', D.conflicts.filter(c => c.status === 'unresolved').map((c, i) => [i ? ' · ' : '', h('a', { href: `#/questions/${c.id}` }, conflict(c.id).title)])));
    root.append(h('div.container.directory.stack', { style: '--stack-gap: 28px' }, crumbs(['ARO Directory']), pageHead('ARO Directory', 'Who runs ARO, and how to reach them', 'Decision-makers are the Editor-in-Chief and the editors; the management office handles correspondence and notifications. Contact the office, not individual editors, about your submission.', 'blue'), h('div.dir-grid', null, h('div.stack', { style: '--stack-gap: 24px' }, facts, h('section.card.stack', { 'aria-labelledby': 'ct-h' }, h('h2.ts-heading-lg', { id: 'ct-h' }, 'Contacts'), h('dl.facts', null, h('dt', null, 'Editorial office'), h('dd', null, h('a', { href: `mailto:${J.email}` }, J.email), h('div.ts-body-xs.c-secondary', null, 'Shown (obfuscated) on the Guide, FAQ and Submissions pages')), h('dt', null, 'Correspondence and notifications'), h('dd', null, 'Secretarial office (Management Office page)'), h('dt', null, 'Post'), h('dd', null, J.address)), h('div.row', null, external(src('aro-contact').url, 'Contact page'), external(src('aro-management').url, 'Management office'), external(src('aro-team').url, 'Editorial team'), external(src('aro-advisory').url, 'Advisory board')))), emailSec), h('section.stack', { 'aria-labelledby': 'ppl-h' }, h('div.row', { style: 'justify-content: space-between' }, h('h2.ts-heading-xl', { id: 'ppl-h' }, 'Editorial directory'), count), h('div.row', null, input, chips), list, h('p.ts-body-sm.c-secondary', null, 'Names, roles, affiliations and profile links as listed on ARO\'s Editorial Team, Advisory Board and Management Office pages. ARO also mentions Associate Editors, who are not listed by name.')), verifiedNote()));
    fill();
    if (query.get('focus') === 'email')
        requestAnimationFrame(() => document.getElementById('email')?.scrollIntoView({ block: 'start' }));
    return { keep: true };
}
