# roughlogic.com Specification v1163 -- Protruding Objects and Headroom (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-28). Single-tile spec. Tile 80 of the +100 campaign.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1162.md.
>
> **The gap.** A dupe scan for "protruding" and "circulation path" returned zero hits. `reach-range`
> (spec-v1162) covers where a control may sit; nothing covered what may stick into the path in front of it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: an unknown
mounting, a non-positive leading-edge height, path width, required width, or vertical clearance, or a
negative projection or barrier height return `{ error }`. Renderer: this module's `_simpleRenderer`.

**Source.** 2010 ADA Standards for Accessible Design, 307.2 and its handrail exception, 307.3, 307.4 and
its exception, and 307.5. A US federal standard in the public domain, quoted directly.

## 2. The tile

### 2.1 `protruding-object-check` -- Protruding Objects and Headroom (307)

```
inputs:  mounting (wall|handrail|post), leading_edge_height_in, projection_in,
         corridor_width_in, required_route_width_in, vertical_clearance_in, barrier_edge_height_in
compute: limited band  <- leading edge > 27 in AND <= 80 in
         limit         <- 4 in wall, 4.5 in handrail, 12 in overhang on posts (band only)
         width         <- path width - projection >= required route width      [307.5]
         overhead      <- clearance >= 80 in, else a barrier with leading edge <= 27 in  [307.4]
outputs: in_zone, max_projection_in, projection_ok, projection_excess_in, drop_to_cane_zone_in,
         raise_above_zone_in, remaining_width_in, width_ok, width_deficit_in, vertical_ok,
         barrier_present, barrier_ok, overhead_ok, passes, note
```

**Everybody remembers 4 inches and drops the half that says where.** The limit applies only in the band a
cane sweeps under and a person walks into -- more than 27 in and not more than 80 in. Below 27 in a cane
finds the object; above 80 in a person walks under it; 307.2 limits neither. So an over-projecting object
can be fixed by **lowering** it, which is the opposite of what people try. The default example is a 6-in
wall object at 48 in, 2 in over, and the tile prices all three moves -- shrink 2 in, lower **21 in** to 27,
or raise **32 in** past 80. The fuzzer applies each reported move and asserts it actually produces a pass.

**Mountings differ by a factor of three**: 4 in wall-mounted, 4 1/2 in for a handrail, 12 in of overhang
on posts or pylons -- so the same drinking fountain is a violation recessed into a wall and compliant on a
pylon. Both band endpoints are pinned: 27 in is *outside* the limit and 80 in is *inside* it.

**Two further rules catch objects that pass the projection test**, and the cross-check fixture is exactly
that case -- a projection at precisely 4 in that fails on both. Under 307.5 a protruding object may not
reduce the clear width a route requires, and 38 in of corridor less 4 in leaves 34 against 36. Under 307.4
the clearance must be 80 in, and where it is not, the barrier's **leading edge** must be 27 in maximum --
so 78 in of headroom with a rail at 34 in fails, because the cane has to find it before the head does. That
is the open space under a stair, where the rail goes in at hand height and the hazard is at head height.
Door closers and door stops are the stated exception at 78 in minimum.

## 3. Scope

A protrusion screen, not a route design. Not checked: whether the path is an accessible route or a
circulation path at all; the required route width itself, which is an input because it varies with the
situation; turning space, passing space, and maneuvering clearances; the object's own operable parts and
reach ranges; doors and hardware; whether a barrier is structurally adequate or detectable in practice; and
state and local accessibility law.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `reach-range`, `sign-character-height`,
`ada-ramp-slope`, and `egress-capacity`. The tools-data row sits inside the parsed Group E block, which has
no exact count assertion. Fuzzer pins both fixtures, both band endpoints on the correct side, all three
mounting limits with equality passing and a tenth over failing, the same 4.5-in projection passing as a
handrail and failing on a wall, all three fixes round-tripped at four heights, `null` rather than zero
where there is nothing to fix, 307.5 across four width and projection pairs plus a tightened required
width, 307.4 at its seam with five barrier heights, that all three checks fail independently, and every
error seam.
