# roughlogic.com Specification v1710 -- Thermoforming Draw Ratio and Wall Thinning (`calc-process.js`, Group G Cross-Trade Utilities, plastics, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-process.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; plastics processing), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A thermoformed part is made from a flat sheet stretched into a mould, and the deeper the draw the thinner the walls get -- with the corners thinnest of all. The draw ratio predicts it, and it is what says whether a part can be formed at all from a given sheet.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive draw depth, opening dimension, or sheet thickness, or an areal draw ratio below one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the areal draw ratio relation and the corner thinning behaviour as standard thermoforming practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`thermoforming draw ratio`, `wall thinning thermoform`, `h to d ratio forming`, `plug assist thermoforming`, `corner thinning vacuum form`.

## 2. The tile

### 2.1 `thermoforming-draw-ratio` -- Thermoforming Draw Ratio and Wall Thinning

```
areal draw ratio  ADR = formed surface area / original sheet area covered
depth of draw     H/D ratio; a rough indicator, easier to compute than ADR
average thickness t_final = t_initial / ADR
corners           thin far more than the average; the last material to arrive
                  a corner can be a fraction of the average wall
practical limits  female (cavity) forming, unassisted: H/D up to about 0.5
                  with plug assist and pressure forming, considerably deeper
plug assist       pre-stretches the sheet to distribute material before forming
```

The areal draw ratio is a conservation statement: the sheet has a fixed amount of material and stretching it
over more surface makes it thinner everywhere in proportion. That gives the average, and the average is not the
problem. The problem is that material does not distribute evenly -- the sheet touches the mould surface first
where it is closest, that material chills and stops stretching, and everything that arrives later has to come
from the material still hot. So the last-formed regions, which are the bottom corners of a deep draw, get the
least.

A corner at a fraction of the average wall is what a specification has to account for, and it is why a part
designed to a nominal wall thickness has to be designed to its MINIMUM wall thickness at the corner instead. That
in turn drives the starting sheet gauge, which drives the material cost of every part.

Plug assist is the process answer and it is worth understanding why it works: a plug pushes into the hot sheet
before the vacuum pulls it into the mould, mechanically pre-stretching material toward the bottom so there is
more of it where the corners will form. It changes the distribution rather than the average, which is exactly what
the problem needs.

Generous radii do the same thing from the design side. A tight corner is a stress concentration in the forming
as well as in the part, and opening the radius is the cheapest wall-thickness improvement available.

**Inputs:** the part depth and opening dimensions, the formed surface area, the starting sheet thickness, the forming method (vacuum, pressure, plug assist), and the minimum acceptable wall thickness

**Outputs:** the depth-to-diameter ratio, the areal draw ratio, the average formed wall thickness, an estimated corner thickness, both against the minimum acceptable, the starting sheet gauge required to meet the corner minimum, and whether the draw is within the practical limit for the entered method

## 3. Worked example

A 10 in diameter cup formed 6 in deep from 0.060 in sheet:

```
H/D ratio = 6 / 10 = 0.6
```

**0.6 is a deep draw** -- above the roughly 0.5 practical limit for unassisted female forming, so this part
needs plug assist or pressure forming.

The areal draw ratio, approximating the formed shape as a cylinder plus a bottom:

```
formed area   = pi x 10 x 6 + pi/4 x 10^2 = 188 + 79 = 267 sq in
original area = pi/4 x 10^2 = 79 sq in
ADR           = 3.40
average wall  = 0.060 / 3.40 = 0.0176 in
```

**An average wall of 18 thousandths from a 60
thousandth sheet.**

And the average is not the specification. The bottom corners -- the last material to arrive, formed from sheet
that has already chilled against the sidewall -- can be a third to a half of that, so the corner is
7 thousandths or thereabouts.

If the part needs a 15 thousandth minimum wall at the corner, the starting sheet has to be

```
0.015 / 0.4 x 3.40 = 0.128 in
```

which is a materially heavier and more expensive sheet -- and that is the number the part's cost is set by, not
the average.

Plug assist redistributes material toward the bottom and improves the corner substantially without changing the
average, which is why it is the standard answer for a draw this deep. Opening the corner radii does the same
thing from the design side and costs nothing.

## 4. Scope and non-goals

A material distribution estimate. The areal draw ratio gives an average and real thermoforming distributes
material very unevenly; the corner thinning fraction used here is indicative and depends on the mould geometry,
the sheet temperature and its uniformity, the forming method, plug design and timing, and the material's own
behaviour at forming temperature. Thermoforming simulation or a formed sample with wall thickness measurements is
what establishes it. It does not address sheet temperature control, which is the dominant process variable, the
mould's venting and cooling, trim, or the material's forming window. It does not address the difference between
male and female forming, which distribute material almost oppositely. It does not address regrind content, which
affects formability. The material supplier's forming data, the mould designer, and the process engineer
govern.
