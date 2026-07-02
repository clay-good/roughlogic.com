# roughlogic.com Specification v251 -- Allowable Building Area per Story with Frontage and Sprinkler Increase (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-01). Batch spec-v251..v253 (the IBC plan-review trio -- the three code gates every
> commercial permit set clears: how big the building may be (allowable area), how far it is to an exit (travel
> distance), and how much glass the exterior wall may hold near a lot line (opening protection)). This spec opens the
> batch.**
> In-scope catalog expansion under the spec-v106 trades-only charter: the allowable area is the first feasibility number
> a general contractor, developer, or plans examiner runs on a commercial project, because it decides whether the
> building fits the lot and the chosen construction type at all -- before a single stud is drawn. Adds one tile to the
> **`calc-construction.js`** Group E cluster (beside `occupant-load` and the earthwork/joint tiles); no new group, trade,
> or dependency. Inherits spec.md through spec-v250.md.
>
> **The gap, and the evidence for it.** IBC 2021 Chapter 5 caps how large a building may be per story as a function of
> its occupancy group and construction type (Table 506.2), then grants two increases: a frontage increase for perimeter
> that opens onto a public way or open space (§506.3), and a sprinkler increase baked into the S1 / SM columns of the
> table. The governing relation (§506.2.1) is `Aa = At + (NS x If)`, where `If = [F/P - 0.25] x (W/30)` -- a corner lot
> with a wide street can add a quarter again to the tabular area, and sprinklers triple it for a single-story building.
> The catalog computes the occupant load (`occupant-load`), the egress that load drives (`egress-capacity`), and the
> loads a structure carries (`asce7-load-combinations`, `seismic-base-shear`), but has nothing that answers the question
> that comes before all of them on a feasibility study: given this lot, this use, and this construction type, how many
> square feet per floor is the building even allowed to be?

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The tabular area, the
nonsprinklered base area, the allowable area, and the actual per-story area are all areas (ft^2); the frontage `F`, total
perimeter `P`, and open-space width `W` are lengths (ft); the frontage factor `If` and the ratio `F/P` are counts
(`dimensionless`). The v18/v21 contract: any non-finite input, a non-positive tabular area, a non-positive perimeter, or
a frontage `F` exceeding the perimeter `P`, returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over
the allowable-area relation by name; `editionNote` names **IBC 2021 §506.2 (`Aa = At + NS x If`), §506.3.1 (frontage must
be 25% or more of the perimeter on an open space 20 ft or wider to take any increase, so `If` floors at 0 when
`F/P < 0.25`), §506.3.2 (`If = [F/P - 0.25] x W/30`), and §506.3.3 (`W` is capped at 30 ft in the equation unless the
§506.3.3 exception for a way 20 ft or wider applies)**, and states that **the tabular areas `At` and `NS` come from
Table 506.2 for the actual occupancy group and construction type in the correct sprinkler column (NS nonsprinklered,
S1 single-story sprinklered, SM multistory sprinklered), a mixed-occupancy or multistory building uses the §506.2.2 /
§508.4 sum-of-ratios and the §506.2.3 three-story area multiplier rather than this single-occupancy single-story form,
and this is a feasibility aid, not a code-official determination** -- the building official's area approval governs.

## 2. The tile

### 2.1 `allowable-area` -- Allowable Building Area per Story (IBC Chapter 5)

```
inputs:
  tabular_area    ft^2    At: Table 506.2 area for the use + construction type, correct sprinkler column
  ns_area         ft^2    NS: Table 506.2 nonsprinklered area for the same use + construction type
  frontage_ft     F ft    perimeter fronting a public way / open space 20 ft or wider
  perimeter_ft    P ft    total building perimeter
  open_width_ft   W ft    width of the public way / open space (default 30)
  actual_area     ft^2    actual proposed area of the story being checked

w_eff       = min(open_width_ft, 30)
frontage_if = (frontage_ft / perimeter_ft) < 0.25 ? 0
            : ((frontage_ft / perimeter_ft) - 0.25) * (w_eff / 30)
allowable   = tabular_area + ns_area * frontage_if
pass        = actual_area <= allowable
```

**Pinned worked example (single-story Business on a corner lot, sprinklered).** A Type VB Group B office, single-story,
sprinklered: Table 506.2 gives `At = 27,000` ft^2 (VB / B / S1) and `NS = 9,000` ft^2 (VB / B nonsprinklered). The
building sits on a corner with `F = 200` ft of its `P = 400` ft perimeter fronting a 30 ft street, `W = 30`:
`frontage_if = (200/400 - 0.25) x (30/30) = (0.5 - 0.25) x 1 = 0.25`; `allowable = 27,000 + 9,000 x 0.25 = ` **29,250 ft^2**.
A proposed 25,000 ft^2 floor **passes** with 4,250 ft^2 to spare. **Cross-check (a nonsprinklered restaurant that does
not fit).** A Type IIB Group A-2 restaurant, single-story, nonsprinklered: Table 506.2 `At = NS = 9,500` ft^2, and with
an interior lot fronting less than a quarter of its perimeter on open space `frontage_if = 0`, so `allowable = 9,500` ft^2.
A proposed 12,000 ft^2 dining building **fails** by 2,500 ft^2 -- adding an NFPA 13 sprinkler system moves the job to the
S1 column (`28,500` ft^2, three times the nonsprinklered area) and the same footprint then passes with room to grow,
which is exactly why the sprinkler decision is the first lever a developer reaches for when the area is tight.

## 3. Wiring

A `tools-data.js` row (group `E`, trade `["construction","carpentry"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, the allowable-area relation, `editionNote` naming IBC 2021 §506.2 / §506.3.1 / §506.3.2 /
§506.3.3 with the Table-506.2 column, mixed-occupancy sum-of-ratios, and AHJ-determination caveats);
`test/fixtures/worked-examples.json` (the corner-lot office example + the nonsprinklered-restaurant cross-check);
`test/fixtures/compute-map.js` (`allowable-area` -> `computeAllowableArea` in `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `occupant-load` / `egress-capacity` / `exterior-opening-protection`);
`data/search/aliases.json` ("allowable area", "building area limit", "IBC Chapter 5", "frontage increase", "sprinkler
area increase", "how big can I build", "Table 506.2", "construction type area"); the id appended to the construction
renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning both examples and error seams (non-finite, tabular area <= 0, perimeter <= 0, frontage > perimeter) plus
the `F/P < 0.25` no-increase boundary and the `W > 30` cap. Re-pin the `calc-construction.js` size in the
`check:module-sizes` allowlist (dated comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the frontage-floor and width-cap boundaries, the non-positive and frontage-over-
perimeter error paths); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the frontage-factor / allowable / pass-fail stack wraps on a phone); render-no-nan + a11y sweep,
output read to the value (VB / B corner-lot office -> 29,250 ft^2 allowable, 25,000 ft^2 passes).

## 5. Roadmap position

Opens the IBC plan-review batch (v251..v253). Sits upstream of `egress-travel-distance` (v252) and
`exterior-opening-protection` (v253), the two other permit-set gates, and beside the occupancy trio (v242..v244) whose
occupant load feeds the egress branch. An allowable-height-and-stories check (Tables 504.3 / 504.4) and a
mixed-occupancy sum-of-ratios helper (§508.4) are deliberate future follow-ons.
