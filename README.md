# CSE Report Analyzer (React + Vite + Netlify), maths only

No AI in the analysis. Figures are read from the PDF by rules; every ratio, score and scenario is calculated by formula.

## Stack
| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite, `pdfjs-dist` (PDF is read in the browser) |
| Engine | `src/engine/` pure JS: `lines.js`, `extract.js`, `analyze.js` (no dependencies) |
| Backend | Netlify Functions: `analyze` (runs the engine), `status` (paywall), `checkout` + `payhere-notify` (PayHere) |
| Storage | Netlify Blobs (job result + paid flag) |

## How the analysis works
1. **Read** (`lines.js`): pdf.js text items are grouped into lines by y-position.
2. **Locate statements** (`extract.js`): finds the income statement, balance sheet and cash-flow pages by title + required rows, and joins continuation pages.
3. **Extract**: each line is split into label + numbers (brackets = negative, notes column dropped, Group column first). Labels are matched with a regex dictionary (e.g. `^total current liabilities`). Borrowings, capex and D&A are summed across their lines. Units (Rs. '000 / Mn / full rupees) are detected and normalised to millions.
4. **Validate**: assets = liabilities + equity, revenue − cost of sales = gross profit, PBT − tax = PAT. Mismatches are shown so the user can correct a misread figure; every value is editable before analysis.
5. **Analyse** (`analyze.js`): growth, margins, CFO/PAT, accruals, FCF, net debt/EBITDA, interest cover, DSO/DIO/DPO and cash cycle, ROE/ROCE, Piotroski F-score (9 tests), Altman Z (market-value form if a price is given, Z″ otherwise), PAT bridge (with an explicit "unexplained" bar), 5-year DCF with WACC × terminal-growth grid and bear/base/bull. Status flags (healthy/watch/concern) are threshold rules; questions are generated from the flags.
6. **Text signals**: pages with related-party, contingent-liability, emphasis-of-matter, going-concern-uncertainty and qualified-opinion headings are detected and cited. Related-party flows are *not* computed, only pointed to.

Verified on the Cable Solutions PLC FY2025/26 report: all 26 fields extracted, the 6 identity checks pass, and the results match a manual analysis (CFO/PAT 0.34x, Piotroski 5/9, Altman 6.6, EPS 0.74).

## Run / deploy
```
npm install
cp .env.example .env     # PayHere keys
npx netlify dev
node scripts/test-extract.mjs path/to/report.pdf   # check extraction on any report
```
Push to Git → import in Netlify → set `PAYHERE_MERCHANT_ID`, `PAYHERE_SECRET`, `PAYHERE_SANDBOX` → deploy. Add your domain in the PayHere merchant settings.

## Paywall
`status` returns only the summary and checks 1–2 until `payhere-notify` (signature, status, currency and amount verified) marks the job paid. Analysis costs nothing per report, so there is no upload-cost abuse risk beyond function invocations.

## Limits
- Needs text PDFs (no OCR) and a standard Sri Lankan layout: Group columns first, standard statement titles. Other layouts may miss rows; the review table lets the user fix them. Run `scripts/test-extract.mjs` on more reports and extend the regex dictionary in `extract.js`.
- Figures below 1,000 in reports stated in millions are fine; reports in Rs. '000 are scaled by the detected unit line.
- Banks and insurers have different statements (no gross profit, receivables, etc.); checks will show n/a or manual there.
- Peer comparison, sentiment/tone and multi-year trend from several reports are not included.
- Thresholds (e.g. CFO/PAT < 0.5 = concern) are judgement calls; adjust them in `analyze.js`.
- DCF assumptions are generic and illustrative. Not investment advice.
