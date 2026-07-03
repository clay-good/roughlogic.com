# roughlogic.com Specification v350 -- PV Cell Temperature and Temperature-Derated Power (calc-solar.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.123.0). Batch spec-v350..v352 (the PV design trio -- the module-performance and
> protection numbers the string-sizing and energy tiles never compute: the cell temperature and its power derate (this
> spec), the performance ratio from stacked losses (v351), and the PV source-circuit fuse sizing (v352).)**
> In-scope catalog expansion under the spec-v106 trades-only charter: `pv-string-sizing` corrects voltage for cold and
> `pv-energy-yield` rolls temperature into a lumped performance ratio, but neither computes the operating cell temperature
> or the power a hot module actually makes -- the single biggest real-world loss in a PV array, and the number that explains
> why a rooftop array underperforms its nameplate on a July afternoon. Adds one tile to the existing **`calc-solar.js`**
> module (Group A); no new group, trade, or dependency. Inherits spec.md through spec-v349.md.
>
> **The gap, and the evidence for it.** A module runs hotter than the air by an amount set by its NOCT (nominal operating
> cell temperature) and the irradiance: `T_cell = T_amb + (NOCT - 20) x G/800`, with `G` the plane-of-array irradiance in
> W/m^2. Its maximum power then derates from the STC rating by the power temperature coefficient `gamma` (about
> `-0.35%/degC`): `P = P_stc x (1 + gamma x (T_cell - 25))`. For a 400 W module at `T_amb = 30 degC`, `G = 800 W/m^2`,
> `NOCT = 45 degC`, the cell runs at `30 + 25 x 800/800 = 55 degC`, and the power falls to `400 x (1 - 0.0035 x 30) = 358 W`
> -- a 10.5% heat loss the nameplate never shows. On a cool `10 degC` morning the same module makes `386 W`, the reason PV
> arrays peak in spring, not midsummer. `pv-string-sizing` handles the cold-voltage limit; this tile handles the hot-power
> loss.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The ambient and cell
temperatures and NOCT are temperatures (degC); the irradiance `G` is a power per area (W/m^2); the STC and operating powers
are powers (W); the power temperature coefficient `gamma` is a per-degC fraction (negative); the loss is a dimensionless
percentage. The v18/v21 contract: any non-finite input, or an irradiance or STC power at or below zero, returns
`{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the cell-temperature and power-derate relations by
name; `editionNote` names **the NOCT cell temperature `T_cell = T_amb + (NOCT - 20) x G/800`, the power derate
`P = P_stc x (1 + gamma x (T_cell - 25))`, the typical `gamma ~ -0.30 to -0.45%/degC` (crystalline silicon), and the
STC/NOCT reference conditions**, and states that **this returns the operating cell temperature and derated power -- it uses
the NOCT thermal model (the more detailed Sandia/faiman models add wind speed and mounting), the entered `gamma` from the
module datasheet, and does not add the irradiance-versus-STC power scaling (a `G/1000` factor for the sub-STC output), the
spectral/angle losses, or the string/inverter losses (`pv-performance-ratio`); and this is a design aid** -- the module
datasheet and the site conditions govern.

## 2. The tile

### 2.1 `pv-cell-temperature-power` -- PV Cell Temperature and Temperature-Derated Power

```
inputs:
  T_amb_C   degC     ambient temperature
  G_wm2     W/m^2    plane-of-array irradiance
  NOCT_C    degC     nominal operating cell temperature (datasheet, default 45)
  P_stc_W   W        module STC power
  gamma     %/degC   power temperature coefficient (datasheet, default -0.35)

T_cell = T_amb_C + (NOCT_C - 20) * G_wm2/800       ; cell temperature, degC
P = P_stc_W * (1 + (gamma/100) * (T_cell - 25))     ; power at cell temp, W
loss_pct = (1 - P/P_stc_W) * 100                    ; temperature loss, %
```

**Pinned worked example (a 400 W module, 30 degC air, 800 W/m^2, NOCT 45).** `T_cell = 30 + (45 - 20) x 800/800 = 55 degC`;
`P = 400 x (1 - 0.0035 x (55 - 25)) = 400 x 0.895 = 358 W`; loss `= 10.5%`. **Cross-check (a cool 10 degC morning).**
`T_cell = 10 + 25 = 35 degC`; `P = 400 x (1 - 0.0035 x 10) = 386 W`, only 3.5% loss -- the same panel makes 28 W more in
cool sun, the spring-peak behavior that surprises owners expecting a midsummer maximum. The non-finite and non-positive
error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["solar","electrical"]`, matching `pv-string-sizing`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, the cell-temperature and derate relations, `editionNote` naming
`T_cell = T_amb + (NOCT - 20) G/800`, `P = P_stc(1 + gamma(T_cell - 25))`, the `gamma` range, and the NOCT-model,
enter-gamma, no-irradiance-scaling caveats); `test/fixtures/worked-examples.json` (the hot example + the cool cross-check);
`test/fixtures/compute-map.js` (`pv-cell-temperature-power` -> `computePvCellTemperaturePower` in `../../calc-solar.js`);
`scripts/related-tiles.mjs` (-> `pv-string-sizing` / `pv-energy-yield` / `pv-performance-ratio` / `pv-inverter-ratio`);
`data/search/aliases.json` ("cell temperature PV", "module temperature power", "NOCT", "temperature coefficient solar",
"PV power derate", "hot panel loss", "gamma temperature power", "PV temperature loss", "operating cell temperature"); the
id appended to the existing solar renderers block in `app.js`; the `// dims:` annotation (temps temperature, `G` power/area,
powers power, `gamma`/loss dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples, the NOCT temperature model, the derate, and the non-positive / non-finite error seams. No new module; re-pin
`calc-solar.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the NOCT and derate assertions); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `T_cell` / `P` / loss stack wraps on
a phone); render-no-nan + a11y sweep, output read to the value (400 W, 30 degC, 800 W/m^2 -> 55 degC, 358 W).

## 5. Roadmap position

Opens the PV design batch (v350..v352) in `calc-solar.js`, adding the temperature-power model to the string and energy
tiles. The performance ratio (v351) and source-circuit fusing (v352) follow. The irradiance-versus-STC `G/1000` power
scaling, a wind-corrected (Faiman) cell-temperature model, and a chain into `pv-energy-yield` for a temperature-specific PR
are the deliberate next follow-ons once the trio lands.
