# roughlogic.com Specification v1419 -- Low-Ambient Head Pressure Control and Flooded-Condenser Charge (calc-refrigerant.js, Group C, HVAC and refrigeration service, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-refrigerant.js`**
> (Group C, HVAC and refrigeration service), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** A refrigeration system that runs in winter loses head pressure, the pressure drop across the expansion valve collapses, and the coil starves -- the failure the TXV capacity tile predicts. The two standard fixes are fan cycling and a flooded condenser with a receiver, and the flooded-condenser fix requires extra charge that has to be computed, not guessed. Neither is in the catalog.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive evaporator pressure, required valve pressure drop, condenser volume, or liquid density, or a flooded fraction outside 0-1 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the minimum-head-pressure requirement set by the expansion device's rated pressure drop, and the flooded-condenser (head-pressure-control valve) charge practice, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `head-pressure-control` -- Low-Ambient Head Pressure Control and Flooded-Condenser Charge

```
minimum head pressure = evaporator pressure + required valve dP + distributor and line losses
minimum condensing temp = saturation temperature at that pressure
flooding charge       = condenser internal volume x flooded fraction x liquid density
total winter charge   = summer charge + flooding charge + receiver working charge
```

The expansion valve does not care about head pressure as such -- it cares about the pressure difference across
itself, because that is what drives flow through the orifice. As ambient falls, condensing pressure falls with it,
the difference across the valve shrinks, and at some point the valve can no longer feed the coil. The minimum head
pressure is therefore built up from the bottom: whatever the evaporator is at, plus the drop the valve needs at
full load, plus everything lost in the distributor and the liquid line.

Fan cycling is the cheap fix and it is coarse -- head pressure swings between fan stages, and on a multi-fan
condenser in a cold, windy location it may not hold at all. Flooding the condenser is the fix that works: a
head-pressure-control valve backs liquid up into the condenser, reducing its effective surface until it can only
reject heat at an acceptable pressure. That backed-up liquid is real refrigerant, and it has to be in the system
-- which means a receiver sized to hold it in summer, and a winter charge substantially above the summer one.
Systems that were converted to flooded-condenser control without adding charge starve in exactly the weather they
were supposed to fix.

**Inputs:** evaporator saturation pressure, required expansion-valve pressure drop, distributor and liquid-line
losses, condenser internal volume, flooded fraction at design low ambient, liquid refrigerant density, receiver
capacity, summer charge.

**Outputs:** minimum required head pressure and its saturated condensing temperature, flooding charge in pounds,
total winter charge, and whether the receiver can hold the flooding charge in summer.

## 3. Worked example

A system whose evaporator sits at 20 psig, with a valve needing 100 psi of drop and 15 psi lost in the distributor
and liquid line; condenser internal volume 0.35 cubic ft, 80% flooded at design low ambient, liquid density
70 lb/cubic ft:

```
minimum head   = 20 + 100 + 15        = 135 psig
flooding charge= 0.35 x 0.80 x 70     = 19.6 lb
```

Nearly twenty pounds of extra refrigerant -- which in summer, when the condenser drains, all has to live in the
receiver. A receiver with less than about 20 lb of working capacity above its normal level cannot support this
control scheme, and the system will either flood the compressor in summer or starve in winter, depending on where
the charge was set. Note also what the minimum head figure means for equipment selection: at 135 psig this system
cannot be allowed to condense below the saturation temperature corresponding to that pressure, no matter how cold
the day is, which is what the head-pressure-control valve enforces.

## 4. Scope and non-goals

A sizing screen. Saturation temperatures must be read from the pressure-temperature relationship for the specific
refrigerant, which this tile does not tabulate. The required valve pressure drop is the valve manufacturer's
figure at full load and is not a constant. Condenser internal volume comes from the manufacturer and is rarely on
a nameplate. The tile does not select or set a head-pressure-control valve, size a receiver against the full range
of operating conditions, address fan cycling stages, variable-speed condenser fans, or the ambient-subcooling and
flash-gas questions that come with a long liquid line in cold weather. Overcharging a system on a warm day to fix
a winter problem is how compressors get flooded. The equipment manufacturer, the valve manufacturer, and the
refrigeration contractor govern.
