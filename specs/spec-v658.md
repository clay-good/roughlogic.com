# roughlogic.com Specification v658 -- Weir Head from a Target Flow (calc-treatment.js, Group M, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-treatment.js`**
> (Group M, water/wastewater), no new module, group, or dependency. Inherits spec.md through spec-v657.md.
>
> **The gap, and the evidence for it.** The `weir-flow` tile (spec-v20 M.1) computes the flow over a weir from the
> head. Sizing a weir box or setting a staff-gauge mark for a design flow is the reverse -- given the flow, what
> head. Inverting the sibling: a 90-degree V-notch `Q = C H^2.48` gives `H = (Q/C)^(1/2.48)`; a suppressed
> rectangular weir `Q = C L H^1.5` gives `H = (Q/(C L))^(2/3)`; a contracted rectangular weir's effective crest
> `L - 0.2 H` depends on the head, so it is solved by a few fixed-point passes. The coefficients (2.49, 3.33)
> are already in the sibling. The pinned example: a **90-degree V-notch** passing **0.446 cfs** needs **0.50 ft**
> of head.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The target flow is
`L^3 T^-1`, the crest length and the head are `L`, and the weir type and coefficient are `dimensionless`. The V-notch
2.49 and Francis 3.33 default coefficients, the 0.2 H contraction, and the `448.831` cfs->GPM constant are the same
ones `weir-flow` already uses. The v18/v21 contract (mirroring the sibling's inline finite checks): a non-finite or
non-positive flow, a missing crest length for a rectangular weir, or a target flow so large the end contractions
close the notch returns `{ error }`; a solved head below ~0.2 ft sets the `low_accuracy` flag. Citation discipline
(v19/v22): the weir equations solved for the head, the inverse of the weir-flow tile (USBR Water Measurement
Manual), by name and with `GOVERNANCE.general` (matching the sibling); the note states that **the V-notch and
suppressed cases are closed form, the contracted case is a fixed-point solve, free non-submerged ventilated flow is
required, and a head below ~0.2 ft is low-accuracy** -- the operator of record and the primacy agency govern.

## 2. The tile

### 2.1 `weir-head-from-flow` -- The Head a Weir Needs to Pass a Target Flow

```
inputs:
  weir_type         -     "vnotch90" | "rect_contracted" | "rect_suppressed"
  target_flow_cfs   cfs   flow to pass (> 0)
  crest_length_ft   ft    crest length (rectangular; > 0)
  coeff             -     weir coefficient (0 = default: 2.49 V-notch, 3.33 rect)

vnotch90:        H = (Q / C)^(1/2.48)
rect_suppressed: H = (Q / (C L))^(2/3)
rect_contracted: H_{n+1} = (Q / (C (L - 0.2 H_n)))^(2/3), seeded from the suppressed form
```

**Pinned worked example.** `vnotch90`, `Q = 0.446 cfs`: `H = (0.446/2.49)^(1/2.48) = ` **0.50 ft** -- the exact
inverse of the `weir-flow` example (0.5 ft -> 0.446 cfs).
**Cross-check (contracted, fixed-point).** A contracted rectangular weir with a 3 ft crest passing 9.324 cfs solves
to **1.00 ft** of head, round-tripping the `weir-flow` tile's 1 ft / 3 ft-crest flow.
**Cross-check (low head flag).** A V-notch passing only 0.05 cfs solves to ~0.19 ft and is flagged low-accuracy.

## 3. Wiring

A `tools-data.js` row inside the `// Group M: Water` block (group `M`, trades `["water"]`, beside `weir-flow`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the note per §1); `test/fixtures/
worked-examples.json` (the V-notch pinned example plus the contracted fixed-point cross-check); `test/fixtures/
compute-map.js` (`weir-head-from-flow` -> `computeWeirHeadFromFlow`); `scripts/related-tiles.mjs` (<-> `weir-flow`,
`detention-time`, `manning-slope`, `channel-normal-depth`); `data/search/aliases.json` ("weir head from flow", "size
a weir for flow", "head over weir for flow", plus question rows, all collision-checked);
`TREATMENT_RENDERERS["weir-head-from-flow"]` via a hand-written renderer (the module's `makeSelect` (weir type) /
`makeNumber` / `makeOutputLine` / `attachExampleButton` / `debounce` / `fmt` helpers, mirroring `weir-flow`) and the
id added to the calc-treatment declare list in `app.js`; the `// dims:` annotation directly above the compute;
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the closed-form V-notch and suppressed
inverses, the contracted fixed-point round-trip through `computeWeirFlow`, the low-head flag, and the error seams;
and the **Group M citation-audit count bump (33 -> 34 in citations.test.js)**. The two `index.html` home-count spots
go 1,106 -> 1,107 (check-readme-counts gates them). The calc-treatment.js gzip cap is expected to hold (verify at
build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block, the Group M count
bump); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px
audit; render + output read to the value (the pinned example -> 0.50 ft).

## 5. Roadmap position

Completes the weir pair: `weir-flow` (head -> flow) and now `weir-head-from-flow` (flow -> head), exact inverses
through the same USBR weir equations. Further Group M growth stays evidence-driven.
