# roughlogic.com Specification v244 -- Required Plumbing Fixture Count by Occupancy (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-02, package 0.90.0; was PROPOSED 2026-07-01). Batch spec-v242..v244 (the IBC/IPC occupancy trio -- occupant load, egress capacity,
> and fixture count). This closes the v242..v244 batch.**
> In-scope catalog expansion under the spec-v106 trades-only charter: the minimum number of toilets, lavatories, and
> drinking fountains a building must provide is the plumbing contractor's and the plans examiner's occupancy calculation,
> and it is the count the fixture-unit sizing tiles assume as their starting fixture list. Adds one tile to the
> **`calc-construction.js`** Group E cluster (beside `occupant-load` and `egress-capacity`); no new group, trade, or
> dependency. Inherits spec.md through spec-v243.md.
>
> **The gap, and the evidence for it.** The building code sets the minimum plumbing fixtures from the occupant load and
> the occupancy classification (IBC 2021 §2902 / Table 2902.1, mirrored in IPC Table 403.1): a business occupancy needs a
> water closet per 25 occupants for the first 50 and per 50 beyond, a lavatory per 40 for the first 80, a drinking
> fountain per 100, and a service sink; a restaurant needs a water closet per 75 and a lavatory per 200. The occupant
> load is split evenly between the sexes unless the use dictates otherwise, and each ratio rounds up, so a 100-occupant
> office needs four water closets, not the two a naive per-50 read would give. The catalog sizes the drain and the supply
> from a known fixture list (`sanitary-dfu`, `wsfu-demand`) but has nothing that produces the required fixture list itself
> -- the count that a code-compliant restroom layout must meet before any pipe is sized.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The occupant load is a count
(`dimensionless`); each fixture ratio is a count of occupants per fixture (`dimensionless`); the required water closets,
lavatories, drinking fountains, and service sinks are counts (`dimensionless`), each rounded up per IBC §2902.1.1. The
occupant load is divided evenly between two sexes (0.5 each) unless a `distribution` override is supplied. The v18/v21
contract: any non-finite input, a non-positive occupant load, any fixture ratio at or below zero, or a distribution
outside 0 to 1, returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the fixture-count relation
by name; `editionNote` names **IBC 2021 §2902 and Table 2902.1** (per sex, `fixtures = ceil(occupants_per_sex / ratio)`,
with the two-tier business water-closet and lavatory schedule; drinking fountains and service sinks counted on the total
load), gives the bundled representative ratios as editable defaults (business water closet 1:25 first-50 then 1:50,
lavatory 1:40 first-80 then 1:80; assembly-restaurant water closet 1:75, lavatory 1:200; drinking fountain 1:100 business
/ 1:500 assembly; service sink minimum 1), and states that **the ratios, the net-vs-gross basis, the even-sex-split
assumption, and any single-user / family-restroom or reduction allowances come from the AHJ-adopted code edition and the
actual occupancy, employee and customer loads may be counted separately, and this is a design aid, not a code-official
determination** -- the plumbing official's fixture approval governs.

## 2. The tile

### 2.1 `plumbing-fixture-count` -- Minimum Plumbing Fixtures by Occupancy

```
inputs:
  occupant_load       persons     total occupant load (from occupant-load)
  wc_ratio            occ/WC      occupants per water closet (default 25, business first-tier)
  wc_ratio_over       occ/WC      per-WC ratio above the first tier (default 50; set = wc_ratio if single-tier)
  wc_tier             persons     occupant count of the first tier per sex (default 50; 0 = single-tier)
  lav_ratio           occ/lav     occupants per lavatory (default 40)
  fountain_ratio      occ/DF      total occupants per drinking fountain (default 100)
  distribution        fraction    share of load taken as one sex (default 0.5)

per_sex   = occupant_load * distribution           (and occupant_load * (1 - distribution))
wc_tierN  = min(per_sex, wc_tier)
wc_over   = max(per_sex - wc_tier, 0)
wc(sex)   = ceil(wc_tierN / wc_ratio) + (wc_ratio_over > 0 ? ceil(wc_over / wc_ratio_over) : 0)
lav(sex)  = ceil(per_sex / lav_ratio)
fountains = ceil(occupant_load / fountain_ratio)
service   = 1
```

**Pinned worked example (100-occupant business office).** Occupant load 100, even split (50 each), business ratios
(water closet 1:25 first-50, lavatory 1:40 first-80, fountain 1:100): per sex `= 50`; water closets `= ceil(50 / 25) = 2`
each, **4 total**; lavatories `= ceil(50 / 40) = 2` each, **4 total**; drinking fountains `= ceil(100 / 100) = ` **1**;
service sink **1** -- the code minimum a naive per-50 read (which would give two water closets) undercounts, because the
1:25 first-tier ratio and the round-up both push it up. **Cross-check (a 160-occupant restaurant, A-2).** The dining room
from v242 at the assembly-restaurant ratios (water closet 1:75 single-tier, lavatory 1:200, fountain 1:500): per sex
`= 80`; water closets `= ceil(80 / 75) = 1` each, **2 total**; lavatories `= ceil(80 / 200) = 1` each, **2 total**;
drinking fountains `= ceil(160 / 500) = ` **1**; service sink **1**. The same 160 people as an office would need six water
closets to the restaurant's two -- the occupancy class, not the head count alone, sets the fixtures.

## 3. Wiring

A `tools-data.js` row (group `E`, trade `["plumbing","construction"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, the fixture-count relation, `editionNote` naming IBC 2021 §2902 / Table 2902.1 with the
per-sex two-tier schedule, the bundled representative ratios, and the ratio-source / sex-split / reduction-allowance
caveats); `test/fixtures/worked-examples.json` (the office example + the restaurant cross-check);
`test/fixtures/compute-map.js` (`plumbing-fixture-count` -> `computePlumbingFixtureCount` in `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `occupant-load` / `sanitary-dfu` / `wsfu-demand`); `data/search/aliases.json`
("plumbing fixture count", "required toilets", "number of restrooms", "water closet count", "IBC 2902", "minimum
lavatories", "fixture calculation", "how many bathrooms"); the id appended to the construction renderers declare in
`app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples and error seams (non-finite, occupant load <= 0, any ratio <= 0, distribution outside 0 to 1). Lazy-loaded,
absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the ratio and distribution error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the water-closet / lavatory / fountain / service
stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (100-occupant office -> 4 water closets,
4 lavatories, 1 fountain).

## 5. Roadmap position

Closes the IBC/IPC occupancy batch (v242..v244). Consumes the occupant load from `occupant-load` (v242), sits beside the
egress demand `egress-capacity` (v243) drives from that same load, and produces the required fixture list that
`sanitary-dfu` and `wsfu-demand` size the drain and supply for. A separate-facility threshold check (the occupant count
above which two sexes require separate restrooms) and an ambulatory / accessible-fixture minimum are deliberate future
follow-ons.
