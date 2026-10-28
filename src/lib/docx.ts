// In-browser .docx inspection. The file is read with the File API and unzipped with the browser's
// own DecompressionStream; nothing is uploaded anywhere. Findings are advisory: a .docx can be
// formatted in many ways that this parser cannot see, and it cannot judge originality,
// similarity, scientific correctness or whether text was AI-generated.

export type Verdict = 'pass' | 'warn' | 'fail' | 'info';
export interface Finding { id: string; label: string; verdict: Verdict; detail: string; confidence: 'high' | 'medium' | 'low' }
export interface Report { fileName: string; words: number; findings: Finding[]; limits: string[] }

// ── minimal ZIP reader ───────────────────────────────────────────────────────
async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate-raw');
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
export async function unzip(buf: ArrayBuffer): Promise<Map<string, () => Promise<Uint8Array>>> {
  const v = new DataView(buf), u8 = new Uint8Array(buf);
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('This file is not a .docx (no ZIP directory found).');
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const files = new Map<string, () => Promise<Uint8Array>>();
  const dec = new TextDecoder();
  for (let n = 0; n < count; n++) {
    if (v.getUint32(p, true) !== 0x02014b50) throw new Error('The ZIP directory is damaged.');
    const method = v.getUint16(p + 10, true), csize = v.getUint32(p + 20, true);
    const nlen = v.getUint16(p + 28, true), xlen = v.getUint16(p + 30, true), clen = v.getUint16(p + 32, true);
    const local = v.getUint32(p + 42, true);
    const name = dec.decode(u8.subarray(p + 46, p + 46 + nlen));
    files.set(name, async () => {
      const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
      const raw = u8.subarray(start, start + csize);
      if (method === 0) return raw;
      if (method === 8) return inflateRaw(raw);
      throw new Error(`Unsupported compression in ${name}.`);
    });
    p += 46 + nlen + xlen + clen;
  }
  return files;
}

// ── helpers ──────────────────────────────────────────────────────────────────
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const wordsIn = (s: string) => (s.match(/[\p{L}\p{N}][\p{L}\p{N}'’.-]*/gu) || []).length;
const attr = (el: Element | null | undefined, name: string) => el?.getAttributeNS(W, name) ?? el?.getAttribute('w:' + name) ?? null;
const kids = (el: Element, local: string) => [...el.getElementsByTagNameNS(W, local)];
const first = (el: Element | Document, local: string) => el.getElementsByTagNameNS(W, local)[0] as Element | undefined;

interface Para { text: string; style: string; isHeading: boolean; inTable: boolean; el: Element }

function imageSize(b: Uint8Array): { w: number; h: number } | null {
  if (b[0] === 0x89 && b[1] === 0x50) { const v = new DataView(b.buffer, b.byteOffset); return { w: v.getUint32(16), h: v.getUint32(20) }; }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length - 9) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1], len = (b[i + 2] << 8) | b[i + 3];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: (b[i + 5] << 8) | b[i + 6], w: (b[i + 7] << 8) | b[i + 8] };
      i += 2 + len;
    }
  }
  return null;
}

const SECTION_PATTERNS: [string, RegExp][] = [
  ['Introduction', /^(\d+\.?|[ivx]+\.)?\s*introduction\b/i],
  ['Materials and Methods', /^(\d+\.?|[ivx]+\.)?\s*(materials and methods|methods?|methodology|experimental (setup|design))\b/i],
  ['Results', /^(\d+\.?|[ivx]+\.)?\s*(results|results and discussion|experiments)\b/i],
  ['Conclusions', /^(\d+\.?|[ivx]+\.)?\s*conclusions?\b/i],
  ['Acknowledgment', /^(\d+\.?|[ivx]+\.)?\s*acknowledge?ments?\b/i],
  ['References', /^(\d+\.?|[ivx]+\.)?\s*(references|bibliography)\b/i],
];

// ── analysis ─────────────────────────────────────────────────────────────────
export async function analyse(file: File): Promise<Report> {
  if (!/\.docx$/i.test(file.name)) throw new Error('Choose a .docx file. Older .doc files cannot be read in the browser; save as .docx first.');
  if (file.size > 60 * 1024 * 1024) throw new Error('That file is larger than 60 MB. Remove embedded videos or very large images and try again.');
  const zip = await unzip(await file.arrayBuffer());
  const getText = async (name: string) => { const f = zip.get(name); return f ? new TextDecoder().decode(await f()) : null; };
  const docXml = await getText('word/document.xml');
  if (!docXml) throw new Error('This file has no word/document.xml, so it is not a Word document.');
  const parse = (s: string) => new DOMParser().parseFromString(s, 'application/xml');
  const doc = parse(docXml);
  if (doc.getElementsByTagName('parsererror').length) throw new Error('The document XML could not be parsed.');
  const styles = parse((await getText('word/styles.xml')) || '<w:styles xmlns:w="' + W + '"/>');
  const core = await getText('docProps/core.xml');
  const rels = parse((await getText('word/_rels/document.xml.rels')) || '<Relationships/>');
  const footers = (await Promise.all([...zip.keys()].filter(k => /^word\/(footer|header)\d*\.xml$/.test(k)).map(getText))).join(' ');

  // style names, heading detection
  const styleName = new Map<string, string>();
  kids(styles.documentElement, 'style').forEach(s => styleName.set(attr(s, 'styleId') || '', (attr(first(s, 'name'), 'val') || '').toLowerCase()));
  const body = first(doc, 'body')!;
  const paras: Para[] = kids(body, 'p').map(p => {
    const sid = attr(first(p, 'pStyle'), 'val') || '';
    const name = styleName.get(sid) || sid.toLowerCase();
    let text = '';
    p.querySelectorAll('*').forEach(n => { if (n.localName === 't') text += n.textContent; else if (n.localName === 'tab') text += ' '; });
    const inTable = !!p.parentElement?.closest('tbl') || p.parentElement?.localName === 'tc';
    return { text: text.replace(/\s+/g, ' ').trim(), style: name, isHeading: /heading|title/.test(name), inTable, el: p };
  }).filter(p => p.text);
  const all = paras.filter(p => !p.inTable);
  const findings: Finding[] = [];
  const push = (f: Finding) => findings.push(f);

  // locate landmarks
  const isHeadingLike = (p: Para) => p.isHeading || (p.text.length < 70 && (p.text === p.text.toUpperCase() || /^(\d+\.|[IVX]+\.)\s/.test(p.text)));
  const findIdx = (re: RegExp, headingOnly = true) => all.findIndex(p => re.test(p.text) && (!headingOnly || isHeadingLike(p) || p.text.length < 40));
  const absIdx = all.findIndex(p => /^abstract\b/i.test(p.text));
  const kwIdx = all.findIndex(p => /^(index terms|keywords?)\b/i.test(p.text));
  const refIdx = findIdx(SECTION_PATTERNS[5][1]);
  const introIdx = findIdx(SECTION_PATTERNS[0][1]);

  // words: body text, excluding table contents and captions; abstract, references and appendices count (ARO rule)
  const captionRe = /^(fig\.?|figure|table)\s*[\divx]+[.:]/i;
  const bodyParas = all.filter(p => !captionRe.test(p.text));
  const startAt = Math.max(0, absIdx >= 0 ? absIdx : 0);
  const words = bodyParas.filter(p => all.indexOf(p) >= startAt).reduce((n, p) => n + wordsIn(p.text), 0);

  // figures and their effective resolution
  const drawings = kids(body, 'drawing');
  const relTarget = new Map<string, string>();
  [...rels.getElementsByTagName('Relationship')].forEach(r => relTarget.set(r.getAttribute('Id') || '', r.getAttribute('Target') || ''));
  const lowDpi: string[] = []; let measured = 0;
  for (const d of drawings) {
    const ext = [...d.getElementsByTagName('*')].find(e => e.localName === 'extent');
    const blip = [...d.getElementsByTagName('*')].find(e => e.localName === 'blip');
    const rid = blip?.getAttribute('r:embed') || blip?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed');
    const target = rid ? relTarget.get(rid) : undefined;
    if (!ext || !target) continue;
    const f = zip.get('word/' + target.replace(/^\.?\//, ''));
    if (!f) continue;
    const size = imageSize(await f());
    const inches = Number(ext.getAttribute('cx')) / 914400;
    if (!size || !inches) continue;
    measured++;
    const dpi = Math.round(size.w / inches);
    if (dpi < 300) lowDpi.push(`${target.split('/').pop()} ≈ ${dpi} dpi`);
  }
  const figCaptions = all.filter(p => /^(fig\.?|figure)\s*\d+/i.test(p.text)).length;
  const figures = Math.max(drawings.length, figCaptions);
  const tables = kids(body, 'tbl').filter(t => !t.parentElement?.closest('tbl')).length;
  const equations = body.getElementsByTagNameNS('http://schemas.openxmlformats.org/officeDocument/2006/math', 'oMath').length;

  // ── title
  const titlePara = all.find(p => /title/.test(p.style)) || all[0];
  const tw = titlePara ? wordsIn(titlePara.text) : 0;
  push({ id: 'a-title', label: 'Title length', confidence: /title/.test(titlePara?.style || '') ? 'high' : 'medium',
    verdict: tw && tw <= 15 ? 'pass' : 'fail',
    detail: titlePara ? `Detected title (${tw} words): “${titlePara.text.slice(0, 140)}”. ARO allows at most 15.` : 'No title found.' });

  // ── abstract
  if (absIdx < 0) push({ id: 'a-abstract', label: 'Abstract', verdict: 'fail', confidence: 'medium', detail: 'No paragraph starting with “Abstract” was found.' });
  else {
    const end = [kwIdx, introIdx].filter(i => i > absIdx).sort((a, b) => a - b)[0] ?? absIdx + 1;
    const absText = all.slice(absIdx, end).map(p => p.text).join(' ').replace(/^abstract\s*[—–:.-]?\s*/i, '');
    const aw = wordsIn(absText);
    const cites = absText.match(/\([A-Z][^()]{1,60}?,?\s(19|20)\d{2}[a-z]?\)|\[\d+(?:[,–-]\s?\d+)*\]/g) || [];
    push({ id: 'a-abstract', label: 'Abstract length and citations', confidence: 'medium',
      verdict: aw >= 150 && aw <= 250 && !cites.length ? 'pass' : aw > 250 || cites.length ? 'fail' : 'warn',
      detail: `${aw} words (target 150–250).` + (cites.length ? ` Contains ${cites.length} citation(s), e.g. ${cites[0]}; ARO abstracts must not cite.` : ' No citations detected.') });
  }

  // ── keywords
  if (kwIdx < 0) push({ id: 'a-keywords', label: 'Index terms', verdict: 'fail', confidence: 'medium', detail: 'No “Index Terms” or “Keywords” paragraph found.' });
  else {
    const terms = all[kwIdx].text.replace(/^(index terms|keywords?)\s*[—–:.-]?\s*/i, '').split(/[,;]/).map(s => s.trim().replace(/\.$/, '')).filter(Boolean);
    const sorted = [...terms].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
    const alpha = terms.every((t, i) => t === sorted[i]);
    push({ id: 'a-keywords', label: 'Index terms', confidence: 'high',
      verdict: terms.length >= 4 && terms.length <= 7 && alpha ? 'pass' : 'warn',
      detail: `${terms.length} term(s): ${terms.join(', ')}. ${alpha ? 'Alphabetical.' : 'Not in alphabetical order; expected: ' + sorted.join(', ') + '.'} The template asks for about five.` });
  }

  // ── sections
  const found = SECTION_PATTERNS.map(([name, re]) => ({ name, idx: findIdx(re) }));
  const missing = found.filter(f => f.idx < 0 && f.name !== 'Acknowledgment').map(f => f.name);
  const present = found.filter(f => f.idx >= 0);
  const ordered = present.every((f, i) => i === 0 || f.idx > present[i - 1].idx);
  push({ id: 'a-sections', label: 'Required sections and order', confidence: 'medium',
    verdict: !missing.length && ordered ? 'pass' : missing.length ? 'fail' : 'warn',
    detail: (missing.length ? `Not found: ${missing.join(', ')}. ` : 'All required sections found. ') + (ordered ? 'Order matches ARO.' : 'Order differs from ARO (Introduction → Methods → Results → Conclusions → Acknowledgment → References).') + (found[4].idx < 0 ? ' No Acknowledgment heading (optional, but use the singular “Acknowledgment” if present).' : '') });

  // ── length band
  const bands: [number, number, number][] = [[2500, 3000, 14], [3000, 4500, 11], [4500, 5000, 9], [5000, 6000, 7]];
  const band = bands.find(([lo, hi]) => words >= lo && words <= hi) || (words < 2500 ? null : bands[bands.length - 1]);
  let lv: Verdict = 'pass', ld = '';
  if (words < 2500) { lv = 'warn'; ld = `Below 2,500 words: that is a Letter, not a Research Article.`; }
  else if (words > 6000) { lv = 'fail'; ld = `Over 6,000 words is overlong for a research paper.`; }
  else if (band && figures > band[2]) { lv = 'fail'; ld = `${band[0].toLocaleString()}–${band[1].toLocaleString()} words allows at most ${band[2]} figures; you have about ${figures}.`; }
  else if (band) ld = `Band ${band[0].toLocaleString()}–${band[1].toLocaleString()} words: up to ${band[2]} figures allowed, about ${figures} found.`;
  push({ id: 'a-length', label: 'Word count and figure limit', verdict: lv, confidence: 'low',
    detail: `≈ ${words.toLocaleString()} words counted from the abstract onward, excluding captions and table contents. ${ld} Word's own count and ARO's count may differ.` });

  // ── tables
  push({ id: 'a-tables', label: 'Number of tables', verdict: tables <= 12 ? 'pass' : 'fail', confidence: 'high',
    detail: `${tables} table(s) found (ARO maximum: 12). Vertical rules, titles and units in headings need a visual check.` });

  // ── figures
  push({ id: 'a-figures', label: 'Figures: count, captions, resolution', confidence: measured ? 'medium' : 'low',
    verdict: lowDpi.length ? 'fail' : drawings.length && figCaptions < drawings.length ? 'warn' : 'pass',
    detail: `${drawings.length} embedded image(s), ${figCaptions} “Fig. N” caption(s). ` +
      (measured ? (lowDpi.length ? `Below 300 dpi at their placed size: ${lowDpi.slice(0, 4).join('; ')}${lowDpi.length > 4 ? '…' : ''}.` : `All ${measured} measurable image(s) are at least 300 dpi at their placed size.`) : 'Resolution could not be measured (vector or unsupported image types).') +
      (equations ? ` ${equations} Word equation(s) detected.` : '') });

  // ── references
  if (refIdx < 0) {
    push({ id: 'a-refcount', label: 'Reference count', verdict: 'fail', confidence: 'medium', detail: 'No References heading found.' });
  } else {
    const refs = all.slice(refIdx + 1).filter(p => p.text.length > 25 && !isHeadingLike(p) && !captionRe.test(p.text));
    push({ id: 'a-refcount', label: 'Reference count', verdict: refs.length >= 15 ? 'pass' : 'fail', confidence: 'medium',
      detail: `${refs.length} reference entr${refs.length === 1 ? 'y' : 'ies'} after the References heading (template minimum: 15).` });
    const pre = refs.filter(r => /arxiv|preprint|biorxiv|medrxiv|ssrn|research ?square|openreview\.net\/forum/i.test(r.text));
    push({ id: 'a-preprints', label: 'Preprint citations', verdict: pre.length ? 'fail' : 'pass', confidence: 'medium',
      detail: pre.length ? `${pre.length} reference(s) look like preprints, e.g. “${pre[0].text.slice(0, 110)}…”. ARO does not accept non-peer-reviewed preprints; cite the published version.` : 'No arXiv or other preprint references detected.' });
    const linked = refs.filter(r => /doi|https?:\/\/|www\./i.test(r.text)).length;
    push({ id: 'a-dois', label: 'DOIs or URLs in references', verdict: refs.length && linked / refs.length >= 0.7 ? 'pass' : 'warn', confidence: 'high',
      detail: `${linked} of ${refs.length} references include a DOI or URL. The checklist asks for URLs where available.` });
    const bodyText = all.slice(0, refIdx).map(p => p.text).join(' ');
    const numeric = (bodyText.match(/\[\d+(?:[,–-]\s?\d+)*\]/g) || []).length;
    const harvard = (bodyText.match(/\([A-Z][A-Za-z'’ -]+(?: et al\.?| and [A-Z][A-Za-z'’-]+)?,\s(19|20)\d{2}[a-z]?/g) || []).length;
    const alpha = refs.map(r => r.text.toLowerCase()).every((t, i, a) => i === 0 || a[i - 1].localeCompare(t) <= 0);
    push({ id: 'a-harvard', label: 'Harvard author-date style', confidence: 'medium',
      verdict: numeric > 2 ? 'fail' : harvard >= 3 && alpha ? 'pass' : 'warn',
      detail: `${harvard} author-date citation(s) and ${numeric} numeric citation(s) like [1] in the text. ${numeric > 2 ? 'Numeric citations must be converted to Harvard. ' : ''}${alpha ? 'Reference list is alphabetical.' : 'Reference list is not in alphabetical order.'}` });
  }

  // ── typography (Normal style / document defaults)
  const normal = kids(styles.documentElement, 'style').find(s => attr(s, 'styleId') === 'Normal');
  const defaults = first(styles, 'docDefaults');
  const pick = (local: string, a: string) => attr(normal && first(normal, local), a) || attr(defaults && first(defaults, local), a);
  const font = pick('rFonts', 'ascii') || pick('rFonts', 'hAnsi') || '(theme font)';
  const sz = Number(pick('sz', 'val') || 0) / 2;
  const line = Number(pick('spacing', 'line') || 0), rule = pick('spacing', 'lineRule') || 'auto';
  const paraLines = all.map(p => attr(first(p.el, 'spacing'), 'line')).filter(Boolean).map(Number);
  const dbl = (line >= 470 && rule === 'auto') || (paraLines.length > all.length / 2 && paraLines.filter(l => l >= 470).length > paraLines.length / 2);
  const tnr = /times new roman/i.test(font);
  push({ id: 'a-typography', label: 'Font, size and line spacing', confidence: 'medium',
    verdict: tnr && sz === 12 && dbl ? 'pass' : 'fail',
    detail: `Normal style: ${font}${sz ? `, ${sz} pt` : ''}, line spacing ${line ? (line / 240).toFixed(2) + '×' : 'single (default)'}. ARO: Times New Roman 12 pt, double spaced. Direct formatting applied to individual runs is not fully checked.` });

  // ── page setup
  const sect = kids(body, 'sectPr').pop();
  const pg = sect && first(sect, 'pgSz'), mar = sect && first(sect, 'pgMar');
  if (pg && mar) {
    const w = Number(attr(pg, 'w')), hgt = Number(attr(pg, 'h'));
    const paper = Math.abs(w - 12240) < 40 && Math.abs(hgt - 15840) < 40 ? 'Letter' : Math.abs(w - 11906) < 40 ? 'A4' : `${(w / 1440).toFixed(2)}×${(hgt / 1440).toFixed(2)} in`;
    const mm = ['top', 'bottom', 'left', 'right'].map(k => Math.round(Number(attr(mar, k)) / 56.7));
    const ok = paper === 'Letter' && mm.every(m => Math.abs(m - 20) <= 1);
    push({ id: 'a-page', label: 'Paper size and margins', verdict: ok ? 'pass' : 'warn', confidence: 'high',
      detail: `${paper}, margins ${mm.join(' / ')} mm (top/bottom/left/right). Template: Letter, 20 mm all round.` });
  } else push({ id: 'a-page', label: 'Paper size and margins', verdict: 'info', confidence: 'low', detail: 'No page settings found in the document.' });

  // ── template markers
  const allText = all.map(p => p.text).join(' ');
  const tplHits = [/first[- ]stage template/i.test(footers), /submission type|research article\s*\(/i.test(allText), /submission field|software engineering/i.test(allText), /index terms/i.test(allText)].filter(Boolean).length;
  push({ id: 'a-template', label: 'Stage-One template markers', verdict: tplHits >= 2 ? 'pass' : 'warn', confidence: 'low',
    detail: `${tplHits} of 4 template markers found (footer text, article-type tick boxes, discipline field, “Index Terms”). A low count suggests the draft was not started from the template.` });

  // ── anonymity signals
  const creator = core ? (core.match(/<dc:creator>([^<]*)</)?.[1] || '') : '';
  const modBy = core ? (core.match(/<cp:lastModifiedBy>([^<]*)</)?.[1] || '') : '';
  const emails = (allText.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) || []).length;
  const orcids = (allText.match(/orcid\.org|\b\d{4}-\d{4}-\d{4}-\d{3}[\dX]\b/gi) || []).length;
  const selfCite = (allText.match(/\b(our|my) (previous|prior|earlier) (work|study|paper|research)|\bwe (previously|have previously)\b|in our (earlier|previous)/gi) || []);
  const repo = (allText.match(/github\.com\/[\w-]+|huggingface\.co\/[\w-]+/gi) || []);
  const leaks = [creator && `file author property “${creator}”`, modBy && `“last modified by” property “${modBy}”`, emails && `${emails} email address(es)`, orcids && `${orcids} ORCID reference(s)`, selfCite.length && `${selfCite.length} first-person self-reference(s) (“${selfCite[0]}”)`, repo.length && `${repo.length} repository link(s) (${repo[0]})`].filter(Boolean);
  push({ id: 'a-anon', label: 'Identity signals (for the anonymised copy)', verdict: leaks.length ? 'warn' : 'pass', confidence: 'medium',
    detail: leaks.length ? `Found: ${leaks.join('; ')}. Expected in the full Stage-One file; remove them from the anonymised copy (File → Info → Inspect Document clears properties).` : 'No author properties, emails, ORCIDs, first-person self-references or repository links detected.' });

  return {
    fileName: file.name, words, findings,
    limits: [
      'Runs entirely in this browser; the file is never uploaded.',
      'Cannot measure similarity or plagiarism, scientific correctness, or whether any text was AI-generated.',
      'Section, abstract and reference detection relies on headings and plain-text patterns; unusual layouts can be misread.',
      'Word counts are approximate and may differ from Word and from ARO\'s count.',
      'Formatting checks read the Normal style and page settings; manual formatting on individual paragraphs is only partly checked.',
    ],
  };
}
