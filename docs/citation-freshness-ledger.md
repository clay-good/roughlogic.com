# Citation freshness ledger

> Implementation status: created by spec-v22 §5 (Citation Integrity II),
> 2026-06-05. Populates the v19 §3.3 freshness ledger so "we forgot to check
> this one" is structurally impossible.

This ledger lists every tracked source in
[../scripts/sources-cycle.json](../scripts/sources-cycle.json) with the edition
the site bundles, the current published edition, the date the row was last
verified, and a status. `scripts/check-citation-freshness.mjs` fails if any
tracked source `id` is missing a row here (ledger-completeness, CF-02), if a
row's `next_expected` has passed without a `last_verified` re-stamp (CF-03), or
if a row's `verification_note` claims a check later than its own stamp (CF-05).

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

**CF-05** keeps the two halves of a row honest with each other. `last_verified`
is the field the machine reads -- CF-03 measures the recheck cadence from it,
and `check-verified-on-ledger` makes every shard's `verified_on` equal it --
while `verification_note` is the field a person reads. Recheck a source, write
the date in the note, and forget the stamp, and the machine goes on reading the
older date: the source is treated as unchecked and the note becomes the only
record of the work. Five rows had drifted that way by 2026-09-09, the IBC and
IFC each claiming a 2026-09-09 re-confirmation over a 2026-09-03 stamp. The
gate now fails on a note that claims a verification date later than its own
stamp.

A later date is not always a missing re-stamp: a pass can reach something short
of a verification, as the IPC and IRC rows record, where a 2026-09-02 pass
reached only ICC's *anticipated* schedule and "an anticipated date is not a
verification". Say so in the note with the words **`last_verified stays
<date>`** and the row passes. The phrase has to name the stamp it is
defending, so an opt-out left behind by a later re-stamp cannot silence
anything.

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
| `ibc` | International Building Code | 2021 | 2024 (2027 not yet published) | 2026-09-10 | disclosed-lag |
| `imc` | International Mechanical Code | 2021 | **2027 (published)** | 2026-09-03 | disclosed-lag |
| `ifc` | International Fire Code | 2021 | 2024 (2027 not yet published) | 2026-09-10 | disclosed-lag |
| `ifgc` | International Fuel Gas Code | 2021 | **2027 (published)** | 2026-09-03 | disclosed-lag |
| `ashrae-62-1` | ASHRAE 62.1 | 2022 | **2025 (published)** | 2026-09-01 | disclosed-lag |
| `ashrae-62-2` | ASHRAE 62.2 | 2022 | **2025 (published)** | 2026-09-01 | disclosed-lag |
| `ashrae-90-1` | ASHRAE 90.1 | 2022 | **2025 (published)** | 2026-09-01 | disclosed-lag |
| `fda-food-code` | FDA Food Code | 2022 | 2022 | 2026-09-09 | current |
| `wmm` | NOAA World Magnetic Model | WMM2025 | WMM2025 (valid through 2029-12-31) | 2026-09-09 | current |
| `iupac-atomic-weights` | IUPAC/CIAAW Standard Atomic Weights | 2024 | 2024 | 2026-09-09 | current |
| `centrifuge-rotors` | Manufacturer centrifuge-rotor radii | current manufacturer catalogs | current manufacturer catalogs | 2026-09-09 | current |
| `buffer-pka` | Laboratory buffer pKa values | Good 1966 / PanReac AppliChem IP-022EN / CRC 95th | Good 1966 / PanReac AppliChem IP-022EN / CRC 95th | 2026-09-09 | current |
| `inventory-benchmarks` | Industry inventory-turnover benchmarks | ARTS 2022 (benchmarked) | ARTS 2022 (benchmarked) | 2026-09-09 | current |
| `aashto-greenbook` | AASHTO Green Book | 2018 (7th ed.) | 2018 (7th ed.), 8th in development | 2026-09-01 | acknowledged-stale |

## Dispositions (spec-v22 §2)

- **NEC (CF-02):** advanced the cycle row to NEC 2026 (published on the standard
  NFPA three-year cycle). Bundled ampacity/ambient-correction values still
  follow NEC 2023; `NEC_DISCLOSURE` now names 2026 as the current edition, so
  this is **disclosed-lag**, not a silent stale. The 2026 value refresh is a
  data change tracked separately (out of v22's citation-text scope).
- **ICC I-codes (CF-04):** `IRC` / `IBC` / `IMC` / `IFGC` / `IPC` bundle 2021.
  This entry used to say all four disclosures "already name 2024 as the newer
  adopted edition". That was true of `IRC_DISCLOSURE` and `IPC_DISCLOSURE` only.
  `IBC_DISCLOSURE` named just *older* editions ("Older IBC editions reference
  ASCE 7-16 / 7-10") and `IFGC_DISCLOSURE` just "earlier editions" -- so a
  reader was told the bundled 2021 was the newest there is, which is the
  disclosed-lag mechanism failing to disclose the lag. Both now name the current
  published edition: **IBC 2024**, and **IFGC 2027**, which shipped in the 2027
  I-Code staged release. Corrected 2026-09-09 and gated -- a unit test pins each
  disclosure against the `current_edition` in `sources-cycle.json`. The value
  refresh remains its own future data pass.

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
- **IBC and IFC, 2026-09-10 (CF-03):** both were due **2026-10** with a
  re-stamp of 2026-09-09, which by CF-03's own rule could never cover it -- so
  `main` would have gone red at UTC midnight on **2026-10-01** with no commit
  behind it, taking `accessibility` and `integration` with it (both
  `needs: test`). Verified against a publisher surface the earlier passes had
  not used: ICC's newsroom announcement of **2026-08-24** states that the 2027
  International Codes will be published later this year and names **no month**.
  That corroborates the 2026-09-09 Digital Codes reading -- neither the IBC nor
  the IFC is among the released 2027 titles -- and settles what the earlier
  note could only infer: there is no anticipated month for these two any more,
  only a year-end window. The September date came and went, so **2026-10 was a
  guess**, not the publisher's claim. `next_expected` advances to **2027-01**:
  the first month after ICC's own window closes, and deliberately not 2026-12,
  which the FDA Food Code row already holds -- rows stacked on one date arrive
  as several errors at once after months of quiet, which is how the 2026-09-01
  six-row red happened. `last_verified` 2026-09-10. This defers **tracking** of
  the next edition, not a citation change: the site cites 2021 here against a
  current 2024, a lag already disclosed in the table above.
- **FDA Food Code, 2026-09-02 (CF-03):** the row had **no `last_verified` at
  all**, which meant the gate could only ever fail on it and never be satisfied,
  and it is due 2026-12. Verified against fda.gov: the **2022 Food Code (10th
  edition) is still the most recent published edition**, and FDA has said a 2026
  edition is coming later this year on the four-year interval it moved to after
  2017. Re-stamped `last_verified: 2026-09-02`. It still warns, correctly -- a
  re-stamp dated before `next_expected` cannot cover it -- and that warning is
  now a reminder to look in December rather than a row nobody had ever checked.
- **ICC I-codes, 2026-09-02 (no re-stamp, deliberately):** the six rows carry
  ICC's anticipated dates and the IBC / IFC are due within the month. The
  2026-09-02 pass re-confirmed the *schedule* (IBC / IFC September 2026, IECC
  2026-12-31, IRC February 2027) but could not confirm non-publication --
  shop.iccsafe.org 404s and codes.iccsafe.org 403s an automated fetch. **An
  anticipated date is not a verification**, so `last_verified` stays 2026-09-01,
  the last date non-publication was actually established, and only the row notes
  were enriched. Confirm at shop.iccsafe.org when the dates pass.
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
  *before* the due date never does, by CF-03's own rule. One row is warning
  today: the FDA Food Code (due 2026-12; it carried no `last_verified` at all
  until 2026-09-02, and its re-stamp still predates the due date). IBC and IFC
  warned here until 2026-09-10, when their due date moved to 2027-01 on the
  evidence recorded above; they warn again from 2026-10-01, ninety-two days
  out. A date this file already knows about should not be able to ambush
  anyone.

## Verified current / well-disclosed, not in the cycle table (spec-v22 §2)

These sources were audited and found current or correctly disclosed, are cited
by edition inline, and are **not** tracked rows in `sources-cycle.json`:
NFPA 14-2024 (disclosed), NFPA 70E-2024, and IICRC S520-2024.

Four entries that used to sit in this list have since become tracked rows and
were moved out of it, because a reader scanning this section for *what nothing
watches* was getting the wrong answer: **FDA Food Code** and the **NOAA World
Magnetic Model** are now rows in `standards`, and the **FHFA / HUD loan limits**
and the **IRS current-year publications** are rows in `annual_figures`. They are
governed by the tracked-source ledger above, not by this section. The unit test
in `test/unit/verified-on-ledger.test.js` fails if a tracked source is named
here again.
