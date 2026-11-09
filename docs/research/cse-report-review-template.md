# CSE report review template

Use this when adding a company report as a reference for a sector profile, or when verifying an existing profile against its reference PDF. Copy the file to `docs/research/reviews/<sector_id>-<company>-<year>.md` and fill it in. One review per report.

The reports are **format and disclosure references**. Do not copy company figures into a profile as benchmarks, and do not assume every company in the sector discloses what this one does.

---

## 1. Document identity (from the document itself)

| Item | Value | Where confirmed (PDF page / printed page) |
|---|---|---|
| File name | | |
| Company legal name (cover) | | |
| Reporting period / year end | | |
| Report type (annual / integrated / interim) | | |
| PDF page count | | |
| Group and company columns both presented? Order? | | |
| Unit stated on the statements (Rs., Rs. '000, Rs. Mn) | | |
| Attached corrections (errata, corrigendum) and their date | | |
| Auditor and opinion type | | |

Special handling notes (discontinued operations, restatements, subsidiaries not on a going-concern basis, changed segment structure):

-

## 2. Sections found

Inspect the sections themselves, not only the contents page.

| Section | Present? | PDF page(s) | Printed page(s) | Notes |
|---|---|---|---|---|
| Chairman / CEO / MD review | | | | |
| MD&A / operational review | | | | |
| Financial highlights | | | | |
| Non-financial highlights | | | | |
| Segment / cluster / sector reviews | | | | |
| Risk management | | | | |
| Capital / resource reports | | | | |
| Sustainability (incl. SLFRS S1/S2) | | | | |
| Five-/ten-year summary | | | | |
| Income statement | | | | |
| Statement of financial position | | | | |
| Cash flow statement | | | | |
| Segment note | | | | |
| Sector-specific schedules (e.g. life fund, crop performance, project portfolio) | | | | |

## 3. Business model

- Actual activities (from the principal activities note and management review):
- Business model selected in the profile (`business_models[].id`):
- Engine (`industrial` / `lending` / `insurer`):
- Does the GICS label describe the business? If not, why:
- Segments as named in the report:

## 4. KPI verification

One row per KPI the report discusses. Use the report's own wording.

| Original label (verbatim) | PDF page | Printed page | Section heading | Scope (Group / Company / segment) | Period | Unit | Canonical metric id | Status | Notes on definition |
|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | reported / derived / candidate / not found | |

Rules:
- Map to a canonical id only when the meaning clearly matches. Otherwise propose a new metric.
- A KPI named in the contents but not quantified in its section is **not found**.
- Never infer a value from narrative text, and never infer occupancy, utilisation, churn, yield or NPL from revenue.
- Record a different definition (e.g. NIM on average interest-earning assets vs total assets) in the notes column.

## 5. Extraction test

Run `node scripts/test-extract.mjs <file.pdf>` (add the engine as a second argument for `lending` or `insurer`).

| Check | Result |
|---|---|
| Statement pages found (IS / BS / CF) | |
| Continuation pages joined correctly | |
| Unit detected and confidence | |
| Identity checks passing | |
| Fields not found | |
| Misread fields (value, correct value, cause) | |

## 6. Profile changes proposed

- Metrics to add / remove / change status:
- Aliases to add (verbatim labels):
- Checks or thresholds to change, with reasoning:
- Valuation suitability changes:
- Cautions to add (document-specific warnings stay here, not in the sector profile):

## 7. Sign-off

| | Name | Date |
|---|---|---|
| Reviewed by | | |
| Profile version bumped to | | |
| `verification.status` set to `verified` | yes / no | |
