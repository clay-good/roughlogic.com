# roughlogic.com Specification v1712 -- Thermoplastic Pipe Pressure Derating vs Temperature (`calc-process.js`, Group B Plumbing and Gas, plastics, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-process.js`**
> (Group B, Plumbing and Gas -- the existing category, hub `/groups/plumbing/`; plastics processing), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A plastic pipe's pressure rating is stated at 73 degF and it falls steeply with temperature -- for some materials to half the rating by 120 degF and to nothing not far above. Using the printed rating on a hot line is the most common plastic piping failure.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive pressure rating or derating factor, or a temperature outside the material rated range returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the pressure-temperature derating method with the pipe manufacturer tables and the adopted plumbing code named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`plastic pipe temperature derating`, `pvc pressure at 120 degrees`, `cpvc versus pvc temperature`, `thermoplastic pressure rating derate`, `plastic pipe hot water rating`.

## 2. The tile

### 2.1 `thermoplastic-temperature-derate` -- Thermoplastic Pipe Pressure Derating vs Temperature

```
derated pressure   P_allow = P_rated x F_temperature
factor F           from the material's own table; it is NOT a single curve for all plastics
PVC                falls sharply; commonly about 0.62 at 100 degF, 0.40 at 120 degF,
                   and PVC is not rated above 140 degF
CPVC               holds much better and is rated to 200 degF at a reduced pressure
PE and PEX         have their own derating and their own long-term behaviour
long term          plastic pipe ratings are based on long-term hydrostatic strength;
                   sustained temperature is what the derating addresses
consequence        a line rated 200 psi at 73 degF may be a 80 psi line at 120 degF
```

The derating is steep and material-specific, and treating it as a small correction is the error. PVC at 120
degF retains around forty percent of its rating -- a 200 psi pipe becomes an 80 psi pipe -- and above 140 degF it
is not rated at all. CPVC exists precisely because of this: it holds far more of its rating at temperature and is
rated to 200 degF, which is why hot water distribution uses it and PVC is prohibited for the service.

The failure mode is not immediate rupture, which is what makes it insidious. Plastic pipe pressure ratings derive
from long-term hydrostatic strength -- the stress the material survives for fifty years -- so an over-rated line
does not burst on the day it is pressurized. It fails months or years later, and the failure looks like a defect
rather than a design error.

The application traps are worth naming. Compressed air in PVC is prohibited by most codes and by the
manufacturers because a brittle failure with stored gas energy is an explosion rather than a leak. Solvent-cemented
joints have their own temperature and cure-time requirements. And sunlight degrades PVC, so an outdoor line has a
separate problem that no derating table addresses.

**Inputs:** the pipe material and its pressure rating at 73 degF, the operating temperature, the derating factor from the material table, the operating pressure, and whether the service is continuous or intermittent

**Outputs:** the derated pressure rating at the entered temperature, the operating pressure against it, the margin, the temperature at which the operating pressure equals the derated rating, and the rating in an alternative material at the same temperature

## 3. Worked example

A PVC line rated 200 psi at 73 degF, operating at 120 degF where the derating factor is about 0.40:

```
allowable = 200 x 0.40 = 80 psi
```

**80 psi**, not 200. A system designed to run at 100 psi is above the pipe's allowable at that
temperature, and it will not fail today -- it will fail in a year or two, and the failure will be blamed on the
pipe.

The curve, for PVC:

```
 73 degF -> 1.00 x 200 = 200 psi
100 degF -> 0.62 x 200 = 124 psi
120 degF -> 0.40 x 200 = 80 psi
140 degF -> 0.22 x 200 = 44 psi
above 140 -> NOT RATED
```

**The same line in CPVC** holds far more of its rating and is rated to 200 degF -- which is the entire reason CPVC
exists and why hot water distribution is not done in PVC.

And the applications that are not a derating question at all:

```
compressed air in PVC  -- prohibited; a brittle failure with stored gas energy is an explosion
outdoor exposure       -- ultraviolet degrades PVC; a separate problem the tables do not cover
```

Neither is solved by derating, and both are found on jobs where someone reasoned from the pressure rating
alone.

## 4. Scope and non-goals

A derating comparison using factors the user supplies. Derating factors are material specific and come from the
pipe manufacturer's published tables and the applicable standard; PVC, CPVC, PE, PEX, PP, and PVDF all behave
differently and a factor for one is not valid for another. The rating basis is long-term hydrostatic strength at
a stated design life, so a derated pressure is a sustained rating rather than a burst pressure -- exceeding it
causes delayed failure, not immediate rupture, which makes it easy to believe an over-pressured system is fine.
It does not address surge and water hammer, which plastic pipe is particularly sensitive to and which must be
evaluated separately, cyclic loading, chemical compatibility, ultraviolet exposure, or the prohibition on
compressed gas service in many plastics. It does not address joining methods, support spacing, or thermal
expansion. The pipe manufacturer's pressure-temperature tables, the applicable plumbing or piping code, and the
design engineer govern.
