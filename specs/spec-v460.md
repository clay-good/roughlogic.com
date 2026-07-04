# roughlogic.com Specification v460 -- Duct Equivalent Round Diameter (calc-hvac.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-03). Second tile of the HVAC field-checks trio (v459 gas appliance altitude derate ->
> v460 duct equivalent diameter -> v461 duct leakage CFM25). `duct-sizing` and `duct-friction-static` work in round-duct
> terms, but ductwork is often rectangular; converting a rectangular duct to its equivalent round diameter -- the round duct
> that carries the same airflow at the same friction -- has no tile.**
> In-scope catalog expansion under the spec-v106 trades-only charter. To size or check a rectangular duct against a round-
> duct friction chart, you use the equivalent round diameter `De = 1.30 * (a*b)^0.625 / (a+b)^0.25`, where `a` and `b` are
> the rectangular side dimensions. It is the round duct that gives the same friction loss for the same flow. `duct-sizing`
> assumes round; nothing converts a rectangular duct to `De`. This adds the conversion tile to the existing
> **`calc-hvac.js`** module (Group C); no new group, trade, or dependency. Inherits spec.md through spec-v459.md.
>
> **The gap, and the evidence for it.** A `20 in` by `10 in` rectangular duct has an equivalent round diameter of
> `De = 1.30 * (20*10)^0.625 / (20+10)^0.25 = 1.30 * 27.4 / 2.34 = 15.2 in` -- so it behaves like `15 in` round on the
> friction chart, not the `sqrt(200/0.785) = 16 in` an area-only guess would give. A high-aspect `24 in` by `8 in` duct of
> the same area drops to `De = 14.6 in`, because a flatter duct has more wetted perimeter and more friction. No tile does
> this; a designer had the round tiles but not the rectangular equivalent.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The rectangular side
dimensions and the equivalent diameter are lengths (in); the aspect ratio is dimensionless. The v18/v21 contract: any
non-finite input, or a non-positive side dimension, returns `{ error }`; the tile computes the equivalent diameter and the
aspect ratio, and flags an aspect ratio above `4:1` (where the formula and good practice both degrade). Citation discipline
(v19/v22): `GOVERNANCE.general` over the duct equivalent diameter by name; `editionNote` names **the ASHRAE Fundamentals
equal-friction equivalent round diameter `De = 1.30 * (a*b)^0.625 / (a+b)^0.25` for a rectangular duct carrying the same
airflow at the same friction, and the recommended maximum aspect ratio of about `4:1`**, and states that **this returns the
round duct equivalent for a rectangular duct, that the equal-friction equivalent is not the equal-area diameter, and that it
is a design aid, not a substitute for a duct-sizing calculation**.

## 2. The tile

### 2.1 `duct-equivalent-diameter` -- Duct Equivalent Round Diameter

```
inputs:
  side_a_in   in   rectangular duct side a
  side_b_in   in   rectangular duct side b

de_in        = 1.30 * (side_a_in * side_b_in)^0.625 / (side_a_in + side_b_in)^0.25
aspect_ratio = max(side_a_in, side_b_in) / min(side_a_in, side_b_in)
```

**Pinned worked example (20 in x 10 in).** `De = 1.30 * (200)^0.625 / (30)^0.25 = 1.30 * 27.4 / 2.34 = 15.2 in`; aspect
ratio `2:1`. **Cross-check (a flatter duct of equal area).** A `24 in` by `8 in` duct (same `192 to 200 in^2` area) gives
`De = 14.6 in` at a `3:1` aspect ratio -- more perimeter, more friction, smaller equivalent. A non-positive side takes the
error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, beside `duct-sizing` / `duct-friction-static`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, ASHRAE equivalent round diameter, `editionNote` naming the
`De = 1.30*(a*b)^0.625/(a+b)^0.25` relation and the aspect-ratio limit); `test/fixtures/worked-examples.json` (the 20x10
example + the 24x8 cross-check); `test/fixtures/compute-map.js` (`duct-equivalent-diameter` ->
`computeDuctEquivalentDiameter` in `../../calc-hvac.js`); `scripts/related-tiles.mjs` (-> `duct-sizing` /
`duct-friction-static` / `pitot-traverse-cfm` / `grille-face-velocity`); `data/search/aliases.json` ("equivalent
diameter", "equivalent round duct", "rectangular to round duct", "duct De", "equal friction diameter", "duct aspect
ratio", "round equivalent rectangular", "duct conversion", "1.30 a b duct"); the id appended to the existing HVAC renderers
block in `app.js`; the `// dims:` annotation (dimensions/De length, aspect ratio dimensionless); regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the aspect-ratio flag, and the non-positive / non-finite
error seams. No new module; re-pin `calc-hvac.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home
first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the aspect-ratio flag, the error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the De / aspect output wraps on a phone);
render-no-nan + a11y sweep, output read to the value (20x10 -> 15.2 in).

## 5. Roadmap position

The middle of the HVAC field-checks trio: `gas-appliance-altitude-derate` (v459) and `duct-leakage-cfm25` (v461) bracket it.
An equivalent-round-to-rectangular inverse (size a rectangle to a target `De` within an aspect ratio) is the deliberate next
follow-on.
