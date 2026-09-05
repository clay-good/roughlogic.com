# roughlogic.com Specification v1499 -- Combustion Appliance Zone Depressurization Limit (`calc-buildingperf.js`, Group C HVAC, building performance, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-buildingperf.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; building performance and envelope diagnostics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Air sealing a house tightens it around whatever combustion appliances are in it, and if the exhaust fans can then pull the appliance zone negative enough, a water heater or furnace backdrafts and puts combustion products into the house. The limit is a few pascals, and testing against it is not optional after any air-sealing work.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a positive measured pressure where a depressurization is expected, or a missing appliance-type limit returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the worst-case CAZ depressurization limits by appliance draft category, with BPI named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`combustion appliance zone depressurization`, `caz test limit`, `backdraft test pressure`, `worst case depressurization`, `spillage test water heater`.

## 2. The tile

### 2.1 `caz-depressurization-limit` -- Combustion Appliance Zone Depressurization Limit

```
measured        dP_CAZ = worst-case zone pressure with respect to outside, negative
worst case      all exhaust appliances on, interior doors positioned to maximize depressurization,
                air handler on and off, both tested
typical limits  -2 Pa natural draft water heater
                -3 Pa natural draft furnace or boiler
                -5 Pa induced draft
                -15 Pa direct vent or power vent
verdict         |dP_CAZ| must not exceed the limit for the weakest appliance present
```

The physics is that an atmospherically vented appliance draws its combustion air from the room and relies on a
weak buoyant draft to push flue gases up the chimney. That draft is worth only a few pascals. Any exhaust that
pulls the room more negative than the draft can overcome reverses the flow, and the flue becomes an inlet -- which
puts carbon monoxide into the house while the appliance keeps running and the occupants have no way to know.

Worst-case testing is a procedure, not a reading. Every exhaust fan runs, the dryer runs, the air handler is
tested both on and off (a leaky return in a closed room can depressurize it badly on its own), and interior doors
are cycled to find the configuration that produces the most negative pressure. The number that matters is the
worst one found, and it must be compared against the WEAKEST appliance in the zone. Where the house fails, the
answers are ordered: fix the depressurization source, provide makeup air, or replace the appliance with a sealed
combustion unit -- never simply leave a hole in the envelope and call it done.

**Inputs:** the worst-case CAZ pressure with respect to outside, the appliance types in the zone with their draft categories, the exhaust fan flows, and the air handler condition during the test

**Outputs:** the worst-case depressurization, the governing appliance limit, the margin, a pass or fail, the exhaust flow that would have to be removed or made up to pass, and the makeup air opening implied

## 3. Worked example

A basement CAZ with a natural draft gas water heater and an induced draft furnace. Worst case found with the
dryer and both bath fans running and the air handler on: **minus 4.5 Pa**.

```
water heater limit (natural draft) = -2 Pa    -> FAIL by 2.5 Pa
furnace limit (induced draft)      = -5 Pa    -> pass by 0.5 Pa
governing = the weakest appliance  = -2 Pa    -> the zone FAILS
```

The furnace is fine and the water heater is not, and the zone is judged by the water heater. This house cannot be
air sealed further until that is resolved, and arguably should not have been sealed as far as it has.

The ordered fixes: reduce exhaust (the 200 cfm dryer is most of it, and a condensing dryer removes the problem),
provide dedicated makeup air, or replace the water heater with a power-vented or sealed-combustion unit -- which
raises the limit to -15 Pa and ends the issue permanently. Spillage and CO testing must accompany all of it.

## 4. Scope and non-goals

A comparison of a measured worst-case pressure against limit values the user supplies for the appliances
present. It is not the combustion safety test. The full protocol also requires spillage testing at the draft
diverter, draft measurement, ambient and flue carbon monoxide measurement, gas leak testing, and a visual
inspection of the venting system, and an appliance can pass the pressure limit and still be unsafe for reasons
none of which appear here. The limit values differ between BPI, weatherization program standards, and
manufacturers, and the adopted protocol governs. A house that fails must not be left in that condition: this is a
carbon monoxide hazard, and continuing to occupy a failing zone is not an acceptable outcome of a test. A
certified combustion-safety technician, the adopted BPI or WAP protocol, and the appliance manufacturer's venting
instructions govern.
