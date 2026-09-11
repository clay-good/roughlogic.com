# roughlogic.com Specification v1769 -- Corrosion Rate from Coupon Weight Loss (`calc-corrosion.js`, Group G Cross-Trade Utilities, cathodic protection and corrosion control, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-corrosion.js`**
> (Group G Cross-Trade Utilities, hub `/groups/cross-trade/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A weighed coupon is the most direct corrosion measurement there is, and the conversion to mils per year is a fixed arithmetic. What the number does not say is where the metal went, and uniform rate is a poor predictor of the pitting that actually perforates equipment.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive mass loss, density, area, or exposure time, a retirement thickness at or above the wall thickness, or a pitting factor below 1 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the ASTM G1 mass-loss rate relation with ASTM G1 and G4 and the applicable pressure design code named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`corrosion rate mpy`, `coupon weight loss corrosion`, `astm g1 corrosion rate`, `remaining wall life corrosion`, `pitting factor corrosion rate`.

## 2. The tile

### 2.1 `corrosion-rate-weight-loss` -- Corrosion Rate from Coupon Weight Loss

```
rate             CR (mils per year) = 534 x W / (D x A x T)
                 W in milligrams lost, D in g/cm^3, A in square inches, T in hours
the constant     534 carries the unit conversion only; there is no empiricism in it
density          7.85 for carbon steel, about 8.0 for the 300-series stainless
                 steels, 8.9 for copper
cleaning         W is the loss after the corrosion product is removed by the
                 standard procedure, not the loss in service weight
exposure         T is the full exposure hours, and a short exposure over-reports
                 because the initial rate is always the highest
wall life        remaining years = (wall - retirement thickness) / rate
pitting          a pit advances many times faster than the uniform rate; a pitting
                 factor of 5 to 10 is ordinary and 50 is not unknown
```

The coupon measures an average over its whole surface and over the whole exposure, and both averages hide
things. The rate is highest when the metal is first exposed and falls as a product film forms, so a thirty-day
coupon reports a rate that a ninety-day coupon in the same service will not reproduce. Comparing coupons
across different exposure lengths is comparing different quantities, which is why a monitoring programme fixes
its exposure interval and keeps it.

Uniform rate and perforation are only loosely related, and this is the limitation that matters operationally.
Metal removed evenly across a surface thins it predictably; metal removed from a few small sites drives a pit
through the wall while the average loss stays trivially small. A coupon reporting a comfortable rate can sit
in a system that is leaking, and the coupon is not wrong -- it is answering a question about averages in a
situation governed by extremes.

That is why the coupon is read alongside its own appearance. The mass loss gives the rate; the surface gives
the mechanism. Pits, crevice attack under the holder, edge effects, deposits, and the colour and adherence of
the product film all tell the technician what kind of corrosion is happening, and a pitting factor measured
from the deepest pit on the coupon is worth more than the rate it accompanies.

**Inputs:** the mass lost, the alloy density, the exposed surface area, the exposure hours or days, the wall thickness and retirement thickness, and optionally a pitting factor from the coupon's deepest pit

**Outputs:** the corrosion rate in mils per year and in millimetres per year, the metal loss over a stated service period, the remaining wall life at the uniform rate, and the remaining life at the entered pitting factor

## 3. Worked example

A carbon steel coupon of 6.0 sq in exposed 90 days and losing 125 mg after cleaning:

```
T  = 90 x 24 = 2,160 hours
CR = 534 x 125 / (7.85 x 6.0 x 2,160) = 0.6561 mpy
```

**0.66 mpy is a low rate** -- in a 0.250 in wall with a 0.125 in retirement thickness, the remaining life is:

```
life = (0.250 - 0.125) / 0.000656 = 191 years
```

**191 years, which is not a real answer.** It is the correct arithmetic and a meaningless projection, because
nothing about the service will stay constant for 191 years and because the number is far outside the range
the measurement can support.

**Change one thing and the picture changes completely.** The same coupon losing 2,500 mg instead:

```
CR   = 534 x 2,500 / (7.85 x 6.0 x 2,160) = 13.12 mpy
life = 0.125 / 0.01312 = 9.5 years
```

**13.1 mpy takes the same wall to retirement in 10 years.** A factor of 20 in mass loss is a factor of 20 in
rate and in life, exactly -- the relation is linear and holds no surprises.

**The surprise is in the pits.** Apply a pitting factor of 10, an entirely ordinary figure taken from the
deepest pit on a coupon whose average loss was the modest 0.66 mpy:

```
pit rate = 0.6561 x 10 = 6.56 mpy
life     = 0.125 / 0.00656 = 19 years
```

**191 years by the average, 19 years at the deepest pit.** Both numbers come from the same coupon and the
same weighing, and **the second one is the one that decides when the equipment leaks.** A monitoring programme
that records the mass loss and not the pit depth has measured the wrong extreme.

## 4. Scope and non-goals

A conversion and a projection. The rate is an average over the coupon's area and its exposure, and it predicts perforation only where corrosion is genuinely uniform -- pitting, crevice corrosion, under-deposit attack, microbiologically influenced corrosion, and erosion-corrosion all concentrate loss in ways this number cannot represent, and the pitting factor must be measured from the coupon rather than assumed. A coupon samples one location, one orientation, and one flow regime, and a coupon in a holder is not the pipe wall: it has edges, a crevice at the mount, and a different surface condition. Short exposures over-report because the initial rate is highest. It does not identify the corrosion mechanism or recommend an inhibitor or a material, and it does not substitute for wall thickness measurement on the equipment itself (`ut-thickness-velocity` and the inspection tiles address that). It takes no position on retirement thickness, which is set by the governing pressure design code and not by a corrosion programme. ASTM G1 and G4 for the coupon procedure, the applicable pressure design code for retirement limits, and a qualified corrosion engineer govern.
