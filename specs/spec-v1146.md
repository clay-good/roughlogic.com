# roughlogic.com Specification v1146 -- Water Service Pressure and the Closed System (calc-plumbing.js, Group B, 1 New Tile)

> **Status: LANDED (2026-07-28). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-plumbing.js`** (Group B), no new module, group, or dependency. Inherits spec.md through
> spec-v1145.md.
>
> **The gap.** A dupe scan for "pressure-reducing" returned zero hits. `wh-expansion-tank` sizes the tank
> but never says when one is required, and nothing connected the pressure rule to the expansion rule.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: a non-positive
static pressure or a negative fixture minimum or setpoint return `{ error }`. Hand-written renderer.
`check-module-sizes` cap for calc-plumbing.js raised 84000 -> 92000 (the module had reached 98.7%); citations.js raised 610000 -> 640000 (the campaign's 63rd entry took it to 100.1%).

## 2. The tile

### 2.1 `water-service-pressure-check` -- Static Pressure, PRV, and Thermal Expansion

```
inputs:  static_pressure_psi, prv_setpoint_psi, min_fixture_pressure_psi,
         has_check_or_backflow, has_storage_water_heater, expansion_control_present
compute: 604.8  PRV required where static > 80 psi;  setpoint must also be <= 80
         delivered = setpoint where a PRV is required, else the static pressure
         headroom  = delivered - the fixture minimum        (STATIC, not flowing)
         607.3  closed <- a PRV is required OR a check valve/backflow preventer exists
                expansion control required where closed AND a storage heater is served
outputs: prv_required, over_by_psi, setpoint_entered, setpoint_ok, delivered_psi,
         headroom_psi, fixture_ok, closed_system, expansion_required, expansion_ok,
         passes, note
```

**A chain people walk into one step at a time.** High static pressure is a defect, not a comfort
complaint -- it splits supply lines, chews through fill valves, and bangs the house every time a solenoid
closes -- so 604.8 caps it at 80 psi. Fitting the PRV that fixes it **closes the system**, and 607.3 then
requires thermal expansion control on a storage water heater's cold supply. The classic field sequence is
someone fixing banging pipes with a PRV and, weeks later, wondering why the water heater started dripping.
The first fixture is exactly that installation: pressure solved, 607.3 failed.

**The subtler path is worth as much.** The second fixture is a house at **65 psi** -- no 604.8 trigger at
all -- that still fails, because a backflow preventer closed the system just as a PRV would. Adding one
for irrigation quietly triggers 607.3 on an existing house.

**Static is not flowing.** The tile reports headroom over the fixture minimum and says plainly that
friction, elevation, and the meter all come off it under flow, so headroom on paper is not headroom at
the shower head.

## 3. Scope

Not checked: expansion tank size or precharge (the `wh-expansion-tank` tile), per-fixture flow pressure
and rate, pipe sizing and the losses between static and flowing pressure, seasonal and daily variation in
service pressure, PRV maintenance and the fact that they tend to fail high, and the heater's own relief
valve and discharge piping.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `wh-expansion-tank`,
`water-hammer-arrestor`, and `pipe-sizing`. Fuzzer pins both fixtures, the exact 80 psi seam and the
overage across four pressures, all three closure paths including a check valve alone on a low-pressure
service, that no storage heater leaves 607.3 untriggered, that a setpoint only reduces the delivered
pressure where a PRV is actually required, exact and negative-capable headroom, that a setpoint above the
cap is itself a failure, and every error seam.
