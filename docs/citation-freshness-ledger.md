# Citation freshness ledger

> Implementation status: created by spec-v22 §5 (Citation Integrity II),
> 2026-06-05. Populates the v19 §3.3 freshness ledger so "we forgot to check
> this one" is structurally impossible.

This ledger lists every tracked source in
[../scripts/sources-cycle.json](../scripts/sources-cycle.json) with the edition
the site bundles, the current published edition, the date the row was last
verified, and a status. `scripts/check-citation-freshness.mjs` fails if any
tracked source `id` is missing a row here (ledger-completeness, CF-02) or if a
row's `next_expected` has passed without a `last_verified` re-stamp (CF-03).

Since 2026-09-02 the same file also carries **`annual_figures`**: the bundled
federal dollar amounts that reprice every year on a known calendar -- the IRS
standard mileage rate, the Section 179 cap and IRC 168(k) bonus percentage, the
SSA wage base, the FHFA and HUD loan limits, GSA per-diem, HUD Fair Market
Rents, and the Pub 15-T brackets. Those rows track a *value*, not an edition,
and nothing had ever tracked them. On 2026-09-02 five were found wrong at once,
each under a recent `verified_on` stamp -- the mileage rate two tax years old,
Section 179 and bonus still on a statute repealed in July 2025, the SSA wage
base $900 low, the loan limits a whole cycle behind under a `year: 2026` label,
and the GSA M&IE tiers three fiscal years behind.

**CF-04** asks the calendar instead of the stamp: when did the publisher last
speak, and was the bundled value looked at after that? It warns from the
publication month and fails only once a *second* publication has passed, so a
figure is a full cycle behind before it can turn the build red. Re-verify
against the publisher, then move `last_verified`; a stamped date is not
evidence, so the row's `verification_note` should say what was checked.

**Status vocabulary**

- **current** — the bundled edition is the current published edition (or the
  lag is immaterial and the citation says so).
- **disclosed-lag** — the bundled values follow an older edition and the
  citation *names the newer edition* as the current one (v19 §3.1). Acceptable;
  jurisdictions lag, and the user is told.
- **acknowledged-stale** — a newer edition may exist that the maintainer has
  not yet confirmed/refreshed; the row is re-stamped "verified, monitoring" with
  a dated re-verify action so the gate stays green while the work is scheduled.

## Tracked-source ledger

| id | source | edition cited (bundled) | current edition | last verified | status |
|----|--------|-------------------------|-----------------|---------------|--------|
| `nec` | NEC (NFPA 70) | 2023 | 2026 | 2026-06-05 | disclosed-lag |
| `ipc` | International Plumbing Code | 2021 | 2024 (2027 voted, not published) | 2026-09-01 | disclosed-lag |
| `irc` | International Residential Code | 2021 | 2024 (2027 voted, not published) | 2026-09-01 | disclosed-lag |
| `ibc` | International Building Code | 2021 | 2024 (2027 voted, not published) | 2026-09-01 | disclosed-lag |
| `imc` | International Mechanical Code | 2021 | 2024 (2027 voted, not published) | 2026-09-01 | disclosed-lag |
| `ifc` | International Fire Code | 2021 | 2024 (2027 voted, not published) | 2026-09-01 | disclosed-lag |
| `ifgc` | International Fuel Gas Code | 2021 | 2024 (2027 voted, not published) | 2026-09-01 | disclosed-lag |
| `ashrae-62-1` | ASHRAE 62.1 | 2022 | **2025 (published)** | 2026-09-01 | disclosed-lag |
| `ashrae-62-2` | ASHRAE 62.2 | 2022 | **2025 (published)** | 2026-09-01 | disclosed-lag |
| `ashrae-90-1` | ASHRAE 90.1 | 2022 | **2025 (published)** | 2026-09-01 | disclosed-lag |
| `fda-food-code` | FDA Food Code | 2022 | 2022 | 2026-06-05 | current |
| `wmm` | NOAA World Magnetic Model | WMM2025 | WMM2025 (expires 2030-01-01) | 2026-06-05 | current |
| `aashto-greenbook` | AASHTO Green Book | 2018 (7th ed.) | 7th ed. (8th in development) | 2026-09-01 | acknowledged-stale |

## Dispositions (spec-v22 §2)

- **NEC (CF-02):** advanced the cycle row to NEC 2026 (published on the standard
  NFPA three-year cycle). Bundled ampacity/ambient-correction values still
  follow NEC 2023; `NEC_DISCLOSURE` now names 2026 as the current edition, so
  this is **disclosed-lag**, not a silent stale. The 2026 value refresh is a
  data change tracked separately (out of v22's citation-text scope).
- **ICC I-codes (CF-04):** `IRC` / `IBC` / `IMC` / `IFGC` / `IPC` bundle 2021
  while 2024 is current. The disclosures (`IRC_DISCLOSURE`, `IBC_DISCLOSURE`,
  `IPC_DISCLOSURE`, `IFGC_DISCLOSURE`) already name 2024 as the newer adopted
  edition, so this is correctly **disclosed-lag**. The 2024 value refresh is its
  own future data pass.

- **ICC I-codes, 2026-09-01 re-stamp (CF-03):** all six rows carried
  `next_expected: 2026-09`, which passed at UTC midnight on 2026-09-01 and
  turned `main` red -- the gate working as designed. Verified against ICC's
  published schedule: the **2027 I-Codes completed their final vote in August
  2026 and are published in stages over the rest of 2026 and early 2027**, with
  the IBC and IFC anticipated September 2026 and the IRC February 2027. So the
  2027 edition does **not** exist yet and 2024 remains the current published
  edition; the rows are re-stamped `last_verified: 2026-09-01` and each
  `next_expected` is advanced to that source's own anticipated month
  (IBC / IFC 2026-10, IPC / IMC / IFGC 2027-01, IRC 2027-02) rather than to one
  date for all six. Advance `current_edition` on confirmed publication.
- **ASHRAE 62.1 / 62.2 / 90.1 (CF-02), superseded 2026-09-01:** the 2026-06-05
  disposition re-stamped these **acknowledged-stale** with a quarterly re-verify
  action. Nothing asked again for three months, because a re-stamp used to
  silence a row permanently. Asked on 2026-09-01: **all three 2025 editions are
  published** -- 62.1-2025, 62.2-2025 (16 addenda, MERV 6 -> MERV 11) and
  90.1-2025 (105 addenda). The rows now carry `current_edition: 2025`, so the
  status is **disclosed-lag**: bundled values still follow the 2022 editions and
  the citations name the newer edition. Refreshing those values is a data pass
  of its own, tracked separately.
- **AASHTO Green Book (CF-02), re-verified 2026-09-01:** the 8th edition is
  still **not published**. NCHRP 07-29, the research project developing it, was
  scheduled to complete 2026-03-31, and publication follows that rather than
  precedes it. Remains **acknowledged-stale** on the 2018 7th edition, re-stamped
  with `next_expected: 2027-01`.
- **A re-stamp now expires (CF-03, 2026-09-01).** The four rows above sat quiet
  for three months on a stamp that never aged, while two of the three ASHRAE
  standards had in fact published. `check-citation-freshness` now fails a row
  whose `last_verified` is more than **92 days** old while `next_expected` is
  still in the past -- the quarterly cadence this document already promised, now
  enforced rather than described. The acknowledgement buys a quarter, not
  silence.
- **The due date now warns before it fails (2026-09-02).** CF-03 fails the
  moment `next_expected` passes, which means the build turns red at a UTC
  midnight with no commit behind it and whoever is next at the keyboard
  inherits it as a surprise. That has happened. `check-citation-freshness` now
  emits a **non-fatal warning for the 92 days before** a row is due, whenever
  the row's existing re-stamp will not cover that date -- and a re-stamp dated
  *before* the due date never does, by CF-03's own rule. Three rows are warning
  today: IBC and IFC (due 2026-10, re-stamped 2026-09-01 and so **not**
  covered -- the October re-verify is real work, now visible a month out) and
  the FDA Food Code (due 2026-12, carrying no `last_verified` at all). A date
  this file already knows about should not be able to ambush anyone.

## Verified current / well-disclosed, not in the cycle table (spec-v22 §2)

These sources were audited and found current or correctly disclosed but are not
tracked rows in `sources-cycle.json` (they are cited by edition inline):
FDA Food Code 2022 (disclosed), WMM2025 (expiry-dated), NFPA 14-2024 (disclosed),
NFPA 70E-2024, IICRC S520-2024, FHFA / HUD FY2026 limits, and the IRS
current-year publications.
