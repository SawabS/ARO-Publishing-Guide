# Research audit

This file records how the ARO Publication Guide's content was researched and verified. It is the human-readable companion to `data/sources.json` (the source registry), `data/requirements.json` (the rules) and `data/conflicts.json` (where sources disagree).

- **Verification date:** 27 October 2026 for every page listed below. This is when each page was read for this project, **not** when ARO last edited it. ARO's pages show no "last updated" dates.
- **Canonical domain:** `aro.koyauniversity.org`. No legacy, test or staging domains were used. One link on the Management Office page points to an old Google Sites page (`sites.google.com/a/koyauniversity.org/oldaro`); it was not used as a source.
- **Method:** each official page was opened and its text read; every rule was paraphrased (not copied) into `requirements.json` with at least one official source id. `scripts/validate-data.mjs` fails the build if any requirement lacks an official source, any reference does not resolve, or any person record contains an email address.

## Pages inspected

| Source | Kind | Status | Verified | Rules citing it |
|---|---|---|---|---|
| [ARO journal home](https://aro.koyauniversity.org/index.php/aro/index) | Official ARO | Read | 2026-10-27 | 0 |
| [Publishing with ARO](https://aro.koyauniversity.org/index.php/aro/PublishingWithAro) | Official ARO | Read | 2026-10-27 | 5 |
| [Guide to Authors](https://aro.koyauniversity.org/index.php/aro/GuideToAuthors) | Official ARO | Read | 2026-10-27 | 32 |
| [Submissions (submission preparation checklist)](https://aro.koyauniversity.org/index.php/aro/about/submissions) | Official ARO | Read | 2026-10-27 | 15 |
| [How to Submit](https://aro.koyauniversity.org/index.php/aro/HowToSubmit) | Official ARO | Read | 2026-10-27 | 4 |
| [Peer Review Process](https://aro.koyauniversity.org/index.php/aro/PeerReviewProcess) | Official ARO | Read | 2026-10-27 | 3 |
| [Peer Review Policy](https://aro.koyauniversity.org/index.php/aro/PeerReviewPolicy) | Official ARO | Read | 2026-10-27 | 1 |
| [Editorial Policies](https://aro.koyauniversity.org/index.php/aro/EditorialPolicies) | Official ARO | Read | 2026-10-27 | 7 |
| [Ethics Policy (human and animal research)](https://aro.koyauniversity.org/index.php/aro/EthicsPolicy) | Official ARO | Read | 2026-10-27 | 3 |
| [Publication Ethics and Malpractice Statement](https://aro.koyauniversity.org/index.php/aro/PubEthics) | Official ARO | Read | 2026-10-27 | 3 |
| [Open Access Policy](https://aro.koyauniversity.org/index.php/aro/OpenAccessPolicy) | Official ARO | Read | 2026-10-27 | 3 |
| [Archiving Policy](https://aro.koyauniversity.org/index.php/aro/ArchivingPolicy) | Official ARO | Read | 2026-10-27 | 1 |
| [Repository Policy](https://aro.koyauniversity.org/index.php/aro/RepositoryPolicy) | Official ARO | Read | 2026-10-27 | 1 |
| [FAQ](https://aro.koyauniversity.org/index.php/aro/FAQ) | Official ARO | Read | 2026-10-27 | 8 |
| [About the Journal](https://aro.koyauniversity.org/index.php/aro/about) | Official ARO | Read | 2026-10-27 | 2 |
| [Editorial Team](https://aro.koyauniversity.org/index.php/aro/about/editorialTeam) | Official ARO | Read | 2026-10-27 | 0 |
| [Editorial Advisory Board](https://aro.koyauniversity.org/index.php/aro/EditorialAdvisoryBoard) | Official ARO | Read | 2026-10-27 | 0 |
| [Management Office](https://aro.koyauniversity.org/index.php/aro/ManagementOffice) | Official ARO | Read | 2026-10-27 | 0 |
| [Contact](https://aro.koyauniversity.org/index.php/aro/about/contact) | Official ARO | Read | 2026-10-27 | 0 |
| [Indexing](https://aro.koyauniversity.org/index.php/aro/indexing) | Official ARO | Read | 2026-10-27 | 1 |
| [Manuscript Editing Services](https://aro.koyauniversity.org/index.php/aro/MES) | Official ARO | Read | 2026-10-27 | 1 |
| [Information for Authors](https://aro.koyauniversity.org/index.php/aro/information/authors) | Official ARO | Read | 2026-10-27 | 1 |
| [Register (author account)](https://aro.koyauniversity.org/index.php/aro/user/register) | Official ARO | Read | 2026-10-27 | 2 |
| [Login (submission system)](https://aro.koyauniversity.org/index.php/aro/login) | Official ARO | Linked, not opened | 2026-10-27 | 0 |
| [Current issue (Vol. 14 No. 2, 2026)](https://aro.koyauniversity.org/index.php/aro/issue/current) | Official ARO | Read | 2026-10-27 | 0 |
| [Archives](https://aro.koyauniversity.org/index.php/aro/issue/archive) | Official ARO | Linked, not opened | 2026-10-27 | 0 |
| [Privacy Statement](https://aro.koyauniversity.org/index.php/aro/about/privacy) | Official ARO | Linked, not opened | 2026-10-27 | 0 |
| [Example ARO article: natural language processing study (Vol. 14 No. 2)](https://aro.koyauniversity.org/index.php/aro/article/view/2814) | Official ARO | Read | 2026-10-27 | 2 |
| [STAGE-ONE Template (ARO_Submission.docx, Google Docs)](https://docs.google.com/document/d/1szazcmQAUDyaI8GN0disy0MPlDg4pABK/edit?usp=share_link&ouid=102634136951986856087&rtpof=true&sd=true) | Official ARO | Partly readable | 2026-10-27 | 28 |
| [ARO template (ARO_Template.dotx, Google Drive)](https://drive.google.com/file/d/1xwPklQNBxpu5RDCDLGJyDNUTG2aa6Ujv/view?usp=sharing) | Official ARO | Partly readable | 2026-10-27 | 1 |
| [Harvard System of Referencing (Anglia Ruskin University Library)](https://library.aru.ac.uk/referencing/harvard.htm) | Linked by ARO | Read | 2026-10-27 | 1 |
| [Writing an abstract (UC Irvine Libraries guide)](https://guides.lib.uci.edu/c.php?g=334338&p=2249902) | Linked by ARO | Linked, not opened | 2026-10-27 | 0 |
| [Tense tendencies in academic texts (Scribbr)](https://www.scribbr.com/academic-writing/tense-tendencies/) | Linked by ARO | Linked, not opened | 2026-10-27 | 0 |
| [DOAJ journal record (ISSN 2307-549X)](https://doaj.org/toc/2307-549X) | Linked by ARO | Read | 2026-10-27 | 2 |
| [ISSN portal: e-ISSN 2307-549X](https://portal.issn.org/resource/ISSN/2307-549X) | Linked by ARO | Linked, not opened | 2026-10-27 | 0 |
| [ISSN portal: p-ISSN 2410-9355](https://portal.issn.org/resource/ISSN/2410-9355) | Linked by ARO | Linked, not opened | 2026-10-27 | 0 |
| [Journal DOI 10.14500/2307-549X](https://dx.doi.org/10.14500/2307-549X) | Linked by ARO | Linked, not opened | 2026-10-27 | 0 |
| [Clarivate Master Journal List entry](https://mjl.clarivate.com/search-results?issn=2307-549X&hide_exact_match_fl=true) | Linked by ARO | Linked, not opened | 2026-10-27 | 0 |
| [Jisc Sherpa Services record for ARO](https://v2.sherpa.ac.uk/id/publication/30460) | Linked by ARO | Unreachable | 2026-10-27 | 0 |
| [COPE Code of Conduct for Journal Editors (2011, PDF)](http://publicationethics.org/files/Code_of_conduct_for_journal_editors_Mar11.pdf) | Linked by ARO | Linked, not opened | 2026-10-27 | 0 |
| [Crossref Similarity Check (CrossCheck)](http://www.crossref.org/crosscheck.html) | Linked by ARO | Linked, not opened | 2026-10-27 | 0 |
| [Crossref Simple Text Query (documentation)](https://www.crossref.org/documentation/retrieve-metadata/simple-text-query/) | External | Linked, not opened | 2026-10-27 | 0 |
| [ORCID](https://orcid.org/) | Linked by ARO | Read | 2026-10-27 | 0 |
| [Google Scholar](https://scholar.google.com/) | Linked by ARO | Linked, not opened | 2026-10-27 | 0 |
| [Zotero reference manager](https://www.zotero.org/) | External | Read | 2026-10-27 | 0 |
| [Mendeley reference manager](https://www.mendeley.com/) | External | Linked, not opened | 2026-10-27 | 0 |
| [CC BY-NC-SA 4.0 licence deed](https://creativecommons.org/licenses/by-nc-sa/4.0/) | External | Read | 2026-10-27 | 0 |
| [ACL Anthology](https://aclanthology.org/) | External | Read | 2026-10-27 | 0 |

"Partly readable" means the URL resolves but its content needs JavaScript or a Google session: the Stage-One template's text was read through Google Docs' plain-text export, while the `.dotx` on Google Drive could be identified (title `ARO_Template.dotx`) but not previewed. "Linked, not opened" means the URL was taken from an official ARO page and its content was not needed for any rule.

## Download URLs tested

| Resource | URL | Result on 27 Oct 2026 |
|---|---|---|
| STAGE-ONE template (from the Submissions checklist) | https://docs.google.com/document/d/1szazcmQAUDyaI8GN0disy0MPlDg4pABK/edit | Resolves to *ARO_Submission.docx* in Google Docs; plain-text export readable; footer reads "ARO ISSN: 2307-549X \| FIRST STAGE TEMPLATE \| ARO.FIRST-STAGE.docx". |
| ARO template (from the Guide to Authors) | https://drive.google.com/file/d/1xwPklQNBxpu5RDCDLGJyDNUTG2aa6Ujv/view | Resolves to *ARO_Template.dotx* on Google Drive; preview needs a browser session, so its contents were not compared with the .docx. |
| COPE Code of Conduct (PDF) | http://publicationethics.org/files/Code_of_conduct_for_journal_editors_Mar11.pdf | Linked from the Publication Ethics statement; not opened. |
| Jisc Sherpa record | https://v2.sherpa.ac.uk/id/publication/30460 | Returned a client error. Marked unreachable. |

Neither template is re-hosted in this repository: redistribution permission is not stated, so the site links to the originals.

## Facts extracted

Each row is one requirement as stored in `data/requirements.json`; the full paraphrase, explanation and compliance advice live there and on the site.

| Id | Requirement | Status | Sources | Stages |
|---|---|---|---|---|
| `r-scope` | Sciences and engineering only | mandatory | aro-about, aro-guide, aro-editorial-policies | s01, s02 |
| `r-article-types` | Pick one article type | mandatory | aro-submissions, tpl-stage-one, aro-publishing | s01, s03 |
| `r-discipline` | Declare your discipline on the first page | mandatory | tpl-stage-one | s04, s05 |
| `r-original` | Original and not under review elsewhere | mandatory | aro-submissions, aro-editorial-policies, aro-pubethics | s02, s06, s07 |
| `r-no-prelim` | No preliminary results or reworked papers | mandatory | tpl-stage-one | s02 |
| `r-contribution` | State your contribution clearly | mandatory | aro-guide, aro-publishing | s02, s03 |
| `r-official-email` | Official institutional email for every author | mandatory | aro-submissions, tpl-stage-one | s05 |
| `r-orcid-scholar` | ORCID and Google Scholar for every author | mandatory | aro-submissions, aro-guide, tpl-stage-one | s05 |
| `r-biography` | Author biography (up to 100 words) | mandatory | aro-submissions, aro-guide | s05 |
| `r-author-metadata` | Author details on the first page and in the system | mandatory | aro-guide, tpl-stage-one, aro-register | s05, s07 |
| `r-authorship` | Authorship and co-author agreement | mandatory | aro-faq, tpl-stage-one | s05 |
| `r-template` | Use the Stage-One template | mandatory | aro-guide, aro-submissions, tpl-stage-one, tpl-aro-dotx | s04 |
| `r-typography` | Times New Roman 12 pt, double-spaced, one column | mandatory | aro-guide, aro-submissions, tpl-stage-one | s04 |
| `r-page-setup` | Letter paper, 20 mm margins | mandatory | tpl-stage-one | s04 |
| `r-file-format` | Microsoft Word file | mandatory | aro-guide, aro-submissions, tpl-stage-one, aro-howto | s04, s07 |
| `r-figures-inline` | Figures and tables inside the text | mandatory | aro-submissions, aro-guide | s04 |
| `r-title` | Title of at most 15 words | mandatory | tpl-stage-one | s03 |
| `r-abstract` | Abstract: 150–250 words, no citations | mandatory | aro-guide, aro-submissions, tpl-stage-one | s03, s06 |
| `r-keywords` | About five index terms, alphabetical | mandatory | tpl-stage-one, aro-guide | s03 |
| `r-structure` | Section order and what each section does | mandatory | aro-guide, tpl-stage-one | s03 |
| `r-length` | Word and figure limits | mandatory | aro-guide, tpl-stage-one | s03, s06 |
| `r-figures` | Figure resolution and captions | mandatory | aro-guide, tpl-stage-one | s04 |
| `r-tables` | Table rules | mandatory | aro-guide, tpl-stage-one | s04 |
| `r-equations` | Equations | mandatory | aro-guide, tpl-stage-one | s04 |
| `r-units` | SI units | mandatory | aro-guide, tpl-stage-one | s04 |
| `r-harvard` | Harvard author-date referencing | mandatory | aro-guide, tpl-stage-one, aru-harvard | s03, s04, s06 |
| `r-ref-min` | At least 15 references | mandatory | tpl-stage-one | s03, s06 |
| `r-ref-urls` | URLs or DOIs for references | mandatory | aro-submissions, tpl-stage-one, aro-guide | s06 |
| `r-no-preprints` | Do not cite non-peer-reviewed preprints | mandatory | aro-guide | s03, s06 |
| `r-similarity` | Similarity report below 15% | mandatory | aro-submissions, aro-guide, tpl-stage-one, aro-review-process | s06 |
| `r-plagiarism-any-stage` | Plagiarism found at any stage | informational | aro-guide, aro-editorial-policies | s08, s09 |
| `r-ai-text` | No AI-generated text | mandatory | aro-guide | s03, s06 |
| `r-english` | Clear English | mandatory | aro-guide, tpl-stage-one, aro-faq | s03, s06 |
| `r-style` | Template style rules | recommended | tpl-stage-one | s03, s04 |
| `r-ethics` | Publication ethics (COPE) | mandatory | aro-pubethics, aro-editorial-policies, aro-ethics-policy | s02, s06 |
| `r-human-participants` | Human participants need ethics approval | conditional | aro-ethics-policy | s02 |
| `r-coi-funding` | Conflicts of interest and funding | mandatory | aro-ethics-policy, aro-pubethics, aro-guide | s05, s06 |
| `r-double-blind` | Double-blind peer review | mandatory | aro-review-process, aro-guide, aro-editorial-policies, aro-faq, aro-submissions | s06, s08 |
| `r-supplementary` | Supplementary files uploaded separately | conditional | aro-guide, aro-howto | s07 |
| `r-registration` | Register an account | mandatory | aro-register, aro-guide, aro-authors-info | s07 |
| `r-metadata` | Enter submission metadata | mandatory | aro-guide, aro-howto | s07 |
| `r-compliance` | Confirm compliance at submission | mandatory | aro-howto, aro-submissions | s07 |
| `r-review-process` | How ARO reviews a paper | informational | aro-review-process, aro-review-policy, aro-faq, tpl-stage-one | s08 |
| `r-no-changes` | No changes while under review | mandatory | aro-faq | s08 |
| `r-timelines` | Expected timing | informational | aro-faq, aro-example-2814 | s08 |
| `r-production` | Stage Two: production after acceptance | informational | aro-guide, aro-mes, tpl-stage-one | s09 |
| `r-license` | CC BY-NC-SA 4.0, you keep copyright | informational | aro-oa, aro-submissions, aro-guide, doaj | s09, s10 |
| `r-fees` | No fees (diamond open access) | informational | aro-publishing, aro-guide, aro-oa, aro-faq | s01 |
| `r-issues` | Two issues a year, online ahead of print | informational | aro-publishing, aro-editorial-policies | s09 |
| `r-indexing` | Indexing and identifiers | informational | aro-indexing, aro-publishing, aro-about, doaj | s01 |
| `r-self-archive` | Sharing and self-archiving | informational | aro-oa, aro-repository, aro-archiving | s10 |
| `r-how-to-cite` | Every article has a 'How to cite' | informational | aro-faq, aro-example-2814 | s10 |
| `r-corrections` | Corrections and retractions | informational | aro-editorial-policies | s10 |

## Contradictions between official sources

### Should the submitted manuscript carry author names? (`c-anonymization`, unresolved, high impact)

  - *aro-guide*: Stage One: put every author's name, affiliation, ORCID and Google Scholar URL on the first page, and do not remove the template's first-page information fields. The editorial office removes all author information after its initial check and before double-blind review.
  - *tpl-stage-one*: The Stage-One template has author-name, organisational email, ORCID and Google Scholar fields on its first page, and states that the Editorial Office removes names and affiliations after submission for double-blind review.
  - *aro-submissions*: Checklist item 7: submit a Word file (.doc or .docx) without author names, following the STAGE-ONE Template.

**Analysis.** Two of the three sources, including the template itself and the most detailed page, describe anonymisation done by the editorial office, so authors fill in the first page. The checklist line reads like the generic Open Journal Systems wording that many journals keep by default. It is still an item you tick at submission, so it cannot be ignored. Double-blind review only needs the copy that reviewers see to be anonymous; both readings protect that.

**Recommendation.** Email the editorial office (aro.journal@koyauniversity.org) before submitting and ask which version to upload. Prepare both files now: (1) the Stage-One file with every first-page field completed, and (2) an anonymised copy with the author block removed, self-citations written in the third person and the file's author properties cleared. If no reply arrives, follow the Guide and template (completed first page) and say in Comments to the Editor that author details are on page 1 as the Guide to Authors instructs, and that an anonymised copy is attached.

### Abstract: at most 250 words, or 150 to 250? (`c-abstract-length`, reconciled, low impact)

  - *aro-guide*: Under Manuscript Preparation: no more than 250 words.
  - *aro-guide*: Under Abstract: between 150 and 250 words, self-contained, without citations.
  - *aro-submissions*: Checklist item 6: must not exceed 250 words.
  - *tpl-stage-one*: No more than 250 words, self-contained, symbols defined, no citations.

**Analysis.** Every source accepts 150 to 250 words.

**Recommendation.** Write 150 to 250 words. That satisfies all four statements.

### Which file format does the first submission need? (`c-file-format`, unresolved, medium impact)

  - *aro-guide*: Microsoft Word: .doc, .docx or .rtf.
  - *aro-submissions*: Microsoft Word file (.doc or .docx).
  - *tpl-stage-one*: Review stage: online submission in .docx and .pdf.
  - *aro-howto*: Required format described as 'Microsoft Word or PDF'.

**Analysis.** .docx is accepted by every source. Only the template mentions a PDF alongside it.

**Recommendation.** Upload the .docx as the main file. Keep a PDF export ready and include it if the upload screen offers a slot for it, or ask the office together with the anonymisation question.

### AI writing tools: banned, or recommended? (`c-ai-tools`, unresolved, high impact)

  - *aro-guide*: Under Plagiarism: text generated by AI, machine learning or similar algorithmic tools is not allowed, and a violation is scientific misconduct.
  - *aro-guide*: Under English Grammar: authors are encouraged to use grammar-check software or ask a native speaker.
  - *aro-guide*: A section titled 'Free AI writing tools' lists grammar checkers, paraphrasers and summarisers (Scribbr).

**Analysis.** The ban is stated as a misconduct rule; the tool list is a convenience link. The page never says that paraphrasers or summarisers are exempt, and none of the policy pages adds a disclosure route. The only use the Guide clearly endorses is grammar checking.

**Recommendation.** Write every sentence yourself. Use spelling and grammar correction only where it fixes your own sentences and does not generate new ones. Do not use paraphrasers, summarisers or chat models to produce, rewrite or translate manuscript text. Keep your drafts and version history as evidence of authorship. Ask the office whether grammar-tool use should be disclosed. Using AI models as the object of your research (for example evaluating or benchmarking them) is a separate matter: describe it fully in Methods.

### Preprint citations: the rule and a published counterexample (`c-preprints`, informational, medium impact)

  - *aro-guide*: Under References: papers available only in preprint repositories (including arXiv) that are not formally peer reviewed may not be cited.
  - *aro-example-2814*: Observed: a 2026 ARO article's reference list includes an item labelled [Preprint].

**Analysis.** One published exception does not change a written rule. Reviewers and editors will apply the Guide.

**Recommendation.** Follow the rule. Cite the peer-reviewed venue version of every paper (most conference and workshop papers have a published proceedings version). For work that exists only as a technical report on arXiv (many technical reports and model releases), ask the office whether the official model card or repository may be cited as software instead.

### Peer review model wording (`c-review-model`, reconciled, low impact)

  - *aro-review-process*: Double-blind: author and reviewer identities are kept confidential.
  - *aro-review-policy*: Generic wording: review may be open, transparent or anonymised depending on the journal's policies.
  - *aro-editorial-policies*: Double-blind peer review.

**Analysis.** The ARO-specific pages, the FAQ and the Guide all say double-blind; the policy page uses template wording.

**Recommendation.** Prepare for double-blind review.

### Author biography: optional or required? (`c-biography`, unresolved, medium impact)

  - *aro-guide*: Authors now have the option to include a biography; the corresponding author supplies biographies during registration.
  - *aro-submissions*: Checklist item 2: provide an academic biography of up to 100 words with a clear statement of affiliation.

**Analysis.** The checklist is what you confirm when submitting, so treat it as required.

**Recommendation.** Write a biography of at most 100 words for every author, with affiliation stated, and keep it out of the anonymised manuscript copy.

### Issue cut-off dates (`c-issue-cutoff`, informational, low impact)

  - *aro-publishing*: Odd issue: papers accepted January to June, closing 30 June. Even issue: July to December, closing 30 December.
  - *aro-editorial-policies*: Odd issue includes papers accepted by 1 June; even issue by 1 December.

**Analysis.** Both pages agree on two issues a year and online-ahead-of-print publication. They differ by a month on the cut-off.

**Recommendation.** If you need the paper in a particular issue, plan for acceptance before 1 June or 1 December.

### Impact factor figures differ between pages (`c-impact-factor`, informational, low impact)

  - *aro-about*: Impact factor reported as 2.1 (June 2025).
  - *aro-publishing*: Web of Science Impact Factor 1.1, Q3 (2025); Scopus CiteScore 3.1 (Q3).

**Analysis.** Metrics do not affect submission requirements.

**Recommendation.** If a metric matters to you or your institution, check it in Clarivate's Journal Citation Reports rather than quoting either page.

### The template's discipline list has no NLP or AI box (`c-discipline`, unresolved, high impact)

  - *tpl-stage-one*: Tick one field that matches your specialty; undeclared disciplines are not considered. Computer Science lists only Software Engineering.
  - *aro-about*: Scope: sciences and engineering, including interdisciplinary work.
  - *aro-example-2814*: Observed: ARO published a natural language processing paper in 2026.

**Analysis.** Topics such as NLP have been published in ARO, so they are within scope in practice, but the closest tick box is 'Computer Science: Software Engineering'. 'Undeclared disciplines are not considered' makes the tick box consequential.

**Recommendation.** Ask the office which box an NLP / AI paper should tick, in the same email as the anonymisation question. Until then, plan to tick Computer Science.

### Associate Editors are mentioned but not listed (`c-associate-editors`, informational, low impact)

  - *aro-faq*: An Associate Editor selects reviewers and recommends acceptance, revision or rejection to the Editor-in-Chief.
  - *aro-team*: The Editorial Team page lists only Executive Editors.

**Analysis.** You do not need to know who your handling editor is. It only explains why the directory has no Associate Editor section.

**Recommendation.** No action.

### Stated review times and one observed timeline (`c-review-time`, informational, low impact)

  - *aro-faq*: Initial review takes about 4 to 6 weeks; a decision typically 8 to 12 weeks from submission.
  - *aro-example-2814*: Observed: one 2026 article was received 2 January, accepted 19 June and published 15 August.

**Analysis.** A single example is not a statistic, but it shows that the stated range is a typical case, not a promise.

**Recommendation.** Plan for longer than 12 weeks if a deadline (graduation, a course, a grant report) depends on acceptance.


## The two investigations the brief asked for

**Author names in the submitted manuscript.** The Guide to Authors (Stage One requirements) and the Stage-One template both put all author details on page 1 and state that the editorial office removes them before double-blind review. Submission checklist item 7 asks for a Word file "without author names". The Peer Review Policy does not say who anonymises. Two of three sources, including the template and the most detailed page, describe office-side anonymisation, and the checklist wording matches the default Open Journal Systems checklist. Because the checklist is something the author confirms, the site does not choose silently: it keeps both references, tells authors to prepare both files, and supplies an email asking the office which to upload. Status: **unresolved**.

**AI-assisted writing.** The only AI rule is under *Plagiarism* in the Guide: text generated by AI, machine learning or similar tools is not allowed, and a violation is scientific misconduct. The same page encourages grammar-checking software and lists "Free AI writing tools" (grammar checker, paraphraser, summariser). No policy page (Editorial Policies, Ethics Policy, Publication Ethics statement, Peer Review Policy) mentions AI or a disclosure route. The site therefore treats AI-generated or AI-rewritten text as prohibited, grammar correction of the author's own sentences as the one clearly encouraged use, and translation, AI figures and disclosure as open questions. Status: **unresolved**.

## Unresolved questions (for the editorial office)

1. Which manuscript file to upload: the completed Stage-One file, an anonymised copy, or both.
2. Whether the first submission should include a PDF alongside the .docx.
3. Whether grammar-tool use on author-written text is acceptable and whether it should be disclosed; whether machine translation counts as generated text.
4. Whether the 100-word author biography is required for every author.
5. Which submission field an NLP / AI paper should tick (the template lists only Software Engineering under Computer Science).

The site's email draft (ARO Directory → Ask the editorial office) contains exactly these questions, and each can be marked answered on its question page.

## Important missing information

- **Logged-in submission screens** were not inspected. The submission walkthrough is a labelled conceptual simulation built from *How to Submit*, the *Guide to Authors* and the public registration form.
- **Decision categories:** ARO names acceptance, revision and rejection (FAQ). Minor vs major revision is not documented and is shown as illustrative.
- **Revision deadlines, appeal procedures, author proofs** and **review timelines beyond the FAQ** are not documented on any public page.
- **Keyword count:** only the template gives one ("about five"); the Guide has a Keywords heading with no number.
- **Harvard specifics:** ARO's pages give no et al. threshold or italics rules; the site uses the linked Anglia Ruskin University guide for those and marks the template's example patterns as ARO-specific.
- **Associate Editors** are named as a role in the FAQ but not listed anywhere.
- **Self-archiving details** (versions, embargo) are partly on the Open Access Policy; the Sherpa record it points to was unreachable.
- **Scope list:** the About page gives "sciences and engineering" without sub-fields; the template's discipline tick boxes are the only list.

## Maintenance

- `npm run check:links` (or `node scripts/check-links.mjs`) re-checks every URL and writes `link-report.json`; it exits non-zero if an official ARO page fails. The CI workflow runs it on every push as a non-blocking job.
- When ARO changes a rule: edit `data/requirements.json` (and `conflicts.json` if relevant), update `verified` in `data/sources.json` and `verifiedDate`, then rebuild. The build refuses data that breaks references.
