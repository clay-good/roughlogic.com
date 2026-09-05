# roughlogic.com Specification v1479 -- Gear Reducer Service Factor and Required Rating (`calc-millwright.js`, Group G Cross-Trade Utilities, millwrighting, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-millwright.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; millwright, rotating equipment, and pneumatics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A 25 hp motor does not need a 25 hp gearbox. It needs a gearbox whose catalog rating covers 25 hp multiplied by a service factor that accounts for what drives it, what it drives, and how many hours a day. Choosing on motor nameplate alone is the standard way a reducer fails in eighteen months.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive transmitted power, a service factor below one, or a non-positive catalog rating returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the service-factor selection method with AGMA named as the source of the factor tables, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`gear reducer service factor`, `gearbox sizing service factor`, `agma service factor`, `required gearbox rating`, `reducer thermal rating`.

## 2. The tile

### 2.1 `gear-reducer-service-factor` -- Gear Reducer Service Factor and Required Rating

```
required rating   P_req = P_transmitted x SF
service factor    SF from driver character x driven-machine shock x hours per day
thermal rating    checked separately; may govern below the mechanical rating
actual margin     M = P_catalog / P_req
```

The service factor is an empirical multiplier that converts an average transmitted power into the peak the
gear teeth and bearings actually see. Its three inputs are the character of the prime mover (an electric motor
is smooth, a single-cylinder engine is not), the shock character of the driven machine (a centrifugal pump is
uniform, a jaw crusher is heavy shock), and duty hours, because a reducer running continuously has no time to
shed heat or recover. Factors near 1.0 apply to a uniform load on short duty and climb past 2.0 for heavy shock
running around the clock.

The trap is the thermal rating. A gearbox has two independent ratings -- mechanical, set by the teeth and
bearings, and thermal, set by how much heat the case can shed at ambient -- and on continuously running units the
thermal rating is frequently the lower of the two. A reducer sized correctly on mechanical rating and run all day
in a hot room will cook its oil, and no service factor catches that.

**Inputs:** transmitted power, driver type, driven machine shock classification, hours per day, the catalog mechanical rating, and optionally the catalog thermal rating and ambient temperature

**Outputs:** the service factor, the required rating, the margin against the catalog mechanical rating, a pass or fail, the governing rating where a thermal rating is entered, and the maximum transmitted power the selected unit supports

## 3. Worked example

A 25 hp electric motor driving a reciprocating compressor 24 hours a day. Electric motor driver (uniform),
heavy shock driven machine, continuous duty: service factor 2.00.

```
P_req = 25 x 2.00 = 50 hp required catalog rating
```

A reducer with a 60 hp mechanical rating gives a margin of 60/50 = 1.20 and passes. But if that same unit
carries a 42 hp THERMAL rating at 104 degF ambient, the thermal rating governs, the drive is short by 8 hp, and
the fix is a cooling fan, an oil cooler, or a larger case -- not a bigger gearset. Choosing on the 25 hp motor
nameplate would have selected a 30 hp box, 40% under the mechanical requirement and 65% under it thermally.

## 4. Scope and non-goals

A service-factor lookup and a margin check against ratings the user reads from a catalog. It does not ship
AGMA service factor tables, which are published documents and vary between the gear-type standards; the
manufacturer's own factor table for their product supersedes any generic one. It does not size the gearset,
select a ratio, check the overhung load on the input or output shaft (a frequent independent governing case on
belt- or chain-coupled reducers), size the coupling, or evaluate starting torque, which on a high-inertia load
can exceed the running requirement by a wide margin and is checked separately. Thermal rating derates with
ambient and altitude in ways this tile does not model. The gear manufacturer's catalog ratings and selection
procedure govern.
