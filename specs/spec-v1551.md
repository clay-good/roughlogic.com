# roughlogic.com Specification v1551 -- Wind Power Density, Betz Limit, and Rotor Output (`calc-wind.js`, Group A Electrical, wind energy, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-wind.js`**
> (Group A, Electrical -- the existing category, hub `/groups/electrical/`; wind energy), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Wind power goes as the CUBE of speed, which is why a site with 20% more wind has 73% more energy and why siting matters more than equipment. The Betz limit then caps what any rotor can extract at 59.3%, and knowing both numbers stops a lot of bad decisions.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive air density, rotor diameter, or wind speed, or a power coefficient above the Betz limit returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the wind power relation and the Betz limit of 16/27 by name, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`wind power density`, `betz limit calculation`, `power in the wind cube law`, `rotor swept area power`, `wind turbine theoretical maximum`.

## 2. The tile

### 2.1 `wind-power-density-betz` -- Wind Power Density, Betz Limit, and Rotor Output

```
power in the wind   P = 0.5 rho A v^3
power density       P/A, per unit of swept area
Betz limit          C_p,max = 16/27 = 0.593, the theoretical maximum
real machines       C_p 0.35 to 0.48 at best point, including drivetrain losses
extracted power     P = 0.5 rho A v^3 C_p
```

The cube law is the single most important fact in wind energy and the one most often underweighted. A site
averaging 18 mph instead of 15 has `(18/15)^3` = 1.73 times the energy in its wind -- 73% more -- for a 20%
difference in speed. That is why met tower data and hub height matter enormously (`wind-shear-hub-height`), and
why moving a machine a short distance to better exposure can beat any equipment choice.

Betz then sets the ceiling. A rotor that extracted all the wind's energy would have to stop the air completely,
and stopped air cannot get out of the way of the air behind it; the optimum slows the flow to a third of its
upstream speed and captures 16/27 of the energy. No rotor of any design beats it. Real machines reach 0.35 to
0.48 including losses, so a claim above 0.59 is not an engineering breakthrough, it is an error or a fraud, and
that is a useful thing for a technician or a small-wind buyer to be able to check in one line.

**Inputs:** wind speed, air density (or elevation and temperature), rotor diameter, and the power coefficient

**Outputs:** the swept area, the power density in the wind per unit area, the total power in the wind through the rotor, the Betz-limited power, the extracted power at the entered coefficient, and the power at an alternative wind speed to show the cube law

## 3. Worked example

A 380 ft rotor (113,411 sq ft swept) in a 20 mph wind at sea-level density:

```
swept area = pi/4 x 380^2      = 113,411 sq ft
v          = 20 mph            = 29.3 ft/s
```

The wind's power through that disc at Betz-limited extraction is a large multiple of what the same rotor makes at
10 mph, and that is the whole point:

```
at 10 mph the wind carries (10/20)^3 = 0.125 of the power at 20 mph
at 25 mph it carries       (25/20)^3 = 1.953 times
```

Half the wind speed is one eighth the power. A 25% increase in speed is
95% more power.

The Betz check on a claim: a machine advertised as extracting 65% of the wind's energy is claiming to beat a
theoretical limit that follows from conservation of mass and momentum alone. It is not possible, at any price,
with any blade.

## 4. Scope and non-goals

The theoretical power in the wind and the Betz ceiling. It is not an energy estimate: annual output depends on
the distribution of wind speeds over the year, not on any single speed, and because power is cubic the average of
the cubes is much larger than the cube of the average -- using a mean wind speed in this formula understates
energy substantially. `weibull-capacity-factor` is the tile that handles the distribution. It does not account
for the turbine's cut-in and cut-out speeds, its rated power and the clipping above rated, availability, wake
losses in an array, blade soiling and icing, or electrical losses. Air density must be corrected for site
elevation and temperature (`turbine-density-correction`). The manufacturer's warranted power curve and a
site-specific energy assessment govern any production estimate.
