# roughlogic.com Specification v1412 -- Interpass Temperature Window and Time Between Passes (calc-fab.js, Group E, welding and fabrication, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-fab.js`**
> (Group E, welding and fabrication), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** A welding procedure sets a preheat minimum and an interpass maximum, and the welder in the field has to stay between them across a multi-pass joint. How long the work may sit before it falls below preheat, and how long it must sit after an overheated pass before the next one is permitted, are both Newton-cooling questions and neither is in the catalog.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive time constant, an ambient temperature at or above the preheat minimum, or an interpass maximum at or below the preheat minimum, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): Newton's law of cooling applied to the joint's measured time constant, with the preheat and interpass limits set by the welding procedure specification under the applicable AWS code, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `interpass-temperature-control` -- Interpass Temperature Window and Time Between Passes

```
T(t)          = T_ambient + (T_start - T_ambient) x exp(-t / tau)
time to fall from T1 to T2 = tau x ln((T1 - T_ambient) / (T2 - T_ambient))

idle allowance = time from the post-pass temperature down to the preheat minimum
required wait  = time from the interpass maximum down to a chosen restart temperature
```

Preheat and interpass are a window, not two separate rules, and the welder lives inside it. Below the preheat
minimum, hydrogen cracking risk rises and the procedure is violated. Above the interpass maximum, the cooling time
`t8/5` stretches, grain growth costs toughness, and the procedure is violated in the other direction. Both limits
come from the welding procedure specification.

The two outputs answer the two questions that actually arise. The **idle allowance** is how long a welder can stop
-- for a fit-up, for a grind, for a break -- before the joint drops below preheat and has to be reheated, which is
a real interruption on a heavy weldment. The **required wait** is the other case: a pass ran hot, the joint is at
or over the interpass maximum, and welding cannot resume until it comes down.

The time constant `tau` is a property of the specific joint -- its mass, its section, its exposure -- and it must
be measured, not assumed. Timing one cooling interval with a contact pyrometer gives it, and from then on the
whole schedule follows.

**Inputs:** joint time constant tau (min), ambient temperature, preheat minimum, interpass maximum, current or
post-pass temperature, and the target restart temperature.

**Outputs:** idle allowance before reheat is required, required wait after an over-temperature pass, the
temperature at a stated elapsed time, and whether the joint is currently inside the window.

## 3. Worked example

A joint with a measured `tau` of 12 min, ambient 70 F, preheat minimum 200 F, interpass maximum 500 F:

```
just after a pass at 300 F, idle allowance = 12 x ln((300-70)/(200-70)) = 12 x 0.571 = 6.9 min
a pass that ended at 500 F, wait to 200 F  = 12 x ln((500-70)/(200-70)) = 12 x 1.196 = 14.4 min
```

Seven minutes of idle is the practical number and it is short -- shorter than a lot of fit-up interruptions, which
is why heavy weldments get blankets and why a torch stays lit next to the work. The second figure is the cost of
running hot: fourteen minutes of the welder standing still, which on a joint with twenty passes is nearly five
hours of lost production if it happens every time.

## 4. Scope and non-goals

A single-lump cooling model with one time constant, which is a reasonable approximation for a compact joint and a
poor one for a large plate where the temperature varies across the work. It models the joint's *measured*
behavior and cannot predict `tau` from geometry. Preheat and interpass temperatures are set by the welding
procedure specification qualified under the applicable code -- AWS D1.1 for structural steel, others elsewhere --
and this tile neither determines them nor substitutes for the temperature measurement the code requires, which is
taken at a specified distance from the weld and at a specified time. It does not address the consumable's own
storage and hydrogen requirements. The welding procedure specification, the applicable AWS code, and the CWI
govern.
