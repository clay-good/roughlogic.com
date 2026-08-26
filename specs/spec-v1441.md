# roughlogic.com Specification v1441 -- Electroplating and Anodizing Tank Current and Time (Faraday) (calc-shop.js, Group G, shop and industrial, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`**
> (Group G, shop and industrial), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Plating and anodizing are the one shop process governed by an exact physical law -- Faraday's law of electrolysis -- and the catalog has no tile for it. Current density sets the rate, the metal's equivalent weight sets how much metal each ampere-second deposits, and the time to a target thickness falls straight out. Nothing else in the shop is this predictable.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive current density, part area, atomic weight, density, or target thickness, a valence below one, or a current efficiency outside 0-1, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): Faraday's law of electrolysis with the Faraday constant 96,485 coulombs per mole, and the cathode current-efficiency convention for plating baths, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `plating-tank-current` -- Electroplating and Anodizing Tank Current and Time (Faraday)

```
total current   = current density x part surface area
mass rate       = current x atomic weight / (valence x 96,485) x current efficiency   (g/s)
volume rate     = mass rate / metal density
thickness rate  = volume rate / part surface area
plating time    = target thickness / thickness rate
```

Faraday's law says the mass deposited is exactly proportional to the charge passed, with the constant of
proportionality being the metal's equivalent weight over the Faraday constant. Nothing about the bath chemistry,
the additives, or the operator changes that -- what they change is **current efficiency**, the fraction of the
current that deposits metal rather than evolving hydrogen. Nickel baths run near 95%; chromium baths run in the
teens, which is why chrome plating is so slow and so power-hungry.

The useful reading is that **current density**, not total current, sets the rate. A part twice as large needs
twice the current to plate in the same time, and a rectifier that cannot deliver it simply plates slower. Current
density also has upper and lower limits set by the bath -- too low and coverage is poor, too high and the deposit
burns -- so the practical rate is bounded by chemistry, not by the power supply.

Distribution is the part the law cannot help with: current goes where the field is strongest, so edges and points
plate thicker than recesses, and the calculated thickness is an average.

**Inputs:** part surface area, current density (A per sq ft), metal atomic weight, valence, density, cathode
current efficiency, target thickness.

**Outputs:** total current, deposition rate in mass, volume, and thickness per unit time, and the time to reach
the target thickness.

## 3. Worked example

Nickel plating (atomic weight 58.69, valence 2, density 8.9 g/cm3) at 40 A per sq ft over 20 sq ft of part, 95%
cathode efficiency, target 0.001 in (1 mil):

```
total current  = 40 x 20                               = 800 A
mass rate      = 800 x 58.69 / (2 x 96,485) x 0.95     = 0.2311 g/s
volume rate    = 0.2311 / 8.9                          = 0.02597 cm3/s
area           = 20 sq ft                              = 18,581 cm2
thickness rate = 0.02597 / 18,581                      = 1.398e-6 cm/s
plating time   = 0.00254 cm / 1.398e-6                 = 1,817 s = 30.3 minutes
```

Half an hour for a mil of nickel at 40 amps per square foot, which matches shop experience closely -- Faraday's
law is not an approximation. Now change the efficiency: run the same geometry in a decorative chromium bath at
15% efficiency and the deposition rate falls by more than six times before any other difference is counted. And
the current: 800 A into a 20 sq ft rack is a serious rectifier, and doubling the rack area without doubling the
rectifier simply halves the current density and doubles the time.

## 4. Scope and non-goals

Average thickness from total charge. It does not predict **distribution**, which is what actually determines
whether a part passes -- throwing power, edge buildup, recess starvation, and rack and anode placement all shift
the local thickness by large factors, and the average is the one number Faraday's law can give. Current efficiency
is a bath and operating-condition figure that varies with temperature, agitation, chemistry, and current density
itself. Anodizing follows the same law but the film grows partly into the substrate, so the coating thickness and
the metal consumed are not the same number. The tile takes no position on the **safety and environmental
requirements** of plating operations -- ventilation, hexavalent chromium exposure control, hydrogen evolution,
cyanide handling, wastewater pretreatment, and hazardous waste -- all of which are heavily regulated. The bath
supplier's technical data, OSHA, and the environmental authority govern.
