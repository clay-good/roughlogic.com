# roughlogic.com Specification v398 -- Cooling-System Coolant Flow for a Heat Load (calc-mechanic.js, Group K, 1 New Tile)

> **Status: LANDED (2026-07-04, 0.139.0; proposed 2026-07-03). Third and final tile of the fluid-power / cooling trio (v396 pump drive HP -> v397 motor
> torque and speed -> v398 coolant flow). Every engine, hydraulic power unit, and oil cooler makes heat that a coolant loop
> must carry away; this tile sizes the required flow from the heat rejection and the allowed temperature rise.**
> In-scope catalog expansion under the spec-v106 trades-only charter. To carry a heat load `Q` at a temperature rise `dT`
> across a radiator or heat exchanger, a coolant loop needs a flow of `GPM = Q / (c * dT)`, where the flow constant `c` is
> about `500` for water (`60 min/hr * 8.34 lb/gal * 1.0 Btu/lb-F`) and drops to roughly `427` for a `50/50` ethylene-glycol
> mix, so a glycol system needs more flow for the same duty. `brake-pad-life` handles rotor thermal capacity, but nothing
> sizes a coolant loop. This adds the coolant-flow tile to the existing **`calc-mechanic.js`** module (Group K); no new
> group, trade, or dependency. Inherits spec.md through spec-v397.md.
>
> **The gap, and the evidence for it.** An engine rejecting `150,000 Btu/hr` to its coolant at a `10 deg F` rise needs
> `GPM = 150000 / (500 * 10) = 30 GPM` of water. Switch to a `50/50` glycol mix (`c ~= 427`) and the same duty needs
> `150000 / (427 * 10) = 35 GPM` -- about `17%` more flow, the reason glycol systems run bigger pumps. No tile does this; a
> mechanic sizing a pump, radiator, or oil cooler had no flow number.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The heat rejection `Q` is a
power (Btu/hr); the temperature rise `dT` is a temperature difference (deg F, dim T); the coolant flow is a volumetric flow
(GPM). The v18/v21 contract: any non-finite input, or a non-positive `Q` or `dT`, returns `{ error }`; the flow constant is
selectable between water (`500`) and `50/50` glycol (`427`, with a note that the exact value shifts with mix and
temperature), and the tile reports the required flow for the chosen coolant and the water baseline. Citation discipline
(v19/v22): `GOVERNANCE.general` over the sensible-heat coolant-flow relation by name; `editionNote` names **the relation
`GPM = Q / (c * dT)`, the water constant `c ~= 500` (`60 * 8.34 * 1.0`), the `50/50` ethylene-glycol constant `c ~= 427`
(lower specific heat and higher density), and `dT` the coolant temperature rise across the load**, and states that **this
returns the coolant flow to carry a heat load at a target rise, that engine jacket heat is roughly one-third of the fuel
energy (about `2545 Btu/hr` per output horsepower as a rough check), and that it is a sizing aid, not a substitute for the
radiator, pump, and coolant manufacturer data**.

## 2. The tile

### 2.1 `cooling-system-flow` -- Cooling-System Coolant Flow for a Heat Load

```
inputs:
  q_btuh    Btu/hr   heat rejection to the coolant
  dt_f      F        coolant temperature rise across the load
  coolant   -        water (c=500) | glycol50 (c=427)

gpm = q_btuh / (c * dt_f)
```

**Pinned worked example (150,000 Btu/hr, 10 deg F rise, water).** `GPM = 150000 / (500 * 10) = 30 GPM`.
**Cross-check (50/50 glycol).** The same duty at `c = 427` needs `150000 / (427 * 10) = 35 GPM`, about `17%` more flow.
Tightening the allowed rise to `5 deg F` doubles the water flow to `60 GPM` -- less rise, more pump. A non-positive heat load
or temperature rise takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic"]`, beside `brake-pad-life` / `hydraulic-motor-torque-speed`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, coolant-flow relation, `editionNote` naming
`GPM = Q/(c*dT)`, the water and glycol constants, and the per-horsepower rejection check); `test/fixtures/worked-examples.json`
(the water example + the glycol cross-check); `test/fixtures/compute-map.js` (`cooling-system-flow` ->
`computeCoolingSystemFlow` in `../../calc-mechanic.js`); `scripts/related-tiles.mjs` (-> `hydraulic-pump-horsepower` /
`hydraulic-motor-torque-speed` / `fuel-range` / `hydronic-gpm-deltat`); `data/search/aliases.json` ("cooling system flow",
"coolant flow gpm", "radiator flow", "engine cooling gpm", "heat rejection coolant", "oil cooler flow", "glycol coolant
flow", "500 gpm delta t coolant", "cooling loop sizing"); the id appended to the existing mechanic renderers block in
`app.js`; the `// dims:` annotation (Q power, dT temperature, GPM flow); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the water/glycol constant switch, and the non-positive / non-finite
error seams. No new module; re-pin `calc-mechanic.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home
first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the coolant-constant switch, the error paths); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the required-flow output wraps on a
phone); render-no-nan + a11y sweep, output read to the value (150,000 Btu/hr, 10 F, water -> 30 GPM).

## 5. Roadmap position

Closes the fluid-power / cooling trio: v396 sizes the pump drive, v397 the motor it drives, and v398 the coolant loop that
carries away the heat those systems make. An engine-heat-rejection-from-horsepower tile (the third of the fuel-energy split)
and a radiator air-side sizing companion are the deliberate next follow-ons.
