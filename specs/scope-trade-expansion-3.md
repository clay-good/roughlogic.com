# Scope: The 2026-09-11 Trade Expansion (specs v1750-v1850, 101 New Tiles)

> **Status: PROPOSED (2026-09-11). Program charter, no catalog change of its own.**
> All 101 spec files exist (`spec-v1750.md` through `spec-v1850.md`) and are pushed.
> No tile is wired yet; this program is specifications only.
> Inherits the spec-v106 trades-only charter and every convention through spec-v1749.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Why this program exists

The 2026-09-05 program ([scope-trade-expansion-2](scope-trade-expansion-2.md)) closed
at 2,082 tiles with the note that "the next session needs a NEW source of work."

This program re-ran that charter's own method -- probe the live `TOOLS` registry for
the vocabulary of a trade, then READ the hits -- and found eleven territories that
came back empty or near-empty. They are not exotic. Every one of them is a licensed
or established US trade whose daily arithmetic is as fixed and as checkable as a
voltage drop.

| Territory | Tiles before | New | Module (new) | Groups |
| --- | --- | --- | --- | --- |
| Controlled-environment agriculture and greenhouse | 0 | 13 | `calc-greenhouse.js` | L, C |
| Cathodic protection and corrosion control | 3 | 13 | `calc-corrosion.js` | E, A, G |
| Commercial brewing and distilling | 4 (consumer) | 13 | `calc-brewing.js` | O |
| Solid waste, landfill, and transfer | 3 (digester) | 11 | `calc-waste.js` | M, J, G |
| Data centre and mission-critical facilities | 0 | 9 | `calc-datacenter.js` | A, C |
| Warehouse racking and material handling | 3 | 9 | `calc-warehouse.js` | E, J |
| Marine construction and dredging | 0 | 9 | `calc-marine.js` | E, K |
| Fibre optic outside plant | 5 (inside plant) | 8 | `calc-telecom.js` | A |
| Building automation and controls | 4 | 6 | `calc-controls.js` | C, A |
| Snow and ice management | 0 | 6 | `calc-winterops.js` | G, J |
| Metal finishing and galvanising | 2 | 4 | `calc-finishing.js` | G |

**No new group letters.** Every tile takes an existing `GROUP_NAMES` letter, assigned
per tile rather than per band -- so the waste band splits M for the landfill and J for
collection, and the corrosion band splits E for the pipeline and A for the rectifier.
S, U, V, and W remain retired.

## 2. The entry test each tile had to pass

Every candidate was screened by **token-overlap scoring against all 2,082 catalog
rows** -- Jaccard similarity on `id + name`, with the full description of every match
above 0.20 read before the candidate was kept or cut.

**136 candidates were considered. 101 were kept and 35 were cut** -- 134 screened in
three rounds up front, plus two written later to replace candidates that a deeper
screen killed mid-band.

Three cuts were exact id collisions the screen caught only because the candidate
happened to be spelled the same way: `generator-fuel-runtime`,
`fresnel-zone-clearance`, and `draft-beer-line-balance` already exist under those
ids. Four more were the same tile under another name: `wenner-soil-resistivity` ->
`soil-resistivity-wenner`, `economizer-free-cooling-hours` ->
`economizer-savings-hours`, `riprap-stone-size` -> `riprap-d50`, and
`beverage-co2-cylinder-interval` -> `beverage-co2-duration`.

**The cuts token overlap did NOT catch were found by asking what the PHYSICAL
QUANTITY is**, which is the screen that matters:

- `greenhouse-heating-load` -> `building-ua` is literally `sum(A/R) + 1.08 CFM`.
- `nutrient-ec-tds` -> `tds-from-conductivity`; the hydroponic scale factor is a
  different CONSTANT, not a different quantity.
- `plating-thickness-faraday` and `anodize-thickness-ramp` -> `plating-tank-current`
  IS Faraday's law and its own description names anodizing.
- `pid-loop-tuning` -> `pid-tuning-ziegler-nichols`: a different METHOD for the same
  quantity.
- `aerial-drop-sag` -> `spanline-sag-tension` is already `H = w L^2 / (8 d)`. This one
  was caught **mid-band**, after two specs in its band were already written.
- `fiber-pull-tension` -> `pulling-tension`, the same capstan equation.
- `rack-seismic-base-shear` -> `seismic-base-shear`; a rack only enters different
  parameters into `V = Cs W`.
- Also cut: `hydroponic-reservoir-turnover` -> `pool-turnover`,
  `outdoor-air-reset-schedule` -> `outdoor-reset-ratio`, `lift-truck-charging-room`
  -> `battery-hydrogen-vent`, `landfill-veneer-stability` ->
  `slope-stability-infinite`, `innerduct-fill` -> `conduit-fill`,
  `wort-chiller-duty` -> `cooling-system-flow`, `anchor-scope-holding` ->
  `anchor-rode-scope`, `snow-haul-truck-count` -> `haul-cycle-production`,
  `chw-dp-setpoint-reset` -> `chilled-water-delta-t`, `blast-media-consumption` ->
  `abrasive-blast`, `control-valve-authority` -> `valve-authority`,
  `damper-authority-leakage` -> `damper-authority`, `wdm-channel-budget` (the same
  `10 log10(N)` as the PON splitter), `mezzanine-live-load`, `plating-rack-load`,
  `cooling-unit-redundancy`, `root-zone-bench-heating`, `compactor-haul-cycle`,
  `pile-set-blow-count`, and `cp-current-requirement`.

## 3. SIBLING-NAMES-THE-GAP paid the most

`cathodic-anode-count-life`'s own scope prose ends: *"This does not design the ground
bed or its resistance, size the rectifier's voltage, evaluate interference with
foreign structures, address stray current or AC corrosion."*

**Four of the thirteen corrosion tiles are exactly those four sentences** (v1763,
v1764, v1768, v1773), and the same tile's current-requirement output is why
`cp-current-requirement` was cut. Reading the newest tiles' own non-goals remains the
highest-yield way to find real gaps.

## 4. Spec shape and the discipline behind it

Matched to `spec-v1749.md`: H1 with module, group name, and trade -> status
blockquote carrying **The gap** -> `## 1. Inheritance and conventions` -> `## 2. The
tile` with a formula block, three prose paragraphs, Inputs and Outputs -> `## 3.
Worked example` -> `## 4. Scope and non-goals` ending in what governs. Plain ASCII,
`--` rather than an em-dash.

**Every worked example was computed in python and interpolated into the file.** The
previous program shipped roughly 82 internally-wrong specs out of 268, so nothing here
was typed by hand. A structural sweep ran over every file before each commit checking
the four required sections, `GOVERNANCE.general`, ASCII-only, and unrendered
placeholders.

**That sweep does not catch a wrong conclusion, and reading does.** Nine drafts were
caught stating something their own arithmetic refuted and were rewritten:

- v1750 said "about one air change per minute" over a computed 0.58.
- v1759 claimed two losses "compound rather than add" where the difference was 0.4%.
- v1776 called a computed 1.3 degF drop "half a degree".
- v1777's gap said "a quarter of the water" where the figure is 16%.
- v1786 called the packaging remainder the largest loss when it is 31% -- and its
  sixth-barrel recovery turned out to be 0.42 gal short of possible.
- v1797's cap differential was smaller than the fall it was said to overwhelm.
- v1806 reported a negative shortfall where its comparison case beat the requirement.
- v1819 called 20 degF "a mild shoulder-season day".
- v1848 called a cone footprint "a third" of a windrow's when it is 60%.

v1774 also printed three potentials with the sign reversed -- the fourth appearance of
the class the previous program recorded as *report the direction in words*.

## 5. Gates

`specs/*.md` is ungated in CI (`check-doc-links` excludes it, `grep-checks` targets
only `specs/spec.md`), so a spec-only push is CI-safe. `npm run lint` was still run to
exit 0 before each push, and `git diff --numstat` was checked to confirm no existing
file was modified or deleted.

## 6. What this program does NOT do

It adds no tile to the catalog. Wiring any of these 101 specs is the 21-file recipe in
[scope-trade-expansion-2](scope-trade-expansion-2.md) and its count-drift checklist,
and it is a separate program: the previous one cost roughly three hours of wall clock
per band of seven to eleven tiles. The catalog count, the module count, and every
documented figure `check-readme-counts` watches are **unchanged** by this program and
must not be edited until tiles actually land.
