# roughlogic.com Specification v365 -- Lighting Light-Loss Factor (Maintained/Initial) (calc-elecdesign.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.128.0). Batch spec-v365..v367 (the lighting-design trio -- the maintenance and
> quality numbers the lumen-method tiles take as a given: the light-loss factor built from its components (this spec), the
> illuminance uniformity ratio (v366), and the egress-lighting compliance check (v367).)**
> In-scope catalog expansion under the spec-v106 trades-only charter: `lumen-method` and `lux-to-footcandle` both take the
> light-loss factor (LLF) as an input but never compute it, and the LLF -- the product of lamp lumen depreciation, luminaire
> dirt depreciation, and the ballast/driver factor -- is what separates the maintained footcandles a room actually holds
> from the initial ones. The catalog has no LLF-buildup tile. Adds one tile to the existing **`calc-elecdesign.js`** module
> (Group A); no new group, trade, or dependency. Inherits spec.md through spec-v364.md.
>
> **The gap, and the evidence for it.** The total light-loss factor is the product of its recoverable and non-recoverable
> factors: `LLF = LLD x LDD x BF x (others)`, where `LLD` is the lamp lumen depreciation (lumens at end of life vs initial),
> `LDD` the luminaire dirt depreciation, and `BF` the ballast/driver factor. For a system with `LLD = 0.85`, `LDD = 0.90`,
> and `BF = 0.95`, `LLF = 0.85 x 0.90 x 0.95 = 0.727` -- so a fixture rated 4,000 initial lumens delivers `4,000 x 0.727 = 2,908`
> maintained lumens, and a lumen-method design must use the 0.727, not 1.0, or the room comes up a third short at end of
> maintenance cycle. The factors multiply, so a dirty environment and a cheap lamp compound. `lumen-method` consumes the
> LLF; this tile builds it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. Each loss factor and the total
LLF are dimensionless (0 to 1); the initial and maintained lumens (optional) are luminous fluxes (lm). The v18/v21
contract: any non-finite input, or a factor outside `0 < f <= 1`, returns `{ error }`. Citation discipline (v19/v22):
`GOVERNANCE.general` over the light-loss-factor buildup by name; `editionNote` names **the total LLF as the product of the
recoverable (lamp lumen depreciation `LLD`, luminaire dirt depreciation `LDD`, lamp burnout, room-surface dirt) and
non-recoverable (ballast/driver factor `BF`, temperature, voltage, tilt) factors, the maintained lumens `= initial x LLF`,
and the IES lighting-handbook LLF method**, and states that **this returns the total light-loss factor from the entered
components -- it multiplies the factors provided (supply the ones that apply; LED systems fold lamp and ballast into a
driver/L70 factor), feeds `lumen-method`/`lux-to-footcandle`, and does not itself compute the individual factors (from the
lamp/luminaire data and the maintenance cycle/environment); and this is a design aid** -- the IES recommended factors and
the manufacturer's data govern.

## 2. The tile

### 2.1 `lighting-light-loss-factor` -- Lighting Light-Loss Factor

```
inputs (each optional, 0..1):
  LLD    lamp lumen depreciation
  LDD    luminaire dirt depreciation
  BF     ballast/driver factor
  LBO    lamp burnout factor
  RSDD   room-surface dirt depreciation
  temp, voltage, tilt   (other factors)
  initial_lm   lm   initial lumens (optional, for maintained)

LLF = product of the entered factors
maintained_lm = initial_lm * LLF
```

**Pinned worked example (LLD 0.85, LDD 0.90, BF 0.95).** `LLF = 0.85 x 0.90 x 0.95 = 0.727`; a 4,000 lm fixture delivers
`4,000 x 0.727 = 2,908` maintained lumens. **Cross-check (a clean office with a good LED, fewer losses).** `LLD = 0.95`
(L95 LED), `LDD = 0.95` (clean), `BF = 0.98` (efficient driver): `LLF = 0.95 x 0.95 x 0.98 = 0.884` -- a 22% higher
maintained output than the first system, so the same footcandle target needs fewer fixtures, the payoff of clean rooms and
good lamps that a lumped guess hides. The non-finite and out-of-range-factor error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`, matching `lumen-method`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the LLF buildup, `editionNote` naming the product-of-factors form, the
recoverable/non-recoverable categories, the maintained-lumens relation, and the enter-factors, feeds-lumen-method caveats);
`test/fixtures/worked-examples.json` (the base example + the clean-LED cross-check); `test/fixtures/compute-map.js`
(`lighting-light-loss-factor` -> `computeLightingLightLossFactor` in `../../calc-elecdesign.js`);
`scripts/related-tiles.mjs` (-> `lumen-method` / `lux-to-footcandle` / `lighting-uniformity-ratio` / `lighting-density`);
`data/search/aliases.json` ("light loss factor", "LLF", "maintained lumens", "lamp lumen depreciation", "luminaire dirt
depreciation", "ballast factor", "maintenance factor lighting", "LLF calculator", "initial vs maintained"); the id
appended to the existing elecdesign renderers block in `app.js`; the `// dims:` annotation (factors dimensionless, lumens
luminous flux); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the
multiplicative product, the maintained-lumens, and the out-of-range-factor / non-finite error seams. No new module; re-pin
`calc-elecdesign.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the product assertion); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the per-factor and `LLF` stack wraps on a phone);
render-no-nan + a11y sweep, output read to the value (0.85 x 0.90 x 0.95 -> LLF 0.727).

## 5. Roadmap position

Opens the lighting-design batch (v365..v367) in `calc-elecdesign.js`, building the LLF the lumen-method tiles consume. The
uniformity ratio (v366) and egress check (v367) follow. An IES recommended-factor lookup by environment and maintenance
cycle, an LED L70/L90 lumen-maintenance-to-LLD conversion, and a direct chain into `lumen-method` are the deliberate next
follow-ons once the trio lands.
