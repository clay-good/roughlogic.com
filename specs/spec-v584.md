# roughlogic.com Specification v584 -- Air-Free CO Correction (calc-hvacservice.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacservice.js`**
> (Group C, the HVAC service bench); no new module, group, or dependency. Inherits spec.md through spec-v583.md.
>
> **The gap, and the evidence for it.** A combustion analyzer reports carbon monoxide as measured, but that number is
> diluted by the excess and dilution air in the flue, so it reads **deceptively low** -- a dangerous appliance can look
> acceptable. The standard against which CO is judged (ANSI Z21's 400 ppm appliance limit) is **air-free**, so the
> measured value must be corrected up to what it would be with no dilution: `CO_air-free = CO_measured x 20.9 / (20.9 -
> O2)`. The bench has no tile for this correction. The catch is where you sample: the reading must be taken **in the
> flue, before the draft hood or dilution air**, or the correction over-inflates. The tile takes the measured carbon
> monoxide and oxygen, and returns the air-free carbon monoxide against the 400 ppm ANSI limit and the tighter field
> target -- the number that actually says whether an appliance is safe.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The measured and air-free
carbon monoxide are in parts per million (`dimensionless`); the measured oxygen and the `20.9` constant are
`dimensionless` (percents). The v18/v21 contract: any non-finite input, a negative carbon monoxide, or a measured oxygen
at or above 20.9 (no combustion product to correct) returns `{ error }`. Citation discipline (v19/v22):
`GOVERNANCE.general` over the CO-correction relation by name (ANSI Z21 400 ppm air-free limit; BPI field practice);
`editionNote` names the **air-free CO correction**, prints
`CO_air_free = CO_measured x 20.9 / (20.9 - measured_O2)`, notes the limits (**400 ppm air-free ANSI, under 100 ppm
field target**), and states that **as-measured CO is diluted by excess and dilution air and reads deceptively low, the
sample must be taken in the flue before the draft hood or dilution air (or the correction over-inflates), the correction
scales the reading to a no-dilution basis for comparison to the air-free limit, and the analyzer and the manufacturer
instructions govern** -- a safety-screening aid, not a certified combustion test.

## 2. The tile

### 2.1 `co-air-free` -- Why Measured CO Reads Low (and What the ANSI Limit Is Actually Against)

```
inputs:
  measured_co_ppm   ppm   flue-gas carbon monoxide as measured
  measured_o2_pct   %     flue-gas oxygen at the same point

CO_air_free = measured_co_ppm x 20.9 / (20.9 - measured_o2_pct)     [ppm]
over_ansi   = CO_air_free > 400
over_field  = CO_air_free > 100
```

**Pinned worked example (60 ppm measured CO at 8% oxygen).**
`CO_air_free = 60 x 20.9 / (20.9 - 8) = 60 x 20.9 / 12.9 = ` **97 ppm** -- the 60 ppm the analyzer showed is really 97
ppm on an air-free basis, just under the 100 ppm field target and well under the 400 ppm ANSI limit, so the appliance is
acceptable but worth watching. **Cross-check (less dilution corrects less).** The same 60 ppm measured at only 4%
oxygen (a tighter-combusting flue, less dilution): `CO_air_free = 60 x 20.9 / (20.9 - 4) = 60 x 20.9 / 16.9 = ` **74
ppm** -- a smaller correction because there was less air diluting it, showing that the oxygen at the sample point drives
how much the raw reading understates the truth. The tile returns the air-free CO and the limit flags.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 8% O2 example + the 4% O2 cross-
check); `test/fixtures/compute-map.js` (`co-air-free` -> `computeCoAirFree` in `../../calc-hvacservice.js`);
`scripts/related-tiles.mjs` (-> `excess-air-o2` / `combustion-air` / `flue-gas-combustion-eff`);
`data/search/aliases.json` ("air free co", "co correction", "ansi z21 400 ppm", "carbon monoxide flue", "co dilution
correction", "air free carbon monoxide", "combustion co test", "co ppm correction"); the id appended to the hvacservice
renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning both examples, the correction relation, the 400/100 ppm flags, and the error seams (non-finite, negative
CO, O2 >= 20.9). Hand-writes its renderer (mirroring the calc-hvacservice.js pattern). Lazy-loaded, absent from home
first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the air-free CO / limits stack wraps on a phone); render-no-nan + a11y on the new tile, output
read to the value (the 8% O2 example -> 97 ppm).

## 5. Roadmap position

Pairs with `excess-air-o2` (both from the same analyzer readings) and feeds `flue-gas-combustion-eff`. A CO-per-BTU
production rate and a draft-hood dilution-ratio estimate are deliberate future follow-ons. Further Group C growth stays
evidence-driven.
