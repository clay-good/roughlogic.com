# roughlogic.com Specification v1668 -- Magnetic Particle Yoke and Coil Amperage (`calc-inspection.js`, Group E Carpentry and Construction, welding inspection, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-inspection.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; welding inspection and ndt), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Magnetic particle testing only finds a discontinuity if the field is strong enough and oriented across it, and the amperage that produces that field comes off the part dimension and the coil turns. Under-magnetize and the indication does not form; over-magnetize and the background obscures it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive part diameter, length, or coil turns, or a length-to-diameter ratio outside the applicable range returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the magnetizing amperage relations with ASTM E1444 and SNT-TC-1A named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`magnetic particle amperage`, `mt coil shot amp turns`, `central conductor amperage`, `yoke lifting power test`, `magnetic particle field orientation`.

## 2. The tile

### 2.1 `magnetic-particle-amperage` -- Magnetic Particle Yoke and Coil Amperage

```
coil shot, low fill   NI = 45,000 / (L/D)      (amp-turns; L/D the length to diameter ratio)
coil shot, high fill  NI = 35,000 / (L/D + 2)
central conductor     the field circles the conductor; amperage from part diameter
                      commonly 100 to 1,000 A per inch of part diameter
yoke                  no amperage calculation; verified by lifting power on a test weight
                      10 lb at maximum pole spacing for AC, 40 lb for DC
orientation           a longitudinal field finds transverse discontinuities and vice versa;
                      two shots at right angles are required
verification          field adequacy is verified with a gauss meter or a QQI, not assumed
```

The orientation rule is the one that makes or breaks an inspection. A magnetic field reveals discontinuities
that cut ACROSS it; a crack running parallel to the field produces no leakage and no indication at all. So a
single shot inspects for one crack orientation, and finding cracks in any orientation requires at least two
shots at right angles -- which is why a procedure specifies both a circular and a longitudinal technique and why
inspecting with only one is inspecting for half the defects.

The amp-turn relations for coil shots depend on the part's length-to-diameter ratio because a short part
demagnetizes itself at its own ends, so it takes more field to magnetize a stubby part than a long one. Fill
factor -- how much of the coil's opening the part occupies -- changes the relation again, which is why the same
part in a different coil needs a different setting.

The yoke is the exception and it is the common field tool: there is no amperage calculation, and its adequacy is
verified by lifting a test weight at the pole spacing in use. A yoke that lifts less than its required weight is
not producing an adequate field regardless of what its meter says, and that check is done at the start of each
shift.

**Inputs:** the technique (coil, central conductor, or yoke), part length and diameter, coil turns and fill factor, the required field strength, and the yoke pole spacing and test weight

**Outputs:** the amp-turns required for the entered coil technique and length-to-diameter ratio, the current at the entered number of turns, the amperage for a central conductor shot, the yoke lifting requirement at the entered pole spacing, and the second shot orientation required for full coverage

## 3. Worked example

A central conductor shot on a part 6 in in diameter, at a typical 800 A per inch:

```
amperage = 6 x 800 = 4,800 A
```

A coil shot on a bar with a length-to-diameter ratio of 6, high fill factor:

```
NI = 35,000 / (6 + 2) = 4,375 amp-turns
at 5 turns: I = 4,375 / 5 = 875 A
```

**The orientation trap.** That coil shot produces a LONGITUDINAL field, which finds TRANSVERSE
discontinuities -- cracks running around the bar. A longitudinal crack running along the bar's axis produces no
leakage field in that shot and will not indicate, no matter how strong the field or how good the particles.
Finding it requires a circular field -- a central conductor or a head shot -- and that is a second, separate
inspection.

An inspection performed with one shot has inspected for one crack orientation, and reporting it as an
inspection of the part is wrong.

The yoke check, for the field tool most people actually use: a yoke at its maximum pole spacing must lift 10 lb
on AC or 40 lb on DC. A yoke that will not is producing an inadequate field, and the check takes ten seconds at
the start of the shift.

Field adequacy is verified with a gauss meter or a quantitative quality indicator -- not by the amperage
setting, which is a starting point.

## 4. Scope and non-goals

A magnetizing current calculation from relations and constants the user supplies. The applicable amperage
formulas, the amperage-per-inch ranges, fill factor definitions, and the acceptance of a technique are set by the
governing code and by the written procedure -- ASTM E1444 and E709, ASME Section V, and AWS as applicable -- and
those govern. It does not establish that an adequate field was produced, which is verified with a gauss meter,
quantitative quality indicator, or the yoke lifting test, and which is a required step. It does not address
particle type and concentration, wet or dry method, lighting and viewing conditions (fluorescent methods have
specific illumination and adaptation requirements), demagnetization after testing, or the interpretation and
evaluation of indications, which is where the skill lies. It applies only to ferromagnetic materials.
Personnel qualification is governed by a written practice to SNT-TC-1A or equivalent. The applicable code, the
written procedure, and a qualified NDT technician govern.
