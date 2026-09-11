# roughlogic.com Specification v1804 -- Hot-Aisle Containment Bypass and Recirculation (`calc-datacenter.js`, Group C HVAC, data centre and mission-critical facilities, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-datacenter.js`**
> (Group C HVAC, hub `/groups/hvac/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** Supply air that returns to the cooling units without passing through a server is bypass, and it depresses the return temperature by an amount the airflow ratio fixes exactly. The heat removed does not change; what changes is the fan energy spent and the failure margin left.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive IT load, temperature rise, unit airflow, or unit count, an exhaust temperature at or below the supply temperature, or a negative fan power returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the airflow mixing balance and the fan affinity laws with ASHRAE TC 9.9 guidelines and a rack-level inlet temperature survey named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`containment bypass airflow`, `data center recirculation return temperature`, `supply to it airflow ratio`, `crah oversupply fan energy`, `cooling redundancy airflow margin`.

## 2. The tile

### 2.1 `containment-bypass-airflow` -- Hot-Aisle Containment Bypass and Recirculation

```
IT airflow       what the servers draw: kW x 3,412 / (1.08 x dT)
                 (`rack-power-density-airflow`)
supply airflow   the sum of what the running cooling units deliver
bypass           supply - IT demand, when supply exceeds it
return temp      T_return = (IT cfm x T_exhaust + bypass cfm x T_supply) / supply
the identity     the heat removed is 1.08 x IT cfm x (T_exhaust - T_supply) NO
                 MATTER how much bypass there is; a plant cannot remove more heat
                 than the servers produced
what bypass costs fan energy and margin, not cooling. Fan power goes as the CUBE of
                 airflow, so oversupply is expensive out of proportion
recirculation    the opposite fault: supply BELOW demand, where servers make up the
                 difference from the hot aisle and inlet temperatures rise
the margin       with a unit failed, is the remaining supply still above the IT
                 demand?
```

Bypass does not reduce cooling and that is the fact most discussions of it get wrong. The plant removes exactly
the heat the servers produced, because that is all the heat there is; the return temperature falls, the
apparent capacity of each unit falls with it, and the room is cooled perfectly adequately the whole time. This
is why bypass is so persistent -- nothing looks wrong, no alarm sounds, and the room is at temperature.

What it costs is fan energy, and the cube law makes that cost far larger than the airflow ratio suggests.
Moving twenty percent more air than the servers need does not cost twenty percent more fan power; it costs
something closer to three quarters again. On a hall with variable speed units, matching supply airflow to IT
demand is the single largest operating saving available, and it is a control setting rather than a project.

The second cost is margin, and margin is the reason the units are there. A hall running all its units at full
airflow to feed a load that needs less has spent its redundancy on bypass: when a unit fails, the remaining
supply has to still exceed the servers' demand, and a site that cannot say what that demand is cannot say
whether it has the margin it paid for.

**Inputs:** the IT load and the temperature rise across the equipment, the number and airflow of the running cooling units, the supply and server exhaust temperatures, the fan power per unit, and the energy tariff

**Outputs:** the IT airflow demand, the supply airflow, the bypass volume and fraction, the resulting return temperature, the heat actually removed, the fan power at matched airflow and the saving, and the supply remaining with one and two units failed against the demand

## 3. Worked example

A 500 kW hall with a 20 degF rise, cooled by 8 units at 12,000 cfm each:

```
IT airflow demand = 500 x 3,412 / (1.08 x 20) = 78,981 cfm
supply            = 8 x 12,000 = 96,000 cfm
bypass            = 17,019 cfm = 17.7% of supply
```

With 65 degF supply and 85 degF server exhaust:

```
T_return = (78,981 x 85 + 17,019 x 65) / 96,000 = 81.5 degF
```

**81.5 degF instead of 85 degF -- the bypass cost 3.5 degF of return temperature**, and with it
18 percent of every unit's apparent capacity (`crac-sensible-derate`).

**And yet the room is fine.** Check the heat actually removed:

```
1.08 x 96,000 x (81.5 - 65) = 1,706,000 Btu/h = 500 kW
```

**Exactly the IT load.** The plant removes the heat the servers made and no more, because there is no more.
**Bypass is invisible on a temperature reading**, which is why it survives for years.

**The bill is in the fans, and the cube law is unkind:**

```
airflow ratio = 78,981 / 96,000 = 0.823
fan power     = 0.823^3 = 0.557 of present
saving        = 60 kW x (1 - 0.557) = 26.6 kW = $23,290 per year
```

**18% too much air costs 44 percent of the fan energy** -- $23,290 a year on this hall, available from a
fan speed setpoint on units that already have the drives.

**The other cost is the margin the units were bought for:**

```
one unit failed:  84,000 cfm against 78,981 demand -- +6%
two units failed: 72,000 cfm against 78,981 demand -- -9%
```

**One failure is survivable with 6 percent to spare; two is a 6,981 cfm shortfall**, and a shortfall
does not cool the room slightly less -- **it recirculates, and inlet temperatures at the worst racks rise
immediately.** Knowing the IT demand is what turns that from a surprise into a number.

## 4. Scope and non-goals

A mixing and airflow balance. It treats the hall as a single mixing volume with one supply and one exhaust temperature, which no real hall is: bypass and recirculation coexist in different parts of the same room, and the average return temperature this produces can look acceptable while individual racks are starved. Computational fluid dynamics or a rack-level inlet temperature survey is what locates the problem; this gives the whole-room balance only. The server exhaust temperature and the temperature rise are entered and are set by the equipment's own fan behaviour, which changes with inlet temperature and load. The cube-law fan saving assumes variable speed units whose airflow can actually be reduced and whose coils and controls tolerate it; a constant-volume unit cannot realise it, and reducing airflow raises the supply-to-return difference in ways the coil must be checked against. It does not design containment, blanking, or the floor layout, evaluate the underfloor pressure distribution (`raised-floor-tile-airflow`), or address what happens during a cooling failure at high rack density, which is a matter of seconds. ASHRAE TC 9.9 guidelines, a rack-level inlet temperature survey, and the mechanical designer govern.
