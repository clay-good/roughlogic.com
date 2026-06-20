# roughlogic.com Specification v115 -- Trucking Weight Compliance: GCWR Combination Check and Tire Load-Rating Check (calc-trucking.js, Group J, 2 New Tiles)

> **Status: SPECIFIED 2026-06-20, awaiting an execution pass.** In-scope catalog expansion under
> the spec-v106 charter: two Tier-2 trucking tiles from public FMCSA limits and manufacturer
> rating plates, AHJ / scale governed, redo-not-harm. Adds two tiles to **`calc-trucking.js`**
> (Group J); no new module, group, or dependency. Inherits spec.md through spec-v114.md.
>
> **The gap, and the evidence for it.** The catalog covers per-axle and bridge-formula limits
> (`Federal Bridge Formula and Axle Weights`, `Axle-Load Tandem Slide`, `Vehicle Load
> Distribution`) but neither of two pre-dispatch checks a driver makes: the gross combination
> against the rated GCWR, and the per-axle weight against the tires' marked load rating. Both are
> daily, both are public-data.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply.
Weights are `M` (force, lbf as the field unit). Bundled defaults (the 80,000 lb federal gross
maximum per 49 CFR) are annotated editable fields. The v18/v21 contract: any non-finite input, or
a non-positive rating or weight, returns `{ error }`. Citation discipline (v19/v22):
`gcwr-check` cites the manufacturer GCWR plate and 49 CFR 393.75 / 658.17 federal limits;
`tire-load-check` cites the DOT tire sidewall marking and 49 CFR 393.75; the plate, the sidewall,
and the scale / AHJ govern. No copyrighted table is reproduced (the user enters the marked
rating).

## 2. The tiles

### 2.1 `gcwr-check` -- Gross Combination Weight Check

```
inputs:
  gcwr_lb            M   manufacturer rated gross combination weight
  tractor_weight_lb  M   current (loaded) power-unit weight
  trailer_weight_lb  M   current (loaded) trailer weight
  federal_max_lb     M   federal gross cap (default 80,000)

combined_lb = tractor_weight_lb + trailer_weight_lb
margin_gcwr = gcwr_lb - combined_lb
margin_fed  = federal_max_lb - combined_lb
verdict: ok if combined <= min(gcwr_lb, federal_max_lb); else over by the binding margin
```

**Pinned worked example.** GCWR 80,000, tractor 18,000, trailer 60,000: combined 78,000, GCWR
margin +2,000, federal margin +2,000 -> ok. **Cross-check:** trailer loaded to 65,000 -> combined
83,000, over by 3,000 against both the GCWR and the 80,000 federal cap. A permit or the AHJ governs
any over-limit move.

### 2.2 `tire-load-check` -- Tire Load-Rating Check (per Axle)

```
inputs:
  axle_weight_lb     M              scale weight on the axle
  tires_on_axle      dimensionless  tires on the axle (2 single / 4 dual)
  tire_max_load_lb   M              marked max load per tire (sidewall, single or dual rating)

axle_capacity_lb = tires_on_axle x tire_max_load_lb
utilization_pct  = 100 x axle_weight_lb / axle_capacity_lb
verdict: ok if axle_weight_lb <= axle_capacity_lb; else overloaded by the difference
```

**Pinned worked example.** Steer axle 12,000 lb on 2 tires marked 6,175 lb each: capacity 12,350,
utilization 97.2 percent -> ok (tight). **Cross-check:** the same axle at 12,500 lb -> over by 150
lb, overloaded. Use the sidewall's dual rating when the axle is in a dual position; the marking and
the AHJ govern.

## 3. Wiring

Per tile: a `tools-data.js` row (group `J`, trade `["trucking"]`); a `tile-meta.js` `_TILES` entry;
a `citations.js` entry (`gcwr-check` -> 49 CFR 393.75/658.17 + GCWR plate; `tire-load-check` ->
49 CFR 393.75 + DOT sidewall); worked-examples fixtures (each example + cross-check);
`compute-map.js` (`gcwr-check` -> `computeGcwrCheck`, `tire-load-check` -> `computeTireLoadCheck`,
both in `../../calc-trucking.js`); `related-tiles.mjs` (`gcwr-check` -> `federal-bridge-formula` /
`axle-load-tandem-slide` / `vehicle-load-distribution`; `tire-load-check` -> `vehicle-load-
distribution` / `federal-bridge-formula`); `data/search/aliases.json` (`gcwr-check`: "gcwr",
"combination weight", "combined gross weight", "tractor trailer weight"; `tire-load-check`:
"tire load rating", "tire load index", "axle tire capacity", "overloaded tires"); the two ids
appended to the existing `TRUCKING_RENDERERS` declare in `app.js`; the `// dims:` annotations;
regenerated corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples,
cross-checks, and error seams. Raise the `calc-trucking.js` size cap by ~20 percent if needed; bump
the `citations.js` cap if needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` **+2 tiles**);
`npm test` (+4 fixtures, the new fuzzer block); `npm run build` (two new shells, regenerated
sitemap); `data:verify`; worked-examples runner; 320 px audit (the margin and utilization lines
wrap); render-no-nan + a11y sweep, output read to the value (80,000 GCWR / 78,000 combined -> ok;
12,000 lb on 2 x 6,175 -> 97.2 percent).

## 5. Roadmap position

Completes the pre-dispatch weight-compliance family alongside bridge-formula and axle-slide.
Further Group J growth stays evidence-driven.
