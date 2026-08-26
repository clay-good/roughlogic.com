# roughlogic.com Specification v1410 -- Weld Cooling Time t8/5 and the Thickness Transition (calc-fab.js, Group E, welding and fabrication, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-fab.js`**
> (Group E, welding and fabrication), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog computes welding heat input and travel speed for a target heat input, and carbon equivalent for a preheat screen, but never the quantity those three exist to control: the time the weld spends cooling from 800 to 500 degrees Celsius, which is what determines the microstructure and the hydrogen cracking risk. It is also where the two heat-flow regimes matter -- thin plate and thick plate cool by different laws.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive heat input, plate thickness, or shape factor, or a preheat temperature at or above 500 degrees Celsius, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the EN 1011-2 cooling-time relations for two- and three-dimensional heat flow and the transition thickness between them, cited by number and linked, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `weld-cooling-rate-t85` -- Weld Cooling Time t8/5 and the Thickness Transition

```
three-dimensional (thick plate):
  t8/5 = (6700 - 5 T0) x Q x [1/(500 - T0) - 1/(800 - T0)] x F3

two-dimensional (thin plate):
  t8/5 = (4300 - 4.3 T0) x 1e5 x Q^2 / d^2 x [1/(500 - T0)^2 - 1/(800 - T0)^2] x F2

  Q in kJ/mm, T0 preheat in deg C, d thickness in mm, F the joint shape factor
transition thickness: where the two expressions are equal
governing value: two-dimensional below the transition, three-dimensional above
```

`t8/5` is the cooling time through the 800 to 500 degree Celsius window, which is where austenite transforms and
where the weld's final microstructure -- and its hardness, its toughness, and its susceptibility to hydrogen
cracking -- is decided. Cool too fast and you get untempered martensite; cool too slowly and grain growth costs
you toughness. Every lever a welding procedure pulls, heat input and preheat and interpass temperature, is pulled
to land `t8/5` in the right window.

The two regimes are the part that is easy to get wrong. In a thick plate heat escapes into three dimensions and
the thickness stops mattering, so `t8/5` is independent of `d`. In a thin plate the heat has nowhere to go through
the thickness, flow is two-dimensional, and cooling is *slower* -- and it depends on `1/d^2`, sharply. The two
expressions cross at the transition thickness, and each governs on its own side, which is equivalently to say the
larger of the two values is the real one.

**Inputs:** arc energy or heat input (kJ/mm) with the process efficiency, preheat and interpass temperature
(deg C), plate thickness (mm), joint shape factors F2 and F3.

**Outputs:** the two-dimensional and three-dimensional cooling times, the transition thickness, the governing
value, and the regime it came from.

## 3. Worked example

Heat input `Q = 1.0 kJ/mm`, preheat `T0 = 20 C` (none), shape factors 1.0:

```
3D  = (6700 - 100) x 1.0 x (1/480 - 1/780)          = 6,600 x 0.0008013 = 5.29 s
2D at d = 10 mm = (4300 - 86) x 1e5 x 1/100 x (1/480^2 - 1/780^2) = 11.36 s
transition thickness = 14.7 mm
```

At 10 mm the plate is *thin* for this heat input -- below the 14.7 mm transition -- so two-dimensional flow
governs and the real cooling time is 11.4 s, more than twice the thick-plate figure. At 20 mm the 2D expression
gives 2.84 s, the plate is above the transition, and 3D governs at 5.29 s. Getting the regime backward on this
example would have you off by a factor of two in either direction.

Now add preheat. At `T0 = 150 C` the three-dimensional time rises from 5.29 s to 7.85 s -- a 48% slower cool from
preheat alone, which is exactly what preheat is for and why the carbon equivalent screen calls for it.

## 4. Scope and non-goals

An empirical model from EN 1011-2 for arc welding of ferritic steels, valid over the heat-input, thickness, and
preheat ranges the standard states and not outside them. Shape factors for fillets, corner joints, and multi-pass
sequences differ from 1.0 and must be taken from the standard. The model says nothing about what `t8/5` value is
*acceptable* -- that comes from the steel's own continuous-cooling transformation behavior and from the welding
procedure specification, not from a calculator. It does not address hydrogen control, which is a consumable and
storage matter, restraint, or the residual stresses that drive cracking as much as microstructure does. A
qualified welding procedure, EN 1011-2 or the applicable AWS code, and the welding engineer govern.
