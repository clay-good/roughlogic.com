# roughlogic.com Specification v108 -- The FREEZE / SALVAGE Program: Off-Brand Groups Off the Trades Index Without Deleting Working Tools (O, P, T, X, Y -- Design Only)

> **Status: DESIGN DECISION 2026-06-20, future work, not executed.** v108 is the **FREEZE /
> SALVAGE** counterpart to spec-v107's **CUT** pass. Where v107 deletes the four
> liability-bearing groups, v108 designs how the five off-brand-but-not-liable groups (Kitchen
> O, Field / Backcountry / SAR P, Bench Science T, Real Estate X, Educators Y) leave the
> trades-facing surface *without* their working, correct tiles being thrown away. It records the
> design and the per-tile dispositions; a later landing spec executes it. It inherits everything
> from spec.md through spec-v107.md and changes no compute.
>
> **Why a separate disposition.** These five fail inclusion gate 1 (not a building trade) but,
> unlike the v107 four, carry no death / injury / UPL liability. The charter (spec-v106 §5.1)
> reserves CUT for liability and prescribes FREEZE for off-brand-only failures, with SALVAGE to
> re-home the trade-useful tiles first. v108 applies that rule.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Disposition basis

Per spec-v106 §5.1 and §8, each group is resolved as FREEZE (move the remainder to the off-brand
annex), SALVAGE (re-home trade-useful tiles into a live trades group first), or a small CUT
(only the few tiles that do carry a harm failure mode). No group here is deleted wholesale; no
compute is rewritten.

**Key property: FREEZE and SALVAGE break no public URLs.** A tile's URL is `/tools/<id>/`,
independent of its group letter. Freezing a tile (marking its group off-index) and salvaging a
tile (changing its group letter and trade tag) both leave the id, the URL, and the compute
unchanged. Only the v107 CUT pass retires URLs. This is the central reason these five groups are
frozen rather than cut: the work, the links, and the SEO surface all survive.

## 2. The off-brand annex (design)

The annex is a general / allied-tools wing that holds every frozen tile:

- **Off the trades home index.** The home browse-by-trade index lists only KEEP groups. The
  annex is reachable by direct link, by search, and by a single clearly-labeled entry point
  (for example a footer "General and allied tools" link), and is visually separated so a
  tradesperson is never led to believe it is part of the trades catalog.
- **Frozen groups keep their letters.** O, P (remainder), T (remainder), X, and Y (remainder)
  retain their group letters but are flagged off-index (a per-group `annex: true` style marker,
  exact mechanism deferred to execution). Letters are stable ids (spec-v106 §5); no re-lettering.
- **No further investment.** Frozen tiles get bug-fix-only treatment. No new annex tiles are
  added; the annex only ever shrinks (a frozen group may later be CUT) or loses tiles to
  salvage.
- **Count model split.** Per spec-v106 §5.1, the gate-anchored counts split into the **trades
  catalog** (home index: KEEP groups only) and the **total live catalog** (trades plus annex).
  `check-readme-counts` and the README headline figure track the trades catalog; a secondary
  figure may report the total live. The exact gate wiring is an execution detail; the design
  requirement is only that the headline number reflects the trades-facing surface, not the annex.

## 3. Per-group disposition plan

Tile names below are the current catalog names; the execution spec pins exact ids. Where a
salvage target already has an equivalent tile, the execution pass dedupes rather than duplicates
(noted inline).

### 3.1 O -- Kitchen / Food Service: FREEZE the operations, CUT the food-safety tiles

- **CUT (harm failure mode -- foodborne illness):** Sous-Vide Pasteurization Time, Food Safety
  Cooling Curve, Brine / Cure Concentration. These are removed like v107 (URLs retired) because
  a wrong number is a safety failure, not a redo.
- **FREEZE to annex (restaurant operations):** Recipe Scaling, Yield Percentage and Edible
  Portion, Plate Cost and Menu Pricing, Steam Table and Pan Conversion, Baker's Percentage,
  Period Food-Cost Percentage, Restaurant Prime Cost, Beverage Pour Cost and Drink Price.

### 3.2 P -- Field / Backcountry / SAR: SALVAGE the survey / nav math, FREEZE the rest

- **SALVAGE into the Survey trade** (re-tag to the surveying trade / its group): Pacing and
  Distance, Magnetic Declination and Bearing Conversion, Magnetic Declination (WMM2025), UTM and
  Lat-Lon Conversion, Area by Coordinates, Traverse Closure and Adjustment. Dedupe against any
  existing survey tile. Sunrise / Sunset / Civil Twilight is a salvage *candidate* (field work
  hours); defer the keep-or-freeze call to execution.
- **FREEZE to annex (backcountry / SAR safety):** Slope Angle and Avalanche Risk Window,
  Backcountry Water and Caloric Requirement, Lightning 30-30 Rule Countdown, Search Probability
  of Detection, Hiking Time (Naismith's Rule).

### 3.3 T -- Bench Science / Laboratory: SALVAGE the general chemistry, FREEZE the molecular bio

- **SALVAGE into Water and Wastewater Operations (M):** Molarity and Dilution (C1V1=C2V2),
  Serial Dilution Planner, Molecular Weight from Formula, Mass-to-Moles and Moles-to-Mass,
  Beer-Lambert Concentration, Henderson-Hasselbalch Buffer. Note: M already ships "Lab Dilution
  and Serial Dilution"; dedupe the dilution tiles at execution (keep one canonical).
- **FREEZE to annex (biotech bench):** Centrifuge RPM and RCF, Resuspension Volume, PCR Master
  Mix, Hemocytometer Cell Count, OD600 to Cell Density, Agarose Gel Percent, Primer Melting
  Temperature, CFU/mL Viable Plate Count.

### 3.4 X -- Real Estate: FREEZE wholesale

All 24 tiles (LTV, DTI, PITI, 1031 timeline, cap rate, commission split, loan limits, HUD FMR,
PMI cancellation, seller net proceeds, and the rest) freeze to the annex. No salvage: none meets
the inclusion test as trades tools. A later spec may convert X from FREEZE to a full CUT if the
annex is trimmed; recorded here as a watch item, not decided.

### 3.5 Y -- Educators / K-12: SALVAGE the general utilities, FREEZE the gradebook

- **SALVAGE into Cross-Trade Utilities (G):** Number Base Converter (2-36), Quadratic Formula
  and Discriminant, Scientific Notation and Significant Figures, Significant Figures (count +
  round). Salvage *candidates* (defer): System of Two Linear Equations. Dedupe against any
  existing G utility (for example an existing interpolation tile).
- **FREEZE to annex (teaching / gradebook / academic stats / bio):** Readability Scores
  (Flesch-Kincaid) and Alternate Readability Formulas, Statistics Quick-Read, Genetic Codon
  Table, GPA Calculator, Lexile Band by Grade, Standards-Based Grade, Bell Curve / z-Score,
  Pearson Correlation, Chi-Square Goodness-of-Fit, Linear Regression, Grade-Curve Scaler,
  Final-Exam Grade Needed, Weighted Category Grade, Two-Sample t-Test, Confidence Interval,
  Periodic Element Reference.

## 4. Salvage migration mechanics

A salvaged tile keeps its id, URL, compute, citation, and worked example unchanged. Only its
*placement* changes. Per salvaged tile, the execution pass updates: the `tools-data.js` row
(`group` letter to the new home, `trades` tag to the new trade), `tile-meta.js` (group letter),
`scripts/related-tiles.mjs` (re-point related lists toward neighbors in the new group),
`data/search/aliases.json` (unchanged unless terms shift), and the `app.js` renderer wiring
(move the id under the new group's renderer declaration if module-bound). Compute, fixtures, and
citations are untouched. The dedupe step, where a target group already has an equivalent, retires
the weaker duplicate (CUT the loser's URL) and keeps the canonical one.

## 5. Sequencing (so no tile is orphaned)

The execution order matters and is fixed:

1. **Salvage first.** Re-home the SALVAGE tiles (sections 3.2, 3.3, 3.5) into their live target
   groups and dedupe. After this step the trade-useful tiles are first-class citizens of KEEP
   groups.
2. **Cut the harm tiles.** Remove the section 3.1 food-safety tiles (URLs retired, v107-style).
3. **Freeze the remainder.** Mark O, P, T, X, and Y off-index and route them into the annex.

Running freeze before salvage would briefly orphan the salvageable tiles; running cut before
salvage risks deleting a tile that should have moved. The order above prevents both.

## 6. Open design questions (deferred to execution)

- The exact off-index mechanism (`annex: true` group flag vs a dedicated annex pseudo-group) and
  how the home index, search, and sitemap each read it.
- The annex's URL / entry-point scheme and how `robots.txt` / sitemap treat annex pages (kept
  indexable, since the tools are correct and useful, just not trades-branded).
- The count-model split wiring in `check-readme-counts` and the README headline (trades catalog
  vs total live).
- Whether X (and any thin annex group) is later converted from FREEZE to CUT.
- Final keep-or-freeze calls on the salvage *candidates* (Civil Twilight; System of Two Linear
  Equations) and all dedupe winners.

## 7. Verification approach (when executed)

The standard green bar applies, adapted to the split count model: `npm run lint` with
`check-readme-counts` agreeing on the trades-catalog headline and the salvaged tiles appearing
under their new groups; `npm test` green with salvaged fixtures unchanged and the section 3.1
CUT fixtures removed; `npm run build` producing the trades index without the frozen groups and
the annex pages reachable; the 320 px and render-no-nan sweeps run over the full live catalog
(trades plus annex); and a check that every salvaged and frozen tile's URL still resolves (only
the section 3.1 food-safety ids and any dedupe losers 404 / 410).

## 8. Roadmap position

With v107 (CUT the four liable groups plus the stray flight-ops tile) and v108 (FREEZE / SALVAGE
the five off-brand groups), the trades home index becomes entirely trades, no correct work is
discarded, and no public URL breaks except the genuinely unsafe or duplicated handful. Effort
then concentrates on the Tier 1 trades and the source-of-truth pillars (spec-v106 §7), led by
jurisdiction / edition awareness. The annex is thereafter a frozen, bug-fix-only archive that
only shrinks.
