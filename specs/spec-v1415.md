# roughlogic.com Specification v1415 -- Control Damper Authority and Leakage (calc-refrigerant.js, Group C, HVAC and refrigeration service, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-refrigerant.js`**
> (Group C, HVAC and refrigeration service), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog sizes VAV boxes, computes duct static pressure, and balances airflow, but nothing checks whether a modulating damper can actually control. A damper whose full-open pressure drop is small compared with the branch it sits in has no authority -- it does nothing over most of its stroke and everything in the last few degrees -- and the symptom is hunting that gets blamed on the controller.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive damper pressure drop, system pressure drop, damper area, or leakage rating, or a system pressure drop below the damper's own drop, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the control-authority definition (the controlled device's own pressure drop as a fraction of the branch total) and the AMCA 511 damper leakage classes, cited by number and linked, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `damper-authority` -- Control Damper Authority and Leakage

```
authority beta = damper pressure drop wide open / total branch pressure drop
target         = 0.3 to 0.5 for reasonable modulating control
leakage at 1"  = leakage class rate x damper face area
leakage at dP  = leakage at 1" x sqrt(dP / 1.0)
leakage percent= leakage / design airflow x 100
```

Authority is the fraction of the branch's resistance that belongs to the damper itself. When it is high, closing
the damper changes the branch's total resistance a lot, so flow tracks the damper position and control is smooth.
When it is low -- a small damper drop in a branch full of coil, filter, and duct resistance -- closing the damper
barely changes the total until it is nearly shut, and then the flow falls off a cliff. The installed
characteristic becomes effectively on/off, and no amount of controller tuning fixes it, because the problem is
hydraulic.

The leakage half matters for a different reason: a closed damper that leaks is a closed damper that does not
close. On an outside-air damper in a cold climate that is a freeze-stat trip and a burst coil; on a smoke damper
it is a life-safety failure; on a VAV box minimum it is a comfort complaint and an energy penalty that runs all
year. AMCA classifies leakage by cfm per square foot at 1 in w.g., and it scales as the square root of pressure
like any other orifice.

**Inputs:** damper pressure drop wide open, total branch pressure drop, damper face area, AMCA leakage class
rate, actual pressure difference across the closed damper, design airflow.

**Outputs:** authority, whether it falls in the target band, leakage at 1 in w.g. and at the actual pressure, and
leakage as a percentage of design airflow.

## 3. Worked example

A damper with 0.15 in w.g. of drop wide open in a branch totaling 0.60 in w.g., 4 sq ft of face area, AMCA Class 1
(4 cfm/sq ft at 1 in w.g.), closed against 0.5 in w.g., on 2,000 cfm design:

```
authority = 0.15 / 0.60        = 0.25   -> below the 0.3 target, poor control
leakage   = 4 x 4              = 16 cfm at 1 in w.g.
at 0.5"   = 16 x sqrt(0.5)     = 11.3 cfm = 0.57% of design
```

The leakage is excellent and the authority is not. To fix the authority you either increase the damper's own
resistance -- a smaller damper, or opposed blades instead of parallel -- or reduce the rest of the branch, and the
first is almost always the answer: a damper sized to the duct is usually oversized for control. Halving the damper
area would roughly quadruple its pressure drop to 0.6 in w.g., which overshoots in the other direction; sizing it
for about 0.30 in w.g. puts the authority at 0.4 and lands it in the band.

## 4. Scope and non-goals

A screen using a fixed wide-open pressure drop. Real dampers have a characteristic curve -- parallel blade and
opposed blade behave very differently, and neither is linear -- and this authority ratio predicts the general
quality of control, not the installed characteristic. The tile does not size the damper, select an actuator or
check its torque against the damper's blade area and pressure, or address the special requirements for fire,
smoke, and combination dampers, which are life-safety devices with their own listing, installation, and testing
requirements. Leakage class rates are AMCA figures for a tested damper at a tested pressure. The damper
manufacturer, AMCA 500-D and 511, and the mechanical engineer govern.
