# roughlogic.com Specification v1416 -- Chilled-Water Low Delta-T Screen and Pump Penalty (calc-hvacservice.js, Group C, HVAC and refrigeration service, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacservice.js`**
> (Group C, HVAC and refrigeration service), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog computes chiller tonnage from delta-T and gpm but never runs the check in the other direction: given the measured flow and load, is the plant getting its design delta-T, and what is the excess flow costing. Low delta-T syndrome is the most common chronic fault in a chilled-water plant and it is invisible unless someone divides.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive load, flow, or design delta-T, or a measured delta-T at or below zero, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the sensible water relation Q = 500 x gpm x delta-T and the cube-law relation between pump flow and pump power (the affinity laws), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `chilled-water-delta-t` -- Chilled-Water Low Delta-T Screen and Pump Penalty

```
actual delta-T = load BTU/hr / (500 x gpm)
design flow    = load BTU/hr / (500 x design delta-T)
excess flow    = actual gpm - design flow
pump penalty   = (actual gpm / design flow)^3
```

Five hundred is 8.34 lb/gal times 60 min/hr times water's specific heat of 1.0, so a chilled-water circuit's
delta-T is fixed once the load and the flow are known. A plant designed for a 12 degree delta-T and running 9
degrees is moving a third more water than it needs to, and the water is doing the same job either way.

The consequences compound. Pump power follows the cube of flow, so 25% excess flow is nearly double the pumping
energy -- the last line of the calculation is usually the largest number in the whole conversation. Beyond the
pumping cost, low delta-T means the chillers see a warmer return than they were selected for, so the plant has to
run more machines at part load to serve the same tons, and each one runs less efficiently. A plant with a chronic
low delta-T is short of capacity long before it is short of chillers.

The causes are all downstream: three-way valves left in place, coil control valves that never fully close, coils
fouled or selected for a low delta-T, and a bypass that was supposed to be temporary. The tile does not find them,
but it quantifies why finding them is worth doing.

**Inputs:** measured load (tons or BTU/hr), measured flow (gpm), design delta-T, design flow if known.

**Outputs:** actual delta-T, design flow for the load, excess flow in gpm and percent, and the pump power ratio
against design.

## 3. Worked example

A plant serving 240 tons (2,880,000 BTU/hr) at a measured 600 gpm, designed for a 12 degree delta-T:

```
actual delta-T = 2,880,000 / (500 x 600)  = 9.6 F
design flow    = 2,880,000 / (500 x 12)   = 480 gpm
excess flow    = 600 - 480                = 120 gpm, 25% over
pump penalty   = (600/480)^3              = 1.95
```

Nine and a half degrees against a twelve degree design, and the pumps are drawing nearly twice the power they
would at design flow -- for a plant that is delivering exactly the tons it is supposed to. On a 40 hp pump that is
roughly 20 hp of continuous waste, which is a five-figure annual number in most utility territories, and it is
being spent to move water that is not picking up heat.

## 4. Scope and non-goals

A screen from three measured numbers, and it is only as good as those measurements -- flow in particular is
frequently estimated rather than measured, and a pump-curve estimate on a plant with a fouled system can be off by
a great deal. The cube law is the affinity relation for a pump at fixed impeller and fixed system curve; a
variable-speed plant riding a control curve with static head does not follow it exactly, so the penalty figure is
an upper bound. The tile does not diagnose the cause, does not evaluate chiller performance or staging, and does
not address the primary-secondary and variable-primary hydraulics where a low delta-T shows up as bypass flow.
The plant's own trend data and the commissioning agent govern.
