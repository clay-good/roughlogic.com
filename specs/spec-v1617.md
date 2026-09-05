# roughlogic.com Specification v1617 -- Concrete Pump Line Pressure and Output (`calc-concrete.js`, Group E Carpentry and Construction, concrete, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-concrete.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; concrete placement and tilt-up), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A concrete pump line has a pressure limit and a concrete mix has a pumpability, and where they meet decides whether the pour runs or the line plugs. The pressure comes from length, height, and the mix, and the number worth having is how much line is left before the pump is at its limit.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive line length, diameter, or pump rated pressure, or a negative lift returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the static and friction pressure components with ACI 304.2R and the pump manufacturer ratings named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`concrete pump line pressure`, `pumping concrete friction loss`, `pump reach limit`, `concrete line plug pressure`, `boom pump pressure calculation`.

## 2. The tile

### 2.1 `concrete-pump-line-pressure` -- Concrete Pump Line Pressure and Output

```
total pressure   P = friction along the horizontal line + static lift + bend losses
static lift      about 0.043 psi per foot of rise per pcf, or roughly 1 psi per foot
                 for normal weight concrete
horizontal       friction per 100 ft depends on slump, line diameter, and rate
equivalent length a 90 degree bend adds the friction of several feet of straight line;
                 a reducer adds substantially more
flexible hose    adds far more friction per foot than steel line
limit            the pump's rated concrete pressure, not its rated hydraulic pressure
```

The static term is easy and often the larger one on a high pour: normal weight concrete is about one psi per
vertical foot, so a fifteen-storey lift is 150 psi before any friction. Horizontal friction depends most on
slump and on line diameter, and it is where a mix change shows up -- a stiffer mix can double the friction per
hundred feet, and a line that ran fine on a 5 inch slump plugs on a 3 inch one.

Bends and reducers are the quiet killers. Each 90 degree bend is worth several feet of straight line, and a
reducer at the pump outlet can be worth more than a long run -- which is why a line with many bends around a
congested site can hit the pump's limit at a fraction of its nominal reach.

The limit that matters is the pump's rated CONCRETE pressure, and the practical output is the remaining line
length available. A crew that knows they have 40 feet of margin can plan the last placement; a crew that
discovers the limit by plugging the line loses the pour and spends the afternoon breaking couplings.

**Inputs:** horizontal line length and diameter, vertical lift, the number of bends and reducers with their equivalent lengths, flexible hose length, mix slump and unit weight, placement rate, and the pump rated concrete pressure

**Outputs:** the static pressure from lift, the friction pressure along the line, the equivalent length added by bends and fittings, the total required pressure, the margin against the pump rating, and the additional line length available before the limit

## 3. Worked example

A pour with 320 ft of 5 in steel line, 60 ft of vertical lift, six 90 degree bends, 25 ft of flexible hose,
5 in slump, placing at 40 cu yd/h, against a pump rated 1,100 psi on concrete:

```
static lift      = 60 ft x 1.0 psi/ft                  = 60 psi
horizontal line  = 320 ft at roughly 1.4 psi/100 ft... at this slump and rate, say 4.5 psi/100 ft
                 = 320 x 0.045                          = 14 psi
bends            = 6 x 10 ft equivalent = 60 ft         = 3 psi
flexible hose    = 25 ft at roughly 3x steel friction   = 3 psi
total                                                    = 80 psi
```

Comfortable -- this pour has enormous margin, which is the normal case for a modest lift and a workable mix.

Now the case that plugs. Same geometry, but the mix arrives at a 2 in slump and the friction per 100 ft rises by
a factor of four or more, and the crew adds 200 ft of line to reach the far corner:

```
horizontal 520 ft at 0.20 psi/ft   = 104 psi
plus static 60, bends and hose 12  = 176 psi
```

Still inside the pump -- but the mix is now at the edge of pumpability, and the failure will not be a pressure
reading. **It will be a blockage at a bend**, which is what a stiff mix does before it reaches any pressure
limit. The correct response is to fix the mix at the truck, not to push harder.

## 4. Scope and non-goals

A pressure estimate using friction values the user supplies. Friction loss in a concrete line is not a simple
function: it depends on slump, aggregate size and shape, sand content, fines, admixtures, temperature, and the
line's condition, and published charts give broad ranges. A mix's pumpability is a mix design question, and a mix
that is marginal will block regardless of calculated pressure -- blockages are usually a mix or a segregation
problem rather than a pressure problem. It does not design a pump setup, size the pump, or address line
restraint, which is a safety requirement: a line under pressure that separates whips, and couplings, restraints,
and the exclusion zone around the line and the boom are governed by the equipment manufacturer and by OSHA. It
does not address boom reach and setup (`boom-pump-reach`) or ground bearing under outriggers. ACI 304.2R for
pumping, the pump manufacturer's ratings, the concrete supplier's mix design, and the contractor's competent
person govern.
