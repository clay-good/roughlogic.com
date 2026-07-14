# roughlogic.com Specification v712 -- Required SPT N60 for a Target Bearing (calc-geotech.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-geotech.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v711.md. Closes the sweep-9 inverse queue.
>
> **The gap, and the evidence for it.** The single-mode `spt-bearing-capacity` tile runs the Meyerhof SPT relation
> forward: from a blow count it returns the allowable bearing. The QA question is the inverse -- **what N60 must the boring
> show to carry a design pressure**. Because qa is linear in N60 for both footing branches and the depth factor Kd is
> independent of N60, `N60 = qa_target / qa(N60=1)`. The number this settles: a **6 ft** footing **2 ft** deep needing
> **5 ksf** wants **N60 ~20** (round up for design).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`spt-bearing-capacity` sibling: the target pressure is `M L^-1 T^-2` (ksf), the width and depth are `L` (ft), and the
returned N60 and Kd are dimensionless. To keep the two-branch (B <= 4 vs wider) geometry and the depth factor in one
place, the compute reuses `computeSptBearingCapacity` at N60 = 1 and divides the target by the resulting allowable. The
v18/v21 contract: any non-finite input, or a non-positive target pressure, width, or depth returns `{ error }`. Citation
discipline (v19/v22): the Meyerhof SPT allowable solved for the blow count, `GOVERNANCE.general` matching the sibling,
citing Das; the note states that **this is a settlement-controlled (serviceability) check against the boring's N-value,
not the ultimate bearing capacity, the N60 must be energy-corrected, a high water table raises the required N60 (not
applied here), the result should be rounded up for design, and the geotechnical report governs**.

## 2. The tile

### 2.1 `spt-required-n60` -- Required SPT N60 for a Target Bearing (Meyerhof)

```
inputs:
  qa_target_ksf   M L^-1 T^-2   target allowable bearing (> 0)
  b_ft            L             footing width (> 0)
  d_ft            L             embedment depth (> 0)

qa_per_n60 = qa(N60 = 1, B, D)   (from the forward relation; carries the branch and Kd)
n60 = qa_target_ksf / qa_per_n60
n60_design = ceil(n60)
```

**Pinned worked example.** qa = 5 ksf, B = 6 ft, D = 2 ft: `Kd = min(1 + 0.33 x 2/6, 1.33) = 1.11`,
`qa(N60=1) = (1/6)((7/6)^2) x 1.11 = 0.2518 ksf`, `N60 = 5 / 0.2518 = ` **19.86** (design **20**); feeding N60 = 19.86
back through `spt-bearing-capacity` returns 5.00 ksf, the target. A narrow 3 ft footing uses the N60/4 branch, and a higher
target pressure raises the required N60.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction"]`) placed beside `spt-bearing-capacity` (Group E is un-audited);
a `tile-meta.js` `_TILES` entry; a `citations.js` entry (Meyerhof allowable solved for the blow count, `GOVERNANCE.general`
matching the sibling); `test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js`
(`spt-required-n60` -> `computeSptRequiredN60`); `scripts/related-tiles.mjs` (-> `spt-bearing-capacity` /
`soil-bearing-capacity` / `soil-settlement-elastic` / `footing-area`); `data/search/aliases.json` (5 collision-checked
question aliases: "what spt n60 do i need", "does my boring support the design pressure", ...); the calc-geotech
`GEOTECH_RENDERERS` map entry via the shared `_simpleRenderer` factory (three number fields, a design-rounded N60) and the
id added to the calc-geotech declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated
v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the round-trip through
`computeSptBearingCapacity` across a target/width/depth sweep (both branches), the narrow-footing branch flag, the
higher-pressure-higher-N60 monotonicity, and the error seams. The calc-geotech.js gzip cap (20000 B) is expected to hold.
Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,160 -> 1,161.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> N60 ~20 for 5 ksf under a
6 ft footing 2 ft deep).

## 5. Roadmap position

Pairs the forward SPT tile (`spt-bearing-capacity`, pressure from a blow count) with its inverse (blow count from a target
pressure), completing the sweep-9 inverse queue. Further Group E geotechnical growth stays evidence-driven.
