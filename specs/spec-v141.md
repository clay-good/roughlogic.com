# roughlogic.com Specification v141 -- Drying-Equipment Sensible Heat Load and Chamber Ventilation (calc-restoration.js, Group D, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v141..v145.** In-scope catalog expansion under the
> spec-v106 trades-only charter: one water-restoration tile turning the chamber's electrical draw into
> the heat it dumps and the ventilation needed to hold the efficient-evaporation band. Adds one tile to
> **`calc-restoration.js`** (Group D); no new module, group, or dependency. Inherits spec.md through
> spec-v140.md.
>
> **The gap, and the evidence for it.** `equipment-power-draw` gives the chamber's amperage and
> `thermal-delta-t` is a reference card, but nothing tells the tech that essentially every watt those
> air movers, dehumidifiers, and scrubbers draw lands in the room as sensible heat (about 3.412 BTU/hr
> per watt). A tight chamber climbs out of the efficient-evaporation band, and S500 warns that an
> overheated chamber drives secondary damage and microbial growth instead of faster drying. The heat
> load and the makeup-ventilation needed to cap the temperature rise are the standard sensible-heat
> relation (1.08 x cfm x deltaT), yet no tile carries them.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The
equipment draw is power (`M L^2 T^-3`, watts); the heat load is power (reported BTU/hr); the target and
resulting temperature rise are `Theta` (degF); ventilation airflow is `L^3/T` (cfm). The 3.412 BTU/hr
per watt and the 1.08 sensible factor (60 min x 0.075 lb/ft^3 x 0.24 BTU/lb-degF) are dimensioned
constants drawn from `pure-math.js` convention. The v18/v21 contract: any non-finite input, a
non-positive equipment draw, or a non-positive target rise returns `{ error }`; the temperature-rise
path is computed only when exhaust airflow is guarded-positive, and the required-cfm path divides by
the guarded-positive target rise. Citation discipline (v19/v22): `GOVERNANCE.general` over the
watt-to-heat conversion and the sensible-heat relation, by name; the efficient-evaporation band and the
secondary-damage caution are S500 guidance, the actual envelope losses and HVAC govern -- this is a
screen.

## 2. The tile

### 2.1 `equipment-heat-load` -- Drying-Equipment Sensible Heat Load and Ventilation

```
inputs:
  total_equipment_watts  power          summed draw of air movers / dehus / scrubbers in the chamber
  target_temp_rise_f     Theta          acceptable rise above ambient (default 10)
  exhaust_cfm            L^3/T          ventilation / AC airflow removing heat (default 0 = sealed)

sensible_btu_hr  = total_equipment_watts x 3.412
required_cfm     = sensible_btu_hr / (1.08 x target_temp_rise_f)        # ventilation to hold the rise
temp_rise_at_exhaust = exhaust_cfm > 0 ? sensible_btu_hr / (1.08 x exhaust_cfm) : null   # sealed -> null
```

**Pinned worked example.** Ten air movers at 250 W plus two LGR dehumidifiers at 750 W: total
`2500 + 1500 = 4000 W`. `sensible = 4000 x 3.412 = 13,648 BTU/hr`; to hold a 10 degF rise,
`required_cfm = 13,648 / (1.08 x 10) = 1,264 cfm`.
**Cross-check (undersized exhaust overheats).** Run only 600 cfm of exhaust:
`temp_rise = 13,648 / (1.08 x 600) = 21.1 degF` -- more than double the 10 degF target, the chamber
climbs out of the efficient band, confirming the ~1,264 cfm the required-cfm path asks for. Envelope
losses and the HVAC govern; this is a screen.

## 3. Wiring

A `tools-data.js` row (group `D`, trade `["restoration", "hvac"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the 3.412 watt-to-heat and 1.08 sensible relations,
`editionNote` naming ANSI/IICRC S500, the efficient-evaporation band, and the secondary-damage caveat,
the screen scope); `test/fixtures/worked-examples.json` (example + cross-check);
`test/fixtures/compute-map.js` (`equipment-heat-load` -> `computeEquipmentHeatLoad` in
`../../calc-restoration.js`); `scripts/related-tiles.mjs` (-> `equipment-power-draw` /
`thermal-delta-t` / `chamber-turnover`); `data/search/aliases.json` ("equipment heat", "chamber heat
load", "drying temperature", "overheated chamber", "ventilation cfm", "sensible heat"); the id
appended to the existing `RESTORATION_RENDERERS` declare in `app.js`; the `// dims:` annotation;
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the example, cross-check,
the sealed (exhaust_cfm = 0 -> null rise) branch, and error seams (non-finite, watts/target rise <= 0).
Raise the `calc-restoration.js` size cap by ~20 percent if needed (dated comment); bump the
`citations.js` cap if needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block, the sealed branch); `npm run build` (one new
shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the BTU/hr,
required-cfm, and rise lines wrap on a phone); render-no-nan + a11y sweep, output read to the value
(4000 W / 10 degF / 600 cfm -> 13,648 BTU/hr, 1,264 cfm required, 21.1 degF actual).

## 5. Roadmap position

Adds the thermal axis to the chamber-management family alongside the amperage (`equipment-power-draw`)
and grain (`grains-removed`) reads. Further Group D growth stays evidence-driven.
