# roughlogic.com Specification v690 -- Grain Bin Wall Height for a Target Capacity (calc-agriculture.js, Group L, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-agriculture.js`** (Group
> L, agriculture), no new module, group, or dependency. Inherits spec.md through spec-v689.md.
>
> **The gap, and the evidence for it.** Spec-v (`grain-bin-capacity`) runs the bin geometry forward: given a wall
> height, it returns the bushel capacity. The planning question a farmer sizing storage asks is the inverse -- **how tall
> a wall does a bin of this diameter need to hold the bushels I want**. The forward tile makes you guess wall heights and
> re-read the bushels; the inverse solves it directly. From `bushels = (floor_area x eave + roof_cone) x packing x
> 0.8036`, `eave = (target_ft3/packing - cone_ft3) / floor_area`. The number this settles: storing 12,875 bu in a 30 ft
> bin with an 8 ft peaked fill needs a **20 ft** wall; widen the bin to 42 ft and the wall drops to about **8.9 ft** --
> capacity grows with the square of the diameter but only linearly with the wall, so a wider bin holds far more per foot
> of steel.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`grain-bin-capacity` sibling: the target capacity and the packing factor are `dimensionless` (bushels, factor), the
diameter and heights are `L` (ft), and the returned wall height is `L`. It reuses the sibling's `0.8036` bushel-per-ft^3
constant and cone-volume formula. The v18/v21 contract: any non-finite input, a non-positive target or diameter, a
negative peak, or a non-positive packing factor returns `{ error }`; additionally, if a peaked fill's cone volume alone
meets or exceeds the target (which would give a zero or negative wall), the tile returns `{ error }`. Citation discipline
(v19/v22): the bin geometry solved for the wall height, `GOVERNANCE.general` matching the sibling; the note states that
**a peaked fill is credited first (its volume shortens the wall), capacity grows with the square of the diameter but only
linearly with the wall (doubling the diameter quarters the wall for the same bushels), and this is the geometric fill
volume, not a structural or aeration check -- the manufacturer's rated capacity and the wall/foundation design govern**.

## 2. The tile

### 2.1 `grain-bin-height-for-capacity` -- Grain Bin Wall Height for a Target Capacity

```
inputs:
  target_bushels    bu    target capacity (> 0)
  diameter_ft       ft    bin diameter (> 0)
  peak_height_ft    ft    roof/peaked-fill cone height (>= 0, 0 = flat)
  packing_factor    -     packing factor (> 0, default 1.0)

floor_area = pi x (diameter_ft/2)^2
cone_ft3 = (1/3) x floor_area x peak_height_ft
eave_height_ft = (target_bushels / 0.8036 / packing_factor - cone_ft3) / floor_area   [ft]
```

**Pinned worked example (a 30 ft bin).** target = 12,875 bu, diameter = 30 ft, peak = 8 ft, packing = 1.0:
`floor_area = pi x 15^2 = 706.86`, `cone = (1/3) x 706.86 x 8 = 1,884.96`, `target_ft3 = 12875/0.8036 = 16,022`,
`eave = (16,022 - 1,884.96) / 706.86 = ` **20 ft**; feeding 20 ft back through `grain-bin-capacity` returns 12,875 bu,
the input. **Cross-check (a wider bin).** Same 12,875 bu in a 42 ft bin (floor_area 1,385.4): `eave = ` **8.9 ft** -- the
larger floor holds the crop in a much shorter wall.

## 3. Wiring

A `tools-data.js` row (group `L`, trades `["agriculture"]`) placed in the LATER Group L section beside `drawbar-pull`,
NOT beside `grain-bin-capacity` in the original block -- the Group L audit-coverage test asserts exactly 30 ids in the
`// Group L: Agriculture`..`// Group M` block, so the row must stay out of it; a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (bin geometry solved for wall height, `GOVERNANCE.general` matching the sibling, the note per §1);
`test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js` (`grain-bin-height-for-capacity` ->
`computeGrainBinHeightForCapacity` in `../../calc-agriculture.js`); `scripts/related-tiles.mjs` (-> `grain-bin-capacity`
/ `grain-aeration-airflow` / `crop-yield`, and the forward tile links back); `data/search/aliases.json` ("bin wall
height for a target capacity", "how tall a grain bin for bushels", "size a grain bin from bushels", plus adjacent rows);
the calc-agriculture RENDERERS map entry `"grain-bin-height-for-capacity": renderGrainBinHeightForCapacity` via a
hand-written renderer (the module's `makeNumber` / `makeOutputLine` / `attachExampleButton` / `debounce` / `fmt`
helpers) and the id added to the calc-agriculture declare list in `app.js`; the `// dims:` annotation directly above the
compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning both examples,
the wider-bin-shorter-wall check, the round-trip through `computeGrainBin`, and the error seams (including the
cone-exceeds-target guard; note a packing factor of 0 maps to the 1.0 default via `|| 1.0`, matching the forward, so the
negative-packing seam is tested instead). The calc-agriculture.js gzip cap is expected to hold (verify at build,
including `check-shells`). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes); `npm test` (+2 fixtures, the new
fuzzer block); `npm run build` (one new shell, regenerated sitemap); `node scripts/check-shells.mjs` and
`check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`; worked-examples runner; 320 px audit; render +
output read to the value (the pinned example -> 20 ft wall for 12,875 bu in a 30 ft bin).

## 5. Roadmap position

Pairs the forward bin tile (`grain-bin-capacity`, bushels from height) with its inverse (height from a target capacity),
the two halves of the grain-storage sizing question. Further Group L growth stays evidence-driven.
