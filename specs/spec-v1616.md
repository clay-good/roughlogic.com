# roughlogic.com Specification v1616 -- Chip Seal Aggregate and Emulsion Application Rate (`calc-civil.js`, Group E Carpentry and Construction, traffic control, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-civil.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; traffic, work zone, and pavement), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A chip seal fails in one of two ways: too little binder and the chips sweep off, too much and the road bleeds. The application rates come from the aggregate's own properties -- its size and how loosely it packs -- and a rate carried over from last year's different stone is the usual cause of both failures.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive average least dimension, loose unit weight, or binder rate, or a voids fraction outside zero to one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the McLeod chip seal design relations with the agency specification named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`chip seal application rate`, `mcleod design chip seal`, `binder rate gallons per square yard`, `aggregate spread rate seal coat`, `chip seal bleeding sweeping`.

## 2. The tile

### 2.1 `chip-seal-rate` -- Chip Seal Aggregate and Emulsion Application Rate

```
aggregate rate    from the average least dimension and the loose unit weight
                  spread to a one-stone-thick mat: lb/sq yd from ALD and voids
binder rate       B = 0.4 x ALD x E x V + S + A      (McLeod, gal/sq yd)
                  E the wastage factor, V the voids, S surface absorption, A traffic factor
embedment         the design target is roughly 70% of the stone embedded after rolling
                  and traffic; 50% immediately after construction
consequence       under-embedded stone sweeps; over-embedded bleeds
```

The design revolves around embedment depth, and the aggregate's average least dimension is what sets it -- not
its nominal size. A chip that lies flat presents its least dimension to the binder, and a well-graded single-size
chip is what makes a seal work; a graded aggregate with fines fills the voids, changes the embedment, and is the
reason chip seal specifications are so particular about gradation and cleanliness.

Both failure modes come from the same number missed in opposite directions. Too little binder and the stone is
held by less than half its depth, traffic sweeps it, and the result is windshield damage and a bare road. Too
much and the binder rises through the mat in hot weather, the surface bleeds, and it becomes slick -- a safety
problem that is much harder to fix than a sweep.

The traffic and absorption corrections are what adapt the rate to the site. A porous, oxidized old surface
absorbs binder and needs more; a heavily trafficked road embeds the stone further and needs less. Applying a
single rate across a project with both conditions produces one section that sweeps and another that bleeds.

**Inputs:** aggregate average least dimension, loose unit weight and voids, the wastage factor, existing surface condition for absorption, traffic level, and the binder type and residual content

**Outputs:** the aggregate spread rate in lb/sq yd, the binder application rate in gal/sq yd, the quantities for the project area, the embedment depth achieved, and the rate adjustment for a stated surface condition or traffic level

## 3. Worked example

A chip seal using aggregate with an average least dimension of 0.25 in, loose unit weight 100 pcf, voids 0.50,
on a moderately absorptive existing surface with medium traffic.

The McLeod binder relation:

```
B = 0.4 x ALD x E x V + S + A
  = 0.4 x 0.25 x 1.05 x 0.50 + 0.03 (absorption) + 0.00 (traffic correction)
  = 0.0525 + 0.03 = 0.083 gal/sq yd of RESIDUAL binder
```

At 67% residual in the emulsion, the emulsion rate is
`0.123` = 0.12 gal/sq yd.

Aggregate at a one-stone mat: roughly `ALD x loose unit weight x (1 - voids) x 3` gives about 25 lb/sq yd
for this stone.

**The sensitivity that matters**: change to a stone with an ALD of 0.35 in -- a modestly larger chip -- and the
binder requirement rises to
`0.4 x 0.35 x 1.05 x 0.50 + 0.03` = 0.103 gal/sq yd residual,
25% more. Running last year's rate on this year's
stone under-embeds it, and the seal sweeps.

On a bare oxidized surface the absorption term rises and the rate goes up again; on a bleeding old seal it goes
down. One rate across both is a project with both failure modes.

## 4. Scope and non-goals

A design-rate calculation using the McLeod method with inputs the user supplies. Aggregate average least
dimension, loose unit weight, and voids must be measured for the actual stockpile; carrying values from a
previous project is the most common cause of failure. Surface condition and traffic corrections are judgment
values from the applicable design guide and differ between agencies. It does not address binder selection and
grade, aggregate cleanliness and gradation, precoating, or the construction variables -- surface preparation,
temperature and moisture limits, spread and roll timing, rolling pattern, sweeping schedule, and traffic control
during cure -- which determine whether a correctly designed seal actually performs. Test strips are standard
practice and supersede a calculated rate. The agency's specification and design guide, the binder supplier, and
the project engineer govern.
