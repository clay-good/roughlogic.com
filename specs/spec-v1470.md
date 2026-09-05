# roughlogic.com Specification v1470 -- Reverse-Dial Shaft Alignment Shim and Move (`calc-millwright.js`, Group S, millwrighting, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-millwright.js`**
> (Group S, millwright, rotating equipment, and pneumatics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Reverse-dial alignment beats rim-and-face on anything with an axial float or a long span, because both readings are rim readings and neither depends on a face being square. The price is that the moves come from a similar-triangles projection off two planes, which is where crews lose the sign.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive plane separation, or a foot distance that places both feet at the same station returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the reverse-dial two-plane projection as standard millwright practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`reverse dial alignment`, `reverse indicator alignment`, `two plane shaft alignment`, `spacer coupling alignment`, `centerline projection alignment`.

## 2. The tile

### 2.1 `shaft-alignment-reverse-dial` -- Reverse-Dial Shaft Alignment Shim and Move

```
offset at plane A   O_A = TIR_A / 2
offset at plane B   O_B = TIR_B / 2
slope               S = (O_B - O_A) / D
move at a foot      M = O_A + S x L      (L from plane A to that foot, same direction as B)
```

Two indicators sweep each shaft from the other, giving the relative position of the shaft centerlines at two
planes a known distance apart. Two points define the line, so the misalignment is fully described without any
face measurement at all -- which is exactly why it tolerates axial float and why it is the method of choice on
long couplings and spacer couplings.

Everything after that is one straight line extrapolated to the feet. The single largest source of error is the
direction convention: `L` must be measured in the same sense as `D`, from plane A toward plane B, and a foot
located on the far side of plane A carries a negative `L`. The tile reports the projected centerline position at
each foot so the geometry can be checked against the machine rather than trusted.

**Inputs:** total indicator readings at both planes, the distance between the planes, and the distance from plane A to the front and rear feet of the movable machine

**Outputs:** the centerline offset at each plane, the slope between them, the projected offset and required move at each foot, and the resulting offset and angularity at the coupling center for a tolerance check

## 3. Worked example

Readings of -0.014 in at plane A and +0.022 in at plane B, 10 in apart. The movable machine's front foot is
6 in and its rear foot 24 in from plane A, measured toward B:

```
O_A = -0.014 / 2 = -0.0070 in
O_B = +0.022 / 2 = +0.0110 in
S   = (+0.0110 - (-0.0070)) / 10 = +0.00180 in/in = 1.80 mils/in
M1  = -0.0070 + 0.00180 x 6  = +0.0038 in
M2  = -0.0070 + 0.00180 x 24 = +0.0362 in
```

The front foot comes down 0.0038 in and the rear foot up 0.0362 in -- opposite directions, which is
the signature of an angular error large relative to the offset. A crew reading only the magnitudes and shimming
both feet the same way would make the alignment worse, not better.

## 4. Scope and non-goals

Vertical moves for a two-machine train from two rim readings; the horizontal set is the same arithmetic on
side readings. Bracket sag is not corrected and must be measured and subtracted first -- on a long reverse-dial
bracket it is routinely 0.005 in or more, larger than the tolerance being worked to. Soft foot must be zeroed
first or the machine changes shape as the bolts are torqued. The tile does not apply thermal growth targets,
does not check the moves against a tolerance (`coupling-alignment-tolerance` does), and does not handle three or
more machines in a train, where the intermediate machine's position is a design decision rather than an
arithmetic one. The coupling manufacturer's tolerance and the machine manufacturer's installation instructions
govern.
