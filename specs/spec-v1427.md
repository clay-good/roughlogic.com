# roughlogic.com Specification v1427 -- Door Opening Force, Closer Size, and Pressure Differential (calc-construction.js, Group E, specialty trades, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`**
> (Group E, specialty trades), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog checks ADA stair and door geometry but never the force it takes to open the door, which is the accessibility requirement most often failed in the field and the one most often broken by a building system rather than by the hardware. A closer set correctly can still exceed the 5 lbf interior limit once the HVAC puts a pressure difference across the leaf.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive door width, door area, or closer force, a knob setback at or beyond the door width, or a negative pressure difference, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the 2010 ADA Standards 404.2.9 maximum opening force of 5 lbf for interior hinged doors, the fire-door exception, and the pressure-differential force relation used in smoke control design, cited by number and linked, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `door-opening-force` -- Door Opening Force, Closer Size, and Pressure Differential

```
pressure force at the knob = 5.2 x W x A x dP / (2 x (W - d))
total opening force        = closer force + pressure force + latch and seal friction
limit: 5 lbf for interior hinged doors (2010 ADA Standards 404.2.9)
       fire doors are exempt from the 5 lbf limit but are limited by the AHJ, commonly 15 lbf
```

The 5 pound limit is small, and a door closer alone consumes most of it. That leaves very little for anything
else -- and a building's own air systems routinely supply the rest. A pressure difference of five hundredths of an
inch of water column is far below anything a person can feel, invisible on any balance report, and on a standard
3 x 7 leaf it is worth about 3 lbf at the knob. Added to a closer set at 5 lbf, the door is at 8 lbf and out of
compliance, and no adjustment to the closer will fix it without leaving the door unable to close and latch.

The relationship is the same one that governs stairwell pressurization, and the two problems are the same problem
seen from different sides: the smoke control engineer wants pressure across the door, and the accessibility
requirement caps what that pressure may be. Where they conflict, the door -- not the fan -- is the binding
constraint.

**Inputs:** door width and height, knob setback from the latch edge, closer force at the knob, pressure difference
across the door (in. w.g.), latch and seal friction allowance, and the applicable limit.

**Outputs:** pressure force at the knob, total opening force, margin to the limit, and the maximum pressure
difference the door can tolerate at the given closer setting.

## 3. Worked example

A 3 ft x 7 ft interior hinged door with a 3 in knob setback, closer adjusted to 5 lbf, in a building running
0.05 in. w.g. across the leaf:

```
pressure force = 5.2 x 3 x 21 x 0.05 / (2 x 2.75) = 2.98 lbf
total          = 5.0 + 2.98                        = 7.98 lbf
limit          = 5.0 lbf                           -> FAILS by 2.98 lbf
```

The hardware is set correctly and the door is non-compliant. Solve it backward: with a 5 lbf limit and *any*
closer force at all, the allowable pressure difference is tiny -- a 3 lbf closer leaves room for only 0.034 in.
w.g. before the door fails. In practice, meeting 5 lbf on a door with a closer requires the building pressure
across it to be very near zero, which is an air balance question and not a door hardware question at all.

## 4. Scope and non-goals

The force required to *open* the door, measured at the point the standard specifies. It does not evaluate whether
the closer will still close and latch the door, which is the competing requirement and the reason closers cannot
simply be backed off -- a fire door that does not latch is a life-safety failure, and a fire door is exempt from
the 5 lbf limit for exactly that reason. The tile does not address closing speed, the sweep and latch periods,
delayed-action closers, power-assisted and low-energy operators (which have their own ANSI A156.19 requirements
and are the usual remedy), threshold and hardware geometry, or the separate limits for sliding and folding doors.
The 2010 ADA Standards, the adopted building and fire codes, and the AHJ govern.
