# roughlogic.com Specification v1409 -- Shielding Gas Flow, Consumption, and Cylinder Duration (calc-fab.js, Group E, welding and fabrication, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-fab.js`**
> (Group E, welding and fabrication), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog computes oxy-fuel cutting gas consumption and welder duty cycle but never the shielding gas a wire process actually burns, which is the consumable a shop reorders most often and budgets for least well. The chain from flow rate through arc-on time to cylinder duration is three multiplications and it is not in the catalog.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive flow rate, shift length, or cylinder volume, or a duty fraction or waste fraction outside 0-1, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the shielding-gas consumption relation (flow rate times arc-on time) and the standard high-pressure cylinder volumes, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `shielding-gas-consumption` -- Shielding Gas Flow, Consumption, and Cylinder Duration

```
arc-on hours    = shift hours x arc-on (duty) fraction
gas consumed    = flow rate (cfh) x arc-on hours
with waste      = gas consumed x (1 + waste fraction)
cylinder life   = cylinder volume / gas consumed per shift
cost per arc hr = cylinder cost / cylinder volume x flow rate
```

Shielding gas is billed by the cylinder and consumed by the hour, and the bridge between them is *arc-on* time,
not shift time. A welder who is 60% arc-on across an eight-hour shift is running gas for less than five hours, and
a shop that estimates on shift hours will over-order by two thirds.

The waste fraction is not a rounding allowance. Pre-flow and post-flow, purging a long gun line at every start,
and the surge that occurs when the trigger is pulled against a regulator set on a cold cylinder all consume gas
that never shields anything, and on short-arc work with many starts it can be a fifth of the total. Turning the
flow up to fix porosity makes it worse and usually makes the porosity worse too, by pulling air into a turbulent
gas stream.

**Inputs:** flow rate (cfh), shift hours, arc-on fraction, waste fraction, cylinder volume (cf), cylinder cost,
number of welders.

**Outputs:** arc-on hours, gas consumed per shift with and without waste, shifts per cylinder, cost per arc hour,
and cost per shift for the shop.

## 3. Worked example

One welder at 35 cfh, 60% arc-on over an 8 hour shift, 15% waste, on a 251 cf cylinder:

```
arc-on hours  = 8 x 0.60      = 4.8 hr
gas consumed  = 35 x 4.8      = 168 cf
with waste    = 168 x 1.15    = 193 cf
cylinder life = 251 / 193     = 1.30 shifts
```

A cylinder and a third per welder per shift -- so a five-welder shop is changing more than six cylinders a day
and needs the delivery schedule to match. Now drop the flow from 35 cfh to 25, which is adequate for most indoor
short-arc work: consumption falls to 138 cf and the cylinder lasts 1.82 shifts, a 29% reduction in gas cost from
turning a knob. The flow rate is the single largest lever, and it is almost always set too high.

## 4. Scope and non-goals

Consumption arithmetic. It does not recommend a flow rate, which depends on the process, the nozzle size, the
gas mixture, the joint configuration, and above all on drafts -- outdoor or fan-exposed work needs more gas or a
different process entirely, and no flow rate saves a gas-shielded weld in real wind. Cylinder volumes vary by
supplier and by gas; nominal sizes are not standardized across the industry. The tile does not address gas
mixture selection, regulator and flowmeter calibration (a flowmeter reading is only correct for the gas it was
calibrated on), cylinder handling and storage, or the confined-space asphyxiation hazard that shielding gas
presents. The gas supplier and the welding procedure govern.
