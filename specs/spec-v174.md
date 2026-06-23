# roughlogic.com Specification v174 -- Rooftop Conduit Sunlight Ambient Temperature Adder (NEC 310.15(B)(2)) (calc-electrical.js, Group A, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v164..v178 (electrician trade).** In-scope catalog
> expansion under the spec-v106 trades-only charter: one tile applying the NEC 310.15(B)(2) rooftop
> sunlight temperature adder (33 deg-C / 60 deg-F where the raceway is less than 7/8 in above the roof)
> to a measured ambient before ampacity correction. Adds one tile to **`calc-electrical.js`** (Group
> A); no new module, group, or dependency. Inherits spec.md through spec-v163.md.
>
> **The gap, and the evidence for it.** The catalog corrects ampacity for ambient and fill
> (`ambient-ampacity-adjust`) but never applies the rooftop adder that *creates* the high ambient: a
> conduit lying on a hot roof in direct sun runs far above air temperature, and 310.15(B)(2) adds 33
> deg-C to the ambient when the raceway is within 7/8 in of the roof. Skipping it is a documented
> failure mode on rooftop PV and HVAC runs, and no tile applies it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The
measured ambient, the adder, and the design ambient are `temperature` (deg-F to match the bundled 60
deg-F adder); the height above roof is `L` (in); the resulting correction factor is `dimensionless`.
The bundled 60 deg-F (33 deg-C) adder, the 7/8 in threshold, and the 90 deg-C-column correction
factors are annotated as the public NEC values. The v18/v21 contract: any non-finite input, or a
negative height, returns `{ error }`; there are no user-denominator divisions. Citation discipline
(v19/v22): `GOVERNANCE.electrical`, edition `NEC 2020/2023 310.15(B)(2) (raceways and cables exposed
to sunlight on or above rooftops)`, `editionNote` `NEC_DISCLOSURE`, with the note that the 2017 NEC
reduced the older tiered Table 310.15(B)(3)(c) to this single 33 deg-C adder applied below 7/8 in,
that standoffs raising the raceway at or above 7/8 in remove the adder, and that the resulting ambient
feeds the temperature-correction step (cross-reference `ambient-ampacity-adjust`).

## 2. The tile

### 2.1 `rooftop-temp-adder` -- Rooftop Sunlight Ambient Adder and Corrected Ampacity Factor

```
inputs:
  measured_ambient_f   temperature  outdoor design ambient at the roof (deg-F)
  height_above_roof_in L            distance from roof surface to bottom of raceway (in)
  base_ampacity_a      I            conductor ampacity from the 90 C column before correction

adder_f        = height_above_roof_in < 0.875 ? 60 : 0      # 7/8 in = 0.875 in threshold
design_ambient_f = measured_ambient_f + adder_f
correction     = 90 C-column temperature-correction factor at design_ambient_f
corrected_a    = base_ampacity_a x correction
```

**Pinned worked example.** A conduit lying on the roof (height ~0 in, under 7/8 in) at a 95 deg-F
measured ambient, #8 THWN-2 at 55 A (90 C column): `adder = 60 deg-F`;
`design_ambient = 95 + 60 = 155 deg-F (~68 deg-C)`; the 90 C-column correction near 68 deg-C is about
**0.58**, so `corrected = 55 x 0.58 = 31.9 A`. The conductor that looked like 55 A is really ~32 A on
that roof. **Cross-check (on standoffs).** The same run raised to 1 in above the roof
(>= 7/8 in): `adder = 0`, `design_ambient = 95 deg-F (~35 deg-C)`, correction ~**0.96**,
`corrected = 55 x 0.96 = 52.8 A`. Lifting the raceway off the roof recovers most of the ampacity. The
AHJ and the adopted NEC edition govern.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["electrical"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.electrical`, NEC 2020/2023 310.15(B)(2), the 60 deg-F adder, the
7/8 in threshold, and the correction-factor basis listed, `editionNote` `NEC_DISCLOSURE`);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`rooftop-temp-adder` -> `computeRooftopTempAdder` in `../../calc-electrical.js`);
`scripts/related-tiles.mjs` (-> `ambient-ampacity-adjust` / `wire-ampacity` / `pv-string-sizing`);
`data/search/aliases.json` ("rooftop adder", "310.15(B)(2)", "rooftop conduit", "sunlight ambient",
"roof temperature derate", "rooftop ampacity"); the id appended to the existing `ELECTRICAL_RENDERERS`
declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning the on-roof example, the standoff cross-check, and error seams
(non-finite, height < 0). Raise the `calc-electrical.js` size cap by ~20 percent if needed (dated
comment); bump the `citations.js` cap if needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block, the standoff path); `npm run build` (one new
shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the adder,
design ambient, correction, and corrected ampacity wrap on a phone); render-no-nan + a11y sweep,
output read to the value (on-roof 95 F -> 155 F design -> ~0.58 -> 31.9 A; on standoffs -> ~52.8 A).

## 5. Roadmap position

Feeds the temperature-correction family (`ambient-ampacity-adjust`, `wire-ampacity`) and the rooftop
PV family (`pv-string-sizing`). Further Group A growth stays evidence-driven.
