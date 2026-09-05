# roughlogic.com Specification v1471 -- Machine Thermal Growth Offset for Cold Alignment (`calc-millwright.js`, Group G Cross-Trade Utilities, millwrighting, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-millwright.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; millwright, rotating equipment, and pneumatics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A pump aligned cold and running hot is a pump out of alignment, because the hot machine's centerline rises as its supports grow. The correction is a deliberate cold MISalignment, and it is a two-line calculation that gets skipped because nobody has the number handy at the shim pack.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive support height or coefficient of expansion, or an operating temperature below the ambient for a machine expected to grow returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the thermal expansion relation applied to the alignment cold target as standard practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`thermal growth alignment`, `cold alignment offset`, `hot alignment target`, `machine growth shim`, `thermal offset pump motor`.

## 2. The tile

### 2.1 `alignment-thermal-growth` -- Machine Thermal Growth Offset for Cold Alignment

```
growth per machine   dH = alpha x L_support x (T_op - T_ambient)
relative growth      dH_rel = dH_stationary - dH_movable
cold target offset   set the movable machine LOW by dH_rel
cold target angle    from the difference in growth at the two feet
```

Support growth is ordinary thermal expansion of the pedestal or feet between the mounting plane and the shaft
centerline, and it depends on that height, the material, and the temperature rise -- not on the machine's power
or size. What matters is the DIFFERENCE between the two machines: a motor and pump that grow equally stay
aligned, and a hot pump on a short pedestal next to a cool motor on a tall one can grow the wrong way entirely.

The correction is applied as a cold target, so the machine is deliberately out of alignment when it is cold and
comes INTO alignment at operating temperature. The tile reports the target as a signed offset and angle to be
entered directly into the rim-and-face or reverse-dial move, which is the form a millwright can use without a
second conversion.

**Inputs:** support height from the mounting plane to the shaft centerline for each machine, the coefficient of thermal expansion, and the ambient and operating temperatures for each machine

**Outputs:** the growth of each machine, the relative growth, the cold target offset with sign, the cold target angularity where the front and rear supports differ in height, and the resulting hot alignment if the cold target is not applied

## 3. Worked example

A pump on a 18 in cast steel pedestal (alpha 6.5e-06/degF) running 90 degF above ambient, coupled to a
motor whose feet run near ambient:

```
dH_pump  = 6.5e-06 x 18 x 90 = 0.0105 in
dH_motor ~ 0
dH_rel   = 0.0105 in
```

The pump will rise 0.0105 in when it comes up to temperature, so it is set 0.0105 in LOW cold. Skip
that and the running offset is 10.5 mils -- which against the acceptable offset for a 3,600 rpm machine of
about 2 mils is roughly 5 times the tolerance, from a correction that takes one line of arithmetic.

## 4. Scope and non-goals

Uniform expansion of the support structure between the mounting plane and the shaft centerline. It does not
model baseplate growth, piping strain (which on a hot pump routinely moves the casing more than thermal growth
does and is a separate problem entirely), foundation movement, or the transient during warm-up when the machine
is in neither state. Manufacturer-published thermal offsets, where they exist, are measurements of the whole
installed assembly and beat this estimate outright -- use them. Machines with sleeve bearings have an operating
oil-film lift that shifts the running centerline and is not modeled here. The machine manufacturer's alignment
targets, the coupling tolerance, and a hot check with laser or optics govern.
