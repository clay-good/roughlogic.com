# roughlogic.com Specification v466 -- Ridge and Soffit Vent Linear Feet (calc-construction.js, Group E, 1 New Tile)

> **Status: CUT (2026-07-04) -- dupe of the existing `attic-ventilation` tile, which already outputs the 50/50 intake/exhaust split, the soffit-vent count, and the ridge-vent length. Not landed.. Second tile of the roofing-ventilation trio (v465 attic NFVA -> v466 ridge/soffit vent
> linear feet -> v467 powered attic ventilator). `attic-ventilation-nfva` gives the required net free vent area; this tile
> turns that area into the linear feet of ridge and soffit vent a roofer orders and installs.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A balanced attic vents half its net free area high (the
> ridge, exhaust) and half low (the soffit, intake). Each product has a net-free-area rating per foot (a ridge vent about
> `18 in^2/ft`, a soffit strip about `9 in^2/ft`), so the linear feet of each is the split area divided by that rating. The
> intake must at least match the exhaust or the exhaust starves. `attic-ventilation-nfva` gives the area, not the vent
> footage. This adds the linear-feet tile to the existing **`calc-construction.js`** module (Group E); no new group, trade,
> or dependency. Inherits spec.md through spec-v465.md.
>
> **The gap, and the evidence for it.** A required `720 in^2` net free area (the balanced `1/300` figure for a `1500 ft^2`
> attic) splits `360 in^2` to exhaust and `360 in^2` to intake; at `18 in^2/ft` of ridge vent that is `360/18 = 20 ft` of
> ridge, and at `9 in^2/ft` of soffit vent it is `360/9 = 40 ft` of soffit. The lower-rated soffit always needs more linear
> feet, which is why intake is the usual bottleneck. No tile does this; the roofer had the area but not the footage.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The required net free area and
the split areas are areas (in^2); the per-foot vent ratings are areas per length (in^2/ft); the linear feet are lengths
(ft). The v18/v21 contract: any non-finite input, or a non-positive area or vent rating, returns `{ error }`; the tile
splits the required area `50/50` between exhaust and intake, divides each by its rating for the linear feet, and flags when
the provided intake would be less than the exhaust. Citation discipline (v19/v22): `GOVERNANCE.general` over the balanced
attic ventilation split by name; `editionNote` names **the balanced `50/50` high/low split of the required net free vent
area, the linear feet `= split area / per-foot NFVA rating`, typical ratings (ridge vent `~18 in^2/ft`, continuous soffit
`~9 in^2/ft`, from the product label), and the requirement that intake meet or exceed exhaust**, and states that **this
returns the ridge and soffit vent footage for a balanced system, that manufacturer NFVA ratings vary, and that it is a
takeoff aid, not a substitute for the ventilation design**.

## 2. The tile

### 2.1 `ridge-soffit-vent-linear` -- Ridge and Soffit Vent Linear Feet

```
inputs:
  required_nfva_in2   in^2     required net free vent area (from attic-ventilation-nfva)
  ridge_nfva_per_ft   in^2/ft  ridge (exhaust) vent rating (default 18)
  soffit_nfva_per_ft  in^2/ft  soffit (intake) vent rating (default 9)

split_in2  = required_nfva_in2 / 2
ridge_ft   = split_in2 / ridge_nfva_per_ft
soffit_ft  = split_in2 / soffit_nfva_per_ft
```

**Pinned worked example (720 in^2 required, ridge 18, soffit 9 in^2/ft).** `split = 360 in^2` each;
`ridge = 360/18 = 20 ft`; `soffit = 360/9 = 40 ft`. **Cross-check (a higher-rated soffit).** A `12 in^2/ft` soffit product
drops the intake to `360/12 = 30 ft` -- a better vent needs less length. A non-positive area or rating takes the error
path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["roofing", "carpentry"]`, beside `attic-ventilation-nfva`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, balanced attic ventilation, `editionNote` naming the `50/50`
split, the linear-feet relation, and the typical ratings); `test/fixtures/worked-examples.json` (the base example + the
higher-soffit cross-check); `test/fixtures/compute-map.js` (`ridge-soffit-vent-linear` -> `computeRidgeSoffitVentLinear` in
`../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `attic-ventilation-nfva` / `powered-attic-ventilator` /
`roofing-squares` / `ridge-cap-nails`); `data/search/aliases.json` ("ridge vent linear feet", "soffit vent length",
"ridge soffit vent", "attic vent footage", "intake exhaust vent", "ridge vent calculator", "soffit vent calculator",
"balanced ventilation", "vent linear feet"); the id appended to the existing construction renderers block in `app.js`; the
`// dims:` annotation (areas area, ratings area/length, feet length); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the intake-vs-exhaust flag, and the non-positive / non-finite error
seams. No new module; re-pin `calc-construction.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home
first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the flag, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the ridge / soffit feet output wraps on a phone);
render-no-nan + a11y sweep, output read to the value (720 in^2 -> 20 ft ridge, 40 ft soffit).

## 5. Roadmap position

The middle of the roofing-ventilation trio: `attic-ventilation-nfva` (v465) supplies the required area and
`powered-attic-ventilator` (v467) is the fan alternative. A mixed-vent-product allocator (gable + ridge + soffit) is the
deliberate next follow-on.
