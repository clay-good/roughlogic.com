# roughlogic.com Specification v1519 -- Highwall Bench Width and Overall Slope Angle (`calc-mining.js`, Group E Carpentry and Construction, quarry and aggregate, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mining.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; mining, quarry, and drill-and-blast), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A highwall's overall slope angle is not the face angle -- benches flatten it, and the difference between the two is what stability, catchment, and the regulator all care about. The geometry is one arctangent and it is the number a pit plan lives or dies on.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive bench height, bench width, or face angle, or a face angle at or beyond ninety degrees returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the bench geometry relations and the catch-bench concept with MSHA ground control and the Ritchie criterion named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`highwall overall slope angle`, `bench geometry pit`, `inter ramp angle`, `catch bench width`, `face angle vs overall angle`.

## 2. The tile

### 2.1 `highwall-bench-geometry` -- Highwall Bench Width and Overall Slope Angle

```
face angle       the angle of an individual bench face
overall angle    OA = atan( H_total / horizontal run )
horizontal run   per bench = H_bench / tan(face angle) + bench width
inter-ramp       the overall angle between ramps, excluding the ramps themselves
catchment        bench width must retain rockfall; the Ritchie criterion and its successors
```

Stack benches and the wall gets flatter overall even though every face is steep. Each bench contributes its own
horizontal setback -- the face's own run plus the bench width -- and the overall angle is the total height over
the total run. Widening benches by a few feet each flattens the whole wall measurably, which costs stripping and
buys stability and catchment.

Bench width does two jobs and they are worth separating. Geometrically it sets the overall angle, which is what
the slope stability analysis evaluates. Operationally it is the catch bench that has to stop rock falling from
above from reaching people and equipment below, and that requirement -- the Ritchie criterion and the modern work
that has refined it -- often demands a wider bench than the stability analysis alone would. A bench too narrow to
catch anything is a bench that only exists on the plan.

**Inputs:** bench height, bench width, individual face angle, the number of benches, and the ramp width and frequency where inter-ramp angle is wanted

**Outputs:** the horizontal run per bench, the overall slope angle, the inter-ramp angle, the total wall height and run, the bench width required for a target overall angle, and the overall angle if a stated number of benches is left unmined

## 3. Worked example

A highwall in 40 ft benches with 30 ft catch benches, each face cut at 65 degrees:

```
run per bench = 40 / tan(65) + 30 = 18.7 + 30 = 48.7 ft
overall angle = atan(40 / 48.7)     = 39.4 degrees
```

Faces at 65 degrees, wall at **39.4 degrees overall** -- a 26 degree difference, entirely from the
benches. That is the number a slope stability analysis evaluates, and quoting the face angle to a regulator or an
engineer instead of the overall angle understates the wall substantially.

The lever runs both ways. Narrow the benches to 20 ft and the overall angle steepens to
46.0 degrees -- more ore recovered, less catchment, and a
steeper wall to justify. Widen to 40 ft and it flattens to
34.3 degrees. Ten feet of bench width is worth about
7 degrees of overall angle here.

## 4. Scope and non-goals

Slope geometry only. It says nothing about whether the wall is STABLE, which depends on rock mass strength,
discontinuity orientation and persistence, groundwater pressure, blast damage to the face, and the failure mode
that geometry permits -- planar, wedge, toppling, or circular. A geometrically modest wall in adversely oriented
jointing can be far more dangerous than a steep one in massive rock, and only a slope stability analysis by a
qualified engineer distinguishes them. It does not evaluate catch bench effectiveness against rockfall, which
needs the Ritchie criterion or a rockfall simulation and depends on bench face condition as much as width. It
does not address ramp design, drainage, scaling, monitoring, or the ground control plan. MSHA ground control
requirements, the site's ground control plan, and a qualified geotechnical engineer govern.
