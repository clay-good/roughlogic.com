# roughlogic.com Specification v252 -- Egress Travel Distance, Common Path, and Dead-End Check (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-01). Batch spec-v251..v253 (the IBC plan-review trio -- allowable area, egress travel
> distance, and exterior opening protection). This spec continues the batch.**
> In-scope catalog expansion under the spec-v106 trades-only charter: once a floor is laid out, the three distances that
> decide whether the exits are close enough -- travel distance to the nearest exit, the common path before the occupant
> has a choice of two, and the length of any dead-end corridor -- are the checks a plans examiner runs against the
> drawing before the permit issues. Adds one tile to the **`calc-construction.js`** Group E cluster (beside
> `occupant-load` and `egress-capacity`, whose exit count and width this closes out); no new group, trade, or dependency.
> Inherits spec.md through spec-v251.md.
>
> **The gap, and the evidence for it.** IBC 2021 Chapter 10 caps three distances on every exit-access path: the maximum
> exit-access travel distance to the nearest exit (Table 1017.2 -- e.g. 300 ft for Group B sprinklered, 200 ft without),
> the common path of egress travel before two independent paths are available (§1006.2.1, Table 1006.2.1 -- 75 ft, or
> 100 ft for B / F / S with the sprinkler and low-occupant-load conditions), and the length of a dead-end corridor
> (§1020.5 -- 20 ft, or 50 ft sprinklered for many occupancies). `egress-capacity` (v243) already tells the designer how
> many exits a floor needs and how wide each must be, but nothing in the catalog checks the other half of the egress
> problem: whether those exits are close enough and reachable without a long single-path or a dead-end trap. The v243
> spec named a travel-distance / common-path check as a deliberate follow-on; this is it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. Every measured distance and
every limit is a length (ft); each margin is a length (ft); the three pass flags are booleans and the overall pass is
their conjunction. The v18/v21 contract: any non-finite input, or any negative distance or non-positive limit, returns
`{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the three egress-distance limits by name;
`editionNote` names **IBC 2021 §1017 / Table 1017.2 (maximum exit-access travel distance), §1006.2.1 / Table 1006.2.1
(common path of egress travel), and §1020.5 (dead-end corridor)**, gives the bundled limits as editable defaults for a
sprinklered Group B floor (travel 300 ft, common path 100 ft, dead-end 50 ft), and states that **the limit for each
distance depends on the occupancy group and whether the building is sprinklered per §903.3.1.1, travel distance is
measured along the natural path of travel around obstructions and not in a straight line, common-path and dead-end
limits tighten for higher-hazard uses and for occupant loads above the §1006.2.1 thresholds, and this is a design aid,
not a code-official determination** -- the building official's egress approval governs.

## 2. The tile

### 2.1 `egress-travel-distance` -- Egress Travel Distance, Common Path, and Dead-End Check (IBC Chapter 10)

```
inputs:
  travel_ft            ft    measured exit-access travel distance to the nearest exit
  travel_limit_ft      ft    Table 1017.2 limit for the use + sprinkler status (default 300)
  common_path_ft       ft    measured common path of egress travel
  common_path_limit_ft ft    Section 1006.2.1 limit (default 100)
  dead_end_ft          ft    longest dead-end corridor on the path
  dead_end_limit_ft    ft    Section 1020.5 limit (default 50)

pass_travel   = travel_ft <= travel_limit_ft
pass_common   = common_path_ft <= common_path_limit_ft
pass_deadend  = dead_end_ft <= dead_end_limit_ft
pass          = pass_travel AND pass_common AND pass_deadend
margins        = { travel: travel_limit_ft - travel_ft,
                   common: common_path_limit_ft - common_path_ft,
                   deadend: dead_end_limit_ft - dead_end_ft }
```

**Pinned worked example (sprinklered Group B office floor).** Sprinklered Group B, limits 300 / 100 / 50 ft: a measured
travel distance of 240 ft, a common path of 68 ft, and a longest dead-end of 18 ft all clear -- `pass = true`, with the
tightest margin at travel (`300 - 240 = 60 ft` of headroom). The floor plan works as drawn. **Cross-check (a
nonsprinklered warehouse that fails).** Nonsprinklered Group S-1, limits `travel 200 / common 75 / dead-end 20`: a
measured travel distance of 260 ft **fails** by 60 ft while common path (60 ft) and dead-end (15 ft) pass -- so
`pass = false`, and the fix is either an NFPA 13 sprinkler system (which raises the Table 1017.2 travel limit to 400 ft
for S-1 and clears the floor at once) or an added exit that shortens the longest path, which is exactly the trade the
travel-distance check is meant to expose before the walls are framed.

## 3. Wiring

A `tools-data.js` row (group `E`, trade `["construction","carpentry"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, the three egress-distance limits, `editionNote` naming IBC 2021 §1017 / Table 1017.2 /
§1006.2.1 / Table 1006.2.1 / §1020.5 with the occupancy-and-sprinkler / measured-along-path / higher-hazard caveats);
`test/fixtures/worked-examples.json` (the office pass example + the warehouse travel-fail cross-check);
`test/fixtures/compute-map.js` (`egress-travel-distance` -> `computeEgressTravelDistance` in `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `egress-capacity` / `occupant-load` / `allowable-area`); `data/search/aliases.json`
("travel distance", "common path of egress travel", "dead end corridor", "maximum travel distance to exit", "IBC 1017",
"how far to an exit", "exit access distance", "dead end hallway limit"); the id appended to the construction renderers
declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning both examples and error seams (non-finite, negative distance, non-positive limit) plus a floor where exactly one
of the three checks fails while the other two pass (to prove the conjunction). Re-pin the `calc-construction.js` size in
the `check:module-sizes` allowlist (dated comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the single-check-fail conjunction case, the negative-distance and non-positive-limit
error paths); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner;
320 px audit (the three pass/fail rows and their margins stack on a phone); render-no-nan + a11y sweep, output read to
the value (240 / 68 / 18 ft against 300 / 100 / 50 -> all pass, travel margin 60 ft).

## 5. Roadmap position

Continues the IBC plan-review batch (v251..v253). Closes out the egress work `egress-capacity` (v243) began -- that tile
sizes the exits, this one confirms they are reachable -- and sits between `allowable-area` (v251) and
`exterior-opening-protection` (v253). A number-of-exits-vs-occupant-load remoteness check (the §1007.1.1 half-diagonal
separation rule) and a stair-pressurization / smokeproof-enclosure helper are deliberate future follow-ons.
