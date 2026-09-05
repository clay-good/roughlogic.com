# roughlogic.com Specification v1575 -- Electromagnetic Lock Holding Force and Door Leverage (`calc-doorhardware.js`, Group A Electrical, door hardware, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-doorhardware.js`**
> (Group A, Electrical -- the existing category, hub `/groups/electrical/`; door hardware and locksmithing), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A 1,200 lb maglock does not resist 1,200 lb at the door handle. The lock sits near the hinge side of the header and the handle is a lever arm away, so the force a person can apply at the pull is multiplied against it -- and that is why doors with big magnets still get pulled open.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive holding force, door width, or lock distance, or a lock distance exceeding the door width returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the lever-ratio relation with NFPA 101 and the adopted codes named as governing electrically locked egress, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`maglock holding force lever`, `magnetic lock door leverage`, `maglock mounting position`, `effective holding force at handle`, `maglock defeat force`.

## 2. The tile

### 2.1 `maglock-holding-leverage` -- Electromagnetic Lock Holding Force and Door Leverage

```
holding force    the lock's rated shear force at the armature
lever ratio      the door is a lever about its hinge line
force at handle  F_handle = F_hold x (lock distance from hinge) / (handle distance from hinge)
so               a lock mounted CLOSE to the hinge is easy to defeat
best practice    mount the magnet as far from the hinge as the header allows
degraded holding a gap, contamination, or low voltage all reduce actual holding force
```

The door is a lever and the magnet is the fulcrum's opponent. A magnet mounted three inches from the hinge on a
36 inch door works at a 12:1 mechanical disadvantage against someone pulling at the handle, so a 1,200 lb rating
becomes about 100 lb at the pull -- defeatable by one determined person. Mounting the same magnet near the strike
edge changes the ratio to nearly 1:1 and the lock performs as rated.

Two further reductions apply before anyone pulls. Rated holding force assumes full face contact between the
armature and the magnet with no gap; a warped door, paint, dirt, or a misaligned armature drops it sharply, and a
sixteenth of an inch of gap is a large loss. And the magnet must have its rated voltage at the lock, which a long
undersized run does not deliver (`electric-lock-power-budget`).

The egress caution is not optional. A maglock holds until it is de-energized, so on any door required for egress
the release arrangement -- request-to-exit, motion sensor, fire alarm interface, and power failure behaviour -- is
a code matter, and a magnet that stays locked when the building is on fire is a fatality mechanism regardless of
its rating.

**Inputs:** lock rated holding force, door width, distance from the hinge to the lock centre, distance from the hinge to the handle or pull, and the armature gap and supply voltage at the lock

**Outputs:** the lever ratio, the effective force resisting a pull at the handle, the improvement from moving the lock toward the strike edge, the reduced holding force implied by a stated gap or voltage shortfall, and the lock rating needed for a target resistance at the handle

## 3. Worked example

A 1,200 lb maglock mounted 3 in from the hinge on a 36 in door, with the pull at the strike edge:

```
lever ratio  = 3 / 36                 = 0.0833
force at the handle = 1,200 x 0.0833     = 100 lb
```

**100 lb** -- one person. The magnet is doing exactly what it is rated to do and the geometry is throwing
almost all of it away.

Move the same lock to 33 in from the hinge, near the strike edge:

```
force at the handle = 1,200 x 33/36 = 1,100 lb
```

1,100 lb from the identical hardware, 11 times better, at no cost. Lock position is the
whole design.

Then apply the reductions: a 1/16 in gap between armature and magnet can cut rated holding force by half or more,
and a lock seeing 20 V instead of 24 loses more again. A well-mounted magnet that is dirty and undervolted can
end up back where the badly mounted one started.

## 4. Scope and non-goals

A lever-ratio calculation. It uses rated holding force as a starting point, and real holding force depends on
armature-to-magnet contact, alignment, surface cleanliness, door rigidity, temperature, and supply voltage --
none of which this tile measures and all of which reduce it. It does not evaluate the door, frame, or the
fasteners securing the magnet and armature, which are frequently the actual failure point. It does not address
the egress requirements that govern electrically locked doors: release on power failure, request-to-exit,
fire alarm interface, delayed egress provisions, and the occupancies in which maglocks are permitted at all are
set by the adopted building and fire codes, and a locking arrangement that does not release is a life-safety
violation whatever its holding force. It does not size power or wiring (`electric-lock-power-budget`). The
adopted building and fire codes, NFPA 101, the lock manufacturer's listing and installation instructions, and the
AHJ govern.
