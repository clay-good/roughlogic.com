# roughlogic.com Specification v1646 -- Propeller Track, Balance, and Vibration Limit (`calc-mechanic.js`, Group K Mechanic - Auto, Marine, Aviation, aviation, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, Mechanic - Auto, Marine, Aviation -- the existing category, hub `/groups/mechanic/`; aviation maintenance), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A propeller out of track or out of balance shakes an airframe apart slowly, and both are measured rather than judged. Track is a ruler check on the ground; balance is an accelerometer and a phase angle, and the correction is the same vector arithmetic as any field balance.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a negative track difference or vibration level, or a blade count below two returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the track and dynamic balance methods with the propeller manufacturer service instructions and 14 CFR Part 43 named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`propeller track and balance`, `dynamic prop balance ips`, `prop vibration 1x`, `blade track limit`, `spinner balance weight`.

## 2. The tile

### 2.1 `propeller-track-balance` -- Propeller Track, Balance, and Vibration Limit

```
track             the difference in the plane swept by the blade tips
                  measured against a fixed reference at each blade
limit             typically 1/16 in between blades for a fixed pitch propeller; the
                  manufacturer's limit governs
dynamic balance   measured as an IPS (inches per second) vibration level at 1x propeller speed
target            commonly 0.2 IPS or below; below 0.1 IPS is achievable and desirable
correction        weight added at a phase angle, by the same trial-weight vector method
                  as `single-plane-field-balance`
static balance    a bench check on knife edges; necessary but not sufficient
```

Track and balance are different faults with different fixes and both produce vibration. Out of track means the
blades are not sweeping the same plane, so each blade meets the air differently and the propeller generates a
once-per-revolution aerodynamic imbalance no amount of weight corrects. Out of balance means the mass distribution
is uneven, and that is what weight corrects. Checking track first is what stops a technician chasing a tracking
problem with balance weights.

Dynamic balance is measured on the running engine because static balance on knife edges cannot detect the
combined effect of the propeller, spinner, bulkhead, and hub as installed -- a statically balanced propeller on a
heavy spinner bolt can still run rough. The measurement is an accelerometer on the engine case and an optical
tachometer for phase, and the correction is the trial-weight vector method the catalog already carries.

The reason to do it at all is that the vibration is continuous and the airframe is not indifferent to it. Getting
a propeller from 0.4 IPS to 0.05 IPS measurably reduces fatigue on engine mounts, baffles, instruments, and
avionics, and it is one of the few maintenance actions whose benefit the pilot notices immediately.

**Inputs:** the track reading at each blade, the manufacturer track limit, the measured vibration level and phase angle, a trial weight and its position, the resulting level and phase, and the target vibration level

**Outputs:** the track difference between blades against the limit, a track pass or fail, the effect vector from the trial weight, the correction weight and its angular position, the predicted residual vibration, and the improvement from the initial level

## 3. Worked example

A propeller measured on the ground and then run:

```
track: blade 1 reference, blade 2 reads 0.045 in aft
limit: 1/16 in = 0.0625 in   -> within limits, so tracking is not the fault
```

Track is acceptable, so the vibration is a balance problem and weight will fix it.

```
initial: 0.42 IPS at 155 degrees
trial weight 12 g at 0 degrees
result:  0.19 IPS at 260 degrees
```

The effect vector is the difference between the two readings, and the correction is the trial weight scaled by
the ratio of the original to the effect, rotated to oppose the original -- the identical arithmetic to
`single-plane-field-balance`.

**Had the track been 0.090 in instead**, outside the 1/16 in limit, the correct action would be to address the
tracking -- a hub, mounting, or blade issue -- before adding any weight. Balancing a propeller that is out of
track produces a compromise that is worse at some power settings than others, because the aerodynamic imbalance
varies with load and the mass correction does not.

The payoff: 0.42 IPS to below 0.10 IPS is a change a pilot feels, and it reduces continuous fatigue loading on
mounts, baffles, and panel-mounted equipment for the life of the installation.

## 4. Scope and non-goals

A track comparison and a vector balance calculation. Track limits, balance targets, permitted weight locations
and attachment methods, and the maximum weight that may be added are specific to the propeller and the
installation, and the propeller manufacturer's service instructions govern absolutely -- weights may only be
attached at approved locations with approved hardware, and adding weight to a spinner or bulkhead not approved for
it is an unapproved alteration. It does not diagnose the cause of an out-of-track condition, which may be hub,
mounting flange, crankshaft, or blade damage and which requires inspection rather than adjustment. It does not
address propeller inspection, blade damage limits, overhaul intervals, or the airworthiness directives applicable
to the propeller. Propeller vibration can indicate a crack; a propeller that will not balance is a reason to
inspect, not to keep adding weight. The propeller manufacturer's service manual, 14 CFR Parts 43 and 91, and a
certificated mechanic govern.
