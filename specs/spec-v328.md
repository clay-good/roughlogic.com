# roughlogic.com Specification v328 -- Atterberg Plasticity Indices and A-Line Classification (calc-earthwork.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v326..v328 (the soil characterization/QC trio -- relative
> compaction (v326), soil phase relations (v327), the Atterberg indices (this spec)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: the catalog grades compaction and resolves phases but
> has no tile for the consistency limits that classify a fine-grained soil -- the plasticity index and the A-line position
> that separate a clay from a silt and decide whether a soil is a suitable fill or a shrink-swell problem. Adds one tile to
> the existing **`calc-earthwork.js`** module (Group E); no new group, trade, or dependency. Inherits spec.md through
> spec-v327.md.
>
> **The gap, and the evidence for it.** The Atterberg limits reduce a fine-grained soil to a few consistency numbers: the
> plasticity index `PI = LL - PL` (liquid limit minus plastic limit), the liquidity index `LI = (w - PL)/PI` (where the
> in-situ water content sits between the limits), and the USCS classification via the A-line `PI = 0.73(LL - 20)`: a soil
> plotting above the A-line is a clay (CL/CH), below it a silt (ML/MH), with the `LL = 50` line splitting low from high
> plasticity. For a soil with `LL = 45`, `PL = 22`, and an in-situ `w = 30%`, `PI = 23`, the A-line value is
> `0.73(45 - 20) = 18.3`, so `PI = 23 > 18.3` plots above the A-line at `LL < 50` -> **CL (lean clay)**, and `LI = (30 - 22)/23 = 0.35`
> puts it firmly in the plastic (workable) state, not liquid. These are the numbers a geotech report leads with and an
> earthwork spec screens fill against. The catalog never computed them; this tile does.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The liquid limit `LL`,
plastic limit `PL`, and in-situ water content `w` are dimensionless percentages; the plasticity index `PI` and the A-line
value are percentages; the liquidity index `LI` is dimensionless; the USCS group is a categorical label. The v18/v21
contract: any non-finite input, a limit at or below zero, or `PL >= LL` (a non-plastic or invalid input, `PI <= 0`) returns
`{ error }` (or a "nonplastic" flag). Citation discipline (v19/v22): `GOVERNANCE.general` over the Atterberg-limit
definitions by name; `editionNote` names **the plasticity index `PI = LL - PL`, the liquidity index `LI = (w - PL)/PI`, the
USCS A-line `PI = 0.73(LL - 20)` and U-line, the `LL = 50` low/high-plasticity split, and the ASTM D4318 limit tests**, and
states that **this returns the plasticity indices and the A-line-based USCS group for a fine-grained soil -- it classifies
by the A-line/`LL = 50` chart (the full USCS also needs the fines content and gradation for a coarse-grained or dual
classification), assumes the limits are from the standard ASTM D4318 tests, and does not compute the shrink-swell potential,
the activity, or the coarse-fraction sieve classification; and this is an engineering aid** -- the soil test data and the
geotechnical engineer govern.

## 2. The tile

### 2.1 `atterberg-indices` -- Atterberg Plasticity Indices and A-Line Classification

```
inputs:
  LL      %    liquid limit
  PL      %    plastic limit
  w_pct   %    in-situ water content (optional, for LI)

PI = LL - PL                                     ; plasticity index, %
LI = (w_pct - PL) / PI                           ; liquidity index (if w given)
Aline = 0.73 * (LL - 20)                         ; A-line PI at this LL
above_A = PI > Aline
group = above_A
  ? (LL < 50 ? "CL (lean clay)" : "CH (fat clay)")
  : (LL < 50 ? "ML (silt)"      : "MH (elastic silt)")
```

**Pinned worked example (LL = 45, PL = 22, w = 30%).** `PI = 45 - 22 = 23`; A-line `= 0.73(45 - 20) = 18.3`, and
`PI = 23 > 18.3` so the soil plots above the A-line at `LL < 50` -> **CL (lean clay)**; `LI = (30 - 22)/23 = 0.35`, a plastic
(workable) state. **Cross-check (a low-plasticity silt).** `LL = 30`, `PL = 25`, `w = 28`: `PI = 5`; A-line `= 0.73(10) = 7.3`,
and `PI = 5 < 7.3` -> below the A-line -> **ML (silt)**, with `LI = (28 - 25)/5 = 0.60` -- the same low-`PI` range where the
A-line, not the `PI` alone, separates a silt from a lean clay, the distinction that changes a fill's suitability. The
non-finite, non-positive, and `PL >= LL` (nonplastic) error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","surveying"]`, matching the earthwork tiles); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the Atterberg definitions, `editionNote` naming `PI = LL - PL`,
`LI`, the A-line `0.73(LL - 20)`, the `LL = 50` split, ASTM D4318, and the fine-grained-only, chart-based, not-shrink-swell
caveats); `test/fixtures/worked-examples.json` (the CL example + the ML cross-check); `test/fixtures/compute-map.js`
(`atterberg-indices` -> `computeAtterbergIndices` in `../../calc-earthwork.js`); `scripts/related-tiles.mjs` (->
`soil-phase-relations` / `relative-compaction` / `soil-swell-shrink` / `soil-bearing-capacity`);
`data/search/aliases.json` ("Atterberg limits", "plasticity index", "liquid limit plastic limit", "A-line", "USCS
classification", "liquidity index", "PI soil", "clay silt classification", "soil consistency limits"); the id appended to
the existing earthwork renderers block in `app.js`; the `// dims:` annotation (limits/`PI`/`w` percent, `LI` dimensionless,
group categorical); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the A-line
classification branch, the `LL = 50` split, and the `PL >= LL` / non-positive / non-finite error seams. No new module;
re-pin `calc-earthwork.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the A-line and split assertions); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `PI` / A-line / group / `LI` stack
wraps on a phone); render-no-nan + a11y sweep, output read to the value (LL 45 PL 22 -> PI 23, CL).

## 5. Roadmap position

Closes the soil characterization/QC batch (v326..v328) in `calc-earthwork.js`: relative compaction, phase relations, and
the Atterberg indices now give the field and lab characterization behind the volume, settlement, and bearing tiles. The
full USCS with the coarse-fraction sieve and dual symbols, a shrink-swell/expansive-soil screen from the PI, and the
activity `PI/clay%` are the deliberate next follow-ons once the trio lands.
