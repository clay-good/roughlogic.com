# roughlogic.com Specification v1681 -- Standing Seam Metal Panel and Clip Takeoff (`calc-metalair.js`, Group E Carpentry and Construction, sheet metal, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-metalair.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; sheet metal and architectural metal), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A standing seam roof is panels, clips, and fasteners, and the panel count comes off the coverage width rather than the panel width. Ordering on the sheet width buys a roof that is short by the width of every seam.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive building width, panel coverage, run length, or clip spacing returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the coverage width takeoff and zone-based clip spacing with ASCE 7 and the manufacturer tested assembly named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`standing seam panel count`, `metal roof clip count`, `panel coverage width takeoff`, `standing seam fastener quantity`, `metal roof material list`.

## 2. The tile

### 2.1 `standing-seam-takeoff` -- Standing Seam Metal Panel and Clip Takeoff

```
panel count       n = building width / coverage width, rounded up
coverage width    the net width each panel adds; the sheet is wider by the seam
clip count        per panel: length / clip spacing, plus one
                  clip spacing is set by the wind uplift requirement, not by convenience
fasteners         per clip, from the manufacturer's tested assembly
panel length      run length plus eave and ridge allowances
waste             end laps, hips, valleys, and cut panels at rakes
```

Coverage width is the number that matters and it is not the panel width. A 16 inch coverage panel is cut from a
wider sheet and the difference goes into the seam, so a 40 ft wide building takes `40 x 12 / 16` = 30 panels of
16 inch coverage regardless of what the flat sheet measures. Ordering on the sheet width is the mistake, and on a
long roof it is several panels short.

Clip spacing is a structural output rather than an installer's choice. The clips are what hold the roof down
against wind uplift, and their spacing comes from the tested assembly's rated uplift resistance against the
design pressure for the roof zone -- with corners and edges requiring much closer spacing than the field. A roof
clipped at a uniform field spacing throughout is under-attached exactly where uplift is worst, and that is the
failure pattern after wind events.

The panel length allowance is where a takeoff goes wrong in the other direction. Standing seam panels expand and
contract, and the eave and ridge details have to accommodate it (`metal-roof-thermal-movement`), so panel length
includes allowances that a bare run measurement does not.

**Inputs:** building width and run length, panel coverage width, clip spacing in the field and at edges and corners, fasteners per clip, the eave and ridge allowances, and the hip, valley, and rake conditions

**Outputs:** the panel count, the panel length with allowances, the total linear feet of panel, the clip count by zone, the fastener count, the seam length, and the material with a stated waste allowance

## 3. Worked example

A building 42 ft wide with 16 in coverage panels:

```
panel count = 42 x 12 / 16 = 31.5 -> 32 panels
```

32 panels. **If the flat sheet is 18 in wide** and someone orders on that,
`42 x 12 / 18` = 28.0 -> 28 panels, and the roof is
4 panels short with the last one landing well before the rake.

Clips on a 30 ft run at 24 in field spacing:

```
per panel = 30 x 12 / 24 + 1 = 16 clips
total     = 32 x 16 = 512 clips
```

**And that is the field spacing.** In the corner and edge zones the design uplift is much higher and the clip
spacing tightens -- often to half the field spacing or less. A takeoff at uniform 24 in spacing buys the right
total for the field and leaves the perimeter under-attached, which is where roofs come off.

The correct takeoff prices three zones at three spacings, from the design uplift pressures for the roof and the
tested uplift resistance of the specific panel and clip assembly -- which is a manufacturer number, not a
generic one.

## 4. Scope and non-goals

A quantity takeoff. It does not determine clip spacing, which comes from the design wind uplift pressures for
each roof zone under ASCE 7 and the tested uplift resistance of the specific panel, clip, and deck assembly --
manufacturer tested assemblies, not generic spacings, govern, and the corner and edge zones require closer
spacing than the field. It does not address the substrate, deck attachment, or the structural capacity of the
purlins or deck to accept the uplift, which is frequently the weak link. It does not address thermal movement
(`metal-roof-thermal-movement`), which constrains panel length and detailing, or the flashing, trim, closures,
and penetration details that are most of the labour and most of the leaks. It does not address panel gauge,
finish, or the substrate compatibility that prevents galvanic corrosion. ASCE 7 for the loads, the panel
manufacturer's tested assemblies and installation instructions, and the project specification govern.
