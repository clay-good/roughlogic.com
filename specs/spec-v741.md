# roughlogic.com Specification v741 -- Camera Max Distance for a Pixel Density (calc-lowvoltage.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lowvoltage.js`** (Group A),
> no new module, group, or dependency. Inherits spec.md through spec-v740.md. Explore sweep #13 (entry 6).
>
> **The gap, and the evidence for it.** The `camera-lens-fov` tile runs the DORI density forward: from a mounting distance
> it returns the pixel density. The designer's question is the inverse -- **the farthest distance a camera still meets a
> target pixel density** (a DORI task), so the camera can be placed to still Identify or Recognize. From
> `ppf = px x focal / (distance x sensor)`, `distance = px x focal / (target_ppf x sensor)`. The number this settles: a
> **1920 px** camera with a **4 mm** lens on a **5.37 mm** sensor holds **76 ppf** (Identify) out to about **18.8 ft**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`camera-lens-fov` sibling: the sensor width and focal length are `L` (mm), the horizontal resolution is dimensionless
(pixels), the target density is `L^-1` (ppf), and the returned distance and scene width are `L` (ft). It reuses the
sibling's thin-lens DORI density relation, solved for the distance. The v18/v21 contract: any non-finite input, a
non-positive sensor width, focal length, resolution, or target density returns `{ error }`. Citation discipline (v19/v22):
the density relation solved for the distance, `GOVERNANCE.electrical` matching the sibling; the note states that beyond the
distance the density falls below the target (the DORI task is not met), that the **horizontal FOV is fixed by the lens**
and does not change with distance, and that the result must be verified against the manufacturer's lens chart, low light,
and a live view.

## 2. The tile

### 2.1 `camera-max-distance-for-ppf` -- Camera Max Distance for a Pixel Density (DORI)

```
inputs:
  sensor_width_mm   L             sensor width (mm, > 0)
  focal_length_mm   L             focal length (mm, > 0)
  h_pixels          dimensionless horizontal resolution (pixels, > 0)
  target_ppf        L^-1          target pixel density (ppf, > 0; default 76 = Identify)

max_distance_ft = h_pixels x focal_length_mm / (target_ppf x sensor_width_mm)
scene_ft        = max_distance_ft x sensor_width_mm / focal_length_mm
fov_deg         = 2 x atan(sensor_width_mm / (2 x focal_length_mm)) in degrees
```

**Pinned worked example.** sensor = 5.37 mm, focal = 4 mm, px = 1920, target = 76 ppf:
`distance = 1920 x 4 / (76 x 5.37) = 7680 / 408.1 = ` **18.8 ft**, FOV = 67.7 deg. Feeding 18.8 ft back through
`camera-lens-fov` returns a 76 ppf density, the target. Dropping the target to 38 ppf (Recognize) doubles the reach to
37.6 ft.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`) placed beside `camera-lens-fov` (Group A is not exact-count
audited); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (density relation solved for the distance,
`GOVERNANCE.electrical` matching the sibling); `test/fixtures/worked-examples.json` (the pinned example);
`test/fixtures/compute-map.js` (`camera-max-distance-for-ppf` -> `computeCameraMaxDistanceForPpf`);
`scripts/related-tiles.mjs` (-> `camera-lens-fov` / `cctv-storage` / `poe-budget`); `data/search/aliases.json` (5
collision-checked question aliases: "camera max distance", "how far can camera identify", ...); the calc-lowvoltage
`LOWVOLTAGE_RENDERERS` map entry via a hand-written renderer (four number fields) and the id added to the calc-lowvoltage
declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the round-trip through `computeCameraLensFov`
across a sensor/focal/pixel/ppf sweep, the lower-density-farther and longer-lens-farther monotonicity, and the error
seams. The calc-lowvoltage.js gzip cap (17500 B, raised in spec-v740 for both tiles) covers the addition. Verify at build,
including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,189 -> 1,190.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 18.8 ft for 76 ppf on a
1920 px / 4 mm / 5.37 mm camera).

## 5. Roadmap position

Pairs the forward camera tile (`camera-lens-fov`, density from the distance) with its inverse (the max distance for a
density), the two halves of the surveillance-placement question. Continues Explore sweep #13; further Group A low-voltage
growth stays evidence-driven.
