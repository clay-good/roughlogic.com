# roughlogic.com Specification v1386 -- Stairwell Pressurization Airflow and Door Force (calc-fire.js, Group F, fire-ground and fire protection, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-fire.js`**
> (Group F, fire-ground and fire protection), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Group F has fifty tiles and every one of them is fire-ground: hose, pump, nozzle, ventilation, water supply. Nothing addresses fire protection engineering in a building, and stairwell pressurization is the case where two requirements fight each other -- enough pressure to keep smoke out, little enough that a person can still open the door. The catalog computes neither side.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive leakage area, pressure difference, door width, or door area, or a knob setback at or beyond the door width, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the orifice flow relation Q = 2610 A sqrt(dP) and the door-opening force relation of NFPA 92, with the 30 lbf maximum opening force of IBC 1010.1.3, cited by number and linked, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `stairwell-pressurization` -- Stairwell Pressurization Airflow and Door Force

```
Q (cfm)    = 2610 x A_leakage (sq ft) x sqrt(dP in. w.g.)
door force = F_closer + 5.2 x W x A_door x dP / (2 x (W - d))
```

A pressurized stairwell holds a positive pressure difference against the floors so smoke cannot enter. The air it
takes is an orifice problem: every gap in the enclosure -- door undercuts and edge gaps, construction leakage,
penetrations -- passes flow proportional to the square root of the pressure difference, and 2610 is the flow
coefficient in the customary units. Note the square root: doubling the design pressure does not double the fan,
it multiplies it by 1.41.

The second equation is the constraint that decides the design. Pressure across a closed door acts on the whole
door leaf, and the moment it produces has to be overcome at the knob, which is a short lever arm from the hinges.
The IBC caps the total opening force at 30 lbf, and the door closer itself already eats 10 to 15 of that. On a
3 x 7 door there is only so much pressure left, and the usable design window between "enough to hold smoke back"
and "a person can still get out" is narrow -- typically 0.10 to 0.25 in. w.g.

**Inputs:** total effective leakage area (sq ft), design pressure difference (in. w.g.), door width and height,
knob setback from the latch edge, door closer force (lbf).

**Outputs:** required pressurization airflow (cfm), door opening force (lbf), margin to the 30 lbf limit, and the
maximum pressure difference the door will tolerate.

## 3. Worked example

A stairwell with 2.5 sq ft of total effective leakage area, designed at 0.15 in. w.g., 3 ft x 7 ft doors with a
3 in knob setback and a 10 lbf closer:

```
Q          = 2610 x 2.5 x sqrt(0.15)              = 2,527 cfm
door force = 10 + 5.2 x 3 x 21 x 0.15 / (2 x 2.75) = 10 + 8.9 = 18.9 lbf   -> passes, 11 lbf of margin
```

Now push the design to 0.25 in. w.g. for more smoke margin: the fan grows to 3,262 cfm -- only 29% more air, from
the square root -- but the door force goes to 24.9 lbf, and with a 15 lbf closer instead of a 10 it would be
29.9 lbf and effectively at the limit. The door, not the fan, is what caps the design pressure.

## 4. Scope and non-goals

A sizing screen, not a smoke control design. Real systems are designed under NFPA 92 with the stack effect, wind,
the HVAC system's own pressures, and the open-door condition all considered -- and the governing case is usually
doors open, not the closed-door case computed here. Effective leakage area is an estimate built from construction
leakage classes and must be established for the actual building; it is the largest uncertainty in the
calculation. Smoke control systems require special inspection and acceptance testing, and their design is a
licensed engineering act. The fire protection engineer, NFPA 92, the adopted building code, and the AHJ govern.
