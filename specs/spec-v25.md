# roughlogic.com Specification v25 — Surveying and Civil Layout (6 New Tiles, No New Group)

> **Implementation status: LANDED 2026-06-09 (package 0.26.0, jointly with
> spec-v24).** Catalog **525 -> 531** (v24 landed its 10-tile delta first;
> see the count reconciliation in spec-v24.md and the 2026-06-09 stanza in
> [../docs/audit-trail.md](../docs/audit-trail.md)). v25 adds
> the field math of land surveying and civil site layout. It inherits
> everything from spec.md through spec-v24.md and changes none of it. Per the
> product decision behind this spec, surveying is added **as a deepening of
> existing groups, not as a new group**: the coordinate/traverse math joins
> **Group P (Field, Backcountry, and SAR)** — which already holds bearing
> conversion, UTM/lat-lon, pacing, and magnetic declination — and the
> roadway/grading geometry joins **Group E (Carpentry and Construction)**,
> which already holds excavation, slope, and layout math. **No new groups, no
> new third-party dependencies, no new licenses, no telemetry, no AI, US
> standards only.** Every new tile ships with the full v14 discipline
> (dimensional annotation, bounds-fuzzer row, worked-example fixture
> cross-checked against its cited source, a complete inline `citations.js`
> entry with a relevant single-edition note, a `tile-meta.js` row with
> related-tiles and at least three search aliases, and a prerendered shell
> that passes the 320px audit) and is born into the hardened v18/v21 output
> contract and the v19/v22 citation discipline. The package stamps **0.26.0**
> at the close. (v25 is independent of the v24 draft; if v24 lands first the
> base shifts but the +6 delta holds either way.)
>
> **The thesis.** Surveying and grading are first-principles trigonometry and
> coordinate geometry — exactly the public-domain, deterministic, citable
> math the site is built for, and exactly the kind a crew chief, a grade
> checker, or an excavator operator still does on a calculator at the
> tailgate. The authorities are public: the US Army's FM 5-233 *Construction
> Surveying*, the AASHTO *Green Book* geometric-design relations, and the
> FHWA / state-DOT earthwork methods. None of it is paywalled and none of it
> is proprietary. The six tiles cover the four computations a field surveyor
> or sitework lead reaches for that the catalog does not yet have: **area
> from coordinates**, **traverse closure and adjustment**, **horizontal
> curve layout**, **vertical curve elevations**, **earthwork volume**, and
> **slope-stake cut/fill**.
>
> **Count.** Measured against the live catalog of **515 tiles** (or 527 if
> the v24 draft lands first), v25 adds **6**. Distribution: **P +2, E +4.**
>
> Every per-tile structure below is Inputs / Output / Math / Citation / Edge
> cases / Tests per the v9/v12/v15/v16/v17/v20/v23 pattern. The civil tiles
> carry a "design-of-record and the engineer/surveyor of record govern —
> field aid only" note; nothing here is a stamped design.

Repository: github.com/clay-good/roughlogic.com — US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry,
  and reviewer-signoff apply to every new tile.
- The v18/v21 tile contract (totality, purity, domain honesty, flag-threshold
  correctness, magnitude safety, render faithfulness; no non-finite numeric
  field, ever) applies to every new function from the first commit. Each tile
  with a back-solve/inverse mode guards the new zeroable denominator the
  inverse introduces (the v21 RC-1 seam) in the same commit.
- The v19/v22 citation discipline (inline, current, linkified, wraps at
  320px, edition-note relevance) applies to every new `citations.js` entry.
  The surveying authorities (FM 5-233, AASHTO Green Book, FHWA earthwork) are
  cited **by name**; the FM is public-domain (US Government work) and so the
  geometry is the v14 §G first-principles / public-domain class, not a
  tracked-edition lookup.
- Tile ids below are kebab-case and were checked against all 515 live ids
  (and the 12 v24 draft ids); none collide. Letter.number labels are scoped
  to v25.
- **Angles and bearings reuse the existing convention.** The traverse and
  curve tiles accept azimuths/bearings in the same grammar the Group P
  `bearing-conversion` tile already uses, and cross-link to it so a field
  bearing (N 45°30′ E) and a grid azimuth interoperate without a second
  conversion tool.
- **Coordinate order is North/East (surveying convention), stated inline.**
  The tiles label the axes N (latitude) and E (departure) explicitly so a
  user coming from an X/Y (math) habit is not silently transposed — a render
  faithfulness item per v18 §5.4.

---

# Part I — Group P: coordinate and traverse math (2 tiles → calc-field.js)

## 2. Area and traverse

### P.1 Area by coordinates (`area-by-coordinates`)
**Inputs.** An ordered list of boundary-corner coordinates (N, E) — at least
three — entered as a closed polygon (the tile closes it automatically if the
last point ≠ the first). **Output.** The enclosed area in ft², acres, and
m²; the polygon perimeter; and a clockwise/counter-clockwise (signed-area)
note. **Math.** The shoelace / coordinate method:
`A = ½·|Σ (E_i · N_{i+1} − E_{i+1} · N_i)|` over the closed ring;
`acres = ft² / 43,560`. **Citation.** "The coordinate (shoelace) method for
the area of a closed traverse, per FM 5-233 *Construction Surveying* and the
standard surveying texts, by name; public-domain US Government work and
first-principles coordinate geometry. The recorded plat and the surveyor of
record govern the legal area." **Edge cases.** Fewer than three distinct
points → `{ error }`; a self-intersecting (bow-tie) polygon flagged as
ambiguous (the signed area is reported but the magnitude is not a simple
enclosed area); collinear points handled (zero contribution). **Tests.** Six
unit tests; a 100 ft × 100 ft square from its four corners → 10,000 ft²
(0.2296 ac); a 3-4-5 triangle → 6 (unit) area; CW vs CCW sign.

### P.2 Traverse closure and adjustment (`traverse-closure`)
**Inputs.** A list of courses, each a bearing/azimuth and a distance; an
optional starting coordinate. **Output.** Per-course latitude and departure,
the sum of latitudes and departures (the closure error components), the
linear misclosure `√(ΣLat² + ΣDep²)`, the relative precision as a 1:N ratio
(perimeter ÷ misclosure), and the **Compass (Bowditch) rule** adjusted
coordinates of each station. **Math.** Per course `Lat = dist·cos(azimuth)`,
`Dep = dist·sin(azimuth)`; misclosure components `= ΣLat, ΣDep`; Bowditch
correction to each course `= −(course_length / perimeter) × Σ(that
component)`. **Citation.** "Traverse latitude/departure, linear misclosure,
relative precision, and the Compass (Bowditch) rule adjustment, per FM 5-233
*Construction Surveying* and the standard surveying references, by name;
public-domain and first-principles. A computational aid — the field
procedure, instrument calibration, and the surveyor of record govern the
record traverse." **Edge cases.** A perimeter of zero (no closed loop) →
`{ error }` rather than a divide-by-zero precision (RC-1); a misclosure of
exactly zero reports "perfect closure" rather than 1:∞ (RC-2 null/flag, not a
leaked Infinity); an open traverse (no return to start) reports raw
coordinates and suppresses the precision ratio with a note. **Tests.** Six
unit tests; a four-course rectangle closes to 0 misclosure; a known
worked-example traverse reproduces the published precision (e.g., 1:5,000)
and the Bowditch-adjusted corners.

---

# Part II — Group E: roadway, grading, and earthwork (4 tiles → calc-construction.js)

## 3. Curves

### E.1 Horizontal (circular) curve layout (`horizontal-curve`)
**Inputs.** Any sufficient pair to define the curve — radius R (ft) **or**
degree of curve D (arc or chord definition) — plus the deflection
(intersection) angle Δ; optional PI station for stationing the PC and PT.
**Output.** Tangent distance T, curve length L, external distance E, middle
ordinate M, long chord LC, and (with a PI station) the PC and PT stations.
**Math.** `T = R·tan(Δ/2)`; arc-definition `L = R·Δ_rad` (or `L = 100·Δ/D`);
`E = R·(sec(Δ/2) − 1)`; `M = R·(1 − cos(Δ/2))`; `LC = 2·R·sin(Δ/2)`;
arc-definition `D = 5729.58 / R` (chord definition `sin(D/2) = 50/R`); `PC =
PI − T`, `PT = PC + L`. **Citation.** "Simple circular-curve geometry (T, L,
E, M, LC, and the arc/chord degree-of-curve relations) per the AASHTO *A
Policy on Geometric Design of Highways and Streets* (the Green Book) and
FM 5-233, by name; first-principles trig. The design of record and the
engineer of record govern the alignment." **Edge cases.** Δ outside (0°,
180°) rejected; R ≤ 0 or D ≤ 0 rejected (RC-1); the arc-vs-chord degree-of-
curve definition is a labeled toggle so the two never silently mix. **Tests.**
Six unit tests; R = 1000 ft, Δ = 30° → T = 267.95 ft, L = 523.60 ft,
M = 34.07 ft, LC = 517.64 ft; arc D for R = 1000 → 5.7296°.

### E.2 Vertical (parabolic) curve elevations (`vertical-curve`)
**Inputs.** Incoming grade g1 (%), outgoing grade g2 (%), curve length L
(ft, stations), the PVI station and elevation, and a station to evaluate (or
"find high/low point"). **Output.** The elevation at the requested station,
the high or low point station and elevation, and the elevations at the BVC
(PVC) and EVC (PVT). **Math.** On the symmetric parabola measured from the
BVC: `y = y_BVC + g1·x + ((g2 − g1) / (2L))·x²` (grades as decimals, x in
stations from BVC); the turning point at `x = −g1·L / (g2 − g1)` when it lies
in [0, L]. **Citation.** "Equal-tangent parabolic vertical-curve elevations
and the high/low-point location, per the AASHTO Green Book vertical-alignment
relations and FM 5-233, by name; first-principles. The design of record
governs." **Edge cases.** L ≤ 0 rejected; g1 = g2 (no curve needed) reports a
straight grade with a note rather than dividing by zero (RC-1/RC-2); a
turning point outside [0, L] reported as "no crest/sag within the curve."
**Tests.** Six unit tests; a worked crest curve reproduces the BVC/EVC and
high-point elevations from a published example; g1 = g2 → straight-grade
path.

## 4. Earthwork and grading

### E.3 Earthwork volume — average end area and prismoidal (`earthwork-end-area`)
**Inputs.** A series of station cross-section end areas (ft²) with their
stations (or a uniform interval), an optional mid-section area for the
prismoidal method, and an optional swell/shrinkage factor. **Output.** The
volume between each pair of sections and the total, in ft³ and yd³, by the
average-end-area method and (where a mid area is given) the prismoidal
method, with the difference between the two reported; the adjusted
(swell/shrink) volume if a factor is entered. **Math.** Average end area
`V = (L/2)·(A1 + A2)`; prismoidal `V = (L/6)·(A1 + 4·Am + A2)`; `yd³ = ft³ /
27`; adjusted `= V × factor`. **Citation.** "The average-end-area and
prismoidal earthwork-volume methods, per the FHWA / state-DOT earthwork
references and FM 5-233, by name; first-principles. Compaction swell/shrink
factors are material- and spec-specific and user-supplied; the project
earthwork report governs the paid quantity." **Edge cases.** A negative end
area rejected; a station interval ≤ 0 rejected (RC-1); cut and fill are not
netted automatically (entered/labeled separately) to avoid a sign trap noted
inline. **Tests.** Six unit tests; two 100 ft² sections 100 ft apart →
10,000 ft³ (370.4 yd³) by end-area; the prismoidal method matches end-area
when Am is the mean (linear section).

### E.4 Slope-stake cut/fill and catch point (`slope-stake-cut-fill`)
**Inputs.** Design (grade) elevation and existing-ground elevation at the
point, or a rod reading and a known instrument height; the design slope ratio
(e.g., 2:1 H:V) and the offset from centerline for a catch-point estimate.
**Output.** The cut or fill depth (and which), and — given the slope ratio
and the ground offset — the horizontal offset to the catch point (daylight)
where the design slope meets existing ground. **Math.** `cut/fill =
existing − design` (positive = cut, negative = fill); catch-point offset
`= offset_at_hinge + ratio × |slope-stake cut/fill at the hinge|` for the
planar approximation, with the slope-ratio convention (H:V) stated. **Citation.**
"Slope-stake cut/fill and the catch-point (daylight) offset for a planar
design slope, per FM 5-233 *Construction Surveying* and the FHWA construction-
survey guidance, by name; first-principles grading geometry. A field staking
aid — the grading plan and the surveyor of record govern." **Edge cases.**
Existing = design → "on grade" (zero, not a leaked sign); a slope ratio with a
zero vertical component rejected (vertical or undefined, RC-1); the H:V vs V:H
convention is a labeled toggle so a 2:1 is never read upside down. **Tests.**
Six unit tests; existing 104.5, design 100.0 → 4.5 ft cut; a 2:1 slope from a
4 ft cut → 8 ft horizontal to daylight; on-grade case.

---

## 5. Candidates dropped for concept-overlap (recorded, not renamed)

Per the v20/v23 foreword discipline, candidates that duplicate an existing
tile by concept were dropped rather than relabeled:

- `bearing-to-azimuth` / `azimuth-conversion` — covered by the Group P
  `bearing-conversion` tile; the new traverse/curve tiles cross-link it.
- `magnetic-declination-correction` — covered by `magnetic-declination`
  (WMM2025) and `bearing-conversion`.
- `utm-northing-easting` — covered by `utm-conversion`.
- `percent-grade` / `slope-from-two-points` — the generic slope is in
  `slope-from-level`, `ramp-slope`, and `trench-slope`; E.4 is the
  cut/fill-and-catch-point staking use, not a renamed grade tool.
- `pit-excavation-volume` — covered by `excavation`; E.3 is the *linear*
  station-to-station roadway/channel earthwork case, not a pit.
- `stadia-distance` (tacheometry) — dropped as instrument-obsolete for most
  US field work (total stations and GNSS have replaced stadia); recorded here
  so a future spec can revisit if demand appears, rather than shipped thin.

## 6. Acceptance

v25 is complete when: (a) each of the 6 new tiles ships with the full v14
discipline (dimensional annotation, bounds-fuzzer row, worked-example fixture
cross-checked against its cited source, complete inline `citations.js` entry
with a relevant single-edition note, `tile-meta.js` entry with related-tiles
and ≥ 3 aliases, and a prerendered shell that passes the 320px audit);
(b) every new function passes the v21 contract sweep (no non-finite numeric
field — in particular the misclosure-precision, curve, and slope-ratio
divisions are guarded per RC-1/RC-2) and the v22 citation gates; (c) the
coordinate-order and angle conventions are labeled inline per §1 (render
faithfulness, v18 §5.4); (d) `npm test` and `npm run lint` are green;
(e) the catalog count advances by exactly 6 (Group P +2, Group E +4);
(f) package stamps 0.26.0; (g) the v25 stanza in
[../docs/audit-trail.md](../docs/audit-trail.md) records the new-tile counts
per group and the surveying authorities cited.

## 7. Closing note

The site already paces a distance, converts a bearing, and reads a digital
level. v25 finishes the surveyor's tailgate calculator: the area of a parcel
from its corners, whether a traverse closed and how to spread the error, the
stakeout numbers for a road curve, the elevation anywhere on a vertical
curve, the cubic yards between two cross-sections, and the cut or fill at a
stake. It is first-principles trigonometry from public-domain US authorities,
added where it belongs — inside the field and construction groups that
already speak its language — rather than as a new silo. The crew chief who
already trusts the site for a friction loss or a rafter length now reaches
for it at the property corner too.
