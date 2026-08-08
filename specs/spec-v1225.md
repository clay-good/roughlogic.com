# roughlogic.com Specification v1225 -- Circular Segment Area (calc-layout.js, Group G, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-layout.js`** (Group G),
> no new module, group, or dependency. Inherits spec.md through spec-v1224.md.
>
> **The gap.** Family-completion: the circle-layout family (`circular-arc`, `circular-arc-rise-from-radius`,
> `circle-from-3-points`, `bolt-circle`) gives radii, arc lengths, and angles but never the enclosed AREA between a chord
> and its arc -- the "how much material" deliverable.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input (via `_finiteGuard`), or a non-positive chord or rise returns `{ error }`. Citation discipline
(v19/v22): the circular-segment area (first-principles circle geometry as in Machinery's Handbook), by name,
`GOVERNANCE.general`. **No copyrighted table is reproduced** -- pure geometry; the chord and rise are the user's own
measurements.

## 2. The tile

### 2.1 `circular-segment-area` -- Circular Segment Area (from Chord and Rise)

```
R     = (chord^2/4 + rise^2) / (2 x rise)
theta = 2 acos((R - rise)/R)
A     = (1/2) R^2 (theta - sin theta)      = R^2 acos((R-h)/R) - (R-h) sqrt(2 R h - h^2)
```

**Inputs:** chord/span (in) and rise/sagitta at midspan (in).

**Outputs:** segment area (in^2), radius, central angle.

## 3. Worked example

`chord_in = 24, rise_in = 4`:

```
R     = (144 + 16)/8 = 20 in
theta = 2 acos(16/20) = 73.74 deg
A     = 0.5 x 400 x (1.28700 - sin 1.28700) = 200 x 0.32700 = 65.40 in^2
```

A chord equal to the diameter (chord 20, rise 10) gives exactly half the circle: 157.08 in^2 = pi R^2 / 2.

## 4. Limitations

Area only -- the arc length and layout come from the circular-arc tile. Valid for minor and major segments (a rise above
the radius carries theta past 180 degrees). A shop aid; first-principles circle geometry.

## 5. Verification

- Bounds-fuzzer `bounds: spec-v1225` pins A = (1/2)R^2(theta - sin theta), the alternate closed-form cross-check, the
  exact semicircle case (pi R^2 / 2), the more-rise-more-area trend, and the error seams.
- Two worked-example rows in `test/fixtures/worked-examples.json` (the chord-24/rise-4 example and the semicircle
  cross-check).
- Formula checked against first-principles circle geometry (Machinery's Handbook, segment of a circle).
