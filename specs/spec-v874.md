# roughlogic.com Specification v874 -- Carpet Square-Yard and Linear-Foot Takeoff (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v873.md. Flooring sweep, beside `flooring-takeoff`.
>
> **The gap, and the evidence for it.** `flooring-takeoff` handles resilient and plank by the square foot but nothing does
> **carpet**, which is sold by the square yard off a 12 ft roll and carries higher waste for seam layout and pattern.
> Grep confirmed no carpet-takeoff tile (`carpet-restore-replace` is a restoration decision). The number this settles: a
> 900 sf room at 10% waste is **110 SY**, or **82.5 linear feet** off a 12 ft roll -- the order in the units carpet is
> actually bought in.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
flooring siblings (`flooring-takeoff`, `tile-count`): the area carries `L^2`, the waste is dimensionless, the roll width
carries `L`, the gross area and square yards are `L^2`, and the linear feet is `L`. The v18/v21 contract: a non-finite or
non-positive area or roll width returns `{ error }`; a negative waste returns `{ error }`. Citation discipline (v19/v22):
the carpet takeoff identity by name (gross = area x (1 + waste); square yards = gross / 9; linear feet = gross / roll
width), `GOVERNANCE.general`; the note states that carpet is sold by the square yard off 12 ft (or 15 ft) rolls, that the
waste runs higher than hard flooring because of the seam layout, pattern match, and pile direction, and that this is
distinct from the square-foot `flooring-takeoff`.

## 2. The tile

### 2.1 `carpet-takeoff` -- Carpet Square-Yard and Linear-Foot Takeoff

```
inputs:
  area_sf       area to carpet (ft^2)
  waste_pct     waste allowance (percent, default 10)
  roll_width_ft carpet roll width (ft, default 12)

gross_sf   = area_sf * (1 + waste_pct/100)
carpet_sy  = gross_sf / 9
linear_ft  = gross_sf / roll_width_ft
```

**Pinned worked example.** Area 900 sf, 10% waste, 12 ft roll:
`gross = 900*1.10 = 990 sf`; `SY = 990/9 = ` **110 SY**; `linear = 990/12 = ` **82.5 LF**. Cross-check: on a 15 ft roll the
same job is `990/15 = ` **66 LF** at the same 110 SY -- a wider roll cuts the length and often the seams, but not the
square yards.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["flooring", "restoration"]`, inside the `// Group E` construction block near
`flooring-takeoff`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (SY = area(1+waste)/9; linear = gross/roll width, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the wider-roll cross-check); `test/fixtures/compute-map.js`
(`carpet-takeoff` -> `computeCarpetTakeoff`, module `../../calc-construction.js`); `scripts/related-tiles.mjs`
(-> `flooring-takeoff` / `self-leveler-bags` / `carpet-restore-replace`); `data/search/aliases.json` (5 collision-checked
aliases: "carpet takeoff", "carpet square yards", "carpet linear feet", "carpet roll estimate", "carpet quantity"); a
hand-written renderer in the `CONSTRUCTION_RENDERERS` map mirroring the `flooring-takeoff` renderer (non-exported, so no
DOM-sentinel dims row), and the id added to the calc-construction declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning
the gross area, square yards, linear feet, and the error seams (non-positive area or roll width; negative waste). The
calc-construction.js gzip cap is watched at build. Verify at build, including `check-shells` and `check-module-sizes`
post-build. Lazy-loaded, absent from home first paint. Home tile count 1,322 -> 1,323.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(900*1.10/9 -> 110 SY, 82.5 LF).

## 5. Roadmap position

Flooring tile beside the square-foot `flooring-takeoff`, serving the flooring installer (flooring / restoration). Distinct
from `carpet-restore-replace`. Stays evidence-driven; the seam plan governs the waste.
