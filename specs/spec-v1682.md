# roughlogic.com Specification v1682 -- Metal Roof Thermal Movement and Sliding Clip Range (`calc-metalair.js`, Group E Carpentry and Construction, sheet metal, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-metalair.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; sheet metal and architectural metal), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A long metal roof panel grows and shrinks a surprising amount between a winter night and a summer afternoon, and if the clips and the details do not let it move, something tears. The movement is a straightforward thermal expansion and it is why sliding clips exist.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive panel length or coefficient of expansion, or a temperature range at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the thermal expansion relation with the panel manufacturer clip travel ratings named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`metal roof thermal movement`, `panel expansion sliding clip`, `standing seam expansion`, `clip travel required`, `metal panel oil canning movement`.

## 2. The tile

### 2.1 `metal-roof-thermal-movement` -- Metal Roof Thermal Movement and Sliding Clip Range

```
movement          dL = alpha x L x dT
alpha             steel about 6.5e-6/degF, aluminium about 12.8e-6, copper 9.8e-6
temperature range the PANEL range, not the air range: a dark roof in sun reaches
                  well above ambient, and a clear winter night radiates below it
                  a 140 to 180 degF panel swing is ordinary
fixed point       each panel is fixed at one location and moves away from it
clip travel       sliding clips must have travel exceeding the movement to the far end
consequence       insufficient travel tears clips, elongates fastener holes, and oil-cans
```

The panel temperature range is much wider than the air temperature range and that is what makes the movement
large. A dark standing seam panel in summer sun reaches well above ambient, and on a clear winter night it
radiates to the sky and goes below it -- so a design based on the local air temperature range understates the
movement substantially. A 140 to 180 degF panel swing is ordinary in most of the country.

The fixed point determines where the movement goes. Each panel is anchored at one location -- eave, ridge, or a
point in between -- and expands away from it, so the movement at the far end is the full expansion of the whole
panel length. A panel fixed at the middle halves the movement at each end, which on very long panels is the only
way to keep the clip travel within range.

The failure is progressive rather than sudden. Clips at the ends of long panels reach the limit of their travel,
then the movement goes into the clip itself, then into the fastener holes, and the roof gradually loses its
attachment and starts to oil-can and leak at the details. It looks like poor workmanship years after
installation and it is a movement allowance that was never there.

**Inputs:** panel length, the panel material and its coefficient of thermal expansion, the panel temperature range, the fixed point location, and the clip rated travel

**Outputs:** the total movement over the entered temperature range, the movement at each end from the fixed point, the clip travel required, the margin against the clip rating, the maximum panel length the clip travel supports, and the effect of relocating the fixed point

## 3. Worked example

A 120 ft aluminium standing seam panel (alpha 1.28e-05/degF) over a 140 degF panel temperature swing:

```
dL = 1.28e-05 x 120 x 12 x 140 = 2.580 in
```

**2.58 inches of movement** on one panel. Fixed at the eave, the ridge end moves the full
2.58 in and the clips near it must have that much travel.

Fix it at the middle instead:

```
movement at each end = 1.290 in
```

Half, which may bring it inside a clip's rated travel where the eave-fixed arrangement does not.

**Steel for comparison**, on the same panel:

```
dL = 6.5e-6 x 120 x 12 x 140 = 1.310 in
```

Roughly half the aluminium figure, because steel's coefficient is about half -- which is why aluminium roofs are
more sensitive to length and detailing than steel ones.

The temperature range is the input people get wrong. Using a 100 degF air temperature range instead of the
140 degF panel range gives `1.28e-05 x 120 x 12 x 100` = 1.84 in, understating the movement by
0.74 in -- and a clip selected on that basis runs out of travel in the first hot summer.

## 4. Scope and non-goals

A thermal expansion calculation. The panel temperature range must reflect the panel's own extremes including
solar gain and night sky radiation, not the local air temperature range, and it depends on colour, finish, and
orientation. It does not select clips or determine their rated travel, which is a manufacturer value for the
specific clip and must exceed the calculated movement with margin. It does not address the movement provisions
required at eaves, ridges, hips, valleys, penetrations, and terminations, which are detailing matters where the
movement actually has to be accommodated, or the panel-to-panel and panel-to-flashing joints. It does not address
oil-canning, which has causes beyond thermal movement, or the uplift attachment (`standing-seam-takeoff`) that
the same clips provide. The panel and clip manufacturer's installation instructions and tested assemblies, and
the project specification, govern.
