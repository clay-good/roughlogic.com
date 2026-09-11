# roughlogic.com Specification v1828 -- Cutter Suction Dredge Production and Slurry Density (`calc-marine.js`, Group E Carpentry and Construction, marine construction and dredging, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-marine.js`**
> (Group E Carpentry and Construction, hub `/groups/construction/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A dredge's production is the pipeline flow times the fraction of it that is solid, and the second term is where all the skill lies. Raising the concentration raises production proportionally and pushes the line toward the velocity below which it plugs.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive pipe diameter, velocity, or specific gravity, a concentration or porosity outside 0 to 1, or a non-positive effective hours figure returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the slurry volume balance and the in-situ porosity conversion with the site investigation and the contract measurement convention named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`cutter suction dredge production`, `slurry concentration by volume`, `dredge pipeline flow cubic yards per hour`, `in situ volume dredging`, `slurry specific gravity`.

## 2. The tile

### 2.1 `dredge-production-rate` -- Cutter Suction Dredge Production and Slurry Density

```
pipeline flow    Q = pipe area x velocity; the velocity is bounded below by
                 settling (`slurry-critical-velocity`) and above by wear and power
concentration    Cv, the volume fraction of solids in the slurry; 10 to 20% is
                 ordinary and higher is the whole art of dredging
solids rate      Q x Cv, the volume of SOLID PARTICLES per unit time
in-situ volume   the solids occupied more volume in the bank because of its void
                 space: in-situ = solids / (1 - porosity), porosity about 0.35
                 to 0.45 for sand
production       in-situ cubic yards per hour, which is what a contract measures
slurry density   SG = 1 + Cv x (SG_solids - 1); it is what the density gauge reads
                 and how the dredger knows Cv
effective hours  production is quoted on effective dredging hours, not elapsed;
                 swing, anchor moves, and pipeline changes are not dredging
```

Production is a product of two numbers and only one of them is easy. Flow is set by the pipe and the pump and
is nearly constant through a shift; concentration swings continuously with what the cutter is in, how the
swing is being worked, and how the ladder is set. A dredge operator's job is essentially to hold the highest
concentration the line will carry, and the instrument that makes it possible is the density gauge on the
discharge.

The in-situ conversion is where dredging arithmetic differs from every other earthmoving calculation, and it
runs the opposite way from a fill. Sand in the bank contains voids; the same sand as particles in a slurry
occupies only the solid volume. A contract paid on in-situ cubic yards removed is therefore paid on a volume
larger than the solids the pipeline carried, and the porosity assumed is worth agreeing before the job rather
than after.

Concentration and velocity are coupled and that coupling is the constraint on production. Carrying more solids
raises the velocity needed to keep them moving, and velocity costs friction head as its square, so pump power
climbs steeply while production climbs linearly. The operating point sits just above the settling velocity,
which is why a dredge that is being pushed too hard does not gradually lose efficiency -- it plugs the line,
and clearing a plugged discharge is measured in shifts.

**Inputs:** the discharge pipe diameter and velocity, the slurry concentration by volume, the in-situ porosity, the solids specific gravity, the effective dredging hours, and an alternative concentration

**Outputs:** the pipeline flow, the solids volume rate, the in-situ volume rate, the production in cubic yards per hour and per day, the slurry specific gravity the density gauge should read, and the production at an alternative concentration

## 3. Worked example

A 24 in discharge running at 18 ft/s at 15% solids by volume:

```
area      = pi/4 x 2.0^2 = 3.142 sq ft
flow      = 3.142 x 18 = 56.55 cu ft/s
solids    = 56.55 x 0.15 = 8.48 cu ft/s of particles
in-situ   = 8.48 / (1 - 0.40) = 14.14 cu ft/s
production= 14.14 x 3600 / 27 = 1,885 cy/h
over 20 effective hours = 37,699 cy/day
```

**1,885 in-situ cubic yards an hour**, and note that the pipeline only carried 1,131 cubic yards of actual
solids in that hour -- **the difference is the void space the sand had in the bank**, and it is paid for.

**The density gauge is how the operator sees the concentration:**

```
SG = 1 + 0.15 x (2.65 - 1) = 1.248
```

**1.248 on the discharge gauge is 15% solids.** That single reading is the production instrument, because
flow barely moves through a shift and concentration moves constantly.

**Raising the concentration raises production one for one:**

```
at 20%: production = 2,513 cy/h, a 33 percent gain
```

**628 more cubic yards an hour from the same pipe at the same velocity** -- which is why an operator
works the cutter to hold density rather than to move the ladder quickly.

**And the reason it cannot simply be pushed further.** Carrying more solids raises the velocity at which they
settle (`slurry-critical-velocity`), and friction head rises as the SQUARE of velocity while production rises
linearly. **The operating point sits just above the settling velocity**, and a line pushed past it does not
gradually degrade -- **it plugs**, and clearing a plugged discharge line is measured in shifts rather than
minutes.

## 4. Scope and non-goals

A production estimate. Concentration is entered and is the whole answer: it varies continuously with the material, the cutter's engagement, the swing rate, the ladder depth, and the operator, and a shift average is the only meaningful figure. In-situ porosity must be established from the site investigation, and a contract's measurement convention -- in-situ survey volume, in-hopper volume, or dry tonnage -- must be agreed in advance because they are different quantities that differ by large factors. It does not size the pump or compute the system head, which involves static lift, friction in a long discharge line, the slurry's own friction behaviour, and booster pumps, and which is what actually limits a long-distance dredge. It does not address production losses to swing, anchor and spud moves, pipeline changes, weather, and downtime, which separate effective hours from elapsed ones and are the usual reason a job misses its estimate. It does not address the cutter's ability to excavate the material, which governs in stiff clay and rock, overflow and turbidity, or the placement area's capacity. The site investigation, the contract's measurement convention, the dredge manufacturer's pump curves, and the dredging engineer govern.
