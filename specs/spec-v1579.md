# roughlogic.com Specification v1579 -- Fire Door Clearance and Annual Inspection Limits (NFPA 80) (`calc-doorhardware.js`, Group E Carpentry and Construction, door hardware, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-doorhardware.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; door hardware and locksmithing), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A fire door assembly is inspected annually and it fails on clearances measured in fractions of an inch. The limits are small, specific, and the most common reason a door fails, so having them and the pass/fail on a phone at the door is exactly what an inspector needs.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a negative measured clearance, or a limit at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the NFPA 80 clearance limits by name with the assembly listing named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`fire door clearance limits`, `nfpa 80 annual inspection`, `fire door gap 1/8 inch`, `door bottom clearance 3/4`, `fire door inspection checklist`.

## 2. The tile

### 2.1 `fire-door-clearance` -- Fire Door Clearance and Annual Inspection Limits (NFPA 80)

```
perimeter clearance   1/8 in maximum at head and jambs (wood doors, +/- 1/16 tolerance)
                      3/16 in maximum between meeting edges of a pair
bottom clearance      3/4 in maximum from the bottom of the door to the floor
                      (or as the listing states; some assemblies allow less)
steel doors           clearance per the listing; commonly 1/8 in at head and jambs
other checks          door and frame undamaged, no field modifications, label legible,
                      closes and latches from any position, no auxiliary hardware defeating it
```

The clearance limits are the part that fails most often and the part that is easiest to check. Too much gap
and the assembly does not resist the passage of smoke and flame; a door that has dropped on its hinges, a frame
that has been shimmed, or a floor covering added after installation all move the clearance out of range without
anyone touching the door.

The bottom clearance is measured to the FLOOR, and adding carpet or tile under a rated door reduces it -- which is
usually fine -- while removing flooring increases it, which is not. The 3/4 in limit is a maximum, and a door
with an inch and a half of gap over a threshold that was taken out during a renovation is a failed assembly even
though nothing about the door changed.

The rest of the inspection is not arithmetic and belongs beside the number: the label has to be legible, there
can be no field modifications (a hole drilled for a card reader voids the label unless done under the listing),
and the door must close and latch from any position, every time, with no blocking, wedging, or dogged hardware.
A door that fails any of those fails regardless of its clearances.

**Inputs:** measured clearance at the head, each jamb, the meeting edges of a pair, and the bottom; the door material and its listing limits; and the inspection observations

**Outputs:** each measured clearance against its limit with the margin, an overall pass or fail, the failing locations named, the maximum floor covering that could be added within the bottom clearance limit, and the non-dimensional inspection items as a checklist

## 3. Worked example

A wood fire door in a pair, measured at the annual inspection:

```
head           1/8 in   limit 1/8 in            pass (at limit)
hinge jamb     1/8 in   limit 1/8 in            pass (at limit)
strike jamb    3/16 in  limit 1/8 in            FAIL by 1/16 in
meeting edges  1/8 in   limit 3/16 in           pass
bottom         1 1/4 in limit 3/4 in            FAIL by 1/2 in
```

Two failures. The strike jamb at 3/16 in is a door that has settled or a frame that has moved, and it is
corrected by adjusting the hinges or the frame -- not by adding a gasket, which does not restore the assembly's
listing.

The bottom at 1 1/4 in is almost certainly a flooring change: something was removed and the door was not
adjusted. The correction is a threshold or a door bottom that is listed for the assembly, not a sweep chosen for
draught control.

Neither door may be left in service as a rated assembly until corrected, and the inspection record has to say so.
The non-dimensional checks -- label legible, no field modifications, closes and latches from any position, nothing
holding it open -- are pass/fail alongside these and any one of them fails the door on its own.

## 4. Scope and non-goals

A clearance comparison against limits the user supplies. The limits differ by door material, construction, and
the specific listing, and by the edition of NFPA 80 the jurisdiction has adopted; the assembly's own listing
governs and the values above are the common case rather than the rule. This tile is not a fire door inspection:
NFPA 80 requires the inspection to be performed by a person with knowledge and understanding of the operating
components of the assembly, covers a list of items well beyond clearances, and requires written records. It does
not evaluate the frame, anchorage, glazing, hardware listing, or the gasketing and smoke seals, and it does not
address field modifications, which generally void a label unless performed under the listing. A failed fire door
is a life-safety deficiency: NFPA 80, the assembly's listing, the adopted fire code, and the AHJ govern.
