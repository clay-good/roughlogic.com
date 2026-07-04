# roughlogic.com Specification v410 -- VAV Box Minimum and Maximum Airflow (calc-hvacsystems.js, Group C, 1 New Tile)

> **Status: LANDED (2026-07-04, 0.143.0; proposed 2026-07-03). Third and final tile of the HVAC duct-design trio (v408 Manual D friction rate ->
> v409 coil face velocity -> v410 VAV box airflow). `grille-face-velocity` sizes registers and `duct-sizing` sizes trunks,
> but nothing sets the min and max airflow of a VAV terminal -- the cooling-maximum from the zone load and the
> ventilation-or-turndown minimum that a box is scheduled to.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A variable-air-volume box modulates between a maximum
> and a minimum. The cooling maximum is the airflow that meets the zone sensible load at the design supply-to-room
> temperature difference, `CFM_max = Q_sensible / (1.08 * dT)`; the minimum is the greater of the ventilation requirement and
> a turndown fraction of the maximum (commonly `30%`, per ASHRAE 90.1). Nothing in the catalog sets VAV terminal flows. This
> adds the VAV tile to the existing **`calc-hvacsystems.js`** module (Group C); no new group, trade, or dependency. Inherits
> spec.md through spec-v409.md.
>
> **The gap, and the evidence for it.** A zone with a `12,000 Btu/hr` sensible load and a `20 deg F` supply-to-room
> difference needs `CFM_max = 12000 / (1.08 * 20) = 556 CFM` at full cooling. Its minimum is the greater of the
> `100 CFM` ventilation requirement and the `30% * 556 = 167 CFM` turndown, so `167 CFM` governs -- the box is scheduled
> `167` to `556 CFM`. No tile does this; a designer sizing a VAV box had the load and the duct tiles but not the terminal
> min/max.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The zone sensible load is a
power (Btu/hr); the supply-to-room temperature difference is a temperature difference (deg F, dim T); the ventilation
requirement is a volumetric flow (CFM); the turndown is dimensionless; the min and max airflows are volumetric flows (CFM).
The v18/v21 contract: any non-finite input, or a non-positive load or temperature difference, returns `{ error }`; the
turndown fraction defaults to `0.30` and is constrained to `(0, 1]`, and the tile returns the cooling maximum, the minimum
(the greater of ventilation and turndown), and which of the two governs the minimum. Citation discipline (v19/v22):
`GOVERNANCE.general` over VAV terminal sizing by name; `editionNote` names **the cooling maximum `CFM_max = Q_sensible /
(1.08 * dT)` (the `1.08` sea-level sensible factor), the minimum as `max(ventilation CFM, turndown * CFM_max)`, and the
ASHRAE 90.1 turndown practice (commonly `30%`)**, and states that **this returns the VAV box scheduled min/max airflow, that
the ventilation minimum should come from ASHRAE 62.1, and that it is a design aid, not a substitute for the box
manufacturer's inlet-size selection**.

## 2. The tile

### 2.1 `vav-box-airflow` -- VAV Box Minimum and Maximum Airflow

```
inputs:
  zone_sensible_btuh  Btu/hr  zone sensible cooling load
  supply_dt_f         F       supply-to-room temperature difference
  ventilation_cfm     cfm     ventilation minimum (ASHRAE 62.1)
  turndown            -       minimum turndown fraction (default 0.30)

cfm_max = zone_sensible_btuh / (1.08 * supply_dt_f)
cfm_min = max(ventilation_cfm, turndown * cfm_max)
```

**Pinned worked example (12,000 Btu/hr, 20 deg F, 100 CFM vent, 0.30 turndown).**
`CFM_max = 12000 / (1.08*20) = 556 CFM`; `CFM_min = max(100, 0.30*556 = 167) = 167 CFM` (turndown governs). **Cross-check
(ventilation governs).** Raise the ventilation minimum to `250 CFM` and it exceeds the `167` turndown, so the box minimum
becomes `250 CFM` -- a stuffy dense-occupancy zone driven by fresh-air needs, not turndown. A non-positive load or
temperature difference takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, beside `duct-sizing` / `grille-face-velocity`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, VAV terminal sizing, `editionNote` naming
`CFM_max = Q/(1.08*dT)`, the `max(vent, turndown*max)` minimum, and the ASHRAE 90.1 turndown);
`test/fixtures/worked-examples.json` (the turndown-governs example + the ventilation-governs cross-check);
`test/fixtures/compute-map.js` (`vav-box-airflow` -> `computeVavBoxAirflow` in `../../calc-hvacsystems.js`);
`scripts/related-tiles.mjs` (-> `duct-sizing` / `grille-face-velocity` / `shr-latent` / `dcv-co2-ventilation`);
`data/search/aliases.json` ("vav box airflow", "vav minimum maximum", "vav turndown", "terminal box cfm", "vav sizing",
"1.08 cfm dt", "cooling maximum cfm", "vav minimum airflow", "vav box schedule"); the id appended to the existing
HVAC-systems renderers block in `app.js`; the `// dims:` annotation (load power, dT temperature, airflows volumetric flow,
turndown dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the
governing-minimum switch, and the non-positive / non-finite error seams. No new module; re-pin `calc-hvacsystems.js` on the
`check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the governing-minimum assertion, the error paths); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the max / min output wraps on a phone);
render-no-nan + a11y sweep, output read to the value (12,000 Btu/hr, 20 F -> 556 max, 167 min).

## 5. Roadmap position

Closes the HVAC duct-design trio: v408 sets the friction rate, v409 checks the coil, and v410 schedules the VAV terminals.
A VAV inlet-size-from-velocity and a reheat-coil-load-at-minimum-flow companion are the deliberate next follow-ons.
