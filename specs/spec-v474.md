# roughlogic.com Specification v474 -- ADA Ramp Slope, Runs, and Landings (IBC 1012 / ADA) (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-03). The 100th and final tile of the trades-only catalog-expansion campaign (v375..v474).
> `stairs` and `stair-stringer` lay out steps; the accessible ramp that serves the same rise -- its length at the code
> slope, the number of runs, and the landings -- has no tile, and it is one of the most common questions on a permit set.**
> In-scope catalog expansion under the spec-v106 trades-only charter. An accessible ramp is limited to a `1:12` slope
> (`8.33%`), so the minimum run for a given rise is `rise * 12`; a single ramp run may rise no more than `30 in` before a
> level landing is required, so a tall rise needs multiple runs with `60 in`-long landings between them. `stairs` handles
> steps, not the ramp. This adds the ramp tile to the existing **`calc-construction.js`** module (Group E); no new group,
> trade, or dependency, and it closes the campaign. Inherits spec.md through spec-v473.md.
>
> **The gap, and the evidence for it.** A `24 in` rise at the maximum `1:12` slope needs a `24 * 12 = 288 in = 24 ft` run in
> a single ramp (the rise is under the `30 in` per-run limit), sloped exactly `8.33%`. A `40 in` rise exceeds the `30 in`
> per-run limit, so it takes two runs with a `60 in` landing between them, for a total ramp length of about
> `480 + 60 = 540 in = 45 ft`. No tile does this; a designer laying out an accessible route had the stair tiles but not the
> ramp.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The rise, run, landing, and
total length are lengths (in, also reported in ft); the slope is dimensionless (percent and ratio); the run count is
dimensionless. The v18/v21 contract: any non-finite input, or a non-positive rise, or a slope steeper than the maximum,
returns `{ error }`; the tile computes the run at the selected slope (default `1:12`), the number of runs (each rise capped
at `30 in`), the landings between them, and the total ramp length, and reports whether handrails are required (rise over
`6 in`). Citation discipline (v19/v22): `GOVERNANCE.general` over the accessible ramp geometry by name; `editionNote` names
**the ADA 2010 Standards / IBC 1012, the maximum ramp slope `1:12` (`8.33%`), the maximum `30 in` rise per run before a
level landing, the `60 in` minimum landing length (and at each direction change), and handrails required where the rise
exceeds `6 in` -- code text quoted per the CF-01 disclosure**, and states that **this returns the ramp run, runs, landings,
and total length for an accessible route, that cross-slope, edge protection, and clear width also apply, and that it is a
design aid, not a substitute for the AHJ or an accessibility review**.

## 2. The tile

### 2.1 `ada-ramp-slope` -- ADA Ramp Slope, Runs, and Landings (IBC 1012 / ADA)

```
inputs:
  rise_in       in   total vertical rise to overcome
  slope_ratio   -    ramp slope as run:rise (default 12, for 1:12)
  landing_in    in   landing length between runs (default 60)

run_in       = rise_in * slope_ratio                 (total sloped run)
slope_pct    = 100 / slope_ratio
runs         = ceil(rise_in / 30)                     (max 30 in rise per run)
landings     = (runs - 1) * landing_in
total_len_in = run_in + landings
handrails    = rise_in > 6
```

**Pinned worked example (24 in rise, 1:12).** `run = 24*12 = 288 in = 24 ft`; slope `8.33%`; one run (`24 <= 30`); no
intermediate landing; handrails required. **Cross-check (a tall rise needs a landing).** A `40 in` rise takes
`ceil(40/30) = 2` runs with one `60 in` landing, for `480 + 60 = 540 in = 45 ft` of total ramp length. A non-positive rise
or a too-steep slope takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["carpentry"]`, beside `stairs` / `stair-stringer`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, ADA/IBC 1012 ramps, `editionNote` naming the `1:12` slope, the `30 in`
per-run rise, the `60 in` landing, and the handrail threshold -- code text per CF-01); `test/fixtures/worked-examples.json`
(the single-run example + the two-run cross-check); `test/fixtures/compute-map.js` (`ada-ramp-slope` ->
`computeAdaRampSlope` in `../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `stairs` / `stair-stringer` /
`roof-pitch` / `slope`); `data/search/aliases.json` ("ada ramp", "ramp slope", "1:12 ramp", "accessible ramp", "ramp
length", "wheelchair ramp", "ibc 1012 ramp", "ramp run landing", "ramp calculator"); the id appended to the existing
construction renderers block in `app.js`; the `// dims:` annotation (rise/run/landing/length length, slope/runs
dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the runs and
landings, the handrail flag, and the non-positive / too-steep / non-finite error seams. No new module; re-pin
`calc-construction.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**, CF-01 disclosure);
`npm test` (+2 fixtures, the new fuzzer block, the runs/landings/handrail outputs, the error paths); `npm run build` (one
new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the run / runs / total-length
set wraps on a phone); render-no-nan + a11y sweep, output read to the value (24 in rise, 1:12 -> 24 ft run, one run).

## 5. Roadmap position

The 100th tile of the trades-only expansion campaign (v375..v474), and a fitting close: from psychrometric enthalpy at v375
to an accessible ramp at v474, the campaign added a hundred in-scope trade calculators across HVAC, structural,
electrical, plumbing, refrigeration, fabrication, and the contractor business, each chained into the tile that already
needed it. A switchback-ramp layout (with a `60 in` direction-change landing) and a cross-slope / clear-width check are the
deliberate next follow-ons.
