# roughlogic.com Specification v309 -- Eccentric Footing Bearing Pressure and Kern Check (calc-geotech.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v308..v310 (the geotechnical depth-2 trio -- consolidation
> (v308), the eccentric footing pressure (this spec), the surcharge lateral pressure (v310)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: `retaining-wall-stability` computes toe/heel pressure
> for a wall, but a spread footing under a column carrying axial load plus moment (or an eccentric load) has the same
> trapezoidal-or-triangular pressure problem, and the catalog has no general footing-pressure tile. Whether the resultant
> stays inside the kern -- keeping the whole footing in bearing -- decides the pressure distribution. Adds one tile to the
> existing **`calc-geotech.js`** module (Group E); no new group, trade, or dependency. Inherits spec.md through spec-v308.md.
>
> **The gap, and the evidence for it.** For a rectangular footing (`B` by `L`) under a vertical load `P` at eccentricity
> `e = M/P` about the `B` axis, the bearing pressure is trapezoidal while the resultant stays within the middle-third kern
> (`e <= B/6`): `q = (P/BL)(1 +/- 6e/B)`. Once `e > B/6` the heel lifts and the pressure is a triangle over a reduced
> length, `q_max = 2P/(3L(B/2 - e))`, with `q_min = 0`. For a 60 kip load on an 8 by 8 ft footing at `e = 1 ft` (inside the
> `B/6 = 1.33 ft` kern), `q` runs from `0.23` to `1.64 ksf`; push the eccentricity to `e = 2 ft` (outside the kern) and the
> footing bears on only the front `3(B/2 - e) = 6 ft`, spiking `q_max` to `2.5 ksf` -- the case that overstresses the toe
> and the reason columns are kept concentric. `retaining-wall-stability` does this for a wall; this tile does it for any
> footing.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The footing plan dimensions
`B`, `L` are lengths (ft); the vertical load `P` is a force (kip); the moment `M` is a moment (kip-ft) giving the
eccentricity `e = M/P` (ft); the bearing pressures `q_max`, `q_min` are pressures (ksf); the kern status is categorical. The
v18/v21 contract: any non-finite input, or a dimension or load at or below zero, returns `{ error }`; the tile branches on
`e` versus `B/6`. Citation discipline (v19/v22): `GOVERNANCE.general` over the eccentric-bearing-pressure formulas by name;
`editionNote` names **the middle-third rule `q = (P/BL)(1 +/- 6e/B)` for `e <= B/6` and the resultant-outside-kern
`q_max = 2P/(3L(B/2 - e))`, `q_min = 0` for `e > B/6`, with `e = M/P`**, and states that **this returns the service bearing
pressure distribution under a one-way eccentric or axial-plus-moment load -- it covers uniaxial eccentricity (a biaxial
`ex, ey` load needs the two-way form), assumes a rigid footing on a linear-elastic soil (no soil-model refinement), and does
not check the allowable bearing (`soil-bearing-capacity`), settlement, or the footing's own flexure/shear; and this is a
design aid, not a substitute for a licensed engineer's design** -- the structural/geotechnical engineer of record governs.

## 2. The tile

### 2.1 `footing-eccentric-pressure` -- Eccentric Footing Bearing Pressure and Kern Check

```
inputs:
  P_kip    kip     vertical load
  M_kft    kip-ft  moment about the B axis (or enter e directly)
  B_ft     ft      footing width (eccentricity direction)
  L_ft     ft      footing length

e = M_kft / P_kip
if e <= B_ft/6:  q_max = (P/(B*L))*(1 + 6e/B) ; q_min = (P/(B*L))*(1 - 6e/B) ; kern = "inside"
else:            q_max = 2*P/(3*L*(B/2 - e))  ; q_min = 0 ; bearing_len = 3*(B/2 - e) ; kern = "outside"
```

**Pinned worked example (60 kip on an 8 by 8 ft footing, e = 1 ft, inside the kern).** `P = 60`, `B = L = 8`, `e = 1`
(`B/6 = 1.33`, so `e < B/6`): `P/BL = 60/64 = 0.9375 ksf`; `q_max = 0.9375(1 + 6 x 1/8) = 0.9375 x 1.75 = 1.64 ksf`;
`q_min = 0.9375 x 0.25 = 0.23 ksf` -- the whole footing bears, trapezoidal. **Cross-check (push the eccentricity to
e = 2 ft, outside the kern).** `e = 2 > 1.33`: the heel lifts, the footing bears on the front `3(4 - 2) = 6 ft`, and
`q_max = 2 x 60/(3 x 8 x (4 - 2)) = 120/48 = 2.5 ksf` with `q_min = 0` -- the toe pressure jumps 52% and a third of the
footing goes into no contact, the failure mode a concentric column avoids. The non-finite and non-positive error paths
bracket the result, and the kern branch flips at `e = B/6`.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","carpentry"]`, matching the geotech/footing tiles); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the eccentric-pressure formulas, `editionNote`
naming the middle-third and outside-kern forms, `e = M/P`, and the uniaxial, rigid-footing, not-allowable-bearing caveats);
`test/fixtures/worked-examples.json` (the inside-kern example + the outside-kern cross-check);
`test/fixtures/compute-map.js` (`footing-eccentric-pressure` -> `computeFootingEccentricPressure` in
`../../calc-geotech.js`); `scripts/related-tiles.mjs` (-> `soil-bearing-capacity` / `retaining-wall-stability` /
`footing-area` / `soil-settlement-elastic`); `data/search/aliases.json` ("eccentric footing", "bearing pressure moment",
"kern middle third", "footing pressure distribution", "q max q min footing", "6e over B", "column moment footing", "toe
pressure", "resultant outside kern"); the id appended to the existing geotech renderers block in `app.js`; the `// dims:`
annotation (`P` force, `M` moment, `B`/`L`/`e` length, pressures pressure); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the `e = B/6` branch flip, the outside-kern bearing length, and the
non-positive / non-finite error seams. No new module; re-pin `calc-geotech.js` on the `check:module-sizes` allowlist.
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the kern-branch assertion); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `e` / `q_max` / `q_min` / kern
stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (60 kip, e 1 ft -> 1.64 / 0.23 ksf).

## 5. Roadmap position

Middle of the geotechnical depth-2 batch (v308..v310) in `calc-geotech.js`, generalizing the wall bearing check to any
footing. The surcharge lateral pressure (v310) follows. The biaxial (`ex, ey`) pressure distribution, the effective-width
Meyerhof bearing on `B' = B - 2e`, and a footing-flexure/shear chain into the concrete tiles are the deliberate next
follow-ons once the trio lands.
