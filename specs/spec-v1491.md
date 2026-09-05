# roughlogic.com Specification v1491 -- Secondary Coolant (Glycol) Loop Flow and Pump Penalty (`calc-refrigeration.js`, Group C HVAC, industrial refrigeration, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-refrigeration.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; industrial and commercial refrigeration), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Putting glycol between the refrigerant and the load cuts the ammonia charge dramatically, which is often the whole reason to do it. What it costs is pumping power and a temperature penalty, and both are larger than people expect because glycol's specific heat is lower than water's and its viscosity at low temperature is much higher.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive load, delta-T, specific heat, specific gravity, or pump efficiency returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the glycol-corrected flow relation and the secondary-loop temperature penalty as standard practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`glycol loop flow`, `secondary refrigerant pumping`, `glycol pump power`, `secondary loop temperature penalty`, `propylene glycol flow correction`.

## 2. The tile

### 2.1 `secondary-glycol-loop` -- Secondary Coolant (Glycol) Loop Flow and Pump Penalty

```
flow            gpm = Q / (500 x SG x cp x dT)      (500 is the water constant; SG x cp corrects for glycol)
pump power      bhp = gpm x head_ft x SG / (3,960 x eta)
temperature     the secondary loop adds an approach at the chiller AND at the coil
viscosity       propylene glycol at low temperature raises head substantially
```

The flow correction is the part that gets skipped. Water's `500` constant assumes water's density and specific
heat; a 40% propylene glycol solution has a specific heat around 0.85 and a specific gravity around 1.04, so the
product `SG x cp` is about 0.88 and the required flow for the same duty and delta-T is roughly 13% higher. More
flow at higher viscosity is more head, and pump power climbs faster than the flow does.

The temperature penalty compounds. A direct-expansion coil sees the refrigerant; a glycol coil sees glycol that
is itself warmer than the refrigerant by the chiller's approach, so the evaporator must run several degrees
colder for the same room condition, and every one of those degrees is compressor power. The design case for a
secondary loop is charge reduction and safety -- fewer pounds of ammonia, confined to a machine room -- and the
tile puts the operating cost of that decision in front of the designer rather than leaving it implicit.

**Inputs:** load, loop delta-T, glycol type and concentration with its specific heat and specific gravity, loop head, pump efficiency, and the chiller and coil approach temperatures

**Outputs:** the required flow with and without the glycol correction, the pump brake horsepower and annual energy, the total temperature penalty from chiller and coil approach, and the compressor power penalty that penalty implies

## 3. Worked example

A 100 ton load (1,200,000 BTU/h) on a 10 degF loop delta-T, using 40% propylene glycol (cp 0.85, SG 1.04):

```
water basis   gpm = 1,200,000 / (500 x 1.00 x 1.00 x 10) = 240 gpm
glycol basis  gpm = 1,200,000 / (500 x 1.04 x 0.85 x 10) = 271 gpm   (+13%)
pump bhp at 70 ft head, 70% efficiency
              = 271 x 70 x 1.04 / (3,960 x 0.70)         = 7.1 bhp
```

Thirteen percent more flow for the same tons, and 7.1 bhp of pumping that a direct-expansion system would not
have. Add the temperature penalty: a 6 degF chiller approach plus a 4 degF coil penalty means the compressor
runs 10 degF colder suction than a DX system serving the same room, worth roughly 20 to 25% more compressor
power.

That is the honest price of the charge reduction, and it is worth paying when the alternative is thousands of
pounds of ammonia in an occupied space -- but it should be paid knowingly.

## 4. Scope and non-goals

Flow, pump power, and a temperature-penalty screen for a secondary loop. It does not select the glycol
concentration, which is set by the required freeze and burst protection at the coldest loop temperature and
which drives every property here; it does not compute the pressure drop or head, which must be entered and which
rises sharply at low temperature as viscosity climbs, and a head figured on water properties will be
substantially low. It does not address inhibitor depletion and the corrosion that follows, glycol degradation
into acids at high film temperatures, expansion tank sizing, or the fact that propylene and ethylene glycol have
different properties and different suitability for food contact areas. The compressor power sensitivity is a
rule of thumb. The glycol manufacturer's property data, the chiller and coil manufacturers' selections, and the
system designer govern.
