# roughlogic.com Specification v622 -- Draft-Hood Dilution Ratio (calc-hvacservice.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacservice.js`**
> (Group C, HVAC field-service bench); no new module, group, or dependency. Inherits spec.md through spec-v621.md.
>
> **The gap, and the evidence for it.** Spec-v584 (`co-air-free`) names this tile as a deliberate follow-on: "a
> draft-hood dilution-ratio estimate," and the whole point of the air-free correction the sibling makes is that
> "as-measured CO is diluted by excess and dilution air and reads deceptively low ... sample in the flue **before**
> the draft hood." The technician who samples in the vent connector *after* the draft hood is measuring diluted
> gas, and this tile quantifies exactly how much room air the draft hood pulled in. The relation is pure
> combustion stoichiometry off the two oxygen readings -- the O2 at the appliance outlet and the O2 downstream of
> the draft hood -- because dilution with ambient air (20.9% O2) raises the flue O2 predictably: the dilution ratio
> (total flue volume to combustion-product volume) is `(20.9 - O2_appliance) / (20.9 - O2_diluted)`, and the
> dilution-air fraction is `(O2_diluted - O2_appliance) / (20.9 - O2_appliance)`. The number that catches
> technicians out: an appliance running a clean 5% O2 that reads 12% O2 at the vent has pulled in **44% dilution
> air** -- so a CO reading taken there is only 56% of the real flue concentration, and a 700 ppm air-free hazard
> can read a comfortable 390 ppm at the wrong sample point.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The two oxygen
readings, the dilution ratio, and the dilution-air fraction are `dimensionless` (percent / ratio). The v18/v21
contract: any non-finite input, an appliance O2 or a diluted O2 outside `[0, 20.9)`, or a diluted O2 not greater
than the appliance O2 (dilution can only *raise* the O2 -- if it did not rise, there is no draft-hood dilution or
the sample points are swapped) returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the
combustion-air dilution stoichiometry by name (combustion-analysis practice; the 20.9% ambient-oxygen mass
balance, matching the `co-air-free` / `excess-air-o2` siblings); `editionNote` prints
`dilution_ratio = (20.9 - O2_appliance) / (20.9 - O2_diluted)` and
`dilution_air_fraction = (O2_diluted - O2_appliance) / (20.9 - O2_appliance)`, and states that **the appliance O2
is measured at the appliance flue outlet before the draft hood and the diluted O2 in the vent connector after it,
a CO or efficiency reading taken in the diluted stream understates the real flue concentration by the same ratio
(sample before the draft hood, per co-air-free), and the analyzer and the manufacturer instructions govern** -- a
diagnostic aid, not a certified combustion test.

## 2. The tile

### 2.1 `draft-hood-dilution` -- How Much Room Air the Draft Hood Pulled In

```
inputs:
  appliance_o2_pct   %   flue-gas O2 at the appliance outlet, before the draft hood (in [0, 20.9))
  diluted_o2_pct     %   flue-gas O2 in the vent connector, after the draft hood (> appliance_o2, < 20.9)

dilution_ratio        = (20.9 - appliance_o2_pct) / (20.9 - diluted_o2_pct)          [-]
dilution_air_fraction = (diluted_o2_pct - appliance_o2_pct) / (20.9 - appliance_o2_pct) x 100   [%]
co_read_fraction      = 1 / dilution_ratio x 100                                     [%]   (what a CO reading there shows)
```

**Pinned worked example (a clean appliance, sampled at the vent).** Appliance O2 5%, diluted O2 12%:
`dilution_ratio = (20.9 - 5) / (20.9 - 12) = 15.9 / 8.9 = ` **1.79**, `dilution_air_fraction = (12 - 5) / (20.9 - 5)
= ` **44.0%**, so a CO reading in the vent connector is only **56%** of the true flue concentration. **Cross-check
(a leakier draft hood).** Appliance O2 8%, diluted O2 14%: `dilution_ratio = 12.9 / 6.9 = ` **1.87**,
`dilution_air_fraction = 6 / 12.9 = ` **46.5%** -- nearly half the vent flow is room air, exactly why the air-free
CO sample must be taken upstream.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, beside `co-air-free`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (both
examples); `test/fixtures/compute-map.js` (`draft-hood-dilution` -> `computeDraftHoodDilution` in
`../../calc-hvacservice.js`); `scripts/related-tiles.mjs` (-> `co-air-free` / `excess-air-o2` /
`flue-gas-combustion-eff`); `data/search/aliases.json` ("draft hood dilution", "dilution air", "vent connector
dilution", "dilution ratio combustion", plus question rows); `HVACSERVICE_RENDERERS["draft-hood-dilution"]` via a
hand-written renderer (the module's `makeNumber` / `makeOutputLine` / `attachExampleButton` / `debounce` / `fmt`
helpers, mirroring `co-air-free`) and the id added to the calc-hvacservice declare list in `app.js`; the `// dims:`
annotation directly above the compute; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning
both examples, the no-dilution identity (equal O2 errors), the reciprocal CO-read relation, and the error seams
(non-finite, O2 out of [0, 20.9), diluted <= appliance). Group C has no exact audit-count assertion and the
mechanical-governance test is an explicit list, so no count bump. The calc-hvacservice.js gzip cap is expected to
hold (verify at build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output
read to the value (the pinned example -> ratio 1.79, 44.0% dilution air).

## 5. Roadmap position

Completes the combustion-analyzer cluster spec-v584 opened beside `co-air-free` and `excess-air-o2`: it explains
the deceptively-low CO the air-free tile corrects, in terms of the two O2 readings a tech already takes. The
v584-named CO-per-BTU production rate remains a deliberate future follow-on. Further Group C growth stays
evidence-driven.
