# roughlogic.com Specification v578 -- Relay Pumping Max Distance (calc-fire.js, Group F, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-fire.js`**
> (Group F, fire-ground engineering); no new module, group, or dependency. Inherits spec.md through spec-v577.md.
>
> **The gap, and the evidence for it.** `reverse-lay-friction` gives the friction loss of a supply lay, but not the
> question a water-supply officer asks when relaying water over a long distance: how far apart can the pumpers be? Relay
> pumping keeps the next pumper's intake at a **20 psi residual** so it does not cavitate, so the usable pressure to push
> water is the supplying pump's max discharge minus that 20 psi minus the elevation lift -- not the whole pump. The
> catch is that the distance falls with the **square** of the flow: doubling the gpm quarters the spacing, which is why
> big water moves on large-diameter hose and more pumpers, not more pressure. The tile takes the target flow, the hose
> size and coefficient, the supplying pump's max discharge, the intake residual, and the elevation change, and returns
> the friction budget, the loss per 100 feet, and the maximum distance between pumpers -- the spacing a relay is laid to.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The flow is a volumetric
flow (`L^3 T^-1`, in gpm); the pressures (max discharge, intake residual, budget, loss per 100 ft) are
`M L^-1 T^-2` (psi); the elevation change and the max distance are lengths (`L`, in ft); the hose coefficient and the
`0.434` constant are `dimensionless`. The v18/v21 contract: any non-finite input, a non-positive flow, hose coefficient,
or max discharge, a non-positive friction budget (the lift and intake already exceed the pump), or a budget that leaves
no distance returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the relay relations by name
(IFSTA Pumping Apparatus D/O); `editionNote` names the **relay pumping maximum distance**, prints
`budget = max_discharge - intake_residual - 0.434 x elevation`, `FL_per_100 = C x (Q / 100)^2`, and
`max_distance = budget / FL_per_100 x 100`, and states that **the next pumper needs a 20 psi residual on its intake or
it cavitates so the usable pressure is the max discharge minus 20 minus the lift not the whole pump, the distance falls
with the square of flow (doubling gpm quarters the spacing, why big water uses large-diameter hose and more pumpers not
more pressure), the elevation term is 0.434 psi per foot, and the SOP and the pump's real capability govern** -- a
planning aid, not incident command.

## 2. The tile

### 2.1 `relay-pump-distance` -- Why Doubling the Flow Quarters the Pumper Spacing

```
inputs:
  target_flow_gpm    gpm   relay flow
  hose_coefficient   -     friction coefficient C for the supply hose (5 in LDH ~0.08)
  max_discharge_psi  psi   supplying pump maximum discharge pressure
  intake_residual_psi psi  residual to hold at the next intake (default 20)
  elevation_ft       ft    elevation gain to the next pumper (negative = downhill)

budget       = max_discharge_psi - intake_residual_psi - 0.434 x elevation_ft     [psi]
FL_per_100   = hose_coefficient x (target_flow_gpm / 100)^2                        [psi/100 ft]
max_distance = budget / FL_per_100 x 100                                           [ft]
```

**Pinned worked example (800 gpm through 5 in LDH at C = 0.08, a 200 psi pump, 20 psi intake, 10 ft uphill).** The
usable budget is `200 - 20 - 0.434 x 10 = 200 - 20 - 4.3 = 175.7 psi`, the friction loss is
`0.08 x (800/100)^2 = 0.08 x 64 = 5.1 psi per 100 ft`, so the pumpers can be `175.7 / 5.1 x 100 = ` **3,431 ft** apart
-- a long relay leg. **Cross-check (doubling the flow quarters the spacing).** Push `1,600 gpm` through the same hose:
the friction loss quadruples to `0.08 x 16^2 = 20.5 psi per 100 ft`, so the spacing collapses to
`175.7 / 20.5 x 100 = ` **858 ft** -- a quarter of the distance for double the flow, the square-law reason more water
needs more pumpers, not more pressure. The tile returns the friction budget, the loss per 100 feet, and the maximum
distance.

## 3. Wiring

A `tools-data.js` row (group `F`, trades `["fire"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 800 gpm example + the 1,600 gpm
cross-check); `test/fixtures/compute-map.js` (`relay-pump-distance` -> `computeRelayPumpDistance` in
`../../calc-fire.js`); `scripts/related-tiles.mjs` (-> `reverse-lay-friction` / `pdp` / `standpipe-pdp`);
`data/search/aliases.json` ("relay pumping", "relay distance", "pumper spacing", "20 psi intake residual", "supply line
relay", "ldh relay", "max distance relay", "water supply relay"); the id appended to the fire renderers declare in
`app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples, the budget relation, the Q-squared friction loss, the distance quartering, the elevation term, and the error
seams (non-finite, non-positive flow / C / discharge, non-positive budget). Hand-writes its renderer (mirroring the
calc-fire.js `reverse-lay-friction` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the budget / FL / distance stack wraps on a phone); render-no-nan + a11y on the new tile, output
read to the value (the 800 gpm example -> 3,431 ft).

## 5. Roadmap position

Adds the relay spacing beside `reverse-lay-friction` (the single-lay loss) and the PDP tiles. A multi-pumper relay
layout (total distance divided into equal legs) and a maximum-flow-for-a-fixed-distance solver are deliberate future
follow-ons. Further Group F growth stays evidence-driven.
