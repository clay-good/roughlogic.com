# roughlogic.com Specification v1664 -- Weld Visual Acceptance Limits (AWS D1.1) (`calc-inspection.js`, Group E Carpentry and Construction, welding inspection, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-inspection.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; welding inspection and ndt), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Most weld rejections are found by eye, against limits that are specific numbers rather than judgments. Undercut depth, porosity size and accumulation, reinforcement height, and undersize all have acceptance criteria, and having them at the joint is what makes a visual inspection consistent between inspectors.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a negative measured dimension, a non-positive material thickness, or a nominal weld size at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the AWS D1.1 visual acceptance criteria by name including the static and cyclic distinction, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`weld visual acceptance criteria`, `aws d1.1 undercut limit`, `weld porosity acceptance`, `fillet weld undersize tolerance`, `visual weld inspection limits`.

## 2. The tile

### 2.1 `weld-visual-acceptance` -- Weld Visual Acceptance Limits (AWS D1.1)

```
undercut         limits by material thickness and by whether the stress is tensile
                  commonly 1/32 in for thinner material, 1/16 in with a length limit
porosity         maximum individual pore size and maximum accumulation in a length
reinforcement    maximum height of the weld face above the base metal
undersize        fillet leg may be under nominal by a small amount over a limited length
cracks           any crack is rejectable, regardless of size or location
fusion           incomplete fusion and overlap are rejectable
statically vs cyclically loaded  different acceptance criteria apply
```

The criteria differ by loading, and that is the distinction inspectors most often miss. AWS D1.1 gives separate
acceptance criteria for statically loaded and cyclically loaded connections, and the cyclic criteria are tighter
because fatigue cracks initiate at exactly the discontinuities that a static connection tolerates. Applying the
static table to a cyclically loaded member accepts welds that will crack.

The undersize allowance is the one that gets abused. A fillet weld may be under its nominal size by a small
amount over a limited length -- it is a tolerance, not a licence, and the limit on how much length may be
undersize is as binding as the depth. A weld undersize over its whole length is not within tolerance no matter
how small the shortfall.

Cracks are absolute and worth stating separately because they are the one criterion with no dimension. Any crack
is rejectable regardless of length, depth, orientation, or location, and there is no acceptable crack in any
loading condition -- which is why crater cracks at the end of a run, which look trivial, are a rejection.

**Inputs:** material thickness, the nominal weld size, whether the connection is statically or cyclically loaded, and the measured undercut, porosity, reinforcement, and weld size

**Outputs:** each measured discontinuity against its acceptance limit for the entered loading condition, an accept or reject verdict on each, the governing rejection, the undersize length allowance remaining, and the criteria that would apply under the alternative loading condition

## 3. Worked example

A 3/8 in fillet weld on a statically loaded connection in 1/2 in material, inspected:

```
undercut       measured 0.030 in    limit for this thickness -- check the table
porosity       one 1/16 in pore     within the individual size limit
weld size      measured 5/16 in over 3 in of a 20 in weld
crater crack   present at the stop
```

**The crater crack rejects the weld** regardless of everything else. No dimension applies; any crack is
rejectable, and this one is at the location most likely to be dismissed as cosmetic.

The undersize: 1/16 in under nominal over 3 in of a 20 in weld is a tolerance question -- the code allows a
limited undersize over a limited length, and both parts have to be satisfied. The same 1/16 in shortfall over the
full 20 in is not within tolerance.

And the loading distinction: if this were a cyclically loaded connection, the undercut limit tightens and the
porosity criteria change. **The same weld can pass as static and fail as cyclic**, so the inspector needs to know
which the connection is before opening a table -- and on a structure with both, the criteria change between
members.

## 4. Scope and non-goals

A comparison against acceptance criteria the user supplies. The criteria come from the applicable welding code
-- AWS D1.1 for structural steel, D1.2 for aluminium, D1.5 for bridges, ASME Section IX and the construction
codes for pressure work -- and they differ between codes, between editions, and between statically and cyclically
loaded connections; this tile does not ship them and the governing code's tables must be used. Visual inspection
is only one method and it finds only surface discontinuities: incomplete penetration, internal porosity, slag,
and subsurface cracks require volumetric methods (`ut-velocity-calibration`, `radiographic-exposure-sfd`), and a
weld passing visual inspection is not a weld known to be sound. It does not address weld procedure qualification,
welder qualification, or the inspection required by the contract documents. Weld inspection is performed by
qualified personnel: the applicable welding code, the project specification, and a certified welding inspector
govern.
