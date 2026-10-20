# Scope: The 2026-10-19 Product Expansion (specs v1970-v1992, 7 Platform Specs and 16 New Tiles)

> **Status: ACTIVE (updated 2026-10-19). 11 of 23 specs are built (spec-v1972, spec-v1977 to spec-v1985, spec-v1992); catalog 2,277.**
> All 23 spec files exist (`spec-v1970.md` through `spec-v1992.md`). Nothing in the catalog, the modules,
> the counts or the gates changes until a spec lands. Inherits the spec-v106 trades-only charter and every
> convention through spec-v1969.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Where the product stood when this was written

Every numbered spec before v1970 is LANDED or CUT (1,850 and 50; spec-v106 is the one ADOPTED doctrine). All six
roadmap pillars of spec-v106 section 7 have landed: edition awareness for the NEC (v1968), free-source links for
bare domains and the CFR (v1966, v1969), show the steps (v1964), checked-against lines (v1965), the problem report
(v1348) and the errata log (v1967). The catalog is 2,267 tiles across 121 modules, every one cited, computed,
exampled and fuzzed (79acec33). Three expansion programs since September found their tiles by reading what the
catalog admits it lacks, and the last of them recorded that mainstream trade arithmetic is largely exhausted.

So this program asked two different questions. First: what does a reader or an agent still not GET from a product
whose arithmetic is done? Second: which daily trade calculations are still missing once the obvious ones are
screened out? The answers are seven platform specs and sixteen tiles.

## 2. The platform specs: what a reader gets that they did not

| Spec | Title | Pillar | What was missing |
| --- | --- | --- | --- |
| v1970 | Feet, inches and fractions in length fields | -- | The search box reads `8'6"`; the 1,499 feet-and-inch input boxes do not |
| v1971 | Request a calculator | 5 | spec-v106 named "request a tool" beside "report a wrong number"; only the second was built |
| v1972 | Show the steps on the agent door | 3 | The website shows the steps; the MCP server does not return them |
| v1973 | When your state's edition would change the answer | 1 | v1968's own "not in v1"; eight I-code rows are already verified in code |
| v1974 | Your state's code edition, for the building codes | 1 | v1968 covers the NEC only; 113 IRC, 74 IBC and 67 IPC tiles have no row |
| v1975 | Code citations link to the free chapter text | 2 | 588 I-code section references and 114 NFPA-with-year mentions link nowhere specific |
| v1976 | Search in Spanish | -- | 35.4% of US construction employment is Hispanic or Latino (BLS 2025); the search knows no Spanish |

Each was checked against the code before it was written: v1970 against `makeNumber` (a browser number field) and
query-fill.js (which already parses every spelling); v1971 against report-feedback.js and the Worker's exact-key
validation; v1972 against `stepRows` (pure, DOM-free except for one import) and the MCP catalog (which already loads
the field shards); v1973 and v1974 against code-adoption.js and the rows file; v1975 against the ICC and NFPA readers
in a browser on 2026-10-19; v1976 against the alias pipeline and `check-alias-targets`.

## 3. The tiles: the entry test and what survived it

Every candidate was screened three ways before a spec was written: Jaccard overlap of its name against all 2,267
catalog rows (reading every match above 0.20), the 23,471 alias rows, and the OUTPUTS of the nearest sibling. About
250 candidates were screened; the first hundred mainstream ones (sump pumps, mini splits, deck beams, water heaters,
PEX manifolds, blower doors, superheat) all hit, as the last program predicted. What survived was found by three
veins:

- **The catalog's own non-goals.** `ashrae-622-ventilation` names local exhaust as separate (v1981);
  `advance-warning-sign-spacing` names the buffer space (v1991); `wall-receptacle-count` was written and immediately
  named the countertop (v1978); the hearth spec named the clearance rule (v1992).
- **Code decision tables nobody had turned into checks.** R308.4 safety glazing (v1982), R1001.10 hearth (v1983),
  R1003.9 chimney (v1984), R1001.11 clearance (v1992), R401.3 grade (v1986), NEC 210.52 receptacles (v1977, v1978).
  Each is a short list of distances in a free code, and each is a common red-tag.
- **Arithmetic done on a scrap of cardboard.** Segment and concentric bends (v1979, v1980), the tile layout (v1987),
  the shower pan (v1989), the calcium-chloride conversion (v1990), the uplift on a hurricane tie (v1985), the
  flatness and lippage figures (v1988).

| Spec | Tile | Module | Group / trades |
| --- | --- | --- | --- |
| v1977 | `wall-receptacle-count` | calc-electrical.js | A electrical |
| v1978 | `countertop-receptacle-count` | calc-electrical.js | A electrical |
| v1979 | `conduit-segment-bend` | calc-fab.js | A electrical |
| v1980 | `conduit-concentric-bend` | calc-fab.js | A electrical |
| v1981 | `bath-exhaust-fan-sizing` | calc-hvacservice.js | C hvac, electrical |
| v1982 | `safety-glazing-check` | calc-construction.js | E glazing, carpentry |
| v1983 | `hearth-extension-check` | calc-masonry.js | E masonry |
| v1984 | `chimney-termination-height` | calc-masonry.js | E masonry, hvac |
| v1985 | `truss-uplift-connector` | calc-construction.js | E carpentry, construction |
| v1986 | `foundation-grade-slope-check` | calc-construction.js | E landscaping, construction |
| v1987 | `tile-layout-cut-balance` | calc-finish.js | E tile, flooring |
| v1988 | `tile-flatness-lippage-check` | calc-finish.js | E tile |
| v1989 | `shower-pan-mortar-bed` | calc-finish.js | E tile |
| v1990 | `mver-calcium-chloride` | calc-finish.js | E flooring |
| v1991 | `work-zone-buffer-space` | calc-construction.js | E civil, construction |
| v1992 | `fireplace-clearance-check` | calc-masonry.js | E masonry |

**No new group letter and no new module.** Module sizes are checked by `check-module-sizes` at wiring time; the
module-split playbook applies if a module is at its cap.

## 4. Cut, and why

- `handrail-grip-check`: `computeHandrailGeometry` already checks the Type I and II grip (found by reading the
  sibling's compute, not its name).
- `service-drop-clearance` (NEC 230.24): the 2023 edition changed the roof clearance (8 ft to 8 ft 6 in per two
  secondary sources) and the text was not read; an edition-sensitive rule is not specified from secondary sources.
- `hydrometer-temp-correction`: the common polynomial has no primary source this project could cite.
- `wellpoint-dewatering-flow`: the Dupuit slot formula is standard, but TM 5-818-5's figure was not read.
- `plume-rise-momentum`, `laminate-expansion-gap`, `deck-stain-coverage`: niche, manufacturer-governed, or a
  constant away from an existing tile (`paint-coverage`).

## 5. What was verified, and what the wiring step must still read

Every worked example was computed in Python and pasted, not typed (the previous programs' rule). Every code value
was confirmed from at least two sources on 2026-10-19:

- MUTCD 11th Edition Part 6 was read from FHWA's own PDF (Tables 6B-2, 6B-3, 6B-4; 6B.06 para 11; 6K.01 para 4).
- ASTM F1869's formula and constants from the standard's text as quoted by two kit makers.
- ANSI A108.02 flatness and lippage values from three industry sources, with the 2013-to-2023 section renumbering.
- IRC R308.4, R1001.10, R1001.11, R1003.9, R401.3 and the M1505 exhaust table from the IBC's matching sections and
  multiple jurisdiction handouts; the 2024 IRC chapter pages at codes.iccsafe.org render lazily and did not yield
  the section text to a script or to a hash anchor, so **the wiring step reads each section in the browser pane**
  (the current printing is IRC2024V2.1) before the compute is written, as the I-code refresh did.
- NEC 210.52(A) and (C) from the 2023 change summaries of three code-training sources; the 2023 island and
  peninsula change is a candidate first NEC row for spec-v1973 and must be read in both editions first.

## 6. Gates

`specs/*.md` is ungated in CI except `check-spec-status`, which passes with 23 PROPOSED specs naming tile ids that
are not in the catalog. `npm run lint` was run to exit 0 before the push, and `git diff --numstat` confirmed no
existing file was modified or deleted. The catalog count, the module count and every figure `check-readme-counts`
watches are unchanged by this program and must not be edited until a spec lands.

## 7. Landing order

Platform first, because each platform spec touches every tile: v1970 (one module, one test, visible on every
length field), v1972 (one afternoon, the agent door), v1971 (a migration and a mount), then v1975, v1973, v1974 (the
longest: six codes of state rows, drafted one state at a time), and v1976 (drafting is cheap; review is the cost).
Tiles in the order of the table in section 3, two or three per landing, each by the 21-file recipe in
[scope-trade-expansion-2](scope-trade-expansion-2.md) with its count-drift checklist.
