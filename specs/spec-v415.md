# roughlogic.com Specification v415 -- SPT Allowable Bearing on Sand (Meyerhof) (calc-geotech.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-04, 0.145.0; proposed 2026-07-03). Second tile of the geotechnical settlement/foundation trio (v414 consolidation time ->
> v415 SPT bearing -> v416 liquefaction screening). `soil-bearing-capacity` gives the shear-strength (Vesic) bearing from
> `c` and `phi`; on sand, settlement governs, and this tile gives the settlement-limited allowable bearing straight from the
> SPT blow count -- the number a field engineer actually has.**
> In-scope catalog expansion under the spec-v106 trades-only charter. On granular soil a footing rarely fails in shear;
> settlement controls. Meyerhof's SPT relations give the allowable bearing for a `1 in` settlement directly from the
> corrected blow count `N60`: `qa = N60/4` (ksf) for `B <= 4 ft` and `qa = (N60/6)*((B+1)/B)^2` for `B > 4 ft`, with a depth
> factor `Kd = 1 + 0.33*D/B <= 1.33`. `soil-bearing-capacity` is the c-phi shear solution, which explicitly notes settlement
> governs on sand and is separate; this is that separate branch. This adds the SPT-bearing tile to the existing
> **`calc-geotech.js`** module (Group E); no new group, trade, or dependency. Inherits spec.md through spec-v414.md.
>
> **The gap, and the evidence for it.** A `6 ft`-wide footing on sand with `N60 = 20` has
> `qa = (20/6)*((6+1)/6)^2 = 4.54 ksf` for a 1 in settlement; at `D = 2 ft` embedment the depth factor
> `Kd = 1 + 0.33*2/6 = 1.11` raises it to `5.04 ksf`. A narrow `3 ft` footing uses the other branch, `qa = 20/4 = 5.00 ksf`.
> No tile does this; `soil-bearing-capacity` gave the shear capacity but not the settlement-limited value that governs on
> sand.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The corrected blow count `N60`
is dimensionless; the footing width `B` and embedment depth `D` are lengths (ft); the allowable bearing is a pressure (ksf).
The v18/v21 contract: any non-finite input, or a non-positive `N60`, `B`, or `D`, returns `{ error }`; the tile selects the
`B <= 4 ft` or `B > 4 ft` branch, applies the depth factor capped at `1.33`, and reports the base and depth-adjusted
allowable bearing. Citation discipline (v19/v22): `GOVERNANCE.general` over the Meyerhof SPT bearing by name; `editionNote`
names **Meyerhof (1965) settlement-limited bearing on granular soil, `qa = N60/4` (ksf) for `B <= 4 ft`,
`qa = (N60/6)*((B+1)/B)^2` for `B > 4 ft`, the depth factor `Kd = 1 + 0.33*D/B <= 1.33`, the basis of a `1 in` (25 mm)
settlement, and `N60` the energy-corrected blow count**, and states that **this returns the settlement-limited allowable
bearing on sand, that it is conservative (Bowles revised it upward by about 50%), that shear capacity is a separate check
(`soil-bearing-capacity`), and that it is a design aid, not a substitute for the geotechnical engineer**.

## 2. The tile

### 2.1 `spt-bearing-capacity` -- SPT Allowable Bearing on Sand (Meyerhof)

```
inputs:
  n60      -    energy-corrected SPT blow count
  b_ft     ft   footing width
  d_ft     ft   embedment depth

qa_base = (b_ft <= 4) ? n60/4 : (n60/6)*((b_ft+1)/b_ft)^2      ksf   (1 in settlement)
kd      = min(1 + 0.33*d_ft/b_ft, 1.33)
qa      = qa_base * kd                                          ksf
```

**Pinned worked example (N60 20, B 6 ft, D 2 ft).** `qa_base = (20/6)*((7)/6)^2 = 4.54 ksf`;
`Kd = 1 + 0.33*2/6 = 1.11`; `qa = 4.54*1.11 = 5.04 ksf`. **Cross-check (a narrow footing).** At `B = 3 ft` the small-footing
branch gives `qa_base = 20/4 = 5.00 ksf`. A non-positive `N60`, `B`, or `D` takes the error path; the non-finite seam is
covered.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "carpentry"]`, beside `soil-bearing-capacity`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, Meyerhof SPT bearing, `editionNote` naming the two-branch
`qa`, the `Kd` depth factor, the 1 in settlement basis, and the conservatism note); `test/fixtures/worked-examples.json`
(the wide-footing example + the narrow-footing cross-check); `test/fixtures/compute-map.js` (`spt-bearing-capacity` ->
`computeSptBearingCapacity` in `../../calc-geotech.js`); `scripts/related-tiles.mjs` (-> `soil-bearing-capacity` /
`soil-settlement-elastic` / `consolidation-time-rate` / `footing-area`); `data/search/aliases.json` ("spt bearing
capacity", "meyerhof bearing", "allowable bearing sand", "N60 bearing", "settlement bearing sand", "spt allowable
pressure", "footing on sand", "blow count bearing", "granular bearing capacity"); the id appended to the existing geotech
renderers block in `app.js`; the `// dims:` annotation (N60 dimensionless, B/D length, qa pressure); regenerated v14 corpus
+ tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the branch switch, the `Kd` cap, and the non-positive /
non-finite error seams. No new module; re-pin `calc-geotech.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent
from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the branch/cap assertions, the error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the qa output wraps on a phone); render-no-nan +
a11y sweep, output read to the value (N60 20, B 6, D 2 -> 5.04 ksf).

## 5. Roadmap position

The middle of the geotechnical trio: `consolidation-time-rate` (v414) times a clay's settlement while this tile gives a
sand's settlement-limited bearing, and `liquefaction-screening` (v416) checks that sand for seismic collapse. An N-value
overburden correction (`N1`)60 and a raft/mat bearing extension are the deliberate next follow-ons.
