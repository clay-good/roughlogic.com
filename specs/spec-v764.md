# roughlogic.com Specification v764 -- Chlorine Decay Constant from a Bottle Test (calc-water.js, Group M, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-water.js`** (Group M),
> no new module, group, or dependency. Inherits spec.md through spec-v763.md. Explore sweep #16 (entry 2, final).
> Closes Explore sweep #16 and the inverse-of-existing-tile campaign.
>
> **The gap, and the evidence for it.** The `chlorine-decay` tile takes the decay constant `k` as an input and projects
> the residual and the time to a target. But `k` is not a handbook number -- it depends on temperature, TOC, and pipe
> material, so an operator measures it with a **bottle (or pipe-loop) test**: an initial residual, a residual after some
> hours, and back out `k`. Solving `C = C0 * exp(-k*t)` for `k` gives `k = ln(C0 / C) / t`. The number this settles: a
> residual falling **2.0 -> 0.7358 mg/L** over **10 h** is a decay constant of **0.100 1/hr** (a **6.93 h** half-life),
> the very input the forward tile assumes.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`chlorine-decay` sibling: the residuals, elapsed time, decay constant, and half-life carry the sibling's dimensionless
treatment. It reuses the sibling's first-order relation, solved for `k`. The v18/v21 contract: a non-finite input, a
non-positive initial residual, a non-positive measured residual, a non-positive elapsed time, or a measured residual at
or above the initial residual (which implies no decay) returns `{ error }`. Citation discipline (v19/v22): the relation
solved for `k`, `GOVERNANCE.water` matching the sibling; the note states that `k` depends on temperature, TOC, and pipe
material, so the test should reflect the actual water and conditions, and that this back-calculated `k` is the field
number that feeds the forward decay and booster-spacing model. EPA 815-R-02-020 and AWWA M14.

## 2. The tile

### 2.1 `chlorine-decay-constant` -- Chlorine Decay Constant from a Bottle Test

```
inputs:
  initial_mg_l    dimensionless initial free-chlorine residual C0 (mg/L, > 0)
  residual_mg_l   dimensionless measured residual C after the elapsed time (mg/L, 0 < C < C0)
  time_hr         dimensionless elapsed time t (hr, > 0)

decay_k_per_hr = ln(C0 / C) / t
half_life_hr   = ln(2) / decay_k_per_hr
```

**Pinned worked example.** C0 = 2.0 mg/L, C = 0.7358 mg/L, t = 10 h:
`k = ln(2.0 / 0.7358) / 10 = ln(2.7182) / 10 = 1.0 / 10 = ` **0.100 1/hr**; `half-life = ln(2) / 0.1 = ` **6.93 h**.
Feeding k = 0.100 back through `chlorine-decay` at C0 = 2.0 over 10 h returns the 0.7358 mg/L residual, the input. A
residual that fell further in the same time (a lower C) returns a larger k and a shorter half-life.

## 3. Wiring

A `tools-data.js` row (group `M`, trades `["water"]`) placed with the later disinfection tiles **past the exact-count
audited `// Group M: Water` .. `// Group N` block** (beside `chlorine-demand`), so the Group M audit count stays 34; a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (the relation solved for `k`, `GOVERNANCE.water` matching the
sibling); `test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js`
(`chlorine-decay-constant` -> `computeChlorineDecayConstant`); `scripts/related-tiles.mjs` (-> `chlorine-decay` /
`chlorine-demand` / `disinfection-ct`); `data/search/aliases.json` (5 collision-checked question aliases: "chlorine decay
constant from a bottle test", "decay rate from two chlorine readings", ...); the calc-water `WATER_RENDERERS` map entry
via a hand-written renderer (initial, measured, elapsed-time number fields) and the id added to the calc-water declare
list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the round-trip through `computeChlorineDecay`
across a C0/k/t sweep, the lower-residual-larger-k / larger-k-shorter-half-life behavior, and the error seams. The
calc-water.js gzip cap (raised to 30000 B in this spec) covers the addition. Verify at build, including `check-shells`.
Lazy-loaded, absent from home first paint. Home tile count 1,212 -> 1,213.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 0.100 1/hr and a 6.93 h
half-life for a 2.0 -> 0.7358 mg/L drop over 10 h).

## 5. Roadmap position

Pairs the forward `chlorine-decay` tile (residual and booster spacing from a known k) with its inverse (k from a field
bottle test), the two halves of the first-order decay relation. Closes Explore sweep #16 and, with it, the
inverse-of-existing-tile campaign -- the vein is now drained (a wide pass over all 56 modules found no further clean
first-principles inverses). The next batch opens a different vein: new trades domains under the spec-v106 charter, or a
fresh non-inverse Explore.
