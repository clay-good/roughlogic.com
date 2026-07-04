# roughlogic.com Specification v465 -- Attic Ventilation Net Free Area (IRC R806) (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-03). First tile of a roofing-ventilation trio (v465 attic NFVA -> v466 ridge/soffit vent
> linear feet -> v467 powered attic ventilator). `roofing-squares` counts shingles; nothing sizes the attic ventilation that
> keeps a roof from cooking shingles and forming ice dams -- the required net free vent area.**
> In-scope catalog expansion under the spec-v106 trades-only charter. IRC R806 requires attic ventilation of at least
> `1/150` of the attic floor area in net free vent area (NFVA), reduced to `1/300` when at least half the vent area is high
> (within `3 ft` of the ridge) and the rest is low (soffit), for a balanced system. The catalog roofs the deck but never
> sizes the vents. This adds the NFVA tile to the existing **`calc-construction.js`** module (Group E); no new group, trade,
> or dependency. Inherits spec.md through spec-v464.md.
>
> **The gap, and the evidence for it.** A `1500 ft^2` attic needs `1500 / 150 = 10 ft^2 = 1,440 in^2` of net free vent area
> under the base rule, or `1500 / 300 = 5 ft^2 = 720 in^2` when the vents are balanced high and low (`1/300` rule). That is
> the number every ridge-vent and soffit-vent takeoff starts from. No tile does this; a roofer had the shingle count but not
> the ventilation requirement.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The attic floor area and the
net free vent area are areas (ft^2, also reported in in^2); the ratio denominator is dimensionless. The v18/v21 contract:
any non-finite input, or a non-positive floor area, returns `{ error }`; the tile reports the required NFVA under both the
`1/150` and the balanced `1/300` rules, and notes the balance condition (at least half high vents) required to use `1/300`.
Citation discipline (v19/v22): `GOVERNANCE.general` over the IRC attic ventilation by name; `editionNote` names **IRC R806,
the minimum net free vent area `= attic floor area / 150`, the reduced `= area / 300` when at least half the ventilation is
high (within `3 ft` of the ridge) and the rest low (soffit) for a balanced system, and the `144 in^2 per ft^2` conversion --
code text quoted per the CF-01 disclosure**, and states that **this returns the required attic net free vent area, that
manufacturer NFVA ratings (not gross opening) must be used, and that it is a design aid, not a substitute for the AHJ**.

## 2. The tile

### 2.1 `attic-ventilation-nfva` -- Attic Ventilation Net Free Area (IRC R806)

```
inputs:
  attic_area_ft2   ft^2   attic floor area

nfva_150_ft2 = attic_area_ft2 / 150       (base rule)
nfva_300_ft2 = attic_area_ft2 / 300       (balanced high/low)
nfva_150_in2 = nfva_150_ft2 * 144
nfva_300_in2 = nfva_300_ft2 * 144
```

**Pinned worked example (1500 ft^2 attic).** base `1500/150 = 10 ft^2 = 1,440 in^2`; balanced
`1500/300 = 5 ft^2 = 720 in^2`. **Cross-check (a bigger attic).** A `2400 ft^2` attic needs `16 ft^2` base or `8 ft^2`
balanced -- the requirement scales straight with floor area. A non-positive floor area takes the error path; the non-finite
seam is covered.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["roofing", "carpentry"]`, beside `roofing-squares`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, IRC R806, `editionNote` naming the `1/150` and balanced `1/300` rules
and the NFVA-not-gross note -- code text per CF-01); `test/fixtures/worked-examples.json` (the 1500 example + the 2400
cross-check); `test/fixtures/compute-map.js` (`attic-ventilation-nfva` -> `computeAtticVentilationNfva` in
`../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `roofing-squares` / `ridge-soffit-vent-linear` /
`powered-attic-ventilator` / `assembly-r-value`); `data/search/aliases.json` ("attic ventilation", "net free area", "nfva",
"attic vent calculator", "1/150 rule", "1/300 ventilation", "roof ventilation area", "attic vent requirement", "irc r806");
the id appended to the existing construction renderers block in `app.js`; the `// dims:` annotation (areas area, ratio
dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, both rules, and
the non-positive / non-finite error seams. No new module; re-pin `calc-construction.js` on the `check:module-sizes`
allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**, CF-01 disclosure);
`npm test` (+2 fixtures, the new fuzzer block, both rules, the error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the 1/150 / 1/300 output wraps on a phone);
render-no-nan + a11y sweep, output read to the value (1500 ft^2 -> 1,440 / 720 in^2).

## 5. Roadmap position

Opens the roofing-ventilation trio: `ridge-soffit-vent-linear` (v466) converts this NFVA to linear feet of vent, and
`powered-attic-ventilator` (v467) covers the fan alternative. A cathedral-ceiling (no attic) baffled-rafter mode is the
deliberate next follow-on.
