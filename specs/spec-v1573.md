# roughlogic.com Specification v1573 -- Panic Hardware Operating Force and Latch Release (`calc-doorhardware.js`, Group E Carpentry and Construction, door hardware, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-doorhardware.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; door hardware and locksmithing), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Panic hardware exists so a crowd pushing toward an exit gets out, and the code puts a hard ceiling on how hard the bar may be to operate. A device that measures over it is a life-safety failure, not a maintenance annoyance, and the causes are usually elsewhere in the opening.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive door width or measured force, or a mounting height outside the allowed range returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the IBC and NFPA 101 egress door operating force limits by name with NFPA 80 cited for fire doors, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`panic hardware force`, `exit device operating force`, `15 pound release force`, `crash bar force limit`, `fire exit hardware latch`.

## 2. The tile

### 2.1 `panic-hardware-force` -- Panic Hardware Operating Force and Latch Release

```
release force     15 lbf maximum to release the latch (IBC / NFPA 101)
door leaf force   30 lbf to set the door in motion, 15 lbf to swing it to full open
actuating portion the bar must span at least half the door leaf width
mounting height   between 34 and 48 in above the floor
fire exit hardware must latch; a rated door with panic hardware cannot have the latch defeated
```

Three separate forces are measured and they fail for different reasons. Release force is the bar itself and a
high reading points at the device: binding, a bent bar, a latch dragging on a misaligned strike, or a device that
has never been lubricated. Set-in-motion and swing forces are the door, and a high reading there points at the
closer, the hinges, or a pressure difference across the opening.

That last cause is the one people miss. A stair door in a pressurized stairwell can be well within every hardware
specification and still take far more than 30 lbf to move, because the building is holding it shut -- and the
harder the stairwell is pressurized for smoke control, the worse it gets. The catalog's
`stairwell-pressurization` tile computes that force; this one is where the limit it must meet lives.

Fire exit hardware carries an additional constraint that gets violated with good intentions: on a rated door the
latch must engage, so a device dogged down to make a door swing freely for convenience has defeated a fire door.
Only listed fire exit hardware without a dogging feature belongs on a rated opening.

**Inputs:** measured release force, measured force to set the door in motion and to swing it fully open, door leaf width, actuating portion length, mounting height, whether the door is fire rated, and any pressure difference across the opening

**Outputs:** each measured force against its limit with the margin, a pass or fail on each, the required actuating portion length for the leaf width, the mounting height check, and a flag identifying whether a failure points at the device or at the door and its environment

## 3. Worked example

A 36 in fire-rated stair door, measured: release 9 lbf, set in motion 34 lbf, swing to full open 12 lbf.

```
release        9 lbf  vs 15 lbf limit   -> pass
set in motion 34 lbf  vs 30 lbf limit   -> FAIL by 4 lbf
swing         12 lbf  vs 15 lbf limit   -> pass
actuating portion required = 36 / 2 = 18 in minimum
```

The bar is fine and the door is not. Release force passing while set-in-motion fails is the signature of
something holding the door shut rather than something wrong with the device -- here, almost certainly stairwell
pressurization. Replacing the exit device would change nothing.

The fix runs through the mechanical system: check the pressure difference across the door with the fans in their
worst-case mode, and if it is producing the extra 4 lbf, the stairwell pressurization needs rebalancing or a
relief path. Adjusting the closer down would help the reading and hurt the door's ability to close and latch,
which on a rated stair door is not an acceptable trade.

Dogging is not available here either: this is a rated opening, so the hardware must latch every time.

## 4. Scope and non-goals

A force comparison against limits the user supplies. The limits, how and where the force is measured, and the
exceptions differ between the IBC, NFPA 101, and the accessibility standards, and the adopted code governs. It
does not evaluate whether panic hardware is required for the occupancy and occupant load, which is a separate
code determination, and it does not address delayed egress, controlled egress, electrically locked egress, or
the special provisions those carry. It does not evaluate the fire door assembly's label, its closing and latching
performance, or the annual inspection (`fire-door-clearance`). It does not compute the pressure difference across
the door, which is `stairwell-pressurization`. Egress hardware is life-safety equipment and a door that will not
open under crowd load is a fatality mechanism: the adopted building and fire codes, NFPA 80 and NFPA 101, the
hardware listings, and the AHJ govern.
