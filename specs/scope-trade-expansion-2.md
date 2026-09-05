# Scope: The 2026-09-05 Trade Expansion (specs v1450-v1749, 300 New Tiles)

> **Status: PROPOSED (2026-09-05). Program charter, no catalog change of its own.**
> Inherits the spec-v106 trades-only charter and every convention through spec-v1449.
> Each of the 300 tiles is specified in its own file, `spec-v1450.md` through `spec-v1749.md`.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Why this program exists

The catalog stands at 1,804 tiles. The 2026-08-26 program
([scope-trade-expansion](scope-trade-expansion.md)) swept the thin *groups* and
six unclaimed specialty trades, and closed with the correct conclusion for the
territory it had mapped. This program maps different territory.

The earlier census counted tiles per group. This one asked a different question:
**which US trades does the catalog not serve at all?** A keyword probe of the
live `TOOLS` registry for the vocabulary of thirty trades returned zero or
near-zero for a striking number of them:

| Trade probed | Tiles today |
| --- | --- |
| Overhead line / utility distribution (sag-tension, ruling span, pole class) | 0 |
| Mining, quarry, drill-and-blast | 0 |
| Oil, gas, and pipeline | 0 |
| Railroad track and equipment | 0 |
| Wind energy | 0 |
| Commercial diving | 0 |
| Millwright shaft alignment and vibration analysis | 0 |
| Locksmithing and door hardware | 0 |
| Sawmill and forest products | 0 |
| Elevator and escalator | 2 |
| Air quality and stack emissions | 0 |
| Plastics processing and foundry | 0 |
| Trenchless / HDD / utility locating | 0 |
| Non-destructive testing and heat treatment | 0 |
| Commercial laundry | 0 |

These are not exotic. Overhead line work, blasting, pipelining, track work, and
millwrighting are large, licensed, well-paid US trades whose daily arithmetic is
as fixed and as checkable as a voltage drop. A lineman sagging conductor in
August and a machinist cutting a shrink fit are doing the same kind of work with
the same kind of number, and only one of them has ever had a tile.

## 2. The entry test each tile had to pass

Every candidate was screened by **token-overlap scoring against all 1,804
catalog rows**, not by keyword grep -- the method recorded after the
2026-08-26 program found nine duplicates its keyword screen had missed. Each
candidate's id and name were tokenized, scored by Jaccard similarity against
every catalog row, and the description of every match above 0.30 was read in
full before the candidate was kept or cut.

**623 candidates were screened. 300 were kept.** The screen cut 323, among them:
compressed-air pipe sizing (`compressed-air-pressure-drop`), balance quality
grade (`rotor-balance-grade`), press tonnage (`hydraulic-cylinder`), pool
breakpoint chlorination (`breakpoint-chlorination`), water hammer arrestor
(`water-hammer-arrestor`, an exact id and name match), eccentric weld group
(`weld-group-eccentric`), and beam camber (`steel-camber`). Structural steel,
survey, and mainstream HVAC came back saturated, exactly as the earlier program
predicted. Mining and oil-and-gas came back with 28 of 32 candidates clean.

Two rules governed the judgment calls, both inherited:

- **Adjacent math is not a duplicate; the same field question is.** A parabolic
  `H = wL^2/(8d)` already ships as `spanline-sag-tension` for a rigging highline,
  so this program does *not* add a general conductor sag tile. It adds
  `conductor-sag-at-temperature`, whose change-of-state cubic is the question a
  lineman actually has and which no existing tile answers.
- **Formula, not name.** Every kept candidate was also grepped for its governing
  equation across `calc-*.js` before it earned a spec number.

## 3. The bands

| Band | Specs | Tiles | Module | Group |
| Overhead line and distribution | v1450-v1468 | 19 | `calc-lineworker.js` | W |
| Millwright, rotating equipment, and pneumatics | v1469-v1483 | 15 | `calc-millwright.js` | S |
| Industrial and commercial refrigeration | v1484-v1494 | 11 | `calc-refrigeration.js` | S |
| Building performance and envelope diagnostics | v1495-v1506 | 12 | `calc-buildingperf.js` | C |
| Mining, quarry, and drill-and-blast | v1507-v1523 | 17 | `calc-mining.js` | S |
| Oil, gas, and pipeline | v1524-v1538 | 15 | `calc-oilgas.js` | S |
| Railroad track and equipment | v1539-v1549 | 11 | `calc-rail.js` | W |
| Wind energy | v1550-v1556 | 7 | `calc-wind.js` | W |
| Commercial diving and hyperbaric | v1557-v1562 | 6 | `calc-diving.js` | P |
| Steam plant and commercial laundry | v1563-v1570 | 8 | `calc-steamplant.js` | S |
| Door hardware and locksmithing | v1571-v1581 | 11 | `calc-doorhardware.js` | E |
| Sawmill and forest products | v1582-v1587 | 6 | `calc-sawmill.js` | L |
| Water well and pump service | v1588-v1590 | 3 | `calc-water.js` | M |
| Propane and LP-gas service | v1591-v1595 | 5 | `calc-gas.js` | B |
| Trenchless, HDD, and utility locating | v1596-v1604 | 9 | `calc-trenchless.js` | W |
| Municipal water and collection systems | v1605-v1607 | 3 | `calc-water.js` | M |
| Traffic, work zone, and pavement | v1608-v1616 | 9 | `calc-civil.js` | E |
| Concrete placement and tilt-up | v1617-v1621 | 5 | `calc-concrete.js` | E |
| Test and balance, controls, and acoustics | v1622-v1636 | 15 | `calc-hvacsystems.js` | C |
| Commercial kitchen | v1637-v1639 | 3 | `calc-kitchen.js` | O |
| Marine and boatyard | v1640-v1644 | 5 | `calc-mechanic.js` | K |
| Aviation maintenance | v1645-v1647 | 3 | `calc-mechanic.js` | K |
| Elevator and escalator | v1648-v1658 | 11 | `calc-elevator.js` | W |
| Auto body and refinishing | v1659-v1663 | 5 | `calc-mechanic.js` | K |
| Welding inspection and NDT | v1664-v1670 | 7 | `calc-inspection.js` | S |
| Heat treatment and metallurgy | v1671-v1674 | 4 | `calc-inspection.js` | S |
| Mechanical insulation | v1675-v1678 | 4 | `calc-hvacsystems.js` | C |
| Sheet metal and architectural metal | v1679-v1682 | 4 | `calc-metalair.js` | E |
| Masonry | v1683-v1685 | 3 | `calc-masonry.js` | E |
| Scaffold and shoring | v1686-v1689 | 4 | `calc-construction.js` | E |
| Abatement and demolition | v1690-v1694 | 5 | `calc-demo.js` | D |
| Arboriculture and landscape | v1695-v1700 | 6 | `calc-arborist.js` | L |
| Pool and spa service | v1701-v1704 | 4 | `calc-water.js` | M |
| Plastics processing | v1705-v1712 | 8 | `calc-process.js` | S |
| Foundry and casting | v1713-v1716 | 4 | `calc-process.js` | S |
| Air quality and environmental | v1717-v1730 | 14 | `calc-airquality.js` | S |
| Industrial hygiene and safety | v1731-v1736 | 6 | `calc-cross.js` | G |
| Groundwater and stormwater | v1737-v1740 | 4 | `calc-drainage.js` | M |
| Mapping, drone, and earthwork | v1741-v1744 | 4 | `calc-survey.js` | P |
| Cross-trade gap fills | v1745-v1749 | 5 | `calc-cross.js` | G |
Twenty-nine bands land in existing modules. **Eleven new `calc-*.js` modules**
are proposed (`calc-lineworker`, `calc-millwright`, `calc-refrigeration`,
`calc-buildingperf`, `calc-mining`, `calc-oilgas`, `calc-rail`, `calc-wind`,
`calc-diving`, `calc-steamplant`, `calc-doorhardware`, `calc-trenchless`,
`calc-elevator`, `calc-inspection`, `calc-process`, `calc-airquality`,
`calc-sawmill`), each carrying its own gzipped cap in
[../scripts/check-module-sizes.mjs](../scripts/check-module-sizes.mjs). Splitting
by trade rather than piling onto `calc-cross.js` keeps every tile's lazy import
small, which is the spec-v10 §H.1 design target.

**Two new groups** are proposed, on the same reasoning that produced Group Z
(rigging) and Group N (stage):

- **Group S -- Industrial and Process Trades.** Mining, oil and gas, foundry,
  plastics, heat treatment, NDT, millwrighting, industrial refrigeration, steam
  plant, and air quality. 105 tiles.
- **Group W -- Utility, Transport, and Infrastructure.** Overhead line, rail,
  wind, trenchless, and elevator. 57 tiles.

## 4. The three doors, and why 297 of these tiles need no work to open two of them

The contributor checklist opens with the rule that every tile has three
mandatory doors: the website, the local MCP server, and the shared
**Report a problem** control. It is worth stating plainly what that costs a new
tile, because the answer is *nothing* -- and a spec that re-specifies inherited
machinery invites a contributor to fork it.

| Door | How a new tile gets it | What holds it |
| --- | --- | --- |
| **Website** | Inherited from `renderToolView`. A declarative `_simpleRenderer` needs no bespoke DOM. | `check-wiring`, `check-renderer-schema`, `check-shells` |
| **Local MCP** | Inherited. `mcp/server.mjs` reads `tools-data.js`, `test/fixtures/compute-map.js`, `test/fixtures/worked-examples.json`, and `data/fields/` -- the same files the website reads. A tile wired into those registries is *already* searchable, describable, runnable, and answerable by an agent. There is no MCP-side registration step and there must never be one. | `check-both-doors` |
| **Report a problem** | Inherited. `app.js` mounts exactly one report control per tile view and lazy-loads `report-feedback.js` on open. | `check-feedback-loop`, and the one-disclosure contract in `check-shells` |

So the per-tile MCP obligation is not *wiring*; it is **wiring correctly enough
that the agent door is not a worse door than the website**. Three requirements,
each of which has already gone wrong once in this repo:

1. **Every input a caller must send is advertised.** `check-both-doors` fails
   when an advertised name is not a key `run()` accepts, or when a key the
   tile's own worked example sets is not advertised.
2. **The tile's own worked example runs through `run_calculator` unchanged.**
   The declarative renderer path makes this free; a bespoke renderer that
   pre-answers at mount does not.
3. **`answer_query` must reach the tile by its own name.** A tile answering as a
   *different* calculator when asked for by name is the failure spec-v1347's
   band found on 79 tiles. Each spec below names 3-5 unique search aliases.

**Report-a-problem is the point of the program, not a checkbox.** 300 tiles is
300 new surfaces on which this catalog can be wrong in a way only a working
tradesperson will notice. Several of these bands -- blasting, well control,
diving gas planning, elevator governor speeds -- are specified from published
relations whose field practice carries site-specific variation that no formula
captures. The report control is the mechanism by which a blaster tells us the
scaled-distance constant we shipped is not the one their state uses. Any tile in
this program carrying an identity, address, or free-prose control sets
`data-report-sensitive="true"` per spec-v1348.

## 5. What this program deliberately does not do

- **No safety-critical tile is presented as a design authority.** Every spec in
  the blasting, well-control, diving, rigging, elevator, and fall-protection
  bands carries an explicit governance line naming the licensed professional,
  the regulator, or the manufacturer's data that governs. A no-decompression
  limit tile is a planning aid and a dive table is not; a kill-sheet tile does
  not make anyone a well-control operator.
- **No new runtime dependency and no new network call.** Every tile is
  arithmetic over inputs the user types, exactly as the other 1,804 are.
- **No metric-first tile.** US customary in every label per the trades-only
  charter; a metric token in a label needs a
  `scripts/us-defaults-allowlist.json` row.
- **No tile that only a licensed engineer may act on is shipped without saying
  so.** The distinction this catalog has always drawn -- a *screen* that tells
  you whether to worry, versus a *design* that tells you what to build -- holds
  for all 300.

## 6. Landing order and cost

The bands are independent and land in the table's order. The measured cost of
the previous program was ~40 files and ~2,000 lines per 10-tile band, with
`npm run audit` plus `check:shell-mobile` local and ~40 minutes of CI. Three
things must happen **before** the first band, not during it:

1. **Bump every shared-registry gzip cap** (`tools-data`, `citations`,
   `tile-meta`) for 300 rows, per trap 7 of the previous program.
2. **Land the lazy `TOOLS` shard** (spec-v10 §§H.1/H.2). The home-view JS budget
   closed the last program at 94.6% of cap with 1,804 tiles. It does not have
   room for 300 more, and this is the named preferred remediation. **This
   program is blocked on it.**
3. **Register the two new groups and seventeen new modules** in
   `tile-meta.js`, `tool-modules.js`, `citations.test.js` per-group counts, and
   `check-module-sizes.mjs`.

## 7. See also

- [scope-trade-expansion.md](scope-trade-expansion.md) -- the 2026-08-26 program.
- [../docs/contributor-checklist.md](../docs/contributor-checklist.md) -- the
  per-tile checklist every one of these 300 must pass.
- [../mcp/README.md](../mcp/README.md) -- the agent door.
