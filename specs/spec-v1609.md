# roughlogic.com Specification v1609 -- Flagger Station Advance Warning Distance (`calc-civil.js`, Group E Carpentry and Construction, traffic control, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-civil.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; traffic, work zone, and pavement), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A flagger standing without adequate advance warning is standing in traffic. The sign spacing ahead of them comes off the MUTCD by road type and speed, and the flagger's own station has a separate buffer -- two distances that get collapsed into one and should not be.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive speed or spacing, or a sight distance shorter than the stopping distance returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the MUTCD Table 6C-1 advance warning spacing by name with the state supplement named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`flagger advance warning distance`, `mutcd sign spacing table 6c-1`, `flagger station location`, `flagger sight distance`, `work zone sign spacing`.

## 2. The tile

### 2.1 `flagger-advance-warning` -- Flagger Station Advance Warning Distance

```
advance warning   three signs typically; spacing by road type
                  urban low speed 100 ft, urban high speed 250 ft, rural 500 ft,
                  expressway 1,000 ft and up (MUTCD Table 6C-1)
flagger station   located far enough ahead of the work space that a stopped queue
                  clears the work, plus a buffer for the flagger themselves
sight distance    the flagger must be visible for at least the stopping distance
escape route      the flagger needs a planned place to go; it is a required consideration
queue             stopped vehicles extend back from the flagger toward the advance signs
```

Two distances, two purposes. The advance warning sequence tells a driver a work zone is coming and gives them
time to slow; its spacing is tabulated and depends on road type and speed, and the whole sequence for a rural
highway occupies more than a quarter mile. The flagger station is separate: it sits ahead of the work space by
enough that the queue the flagger creates does not sit in the work area, plus a buffer between the flagger and
the first stopped vehicle.

The check that gets skipped is sight distance to the flagger. A flagger positioned just over a crest or around a
curve is invisible until a driver is inside their own stopping distance, which is the geometry of a fatality. The
flagger station is chosen for visibility first and convenience second, and where the sight distance is not
available the answer is to move the station, add advance flaggers, or use a different traffic control method
entirely.

Queue length matters on higher-volume roads: a flagger operation on a busy two-lane road can back traffic past
the advance warning signs, at which point drivers meet the queue with no warning at all. That is a capacity
problem masquerading as a signing problem.

**Inputs:** approach speed, road type for the spacing table, the tabulated sign spacings, the available sight distance to the flagger station, the work space length, and the approach volume for a queue estimate

**Outputs:** the position of each advance warning sign from the flagger station, the total length of the advance warning area, the stopping sight distance at the approach speed, the sight distance available against it, and a flag where the flagger station is not visible for the full stopping distance

## 3. Worked example

A flagger operation on a rural two-lane highway posted 55 mph, using the 500 ft rural spacing:

```
first sign  (nearest)  500 ft ahead of the flagger station
second sign          1,000 ft
third sign           1,500 ft
advance warning area total = 1,500 ft, over a quarter mile
```

And the sight distance check at 55 mph on level pavement:

```
stopping sight distance ~ 495 ft
```

**The flagger must be visible for at least 495 ft.** A station placed 300 ft beyond a crest fails that by
nearly 200 ft, and no amount of correct sign spacing compensates -- the signs told the driver something was
coming and the flagger appears inside their stopping distance anyway.

The fixes in order: move the flagger station back beyond the crest so approaching drivers see it in time; if the
geometry does not allow it, place an advance flagger or a spotter on the crest; if neither works, this is not a
flagging operation and needs a temporary signal or a different phasing.

Queue: at 400 vehicles per hour on the approach and a 4 minute cycle, roughly 27 vehicles stop, occupying about
700 ft -- inside the 1,500 ft advance area here, but on a busier road the queue would reach the first sign and
drivers would meet stopped traffic unwarned.

## 4. Scope and non-goals

A spacing and sight-distance screen. The advance warning distances are MUTCD tabulated values that must be
entered from the adopted edition and its state supplement; they vary by road type and are amended by many
agencies. It does not design a temporary traffic control plan -- flagger operations require the full sequence of
advance warning, transition, buffer, work, and termination areas, along with device spacing, flagger
certification, high-visibility apparel, and a defined escape route, and this tile addresses two elements of that.
It does not evaluate queue length rigorously, capacity, or delay, and it does not address night operations,
lighting, or two-flagger radio coordination. Flaggers are struck and killed in work zones: the adopted MUTCD and
its state supplement, the agency's work zone standards, flagger certification requirements, and a qualified
traffic control designer govern.
