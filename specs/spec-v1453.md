# roughlogic.com Specification v1453 -- Suspension Insulator Uplift Check at a Low Point (`calc-lineworker.js`, Group A Electrical, line work, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lineworker.js`**
> (Group A, Electrical -- the existing category, hub `/groups/electrical/`; overhead line and distribution), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** In hilly country a suspension structure sitting in a sag between two higher structures can be lifted, not loaded: the conductor's low point falls outside the span and the insulator string tries to go up. Uplift unseats a suspension clamp, inverts a post insulator, and is a listed cause of structure damage. It is a subtraction, and nothing in the catalog does it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive span, weight per foot, or tension, or a negative elevation difference returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the inclined-span vertical reaction and low-point relations as standard overhead line practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`conductor uplift`, `insulator uplift check`, `suspension uplift`, `low point outside span`, `negative vertical load`.

## 2. The tile

### 2.1 `conductor-uplift-check` -- Suspension Insulator Uplift Check at a Low Point

```
vertical load, lower support  V_low  = w L / 2 - H h / L
vertical load, upper support  V_up   = w L / 2 + H h / L
uplift when V_low < 0
low point offset from lower support  x0 = L/2 - H h / (w L)
```

An inclined span's weight does not split evenly. The horizontal tension acting along a sloped chord adds a
downward component at the high support and an equal UPWARD component at the low one. When that upward component
exceeds half the conductor weight, the net vertical load at the low structure goes negative and the conductor is
lifting it.

The same arithmetic says where the low point of the curve sits. As `H h / (w L)` grows past `L/2` the low point
walks out of the span entirely, which is the geometric statement of the same condition: a span whose low point
is outside itself is a span pulling up at one end. The condition worsens in cold weather, because cold means
high tension, and `H` is the term doing the lifting.

The check is run at the structure in question against BOTH adjacent spans together, since the real vertical load
there is the sum of what each side contributes.

**Inputs:** span length, elevation difference between supports, conductor weight per foot, and horizontal tension at the condition checked (cold and heavy tension is the governing case)

**Outputs:** the vertical load at each support, the low-point offset, whether the low point falls inside the span, and an uplift flag with the tension at which uplift begins

## 3. Worked example

A 500 ft span rising 60 ft, ACSR Drake at 1.094 lb/ft, at a cold-weather tension of 5,000 lb:

```
V_low = 1.094 x 500 / 2 - 5,000 x 60 / 500  = 273.5 - 600.0 = -326.5 lb
V_up  = 1.094 x 500 / 2 + 5,000 x 60 / 500  = 273.5 + 600.0 = 873.5 lb
x0    = 500/2 - 5,000 x 60 / (1.094 x 500)     = -298.4 ft from the lower support
```

The lower structure carries -326.5 lb -- negative, so it is being LIFTED with 326 lb, and the low point sits
298 ft OUTSIDE the span on the far side. This structure needs a tension-carrying assembly or a hold-down,
not a suspension clamp. Slack the tension to 1,140 lb and `V_low` reaches zero; anything above that lifts.

## 4. Scope and non-goals

A single inclined span at one condition, parabolic, one conductor. It checks the geometry of uplift; it does
not size a hold-down weight, select a tension assembly, or evaluate the insulator string swing that governs
clearance at the same structure. The governing case is the coldest expected temperature with no ice, and the
tile does not find that condition for you -- run `conductor-sag-at-temperature` first and bring its tension here.
Real structures see both adjacent spans and the check must be run against their sum. The line design, the
structure and insulator manufacturer's ratings, and the utility's construction standard govern.
