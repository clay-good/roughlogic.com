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

## Appendix A: the 300 tiles

Every row was screened by token overlap against all 1,804 catalog rows and carries no id collision.
A checked box means the tile's own spec file is written.

| Spec | Tile id | Name | Module | Group | Spec written |
| --- | --- | --- | --- | --- | --- |
| v1450 | `ruling-span` | Ruling (Equivalent) Span for a Line Section | `calc-lineworker.js` | W | yes |
| v1451 | `conductor-sag-at-temperature` | Conductor Sag Change With Temperature | `calc-lineworker.js` | W | yes |
| v1452 | `conductor-blowout` | Conductor Blowout and Horizontal Clearance | `calc-lineworker.js` | W | yes |
| v1453 | `conductor-uplift-check` | Suspension Insulator Uplift Check at a Low Point | `calc-lineworker.js` | W | yes |
| v1454 | `line-ground-clearance-nesc` | Overhead Line Ground Clearance (NESC Table 232-1) | `calc-lineworker.js` | W | yes |
| v1455 | `pole-class-groundline-moment` | Wood Pole Class and Groundline Moment | `calc-lineworker.js` | W | yes |
| v1456 | `guy-anchor-holding-capacity` | Guy Anchor Holding Capacity in Soil | `calc-lineworker.js` | W | yes |
| v1457 | `transverse-wind-load-conductor` | Transverse Wind Load on Conductor and Pole | `calc-lineworker.js` | W | yes |
| v1458 | `nesc-district-loading` | NESC Ice-and-Wind District Loading on a Conductor | `calc-lineworker.js` | W | yes |
| v1459 | `conductor-creep-elongation` | Conductor Long-Term Creep and Sag Increase | `calc-lineworker.js` | W | yes |
| v1460 | `sagging-return-wave` | Sagging by Stopwatch (Return-Wave Method) | `calc-lineworker.js` | W | yes |
| v1461 | `transformer-diversity-loading` | Distribution Transformer Diversified Loading | `calc-lineworker.js` | W | yes |
| v1462 | `capacitor-bank-voltage-rise` | Line Capacitor Bank Voltage Rise | `calc-lineworker.js` | W | yes |
| v1463 | `regulator-tap-bandwidth` | Line Voltage Regulator Tap and Bandwidth | `calc-lineworker.js` | W | yes |
| v1464 | `recloser-fuse-coordination` | Recloser-to-Fuse Coordination Screen | `calc-lineworker.js` | W | yes |
| v1465 | `feeder-loss-load-factor` | Distribution Feeder I2R Loss and Loss Factor | `calc-lineworker.js` | W | yes |
| v1466 | `meter-ct-pt-multiplier` | Watt-Hour Meter CT / PT Multiplier | `calc-lineworker.js` | W | yes |
| v1467 | `counterpoise-resistance` | Counterpoise and Ground Rod Array Resistance | `calc-lineworker.js` | W | yes |
| v1468 | `duct-bank-ampacity-derate` | Underground Duct-Bank Ampacity Derate | `calc-lineworker.js` | W | yes |
| v1469 | `shaft-alignment-rim-face` | Shaft Alignment Offset and Angularity (Rim-and-Face) | `calc-millwright.js` | S | yes |
| v1470 | `shaft-alignment-reverse-dial` | Reverse-Dial Shaft Alignment Shim and Move | `calc-millwright.js` | S | yes |
| v1471 | `alignment-thermal-growth` | Machine Thermal Growth Offset for Cold Alignment | `calc-millwright.js` | S | yes |
| v1472 | `soft-foot-correction` | Soft-Foot Measurement and Correction Shim | `calc-millwright.js` | S | yes |
| v1473 | `coupling-alignment-tolerance` | Coupling Alignment Tolerance by Speed | `calc-millwright.js` | S | yes |
| v1474 | `vibration-severity-zone` | Vibration Severity Zone (ISO 20816) | `calc-millwright.js` | S | yes |
| v1475 | `vibration-forcing-frequencies` | Vibration Forcing Frequencies (1x, Blade Pass, Gear Mesh) | `calc-millwright.js` | S | pending |
| v1476 | `bearing-defect-frequencies` | Rolling-Element Bearing Defect Frequencies | `calc-millwright.js` | S | pending |
| v1477 | `single-plane-field-balance` | Single-Plane Field Balance Trial Weight | `calc-millwright.js` | S | pending |
| v1478 | `roller-chain-wear-elongation` | Roller Chain Wear Elongation Replacement Check | `calc-millwright.js` | S | pending |
| v1479 | `gear-reducer-service-factor` | Gear Reducer Service Factor and Required Rating | `calc-millwright.js` | S | pending |
| v1480 | `air-compressor-cfm-sizing` | Air Compressor CFM and Duty Sizing From Tool Demand | `calc-millwright.js` | S | pending |
| v1481 | `air-dryer-sizing` | Refrigerated and Desiccant Air Dryer Sizing | `calc-millwright.js` | S | pending |
| v1482 | `receiver-pump-up-time` | Air Receiver Pump-Up and Pump-Down Time | `calc-millwright.js` | S | pending |
| v1483 | `vacuum-evacuation-time` | Vacuum Pump Evacuation (Pump-Down) Time | `calc-millwright.js` | S | pending |
| v1484 | `ammonia-charge-inventory` | Ammonia Refrigeration Charge Inventory and PSM Threshold | `calc-refrigeration.js` | S | pending |
| v1485 | `two-stage-interstage-pressure` | Two-Stage Refrigeration Interstage Pressure | `calc-refrigeration.js` | S | pending |
| v1486 | `evaporator-td-selection` | Evaporator TD, Capacity, and Coil Humidity Effect | `calc-refrigeration.js` | S | pending |
| v1487 | `refrigerated-case-load` | Refrigerated Display Case Load and Infiltration | `calc-refrigeration.js` | S | pending |
| v1488 | `freezer-underfloor-heat` | Freezer Slab Underfloor Heat and Frost Heave | `calc-refrigeration.js` | S | pending |
| v1489 | `condenser-td-head-pressure` | Air-Cooled Condenser TD and Head Pressure | `calc-refrigeration.js` | S | pending |
| v1490 | `receiver-pumpdown-capacity` | Refrigerant Receiver Pump-Down Capacity | `calc-refrigeration.js` | S | pending |
| v1491 | `secondary-glycol-loop` | Secondary Coolant (Glycol) Loop Flow and Pump Penalty | `calc-refrigeration.js` | S | pending |
| v1492 | `co2-transcritical-pressure` | CO2 Transcritical Gas Cooler Optimum Pressure | `calc-refrigeration.js` | S | pending |
| v1493 | `refrigeration-relief-capacity` | Refrigeration Pressure-Relief Discharge Capacity (ASHRAE 15) | `calc-refrigeration.js` | S | pending |
| v1494 | `machinery-room-ventilation` | Refrigeration Machinery Room Ventilation (ASHRAE 15) | `calc-refrigeration.js` | S | pending |
| v1495 | `effective-leakage-area` | Effective Leakage Area and Normalized Leakage | `calc-buildingperf.js` | C | pending |
| v1496 | `building-tightness-limit` | Minimum Ventilation vs Building Tightness Limit | `calc-buildingperf.js` | C | pending |
| v1497 | `ventilation-rate-procedure` | ASHRAE 62.1 Ventilation Rate Procedure (Multiple-Zone) | `calc-buildingperf.js` | C | pending |
| v1498 | `zonal-pressure-diagnostics` | Zonal Pressure Diagnostic Leakage Split | `calc-buildingperf.js` | C | pending |
| v1499 | `caz-depressurization-limit` | Combustion Appliance Zone Depressurization Limit | `calc-buildingperf.js` | C | pending |
| v1500 | `stack-effect-npp` | Stack Effect Pressure and Neutral Pressure Plane | `calc-buildingperf.js` | C | pending |
| v1501 | `infiltration-lbl-model` | Natural Infiltration From ACH50 (LBL n-Factor Model) | `calc-buildingperf.js` | C | pending |
| v1502 | `bill-disaggregation` | Utility Bill Baseload and Weather-Sensitive Split | `calc-buildingperf.js` | C | pending |
| v1503 | `vapor-retarder-dewpoint` | Wall Assembly Dew Point and Vapor Retarder Class | `calc-buildingperf.js` | C | pending |
| v1504 | `continuous-insulation-ratio` | Continuous vs Cavity Insulation Ratio for Condensation Control | `calc-buildingperf.js` | C | pending |
| v1505 | `framing-factor-whole-wall` | Framing Factor and Whole-Wall Effective R-Value | `calc-buildingperf.js` | C | pending |
| v1506 | `ground-loop-flow-antifreeze` | Ground Loop Flow, Antifreeze, and Pressure Drop | `calc-buildingperf.js` | C | pending |
| v1507 | `blast-powder-factor` | Blasting Powder Factor and Explosive Load per Hole | `calc-mining.js` | S | pending |
| v1508 | `blast-burden-spacing` | Blast Hole Burden and Spacing Layout | `calc-mining.js` | S | pending |
| v1509 | `blast-scaled-distance-ppv` | Blast Vibration Scaled Distance and Peak Particle Velocity | `calc-mining.js` | S | pending |
| v1510 | `blast-airblast-overpressure` | Blast Airblast Overpressure Screen | `calc-mining.js` | S | pending |
| v1511 | `blast-stemming-length` | Blast Hole Stemming Length and Flyrock Screen | `calc-mining.js` | S | pending |
| v1512 | `crusher-reduction-ratio` | Crusher Reduction Ratio and Product Gradation | `calc-mining.js` | S | pending |
| v1513 | `screen-deck-capacity` | Vibrating Screen Deck Capacity | `calc-mining.js` | S | pending |
| v1514 | `belt-feeder-capacity` | Belt Feeder Volumetric Capacity and Draw-Down | `calc-mining.js` | S | pending |
| v1515 | `dust-collector-air-to-cloth` | Dust Collector Air-to-Cloth Ratio and Bag Count | `calc-mining.js` | S | pending |
| v1516 | `dust-deflagration-vent-area` | Dust Deflagration Vent Area (NFPA 68) | `calc-mining.js` | S | pending |
| v1517 | `mine-face-ventilation` | Underground Face Airflow and Velocity | `calc-mining.js` | S | pending |
| v1518 | `pit-dewatering-staging` | Pit Dewatering Pump Head and Staging | `calc-mining.js` | S | pending |
| v1519 | `highwall-bench-geometry` | Highwall Bench Width and Overall Slope Angle | `calc-mining.js` | S | pending |
| v1520 | `shotcrete-rebound-yield` | Shotcrete Rebound Loss and Material Yield | `calc-mining.js` | S | pending |
| v1521 | `rock-bolt-support-pressure` | Rock Bolt Pattern and Support Pressure | `calc-mining.js` | S | pending |
| v1522 | `blast-fume-clearance-time` | Tunnel and Heading Blast Fume Clearance Time | `calc-mining.js` | S | pending |
| v1523 | `hoist-rope-safety-factor` | Mine Hoist Rope Factor of Safety and Duty | `calc-mining.js` | S | pending |
| v1524 | `pipeline-mao-barlow` | Pipeline Maximum Allowable Operating Pressure (Barlow) | `calc-oilgas.js` | S | pending |
| v1525 | `gas-pipeline-flow` | Gas Pipeline Flow (Weymouth and Panhandle) | `calc-oilgas.js` | S | pending |
| v1526 | `liquid-pipeline-station-spacing` | Liquid Pipeline Friction Loss and Pump Station Spacing | `calc-oilgas.js` | S | pending |
| v1527 | `pig-batch-volume` | Pipeline Pigging Volume and Batch Displacement | `calc-oilgas.js` | S | pending |
| v1528 | `cathodic-anode-count-life` | Cathodic Protection Anode Count and Life | `calc-oilgas.js` | S | pending |
| v1529 | `corroded-pipe-b31g` | Corroded Pipe Remaining Strength (ASME B31G) | `calc-oilgas.js` | S | pending |
| v1530 | `casing-cement-volume` | Well Casing and Annulus Cement Volume | `calc-oilgas.js` | S | pending |
| v1531 | `mud-hydrostatic-pressure` | Drilling Mud Weight and Hydrostatic Pressure | `calc-oilgas.js` | S | pending |
| v1532 | `kill-mud-weight` | Well Control Kill Mud Weight and Circulating Pressure | `calc-oilgas.js` | S | pending |
| v1533 | `annular-velocity-cleaning` | Annular Velocity and Hole Cleaning | `calc-oilgas.js` | S | pending |
| v1534 | `tank-strapping-volume` | Vertical Tank Strapping Volume and Gauge Conversion | `calc-oilgas.js` | S | pending |
| v1535 | `tank-vent-api-2000` | Atmospheric Tank Vent Sizing (API 2000) | `calc-oilgas.js` | S | pending |
| v1536 | `separator-retention-sizing` | Two-Phase Separator Retention Sizing | `calc-oilgas.js` | S | pending |
| v1537 | `flare-radiation-distance` | Flare Thermal Radiation Safe Distance (API 521) | `calc-oilgas.js` | S | pending |
| v1538 | `well-decline-reserves` | Well Decline Curve and Remaining Reserves | `calc-oilgas.js` | S | pending |
| v1539 | `track-superelevation` | Railroad Curve Superelevation and Unbalance | `calc-rail.js` | W | pending |
| v1540 | `degree-of-curve` | Railroad Degree of Curve, Radius, and Middle Ordinate | `calc-rail.js` | W | pending |
| v1541 | `cwr-neutral-temperature` | Continuous Welded Rail Neutral Temperature and Thermal Force | `calc-rail.js` | W | pending |
| v1542 | `rail-wear-condemning-limit` | Rail Head Wear and Condemning Limit | `calc-rail.js` | W | pending |
| v1543 | `track-warp-fra-class` | Track Cross-Level, Warp, and FRA Class Limits | `calc-rail.js` | W | pending |
| v1544 | `ballast-section-volume` | Track Ballast Section Volume and Tonnage | `calc-rail.js` | W | pending |
| v1545 | `turnout-frog-lead` | Turnout Frog Number, Lead, and Closure Geometry | `calc-rail.js` | W | pending |
| v1546 | `railcar-load-limit` | Railcar Load Limit and Light Weight | `calc-rail.js` | W | pending |
| v1547 | `tonnage-rating-grade` | Locomotive Tonnage Rating on a Ruling Grade | `calc-rail.js` | W | pending |
| v1548 | `train-brake-reduction` | Train Air Brake Reduction and Equalizing Pressure | `calc-rail.js` | W | pending |
| v1549 | `clearance-plate-envelope` | Railcar Clearance Plate and Dynamic Envelope | `calc-rail.js` | W | pending |
| v1550 | `tip-speed-ratio` | Wind Turbine Tip-Speed Ratio and Rotor Speed | `calc-wind.js` | W | pending |
| v1551 | `wind-power-density-betz` | Wind Power Density, Betz Limit, and Rotor Output | `calc-wind.js` | W | pending |
| v1552 | `wind-shear-hub-height` | Wind Shear Power-Law Speed at Hub Height | `calc-wind.js` | W | pending |
| v1553 | `weibull-capacity-factor` | Wind Weibull Distribution and Capacity Factor | `calc-wind.js` | W | pending |
| v1554 | `turbine-density-correction` | Wind Turbine Output Air-Density Correction | `calc-wind.js` | W | pending |
| v1555 | `yaw-error-loss` | Yaw Misalignment Power Loss | `calc-wind.js` | W | pending |
| v1556 | `gin-pole-uptower-lift` | Gin-Pole and Uptower Component Lift Load | `calc-wind.js` | W | pending |
| v1557 | `no-decompression-limit` | Dive No-Decompression Limit and Residual Nitrogen | `calc-diving.js` | P | pending |
| v1558 | `surface-air-consumption` | Dive Surface Air Consumption and Gas Planning | `calc-diving.js` | P | pending |
| v1559 | `nitrox-mod` | Nitrox Maximum Operating Depth and Oxygen Exposure | `calc-diving.js` | P | pending |
| v1560 | `nitrox-ead` | Nitrox Equivalent Air Depth | `calc-diving.js` | P | pending |
| v1561 | `umbilical-air-supply` | Surface-Supplied Diver Air Supply Rate | `calc-diving.js` | P | pending |
| v1562 | `chamber-gas-volume` | Recompression Chamber Gas Volume and Duration | `calc-diving.js` | P | pending |
| v1563 | `laundry-washer-turns` | Commercial Laundry Washer Capacity and Turns per Day | `calc-steamplant.js` | S | pending |
| v1564 | `laundry-cost-per-pound` | Laundry Water, Sewer, and Energy Cost per Pound | `calc-steamplant.js` | S | pending |
| v1565 | `laundry-dryer-evaporation` | Tumble Dryer Evaporation Load and Makeup Air | `calc-steamplant.js` | S | pending |
| v1566 | `blowdown-heat-recovery` | Boiler Blowdown Heat Recovery and Efficiency Gain | `calc-steamplant.js` | S | pending |
| v1567 | `deaerator-steam-demand` | Deaerator Steam Demand and Vent Rate | `calc-steamplant.js` | S | pending |
| v1568 | `condensate-pump-flash-npsh` | Condensate Pump Flash and NPSH Margin | `calc-steamplant.js` | S | pending |
| v1569 | `safety-valve-capacity` | Boiler Safety Valve Relieving Capacity | `calc-steamplant.js` | S | pending |
| v1570 | `fuel-oil-atomizing-viscosity` | Fuel Oil Heating for Atomizing Viscosity | `calc-steamplant.js` | S | pending |
| v1571 | `door-closer-opening-force` | Door Closer Size and Opening Force (ANSI A156.4) | `calc-doorhardware.js` | E | pending |
| v1572 | `lock-backset-strike-layout` | Lock Backset, Bore, and Strike Layout | `calc-doorhardware.js` | E | pending |
| v1573 | `panic-hardware-force` | Panic Hardware Operating Force and Latch Release | `calc-doorhardware.js` | E | pending |
| v1574 | `electric-lock-power-budget` | Electric Strike and Maglock Power and Standby Budget | `calc-doorhardware.js` | E | pending |
| v1575 | `maglock-holding-leverage` | Electromagnetic Lock Holding Force and Door Leverage | `calc-doorhardware.js` | E | pending |
| v1576 | `master-key-bitting-capacity` | Master Key System Depth and Bitting Capacity | `calc-doorhardware.js` | E | pending |
| v1577 | `key-cut-macs-check` | Key Cut Depth, Spacing, and MACS Check | `calc-doorhardware.js` | E | pending |
| v1578 | `door-undercut-transfer-air` | Door Undercut Free Area and Transfer Airflow | `calc-doorhardware.js` | E | pending |
| v1579 | `fire-door-clearance` | Fire Door Clearance and Annual Inspection Limits (NFPA 80) | `calc-doorhardware.js` | E | pending |
| v1580 | `gate-operator-duty-cycle` | Slide Gate Operator Force, Duty Cycle, and Travel | `calc-doorhardware.js` | E | pending |
| v1581 | `revolving-door-throughput` | Revolving Door and Turnstile Throughput | `calc-doorhardware.js` | E | pending |
| v1582 | `lumber-recovery-overrun` | Sawmill Lumber Recovery and Overrun | `calc-sawmill.js` | L | pending |
| v1583 | `kiln-drying-time` | Lumber Kiln Drying Time and Moisture Removal | `calc-sawmill.js` | L | pending |
| v1584 | `kiln-charge-water` | Kiln Charge Water Weight and Vent Load | `calc-sawmill.js` | L | pending |
| v1585 | `bandmill-speed-bite` | Bandmill Blade Speed, Feed, and Bite per Tooth | `calc-sawmill.js` | L | pending |
| v1586 | `sawmill-residue-yield` | Sawmill Residue and Sawdust Yield | `calc-sawmill.js` | L | pending |
| v1587 | `log-truck-payload` | Log Truck Payload and Scaled Weight | `calc-sawmill.js` | L | pending |
| v1588 | `step-drawdown-efficiency` | Step-Drawdown Test Well Efficiency | `calc-water.js` | M | pending |
| v1589 | `casing-purge-volume` | Well Casing Storage and Purge Volume | `calc-water.js` | M | pending |
| v1590 | `constant-pressure-vfd` | Constant-Pressure Well VFD Setpoint and Flow | `calc-water.js` | M | pending |
| v1591 | `propane-vaporization-rate` | Propane Tank Vaporization Capacity | `calc-gas.js` | B | pending |
| v1592 | `propane-fill-outage` | Propane Tank Filling Outage and Fixed Liquid Level | `calc-gas.js` | B | pending |
| v1593 | `propane-regulator-sizing` | Propane Two-Stage Regulator and Line Sizing | `calc-gas.js` | B | pending |
| v1594 | `lp-container-separation` | LP-Gas Container Separation Distance (NFPA 58) | `calc-gas.js` | B | pending |
| v1595 | `propane-run-time` | Propane Run Time and Refill Interval | `calc-gas.js` | B | pending |
| v1596 | `hdd-pullback-force` | Directional Drill Pullback Force and Pipe Stress | `calc-trenchless.js` | W | pending |
| v1597 | `hdd-bend-radius` | Directional Bore Minimum Bend Radius and Entry Angle | `calc-trenchless.js` | W | pending |
| v1598 | `hdd-fluid-volume` | HDD Drilling Fluid Volume and Annular Flow | `calc-trenchless.js` | W | pending |
| v1599 | `hdd-annular-pressure` | HDD Downhole Annular Pressure and Frac-Out Screen | `calc-trenchless.js` | W | pending |
| v1600 | `locate-depth-offset` | Electromagnetic Locate Depth and Signal Offset | `calc-trenchless.js` | W | pending |
| v1601 | `vacuum-excavation-spoil` | Vacuum Excavation Spoil Volume and Tank Fills | `calc-trenchless.js` | W | pending |
| v1602 | `pipe-bursting-pull-load` | Pipe Bursting Upsize Displacement and Pull Load | `calc-trenchless.js` | W | pending |
| v1603 | `cipp-liner-thickness` | CIPP Liner Thickness (ASTM F1216) | `calc-trenchless.js` | W | pending |
| v1604 | `sewer-scour-slope` | Gravity Sewer Slope for Minimum Scour Velocity | `calc-trenchless.js` | W | pending |
| v1605 | `wet-well-cycle-time` | Lift Station Wet-Well Volume and Cycle Time | `calc-water.js` | M | pending |
| v1606 | `main-flushing-duration` | Water Main Flushing Volume and Duration | `calc-water.js` | M | pending |
| v1607 | `pressure-zone-hgl` | Water Pressure Zone HGL and Service Pressure | `calc-water.js` | M | pending |
| v1608 | `work-zone-buffer` | Work Zone Longitudinal Buffer Space | `calc-civil.js` | E | pending |
| v1609 | `flagger-advance-warning` | Flagger Station Advance Warning Distance | `calc-civil.js` | E | pending |
| v1610 | `skip-line-layout` | Skip Line Cycle Layout and Stripe Count | `calc-civil.js` | E | pending |
| v1611 | `speed-hump-geometry` | Speed Hump and Table Geometry | `calc-civil.js` | E | pending |
| v1612 | `intersection-sight-triangle` | Intersection Sight Triangle and Departure Distance | `calc-civil.js` | E | pending |
| v1613 | `pavement-structural-number` | Flexible Pavement Structural Number (AASHTO 93) | `calc-civil.js` | E | pending |
| v1614 | `subgrade-cbr-thickness` | Subgrade CBR to Aggregate Base Thickness | `calc-civil.js` | E | pending |
| v1615 | `esal-traffic-loading` | Equivalent Single Axle Loads (ESAL) Traffic Loading | `calc-civil.js` | E | pending |
| v1616 | `chip-seal-rate` | Chip Seal Aggregate and Emulsion Application Rate | `calc-civil.js` | E | pending |
| v1617 | `concrete-pump-line-pressure` | Concrete Pump Line Pressure and Output | `calc-concrete.js` | E | pending |
| v1618 | `boom-pump-reach` | Concrete Boom Pump Reach and Setup Radius | `calc-concrete.js` | E | pending |
| v1619 | `post-tension-elongation` | Post-Tension Tendon Elongation and Jacking Force | `calc-concrete.js` | E | pending |
| v1620 | `tilt-up-lift-stress` | Tilt-Up Panel Lifting Stress and Insert Layout | `calc-concrete.js` | E | pending |
| v1621 | `tilt-up-brace-load` | Tilt-Up Panel Temporary Brace Load and Count | `calc-concrete.js` | E | pending |
| v1622 | `flow-hood-correction` | Flow Hood Reading Correction and Diffuser Airflow | `calc-hvacsystems.js` | C | pending |
| v1623 | `fan-system-effect` | Fan System Effect and Installed Performance | `calc-hvacsystems.js` | C | pending |
| v1624 | `proportional-balance-ratio` | Proportional Balancing Ratio Method | `calc-hvacsystems.js` | C | pending |
| v1625 | `pump-impeller-trim` | Pump Impeller Trim for a Balanced Flow | `calc-hvacsystems.js` | C | pending |
| v1626 | `coil-capacity-verification` | Coil Capacity Verification From Measured Air and Water | `calc-hvacsystems.js` | C | pending |
| v1627 | `valve-actuator-close-off` | Valve Actuator Close-Off Pressure and Torque | `calc-hvacsystems.js` | C | pending |
| v1628 | `chiller-staging-point` | Chiller Staging Point and Part-Load Efficiency | `calc-hvacsystems.js` | C | pending |
| v1629 | `variable-primary-bypass` | Variable Primary Chilled Water Minimum Flow Bypass | `calc-hvacsystems.js` | C | pending |
| v1630 | `louver-free-area` | Louver Free Area, Velocity, and Water Penetration | `calc-hvacsystems.js` | C | pending |
| v1631 | `plenum-return-drop` | Ceiling Plenum Return Path Pressure Drop | `calc-hvacsystems.js` | C | pending |
| v1632 | `grille-neck-nc` | Grille Neck Velocity and NC Level | `calc-hvacsystems.js` | C | pending |
| v1633 | `duct-breakout-noise` | Duct Breakout Noise and Lagging | `calc-hvacsystems.js` | C | pending |
| v1634 | `silencer-insertion-loss` | Duct Silencer Insertion Loss and Pressure Drop | `calc-hvacsystems.js` | C | pending |
| v1635 | `mechanical-room-nc` | Mechanical Room Sound Transmission and NC Rating | `calc-hvacsystems.js` | C | pending |
| v1636 | `rooftop-curb-uplift` | Rooftop Equipment Wind Uplift and Anchorage | `calc-hvacsystems.js` | C | pending |
| v1637 | `grease-duct-cleaning-interval` | Grease Duct Buildup and Cleaning Interval (NFPA 96) | `calc-kitchen.js` | O | pending |
| v1638 | `walk-in-door-infiltration` | Walk-In Door Infiltration Load and Air Curtain | `calc-kitchen.js` | O | pending |
| v1639 | `kitchen-makeup-air-deficit` | Kitchen Exhaust and Makeup Air Balance Deficit | `calc-kitchen.js` | O | pending |
| v1640 | `metacentric-height` | Vessel Metacentric Height and Righting Arm | `calc-mechanic.js` | K | pending |
| v1641 | `marine-shaft-diameter` | Marine Propeller Shaft Diameter for Torque | `calc-mechanic.js` | K | pending |
| v1642 | `house-battery-alternator` | Marine House Battery Load and Alternator Recharge | `calc-mechanic.js` | K | pending |
| v1643 | `travel-lift-sling-placement` | Travel-Lift Sling Placement and Hull Load | `calc-mechanic.js` | K | pending |
| v1644 | `dock-piling-lateral` | Dock Piling Embedment and Lateral Load | `calc-mechanic.js` | K | pending |
| v1645 | `control-cable-tension` | Aircraft Control Cable Tension and Temperature Correction | `calc-mechanic.js` | K | pending |
| v1646 | `propeller-track-balance` | Propeller Track, Balance, and Vibration Limit | `calc-mechanic.js` | K | pending |
| v1647 | `aviation-fuel-weight` | Aviation Fuel Weight vs Temperature and Load Sheet | `calc-mechanic.js` | K | pending |
| v1648 | `traction-roping-ratio` | Elevator Traction Roping Ratio and Motor Torque | `calc-elevator.js` | W | pending |
| v1649 | `counterweight-balance` | Elevator Counterweight Balance Percentage | `calc-elevator.js` | W | pending |
| v1650 | `rope-safety-factor` | Elevator Suspension Rope Factor of Safety | `calc-elevator.js` | W | pending |
| v1651 | `buffer-stroke-speed` | Elevator Buffer Stroke and Impact Speed | `calc-elevator.js` | W | pending |
| v1652 | `hoistway-venting` | Hoistway Pressurization and Smoke Venting | `calc-elevator.js` | W | pending |
| v1653 | `machine-room-heat` | Elevator Machine Room Heat Load and Cooling | `calc-elevator.js` | W | pending |
| v1654 | `hydraulic-jack-pressure` | Hydraulic Elevator Jack Pressure and Pump Flow | `calc-elevator.js` | W | pending |
| v1655 | `step-chain-tension` | Escalator Step Chain Tension and Drive Power | `calc-elevator.js` | W | pending |
| v1656 | `door-closing-energy` | Elevator Door Closing Force and Kinetic Energy | `calc-elevator.js` | W | pending |
| v1657 | `governor-tripping-speed` | Elevator Overspeed Governor Tripping Speed | `calc-elevator.js` | W | pending |
| v1658 | `guide-rail-bracket-span` | Elevator Guide Rail Bracket Spacing and Load | `calc-elevator.js` | W | pending |
| v1659 | `spray-transfer-efficiency` | Spray Gun Transfer Efficiency and Material Usage | `calc-mechanic.js` | K | pending |
| v1660 | `paint-booth-airflow-cure` | Paint Booth Airflow, Air Changes, and Cure Time | `calc-mechanic.js` | K | pending |
| v1661 | `frame-diagonal-tolerance` | Unibody Frame Diagonal Measurement and Tolerance | `calc-mechanic.js` | K | pending |
| v1662 | `wet-film-for-dry-build` | Wet Film Thickness for a Target Dry Film Build | `calc-mechanic.js` | K | pending |
| v1663 | `adhesive-bond-area` | Structural Adhesive Bond Area and Shear Strength | `calc-mechanic.js` | K | pending |
| v1664 | `weld-visual-acceptance` | Weld Visual Acceptance Limits (AWS D1.1) | `calc-inspection.js` | S | pending |
| v1665 | `ut-velocity-calibration` | Ultrasonic Thickness Velocity and Calibration | `calc-inspection.js` | S | pending |
| v1666 | `radiographic-exposure-sfd` | Radiographic Exposure Time and Source-to-Film Distance | `calc-inspection.js` | S | pending |
| v1667 | `radiography-boundary` | Radiography Restricted-Area Boundary Distance | `calc-inspection.js` | S | pending |
| v1668 | `magnetic-particle-amperage` | Magnetic Particle Yoke and Coil Amperage | `calc-inspection.js` | S | pending |
| v1669 | `penetrant-dwell-time` | Liquid Penetrant Dwell and Development Time | `calc-inspection.js` | S | pending |
| v1670 | `hardness-tensile-conversion` | Hardness Conversion and Estimated Tensile Strength | `calc-inspection.js` | S | pending |
| v1671 | `carburizing-case-depth` | Carburizing Case Depth and Time at Temperature | `calc-inspection.js` | S | pending |
| v1672 | `jominy-quench-severity` | Quench Severity and Jominy Hardenability Depth | `calc-inspection.js` | S | pending |
| v1673 | `tempering-for-hardness` | Tempering Temperature for a Target Hardness | `calc-inspection.js` | S | pending |
| v1674 | `pwht-holding-time` | Post-Weld Heat Treatment Holding Time and Rate | `calc-inspection.js` | S | pending |
| v1675 | `personnel-protection-thickness` | Insulation Thickness for a Personnel-Protection Surface Temperature | `calc-hvacsystems.js` | C | pending |
| v1676 | `jacketing-fitting-quantity` | Pipe Insulation Jacketing and Fitting Cover Quantity | `calc-hvacsystems.js` | C | pending |
| v1677 | `refractory-shell-temperature` | Refractory Lining Heat Loss and Shell Temperature | `calc-hvacsystems.js` | C | pending |
| v1678 | `cryogenic-boiloff` | Cryogenic Tank Boil-Off Rate and Hold Time | `calc-hvacsystems.js` | C | pending |
| v1679 | `square-to-round-development` | Square-to-Round Transition Development | `calc-metalair.js` | E | pending |
| v1680 | `gored-elbow-angles` | Gored Elbow Segment Angles and Development | `calc-metalair.js` | E | pending |
| v1681 | `standing-seam-takeoff` | Standing Seam Metal Panel and Clip Takeoff | `calc-metalair.js` | E | pending |
| v1682 | `metal-roof-thermal-movement` | Metal Roof Thermal Movement and Sliding Clip Range | `calc-metalair.js` | E | pending |
| v1683 | `mortar-batch-c270` | Mortar Batch Proportions by Type (ASTM C270) | `calc-masonry.js` | E | pending |
| v1684 | `grout-lift-pour-height` | CMU Grout Lift and Pour Height Limits | `calc-masonry.js` | E | pending |
| v1685 | `masonry-cleaning-dilution` | Masonry Cleaning Acid Dilution and Coverage | `calc-masonry.js` | E | pending |
| v1686 | `scaffold-tie-spacing` | Scaffold Tie Spacing and Height-to-Base Ratio | `calc-construction.js` | E | pending |
| v1687 | `mast-climber-platform-load` | Mast Climbing Work Platform Load Distribution | `calc-construction.js` | E | pending |
| v1688 | `suspended-scaffold-counterweight` | Suspended Scaffold Outrigger Counterweight | `calc-construction.js` | E | pending |
| v1689 | `shoring-reshoring-load` | Slab Shoring and Reshoring Load Distribution | `calc-construction.js` | E | pending |
| v1690 | `negative-air-ach` | Abatement Containment Negative Air and Air Changes | `calc-demo.js` | D | pending |
| v1691 | `abatement-waste-containers` | Abatement Waste Volume and Container Count | `calc-demo.js` | D | pending |
| v1692 | `lead-dust-clearance` | Lead Dust Clearance Loading and Wipe Count | `calc-demo.js` | D | pending |
| v1693 | `silica-ventilation-screen` | Respirable Silica Exposure and Ventilation Screen | `calc-demo.js` | D | pending |
| v1694 | `demolition-debris-tonnage` | Demolition Debris Volume to Tonnage and Containers | `calc-demo.js` | D | pending |
| v1695 | `trunk-strength-loss` | Tree Trunk Strength Loss and Failure Screen | `calc-arborist.js` | L | pending |
| v1696 | `crown-reduction-leaf-area` | Crown Reduction Percentage and Leaf Area Loss | `calc-arborist.js` | L | pending |
| v1697 | `root-ball-size-weight` | Tree Root Ball Diameter and Weight (ANSI Z60.1) | `calc-arborist.js` | L | pending |
| v1698 | `tree-cabling-rating` | Tree Cabling Support System Rating (ANSI A300) | `calc-arborist.js` | L | pending |
| v1699 | `stump-grinding-volume` | Stump Grinding Volume and Chip Yield | `calc-arborist.js` | L | pending |
| v1700 | `soil-volume-for-canopy` | Soil Volume Required for a Target Canopy | `calc-arborist.js` | L | pending |
| v1701 | `pool-cover-savings` | Pool Cover Evaporation and Heat Loss Savings | `calc-water.js` | M | pending |
| v1702 | `pool-pump-speed-savings` | Pool Pump Speed Reduction Energy Savings | `calc-water.js` | M | pending |
| v1703 | `pool-heat-pump-capacity` | Pool Heat Pump Capacity vs Air and Water Temperature | `calc-water.js` | M | pending |
| v1704 | `spa-drain-interval` | Spa Drain Interval and Refill Volume | `calc-water.js` | M | pending |
| v1705 | `injection-clamp-tonnage` | Injection Mold Clamp Tonnage and Projected Area | `calc-process.js` | S | pending |
| v1706 | `shot-size-residence-time` | Injection Shot Size, Barrel Capacity, and Residence Time | `calc-process.js` | S | pending |
| v1707 | `injection-cooling-time` | Injection Molding Cooling Time From Wall Thickness | `calc-process.js` | S | pending |
| v1708 | `mold-shrinkage-dimension` | Molded Part Shrinkage and Mold Dimension | `calc-process.js` | S | pending |
| v1709 | `extrusion-output-rate` | Extrusion Output Rate and Line Speed | `calc-process.js` | S | pending |
| v1710 | `thermoforming-draw-ratio` | Thermoforming Draw Ratio and Wall Thinning | `calc-process.js` | S | pending |
| v1711 | `hdpe-fusion-pressure-time` | HDPE Butt Fusion Interface Pressure and Cycle Time | `calc-process.js` | S | pending |
| v1712 | `thermoplastic-temperature-derate` | Thermoplastic Pipe Pressure Derating vs Temperature | `calc-process.js` | S | pending |
| v1713 | `casting-pour-yield` | Casting Pour Weight, Gating Yield, and Charge | `calc-process.js` | S | pending |
| v1714 | `riser-modulus-feeding` | Riser Modulus and Feeding Distance | `calc-process.js` | S | pending |
| v1715 | `sand-permeability-vent` | Molding Sand Permeability and Vent Area | `calc-process.js` | S | pending |
| v1716 | `melt-furnace-energy` | Melt Furnace Energy and Charge Time | `calc-process.js` | S | pending |
| v1717 | `stack-emission-pte` | Stack Emission Rate and Potential to Emit | `calc-airquality.js` | S | pending |
| v1718 | `opacity-six-minute` | Visible Emission Opacity Six-Minute Average | `calc-airquality.js` | S | pending |
| v1719 | `baghouse-cleaning-interval` | Baghouse Pressure Drop and Pulse Cleaning Interval | `calc-airquality.js` | S | pending |
| v1720 | `scrubber-lg-ratio` | Wet Scrubber Liquid-to-Gas Ratio and Removal | `calc-airquality.js` | S | pending |
| v1721 | `thermal-oxidizer-residence` | Thermal Oxidizer Residence Time and Chamber Volume | `calc-airquality.js` | S | pending |
| v1722 | `coating-voc-compliance` | Coating VOC Content and Compliance Rate | `calc-airquality.js` | S | pending |
| v1723 | `spcc-containment-volume` | SPCC Secondary Containment Volume and Freeboard | `calc-airquality.js` | S | pending |
| v1724 | `esp-deutsch-efficiency` | Electrostatic Precipitator Collection Efficiency (Deutsch) | `calc-airquality.js` | S | pending |
| v1725 | `carbon-bed-life` | Activated Carbon Adsorber Bed Life and Breakthrough | `calc-airquality.js` | S | pending |
| v1726 | `plume-rise-briggs` | Stack Plume Rise and Effective Stack Height (Briggs) | `calc-airquality.js` | S | pending |
| v1727 | `gaussian-dispersion-screen` | Downwind Ground-Level Concentration Screen (Gaussian) | `calc-airquality.js` | S | pending |
| v1728 | `noise-barrier-insertion-loss` | Noise Barrier Insertion Loss (Fresnel Number) | `calc-airquality.js` | S | pending |
| v1729 | `community-noise-ldn` | Day-Night Average Sound Level (Ldn and CNEL) | `calc-airquality.js` | S | pending |
| v1730 | `odor-dilution-threshold` | Odor Dilution to Threshold and Stack Height Screen | `calc-airquality.js` | S | pending |
| v1731 | `dilution-ventilation-solvent` | Dilution Ventilation Rate for a Solvent Vapor | `calc-cross.js` | G | pending |
| v1732 | `respirator-cartridge-life` | Respirator Cartridge Service Life Estimate | `calc-cross.js` | G | pending |
| v1733 | `arc-rated-clothing-selection` | Arc-Rated Clothing ATPV Selection From Incident Energy | `calc-cross.js` | G | pending |
| v1734 | `stored-energy-bleed-down` | Stored Energy Bleed-Down Time and Verification | `calc-cross.js` | G | pending |
| v1735 | `fixed-ladder-rest-platform` | Fixed Ladder Rest Platform and Climb System Spacing | `calc-cross.js` | G | pending |
| v1736 | `retrieval-winch-force` | Confined Space Retrieval Winch Force and Line Pull | `calc-cross.js` | G | pending |
| v1737 | `pump-test-transmissivity` | Aquifer Pump Test Transmissivity (Cooper-Jacob) | `calc-drainage.js` | M | pending |
| v1738 | `seepage-travel-time` | Groundwater Seepage Velocity and Travel Time | `calc-drainage.js` | M | pending |
| v1739 | `well-point-spacing` | Well Point Dewatering Spacing and Flow | `calc-drainage.js` | M | pending |
| v1740 | `water-quality-volume` | Stormwater Water Quality Volume and Treatment Sizing | `calc-drainage.js` | M | pending |
| v1741 | `drone-gsd-overlap` | Drone Flight GSD, Overlap, and Image Count | `calc-survey.js` | P | pending |
| v1742 | `lidar-point-density` | LiDAR Point Density and Flight Line Spacing | `calc-survey.js` | P | pending |
| v1743 | `rtk-error-budget` | RTK Baseline Error Budget and Vertical Uncertainty | `calc-survey.js` | P | pending |
| v1744 | `mass-haul-overhaul` | Mass Haul Balance, Free Haul, and Overhaul | `calc-survey.js` | P | pending |
| v1745 | `radon-fan-static` | Radon Fan Static Pressure and Pipe Sizing | `calc-cross.js` | G | pending |
| v1746 | `radon-suction-pit` | Radon Sub-Slab Suction Pit and Field Extension | `calc-cross.js` | G | pending |
| v1747 | `acid-waste-neutralization` | Acid Waste Neutralization Tank Sizing | `calc-cross.js` | G | pending |
| v1748 | `fume-hood-face-velocity` | Fume Hood Face Velocity and Exhaust CFM | `calc-cross.js` | G | pending |
| v1749 | `lab-containment-pressure` | Laboratory Air Change Rate and Containment Pressure | `calc-cross.js` | G | pending |
