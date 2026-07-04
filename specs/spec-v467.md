# roughlogic.com Specification v467 -- Powered Attic Ventilator Sizing (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-03). Third and final tile of the roofing-ventilation trio (v465 attic NFVA -> v466 ridge/soffit
> vent linear feet -> v467 powered attic ventilator). When passive venting is not enough, a powered attic fan is sized on
> airflow, not net free area -- and it needs matching intake or it will pull conditioned air from the house.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A powered attic ventilator is sized at about
> `0.7 CFM` per square foot of attic floor (plus roughly `15%` for a dark roof), and it must have enough intake net free
> area -- about `1 ft^2` per `300 CFM` -- or it starves and depressurizes the attic, drawing air-conditioned air up through
> the ceiling. `attic-ventilation-nfva` sizes passive vents by area; nothing sizes the fan and its required intake. This adds
> the powered-fan tile to the existing **`calc-construction.js`** module (Group E); no new group, trade, or dependency.
> Inherits spec.md through spec-v466.md.
>
> **The gap, and the evidence for it.** A `1500 ft^2` attic needs a fan of `1500 * 0.7 = 1,050 CFM`, and to feed it without
> depressurizing the attic it needs `1050 / 300 = 3.5 ft^2 = 504 in^2` of intake (soffit) net free area. Undersize the intake
> and the fan pulls make-up air down through the ceiling, wasting cooling. No tile does this; a roofer sizing a power vent
> had the passive-area tile but not the fan CFM or its intake.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The attic floor area is an
area (ft^2); the CFM-per-ft^2 factor and the dark-roof factor are dimensionless; the fan airflow is a volumetric flow (CFM);
the required intake area is an area (ft^2, also reported in in^2). The v18/v21 contract: any non-finite input, or a
non-positive floor area, returns `{ error }`; the tile applies the dark-roof factor when selected, computes the fan CFM and
the required intake net free area (`1 ft^2 / 300 CFM`), and notes the thermostat/humidistat control. Citation discipline
(v19/v22): `GOVERNANCE.general` over the powered attic ventilator by name; `editionNote` names **the fan sizing at about
`0.7 CFM per ft^2` of attic floor (plus `~15%` for a dark roof), the required intake net free area of about `1 ft^2 per
300 CFM`, and the caveat that inadequate intake depressurizes the attic and pulls conditioned air from the house (a reason
many codes and programs discourage powered fans)**, and states that **this returns the fan CFM and required intake, that
balanced passive ventilation is often preferred, and that it is a sizing aid, not a substitute for the manufacturer data or
the AHJ**.

## 2. The tile

### 2.1 `powered-attic-ventilator` -- Powered Attic Ventilator Sizing

```
inputs:
  attic_area_ft2   ft^2   attic floor area
  cfm_per_ft2      -      airflow factor (default 0.7)
  dark_roof        -      apply ~15% dark-roof increase? (bool)

fan_cfm = attic_area_ft2 * cfm_per_ft2 * (dark_roof ? 1.15 : 1.0)
intake_ft2 = fan_cfm / 300
intake_in2 = intake_ft2 * 144
```

**Pinned worked example (1500 ft^2 attic, 0.7 CFM/ft^2, light roof).** `fan = 1500*0.7 = 1,050 CFM`; required intake
`1050/300 = 3.5 ft^2 = 504 in^2`. **Cross-check (a dark roof).** With the `15%` dark-roof factor the fan grows to
`1,208 CFM` and the intake to `4.0 ft^2` -- a hotter roof needs more air. A non-positive floor area takes the error path;
the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["roofing", "carpentry"]`, beside `attic-ventilation-nfva`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, powered attic ventilator, `editionNote` naming the
`0.7 CFM/ft^2` sizing, the dark-roof factor, the `1 ft^2/300 CFM` intake, and the depressurization caveat);
`test/fixtures/worked-examples.json` (the light-roof example + the dark-roof cross-check); `test/fixtures/compute-map.js`
(`powered-attic-ventilator` -> `computePoweredAtticVentilator` in `../../calc-construction.js`); `scripts/related-tiles.mjs`
(-> `attic-ventilation-nfva` / `ridge-soffit-vent-linear` / `roofing-squares` / `internal-heat-gains`);
`data/search/aliases.json` ("powered attic ventilator", "attic fan cfm", "attic fan sizing", "power vent attic", "attic
exhaust fan", "0.7 cfm per sqft", "attic fan intake", "gable fan sizing", "roof fan cfm"); the id appended to the existing
construction renderers block in `app.js`; the `// dims:` annotation (area area, factors dimensionless, CFM volumetric flow,
intake area); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the dark-roof
factor, and the non-positive / non-finite error seams. No new module; re-pin `calc-construction.js` on the
`check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the dark-roof factor, the error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the CFM / intake output wraps on a phone);
render-no-nan + a11y sweep, output read to the value (1500 ft^2 -> 1,050 CFM, 504 in^2 intake).

## 5. Roadmap position

Closes the roofing-ventilation trio: v465 the required area, v466 the passive vent footage, and v467 the powered-fan
alternative. A solar-attic-fan (PV-watts to CFM) and a whole-house-fan sizing companion are the deliberate next follow-ons.
