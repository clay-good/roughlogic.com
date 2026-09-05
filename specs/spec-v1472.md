# roughlogic.com Specification v1472 -- Soft-Foot Measurement and Correction Shim (`calc-millwright.js`, Group G Cross-Trade Utilities, millwrighting, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-millwright.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; millwright, rotating equipment, and pneumatics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Every alignment number is a lie until soft foot is zero, because a machine that rocks changes shape when the bolts come down. It is measured with one indicator and a wrench, and the threshold is a number worth having on the phone.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a negative measured rise, or fewer than three feet entered returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the soft-foot measurement procedure and the 0.002 in acceptance threshold as standard millwright practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`soft foot check`, `soft foot shim`, `machine rocking foot`, `soft foot tolerance`, `frame distortion feet`.

## 2. The tile

### 2.1 `soft-foot-correction` -- Soft-Foot Measurement and Correction Shim

```
measured soft foot   S_i = indicator rise when foot i is loosened
acceptable           S <= 0.002 in (0.05 mm) at every foot
shim required        equal to the measured rise at that foot
frame distortion     check: sum of opposite-corner rises should roughly match
```

Loosen one foot with an indicator on it and watch what moves. If the foot springs up, the bolt was pulling the
machine down onto a gap and distorting the frame; the shim to add is exactly the rise measured. Working one foot
at a time with the other three tight isolates each one, and repeating the sweep matters because correcting one
foot changes the others.

Two kinds hide behind the same reading. Parallel soft foot is a plain gap and takes a flat shim. Angular soft
foot is a foot that is not parallel to the base and takes a stepped or machined shim -- a flat shim under an
angular foot only moves the contact point. The tile flags which is likely from the pattern across the four feet,
and reports the diagonal check that reveals a twisted base rather than a bad foot.

**Inputs:** the indicator rise measured at each foot when that foot alone is loosened, the acceptance threshold, and optionally the existing shim thickness at each foot

**Outputs:** the rise at each foot, a pass or fail against the threshold, the shim to add at each foot, the worst foot, the diagonal sum comparison, and a parallel-versus-angular indication

## 3. Worked example

Four feet measured one at a time, threshold 0.002 in:

```
foot 1 (LF): 0.001 in   pass
foot 2 (RF): 0.007 in   FAIL -- shim 0.007 in
foot 3 (LR): 0.002 in   pass (at limit)
foot 4 (RR): 0.001 in   pass
diagonals:   LF+RR = 0.002    RF+LR = 0.009
```

One bad foot at 0.007 in, and the diagonal sums disagree by 0.007 in, which points at that foot rather than at a
twisted base -- a twist would show as two matched diagonals with a large difference between them. Shim the right
front 0.007 in and sweep all four again, because relieving that foot will redistribute the others. Aligning this
machine before that shim goes in would produce a beautiful set of cold readings that change the moment the bolts
are torqued.

## 4. Scope and non-goals

Vertical soft foot on a four-foot machine measured with a dial indicator. It does not distinguish parallel
from angular soft foot with certainty -- that takes feeler gauges around the foot perimeter or a machined-shim
check -- and it does not detect a bent foot, a cracked base, or grout that has lost bond, all of which read as
soft foot and none of which shims fix. Squishy foot, where a stack of too many shims compresses under torque, is
a different failure with the same symptom; the fix is fewer, thicker, clean shims, and the tile does not count
them. Pipe strain produces the same rocking and must be checked separately by loosening flanges. The machine
manufacturer's installation instructions and the alignment procedure govern.
