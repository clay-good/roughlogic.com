# roughlogic.com Specification v242 -- Building Occupant Load from Area and Use (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-01). Batch spec-v242..v244 (the IBC/IPC occupancy trio -- the one number the whole code
> path hangs on (the occupant load), and the two demands it drives: the egress width and the fixture count). This spec
> opens the batch.**
> In-scope catalog expansion under the spec-v106 trades-only charter: the occupant load is the first calculation a
> general contractor, plans examiner, or fit-out carpenter runs on a tenant-improvement job, because nothing else in the
> life-safety chain can be sized until it is known. Adds one tile to a new **`calc-construction.js`** Group E cluster
> (beside `control-joint-spacing` and the earthwork deepening); no new group, trade, or dependency. Inherits spec.md
> through spec-v241.md.
>
> **The gap, and the evidence for it.** Every egress, fixture, and ventilation requirement in the building code is a
> function of the occupant load, and the occupant load is a function of the floor area divided by an occupant-load factor
> set by how the space is used (IBC 2021 §1004.5, Table 1004.5). A 3,000 ft^2 office is 20 people at 150 ft^2 gross; the
> same 3,000 ft^2 turned into a standing bar is 600 people at 5 ft^2 net -- a thirty-fold swing that decides how many
> exits, how wide the doors, and how many toilets the space needs. The catalog sizes drainage by fixture units
> (`sanitary-dfu`), water by fixture units (`wsfu-demand`), and ventilation by area (`ashrae-622-ventilation`), but has
> nothing that turns an area and a use into the occupant load those downstream requirements all start from.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. Each space area is an area
(ft^2); the occupant-load factor is an area per person (ft^2 per occupant); the occupant load per space and the total are
counts (`dimensionless`, rounded up per IBC §1004.2 so a fraction of a person is a whole person). The v18/v21 contract:
any non-finite input, a non-positive area, or an occupant-load factor at or below zero, returns `{ error }`; an empty
space list returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the occupant-load relation by
name; `editionNote` names **IBC 2021 §1004.5 and Table 1004.5** (occupant load `= sum over spaces of ceil(area / OLF)`),
lists the bundled representative occupant-load factors as editable defaults (assembly standing 5 net, assembly
concentrated / chairs-only 7 net, assembly unconcentrated / tables-and-chairs 15 net, business 150 gross, mercantile
60 gross, educational classroom 20 net, commercial kitchen 200 gross, industrial 100 gross, storage / warehouse 500
gross, residential 200 gross), and states that **the factor and whether it applies to net or gross area come from the
AHJ-adopted code edition and the actual use (not the tenant's label), a mezzanine or accessory use is its own line, the
§1004.6 fixed-seating and §1004.7 outdoor-area rules are handled separately, and this is a design aid, not a code-official
determination** -- the building official's occupant-load approval governs.

## 2. The tile

### 2.1 `occupant-load` -- Building Occupant Load from Area and Use

```
inputs:
  spaces[]                        one row per space (repeatable):
    area          ft^2            floor area of the space
    olf           ft^2/occupant   occupant-load factor for the use (default 150, business gross)

per_space_load = ceil(area / olf)
total_load     = sum(per_space_load)
```

**Pinned worked example (small office with a conference room).** A 3,000 ft^2 open office at 150 ft^2/occupant gross plus
a 600 ft^2 conference room used as assembly-unconcentrated at 15 ft^2/occupant net: office `= ceil(3000 / 150) = 20`;
conference `= ceil(600 / 15) = 40`; `total_load = 20 + 40 = ` **60 occupants** -- the number the exit count, the egress
width, and the toilet count all start from. **Cross-check (a restaurant dining room).** A 2,400 ft^2 dining area at the
assembly-unconcentrated 15 ft^2/occupant net factor: `ceil(2400 / 15) = ` **160 occupants**, which (per v243) crosses the
threshold that forces a second exit and (per v244) sets the required fixtures. The same 2,400 ft^2 relabeled as
standing-space assembly at 5 ft^2/occupant would be 480 occupants -- three times the load from the same floor, which is
exactly why the use, not the area alone, governs.

## 3. Wiring

A `tools-data.js` row (group `E`, trade `["construction","carpentry"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, the occupant-load relation, `editionNote` naming IBC 2021 §1004.5 / Table 1004.5 with the
bundled representative factors and the net-vs-gross / actual-use / AHJ-determination caveats);
`test/fixtures/worked-examples.json` (the office-plus-conference example + the dining-room cross-check);
`test/fixtures/compute-map.js` (`occupant-load` -> `computeOccupantLoad` in `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `egress-capacity` / `plumbing-fixture-count` / `ashrae-622-ventilation`);
`data/search/aliases.json` ("occupant load", "occupancy load", "how many people", "occupant load factor", "IBC 1004",
"maximum occupancy", "people count for exits", "occupant load calculation"); the id appended to a new construction
renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning both examples and error seams (non-finite, area <= 0, OLF <= 0, empty space list). Add the `calc-construction.js`
size to the `check:module-sizes` allowlist (dated comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the empty-list and non-positive-area error paths); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the per-space rows and the total stack
wrap on a phone); render-no-nan + a11y sweep, output read to the value (3,000 ft^2 office + 600 ft^2 conference -> 60
occupants).

## 5. Roadmap position

Opens the IBC/IPC occupancy batch (v242..v244). Produces the occupant load that `egress-capacity` (v243) turns into the
required exit count and door / stair width, and that `plumbing-fixture-count` (v244) turns into the minimum toilets,
lavatories, and drinking fountains -- the same number feeding both branches of the code path. A fixed-seating occupant
count (per §1004.6) and a cumulative multi-story egress-convergence helper are deliberate future follow-ons.
