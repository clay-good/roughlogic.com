# roughlogic.com Specification v1720 -- Wet Scrubber Liquid-to-Gas Ratio and Removal (`calc-airquality.js`, Group G Cross-Trade Utilities, air quality, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-airquality.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; air quality and environmental), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A wet scrubber's performance is bought with liquid, and the liquid-to-gas ratio is the number that sets it. Too little and removal falls off; too much and the pump and the wastewater treatment cost more than the removal is worth.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive gas flow or liquid rate, or an L/G ratio outside a plausible range returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the liquid-to-gas ratio convention and the venturi pressure-drop mechanism as standard air pollution control practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`scrubber liquid to gas ratio`, `l over g scrubber`, `venturi scrubber pressure drop`, `packed tower absorption`, `scrubber blowdown wastewater`.

## 2. The tile

### 2.1 `scrubber-lg-ratio` -- Wet Scrubber Liquid-to-Gas Ratio and Removal

```
L/G ratio          gallons of liquid per thousand actual cubic feet of gas
typical            packed tower 10 to 20 gpm per 1,000 acfm for gas absorption
                   venturi for particulate 5 to 20, rising steeply for fine particles
removal            rises with L/G, with diminishing returns
particulate        venturi removal depends mainly on pressure drop, and L/G supports it
gas absorption     depends on L/G, packing height, and the solubility and chemistry
blowdown           dissolved material accumulates; a purge is required
wastewater         the scrubber transfers the pollutant to water, which must be treated
```

The distinction between particulate and gas scrubbing matters because the controlling variable differs. In a
venturi removing particulate, the energy of the gas passing the throat atomizes the liquid and the removal
follows the pressure drop -- so a venturi is a pressure-drop machine and L/G supplies the liquid that pressure
drop needs to work on. In a packed tower absorbing a gas, removal follows the contact between the gas and a
continuously renewed liquid surface, so L/G and packing height are the controls and pressure drop is a cost
rather than a mechanism.

Fine particulate is where the energy cost becomes severe. Removal efficiency for submicron particles in a venturi
rises steeply with pressure drop, and pressure drop is fan power spent continuously -- so a scrubber achieving
high fine-particle removal is an expensive machine to run, and a fabric filter or an ESP is often the better
choice for that duty.

The wastewater is the half people forget. A wet scrubber does not destroy the pollutant, it transfers it to
water, and that water accumulates dissolved and suspended material until it is purged. The blowdown then needs
treatment and disposal, and it is a regulated stream -- so a scrubber converts an air permit problem into a water
permit problem, and the total cost includes both.

**Inputs:** the gas flow in actual cubic feet per minute, the liquid rate, the scrubber type, the target removal efficiency, the pressure drop, the pump head and efficiency, and the blowdown rate

**Outputs:** the liquid rate for the entered L/G, the L/G at an entered liquid rate, the pump power for the liquid circulation, the fan power for the entered pressure drop, the total operating power, and the blowdown flow at a stated cycles of concentration

## 3. Worked example

A packed tower on 15,000 acfm at an L/G of 10 gpm per 1,000 acfm:

```
liquid rate = 15,000 / 1,000 x 10 = 150 gpm
```

150 gpm circulating. At 40 ft of head and 65 percent pump efficiency:

```
pump bhp = 150 x 40 x 1.0 / (3,960 x 0.65) = 2.3 bhp
```

Raise the L/G to 20 to improve absorption:

```
liquid   = 300 gpm
pump bhp = 4.7 bhp
```

**Double the liquid, double the pumping, and a removal improvement with diminishing returns** -- which is where
the design settles rather than at a maximum.

**The venturi case is different.** There, removal follows PRESSURE DROP rather than L/G, and pressure drop is
fan power:

```
fan bhp at 20 in wc on 15,000 acfm = 15,000 x 20 / (6,356 x 0.65) = 73 bhp
```

73 horsepower of fan, continuously, to make fine particulate removal happen -- which is why
a fabric filter is usually the better answer for that duty.

**And the wastewater.** This scrubber does not destroy anything; it moves the pollutant into
150 gpm of circulating water, which concentrates until it is purged. That blowdown is a regulated discharge
needing treatment, so the scrubber has converted an air permit obligation into a water permit obligation -- and
the honest cost comparison includes both.

## 4. Scope and non-goals

A screening calculation. Scrubber performance depends on the pollutant, the mechanism (absorption, reaction, or
inertial impaction), the scrubber design, the liquid chemistry, and the temperature, and L/G is one variable
among several -- removal efficiency cannot be predicted from L/G alone and comes from the vendor's design and from
testing. It does not size a scrubber, select packing or a venturi throat, design the liquid chemistry and
reagent addition, or evaluate mist eliminator performance, which determines whether the scrubber's own liquid
carries over. It does not address the wastewater: blowdown characterization, treatment, and discharge permitting
are separate regulatory matters and are frequently the larger part of the cost. It does not address corrosion,
which governs materials selection in most scrubber service. The vendor's design and performance guarantee, the
applicable air and water permits, and the permitting authority govern.
