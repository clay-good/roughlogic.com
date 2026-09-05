# roughlogic.com Specification v1624 -- Proportional Balancing Ratio Method (`calc-hvacsystems.js`, Group C HVAC, test and balance, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacsystems.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; test and balance, controls, and acoustics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Proportional balancing sets every outlet to the same fraction of its design flow rather than to its design number, then brings the whole branch up at once. It converges where outlet-by-outlet adjustment does not, because every damper you close changes every other outlet.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a terminal count below two, a non-positive design or measured flow, or a ratio at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the proportional balancing method with NEBB, AABC, and TABB named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`proportional balancing`, `ratio method air balance`, `reference terminal balancing`, `why balancing does not converge`, `equal ratio method`.

## 2. The tile

### 2.1 `proportional-balance-ratio` -- Proportional Balancing Ratio Method

```
ratio            R = measured flow / design flow, computed for every terminal
method           find the LOW terminal (lowest R) -- it becomes the reference and is left alone
                 throttle the others to match its ratio
                 then set the branch total with the branch damper
key property     once ratios are equal, changing the branch flow scales every outlet
                 proportionally and the ratios stay equal
why iteration fails setting outlet A to design changes outlet B; setting B changes A
```

Air systems are coupled: closing a damper at one outlet raises the pressure available to every other outlet on
the branch, so an outlet set exactly to design will not be at design once the next one is adjusted. Balancing
outlet by outlet chases that coupling around the branch, sometimes for hours, and often never converges.

Proportional balancing exploits the coupling instead of fighting it. If every outlet is at the same fraction of
its design, then any change in branch flow scales them all by the same factor -- the ratios are preserved. So the
balancer equalizes ratios first, which is a stable target, and only then opens the branch damper to bring the
whole set to 100%. One adjustment at the end sets everything.

The reference outlet is the LOW one and it is left wide open, because it is the one with the least pressure
available; throttling anything to match a high outlet would mean opening the low one beyond fully open, which is
not available. That single rule is what makes the method converge, and it is the part that gets done backwards by
someone balancing from the first outlet on the drawing.

**Inputs:** each terminal with its design and measured flow, the branch measured and design flow, and the terminal identifiers

**Outputs:** the ratio at every terminal, the reference (lowest-ratio) terminal identified, the target flow for each terminal to match the reference ratio, the branch adjustment factor required after equalizing, and the resulting flow at every terminal once the branch is set

## 3. Worked example

A branch with five diffusers:

```
outlet   design   measured   ratio
  A        250      310      1.24
  B        300      285      0.95
  C        200      250      1.25
  D        400      365      0.91   <- LOW, the reference
  E        250      300      1.20
branch total: 1,400 design, 1,510 measured
```

D is the reference at 0.91 and is left fully open. Every other outlet is throttled to a ratio of 0.91:

```
A -> 250 x 0.91 = 228 cfm
B -> 300 x 0.91 = 273 cfm
C -> 200 x 0.91 = 182 cfm
E -> 250 x 0.91 = 228 cfm
```

Now the branch total is `1,400 x 0.91` = 1,274 cfm, and one adjustment at the branch damper brings it to 1,400 --
which scales every outlet by 1,400/1,274 = 1.099 and lands them all at design simultaneously.

**Compare the alternative.** Setting A to its 250 design first raises the pressure to B through E, so all four go
up; setting B then changes A, C, D and E again. A balancer working that way on five outlets can make a dozen
passes and still be out, and on a twelve-outlet branch it does not converge at all.

Note also what the ratios revealed before any adjustment: D at 0.91 while C sits at 1.25 says the air is going
where it is easy to go, which is exactly what an unbalanced branch looks like.

## 4. Scope and non-goals

A calculation supporting the proportional method. It assumes the branch behaves as a coupled system with a
single upstream source of pressure, which holds for a conventional branch and does not for systems with terminal
units that actively control their own flow -- VAV boxes regulate to a setpoint and are commissioned rather than
proportionally balanced. It assumes the measurements are valid, and hood readings should be corrected
(`flow-hood-correction`) before ratios are computed or the reference terminal may be misidentified. It does not
address the order in which branches and risers are balanced, which follows the same logic one level up, or the
fan and system-level adjustments that follow. It does not diagnose why a terminal is low, which may be a closed
damper, a crushed flex, a disconnected duct, or system effect rather than a balance condition. The applicable
balancing standard (NEBB, AABC, or TABB), the design documents, and the certified balancing technician govern.
