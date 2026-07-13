# roughlogic.com Specification v648 -- Allowable Load for a Settlement Limit (calc-geotech.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-geotech.js`**
> (Group E, construction/geotech), no new module, group, or dependency. Inherits spec.md through spec-v647.md.
>
> **The gap, and the evidence for it.** The `soil-consolidation-settlement` tile (spec-v308) computes the primary
> settlement Sc from a load-induced stress increase. The design question is the reverse: "my allowable settlement
> is 2 inches -- what is the largest load increment the clay can take?" That is the same Terzaghi relation solved
> for `d_sigma`: `d_sigma = sigma'0 (10^(Sc(1 + e0)/(Cc H)) - 1)`. Every constant already lives in the sibling. The
> pinned example: to hold a 10 ft NC clay (Cc 0.25, e0 0.90, sigma'0 2,000 psf) to a **2 in** settlement, the
> maximum added stress is **677 psf**; tighten the limit to 1 in and only **314 psf** is allowed -- because
> settlement grows with the log of the stress ratio, a tighter limit allows disproportionately less load.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The allowable
settlement is `L` (in), the layer thickness is `L`, the compression index and void ratio are `dimensionless`, the
initial effective stress and the stress increment are `M L^-1 T^-2` (psf), and the stress ratio is `dimensionless`.
The Terzaghi relation is the same one `soil-consolidation-settlement` already uses. The v18/v21 contract: any
non-finite input, a non-positive settlement, compression index, thickness, or initial stress, or a void ratio
giving a non-positive `(1 + e0)` returns `{ error }`. Citation discipline (v19/v22): the primary-consolidation
relation solved for the load, the inverse of the settlement tile, by name; the note states that **d_sigma =
sigma'0 (10^(Sc(1 + e0)/(Cc H)) - 1), settlement grows with the log of the stress ratio so a tighter limit allows
disproportionately less load, this is a single normally-consolidated layer at one mid-layer stress, and it is not
the elastic settlement, secondary creep, or the time rate** -- a design aid, not a substitute for the geotechnical
engineer of record.

## 2. The tile

### 2.1 `settlement-limit-load` -- The Maximum Load Increment for an Allowable Settlement

```
inputs:
  sc_allow_in   in     allowable primary settlement (> 0)
  cc            -       compression index Cc (> 0)
  h_ft          ft      clay layer thickness H (> 0)
  e0            -       initial void ratio (1 + e0 > 0)
  sig0_psf      psf     initial effective stress at mid-layer (> 0)

Sc_ft        = sc_allow_in / 12
stress_ratio = 10^(Sc_ft (1 + e0) / (Cc H))
d_sigma      = sig0_psf x (stress_ratio - 1)                [psf]
final_stress = sig0_psf + d_sigma                           [psf]
```

**Pinned worked example.** `Sc_allow = 2 in`, `Cc = 0.25`, `H = 10 ft`, `e0 = 0.90`, `sigma'0 = 2,000 psf`:
`stress_ratio = 10^((2/12)(1.90)/(0.25 x 10)) = 10^0.1267 = 1.339`, so `d_sigma = 2000 x 0.339 = ` **677 psf**.
**Cross-check (tighter limit, disproportionately less load).** At `Sc_allow = 1 in`: `d_sigma = ` **314 psf** --
halving the settlement limit allows well under half the load, the log-ratio signature.
**Cross-check (exact inverse of the settlement tile).** The fuzzer feeds the returned 677 psf back through
`soil-consolidation-settlement` and recovers the 2 in settlement, and round-trips the settlement tile's own example
(2.7804 in -> 1,000 psf).

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction"]`, beside `soil-consolidation-settlement`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (Terzaghi inverted for the load, Das / NAVFAC, the note per
§1); `test/fixtures/worked-examples.json` (the pinned example plus the tighter-limit cross-check);
`test/fixtures/compute-map.js` (`settlement-limit-load` -> `computeSettlementLimitLoad`); `scripts/related-tiles.mjs`
(<-> `soil-consolidation-settlement`, `consolidation-time-rate`, the bearing/settlement tiles);
`data/search/aliases.json` ("settlement limit load", "allowable surcharge for settlement", "max stress for a
settlement limit", plus question rows, all collision-checked); `GEOTECH_RENDERERS["settlement-limit-load"]` via the
`_simpleRenderer` factory (field DOM ids = the input keys) and the id added to the calc-geotech declare list in
`app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning the example, the exact inverse round-trip through
`computeSoilConsolidationSettlement`, the tighter-limit-less-load property, and the error seams. The two
`index.html` home-count spots go 1,096 -> 1,097 (check-readme-counts gates them). The calc-geotech.js gzip cap is
expected to hold (verify at build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output
read to the value (the pinned example -> 677 psf, stress ratio 1.339).

## 5. Roadmap position

Completes the consolidation design pair: `soil-consolidation-settlement` (load -> settlement) and now
`settlement-limit-load` (settlement limit -> load), exact inverses through the same Terzaghi relation, and a
companion to `consolidation-degree` / `consolidation-time-rate` on the time side. Further Group E growth stays
evidence-driven.
