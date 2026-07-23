# roughlogic.com Specification v1013 -- Soil Vertical Total and Effective Stress (calc-geotech.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-23). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-geotech.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v1012.md. Beside `liquefaction-screening`, its
> main consumer.
>
> **The gap, and the evidence for it.** `computeSoilPhaseRelations` declares it directly
> (`calc-earthwork.js:1696`): "it does not compute the permeability, **the effective stress**, or the compaction
> relative density." But the stronger evidence is structural: **three tiles in this module consume effective stress as
> a hand-entered input and nothing in the catalog produces it.** `liquefaction-screening` takes "Total vertical stress
> (psf)" and "Effective vertical stress (psf)" as fields and even guards `sigma'_v <= sigma_v` -- it knows the
> relationship and still makes the user do the arithmetic. `soil-consolidation-settlement` and
> `computeSettlementLimitLoad` both take "Initial effective stress at mid-layer (psf)". Alias-index, compute-map, and
> nearest-sibling-output checks confirmed no producer: `computeSubmergedEarthPressure` returns LATERAL thrust,
> `computeSoilPhaseRelations` returns void ratio and porosity but no stress.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `// dims:` annotation above the compute), worked-example registry, bounds-fuzzer, and
reviewer-signoff apply. The v18/v21 contract: a non-finite input, a non-positive moist unit weight or depth, a
negative water-table depth or surcharge, or a saturated unit weight at or below `gamma_w` returns `{ error }` -- the
last of these is physically impossible and is rejected rather than allowed to produce a negative buoyant weight. The
module's existing `_GAMMA_W = 62.4` constant and its established error wording are reused. Citation discipline
(v19/v22): Terzaghi's effective-stress principle and the hydrostatic profile as compiled in Das and NAVFAC DM-7.01, by
name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `soil-vertical-effective-stress` -- Soil Vertical Total and Effective Stress (Terzaghi)

```
inputs:
  gamma_moist_pcf       moist unit weight above the water table (pcf), default 120
  gamma_sat_pcf         saturated unit weight below the table (pcf), default 125
  depth_ft              depth of interest z (ft)
  water_table_depth_ft  depth to the water table (ft; >= z means a dry profile)
  surcharge_psf         uniform surface surcharge (psf, 0 = none)

z_dry     = min(z, z_wt)
z_sub     = max(0, z - z_wt)
sigma_v   = q + gamma_moist x z_dry + gamma_sat x z_sub
u         = gamma_w x z_sub                       (gamma_w = 62.4 pcf)
sigma'_v  = sigma_v - u
gamma_buoy = gamma_sat - gamma_w
```

**Zero recalled constants.** The only constant is `gamma_w = 62.4 pcf`, already defined as `_GAMMA_W` in this module
and used identically by the submerged-earth-pressure tile. Everything else is user input or first-principles algebra.

**Pinned worked example.** 120 pcf moist / 125 pcf saturated, water table at 10 ft, depth 20 ft:
`sigma_v = 120x10 + 125x10 = ` **2,450 psf**; `u = 62.4x10 = ` **624 psf**; `sigma'_v = ` **1,826 psf**;
buoyant weight **62.6 pcf**. Independent cross-check by the buoyant route: `120x10 + 62.6x10 = ` **1,826 psf**,
identical. Cross-check with the table at the surface: `sigma_v = 2,500`, `u = 1,248`, `sigma'_v = ` **1,252 psf**,
which is exactly `62.6 x 20` -- the buoyant weight alone.

**Invariant pinned in the fuzzer.** `liquefaction-screening` rejects `sigma'_v > sigma_v`. This tile must therefore
never produce that, so the fuzzer sweeps the water table across six positions (0, 3, 10, 19.9, 20, 50 ft) and asserts
`sigma'_v <= sigma_v`, `sigma'_v > 0`, and `u >= 0` at every one. It also asserts that a surcharge raises the total
and effective stress by exactly the same amount while leaving `u` untouched, since a surface load adds no pore
pressure.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction"]`, beside `liquefaction-screening`); a `tile-meta.js`
`_TILES` entry (`E`); a `citations.js` entry (four assumptions, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the table-at-surface cross-check);
`test/fixtures/compute-map.js` (`soil-vertical-effective-stress` -> `computeSoilVerticalEffectiveStress`);
`scripts/related-tiles.mjs` (-> `liquefaction-screening` / `soil-consolidation-settlement` /
`submerged-earth-pressure` / `soil-bearing-capacity`, all verified to exist); `data/search/aliases.json` (5
collision-checked search aliases plus 3 question-corpus phrases), then `node scripts/build-alias-shards.mjs`; the tile
is rendered by the `_simpleRenderer` factory in `GEOTECH_RENDERERS` (this module has one, so the renderer is
statically gated); the id added to the calc-geotech declare list in `app.js`; the `// dims:` annotation directly above
the compute; a `bounds-fuzzer.test.js` block; regenerated v14 corpus + tile-index + citation-strings. Home tile count
1,461 -> 1,462.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
worked-examples runner; render + output read to the value (20 ft, table at 10 ft -> 2,450 / 624 / 1,826 psf).

## 5. Roadmap position

Turns three tiles that demanded a hand-computed input into a connected workflow: compute the profile here, feed the
total and effective values into `liquefaction-screening` and the effective value into `soil-consolidation-settlement`.
Serves the foundation contractor and the plan reviewer. Deliberately the hydrostatic, level-ground, uniform-layer
case; seepage gradients, artesian head, capillary rise, layered profiles with more than one soil, and
overconsolidation stay separate. Sixth tile landed by reading an existing tile's self-declared limitations, and the
first found primarily through the second signal -- **an input several tiles demand that nothing produces**. See
spec-v1008 through spec-v1012.
