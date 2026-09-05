# roughlogic.com Specification v1582 -- Sawmill Lumber Recovery and Overrun (`calc-sawmill.js`, Group L Agriculture and Forestry, sawmill, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-sawmill.js`**
> (Group L, Agriculture and Forestry -- the existing category, hub `/groups/agriculture/`; sawmill and forest products), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A mill buys logs on a scale and sells lumber on a tally, and the gap between them is overrun -- the single number that says whether the mill is making money on its wood. Doyle scale in particular understates small logs badly, so overrun swings enormously with log diameter.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive scaled or actual volume, or a non-positive log cubic volume when computing recovery returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the overrun and lumber recovery definitions with the applicable scaling rule named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`lumber overrun`, `lumber recovery factor`, `doyle scale overrun`, `mill recovery percentage`, `board feet per cubic foot`.

## 2. The tile

### 2.1 `lumber-recovery-overrun` -- Sawmill Lumber Recovery and Overrun

```
overrun          % = (actual board feet - scaled board feet) / scaled x 100
lumber recovery  LRF = board feet produced / cubic feet of log input
scale bias       Doyle badly understates small logs, so overrun is HIGH on small logs
                 and falls toward zero or negative on large ones
Scribner         less biased; International 1/4 closest to true volume, so overrun is small
value            overrun on a cheap scale is not profit; the log price already reflects it
```

Overrun is a property of the SCALE, not only of the mill. Doyle's formula subtracts a fixed slab allowance that
is far too large on small logs, so a 10 inch log scales at a fraction of what it actually cuts and a mill running
small wood on Doyle can show overrun of 50% or more. The same mill running 20 inch logs shows very little. A mill
comparing its overrun month to month without tracking log diameter is measuring its log mix, not its
performance.

Lumber recovery factor is the honest efficiency measure because it compares output to actual wood volume rather
than to a scaling convention. It responds to the things a mill can control: saw kerf, sawing accuracy, target
sizes and how much oversize is being cut for shrinkage, edging and trimming practice, and how the sawyer breaks
down each log.

The commercial point that follows: overrun on a conservative scale is not free money, because everyone knows the
scale is conservative and the log price already reflects it. Improving LRF is real; improving overrun by buying
smaller logs is not.

**Inputs:** scaled board feet and the scale rule used, actual board feet tallied, log cubic volume, average log diameter, saw kerf, and the target sizes

**Outputs:** the overrun percentage, the lumber recovery factor, the recovery against a stated benchmark, the overrun expected for the entered scale rule and log diameter, and the board feet gained by a stated reduction in kerf

## 3. Worked example

A mill scaling 1,000 board feet Doyle and tallying 1,240 board feet:

```
overrun = (1,240 - 1,000) / 1,000 x 100 = 24.0%
```

24% overrun. Before congratulating anyone, check the log diameter: on 10 in logs Doyle understates so badly
that 24% is unremarkable, while on 20 in logs the same 24% would be excellent.

The measure that does not move with the scale rule is recovery. If those 1,240 board feet came from 210
cubic feet of log:

```
LRF = 1,240 / 210 = 5.9 board feet per cubic foot
```

Against a benchmark near 7 to 9 for a well-run hardwood mill, 5.9 says where this mill actually
stands -- and it says it the same way whether the logs were scaled Doyle, Scribner, or International.

Kerf: dropping from a 0.180 in band to a 0.125 in band on 1 in boards recovers roughly 5% more lumber from the
same logs, which on 1,240 board feet is 62 board feet -- more than most sawing improvements
and entirely a saw decision.

## 4. Scope and non-goals

A ratio calculation from volumes the user supplies. Overrun depends heavily on the scale rule and log
diameter and is not comparable between mills, between scale rules, or across a changing log mix -- which is the
main reason to carry lumber recovery factor alongside it. It does not compute log scale, which is `timber-cruise`
and the applicable scaling rule, and it does not address scaling deductions for defect, which materially change
the scaled volume and are a matter of the scaler's judgment and the applicable scaling handbook. It does not
evaluate grade recovery, which is where hardwood value actually sits -- a mill can raise volume recovery and lose
money by degrading grade -- or value recovery per log. It does not address green versus dry tally, or the
shrinkage allowance in target sizes. The applicable scaling rule and handbook, the grading rules of the
applicable agency, and the mill's own scaling and tally records govern.
