# roughlogic.com Specification v1570 -- Fuel Oil Heating for Atomizing Viscosity (`calc-steamplant.js`, Group C HVAC, steam plant, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-steamplant.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; steam plant and commercial laundry), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Heavy fuel oil will not atomize unless it is thin enough, and thin enough is a viscosity number rather than a temperature. The temperature that gets it there depends on the oil's grade, so a fixed heater setpoint that works on one delivery smokes on the next.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive temperature, viscosity, or target viscosity, or two fit points at the same temperature returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the log-log viscosity-temperature relation and typical atomizing viscosity ranges as standard practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`fuel oil atomizing temperature`, `heavy oil viscosity temperature`, `number 6 oil heater setpoint`, `ssu viscosity for burner`, `oil preheat temperature`.

## 2. The tile

### 2.1 `fuel-oil-atomizing-viscosity` -- Fuel Oil Heating for Atomizing Viscosity

```
target viscosity   for atomizing, commonly 100 to 150 SSU (about 20 to 32 cSt)
                   pressure atomizing burners want the tighter end; steam atomizing tolerates more
viscosity-temp     log-log linear: log(log(v + 0.7)) falls linearly with log(T absolute)
two-point fit      from two known viscosity-temperature pairs on the oil's data sheet
pumping viscosity  a separate and much looser limit, around 4,000 SSU
storage            heated storage keeps the oil pumpable; the heater brings it to atomizing
```

Viscosity falls very steeply with temperature and the relationship is log-log linear, which means a fixed
temperature rise buys much more thinning at the cold end than at the hot end. Two points off the oil's data sheet
define the line, and from there the temperature for any target viscosity is a straightforward interpolation --
which is what lets a plant set the heater correctly for the grade actually delivered rather than for the grade
the setpoint was chosen for.

The symptom of getting it wrong is visible from the stack. Oil too viscous atomizes into large droplets that do
not burn completely, and the result is smoke, soot, unburned carbon, fouled tubes, and in the worst case an
uncontrolled fire in the furnace. Oil too hot can vaporize in the line and cause the burner to lose its fuel
supply, so the target is a band rather than a floor.

Storage and pumping have their own much looser viscosity requirement, satisfied by suction heaters and heated
tanks; the atomizing temperature is reached at the burner by a separate final heater, and confusing the two
limits is how an oil system is designed to pump oil it cannot burn.

**Inputs:** two viscosity and temperature points from the oil data sheet, the target atomizing viscosity for the burner type, and the storage and pumping viscosity limits

**Outputs:** the fitted viscosity-temperature relation, the temperature required for the target atomizing viscosity, the viscosity at any stated temperature, the temperature required for the pumping limit, and the difference between the atomizing and pumping setpoints

## 3. Worked example

A No. 6 oil whose data sheet gives 7,000 SSU at 100 degF and 340 SSU at 180 degF, with a burner wanting 150
SSU:

```
fit the log-log line through the two points
required temperature for 150 SSU  ~ 205 degF
required temperature for pumping at 4,000 SSU ~ 112 degF
```

**205 degF at the burner, 112 degF in the tank** -- two different setpoints for two different jobs, and a system
that heats the tank to 112 and sends the oil straight to the burner will smoke.

Now a different delivery, a lighter No. 6 that runs 4,000 SSU at 100 degF. The same 150 SSU target is reached
around 185 degF -- twenty degrees lower. A heater left at 205 degF on this oil is running hotter than needed,
which risks vapour lock in the line, and a heater left at 185 on the first oil leaves it at roughly 260 SSU,
which is well outside the atomizing band and will show at the stack.

That is the case for computing the setpoint per delivery rather than setting it once.

## 4. Scope and non-goals

A viscosity-temperature interpolation from two data points the user supplies. It requires the actual oil's
data; grade designations cover a wide range and a table value for "No. 6" can be far from a specific delivery,
which is the whole reason to run this per delivery. It does not select a burner, size the heater or the piping,
or evaluate the atomizing steam or air requirement, and it does not address the flash point, which limits how hot
oil may safely be heated and which the fire code and the oil's own data sheet govern. It does not address water
and sediment in the oil, which cause more burner trouble than viscosity does, or sulphur, ash, and the emissions
consequences of the fuel. It does not evaluate combustion, excess air, or stack condition. The burner
manufacturer's atomizing viscosity requirement, the oil supplier's data sheet, the adopted fire and mechanical
codes, and the jurisdiction's boiler inspector govern.
