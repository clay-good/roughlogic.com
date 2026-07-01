# roughlogic.com Specification v247 -- Concrete Age-Strength Gain for Form Stripping and Loading (ACI 209) (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-01). Batch spec-v245..v247 (the cast-in-place placing-and-curing trio -- shore load,
> evaporation rate, and strength gain). This closes the v245..v247 batch.**
> In-scope catalog expansion under the spec-v106 trades-only charter: estimating how much of its 28-day strength a slab
> has reached at a given age is the schedule decision behind every form-strip and shore-removal, and it is one ACI 209
> relation. Adds one tile to **`calc-construction.js`** (Group E); no new module, group, or dependency. Inherits spec.md
> through spec-v246.md.
>
> **The gap, and the evidence for it.** Concrete keeps gaining strength for weeks, and the whole schedule of a concrete
> job -- when the wall forms come off, when the shores under an elevated slab can be pulled, when a post-tension can be
> stressed or a load applied -- turns on how much of the specified 28-day strength has developed at the current age. The
> ACI 209R model gives that fraction as `t / (a + b x t)`, which for standard Type I cement moist-cured lands at about
> 46 percent at 3 days, 70 percent at 7 days, and 88 percent at 14 days -- the curve every super carries in their head
> and the reason a slab that needs 75 percent to strip its shores waits past a week. The catalog places the concrete
> (`shore-post-load`, `concrete-evaporation-rate`) and designs its strength (`concrete-mix-design`) but has nothing that
> turns a design strength and an age into the developed strength that gates the strip.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The specified 28-day
strength and the developed strength are pressures (psi); the age is a time (days); the model constants and the developed
fraction are `dimensionless`; the target-fraction age solves back to a time (days). The v18/v21 contract: any non-finite
input, a non-positive 28-day strength or age, or a model constant at or below zero, returns `{ error }`; a requested
target fraction outside 0 to the model's asymptote returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general`
over the age-strength relation by name; `editionNote` names the **ACI 209R strength-development model**, `f'c(t) =
[t / (a + b x t)] x f'c(28)` with the fraction expressed relative to the 28-day strength, gives the bundled constants as
editable (Type I / II moist-cured a = 4.0, b = 0.85; the note lists that steam-cured and Type III mixes take different
pairs), and states that **the constants are for the cement type and curing named, other cements or accelerators shift the
curve, the model is an estimate of the mean strength trend and not a substitute for field-cured cylinder breaks or the
maturity method (ASTM C1074), the engineer of record and the project specification set the actual strip / shore-removal /
stressing strengths (commonly on the order of 75 percent of f'c to remove shores), and cold weather slows the gain the
model does not see** -- a scheduling estimate, not a strength acceptance.

## 2. The tile

### 2.1 `concrete-strength-gain` -- Age-Strength Fraction for Stripping and Loading

```
inputs:
  fc28        psi        specified 28-day compressive strength, psi
  age_days    days       concrete age since placement, days
  a           days       ACI 209 constant a (default 4.0, Type I/II moist-cured)
  b           -          ACI 209 constant b (default 0.85, Type I/II moist-cured)
  target_pct  %          optional: target percent of f'c to solve the age for (e.g. 75)

fraction   = age_days / (a + b * age_days)
fc_t       = fraction * fc28
# optional inverse: age at which fraction = target_pct/100
target_age = (a * (target_pct/100)) / (1 - b * (target_pct/100))   when target_pct given and b*target_pct/100 < 1
```

**Pinned worked example (4,000 psi slab at 7 days).** A slab specified at 4,000 psi, Type I moist-cured (a = 4.0,
b = 0.85), read at 7 days: `fraction = 7 / (4.0 + 0.85 x 7) = 7 / 9.95 = 0.704`; `fc_t = 0.704 x 4,000 = ` **2,814 psi**
(about 70 percent) -- past a wall-form strip but short of the 75 percent (3,000 psi) a spec often wants before pulling
the shores under it. **Cross-check (solving for the shore-removal age).** For the same mix, the age to reach a 75 percent
target: `target_age = (4.0 x 0.75) / (1 - 0.85 x 0.75) = 3.0 / (1 - 0.6375) = 3.0 / 0.3625 = ` **8.3 days** -- so the
crew that needs 75 percent waits until about day 9, and the 7-day break that reads 70 percent is exactly why they cannot
strip on the calendar's word alone. At 3 days the same slab is `3 / (4 + 2.55) = 0.458`, **1,832 psi** (46 percent) --
plenty to strip a non-load-bearing wall form, nowhere near enough to remove a slab's shores.

## 3. Wiring

A `tools-data.js` row (group `E`, trade `["concrete","construction"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, the age-strength relation, `editionNote` naming the ACI 209R model with the cement-type /
cylinder-break / spec-governs / cold-weather caveats); `test/fixtures/worked-examples.json` (the 7-day example + the
solve-for-age cross-check); `test/fixtures/compute-map.js` (`concrete-strength-gain` -> `computeConcreteStrengthGain` in
`../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `shore-post-load` / `concrete-mix-design` /
`concrete-evaporation-rate`); `data/search/aliases.json` ("concrete strength gain", "when to strip forms", "form
stripping strength", "shore removal strength", "concrete curing strength", "ACI 209", "7 day strength", "percent of
28 day"); the id appended to the existing construction renderers declare in `app.js`; the `// dims:` annotation;
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples and error seams (non-finite,
fc28 / age <= 0, constant <= 0, target fraction outside the valid range). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the non-positive-input and out-of-range-target error paths); `npm run build` (one new
shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the fraction / developed-psi /
target-age stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (4,000 psi at 7 days ->
2,814 psi, 70 percent).

## 5. Roadmap position

Closes the cast-in-place placing-and-curing batch (v245..v247). Answers the question `shore-post-load` (v245) leaves open
-- when the cure has advanced enough to pull the shores and strip the forms -- and picks up the cure that begins the
moment the `concrete-evaporation-rate` (v246) screen is satisfied. Works from the design strength that `concrete-mix-design`
sets. A maturity-method (ASTM C1074, time-temperature) strength estimate and a cold-weather (below-freezing) gain
adjustment are deliberate future follow-ons.
