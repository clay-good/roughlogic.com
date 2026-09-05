# roughlogic.com Specification v1586 -- Sawmill Residue and Sawdust Yield (`calc-sawmill.js`, Group L Agriculture and Forestry, sawmill, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-sawmill.js`**
> (Group L, Agriculture and Forestry -- the existing category, hub `/groups/agriculture/`; sawmill and forest products), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** About half a log does not become lumber, and where that half goes decides whether a mill has a revenue stream or a disposal cost. Sawdust, chips, bark, and trim each have different markets and different volumes, and the split comes off the recovery figure.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive log volume, kerf, or board thickness, or a lumber volume exceeding the log volume returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the kerf sawdust relation and typical residue proportions with NFPA 664 named for the dust hazard, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`sawmill residue yield`, `sawdust percentage kerf`, `chip production sawmill`, `mill residue tonnage`, `hog fuel yield`.

## 2. The tile

### 2.1 `sawmill-residue-yield` -- Sawmill Residue and Sawdust Yield

```
residue fraction  1 - (lumber volume / log volume)
sawdust           from kerf: kerf width / (kerf + board thickness) of each cut
chips             slabs and edgings, chipped; the largest residue stream by volume
bark              roughly 10 to 15% of log volume, species dependent
trim and shavings small volumes, planer shavings from a dry mill
bulk density      residues are sold by the ton or the unit; bulking factors differ widely
```

The kerf share is directly computable and it is the one a mill can change. Every cut turns a kerf-width slice of
log into sawdust, so the sawdust fraction of any cut is kerf over kerf-plus-board-thickness -- which means thin
stock makes proportionally far more sawdust than thick, and a wide kerf on thin stock is where wood disappears.
Going from a 0.180 in to a 0.125 in kerf on 1 in boards takes the sawdust share from 15.3% to 11.1% of the wood
cut, and every point of that is lumber instead.

Chips are the larger stream and the more valuable one where a pulp or panel market exists. That market's
requirements -- size distribution, bark content, and moisture -- determine whether slabs are worth chipping or
whether they are fuel, and the difference in revenue per ton is large.

Bark is nearly always a cost or a low-value product, and it is the reason debarking exists: bark in the chip
stream downgrades the whole load. A mill with no chip market treats all of it as hog fuel, which has value only
if there is a boiler or a buyer within a short haul.

**Inputs:** log volume, lumber volume recovered, kerf width and average board thickness, bark fraction, and the bulk densities for each residue stream

**Outputs:** the sawdust fraction from kerf, the total residue fraction, the volume and tonnage of sawdust, chips, and bark, the residue per thousand board feet of lumber, and the lumber gained by a stated kerf reduction

## 3. Worked example

A mill cutting 1 in boards with a 0.180 in kerf:

```
sawdust share of wood cut = 0.180 / (0.180 + 1.000) = 15.3%
```

Now a thin-kerf band at 0.125 in:

```
sawdust share = 0.125 / (0.125 + 1.000) = 11.1%
```

**4.2 percentage points of the log** moves from sawdust to lumber. On a mill cutting 10 million board feet a
year that is on the order of 400,000 board feet of additional lumber from the same logs, which is a far larger
number than the saw upgrade costs.

The same arithmetic on 2 in stock: 0.180 kerf gives `0.180 / 2.180` = 8.3% and thin kerf gives 5.9% -- so the
thin-kerf benefit is roughly half as large on thick stock. A mill cutting mostly timbers has less to gain from
kerf than a mill cutting boards, which is worth knowing before the capital request.

Total residue: a mill at 55% lumber recovery sends 45% of the log to residue, of which bark is perhaps 12
points, sawdust the kerf share above, and chips the remainder -- the largest stream and the one with a market.

## 4. Scope and non-goals

A volume split from recovery and kerf figures the user supplies. Residue proportions vary widely with log
size and quality, product mix, and equipment, and the bark fraction is species dependent. Bulk densities for
sawdust, chips, and bark differ substantially and change with moisture content, so volume-to-tonnage conversions
must use the mill's own measured figures rather than table values if the result is going to a scale ticket. It
does not evaluate chip quality against a mill specification -- size distribution, fines, overs, and bark content
determine whether chips are saleable at all -- or address the moisture content that pulp and fuel buyers pay on.
It does not address dust collection, combustible dust hazards (`dust-deflagration-vent-area`), or the fire and
housekeeping requirements that residue handling carries. The residue buyers' specifications, the mill's own scale
records, and NFPA 664 for wood processing dust hazards govern.
