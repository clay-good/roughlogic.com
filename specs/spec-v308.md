# roughlogic.com Specification v308 -- Primary Consolidation Settlement of Normally-Consolidated Clay (calc-geotech.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.109.0; proposed 2026-07-02). Batch spec-v308..v310 (the geotechnical depth-2 trio -- the settlement
> and pressure cases the first geotech batch deferred: primary consolidation of clay (this spec, the time-dependent
> settlement `soil-settlement-elastic` names as separate), the eccentric footing bearing pressure (v309), and the surcharge
> lateral pressure on a wall (v310).)**
> In-scope catalog expansion under the spec-v106 trades-only charter: `soil-settlement-elastic` gives the immediate elastic
> settlement, but on a saturated clay the settlement that matters is the slow primary consolidation as water squeezes out --
> a different, larger, time-dependent movement the elastic tile explicitly excludes. Adds one tile to the existing
> **`calc-geotech.js`** module (Group E); no new group, trade, or dependency. Inherits spec.md through spec-v307.md.
>
> **The gap, and the evidence for it.** For a normally-consolidated clay layer, the primary consolidation settlement is
> `Sc = (Cc H / (1 + e0)) log10((sigma'0 + d_sigma) / sigma'0)`, where `Cc` is the compression index, `H` the layer
> thickness, `e0` the initial void ratio, `sigma'0` the initial effective overburden at mid-layer, and `d_sigma` the stress
> increase from the new load. For a 10 ft clay layer with `Cc = 0.25`, `e0 = 0.90`, `sigma'0 = 2,000 psf`, under a
> `d_sigma = 1,000 psf` footing load, `Sc = (0.25 x 10 / 1.90) log10(3,000/2,000) = 1.316 x 0.176 = 0.232 ft = 2.8 in` --
> the long-term settlement that governs a foundation on clay, several times the immediate elastic value and the reason a
> building on soft clay keeps moving for years. `soil-settlement-elastic` gives the instant dip; this tile gives the slow
> sag.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The layer thickness `H` is a
length (ft); the initial effective stress `sigma'0` and stress increase `d_sigma` are pressures (psf); the compression index
`Cc` and initial void ratio `e0` are dimensionless; the settlement `Sc` is a length (reported in inches). The v18/v21
contract: any non-finite input, or a thickness, stress, or `(1 + e0)` at or below zero, returns `{ error }`. Citation
discipline (v19/v22): `GOVERNANCE.general` over the Terzaghi primary-consolidation equation by name; `editionNote` names
**the normally-consolidated primary consolidation `Sc = (Cc H/(1 + e0)) log10((sigma'0 + d_sigma)/sigma'0)`, the compression
index `Cc` (often `~0.009(LL - 10)` for remolded clay), and that an overconsolidated clay uses the recompression index `Cr`
below the preconsolidation stress, as compiled in the Das and NAVFAC references**, and states that **this returns the
primary consolidation settlement of a single normally-consolidated clay layer -- it is not the immediate elastic settlement
(`soil-settlement-elastic`) or the secondary (creep) settlement, assumes the clay is normally consolidated (an OC clay with
`sigma'0 + d_sigma` straddling the preconsolidation stress needs the two-part `Cr`/`Cc` form), uses one representative
mid-layer stress (sublayer the profile for accuracy), and gives no time rate (that needs the coefficient of consolidation);
and this is a design aid, not a substitute for a geotechnical engineer's report** -- the geotechnical engineer of record's
report governs.

## 2. The tile

### 2.1 `soil-consolidation-settlement` -- Primary Consolidation Settlement (NC Clay)

```
inputs:
  Cc        -      compression index
  H_ft      ft     clay layer thickness
  e0        -      initial void ratio
  sig0_psf  psf    initial effective overburden at mid-layer
  dsig_psf  psf    stress increase from the load at mid-layer

Sc_ft = (Cc * H_ft / (1 + e0)) * log10((sig0_psf + dsig_psf) / sig0_psf)
Sc_in = Sc_ft * 12
```

**Pinned worked example (a 10 ft NC clay, Cc = 0.25, e0 = 0.90, sigma'0 = 2,000 psf, d_sigma = 1,000 psf).**
`Sc = (0.25 x 10 / 1.90) log10(3,000/2,000) = 1.316 x log10(1.5) = 1.316 x 0.1761 = 0.232 ft = 2.78 in`. **Cross-check
(double the load increment to 2,000 psf).** `Sc = 1.316 x log10(4,000/2,000) = 1.316 x 0.3010 = 0.396 ft = 4.75 in` -- not
double, because settlement grows with the log of the stress ratio, not the stress itself, the diminishing-return behavior
that makes the first increment of load the costly one. The non-finite and non-positive error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","carpentry"]`, matching `soil-settlement-elastic`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the primary-consolidation equation,
`editionNote` naming `Sc = (Cc H/(1+e0)) log10((sig0+dsig)/sig0)`, the `Cc`/`Cr` distinction, and the NC-only, single-layer,
no-time-rate caveats); `test/fixtures/worked-examples.json` (the base example + the doubled-load cross-check);
`test/fixtures/compute-map.js` (`soil-consolidation-settlement` -> `computeSoilConsolidationSettlement` in
`../../calc-geotech.js`); `scripts/related-tiles.mjs` (-> `soil-settlement-elastic` / `soil-bearing-capacity` /
`pile-axial-capacity` / `footing-area`); `data/search/aliases.json` ("consolidation settlement", "primary consolidation",
"clay settlement", "compression index", "Cc settlement", "void ratio settlement", "long term settlement", "Terzaghi
consolidation", "settlement of clay"); the id appended to the existing geotech renderers block in `app.js`; the `// dims:`
annotation (`H`/`Sc` length, stresses pressure, `Cc`/`e0` dimensionless); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the log-of-stress-ratio behavior, and the non-positive / non-finite
error seams. No new module; re-pin `calc-geotech.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home
first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the log-ratio assertion); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `Sc_ft` / `Sc_in` pair wraps on a phone);
render-no-nan + a11y sweep, output read to the value (10 ft clay, d_sigma 1,000 -> 2.78 in).

## 5. Roadmap position

Opens the geotechnical depth-2 batch (v308..v310) in `calc-geotech.js`, closing the consolidation gap
`soil-settlement-elastic` names. The eccentric footing pressure (v309) and surcharge lateral pressure (v310) follow. The
overconsolidated two-part `Cr`/`Cc` case, the time-rate `U`-vs-`Tv` consolidation curve, and secondary (creep) settlement
are the deliberate next follow-ons once the trio lands.
