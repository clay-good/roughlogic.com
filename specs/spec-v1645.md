# roughlogic.com Specification v1645 -- Aircraft Control Cable Tension and Temperature Correction (`calc-mechanic.js`, Group K Mechanic - Auto, Marine, Aviation, aviation, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, Mechanic - Auto, Marine, Aviation -- the existing category, hub `/groups/mechanic/`; aviation maintenance), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Aircraft control cables are rigged to a tension that is specified at a reference temperature, and the airframe and the cable expand at different rates -- so the correct tension on a cold morning is not the correct tension on a hot ramp. The correction chart exists for exactly this and it gets skipped.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive tension or temperature range, or a cable size outside the tensiometer calibration set returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the temperature-corrected rigging method with the aircraft maintenance manual and 14 CFR Part 43 named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`aircraft control cable tension`, `cable rigging temperature correction`, `tensiometer riser card`, `control cable slack`, `rig tension chart`.

## 2. The tile

### 2.1 `control-cable-tension` -- Aircraft Control Cable Tension and Temperature Correction

```
rig tension        specified in pounds at a reference temperature, from the maintenance manual
temperature effect the aluminium structure expands more than the steel cable, so tension
                   RISES as the aircraft warms and FALLS as it cools
correction         the manual's rigging chart gives the target tension at the ambient
                   temperature at the time of rigging
tensiometer        reading requires the correct riser and calibration card for the cable
                   size and construction
consequence        over-tension loads bearings and pulleys; under-tension gives slack,
                   lost motion, and control system flutter margin loss
```

The differential expansion is the whole reason for the chart. An aluminium airframe expands roughly twice as
much as a steel cable for the same temperature rise, so as the aircraft warms the structure stretches the cable
system and tension climbs. Rigging to the nominal tension on a hot ramp therefore leaves the system slack when
it cools, and rigging to nominal on a cold morning leaves it over-tensioned in the sun.

The magnitude is not trivial. Over a realistic ramp temperature swing the tension in a long cable run can change
by a large fraction of its nominal value, which is why the manual specifies a temperature-corrected target rather
than a single number and why the correction chart is part of the rigging procedure rather than an appendix.

The tensiometer itself is a source of error that has nothing to do with temperature. Each instrument has riser
blocks and calibration cards specific to cable diameter and construction, and using the wrong riser or reading
the wrong card gives a confident wrong number -- so a rigging that is out despite following the chart is often an
instrument problem.

Over-tension and under-tension fail differently: over-tension wears pulleys, bearings, and fairleads and adds
control forces; under-tension produces slack, lost motion at the control surface, and in the worst case reduces
the flutter margin the system was certificated with.

**Inputs:** the specified rig tension and its reference temperature, the ambient temperature at rigging, the manual temperature correction chart values, the cable size and construction, and the tensiometer riser and card in use

**Outputs:** the temperature-corrected target tension at the entered ambient, the difference from the nominal, the tension the system will reach at a stated alternative temperature, and a flag when the measured value falls outside the manual tolerance band

## 3. Worked example

A control cable specified at 70 lb at a 70 degF reference, being rigged on a 30 degF morning.

The manual's chart gives a lower target at low temperature, because the system will tighten as it warms. Reading
the chart at 30 degF might call for something in the region of 55 to 60 lb rather than 70.

**Rigging to the nominal 70 lb at 30 degF** and then letting the aircraft sit in 90 degF sun means the
structure expands relative to the cable and the tension climbs well above 70 lb -- loading pulleys and
bearings, raising control forces, and potentially exceeding the system's design tension.

The reverse error is worse in a different way. Rigging to 70 lb on a 100 degF ramp and then flying into cold
air at altitude leaves the system slack, and slack cables mean lost motion at the surface and reduced flutter
margin.

The instrument check that belongs alongside it: a tensiometer reading of 70 lb is only 70 lb if the riser
and the calibration card match the cable's diameter and construction. A 1/8 in 7x19 cable read on a card for
7x7 gives a wrong number with no indication that anything is amiss.

## 4. Scope and non-goals

A temperature correction applied using chart values the user supplies. The correction chart is specific to the
aircraft and the cable run and comes from the applicable maintenance manual; correction magnitudes differ between
airframes and between runs of different length and routing, and a generic correction is not acceptable. This tile
does not replace the maintenance manual, the rigging procedure, or the required tools -- tensiometer riser
selection, calibration currency, and reading technique all affect the result, and rigging is performed and
inspected under the applicable maintenance regulations. It does not address cable inspection for broken wires,
corrosion, and wear at fairleads and pulleys, which condemns a cable independently of its tension, or the
subsequent control surface travel and rig pin checks that verify the system. Aircraft control systems are
flight-critical: the aircraft maintenance manual, 14 CFR Parts 43 and 91, the manufacturer's service
information, and a certificated mechanic govern.
