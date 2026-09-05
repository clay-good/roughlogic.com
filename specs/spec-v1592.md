# roughlogic.com Specification v1592 -- Propane Tank Filling Outage and Fixed Liquid Level (`calc-gas.js`, Group B Plumbing and Gas, propane, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-gas.js`**
> (Group B, Plumbing and Gas -- the existing category, hub `/groups/plumbing/`; propane and lp-gas service), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Propane tanks are never filled full, because liquid expands and a liquid-full tank has nowhere for that expansion to go. The outage is a fixed percentage and the fixed liquid level gauge is what enforces it, and the arithmetic explains why a customer's 500 gallon tank never shows more than 400.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive water capacity, a fill fraction outside zero to one, or a temperature outside the correction range returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): NFPA 58 filling limits and the fixed liquid level gauge procedure by name, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`propane tank filling outage`, `80 percent fill rule`, `fixed liquid level gauge`, `propane tank usable gallons`, `why is my tank only 80 percent`.

## 2. The tile

### 2.1 `propane-fill-outage` -- Propane Tank Filling Outage and Fixed Liquid Level

```
maximum filling  80% by volume for an aboveground tank in most service
                 (higher for underground tanks, which see less temperature swing)
outage           the vapour space left above the liquid, 20% for an 80% fill
fixed liquid     a dip tube cut to the maximum fill level; liquid spits from the bleeder
level gauge      valve when the level reaches it, and that is the fill signal
temperature      the filling limit is temperature-corrected; a warm tank fills to less
usable gas       further reduced by the pressure needed to run appliances
```

The 80% rule is about thermal expansion, not about safety margin in the abstract. Liquid propane expands
roughly 1.5% per 10 degF, so a tank filled solid on a cold morning and warmed by the sun becomes hydraulically
full and then lifts its relief valve -- which is the relief valve working correctly and is still a large release
of flammable gas. The outage is the space that expansion needs.

The fixed liquid level gauge is the physical enforcement of it and it is why filling is a two-person-attention
job rather than a meter-watching one: the bleeder valve is cracked open during filling and sprays white when
liquid reaches the dip tube, and that spray is the stop signal regardless of what the gauge or the meter says.

The customer-facing consequence is worth stating plainly because it generates complaints: a 500 gallon tank
delivers 400 gallons at most, and a "full" tank reads 80% on the float gauge. Neither is a shortfall. The usable
figure is lower still, because the last of the liquid cannot maintain vapour pressure against the appliance load
(`propane-vaporization-rate`).

**Inputs:** tank water capacity, the applicable maximum filling fraction, the liquid temperature, whether the tank is above or below ground, and the current gauge reading

**Outputs:** the maximum fill in gallons, the outage volume, the gallons deliverable from the current gauge reading to full, the energy content of a full tank, and the run time at a stated load

## 3. Worked example

A 500 gallon water capacity aboveground tank at an 80% filling limit:

```
maximum fill = 500 x 0.8 = 400 gallons
outage       = 500 - 400 = 100 gallons of vapour space
```

**400 gallons is a full tank.** A customer reading 80% on the float gauge has a completely full tank, and
the 100 gallons they think they are missing is the space thermal expansion requires.

A delivery to a tank reading 25%:

```
current  = 500 x 0.25 = 125 gallons
delivered = 400 - 125 = 275 gallons
```

Energy: propane carries about 91,500 BTU per gallon, so a full tank holds
`400 x 91,500` = 36.6 MMBTU. Against a 150,000 BTU/h furnace running 8 hours a day that is

```
36.6 MMBTU / (150,000 x 8 / 1e6 per day) = 30 days
```

roughly 30 days of heating -- and the last of that is the part the tank may not be able to
vaporize in a cold snap, which is why deliveries are scheduled well above empty.

## 4. Scope and non-goals

A volume and energy calculation using a filling limit the user supplies. The maximum filling limit is set by
NFPA 58 and depends on tank type, service, and location, and it is temperature-corrected -- filling by volume
alone without the correction, or filling by weight without accounting for the propane's actual density, can
overfill a tank. Filling is a licensed activity performed to a defined procedure, and the fixed liquid level
gauge, not a calculation, is what establishes the stop point. It does not address transfer procedures, bonding,
purging a new tank of air (an unpurged tank is a hazard), leak testing, or the odorant fade that can make a leak
undetectable. It does not size the tank for vaporization (`propane-vaporization-rate`) or set placement distances
(`lp-container-separation`). NFPA 58, the adopted fuel gas code, the tank manufacturer, the gas supplier's
procedures, and the AHJ govern.
