# Scope: moving I-code values off the 2021 editions

> Scoping report, 2026-10-17. Nothing here has been changed in the calculators; every I-code tile still bundles 2021 values and says so (status `disclosed-lag` in [citation-freshness-ledger.md](citation-freshness-ledger.md)).

## Bottom line

The refresh is smaller and more feasible than "a large research job" suggested:

- **92 calculators** cite an I-code section or table by number. Their values are **constants in the calculator code**, not data shards. The one exception is the soil-bearing shard, which mirrors IBC Table 1806.2.
- **The newer text is free to read.** ICC's Digital Codes read-only view shows the 2024 IRC and the 2027 IBC/IPC as plain text, tables included. It needs no account, but a browser is required: the pages render in JavaScript, and scripted fetches get a 403.
- **Every value sampled in the first pass was unchanged** (one later turned out to differ; see Progress): IRC 2024 riser 7¾ in, tread 10 in, guard sphere 4 in, egress opening 5.7 ft², and all four southern-pine rows of Table R507.6. The 2027 IPC Table 709.1 drainage fixture units (bathtub 2, bathroom group 5/6, washers 2/3) also match.
- **The certain cost is renumbering, not values.** The 2024 IRC reorganized Chapter 3: stairs moved from R311 to **R318**, emergency escape openings from R310 to **R319**, and guards from R312 to **R321**, while R311 is now carbon-monoxide alarms. Every IRC Chapter 3 citation in the catalog now points at the wrong section of the current code.

## Inventory

| Code | Bundled → current | Tiles | Tables the values come from | Likely to change | Effort |
|---|---|---|---|---|---|
| IRC | 2021 → 2024 (2027 due Feb 2027) | 39 | R301.2, R507.6, R507.9.1.3(1), R602.7(1); about 45 sections across Ch. 3, 4, 5, 6, 7, 8, 9, M15 | Ch. 3 section numbers: **certain**. Values: 8 of 8 sampled unchanged | M |
| IBC | 2021 → 2027 (two editions) | 21 | 506.2, 506.3.3, 705.8, 1004.5, 1006.3.3, 1017.2, 1607.1, 1806.2 (shard), 2902.1 | Unknown; two editions of change, the highest risk | M–L |
| IPC | 2021 → 2027 (two editions) | 30 | 308.5, 403.1, 604.3, 608.16.1, 704.1, 709.1, 710.1(1), 710.1(2), 712.4.2, 909.1, E103.3(3) | 709.1 sampled unchanged; rest unknown | M |
| IFGC | 2021 → 2027 | 6 | 402.4 (the capacity shard uses Spitzglass/Weymouth formulas, not the table) | Low; mostly section text (304 combustion air, 406.4 test pressure) | S |
| IMC | 2021 → 2027 | 3 | none; sections 307.2, 506.3, 507.5, 508 | Low | S |
| IFC | 2021 → 2027 | 0 with bundled values | none (hydrant spacing is entered by the user) | None | — |

Tile lists per code are reproducible with the scan described under "Method".

## Method that would work

1. **One comparator script.** For each cited table: read the current edition's page in the browser pane, parse the table text, and diff it against the bundled constant. For each cited section: diff the numbers in its text. Record a per-table result row with source, edition and verified date, the same pattern as `worked-examples.json`.
2. **Unchanged values:** re-cite the current edition and section number, and note "unchanged from 2021". This is most of the work, and it is mechanical.
3. **Changed values:** follow the dual-edition window in [edition-rollover.md](edition-rollover.md) (spec-v10 §F.3). Default to the current edition and print the 2021 value beside it, because many states still enforce 2021.

## Progress

| Slice | Status |
|---|---|
| IRC Chapter 3 (stairs, guards, landings, egress windows, alarms; 12 tiles) | Landed 2026-10-17. Renumbered only, except **smoke-alarm cooking clearance, which changed** (2024 R310.3.1: 10 ft for every type, 6 ft exception, in place of 2021's 20 / 10 / 6 ft by type); the tile now offers both editions. |
| IRC R507 decks and R602.7 headers (4 tiles) | Landed 2026-10-17. Every bundled value identical; numbers unchanged. |
| IPC drainage (Tables 704.1, 709.1, 710.1(1), 710.1(2), 712.4.2, 909.1; 5 tiles) | Landed 2026-10-17. Identical to 2021 except **drinking fountain DFU, 1/2 in 2021 and 2024, 0 in 2027**; the tile follows 2027 and states the 2021/2024 adjustment. |
| IPC supply (Tables 308.5, 604.3, 608.16.1, E103.3(3); 5 tiles) | Landed 2026-10-17. Every value identical. Table 403.1 is not bundled (`plumbing-fixture-count` takes the ratios as inputs) and goes with the IBC slice. |
| IBC tables (two editions behind) | Not started. |

Read the **current printing** (the site offers to switch from a historical one, e.g. `IRC2024P2` to `IRC2024V2.1`); the first Chapter 3 pass used P2 and the re-read caught the smoke-alarm change.

## Recommended first slice

**IRC Chapter 3 (stairs, guards, landings, egress windows, smoke and CO alarms): about 13 tiles.** The renumbering is certain, the pages are high-traffic, few tables are involved, and the values have already been spot-checked as unchanged. After that: the IRC R507 deck tables, the IPC drainage tables, and the IBC tables last (two editions behind).

## Not covered / caveats

- **IRC 2027** is not published (ICC expects February 2027). Doing IRC now means a second pass next year, though likely only a small one.
- **Scan noise.** "IRC 179" and similar hits are the Internal Revenue Code (tax tiles), and "IMC" on `burial-depth-300-5` is intermediate metal conduit; both were excluded.
- **A stale manifest line.** The fire manifest says "IFC 2021 Table B105.1 cited by section number", but the fire-flow tile explicitly does *not* use B105.1. That sentence should be corrected.
- **Terms of use.** Values were read for verification only; ICC's text is not reproduced. The tiles already embed the numeric values they compute with, which is existing practice.
