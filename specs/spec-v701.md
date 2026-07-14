# roughlogic.com Specification v701 -- Cooling Coil Face Area for a Target Velocity (calc-hvacsystems.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacsystems.js`** (Group C,
> HVAC systems design), no new module, group, or dependency. Inherits spec.md through spec-v700.md.
>
> **The gap, and the evidence for it.** The `coil-face-velocity` tile runs the check forward: from an airflow and a coil's
> width and height it returns the face velocity and flags condensate carryover above ~500 fpm. The selection question is
> the inverse -- **given the airflow and the velocity I must stay under, how big a coil face do I need**. Since
> `velocity = CFM / area`, the inverse is `area = CFM / target_velocity`. The number this settles: **2,000 CFM** at the
> **500 fpm** wet-coil limit needs a **4.0 ft^2** face -- about 24 x 24 in. The forward tile only grades a coil you already
> picked; this sizes it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`coil-face-velocity` sibling: the airflow is `L^3 T^-1` (CFM), the target velocity is `L T^-1` (fpm), and the returned
area is `L^2` (ft^2, with an in^2 and a suggested square-side companion). It reuses the sibling's ~500 fpm wet-coil
carryover limit as the default target; a non-positive target defaults to 500 fpm exactly as the sibling's threshold does.
The v18/v21 contract: any non-finite input or a non-positive airflow returns `{ error }`. Citation discipline (v19/v22):
the face-velocity relation solved for area, `GOVERNANCE.general` matching the sibling; the note states that **sizing to
~500 fpm keeps a wet coil below the moisture-carryover point, a lower target buys margin at the cost of a larger, more
expensive coil, and the coil manufacturer's rated face velocity and moisture-carryover limit govern the actual
selection**.

## 2. The tile

### 2.1 `coil-face-area` -- Cooling Coil Face Area for a Target Velocity

```
inputs:
  cfm          L^3 T^-1   design airflow (> 0)
  target_fpm   L T^-1     target face velocity (> 0, default 500)

face_area_ft2 = cfm / target_fpm
face_area_in2 = face_area_ft2 x 144
square_side_in = sqrt(face_area_in2)
```

**Pinned worked example.** cfm = 2,000, target = 500 fpm: `area = 2000 / 500 = ` **4.0 ft^2** (576 in^2, ~24 in square);
feeding a 24 x 24 in coil at 2,000 CFM back through `coil-face-velocity` returns exactly 500 fpm, the target. A tighter
400 fpm target raises the required face to 5.0 ft^2, the larger-coil-for-lower-velocity trade.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`) placed beside `coil-face-velocity` (Group C is un-audited); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (face-velocity relation solved for area, `GOVERNANCE.general`
matching the sibling); `test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js`
(`coil-face-area` -> `computeCoilFaceArea`); `scripts/related-tiles.mjs` (-> `coil-face-velocity` /
`cooling-coil-total-load` / `grille-face-velocity` / `coil-bypass-factor`); `data/search/aliases.json` (5
collision-checked question aliases: "coil size for 2000 cfm", "cooling coil dimensions to avoid carryover", ...); the
calc-hvacsystems `HVACSYSTEMS_RENDERERS` map entry via a hand-written two-input renderer and the id added to the
calc-hvacsystems declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus +
tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the round-trip through
`computeCoilFaceVelocity`, the lower-target-larger-face monotonicity, the target-defaults-to-500 behavior, and the error
seams. The calc-hvacsystems.js gzip cap is expected to hold (verify at build, including `check-shells`). Lazy-loaded,
absent from home first paint. Home tile count 1,149 -> 1,150.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes and check-readme-counts); `npm test`
(+1 fixture, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `node scripts/check-shells.mjs`
and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`; worked-examples runner; 320 px audit;
render + output read to the value (the pinned example -> 4.0 ft^2 for 2,000 CFM at 500 fpm).

## 5. Roadmap position

Pairs the forward coil-velocity check (`coil-face-velocity`, velocity from a coil size) with its inverse (coil size from a
target velocity), the two halves of the carryover-sizing question. Further Group C HVAC-systems growth stays
evidence-driven.
