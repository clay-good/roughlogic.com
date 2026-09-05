# roughlogic.com Specification v1614 -- Subgrade CBR to Aggregate Base Thickness (`calc-civil.js`, Group E Carpentry and Construction, traffic control, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-civil.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; traffic, work zone, and pavement), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Aggregate thickness over a soft subgrade is set by how weak the subgrade is, and CBR is the field measure that says so. It is the number that decides whether a haul road needs six inches of rock or eighteen, and getting it wrong costs either money or a road that pumps.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a CBR at or below zero, a non-positive wheel load, or a thickness at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the CBR cover relationship and the resilient modulus correlation with the agency design manual named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`cbr aggregate thickness`, `subgrade cbr cover`, `haul road rock thickness`, `geogrid thickness reduction`, `resilient modulus from cbr`.

## 2. The tile

### 2.1 `subgrade-cbr-thickness` -- Subgrade CBR to Aggregate Base Thickness

```
CBR             the California Bearing Ratio, percent, from a field or lab test
cover curves    empirical charts give required aggregate thickness by CBR and wheel load
subgrade modulus Mr (psi) is roughly 1,500 x CBR for fine-grained soils
                (a widely used correlation, valid over a limited CBR range)
geosynthetic    a geogrid or geotextile reduces the required thickness materially,
                by improving load spreading and preventing aggregate loss into the subgrade
rule of thumb   below CBR 3 the subgrade needs improvement, not just more rock
```

CBR is a strength index and the required cover falls steeply as it rises -- the difference between a CBR 3 and a
CBR 8 subgrade is the difference between a working platform and a problem. Because the relationship is nonlinear,
measuring the subgrade rather than assuming it is worth a great deal: assuming CBR 5 on ground that tests at 2
produces a section that pumps and rutted before the first winter.

The 1,500 x CBR correlation to resilient modulus is the bridge to pavement design (`pavement-structural-number`),
and it is worth knowing its limits: it is reasonable for fine-grained soils in the low CBR range and drifts badly
above about CBR 10, where direct modulus testing is the better basis.

Geosynthetics are the intervention that changes the arithmetic most. A geogrid at the subgrade interface can cut
required aggregate thickness substantially, and on very soft ground a separation geotextile is what stops the
rock from disappearing into the subgrade over the first season -- which is a failure mechanism that has nothing to
do with the thickness chosen.

Below about CBR 3 the honest answer is that more rock is not the fix. Undercut and replace, chemical
stabilization, or a designed working platform is, and adding thickness to very soft ground buys less than the
chart suggests.

**Inputs:** subgrade CBR, wheel load and tire pressure, the number of load repetitions, the aggregate quality, and whether a geosynthetic is used

**Outputs:** the required aggregate thickness from the cover relation, the equivalent subgrade resilient modulus, the thickness with a stated geosynthetic reduction, the thickness at an alternative CBR to show the sensitivity, and a subgrade improvement flag below the practical CBR limit

## 3. Worked example

A subgrade tested at CBR 6 under a construction haul road:

```
resilient modulus ~ 1,500 x 6 = 9,000 psi
```

The cover charts for a typical construction wheel load put the required aggregate somewhere in the range of 12 to
18 in for CBR 6, depending on repetitions and aggregate quality.

Now the sensitivity that argues for testing rather than assuming. At CBR 3 the same charts call for roughly twice
that thickness; at CBR 10 they call for roughly half. **A factor of four in rock quantity across a CBR range that
a proof roll cannot distinguish by eye** -- which is why a DCP or a plate test at a few locations pays for itself
on any job of size.

Geosynthetic: a geogrid at the interface commonly permits a 30 to 50% thickness reduction at low CBR. On a
16 in section that is 5 to 8 in of rock across the whole road, which on a large site is a very large number.

And the honest limit: at CBR 2 the calculation still returns a thickness, but the subgrade will deform under
construction traffic regardless, aggregate will punch into it, and the road will not hold. That is an undercut,
stabilization, or working-platform problem, and the tile flags it rather than returning a number that implies
rock alone will work.

## 4. Scope and non-goals

A screening estimate from empirical cover relationships. Cover charts differ between agencies and between the
construction-platform and pavement-design cases, and the tile does not ship one -- the applicable chart or method
must be used. CBR itself is a crude index: it is sensitive to moisture content and compaction at the time of
testing, a subgrade tested dry in summer can be far weaker in spring, and the design value should reflect the
worst credible condition rather than the tested one. The 1,500 x CBR modulus correlation is approximate and
degrades outside the low CBR range. It does not design a pavement (`pavement-structural-number`), address
drainage, which controls subgrade strength more than anything else, or evaluate frost susceptibility and frost
depth. Geosynthetic reductions must come from the manufacturer's design method and the applicable specification.
The geotechnical investigation, the agency's design manual, and the geotechnical engineer govern.
