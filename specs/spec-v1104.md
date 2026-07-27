# roughlogic.com Specification v1104 -- Swing Fall Geometry (calc-cross.js, Group G, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-cross.js`**
> (Group G), no new module, group, or dependency. Inherits spec.md through spec-v1103.md.
>
> **The gap, and the evidence for it.** `fall-protection-clearance` and `fall-arrest-clearance` both sum
> VERTICAL terms only -- free fall, deceleration, harness stretch, worker height, margin. Neither has a
> horizontal input. No tile id contains "swing" or "lifeline"; the nearest math is `spanline-sag-tension`,
> which is rigging catenary, not fall arrest. Discovery batch 1: CLEAR.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: a zero offset
(no swing), non-positive anchor height, an offset at or beyond the anchor height (unreachable), or a
negative base clearance return `{ error }`. **No new constants** -- only g = 32.174, already used across
the catalog. Renderer: `_simpleRendererG`, registered after definition per the spec-v1101 TDZ note.

## 2. The tile

### 2.1 `swing-fall-geometry` -- Swing Fall Geometry (Pendulum Drop and Arc)

```
inputs:  horizontal_offset_ft (X), anchor_height_ft (L, anchor above the attachment point),
         base_required_clearance_ft (from fall-protection-clearance; 0 to see the swing terms alone)
compute: theta       = asin(X / L)
         swing_drop  = L - sqrt(L^2 - X^2)   ( == L(1 - cos theta) )
         speed       = sqrt(2 g h) at the bottom of the arc
         arc         = L x theta
         total       = base + swing_drop
outputs: swing_angle_deg, swing_drop_ft, impact_speed_fps, impact_speed_mph, arc_length_ft,
         total_required_clearance_ft, over_30_deg, note
```

**The two things it exists to say.** First, the swing drop is *additional free fall* that the vertical
clearance calculation never counted -- so it is reported as an addition to whatever
`fall-protection-clearance` produced, not as a standalone curiosity. Second, and this is the one that
injures people: the worker arrives at the bottom of the arc moving **sideways**, and the arrest system does
nothing about a wall, a column, or a leading edge in the path. The tile reports that speed in ft/s and mph.

**Worked example (pinned), chosen for an exact value.** 10 ft offset with the anchor 20 ft above the
attachment point is `asin(0.5)` = **exactly 30 degrees**: drop 2.6795 ft, 13.13 ft/s (9.0 mph) sideways,
10.47 ft of arc. Added to an 18.5-ft base clearance the requirement becomes 21.18 ft. Cross-check at a 2-ft
offset: 5.74 degrees and only 0.100 ft of drop -- **a 5x change in offset moves the drop 27x**, which is
why the guidance is stated as an angle rather than a distance.

## 3. Scope limits

Geometry only, assuming a taut line pivoting about a fixed anchor. Lanyard stretch, self-retracting-lifeline
locking behavior, the strike itself, and edge contact where a line drags over a corner are NOT modeled, and
the note says so. The 30-degree limit is commonly published fall-protection guidance, reported as guidance
rather than presented as a computed threshold. A competent person and the employer's fall-protection plan
govern.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with both clearance tiles. Fuzzer pins the
exact 30-degree case, the equivalence of the two algebraic drop forms across six geometries, energy
consistency (speed is exactly sqrt(2 g h) for the drop returned), arc > offset, the additive clearance,
the strong nonlinearity in offset, that a higher anchor reduces the swing (the practical fix), the flag
boundary at exactly 30 degrees, and the unreachable-offset error seam.
