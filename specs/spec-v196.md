# roughlogic.com Specification v196 -- Hydroxyl Generator Sizing by Volume and Dwell (IICRC S700) (calc-restoration.js, Group D, 1 New Tile)

> **Status: LANDED 2026-06-26 (package 0.83.0; part of catalog 656 -> 664). Batch spec-v188..v196 (water-damage restoration), closing tile.**
> In-scope catalog expansion under the spec-v106 trades-only charter: one fire-damage deodorization
> tile sizing hydroxyl generators by structure volume against a per-unit coverage rating -- the
> occupied-safe counterpart to ozone shock and thermal fogging. Adds one tile to
> **`calc-restoration.js`** (Group D); no new module, group, or dependency. Inherits spec.md through
> spec-v187.md.
>
> **The gap, and the evidence for it.** The deodorization family now covers ozone shock (v148) for
> empty structures and thermal/ULV fogging (v153) for penetrating odor, but not hydroxyl generation --
> the method a restorer uses precisely *because the structure is occupied*: hydroxyl radicals oxidize
> odor at safe occupied levels but work more slowly, so they are sized by coverage and run for days. No
> tile sizes the unit count or sets the run-time expectation.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The
structure volume and the per-unit coverage rating are `L^3` (ft^3); the unit count is a count; the
run time is `time` (days). The v18/v21 contract: any non-finite input, a non-positive volume, or a
non-positive coverage rating returns `{ error }`; the only division is by the guarded-positive coverage
rating, and the unit count is rounded **up**. Citation discipline (v19/v22): `GOVERNANCE.general` over
the volume/coverage sizing, by name; `editionNote` names ANSI/IICRC S700 and states that hydroxyl
generators are **safe for occupied spaces** (unlike ozone, v148, which requires an evacuated, sealed
structure), that coverage ratings and run times are **manufacturer-specific** and hydroxyl works more
slowly (commonly multiple days, run continuously), that severe odor still requires **source removal and
cleaning first**, and that the manufacturer and S700 govern.

## 2. The tile

### 2.1 `hydroxyl-sizing` -- Hydroxyl Generator Unit Count and Run-Time

```
inputs:
  structure_volume_ft3   L^3    volume to be treated
  unit_coverage_ft3      L^3    manufacturer coverage rating per generator (ft^3/unit)
  expected_days          time   anticipated continuous run time (manufacturer / odor severity)

units      = ceil(structure_volume_ft3 / unit_coverage_ft3)
note: run continuously; occupied-safe; re-clean and remove source before/between passes for heavy odor
```

**Pinned worked example.** A **12,000 ft^3** occupied structure with generators rated **6,000 ft^3**
each: `units = ceil(12,000 / 6,000) = 2` hydroxyl generators, run **continuously for several days**
(the occupants can remain in place), after the smoke residue is cleaned. **Cross-check (small job).**
A **5,000 ft^3** space with the same 6,000 ft^3 unit rating: `units = ceil(5,000 / 6,000) = 1`
generator. Hydroxyl is slower than ozone but safe with people present; coverage, run time, and the
need to remove the odor source first are per the manufacturer and S700.

## 3. Wiring

A `tools-data.js` row (group `D`, trade `["restoration"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the volume/coverage sizing, `editionNote` naming
ANSI/IICRC S700 and the occupied-safe / slower-than-ozone / source-removal-first / manufacturer-governs
caveats); `test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`hydroxyl-sizing` -> `computeHydroxylSizing` in `../../calc-restoration.js`);
`scripts/related-tiles.mjs` (-> `thermal-fog-deodorization` / `smoke-ejector-cfm` / `hepa-filter-life`);
`data/search/aliases.json` ("hydroxyl", "hydroxyl generator", "occupied deodorization", "smoke odor",
"hydroxyl sizing", "fire odor occupied"); the id appended to the existing `RESTORATION_RENDERERS`
declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning the two-unit example, the single-unit cross-check, and error
seams (non-finite, volume <= 0, coverage <= 0). Raise the `calc-restoration.js` size cap by ~20 percent
if needed (dated comment); bump the `citations.js` cap if needed. Lazy-loaded, absent from home first
paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the unit count and run-time note
wrap on a phone); render-no-nan + a11y sweep, output read to the value (12,000 ft^3 / 6,000 -> 2 units;
5,000 -> 1 unit).

## 5. Roadmap position

Closes the v188..v196 restoration batch and completes the deodorization family -- ozone (v148, empty),
thermal/ULV fog (v153, penetrating), and hydroxyl (here, occupied) -- alongside `smoke-ejector-cfm`.
Further Group D growth stays evidence-driven.
