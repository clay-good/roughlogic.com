# roughlogic.com Specification v1572 -- Lock Backset, Bore, and Strike Layout (`calc-doorhardware.js`, Group E Carpentry and Construction, door hardware, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-doorhardware.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; door hardware and locksmithing), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Boring a door for a lock is unforgiving: the backset, the cross bore, the edge bore, and the strike all have to agree, and a hole in the wrong place is a new door. The dimensions are standard and the arithmetic is a layout that belongs on a phone at the jamb.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive door thickness, backset, or bore diameter, or a lock height outside the accessible range when that check is requested returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): standard backset and bore dimensions with the manufacturer template and NFPA 80 named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`lock backset layout`, `door bore dimensions`, `strike plate location`, `2 3/8 versus 2 3/4 backset`, `cylindrical lock prep`.

## 2. The tile

### 2.1 `lock-backset-strike-layout` -- Lock Backset, Bore, and Strike Layout

```
backset        centre of the cross bore to the door edge: 2 3/8 in or 2 3/4 in standard
cross bore      the large hole through the face, typically 2 1/8 in for a cylindrical lock
edge bore       through the edge for the latch, typically 1 in
strike centre   at the same height as the cross bore, on the jamb, offset for the stop
mortise locks   a pocket rather than a bore; the case dimensions come from the lock
height          commonly 38 to 40 in to centre; ADA requires operable parts 34 to 48 in
```

The two standard backsets exist because of door and stile geometry, and mixing them up is the common error:
boring at 2 3/8 in for a lock supplied at 2 3/4 in leaves the latch short of the strike and the lock proud of the
door edge. Confirming which one the lock is before the hole saw touches the door takes ten seconds and saves a
door.

The strike location is where layout errors show up. It sits at the same height as the cross bore but its
horizontal position depends on the door stop location and the door's clearance in the frame, so it is laid out
from the closed door rather than measured from the jamb edge. A strike set from the wrong reference produces a
door that either will not latch or that rattles.

Handing and bevel are the third dimension. A latch bolt has to face the right way and a bevelled edge has to be
bevelled toward the stop, and both are determined before boring rather than corrected after.

**Inputs:** backset, cross bore and edge bore diameters, door thickness and width, lock height to centre, door stop location and frame clearance, and the handing

**Outputs:** the cross bore centre from the edge and from the floor, the edge bore centre, the strike centreline location on the jamb, the accessible height check, and the minimum stile width the prep requires

## 3. Worked example

A 1 3/4 in door with a 2 3/8 in backset cylindrical lock, bored at 38 in to centre:

```
cross bore centre  = 2 3/8 in from the door edge, 38 in from the floor
cross bore         = 2 1/8 in diameter through the face
edge bore          = 1 in diameter, centred on the same 38 in line
strike centreline  = 38 in from the floor on the jamb, positioned from the CLOSED door face
```

Minimum stile: the cross bore needs `2 3/8 + 2 1/8 / 2` = 3 7/16 in of stile from the edge to clear the far side
of the hole, so a narrow-stile door will not take this lock at all -- which is why glass doors use mortise or
narrow-stile hardware instead.

Accessibility: 38 in is comfortably inside the 34 to 48 in operable-parts range. A lock set at 32 in on a
residential-style door does not comply in a commercial application, and that is a layout decision made before
boring rather than a hardware one.

The backset trap: order the lock at 2 3/4 in and bore at 2 3/8 in and the latch face sits 3/8 in shy of the door
edge. There is no adjustment that fixes it.

## 4. Scope and non-goals

A layout aid using standard dimensions. It does not replace the lock manufacturer's own template, which is
supplied with the lock and which governs -- manufacturers vary in bore sizes, latch face dimensions, and required
clearances, and mortise locks and multipoint hardware follow entirely different preps. It does not address
handing, bevel, door swing, or frame preparation, and it does not evaluate fire door requirements, where field
modification of a rated door assembly is restricted and where any prep beyond the listing voids the label. It
does not address electrified hardware raceways, access control preps, or the reinforcement a door needs to
support the hardware. Fire-rated door assemblies are life-safety equipment: NFPA 80, the door and hardware
manufacturers' listings and templates, the adopted accessibility standard, and the AHJ govern.
