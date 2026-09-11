# roughlogic.com Specification v1815 -- Rack Storage Flue Space and In-Rack Sprinkler Trigger (`calc-warehouse.js`, Group E Carpentry and Construction, warehouse racking and material handling, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-warehouse.js`**
> (Group E Carpentry and Construction, hub `/groups/construction/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** The vertical gaps between pallets in a rack are not slack, they are part of the fire protection design: they let water from ceiling sprinklers reach down into the rack. Beam length is set by the flue requirement, and a load one size too big closes the flue the sprinkler design assumed.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive pallet dimension, beam length, frame depth, or row spacing, a pallet count below one, or a computed flue below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the nominal transverse and longitudinal flue dimensions with NFPA 13 as adopted and the authority having jurisdiction named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`rack flue space nfpa 13`, `transverse longitudinal flue`, `in rack sprinkler requirement`, `rack storage beam length flue`, `pallet overhang flue closure`.

## 2. The tile

### 2.1 `rack-flue-space` -- Rack Storage Flue Space and In-Rack Sprinkler Trigger

```
transverse flue  the vertical space between loads ACROSS the rack row, at the
                 uprights and between adjacent pallets; nominal 6 in
longitudinal     the vertical space between back-to-back rows, running along the
flue             rack; nominal 6 in in double-row rack
why              flues are the path by which ceiling sprinkler water reaches the
                 lower levels of a rack; a closed flue defeats it
beam length      required = pallets x pallet width + gaps x nominal flue -- so the
                 FLUE sets the beam, not the pallets
row spacing      back-to-back spacing minus the overhang on each side gives the
                 longitudinal flue; a deeper pallet on the same frames closes it
the trigger      when ceiling protection alone cannot be shown adequate for the
                 commodity, storage height, and arrangement, in-rack sprinklers
                 are required -- a substantial cost
solid shelving   solid decking blocks the flue entirely and changes the protection
                 requirement; open wire or bar decking does not
```

Flues are fire protection hardware that happens to look like empty space. A ceiling sprinkler above a
twenty-foot rack has to deliver water to a fire that may be at the second level, and the only route is
vertically down through the gaps between loads. Close those gaps and the ceiling system is protecting the top
of the rack and nothing below it, which is precisely the arrangement the protection scheme was not designed
for.

The beam length consequence is the one warehouse layouts get wrong, and it runs the opposite way from
intuition. A bay is not sized by adding pallet widths; it is sized by adding pallet widths and the flues
between them. A bay laid out to fit the pallets exactly produces gaps too small to be flues, and the rack is
built, loaded, and then found non-compliant at an inspection -- at which point the remedy is fewer pallets per
bay, which is a permanent capacity loss.

Longitudinal flue is closed by overhang rather than by layout, and that makes it the sneakier of the two. Load
depth greater than the frame depth hangs over both faces, and the back-to-back flue is the row spacing less
those overhangs. Change to a deeper pallet or a load that hangs out further, and a flue that was compliant on
the day of installation is closed by a purchasing decision nobody connected to fire protection.

**Inputs:** the pallet width and depth, the pallets per bay, the number of transverse gaps, the nominal flue width, the beam length, the rack frame depth, and the back-to-back row spacing

**Outputs:** the transverse gap each bay actually provides, the beam length the nominal flue requires, the pallet overhang front and back, the longitudinal flue the row spacing provides, and the same check for a deeper load

## 3. Worked example

Two 48 in pallets on a 108 in beam:

```
gaps available = 108 - 2 x 48 = 12 in, shared across 3 gaps
each gap       = 4.0 in
```

**4.0 in where 6 in is nominal.** The bay fits the pallets and does not provide flues. The beam length
the flue requirement actually calls for is:

```
required = 2 x 48 + 3 x 6 = 114 in
```

**114 in, not 108.** 18 in of every bay is flue rather than pallet, and the 6 extra inches of beam
across every bay in the building are **bought to hold nothing at all** -- which is exactly what a flue is, and
exactly why it is designed rather than left over.

**The longitudinal flue is closed by the load, not the layout:**

```
overhang       = (48 - 42) / 2 = 3 in each face
back-to-back   = 12 in frame to frame
longitudinal flue = 12 - 2 x 3 = 6 in
```

**6 in, exactly nominal, with no margin at all.** Now change to a 52 in deep load on the same frames at the
same spacing:

```
overhang = (52 - 42) / 2 = 5 in
flue     = 12 - 2 x 5 = 2 in
```

**2 in.** The rack did not move, the row spacing did not change, and **the longitudinal flue has gone from
compliant to 33% of nominal because purchasing changed a pallet.** Nothing in the warehouse looks
different and the ceiling sprinkler system's design basis no longer holds.

**Which is where the cost lands.** When ceiling protection cannot be shown adequate for the commodity, the
storage height, and the arrangement, **in-rack sprinklers are required** -- piping in every rack row, at
multiple levels, with its own water supply and its own vulnerability to lift truck damage. **A closed flue is
one of the things that pushes a building across that line.**

## 4. Scope and non-goals

A geometry check against nominal dimensions, not a fire protection design. Flue requirements, their nominal and minimum dimensions, where they are required and where they may be omitted, and whether ceiling protection alone is adequate are determined by NFPA 13 or the applicable standard as adopted, and they depend on the commodity classification, the storage arrangement and height, the ceiling height, the sprinkler type and design density, the presence of solid or open shelving, encapsulation, and plastics content. None of that is geometry, and a bay that satisfies the nominal dimensions may still require in-rack protection. It does not classify commodities, select a sprinkler design, evaluate the water supply (`sprinkler-system-demand`), or determine whether in-rack sprinklers are required. It does not address solid or slatted decking, open-top or encapsulated loads, or the effect of load overhang on the sprinkler design in general. Any change to commodity, storage height, rack arrangement, or load dimensions is a change to the fire protection design basis. NFPA 13 as adopted, the authority having jurisdiction, the insurer's requirements where more stringent, and a fire protection engineer govern.
