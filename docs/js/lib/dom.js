// Tiny DOM helpers: no framework, no virtual DOM. Views rebuild their own subtree on state change.
export function h(sel, attrs, ...kids) {
    const [tagAndId, ...classes] = sel.split('.');
    const [tag, id] = tagAndId.split('#');
    const el = document.createElement(tag || 'div');
    if (id)
        el.id = id;
    if (classes.length)
        el.className = classes.join(' ');
    if (attrs)
        for (const [k, v] of Object.entries(attrs)) {
            if (k.startsWith('aria-') && typeof v === 'boolean') {
                el.setAttribute(k, String(v));
                continue;
            } // ARIA states need "true"/"false"
            if (v === undefined || v === null || v === false)
                continue;
            if (k === 'class')
                el.className = [el.className, v].filter(Boolean).join(' ');
            else if (k === 'style' && typeof v === 'object')
                Object.assign(el.style, v);
            else if (k === 'html')
                el.innerHTML = String(v); // only used for trusted, generated SVG markup
            else if (k.startsWith('on') && typeof v === 'function')
                el.addEventListener(k.slice(2), v);
            else if (v === true)
                el.setAttribute(k, '');
            else
                el.setAttribute(k, String(v));
        }
    append(el, kids);
    return el;
}
export function append(el, kids) {
    for (const k of kids) {
        if (k === null || k === undefined || k === false)
            continue;
        if (Array.isArray(k))
            append(el, k);
        else
            el.appendChild(typeof k === 'string' || typeof k === 'number' ? document.createTextNode(String(k)) : k);
    }
}
const SVGNS = 'http://www.w3.org/2000/svg';
export function svg(tag, attrs = {}, ...kids) {
    const el = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs))
        el.setAttribute(k, String(v));
    kids.forEach(k => k && el.appendChild(k));
    return el;
}
/** An icon from the inline sprites (i-* from the design skill, a-* app icons). */
export function icon(id, size = 20, cls = '') {
    const s = svg('svg', { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': 'true', class: `ico ${cls}`.trim() });
    const use = document.createElementNS(SVGNS, 'use');
    use.setAttribute('href', '#' + id);
    s.appendChild(use);
    return s;
}
export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];
export function clear(el) { while (el.firstChild)
    el.removeChild(el.firstChild); }
export function external(url, label, cls = 'ext-link') {
    return h('a', { href: url, target: '_blank', rel: 'noopener noreferrer', class: cls }, label, icon('a-external', 14), h('span.visually-hidden', null, ' (opens in a new tab)'));
}
export function toast(msg) {
    const t = h('div.toast.app-toast', { role: 'status', 'aria-live': 'polite' }, msg);
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
}
export function download(name, text, type = 'text/markdown') {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = h('a', { href: url, download: name });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export function fmtDate(iso) {
    const d = new Date(iso + (iso.length === 10 ? 'T12:00:00' : ''));
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
