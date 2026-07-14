# roughlogic.com Specification v710 -- Allowable Bearing Pressure for a Settlement Limit (calc-geotech.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-geotech.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v709.md. Sweep-9 inverse queue.
>
> **The gap, and the evidence for it.** The single-mode `soil-settlement-elastic` tile runs the theory-of-elasticity
> settlement forward: from a contact pressure it returns the immediate settlement. The design question is the inverse --
> **the largest pressure that keeps settlement within a limit**. From `Se = q B (1 - nu^2) Is / Es`, solving for the
> pressure (with the width fixed) gives `q = Se Es / (B (1 - nu^2) Is)`. The number this settles: a **6 ft** footing on
> **Es = 250 ksf** soil holds **~4.65 ksf** at a 1 in settlement limit; a 12 ft footing only ~2.33 ksf.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`soil-settlement-elastic` sibling: the settlement limit and width are `L`, the modulus and returned pressure are
`M L^-1 T^-2`, and nu and Is are dimensionless. The v18/v21 contract: any non-finite input, a non-positive settlement
limit, width, modulus, or influence factor, or a Poisson's ratio outside [0, 0.5) returns `{ error }`. Citation discipline
(v19/v22): the elastic-settlement relation solved for the pressure, `GOVERNANCE.general` matching the sibling, citing
Bowles; the note states that **a wider footing settles more so the allowable pressure falls as B grows, this is a
settlement (serviceability) limit and not the bearing-capacity strength limit (a separate check), it is immediate (not
consolidation) settlement on one homogeneous modulus with no embedment correction, and the geotechnical engineer of
record's report governs**.

## 2. The tile

### 2.1 `elastic-settlement-allowable-pressure` -- Allowable Bearing Pressure for a Settlement Limit

```
inputs:
  settlement_limit_in   L             immediate-settlement limit (in, > 0, default 1)
  b_ft                  L             footing width (> 0)
  es_ksf                M L^-1 T^-2   soil elastic modulus (> 0)
  nu                    dimensionless Poisson's ratio ([0, 0.5), default 0.3)
  is_f                  dimensionless shape/rigidity influence factor (> 0, default 0.82)

Se_ft = settlement_limit_in / 12
q_ksf = Se_ft x es_ksf / (b_ft x (1 - nu^2) x is_f)
```

**Pinned worked example.** limit = 1 in, B = 6 ft, Es = 250 ksf, nu = 0.3, Is = 0.82:
`Se_ft = 0.0833`, `q = 0.0833 x 250 / (6 x 0.91 x 0.82) = 20.83 / 4.477 = ` **4.65 ksf**; feeding 4.65 ksf back through
`soil-settlement-elastic` returns a 1.00 in settlement, the limit. Doubling the width to 12 ft halves the allowable
pressure to ~2.33 ksf.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","carpentry"]`) placed beside `soil-settlement-elastic` (Group E
is un-audited); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (elastic-settlement relation solved for the
pressure, `GOVERNANCE.general` matching the sibling); `test/fixtures/worked-examples.json` (the pinned example);
`test/fixtures/compute-map.js` (`elastic-settlement-allowable-pressure` -> `computeElasticSettlementAllowablePressure`);
`scripts/related-tiles.mjs` (-> `soil-settlement-elastic` / `soil-bearing-capacity` / `footing-area` /
`soil-consolidation-settlement`); `data/search/aliases.json` (5 collision-checked question aliases: "allowable pressure
for 1 inch settlement", "settlement based allowable bearing", ...); the calc-geotech `GEOTECH_RENDERERS` map entry via the
shared `_simpleRenderer` factory (five number fields) and the id added to the calc-geotech declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the example, the round-trip through `computeSoilSettlementElastic` across a
limit/width/modulus sweep, the wider-footing-lower-pressure monotonicity, and the error seams. The calc-geotech.js gzip
cap (raised to 20000 B in spec-v706) is expected to hold. Verify at build, including `check-shells`. Lazy-loaded, absent
from home first paint. Home tile count 1,158 -> 1,159.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 4.65 ksf for a 1 in limit
under a 6 ft footing on Es 250 ksf soil).

## 5. Roadmap position

Pairs the forward settlement tile (`soil-settlement-elastic`, settlement from a pressure) with its inverse (pressure from
a settlement limit), the two halves of the serviceability-sizing question, and complements the strength-based
`soil-bearing-capacity`. Further Group E geotechnical growth stays evidence-driven.
