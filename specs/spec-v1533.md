# roughlogic.com Specification v1533 -- Annular Velocity and Hole Cleaning (`calc-oilgas.js`, Group E Carpentry and Construction, drilling, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-oilgas.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; oil, gas, and pipeline), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Cuttings only leave the hole if the mud moving up the annulus is faster than the cuttings settle, and annular velocity is the number that decides it. A hole that is not being cleaned packs off, and the warning signs appear in the annular velocity long before they appear on the standpipe.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive hole diameter, pipe diameter, or flow rate, or a pipe diameter at or above the hole diameter returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the annular velocity and transport-ratio relations as standard drilling practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`annular velocity drilling`, `hole cleaning velocity`, `bottoms up time`, `cuttings transport ratio`, `annular volume bbl per foot`.

## 2. The tile

### 2.1 `annular-velocity-cleaning` -- Annular Velocity and Hole Cleaning

```
annular velocity   AV = 24.5 x Q / (D_hole^2 - D_pipe^2)      (ft/min, gpm, inches)
slip velocity      the rate a cutting falls through static mud
transport ratio    (AV - slip) / AV; positive is required, higher is better
annular volume     bbl/ft = (D_hole^2 - D_pipe^2) / 1029.4
bottoms up         annular volume x depth / pump output
```

Annular velocity is flow over annular area, and because the area is a difference of squares it changes fast
with hole size: the same pump rate that cleans a 8.75 in hole around 5 in pipe is nowhere near enough in a 12.25
in hole. That is why rate has to go up with every larger hole section, and why a washed-out interval is a
cleaning problem as well as a cement problem.

The number that matters is transport ratio, not velocity alone -- what counts is how much faster the mud rises
than the cuttings fall. Slip velocity depends on cutting size and density and on the mud's rheology, so a thin
mud carries poorly at any rate, which is why hole cleaning is fixed with sweeps, rheology, and pipe rotation as
much as with flow. On a high-angle well none of this is sufficient: cuttings form a bed on the low side and
mechanical agitation from rotation is what removes them, so a horizontal section that is clean by this arithmetic
can still be packing off.

Bottoms-up time is the companion number, and it is the one a crew actually uses: how long before what the bit is
making reaches the shakers.

**Inputs:** hole diameter, drillpipe or collar outside diameter, flow rate, measured depth, pump output per stroke, and optionally the cutting slip velocity

**Outputs:** the annular velocity opposite pipe and opposite collars, the annular capacity, the annular volume and bottoms-up time in strokes and minutes, the transport ratio against a stated slip velocity, and the flow required for a target annular velocity

## 3. Worked example

A 8.75 in hole with 5.0 in drillpipe at 420 gpm:

```
AV = 24.5 x 420 / (8.75^2 - 5.0^2) = 10,290 / (76.56 - 25.00) = 200 ft/min
```

200 ft/min. Against a slip velocity of 30 ft/min the transport ratio is
`(200 - 30) / 200` = 0.85 -- good cleaning.

Now the same pump rate in a 12.25 in hole opposite the same pipe:

```
AV = 24.5 x 420 / (12.25^2 - 5.0^2) = 82 ft/min
transport ratio = 0.64
```

The velocity nearly halves and the transport ratio falls to 0.64.
To restore 200 ft/min in the bigger hole the pump has to run
`200 x (150.06 - 25.00) / 24.5` = 1019 gpm -- which may be more than the
pumps or the motor will take, and that is the moment sweeps and rheology stop being optional.

## 4. Scope and non-goals

Average annular velocity for a concentric annulus with a uniform hole size. Real holes are not gauge and pipe
is not centred: an eccentric annulus in a deviated well has a low-side gap where velocity is much lower than the
average, which is precisely where cuttings beds form, and the average reported here does not see it. It does not
compute slip velocity, which depends on cutting size, shape and density and on the mud's non-Newtonian rheology,
and a value entered from a rule of thumb is indicative only. It does not evaluate equivalent circulating density,
which rises with flow rate and can fracture the formation before hole cleaning is achieved -- the two constraints
often conflict and resolving them is an engineering decision. It does not model hole cleaning in high-angle or
horizontal sections, where mechanical agitation rather than velocity governs. The operator's drilling program,
the mud engineer, and API standards govern.
