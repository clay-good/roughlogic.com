# roughlogic.com Specification v1803 -- CRAC and CRAH Sensible Capacity at Return Temperature (`calc-datacenter.js`, Group C HVAC, data centre and mission-critical facilities, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-datacenter.js`**
> (Group C HVAC, hub `/groups/hvac/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A computer room air handler's capacity is its airflow times the temperature difference it is given, so the unit's nameplate is a statement about the return air it was rated on. Containment raises that return temperature and adds capacity for free; bypass air lowers it and takes capacity away.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive airflow, or a return air temperature at or below the supply air temperature returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the sensible heat relation and the rating-condition convention for computer room cooling units with the manufacturer's performance data and ASHRAE TC 9.9 named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`crac sensible capacity`, `crah return temperature derate`, `computer room air handler capacity`, `containment return air temperature`, `sensible cooling kw per cfm`.

## 2. The tile

### 2.1 `crac-sensible-derate` -- CRAC and CRAH Sensible Capacity at Return Temperature

```
sensible capacity Q = 1.08 x cfm x (T_return - T_supply)
all sensible      a data centre cooling unit does essentially no latent work; the
                  room has no moisture load to speak of, and a unit doing latent
                  work is dehumidifying air another unit is humidifying
the nameplate     a rated capacity is quoted at a stated return and supply
                  condition; it is not a property of the machine alone
return temperature is the variable the room controls, and it is set by how well hot
                  and cold air are kept apart
containment       raises the return temperature toward the server exhaust
                  temperature, which increases capacity at constant airflow
bypass            cold supply air returning without passing through a server
                  dilutes the return and REDUCES capacity
                  (`containment-bypass-airflow`)
supply temperature raising it reduces capacity at constant return, and it is what
                  the chiller wants raised
```

A cooling unit does not have a capacity; it has an airflow and a coil, and the capacity emerges from the
temperature difference the room presents to it. That is why two identical units in two halls deliver very
different loads, and why a nameplate figure has to be read with its rating condition attached. The number
matters in procurement and it is the room, not the machine, that determines what is achieved.

Containment's economics run through this relation and they are better than the usual argument suggests.
Separating hot and cold air raises the return temperature toward the actual server exhaust, which increases
the temperature difference across the coil and therefore the unit's capacity -- at the same fan power, the same
airflow, and no capital beyond the containment itself. A hall that contains its aisles frequently discovers it
has more cooling capacity than it thought and can decommission a unit.

Bypass air works the relation in reverse and it is the most common condition in an uncontained hall. Supply
air that returns to the unit without passing through a server arrives cold, dilutes the return, and drags the
temperature difference down. The units run continuously, the room is adequately cooled, and a substantial
fraction of the installed capacity is doing nothing but circulating its own supply air.

**Inputs:** the unit airflow, the supply air temperature, the return air temperature, and optionally a contained and a bypassed return condition for comparison

**Outputs:** the sensible capacity at the entered return temperature in Btu per hour, tons, and kilowatts, the capacity at a contained return temperature, the capacity at a bypassed return temperature, and the percentage change from each against the rating condition

## 3. Worked example

A unit moving 12,000 cfm with 55 degF supply air, rated at a 75 degF return:

```
Q = 1.08 x 12,000 x (75 - 55) = 259,200 Btu/h
  = 21.6 tons = 76 kW
```

**Now contain the aisles and let the return rise to the server exhaust temperature:**

```
Q = 1.08 x 12,000 x (85 - 55) = 388,800 Btu/h = 114 kW
```

**50 percent more capacity from the same unit, the same fan, and the same airflow.** Nothing about the
machine changed; the room stopped mixing its air. **On a hall with eight of these units that is
304 kW of cooling capacity discovered**, which is frequently enough to turn a unit off and take its fan
power off the bill as well.

**Bypass runs the same relation backwards:**

```
Q = 1.08 x 12,000 x (68 - 55) = 168,480 Btu/h = 49 kW
```

**35 percent BELOW the rating**, from a return temperature of 68 degF -- which is an entirely ordinary
reading in an uncontained hall with more supply air than the racks draw. **The unit is running flat out and
delivering 65 percent of its rated capacity**, and the missing capacity is not a fault to be found. It is
supply air going straight back to the return.

**The whole spread is 85 percent of nameplate**, from 68 degF return to 85 degF, with the machine untouched.
**Return temperature is the cheapest capacity in a data hall**, and it is bought with sheet metal and blanking
panels rather than with equipment.

## 4. Scope and non-goals

A sensible capacity relation. It assumes essentially all-sensible operation, which holds for a data hall and not for a unit doing latent work -- a unit dehumidifying, or fighting a humidifier elsewhere in the room, has a lower sensible capacity than this gives and the condition is a control fault worth finding. It does not account for the coil's own limits: capacity also depends on the chilled water temperature and flow or the refrigerant circuit's behaviour, and a coil given a very high return temperature will eventually be limited by the water side rather than by the air side, so the improvement from containment is bounded by the chilled water system. It does not address fan power, which is where much of the operating saving from containment actually appears, or the fan laws that govern it. It does not size the plant, evaluate redundancy, address the humidity control that a data hall needs (`server-inlet-envelope`), or design containment. Rated capacities are established by test at stated conditions and the manufacturer's performance data at the actual condition governs. ASHRAE TC 9.9 guidelines, the unit manufacturer's performance data, and the mechanical designer govern.
