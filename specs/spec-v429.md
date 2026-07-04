# roughlogic.com Specification v429 -- Concrete Formwork Lateral Pressure (ACI 347) (calc-construction.js, Group E, 1 New Tile)

> **Status: CUT (2026-07-04, dupe of existing tile). NOT LANDED: concrete-formwork-pressure duplicates the existing formwork-pressure tile (calc-construction.js), which already computes the ACI 347 lateral pressure P = Cw(150 + 9000R/T) capped at the wet-head hydrostatic. v429 would only add the Cc chemistry coefficient and the 600*Cw minimum floor; a second near-identical tile would confuse. (Note for a maintainer: the existing formwork-pressure omits the ACI 347 P_min = 600*Cw floor and the Cc factor -- a small correctness gap worth adding to THAT tile rather than a new one.) The rest of the proposed trio (v430 rebar-weight-takeoff, v431 ready-mix-concrete-order) is genuinely new and lands. Original proposal below. First tile of a concrete-construction trio (v429 formwork pressure -> v430 rebar weight
> takeoff -> v431 ready-mix order). `shore-post-load` (ACI 347) carries the vertical form load; this tile gives the lateral
> pressure fresh concrete pushes on a wall form -- the number that sizes the ties, walers, and studs and, when a pour goes
> too fast, blows a form out.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Fresh concrete acts like a fluid against a wall form,
> and the faster it is placed the higher the pressure. ACI 347 gives, for a wall placed at under `7 ft/hr` and no taller than
> `14 ft`, `Pmax = Cw * Cc * (150 + 9000*R/T)`, where `R` is the rate of placement (ft/hr) and `T` the concrete temperature
> (deg F); the result is bounded below by `600*Cw` psf and above by the full hydrostatic `150*h`. `shore-post-load` handles
> the vertical load, not the lateral form pressure. This adds the pressure tile to the existing **`calc-construction.js`**
> module (Group E); no new group, trade, or dependency. Inherits spec.md through spec-v428.md.
>
> **The gap, and the evidence for it.** A normal-weight wall (`Cw = 1.0`, `Cc = 1.0`) placed at `R = 5 ft/hr` with concrete
> at `T = 70 deg F` develops `Pmax = 1.0*1.0*(150 + 9000*5/70) = 793 psf`. Slow the pour to `R = 3 ft/hr` and the formula
> gives `536 psf`, but the `600*Cw = 600 psf` minimum governs -- a real floor a form designer must respect. Warm concrete
> placed slowly is easier on the forms; cold concrete placed fast is what blows them out. No tile does this.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The unit-weight and chemistry
coefficients are dimensionless; the rate of placement is a speed (ft/hr); the temperature is a temperature (deg F); the
placement height is a length (ft); the pressure is a pressure (psf). The v18/v21 contract: any non-finite input, or a
non-positive rate, temperature, or height, returns `{ error }`; the tile applies the `600*Cw` minimum and the `150*h`
hydrostatic maximum, and flags a rate above `7 ft/hr` or a height above `14 ft` as outside this formula's range (the
higher-rate wall/column equations apply). Citation discipline (v19/v22): `GOVERNANCE.general` over the ACI 347 form pressure
by name; `editionNote` names **ACI 347 formwork, the wall pressure `Pmax = Cw*Cc*(150 + 9000*R/T)` for `R < 7 ft/hr` and
height `<= 14 ft`, the `600*Cw` minimum and `150*h` hydrostatic maximum, `Cw` the unit-weight coefficient (`1.0` for normal
weight) and `Cc` the chemistry coefficient (`1.0` to `1.4`), and the `R 7-15 ft/hr` wall and column equations for higher
rates**, and states that **this returns the design lateral form pressure, that it assumes a slump of `7 in` or less and
internal vibration to `4 ft`, and that it is a design aid, not a substitute for the formwork engineer**.

## 2. The tile

### 2.1 `concrete-formwork-pressure` -- Concrete Formwork Lateral Pressure (ACI 347)

```
inputs:
  rate_ft_hr   ft/hr   rate of placement R
  temp_f       F       concrete temperature T
  height_ft    ft      form/placement height
  cw           -       unit-weight coefficient (default 1.0)
  cc           -       chemistry coefficient (default 1.0)

p_formula = cw * cc * (150 + 9000*rate_ft_hr/temp_f)
p_min     = 600 * cw
p_max     = 150 * height_ft                     (full hydrostatic)
pmax      = clamp(p_formula, p_min, p_max)
```

**Pinned worked example (R 5 ft/hr, T 70 deg F, 12 ft wall, Cw Cc 1.0).** `p_formula = 150 + 9000*5/70 = 793 psf`; above
the `600` minimum and below the `150*12 = 1800` hydrostatic max, so `Pmax = 793 psf`. **Cross-check (slow pour hits the
floor).** At `R = 3 ft/hr`, `p_formula = 536 psf`, below the `600*Cw` minimum, so `Pmax = 600 psf` governs. A rate above
`7 ft/hr` is flagged as outside this equation's range; the non-positive and non-finite seams take the error path.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["concrete", "carpentry"]`, beside `shore-post-load`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, ACI 347 form pressure, `editionNote` naming the pressure formula, the
`600*Cw` min and `150*h` max, and the coefficient definitions); `test/fixtures/worked-examples.json` (the 793 psf example +
the minimum-governs cross-check); `test/fixtures/compute-map.js` (`concrete-formwork-pressure` ->
`computeConcreteFormworkPressure` in `../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `shore-post-load` /
`concrete-evaporation-rate` / `rebar-weight-takeoff` / `concrete`); `data/search/aliases.json` ("formwork pressure", "form
pressure", "aci 347 pressure", "lateral concrete pressure", "wall form pressure", "concrete placement pressure", "form tie
pressure", "rate of placement pressure", "9000 R over T"); the id appended to the existing construction renderers block in
`app.js`; the `// dims:` annotation (coefficients dimensionless, rate speed, temp temperature, height length, pressure
pressure); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the min/max clamps,
the out-of-range flag, and the non-positive / non-finite error seams. No new module; re-pin `calc-construction.js` on the
`check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the min/max clamps, the error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the Pmax output wraps on a phone); render-no-nan +
a11y sweep, output read to the value (R 5, T 70 -> 793 psf).

## 5. Roadmap position

Opens the concrete-construction trio: `rebar-weight-takeoff` (v430) and `ready-mix-concrete-order` (v431) cover the
reinforcement and the concrete order. A form-tie-spacing tile that consumes this pressure and a column/high-rate pressure
mode are the deliberate next follow-ons.
