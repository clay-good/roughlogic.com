# roughlogic.com Specification v1912 -- Manufactured Home Diagonal Tie-Down Anchor Count (`calc-floodfight.js`, Group E Carpentry and Construction, storm damage, 1 New Tile)

> **Status: LANDED 2026-09-30 (proposed 2026-09-25). Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-floodfight.js`**
> (Group E Carpentry and Construction, hub `/groups/construction/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** Manufactured homes are the housing most damaged by wind, and the temporary housing units FEMA places after a disaster are installed to the same federal standard. That standard -- 24 CFR 3285 -- tabulates the maximum spacing of diagonal tie-downs by wind zone, floor width, strap height, and frame spacing, and the spacing tightens by more than half from Zone I to Zone II. The catalog has no manufactured-home tile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive home length returns `{ error }`; a table combination the regulation marks N/A returns `{ error }` naming the cell; a wind zone, floor width, strap height, or I-beam spacing outside the tables returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): 24 CFR 3285.402, Tables 1, 2, and 3 (maximum diagonal tie-down strap spacing for Wind Zones I, II, and III) and their notes -- federal regulation, public domain, transcribed -- and 3285.402(a)(2) (ground anchor working load 3,150 lb, ultimate 4,725 lb), named as the rule, the home manufacturer's installation instructions, the installer, and the state administrative agency named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`mobile home tie downs`, `manufactured home anchor spacing`, `how many anchors mobile home`, `hud tie down wind zone`, `fema temporary housing unit anchoring`.

## 2. The tile

### 2.1 `manufactured-home-anchor-count` -- Manufactured Home Diagonal Tie-Down Anchor Count

```
lookup      Table 1 (Zone I), 2 (Zone II), 3 (Zone III) by nominal floor width
            (12/24, 14/28, 16/32 ft), maximum strap height above ground (25,
            33, 46, 67 in), main I-beam spacing (82.5 or 99.5 in), and for
            Zones II and III the near-beam or second-beam method
            -> maximum diagonal strap spacing s
ends        straps within 2 ft of each end of the home (Note 13)
count       per side = ceil((length - 2 x 2 ft) / s) + 1; total = 2 x per side
            (per section for a multi-section home)
vertical    Zone I: vertical straps not required; Zones II and III: a vertical
            tie at every diagonal tie location
basis       3,150 lb working load per anchor (Note 13); a lower working load
            requires closer spacing (Note 11)
limits      90 in maximum sidewall, 20 degree maximum roof pitch, 30-60 degree
            strap angle, not for flood or seismic hazard areas (engineered there)
```

The federal installation standard does the engineering for the common cases and prints the result as a spacing. Wind
zone sets the design wind; floor width sets how much house is trying to overturn; strap height and frame spacing set
the geometry of the diagonal tie. The tile looks up the spacing, places a strap within two feet of each end, and fills
the length between at no more than that spacing, which gives the anchors per side.

The step between wind zones is the headline. A 14 ft wide home with its straps at 25 in and 82.5 in beam spacing may
space its ties at 18 ft 2 in in Zone I, 7 ft 7 in in Zone II, and 6 ft 2 in in Zone III -- so a home moved from an inland
county to a coastal one needs twice the anchors, plus vertical ties at each one. Some combinations are marked N/A in
the tables, meaning the configuration is not permitted as tabulated; the tile names the cell rather than extrapolating.

The tables assume anchors certified to a 3,150 lb working load and a set of geometric limits, and they do not apply in
flood or seismic hazard areas, where the anchorage is engineered. The tile repeats those conditions, because an anchor
count from the table is valid only inside them.

**Inputs:** the wind zone, the nominal floor width, the home length (per section), the strap height above ground, the I-beam spacing, the near-beam or second-beam method (Zones II and III), and the number of sections

**Outputs:** the maximum strap spacing, the anchors per side and in total, the vertical ties required, the spacing actually used, and the table-limit notes

## 3. Worked example

A single-section 14 ft wide home 66 ft long, straps attached 25 in above ground, 82.5 in I-beam spacing:

```
run between end straps   66 - 2 x 2 = 62 ft
Zone I     s = 18 ft 2 in  -> ceil(62 / 18.17) = 4 spaces -> 5 per side, 10 total
Zone II    s = 7 ft 7 in (near beam) -> ceil(62 / 7.58) = 9 spaces
           -> 10 per side, 20 total, plus 20 vertical ties
Zone III   s = 6 ft 2 in (near beam) -> ceil(62 / 6.17) = 11 spaces
           -> 12 per side, 24 total, plus 24 vertical ties
```

**Ten anchors in Zone I, twenty in Zone II, twenty-four in Zone III** -- the same home, more than doubled, before the
vertical ties. The home's data plate states the wind zone it was built for, and a home may not be installed in a
higher zone than its plate allows.

## 4. Scope and non-goals

A count from the federal tables for diagonal tie-downs. It does not cover longitudinal anchorage, which 3285 also requires, the ground anchor's certification for the site's soil class, frost-depth installation (3285.404), homes within 1,500 ft of the coast in Zones II and III (3285.405, which require the data plate's increased design), flood or seismic hazard areas, or piers and footings. The home manufacturer's installation instructions may require more ties and govern where they do. 24 CFR 3285, the manufacturer's instructions, the licensed installer, and the state administrative agency govern.
