# roughlogic.com Specification v1160 -- Accessible Toilet Compartment Sizing (calc-plumbing.js, Group B, 1 New Tile)

> **Status: LANDED (2026-07-28). Single-tile spec. Tile 77 of the +100 campaign.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-plumbing.js`** (Group B), no new module, group, or dependency. Inherits spec.md through
> spec-v1159.md.
>
> **The gap.** A dupe scan for "toilet compartment", "water closet clearance", and "ambulatory" returned
> zero hits. `fixture-clearance-check` does the IPC minimums and says explicitly that the accessible case
> is governed elsewhere and is larger; nothing covered that case.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: a non-integer or
non-positive compartment or water-closet count, a negative urinal count, a non-positive wheelchair
dimension, an unknown mounting, or a non-positive ambulatory dimension where one is provided return
`{ error }`. Hand-written renderer, matching this module's convention.

**Source.** 2010 ADA Standards for Accessible Design, 213.3.1, 604.8.1.1, and 604.8.2.1. A US federal
standard in the public domain, quoted directly. No copyrighted table is involved.

## 2. The tile

### 2.1 `accessible-toilet-compartment` -- Accessible Toilet Compartment Sizing (604.8)

```
inputs:  compartment_count, water_closet_count, urinal_count, wc_mounting (wall-hung|floor-mounted),
         wheelchair_width_in, wheelchair_depth_in, ambulatory_provided,
         ambulatory_width_in, ambulatory_depth_in
compute: wheelchair  <- width >= 60 in AND depth >= 56 in (wall hung) or 59 in (floor mounted)
         ambulatory required <- compartments >= 6 OR (urinals + water closets) >= 6
         ambulatory  <- depth >= 60 in AND 35 in <= width <= 37 in
outputs: required_wheelchair_depth_in, wheelchair_width_ok, wheelchair_depth_ok, both deficits,
         wheelchair_ok, other_mounting_depth_in, survives_mounting_swap, fixture_total,
         by_compartments, by_fixtures, fixtures_alone_trigger, ambulatory_required,
         ambulatory_width_ok, ambulatory_too_wide, ambulatory_depth_ok, ambulatory_ok,
         ambulatory_missing, passes, note
```

**The trigger is an OR that gets read as an AND.** 213.3.1 requires a second, *ambulatory* compartment in
addition to the wheelchair one where six or more compartments are provided **or** where urinals and water
closets together total six or more fixtures. Four stalls and three urinals is **seven fixtures** and owes
one, even though nobody counted six stalls -- the default example, and the case that gets missed because
the stalls get counted and the urinals do not. The tile names *which limb fired*. **In addition** means in
addition: one large accessible stall among five ordinary ones satisfies neither requirement, and the
fuzzer pins that a compliant wheelchair compartment never covers for a missing ambulatory one.

**The depth follows the fixture, not the partitions.** 56 in for a wall hung water closet, 59 in for a
floor mounted one. The same 56-in compartment passes on one and fails on the other, so a fixture
substitution that moves nothing can fail the stall -- which is what happens when a specified wall carrier
is value-engineered out after the partitions are ordered. The tile reports what the swap would cost in
both directions.

**The ambulatory width is a window, not a minimum.** 35 in minimum and 37 in **maximum**, so a 40-in stall
is too *wide* to qualify. That is a real failure rather than a bonus: the compartment exists to put grab
bars on both side walls within reach of someone who walks but needs support, and a generous stall defeats
it. The cross-check fixture is exactly that stall, and the fuzzer pins the non-monotonicity directly -- 36
in passes where 48 in does not.

## 3. Scope

Compartment sizing only. Not checked: door swing and the requirement that a compartment door not swing into
the minimum required area, door opening width and location; toe clearance under the front and side
partitions and the exception at greater depths; grab bar length, height, and position; water closet
centerline location; clear floor space and turning space in the room; lavatory, dispenser, and mirror
requirements; the accessible route to the room; children's-use dimensions, which differ; and the additional
requirements of ANSI A117.1, the adopted building code, and state and local accessibility law.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `fixture-clearance-check`,
`grab-bar-layout`, `plumbing-fixture-count`, and `accessible-parking-count`. The tools-data row sits inside
the parsed Group B block, whose assertion is a `> 20` floor. Fuzzer pins both fixtures, nine trigger
combinations across both limbs including which one fired, the urinal that carries a room over, both
mounting depths and the swap report, every dimensional seam with its compliant boundary and a tenth-inch
neighbour, the width window in both directions with the too-wide flag distinguished from too-narrow, the
explicit non-monotonicity, that an absent compartment reports `null` rather than a pass, that an unrequired
ambulatory compartment's absence is not a failure, and every error seam.
