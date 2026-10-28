// A single-question practice item built from the design skill's lip tiles (.choice) and a 3D Check button.
// Answers persist in the progress store, so a refresh keeps them.
import { h, icon } from './dom.js';
import { store } from './store.js';
import { sfx } from './ui.js';
export function quiz(q, mono = false) {
    let chosen = store.get().quiz[q.id] || '';
    let checked = !!chosen;
    const wrap = h('div.quiz.card', { id: 'quiz-' + q.id });
    const fb = h('div.quiz-fb', { 'aria-live': 'polite' });
    const group = h('div.choices', { role: 'radiogroup', 'aria-label': q.prompt });
    const btn = h('button.btn3d.btn3d--sm', { disabled: !chosen, id: `qchk-${q.id}` }, h('span.btn3d__face', null, 'Check'));
    const paint = () => {
        group.querySelectorAll('.choice').forEach(c => {
            const id = c.dataset.id;
            c.setAttribute('aria-checked', String(id === chosen));
            c.removeAttribute('data-state');
            if (checked && id === chosen)
                c.dataset.state = id === q.correct ? 'correct' : 'incorrect';
            if (checked && id === q.correct && chosen === q.correct)
                c.dataset.state = 'correct';
        });
        fb.replaceChildren();
        if (!checked || !chosen)
            return;
        const ok = chosen === q.correct;
        const opt = q.options.find(o => o.id === chosen);
        fb.append(h(`div.quiz-fb__bar.quiz-fb__bar--${ok ? 'correct' : 'incorrect'}`, null, h('span.quiz-fb__icon', { 'aria-hidden': 'true' }, icon(ok ? 'i-check' : 'i-x', 18)), h('div', null, h('b', null, ok ? 'Correct!' : 'Not quite'), h('p', null, ok ? opt.why : q.hint))));
    };
    q.options.forEach((o, i) => {
        const c = h(`button.choice.choice--keyed${mono ? '.choice--mono' : ''}`, { role: 'radio', 'aria-checked': 'false', 'data-id': o.id, id: `qc-${q.id}-${o.id}` }, h('span.choice__key', { 'aria-hidden': 'true' }, String.fromCharCode(65 + i)), h('span.choice__text', null, o.text));
        c.addEventListener('click', () => { chosen = o.id; checked = false; btn.disabled = false; sfx('select'); paint(); });
        group.append(c);
    });
    btn.addEventListener('click', () => {
        if (!chosen)
            return;
        checked = true;
        store.answer(q.id, chosen);
        sfx(chosen === q.correct ? 'correct' : 'wrong');
        paint();
        if (chosen !== q.correct)
            group.querySelector('[data-state="incorrect"]')?.animate?.([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 300 });
    });
    wrap.append(h('div.eyebrow', null, 'Practice'), h('p.quiz-prompt', null, q.prompt), group, h('div.row.quiz-actions', null, btn), fb);
    paint();
    return wrap;
}
