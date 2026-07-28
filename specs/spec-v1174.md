# roughlogic.com Specification v1174 -- Horizontal Lifeline Tension and Anchorage (calc-cross.js, Group G, 1 New Tile)

> **Status: LANDED (2026-07-28). Single-tile spec. Tile 91 of the +100 campaign.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-cross.js`** (Group G), no new module, group, or dependency. Inherits spec.md through
> spec-v1173.md.
>
> **The gap.** `fall-protection-clearance` computes the room needed *below* an anchor and
> `swing-fall-geometry` covers the pendulum. A dupe scan for "lifeline" and "arresting force" returned zero
> hits: nothing computed what the anchors themselves see.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: a non-positive
span, sag, arrest force, or safety factor, a non-integer or sub-one worker count, a negative capacity or
target, or a sag at or beyond the span return `{ error }`. Renderer: this module's `_simpleRendererG`.
Group G count assertion 38 -> 39; `check-module-sizes` cap for calc-cross.js raised 56000 -> 64000.

**Source.** Static cable equilibrium, plus OSHA 29 CFR 1926.502(d)(8), (d)(15), and (d)(16), a US federal
regulation in the public domain quoted directly. No copyrighted content is reproduced.

## 2. The tile

### 2.1 `lifeline-tension` -- Horizontal Lifeline Tension and Anchorage (1926.502)

```
inputs:  span_ft, sag_ft, arrest_force_lb, workers, safety_factor,
         anchorage_capacity_lb (0 = skip), target_tension_lb (0 = skip)
compute: T = W x sqrt((L/2)^2 + s^2) / (2 s);   H = W x L / (4 s)
         engineered anchorage = T x safety factor
         prescriptive anchorage = 5,000 lb x workers;  the larger governs
         inverse: s = W (L/2) / sqrt(4 T^2 - W^2), undefined for a target <= W/2
outputs: slant_ft, cable_tension_lb, horizontal_pull_lb, tension_multiple, angle_deg,
         anchorage_demand_lb, prescriptive_anchorage_lb, governing_anchorage_lb,
         engineered_governs, anchorage_ok, anchorage_deficit_lb, sag_for_target_ft,
         tension_at_double_sag_lb, arrest_over_harness, max_arresting_force_lb,
         free_fall_max_ft, decel_max_ft, note
```

**Sag sets the multiplier, and the trade runs backwards from intuition.** The default example is an 1,800
lb arrest at midspan of a 30 ft line sagging 1 ft: **13,530 lb** in the cable, **13,500 lb** of horizontal
pull at each anchor, 7.5 times the arrest force, with the cable only 3.8 degrees off horizontal. Halving
the sag roughly doubles the tension, so the line pulled drum-tight is the dangerous one and the slack that
looks sloppy is what keeps the anchors alive. The cross-check fixture at 3 ft of sag drops the tension to a
third. Sag is not free -- it costs clearance below, which the note says plainly and which is a separate
tile.

**The regulatory trap is the 5,000 lb figure.** 1926.502(d)(15) is what everyone quotes, but (d)(8)
requires a horizontal lifeline designed and supervised by a **qualified person** maintaining a safety
factor of at least two -- and on a flat line that engineered demand (27,060 lb here) dwarfs 5,000 lb per
worker. The fuzzer pins that the governing path flips **both** ways: the same flat line with ten workers
attached is back to the prescriptive 50,000 lb.

**The statics are verified rather than asserted.** For five geometries the fuzzer recomputes the closed
form independently, checks that the two cable halves' vertical components sum to exactly the arrest force,
that the axial pull never falls below its own horizontal component, and that each half always carries at
least half the load. The inverse round-trips at four combinations, and a target at or below half the arrest
force returns `null` -- there is no sag that reaches it.

## 3. Scope

A tension estimate, not a lifeline design. Not checked: fall clearance below the line; the cable, its
terminations, turnbuckles, and connectors, whose ratings usually govern before the anchor does; dynamic and
impact effects beyond the static midspan case, and off-midspan loading; more than one worker loading the
line at once, which is not superposed; sag under self-weight before a fall; the 1,800 lb arresting force,
3.5 ft deceleration, and 6 ft free-fall limits of (d)(16), which are flagged but not designed to; the
structure the anchors attach to, which is the usual real limit; and the non-optional requirement that the
whole system be designed and supervised by a qualified person.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `fall-protection-clearance`,
`swing-fall-geometry`, `silica-table-1`, and `guard-post-load`. Fuzzer pins both fixtures, the closed-form
statics at five geometries with an independent equilibrium check, monotonicity in sag and the doubling
behaviour, the reported double-sag tension against an actual run, the governing anchorage across five
sag-and-worker combinations flipping both ways, the safety factor scaling only the engineered path, optional
capacity checking returning `null`, the inverse round-trip at four combinations with `null` below the
reachable limit, the harness-limit flag, and every error seam.
