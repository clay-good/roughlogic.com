# roughlogic.com Specification v1911 -- Wood Structural Panel Opening Protection Takeoff (`calc-floodfight.js`, Group E Carpentry and Construction, storm damage, 1 New Tile)

> **Status: LANDED 2026-09-30 (proposed 2026-09-25). Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-floodfight.js`**
> (Group E Carpentry and Construction, hub `/groups/construction/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** Before a hurricane every hardware store sells out of plywood, and the IRC's exception for wood structural panel opening protection sets the rules: minimum thickness, maximum span, fastening at the two ends by a schedule tied to the span. `sheathing-takeoff` counts panels and nails by area; no tile sizes a board-up panel for an opening or counts its fasteners.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive opening dimension, overlap, or fastener spacing returns `{ error }`; a panel thickness below 7/16 in, or a span above 8 ft, returns `{ error }` with the code limit; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): IRC Section R301.2.1.2 and its exception (wood structural panels at least 7/16 in thick, spanning not more than 8 ft, precut, predrilled, and attached to the framing around the opening) and Table R301.2.1.2 (fastening schedule, limited in the 2018 edition to a mean roof height of 45 ft and Vult of 180 mph), cited by section and NOT reproduced -- the fastener spacing is a USER INPUT read from the adopted edition's table -- named as governing with the AHJ, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`plywood hurricane shutters`, `board up windows plywood`, `hurricane window protection plywood size`, `storm panel screws`, `how much plywood to board up house`.

## 2. The tile

### 2.1 `storm-panel-plywood` -- Wood Structural Panel Opening Protection Takeoff

```
panel         width = opening width + 2 x overlap; height = opening height +
              2 x overlap (overlap onto the framing surrounding the opening)
span          the dimension between the two fastened edges; must be <= 8 ft
thickness     >= 7/16 in wood structural panel
sheets        panels nested onto 4 x 8 ft sheets (a panel over 4 x 8 needs a
              splice the exception does not provide for -- flagged)
fasteners     along each fastened edge: ceil((edge length - 2 x edge
              distance) / spacing) + 1, at both ends -> x 2
spacing       from IRC Table R301.2.1.2 for the fastener type and the panel
              span, entered by the user; the tile records which row was used
```

Board-up protection works only if the panel reaches the framing and the fasteners hold it there. The IRC exception
permits wood structural panels -- plywood or OSB -- at least 7/16 inch thick and spanning no more than 8 feet, attached
to the framing that surrounds the opening. The panel is the opening plus an overlap on every side, and the span is the
distance between the two edges that are fastened, because the schedule fastens a panel at its opposing ends and lets
it span between them.

The fastener spacing tightens as the span grows, and the table that gives it is ICC text, so the tile asks for the
spacing rather than reproducing the schedule. It then counts the fasteners on each fastened edge and doubles the
count, and it counts sheets by nesting panels onto 4 x 8 stock -- the number that matters on the morning the stores run
out. Orienting a panel so that its shorter dimension is the span usually puts it in a lighter row of the table and cuts
the fastener count.

The table is valid only within its limits, which the tile repeats: in the 2018 IRC, buildings with a mean roof height
of 45 feet or less and an ultimate design wind speed of 180 mph or less. Earlier editions used a lower height limit,
which is why the adopted edition matters.

**Inputs:** each opening's width and height, the overlap onto the framing, the panel thickness, the edges to be fastened (which sets the span), the fastener type, the fastener spacing from the adopted table for that span, and the edge distance

**Outputs:** each panel's dimensions and span, the span and thickness checks, the fasteners per edge and per panel, the sheet count, and the totals across openings

## 3. Worked example

A 36 x 60 in window with 4 in of overlap on every side, 7/16 in OSB, fastened along the long sides with #8 wood-screw
anchors at the 16 in spacing the adopted table gives for spans up to 4 ft, 1 in edge distance:

```
panel       (36 + 8) x (60 + 8) = 44 x 68 in, 1 sheet
span        44 in = 3.67 ft between the fastened 68 in edges (<= 8 ft)
per edge    ceil((68 - 2) / 16) + 1 = 5 + 1 = 6
per panel   2 x 6 = 12 fasteners
```

**One sheet and 12 anchors for the window.**

**Fastening the short 44 in edges instead** makes the span 68 in = 5.67 ft, which moves the panel into the table's
4-6 ft row and a closer spacing, and the panel now spans the long way -- **the usual reason to fasten the long sides.**

## 4. Scope and non-goals

A takeoff for board-up panels under the IRC wood structural panel exception. It does not reproduce the fastening schedule, check the framing or the anchors' embedment, design panels for buildings outside the table's limits, address doors, garage doors, or skylights, or replace tested opening protection products where the code requires them. It does not determine whether a building is in a windborne debris region. The adopted IRC, its Table R301.2.1.2, and the AHJ govern.
