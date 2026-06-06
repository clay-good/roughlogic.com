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
| `ipc` | International Plumbing Code | 2021 | 2024 | 2026-06-05 | disclosed-lag |
| `irc` | International Residential Code | 2021 | 2024 | 2026-06-05 | disclosed-lag |
| `ibc` | International Building Code | 2021 | 2024 | 2026-06-05 | disclosed-lag |
| `imc` | International Mechanical Code | 2021 | 2024 | 2026-06-05 | disclosed-lag |
| `ifc` | International Fire Code | 2021 | 2024 | 2026-06-05 | disclosed-lag |
| `ifgc` | International Fuel Gas Code | 2021 | 2024 | 2026-06-05 | disclosed-lag |
| `ashrae-62-1` | ASHRAE 62.1 | 2022 | 2022 (monitoring 2025) | 2026-06-05 | acknowledged-stale |
| `ashrae-62-2` | ASHRAE 62.2 | 2022 | 2022 (monitoring 2025) | 2026-06-05 | acknowledged-stale |
| `ashrae-90-1` | ASHRAE 90.1 | 2022 | 2022 (monitoring 2025) | 2026-06-05 | acknowledged-stale |
| `fda-food-code` | FDA Food Code | 2022 | 2022 | 2026-06-05 | current |
| `wmm` | NOAA World Magnetic Model | WMM2025 | WMM2025 (expires 2030-01-01) | 2026-06-05 | current |
| `aashto-greenbook` | AASHTO Green Book | 2018 (7th ed.) | 7th ed. (monitoring 8th) | 2026-06-05 | acknowledged-stale |

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
- **ASHRAE 62.1 / 62.2 / 90.1 (CF-02):** `next_expected` (2025-10 / 2025-12)
  passed. Re-stamped **acknowledged-stale** with `last_verified: 2026-06-05` and
  a quarterly re-verify action; bundled values follow the 2022 editions and the
  citations disclose it. Advance the rows on confirmation of the 2025 editions.
- **AASHTO Green Book (CF-02):** `next_expected` (2025-10) passed. Re-stamped
  **acknowledged-stale** with `last_verified: 2026-06-05`; bundled defaults
  follow the 2018 7th edition. Advance on confirmation of the 8th edition.

## Verified current / well-disclosed, not in the cycle table (spec-v22 §2)

These sources were audited and found current or correctly disclosed but are not
tracked rows in `sources-cycle.json` (they are cited by edition inline):
FDA Food Code 2022 (disclosed), WMM2025 (expiry-dated), NFPA 14-2024 (disclosed),
NFPA 70E-2024, IICRC S520-2024, FHFA / HUD FY2026 limits, and the IRS
current-year publications.
