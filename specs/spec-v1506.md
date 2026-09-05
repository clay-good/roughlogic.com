# roughlogic.com Specification v1506 -- Ground Loop Flow, Antifreeze, and Pressure Drop (`calc-buildingperf.js`, Group C HVAC, building performance, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-buildingperf.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; building performance and envelope diagnostics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A ground loop that will not deliver its flow is the most common reason a geothermal heat pump underperforms, and the two culprits are antifreeze viscosity at low loop temperature and a pipe size chosen on water properties. The catalog sizes loop LENGTH; nothing sizes the flow, the freeze protection, or the pump that has to overcome them.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive load, flow, delta-T, pipe diameter, or fluid property, or an antifreeze concentration outside zero to one hundred percent returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the antifreeze-corrected flow relation, the turbulent-flow requirement, and the watts-per-ton pumping benchmark, with IGSHPA named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`ground loop flow`, `geothermal antifreeze concentration`, `loop pumping watts per ton`, `ground loop reynolds number`, `geothermal circulator sizing`.

## 2. The tile

### 2.1 `ground-loop-flow-antifreeze` -- Ground Loop Flow, Antifreeze, and Pressure Drop

```
design flow      gpm = 2.5 to 3.0 per ton (manufacturer specific)
antifreeze        percent by volume for a burst and freeze margin below minimum loop temperature
corrected flow    gpm = Q / (500 x SG x cp x dT)
Reynolds check    turbulent flow (Re > 2,500) is required for the rated heat transfer
pumping power     W/ton; above about 100 W/ton the loop is eating the efficiency
```

Two failure modes sit behind one calculation. The heat transfer one: a ground loop rated on turbulent flow
loses a large fraction of its capacity if the flow goes laminar, and cold antifreeze is viscous enough to do
exactly that in a loop sized on water. Checking Reynolds number at the MINIMUM expected loop temperature, not at
70 degF, is what catches it.

The energy one: circulating pumps run whenever the compressor does, so their power is a direct subtraction from
the system's efficiency. The industry benchmark is watts per ton of pumping, and a loop that needs more than
about 100 W/ton has given back a meaningful share of the heat pump's advantage before it starts. Antifreeze
concentration is the lever on both -- more concentration is more freeze margin, more viscosity, more pumping
power, and less heat transfer -- so the correct concentration is the LEAST that protects the loop, not the most.

**Inputs:** system capacity in tons, design flow per ton, antifreeze type and concentration with its specific heat, specific gravity and viscosity at the minimum loop temperature, pipe size and total loop length, and pump efficiency

**Outputs:** the design flow, the flow corrected for the antifreeze properties, the Reynolds number at the minimum loop temperature with a turbulent or laminar verdict, the loop pressure drop, the pump power in watts and watts per ton, and the freeze and burst protection temperatures for the entered concentration

## 3. Worked example

A 4 ton residential vertical loop at 3.0 gpm per ton, 20% propylene glycol (freeze protection to about
17 degF, burst to well below), minimum expected loop temperature 28 degF:

```
design flow = 4 x 3.0 = 12 gpm
```

At 12 gpm in 1 in HDPE the velocity is about 2.6 ft/s. Reynolds number at 28 degF with 20% propylene glycol
comes out near 3,900 -- turbulent, but not by a wide margin, and the same loop at 30% glycol drops toward 2,600
and sits on the laminar boundary where the loop's rated capacity no longer applies.

Pump power: at 45 ft of head and 35% wire-to-water efficiency,
`12 x 45 x 1.02 / (3,960 x 0.35)` = 0.40 bhp = 296 W, which is
74 W/ton -- above the 100 W/ton benchmark. The loop is spending too much on pumping,
and the fixes in order are larger header pipe, fewer fittings, the lowest workable glycol concentration, and only
then a different pump.

## 4. Scope and non-goals

Flow, freeze protection, turbulence, and pumping-power screening from properties and dimensions the user
supplies. It does not size the ground loop itself -- bore depth and length are `geothermal-loop`, and they depend
on ground thermal conductivity, undisturbed ground temperature, grout conductivity, and the building's annual
heating-to-cooling balance, none of which appear here. It does not model the loop's temperature swing over a
season or the long-term thermal drift that an unbalanced load produces, which is the failure that takes a decade
to appear. Antifreeze property data must come from the manufacturer at the actual temperature; methanol, ethanol,
propylene glycol and potassium acetate differ substantially and some are restricted by jurisdiction. It does not
address purging and air removal, which is the practical reason many loops never reach design flow. The heat pump
manufacturer's flow requirements, IGSHPA design standards, and the loop designer govern.
