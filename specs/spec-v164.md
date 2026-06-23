# roughlogic.com Specification v164 -- Feeder Tap Conductor Rule (10-ft and 25-ft) (NEC 240.21(B)) (calc-feeder.js, Group A, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v164..v178 (electrician trade).** In-scope catalog
> expansion under the spec-v106 trades-only charter: a fifteen-tile electrician batch closing NEC- and
> standards-anchored gaps confirmed absent from the 92-tile electrical catalog. This spec adds one tile
> sizing a feeder *tap* conductor against the 10-foot and 25-foot rules of NEC 240.21(B), AHJ governed,
> redo-not-harm. Adds one tile to **`calc-feeder.js`** (Group A); no new module, group, or dependency.
> Inherits spec.md through spec-v163.md.
>
> **The gap, and the evidence for it.** The catalog sizes the transformer secondary tap
> (`transformer-conductor-protection`, 240.21(C)) but never the everyday *feeder* tap -- the
> unprotected conductor run from a large feeder OCPD to a smaller panel or device that 240.21(B)(1)
> and (B)(2) permit only when the tap ampacity clears 1/10 (10-ft rule) or 1/3 (25-ft rule) of the
> feeder OCPD rating. Electricians make these taps constantly (gutter taps, sub-panel feeds, equipment
> taps); undersizing them is a classic violation, and there is no tile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The
feeder OCPD rating and the resulting minimum tap ampacity are current `I`; the tap length is `L`; the
fraction (0.10 or 0.333...) is `dimensionless`. The v18/v21 contract: any non-finite input, a
non-positive OCPD rating, or a non-positive tap length returns `{ error }`; the only divisions are by
the fixed rule denominators (10 and 3), never by a user value. Citation discipline (v19/v22):
`GOVERNANCE.electrical`, edition `NEC 2023 240.21(B)(1) and (B)(2) (taps not over 10 ft and not over
25 ft)`, `editionNote` `NEC_DISCLOSURE`. The tile is a computational aid for the <= 1000 V case; the
AHJ-adopted NEC edition and the design engineer govern, and the additional conditions of 240.21(B)
(physical protection, termination in a single OCPD for the 25-ft rule, ampere ratings of the supplied
OCPDs) are stated, not silently assumed.

## 2. The tile

### 2.1 `feeder-tap-rule` -- Minimum Feeder Tap Conductor Ampacity (10-ft / 25-ft)

```
inputs:
  feeder_ocpd_a     I    rating of the overcurrent device protecting the feeder
  tap_length_ft     L    length of the unprotected tap conductor
  tap_ampacity_a    I    ampacity of the proposed tap conductor (75 C column)

rule = tap_length_ft <= 10  -> "10-ft tap (240.21(B)(1))", min_fraction = 0.10
       tap_length_ft <= 25  -> "25-ft tap (240.21(B)(2))", min_fraction = 1/3
       tap_length_ft  > 25  -> neither short-tap rule applies (use B(3)/B(5) or protect the tap)

min_tap_ampacity_a = feeder_ocpd_a x min_fraction
verdict: tap_ampacity_a >= min_tap_ampacity_a -> tap conductor acceptable for the rule
```

**Pinned worked example.** A 400 A feeder, a 22 ft tap to a panel: 22 ft falls under the **25-ft
rule**, so the tap must carry at least `400 / 3 = 133.3 A`. A 1/0 Cu THWN tap (150 A at 75 C) clears
it -> **acceptable**, provided it terminates in a single OCPD rated no more than the tap ampacity and
is protected from physical damage. **Cross-check.** The same 400 A feeder with a 9 ft tap falls under
the **10-ft rule**: minimum `400 x 0.10 = 40 A`, and the tap must also be rated at least the device it
supplies. A 35 ft run is flagged as outside both short-tap rules. The AHJ and the design engineer
govern; the full 240.21(B) conditions apply.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["electrical"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.electrical`, NEC 2023 240.21(B)(1)/(B)(2), the 1/10 and 1/3
fractions and the supplemental tap conditions named, `editionNote` `NEC_DISCLOSURE`);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`feeder-tap-rule` -> `computeFeederTapRule` in `../../calc-feeder.js`);
`scripts/related-tiles.mjs` (-> `transformer-conductor-protection` / `breaker-sizing` /
`wire-ampacity`); `data/search/aliases.json` ("feeder tap", "10 foot tap", "25 foot tap", "tap
rule", "240.21", "tap conductor"); the id appended to the existing `FEEDER_RENDERERS` declare in
`app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning the example, cross-check, the >25 ft branch, and error seams (non-finite, OCPD <= 0,
length <= 0). Raise the `calc-feeder.js` size cap by ~20 percent if needed (dated comment); bump the
`citations.js` cap if needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block, both rule branches and the out-of-rule
branch); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the rule label, minimum ampacity, and verdict wrap on a phone); render-no-nan +
a11y sweep, output read to the value (400 A / 22 ft -> 133.3 A min, 1/0 acceptable; 400 A / 9 ft ->
40 A min).

## 5. Roadmap position

Opens the v164..v178 electrician batch and completes the tap family alongside the transformer
secondary tap (`transformer-conductor-protection`, 240.21(C)) and `breaker-sizing`. Further Group A
growth stays evidence-driven.
