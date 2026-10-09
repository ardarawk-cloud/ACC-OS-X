# NADMO FINANCE — IMPLEMENTATION HANDOFF / BUILD DASHBOARD NOW
Issued: 2026-10-09
Priority: BUILD AND DELIVER; NOT A BRAINSTORM OR A REQUEST FOR OWNER SETUP.
Authority: PT NADMO Studio Indonesia owner direction in PERSONAL/NADMO LIVE conversation.
Scope: FINANCE department ONLY. Do not work on or alter NADMO LIVE Android APK, WebRTC, mobile UI, or streaming backend. Separate finance deployment / access and finance workflow.

## Owner's directive
"Masukin di handoff finance lah biar dia langsung bikin.. Aq terima hasil ya jng aq di suru setting2 github cloudeflare biar kita dsni fokus ke apk nadmo live aja."

Interpretation: Finance is responsible for end-to-end delivery of the finance dashboard, including necessary research in existing finance conversation/project, GitHub engineering, Cloudflare config/deployment (through available connectors/credentials), test, and finished handover. Owner wants only functional result and a short QC confirmation, not a multi-step GitHub/Cloudflare tutorial or setup chores. Reuse existing finance code/data if any; do NOT destroy history. If credentials, permissions or ownership are genuinely unavailable, clearly state the blocker and exactly which one-time approval is needed. Never claim automation/independent background work without a real executor.

## Target product
NADMO FINANCE: a private, mobile-first and PC-capable management dashboard for PT NADMO Studio Indonesia.
Proposed domain: https://finance.nadmo.id (NOT assumed active). Prefer existing company domain infrastructure where possible. Confirm DNS, TLS and actual deployment before announcing LIVE. Fallback verified deployment URL is acceptable as initial handover.

## Accounting structure
Central entity: PT NADMO Studio Indonesia (already established legally; NIB and tax registration on file; do not display NPWP, national identity numbers or tax portal secrets in UI or repo).
Tags for each transaction:
- BWD: Bali Wedding DJ — DJ/wedding/event/entertainment services.
- NLV: NADMO LIVE — FUTURE platform commissions, approved paid digital services, verified tips/private-room fees only after real payment processing.
- NDS: NADMO Studio — apps, websites, IT, media, creative services.
- OTH: other PT business units once approved.
A single PT-level financial ledger with independent units, not mislabeled or mixed unit revenues.
The accounting/tax summary can aggregate the same legal entity while the underlying records preserve their true originating units and invoice descriptions.
Never present platform turnover, users' tip liabilities, payment gateway fees, or creator payouts incorrectly as all belonging to the company's own revenue. Proper principal/agent and tax recognition to be confirmed with accountant.
Do not invent any actual payments, employee costs, bank statements or tax liabilities.

## Dashboard MVP — MUST BUILD
1. **Overview:** total verified receipts, expenses, operating net, A/R unpaid invoices, A/P/payables (including creators when relevant), bank/cash balance where reconciled, taxes due/estimated status, selectable period (month/quarter/year/custom), comparison vs previous period.
2. **Unit breakdown:** BWD / NLV / NDS / OTH cards and charts, totals reconciling exactly to group figures; searchable/filterable drill-down by unit/date/status/payment method/counterparty.
3. **Transactions:** ledger CRUD with owner-only edits, type, date/time in Asia/Makassar, IDR numeric amounts, category, business unit, description, counterpart, evidence URL/file reference, invoice/ref ID, status draft/verified/void, journal/audit event. No hard deletion of posted ledger; use correction/reversal trail.
4. **Invoices & receivables:** sales invoice records, invoice number, customer, unit, issue date, due date, line items, status unpaid/partially paid/paid/void, client-facing invoice PDF/print export when safe.
5. **Expense and liability:** bills/receipts, expense categories, recurring and occasional costs, creator payout obligations separated from platform commission.
6. **Imports/exports:** CSV transaction import and template download, validation / duplicate preview / confirmation (no silent live bank sync). Export filtered CSV and Excel/PDF reports if tooling permits.
7. **Reports:** per-unit and consolidated cash flow, income/expense, tax preparation worksheet, downloadable period reports; labeled *management / accounting preparation*, not an automatic final SPT.
8. **Access control:** private login only; owner role and scoped accountant/bookkeeper read/edit permissions. MFA if supported, no public dashboard, protect personally identifiable documents, avoid raw bank credentials in browser storage.
9. **Quality:** mobile view usable at ~390px; desktop view at 1280px+, real IDR formatting, Asia/Makassar dates, loading/empty/error states, no placeholder transactions counted as company money. Demo data must be clearly marked TEST/DEMO and excluded from real totals.
10. **Audit & backup:** immutable log of edits and approvals, encrypted backup schedule and tested restore, server-side authorization on all endpoints, retention/secret-management.

## Finance semantics / warnings
- Revenue classification based on actual business event; user specifically wants no misreporting/false attribution such as recording NADMO LIVE platform fees as Bali Wedding DJ booking fees.
- Tax reporting through one company per applicable rules; no need to put marketing app name in every optional label, but fulfill mandatory tax/sector disclosures accurately.
- Separate *gross funds processed for creators*, *creator liabilities*, *payment gateway fees*, and *company net fee* where contract requires.
- NADMO LIVE currently only has SIMULATED tip amounts and private prices. They are NOT revenue and must remain 0 / "Not integrated" until gateway is operational, authenticated and connected.
- Any direct payments not reconciled to evidence stay DRAFT, never shown as verified actuals.

## Delivery and ownership
Finance conversation/project owner is the implementation lead. This handoff is independent of the NADMO LIVE streaming task. Locate and reuse existing finance materials before new development.
Build an isolated codebase/project or namespaced module without touching active ACC OS X / Android streaming branches; use existing developer connectors to perform permitted implementation tasks.
Owner should receive ONLY:
- verified working dashboard URL,
- access instructions (secure channel, NEVER print passwords or API secrets),
- concise description of working modules and accurate finance data status,
- evidence of deploy/runtime QA and remaining blockers, if any.
Do NOT ask owner to configure GitHub, Cloudflare, DNS, run CLI commands or paste secrets unless connector permission truly cannot perform the necessary action. Do not claim LIVE until URL and login are verified.

## Acceptance test
A. Zero-data account shows Rp0 / empty; no invented Rp48.5m examples on production screen.
B. Create BWD invoice and reconcile verified paid transaction; BWD and company totals reconcile.
C. Create NDS expense and verify it appears under correct cost unit and consolidated totals.
D. NLV shows no real payment before payment gateway; adding a simulated tip does not add revenue.
E. Drill-down, date filters, IDR totals, PDF/CSV, mobile/desktop all functional.
F. Owner / bookkeeper authorization prevents public or unauthorized data access; full audit on mutations.
G. Dashboard deploys on verified HTTPS domain and survives reload; run backup/restore QC.
H. Deliver outcome to FINANCE context; main NADMO LIVE chat remains focused on APK and streaming features.

## Communication
Treat this as a dispatch/work order, not merely a notes summary. Implementation starts in the FINANCE owner conversation or corresponding connected development workflow once that context executes this handoff. This file and linked GitHub issue do not by themselves start a separate ChatGPT chat or background worker; do not assert that they do.
