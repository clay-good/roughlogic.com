# roughlogic.com Specification v1530 -- Well Casing and Annulus Cement Volume (`calc-oilgas.js`, Group E Carpentry and Construction, drilling, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-oilgas.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; oil, gas, and pipeline), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Cementing a casing string is a volume job with a hard consequence: short on cement and the top of cement never reaches where it must, long and you have cement where you did not want it. The annulus is a difference of squares, and the capacity constants are the ones every rig hand carries.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive hole diameter, casing diameter, or length, a casing diameter at or above the hole diameter, or a negative excess factor returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the annular and pipe capacity constants and the cement volume method as standard drilling practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`casing cement volume`, `annular capacity bbl per foot`, `cement slurry volume well`, `displacement volume casing`, `top of cement calculation`.

## 2. The tile

### 2.1 `casing-cement-volume` -- Well Casing and Annulus Cement Volume

```
annular capacity   bbl/ft = (D_hole^2 - D_casing^2) / 1029.4       (inches)
pipe capacity      bbl/ft = ID^2 / 1029.4
slurry volume      V = annular capacity x cement column length x (1 + excess)
displacement       V_disp = casing capacity x (depth to float collar)
excess             25 to 100% openhole depending on caliper; near zero inside casing
```

The constant 1029.4 converts square inches of area over a foot of length into barrels, and once it is in hand
the whole job is arithmetic: annulus capacity times the column height gives the slurry, casing capacity to the
float gives the displacement. The annulus is a difference of SQUARES, which means it is much more sensitive to
hole size than to casing size and why an oversized or washed-out hole eats cement fast.

Excess is where the honesty lives. A gauge hole needs little; a washed-out shale section can need double. A
caliper log turns excess from a guess into a measurement, and running one before a critical cement job is the
difference between hitting top of cement and finding out later from a bond log. Getting the DISPLACEMENT wrong
is the more dangerous error in the other direction -- over-displacing pumps cement past the float and up the
annulus from the wrong end, and under-displacing leaves cement inside the casing to drill out.

**Inputs:** hole diameter (or caliper volume), casing outside and inside diameter, the cement column length, the excess factor, the depth to the float collar, and the slurry yield

**Outputs:** the annular and casing capacities in bbl/ft, the annular volume for the column, the slurry volume with excess, the sacks of cement at the entered yield, the displacement volume, and the top of cement achieved by a stated slurry volume

## 3. Worked example

Cementing 9.625 in casing in a 12.25 in hole, 4,200 ft of cement column, 8.535 in casing ID, float collar
at 4,160 ft, 35% excess:

```
annular capacity = (12.25^2 - 9.625^2) / 1029.4 = (150.06 - 92.64) / 1029.4 = 0.0558 bbl/ft
annular volume   = 0.0558 x 4,200                       = 234.3 bbl
with 35% excess                                        = 316.3 bbl
casing capacity  = 8.535^2 / 1029.4                    = 0.0708 bbl/ft
displacement     = 0.0708 x 4,160                      = 294.4 bbl
```

316 barrels of slurry, 294 barrels of displacement.

The excess sensitivity: at 25% the slurry is 292.9 bbl and at 60% it is 374.9 bbl -- a
82.0 bbl spread on the same hole, which at the top of the column is hundreds of feet of cement either
way. That is why the caliper matters more than the arithmetic does.

## 4. Scope and non-goals

Volume arithmetic for a conventional single-stage casing cement job. It does not design the cement job: slurry
design, density, yield, thickening time, free water, fluid loss, mixability, compressive strength development,
and compatibility with the formation and with the mud are all laboratory work, and they are what actually decide
whether a job is successful. It does not evaluate equivalent circulating density or whether the slurry column
will fracture the formation, which is a well-control question, or model mud removal and centralization, which is
the usual reason a job fails a bond log despite correct volumes. It does not handle stage tools, liners, foamed
or lightweight systems, or losses to the formation. Well construction is regulated: the operator's drilling
program, the cementing service company's engineering, API standards, and the state or federal regulator
govern.
