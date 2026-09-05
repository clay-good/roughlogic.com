# roughlogic.com Specification v1467 -- Counterpoise and Ground Rod Array Resistance (`calc-lineworker.js`, Group A Electrical, line work, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lineworker.js`**
> (Group A, Electrical -- the existing category, hub `/groups/electrical/`; overhead line and distribution), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** `grounding-electrode` does a driven rod. A transmission or distribution structure in rocky ground is grounded with buried horizontal wire instead, and the counterpoise relation is a different formula with a different length dependence -- doubling a rod barely helps, doubling a counterpoise nearly halves the resistance.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive resistivity, length, burial depth, or wire diameter, or a radial count below one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the horizontal-electrode resistance relation with IEEE 80 and IEEE 81 named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`counterpoise resistance`, `buried horizontal ground wire`, `radial ground resistance`, `structure grounding counterpoise`, `ground wire resistivity`.

## 2. The tile

### 2.1 `counterpoise-resistance` -- Counterpoise and Ground Rod Array Resistance

```
single horizontal wire  R = (rho / (pi L)) [ ln( 2L / sqrt(d h) ) - 1 ]
N radial wires          R_N ~ R_1 / N x F_N     (F_N > 1, mutual coupling penalty)
rods in parallel        R_n = R_1 / n x F_n
```

A buried horizontal conductor sheds current along its whole length, so its resistance falls roughly as `1/L`
with a logarithmic correction -- far better behaviour than a vertical rod in high-resistivity soil, where each
additional foot reaches ground no less resistive than the last. In rock, on frozen ground, and on ridgelines,
counterpoise is the only thing that works.

Multiple radials do not divide the resistance by their count, because each wire sits in the others' potential
field. The mutual-coupling penalty grows with the number of radials and shrinks as they are spread further apart,
so four long radials beat eight short ones of the same total wire almost every time. The tile reports both the
ideal parallel value and the coupled value so the penalty is visible rather than assumed away.

**Inputs:** soil resistivity, counterpoise wire length, burial depth, conductor diameter, number of radials, and optionally a target resistance

**Outputs:** the single-wire resistance, the resistance with the entered number of radials including the coupling penalty, the ideal uncoupled value for comparison, and the wire length needed to reach a target resistance

## 3. Worked example

A single 100 ft counterpoise of 1/2 in wire buried 6 in deep, in 100 ohm-metre soil (expressed here in
ohm-feet for the customary form):

```
R = (100 / (pi x 100)) x [ ln( 2 x 100 / sqrt(0.0417 x 0.5) ) - 1 ]
  = 0.3183 x [ 7.234 - 1 ] = 1.98 ohms
```

Double the length to 200 ft and the resistance falls to 1.10 ohms, roughly
1.8x better -- the `1/L` behaviour. Four 100 ft radials instead of one give an ideal
0.50 ohms, but with a coupling penalty near 1.5 the real value lands closer to 0.74 ohms, which is the number
to design to.

## 4. Scope and non-goals

A horizontal electrode in uniform soil, steady-state power-frequency resistance. Soil is almost never uniform,
and a two-layer structure -- conductive topsoil over rock, or the reverse -- changes the answer substantially; a
Wenner survey (`soil-resistivity-wenner`) run at several spacings is what reveals it. The tile gives
power-frequency resistance, NOT the impulse impedance that governs lightning performance, which is lower for a
short counterpoise and higher for a long one because the surge does not have time to reach the far end. Seasonal
variation with moisture and frost is large and is not modeled. It does not evaluate step and touch potential,
which is `step-touch-voltage` and `ground-potential-rise`. IEEE 80, IEEE 81 for measurement, and the utility's
grounding standard govern.
