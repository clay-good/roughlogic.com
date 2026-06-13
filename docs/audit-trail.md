# Audit trail

> Implementation status: introduced by spec-v10 §I.3.

Every external review or audit performed on the site is recorded
below with date, reviewer, scope, and outcome. The audit trail is
**append-only and public**. It is not a substitute for the
authority having jurisdiction; it is evidence that the site takes
its "AHJ-governs" promise seriously enough to invite outside
review.

## 2026-06-13 - spec-v56 calc-fab.js module split (platform only, internal)

- **Scope**: platform-only / housekeeping in the spec-v36 / v39 / v42 lineage.
  **No tile added or removed, no calculator output changed** (catalog holds at
  583). Package **0.50.0 -> 0.50.1** (a patch). No new dependencies, no telemetry,
  no AI.
- **Why**: `calc-fab.js` reached 96.3% of its 20,000 B gzip cap after the layout
  family grew (v32/v37/v38/v44/v47/v55); the next layout tile would have breached
  it, so the documented per-tile-split remediation came due rather than another
  cap bump.
- **Split**: the eight pure layout / shop-geometry tiles
  (center-of-gravity-2point, bolt-circle, decimal-to-fraction, sine-bar,
  thread-pitch, circular-arc, circle-from-3-points, polygon-miter) moved into a
  new module `calc-layout.js` behind `LAYOUT_RENDERERS`; `calc-fab.js` keeps the
  seven pipe & conduit fabrication tiles. All tiles keep their group letter (the
  v28/v36/v39 precedent); ids, citations, worked examples, and behavior are
  byte-for-byte unchanged. Self-contained cleavage: only `_finiteGuard` is shared
  (copied), `_bcGcd` and `_V38_COS30` move with their tiles, the v26 flange
  helpers stay.
- **Sizes**: `calc-fab.js` 19.3 KB -> 10.1 KB gz (cap 20000 -> 13000 B, 77.7%);
  new `calc-layout.js` 10.6 KB gz (cap 13500 B, 78.6%); module count 30 -> 31.
  Both lazy-loaded, home-view payload unaffected.
- **Verification**: `npm run lint` (every gate; wiring **31 renderer modules /
  583 tile-id entries**; check-readme-counts 583 / 31 / 609; check-module-sizes
  both new caps pass; check:dist resolves the new module; check:sw-precache
  confirms it precached; tile-contract sweep 588 tiles, 0/0), `npm test` (**5,520
  unit tests**, unchanged), `npm run build` (583 tile + 24 group shells, 609 URLs,
  797 dist files), `npm run data:verify` (123), `check:dist` / `check:shells` /
  `check:shell-mobile` (609 routes, zero horizontal scroll at 320 px), and a
  render-no-nan + a11y Chromium pass over the eight moved tiles plus a kept
  pipe/conduit tile (identical output through the new module routing). README
  module-count references and `specs/spec-v56.md` updated.
- **Outcome**: landed.

## 2026-06-13 - spec-v55 regular polygon miter and layout (internal)

- **Scope**: spec-v55 adds **one** first-principles tile to **Group G (Cross-Trade
  Utilities)**, taking the catalog **582 -> 583**. Package **0.49.0 -> 0.50.0**
  (a minor). No new group, no new module, no new dependencies, no telemetry, no AI.
- **Tile**: `polygon-miter` (Regular Polygon Miter and Layout). Build any N-sided
  frame: each of the N pieces is mitered at 180/N degrees off square at both ends,
  the interior angle is (N-2) x 180/N, and the side relates to the across-flats
  width (s = flats x tan(180/N)) and the across-corners diameter (s = corners x
  sin(180/N)), with perimeter and area. The size is given as one of three labeled
  dimensions (side / across-flats / across-corners).
- **Correctness (verified to the digit)**: regular hexagon, side 12 in -> 30 deg
  miter, 120 deg interior, 24 in across corners, 20.78461 in across flats, 72 in
  perimeter, 374.12297 in^2 (matches the (3 sqrt 3 / 2) s^2 hexagon area).
  Reproduces the known shop miters (square 45, hexagon 30, octagon 22.5); the
  across-flats and across-corners size modes round-trip to the side length. N < 3,
  N > 360, size <= 0, and non-finite inputs return an error.
- **Concept-check**: net-new -- the `geometry` tile gives regular-polygon area and
  a polygon perimeter from a side list but no miter angle or size conversion;
  `compound-miter` is sprung crown; `bolt-circle` lays out holes on a circle. None
  turn a side count into a saw miter or size a regular polygon to a target
  dimension.
- **Module / cap**: tile lands in `calc-fab.js` (the cross-trade Fabrication &
  Layout bench, with bolt-circle / circular-arc / circle-from-3-points; group
  letter independent of module per the v28/v36/v39 precedent). `calc-fab.js` is at
  96.3% of its 20000 B cap -- no bump, and it is now the next split candidate.
  Lazy-loaded, so the home-view payload is unaffected.
- **Verification**: `npm run lint` (every gate; wiring **30 renderer modules /
  583 tile-id entries**; corpus 887, dimensions 890, derivation/source 583/583,
  citation-coverage 583; tile-contract sweep 588 tiles, 0 Tier-1 / 0 Tier-2),
  `npm test` (**5,520 unit tests**, +1), `npm run build` (583 tile + 24 group
  shells, 609-URL sitemap), `npm run data:verify` (123), `check:dist` (796 files
  / 2,029 refs / 0 dangling) + `check:shells` (583+24) + `check:shell-mobile`
  (609 routes, zero horizontal scroll at 320 px), and the render-no-nan + a11y
  Chromium checks on the new tile (rendered output read to the digit). README
  catalog table + counts and `specs/spec-v55.md` updated.
- **Outcome**: landed.

## 2026-06-13 - spec-v54 compound miter for crown molding (internal)

- **Scope**: spec-v54 adds **one** first-principles tile to **Group E (Carpentry
  and Construction)**, taking the catalog **581 -> 582**. Package
  **0.48.3 -> 0.49.0** (a minor). No new group, no new module, no new
  dependencies, no telemetry, no AI.
- **Tile**: `compound-miter` (Compound Miter / Crown Molding). Crown installed
  sprung against the wall needs a compound cut, a miter (saw-table swing) AND a
  bevel (blade tilt), to cut flat on the table: miter = atan(tan(corner/2) x
  sin(spring)); bevel = asin(cos(spring) x cos(corner/2)). Inputs are the molding
  spring angle (38 or 45 degrees typical) and the wall corner angle (90 for a
  square corner).
- **Correctness (verified against the standard published compound-miter chart)**:
  38-degree spring at a 90-degree corner -> miter 31.619007 deg, bevel
  33.862914 deg (chart 31.62 / 33.86); 45-degree spring at a 90-degree corner ->
  miter 35.264390 deg, bevel 30.000000 deg (chart 35.26 / 30.00). Both reproduce
  the chart to the digit, and the formula extends to the out-of-square corners a
  two-row printed chart cannot. The angle magnitudes are identical for inside and
  outside corners; only the workpiece orientation changes. Degenerate inputs
  (spring outside 0-90, corner outside 0-180, non-finite) return an error.
- **Concept-check**: net-new -- `pipe-miter-cut` cuts a lobster-back pipe elbow,
  `roof-pitch` / `rafter` give a single roof angle, `bend-allowance` is sheet-metal
  flat-pattern; none turn a spring angle into a miter+bevel saw-setting pair.
- **Module / cap**: tile lands in `calc-shop.js` (which already hosts the Group E
  welding/sheet-metal tiles; group letter is independent of module per the
  v28/v36/v39 precedent). `calc-shop.js` holds at 90.0% of its 16000 B cap -- no
  bump. Lazy-loaded, so the home-view payload is unaffected.
- **Verification**: `npm run lint` (every gate; wiring **30 renderer modules /
  582 tile-id entries**; corpus 886, dimensions 889, derivation/source 582/582,
  citation-coverage 582; tile-contract sweep 587 tiles, 0 Tier-1 / 0 Tier-2),
  `npm test` (**5,519 unit tests**, +1), `npm run build` (582 tile + 24 group
  shells, 608-URL sitemap), `npm run data:verify` (123), `check:dist` (795 files
  / 2,026 refs / 0 dangling) + `check:shells` (582+24) + `check:shell-mobile`
  (608 routes, zero horizontal scroll at 320 px), and the render-no-nan + a11y
  Chromium checks on the new tile (rendered output read to the digit: 31.62 deg
  miter, 33.86 deg bevel). README catalog table + counts and `specs/spec-v54.md`
  updated.
- **Outcome**: landed.

## 2026-06-12 - v43/v44/v47/v50 correctness re-audit + README lazy-load sequence diagram (internal)

- **Scope**: a first-principles correctness re-audit of the new-math tiles added in
  spec-v42 through spec-v51 (the gap between the prior v37-v41 audit and the v52/v53
  tiles authored in-session), plus one new README architecture diagram. **No code,
  data, tile, or shipped-output change** (catalog stays 581). Package
  **0.48.2 -> 0.48.3** (a patch). No new deps.
- **v43/v44/v47/v50 correctness re-audit** (hand-derived from first principles, the
  layer the lint gates do not check): `tank-volume` (v43) horizontal-cylinder
  circular-segment area A = R^2 acos((R-h)/R) - (R-h) sqrt(2Rh-h^2) times length --
  D 24 / L 48 / h 12 -> R 12, A 226.19 in^2, 47.0 gal of a 94.0 gal tank = 50%
  (half-full); verified at h=R (half) and h=2R (full circle pi R^2); vertical
  V = pi R^2 h. `circular-arc` (v44) R = (chord^2/4 + rise^2)/(2 rise) -- chord 24,
  rise 4 -> R 20 in, angle 2 acos(16/20) = 73.74 deg, arc 25.74 in (cross-checked
  sin theta = 12/20). `circle-from-3-points` (v47) circumcenter determinant --
  (0,0)/(4,0)/(0,3) right triangle -> center (2, 1.5) = hypotenuse midpoint,
  R 2.5 = half the hypotenuse. `bakers-percentage` (v50) ingredient = flour x pct/100
  -- flour 1000 g @ 65/2/1% -> water 650, salt 20, yeast 10, dough 1680 g (168%),
  420 g per piece of 4; G_PER_OZ 28.349523125 exact. ALL MATCH -- no fix needed.
  This closes the post-2026-06-08 catalog: v37-v41 (prior sessions), v43/v44/v47/v50
  (here), and the v33/v43/v50-tier/v51/v52/v53 tiles authored in-session are all
  verified correct; the four consecutive clean re-audits confirm the catalog is
  correct, not merely gate-consistent.
- **README diagram**: added a `sequenceDiagram` to the System-design section showing
  the dynamic tile-open path (ensureTools lazy import -> renderToolView builds the
  shell synchronously -> three parallel cached dynamic imports of citations.js /
  the calc-*.js group module / the support libs -> the crash-safe try/catch render
  boundary -> the service-worker warm path). The two pre-existing diagrams show the
  value flow and the static component graph; neither sequenced the lazy-load +
  memoization + crash-safe design the prose bullets describe, so this is additive,
  not redundant. Verified accurate against `app.js` route/applyRoute/renderToolView/
  loadRenderer/loadSupportLibs.
- **Verification**: `npm run build` + `npm run lint` (26 gates) + `npm test` (5,518)
  + `npm run audit` (6 stages) all green; grep-checks (no smart chars) and
  check-readme-counts pass on the edited README.
- **Outcome**: landed.

## 2026-06-12 - performance.md payload refresh + v37/v38/v41 correctness re-audit (internal)

- **Scope**: documentation-accuracy + a first-principles correctness re-audit of the
  four most recent machine-shop / fab-bench tiles. **No code, data, tile, or
  shipped-output change** (catalog stays 581); doc edits only. Package
  **0.48.1 -> 0.48.2** (a patch). No new deps.
- **Finding (doc drift)**: `performance.md` still carried the spec-v45-era home-view
  payload snapshot -- "36,146 B (35.3%) ... 45.7% of cap (22,910 B)" in two places
  (the enforcement paragraph and the page-weight bullet). The v50-v53 `app.js`
  `declare()` additions grew the first-paint JS since, so the live figure is
  **36,260 B (35.4% of budget); JS sub-budget 45.9% (23,024 B of 50,176 B)** per
  `scripts/check-home-payload.mjs`. README §lazy carried "~22.4 KB gz" for the same
  JS sub-budget; live is 22.5 KB. Both corrected; the per-module v12 cap table in
  `performance.md` was re-checked against live gzip and is still accurate (vet 83.8%,
  ems 84.5%, aviation 87.3%, realestate 87.6%, edu 90.2%), as is the "123 shards /
  18 folders" data claim (`data:verify` reports 123 entries).
- **v37/v38/v41 correctness re-audit** (hand-derived from first principles, the
  layer the lint gates do not check): `sine-bar` sin(theta)=H/L -- L 5, H 2.5 ->
  arcsin(0.5)=30 deg, and H=5 sin(30)=2.5 (both directions). `thread-pitch`
  P=1/TPI -- 20 TPI -> 0.05 in / 1.27 mm; sharp-V height H=P sqrt(3)/2
  (`_V38_COS30`=0.8660254) with the notes correctly separating the sharp-V from the
  truncated UN/ISO depth. `tap-drill-size` D_drill=D_major - %/(76.98 TPI) --
  1/4-20 @75% -> 0.20129 in, matching the real #7 (0.201 in) tap drill;
  `_V41_TAP_K`=76.98=1/0.012990 confirmed. `rolled-blank` L=pi x neutral-dia --
  OD 12, T 0.25, k 0.5 -> D_neutral 11.75, L 36.91 in. ALL MATCH -- no fix needed.
  With the v40 re-audit (prior session) and v39 (a relocation, no new math), the
  whole v37-v41 machine-shop / fab cluster is now verified correct.
- **Verification**: `npm run build` + `npm run lint` (26 gates) + `npm test`
  (5,518) + `npm run audit` (6 stages) all green; payload figures re-read from the
  gate after the build.
- **Outcome**: landed.

## 2026-06-12 - contributor/maintainer doc-accuracy pass (internal)

- **Scope**: documentation-accuracy housekeeping. **No code, data, tile, or
  shipped-output change** (catalog stays 581); the only non-doc edit is a comment
  in `scripts/audit.mjs`. Package **0.48.0 -> 0.48.1** (a patch). No new deps.
- **Finding**: an audit of the contributor docs vs. the actual current procedure
  found stale facts that would mislead a contributor: (1) `maintainer-quickstart.md`
  said add `TOOLS` to `app.js` -- it moved to `tools-data.js` in spec-v17 §H.2;
  (2) the new-tile steps omitted ~6 of the now-required registry touchpoints
  (tile-meta `_TILES`, app.js `declare`, compute-map, related-tiles, aliases,
  `// dims:` annotation, corpus/tile-index regen) that lint gates enforce; (3)
  `npm run audit` is 6 stages (check:shells added in spec-v13) but the docs AND
  `audit.mjs`'s own header comment said "five"; (4) `seo.md` said build-shells
  reads `TOOLS` from `app.js` and the related registry from `tile-meta.js` -- both
  moved (tools-data.js / scripts/related-tiles.mjs).
- **Fix**: corrected `maintainer-quickstart.md` (wiring steps + retire step +
  stage count + bounds-fuzzer cross-check), `contributor-checklist.md` (added the
  registry-wiring items + stage count + bounds-fuzzer), `citation-discipline.md`
  + `v6-audit.md` (stage count), `seo.md` (TOOLS / related-registry locations),
  and `audit.mjs` (header comment now lists check:shells as stage 5, data:verify
  as 6). Left `launch-checklist.md`'s "5 stages" entries -- it is an explicit
  frozen per-release snapshot (v12-era), so its historical record stands.
- **Verification**: `npm run lint` (26 gates), `npm test` (5,518), `npm run audit`
  (6 stages) all green; no smart-char / banned-token regressions in the edited
  docs (the pre-existing em/en-dashes in these contributor docs are not gated).
- **Outcome**: landed.

## 2026-06-12 - spec-v53 linear-interpolation tile + v40 correctness re-audit (internal)

- **Scope**: catalog-growth spec adding **1 first-principles tile** to Group G in
  `calc-cross.js`, plus an independent correctness re-audit of the spec-v40 batch.
  Catalog **580 -> 581**; package **0.47.0 -> 0.48.0** (a minor). No new module,
  no new deps, no telemetry, no AI.
- **Tile** (hand-verified + browser-read): `linear-interpolation` -- y = y1 +
  (x-x1)(y2-y1)/(x2-x1), slope, extrapolation flag. (0,10)/(10,30) @4 -> y 18,
  slope 2; @15 of (0,0)/(10,100) -> 150 (extrapolated); descending x handled;
  x1==x2 and non-finite -> error.
- **Concept-check**: net-new. Interpolation is used INSIDE ~12 tiles (NEMA derate,
  ACI w/c, refrigerant, livestock-water) but exposed by none -- that internal
  ubiquity is the evidence the standalone gap is real. Sits in the cross-trade
  utility tier (unit-converter / decimal-to-fraction / geometry).
- **v40 correctness re-audit**: independently re-derived all 10 calc-shop tiles'
  formulas + empirical constants from first principles (machining-time, turning
  MRR 12xSFMxDOCxIPR=4.32, surface finish Rt=f^2/8r, taper atan((D-d)/2L)=2.38594,
  three-wire 0.57735/1.51553, punch perimeterxTxshear=19634.95, press-brake
  575x(UTS/60)xT^2/V=8.984, weld duty 60x(250/300)^2=41.67%, IIW CE=0.38333).
  ALL MATCH -- recent additions confirmed correct, not merely self-consistent. No
  fix needed. (Also surveyed Group T Lab = comprehensive; no clean gap there.)
- **Module / cap**: calc-cross.js 93.4% of 36 KB (no bump). tools-data.js crossed
  its cap -> bumped 48000 -> 50000 B (lazy-loaded). New row in spec-v43 Group-G
  appendix, so the Group-G original-block count assertion is unaffected. Home
  payload 36,241 -> 36,249 B (35.4%).
- **Verification**: `npm run lint` (every gate; wiring **30 modules / 581 tile-id
  entries**; check-readme-counts agrees 581 / 607; corpus 885, dimensions 888,
  derivation/source 581/581; tile-contract 586 swept, 0/0), `npm test` (**5,518
  unit tests**), `npm run build` (581 tile + 24 group shells, 607-URL sitemap),
  `npm run data:verify` (123), and the browser read above.
- **Outcome**: landed.

## 2026-06-12 - spec-v52 hiking-time tile (internal)

- **Scope**: catalog-growth spec adding **1 first-principles tile** to Group P
  (Field/SAR) in `calc-field.js`. Catalog **579 -> 580**; package **0.46.0 ->
  0.47.0** (a minor). No new module, no new deps, no telemetry, no AI.
- **Tile** (hand-verified + browser-read): `hiking-time` -- Naismith's rule.
  time = distance/pace + ascent/(600 m per hr), x terrain/fatigue factor. 10 km /
  600 m / 5 km/h -> 2 hr flat + 1 hr ascent = 3 h 0 min; 1.5x factor -> 4 h 30
  min; 6 mi / 2000 ft / default 3 mph -> ~3 h 1 min. Errors on distance<=0,
  ascent<0, non-finite; blank pace defaults (no divide-by-zero).
- **Concept-check**: net-new. `pacing-distance` is steps->distance (not time);
  `backcountry-needs` is water/cal; `search-probability` is SAR detection;
  `solar-times` is daylight. Group P had no trip-time estimate (found via the
  coverage-completeness survey of under-served groups).
- **Module / cap**: `calc-field.js` 89.8% -> 96.8% of 22 KB (no bump; next Group-P
  tile needs one). tools-data.js 98% of 48000 B (next tile likely needs a bump).
  New row in the spec-v25 Group-P appendix, so the Group-P original-block count
  assertion is unaffected. Home payload 36,233 -> 36,241 B (35.4%).
- **Verification**: `npm run lint` (every gate; wiring **30 modules / 580 tile-id
  entries**; check-readme-counts agrees 580 / 606; corpus 884, dimensions 887,
  derivation/source 580/580; tile-contract 585 swept, 0/0), `npm test` (**5,517
  unit tests**), `npm run build` (580 tile + 24 group shells, 606-URL sitemap),
  `npm run data:verify` (123), and the browser read above.
- **Outcome**: landed.

## 2026-06-12 - spec-v51 lighting-beam tile (internal)

- **Scope**: catalog-growth spec adding **1 first-principles tile** to Group N
  (Stage) in `calc-stage.js`. Catalog **578 -> 579**; package **0.45.0 -> 0.46.0**
  (a minor). No new module, no new deps, no telemetry, no AI.
- **Tile** (hand-verified + browser-read): `lighting-beam` -- theatrical fixture
  photometry. Beam diameter = 2 x throw x tan(angle/2); center illuminance E =
  candela / distance^2; candela from lumens = lumens / (2*pi*(1-cos(angle/2))).
  20 deg / 30 ft / 100000 cd -> 10.58 ft pool, 111.1 fc / 1196 lux; double the
  throw -> quarter the lux (inverse-square); lumens mode (20 deg / 20000 lm) ->
  ~209500 cd. Errors on angle outside (0,180), throw<=0, intensity<=0, non-finite.
- **Concept-check**: net-new. The existing `lux-to-footcandle` (Group A) is the
  architectural lumen-method room area-average (flux budget / CU / LLF); it has no
  beam diameter, throw, or inverse-square point illuminance. `lighting-beam` is the
  single-fixture point-source model, distinct audience and computation (shared only
  the incidental lux/fc unit). Group N's other tiles are audio / rigging / power /
  control -- lighting was the missing fourth pillar (found via the under-served-and-
  incomplete-coverage survey).
- **Module / cap**: `calc-stage.js` crossed its 17 KB cap on the new tile (17201 B)
  -> bumped 17 -> 18.5 KB (lazy-loaded). tools-data.js within 48000 B. Home payload
  36,225 -> 36,233 B (35.4%). New row in the spec-v24 Group-N appendix, so the
  Group-N original-block count assertion in citations.test.js is unaffected.
- **Verification**: `npm run lint` (every gate; wiring **30 modules / 579 tile-id
  entries**; the spec-v49 check-readme-counts gate flagged the README at 578 until
  bumped, then agreed at 579 / 605; corpus 883, dimensions 886, derivation/source
  579/579; tile-contract 584 swept, 0/0), `npm test` (**5,516 unit tests**), `npm
  run build` (579 tile + 24 group shells, 605-URL sitemap), `npm run data:verify`
  (123), and the browser read above.
- **Outcome**: landed.

## 2026-06-12 - spec-v50 bakers-percentage tile (internal)

- **Scope**: catalog-growth spec adding **1 first-principles tile** to Group O
  (Kitchen) in `calc-kitchen.js`. Catalog **577 -> 578**; package **0.44.2 ->
  0.45.0** (a minor). No new module, no new deps, no telemetry, no AI.
- **Tile** (hand-verified + browser-read): `bakers-percentage` -- baker's math
  (flour=100%, ingredient = flour x %/100, hydration = water/flour). 1000 g flour
  / 65% / 2% salt / 1% yeast / 4 pieces -> 650 g water, 20 g salt, 10 g yeast,
  1680 g dough, 168% total formula, 420 g/piece. Pizza case (500 g / 75% / 2% /
  4% oil, no pieces) -> 905 g, per-piece null. Errors on flour<=0, negative %, or
  non-finite.
- **Concept-check**: net-new. `recipe-scale` scales by a factor and its renderer
  explicitly disclaims baker's percentages ("do not scale linearly"); `yield-ep`
  is AP/EP yield; the rest of Group O is unrelated. The under-served-group survey
  (O was the smallest substantive group at 7) pointed here.
- **Module / cap**: `calc-kitchen.js` ~84% -> ~94% of 13 KB (no bump; next kitchen
  tile needs one). tools-data.js within 48000 B. Home payload 36,214 -> 36,225 B
  (35.4%).
- **Verification**: `npm run lint` (every gate; wiring **30 modules / 578 tile-id
  entries**; the spec-v49 check-readme-counts gate correctly flagged the README
  before I bumped the counts, then agreed at 578 / 604; corpus 882, dimensions
  885, derivation/source 578/578; tile-contract 583 swept, 0/0), `npm test`
  (**5,515 unit tests** -- incl. the Group-O count assertion bumped 7->8 in
  citations.test.js), `npm run build` (578 tile + 24 group shells, 604-URL
  sitemap), `npm run data:verify` (123), and the browser read above.
- **Outcome**: landed.

## 2026-06-12 - spec-v49 README catalog-count gate + diagram drift fix (internal)

- **Scope**: doc-accuracy fix + recurrence gate (the v45/v46/v48 claim-audit
  lineage). **No tile, no calculator change, no shipped-output change** (catalog
  577); package **0.44.1 -> 0.44.2** (a patch). Adds a lint gate; no new deps.
- **Finding**: two README Mermaid diagrams carried silently-stale counts. The
  count-bump recipe edits prose / cheat-sheet / the correctness-pipeline diagram
  explicitly (Mermaid glues the number to `\n`, which a `\b<old>\b` perl misses),
  but the architecture diagram (`\n28 group modules`) and the prerendered-shell
  diagram (`\n555 static shells`, `sitemap.xml\n581 URLs`) were never on that list
  and drifted ~20 spec landings while the prose stayed correct (live 30 / 577 /
  603). Phase F node (390 tests / 66 batches) checked, current.
- **Fix**: corrected the three nodes (28->30, 555->577, 581->603).
- **Gate**: `scripts/check-readme-counts.mjs` (lint chain after
  check-discoverability; offline). Derives live counts (tiles from tools-data.js,
  modules from calc-*.js glob, groups from distinct group: letters, sitemap =
  tiles + groups + 2) and asserts every label-anchored count claim matches --
  anchored on the label (`static shells` under /tools/ vs /groups/, `group
  modules`, `URLs`, `shell per tile (N)`) so it catches prose or Mermaid drift but
  does not false-match the bare number in historical "576 -> 577" stanzas.
  Negative-tested. Lint chain 25 -> 26 gates.
- **Verification**: `npm run lint` (26 gates green incl. check-readme-counts),
  `npm test` (5,514, unchanged), `npm run data:verify` (123). No build-output
  change. Also recorded: the SCH40_ID_IN pipe-ID table duplicated between
  calc-plumbing.js and calc-gas.js (a deliberate v42 split decision, fixed
  physical-standard table, near-zero drift risk) is left as-is, not gated.
- **Outcome**: landed.

## 2026-06-12 - spec-v48 Content-Security-Policy integrity gate (internal)

- **Scope**: a security-invariant gate (the v45/v46 dormant-gate lineage). **No
  tile, no calculator change, no shipped-output change** (catalog stays 577);
  package **0.44.0 -> 0.44.1** (a patch). Adds a lint gate; no new deps.
- **Finding (security-invariant audit)**: the "0 trackers / works offline" promise
  is runtime-enforced by a tight CSP shipped twice (the `<meta>` in index.html and
  the header in `_headers`), with the one inline boot script pinned by sha256 and
  maintained by hand in both places per the comment above it -- and **nothing
  enforced that hash sync or the locked-down directives**. Drift modes: a forgotten
  hash recompute (the `_headers` edge CSP is never exercised by local tests, so it
  ships silently); a relaxed `script-src`/`connect-src` admitting an external host.
- **Gate**: `scripts/check-csp.mjs` (lint chain, after check-manifests; offline).
  Strips HTML comments (one contains the literal `<script>`), extracts the single
  bare inline boot script, recomputes its sha256, asserts it is in `script-src` in
  BOTH files; asserts `script-src` = `'self'` + hash only; `default-src` /
  `connect-src` = `'self'`, `object-src` = `'none'`; and no external origin in any
  directive of either CSP. Negative-tested (hash drift, external connect-src,
  weakened directive all redden). Currently green: sha256-0qFL... matches both.
- **Docs**: README lint-chain table gains a `check-csp` row; the gate count, which
  disagreed with itself ("23-gate" header vs "24 gates" body), corrected to 25;
  safety section notes the CSP is now build-gated. `check:csp` npm alias added.
- **Verification**: `npm run lint` (25 gates green incl. check-csp), `npm test`
  (5,514, unchanged), `npm run data:verify` (123). No build-output change, so
  corpus/dims/derivation/catalog counts unchanged.
- **Outcome**: landed.

## 2026-06-12 - spec-v46 + spec-v47 (dist gate + circle-from-3-points) (internal)

- **Scope**: two coherent pieces in one session. **spec-v46** (housekeeping):
  wire the dormant `check-dist` gate into CI. **spec-v47** (catalog growth): add
  `circle-from-3-points` to Group G / `calc-fab.js`. Catalog **576 -> 577**;
  package **0.43.0 -> 0.44.0** (a minor). No new module, no new dependencies, no
  telemetry, no AI.
- **spec-v46**: a dormant-gate audit (diff `scripts/check-*.mjs` vs the gates in
  ci.yml + the `lint` chain) found `check-dist` (spec-v12 G.3 dist/-vs-runtime
  cross-check) was never run in CI. Wired `npm run check:dist` into the
  integration job after build. Currently 2,011 same-origin refs across 790 dist/
  files, zero dangling. `check-free-access` left opt-in (network probe, by design).
- **spec-v47 tile** (hand-verified + browser-read): `circle-from-3-points` --
  circumcircle of three points. center = circumcenter, radius = distance to a
  point. (0,0),(4,0),(0,3) -> center (2, 1.5), radius 2.5 (right-triangle
  hypotenuse = diameter); (5,0),(0,5),(-5,0) -> center (0,0), radius 5; collinear
  / coincident / non-finite -> error. First-principles coordinate geometry, public
  domain. Concept-check: net-new -- `bolt-circle` lays out a known circle,
  `circular-arc` uses chord+rise; neither recovers a circle from three points.
- **Module / cap**: tile lands in `calc-fab.js` (~84% -> ~86% of 20 KB, no bump);
  tools-data.js fit the row within 48000 B. Home payload 36,184 -> 36,214 B
  (35.4%) from the app.js declare.
- **Verification**: `npm run lint` (every gate; wiring **30 renderer modules /
  577 tile-id entries**; corpus 881, dimensions 884, derivation/source 577/577;
  tile-contract sweep 582 tiles, 0/0), `npm test` (**5,514 unit tests**), `npm run
  build` (577 tile + 24 group shells, 603-URL sitemap), `npm run data:verify`
  (123), `check:dist` (790 files / 2,011 refs / 0 dangling) + `check:shells`
  (577+24) + `check:shell-mobile` (603 routes), and the browser read above.
  Doc-staleness fix: the README docs-list spec range said "spec.md through
  spec-v25.md" (badly stale) -> corrected to spec-v47.md; the file-tree spec range
  spec-v44 -> spec-v47.
- **Outcome**: landed.

## 2026-06-11 - spec-v45 prerendered shell citation + gate activation (internal)

- **Scope**: spec-v45 is a public-surface / SEO enhancement to the spec-v13
  prerendered shells. **No tile added or removed, no calculator output changed**
  (catalog stays 576); package **0.42.0 -> 0.43.0** (a minor). No new
  dependencies, no telemetry, no AI.
- **Finding (README-accuracy audit)**: the README claimed each tile shell carried
  an inline notice, the source-stamp citation, and a worked example -- but the
  actual shell (and the docs/seo.md model) carried none of those. Two real gaps:
  (1) the reference content (formula + citation) was missing from the shells the
  prerender exists to make crawlable; (2) `scripts/check-shells.mjs` (the
  spec-v13 content gate) was never invoked by ci.yml -- only check-shell-mobile
  ran -- so the shell content contract was unenforced on push.
- **Change**: `build-shells.mjs` imports `CITATIONS` and emits a "Formula and
  source" section (formula + edition, HTML-escaped) in every tile shell after the
  Run-the-calculator link. `check-shells.mjs` gained a per-tile assertion that the
  block is present (negative-tested). `ci.yml` integration job gained a
  `npm run check:shells` step after build. docs/seo.md shell model + README
  "Discoverable surface" / CI sections corrected to match.
- **Verification**: `npm run build` + `npm run check:shells` (576 tile + 24 group
  shells; every tile shell carries the formula/source block; titles / descriptions
  / JSON-LD allowlist / gzip caps all green; largest tile shell ~2.3 KB of 6 KB),
  `npm run check:shell-mobile` (602 routes, zero horizontal scroll at 320 px with
  the new text), `npm run lint`, `npm test` (5,513, unchanged), `npm run
  data:verify` (123), and a browser read of an enriched shell (ohms-law shows
  "V = I * R" in static HTML). Negative test: removing the section reddens the gate.
- **Outcome**: landed.

## 2026-06-11 - spec-v44 circular-arc tile (internal)

- **Scope**: spec-v44 is a catalog-growth spec adding **1 first-principles tile**
  to the existing `calc-fab.js` module (Group G). Catalog **575 -> 576**; package
  **0.41.0 -> 0.42.0** (a minor). No new group, no new module, no new
  dependencies, no telemetry, no AI, US standards only.
- **Tile** (hand-verified to the last digit and read in a real browser):
  `circular-arc` -- radius, arc length, and central angle of a circular arc from a
  chord (span) and rise (sagitta) at midspan. `R = (chord^2/4 + rise^2)/(2 rise)`;
  central angle `= 2 acos((R-rise)/R)` (valid minor and major); arc `= R x angle`.
  chord 24 in / rise 4 in -> radius 20 in (dia 40 in), 73.7398 deg, arc 25.7400
  in; rise = radius -> semicircle (chord 20 / rise 10 -> 180 deg, arc 31.4159);
  rise > radius -> major arc (chord 10 / rise 12 -> 269.5 deg).
- **Citation discipline**: first-principles circle geometry (the sagitta /
  middle-ordinate relation), public domain, cited as such. No table transcription.
- **Concept-check**: net-new on the 575 live tiles. `bolt-circle` lays out hole
  positions on a known circle; `pipe-template-wrap` / `pipe-miter-cut` develop
  pipe templates; `rolling-offset` / conduit suite solve fitting triangles -- none
  recovers a circle's radius from a measured chord and rise.
- **Module / cap**: lands in `calc-fab.js` (Group G fab & layout bench, ~79% ->
  ~81% of its 20 KB cap, no bump). `tools-data.js` fit the new row within its
  48000 B cap. Home payload 36,165 -> 36,184 B (35.3%) from the app.js declare.
- **Verification**: `npm run lint` (every gate; wiring lint **30 renderer modules
  / 576 tile-id entries**; corpus 880, dimensions 883, derivation/source 576/576;
  tile-contract sweep 581 tiles, 0/0), `npm test` (**5,513 unit tests**), `npm run
  build` (576 tile + 24 group shells, 602-URL sitemap), `npm run data:verify`
  (123), `npm run check:shell-mobile`, and the browser read above.
- **Outcome**: landed.

## 2026-06-11 - spec-v43 tank-volume tile (internal)

- **Scope**: spec-v43 is a catalog-growth spec adding **1 first-principles tile**
  to the existing `calc-cross.js` module (Group G). Catalog **574 -> 575**;
  package **0.40.1 -> 0.41.0** (a minor). No new group, no new module, no new
  dependencies, no telemetry, no AI, US standards only.
- **Tile** (hand-verified to the last digit and read in a real browser):
  `tank-volume` -- partial liquid volume of a cylindrical tank from a dipstick
  depth. Horizontal: circular-segment area `R^2*acos((R-h)/R) - (R-h)*sqrt(2Rh-h^2)`
  times length; vertical: `pi*R^2*depth`. 24 in dia x 48 in horizontal at depth
  12 in -> 47.00 gal (177.9 L, 6.283 ft^3), 50.0% of a 94.00 gal full tank; the
  same in feet (2x4, depth 1) -> 47.00 gal; vertical same dims at depth 12 in ->
  25.0%; depth > diameter clamps to full with a note.
- **Citation discipline**: first-principles circular-segment geometry (public
  domain), cited as such; flat ends assumed (dished/hemispherical heads need a
  head-type correction, noted). No table transcription.
- **Concept-check**: net-new on the 574 live tiles. `pipe-volume` is the full
  cylinder only; `expansion-tank` / `wh-expansion-tank` / `septic-tank` /
  `pressure-tank-drawdown` / `thermal-expansion-volume` are sizing / drawdown
  tiles, not partial-volume gauging.
- **Module / cap**: lands in `calc-cross.js` (Group G home, ~86% -> ~88% of its
  36 KB cap, no bump). The `tools-data.js` registry crossed its cap on the new
  row, so its gzip cap was bumped 47000 -> 48000 B (lazy-loaded, not in the
  home-view payload). Home payload 36,146 -> 36,165 B (35.3%) from the app.js
  declare line.
- **Verification**: `npm run lint` (every gate; wiring lint **30 renderer modules
  / 575 tile-id entries**; corpus 879, dimensions 882, derivation/source 575/575;
  tile-contract sweep 580 tiles, 0/0), `npm test` (**5,512 unit tests**), `npm run
  build` (575 tile + 24 group shells, 601-URL sitemap), `npm run data:verify`
  (123), `npm run check:shell-mobile`, and the browser read above.
- **Outcome**: landed.

## 2026-06-11 - spec-v42 calc-gas.js module split (internal)

- **Scope**: spec-v42 is a platform-only cap-relief split (the spec-v36 / v39
  lineage): **no tile added or removed, no calculator output changed** (catalog
  stays 574); package **0.40.0 -> 0.40.1** (a patch). `calc-plumbing.js` had
  reached **98.9%** of its 50 KB gzip cap -- the tightest module in the catalog --
  so the documented per-tile-split remediation came due. No new dependencies, no
  telemetry, no AI, US standards only.
- **Relocation**: the three self-contained fuel-gas tiles moved from
  `calc-plumbing.js` to a new thematic module `calc-gas.js` (Fuel-Gas Piping
  bench): `gas-pipe-sizing`, `gas-leak-rate`, `gas-pipe-pressure-drop`. They keep
  **group: "B"** (group letter independent of module). `GAS_PROPERTIES` and the
  `spitzglassFlow` helper moved with them; the small stable `SCH40_ID_IN` table is
  duplicated (the water tiles still use the copy in calc-plumbing.js). Browser
  smoke-tested: identical outputs (NG 100k/50ft -> 97.1 ft^3/hr at 0.5 in / 0.241
  in WC achieved; 0.05 in orifice at 0.25 psi -> 3.15 ft^3/hr; 1000 CFH / 1.049 in
  / 100 ft -> 16.73 in w.c.), zero console errors.
- **Result**: `calc-plumbing.js` ~49.5 KB -> ~46.9 KB gz (cap lowered 50000 ->
  49000 B to lock in the relief; now 95.7%); new `calc-gas.js` ~4.4 KB (cap 5500 B,
  80.2%). Module count **29 -> 30**; catalog stays 574. Home-view payload 36,047 ->
  36,146 B (35.3%) from the app.js declare change; calc-gas.js is lazy-loaded.
- **Re-wiring (all gated)**: `app.js` declare, `scripts/build.mjs` FILES, `sw.js`
  SHELL_ASSETS, `scripts/check-module-sizes.mjs` caps, `test/fixtures/compute-map.js`
  paths; the gas imports in six unit-test files repointed to calc-gas.js, plus the
  two source-text-assertion tests (`v8-phase-b`, `v8-renderer-wiring2`) repointed;
  v14 corpus regenerated. tools-data / tile-meta / citations / worked-examples are
  id-referenced and group-keyed, so no change.
- **Verification**: `npm run lint` (every gate; wiring lint **30 renderer modules /
  574 tile-id entries**; module sizes green after build), `npm test` (**5,511 unit
  tests**), `npm run build` (574 tile + 24 group shells, 600-URL sitemap), `npm run
  data:verify` (123), `npm run check:shell-mobile`, and the three-tile browser
  smoke-test above.
- **Outcome**: landed.

## 2026-06-11 - spec-v41 machine shop & fab bench, batch 2 (internal)

- **Scope**: spec-v41 is a catalog-growth spec adding **2 first-principles tiles**
  to the **existing** `calc-shop.js` module (no new module, no new group), drawn
  from spec-v40's own §5 roadmap. Catalog **572 -> 574**; package **0.39.0 ->
  0.40.0** (a minor). Distribution K +1, G +1; group count holds at 24. No new
  dependencies, no telemetry, no AI, US standards only.
- **Tiles** (each hand-verified to the last digit and read in a real browser):
  K -- `tap-drill-size` (60-degree thread, D_drill = D_major - % / (76.98 x TPI);
  1/4-20 UNC at 75% -> 0.201286 in, the standard #7 drill, nearest 13/64 in =
  72.17%; cross-checks M8x1.25 -> 6.78 mm vs standard 6.8 mm, M6x1.0 -> 5.03 mm vs
  5.0 mm). G -- `rolled-blank` (developed flat length at the neutral axis, L = pi x
  (OD - 2T(1-k)) = pi x (ID + 2kT), default k = 0.5; OD 12 in / T 0.25 in / k 0.5
  -> neutral 11.75 in, L = pi x 11.75 = 36.913714 in; ID 12 in -> 38.484510 in).
- **Citation discipline**: both tiles are first-principles geometry (public
  domain), cited as such. **Zero table transcription** -- `tap-drill-size` is
  explicit that the named letter / number / fraction drill is a chart lookup and
  reports only the nearest 1/64 in fraction; it computes the exact diameter.
- **Concept-check / deferrals**: both shipped tiles are net-new with no concept
  overlap on the 572 live tiles. Two further spec-v40 §5 candidates were
  **deferred on a live concept-check**: `gas-cylinder-duration` (overlaps the
  existing `o2-cylinder-duration` -- cylinder gas content / flow = time) and
  `weld-cost-per-foot` (overlaps `weld-usage` + `time-and-materials`); both are
  held for a maintainer call rather than shipped as near-dups.
- **Module wiring**: the two ids appended to the existing `calc-shop.js`
  `SHOP_RENDERERS` and the `app.js` declare; no new platform points (the v40 build
  / sw / module-size / declare wiring already covers the module). `calc-shop.js`
  at **83.7%** of its 16 KB cap (no bump); lazy-loaded, so the home-view payload
  (36,047 B / 35.2%) carries no new first-paint bytes. Module count holds at 29.
- **Verification**: `npm run lint` (every gate; wiring lint **29 renderer modules /
  574 tile-id entries**; corpus 878, dimensions 881, derivation/source 574/574;
  tile-contract sweep 579 tiles, 0 Tier-1 / 0 Tier-2), `npm test` (**5,511 unit
  tests**), `npm run build` (574 tile + 24 group shells, 600-URL sitemap), and both
  tiles verified clean across the render-no-nan, a11y, and 320 px responsive
  (Chromium + WebKit) gates with the rendered example output read to the digit.
- **Outcome**: landed.

## 2026-06-11 - spec-v40 machine shop & fab bench (internal)

- **Scope**: spec-v40 is a catalog-growth spec adding **10 first-principles tiles**
  in a **new module** `calc-shop.js` (the Machine Shop & Fabrication bench).
  Catalog **562 -> 572**; package **0.38.1 -> 0.39.0** (a minor). No new group
  (each tile keeps its natural group letter K/G/E behind `SHOP_RENDERERS`, the
  v28/v36/v39 group-letter-independent-of-module precedent), no new dependencies,
  no telemetry, no AI, US standards only. Distribution K +5, G +2, E +3; group
  count holds at 24.
- **Tiles** (each hand-verified to the last digit against the formula, not the
  spec's loose value): K -- `machining-time` (t = L / feed_IPM; 6 in at 500 RPM x
  0.010 IPR -> 5.0 IPM, 1.2000 min, 4.8000 min over 4 passes), `material-removal-rate`
  (milling 0.5 x 0.1 x 10 -> 0.5000 in3/min; turning 12 x 300 x 0.1 x 0.012 ->
  4.320; drilling (pi x 0.25/4) x 8 -> 1.5708), `turning-surface-finish` (Rt =
  f^2/8r; 0.005 IPR / 1-32 in -> 100.0 uin Rt, 25.0 uin Ra), `taper-calc` (D 1.0,
  d 0.75, L 3.0 -> 1.0000 in/ft, 2.38594 deg per side -- the spec's 2.38609 was a
  loose rounding; the fixture pins the exact atan(1/24) output), `dividing-head`
  (N 9 on 40:1 -> 4 turns + 4/9; 24 holes on a 54-hole circle, 12 on a 27-hole).
  G -- `thread-measure-wire` (1/2-13 UNC, E 0.45 -> best wire 0.044412, M
  0.466655 in), `punch-force` (round 0.5 in, T 0.25, tau 50,000 -> 19,634.95 lb /
  9.8175 tons, 687.2 lb stripping). E -- `press-brake-tonnage` (T 0.125, L 4, V 1,
  mild steel -> 8.9844 tons/ft, 35.938 tons), `weld-duty-cycle` (250 A at 60% ->
  41.67% at 300 A, 193.6 A continuous), `carbon-equivalent` (C 0.25 / Mn 0.80 ->
  CE 0.38333, "preheat advised").
- **Citation discipline**: eight tiles are first-principles geometry/algebra
  (public domain); two cite a published empirical/material constant the user can
  override (`press-brake-tonnage` the 575 air-bend constant; `carbon-equivalent`
  the IIW / AWS D1.1 formula); one (`punch-force`) is first-principles shear with a
  user-supplied shear strength. **Zero table transcription** -- no thread chart,
  tap-drill table, or speeds-and-feeds book; the user supplies the strength, feed,
  and dimensions.
- **Module wiring**: new `calc-shop.js` (`SHOP_RENDERERS`, ui-fields helpers +
  module-local `_finiteGuard`) added to `scripts/build.mjs` FILES, `sw.js`
  SHELL_ASSETS, `scripts/check-module-sizes.mjs` (16 KB cap, fits with headroom),
  and the `app.js` lazy-load declare. Lazy-loaded, so the home-view payload
  (36,011 B / 35.2%) carries no shop bytes. Module count **28 -> 29**.
- **Verification**: `npm run lint` (every gate; wiring lint **29 renderer modules /
  572 tile-id entries**; corpus 876, dimensions 879, derivation/source 572/572;
  tile-contract sweep 577 tiles, 0 Tier-1 / 0 Tier-2), `npm test` (**5,509 unit
  tests**), `npm run build` (572 tile + 24 group shells, 598-URL sitemap), `npm run
  data:verify` (123), and all ten verified clean across the render-no-nan, a11y,
  and 320 px responsive (Chromium + WebKit) gates with the rendered example output
  read to the digit.
- **Outcome**: landed.

## 2026-06-11 - spec-v39 calc-electrical.js cap relief (internal)

- **Scope**: spec-v39 is platform-only housekeeping (spirit of spec-v10 /
  spec-v36). It **adds no tiles, removes none, changes no output**. Catalog stays
  **562**; package **0.38.0 -> 0.38.1** (a patch). The spec-v24 conduit-bending
  suite (`conduit-offset`, `conduit-saddle`, `conduit-90-stub`) is relocated from
  `calc-electrical.js` to the existing `calc-fab.js`.
- **Why**: `calc-electrical.js` had reached **99.3% of its 66 KB gzip cap** (the
  most-pressed module after calc-plumbing at 98.9%). It is the founding,
  largest, most-depended-on module, so the next electrical tile -- or even a
  citation reword -- would have broken the build. Continued cap-bumping was
  deferring the documented per-tile-split remediation the maintainer notes have
  flagged since the cap pressure became systemic.
- **Cleavage discipline** (the v36 self-containment test): the moved block was
  grepped for references to symbols defined above the cut in calc-electrical --
  zero. It references only ui-fields helpers (already imported by calc-fab) and
  the module-local `_finiteGuard` (already in calc-fab), so the move is
  byte-for-byte behavior-preserving. Conduit bending is the conduit analog of the
  pipe-miter / pipe-template tiles already in calc-fab, so the bench is the
  natural cross-trade home for bend/layout geometry; the three keep `group: "A"`
  (group letter independent of module, the v28/v36 precedent).
- **Result**: `calc-electrical.js` ~65.5 -> ~62.4 KB (cap 66000 -> 64500 B, now
  96.7%); `calc-fab.js` ~12.4 -> ~15.3 KB (cap 16000 -> 20000 B, now 78.3%).
  calc-fab is lazy-loaded, not in the home-view first-paint payload, so its cap
  bump is spec-v10 §H.2-safe. Module count stays 28.
- **Verification**: `npm run lint` (wiring lint 28 renderer modules / 562 tile-id
  entries; sw-precache 49 entries; module sizes both green), `npm test` (5,499
  unit tests, incl. the 3 conduit tests now importing from calc-fab), `npm run
  build`, `npm run data:verify` (123), tile-contract sweep (567 tiles, 0 Tier-1 /
  0 Tier-2), and a browser smoke-test of the moved + a kept electrical tile --
  all green.
- **Outcome**: landed.

## 2026-06-11 - spec-v38 thread-pitch bench (internal)

- **Scope**: spec-v38 adds **1 new tile** deepening Group G (Cross-Trade
  Utilities). Catalog **561 -> 562**; package **0.37.0 -> 0.38.0**. No new group,
  so no §1.1 maintainer-signoff gate. Lands in the `calc-fab.js` module alongside
  `sine-bar` and `bolt-circle`, using the headroom the v36 split created
  (~64% -> ~66% of the 16 KB cap; no cap bump).
- **Deliberate scoping for correctness** (continuing the v29-v37 discipline):
  the gates verify finiteness, dimensions, and contract totality but **not
  absolute formula correctness**, so the tile is scoped to first-principles
  60-degree thread geometry whose worked example is hand-verifiable to the last
  digit. The example was re-checked by hand on 2026-06-11: a 1/4-20 UNC thread
  (20 TPI) gives P = 1/20 = 0.050000 in = 1.2700 mm, lead (1 start) = 0.050 in,
  and the 60-degree sharp-V height H = 0.050 x sqrt(3)/2 = 0.0433013 in; a metric
  M8x1.25 thread gives TPI = 25.4/1.25 = 20.32 and pitch = 1.25/25.4 = 0.0492126
  in; a 2-start 8 TPI thread gives pitch = 0.125 in and lead = 0.125 x 2 = 0.250
  in. All reproduce to the last digit.
- **Concept-check**: no thread-pitch / threads-per-inch / lead tile existed among
  the 561 live tiles. `roof-pitch` is the roofing rise-over-run slope;
  `flange-bolt-torque` reads a thread *series* (UNC/8UN) to select a tensile-area
  constant but computes no pitch or lead; `fastener-pullout`,
  `deck-ledger-fasteners`, and `screw-conveyor` are unrelated concepts.
- **Out of scope (noted in the tile)**: the truncated working depth (UN crest/root
  flats, ISO 60-degree truncation) and the tap-drill size are thread-form- and
  class-specific and are not computed; Acme, buttress, and pipe-thread forms are
  not covered. The deferred `tap-drill-size` tile carries an explicit
  reviewed-table requirement before it can land, because the tap-drill diameter
  for a given thread/class is a chart lookup, not a hand-verifiable closed form.
- **Verification**: `npm run lint` (every gate, incl. `check-multiline-inputs`),
  `npm test` (5,499 unit tests), `npm run build` (562 tile + 24 group shells,
  588-URL sitemap), `npm run data:verify` (123), the worked-examples runner (567
  fixtures), the full-catalog render-no-nan Chromium sweep (`thread-pitch` clean),
  and the 320px shell audit -- all green.
- **Outcome**: landed. The tile contract sweep reports 567 tiles, 0 Tier-1
  crashers, 0 Tier-2 backlog.

## 2026-06-10 - spec-v37 sine-bar bench (internal)

- **Scope**: spec-v37 adds **1 new tile** deepening Group G (Cross-Trade
  Utilities). Catalog **560 -> 561**; package **0.36.1 -> 0.37.0**. No new group,
  so no §1.1 maintainer-signoff gate. First net-new tile to land in the
  `calc-fab.js` module that the v36 split created the headroom for.
- **Deliberate scoping for correctness** (continuing the v29-v35 discipline):
  the gates verify finiteness, dimensions, and contract totality but **not
  absolute formula correctness**, so the tile is scoped to first-principles
  trigonometry whose worked example is hand-verifiable to the last digit. The
  example was re-checked by hand on 2026-06-10: a 5 in sine bar on a 2.5 in
  gauge-block stack gives arcsin(2.5/5) = arcsin(0.5) = 30.0000 deg; reversing,
  30 deg on a 5 in bar gives 5 x sin(30) = 2.5000 in; a 10 in bar at 10 deg
  gives 10 x sin(10) = 1.7365 in. All reproduce to the last digit.
- **New tile**:
  - `sine-bar` (Group G) - sine bar / sine plate angle setup: a bar of length L
    (the roll-center distance, commonly 5 in or 10 in) on a gauge-block stack of
    height H tilts to angle theta where sin(theta) = H / L. Solves both
    directions (angle = arcsin(H/L); stack = L x sin(theta)) for any bar length
    (Machinery's Handbook, by name). A concept-check against the 560 live tiles
    found no sine-bar / sine-plate / gauge-block angle tile; the catalog's other
    "angle" tiles (power-triangle, sling-angle, ladder-angle, wind-triangle) are
    unrelated concepts. Companion to the existing `bolt-circle` layout tile.
- **Module placement**: lands in `calc-fab.js` (group letter stays G, the
  spec-v28 module-vs-group precedent), moving it from ~62% to ~64% of its 16 KB
  gzip cap, so no cap bump. The `tools-data.js` registry grew one row within cap.
  The `arcsin` domain seam (H > L) and the 0..90 deg range are guarded per
  RC-1/RC-2.
- **Discipline**: full v14 set on the new tile. `npm run lint` (every gate;
  wiring lint 28 renderer modules / 561 tile-id entries; tile-contract sweep
  clean - 566 tiles, 0 Tier-1 / 0 Tier-2), `npm test` (5,498 unit tests, 0
  fail), the worked-examples runner (566 fixtures, 0 skipped), `npm run build`
  (561 tile + 24 group shells, 587-URL sitemap), `npm run data:verify` (123
  entries), and the full-catalog render-no-nan Chromium sweep (`sine-bar`
  verified: no NaN/Infinity/undefined paint, no console.error, no pageerror) all
  green.

## 2026-06-10 - spec-v31 through v36 single-tile benches + module split (internal)

- **Scope**: six specs landed on 2026-06-10, each a small, self-contained step
  in the v24 tradition. Five are **single first-principles tiles** (one per
  spec), taking the catalog **555 -> 560**; the sixth (v36) is a platform-only
  module split that **adds no tile and changes no output**. Package
  **0.31.0 -> 0.36.1**. No new group letters, so no §1.1 maintainer-signoff
  gate on any of them. Recorded as one consolidated entry (the v24+v25
  precedent) because the five tile specs share an identical discipline and
  landed the same day; the per-spec detail lives in specs/spec-v31.md through
  spec-v36.md and the README roadmap stanzas.
- **Deliberate scoping for correctness** (continuing the v29/v30 discipline):
  the gates verify finiteness, dimensions, and contract totality but **not
  absolute formula correctness**, so every tile in this series is scoped to
  math hand-verifiable to the last digit. Each worked example was re-checked by
  hand on 2026-06-10: 100 SFM / 0.5 in / 2-flute / 0.002 ipt -> 763.94 RPM and
  3.056 IPM; an 8 in bolt circle of 6 holes -> R 4 in, 60 deg, chord 4.000 in,
  hole 1 at (4.000, 0.000); 2.375 in to 1/16 -> 2-3/8 in with 0 error, 27.625
  in -> 2' 3-5/8"; a 0.5 in drill at 118 deg -> 0.1502 in point (~0.3 x dia),
  1.1502 in tip depth to a 1.0 in full-depth; 50:1 at 1 US gal -> 2.56 fl oz /
  75.71 mL, 40:1 -> 3.2 oz/gal. All five reproduce to the last digit.
- **New tiles** (one per spec):
  - `cutting-speed-rpm` (Group K, v31) - machining spindle speed
    RPM = 12 x SFM / (pi x diameter) and feed IPM = RPM x flutes x chip load
    per tooth (Machinery's Handbook speeds-and-feeds method, by name). SFM and
    chip load are user-supplied from the tool/material chart; no paywalled table
    is transcribed.
  - `bolt-circle` (Group G, v32) - circle-of-holes layout: hole i at angle
    start + i x 360/N on radius dia/2, so x = cx + R cos, y = cy + R sin, plus
    the adjacent center-to-center chord 2 R sin(180/N). First-principles
    trigonometry; companion to flange-bolt-torque.
  - `decimal-to-fraction` (Group G, v33) - tape-measure math: round a decimal
    inches value to the nearest 1/8..1/64 tick, reduce by GCD, break into
    feet-inches, and report the rounding error (rounded minus exact). Pure
    arithmetic, public domain.
  - `drill-point-depth` (Group K, v34) - twist-drill point length (tip
    allowance) = (diameter / 2) / tan(point angle / 2) and the tip depth to
    reach a desired full-diameter depth (the standard 118/135-degree drill-point
    relation, Machinery's Handbook). Geometry only.
  - `two-stroke-mix` (Group L, v35) - two-stroke fuel mix oil = fuel / ratio
    (ratio is gas:oil by volume), reported in fl oz and mL with the per-gallon
    and per-liter dose. Pure volume arithmetic (1 US gal = 128 fl oz, 1 fl oz =
    29.5735295625 mL).
- **Module placement and caps**: v31 lands in calc-mechanic.js (cap bumped
  18,500 -> 19,500 B); v32 in calc-cross.js (cap bumped 40,000 -> 41,000 B);
  v33 in calc-cross.js (cap held at 41,000 B, the module at 96.6%); v34 in
  calc-mechanic.js (cap held at 19,500 B; the shared tools-data.js registry cap
  bumped 44,000 -> 46,000 B); v35 in calc-agriculture.js (both calc-agriculture
  and tools-data caps bumped). All new seams (the cosecant / tangent / divide
  denominators) are guarded per RC-1/RC-2.
- **v36 module split** (platform-only, package 0.36.1): calc-cross.js had grown
  to 39.6 KB gzip (96.6% of its 41 KB cap), so the cohesive spec-v26+ Group G
  fabrication/layout block - pipe-fitting-takeout, pipe-miter-cut,
  pipe-template-wrap, flange-bolt-torque, center-of-gravity-2point, bolt-circle,
  decimal-to-fraction - was extracted into a new calc-fab.js module (with its
  renderers, the _V26_* helpers, and a FAB_RENDERERS map). The seven tiles keep
  their group letter, ids, citations, worked examples, and behavior byte-for-
  byte (the spec-v28 precedent: group letter is independent of module). After
  the split calc-cross.js is ~31 KB (cap lowered to 36 KB, headroom restored)
  and calc-fab.js is ~9.8 KB (16 KB cap). Every reference was repointed and
  gated: the app.js declare list, scripts/build.mjs FILES, sw.js SHELL_ASSETS,
  the module-size caps, the test fixtures (compute-map.js, bounds-fuzzer,
  calc-v26/v27 suites), and the v14 corpus + tile-index were regenerated; the
  wiring lint reports 28 renderer modules / 560 tile-id entries. calc-mechanic.js
  and calc-agriculture.js and the tools-data.js registry remain on the watch
  list for the same treatment.
- **Discipline (re-verified 2026-06-10 at HEAD = the v36 close)**: full v14 set
  on every new tile. `npm run lint` (every gate; tile-contract sweep clean -
  565 tiles, 0 Tier-1 / 0 Tier-2), `npm test` (5,497 unit tests, 0 fail), the
  worked-examples runner (565 fixtures, 0 skipped), `npm run build` (560 tile +
  24 group shells, 586-URL sitemap), `npm run data:verify` (123 entries), and
  the full-catalog Chromium render sweep (render-no-nan: no NaN/Infinity/
  undefined paints, no console.error, no pageerror across all 560 tiles) all
  green.

## 2026-06-09 - spec-v30 metal / air / refrigerant bench (internal)

- **Scope**: spec-v30 lands the spec-v28 §7.14 `v30 = §7.4-7.6` block (welder,
  sheet-metal, refrigeration). **3 new tiles**, all deepening existing groups.
  Catalog **552 -> 555**; package **0.30.0 -> 0.31.0**. No new group, so no
  §1.1 maintainer-signoff gate.
- **Deliberate scoping for correctness** (continuing the v29 discipline): the
  gates verify finiteness, dimensions, and contract totality but not absolute
  formula correctness, so this batch is scoped to math hand-verifiable to the
  last digit -- the groove-weld shear case (the unambiguous AISC Table J2.5
  0.60*FEXX line, the same resistance factors as the v27 fillet tile), a
  pressure-drop sum, and a gauge-to-absolute pressure ratio. The SMACNA-gauge
  and refrigerant-property line-sizing tables stay on the §7 roadmap for a
  reviewed change.
- **New tiles**:
  - `groove-weld-strength` (Group E) - CJP / PJP groove-weld shear capacity on
    the effective throat (AISC 360 Table J2.5 0.60*FEXX; ASD 0.30*FEXX, LRFD
    0.75*0.60*FEXX), with the CJP base-metal-development note and a utilization
    from an optional load (AWS D1.1 / AISC 360 §J2). Effective throat: CJP =
    thinner part thickness, PJP = the WPS effective throat. Complements the v27
    fillet-weld-strength tile.
  - `duct-static-pressure-total` (Group C) - total external static pressure
    summed from a component drop list (filter, registers, grilles, wet coil,
    duct-run friction) against the blower fan-table rating, with a pass/fail
    (ACCA Manual D / SMACNA). First-principles sum.
  - `compression-ratio-refrig` (Group C) - absolute compression ratio
    (discharge + atm) / (suction + atm) with a user-adjustable atmospheric
    pressure for altitude and a high-ratio flag above ~10:1 (ASHRAE). Guards a
    full-vacuum suction and a discharge below suction.
- **New-module wiring**: `calc-metalair.js` (6 KB cap) was added to the build
  runtime files (scripts/build.mjs), the service-worker precache (sw.js), and
  the module-size cap table (scripts/check-module-sizes.mjs), and declared in
  app.js. The `tile-meta.js` `_TILES` cap was bumped 7000 -> 8000 (it grows one
  row per tile; 555 tiles tipped it to 7023 B). calc-construction.js (93.9%)
  and calc-hvac.js (95.9%) -- the natural homes -- were at their caps, so a
  dedicated module was the clean placement.
- **Discipline**: full v14 set on every new tile; the new seams (weld throat /
  length, component drops, the absolute-pressure conversion) are guarded per
  RC-1/RC-2 (tile-contract sweep clean, 560 tiles, 0 leaks). `npm run lint`,
  `npm test` (5,482 unit tests), `npm run build`, `npm run data:verify` (123),
  the worked-examples runner (560 fixtures), the 320px shell audit (555 shells
  / 581 URLs), the full Playwright integration suite (1,227), and the axe-core
  a11y scan over the three new tiles (556) are all green.

## 2026-06-09 - spec-v29 pipe / raceway field-layout bench (internal)

- **Scope**: spec-v29 lands the first batch off the spec-v28 §7 long-term
  trades roadmap (§7.1 electrician, §7.3 pipefitter). **3 new tiles**, all
  deepening existing groups. Catalog **549 -> 552**; package
  **0.29.0 -> 0.30.0**. No new group, so no §1.1 maintainer-signoff gate.
- **Deliberate scoping for correctness**: the catalog's gates verify
  finiteness, dimensions, and contract totality but **not absolute formula
  correctness**. This batch is therefore scoped to first-principles thermal
  movement and field geometry whose every worked example is hand-verifiable to
  the last digit, rather than code-table-transcription tiles (arc-flash PPE
  category, NEC Table 250.66 GEC sizing) where a transcription slip would be
  dangerous and uncaught. Those table-method tiles stay on the §7 roadmap for
  a reviewed change.
- **New tiles**:
  - `pipe-cold-spring` (Group B) - free thermal growth dL = alpha*L*dT, the
    cold-spring gap (cut-short) at a user-set factor, and residual movement for
    a run sprung into place at install temperature (ASME B31.1 §119 / B31.9).
    The coefficients match the sibling `pipe-expansion-loop` data shard. The
    note carries the honest limitation: cold spring lowers the hot reactions
    but not the cyclic stress range (B31.1 §119.10).
  - `raceway-expansion-fitting` (Group A) - PVC conduit length change with the
    NEC Table 352.44 coefficient (3.38e-5 in/in/F, distinct from PVC pipe), the
    0.25 in straight-run threshold, and the fitting count (NEC 352.44). Worked
    example matches Table 352.44: 100 ft at 100 F -> 4.06 in/100 ft.
  - `pipe-spacing-rack` (Group G) - insulated OD, center-to-center spacing,
    bundle width for N parallel lines, and rack fit (ASTM C585 + first-
    principles geometry; MSS SP-58 hanger span cross-referenced).
- **New-module wiring**: `calc-pipefit.js` (5 KB cap) was added to the build
  runtime files (scripts/build.mjs), the service-worker precache (sw.js), and
  the module-size cap table (scripts/check-module-sizes.mjs), and declared in
  app.js. The three tiles share one module but carry independent group letters
  (B, A, G); calc-electrical.js (99.3%) and calc-plumbing.js (98.9%) were at
  their caps, so a dedicated module was the clean placement.
- **Discipline**: full v14 set on every new tile; the new seams (run length,
  temperature range, pipe OD) are guarded per RC-1/RC-2 (tile-contract sweep
  clean, 557 tiles, 0 leaks). `npm run lint`, `npm test` (5,478 unit tests),
  `npm run build`, `npm run data:verify` (123), the worked-examples runner (557
  fixtures), the 320px shell audit (552 shells / 578 URLs), the full Playwright
  integration suite (1,221), and the axe-core a11y scan over the three new
  tiles (553) are all green.

## 2026-06-09 - spec-v28 low-voltage / data / security cabling + Group-Z deferral (internal)

- **Scope**: spec-v28 opens the low-voltage / data / security cabling trade.
  **6 new tiles + the EN.1 enhancement**. Catalog **543 -> 549**; package
  **0.28.0 -> 0.29.0**.
- **Group-Z decision deferred to maintainer signoff (the spec's own gate)**:
  spec-v28 §1.1 makes opening a dedicated **Group Z** a deliberate
  architectural decision **gated on maintainer signoff**, with a documented
  fallback to land the six tiles in **Group A (Electrical)** as a low-voltage
  sub-cluster (skipping §1.1 steps 1-4). Acting autonomously, this change
  takes the **non-gated Group-A fallback**: the six tiles live in a new
  `calc-lowvoltage.js` module (own size budget, mirroring every other
  calc-*.js) but are registered under Group A and tagged `trades:
  ["electrical"]` (etc.). The tile bodies are group-agnostic, so a future
  maintainer-approved move to Group Z is a one-line change per tile (the
  group letter in tools-data.js and tile-meta.js). Group count stays at 24;
  the GROUPS / GROUP_NAMES arrays are untouched, pending signoff.
- **New tiles (all in Group A, low-voltage sub-cluster)**:
  - `fiber-loss-budget` - optical link loss budget (fiber + connectors +
    splices) vs the application max channel loss (TIA-568 / TIA-526 / IEEE
    802.3).
  - `cable-tray-fill` - NEC 392.22 sum-of-diameters (>= 4/0) or
    cross-sectional-area (smaller) fill, with the mixed-load case.
  - `cctv-storage` - NVR storage and aggregate bandwidth from bitrate,
    recording schedule, and retention (1 Mbps for 24 h = 10.8 GB/day).
  - `speaker-70v-line` - constant-voltage tap budget, reflected impedance
    Z = V^2/P, remaining taps, and run line-loss (NEC 640 / 725).
  - `standby-battery-sizing` - fire-alarm/security secondary battery
    amp-hours, standby + alarm times the aging/derate factor (NFPA 72 §10.6).
  - `coax-rg-loss` - coax attenuation, end-of-run level, or max run for a
    target level (Belden / CommScope loss curves).
- **EN.1 (additive, backward-compatible)**: `lv-dc-drop` gains an optional
  fire-alarm NAC end-of-line voltage check - the end-of-line voltage at the
  worst-case (battery-low) source and a pass/fail against the device's listed
  minimum (NFPA 72 / UL 1971 / 464). No device minimum entered -> the prior
  output is reproduced exactly.
- **New-module wiring**: `calc-lowvoltage.js` was added to the build runtime
  files (scripts/build.mjs), the service-worker precache (sw.js), and the
  module-size cap table (scripts/check-module-sizes.mjs, 11 KB cap for the
  ~8.9 KB module), and declared in app.js. No paywalled lookup is bundled;
  fiber/coax/camera/device figures are user-supplied with flagged public
  defaults.
- **Discipline**: full v14 set on every new tile; the divisor seams (fiber
  length, tray width, bitrate, V^2/P impedance, battery period, coax loss
  coefficient) are guarded per RC-1/RC-2, and the coax source-level echo was
  hardened to null on a non-finite input (tile-contract sweep clean, 554
  tiles, 0 leaks). `npm run lint`, `npm test` (5,474 unit tests), `npm run
  build`, `npm run data:verify` (123), the worked-examples runner (554
  fixtures), the 320px shell audit, and the axe-core a11y scan over the six
  new tiles + lv-dc-drop are all green.

## 2026-06-09 - spec-v27 welding / sheet-metal / rigging deepening + concept-overlap reconciliation (internal)

- **Scope**: spec-v27 (welding/metal bench, sheet-metal/refrigeration bench,
  rigger's bench). **3 net-new tiles + 3 additive enhancements**, not the 6
  new tiles the draft proposed. Catalog **540 -> 543**; package **0.27.0 ->
  0.28.0**.
- **Concept-overlap reconciliation (recorded, not papered over)**: the v27
  draft id-checked all six proposed ids against the live catalog but did not
  concept-check them. Three of the six duplicate an existing tile by concept
  and were **dropped-not-renamed** per the v20/v23/v24 discipline (the same
  honesty rule the v24 stanza applied to the fabricated Group K count):
  - C.1 `duct-sizing-friction` duplicates the existing **`duct-sizing`**,
    which already solves the round diameter for a target friction rate (full
    Colebrook), reports velocity, the equivalent rectangular, and the ACCA
    Manual D friction bands. Its only net-new delta - the trunk/branch
    velocity ceiling flag (<= 900 / <= 600 fpm) - landed as an additive
    enhancement to `duct-sizing`.
  - C.3 `superheat-subcooling` duplicates the existing **`superheat-subcool`**,
    which already computes superheat and subcool and (v23 EN.2) a fixed-orifice
    target-superheat charge verdict. Its net-new delta - a TXV/EEV
    target-subcooling charge verdict - landed as an additive enhancement to
    `superheat-subcool`.
  - G.1 `sling-load-tension` duplicates the existing **`sling-angle`** (Group
    F), which already returns per-leg tension by configuration and angle for
    more hitches than the draft. Its net-new deltas - the D/d bend-efficiency
    de-rate, the minimum rated-capacity output, and the sub-30-degree hazard
    flag - landed as an additive enhancement to `sling-angle`.
  Fabricating three near-duplicate tiles to hit the draft's "+6" would violate
  the no-concept-overlap rule. The landed v27 delta is **3 net-new tiles + 3
  enhancements** (540 -> 543).
- **New tiles by group**:
  - **E (Carpentry/Construction) +1**: `fillet-weld-strength` (effective
    throat 0.707*leg, ASD 0.30*F_Exx / LRFD 0.75*0.60*F_Exx shear capacity,
    utilization, and the AISC Table J2.4 / §J2.2b min/max fillet size; AWS
    D1.1 / AISC 360 §J2, by name).
  - **C (HVAC) +1**: `round-to-rect-duct` (ASHRAE equal-friction equivalent
    diameter D_e = 1.30*(a*b)^0.625/(a+b)^0.250, both directions, with a 4:1
    aspect-ratio flag; ASHRAE Fundamentals / SMACNA, by name).
  - **G (Cross-Trade, rigger's bench) +1**: `center-of-gravity-2point` (total
    weight, CG distance, and load split from a two-point weigh by moment
    balance; ASME B30.9 / ITI rigging, by name).
- **Enhancements (additive, backward-compatible defaults)**: `duct-sizing`
  gains the trunk/branch velocity ceiling flag (no input change; new output
  fields); `superheat-subcool` gains the optional TXV/EEV target-subcooling
  verdict (no target -> prior output unchanged); `sling-angle` gains the
  optional D/d bend efficiency, the minimum rated-capacity output, and the
  sub-30-degree hazard flag (no rated capacity / D/d -> prior output
  unchanged).
- **Discipline**: every new tile ships the v14 set; the new divisor seams
  (throat/length, equivalent-diameter (a+b), CG (S1+S2)) are guarded per
  RC-1/RC-2. The three enhanced functions keep their existing bounds-fuzzer
  and worked-example coverage and pass with the new fields added.
  `npm run lint`, `npm test` (5,466 unit tests), the worked-examples runner
  (548 fixtures), the 320px shell audit (543 tile shells), and the axe-core
  a11y scan over the new and enhanced tiles are all green.

## 2026-06-09 - spec-v26 electrician / plumber / pipefitter deepening (internal)

- **Scope**: spec-v26 closes the everyday gaps in the three founding trades.
  **9 new tiles** with full v14 discipline, no new group, no new dependencies.
  Catalog **531 -> 540**; package **0.26.0 -> 0.27.0**.
- **New tiles by group**:
  - **A (Electrical) +2**: `motor-feeder-multiple` (feeder conductor per NEC
    430.24 and feeder OCPD per NEC 430.62 for several motors on one feeder;
    the 430.62 device is a maximum taken to the next standard size down) and
    `transformer-conductor-protection` (primary/secondary FLA, the NEC Table
    450.3(B) overcurrent bands with Note 1, and the 240.21(C) secondary
    conductor minimum). Authorities: NEC 430.24 / 430.62 / 430.6(A) /
    450.3(B) / 240.21(C), by name; AHJ-adopted edition governs.
  - **B (Plumbing/Gas) +3**: `mixed-water-temp` (mixing/tempering-valve energy
    balance with the ASSE 1017 / 1016 / 1070 scald limits), `pressure-tank-
    drawdown` (Boyle's-law diaphragm-tank drawdown + anti-short-cycle runtime;
    Amtrol/WellMate/WQA practice), and `pipe-velocity` (continuity
    v = 0.4085*gpm/d^2 + the CDA/ASPE copper erosion-corrosion ceilings).
    First-principles; IPC/UPC and ASSE/ASPE cited by name.
  - **G (Cross-Trade, the pipefitter's bench) +4**: `pipe-fitting-takeout`
    (center-to-center / face-to-face cut length), `pipe-miter-cut`
    (lobster-back per-cut angle A/(2(n-1)) + OD*tan(theta) cutback),
    `pipe-template-wrap` (wraparound ordinates y = (OD/2)*tan(alpha)*(1-cos
    phi)), and `flange-bolt-torque` (short-form T = K*D*F + the ASME PCC-1
    cross sequence). Author-original first-principles trig; NCCER Pipefitting
    and ASME PCC-1 / B16.5 cited by name; take-out / K-factor / preload are
    user-supplied and flagged confirm-against-your-spec.
- **Discipline**: every new tile ships the v14 set (dims annotation,
  bounds-fuzzer row, worked-example fixture cross-checked against its cited
  source, complete inline `citations.js` entry, `tile-meta.js` row, app.js
  wiring, prerendered shell passing the 320px audit) and is born into the
  v18/v21 output contract and the v19/v22 citation discipline. The divisor
  seams (feeder-largest sum, FLA voltage, mix flow sum, tank absolute
  pressure, velocity diameter, miter angle, ordinate, bolt diameter) are
  guarded per RC-1/RC-2. `npm run lint`, `npm test`, the worked-examples
  runner (545 fixtures), and the 320px shell audit (540 tile shells) are all
  green.

## 2026-06-09 - spec-v24 + spec-v25 trade-floor deepening and surveying (internal)

- **Scope**: spec-v24 (conduit-bending suite, welding/metal/layout, rolling
  offset, audio electronics) and spec-v25 (land-surveying and civil layout)
  landed together. **16 new tiles** with full v14 discipline plus **3
  additive enhancements**. Catalog **515 -> 531**; package **0.24.2 ->
  0.26.0**.
- **New tiles by group**:
  - **A (Electrical) +3**: `conduit-offset`, `conduit-saddle`,
    `conduit-90-stub` — the daily field bending math (cosecant offset
    multiplier, three-/four-point saddle marks, 90-deg stub deduct and
    segmented bends). First-principles trig; bender deduct/shoe figures are
    user-supplied and flagged confirm-against-your-tool.
  - **E (Carpentry/Construction) +7**: `weld-heat-input` (AWS D1.1 / ASME
    BPVC IX), `metal-weight` (volume x density, nominal alloy table),
    `layout-squaring` (3-4-5), plus the spec-v25 civil set `horizontal-curve`
    and `vertical-curve` (AASHTO Green Book / FM 5-233), `earthwork-end-area`
    (FHWA / FM 5-233), `slope-stake-cut-fill` (FM 5-233).
  - **G (Cross-Trade) +1**: `rolling-offset` (Pythagorean true offset +
    cosecant travel; NCCER pipefitting).
  - **N (Stage/Live) +3**: `speaker-impedance`, `decibel-converter`,
    `amp-power-spl` (Ohm's-law networks + ANSI S1.1 decibel basis).
  - **P (Field/SAR) +2**: `area-by-coordinates` (shoelace) and
    `traverse-closure` (latitude/departure misclosure + Compass/Bowditch
    adjustment); FM 5-233, public-domain.
- **Enhancements (additive, backward-compatible defaults)**: `tire-gearing`
  gains the speedometer/odometer-error output (EN.1); `spl-distance` gains
  incoherent N-source summation, +3 dB per doubling, N=1 reproduces the
  prior output exactly (EN.2); `bend-allowance` exposes the bend deduction
  BD = 2*OSSB - BA beside the existing flat-pattern length (EN.3).
- **Count reconciliation (recorded, not papered over)**: the spec-v24
  summary line stated a 12-tile delta with an "A +3, E +3, G +1, K +2,
  N +3" distribution, but the spec body (sections 3-6) specifies only the
  10 tiles above — there is **no Group K new-tile section anywhere in the
  body**, only the EN.1 `tire-gearing` enhancement. Fabricating two uncited
  Group K tiles to hit the number would violate the correctness discipline
  (every tile must carry a real named authority, a cross-checked worked
  example, and a guarded contract). The landed v24 delta is therefore **10
  new tiles + 3 enhancements** (515 -> 525); v25 adds **6** (525 -> 531).
  The spec headers are amended to the as-landed counts.
- **Discipline**: every new tile ships the v14 set (dims annotation,
  bounds-fuzzer row, worked-example fixture cross-checked against its cited
  source, complete inline `citations.js` entry, `tile-meta.js` row, app.js
  wiring, prerendered shell passing the 320px audit) and is born into the
  v18/v21 output contract (the tile-contract sweep reports 0 Tier-1 / 0
  Tier-2 across 536 swept tiles) and the v19/v22 citation discipline. The
  divisor seams (angle->0 cosecant, zero travel speed, zero radius/length,
  zero perimeter/misclosure) are guarded per RC-1/RC-2. `npm run lint`,
  `npm test` (5,449 unit tests), the worked-examples runner (536 fixtures),
  and the 320px shell audit (557 shells) are all green.

## 2026-06-08 - spec-v17 Allied-Profession Deepening CLOSED (internal)

- **Scope**: the bookkeeping close of spec-v17 (Part III of III). Every
  genuinely-new v17 tile and tile-output had already landed under earlier
  patch stamps (Groups L / Y / U / V / W / X / R / S, catalog **417 → 437**
  with full v14 discipline); this entry resolves the spec's stale
  "OPEN, stamps 0.17.0" banner. No new tiles, no correct output changed.
  The close rides **0.24.2** (v18–v23 stamped past 0.17.0 out of spec
  order; re-stamping would be a semver regression).
- **§Z.5 state-keyed shards (audited)**: two of the five drafted shards
  already exist and are wired (R.4 SE wage base →
  `data/accounting/se-tax-parameters.json`; sales/use-rate reference →
  `data/crosswalks/state-tax-rates.json`), and the L.1 ET reference is the
  `irrigation-requirement` tile's user-supplied ET0 + inline FAO 56 Kc
  values. The two genuinely-new 50-state **legal** datasets (S.1
  garnishment maxima, S.3 prejudgment-interest rates) carry per-row
  real-world consequence and a per-state freshness cadence, so per the v16
  deferred-external-dataset precedent (C.2 / B.7) they land as their own
  reviewed change. Neither tile is blocked: `wage-garnishment` computes the
  federal CCPA Title III cap with an optional stricter state-cap percent,
  and `judgment-interest` accepts the statutory rate as an input.
- **§Z.6 reviewer signoffs (sought, not obtained)**: the v17 expansion
  solicits a reviewer-of-record per group and the signoffs gate only the
  "audited" label, not the close. Roster sought: a US-licensed DVM (U), a
  paramedic/EMT-P with QA experience (V), an ATP-rated pilot or CFI-I (W),
  a real-estate broker with CCIM-equivalent (X), a public-school or
  community-college quantitative-courseware educator (Y), a US-licensed CPA
  (R), a civil-practice attorney (S), a published bench scientist (T), and
  a USDA NRCS TSP or Cooperative Extension agronomist (L). These remain
  open and tracked under "Reviewers we want" below.
- **Verification**: no code change, so `npm test` (5,428), `npm run lint`
  (all gates), `npm run build`, `npm run data:verify`, and
  `npm run check:shell-mobile` (541/541) stay green.

## 2026-06-08 - spec-v18 §5.4 render layer + spec-v19 coverage gate CLOSED (internal)

- **Scope**: closes the two remaining drafted spec surfaces — spec-v18 §5.4
  (the render-assertion layer) and spec-v19 (Citation Integrity Sweep,
  whose substance landed via spec-v22 on 2026-06-05). No new tiles, no
  correct output changed. Package **0.24.2**.
- **v18 §5.4 (render leak)**: `test/integration/render-no-nan.test.js`
  asserts, at the real-Chromium layer, that no renderer paints `NaN`,
  `Infinity`, `$NaN`, or `undefined` into the user-visible output — for
  every one of the **515** tiles, in both the finite-result ("Test with
  example") and empty-first-render states. Result: **515 / 515 pass, 0
  leaks**. Runs in the existing `test:e2e` job (no workflow edit). v18 is
  now fully CLOSED.
- **v19 §2.1/§2.2/§4.1 (coverage gate graduation)**:
  `check-citation-coverage.mjs` graduated warn → **fail-on-missing** — a
  tile without a citation entry, an orphan entry, a missing required field
  (`formula`/`edition`/`freeAccess`/`governance`), or a raw `http(s)://`
  scheme in a field now hard-fails the lint. Coverage is **515 / 515** with
  all four required fields present (gate graduated at its floor). Pinned by
  `test/unit/v19-citation-coverage.test.js` (3 tests). The §3.3 ledger,
  §4.1/§4.4 link/constant hygiene, §4.2 320px wrapping, and §4.3 prose
  gates all landed earlier via spec-v22; v19 is now fully CLOSED.
- **Verification**: `npm test` unit suite green, `npm run lint`
  (all gates green incl. the graduated coverage gate), `npm run build`,
  `npm run data:verify`, the full Playwright `test:e2e` suite, and
  `npm run check:shell-mobile` all green.

## 2026-06-06 - spec-v18 §7 tile-contract Tier-2 campaign CLOSED (internal)

- **Scope**: the standing spec-v18 §7 per-module hardening campaign.
  Drives the Tier-2 contract backlog (a perturbed numeric input that leaks
  a non-finite *output* field) from **837 to 0** across all 18 calculator
  modules. No new tiles, no correct output changed. Package **0.24.1**.
- **Method**: the `check-tile-contract` sweep drives every numeric input
  slot of every registered compute function to `0 / -1 / NaN / Infinity`
  and flags any non-finite output field. 821 of 837 entries were
  `NaN`/`Infinity` inputs, fixed with a generic non-exported per-module
  `_finiteGuard(arguments[0])` returning `{ error }`; 16 were zeroed
  denominators, fixed per the v21 RC-1 (required input -> `{ error }`) /
  RC-2 (infinite field -> `null`, finite fields preserved) seams.
- **Verification**: `test/fixtures/contract-baseline.json` rewritten to
  **0** (gate now hard-fails on any new leak); a named regression test
  (`test/unit/v18-section7-hardening.test.js`) pins one case per fix class;
  npm test **5,425** unit tests green; npm run lint all gates green;
  npm run check:shell-mobile 541/541 clean.
- **Disposition**: §7 closed; the §5.4 jsdom render-assertion layer is the
  only drafted v18 surface still open.

## 2026-06-06 - spec-v20 catalog expansion (55 new tiles, internal)

- **Scope**: spec-v20 Catalog Expansion VI. 55 new tiles across 19
  groups, landed after the v21 hardening register and v22 citation
  register (out of spec order). Catalog **460 -> 515**; package **0.24.0**.
- **Per-group additions**: A +3, B +3, C +3, D +2, E +3, F +2, J +3,
  K +3, L +3, M +3, N +1, O +1, P +1, R +3, S +2, T +2, U +4, V +4,
  W +3, X +3, Y +3. The four Group U and four Group V tiles carry the
  spec-v12 section 13 limitation banner.
- **Method**: every tile born into the v21 tile contract (no non-finite
  numeric field under input perturbation; 837-entry leak baseline held)
  and the v22 citation discipline (inline, current, named US authority).
  npm test 5,421 unit tests green; npm run lint all gates green;
  worked-example fixtures cross-checked against the cited source.
- **Finding (self-audit)**: spec section 21 X.2 (`pmi-cancellation-date`)
  listed example PMI months "~70/~82"; correct standard amortization of
  $250k at 6.5% over 360 months reaches 80% LTV at month 146 and 78% at
  month 156. Implemented the correct amortization; the spec status block
  records the correction.
- **Disposition**: the per-group tile counts in the table below were
  refreshed to current values (they had drifted since v15).

## How to append a row

When an external review completes:

1. Add a new section header under the appropriate year.
2. Record:
   - **Date**: ISO 8601 (YYYY-MM-DD).
   - **Reviewer**: name, role, organization.
   - **Scope**: which subsystems were reviewed (citations,
     accessibility, security / threat model, data-pipeline,
     specific groups of tiles).
   - **Method**: what the reviewer actually did (live testing,
     code read, axe-core run, threat-model walkthrough).
   - **Findings**: numbered list. Use plain language. Cite the
     specific tile, file, or line where applicable.
   - **Disposition**: per-finding, what was done. "Fixed in
     commit ABC", "Documented as known limitation in X", "No
     change; finding is informational."
3. Do not delete or revise prior entries. If a finding turns out
   to be incorrect, note that in a follow-up entry rather than
   editing the original.

## Cadence

- **Annual minimum** per spec-v10 §14: commission at least one
  outside review per year and append the result.
- **Per major or minor release**: a self-audit is implicit in
  the per-release ritual ([maintainer-quickstart.md](maintainer-quickstart.md));
  it is not recorded here. This document is for outside
  reviewers only.
- **Ad hoc**: any review commissioned in response to a specific
  incident (citation challenge, accessibility complaint,
  security report) is recorded here regardless of cadence.

## What an outside review covers

Suggested review tracks. A single reviewer may cover one track or
several depending on scope.

- **Citation track**: spot-check N tiles' source-stamp strings
  against the cited edition/section. Verify free-access URLs
  resolve. Verify that the prior-edition row in
  [citation-discipline.md](citation-discipline.md) matches the
  AHJ-most-common edition for at least one US state.
- **Accessibility track**: axe-core in every theme (default /
  light / dark / high-contrast; Big Buttons retired in spec-v11).
  Keyboard-only navigation through every tile. Screen-reader
  walkthrough on a representative subset.
- **Security track**: threat-model walkthrough against
  [threat-model.md](threat-model.md). Verify CSP headers in
  `_headers`. Verify the absence of outbound network calls in
  the runtime bundle.
- **Data-pipeline track**: `npm run data:verify` on a clean
  clone. Spot-check N shards against their canonical sources.
  Verify the per-state coverage matrix matches the manifest.
- **Math-derivation track**: spot-check derivations in
  [derivations.md](derivations.md) against published worked
  examples. Verify worked-example fixtures in
  [../test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json)
  (the spec-v10 Phase C.1 registry; coverage enforced by
  `scripts/check-worked-examples.mjs` in `npm run lint`) match
  the publisher's example to the declared tolerance.

## Reviewers we want

The site is a public utility. Reviewers from any of the
following categories are welcome:

- Working tradespeople in any of the represented trades.
- Code officials and AHJ representatives.
- Accessibility specialists with WCAG 2.2 AA experience.
- Security researchers with a focus on web app threat models.
- Engineering educators using public worked examples.
- Independent open-source community reviewers.
- **Working DVMs and RVT / LVTs** (Group U, spec-v12 §5) for the
  veterinary math-aid review track. Plumb's / AAHA / AAFP
  familiarity preferred.
- **Practicing paramedics and EMS medical directors** (Group V,
  spec-v12 §6) for the field-protocol math-aid review track.
  PALS / ATLS / NRP familiarity preferred.
- **Current general-aviation pilots and CFIs** (Group W,
  spec-v12 §7) for the preflight / weather / performance review
  track. POH-to-AC 00-45 familiarity preferred.
- **Licensed real-estate brokers, appraisers, and lenders**
  (Group X, spec-v12 §8) for the financing-math review track.
  Familiarity with FHFA / HUD / VA underwriting preferred.
- **Practicing classroom teachers and curriculum specialists**
  (Group Y, spec-v12 §9) for the readability / grading-math
  review track. Familiarity with state Lexile-band bulletins
  preferred.

A reviewer's name appears in this document only with their
explicit consent. Anonymous-by-request reviews are recorded with
a generic identifier (e.g., "Reviewer A, WCAG specialist").

---

## 2026

_No external reviews on file yet. This document was introduced by
spec-v10 §I.3 in the v0.10 release cycle. Solicit the first
review during the v0.11 release window._

### 2026-06-06 — spec-v23 CLOSED: 20 enhancements landed; package 0.23.0 (maintainer)

- **Reviewer**: Maintainer (additive build-out against the inherited v21
  contract and v22 citation discipline).
- **Scope**: spec-v23 Part I — the 20 enhancements to existing tiles. Each
  is additive (adds an input, output, mode, or second method), changes no
  existing correct output without the user opting in, and adds a guard for
  any new zeroable denominator its inverse introduces (v21 RC-1). With this
  batch **Part I (20) and Part II (23 new tiles) are both complete and v23
  CLOSES**; the package stamps **0.23.0** per §24(f).
- **Enhancements landed** (per group): A/C +3 EN.1 `seer-eer`
  (SEER2/EER2 + annual-kWh/$ cross-check), EN.2 `superheat-subcool`
  (fixed-orifice target-superheat charge verdict), EN.3 `balance-point`
  (supplemental strip-kW sizing); B +3 EN.4 `tankless-gpm`
  (solve-for {GPM, kBTU, ΔT} + worst-case inlet), EN.5
  `water-heater-recovery` (peak-demand sizing flag), EN.6 `glycol-mix`
  (burst-vs-freeze toggle + heat-transfer penalty); E +4 EN.7 `snow-load`
  (sloped-roof Cs + drift surcharge), EN.8 `wind-pressure` (Kz/Kzt/Kd/G
  exposed), EN.9 `anchor-embedment` (cracked toggle + edge-distance flag),
  EN.10 `footing-area` (eccentric bearing-pressure check); F +2 EN.11
  `required-fire-flow` (Iowa V/100 second method with divergence), EN.12
  `master-stream` / `hydrant-flow` (nozzle-reaction force); K/M +2 EN.13
  `fuel-range` (solve-for-MPG / -tank inverse), EN.14 `brake-pad-life`
  (wear-rate input + per-axle split); M +3 EN.15 `disinfection-ct`
  (required-t10 inverse + log selector), EN.16 `detention-time` (SOR + WOR
  loadings), EN.17 `well-drawdown` (Cooper-Jacob T + recovery); L +2 EN.18
  `npk-blend` (lb/acre, bag-count, kg/ha), EN.19 `sprayer-calibration`
  (tank-batches + refill points); X +1 EN.20 `cap-rate-dscr` (loan-derived
  debt service + break-even occupancy).
- **Gate results**: `npm run lint` green; `npm run test:unit` **5,078 pass /
  0 fail** (+20 enhancement tests in
  [../test/unit/calc-v23-enhancements.test.js](../test/unit/calc-v23-enhancements.test.js));
  the tile-contract sweep **improved** — the new RC-1 guards cleared 3
  prior Tier-2 leaks (**baseline 840 → 837**, ratchet tightened); corpus,
  dimensions, citation, and bounds gates all green.
- **Status**: spec-v23 **CLOSED**; catalog **460**; package **0.23.0**.

### 2026-06-06 — spec-v23 enhancement & expansion VII: second new-tile batch (maintainer)

- **Reviewer**: Maintainer (build-out against the v21 contract and v22
  citation discipline, which v23 inherits).
- **Scope**: spec-v23 Part II new tiles. This batch lands the **remaining 15
  of the 23** new tiles, completing Part II (8 + 15 = 23). Catalog
  **445 -> 460**. Each is born into the v21 tile contract (no non-finite
  numeric field; every inverse/echoed input is range-guarded so the fuzzer
  `Infinity`/`NaN` probes return `{ error }`) and the v22 citation
  discipline (inline, current, linkified, single-edition note, named US
  authority).
- **New tiles landed** (per group): B +2 `trap-seal-loss` (IPC/UPC §1002
  trap-to-vent), `water-meter-sizing` (AWWA M22); D +1 `drying-chamber-co2`
  (ASHRAE 62.1 mass balance); E +2 `wall-bracing-length` (IRC R602.10),
  `deck-ledger-fasteners` (IRC R507.9); J +2 `cargo-securement-wll`
  (FMCSA 49 CFR 393), `fuel-tax-ifta` (IFTA Articles of Agreement);
  K +1 `screw-conveyor` (CEMA Book No. 350); L +1 `pesticide-rei-phi`
  (EPA WPS 40 CFR 170 + label); M +1 `backflow-test-psi` (USC FCCCHR /
  AWWA C511); T +1 `gel-percent-agarose` (Sambrook & Russell); V +1
  `pediatric-tube-depth` (AHA PALS, carries the licensed-provider banner);
  W +1 `weight-shift-fuel-burn` (FAA-H-8083-1, extends `weight-shift-cg`
  into the time domain); X +2 `depreciation-recapture` (IRS Pub 544 /
  IRC §1245 / §1250), `rent-roll-vacancy` (Appraisal Institute EGI).
- **Discipline per tile**: TOOLS row, renderer (the additive
  `_v23SimpleRenderer` factory, non-exported so it stays out of the
  dimensional-analysis corpus) + RENDERERS registration, `citations.js`
  entry, `tile-meta.js` id/group row (V.1 also joins the SIMPLIFIED set
  with canonical limitation-banner copy), `related-tiles.mjs` edge set,
  ≥ 3 `aliases.json` rows, `compute-map.js` wiring, a worked-example
  fixture cross-checked against the cited source, a bounds-fuzzer row, a
  `docs/derivations.md` corpus row, a prerendered shell, and dedicated unit
  tests ([../test/unit/calc-v23.test.js](../test/unit/calc-v23.test.js)).
- **Gate results**: `npm run lint` green; `npm run test:unit` 5,058 pass /
  0 fail; tile-contract sweep **465 tiles, 0 Tier-1 crashers, 840 Tier-2
  baseline unchanged**; worked-example runner 465/465; bounds-fuzzer
  764/764 corpus functions covered.
- **Status**: spec-v23 Part II (the 23 new tiles) is **complete**; spec-v23
  stays **OPEN** (the 20 Part I enhancements remain); package stays
  **0.22.0** until v23 closes per its §24(f).

### 2026-06-06 — spec-v23 enhancement & expansion VII: first new-tile batch (maintainer)

- **Reviewer**: Maintainer (build-out against the v21 contract and v22
  citation discipline, which v23 inherits).
- **Scope**: spec-v23 Part II new tiles. This batch lands **8 of the 23**
  new tiles, each born into the v21 tile contract (no non-finite numeric
  field; the fuzzer's `Infinity` probe drove a finite-guard fix on the
  lumen-method denominator) and the v22 citation discipline (inline,
  current, linkified, single-edition note, named US authority).
- **New tiles landed** (per group): A +1 `lux-to-footcandle` (IES lumen
  method + exact 10.764 lux/fc identity); C +2 `duct-velocity-pressure`
  (ACCA Manual D / ASHRAE `V = 4005*sqrt(VP)`), `refrigerant-velocity`
  (ASHRAE Refrigeration Handbook line velocity + oil-return verdict);
  F +2 `fire-stream-reaction` (IFSTA smooth/fog nozzle reaction),
  `sprinkler-k-factor` (NFPA 13 `Q = K*sqrt(P)` three-way solver);
  K +1 `valve-flow-coefficient` (ISA-75.01 / Crane TP-410 `Q = Cv*sqrt(dP/SG)`);
  T +1 `od600-cell-count` (spectrophotometry, user-supplied factor);
  Y +1 `curve-grade-scaler` (flat / square-root / linear-rescale, clamped).
- **Discipline per tile**: TOOLS row, renderer + RENDERERS registration,
  `citations.js` entry, `tile-meta.js` id/group row, `related-tiles.mjs`
  edge set, ≥ 3 `aliases.json` rows, `compute-map.js` wiring, a
  worked-example fixture cross-checked against the cited source, a
  bounds-fuzzer row, a `docs/derivations.md` corpus row, a prerendered
  shell (320px-audited), and dedicated unit tests
  ([../test/unit/calc-v23.test.js](../test/unit/calc-v23.test.js), 21 tests).
- **Gate results**: `npm run lint` green; `npm run test:unit` 5,027 pass /
  0 fail; `npm run data:verify` ok; tile-contract sweep **450 tiles, 0
  Tier-1 crashers, 840 Tier-2 baseline unchanged**; the 320px prerendered-
  shell audit passes on all 8 new shells and their SPA views.
- **Status**: spec-v23 stays **OPEN** (15 new tiles + 20 enhancements
  remain); package stays **0.22.0** until v23 closes per its §24(f).

### 2026-06-05 — spec-v22 citation integrity II: concrete findings register (maintainer self-audit)

- **Reviewer**: Maintainer (manual read of all 437 reference blocks, the
  `scripts/sources-cycle.json` cycle table, and the linkifier).
- **Scope**: The four ways the citation promise quietly breaks — a foreign
  edition note, a dead or un-clickable link, a 320px overflow, and prose that
  drifts from the house numeric convention — across `citations.js` and the
  freshness machinery.
- **Method**: red-then-green regression per fix in
  [../test/unit/v22-citation-integrity.test.js](../test/unit/v22-citation-integrity.test.js)
  (8 tests); five citation gates extended and re-run.
- **Findings** (per category, per spec-v22 §7):
  1. **CF-01 (8 → 12 cross-contaminated edition notes, S1).** Eight
     non-electrical tiles (`noise-dose`, `svi-sludge-index`,
     `sprayer-calibration`, `thi-livestock`, `lightning-countdown`,
     `excavation-bench-plan`, `nfpa-1142-water-supply`, `scba-cylinder-time`)
     displayed `NEC_DISCLOSURE` as their edition note. The new edition-note
     relevance gate caught **four more** electrical-group tiles wearing the NEC
     ampacity note for a quantity they do not compute (`off-grid-battery`,
     `power-triangle`, `arc-flash-screen`, `short-circuit-pp` — IEEE / NFPA 70E
     / Bussmann sources), exactly the "catch the whole class" behavior §1
     promised.
  2. **CF-02 (4 stale cycle rows) / CF-03 (freshness blind spot, S1).** NEC,
     ASHRAE 62.1/62.2/90.1, and the AASHTO Green Book had passed their
     `next_expected` dates unflagged.
  3. **CF-05 / CF-06 (2 dead/non-durable links, S2).** `movable-type.co.uk`
     (un-linkifiable foreign ccTLD) and `convertit.com` (non-durable AMS-55
     host).
  4. **CF-08 (7+ overflowing URLs, S1 on a phone).** Long single-token URLs.
  5. **CF-09 (13 spelled-out prose instances, S3).** `<number> percent` and
     `rate per mile in dollars`.
  6. **CF-07 / CF-10: re-confirmed CLEAN** (no raw URL schemes, no smart-quote
     or marketing-adjective artifacts).
- **Disposition**:
  1. All 12 CF-01 tiles given domain-appropriate single-edition / disclosure
     notes (OSHA, WEF, EPA-label, USDA, NOAA, NFPA-1142, IEEE, NFPA 70E). The
     relevance gate (`check-citation-coverage.mjs`) fails on recurrence.
  2. NEC cycle row advanced to the published 2026 edition (disclosed-lag;
     `NEC_DISCLOSURE` names 2026, bundled values still 2023). ASHRAE and AASHTO
     rows re-stamped `last_verified: 2026-06-05` ("verified, monitoring"). The
     freshness gate now fails on a passed date with no re-stamp (CF-03) and on
     any tracked source missing a ledger row (CF-02). The §5 ledger
     [citation-freshness-ledger.md](citation-freshness-ledger.md) lists all 13
     tracked sources; CF-04 (ICC 2021-vs-2024) recorded as disclosed-lag.
  3. CF-05/CF-06 links reworded to `nist.gov` / `dlmf.nist.gov`; a link-hygiene
     check (foreign-ccTLD + defunct-host denylist) guards recurrence.
  4. CF-08 worst URLs shortened to bare host + prose; the
     `.citation-link { overflow-wrap: anywhere }` 320px guard confirmed and
     covered by the full-catalog `check-shell-mobile` audit (463/463 clean).
  5. CF-09 prose reworded to `%` / `(USD)`; a guarding regex lives in the
     citation coverage gate (the v22 §6 ngram gate is fingerprint-based and
     skips in the public repo, so the live check runs where citations.js is
     already loaded). Package stamps **0.22.0**.

### 2026-06-05 — spec-v21 public-surface hardening II: concrete defect register (maintainer self-audit)

- **Reviewer**: Maintainer (structured adversarial stress-read of all 23
  solver modules + manual fix review).
- **Scope**: Every public solver, read the way an adversary would: a zero
  into every denominator, a negative into every square root, a 31st into
  every payment date, a non-numeric into every field the renderer coerces
  with `Number(x) || 0`. Per spec-v21 §4 the verdict was: the catalog is
  **mostly sound** — six modules came back fully clean (`calc-electrical`,
  `calc-hvac`, `calc-mechanic`, `calc-kitchen`, `calc-references`,
  `calc-agriculture`), the dosing unit-toggles are arithmetically correct,
  and `computeDeadline` (the hardest calendar logic) is correct — and the
  defects that exist cluster on two seams: **RC-1** (a renderer-coerced
  `0`/negative pushed into a solver with no domain guard) and **RC-2** (a
  solver that emits `±Infinity`/`NaN` and relies on a renderer guard to hide
  it).
- **Method**: red-then-green regression per fix in
  [../test/unit/v21-defect-register.test.js](../test/unit/v21-defect-register.test.js)
  (29 tests, each naming its v18 D-class and contract clause); the
  `check-tile-contract` sweep confirms no new leak.
- **Findings** (per-module counts per spec-v21 §4): 9 S1 (a bad number could
  reach the user), 6 S2 (non-finite emitted but renderer-suppressed), 7 S3
  (weak validation, finite result), 4 latent/edge, 1 calendar (RC-3), 1
  accuracy flag. Distribution: `pure-math` DR-01/02; `calc-construction`
  DR-03/04; `calc-fire` DR-05/06/07/08; `calc-plumbing` DR-09;
  `calc-accounting` DR-10/11; `calc-realestate` DR-12; `calc-legal` DR-13;
  `calc-ems` DR-14; `calc-vet` DR-15; `calc-lab` DR-16; `calc-water`
  DR-17/18; `calc-aviation` DR-19; `calc-edu` DR-20/21/22; `calc-cross`
  DR-23/24; `calc-historical` DR-25; `calc-trucking` DR-26; `calc-field`
  DR-27; `calc-restoration` DR-28; `calc-stage` AF-01.
- **Disposition**:
  1. All 28 `DR-NN` fixed; each is a domain/finiteness guard returning
     `{error}` (RC-1) or a `null`-plus-flag representation of the degenerate
     case (RC-2), never `±Infinity`/`NaN` in a numeric field. No correct
     output changed — all 442 worked-example fixtures still pass.
  2. **DR-13** (judgment-interest Actual/365 across a leap year) resolved by
     declaring the **Actual/365-Fixed** basis explicitly in the
     `day_count_basis` output and the inline notice, per spec-v21 §6(b); the
     math (already 365-fixed) is unchanged, the convention is now disclosed.
  3. **AF-01** (`_v9_atmosphericAbsorption` humidity term) confirmed against
     ANSI S1.26: the prior `h = h_r·(p_sat/p_a)·(p_r/p_a)·100` carried an
     extra `(p_r/p_a)` factor versus the canonical `h = h_r·(p_sat/p_a)·100`.
     Removed; the factor is unity at sea level (`p_a = p_r`) so every
     existing fixture is unchanged, and the correction only affects
     non-sea-level ambient pressure.
  4. The Tier-2 contract backlog dropped **889 → 840** as the RC-1/RC-2
     fixes closed leaks; `contract-baseline.json` was rewritten to lock the
     gain. The global graduation to fail-on-any-non-finite over the
     remaining 840 entries continues as the standing spec-v18 §7 per-module
     campaign (the gate already fails on any *new* leak). Package stamps
     **0.21.0**.

### 2026-06-05 — spec-v18 hardening pass 1: tile-contract sweep (maintainer self-audit)

- **Reviewer**: Maintainer (automated `check-tile-contract` sweep + manual fix review).
- **Scope**: The spec-v18 §2 output contract over all 442 registered
  compute functions (the `worked-examples.json` fixtures), driving each
  finite-numeric input slot to `0 / -1 / NaN / Infinity` and asserting the
  result is all-finite-or-`{error}`, pure, and non-mutating, with hangs and
  OOMs caught by running the sweep under a worker heap cap + timeout.
- **Method**: `node scripts/check-tile-contract.mjs` (worker-isolated),
  red-then-green regression test per fix in
  [../test/unit/tile-contract.test.js](../test/unit/tile-contract.test.js).
- **Findings**: 7 Tier-1 crashers (a perturbed input that hung, exhausted
  memory, or threw rather than returning `{error}`) and a Tier-2 backlog of
  889 perturbed-input non-finite *output* leaks across the catalog.
  1. `upgrade-roi` (`computeUpgradeROI`): `years = Infinity` looped the NPV
     accumulation forever. calc-cross.js.
  2. `loan-amortization` (`computeAmortization`): `term_months = Infinity`
     built an unbounded schedule array (OOM). calc-accounting.js.
  3. `macrs` (`computeMacrs`): `year_of_interest = NaN` indexed the schedule
     with `NaN`, throwing on `.year` of `undefined`. calc-accounting.js.
  4. `serial-dilution` (`computeSerialDilution`): `number_of_steps = Infinity`
     built an unbounded tube array (OOM). calc-lab.js.
  5. `hip-valley-rafter` (`computeHipValleyRafter`): `run_ft = Infinity` (or a
     non-positive jack spacing) looped the jack-rafter generator forever.
     calc-construction.js.
  6. `court-deadline` (`computeDeadline`): `days = Infinity` threw "Invalid
     time value" on the calendar path and looped on the court-day path.
     calc-legal.js.
  7. `solar-times` (`computeSolarTimes`): `tz_offset_hours = Infinity` spun
     the 1440-minute wrap loop forever. calc-field.js.
- **Disposition**:
  1. All 7 Tier-1 crashers fixed (finite-input guards / sane magnitude
     caps); Tier-1 backlog is now **0** and gated by `check-tile-contract`
     plus the `tile-contract.test.js` regression suite.
  2. The 889-entry Tier-2 backlog is grandfathered in
     [../test/fixtures/contract-baseline.json](../test/fixtures/contract-baseline.json);
     the gate fails on any *new* leak and the baseline is tightened
     module-by-module per spec-v18 §7.
  3. Separately, `check-shell-mobile` (promoted to a standing gate) caught
     the client-rendered changelog overflowing 320 px on long file-path /
     URL tokens; fixed with `overflow-wrap` on `#changelog-content`.

### Open solicitations for v0.11 / v0.12 (spec-v12 §15 gate 10)

Per spec-v12 §15 gate 10 the following external reviews are
solicited for the v0.11 / v0.12 release window. Both belong to
the spec-v12 §13.1 clinical-utility override scope, and the
override renewal clause in [profession-overrides.md](profession-overrides.md)
gates on these reviews landing.

- **Group U (Veterinary).** Sought reviewer: a working DVM or RVT
  with current Plumb's / AAHA / AAFP familiarity. Scope: the
  eighteen U.* tiles in [../calc-vet.js](../calc-vet.js), the
  professional-governs limitation banners, and the worked-example
  fixtures (RER, fluid maintenance, toxicity thresholds in
  particular).
- **Group V (EMS / Pre-hospital).** Sought reviewer: a current
  paramedic or EMS medical director with PALS / ATLS protocol
  familiarity. Scope: the twenty V.* tiles in
  [../calc-ems.js](../calc-ems.js), the receiving-facility
  governance verbiage, and the worked-example fixtures (Parkland,
  GCS, NIHSS, START / JumpSTART in particular).

Append the review under a new dated heading per the template
below when the signoff arrives.

### Open solicitations for v0.14 (spec-v14 §12 per-group signoff)

Per spec-v14 §12 the v0.14 close-out adds one signoff row per
active group A through Y (24 rows total). The v12 solicitations
above for Group U (Veterinary) and Group V (EMS) are the seed.
The remaining 22 group solicitations are appended here as they
are opened; each signoff is renewed on the v6 quarterly cadence
(90 days from review date) per spec-v14 §12.3 and §18.3.

The credential sought per group (spec-v14 §12.1):

- Group A Electrical, B Plumbing, C HVAC, D Restoration,
  E Construction, F Fire-ground, G Cross-trade, J Trucking,
  K Mechanic, L Agriculture, M Water, N Stage, O Kitchen,
  P Field: PE or equivalent trade certification.
- Group R Accounting: CPA.
- Group S Legal: JD.
- Group T Lab: PhD / MS in the relevant discipline.
- Group U Veterinary: DVM or RVT / LVT (v12 §13.1 override
  scope).
- Group V EMS: RN, MD, or paramedic with current protocol
  familiarity (v12 §13.1 override scope).
- Group W Pilots: ATP or CFI.
- Group X Real Estate: licensed broker, appraiser, or lender.
- Group Y Educators: working classroom teacher or curriculum
  specialist.
- Group H References and Group Q Historical: no signoff
  required (reference tiles use the v6 source-stamp recheck
  cadence; see [v6-audit.md](v6-audit.md)).

The signoff scope per group is the per-tile derivation rows in
[derivations.md](derivations.md), the worked-example fixtures
in [../test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json),
the per-group citations in [../citations.js](../citations.js),
and the per-tile dimension annotations in the source. See
[correctness.md](correctness.md) §"Per-group reviewer signoff"
for the operational summary.

### Per-group signoff status (v0.14)

The table below records the spec-v14 §12 signoff state per active
catalog group. Status values: **open** (no reviewer engaged yet),
**under-review** (reviewer engaged; signoff pending), **signed-off**
(signoff appended below under a YYYY-MM-DD section heading),
**renewal-due** (signoff older than the v6 quarterly cadence;
90-day window per §12.3 / §18.3). Groups H References and Q
Historical are **exempt** per spec-v14 §12.1 paragraph 2 (reference
tiles use the v6 source-stamp recheck cadence in
[v6-audit.md](v6-audit.md)).

This table is the structured state-machine the spec-v14 §12 / §18.3
quarterly-renewal lint reads. A row whose status remains **open**
past the v0.14 release does not block the release per spec-v14 §12,
but the v0.14 release announcement cannot carry the "audited" label
until every non-exempt row reaches **signed-off**.

| Group | Letter | Credential sought | Status | Last review | Next renewal | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Electrical | A | PE or equivalent trade certification | open | — | — | 44 tiles in [../calc-electrical.js](../calc-electrical.js); NEC 2023 primary source. |
| Plumbing | B | PE or equivalent trade certification | open | — | — | 38 tiles in [../calc-plumbing.js](../calc-plumbing.js); IPC 2021 primary source. |
| HVAC | C | PE or equivalent trade certification | open | — | — | 45 tiles in [../calc-hvac.js](../calc-hvac.js); ACCA Manual J / D + ASHRAE Fundamentals primary sources. |
| Restoration | D | PE or equivalent IICRC certification | open | — | — | 19 tiles in [../calc-restoration.js](../calc-restoration.js); IICRC S500 primary source. |
| Construction | E | PE or equivalent trade certification | open | — | — | 48 tiles in [../calc-construction.js](../calc-construction.js); IRC / IBC 2021 + ASCE 7 + AWC NDS primary sources. |
| Fire-ground | F | PE or fire-officer / instructor certification | open | — | — | 26 tiles in [../calc-fire.js](../calc-fire.js); NFPA 13 / 14 / 54 / 1142 / 1962 / 1981 + ISO PPC primary sources. |
| Cross-trade | G | PE or equivalent trade certification | open | — | — | 31 tiles in [../calc-cross.js](../calc-cross.js); NIST + NIOSH + OSHA primary sources. |
| References | H | (exempt per §12.1) | exempt | — | — | 15 reference tiles; v6 source-stamp recheck cadence applies. |
| Trucking | J | PE or equivalent trade certification (CDL instructor acceptable) | open | — | — | 13 tiles in [../calc-trucking.js](../calc-trucking.js); FMCSA primary source. |
| Mechanic | K | PE or ASE master certification | open | — | — | 13 tiles in [../calc-mechanic.js](../calc-mechanic.js). |
| Agriculture | L | PE or USDA NRCS technical service provider | open | — | — | 18 tiles in [../calc-agriculture.js](../calc-agriculture.js); USDA NRCS + FAO 56 + ASABE D497 primary sources. |
| Water | M | PE or AWWA grade-4 operator | open | — | — | 17 tiles in [../calc-water.js](../calc-water.js); AWWA primary source. |
| Stage | N | PE or IATSE / ESTA technical director | open | — | — | 8 tiles in [../calc-stage.js](../calc-stage.js); ESTA / ANSI E1.X primary sources. |
| Kitchen | O | PE or ServSafe / FDA-Food-Code-trained chef | open | — | — | 7 tiles in [../calc-kitchen.js](../calc-kitchen.js); FDA Food Code primary source. |
| Field | P | PE or equivalent trade certification | open | — | — | 9 tiles in [../calc-field.js](../calc-field.js). |
| Historical | Q | (exempt per §12.1) | exempt | — | — | 1 reference tile; v6 source-stamp recheck cadence applies. |
| Accounting | R | CPA | open | — | — | 16 tiles in [../calc-accounting.js](../calc-accounting.js); IRS + AICPA primary sources. |
| Legal | S | JD | open | — | — | 12 tiles in [../calc-legal.js](../calc-legal.js); FRCP + state-keyed shards primary sources. |
| Lab | T | PhD / MS in the relevant discipline | open | — | — | 14 tiles in [../calc-lab.js](../calc-lab.js); CRC Handbook + Numerical Recipes primary sources. |
| Veterinary | U | DVM or RVT / LVT (v12 §13.1 override scope) | open | — | — | 25 tiles in [../calc-vet.js](../calc-vet.js); Plumb's + AAHA + AAFP primary sources. v12 solicitation seed (see above). |
| EMS | V | RN, MD, or paramedic with current protocol familiarity (v12 §13.1 override scope) | open | — | — | 27 tiles in [../calc-ems.js](../calc-ems.js); AHA / ACLS + NIH + ACEP primary sources. v12 solicitation seed (see above). |
| Aviation | W | ATP or CFI | open | — | — | 23 tiles in [../calc-aviation.js](../calc-aviation.js); FAA H-8083 + 14 CFR primary sources. |
| Real Estate | X | Licensed broker, appraiser, or lender | open | — | — | 24 tiles in [../calc-realestate.js](../calc-realestate.js); FNMA / FHFA / HUD / CFPB primary sources. |
| Educators | Y | Working classroom teacher or curriculum specialist | open | — | — | 22 tiles in [../calc-edu.js](../calc-edu.js); OpenIntro Stats + NIST + IUPAC primary sources. |

Counts: 24 active groups (22 non-exempt; 2 exempt H / Q). At
2026-05-22: 0 signed-off, 22 open, 2 exempt.

---

## Template

When appending, copy the block below and fill in the fields.

```markdown
### YYYY-MM-DD — Short scope title

- **Reviewer**: Name (role, organization).
- **Scope**: e.g., "Citation track on Group A (Electrical) tiles 1–25."
- **Method**: e.g., "Live spot-check against NEC 2023 free-access TOC."
- **Findings**:
  1. Description. Reference: file:line or tile id.
  2. Description.
- **Disposition**:
  1. Fixed in commit ABC123 (link).
  2. Documented as known limitation in CHANGELOG.md / docs/legal.md (cite the actual file the maintainer used).
- **Reviewer comment** (optional, in their words).
```

## See also

- [../specs/spec-v10.md](../specs/spec-v10.md) §I.3 — the spec.
- [maintainer-quickstart.md](maintainer-quickstart.md) — the
  per-release self-audit ritual.
- [contributor-checklist.md](contributor-checklist.md) — the PR
  gate.
