# roughlogic.com Specification v315 -- Column Effective Length Factor K from Alignment-Chart G Factors (calc-steel.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v314..v316 (the steel beam-column-and-connection depth trio --
> H1 interaction (v314), the effective-length factor K (this spec), the bolt under combined tension and shear (v316)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: `steel-column-capacity` takes `KL/r` with `K`
> entered, but `K` itself -- the effective-length factor that captures how a column's ends are restrained by the beams
> framing into them -- comes from the AISC alignment chart via the joint stiffness ratios `G`, which the catalog never
> computes. Adds one tile to the existing **`calc-steel.js`** module (Group E); no new group, trade, or dependency. Inherits
> spec.md through spec-v314.md.
>
> **The gap, and the evidence for it.** The AISC alignment charts relate the effective-length factor `K` to the joint
> stiffness ratios `G = sum(EI/L)_columns / sum(EI/L)_beams` at each end. Rather than read the nomograph, the standard
> closed-form approximations (Dumonteil) give, for a sway (moment) frame,
> `K = sqrt((1.6 GA GB + 4(GA + GB) + 7.5)/(GA + GB + 7.5))`, and for a braced (non-sway) frame,
> `K = (3 GA GB + 1.4(GA + GB) + 0.64)/(3 GA GB + 2(GA + GB) + 1.28)`. For `GA = 1.0`, `GB = 2.0`, the sway `K = 1.47` and
> the braced `K = 0.82` -- the same column, but a sway frame nearly doubles its effective length and cuts its capacity,
> which is why bracing a frame is the cheapest way to shorten a column. `steel-column-capacity` consumes `K`; this tile
> produces it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The joint stiffness ratios
`GA`, `GB` and the effective-length factor `K` are dimensionless; the frame type selects the sway or braced formula. The
v18/v21 contract: any non-finite input, or a `G` value at or below zero, returns `{ error }` (a pinned base takes the
recommended `G = 10` and a fixed base `G = 1`, entered as such). Citation discipline (v19/v22): `GOVERNANCE.general` over
the alignment-chart K-factor by name; `editionNote` names **the AISC alignment-chart stiffness ratio
`G = sum(EI/L)_columns / sum(EI/L)_beams`, the Dumonteil sway approximation
`K = sqrt((1.6 GA GB + 4(GA+GB) + 7.5)/(GA+GB+7.5))` and braced approximation
`K = (3 GA GB + 1.4(GA+GB) + 0.64)/(3 GA GB + 2(GA+GB) + 1.28)`, and the recommended `G = 10` (pinned) / `G = 1` (fixed)
end conditions**, and states that **this returns the effective-length factor from the joint stiffness ratios -- it uses the
Dumonteil closed-form fits to the alignment charts (within ~2% of the nomograph), assumes the chart's idealizing
assumptions (elastic behavior, all columns buckling simultaneously, equal `L/r`), and does not compute the `G` factors from
member sizes for the user (enter them, or `10`/`1` for pinned/fixed) or apply the inelastic stiffness-reduction `tau_b`;
and this is a design aid, not a substitute for the engineer of record** -- the structural engineer of record's stamped
design governs.

## 2. The tile

### 2.1 `steel-effective-length-k` -- Column Effective Length Factor K (Alignment Chart)

```
inputs:
  GA      -   stiffness ratio at end A (10 pinned, 1 fixed)
  GB      -   stiffness ratio at end B
  frame   -   sway | braced

K = (frame == sway)
  ? sqrt((1.6*GA*GB + 4*(GA+GB) + 7.5) / (GA+GB + 7.5))
  : (3*GA*GB + 1.4*(GA+GB) + 0.64) / (3*GA*GB + 2*(GA+GB) + 1.28)
```

**Pinned worked example (GA = 1.0, GB = 2.0).** Sway frame: `K = sqrt((1.6 x 2 + 4 x 3 + 7.5)/(3 + 7.5)) = sqrt(22.7/10.5) = 1.47`.
Braced frame: `K = (3 x 2 + 1.4 x 3 + 0.64)/(3 x 2 + 2 x 3 + 1.28) = 10.84/13.28 = 0.82`. The same column is effectively
`1.47 x L` if the frame can sway and `0.82 x L` if it is braced -- a factor of `(1.47/0.82)^2 = 3.2` in buckling capacity.
**Cross-check (both ends nearly fixed, GA = GB = 1).** Sway: `K = sqrt((1.6 + 8 + 7.5)/(2 + 7.5)) = sqrt(17.1/9.5) = 1.34`;
braced: `K = (3 + 2.8 + 0.64)/(3 + 4 + 1.28) = 6.44/8.28 = 0.78` -- stiffer joints pull both toward the theoretical
fixed-fixed limits (`K = 1.0` sway, `0.5` braced), the trend the charts encode. The non-finite and non-positive-`G` error
paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["welding","construction"]`, matching the steel member tiles); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the alignment-chart K, `editionNote` naming `G`, the sway and
braced Dumonteil formulas, the pinned/fixed `G` values, and the elastic-chart, enter-G, no-tau_b caveats);
`test/fixtures/worked-examples.json` (the GA1-GB2 example + the stiff-joint cross-check); `test/fixtures/compute-map.js`
(`steel-effective-length-k` -> `computeSteelEffectiveLengthK` in `../../calc-steel.js`); `scripts/related-tiles.mjs` (->
`steel-column-capacity` / `steel-h1-interaction` / `column-buckling-wood` / `steel-beam-ltb`);
`data/search/aliases.json` ("effective length factor", "K factor column", "alignment chart", "G factor", "sway braced
frame", "nomograph K", "column end restraint", "KL over r", "effective length"); the id appended to the existing steel
renderers block in `app.js`; the `// dims:` annotation (`GA`/`GB`/`K` dimensionless); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the sway-vs-braced branch, the trend toward the fixed limits, and the
non-positive-`G` / non-finite error seams. No new module; re-pin `calc-steel.js` on the `check:module-sizes` allowlist.
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the sway/braced assertions); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the sway `K` / braced `K` pair wraps on a
phone); render-no-nan + a11y sweep, output read to the value (GA 1, GB 2 -> K 1.47 sway, 0.82 braced).

## 5. Roadmap position

Middle of the steel beam-column-and-connection depth batch (v314..v316) in `calc-steel.js`, producing the `K` that
`steel-column-capacity` consumes. The bolt under combined tension and shear (v316) follows. A `G`-from-member-sizes helper,
the inelastic `tau_b` stiffness reduction, and the leaning-column/story-buckling (`K2`) adjustment are the deliberate next
follow-ons once the trio lands.
