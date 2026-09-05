# roughlogic.com Specification v1495 -- Effective Leakage Area and Normalized Leakage (`calc-buildingperf.js`, Group C HVAC, building performance, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-buildingperf.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; building performance and envelope diagnostics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A blower door reads CFM50 and the catalog converts that to ACH50. Neither number tells a homeowner anything physical. Effective leakage area does: it is the size of the single hole that would leak the same, in square inches, and it is the number that makes an air-sealing conversation land.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive CFM50, floor area, or building height returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the ELA and normalized leakage relations with ASTM E779 and RESNET named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`effective leakage area`, `ela blower door`, `equivalent leakage area`, `normalized leakage`, `square inches of hole house`.

## 2. The tile

### 2.1 `effective-leakage-area` -- Effective Leakage Area and Normalized Leakage

```
effective leakage area  ELA = CFM50 / 18.9        (sq in, at 4 Pa reference)
equivalent leakage area EqLA = CFM50 / 10.0        (sq in, Canadian 10 Pa convention)
normalized leakage      NL = 1000 x (ELA / A_floor) x (H / 8.2)^0.3
specific leakage area   SLA = ELA / A_floor
```

The conversion is a single divisor because it comes from fitting the building's leakage curve back to a
reference pressure and treating the total leakage as one sharp-edged orifice. The two conventions differ only in
that reference -- 4 Pa for ELA in the US, 10 Pa for EqLA in Canada -- so the same house has two leakage areas that
differ by about a factor of two, and quoting the wrong one is a common source of confused comparisons.

Normalized leakage adds a height correction, because a tall house drives more stack flow through the same hole
than a single-storey house does. That is what makes NL rather than ACH50 the right basis for estimating natural
infiltration (`infiltration-lbl-model`), and it is why two houses with identical ACH50 can have quite different
real-world air change rates. The practical value of ELA, though, is rhetorical: telling someone their house has
98 square inches of hole -- a window left open most of the year -- does more than telling them it is 6.2 ACH50.

**Inputs:** CFM50 from the blower door test, conditioned floor area, building height to the highest ceiling, number of storeys, and the convention (4 Pa ELA or 10 Pa EqLA)

**Outputs:** the effective leakage area in square inches and square feet, the equivalent leakage area on the 10 Pa convention, specific leakage area, normalized leakage, and the hole expressed as a square of that size for explanation

## 3. Worked example

A house testing 1,850 CFM50, 2,400 sq ft of conditioned floor area, 8 ft ceilings, one storey:

```
ELA  = 1,850 / 18.9              = 97.9 sq in
NL   = 1000 x (97.9 / 2,400) x (8.0/8.2)^0.3 = 40.484
```

98 square inches is a hole about 9.9 in on a side -- roughly a 10 by 10 inch opening in
the envelope, permanently. That is the sentence that changes a homeowner's mind, and it is the same measurement
as "5.8 ACH50," which changes nobody's.

On the Canadian convention the same house reports `1,850 / 10.0` = 185 sq in EqLA -- almost double,
for an identical building, purely from the reference pressure.

## 4. Scope and non-goals

A conversion from a single-point CFM50 reading. It assumes the standard orifice coefficient and a leakage
exponent near 0.65; a multi-point blower door test measures the actual exponent and gives a better ELA, and a
house with an unusual exponent (very leaky large openings, or very tight buildings dominated by small cracks)
will differ. It does not locate leaks, which is what the test is actually for, and it does not distinguish
leakage to outdoors from leakage to an attached garage, attic, or crawl space -- a distinction that matters far
more for health than the total does. It does not estimate natural infiltration, which is `infiltration-lbl-model`,
or check a code target, which is `building-tightness-limit`. ASTM E779 or ASTM E1827 for the test method, RESNET
or BPI standards for the protocol, and the adopted energy code govern.
