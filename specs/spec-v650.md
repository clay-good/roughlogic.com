# roughlogic.com Specification v650 -- Taper Missing Diameter (Lathe Setup) (calc-shop.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`**
> (Group K, machinist/mechanic), no new module, group, or dependency. Inherits spec.md through spec-v649.md.
>
> **The gap, and the evidence for it.** The `taper-calc` tile (spec-v40) computes the taper per foot and the angle
> from *both* end diameters and the length. The actual lathe-setup problem is the reverse: you have a taper
> *specification* (a taper per foot, e.g. off a print or a standard taper) plus one known end diameter and the
> length, and you need the *other* diameter to turn the part. Inverting `TPF = 12(D-d)/L` gives the missing
> diameter as `known -/+ (TPF/12) x L`. Pure trigonometry, no new constant. The pinned example: a 1.000 in large
> end with a 0.600 in/ft taper over 3 in makes a **0.850 in** small end, and the compound-slide angle per side is
> **atan(0.600/24) = 1.432 deg** -- which depends only on the TPF, so the same compound setting cuts the taper at
> any length.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The known and solved
diameters, the diameter change, and the length are `L`; the taper per foot and the known-end selection are
`dimensionless` (mirroring the sibling's `tpi_in` treatment); the angles are `dimensionless` (degrees). The
`12 in/ft` conversion and the taper/angle relations are the same ones `taper-calc` already uses. The v18/v21
contract: any non-finite numeric input, a non-positive known diameter, taper per foot, or length, or a taper that
removes more than the whole diameter over the length (small end <= 0) returns `{ error }`. Citation discipline
(v19/v22): the taper relation inverted for the missing diameter, by name; the note states that **the missing end =
known -/+ (TPF/12) x L, the compound angle per side = atan(TPF/24) is a function of TPF alone, and the tool nose
radius and setup govern the finished part** -- a shop aid.

## 2. The tile

### 2.1 `taper-diameter` -- The Missing End Diameter from a Taper Spec

```
inputs:
  known_dia_in     in    the end diameter you know (> 0)
  known_end        -     which end is known: "large" | "small"
  taper_per_foot   in/ft taper per foot TPF (> 0)
  length_in        in    length over the taper L (> 0)

change       = (TPF/12) x L
small end    = known - change   (when the large end is known)
large end    = known + change   (when the small end is known)
angle/side   = atan(TPF/24)      [deg]   (a function of TPF alone)
included     = 2 x (angle/side)
```

**Pinned worked example.** `known = 1.000 in` (large end), `TPF = 0.600 in/ft`, `L = 3 in`:
`change = (0.600/12) x 3 = 0.150 in`, so the small end `= 1.000 - 0.150 = ` **0.850 in**; the angle per side
`= atan(0.600/24) = ` **1.432 deg**.
**Cross-check (solve the other end).** Give the `0.850 in` small end instead: `large end = 0.850 + 0.150 = `
**1.000 in**.
**Cross-check (exact inverse of taper-calc).** The fuzzer feeds the solved 1.000/0.850 in ends back through
`taper-calc` and recovers the 0.600 in/ft TPF, and confirms the angle per side is unchanged at a different length.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["machinist", "mechanic"]`, beside `taper-calc`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (taper inverted, Machinery's Handbook, the note per §1); `test/fixtures/
worked-examples.json` (the pinned example plus the other-end cross-check); `test/fixtures/compute-map.js`
(`taper-diameter` -> `computeTaperDiameter`); `scripts/related-tiles.mjs` (<-> `taper-calc`, `sine-bar`,
`cutting-speed-rpm`, `decimal-to-fraction`); `data/search/aliases.json` ("taper diameter", "taper setup diameter",
"small end diameter from taper", plus question rows, all collision-checked);
`SHOP_RENDERERS["taper-diameter"]` via a hand-written renderer (the module's `makeNumber` / `makeSelect`
(known-end) / `makeOutputLine` / `attachExampleButton` / `debounce` / `fmt` / `_readNum` helpers, mirroring
`taper-calc`) and the id added to the calc-shop declare list in `app.js`; the `// dims:` annotation directly above
the compute; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the example, the exact
inverse round-trip through `computeTaperCalc`, the either-end solve, the TPF-only angle, and the error seams. The
two `index.html` home-count spots go 1,098 -> 1,099 (check-readme-counts gates them). The calc-shop.js gzip cap is
expected to hold (verify at build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output
read to the value (the pinned example -> 0.850 in small end, 1.432 deg/side).

## 5. Roadmap position

Completes the taper pair: `taper-calc` (both diameters -> TPF and angle) and now `taper-diameter` (TPF and one
diameter -> the other), exact inverses through the same `TPF = 12(D-d)/L` relation. Further Group K growth stays
evidence-driven.
