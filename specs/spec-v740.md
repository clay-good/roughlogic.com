# roughlogic.com Specification v740 -- Ceiling Speaker Coverage Angle for a Target Spacing (calc-lowvoltage.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lowvoltage.js`** (Group A),
> no new module, group, or dependency. Inherits spec.md through spec-v739.md. Explore sweep #13 (entry 5).
>
> **The gap, and the evidence for it.** The `ceiling-speaker-coverage` tile runs the cone geometry forward: from a
> speaker's coverage angle it returns the coverage diameter and spacing. The designer's question is the inverse -- **what
> coverage angle a target coverage diameter (or on-center spacing) needs** at a mounting drop, so a speaker can be specced
> to hit the layout. From `diameter = 2 x (ceiling - ear) x tan(angle/2)`,
> `angle = 2 x atan( diameter / (2 x (ceiling - ear)) )`. The number this settles: an **8 ft** circle under a **10 ft**
> ceiling over **4 ft** ears needs a **67 degree** speaker.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`ceiling-speaker-coverage` sibling: the ceiling, ear, target diameter, and drop are `L` (ft), and the returned coverage
angle is dimensionless (degrees). It reuses the sibling's cone geometry, solved for the angle. The v18/v21 contract: any
non-finite input, a non-positive ceiling, a negative ear, a ceiling at or below the ear, or a non-positive target diameter
returns `{ error }`; the recovered angle is always in (0, 180) because `atan` returns (0, 90). Citation discipline
(v19/v22): the cone geometry solved for the angle, `GOVERNANCE.electrical` matching the sibling; the note states to spec a
speaker rated **at least this wide** (the angle narrows at high frequency, so use the 2-4 kHz coverage for speech), and
that for **edge-to-edge** layout the target diameter is the on-center spacing while for **even (minimum-overlap)** coverage
it is spacing / 0.7.

## 2. The tile

### 2.1 `ceiling-speaker-coverage-angle` -- Ceiling Speaker Coverage Angle for a Target Spacing

```
inputs:
  ceiling_ft           L   ceiling height (ft, > 0)
  ear_ft               L   listener ear height (ft, >= 0, below ceiling)
  target_diameter_ft   L   target coverage diameter / on-center spacing (ft, > 0)

drop_ft      = ceiling_ft - ear_ft
coverage_deg = 2 x atan( target_diameter_ft / (2 x drop_ft) ) in degrees
```

**Pinned worked example.** ceiling = 10 ft, ear = 4 ft, target diameter = 8 ft:
`drop = 6 ft`, `angle = 2 x atan( 8 / 12 ) = 2 x atan(0.6667) = 2 x 33.69 = ` **67.4 deg**. Feeding 67.4 degrees back through
`ceiling-speaker-coverage` at the same ceiling and ear returns an 8 ft coverage diameter, the target. A larger 12 ft target
needs a wider 90 degree speaker.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical","stage"]`) placed beside `ceiling-speaker-coverage` (Group A is not
exact-count audited); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (cone geometry solved for the angle,
`GOVERNANCE.electrical` matching the sibling); `test/fixtures/worked-examples.json` (the pinned example);
`test/fixtures/compute-map.js` (`ceiling-speaker-coverage-angle` -> `computeCeilingSpeakerCoverageAngle`);
`scripts/related-tiles.mjs` (-> `ceiling-speaker-coverage` / `speaker-70v-line` / `time-alignment`);
`data/search/aliases.json` (5 collision-checked question aliases: "speaker coverage angle", "what coverage angle
speaker", ...); the calc-lowvoltage `LOWVOLTAGE_RENDERERS` map entry via a hand-written renderer (three number fields) and
the id added to the calc-lowvoltage declare list in `app.js`; the `// dims:` annotation directly above the compute;
regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the
round-trip through `computeCeilingSpeakerCoverage` across a ceiling/ear/diameter sweep, the larger-diameter-wider-angle and
bigger-drop-narrower-angle monotonicity, the (0, 180) range, and the error seams. The calc-lowvoltage.js gzip cap (raised
to 17500 B in this spec, covering v740 and v741) covers the addition. Verify at build, including `check-shells`.
Lazy-loaded, absent from home first paint. Home tile count 1,188 -> 1,189.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 67.4 deg for an 8 ft circle
under a 10 ft ceiling over 4 ft ears).

## 5. Roadmap position

Pairs the forward speaker tile (`ceiling-speaker-coverage`, diameter from the angle) with its inverse (the angle for a
diameter), the two halves of the distributed-ceiling layout question. Continues Explore sweep #13; further Group A
low-voltage growth stays evidence-driven.
