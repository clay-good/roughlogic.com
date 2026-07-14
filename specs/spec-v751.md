# roughlogic.com Specification v751 -- Arc Rise (Sagitta) from Radius and Chord (calc-layout.js, Group G, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-layout.js`** (Group G),
> no new module, group, or dependency. Inherits spec.md through spec-v750.md. Explore sweep #14 (entry 5). This is the
> catalog's **1,200th tile**.
>
> **The gap, and the evidence for it.** The `circular-arc` tile runs the sagitta relation forward: from a chord and rise
> it returns the radius. The layout question is the inverse -- **the rise (sagitta / middle ordinate) from a known radius
> and chord**, so a layout person marks the arc height at midspan when the radius is set. From
> `R = ((chord/2)^2 + rise^2) / (2 rise)`, the minor-arc root is `rise = R - sqrt(R^2 - (chord/2)^2)`. The number this
> settles: a **24 in** chord on a **20 in** radius rises **4.0 in** at midspan.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the `circular-arc`
sibling: the chord, radius, and returned rise and arc length are `L` (in), and the central angle is dimensionless (deg). It
reuses the sibling's first-principles circle geometry, solved for the rise. The v18/v21 contract: any non-finite input, a
non-positive chord, a non-positive radius, or a **chord that exceeds the diameter** (the radius must be at least half the
chord) returns `{ error }`. Citation discipline (v19/v22): the sagitta relation solved for the rise, `GOVERNANCE.general`
matching the sibling; the note states that this returns the **minor-arc** rise, that at the diameter the rise equals the
radius (a semicircle), and gives the **layout method** (offset the rise up from the chord midpoint and half the chord to
each end, then trammel/string-line at the radius).

## 2. The tile

### 2.1 `circular-arc-rise-from-radius` -- Arc Rise (Sagitta) from Radius and Chord

```
inputs:
  chord_in    L   chord / span (in, > 0)
  radius_in   L   radius (in, > 0, >= chord/2)

a                 = chord_in / 2
rise_in           = radius_in - sqrt(radius_in^2 - a^2)
central_angle_deg = 2 x asin(a / radius_in) in degrees
arc_length_in     = radius_in x central_angle (rad)
```

**Pinned worked example.** chord = 24 in, radius = 20 in:
`a = 12`, `rise = 20 - sqrt(400 - 144) = 20 - 16 = ` **4.0 in**, central angle 73.74 deg, arc length 25.74 in. Feeding
4.0 in back through `circular-arc` at a 24 in chord returns a 20 in radius, the input. A flatter 40 in radius on the same
chord rises just 1.8 in.

## 3. Wiring

A `tools-data.js` row (group `G`, trades `["carpentry","fabrication","sheet-metal"]`) placed beside `circular-arc` in the
later spec-v56 layout section, well past the Group G exact-count audit block; a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (sagitta relation solved for the rise, `GOVERNANCE.general` matching the sibling);
`test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js`
(`circular-arc-rise-from-radius` -> `computeCircularArcRiseFromRadius`); `scripts/related-tiles.mjs` (-> `circular-arc` /
`bolt-circle` / `pipe-template-wrap`); `data/search/aliases.json` (5 collision-checked question aliases: "rise from
radius", "how high is the arc", ...); the calc-layout `LAYOUT_RENDERERS` map entry via a hand-written renderer (two number
fields) and the id added to the calc-layout declare list in `app.js`; the `// dims:` annotation directly above the
compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the
round-trip through `computeCircularArc` across a chord/radius sweep, the semicircle case, the flatter-arc-smaller-rise
monotonicity, the chord-exceeds-diameter impossibility, and the error seams. The calc-layout.js gzip cap (raised to 15000 B
in this spec) covers the addition. Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint.
Home tile count 1,199 -> 1,200.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 4.0 in rise for a 24 in
chord on a 20 in radius).

## 5. Roadmap position

Pairs the forward arc tile (`circular-arc`, radius from the chord and rise) with its inverse (the rise from the radius and
chord), the two halves of the arc-layout question. Continues Explore sweep #14; further Group G layout growth stays
evidence-driven.
