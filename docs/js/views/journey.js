// Journey: the course map of ten stages, and each stage's lesson page.
import { h, icon, clear } from '../lib/dom.js';
import { D, stage, stageProgress, overallProgress, currentStage, unmetPrereqs, stageLabel, allChecks, checkStatus, req, res, src, conflict } from '../lib/model.js';
import { store } from '../lib/store.js';
import { lessonNode, requirementCard, checkRow, progressBar, crumbs, guidanceBadge, verifiedNote, legend, sfx, sourceLink } from '../lib/ui.js';
const LEVELS = [
    { title: 'Prepare the research', stages: ['s01', 's02', 's03'], milestone: 'Draft complete' },
    { title: 'Package the submission', stages: ['s04', 's05', 's06'], milestone: 'Ready to submit' },
    { title: 'Submit, review, publish', stages: ['s07', 's08', 's09', 's10'], milestone: 'Published' },
];
function nodeState(s, cur) {
    const p = stageProgress(s);
    if (p.done === p.total)
        return 'done';
    return cur?.id === s.id ? 'current' : 'locked';
}
export function dashboardTiles() {
    const counts = { done: 0, open: 0, blocked: 0, awaiting: 0 };
    allChecks.forEach(c => counts[checkStatus(c.item)]++);
    const unresolved = D.conflicts.filter(c => c.status === 'unresolved' && !store.get().confirmed[c.id]).length;
    const tile = (label, value, note, href, tone) => h(`a.kpi.dash-tile.dash-tile--${tone}`, { href }, h('div.kpi__label', null, label), h('div.kpi__value', null, String(value)), h('div.kpi__delta', null, note));
    return h('section.dash-tiles', { 'aria-label': 'Progress summary' }, tile('Completed', counts.done, `of ${allChecks.length} checklist items`, '#/readiness?show=done', 'green'), tile('Outstanding', counts.open, 'ready to do now', '#/readiness?show=open', 'blue'), tile('Blocked', counts.blocked + counts.awaiting, `${counts.awaiting} wait on the office`, '#/readiness?show=blocked', 'yellow'), tile('Open questions', unresolved, 'to ask ARO before submitting', '#/questions', 'orange'));
}
export function renderJourney(root) {
    const cur = currentStage();
    const all = overallProgress();
    const last = store.get().lastRoute;
    const resume = last && last !== '#/' && last !== '#' ? last : cur ? `#/stage/${cur.id}` : '#/readiness';
    root.append(h('section.journey-hero', null, h('div.journey-hero__inner', null, h('div.kicker.kicker--blue', null, 'Your research paper → ARO, Koya University'), h('h1.display-hero.journey-title', null, 'Publish your research paper in ', h('em', null, 'ARO'), ', step by step'), h('p.ts-body-lg.c-secondary.journey-sub', null, cur ? ['Start where you are. Next up: ', h('b', null, stageLabel(cur)), ' — ', cur.short] : 'Every checklist item is done. Review the readiness report before you celebrate.'), h('div.row.hero-actions', null, h('a.btn3d.btn3d--blue', { href: resume, 'data-continue': '' }, h('span.btn3d__face', null, icon('i-play', 16), last && last !== '#/' ? 'Continue where I left off' : 'Start stage 01')), h('button.btn3d.btn3d--white', { onclick: () => window.startTour() }, h('span.btn3d__face', null, 'Take the tour'))), verifiedNote())));
    root.append(h('div.container.journey-dash', null, dashboardTiles()));
    const layout = h('div.course-layout.journey-layout');
    const card = h('aside.course-card.journey-card', null, h('div.journey-card__art', { html: window.B?.node({ shape: 'review', segments: 3, progress: Math.round(all.pct * 3) }) || '', 'aria-hidden': 'true' }), h('h2.course-card__title', null, 'From manuscript to DOI'), h('p.course-card__desc', null, 'Ten stages, each with lessons, ARO rules, documents, sources and a checklist. Revisit any stage at any time.'), h('div.course-card__meta', null, h('span', null, icon('i-layers', 16), `${D.stages.length} stages`), h('span', null, icon('a-checklist', 16), `${all.total} checks`), h('span', null, icon('i-book', 16), `${D.requirements.length} ARO rules`)), h('div.stack', { style: 'width:100%; --stack-gap: 8px' }, h('div.row', { style: 'justify-content: space-between' }, h('span.ts-heading-xs', null, 'Progress'), h('span.ts-body-sm.c-secondary', null, `${all.done} of ${all.total}`)), progressBar(all.pct, 'Overall progress', 'progress--lg')), legend());
    const pathCol = h('div.course-path.journey-path');
    let row = 0;
    LEVELS.forEach((lvl, li) => {
        const lvStages = lvl.stages.map(stage);
        const lvDone = lvStages.every(s => stageProgress(s).done === s.checklist.length);
        const lvCurrent = lvStages.some(s => s.id === cur?.id);
        const path = h('div.path');
        lvStages.forEach(s => {
            const p = stageProgress(s);
            const st = nodeState(s, cur);
            const pos = ['center', 'start', 'center', 'end'][row++ % 4];
            const popId = 'pop-' + s.id;
            const pop = h('div.popover-card.stage-pop', { id: popId, role: 'dialog', 'aria-label': stageLabel(s), hidden: true }, h('div.stack', { style: '--stack-gap: 4px' }, h('div.popover-card__title', null, s.title), h('div.popover-card__meta', null, `Stage ${String(s.num).padStart(2, '0')} · ${s.lessons.length} lessons · ${p.done}/${p.total} checks`)), h('p.ts-body-sm.c-secondary.pop-short', null, s.short), unmetPrereqs(s).length ? h('p.ts-body-sm.pop-warn', null, icon('i-alert', 14), ` Usually after ${unmetPrereqs(s).map(x => x.title).join(', ')}`) : null, h('a.btn3d.btn3d--blue.btn3d--block', { href: `#/stage/${s.id}` }, h('span.btn3d__face', null, p.done ? 'Resume' : 'Start')));
            const btn = h('button.path__item', {
                'aria-expanded': 'false', 'aria-controls': popId, 'aria-current': st === 'current' ? 'step' : undefined,
                'aria-label': `${stageLabel(s)}, ${st === 'done' ? 'complete' : `${p.done} of ${p.total} checks done`}`,
                onclick: () => {
                    const open = pop.hidden;
                    root.querySelectorAll('.stage-pop').forEach(x => { x.hidden = true; });
                    root.querySelectorAll('.path__item[aria-expanded]').forEach(x => x.setAttribute('aria-expanded', 'false'));
                    pop.hidden = !open;
                    btn.setAttribute('aria-expanded', String(open));
                    if (open)
                        sfx('open');
                },
            }, st === 'current' ? h('span.start-bubble', null, p.done ? 'Next' : 'Start') : null, lessonNode({ state: st, hue: s.hue, segments: s.checklist.length, progress: p.done }), h('span.path__label', null, h('span', null, h('span.path__num', null, String(s.num).padStart(2, '0') + ' '), s.title)));
            path.append(h(`div.path__row.path__row--${pos}`, null, h('div.node-wrap', null, btn, pop)));
        });
        // level milestone (star plate)
        const pos = ['center', 'start', 'center', 'end'][row++ % 4];
        path.append(h(`div.path__row.path__row--${pos}`, null, h('a.path__item', { href: '#/readiness', 'aria-label': `Milestone: ${lvl.milestone}${lvDone ? ', reached' : ''}` }, lessonNode({ state: lvDone ? 'done' : 'locked', hue: 'green', segments: 1, progress: lvDone ? 1 : 0, shape: 'review' }), h('span.path__label', null, h('span', null, 'Milestone: ', lvl.milestone)))));
        path.firstElementChild?.classList.add('path__row--level-start');
        pathCol.append(h('section.level', { 'aria-label': `Level ${li + 1}: ${lvl.title}` }, h('div.level__head', null, h(`button.level-header${lvDone ? '.level-header--done' : lvCurrent ? '.level-header--current' : ''}`, {
            onclick: () => path.querySelector('.path__item')?.focus(), 'aria-label': `Level ${li + 1}: ${lvl.title}`,
        }, h('span.level-header__kicker', null, `Level ${li + 1}`), h('span.level-header__title', null, lvl.title))), path));
    });
    const side = h('aside.side.journey-side', null, h('div.card.card--elevated.stack', null, h('div.ts-heading-sm', null, 'Before you submit, ask ARO'), h('p.ts-body-sm.c-secondary', null, 'Official pages disagree on points that change what you upload.'), h('ul.ts-body-sm.tight-list', null, D.conflicts.filter(c => c.status === 'unresolved' && c.severity !== 'low').slice(0, 4).map(c => h('li', null, h('a', { href: `#/questions/${c.id}` }, c.title)))), h('a.btn.btn--outline.btn--sm', { href: '#/directory?focus=email' }, icon('a-mail', 16), 'Draft the email')), h('div.callout.callout--purple', null, h('div.callout__title', null, icon('i-sparkle', 18), 'Key restrictions'), h('ul.ts-body-sm.tight-list', null, h('li', null, h('a', { href: '#/req/r-ai-text' }, 'No AI-generated text')), h('li', null, h('a', { href: '#/req/r-no-preprints' }, 'No non-peer-reviewed preprints')), h('li', null, h('a', { href: '#/req/r-similarity' }, 'Similarity above 15% is declined')), h('li', null, h('a', { href: '#/req/r-length' }, 'Words vs figures limits')))));
    layout.append(card, pathCol, side);
    root.append(layout);
}
// ── stage page ───────────────────────────────────────────────────────────────
export function renderStage(root, params, query) {
    const s = stage(params[0]);
    if (!s) {
        root.append(h('div.container', null, h('h1', null, 'Stage not found'), h('a', { href: '#/' }, 'Back to the journey')));
        return;
    }
    const p = stageProgress(s);
    const unmet = unmetPrereqs(s);
    const prev = D.stages[s.num - 2], next = D.stages[s.num];
    const st = p.done === p.total ? 'done' : 'current';
    const head = h('header.stage-head', null, crumbs(['Journey', '#/'], [stageLabel(s)]), h('div.stage-head__row', null, lessonNode({ state: st, hue: s.hue, segments: s.checklist.length, progress: p.done }), h('div.stack', { style: '--stack-gap: 8px' }, h(`div.kicker.kicker--${['blue', 'green', 'purple'].includes(s.hue) ? s.hue : 'blue'}`, null, `Stage ${String(s.num).padStart(2, '0')} of ${D.stages.length}`), h('h1.ts-display-3xl.page-title', null, s.title), h('p.ts-body-lg.c-secondary', null, s.accomplishes), h('div.row', { style: '--row-gap: 12px' }, progressBar(p.pct, `${s.title} progress`), h('span.ts-body-sm.c-secondary', null, `${p.done} of ${p.total} checks`)))), h('nav.stage-steps', { 'aria-label': 'Stages' }, D.stages.map(x => h('a', { href: `#/stage/${x.id}`, 'aria-current': x.id === s.id ? 'page' : undefined, 'aria-label': stageLabel(x), title: stageLabel(x),
        class: stageProgress(x).done === x.checklist.length ? 'done' : '' }, String(x.num).padStart(2, '0')))));
    const body = h('div.stage-body');
    if (unmet.length)
        body.append(h('div.callout.callout--yellow', { role: 'note' }, h('div.callout__title', null, icon('i-alert', 18), 'Prerequisites not finished'), h('p', null, 'This stage normally follows ', unmet.map((u, i) => [i ? ', ' : '', h('a', { href: `#/stage/${u.id}` }, stageLabel(u))]), '. You can keep going; some actions here may depend on that work.')));
    // actions
    body.append(h('section.stage-sec', { 'aria-labelledby': 'act-h' }, h('h2.ts-heading-lg', { id: 'act-h' }, 'What to do'), h('ol.action-list', null, s.actions.map(a => h('li', null, a))), s.prerequisites.length ? h('p.ts-body-sm.c-secondary', null, 'Prerequisites: ', s.prerequisites.map((id, i) => [i ? ', ' : '', h('a', { href: `#/stage/${id}` }, stageLabel(stage(id)))])) : h('p.ts-body-sm.c-secondary', null, 'No prerequisites: you can start this stage at any time.')));
    // lessons
    const lessons = h('div.stack.lessons');
    s.lessons.forEach((l, i) => {
        const d = h('details.deeper.lesson-drawer', { id: 'lesson-' + l.id, open: query.get('lesson') === l.id || (i === 0 && !query.get('lesson')) }, h('summary', null, h('span.deeper__icon', null, icon(l.tag === 'official' ? 'a-shield' : l.tag === 'project' ? 'a-flask' : 'i-lightbulb', 20)), h('span.deeper__t', null, h('b', null, l.title), h('small', null, `Lesson ${i + 1} of ${s.lessons.length}`)), h('span.deeper__chev')), h('div.deeper__body.stack', null, guidanceBadge(l.tag), l.body.map(par => h('p', null, par))));
        lessons.append(d);
    });
    body.append(h('section.stage-sec', { 'aria-labelledby': 'les-h' }, h('h2.ts-heading-lg', { id: 'les-h' }, 'Lessons'), lessons));
    // requirements
    body.append(h('section.stage-sec', { 'aria-labelledby': 'req-h' }, h('h2.ts-heading-lg', { id: 'req-h' }, 'ARO requirements that apply here'), h('p.ts-body-sm.c-secondary', null, 'Paraphrased from the official pages; open any card for the source.'), h('div.stack.req-stack', null, s.requirements.map(id => requirementCard(req(id))))));
    // documents + sources
    const srcIds = [...new Set(s.requirements.flatMap(id => req(id).sources))];
    body.append(h('section.stage-sec', { 'aria-labelledby': 'doc-h' }, h('h2.ts-heading-lg', { id: 'doc-h' }, 'Documents and links'), h('div.res-mini-grid', null, s.resources.map(id => {
        const r = res(id), so = src(r.source);
        return h('a.card.card--lip.res-mini', { href: so.url, target: '_blank', rel: 'noopener noreferrer' }, h('span.res-mini__kind', null, icon(r.kind === 'download' ? 'a-download' : r.kind === 'tool' ? 'i-puzzle' : r.kind === 'portal' ? 'i-arrow-right' : 'a-doc', 18), r.kind === 'download' ? 'Download' : r.kind === 'portal' ? 'Portal' : r.kind === 'tool' ? 'Tool' : 'Page'), h('span.res-mini__title', null, r.title), h('span.ts-body-sm.c-secondary', null, r.purpose), h('span.visually-hidden', null, ' (opens in a new tab)'));
    })), h('details.sources-drawer', null, h('summary', null, `All ${srcIds.length} sources cited by this stage`), h('ul.src-list', null, srcIds.map(id => h('li', null, sourceLink(id)))))));
    // checklist
    const list = h('div.check-list');
    const fill = () => { clear(list); s.checklist.forEach(c => list.append(checkRow(c))); };
    fill();
    const conflictsHere = [...new Set(s.checklist.map(c => c.conflict).filter(Boolean))];
    body.append(h('section.stage-sec', { 'aria-labelledby': 'chk-h' }, h('h2.ts-heading-lg', { id: 'chk-h' }, 'Completion checklist'), h('p.ts-body-sm.c-secondary', null, 'Ticking a box records your own judgement. It does not mean ARO has approved anything.'), list, conflictsHere.length ? h('p.ts-body-sm', null, 'Waiting on the office: ', conflictsHere.map((c, i) => [i ? ', ' : '', h('a', { href: `#/questions/${c}` }, conflict(c).title)])) : null));
    // next
    body.append(h('section.stage-next', null, h('div.stack', { style: '--stack-gap: 4px' }, h('div.eyebrow', null, 'Next recommended action'), h('p.ts-heading-md', null, s.next)), h('div.row', null, prev ? h('a.btn3d.btn3d--white', { href: `#/stage/${prev.id}` }, h('span.btn3d__face', null, icon('i-arrow-left', 16), 'Previous')) : null, next ? h('a.btn3d', { href: `#/stage/${next.id}` }, h('span.btn3d__face', null, `Stage ${String(next.num).padStart(2, '0')}: ${next.title}`, icon('i-arrow-right', 16)))
        : h('a.btn3d.btn3d--green', { href: '#/readiness' }, h('span.btn3d__face', null, 'Open the readiness report')))));
    root.append(h('div.container.container--narrow.stage-page', null, head, body));
    store.visit(s.id);
    const focus = query.get('lesson');
    if (focus)
        requestAnimationFrame(() => document.getElementById('lesson-' + focus)?.scrollIntoView({ block: 'start' }));
}
