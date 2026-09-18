# Independent Deal Review PDF QA — Sprint 3

Run `npm run report:test`. The workflow generates five reports from shared models, reads the PDF text/layout with PDF.js, renders every page to PNG with a native canvas, and creates contact sheets under `data/validation/sprint3-visual/`. The browser renderer blocks outbound requests; local Chrome is required.

## Automated checks

- [x] Report companion JSON exactly equals the shared screen model, including its fingerprint.
- [x] Unique timestamp plus random suffix; PDF/model writes use exclusive creation, never silent overwrite.
- [x] US Letter; readable header/footer and `Page n of N` on every page.
- [x] All text within checked page bounds; no blank/near-empty pages.
- [x] Every comparable address retained in extracted PDF text.
- [x] Repeating headers on multi-page comparable tables.
- [x] Explicit negative currency, including Fantasia AVM point `-$58,000`.
- [x] Unknown values remain `Unknown`, not fabricated zero costs.
- [x] Required title and neutral limitations; no recommendation, approval, guaranteed-return or offering-memorandum terminology.
- [x] Protected Sprint 1/2 artifacts still match their hashes after generation.

## Visual inspection

Reviewed contact sheets for all five fixtures and full-size Fantasia comparable and scenario pages. The golden report is 11 pages: executive summary; property facts; two pages of comps; valuation; economics; scenarios; sensitivity/break-even; evidence; sponsor questions; methodology. No clipping, overlapping text, orphan section headings, split comp rows or unreadable tables observed. Scenario losses have an explicit minus sign. The table font is 9.5 pt, body 10 pt, and table content wraps instead of shrinking.

| Fixture | Pages | Retained comps | Finding |
| --- | ---: | ---: | --- |
| Fantasia | 11 | 15 | All comps on two pages; repeated headers; golden figures reconcile |
| Bass | 4 | 0 | STOP retained; unavailable independent analytics; compact flowing layout |
| Joyce | 4 | 0 | Ambiguity retained; no inferred identity/value |
| Synthetic long / unknowns | 5 | 1 | Long address wraps; unavailable coordinates and costs explicit |
| Synthetic many comps | 17 | 70 | All rows retained; headers repeated over eight comp-table pages |

The first draft was 21 pages because it repeated raw comparable payloads in the evidence section. That draft was not accepted. The final evidence section summarizes all assessed fields; full field-level values/notes/references remain in the screen and exact companion JSON. Incomplete reports originally used overly sparse section-per-page layout; they now flow across pages.

## Intentional omissions and reproducibility

No static map or photo is invented. Every report explains the static-map omission and supplies location facts/comparable addresses. No interactive-map screenshots, external fonts, AI narrative or probability model are used. Golden reports target 8–12 pages; stress fixtures grow with their content. PDF binary bytes vary with issue time/browser metadata, but unchanged input model data/fingerprint is deterministic.

Machine results, exact PDF paths, page counts, image paths and hashes: `data/validation/sprint3-pdf-qa.json`. Previous development/QA PDFs are retained as separate files; use the completion report's reviewed delivery path.
