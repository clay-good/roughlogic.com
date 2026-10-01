# Scope: Disaster Response and Recovery (specs v1879-v1926, 47 New Tiles and One Collection Page)

> **Status: LANDED 2026-09-30 (proposed 2026-09-25). All 47 tiles wired in seven bands (2,183 -> 2,230 tiles, 7 new modules) and the collection page (v1926) is live.**
> All 48 spec files exist: `spec-v1879.md` through `spec-v1925.md` (one tile each) and `spec-v1926.md` (the
> collection page). Inherits the spec-v106 trades-only charter and every convention through spec-v1878.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. What this program is for

A proposal for a separate "emergency infrastructure" website -- water sanitation, off-grid power, and structural
safety for relief work -- was folded into roughlogic.com instead. The site already covers much of that list, and all
of it is trade arithmetic. This program adds the missing tiles and one page that gathers old and new by task.

Three decisions were made by the maintainer before any spec was written:

| Decision | Chosen | Consequence |
| --- | --- | --- |
| Sources | **US sources only** | EPA, CDC, FEMA, USACE, OSHA, HUD, NRCS, USDA, NFPA/ICC/ASCE cited by section. No Sphere, WHO, or UNHCR, so refugee-camp specifics are out. |
| Grouping | **Existing live groups plus one collection page** | No new group letter. Each tile takes the letter of the trade that owns it; spec-v1926 adds `/collections/disaster-response/`. |
| Risk line | **Life-safety tiles included as checks** | Shoring, trench, and drinking-water tiles follow the existing trench, fall-arrest, and well-shock pattern: public method, named authority, "check, not the stamp." No medical items. |

## 2. The seven bands

| Band | Specs | Module (new) | Tiles | Groups |
| --- | --- | --- | --- | --- |
| Emergency water and sanitation | v1879-v1887 | `calc-reliefwater.js` | 9 | M, G |
| Emergency and temporary power | v1888-v1896 | `calc-reliefpower.js` | 9 | A, J |
| Collapse shoring and rescue support | v1897-v1903 | `calc-usar.js` | 7 | E, Z, G |
| Flood fight and storm damage | v1904-v1912 | `calc-floodfight.js` | 9 | G, E, D |
| Debris management | v1913-v1917 | `calc-debris.js` | 5 | E, J, L |
| Relief logistics, shelter, temporary housing | v1918-v1922 | `calc-relief.js` | 5 | J, G, E, A |
| Buildings in an outage | v1923-v1925 | `calc-outage.js` | 3 | C, B |
| Collection page | v1926 | `collections.js` + build step | -- | -- |

The collection page lists 137 tiles: these 47 and 90 existing ones, in seven sections ordered as the work happens.

## 3. How candidates were found and screened

Four research passes (water, power, structural, recovery) plus one by hand (outage physics, safe rooms, manufactured
housing) screened every idea against all 2,183 catalog rows by id, name, and description, and then by the question
that matters: **is it the same physical quantity as an existing tile?** About 55 ideas were rejected on the spot and
**52 candidates** came through. Three were proposed twice across passes and merged (basement pump-down, the commodity
and POD pair, plywood board-up), one rejected idea was restored (the bleach dose, below), and three were cut on a
second look -- **47 were kept.**

**Cut as the same quantity as an existing tile:** off-grid PV for the worst month -> `pv-array-sizing`; battery
autonomy with temperature -> `off-grid-battery`; inverter surge -> `generator-sizing`; PWM controller current ->
`pv-circuit-ampacity`; NFPA 110 fuel class -> `generator-fuel-runtime`; N+1 count -> `ups-module-redundancy`; cord
voltage drop -> `voltage-drop`; propane in cold weather -> `propane-vaporization-rate`; HTH and tank disinfection ->
`pool-chlorine-dose`, `main-disinfection-chlorine`; flooded-well disinfection -> `well-shock-chlorination`; hauled-water
residual -> `chlorine-decay`; water-truck fleet -> `tanker-shuttle-*`; gravity lines -> `pressure-zone-hgl`; sewer
bypass -> `design-flow-peaking` + `pump-tdh`; soil on a trench victim -> `soil-vertical-effective-stress`; ponding and
ceiling water -> `rain-load-ponding`, `ceiling-water-load`; debris haul -> `dump-truck-loads`; shelter HVAC ->
`internal-heat-gains`; drying -> the Group D drying tiles.

**Cut or deferred for want of a verifiable US source:** turbidity-adjusted chlorine dose (EPA and CDC give only
"double it"); tent and canopy ballast (the ASCE 37 duration factors could not be read at the source, and free-roof
pressure coefficients are copyrighted); Operation Blue Roof takeoff (the USACE specification was unreachable);
FEMA group-site pad layout (no published density); portable-toilet service intervals (industry figures only);
generator CO distance (a flat 20 ft, not a calculation); USACE EPFAT sizing (no published formula).

**Kept with a disclosed overlap:** `emergency-water-bleach-dose` (same ratio as `kitchen-sanitizer-ppm`, but the EPA
drinking-water procedure, and the headline ask of the original proposal); `usr-vertical-shore-capacity` (a wood column,
but the US&R simplified method on shore height, distinct from the NDS method in `column-buckling-wood`);
`shelter-capacity-sanitation` (the Red Cross operational standard, distinct from the IBC bases of `occupant-load` and
`plumbing-fixture-count`). Each spec states its overlap in Section 1.

## 4. Copyrighted tables are inputs, not data

Four tiles depend on a code table the charter forbids reproducing. Each takes the table value as a user input,
cites the table by number, and records which row was used: IRC Table R301.2.1.2 (`storm-panel-plywood`), ASCE 7
Table 4.3-1 / IBC Table 1607.1 live loads (`relief-storage-floor-load`), and NEC Tables 551.73(A) and 550.31
(`temp-housing-park-feeder-demand`). Federal tables are reproduced because they are public domain: 40 CFR 141.857,
OSHA 1926.51 Table D-1 and 1910.141 Table J-1, OSHA 1926 Subpart P Appendix C, and 24 CFR 3285.402 Tables 1-3.

## 5. What reading the sources found

Every worked example was computed in Python from the source's own numbers, and each source's printed example was
reproduced where it had one. **Nine published figures did not survive that**, and each spec reports its finding
rather than copying the error:

- **EPA bleach table:** the 6% "16 drops (1/4 tsp)" row doses 1.5 times its own drop count. Every other row implies a
  1/96 tsp drop. (v1879)
- **EPA vs CDC boil time:** 3 minutes above 5,000 ft (EPA) vs above 6,500 ft (CDC). (v1880)
- **USACE Flood Fight Handbook:** a 10 ft head on a 2 ft manhole cover is 1,960 lb, not the printed 2,060. (v1908)
- **FEMA-325 hurricane model:** the printed 6,992,374 cy needs the unrounded household count. The rounded count gives
  6,992,417. (v1913)
- **FEMA-325 stump table:** the 24 in stump length behind every row is never stated. (v1917)
- **Missouri SEMA / USACE truckloads:** "1,744 MREs" should be 21,744; "3 liters or 1 gal" treats 3 L as a gallon;
  "212 trucks per million gallons" is 211. (v1918)
- **US&R SOG:** its headline 4x4 at 8 ft (8,000 lb) sits at L/D 27.4, past its own no-warning limit of 25. (v1898)
- **OSHA Table D-1:** its "20 or less" and "20 or more" rows overlap at exactly 20, and the count steps *down* at 200
  workers. (v1886)
- **US&R guides:** the 2021 and 2006 raker ratings differ (4,000 lb vs 2,500 lb, both horizontal force; corrected 2026-09-30 from "4,000 lb axial", SOG 2021 FAQ R-1), and the crib
  bearing stresses differ (500 vs 625 psi). Both are shown. (v1899, v1900)

**Drafts corrected before commit, on reading:** a droop spec claimed the larger unit overloads first (both reach
full load together at rated frequency); a fleet spec said half load burns two-thirds of full-load fuel (the curve says
54%); a floor-load spec called 485 psf "four times" heavy storage (it is about twice); a snow spec said 2 in of ice
equals a foot of dry snow (it equals three); a solar-pump spec called North Dakota's 3-day storage rule an NRCS
national minimum.

## 6. Spec shape and gates

Matched to `spec-v1850.md`: H1 with module, group, and band, then a status blockquote with **The gap**, then
`## 1. Inheritance and conventions` (with the three doors and aliases), `## 2. The tile` with a formula block, three
prose paragraphs, Inputs and Outputs, then `## 3. Worked example` and `## 4. Scope and non-goals`. Plain ASCII.
A structural sweep checked every file for the four sections, the status line, a GOVERNANCE key, ASCII, exactly one
tile heading, no id collision with the catalog, and that every backticked tile id resolves to a live or planned
tile. `check-spec-status` passes with 47 PROPOSED specs.

`specs/*.md` is ungated in CI, so this spec-only change cannot break the build.

## 7. What this program does NOT do

It adds no tile to the catalog. Wiring is the 21-file recipe in [scope-trade-expansion-2](scope-trade-expansion-2.md)
per band, and the collection page is its own build change (spec-v1926). The catalog count, module count, gate count,
sitemap count, and every figure `check-readme-counts` watches are **unchanged** until tiles land, and must not be
edited before then.
