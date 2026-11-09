# CSE sector metric dictionary

_Generated from `config/sector_profiles/` by `scripts/gen-metric-dictionary.mjs`. Do not edit by hand._

## Rules that apply to every metric
- **Missing stays missing.** A metric with no reported value or no complete inputs is shown as *not found*, never as zero and never estimated.
- **Reported** = a statement line item read from the PDF, or a value typed from the report with its page number. **Derived** = calculated with the formula listed.
- **Period:** current and prior financial year as presented in the same report. Growth metrics need both years.
- **Scope:** Group (consolidated) unless the user selects Company / Bank figures. Values from different scopes are not mixed.
- **Units:** currency in Rs. millions after unit detection; per-share values in rupees; percentages entered as typed (4.5 = 4.5%).
- **Status in the profile:** `report_observed` = the catalogue describes the reference report as disclosing it; `candidate` = relevant but not confirmed in the reference report; `derived` = cross-sector formula.
- Profiles are **unverified** until checked against their reference PDF.

## Cross-sector derived metrics

| Id | Metric | Unit | Formula |
|---|---|---|---|
| `revenue_growth` | Revenue growth | % | revenue / last year revenue - 1 |
| `gross_margin` | Gross margin | % | gross profit / revenue |
| `operating_margin` | Operating margin | % | operating profit (EBIT) / revenue |
| `ebitda_margin` | EBITDA margin | % | (EBIT + depreciation and amortisation) / revenue |
| `cfo_to_pat` | Operating cash flow / profit after tax | x (times) | cash from operations / PAT |
| `capex_to_revenue` | Capex / revenue | % | capital expenditure / revenue |
| `payout_ratio` | Dividend payout | % | dividends paid / PAT |
| `lease_liabilities` | Lease liabilities (IFRS 16) | Rs. Mn | current + non-current lease liabilities |
| `net_debt_to_ebitda` | Net debt / EBITDA | x (times) | (borrowings + leases - cash) / EBITDA; n/a unless all inputs are known |
| `interest_cover` | Interest cover | x (times) | EBIT / finance cost |
| `current_ratio` | Current ratio | x (times) | current assets / current liabilities |
| `inventory_days` | Inventory days | days | inventory / cost of sales x 365 |
| `receivable_days` | Receivable days | days | receivables / revenue x 365 |
| `payable_days` | Payable days | days | payables / cost of sales x 365 |
| `cash_conversion_cycle` | Cash conversion cycle | days | inventory days + receivable days - payable days |
| `roe` | Return on equity | % | PAT / year-end equity |
| `roce` | Return on capital employed | % | EBIT / (total assets - current liabilities) |
| `nav_per_share` | Net assets per share | Rs. per share | total equity / shares (shares = PAT / EPS) |

## Automobile & Components

Profile `automobile_components` v1.0.0 · unverified · reference: Kelani Tyres PLC (automobile & components.pdf, Annual Report 2025/26)

Business models: Holding / trading company with manufacturing joint venture (industrial); Component manufacturer (industrial); Importer / trader (industrial).

| Id | Metric | Category | Profile status | Calculation | Unit | Formula / inputs | Applies when |
|---|---|---|---|---|---|---|---|
| `revenue_growth` | Revenue growth | financial_performance | derived | Derived | % | revenue / last year revenue - 1 |  |
| `gross_margin` | Gross margin | financial_performance | derived | Derived | % | gross profit / revenue |  |
| `operating_margin` | Operating margin | financial_performance | derived | Derived | % | operating profit (EBIT) / revenue |  |
| `ebitda_margin` | EBITDA margin | financial_performance | derived | Derived | % | (EBIT + depreciation and amortisation) / revenue |  |
| `cfo_to_pat` | Operating cash flow / profit after tax | financial_performance | derived | Derived | x (times) | cash from operations / PAT |  |
| `capex_to_revenue` | Capex / revenue | financial_performance | derived | Derived | % | capital expenditure / revenue |  |
| `net_debt_to_ebitda` | Net debt / EBITDA | financial_position | derived | Derived | x (times) | (borrowings + leases - cash) / EBITDA; n/a unless all inputs are known |  |
| `interest_cover` | Interest cover | financial_position | derived | Derived | x (times) | EBIT / finance cost |  |
| `roce` | Return on capital employed | returns | derived | Derived | % | EBIT / (total assets - current liabilities) |  |
| `roe` | Return on equity | returns | derived | Derived | % | PAT / year-end equity |  |
| `inventory_days` | Inventory days | working_capital | derived | Derived | days | inventory / cost of sales x 365 |  |
| `receivable_days` | Receivable days | working_capital | derived | Derived | days | receivables / revenue x 365 |  |
| `payable_days` | Payable days | working_capital | derived | Derived | days | payables / cost of sales x 365 |  |
| `cash_conversion_cycle` | Cash conversion cycle | working_capital | derived | Derived | days | inventory days + receivable days - payable days |  |
| `jv_share_of_profit` | Share of profit of joint venture | group_structure | report_observed | Reported: typed from the report with a page reference | Rs. Mn |  |  |
| `rental_income` | Rental income | group_structure | candidate | Reported: typed from the report with a page reference | Rs. Mn |  |  |

Valuation: preferred Discounted cash flow (FCFF), Sum of the parts; conditional Earnings multiple (P/E), Price / book; not as default -.

## Banks

Profile `banks` v1.0.0 · unverified · reference: Hatton National Bank PLC (Banks.pdf, Annual Report 2025)

Business models: Licensed commercial bank (lending); Licensed specialised bank (lending).

| Id | Metric | Category | Profile status | Calculation | Unit | Formula / inputs | Applies when |
|---|---|---|---|---|---|---|---|
| `gross_income` | Gross income | income_composition | report_observed | Reported: statement line item | Rs. Mn | statement field `gi` |  |
| `net_interest_income` | Net interest income | income_composition | report_observed | Reported: statement line item | Rs. Mn | statement field `nii` |  |
| `net_fee_income` | Net fee and commission income | income_composition | report_observed | Reported: statement line item | Rs. Mn | statement field `fee` |  |
| `total_operating_income` | Total operating income | income_composition | report_observed | Reported: statement line item | Rs. Mn | statement field `toi` |  |
| `fee_share` | Fee and commission share of operating income | income_composition | candidate | Derived | % | net_fee_income / total_operating_income |  |
| `impairment_charge` | Impairment charges | asset_quality | report_observed | Reported: statement line item | Rs. Mn | statement field `imp` |  |
| `credit_cost` | Impairment charge / gross loans | asset_quality | candidate | Derived | % | impairment_charge / gross_loans (year-end) |  |
| `stage_3_ratio` | Impaired loans (Stage 3) ratio | asset_quality | report_observed | Reported: typed from the report with a page reference | % |  |  |
| `stage_3_coverage` | Impairment coverage of Stage 3 loans | asset_quality | report_observed | Reported: typed from the report with a page reference | % |  |  |
| `operating_expenses` | Operating expenses | efficiency | report_observed | Reported: statement line item | Rs. Mn | statement field `opx` |  |
| `cost_to_income` | Cost-to-income ratio | efficiency | report_observed | Derived | % | operating_expenses / total_operating_income |  |
| `reported_nim` | Net interest margin (reported) | profitability | report_observed | Reported: typed from the report with a page reference | % |  |  |
| `nii_to_assets` | Net interest income / total assets | profitability | candidate | Derived | % | net_interest_income / year-end total assets |  |
| `roa` | Return on assets | profitability | report_observed | Derived | % |  |  |
| `roe` | Return on equity | profitability | report_observed | Derived | % |  |  |
| `gross_loans` | Gross loans and advances | balance_sheet | report_observed | Reported: statement line item | Rs. Mn | statement field `loans` |  |
| `loan_growth` | Loan growth | balance_sheet | report_observed | Derived | % |  |  |
| `customer_deposits` | Customer deposits | funding | report_observed | Reported: statement line item | Rs. Mn | statement field `deps` |  |
| `deposit_growth` | Deposit growth | funding | report_observed | Derived | % |  |  |
| `loan_to_deposit` | Loans / deposits | funding | candidate | Derived | % | gross_loans / customer_deposits |  |
| `casa_ratio` | CASA ratio | funding | candidate | Reported: typed from the report with a page reference | % |  |  |
| `tier1_capital_ratio` | Tier 1 capital ratio | capital_liquidity | candidate | Reported: typed from the report with a page reference | % |  |  |
| `total_capital_ratio` | Total capital ratio | capital_liquidity | candidate | Reported: typed from the report with a page reference | % |  |  |
| `liquidity_coverage_ratio` | Liquidity coverage ratio | capital_liquidity | candidate | Reported: typed from the report with a page reference | % |  |  |
| `bvps` | Book value per share | shareholder | report_observed | Derived | Rs. per share |  |  |
| `eps` | Earnings per share | shareholder | report_observed | Reported: statement line item | Rs. per share | statement field `eps` |  |
| `digital_customers` | Digital customers / active digital users | non_financial | report_observed | Reported: typed from the report with a page reference | count |  |  |
| `digital_transactions` | Digital transaction volume | non_financial | report_observed | Reported: typed from the report with a page reference | count |  |  |
| `branches` | Branch network | non_financial | report_observed | Reported: typed from the report with a page reference | count |  |  |
| `employees` | Employees | non_financial | report_observed | Reported: typed from the report with a page reference | count |  |  |

Checks:
- **Income growth**: `total_operating_income`, growth, higher better, watch 0.05, concern 0
- **Cost efficiency**: `cost_to_income`, level, lower better, watch 0.45, concern 0.55
- **Asset quality**: `stage_3_ratio`, level, lower better, watch 0.04, concern 0.08; falls back to `credit_cost`
- **Funding and liquidity**: `loan_to_deposit`, level, lower better, watch 0.95, concern 1.1
- **Capital adequacy**: `total_capital_ratio`, level, higher better, watch 0.16, concern 0.14
- **Returns**: `roe`, level, higher better, watch 0.12, concern 0.08
- **Related-party and credit concentration** (manual review)

Valuation: preferred Price / book, Residual income, Dividend discount; conditional Earnings multiple (P/E); not as default Discounted cash flow (FCFF).

Not used as primary indicators: `current_ratio`, `inventory_days`, `receivable_days`, `conventional_debt_to_equity`, `net_debt_to_ebitda`, `fcff_dcf`.

## Capital Goods

Profile `capital_goods` v1.0.0 · unverified · reference: Vallibel One PLC (capital goods.pdf, Annual Report 2025/26)

Business models: Diversified holding / conglomerate (industrial); Capital-goods manufacturer (industrial); Engineering / construction contractor (industrial).

| Id | Metric | Category | Profile status | Calculation | Unit | Formula / inputs | Applies when |
|---|---|---|---|---|---|---|---|
| `revenue_growth` | Revenue growth | financial_performance | derived | Derived | % | revenue / last year revenue - 1 |  |
| `gross_margin` | Gross margin | financial_performance | derived | Derived | % | gross profit / revenue |  |
| `operating_margin` | Operating margin | financial_performance | derived | Derived | % | operating profit (EBIT) / revenue |  |
| `ebitda_margin` | EBITDA margin | financial_performance | derived | Derived | % | (EBIT + depreciation and amortisation) / revenue |  |
| `cfo_to_pat` | Operating cash flow / profit after tax | financial_performance | derived | Derived | x (times) | cash from operations / PAT |  |
| `capex_to_revenue` | Capex / revenue | financial_performance | derived | Derived | % | capital expenditure / revenue |  |
| `net_debt_to_ebitda` | Net debt / EBITDA | financial_position | derived | Derived | x (times) | (borrowings + leases - cash) / EBITDA; n/a unless all inputs are known |  |
| `interest_cover` | Interest cover | financial_position | derived | Derived | x (times) | EBIT / finance cost |  |
| `roce` | Return on capital employed | returns | derived | Derived | % | EBIT / (total assets - current liabilities) |  |
| `roe` | Return on equity | returns | derived | Derived | % | PAT / year-end equity |  |
| `lease_liabilities` | Lease liabilities (IFRS 16) | financial_position | derived | Reported: statement line item | Rs. Mn | current + non-current lease liabilities |  |
| `segment_count` | Number of reported business sectors | segments | report_observed | Reported: typed from the report with a page reference | count |  |  |
| `goodwill` | Goodwill | balance_sheet | candidate | Reported: typed from the report with a page reference | Rs. Mn |  |  |
| `impairment_of_investments` | Impairment of goodwill / investments | balance_sheet | candidate | Reported: typed from the report with a page reference | Rs. Mn |  |  |

Checks:
- **Segment comparability** (manual review)

Valuation: preferred Sum of the parts; conditional Discounted cash flow (FCFF), EV / EBITDA, Earnings multiple (P/E), Price / book; not as default Single consolidated multiple.

## Commercial & Professional Services

Profile `commercial_professional_services` v1.0.0 · unverified · reference: Printcare PLC (commercial & professional service.pdf, Annual Report 2025/26)

Business models: Printing and packaging manufacturer (industrial); Business / professional services (industrial).

| Id | Metric | Category | Profile status | Calculation | Unit | Formula / inputs | Applies when |
|---|---|---|---|---|---|---|---|
| `revenue_growth` | Revenue growth | financial_performance | derived | Derived | % | revenue / last year revenue - 1 |  |
| `gross_margin` | Gross margin | financial_performance | derived | Derived | % | gross profit / revenue |  |
| `operating_margin` | Operating margin | financial_performance | derived | Derived | % | operating profit (EBIT) / revenue |  |
| `ebitda_margin` | EBITDA margin | financial_performance | derived | Derived | % | (EBIT + depreciation and amortisation) / revenue |  |
| `cfo_to_pat` | Operating cash flow / profit after tax | financial_performance | derived | Derived | x (times) | cash from operations / PAT |  |
| `capex_to_revenue` | Capex / revenue | financial_performance | derived | Derived | % | capital expenditure / revenue |  |
| `net_debt_to_ebitda` | Net debt / EBITDA | financial_position | derived | Derived | x (times) | (borrowings + leases - cash) / EBITDA; n/a unless all inputs are known |  |
| `interest_cover` | Interest cover | financial_position | derived | Derived | x (times) | EBIT / finance cost |  |
| `roce` | Return on capital employed | returns | derived | Derived | % | EBIT / (total assets - current liabilities) |  |
| `roe` | Return on equity | returns | derived | Derived | % | PAT / year-end equity |  |
| `inventory_days` | Inventory days | working_capital | derived | Derived | days | inventory / cost of sales x 365 |  |
| `receivable_days` | Receivable days | working_capital | derived | Derived | days | receivables / revenue x 365 |  |
| `payable_days` | Payable days | working_capital | derived | Derived | days | payables / cost of sales x 365 |  |
| `cash_conversion_cycle` | Cash conversion cycle | working_capital | derived | Derived | days | inventory days + receivable days - payable days |  |
| `payout_ratio` | Dividend payout | financial_performance | derived | Derived | % | dividends paid / PAT |  |
| `nav_per_share` | Net assets per share | shareholder | derived | Derived | Rs. per share | total equity / shares (shares = PAT / EPS) |  |
| `export_share` | Export / overseas revenue share | segments | candidate | Reported: typed from the report with a page reference | % |  |  |
| `gearing_reported` | Gearing (reported) | financial_position | report_observed | Reported: typed from the report with a page reference | % |  |  |
| `roasf_reported` | Return on average shareholders' funds (reported) | profitability | report_observed | Reported: typed from the report with a page reference | % |  |  |

Valuation: preferred Discounted cash flow (FCFF), EV / EBITDA; conditional Earnings multiple (P/E), Price / book; not as default -.

## Consumer Durables & Apparel

Profile `consumer_durables_apparel` v1.0.0 · unverified · reference: Ambeon Holdings PLC (Consumer Durables & Apparel.pdf, Annual Report 2025/26)

Business models: Diversified group / holding (industrial); Apparel / textile manufacturer (industrial); Consumer durables manufacturer or trader (industrial).

| Id | Metric | Category | Profile status | Calculation | Unit | Formula / inputs | Applies when |
|---|---|---|---|---|---|---|---|
| `revenue_growth` | Revenue growth | financial_performance | derived | Derived | % | revenue / last year revenue - 1 |  |
| `gross_margin` | Gross margin | financial_performance | derived | Derived | % | gross profit / revenue |  |
| `operating_margin` | Operating margin | financial_performance | derived | Derived | % | operating profit (EBIT) / revenue |  |
| `ebitda_margin` | EBITDA margin | financial_performance | derived | Derived | % | (EBIT + depreciation and amortisation) / revenue |  |
| `cfo_to_pat` | Operating cash flow / profit after tax | financial_performance | derived | Derived | x (times) | cash from operations / PAT |  |
| `capex_to_revenue` | Capex / revenue | financial_performance | derived | Derived | % | capital expenditure / revenue |  |
| `net_debt_to_ebitda` | Net debt / EBITDA | financial_position | derived | Derived | x (times) | (borrowings + leases - cash) / EBITDA; n/a unless all inputs are known |  |
| `interest_cover` | Interest cover | financial_position | derived | Derived | x (times) | EBIT / finance cost |  |
| `roce` | Return on capital employed | returns | derived | Derived | % | EBIT / (total assets - current liabilities) |  |
| `roe` | Return on equity | returns | derived | Derived | % | PAT / year-end equity |  |
| `inventory_days` | Inventory days | working_capital | derived | Derived | days | inventory / cost of sales x 365 |  |
| `receivable_days` | Receivable days | working_capital | derived | Derived | days | receivables / revenue x 365 |  |
| `payable_days` | Payable days | working_capital | derived | Derived | days | payables / cost of sales x 365 |  |
| `cash_conversion_cycle` | Cash conversion cycle | working_capital | derived | Derived | days | inventory days + receivable days - payable days |  |
| `export_share` | Export revenue share | segments | candidate | Reported: typed from the report with a page reference | % |  |  |

Valuation: preferred Discounted cash flow (FCFF), EV / EBITDA; conditional Sum of the parts, Earnings multiple (P/E); not as default -.

## Consumer Services

Profile `consumer_services` v1.0.0 · unverified · reference: Sigiriya Village Hotels PLC (Consumer Services.pdf, Annual Report)

Business models: Hotel owner / operator (industrial); Hotel management (asset-light) (industrial); Other consumer services (education, leisure, etc.) (industrial).

| Id | Metric | Category | Profile status | Calculation | Unit | Formula / inputs | Applies when |
|---|---|---|---|---|---|---|---|
| `revenue_growth` | Revenue growth | financial_performance | derived | Derived | % | revenue / last year revenue - 1 |  |
| `ebitda_margin` | EBITDA margin | financial_performance | derived | Derived | % | (EBIT + depreciation and amortisation) / revenue |  |
| `operating_margin` | Operating margin | financial_performance | derived | Derived | % | operating profit (EBIT) / revenue |  |
| `capex_to_revenue` | Capex / revenue | financial_performance | derived | Derived | % | capital expenditure / revenue |  |
| `net_debt_to_ebitda` | Net debt / EBITDA | financial_position | derived | Derived | x (times) | (borrowings + leases - cash) / EBITDA; n/a unless all inputs are known |  |
| `lease_liabilities` | Lease liabilities (IFRS 16) | financial_position | derived | Reported: statement line item | Rs. Mn | current + non-current lease liabilities |  |
| `rooms` | Room inventory | operations | candidate | Reported: typed from the report with a page reference | count |  |  |
| `occupancy_rate` | Occupancy rate | operations | candidate | Reported: typed from the report with a page reference | % |  |  |
| `adr` | Average daily rate (ADR) | operations | candidate | Reported: typed from the report with a page reference | Rs. |  |  |
| `revpar` | RevPAR | operations | candidate | Derived | Rs. | occupancy_rate x ADR, only when both are reported for the same period |  |
| `guest_nights` | Guest nights | operations | candidate | Reported: typed from the report with a page reference | count |  |  |
| `fb_revenue` | Food and beverage revenue | operations | candidate | Reported: typed from the report with a page reference | Rs. Mn |  |  |

Checks:
- **Occupancy**: `occupancy_rate`, level, higher better, watch 0.6, concern 0.45

Valuation: preferred Discounted cash flow (FCFF), EV / EBITDA; conditional Net asset value, Earnings multiple (P/E); not as default -.

## Diversified Financials

Profile `diversified_financials` v1.0.0 · unverified · reference: Senkadagala Finance PLC (Diversified Financials.pdf, Annual Report 2025/26)

Business models: Licensed deposit-taking finance company (lending); Leasing / specialised leasing company (lending); Investment / finance holding company (industrial); Other financial services (broking, advisory, etc.) (industrial).

| Id | Metric | Category | Profile status | Calculation | Unit | Formula / inputs | Applies when |
|---|---|---|---|---|---|---|---|
| `net_interest_income` | Net interest income | income | report_observed | Reported: statement line item | Rs. Mn | statement field `nii` |  |
| `interest_income` | Interest income | income | report_observed | Reported: statement line item | Rs. Mn | statement field `ii` |  |
| `interest_expense` | Interest expense | income | report_observed | Reported: statement line item | Rs. Mn | statement field `ie` |  |
| `total_operating_income` | Total operating income | income | report_observed | Reported: statement line item | Rs. Mn | statement field `toi` |  |
| `gross_loans` | Loans, leases and advances | portfolio | report_observed | Reported: statement line item | Rs. Mn | statement field `loans` |  |
| `loan_growth` | Portfolio growth | portfolio | report_observed | Derived | % |  |  |
| `impairment_charge` | Impairment / expected credit loss charge | asset_quality | report_observed | Reported: statement line item | Rs. Mn | statement field `imp` |  |
| `credit_cost` | Impairment charge / portfolio | asset_quality | candidate | Derived | % |  |  |
| `stage_3_ratio` | Stage 3 / non-performing ratio | asset_quality | candidate | Reported: typed from the report with a page reference | % |  |  |
| `customer_deposits` | Customer deposits | funding | candidate | Reported: statement line item | Rs. Mn | statement field `deps` | Deposit-taking finance companies only. |
| `loan_to_deposit` | Portfolio / deposits | funding | candidate | Derived | % |  |  |
| `cost_to_income` | Cost-to-income ratio | efficiency | candidate | Derived | % |  |  |
| `reported_nim` | Net interest margin (reported) | profitability | candidate | Reported: typed from the report with a page reference | % |  |  |
| `roa` | Return on assets | profitability | report_observed | Derived | % |  |  |
| `roe` | Return on equity | profitability | report_observed | Derived | % |  |  |
| `total_capital_ratio` | Total capital ratio | capital_liquidity | candidate | Reported: typed from the report with a page reference | % |  | Regulated deposit-taking finance companies. |
| `bvps` | Book value per share | shareholder | report_observed | Derived | Rs. per share |  |  |
| `eps` | Earnings per share | shareholder | report_observed | Reported: statement line item | Rs. per share | statement field `eps` |  |
| `branches` | Branch network | non_financial | candidate | Reported: typed from the report with a page reference | count |  |  |
| `customers` | Customer base | non_financial | candidate | Reported: typed from the report with a page reference | count |  |  |

Checks:
- **Portfolio growth**: `loan_growth`, level, higher better, watch 0.05, concern 0
- **Asset quality**: `stage_3_ratio`, level, lower better, watch 0.08, concern 0.15; falls back to `credit_cost`
- **Cost efficiency**: `cost_to_income`, level, lower better, watch 0.5, concern 0.65
- **Funding**: `loan_to_deposit`, level, lower better, watch 1.3, concern 1.6
- **Capital adequacy**: `total_capital_ratio`, level, higher better, watch 0.14, concern 0.125
- **Returns**: `roe`, level, higher better, watch 0.12, concern 0.08
- **Related-party and concentration** (manual review)

Valuation: preferred Price / book, Residual income; conditional Dividend discount, Earnings multiple (P/E); not as default Discounted cash flow (FCFF).

Not used as primary indicators: `current_ratio`, `inventory_days`, `receivable_days_on_financial_receivables`, `fcff_dcf`.

## Energy

Profile `energy` v1.0.0 · unverified · reference: LAUGFS Gas PLC (energy.pdf, Annual Report 2024/25)

Business models: Multi-cluster group (energy, logistics, trading, property) (industrial); LPG / fuel import and distribution (industrial).

| Id | Metric | Category | Profile status | Calculation | Unit | Formula / inputs | Applies when |
|---|---|---|---|---|---|---|---|
| `revenue_growth` | Revenue growth | financial_performance | derived | Derived | % | revenue / last year revenue - 1 |  |
| `gross_margin` | Gross margin | financial_performance | derived | Derived | % | gross profit / revenue |  |
| `operating_margin` | Operating margin | financial_performance | derived | Derived | % | operating profit (EBIT) / revenue |  |
| `ebitda_margin` | EBITDA margin | financial_performance | derived | Derived | % | (EBIT + depreciation and amortisation) / revenue |  |
| `cfo_to_pat` | Operating cash flow / profit after tax | financial_performance | derived | Derived | x (times) | cash from operations / PAT |  |
| `capex_to_revenue` | Capex / revenue | financial_performance | derived | Derived | % | capital expenditure / revenue |  |
| `net_debt_to_ebitda` | Net debt / EBITDA | financial_position | derived | Derived | x (times) | (borrowings + leases - cash) / EBITDA; n/a unless all inputs are known |  |
| `interest_cover` | Interest cover | financial_position | derived | Derived | x (times) | EBIT / finance cost |  |
| `roce` | Return on capital employed | returns | derived | Derived | % | EBIT / (total assets - current liabilities) |  |
| `roe` | Return on equity | returns | derived | Derived | % | PAT / year-end equity |  |
| `inventory_days` | Inventory days | working_capital | derived | Derived | days | inventory / cost of sales x 365 |  |
| `receivable_days` | Receivable days | working_capital | derived | Derived | days | receivables / revenue x 365 |  |
| `payable_days` | Payable days | working_capital | derived | Derived | days | payables / cost of sales x 365 |  |
| `cash_conversion_cycle` | Cash conversion cycle | working_capital | derived | Derived | days | inventory days + receivable days - payable days |  |
| `sales_volume` | Sales / distribution volume | operations | candidate | Reported: typed from the report with a page reference | unit_volume |  |  |
| `storage_capacity` | Storage / terminal capacity | operations | candidate | Reported: typed from the report with a page reference | unit_volume |  |  |
| `fx_exposure_note` | Foreign-currency exposure disclosed (page) | risk | candidate | Reported: typed from the report with a page reference | text |  |  |

Valuation: preferred Discounted cash flow (FCFF), EV / EBITDA; conditional Sum of the parts; not as default -.

## Food & Staples Retailing

Profile `food_staples_retailing` v1.0.0 · unverified · reference: Cargills (Ceylon) PLC (Food & Staples Retailing.pdf, Integrated Annual Report 2025/26)

Business models: Integrated retail, manufacturing and distribution group (industrial); Supermarket / food retailer (industrial).

| Id | Metric | Category | Profile status | Calculation | Unit | Formula / inputs | Applies when |
|---|---|---|---|---|---|---|---|
| `revenue_growth` | Revenue growth | financial_performance | derived | Derived | % | revenue / last year revenue - 1 |  |
| `gross_margin` | Gross margin | financial_performance | derived | Derived | % | gross profit / revenue |  |
| `operating_margin` | Operating margin | financial_performance | derived | Derived | % | operating profit (EBIT) / revenue |  |
| `ebitda_margin` | EBITDA margin | financial_performance | derived | Derived | % | (EBIT + depreciation and amortisation) / revenue |  |
| `cfo_to_pat` | Operating cash flow / profit after tax | financial_performance | derived | Derived | x (times) | cash from operations / PAT |  |
| `capex_to_revenue` | Capex / revenue | financial_performance | derived | Derived | % | capital expenditure / revenue |  |
| `net_debt_to_ebitda` | Net debt / EBITDA | financial_position | derived | Derived | x (times) | (borrowings + leases - cash) / EBITDA; n/a unless all inputs are known |  |
| `interest_cover` | Interest cover | financial_position | derived | Derived | x (times) | EBIT / finance cost |  |
| `roce` | Return on capital employed | returns | derived | Derived | % | EBIT / (total assets - current liabilities) |  |
| `roe` | Return on equity | returns | derived | Derived | % | PAT / year-end equity |  |
| `inventory_days` | Inventory days | working_capital | derived | Derived | days | inventory / cost of sales x 365 |  |
| `receivable_days` | Receivable days | working_capital | derived | Derived | days | receivables / revenue x 365 |  |
| `payable_days` | Payable days | working_capital | derived | Derived | days | payables / cost of sales x 365 |  |
| `cash_conversion_cycle` | Cash conversion cycle | working_capital | derived | Derived | days | inventory days + receivable days - payable days |  |
| `lease_liabilities` | Lease liabilities (IFRS 16) | financial_position | derived | Reported: statement line item | Rs. Mn | current + non-current lease liabilities |  |
| `outlets` | Number of outlets | operations | candidate | Reported: typed from the report with a page reference | count |  |  |
| `same_store_sales_growth` | Same-store sales growth | operations | candidate | Reported: typed from the report with a page reference | % |  |  |

Valuation: preferred Discounted cash flow (FCFF), EV / EBITDA; conditional Sum of the parts, Earnings multiple (P/E); not as default -.

## Food, Beverage & Tobacco

Profile `food_beverage_tobacco` v1.0.0 · unverified · reference: Mahaweli Coconut Plantations PLC (Food, Beverage & Tobacco.pdf, Annual Report 2025/26)

Business models: Plantation company (industrial); Food / beverage manufacturer (industrial); Tobacco (industrial).

| Id | Metric | Category | Profile status | Calculation | Unit | Formula / inputs | Applies when |
|---|---|---|---|---|---|---|---|
| `revenue_growth` | Revenue growth | financial_performance | derived | Derived | % | revenue / last year revenue - 1 |  |
| `gross_margin` | Gross margin | financial_performance | derived | Derived | % | gross profit / revenue |  |
| `operating_margin` | Operating margin | financial_performance | derived | Derived | % | operating profit (EBIT) / revenue |  |
| `cfo_to_pat` | Operating cash flow / profit after tax | financial_performance | derived | Derived | x (times) | cash from operations / PAT |  |
| `capex_to_revenue` | Capex / revenue | financial_performance | derived | Derived | % | capital expenditure / revenue |  |
| `roe` | Return on equity | returns | derived | Derived | % | PAT / year-end equity |  |
| `crop_volume` | Crop / production volume | operations | report_observed | Reported: typed from the report with a page reference | unit_volume |  |  |
| `yield_per_hectare` | Yield per hectare | operations | candidate | Reported: typed from the report with a page reference | unit_volume |  |  |
| `cost_per_unit` | Cost of production per unit | operations | candidate | Reported: typed from the report with a page reference | Rs. |  |  |
| `average_selling_price` | Average selling price | operations | candidate | Reported: typed from the report with a page reference | Rs. |  |  |
| `biological_asset_fv_change` | Biological asset fair-value change | accounting | candidate | Reported: typed from the report with a page reference | Rs. Mn |  |  |

Valuation: preferred Discounted cash flow (FCFF), Net asset value; conditional Earnings multiple (P/E); not as default -.

## Health Care Equipment & Services

Profile `health_care` v1.0.0 · unverified · reference: Asiri Surgical Hospital PLC (Health Care Equipment & Services.pdf, Annual Report 2025/26)

Business models: Hospital operator (industrial); Medical equipment maker / distributor (industrial); Other healthcare services (industrial).

| Id | Metric | Category | Profile status | Calculation | Unit | Formula / inputs | Applies when |
|---|---|---|---|---|---|---|---|
| `revenue_growth` | Revenue growth | financial_performance | derived | Derived | % | revenue / last year revenue - 1 |  |
| `ebitda_margin` | EBITDA margin | financial_performance | derived | Derived | % | (EBIT + depreciation and amortisation) / revenue |  |
| `operating_margin` | Operating margin | financial_performance | derived | Derived | % | operating profit (EBIT) / revenue |  |
| `capex_to_revenue` | Capex / revenue | financial_performance | derived | Derived | % | capital expenditure / revenue |  |
| `receivable_days` | Receivable days | working_capital | derived | Derived | days | receivables / revenue x 365 |  |
| `roce` | Return on capital employed | returns | derived | Derived | % | EBIT / (total assets - current liabilities) |  |
| `net_debt_to_ebitda` | Net debt / EBITDA | financial_position | derived | Derived | x (times) | (borrowings + leases - cash) / EBITDA; n/a unless all inputs are known |  |
| `beds` | Bed capacity | operations | candidate | Reported: typed from the report with a page reference | count |  |  |
| `bed_occupancy` | Bed occupancy | operations | candidate | Reported: typed from the report with a page reference | % |  |  |
| `patient_volumes` | Patient volumes | operations | candidate | Reported: typed from the report with a page reference | count |  |  |
| `procedures` | Surgical / diagnostic procedures | operations | candidate | Reported: typed from the report with a page reference | count |  |  |

Valuation: preferred Discounted cash flow (FCFF), EV / EBITDA; conditional Earnings multiple (P/E); not as default -.

## Household & Personal Products

Profile `household_personal_products` v1.0.0 · unverified · reference: The Swadeshi Industrial Works PLC (Household & Personal Products.pdf, Annual Report 2025/26)

Business models: Manufacturer (industrial); Trader / distributor (industrial).

| Id | Metric | Category | Profile status | Calculation | Unit | Formula / inputs | Applies when |
|---|---|---|---|---|---|---|---|
| `revenue_growth` | Revenue growth | financial_performance | derived | Derived | % | revenue / last year revenue - 1 |  |
| `gross_margin` | Gross margin | financial_performance | derived | Derived | % | gross profit / revenue |  |
| `operating_margin` | Operating margin | financial_performance | derived | Derived | % | operating profit (EBIT) / revenue |  |
| `ebitda_margin` | EBITDA margin | financial_performance | derived | Derived | % | (EBIT + depreciation and amortisation) / revenue |  |
| `cfo_to_pat` | Operating cash flow / profit after tax | financial_performance | derived | Derived | x (times) | cash from operations / PAT |  |
| `capex_to_revenue` | Capex / revenue | financial_performance | derived | Derived | % | capital expenditure / revenue |  |
| `net_debt_to_ebitda` | Net debt / EBITDA | financial_position | derived | Derived | x (times) | (borrowings + leases - cash) / EBITDA; n/a unless all inputs are known |  |
| `interest_cover` | Interest cover | financial_position | derived | Derived | x (times) | EBIT / finance cost |  |
| `roce` | Return on capital employed | returns | derived | Derived | % | EBIT / (total assets - current liabilities) |  |
| `roe` | Return on equity | returns | derived | Derived | % | PAT / year-end equity |  |
| `inventory_days` | Inventory days | working_capital | derived | Derived | days | inventory / cost of sales x 365 |  |
| `receivable_days` | Receivable days | working_capital | derived | Derived | days | receivables / revenue x 365 |  |
| `payable_days` | Payable days | working_capital | derived | Derived | days | payables / cost of sales x 365 |  |
| `cash_conversion_cycle` | Cash conversion cycle | working_capital | derived | Derived | days | inventory days + receivable days - payable days |  |
| `capacity_utilisation` | Capacity utilisation | operations | candidate | Reported: typed from the report with a page reference | % |  |  |
| `export_share` | Export share | segments | candidate | Reported: typed from the report with a page reference | % |  |  |

Valuation: preferred Discounted cash flow (FCFF), EV / EBITDA; conditional Earnings multiple (P/E); not as default -.

## Insurance

Profile `insurance` v1.0.0 · unverified · reference: HNB Assurance PLC (Insurance.pdf, Annual Report)

Business models: Composite (life and general) insurer (insurer); Life insurer (insurer); General (non-life) insurer (insurer); Insurance holding company (insurer).

| Id | Metric | Category | Profile status | Calculation | Unit | Formula / inputs | Applies when |
|---|---|---|---|---|---|---|---|
| `gross_written_premium` | Gross written premium | premium | report_observed | Reported: typed from the report with a page reference | Rs. Mn |  |  |
| `life_gwp` | Life gross written premium | premium | candidate | Reported: typed from the report with a page reference | Rs. Mn |  |  |
| `general_gwp` | General gross written premium | premium | candidate | Reported: typed from the report with a page reference | Rs. Mn |  |  |
| `insurance_revenue` | Insurance revenue | insurance_result | report_observed | Reported: statement line item | Rs. Mn | statement field `irev` |  |
| `insurance_revenue_growth` | Insurance revenue growth | insurance_result | report_observed | Derived | % |  |  |
| `insurance_service_result` | Insurance service result | insurance_result | report_observed | Reported: statement line item | Rs. Mn | statement field `isr` |  |
| `insurance_service_margin` | Insurance service result / insurance revenue | insurance_result | candidate | Derived | % |  |  |
| `net_reinsurance_result` | Net result from reinsurance held | insurance_result | candidate | Reported: statement line item | Rs. Mn | statement field `reins` |  |
| `combined_ratio` | Combined ratio (SLFRS 17 basis) | insurance_result | candidate | Derived | % | (insurance service expenses - net reinsurance result) / insurance revenue | General insurance only, when insurance service expenses and reinsurance result are both available. |
| `investment_income` | Investment income | investments | report_observed | Reported: statement line item | Rs. Mn | statement field `inv` |  |
| `insurance_finance_result` | Net insurance finance income / expense | investments | candidate | Reported: statement line item | Rs. Mn | statement field `ifin` |  |
| `investment_yield` | Investment yield | investments | candidate | Reported: typed from the report with a page reference | % |  |  |
| `insurance_contract_liabilities` | Insurance contract liabilities | balance_sheet | report_observed | Reported: statement line item | Rs. Mn | statement field `icl` |  |
| `life_fund` | Life insurance fund | balance_sheet | report_observed | Reported: typed from the report with a page reference | Rs. Mn |  |  |
| `ibnr_reserve` | IBNR / IBNER reserves | balance_sheet | report_observed | Reported: typed from the report with a page reference | Rs. Mn |  |  |
| `solvency_life` | Risk-based capital adequacy ratio - life | capital | report_observed | Reported: typed from the report with a page reference | % |  |  |
| `solvency_general` | Risk-based capital adequacy ratio - general | capital | candidate | Reported: typed from the report with a page reference | % |  |  |
| `roe` | Return on equity | profitability | report_observed | Derived | % |  |  |
| `roa` | Return on assets | profitability | report_observed | Derived | % |  |  |
| `bvps` | Book value per share | shareholder | report_observed | Derived | Rs. per share |  |  |
| `eps` | Earnings per share | shareholder | report_observed | Reported: statement line item | Rs. per share | statement field `eps` |  |

Checks:
- **Insurance revenue growth**: `insurance_revenue_growth`, level, higher better, watch 0.05, concern 0
- **Insurance service result**: `insurance_service_margin`, level, higher better, watch 0.08, concern 0
- **Investment contribution**: `investment_income`, growth, higher better, watch 0, concern -0.1
- **Solvency**: `solvency_life`, level, higher better, watch 1.6, concern 1.2; falls back to `solvency_general`
- **Returns**: `roe`, level, higher better, watch 0.12, concern 0.08
- **Reserving and actuarial assumptions** (manual review)

Valuation: preferred Price / book, Residual income; conditional Dividend discount, Earnings multiple (P/E); not as default Discounted cash flow (FCFF).

Not used as primary indicators: `current_ratio`, `inventory_days`, `net_debt_to_ebitda`, `fcff_dcf`, `gwp_as_insurance_revenue`.

## Materials

Profile `materials` v1.0.0 · unverified · reference: AgStar PLC (materials.pdf, Annual Report 2025/26 (with errata letter))

Business models: Agricultural inputs (fertiliser, crop care, seeds, machinery) (industrial); Chemicals manufacturer (industrial); Construction materials (industrial); Packaging / paper (industrial).

| Id | Metric | Category | Profile status | Calculation | Unit | Formula / inputs | Applies when |
|---|---|---|---|---|---|---|---|
| `revenue_growth` | Revenue growth | financial_performance | derived | Derived | % | revenue / last year revenue - 1 |  |
| `gross_margin` | Gross margin | financial_performance | derived | Derived | % | gross profit / revenue |  |
| `operating_margin` | Operating margin | financial_performance | derived | Derived | % | operating profit (EBIT) / revenue |  |
| `ebitda_margin` | EBITDA margin | financial_performance | derived | Derived | % | (EBIT + depreciation and amortisation) / revenue |  |
| `cfo_to_pat` | Operating cash flow / profit after tax | financial_performance | derived | Derived | x (times) | cash from operations / PAT |  |
| `capex_to_revenue` | Capex / revenue | financial_performance | derived | Derived | % | capital expenditure / revenue |  |
| `net_debt_to_ebitda` | Net debt / EBITDA | financial_position | derived | Derived | x (times) | (borrowings + leases - cash) / EBITDA; n/a unless all inputs are known |  |
| `interest_cover` | Interest cover | financial_position | derived | Derived | x (times) | EBIT / finance cost |  |
| `roce` | Return on capital employed | returns | derived | Derived | % | EBIT / (total assets - current liabilities) |  |
| `roe` | Return on equity | returns | derived | Derived | % | PAT / year-end equity |  |
| `inventory_days` | Inventory days | working_capital | derived | Derived | days | inventory / cost of sales x 365 |  |
| `receivable_days` | Receivable days | working_capital | derived | Derived | days | receivables / revenue x 365 |  |
| `payable_days` | Payable days | working_capital | derived | Derived | days | payables / cost of sales x 365 |  |
| `cash_conversion_cycle` | Cash conversion cycle | working_capital | derived | Derived | days | inventory days + receivable days - payable days |  |
| `discontinued_result` | Profit / loss from discontinued operations | accounting | candidate | Reported: typed from the report with a page reference | Rs. Mn |  |  |

Valuation: preferred Discounted cash flow (FCFF), EV / EBITDA; conditional Earnings multiple (P/E), Price / book; not as default -.

## Real Estate Management & Development

Profile `real_estate` v1.0.0 · unverified · reference: Commercial Development Company PLC (Real Estate Management&Development.pdf, Annual Report)

Business models: Property investment and leasing (industrial); Property developer (industrial); Property management / facilities services (industrial); Mixed property business (industrial).

| Id | Metric | Category | Profile status | Calculation | Unit | Formula / inputs | Applies when |
|---|---|---|---|---|---|---|---|
| `revenue_growth` | Revenue growth | financial_performance | derived | Derived | % | revenue / last year revenue - 1 |  |
| `operating_margin` | Operating margin | financial_performance | derived | Derived | % | operating profit (EBIT) / revenue |  |
| `cfo_to_pat` | Operating cash flow / profit after tax | financial_performance | derived | Derived | x (times) | cash from operations / PAT |  |
| `net_debt_to_ebitda` | Net debt / EBITDA | financial_position | derived | Derived | x (times) | (borrowings + leases - cash) / EBITDA; n/a unless all inputs are known |  |
| `nav_per_share` | Net assets per share | shareholder | derived | Derived | Rs. per share | total equity / shares (shares = PAT / EPS) |  |
| `investment_property` | Investment property (carrying value) | property | candidate | Reported: typed from the report with a page reference | Rs. Mn |  |  |
| `fair_value_gain` | Fair-value gain on investment property | property | candidate | Reported: typed from the report with a page reference | Rs. Mn |  |  |
| `rental_income` | Rental income | property | candidate | Reported: typed from the report with a page reference | Rs. Mn |  |  |
| `lettable_area` | Lettable area | property | candidate | Reported: typed from the report with a page reference | area |  |  |
| `occupancy_rate` | Occupancy | property | candidate | Reported: typed from the report with a page reference | % |  |  |

Valuation: preferred Net asset value; conditional Adjusted NAV (property at market value), Discounted cash flow (FCFF), Price / book; not as default DCF without property-level data.

## Retailing

Profile `retailing` v1.0.0 · unverified · reference: Diesel & Motor Engineering PLC (DIMO) - confirm from the PDF cover (Retailing.pdf, Annual Report)

Business models: Diversified distribution and retail group (industrial); Automobile dealer / distributor (industrial); Single-format retailer (industrial).

| Id | Metric | Category | Profile status | Calculation | Unit | Formula / inputs | Applies when |
|---|---|---|---|---|---|---|---|
| `revenue_growth` | Revenue growth | financial_performance | derived | Derived | % | revenue / last year revenue - 1 |  |
| `gross_margin` | Gross margin | financial_performance | derived | Derived | % | gross profit / revenue |  |
| `operating_margin` | Operating margin | financial_performance | derived | Derived | % | operating profit (EBIT) / revenue |  |
| `ebitda_margin` | EBITDA margin | financial_performance | derived | Derived | % | (EBIT + depreciation and amortisation) / revenue |  |
| `cfo_to_pat` | Operating cash flow / profit after tax | financial_performance | derived | Derived | x (times) | cash from operations / PAT |  |
| `capex_to_revenue` | Capex / revenue | financial_performance | derived | Derived | % | capital expenditure / revenue |  |
| `net_debt_to_ebitda` | Net debt / EBITDA | financial_position | derived | Derived | x (times) | (borrowings + leases - cash) / EBITDA; n/a unless all inputs are known |  |
| `interest_cover` | Interest cover | financial_position | derived | Derived | x (times) | EBIT / finance cost |  |
| `roce` | Return on capital employed | returns | derived | Derived | % | EBIT / (total assets - current liabilities) |  |
| `roe` | Return on equity | returns | derived | Derived | % | PAT / year-end equity |  |
| `inventory_days` | Inventory days | working_capital | derived | Derived | days | inventory / cost of sales x 365 |  |
| `receivable_days` | Receivable days | working_capital | derived | Derived | days | receivables / revenue x 365 |  |
| `payable_days` | Payable days | working_capital | derived | Derived | days | payables / cost of sales x 365 |  |
| `cash_conversion_cycle` | Cash conversion cycle | working_capital | derived | Derived | days | inventory days + receivable days - payable days |  |
| `lease_liabilities` | Lease liabilities (IFRS 16) | financial_position | derived | Reported: statement line item | Rs. Mn | current + non-current lease liabilities |  |
| `unit_sales` | Unit sales volume | operations | candidate | Reported: typed from the report with a page reference | count |  |  |
| `service_network` | Branch / dealer / service network | operations | candidate | Reported: typed from the report with a page reference | count |  |  |

Valuation: preferred Discounted cash flow (FCFF), EV / EBITDA; conditional Sum of the parts, Earnings multiple (P/E); not as default -.

## Telecommunication Services

Profile `telecommunication_services` v1.0.0 · unverified · reference: Dialog Axiata PLC (Telecommunication Services.pdf, Annual Report)

Business models: Integrated operator (mobile, fixed, broadband, enterprise) (industrial); Mobile operator (industrial); Fixed / broadband operator (industrial).

| Id | Metric | Category | Profile status | Calculation | Unit | Formula / inputs | Applies when |
|---|---|---|---|---|---|---|---|
| `revenue_growth` | Revenue growth | financial_performance | derived | Derived | % | revenue / last year revenue - 1 |  |
| `ebitda_margin` | EBITDA margin | financial_performance | derived | Derived | % | (EBIT + depreciation and amortisation) / revenue |  |
| `capex_to_revenue` | Capex / revenue | financial_performance | derived | Derived | % | capital expenditure / revenue |  |
| `net_debt_to_ebitda` | Net debt / EBITDA | financial_position | derived | Derived | x (times) | (borrowings + leases - cash) / EBITDA; n/a unless all inputs are known |  |
| `lease_liabilities` | Lease liabilities (IFRS 16) | financial_position | derived | Reported: statement line item | Rs. Mn | current + non-current lease liabilities |  |
| `cfo_to_pat` | Operating cash flow / profit after tax | financial_performance | derived | Derived | x (times) | cash from operations / PAT |  |
| `subscribers` | Subscribers / connections | operations | report_observed | Reported: typed from the report with a page reference | count |  |  |
| `arpu` | ARPU | operations | candidate | Reported: typed from the report with a page reference | Rs. |  |  |
| `churn` | Churn | operations | candidate | Reported: typed from the report with a page reference | % |  |  |
| `data_traffic` | Data traffic | operations | candidate | Reported: typed from the report with a page reference | unit_volume |  |  |

Checks:
- **Capex intensity**: `capex_to_revenue`, level, lower better, watch 0.25, concern 0.35

Valuation: preferred Discounted cash flow (FCFF), EV / EBITDA; conditional Earnings multiple (P/E); not as default -.

## Transportation

Profile `transportation` v1.0.0 · unverified · reference: Mercantile Shipping Company PLC (transportation.pdf, Annual Report 2025/26)

Business models: Active shipping / logistics / transport operator (industrial); Exited transport operations (investment / rental income) (industrial).

| Id | Metric | Category | Profile status | Calculation | Unit | Formula / inputs | Applies when |
|---|---|---|---|---|---|---|---|
| `revenue_growth` | Revenue growth | financial_performance | derived | Derived | % | revenue / last year revenue - 1 |  |
| `operating_margin` | Operating margin | financial_performance | derived | Derived | % | operating profit (EBIT) / revenue |  |
| `cfo_to_pat` | Operating cash flow / profit after tax | financial_performance | derived | Derived | x (times) | cash from operations / PAT |  |
| `nav_per_share` | Net assets per share | shareholder | derived | Derived | Rs. per share | total equity / shares (shares = PAT / EPS) |  |
| `fleet_size` | Fleet / vessel count | operations | candidate | Reported: typed from the report with a page reference | count |  | Active operators only. |
| `cargo_volume` | Cargo / tonnage handled | operations | candidate | Reported: typed from the report with a page reference | unit_volume |  | Active operators only. |
| `rental_income` | Rental income from investment property | current_activities | candidate | Reported: typed from the report with a page reference | Rs. Mn |  |  |
| `investment_income` | Investment / deposit income | current_activities | candidate | Reported: typed from the report with a page reference | Rs. Mn |  |  |

Checks:
- **Going concern by entity** (manual review)

Valuation: preferred Discounted cash flow (FCFF), Net asset value; conditional EV / EBITDA; not as default -.

## Utilities

Profile `utilities` v1.0.0 · unverified · reference: Vidullanka PLC (Utilities.pdf, Annual Report)

Business models: Independent power producer (renewable) (industrial); Regulated network utility (industrial); Water / other utility (industrial).

| Id | Metric | Category | Profile status | Calculation | Unit | Formula / inputs | Applies when |
|---|---|---|---|---|---|---|---|
| `revenue_growth` | Revenue growth | financial_performance | derived | Derived | % | revenue / last year revenue - 1 |  |
| `ebitda_margin` | EBITDA margin | financial_performance | derived | Derived | % | (EBIT + depreciation and amortisation) / revenue |  |
| `capex_to_revenue` | Capex / revenue | financial_performance | derived | Derived | % | capital expenditure / revenue |  |
| `net_debt_to_ebitda` | Net debt / EBITDA | financial_position | derived | Derived | x (times) | (borrowings + leases - cash) / EBITDA; n/a unless all inputs are known |  |
| `interest_cover` | Interest cover | financial_position | derived | Derived | x (times) | EBIT / finance cost |  |
| `cfo_to_pat` | Operating cash flow / profit after tax | financial_performance | derived | Derived | x (times) | cash from operations / PAT |  |
| `installed_capacity_mw` | Installed capacity | operations | report_observed | Reported: typed from the report with a page reference | MW |  |  |
| `generation_gwh` | Electricity generated | operations | report_observed | Reported: typed from the report with a page reference | GWh |  |  |
| `plant_availability` | Plant availability | operations | candidate | Reported: typed from the report with a page reference | % |  |  |
| `capacity_factor` | Capacity factor | operations | candidate | Derived | % | generation_gwh x 1,000 / (installed_capacity_mw x 8,760) | Only when generation and installed capacity cover the same full year. |

Checks:
- **Capacity factor**: `capacity_factor`, level, higher better, watch 0.35, concern 0.2

Valuation: preferred Discounted cash flow (FCFF); conditional EV / EBITDA, Sum of the parts; not as default -.
