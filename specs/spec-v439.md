# roughlogic.com Specification v439 -- Insulation Batt Coverage and Count (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-04, 0.151.0; proposed 2026-07-03). Second tile of the interior-finish takeoff trio (v438 flooring plank -> v439 insulation
> batt -> v440 trim linear footage). The catalog has `square-footage` and `drywall` but never counts the insulation batts
> and bags a wall or ceiling takes, the number an insulator orders from.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Batt insulation is ordered by the bag, each covering a
> stated square footage that depends on the R-value and stud spacing. The batt count is the net cavity area divided by the
> coverage per batt, and the bag count is that divided by the batts per bag (or the area divided by the coverage per bag).
> No tile does the insulation takeoff. This adds the batt tile to the existing **`calc-construction.js`** module (Group E);
> no new group, trade, or dependency. Inherits spec.md through spec-v438.md.
>
> **The gap, and the evidence for it.** A `500 ft^2` wall (net of openings) insulated with R-13 batts covering `10.67 ft^2`
> each takes `ceil(500 / 10.67) = 47` batts, and at a bag coverage of `88 ft^2` that is `ceil(500 / 88) = 6` bags. Step up to
> a deeper R-21 batt (lower coverage per bag) and the bag count rises even though the area is the same. No tile does this; an
> insulator sizing an order had the wall area but not the batt or bag count.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The cavity area, the coverage
per batt, and the coverage per bag are areas (ft^2); the batt and bag counts are dimensionless. The v18/v21 contract: any
non-finite input, or a non-positive area or coverage, returns `{ error }`; the batt and bag counts are rounded up, and an
optional waste allowance inflates the area. Citation discipline (v19/v22): `GOVERNANCE.general` over the insulation batt
takeoff by name; `editionNote` names **the batt count `= area / coverage_per_batt`, the bag count `= area / coverage_per_bag`
(or `batts / batts_per_bag`), typical faced-batt coverages by R-value and stud spacing, and that the net area excludes
openings and framing**, and states that **this returns the batt and bag counts for a cavity insulation job, that coverage
per bag comes from the product label (it falls as R-value rises), and that it is a takeoff aid, not a substitute for the
insulation submittal**.

## 2. The tile

### 2.1 `insulation-batt-coverage` -- Insulation Batt Coverage and Count

```
inputs:
  area_ft2             ft^2   net cavity area (walls/ceiling, less openings)
  coverage_per_batt    ft^2   coverage of one batt (e.g. 10.67 for R-13, 15 in x 8 ft)
  coverage_per_bag     ft^2   coverage per bag (from the label)
  waste_pct            %      waste allowance (default 0)

net    = area_ft2 * (1 + waste_pct/100)
batts  = ceil(net / coverage_per_batt)
bags   = ceil(net / coverage_per_bag)
```

**Pinned worked example (500 ft^2, R-13 batt 10.67 ft^2, bag 88 ft^2).** `batts = ceil(500/10.67) = 47`;
`bags = ceil(500/88) = 6`. **Cross-check (deeper R-value).** An R-21 bag covering `67 ft^2` raises the bag count to
`ceil(500/67) = 8` for the same wall -- thicker batts, fewer per bag. A non-positive area or coverage takes the error path;
the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["carpentry"]`, beside `drywall` / `square-footage`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, insulation batt takeoff, `editionNote` naming the batt/bag count
relations and the R-value coverage note); `test/fixtures/worked-examples.json` (the R-13 example + the R-21 cross-check);
`test/fixtures/compute-map.js` (`insulation-batt-coverage` -> `computeInsulationBattCoverage` in
`../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `drywall` / `square-footage` / `flooring-plank-layout` /
`assembly-r-value`); `data/search/aliases.json` ("insulation batts", "batt count", "insulation coverage", "insulation bags",
"batt insulation calculator", "cavity insulation", "R13 batts", "insulation takeoff", "square feet per bag"); the id
appended to the existing construction renderers block in `app.js`; the `// dims:` annotation (areas area, counts
dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the rounding,
and the non-positive / non-finite error seams. No new module; re-pin `calc-construction.js` on the `check:module-sizes`
allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the rounding, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the batts / bags output wraps on a phone); render-no-nan +
a11y sweep, output read to the value (500 ft^2, R-13 -> 47 batts, 6 bags).

## 5. Roadmap position

The middle of the interior-finish takeoff trio: `flooring-plank-layout` (v438) and `trim-linear-footage` (v440) bracket it.
An R-value-to-coverage lookup and a blown-in coverage-per-bag (attic depth chart) companion are the deliberate next
follow-ons.
