# roughlogic.com Specification v1417 -- Compressor Volumetric Efficiency and Capacity Derate (calc-hvacservice.js, Group C, HVAC and refrigeration service, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacservice.js`**
> (Group C, HVAC and refrigeration service), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog computes compression ratio and theoretical displacement but stops before the consequence: as the compression ratio rises, volumetric efficiency falls, and the compressor pumps less refrigerant from the same displacement. That is why a dirty condenser costs capacity, why low-ambient operation helps, and why a freezer machine is so much larger than a cooler machine for the same box load.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive compression ratio, displacement, or polytropic exponent, a clearance fraction outside 0-1, or a computed volumetric efficiency at or below zero, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the reciprocating-compressor volumetric efficiency relation with clearance re-expansion, eta_v = 1 - C (r^(1/n) - 1), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `compressor-capacity-derate` -- Compressor Volumetric Efficiency and Capacity Derate

```
compression ratio r = absolute discharge pressure / absolute suction pressure
volumetric eff      = 1 - C x (r^(1/n) - 1)
actual induced vol  = displacement x volumetric efficiency
capacity ratio      = eta_v at condition B / eta_v at condition A
```

At the end of a compression stroke, the gas trapped in the clearance volume is at discharge pressure. On the way
back down it re-expands, and the piston has already travelled part of its stroke before suction pressure is
reached and the suction valve can open. The higher the compression ratio, the longer that re-expansion takes and
the less of the stroke is left to draw in fresh vapor. `C` is the clearance fraction, typically 3% to 5% for a
reciprocating machine, and `n` the polytropic exponent, near 1.15 for common refrigerants.

The practical reading is that compression ratio, not discharge pressure, is what costs capacity -- and it is a
ratio, so a small rise in suction pressure helps far more than an equal fall in head pressure. That is the whole
argument for keeping evaporators clean and suction lines properly sized, and it is why a machine that is fine in
a cooler is badly undersized when the same box is converted to a freezer.

**Inputs:** suction and discharge pressures (absolute, or gauge with the local barometric), clearance fraction,
polytropic exponent, compressor displacement (CFM), and a second operating condition to compare against.

**Outputs:** compression ratio, volumetric efficiency, actual induced volume, and the capacity ratio between two
operating conditions.

## 3. Worked example

A machine with 4% clearance and `n = 1.15`, compared at two conditions:

```
r = 5  (say 40 psia suction, 200 psia discharge):
    eta_v = 1 - 0.04 x (5^0.870 - 1)  = 1 - 0.04 x 3.054 = 0.878

r = 10 (20 psia suction, same 200 psia discharge):
    eta_v = 1 - 0.04 x (10^0.870 - 1) = 1 - 0.04 x 6.405 = 0.744

capacity ratio = 0.744 / 0.878 = 0.847
```

Halving the suction pressure costs 15% of the *pumping* efficiency alone -- and that is before the much larger
effect of the lower-density vapor at the lower suction pressure, which is what really collapses mass flow. The two
together are why the same compressor that makes 5 tons at a 40 F evaporator makes well under 2 at a -20 F one.

Read it the other way for a service call: a system whose suction pressure has dropped because of a restricted
metering device or a starved evaporator is losing capacity by this curve, and raising head pressure to compensate
makes it strictly worse.

## 4. Scope and non-goals

The classical reciprocating clearance model. It describes the volumetric efficiency of the *pump* only, and does
not include the refrigerant's density change with suction pressure, the superheat at the compressor inlet, valve
and port pressure losses, motor and mechanical efficiency, or heat picked up from the cylinder walls -- all of
which matter and several of which are larger than the clearance effect at extreme ratios. It does not apply to
scroll, screw, or rotary compressors, which have fixed volume ratios and entirely different part-load and
off-design behavior. Clearance fraction and polytropic exponent are estimates unless taken from the manufacturer.
The compressor manufacturer's published capacity tables govern; they already contain all of this.
