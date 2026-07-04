# roughlogic.com Specification v375 -- Moist Air Enthalpy (ASHRAE Psychrometrics) (calc-hvac.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-03). First tile of a psychrometric coil-analysis trio (v375 enthalpy -> v376 total coil load
> -> v377 bypass factor). The catalog computes humidity ratio (`outdoor-air-mix`), the sensible/latent split (`shr-latent`),
> and refrigerant-cycle enthalpies (`refrigeration-cop`), but never the one number every cooling-coil and air-mixing
> calculation actually starts from: the total heat content of moist air, its enthalpy.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A cooling coil removes *total* heat -- sensible drop
> plus moisture removal -- and the honest way to size that is the enthalpy difference across the coil, not a dry-bulb split.
> Enthalpy is also what an economizer controller compares and what a mixed-air state is found from. No tile returns it. This
> adds the psychrometric enthalpy of moist air to the existing **`calc-hvac.js`** module (Group C); no new group, trade, or
> dependency. Inherits spec.md through spec-v374.md.
>
> **The gap, and the evidence for it.** ASHRAE Fundamentals gives the I-P enthalpy of moist air as
> `h = 0.240 t + W (1061 + 0.444 t)` Btu per pound of dry air, where `t` is the dry-bulb temperature (deg F) and `W` is the
> humidity ratio (lb water / lb dry air): `0.240` is the specific heat of dry air, `1061` the latent heat of vaporization at
> the 0 deg F datum, and `0.444` the specific heat of water vapor. For return air at `80 deg F` and `W = 0.0112`
> (about 50% RH), `h = 0.240*80 + 0.0112*(1061 + 0.444*80) = 19.2 + 12.28 = 31.48` Btu/lb -- the standard chart value near
> 31.4. For supply air at `55 deg F`, `W = 0.0090`, `h = 22.97` Btu/lb. The difference, `8.51` Btu/lb, is exactly what the
> next tile multiplies by `4.5 * CFM` to get total coil load. `shr-latent` splits a load you already know; this tile is the
> upstream state property that lets you compute the load in the first place.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The dry-bulb temperature is a
temperature (deg F, dim T); the humidity ratio is dimensionless (lb/lb); the enthalpy is a specific energy (Btu per lb dry
air). The v18/v21 contract: any non-finite input, or a negative humidity ratio, returns `{ error }`; temperature may be any
finite value (enthalpy is defined below freezing, and the datum makes negative enthalpies legitimate). Citation discipline
(v19/v22): `GOVERNANCE.general` over psychrometric enthalpy by name; `editionNote` names **ASHRAE Handbook -- Fundamentals,
the I-P moist-air enthalpy relation `h = 0.240 t + W (1061 + 0.444 t)` Btu/lb dry air with `t` the dry-bulb deg F and `W`
the humidity ratio, the `0.240`/`1061`/`0.444` sea-level coefficients (dry-air specific heat, latent heat at the 0 deg F
datum, water-vapor specific heat)**, and states that **this returns the total heat content of the air at one state; it is
the property `cooling-coil-total-load` differences across a coil and that an economizer control compares, uses the humidity
ratio (not RH directly -- pair with `outdoor-air-mix` or a psychrometric chart to get W), and is a design aid, not a
substitute for a measured chart state or the equipment ratings**.

## 2. The tile

### 2.1 `moist-air-enthalpy` -- Moist Air Enthalpy (ASHRAE Psychrometrics)

```
inputs:
  t_db_f    F     dry-bulb temperature
  w_lb_lb   -     humidity ratio (lb water / lb dry air)

h = 0.240*t_db_f + w_lb_lb*(1061 + 0.444*t_db_f)     Btu / lb dry air
```

**Pinned worked example (return air, 80 deg F, W = 0.0112).** `h = 0.240*80 + 0.0112*(1061 + 0.444*80)
= 19.2 + 0.0112*1096.52 = 19.2 + 12.28 = 31.48` Btu/lb, matching the psychrometric-chart value near 80 deg F / 50% RH.
**Cross-check (supply air, 55 deg F, W = 0.0090).** `h = 0.240*55 + 0.0090*(1061 + 0.444*55) = 13.2 + 9.77 = 22.97` Btu/lb;
the `31.48 - 22.97 = 8.51` Btu/lb difference is the coil enthalpy drop the next tile uses. Dry air alone (`W = 0`) at
80 deg F returns `19.2` Btu/lb -- the sensible-only floor. The non-finite and negative-`W` error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, beside `outdoor-air-mix` / `shr-latent`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, ASHRAE Fundamentals psychrometric enthalpy, `editionNote` naming the
`h = 0.240 t + W (1061 + 0.444 t)` relation, the three coefficients, the datum, and the humidity-ratio-input caveat);
`test/fixtures/worked-examples.json` (the return-air example + the supply-air cross-check + the dry-air floor);
`test/fixtures/compute-map.js` (`moist-air-enthalpy` -> `computeMoistAirEnthalpy` in `../../calc-hvac.js`);
`scripts/related-tiles.mjs` (-> `outdoor-air-mix` / `shr-latent` / `wet-bulb-psychrometer` / `humidifier-capacity`);
`data/search/aliases.json` ("moist air enthalpy", "air enthalpy", "psychrometric enthalpy", "total heat content air",
"enthalpy btu per lb", "h db humidity ratio", "ashrae enthalpy", "air total heat", "enthalpy of air"); the id appended to
the existing HVAC renderers block in `app.js`; the `// dims:` annotation (temperature T, humidity ratio dimensionless,
enthalpy energy/mass); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the two examples, the
dry-air floor, and the non-finite / negative-`W` error seams. No new module; re-pin `calc-hvac.js` on the
`check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+3 fixtures, the new fuzzer block, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the single enthalpy output wraps cleanly on a phone);
render-no-nan + a11y sweep, output read to the value (80 deg F / 0.0112 -> 31.48 Btu/lb).

## 5. Roadmap position

The state property that unlocks the trio: `cooling-coil-total-load` (v376) differences two of these enthalpies across the
`4.5 * CFM` factor, and `coil-bypass-factor` (v377) reads the leaving state that pairs with them. A humidity-ratio-from-RH
helper and an enthalpy-based economizer changeover comparison are the deliberate next follow-ons once the trio lands.
