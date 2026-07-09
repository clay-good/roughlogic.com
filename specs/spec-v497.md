# roughlogic.com Specification v497 -- Long-Term Deflection Multiplier (calc-concrete.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-concrete.js`**
> (Group E, the concrete design bench); no new module, group, or dependency. Inherits spec.md through spec-v496.md.
>
> **The gap, and the evidence for it.** A reinforced-concrete beam keeps deflecting for years after the shoring comes
> out: creep and shrinkage under sustained load add to the immediate deflection, and ACI 318-19 §24.2.4.1 captures it
> with a multiplier the bench does not yet compute. The catch is the compression steel. The long-term multiplier is
> `lambda = xi / (1 + 50 rho')`, where `xi` is a time factor that tops out at `2.0` for five years or more and `rho'`
> is the compression-reinforcement ratio. A beam with no compression steel gets the full multiplier and can sag more
> than double its initial deflection over time; adding compression bars drives `rho'` up and knocks the multiplier down
> toward `1.2`, which is exactly why doubly-reinforced beams hold their line while bottom-only beams droop. Designers
> either forget the sustained-load creep entirely and pass a snapshot deflection check, or double-count the immediate
> term. The tile takes the immediate sustained-load deflection, the load duration, and the compression-steel ratio, and
> returns the creep multiplier, the additional long-term deflection, and the total -- the number the `L/240` limit for
> attached nonstructural elements is actually checked against.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The immediate, additional,
and total deflections are lengths (`L`); the time factor `xi`, the compression-steel ratio `rho'`, and the multiplier
`lambda` are `dimensionless`. The v18/v21 contract: any non-finite input, a negative immediate deflection, a non-
positive time factor, or a negative compression-steel ratio returns `{ error }`. Citation discipline (v19/v22): `ACI`
over §24.2.4.1; `editionNote` names **ACI 318-19 §24.2.4.1.1 (additional time-dependent deflection)**, prints
`lambda = xi / (1 + 50 x rho')`, `additional = lambda x immediate`, and `total = immediate + additional`, lists the
`xi` values (**2.0 at 5 years or more, 1.4 at 12 months, 1.2 at 6 months, 1.0 at 3 months**), and states that **the
multiplier applies to the immediate deflection from the sustained portion of the load (dead plus the sustained fraction
of live), compression reinforcement `rho' = As' / (b d)` reduces creep so a doubly-reinforced beam deflects far less
over time, the total long-term deflection is what the `L/240` and `L/480` serviceability limits are checked against, and
the immediate deflection itself comes from an effective-moment-of-inertia analysis (Ie)** -- a design aid, not the
engineer of record.

## 2. The tile

### 2.1 `concrete-longterm-defl` -- Why Bottom-Only Beams Sag and Doubly-Reinforced Ones Hold

```
inputs:
  immediate_defl_in    in    immediate deflection from the sustained load
  duration_months      mo    sustained-load duration (selects xi: >=60 -> 2.0, 12 -> 1.4, 6 -> 1.2, 3 -> 1.0)
  comp_steel_ratio     -     rho' = As' / (b d), the compression-reinforcement ratio (0 if none)

xi         = 2.0 if months >= 60, 1.4 if >= 12, 1.2 if >= 6, else 1.0     [-]   (interp/step per 24.2.4.1)
lambda     = xi / (1 + 50 x comp_steel_ratio)                            [-]
additional = lambda x immediate_defl_in                                  [in]
total      = immediate_defl_in + additional                              [in]
```

**Pinned worked example (a bottom-only beam, 0.4 in immediate, 5-year sustained load).** With no compression steel
`rho' = 0`, so `lambda = 2.0 / (1 + 0) = ` **2.0**; the additional long-term deflection is `2.0 x 0.4 = ` **0.80 in**
and the total is `0.4 + 0.8 = ` **1.20 in** -- the beam ends up sagging three times its immediate value, the failure
that catches a designer who checks only the snapshot. **Cross-check (compression steel tames the creep).** Add
compression bars so `rho' = 0.01`: `lambda = 2.0 / (1 + 50 x 0.01) = 2.0 / 1.5 = ` **1.333**, `additional = ` **0.53
in**, and `total = ` **0.93 in** -- a 22% smaller long-term deflection from the same load, purely from the compression
steel that resists creep. The tile returns the time factor, the multiplier, the additional deflection, and the total.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`ACI`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the bottom-only example + the doubly-reinforced
cross-check); `test/fixtures/compute-map.js` (`concrete-longterm-defl` -> `computeConcreteLongtermDefl` in
`../../calc-concrete.js`); `scripts/related-tiles.mjs` (-> `joist-deflection` / `rc-beam-flexure` / `steel-camber`);
`data/search/aliases.json` ("long-term deflection", "creep deflection", "sustained load deflection", "lambda delta",
"aci 24.2.4", "compression steel creep", "time-dependent deflection", "l/240"); the id appended to the concrete
renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning both examples, the xi step values by duration, the monotonic drop of lambda as rho' rises, the total =
immediate x (1 + lambda) identity, and the error seams (non-finite, negative immediate deflection, non-positive
duration, negative rho'). Hand-writes its renderer (mirroring the calc-concrete.js `rc-beam-flexure` pattern). Lazy-
loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the xi / lambda / total stack wraps on a phone); render-no-nan + a11y on the new tile, output read
to the value (the bottom-only example -> lambda 2.0, total 1.20 in).

## 5. Roadmap position

Adds the time-dependent deflection the concrete bench was missing beside `rc-beam-flexure` (strength) and
`joist-deflection` (immediate, wood). A sustained-load-fraction helper (splitting dead plus the sustained live off the
total) and an effective-moment-of-inertia (Ie, Branson/ACI) companion that feeds the immediate deflection are
deliberate future follow-ons. Further Group E growth stays evidence-driven.
