# PI V3.4.2 — AI Renovation Concept Presentation

## Outcome

PI V3.4.2 adds a secure, optional before/concept workflow to the existing private Property Photo Gallery. It does not add an image-generation provider and does not change underwriting, Monte Carlo, evidence, authentication, storage isolation, or billing behavior.

An authorized analyst can:

1. Upload an actual JPEG, PNG, or WebP property photograph.
2. Select that photograph's exact immutable version.
3. Upload an externally generated AI renovation concept.
4. Record a concept title, optional improvement notes, report selection, cover selection, and redistribution acknowledgment.
5. Preview the exact pair in the gallery.
6. Include the selected pair in a Full Investor Package or use the concept as its cover.

## Evidence boundary

Historical gallery records default to `ACTUAL_PROPERTY_PHOTO`. New concept records are explicitly classified `AI_GENERATED_CONCEPT` and retain the exact original photo ID/version they reference. The association cannot be changed after upload.

Concept imagery is excluded from:

- property-condition evidence and condition claims;
- rehabilitation-cost or scope verification;
- actual source-photo counts;
- checklist completion;
- physical-condition conclusions; and
- ARV or valuation support.

The report service rejects a concept if it is submitted through the actual-photo evidence path. Concept report reads independently verify tenant access, exact immutable concept and original versions, CLEAN status, selection fingerprint, and redistribution acknowledgment.

## Report behavior

- Full Investor Package: an explicitly selected concept may be the cover image and is visibly labeled `AI-GENERATED RENOVATION CONCEPT`.
- A dedicated `Renovation Vision — Existing Condition & Concept` page follows the cover and displays the paired images at matching dimensions without distortion.
- The page includes: “AI-generated conceptual renovation. Improvements, feasibility, costs and final appearance have not been verified. Actual results may differ.”
- The actual-condition photo gallery remains separate and unchanged.
- Opportunity Brief: remains one page and shows the concept thumbnail only when that concept is explicitly selected as the cover.
- Reports with no eligible concept omit all concept sections and preserve prior behavior.

## Local QA fixtures

The owner-provided images were copied only into the local fixture directory. They were not associated with an existing production property and were not uploaded to Firebase.

| Fixture | SHA-256 |
| --- | --- |
| `existing-condition.jpg` | `c48266e860b309b10bf34c637f1b705f056d1e2dd7d86f3d1fefb620b6759598` |
| `ai-renovation-concept.png` | `1ba28b176829336a761ff43ea8d016d1acc3116f5e79532a48bf3e123f5373c2` |

## Certification

- Focused automated suite: 87 passed, 0 failed.
- Dedicated V3.4.2 tests: exact-version pairing, immutable association, scan and permission enforcement, tenant isolation, evidence-path rejection, soft removal, historical reproducibility, report omission, concept cover, paired page, one-page brief, and financial invariance.
- Production web build: passed.
- Offline Full Investor Package: 15 pages; every page visually rendered and checked for non-empty content, pagination, clipping, and out-of-bounds text.
- Offline Opportunity Brief: 1 page.
- Financial/Monte Carlo invariant hash: `16a3b35a41f0acccefd133f7fe3c5fd984432be3c7731ec76e84c209cf941c8a` before and after concept selection.
- Live Firebase reads/writes: 0.
- Live Storage writes: 0.
- Provider or AI-generation requests: 0.

Local artifacts are in `data/validation/pi-v3-4-2-ai-renovation-concepts/`:

- `AI-Concept-Full-Investor-Package.pdf`
- `AI-Concept-Opportunity-Brief.pdf`
- `renovation-concept-gallery-pair.png`
- cover, paired-page, Opportunity Brief, and all-page screenshots
- `qa-results.json`

## Security and lifecycle

Concept files reuse the existing private Firebase Storage transport, ClamAV scan policy, MIME/signature validation, size limits, metadata-stripped report derivative, SHA-256 integrity check, organization-scoped repository, CSRF protection, authenticated preview, and soft-removal behavior. Removing an active concept does not delete immutable bytes or invalidate historical report references.

No production property, scenario, report, photo, document, or financial record was changed during local certification.
