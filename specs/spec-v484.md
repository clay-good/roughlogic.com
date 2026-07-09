# roughlogic.com Specification v484 -- Spanned Cable Sag and Tension (calc-rigging.js, Group Z, 1 New Tile)

> **Status: PROPOSED (2026-07-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-rigging.js`**
> (Group Z); no new module, group, or dependency. Inherits spec.md through spec-v483.md.
>
> **The gap, and the evidence for it.** The rigging bench sizes slings, shackles, cranes, spreader beams, and the wind
> and tag-line forces on a suspended load -- but it has nothing for the other rigging geometry the trade sets constantly:
> a horizontally **spanned** cable. A tramline, a highline, a span set carrying a distributed load, a messenger run, a
> catenary of festoon or a guy line all hang in a parabola, and the one number that governs is the tension the sag buys.
> The physics is the textbook shallow-cable parabola: a uniform load `w` (lb/ft) over a span `L` (ft) sagging `d` (ft)
> at midspan develops a horizontal tension `H = w L^2 / (8 d)`, a support (anchor) tension `T = H sqrt(1 + (4d/L)^2)`,
> and a developed length `L + 8 d^2 / (3 L)`. The catch the tile exists to flag is the inverse relationship a rigger
> underestimates in the field: the tension is inversely proportional to the sag, so pulling a span "tight" to take the
> sag out multiplies the rope and anchor load -- halve the sag and you double the tension, and a nearly level span can
> reach a tension many times the load it carries, overloading the wire rope and the anchors long before the span looks
> dangerous. The `sling-angle` tile covers the point-load V-geometry; the distributed spanned cable is a different
> shape the catalog never carried.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The span and sag are
lengths (`L`); the uniform load is a force per length (`M T^-2`); the tensions are forces (`M L T^-2`); the developed
length is a length (`L`); the sag ratio is `dimensionless`. The v18/v21 contract: any non-finite input or a
non-positive span, load, or sag returns `{ error }` (a zero sag is the divide-by-zero infinite-tension limit). Citation
discipline (v19/v22): `GOVERNANCE.rigging` -- the head rigger and the wire-rope manufacturer's working-load-limit chart
govern; the source (ASME B30.9 / the WRTB Wire Rope Users Manual and standard shallow-cable statics) is named, never
reproduced. `editionNote` prints `H = w L^2 / (8 d)`, `T = H sqrt(1 + (4 d / L)^2)`, and `length = L + 8 d^2 / (3 L)`,
and states that **the relations are the shallow-parabola idealization (valid where the sag is under about a tenth of
the span; a deep sag trends toward the catenary and the tile flags when the ratio is exceeded), the load is taken as
uniform along the horizontal span (the rope self-weight plus any evenly distributed load; a concentrated load is the
`sling-angle` point-load case instead), the supports are taken as level, and the working load limit of the rope, the
anchor capacity, and the head rigger govern the actual pick** -- a planning screen, not a stamped rigging design.

## 2. The tile

### 2.1 `spanline-sag-tension` -- The Tension a Sag Buys on a Spanned Cable

```
inputs:
  span_ft           ft      the horizontal span between the two supports
  load_lb_per_ft    lb/ft   the uniform load along the span (rope weight + any distributed load)
  sag_ft            ft      the sag at midspan you will allow

H = w L^2 / (8 d)                              [lb]   horizontal tension
T = H sqrt(1 + (4 d / L)^2)                    [lb]   peak tension at each support / anchor
length = L + 8 d^2 / (3 L)                     [ft]   developed cable length
slack = length - L                             [ft]   length over the straight span
sag_ratio = d / L                                     shallow-parabola valid where <= ~0.1
```

**Pinned worked example (a 100 ft tramline at a comfortable sag).** A 100 ft span carrying a uniform 1.0 lb/ft (the wire
rope plus a light distributed load), allowed to sag 2.5 ft at midspan: `H = 1.0 x 100^2 / (8 x 2.5) = 10,000 / 20 = `
**500 lb**, the support tension `T = 500 sqrt(1 + (4 x 2.5 / 100)^2) = ` **502.5 lb**, and the developed length
`100 + 8 x 2.5^2 / (3 x 100) = ` **100.17 ft** (2 in of slack), a sag ratio of 0.025 -- a well-behaved span.
**Cross-check (the taut-span trap).** Pull the same span tighter to a nearly level 0.5 ft sag: `H = 1.0 x 100^2 /
(8 x 0.5) = 10,000 / 4 = ` **2,500 lb** -- taking the sag from 2.5 ft to 0.5 ft (five times less sag) raised the
tension five-fold (500 -> 2,500 lb) for the exact same load, the inverse-proportional trap the tile exists to flag,
where a span that merely looks a little tighter is quietly overloading the rope and both anchors. The tile returns the
horizontal and support tensions, the length, and the sag ratio.

## 3. Wiring

A `tools-data.js` row (group `Z`, trades `["rigging"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.rigging`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 2.5 ft comfortable-sag example
+ the 0.5 ft taut-span cross-check); `test/fixtures/compute-map.js` (`spanline-sag-tension` ->
`computeSpanlineSagTension` in `../../calc-rigging.js`); `scripts/related-tiles.mjs` (-> `sling-angle` /
`wire-rope-strength` / `block-redirect-load`); `data/search/aliases.json` ("cable sag", "spanline", "highline",
"tramline", "catenary sag", "wire rope span", "span tension", "guy wire tension"); the id appended to the rigging
renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the inverse-sag tension relation, the developed length, and the
error seams (non-finite, span / load / sag <= 0). Hand-writes its renderer (three `makeNumber` fields, mirroring the
calc-rigging.js pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the H / support-tension / length / sag-ratio stack wraps on a phone); render-no-nan + a11y on the
new tile, output read to the value (the 2.5 ft example -> 500 lb horizontal tension).

## 5. Roadmap position

Adds the spanned-cable geometry beside the vertical-pick geometry: the sling (`sling-angle`, `multi-leg-sling`), the
hardware (`shackle-eyebolt-wll`, `wire-rope-strength`), and the redirect (`block-redirect-load`) now sit beside the
horizontal span they anchor. A level-vs-unequal-support mode (supports at different heights), a mid-span concentrated
load on a spanned cable, and a rope-elongation (stretch) companion are deliberate future follow-ons. Further Group Z
growth stays evidence-driven.
