# roughlogic.com Specification v376 -- Cooling Coil Total Load from Enthalpy Difference (calc-hvac.js, Group C, 1 New Tile)

> **Status: LANDED (2026-07-03, 0.132.0; proposed 2026-07-03). As-landed correction: the pinned inputs 31.48/22.97 Btu/lb give Q = 4.5 x 2000 x 8.51 = 76,590 Btu/hr (6.38 tons); the spec prose said 76,610, a rounding slip. Landed the exact 76,590. Second tile of the psychrometric coil trio (v375 enthalpy -> v376 total load ->
> v377 bypass factor). `shr-latent` splits a total load you already know into sensible and latent; this tile computes that
> total in the first place, the honest way -- airflow times the enthalpy drop across the coil, which captures the sensible
> temperature drop and the latent moisture removal in one number.**
> In-scope catalog expansion under the spec-v106 trades-only charter. The sensible-only shortcut `Q = 1.08 * CFM * dT`
> undercounts a wet coil badly because it ignores the moisture the coil condenses out. The total load is
> `Q = 4.5 * CFM * (h_entering - h_leaving)`, where `4.5 = 60 min/hr * 0.075 lb/ft^3` is the sea-level air mass-flow factor
> and `h` is the moist-air enthalpy from `moist-air-enthalpy` (v375). This adds the airside total-load tile to the existing
> **`calc-hvac.js`** module (Group C); no new group, trade, or dependency. Inherits spec.md through spec-v375.md.
>
> **The gap, and the evidence for it.** For `2000 CFM` entering at `h = 31.48` Btu/lb (80 deg F, W = 0.0112) and leaving at
> `h = 22.97` Btu/lb (55 deg F, W = 0.0090), the enthalpy drop is `8.51` Btu/lb and the total coil load is
> `Q = 4.5 * 2000 * 8.51 = 76,610` Btu/hr, about `6.38` tons of refrigeration. A sensible-only estimate at the same
> conditions (`1.08 * 2000 * 25 = 54,000` Btu/hr) would miss roughly `22,600` Btu/hr of latent load -- the exact reason
> coils are sized on enthalpy, not dry-bulb. `hydronic-gpm-deltat` sizes the *waterside* GPM from a known load; this tile
> produces the *airside* load that feeds it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The airflow is a volumetric
flow (CFM); the two enthalpies are specific energies (Btu per lb dry air); the total load is a power (Btu/hr). The v18/v21
contract: any non-finite input, or a non-positive CFM, returns `{ error }`; the load is reported as a signed value so a
leaving enthalpy above entering (a heating coil, or reversed inputs) returns a negative load rather than an error, and the
tons conversion (`/12000`) rides along. Citation discipline (v19/v22): `GOVERNANCE.general` over the total-heat coil
equation by name; `editionNote` names **the airside total-heat relation `Q = 4.5 * CFM * (h_ent - h_lvg)` Btu/hr, the
`4.5 = 60 * 0.075` sea-level mass-flow factor (standard air density `0.075 lb/ft^3`), the moist-air enthalpies from
`moist-air-enthalpy`, and the `/12000` Btu/hr-per-ton conversion**, and states that **this returns the total (sensible plus
latent) coil load from the enthalpy difference, is more honest than the sensible-only `1.08 * CFM * dT` for a wet coil,
uses the sea-level `4.5` factor (de-rate for altitude with a corrected density), and is a design aid, not a substitute for
manufacturer coil selection**.

## 2. The tile

### 2.1 `cooling-coil-total-load` -- Cooling Coil Total Load from Enthalpy Difference

```
inputs:
  cfm         cfm      airflow across the coil
  h_ent_btu   Btu/lb   entering-air enthalpy (from moist-air-enthalpy)
  h_lvg_btu   Btu/lb   leaving-air enthalpy

q_btuh = 4.5 * cfm * (h_ent_btu - h_lvg_btu)     Btu / hr
tons   = q_btuh / 12000
```

**Pinned worked example (2000 CFM, 31.48 -> 22.97 Btu/lb).** `dh = 8.51` Btu/lb; `q = 4.5 * 2000 * 8.51 = 76,610` Btu/hr;
`tons = 76610 / 12000 = 6.38`. **Cross-check (sensible-only would undercount).** The same air dropped `25 deg F` sensibly
gives `1.08 * 2000 * 25 = 54,000` Btu/hr -- `22,600` Btu/hr short of the enthalpy-based total, the condensed-moisture
(latent) load a dry-bulb method never sees. A leaving enthalpy above entering returns a negative `q` (heating), not an
error. The non-finite and non-positive-CFM error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, beside `shr-latent` / `moist-air-enthalpy`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, the total-heat coil equation, `editionNote` naming
`Q = 4.5 * CFM * (h_ent - h_lvg)`, the `4.5 = 60*0.075` factor, the enthalpy source, and the tons conversion);
`test/fixtures/worked-examples.json` (the total-load example + the sensible-only cross-check + the negative/heating case);
`test/fixtures/compute-map.js` (`cooling-coil-total-load` -> `computeCoolingCoilTotalLoad` in `../../calc-hvac.js`);
`scripts/related-tiles.mjs` (-> `moist-air-enthalpy` / `shr-latent` / `hydronic-gpm-deltat` / `coil-bypass-factor`);
`data/search/aliases.json` ("cooling coil total load", "coil load enthalpy", "total heat coil", "4.5 cfm enthalpy",
"total cooling capacity", "coil btu enthalpy difference", "wet coil load", "sensible plus latent coil", "airside coil
load"); the id appended to the existing HVAC renderers block in `app.js`; the `// dims:` annotation (CFM volumetric flow,
enthalpies energy/mass, load power); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the two
examples, the negative/heating case, and the non-finite / non-positive-CFM error seams. No new module; re-pin `calc-hvac.js`
on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+3 fixtures, the new fuzzer block, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the `q` / tons pair wraps on a phone); render-no-nan + a11y
sweep, output read to the value (2000 CFM, 8.51 Btu/lb drop -> 76,610 Btu/hr, 6.38 tons).

## 5. Roadmap position

The middle of the trio: it consumes two `moist-air-enthalpy` (v375) states and produces the airside load that
`hydronic-gpm-deltat` turns into waterside GPM. `coil-bypass-factor` (v377) closes the trio by describing how completely the
coil actually reaches its apparatus dew point. An altitude-corrected mass-flow factor and a sensible-heat-ratio tie-in to
`shr-latent` are the deliberate next follow-ons.
