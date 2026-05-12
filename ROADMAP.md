# Roadmap

> A living document. Pull requests welcome on every item. If something on this list looks wrong or your priority differs, open an issue or edit this file directly — better-informed contributors should keep it honest.

This page lists the work we know about, sorted by priority. The detailed *mapping* between the official ANAF D212 specification and the app lives in [`docs/d212-mapping.md`](docs/d212-mapping.md); the deep dive on every Cod fiscal article and Instructiuni paragraph behind each computation will live in the "Rules & References" page (see P2 below) once it ships.

---

## How to read this list

| Column | Meaning |
|---|---|
| **Impact** | 🔴 High (real money / correctness) · 🟡 Med (quality of life or D212 compliance) · 🟢 Low |
| **Effort** | 🟢 Low (single PR, < 1 day) · 🟡 Med (3-7 commits) · 🔴 High (multi-PR, design + tests) |
| **Status** | `open` · `claimed by @user` · `in review` · `done (commit XXXXXXX)` |

## How to claim a task

1. Open an issue titled `[Roadmap] <task title>` and reference the section below (`#d-1` etc.)
2. Edit this file: change `open` to `claimed by @yourhandle, issue #N`
3. Submit a PR with the implementation. Include tests where the task touches `lib/`, `server.js` or `public/js/app.js`.

## How to propose a new item

Open an issue titled `[Roadmap proposal] <short description>`. Include:

- **Why** it matters (audit trail to a Cod fiscal article, a real-money scenario, or a UX pain point)
- **Acceptance criteria** (what "done" looks like in one paragraph)
- A guess at impact / effort
- Optional: a `pierde` flag if it blocks something you're trying to do now

The maintainers will add accepted proposals to this file as part of merging the issue.

---

## 🚀 Recently shipped (since v1.5.x)

These are documented for context — they are NOT pending. See `docs/d212-mapping.md` for the up-to-date compliance picture.

| What | Commit | Why it matters |
|---|---|---|
| BT Trade added to Romanian broker list | `bc16d66` | Real ask from a user with a BT Trade account |
| Romania EUR/USD income support (dividends, interest, capital gains) | `52a2908` | XTB and similar brokers can report income in any of the three currencies |
| XTB report parsers — multi-row, multi-currency | `6e9ff82` | Old parser captured only the first country row; users with multiple countries (e.g. Irlanda + USA) were silently losing data |
| Capital gains use `net = max(0, gain - loss)` per long/short bucket | `c501d3c` | Surfaces current-year carryforward losses correctly |
| **Refund detection** — Romanian broker over-withholding | `65cdcaa` | 🔴 Real money. The user's 2025 sample had ~1,644 RON refundable that was previously hidden behind `Math.max(0, ...)` |
| **Prior-year capital losses applied to current tax** (D212 Rd.5-6) | `255dcca` | 🔴 Real money. `yd.priorLosses` was collected but never used in the computation. Implements the official `min(Rd.5, 0.70 × Rd.3)` formula from Instr. 7.3.3 |
| Import / manual override warning with side-by-side diff dialog | `46b9705` | Prevents accidental data loss when re-importing |
| Anonymized XTB PDF fixtures + 35 unit/e2e tests | `7c45c60` + `03e467a` | First test suite in the project. `node:test`, zero new deps |
| Comprehensive D212 mapping document | `c1f46e3` + `29a5609` | Single source of truth for what the app does vs. what ANAF expects |
| Official ANAF reference documents in repo (`docs/anaf/d212-2025/`) | `a5c33f7` | XSD, schematron rules, instructions PDF — versioned, diff-able on future ANAF releases |

---

## 📋 Next up — D212 compliance gaps

Numbered to match [`docs/d212-mapping.md` § 9](docs/d212-mapping.md#9-gap-analysis--recommendations).

### D-3 — Per-country, per-category grouping in cap14 generation 🟡 Med · 🟡 Med · `open`

ANAF expects one `cap14` row per (country × income category). Today we lump everything under "US" in the computation when the user has multiple foreign sources.

- **What to do:** restructure the "Adăugă Date" tab around an array of cap14-like rows: country dropdown + category dropdown (`str_categ_venit` codes) + amounts. Drop the implicit "all foreign = US" assumption.
- **Acceptance:** a user with US dividends + EU dividends sees two rows; computed totals match the manual sum; tests cover the multi-country case.
- **Touches:** `public/index.html` (form), `public/js/app.js` (compute + render), `lib/` (no changes expected), `test/`.

### D-4 — Emit `str_categ_venit` codes beyond 2012/2018 🟡 Med · 🟢 Low · `open`

Parsers hardcode `2012` (capital gains) and `2018` (dividends). For interest, royalties, etc., no code is set. Needed for D-7 (XML export).

- **What to do:** decode the labels for the 19 valid codes (in `docs/anaf/d212-2025/d212_docTehnica_v1.0.8_17042026.xls`, sheet "Nomenclator_venituri_STR") and add a `CATEG_VENIT_LABELS` constant in `lib/rates.js`. Wire it into the cap14 row UI from D-3.
- **Acceptance:** dropdown in the cap14 row shows all 19 categories with Romanian labels; parsers tag interest with the correct code; tests assert correct code emission per income type.

### D-5 — Split loss carryforward foreign vs. RO 🟡 Med · 🟡 Med · `open`

Per Cod fiscal art. 119 and Instr. 7.3.3: losses can only offset gains "of the same nature". Today `yd.priorLosses` is one number applied to RO gains only. Foreign losses need their own pool.

- **What to do:** add `yd.priorLossesForeign` input alongside `priorLosses` (renamed to `priorLossesRO` for clarity). Apply each pool to its own gains bucket. Update i18n, populateForm, and computeYearData.
- **Acceptance:** Income Details shows both pools and their applied amounts; tests cover the foreign-only and split cases.

### D-6 — Romanian-source investment income declared on cap11 🔴 High · 🟡 Med · `open`

XTB/Tradeville/BT Trade withhold tax at source ("impozit final"), but the income still counts toward the CASS base and must be declared on cap11 (with `impozit_retinut` set). Today the app skips cap11 entirely for these users.

- **What to do:** generate a cap11 entry per Romanian-source income category. Mark `impozit_retinut` to claim credit for what the broker withheld. The refund flow we shipped already computes the right number — D-6 makes it visible on the generated D212.
- **Acceptance:** a user with XTB-only income sees a cap11 placeholder row in the generated D212 summary (D-7) with the correct `venit_brut`, `pierdere_compensata`, `impozit_retinut` values.

### D-7 — D212 XML export 🔴 High · 🔴 High · `open`

Emit a partial XML conforming to `docs/anaf/d212-2025/D212.xsd` that the user can import directly into the official ANAF PDF tool.

- **What to do:** new "Export D212 XML" button. Build the XML in-browser (string assembly is fine — no need for a heavy XML library). Validate client-side against the XSD (fetch `D212.xsd` and use `xsd-schema-validator` or roll a minimal validator). Save as `D212-{year}.xml`.
- **Dependencies:** D-3 and D-4 first (need per-country, per-category data structure and proper codes).
- **Acceptance:** the generated XML imports cleanly into the official ANAF tool with no validation errors; the user only fills in the personal data (CNP, name, IBAN) ANAF-side.

### D-8 — Optional personal data step 🟢 Low · 🟢 Low · `open`

We deliberately do not collect CNP / full name / IBAN. To make D-7 truly end-to-end, add an *optional* tab where the user enters them. Stored locally only, gitignored, and never displayed except on the export.

- **Acceptance:** a clear opt-in toggle; data lives in the local SQLite db; exports include it only if the user filled it in.

---

## 📋 Next up — Platform & DX

Numbered to match [`docs/d212-mapping.md` § 10](docs/d212-mapping.md#10-platform--dx-gaps-non-d212-but-tracked-here).

### P1 — Loading splash before dashboard 🟡 Med · 🟢 Low · `open`

Browser opens to a blank page for several seconds while Node boots. Static `loading.html` (CSS-only spinner + brand) served before the SPA bootstraps, or an inline overlay until `loadAllData()` resolves.

- **Acceptance:** zero new dependencies; works in both portable (`Start.bat`) and dev (`npm start`) modes.

### P2 — "Rules & References" page for accountants 🔴 High · 🟡 Med · `open` (unblocked by P5 ✅)

A single page that lets a Romanian fiscal accountant verify every computation by reading one document: which Cod fiscal article justifies the rate, which D212 instruction paragraph defines the formula, which BNR series provides the exchange rate, which CASS tier applies and why. Plus a "Submit a rule we missed" channel pointing at a GitHub issue template.

- **Structure example:**
  - Per income type → applicable law citation → formula → code citation (`server.js:LINE`, `app.js:LINE`)
- **Acceptance:** every formula in `computeYearData` and every parser branch has a corresponding entry; a Romanian accountant can read the page top-to-bottom and identify at least one missing rule we should add.

### P3 — ANAF audit-package zip export 🔴 High · 🟡 Med · `open` (depends on P2)

Defensive bundle for ANAF inquiries: zip containing every broker raw statement, the parsed structured data, the per-category computed values with formulas inline, the BNR rates used for FX, and (once P2 ships) a snapshot of the methodology page.

- **Filename pattern:** `D212-audit-pack-{year}-{YYYYMMDD}.zip`
- **Acceptance:** opening the zip and following the included README lets a third party (an accountant, an ANAF inspector) reproduce every number on the user's D212.

### P4 — Claude/AI skill for the core tax engine 🟢 Low · 🟢 Low · `open`

Create `.github/skills/anaf-tax-engine/SKILL.md` with frontmatter scoping AI changes to `lib/rates.js`, `lib/parsers/*`, `computeYearData` and helpers in `public/js/app.js`, and the related test files. Guardrails: "do not touch UI styling", "do not touch portable build", "do not modify db.js schema without explicit confirmation".

- **Acceptance:** running an AI coding session with the skill loaded keeps proposed changes within the listed paths and produces a passing `npm test`.

---

## 💡 Ideas (open for discussion)

These are not formally planned. Open a `[Roadmap proposal]` issue if you want to upgrade one to **Next up**.

- **Schematron validators in JS.** Implement a subset of the `BR-D212-*` rules from `docs/anaf/d212-2025/business/*.sch` so the user gets a clear list of warnings before D-7 export. Medium effort.
- **Bonificație detection.** Most years the government issues an ordinance for an early-payment discount (e.g. 3% off if you pay by 25.05). The app currently ignores this. When an OUG comes out, add a flag.
- **CHEN exception decision tree.** Some users qualify for exceptions (CASS scutire pentru persoane cu handicap, double-tax-treaty scutire, etc.). Today these are silent overrides. A small dialog asking "do any of these apply to you?" with the right code emission would help.
- **Multi-user / multi-CNP support.** Today the app assumes one fiscal person. A family running it on one machine would have to fork data folders. A dropdown for "active profile" + per-profile SQLite would help.
- **Comparator pre/post-treaty.** For US-source income, show a side-by-side "with treaty" vs "without treaty" tax calculation so the user understands what the certificate of residence is buying them.

---

## ⏳ Currently in progress

Nothing actively in flight. The active branch (`feature/eur-usd-support-and-tests`, after rename) has the items under "Recently shipped" above.

---

## 🗂️ Status snapshot

Generated periodically from the SQL tracking the maintainers use internally. Update by running `npm run roadmap:sync` (TODO: wire this up — see proposal in P4-related discussion).

| Tier | Open | Done |
|---|---:|---:|
| D212 compliance | 5 (D-3, D-4, D-5, D-6, D-7, D-8 except 2 already done) | 2 (D-1 refund, D-2 prior losses) |
| Platform & DX | 4 (P1, P2, P3, P4) | 1 (P5) |
| **Total** | **9** | **3** |
