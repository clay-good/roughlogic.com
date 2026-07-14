# roughlogic.com Specification v663 -- Dry-Bulb from Enthalpy and Humidity Ratio (calc-hvac.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvac.js`**
> (Group C, HVAC), no new module, group, or dependency. Inherits spec.md through spec-v662.md.
>
> **The gap, and the evidence for it.** The `moist-air-enthalpy` tile (spec-v375) computes enthalpy from the
> dry-bulb and humidity ratio. A psychrometric analysis often gives the enthalpy and W (e.g. a coil leaving state
> after a load calc) but not the dry-bulb directly; recovering it is the reverse. Solving `h = 0.240 t + W (1061 +
> 0.444 t)` for t gives `t = (h - 1061 W) / (0.240 + 0.444 W)`. First-principles; the ASHRAE coefficients
> (0.240, 1061, 0.444) are already in the sibling. The pinned example: an enthalpy of **31.48 Btu/lb** at
> **W 0.0112** recovers an **80 F** dry-bulb.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The enthalpy is
`L^2 T^-2` (Btu/lb dry air), the humidity ratio is `dimensionless`, and the dry-bulb is `T` (F). The 0.240 dry-air
specific heat, the 1061 latent heat at the 0 F datum, and the 0.444 vapor specific heat are the same ones
`moist-air-enthalpy` already uses. The v18/v21 contract (via `_finiteGuardEnv`): a non-finite input or a negative
humidity ratio returns `{ error }`. Citation discipline (v19/v22): the moist-air enthalpy relation solved for the
dry-bulb, the inverse of the moist-air-enthalpy tile, by name; the note states that **t = (h - 1061 W) /
(0.240 + 0.444 W), the humidity ratio comes from the chart or RH, and this returns the dry-bulb of one state (not
the wet-bulb or dew point)** -- a design aid, not a substitute for a measured chart state or equipment ratings.

## 2. The tile

### 2.1 `drybulb-from-enthalpy` -- The Dry-Bulb of an Air State from Its Enthalpy and W

```
inputs:
  enthalpy_btu   Btu/lb dry air   moist-air enthalpy h
  w_lb_lb        lb/lb            humidity ratio W (>= 0)

t_db_f      = (enthalpy_btu - 1061 x w_lb_lb) / (0.240 + 0.444 x w_lb_lb)
h_latent    = w_lb_lb x (1061 + 0.444 x t_db_f)
h_sensible  = enthalpy_btu - h_latent
```

**Pinned worked example.** `h = 31.48 Btu/lb`, `W = 0.0112`: `t = (31.48 - 1061 x 0.0112) / (0.240 + 0.444 x
0.0112) = 19.597 / 0.24497 = ` **80 F** -- the exact inverse of the moist-air-enthalpy example (80 F / W 0.0112 ->
31.48 Btu/lb).
**Cross-check (dry air).** At `W = 0`, `t = h / 0.240`, so `19.2 Btu/lb -> ` **80 F**.
**Cross-check (exact inverse).** The fuzzer feeds the recovered dry-bulb back through `moist-air-enthalpy` at the
same W and confirms it returns the input enthalpy.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, beside `moist-air-enthalpy`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (moist-air enthalpy inverted, the note per §1); `test/fixtures/worked-examples.json`
(the pinned example plus the dry-air cross-check); `test/fixtures/compute-map.js` (`drybulb-from-enthalpy` ->
`computeDrybulbFromEnthalpy`); `scripts/related-tiles.mjs` (<-> `moist-air-enthalpy`, `cooling-coil-total-load`,
`shr-latent`, `wet-bulb-psychrometer`); `data/search/aliases.json` ("drybulb from enthalpy", "temperature from
enthalpy", "dry bulb from enthalpy and humidity ratio", plus question rows, all collision-checked);
`HVAC_RENDERERS["drybulb-from-enthalpy"]` via the `_rEnv` factory (field DOM ids = the input keys) and the id added
to the calc-hvac declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14
corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the example, the exact inverse round-trip through
`computeMoistAirEnthalpy`, the dry-air case, and the error seams. The Group C citation-audit test uses a
lower-bound (`> 20`) count, so no exact-count edit is needed. The two `index.html` home-count spots go
1,111 -> 1,112 (check-readme-counts gates them). The calc-hvac.js gzip cap is expected to hold (verify at build).
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output
read to the value (the pinned example -> 80 F).

## 5. Roadmap position

Completes the moist-air-enthalpy pair: `moist-air-enthalpy` (t + W -> h) and now `drybulb-from-enthalpy` (h + W ->
t), exact inverses through the same ASHRAE enthalpy relation. The W-from-(h, t) direction is a natural future
extension. Further Group C growth stays evidence-driven.
