# roughlogic.com Specification v1827 -- Phosphate Conversion Coating Weight (`calc-finishing.js`, Group G Cross-Trade Utilities, metal finishing and galvanizing, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-finishing.js`**
> (Group G Cross-Trade Utilities, hub `/groups/cross-trade/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A conversion coating's weight is measured by stripping a panel and weighing the difference, and the arithmetic is a division by area. The area is both sides of the panel, and forgetting the second side doubles the answer -- which is enough to turn a failing coating into a passing one.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive panel dimension or coated area, a mass after stripping at or above the mass before, or a non-positive specification range returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the strip-and-weigh coating weight method and typical conversion coating ranges with the applicable ASTM test method and the coating supplier's specification named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`phosphate coating weight`, `conversion coating mg per square foot`, `strip and weigh coating test`, `zinc phosphate iron phosphate weight`, `paint pretreatment coating weight`.

## 2. The tile

### 2.1 `phosphate-coating-weight` -- Phosphate Conversion Coating Weight

```
the method       weigh the coated panel, strip the coating in the prescribed
                 solution, weigh again; the difference is the coating
coating weight   mg per sq ft = mass lost in mg / coated area in sq ft
the area         BOTH faces of a flat panel, plus the edges where they matter --
                 a 4 x 6 in panel is 48 sq in, not 24
typical ranges   zinc phosphate for a paint base runs roughly 150 to 300 mg/sq ft;
                 iron phosphate roughly 30 to 80
metric           g/m^2 = mg/sq ft x 10.7639 / 1,000
what it controls coating weight is the specification's proxy for coverage and
                 crystal structure; too light gives poor paint adhesion and
                 corrosion resistance, too heavy gives a friable coating that
                 fails in the paint film
the strip        must remove the coating and not the substrate; the solution is
                 specific to the coating and the base metal
```

Coating weight is a proxy and it is worth being clear about what it is a proxy for. What actually matters is
that the conversion coating covers the surface completely with a crystal structure fine enough to key the paint
and to resist undercutting corrosion. None of that is weighable directly, so the specification asks for a mass
per unit area, which correlates with coverage well enough to control a running line and says nothing about
crystal size or uniformity on its own.

Both failure directions are real and they look different. A light coating leaves bare or thinly covered areas
where paint adhesion and corrosion resistance both fail, and it shows up as blistering or filiform corrosion in
service. A heavy coating is coarse and friable, and it fails within itself under the paint film -- the paint is
well adhered to a layer that is not well adhered to the metal. That is why specifications state a range rather
than a minimum.

The strip solution is the part that quietly invalidates results. It has to dissolve the coating and leave the
substrate alone, which makes it specific to both -- a solution correct for zinc phosphate on steel will attack
a different base metal, and one that takes metal along with the coating reports a coating weight that is partly
substrate. A result that seems too high for the process is worth checking against the strip before it is
believed.

**Inputs:** the panel dimensions or coated area, whether one or both faces are coated, the mass before and after stripping, and the specification range for the coating type

**Outputs:** the coated area on one and on both faces, the mass lost, the coating weight in milligrams per square foot and grams per square metre, whether it falls within the specification range, and the value a one-sided area would have produced

## 3. Worked example

A 4 by 6 in panel, coated on both faces, weighed before and after stripping:

```
area, one face  = 4 x 6 / 144 = 0.1667 sq ft
area, both      = 0.3333 sq ft
before          = 45.6820 g
after           = 45.6470 g
mass lost       = 0.0350 g = 35.0 mg
coating weight  = 35.0 / 0.3333 = 105 mg/sq ft = 1.13 g/m^2
```

**105 mg/sq ft against a zinc phosphate range of 150 to 300.** The coating **FAILS the minimum** by
45 mg/sq ft -- a light coating, the kind that gives poor paint adhesion and corrosion resistance in
service.

**Now make the single most common error in the test:**

```
coating weight = 35.0 / 0.1667 = 210 mg/sq ft
```

**210 mg/sq ft -- exactly double, and comfortably inside the 150 to 300 specification.** The panel that
fails becomes a panel that passes, from dividing by one face of a two-faced panel. **The measurement was
correct, the balance was correct, and the area was wrong by a factor of two.**

**Note also that 105 mg/sq ft is well above the iron phosphate range of 30 to 80**, so the result is not
simply a light coating of a different type -- it sits between the two, which is the signature of a zinc
phosphate bath running short of coating weight rather than of a misidentified process.

**And the strip solution is the other place a result goes wrong.** It must dissolve the coating and leave the
substrate untouched. **A solution that takes metal with the coating reports a coating weight that is partly
base metal**, which is worth suspecting whenever a result comes back higher than the process can plausibly
produce.

## 4. Scope and non-goals

A measurement calculation. The stripping procedure, the solution, the time, and the temperature are prescribed by the applicable test method for the specific coating and substrate, and a result obtained by any other means is not comparable -- ASTM and the coating supplier both publish methods, and using the wrong one produces a number that looks like a coating weight and is not. Specification ranges are entered and are set by the coating supplier and the paint system that follows; they vary substantially with the process, the substrate, and the intended finish, and the ranges quoted here are typical rather than authoritative. It does not assess what coating weight is a proxy for: coverage, crystal size and uniformity, and the absence of bare or flash-rusted areas are evaluated by microscopy and by performance testing, and a correct coating weight does not guarantee any of them. It does not address bath control, the cleaning and rinsing stages that decide whether a conversion coating forms at all, the seal or final rinse, or the drying and the window before painting. It does not evaluate paint adhesion or corrosion performance, which are tested directly. The applicable ASTM test method, the coating supplier's specification, and the paint system requirements govern.
