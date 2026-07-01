# roughlogic.com Specification v243 -- Egress Capacity, Exit Count, and Required Width (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-01). Batch spec-v242..v244 (the IBC/IPC occupancy trio -- occupant load, egress capacity,
> and fixture count). This spec continues the batch.**
> In-scope catalog expansion under the spec-v106 trades-only charter: once the occupant load is known, the number of
> exits and the width of every door, stair, and corridor on the egress path is a direct code calculation the contractor
> and the plans examiner both run. Adds one tile to the **`calc-construction.js`** Group E cluster (beside `occupant-load`);
> no new group, trade, or dependency. Inherits spec.md through spec-v242.md.
>
> **The gap, and the evidence for it.** The building code turns the occupant load into two life-safety demands: how many
> separate exits a space needs (IBC 2021 Table 1006.3.4 / §1006.2 -- one up to the limit, two from there to 500, three to
> 1,000, four beyond) and how much clear egress width the occupants require (IBC §1005.3 -- occupants times a
> per-occupant capacity factor, 0.2 in for stairways and 0.15 in for level components such as doors and corridors when
> the building is sprinklered with an alarm, or 0.3 / 0.2 in without). A 160-occupant room needs two exits and 24 in of
> total door width -- but the 32 in minimum clear width of a single door (§1010.1.1) governs each leaf, so the count of
> exits, not the arithmetic width, is what usually controls a small space. The catalog now computes the occupant load
> (`occupant-load`) but has nothing that turns it into the exit count and the egress width that decide the door schedule
> and the stair sizing.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The occupant load is a count
(`dimensionless`); the capacity factors are a length per person (in per occupant); the total required width and the
per-exit width are a length (in); the exit count and the minimum door clear width are counts / lengths as the geometry
carries them. The v18/v21 contract: any non-finite input, a non-positive occupant load, or a capacity factor at or below
zero, returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the egress relations by name;
`editionNote` names **IBC 2021 §1005.3 (egress width `= occupant load x capacity factor`), §1006.2 / Table 1006.3.4 (the
exit-count thresholds), and §1010.1.1 (32 in minimum door clear width)**, gives the bundled capacity factors as editable
defaults (sprinklered-with-alarm: 0.2 in/occ stairways, 0.15 in/occ other; non-sprinklered: 0.3 in/occ stairways,
0.2 in/occ other), and states that **the 0.15 / 0.2 in reduced factors require the §1005.3.1 / §1005.3.2 sprinkler and
emergency-communication conditions, the width computed is divided among the required exits so no single exit carries more
than its share, the door-leaf minimum and the §1005.7 projection rules can govern over the arithmetic width, high-hazard
and some assembly occupancies have their own factors, and this is a design aid, not a code-official determination** -- the
building official's egress approval governs.

## 2. The tile

### 2.1 `egress-capacity` -- Egress Exit Count and Required Width

```
inputs:
  occupant_load   persons        occupant load served by the egress path (from occupant-load)
  sprinklered     bool           building has sprinklers + alarm per 1005.3.1/.2 (default true)
  path            enum           "level" (doors, ramps, corridors) or "stair" (default level)
  min_door_in     in             minimum single-leaf clear width (default 32)

factor         = path == "stair" ? (sprinklered ? 0.2 : 0.3) : (sprinklered ? 0.15 : 0.2)
exits_required = occupant_load <= 49 ? 1
               : occupant_load <= 500 ? 2
               : occupant_load <= 1000 ? 3 : 4
total_width_in = occupant_load * factor
per_exit_in    = max(total_width_in / exits_required, min_door_in)
```

**Pinned worked example (160-occupant sprinklered restaurant, level egress).** The 160-occupant dining room from v242,
sprinklered, level doors, 32 in minimum leaf: `factor = 0.15`; `exits_required = 2` (over 49, at or under 500);
`total_width_in = 160 x 0.15 = 24 in`; `per_exit_in = max(24 / 2, 32) = ` **32 in per exit** -- the door minimum governs,
so the answer is two 32 in doors, not two 12 in ones, which is the point: for a modest occupant load the exit count and
the leaf minimum control, not the raw width. **Cross-check (a 1,000-occupant sprinklered assembly, stairs).** The stair
factor 0.2 in/occ: `exits_required = 3` (over 500, at or under 1,000); `total_width_in = 1000 x 0.2 = 200 in`;
`per_exit_in = max(200 / 3, 32) = ` **66.7 in per stair** -- here the width, not the door minimum, governs, and three
stairs of about 5 ft 7 in each carry the crowd. The same 1,000 occupants without sprinklers would take the 0.3 in/occ
factor, 300 in total, 100 in per stair -- half again as much stair, which is why the sprinkler credit is worth so much
egress.

## 3. Wiring

A `tools-data.js` row (group `E`, trade `["construction","carpentry"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, the egress relations, `editionNote` naming IBC 2021 §1005.3 / §1006.2 / Table 1006.3.4 /
§1010.1.1 with the sprinkler-condition / share-among-exits / door-minimum / occupancy-specific caveats);
`test/fixtures/worked-examples.json` (the restaurant-door example + the assembly-stair cross-check);
`test/fixtures/compute-map.js` (`egress-capacity` -> `computeEgressCapacity` in `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `occupant-load` / `plumbing-fixture-count` / `stair-stringer`); `data/search/aliases.json`
("egress width", "exit capacity", "how many exits", "required exit width", "means of egress", "door width for occupants",
"stair width egress", "IBC 1005"); the id appended to the construction renderers declare in `app.js`; the `// dims:`
annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples and error seams
(non-finite, occupant load <= 0, factor <= 0) plus the three exit-count threshold boundaries (49, 500, 1000). Lazy-loaded,
absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the threshold-boundary and non-positive-load error paths); `npm run build` (one new
shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the exit-count / total-width /
per-exit stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (160 occupants sprinklered level
-> 2 exits, 32 in per door).

## 5. Roadmap position

Continues the IBC/IPC occupancy batch (v242..v244). Consumes the occupant load from `occupant-load` (v242) and sits beside
`plumbing-fixture-count` (v244), the other demand that same load drives. A travel-distance / common-path-of-egress-travel
check (IBC Table 1017.2 / §1006.2.1) and a stair-capacity-vs-tread-geometry cross-check are deliberate future follow-ons.
