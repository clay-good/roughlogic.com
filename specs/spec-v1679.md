# roughlogic.com Specification v1679 -- Square-to-Round Transition Development (`calc-metalair.js`, Group E Carpentry and Construction, sheet metal, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-metalair.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; sheet metal and architectural metal), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A square-to-round transition is four triangles and four cone segments, and laying it out flat means finding the true length of every line -- because a line that is sloped in two directions is longer than either view shows. It is the classic layout problem and it is arithmetic, not art.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive height, square side, or circle diameter, or an element count below four returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the triangulation development method with SMACNA duct construction standards named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`square to round development`, `transition layout triangulation`, `true length line sheet metal`, `fitting pattern development`, `square to round pattern`.

## 2. The tile

### 2.1 `square-to-round-development` -- Square-to-Round Transition Development

```
true length       TL = sqrt( plan length^2 + height^2 )
                  every element line is sloped; its plan view understates it
flat triangles    the four corners of the square connect to points on the circle
cone segments     the four arcs between; divided into elements, each with its own true length
development       laid out by triangulation: successive triangles built from true lengths
seam and laps     added to the developed pattern, not to the theoretical shape
check             the developed pattern's outer edge should equal the circle's circumference
```

Triangulation is the method and true length is the only idea in it. Any line on the transition that is not
vertical or horizontal appears shorter in every orthogonal view than it really is, so laying out from plan
dimensions produces a pattern that is too small and a fitting that will not close. The true length is the
hypotenuse of the plan distance and the height, computed for every element line, and the pattern is then built by
laying those triangles down in sequence.

The circle is divided into elements because a curve cannot be triangulated directly. More elements give a more
accurate development and more layout work; twelve or sixteen per quadrant is common, and the error from using too
few shows up as a pattern whose curved edge is short.

The check at the end is worth doing every time: the developed pattern's curved edge, measured along its length,
should equal the circumference of the circular end. If it does not, an element true length is wrong or the
division was uneven, and finding that on the bench costs a sheet rather than a fitting.

Everything after that is allowances -- seams, laps, and the metal thickness itself on a formed edge -- and they
are added to the developed shape rather than being part of it.

**Inputs:** the square dimensions, the circle diameter, the vertical height, the offset between centres if not concentric, the number of elements per quadrant, and the seam and lap allowances

**Outputs:** the true length of each element line, the developed pattern coordinates, the total developed length of the curved edge against the circle circumference as a check, the flat pattern dimensions, and the sheet size required

## 3. Worked example

A concentric transition from a 20 in square to a 14 in round over a 16 in height, developed with 8 elements per
quadrant.

The key relationship, for one element line running from a square corner to a point on the circle:

```
plan distance from corner to that circle point = say 9.2 in
height                                         = 16 in
true length = sqrt(9.2^2 + 16^2) = sqrt(84.6 + 256) = 18.46 in
```

**The plan view showed 9.2 in and the line is 18.46 in.** Laying out from plan dimensions produces a pattern
half the size it needs to be on that element -- which is the error the whole method exists to prevent.

Every element gets its own true length because every one has a different plan distance, and the pattern is built
by laying those triangles down in order.

The check: the developed curved edge should measure `pi x 14` = {math.pi*14:.2f} in around. If the layout comes
out at 42 in instead, an element is wrong or the circle was divided unevenly, and it is found on the bench.

Element count: 8 per quadrant approximates each arc with 8 chords, and the chords are slightly shorter than the
arc -- so the developed edge is marginally short and the fitting is marginally tight. More elements reduces it;
16 per quadrant is close enough for almost any duct work.

## 4. Scope and non-goals

A layout method. It develops the theoretical surface and does not include seam allowances, laps, edge
preparation, or the metal thickness effects that a formed edge introduces -- those are added to the pattern and
depend on the seam type and the shop's practice. It assumes a developable straight-line surface between the two
openings, which is what a triangulated transition is; it does not handle transitions with curved elements,
compound offsets beyond a simple centre offset, or transitions that must fair into adjacent fittings. It does not
address the duct construction requirements -- gauge, reinforcement, and seam type by pressure class -- which come
from SMACNA and the project specification, or the pressure loss the transition introduces, which depends on its
slope. SMACNA duct construction standards and the project specification govern.
