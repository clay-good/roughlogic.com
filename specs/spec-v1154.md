# roughlogic.com Specification v1154 -- Jobsite Material Stacking Limits (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-28). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1153.md.
>
> **The gap.** A dupe scan for "brick stack" and "lumber pile" returned zero hits.

Repository: github.com/clay-good/roughlogic.com -- US standards only. OSHA is public domain, so the
provisions are quoted.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: an unknown
material, a non-positive height, a negative taper, or a non-positive block dimension in block mode return
`{ error }`. Renderer: this module's `_simpleRenderer`.

## 2. The tile

### 2.1 `material-stacking-limits` -- Stacking Limits (OSHA 1926.250)

```
inputs:  material (brick|block|lumber), stack_height_ft, taper_provided_in,
         block_height_in, block_length_in, handled_manually
compute: brick   ceiling 7 ft;  taper = (h - 4) x 2 in per foot above 4 ft
         block   tiers above 6 ft = ceil((h - 6) x 12 / block height)
                 taper = tiers x half the block length;  no stated ceiling
         lumber  ceiling 20 ft, or 16 ft where handled manually;  no taper
outputs: rule, max_height_ft, threshold_ft, height_ok, height_over_ft, taper_required,
         taper_required_in, taper_ok, taper_shortfall_in, tiers_above_threshold, passes, note
```

**One idea, one trap.** The idea: past a threshold a stack has to lean **away**, because a vertical face
of loose units fails by toppling toward whoever is standing at it -- the person unstacking, at the moment
they have removed the units that were holding the face. The trap: the **threshold and the ceiling are
different numbers**, so a stack can be perfectly legal in *height* and illegal in *shape*. A 5-ft brick
stack is 2 ft under the ceiling and already owes 2 in of taper; people check the height, see headroom, and
stop reading. That is the first fixture, and the fuzzer pins the whole band from 4.5 to 7 ft.

**Block scales with the unit, not the foot.** The taper is per *tier*, so an 8-ft stack of 8-in block is
three tiers above the threshold and owes **24 in** -- an order of magnitude more than the brick rule
produces at a comparable height. Halving the block length halves the taper; halving the course height
doubles the tier count. Both are pinned.

**Lumber changes without anyone touching the pile.** 20 ft mechanically handled, 16 ft where it will be
handled manually -- so the same pile is legal or not depending on how it comes **down**, not how it went
up. A 20-ft pile built with a forklift becomes non-compliant the day the machine leaves.

**One thing not invented:** the section states no height ceiling for masonry block, only the taper. The
tile returns `null` there rather than making one up.

## 3. Scope

Not checked: the ground or floor and its bearing, drainage, and slope; banding, blocking, and interlocking;
bagged and bundled material; storage against walls; aisles and passageways, which must be kept clear and in
good repair; clearance from openings, edges, and excavations; and the load the supporting deck can carry,
which is frequently the real limit indoors.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `masonry-count`,
`brick-veneer-anchor-spacing`, `scaffold-platform-check`, and `flammable-cabinet-storage`. Fuzzer pins
both fixtures, the legal-height-illegal-shape band, both brick thresholds, the per-tier block taper with
unit length and course height varied independently, the absent block ceiling, all four lumber seams
including the manual-handling switch, that exactly the required taper always clears it, and every error
seam.
