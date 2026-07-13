# roughlogic.com Specification v656 -- Bridge Formula Minimum Axle Spread (calc-trucking.js, Group J, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-trucking.js`**
> (Group J, trucking), no new module, group, or dependency. Inherits spec.md through spec-v655.md.
>
> **The gap, and the evidence for it.** The `bridge-formula` tile takes an array of axle weights and spacings and
> reports pass/fail violations. It never answers the planning question a permit officer or heavy hauler starts
> with: "I need N axles to carry W pounds -- how far apart must they be?" Solving the Federal Bridge Formula B
> `W = 500 (L N/(N-1) + 12 N + 36)` for the spread gives `L = ((W/500) - 12 N - 36)(N-1)/N`. First-principles
> algebra; the 500/12/36 constants are already in the sibling. The pinned example: a **5-axle** group at
> **80,000 lb** needs at least **51.2 ft** outer-to-outer; a 2-axle group at 34,000 lb needs 4 ft.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The target group
weight and the average per-axle weight are `M L T^-2` (lb-force), the axle count is `dimensionless`, and the spread
is `L` (ft). The `500`, `12`, and `36` Bridge Formula B constants are the same ones `bridge-formula` already uses.
The v18/v21 contract: any non-finite input, a non-positive target weight, or fewer than 2 axles returns `{ error }`;
a group weight below the N-axle minimum yields a zero spread (the axles satisfy the formula bunched together), and a
weight above 80,000 lb sets an over-cap flag. Citation discipline (v19/v22): the Federal Bridge Formula B
(23 CFR 658.17) solved for the spread, by name; the note states that **L = ((W/500) - 12 N - 36)(N-1)/N, the result
is zero when the axles fit bunched together, and the 20,000 lb single / 34,000 lb tandem / 80,000 lb interstate caps
apply independently (over 80,000 lb needs a permit)** -- the enforcing state DOT and the permit govern.

## 2. The tile

### 2.1 `bridge-formula-min-spacing` -- The Minimum Axle Spread for a Target Group Weight

```
inputs:
  target_weight_lb   lb   group weight to carry (> 0)
  num_axles          -    consecutive axles in the group (>= 2)

min_spacing_ft = max(0, ((target_weight_lb / 500) - 12 x num_axles - 36) x (num_axles - 1) / num_axles)
avg_axle_lb    = target_weight_lb / num_axles
```

**Pinned worked example.** `W = 80,000 lb`, `N = 5`: `W/500 = 160`; `160 - 60 - 36 = 64`; `x 4/5 = ` **51.2 ft**.
**Cross-check (2-axle group).** `W = 34,000 lb`, `N = 2`: `(68 - 24 - 36) x 1/2 = ` **4 ft** -- and feeding a
[17,000, 17,000] pair at exactly 4 ft into the `bridge-formula` array tile shows no bridge or tandem violation.
**Cross-check (satisfies the forward formula).** The fuzzer feeds the 51.2 ft back into
`W = 500 (L N/(N-1) + 12 N + 36)` and recovers 80,000 lb; a group weight below the N-axle minimum returns a zero
spread.

## 3. Wiring

A `tools-data.js` row (group `J`, trades `["trucking"]`, beside `bridge-formula`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (Bridge Formula B solved for the spread, 23 CFR 658.17, the note per §1);
`test/fixtures/worked-examples.json` (the pinned example plus the 2-axle cross-check); `test/fixtures/compute-
map.js` (`bridge-formula-min-spacing` -> `computeBridgeFormulaMinSpacing`); `scripts/related-tiles.mjs` (<->
`bridge-formula`, `axle-load-distribution`, `gcwr-check`, `vehicle-load`); `data/search/aliases.json` ("bridge
formula min spacing", "minimum axle spread", "how far apart axles for weight", plus question rows, all
collision-checked); `TRUCKING_RENDERERS["bridge-formula-min-spacing"]` via the `_simpleRenderer` factory (field DOM
ids = the input keys) and the id added to the calc-trucking declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the
example, the forward-formula satisfaction, the array-tile cross-check through `computeBridgeFormula`, the
fits-at-zero and over-cap flags, and the error seams. The two `index.html` home-count spots go 1,104 -> 1,105
(check-readme-counts gates them). The calc-trucking.js gzip cap is expected to hold (verify at build). Lazy-loaded,
absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output
read to the value (the pinned example -> 51.2 ft).

## 5. Roadmap position

Completes the bridge-formula pair: `bridge-formula` (an axle array -> pass/fail) and now
`bridge-formula-min-spacing` (a target weight -> the required spread), the planning direction of the same 23 CFR
658.17 relation. Further Group J growth stays evidence-driven.
