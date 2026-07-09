# roughlogic.com Specification v541 -- Sweat Rate and Fluid Replacement (calc-rescue.js, Group P, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-rescue.js`**
> (Group P, field, backcountry, and SAR); no new module, group, or dependency. Inherits spec.md through spec-v540.md.
>
> **The gap, and the evidence for it.** `heat-stress` gives WBGT exposure limits but never quantifies an individual's
> fluid loss, which is what actually strands a searcher or a wildland crew member. The ACSM/NATA weigh-in/weigh-out
> method turns a body-weight change into a personal sweat rate: the weight lost during work, plus what was drunk, minus
> urine, is the sweat volume (a pound of body weight is about 16 fluid ounces). The catch the tile makes explicit is the
> danger threshold: a **stable** body weight means intake matched sweat, but a **drop** of even 2% of body weight
> measurably degrades endurance and judgment -- the real field hazard. Rehydration should target about 1.5 times the
> deficit because sweating continues and some intake is lost to urine. The tile takes the pre- and post-activity weights,
> the fluid consumed, and the duration, and returns the sweat loss, the hourly sweat rate, the percent of body weight
> lost, and the recommended rehydration volume -- the numbers that set a drinking plan for the next shift.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The body weights are
weights (`M L T^-2`, in lb, though used as masses here); the fluid volumes are volumes (`L^3`, in fl oz); the duration is
a time (`T`, in hours); the sweat rate is `L^3 T^-1` (oz/hr); the percent body-weight loss is `dimensionless`; the `16`
oz-per-pound constant is `dimensionless`. The v18/v21 contract: any non-finite input, a non-positive pre-activity
weight, a negative fluid consumed or urine, or a non-positive duration returns `{ error }`. Citation discipline
(v19/v22): `GOVERNANCE.general` over the fluid-replacement method by name (ACSM / NATA position on fluid replacement);
`editionNote` names the **weigh-in/weigh-out sweat-rate method**, prints
`sweat_loss = (pre - post) x 16 + fluid_consumed - urine`, `sweat_rate = sweat_loss / hours`,
`pct_bw_loss = (pre - post) / pre x 100`, and `rehydration = 1.5 x max(0, deficit)`, and states that **a stable body
weight means intake matched sweat while a drop of even 2% of body weight measurably degrades performance and judgment,
rehydration targets about 1.25 to 1.5 times the deficit because sweating continues and urine takes some, this is fluid
volume not electrolyte replacement, and individual and medical guidance governs** -- a planning aid, not medical advice.

## 2. The tile

### 2.1 `sweat-rate-hydration` -- Turning a Weight Change Into a Personal Sweat Rate

```
inputs:
  pre_weight_lb    lb      body weight before the activity
  post_weight_lb   lb      body weight after
  fluid_oz         fl oz   fluid consumed during the activity
  urine_oz         fl oz   urine output during (0 if none/unmeasured)
  duration_hr      hr      activity duration

weight_change_oz = (pre_weight_lb - post_weight_lb) x 16                        [oz]
sweat_loss_oz    = weight_change_oz + fluid_oz - urine_oz                       [oz]
sweat_rate       = sweat_loss_oz / duration_hr                                  [oz/hr]
pct_bw_loss      = (pre_weight_lb - post_weight_lb) / pre_weight_lb x 100       [%]
rehydration_oz   = 1.5 x max(0, (pre_weight_lb - post_weight_lb) x 16)          [oz]
```

**Pinned worked example (180 lb pre, 177 lb post, 20 oz drunk, 2-hour patrol).** The 3 lb drop is
`3 x 16 = 48 oz` of net loss, so the total sweat is `48 + 20 = ` **68 oz**, a sweat rate of `68 / 2 = ` **34 oz/hr**.
The body-weight loss is `3 / 180 x 100 = ` **1.7%** -- approaching the 2% performance-degradation line -- and the
recommended rehydration is `1.5 x 48 = ` **72 oz** over the following hours. **Cross-check (matched intake means no
deficit).** If the searcher had drunk `68 oz` and ended at `180 lb` (no weight change), the sweat rate would still be
`68 / 2 = 34 oz/hr` but the percent loss would be **0%** and the rehydration target **0 oz** -- intake matched sweat, the
goal. The tile returns the sweat loss, the hourly rate, the percent body-weight loss, and the rehydration volume.

## 3. Wiring

A `tools-data.js` row (group `P`, trades `["field", "fire"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the deficit example + the matched-
intake cross-check); `test/fixtures/compute-map.js` (`sweat-rate-hydration` -> `computeSweatRateHydration` in
`../../calc-rescue.js`); `scripts/related-tiles.mjs` (-> `heat-stress` / `wind-chill` / `backcountry-needs`);
`data/search/aliases.json` ("sweat rate", "fluid replacement", "hydration calculator", "weigh in weigh out", "sweat
loss", "dehydration percent", "rehydration volume", "fluid deficit"); the id appended to the rescue renderers declare in
`app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples, the oz-per-pound conversion, the sweat-rate and percent-loss relations, the rehydration target, and the error
seams (non-finite, non-positive pre-weight / duration, negative fluid / urine). Hand-writes its renderer (mirroring the
calc-rescue.js pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the sweat-loss / rate / percent / rehydration stack wraps on a phone); render-no-nan + a11y on the
new tile, output read to the value (the 3 lb example -> 34 oz/hr, 1.7% loss).

## 5. Roadmap position

Adds the individual-fluid-loss number that `heat-stress` (WBGT) does not, giving a crew both the environmental limit and
the personal replacement volume. An electrolyte/sodium-replacement companion and a pre-hydration target are deliberate
future follow-ons. Further Group P growth stays evidence-driven.
