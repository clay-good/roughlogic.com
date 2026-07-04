# roughlogic.com Specification v443 -- Economizer Enthalpy Changeover (calc-hvac.js, Group C, 1 New Tile)

> **Status: LANDED (2026-07-04, 0.152.0; proposed 2026-07-03). Third and final tile of the HVAC energy-recovery trio (v441 ERV total enthalpy ->
> v442 radiant floor output -> v443 economizer enthalpy changeover). `economizer-savings-hours` estimates the annual free-
> cooling hours; this tile is the control decision behind them -- whether, at a given moment, outdoor air is a better source
> of cooling than the return air, so the economizer should open or lock out.**
> In-scope catalog expansion under the spec-v106 trades-only charter. An air-side economizer should use outdoor air for free
> cooling only when the outdoor air actually carries less total heat than the return air. The differential-enthalpy high
> limit (ASHRAE 90.1) enables the economizer when `h_outdoor < h_return` and locks it out otherwise; a fixed dry-bulb high
> limit (a `65` to `75 deg F` setpoint by climate zone) is the simpler alternative. `economizer-savings-hours` counts the
> hours but never makes the changeover decision. This adds the changeover tile to the existing **`calc-hvac.js`** module
> (Group C), reusing the moist-air enthalpies of `moist-air-enthalpy`; no new group, trade, or dependency. Inherits spec.md
> through spec-v442.md.
>
> **The gap, and the evidence for it.** With outdoor air at `24 Btu/lb` (cool and dry) and return air at `28 Btu/lb`, the
> differential-enthalpy logic enables the economizer -- the outdoor air is the cheaper cooling source. Let a muggy afternoon
> push outdoor enthalpy to `32 Btu/lb`, above the `28 Btu/lb` return, and the economizer locks out even though the outdoor
> dry-bulb may still look cool, because bringing in that humid air would add latent load. No tile makes this call; the
> catalog counted economizer hours but never decided the setpoint.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The enthalpies are specific
energies (Btu per lb dry air); the dry-bulb temperatures and the fixed setpoint are temperatures (deg F); the enable/lockout
result is boolean. The v18/v21 contract: any non-finite input returns `{ error }`; the tile supports the differential-
enthalpy mode (`enable when h_outdoor < h_return`) and the fixed-dry-bulb mode (`enable when T_outdoor < setpoint`), and
reports the enthalpy (or temperature) margin. Citation discipline (v19/v22): `GOVERNANCE.general` over the economizer high-
limit changeover by name; `editionNote` names **ASHRAE 90.1 economizer high-limit control, the differential-enthalpy logic
(`enable when h_outdoor < h_return`), the fixed dry-bulb high-limit setpoints (`65` to `75 deg F` by climate zone), and the
differential dry-bulb alternative, using the moist-air enthalpies of `moist-air-enthalpy`**, and states that **this returns
the economizer enable/lockout decision and the margin, that the allowed high-limit type depends on the climate zone, that
sensor drift is a common failure, and that it is a control-design aid, not a substitute for the sequence of operations**.

## 2. The tile

### 2.1 `economizer-enthalpy-changeover` -- Economizer Enthalpy Changeover

```
inputs:
  mode          -        differential_enthalpy | fixed_drybulb
  h_outdoor     Btu/lb   outdoor-air enthalpy (from moist-air-enthalpy)
  h_return      Btu/lb   return-air enthalpy
  t_outdoor_f   F        outdoor dry-bulb (fixed_drybulb mode)
  setpoint_f    F        fixed high-limit setpoint (fixed_drybulb mode)

differential_enthalpy:  enable = h_outdoor < h_return;   margin = h_return - h_outdoor
fixed_drybulb:          enable = t_outdoor_f < setpoint_f; margin = setpoint_f - t_outdoor_f
```

**Pinned worked example (differential enthalpy, OA 24 Btu/lb, RA 28 Btu/lb).** `24 < 28` -> **enable** the economizer,
`4 Btu/lb` of margin. **Cross-check (humid afternoon locks it out).** OA at `32 Btu/lb` against RA `28 Btu/lb` -> **lock
out** (a `-4 Btu/lb` margin), even if the dry-bulb still reads cool -- the latent load rules it out. In fixed-dry-bulb mode
a `70 deg F` outdoor against a `65 deg F` setpoint also locks out. The non-finite seam takes the error path.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, beside `economizer-savings-hours` / `moist-air-enthalpy`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, ASHRAE 90.1 economizer high limit,
`editionNote` naming the differential-enthalpy and fixed-dry-bulb logic, the setpoint ranges, and the enthalpy source);
`test/fixtures/worked-examples.json` (the enable example + the lockout cross-check; the boolean/string result pins with
`"tolerance": {"abs": 0}`); `test/fixtures/compute-map.js` (`economizer-enthalpy-changeover` ->
`computeEconomizerEnthalpyChangeover` in `../../calc-hvac.js`); `scripts/related-tiles.mjs` (-> `economizer-savings-hours` /
`moist-air-enthalpy` / `outside-air-percent-temps` / `erv-total-enthalpy-recovery`); `data/search/aliases.json` ("economizer
changeover", "enthalpy changeover", "economizer high limit", "differential enthalpy", "economizer setpoint", "free cooling
changeover", "economizer lockout", "outdoor air enthalpy", "economizer control"); the id appended to the existing HVAC
renderers block in `app.js`; the `// dims:` annotation (enthalpies energy/mass, temps T, result boolean); regenerated v14
corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, both modes, and the non-finite error seam. No
new module; re-pin `calc-hvac.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, both modes, the error path); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the enable / margin output wraps on a phone); render-no-nan +
a11y sweep, output read to the value (OA 24, RA 28 -> enable, 4 Btu/lb margin).

## 5. Roadmap position

Closes the HVAC energy-recovery trio: v441 recovers energy, v442 delivers radiant heat, and v443 decides when outdoor air is
the free-cooling source, all trading on the same moist-air enthalpies. A climate-zone high-limit-type selector (per ASHRAE
90.1 Table 6.5.1.1.3) is the deliberate next follow-on.
