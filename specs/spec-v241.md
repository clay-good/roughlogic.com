# roughlogic.com Specification v241 -- Compressed-Air Discharge-Pressure Setpoint Savings (calc-hvac.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-06-30). Batch spec-v239..v241 (the compressed-air energy trio -- leak cost, compression
> power, and setpoint savings). This closes the v239..v241 batch.**
> In-scope catalog expansion under the spec-v106 trades-only charter: turning the compressor's pressure down is the
> cheapest energy conservation measure a maintenance tech has, and pricing it is what justifies the change. Adds one tile
> to **`calc-hvac.js`** (Group C); no new module, group, or dependency. Inherits spec.md through spec-v240.md.
>
> **The gap, and the evidence for it.** Most plants run their compressors at a higher discharge pressure than the tools
> need -- a cushion against pressure drop that quietly taxes every hour of runtime. Because compression power rises with
> the pressure ratio, dropping the setpoint is a pure, no-capital saving, and the rule of thumb every energy auditor
> quotes is about half a percent of compressor energy per psi. That rule falls straight out of the isentropic power
> ratio between the two discharge pressures, so the saving can be computed exactly rather than estimated. The catalog
> can now compute the compression power (`compressed-air-power`) but has nothing that prices the single most common
> compressed-air conservation measure: turning the pressure down.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The current and reduced
discharge pressures are a pressure (psig); the inlet pressure is a pressure (psia); the current input power and the power
saved are a power (kW); the run hours are a time (h); the annual energy saved is an energy (kWh); the rate and the annual
savings are currency figures (USD, as the existing economic tiles carry them); the percent saved is `dimensionless`. The
specific-heat ratio k = 1.4 for air is a named constant. The v18/v21 contract: any non-finite input, a non-positive
inlet pressure / input power / run hours, a reduced pressure not below the current pressure, or a reduced discharge at or
below zero gauge, returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the isentropic
pressure-ratio relations by name; `editionNote` names the **isentropic compression-power ratio** (percent saved
`= 1 - [(P_reduced/P1)^((k-1)/k) - 1] / [(P_current/P1)^((k-1)/k) - 1]`, which reproduces the DOE rule of roughly
0.5 percent of compressor energy per psi of reduction), and states that **the reduced setpoint must still hold the
minimum pressure the tools need after system pressure drop (the point of a leak and piping fix is to allow the drop),
the saving is on the compression energy that actually falls with pressure (an unloaded or modulating compressor may not
capture all of it), the ratio assumes single-stage isentropic behavior, and this is an energy-savings estimate, not a
metered result** -- a conservation-measure number, not a guaranteed reduction.

## 2. The tile

### 2.1 `air-pressure-setpoint-savings` -- Discharge-Pressure Reduction Energy Savings

```
inputs:
  current_psig   psig           current discharge setpoint, psig
  reduced_psig   psig           proposed lower discharge setpoint, psig (must be below current, above 0)
  inlet_psia     psia           inlet absolute pressure, psia (default 14.7)
  input_kw       kW             current compressor input power, kW
  run_hours      h              hours per year (default 6000)
  rate_kwh       USD/kWh        energy rate, $/kWh

k             = 1.4
work_current  = ((current_psig + 14.7) / inlet_psia)^((k-1)/k) - 1
work_reduced  = ((reduced_psig + 14.7) / inlet_psia)^((k-1)/k) - 1
pct_saved     = 1 - work_reduced / work_current
kw_saved      = input_kw * pct_saved
annual_kwh    = kw_saved * run_hours
annual_savings= annual_kwh * rate_kwh
```

**Pinned worked example (120 to 105 psig on a 50 kW compressor).** Dropping the setpoint from 120 to 105 psig on a
compressor drawing 50 kW, 6,000 h/yr, $0.10/kWh:
`work_current = (134.7/14.7)^0.2857 - 1 = 0.883`; `work_reduced = (119.7/14.7)^0.2857 - 1 = 0.821`;
`pct_saved = 1 - 0.821/0.883 = 0.0707` (7.07 percent, or 0.47 percent per psi -- the DOE rule); `kw_saved = 50 * 0.0707
= 3.54 kW`; `annual_kwh = 21,219 kWh`; `annual_savings = ` **$2,122 per year** for turning a knob. **Cross-check (a
modest 5 psi trim).** The same compressor dropped only 5 psi, 120 to 115 psig: `work_reduced = (129.7/14.7)^0.2857 - 1
= 0.863`; `pct_saved = 1 - 0.863/0.883 = 0.0229` (2.29 percent, again about 0.46 percent per psi);
`kw_saved = 1.15 kW`; `annual_savings = ` **$688 per year**. Every psi is worth about half a percent, linearly, so the
saving scales with how far the pressure can safely come down -- which is exactly why fixing the leaks and the piping
(so the tools still get their pressure at a lower setpoint) is what unlocks this measure.

## 3. Wiring

A `tools-data.js` row (group `C`, trade `["hvac"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, the isentropic pressure-ratio relations, `editionNote` naming the compression-power ratio and the
DOE per-psi rule with the hold-minimum-pressure / modulating-compressor / single-stage / estimate caveats);
`test/fixtures/worked-examples.json` (the 15-psi example + the 5-psi cross-check); `test/fixtures/compute-map.js`
(`air-pressure-setpoint-savings` -> `computeAirPressureSetpointSavings` in `../../calc-hvac.js`);
`scripts/related-tiles.mjs` (-> `compressed-air-power` / `air-leak-cost` / `air-receiver`); `data/search/aliases.json`
("compressed air pressure savings", "reduce discharge pressure", "setpoint reduction savings", "psi energy savings",
"compressor pressure setpoint", "air pressure reduction", "half percent per psi", "compressed air conservation"); the id
appended to the existing hvac renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning both examples and error seams (non-finite, inlet / input power / run
hours <= 0, reduced not below current, reduced at or below zero gauge). Raise the `calc-hvac.js` size cap or split the
module if needed (dated comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the reduced-not-below-current error path); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the percent-saved / kW-saved /
annual-kWh / annual-$ stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (120 to 105 psig /
50 kW -> 7.07 percent, $2,122).

## 5. Roadmap position

Closes the compressed-air energy batch (v239..v241). Differentiates the `compressed-air-power` (v240) result across two
discharge pressures to price the setpoint-reduction measure, and works alongside `air-leak-cost` (v239) -- fixing the
leaks is what lets the pressure come down, so the two measures compound. A minimum-tool-pressure check (confirming the
reduced setpoint still serves the load after drop) and an unloaded-compressor capture factor are deliberate future
follow-ons.
