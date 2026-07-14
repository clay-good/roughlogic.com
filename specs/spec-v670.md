# roughlogic.com Specification v670 -- Spanned Cable Minimum Sag for a Tension Limit (calc-rigging.js, Group Z, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-rigging.js`** (Group Z,
> rigging), no new module, group, or dependency. Inherits spec.md through spec-v669.md.
>
> **The gap, and the evidence for it.** Spec-v484 (`spanline-sag-tension`) runs the shallow-cable statics forward: given
> the sag, it returns the tension a spanned cable develops. The safety question a rigger actually asks is the inverse --
> **how much sag do I need to keep the tension under the rope's working load limit**. Pulling a span tight to take out
> the sag multiplies the load (tension is inversely proportional to sag), so the least-sag limit is what keeps the rope
> and anchors safe. Solving the support-tension relation `T = w L^2 / (8 d) sqrt(1 + (4 d / L)^2)` for the sag (square
> both sides; the `(4d/L)^2` term collapses to a constant) gives `d_min = w L^2 / (8 sqrt(T_allow^2 - (w L / 2)^2))`. The
> number this settles: a 100 ft span at 1 lb/ft held to a **502 lb** support-tension limit needs at least **2.5 ft** of
> sag; a higher **2,500 lb** limit lets you pull down to **0.5 ft**. Unlike the naive horizontal-tension inverse, this
> solves the SUPPORT (anchor) tension -- the true maximum in the cable and the value the WLL limits -- so it never
> under-sags.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`spanline-sag-tension` sibling: the span and the returned sag are `L` (ft), the uniform load is `M T^-2` (lb/ft), and
the allowable tension and the reported horizontal tension are `M L T^-2` (lb). The v18/v21 contract: any non-finite
input, or a non-positive span / load / allowable tension, returns `{ error }`; additionally the allowable tension must
exceed the support vertical reaction `w L / 2` (each anchor carries at least that much straight down), or no sag can
carry the load and the tile returns `{ error }`. Citation discipline (v19/v22): the shallow-cable parabola solved for
the sag, with ASME B30.9 / Wire Rope Users Manual rigging practice, by name; the note states that **the allowable limits
the SUPPORT tension, it must exceed the w L / 2 vertical reaction, the allowable should be entered as the certified rope
WLL or the anchor capacity with the design factor already applied, the shallow-parabola idealization holds only where
the resulting sag is under about a tenth of the span, and the WLL, the anchors, and the head rigger govern -- a planning
screen, not the pick**.

## 2. The tile

### 2.1 `spanline-sag-for-tension` -- Spanned Cable Minimum Sag for a Tension Limit

```
inputs:
  span_ft              ft     horizontal span (> 0)
  load_lb_per_ft       lb/ft  uniform load along the span (> 0)
  allowable_tension_lb lb     support-tension limit, WLL or anchor (> w L / 2)

d_min = w L^2 / (8 sqrt(T_allow^2 - (w L / 2)^2))   [ft]
H = w L^2 / (8 d_min)                               [lb]   (horizontal tension at that sag)
```

**Pinned worked example (a 100 ft span).** L = 100 ft, w = 1.0 lb/ft, T_allow = 502.49 lb (the support tension the
forward tile reports at 2.5 ft): with the vertical reaction `w L / 2 = 50 lb`,
`d_min = 1 x 100^2 / (8 x sqrt(502.49^2 - 50^2)) = 10000 / (8 x 500.0) = ` **2.5 ft**; feeding 2.5 ft back through
`spanline-sag-tension` returns a support tension of 502.49 lb, the input. **Cross-check (a higher limit pulls tighter).**
Same span and load at T_allow = 2,500 lb: `d_min = ` **0.5 ft** -- five times the tension budget lets the span come down
to a fifth of the sag, the inverse-of-sag relationship the forward tile warns about, read the other way.

## 3. Wiring

A `tools-data.js` row (group `Z`, trades `["rigging"]`, beside `spanline-sag-tension`); a `tile-meta.js` `_TILES` entry;
a `citations.js` entry (shallow-cable parabola solved for sag, `GOVERNANCE.rigging` matching the sibling, the note per
§1); `test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js` (`spanline-sag-for-tension` ->
`computeSpanlineSagForTension` in `../../calc-rigging.js`); `scripts/related-tiles.mjs` (-> `spanline-sag-tension` /
`wire-rope-strength` / `sling-angle` / `block-redirect-load`, and the forward tile links back);
`data/search/aliases.json` ("minimum sag", "sag for a tension limit", "how much sag do i need", "how tight can i pull a
span", plus adjacent rows); `RIGGING_RENDERERS["spanline-sag-for-tension"]` via a hand-written renderer (the module's
`makeNumber` / `makeOutputLine` / `attachExampleButton` / `debounce` / `fmt` helpers, mirroring `spanline-sag-tension`)
and the id added to the calc-rigging declare list in `app.js`; the `// dims:` annotation directly above the compute;
regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning both examples, the
vertical-reaction floor, the round-trip through `computeSpanlineSagTension` to the support tension, and the error seams.
Group Z has no audit-coverage or governance count test, so no count bump. The calc-rigging.js gzip cap is expected to
hold (verify at build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes); `npm test` (+2 fixtures, the new
fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner;
320 px audit; render + output read to the value (the pinned example -> 2.5 ft minimum sag at a 502 lb limit).

## 5. Roadmap position

Pairs the forward spanline tile (`spanline-sag-tension`, tension from sag) with its inverse (minimum sag from a tension
limit), the two halves of the span-rigging question, with the inverse solving the anchor tension the WLL actually
limits. Further Group Z growth stays evidence-driven.
