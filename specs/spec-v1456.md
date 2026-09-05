# roughlogic.com Specification v1456 -- Guy Anchor Holding Capacity in Soil (`calc-lineworker.js`, Group A Electrical, line work, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lineworker.js`**
> (Group A, Electrical -- the existing category, hub `/groups/electrical/`; overhead line and distribution), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** `guy-wire-tension` gives the pull in the guy. Nothing says whether the ground will hold it. An anchor that pulls is the failure mode that takes the pole with it, and the holding capacity is a bearing calculation over the helix or plate area at its depth -- with a soil class the installer has to name.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive helix or plate area, depth, unit weight, or factor of safety, or a negative cohesion returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the tension bearing-capacity relation and the screw-anchor torque correlation as standard practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`guy anchor capacity`, `screw anchor holding`, `anchor pull out capacity`, `installing torque anchor`, `anchor factor of safety`.

## 2. The tile

### 2.1 `guy-anchor-holding-capacity` -- Guy Anchor Holding Capacity in Soil

```
cohesive soil    Q_u = A_h ( 9 c + gamma D )
granular soil    Q_u = A_h ( gamma D N_q )
allowable        Q_a = Q_u / FS
installing torque check   Q_u ~ K_t x T   (screw anchors, K_t by shaft size)
```

An anchor in tension fails by pulling a cone or cylinder of soil up with it, and for an anchor deep relative
to its bearing area the capacity is a bearing-capacity problem turned upside down: the helix or plate area times
the strength the soil can mobilize at that depth. In clay that strength is dominated by cohesion and the depth
term is small; in sand there is no cohesion at all and the whole capacity comes from overburden times a bearing
factor that climbs steeply with friction angle. Same anchor, same depth, four-to-one difference in what it holds.

For power-installed screw anchors there is a second, better number: installing torque. The torque the machine
reads at final depth correlates strongly with capacity through an empirical factor set by shaft size, and it has
the enormous advantage of measuring the soil that is actually there rather than the soil someone guessed at. The
tile reports both, and where they disagree by a wide margin that disagreement is the finding.

**Inputs:** helix or plate diameter, installed depth, soil type with cohesion or friction angle, soil unit weight, factor of safety, and optionally the installing torque and shaft torque factor

**Outputs:** the ultimate holding capacity, the allowable capacity at the entered factor of safety, the torque-correlated capacity where a torque is given, the ratio between the two methods, and the margin against an entered guy tension

## 3. Worked example

A 12 in power-installed screw anchor (0.785 sq ft of helix) at 7 ft in a stiff clay, cohesion 1,000 psf,
unit weight 110 pcf, at a factor of safety of 2:

```
Q_u = 0.785 x ( 9 x 1,000 + 110 x 7 )
    = 0.785 x ( 9,000 + 770 ) = 0.785 x 9,770 = 7,673 lb
Q_a = 7,673 / 2 = 3,837 lb
```

3,837 lb allowable. The worked example in `guy-wire-tension` puts 707 lb in a 45-degree guy resisting a 500 lb
load, so this anchor is not close to its limit there -- but the same anchor in a loose sand with no cohesion holds
`0.785 x 110 x 7 x N_q`, which at `N_q` = 10 is only 6,048 lb ultimate and 3,024 lb allowable.
The soil, not the hardware, is the variable.

## 4. Scope and non-goals

A single-helix or plate anchor in uniform soil, loaded in axial tension along the shaft. It does not handle
multi-helix anchors, where the spacing decides whether the helices act individually or as a single cylinder; it
does not handle rock anchors, grouted anchors, or expanding anchors set in disturbed backfill; and it does not
check the shaft in tension or the eye and rod hardware, which are rated items. Group effects between nearby
anchors and the reduction for an anchor loaded off the shaft axis are not modeled. Soil parameters entered from
a boring log are worth far more than soil parameters entered from a table, and neither substitutes for a proof
test. The geotechnical report, the anchor manufacturer's rating and torque correlation, and the utility's
construction standard govern.
