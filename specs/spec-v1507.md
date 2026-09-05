# roughlogic.com Specification v1507 -- Blasting Powder Factor and Explosive Load per Hole (`calc-mining.js`, Group E Carpentry and Construction, blasting, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mining.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; mining, quarry, and drill-and-blast), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Powder factor -- pounds of explosive per ton or per cubic yard of rock -- is the number a blaster lives by. Too low and the muck pile is blocky and the shovel slows; too high and the money goes into flyrock, airblast, and oversize damage to the highwall. Nothing in the catalog computes it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive burden, spacing, bench height, hole diameter, or rock density, or a stemming length that leaves no charge column returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the standard pattern and powder-factor relations with MSHA and the state blasting regulations named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`powder factor blasting`, `explosive per ton rock`, `blast hole charge weight`, `loading density explosive`, `pounds per cubic yard blast`.

## 2. The tile

### 2.1 `blast-powder-factor` -- Blasting Powder Factor and Explosive Load per Hole

```
rock per hole    V = B x S x H / 27          (cu yd), tons = V x density / 2000... per hole
charge length    L_c = H + subdrill - stemming
charge weight    W = L_c x loading density
loading density  lb/ft = (pi/4) d^2 / 144 x 62.4 x SG_explosive     (d in inches)
powder factor    PF = W / tons  (or per cubic yard)
```

The pattern and the hole do the work together. Burden and spacing set how much rock a hole is responsible for;
diameter and explosive density set how much energy is in it. Powder factor is just the ratio, and its value is
that it is comparable across shots, benches, and years in a way that "eight by ten pattern" is not.

The two lengths that do not appear in the pattern matter as much as the ones that do. Subdrilling below grade,
typically a third of the burden, is what keeps the toe from being left high -- a shot that leaves toe costs more
in secondary breakage than the extra drilling ever did. Stemming, typically about 0.7 times the burden, is what
keeps the gases in the hole long enough to break rock instead of venting; short stemming is the direct cause of
flyrock and airblast, and it is checked separately in `blast-stemming-length`.

**Inputs:** burden, spacing, bench height, hole diameter, subdrill and stemming lengths, explosive specific gravity, rock density, and the number of holes

**Outputs:** the loading density in lb/ft, the charge length and weight per hole, the rock volume and tonnage per hole, the powder factor per ton and per cubic yard, the total explosive for the shot, and the charge weight per delay

## 3. Worked example

A 8 ft by 10 ft pattern on a 30 ft bench, 3.5 in holes, ANFO at SG 1.25 loaded to a
2.4 ft subdrill with 5.6 ft of stemming, in 165 pcf rock:

```
loading density = (pi/4)(3.5/12)^2 x 62.4 x 1.25   = 5.21 lb/ft
charge length   = 30 + 2.4 - 5.6                  = 26.8 ft
charge weight   = 26.8 x 5.21                     = 140 lb per hole
rock per hole   = 8 x 10 x 30 x 165 / 2000        = 198 tons
powder factor   = 140 / 198                    = 0.705 lb/ton
```

0.71 lb per ton, which sits in the normal range for medium-hard rock on a production bench. Push the pattern
out to 9 by 11 and the same hole covers 245 tons, dropping the powder factor to
0.570 lb/ton -- cheaper per ton, and the point at which fragmentation starts to suffer and
the loader tells you before the spreadsheet does.

Note the charge weight per hole, 140 lb: that is the number that goes into the scaled-distance check in
`blast-scaled-distance-ppv`, per delay rather than per shot.

## 4. Scope and non-goals

Pattern and charge arithmetic for a vertical production hole with a single continuous column charge. It does
not design a blast. It does not select an explosive, evaluate its suitability for wet holes, handle decked
charges, air decks, or bottom-loaded holes with different products, or account for the hole's angle, which
changes the true burden. It does not predict fragmentation, which is what powder factor is a proxy for and which
depends on rock structure, jointing, and initiation timing far more than on the ratio itself. It does not
evaluate vibration, airblast, or flyrock, which are `blast-scaled-distance-ppv`,
`blast-airblast-overpressure`, and `blast-stemming-length`, and none of those are optional. Blasting is a
licensed activity: the blaster in charge, the state and federal explosives regulations, MSHA or OSHA
jurisdiction, and the site's blast plan govern.
