#!/usr/bin/env node
// v10 Phase H.1 per-module size lint (spec-v10.md §10.1).
//
// Spec-v10 §H.1 declares a 5 KB gzipped cap on every dynamic-imported
// per-tile module. The current architecture does not split tiles into
// per-tile modules; tiles are grouped into per-trade calc-*.js modules.
// Until that refactor lands, this lint enforces an explicit per-module
// ceiling that catches a runaway addition without forcing the split.
// The Manual J, duct-sizing, and psychrometric helper modules called
// out by the spec are tracked individually below.
//
// The cap on each module is "current gzipped size + 20% headroom",
// rounded to 500 B. Once a module routinely brushes its cap, the right
// remediation is to split per-tile (which lets the 5 KB spec cap take
// over) and not to keep raising the budget.
//
// Behavior:
//   FAIL (exit 1) when any module exceeds its declared cap.
//   WARN when a module is within 90% of its cap (early signal).
//   OK otherwise.
//
// Pure read-and-report; reads from dist/. The script will skip
// gracefully if dist/ has not been built (CI runs npm run build before
// npm run lint when needed).

import { readFile, readdir, stat } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { gzipSync } from "node:zlib";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = resolve(ROOT, "dist");

// Per-module gzip caps in bytes. Set to current size + ~20% headroom,
// rounded to 500 B. Maintainers update this file in the same PR that
// intentionally grows a module; CI will fail otherwise. Modules absent
// from the table use the default cap (DEFAULT_CAP).
const DEFAULT_CAP = 6 * 1024;
const CAPS = {
  // spec-v17 §H.2: the catalog metadata registry, extracted from app.js
  // and lazy-loaded on the first search / tile-route interaction (not
  // per-tile, so the 5 KB per-tile rationale below does not apply). Cap
  // is current (~30 KB gzipped at 423 tiles) plus headroom; it is NOT in
  // the home-view payload (check-home-payload's HOME_FILES omits it).
  "tools-data.js": 58000, // v90-v100 2026-06-18 (54000->58000): +25 catalog rows; built ~55.8 KB gz; lazy-loaded, not in the home-view payload // v83-v85 2026-06-16 (52000->54000): +10 catalog rows (3 septic, 3 sprayer, 4 welding); built ~51.6 KB; v66 2026-06-13 (50000->52000): registry grows one row per tile (v62-v66 added 19 rows incl. the 13 Group Z rigging tiles); was 48000 v43; 47000 v41; 46000 v34; lazy-loaded, not in the home-view payload
  // Per-trade calc bundles.
  "calc-historical.js": 5000,
  // v5 expansion (Groups R / S / T) modules. Brought into the build
  // manifest 2026-05-11 (they had been referenced by app.js and tested
  // locally since v0.9.0 but were missing from scripts/build.mjs FILES,
  // so the size lint never saw them). Caps set to current + ~20%
  // headroom per the policy in this file. Per spec-v10 §H.1 the per-tile
  // split is the preferred long-term path once a module routinely
  // brushes its cap; calc-legal.js in particular is a candidate.
  // Bumped 15000 -> 18000 on 2026-06-05 for the spec-v17 R.3 home-office
  // tile (simplified-vs-actual deduction); built module ~15.1 KB gzipped.
  "calc-accounting.js": 23000, // v20 2026-06-06 (18000)
  // Bumped 10500 -> 11500 on 2026-05-20 for the spec-v14 §7.1 Phase C
  // dims-annotation closeout (~700 bytes of inline annotation across
  // the ten exports).
  // Bumped 11500 -> 13000 on 2026-06-06 for the spec-v23 T.1
  // gel-percent-agarose tile + the shared _v23SimpleRenderer helper
  // (built module ~12.4 KB gzipped).
  "calc-lab.js": 17000, // v20 2026-06-06 (13000)
  "calc-legal.js": 29000, // v20 2026-06-06 (25000)
  // Bumped 7500 -> 10000 when v9 §H.6 sous-vide-pasteurization added
  // the FDA Annex 6 Table A break points + diffusivity table. Per
  // spec-v10 §H.1 the per-tile split is the preferred long-term path.
  "calc-kitchen.js": 16000, // v90 2026-06-18 (13000->16000): +3 food-service cost-control tiles (food-cost-percentage, prime-cost, pour-cost); built ~14.5 KB gz; current + ~10% headroom // v20 2026-06-06 (10000)
  // Bumped 7500 -> 9000 (v9 §H.4 thi-livestock species tables) and
  // 9000 -> 11000 (v9 §H.3 sprayer-calibration). Per spec-v10 §H.1
  // the per-tile split is the preferred long-term path once the bundle
  // routinely brushes its cap.
  // Bumped 11000 -> 12500 on 2026-05-20 for the spec-v14 §7.1 Phase C
  // dims-annotation closeout (~900 bytes of inline annotation across
  // the nine exports). Bumped 12500 -> 19000 on 2026-06-05 (current +
  // ~20% headroom rule) for the first spec-v17 Phase L batch (L.1
  // irrigation requirement with its FAO 56 Kc table, L.3 cattle stocking
  // rate, L.4 grain bin capacity). Bumped 19000 -> 24000 on 2026-06-05
  // for L.2 npk-blend (three-straight fertilizer solve) + L.5 tank-mix
  // (tank-loading accounting), which completed Group L's genuinely-new
  // surface: the built module is ~19.7 KB gzipped, over the prior cap
  // (the L.2/L.5 batch's local lint measured a stale dist/ and missed it;
  // CI runs lint before build, so dist/ is absent and this gate no-ops
  // on a fresh checkout). Per spec-v10 §H.1 the per-tile split stays the
  // preferred long-term remediation.
  "calc-agriculture.js": 32000, // v87 2026-06-16 (was 37000 at 95.1%): the v68 tree-care / arborist-rigging bench (log-limb-weight, tree-rigging-shock, felling-notch-hinge, porta-wrap-friction, chipper-debris) relocated to calc-arborist.js, lowering this to ~30.0 KB gz; lowered cap locks in the freed space (~93.8%); v84 2026-06-16 (34000->37000): +3 sprayer tiles (nozzle-flow-pressure, spray-drift-buffer, sprayer-field-capacity); built ~34.4 KB; v68 2026-06-13 (28000->34000): +5 tree-care / arborist-rigging tiles (log/limb weight, shock load, felling hinge, porta-wrap, chipper); built ~32.2 KB; v20 2026-06-06 (24000)
  "calc-arborist.js": 8000, // v87 2026-06-16 new tree-care / arborist-rigging bench split out of calc-agriculture.js (5 tiles: log-limb-weight, tree-rigging-shock, felling-notch-hinge, porta-wrap-friction, chipper-debris; ~6.7 KB gz, lazy-loaded, not in the home-view payload, current + ~19% headroom)
  // Bumped 8000 -> 10000 (v9 §E.2 disinfection-ct SWTR table + bilinear
  // interpolation helper). Bumped 10000 -> 11000 on 2026-05-20 for the
  // spec-v14 §7.1 Phase C dims-annotation closeout (~600 bytes of
  // inline annotation across the nine exports). Per spec-v10 §H.1 the
  // per-tile split is the preferred long-term path once the bundle
  // routinely brushes its cap.
  // Bumped 11000 -> 18000 for the spec-v16 Group M first-principles batch
  // (pool turnover, well drawdown, cooling-water makeup, chlorine residual
  // decay); built module ~15.6 KB gzipped, cap carries the documented
  // ~20% headroom. Re-bumped 18000 -> 19500 on 2026-06-06 for the spec-v23
  // M.1 backflow-test-psi tile + the EN.15/16/17 disinfection/detention/
  // well-drawdown enhancements (built module ~18.3 KB gz).
  "calc-water.js": 21000, // v75 2026-06-15 (was 23500 at 95.8%): v20 Phase M bench (weir-flow, langelier-index, chemical-feed-pump) relocated to calc-treatment.js (22.5->19.0 KB gz), lowered cap locks in the freed space and clears the WARN; v20 2026-06-06 (19500->23500)
  "calc-treatment.js": 8500, // v93 2026-06-18 (6000->8500): +3 pool-chemistry dosing tiles (pool-alkalinity-adjust, pool-cya-dose, pool-salt-dose); built ~7.3 KB gz // v75 2026-06-15 new water-treatment bench split out of calc-water.js (3 tiles: weir-flow, langelier-index, chemical-feed-pump; ~4.6 KB gz, lazy-loaded, fits with headroom)
  // Bumped 8500 -> 10000 for v9 §F.2 30-minute resume timer landing
  // 2026-05-12 (parseTimerState / encodeTimerState / timerRemainingSeconds
  // / formatTimerMMSS helpers plus the custom renderLightning that mounts
  // the timer UI alongside the standard flash-to-bang inputs). The four
  // helpers are pure and exported so unit tests verify the round-trip
  // without a DOM. Per spec-v10 §H.1 the per-tile split is preferred
  // long-term once the bundle routinely brushes its cap.
  // Bumped 10000 -> 16500 for v9 §F.1 magnetic-declination landing
  // 2026-05-12 (NCEI WMM2025 port: schmidtK helper, decimalYearFromIso,
  // computeWMM core ~110 lines including geodetic->geocentric conversion,
  // Schmidt semi-normalized associated Legendre recurrences, field
  // summation, spherical->geodetic rotation, and the secular-variation
  // chain rule; plus the renderMagneticDeclination custom renderer that
  // loads data/field/wmm/coefficients.json once per session and wires
  // the bearing-conversion helper inline). Computed match against the
  // bundled NCEI WMM2025_TestValues.txt is within 0.005 deg D/I and
  // 0.001 nT H over all 100 test vectors (see calc-field-v9.test.js).
  // Per spec-v10 §H.1 the per-tile split is preferred long-term; spec-v71
  // executed the first cut, extracting the v25 surveying coordinate/traverse
  // bench (area-by-coordinates, traverse-closure) into calc-survey.js.
  "calc-field.js": 20000, // spec-v71 2026-06-15 surveying bench moved out (was 22000 / 21304 B); lowered to lock ~94% headroom on the 18830 B remainder
  // spec-v71 2026-06-15: the surveying coordinate/traverse bench split out of
  // calc-field.js. 3833 B; cap 5000 (current + headroom). Lazy-loaded, so not
  // in the home-view first-paint payload.
  "calc-survey.js": 5000,
  // spec-v72 2026-06-15: the spec-v26 feeder + transformer-conductor
  // overcurrent bench (motor-feeder-multiple, transformer-conductor-protection)
  // split out of calc-electrical.js. ~4.5 KB; cap 6000 (current + headroom).
  // Lazy-loaded, so not in the home-view first-paint payload.
  "calc-feeder.js": 6000,
  // Bumped 8500 -> 10500 for v9 §H.2 spl-atmospheric (ANSI S1.26-2014
  // relaxation-frequency closed-form). Per spec-v10 §H.1 per-tile split
  // remains preferred long-term.
  "calc-stage.js": 21500, // v92 2026-06-18 (18500->21500): +2 video tiles (led-video-wall, projector-brightness); built ~19.3 KB gz // v51 2026-06-12 + lighting-beam stage photometry (was 17000 v24); lazy-loaded, not in home payload
  // Bumped 11000 -> 13500 on 2026-05-20 for the spec-v14 §7.1 Phase C
  // dims-annotation closeout (~1500 bytes of inline annotation across
  // nine exports including the exported renderStoppingSightDistance
  // DOM-mount renderer).
  // Bumped 13500 -> 15500 on 2026-06-06 for the spec-v23 J.1
  // cargo-securement-wll + J.2 fuel-tax-ifta tiles (built module ~14.3 KB gz).
  "calc-trucking.js": 22500, // v91 2026-06-18 (19500->22500): +3 owner-operator load-economics tiles (load-profitability, fuel-surcharge, maintenance-reserve); built ~20.7 KB gz // v20 2026-06-06 (15500)
  // Bumped 11500 -> 13000 on 2026-06-06 for the spec-v23 K.2 screw-conveyor
  // tile; re-bumped 13000 -> 14000 the same day for the EN.13 fuel-range
  // solve-for inverse and EN.14 brake-pad per-axle enhancements (~13.2 KB gz).
  "calc-mechanic.js": 19500, // v100 2026-06-18 (18000->19500): +1 auto-body tile (paint-mix-ratio); built ~17.9 KB gz // v76 2026-06-15 (was 19500 at 95.6%): machining bench (cutting-speed-rpm, drill-point-depth) relocated to calc-machining.js (18.6->16.8 KB gz), lowered cap locks in the freed space; v31 2026-06-10 cutting-speed-rpm (was 18500 v20 2026-06-06; 14000 orig)
  "calc-machining.js": 5000, // v100 2026-06-18 (4000->5000): +1 machine-shop tile (cutting-fluid-concentration); built ~4.2 KB gz // v76 2026-06-15 new machining bench split out of calc-mechanic.js (2 tiles: cutting-speed-rpm, drill-point-depth; ~3.1 KB gz, lazy-loaded, fits with headroom)
  // Bumped 12500 -> 15500 on 2026-05-20 for the spec-v14 §7.1 Phase C
  // dims-annotation closeout (~1700 bytes of inline annotation across
  // 27 exports including twelve DOM-mount renderers). Bumped 15500 ->
  // 19000 on 2026-06-04 (current + ~20% headroom rule) for the spec-v16
  // D.5 equipment-power-draw tile (NEC 210.20 continuous-load check with
  // its inline nameplate-amps table and DOM-mount renderer; built module
  // ~16.0 KB gzipped). Per spec-v10 §H.1 the per-tile split stays the
  // preferred long-term remediation.
  "calc-restoration.js": 26000, // v77 2026-06-15 (was 29000 at 95.2%): demolition/abatement bench (moisture-dry-goal, flood-cut-quantity, abatement-containment) relocated to calc-demo.js (27.6->24.4 KB gz), lowered cap locks in the freed space; v69 2026-06-13 (27000->29000): +1 abatement-containment tile; v60 (22000->24000->26500->27000); lazy-loaded
  "calc-demo.js": 5500, // v77 2026-06-15 new demolition/abatement take-off bench split out of calc-restoration.js (3 tiles: moisture-dry-goal, flood-cut-quantity, abatement-containment; ~4.8 KB gz, lazy-loaded, fits with headroom)
  // Bumped 13500 -> 16000 when v9 §C.1 nfpa-1142-water-supply added
  // the occupancy / construction factor tables and §C.3 scba-cylinder-
  // time. Bumped 16000 -> 16500 at the 2026-05-19 spec-v14 Phase C
  // calc-fire annotation seeds (computeFireFriction, computePDP,
  // computeHydrantFlow wrapper, computeAerialLadderReach gained leading
  // `// dims:` annotations; gzipped delta ~83 B). Bumped 16500 -> 18000
  // on 2026-05-21 for the spec-v14 §7.1 Phase C dims-annotation closeout
  // (~2200 bytes of inline annotation across the remaining 30 exports
  // including fourteen DOM-mount renderers; gzipped delta ~400 B). Per
  // spec-v10 §H.1 the per-tile split is preferred long-term. Bumped
  // 18000 -> 24000 on 2026-06-01 (current + ~20% headroom rule) when the
  // spec-v15 Group F close added F.2 standpipe-pdp and F.5 smoke-ejector-cfm,
  // taking the built module to ~19.8 KB gzipped.
  "calc-fire.js": 24500, // v82 2026-06-16 (was 27000 at 94.9%): v3 technical-rescue bench (confined-space-purge, rope-ma, sling-angle) relocated to calc-rescue.js (25.6->22.8 KB gz), lowered cap locks in the freed space; v20 2026-06-06 (24000)
  "calc-rescue.js": 5500, // v82 2026-06-16: spec-v3 technical-rescue bench split out of calc-fire.js (built module ~4.4 KB gzipped, current + ~20% headroom); lazy-loaded, not in the home-view payload
  "calc-references.js": 15500,
  // Bumped 25500 -> 35000 on 2026-06-01 (current + ~20% headroom rule) when the
  // spec-v15 Group G close added four cross-trade mechanical tiles (pump-tdh,
  // hydraulic-cylinder, vbelt-drive, gear-cascade), taking the built module to
  // ~29 KB gzipped. Per spec-v10 §H.1 the per-tile split stays the preferred
  // long-term remediation once it brushes the new cap.
  "calc-cross.js": 36000, // v36 2026-06-10 split: spec-v26+ fab/layout tiles moved to calc-fab.js (was 41000 at 96.6%; now ~31 KB with headroom restored)
  "calc-fab.js": 16000, // v85 2026-06-16 (13000->16000): +4 welding gas/cutting/cost tiles (shielding-gas-runtime, oxyfuel-cutting-gas, weld-preheat-fuel, weld-cost-per-foot); built ~14.1 KB, lazy-loaded; v56 2026-06-13 split (was 20000 at 96%): the 8 layout / shop-geometry tiles moved to calc-layout.js, leaving the pipe & conduit fabrication bench (~10.1 KB); v39 2026-06-11 had raised it to 20000 for the conduit suite; v36 2026-06-10 split out of calc-cross.js
  "calc-layout.js": 13500, // v56 2026-06-13 new layout & shop-geometry bench (8 tiles: center-of-gravity-2point, bolt-circle, decimal-to-fraction, sine-bar, thread-pitch, circular-arc, circle-from-3-points, polygon-miter; ~10.6 KB), split out of calc-fab.js once it reached 96% of its cap
  "calc-shop.js": 16000, // v40 2026-06-11 new machine-shop & fab bench (10 tiles: machining-time, material-removal-rate, turning-surface-finish, taper-calc, dividing-head, thread-measure-wire, press-brake-tonnage, punch-force, weld-duty-cycle, carbon-equivalent; first-principles, fits with headroom)
  "calc-lowvoltage.js": 11000, // v28 2026-06-09 new low-voltage/data/security module (6 tiles, ~8.9 KB gzipped; cap = current + 20% headroom)
  "calc-pipefit.js": 5000, // v29 2026-06-09 new pipe/raceway field-layout module (3 tiles: cold-spring, raceway-expansion-fitting, pipe-spacing-rack; cap = current + ~20% headroom)
  "calc-metalair.js": 6000, // v30 2026-06-09 new metal/air/refrigerant module (3 tiles: groove-weld-strength, duct-static-pressure-total, compression-ratio-refrig; cap = current + ~20% headroom)
  // Bumped 31500 -> 42000 for the spec-v16 Group B batch (water-heater
  // recovery, thermal expansion tank, sanitary DFU sizing, trap primer);
  // built module ~34.8 KB gzipped, cap carries the documented ~20% headroom.
  // Bumped 42000 -> 46000 on 2026-06-05 (current + ~20% headroom rule) for
  // the spec-v16 B.8 backflow-sizing screen and the B.3 recirc annual-cost
  // extension; built module ~37.8 KB gzipped. Per spec-v10 §H.1 the
  // per-tile split stays the preferred long-term remediation.
  "calc-plumbing.js": 52000, // v86 2026-06-16 (was 53000 at 98.9%): onsite-wastewater / septic bench (septic-tank, septic-drainfield, septic-dose-tank, septic-pumpout-interval, septic-lpp-orifice) relocated to calc-septic.js (52.4->48.6 KB gz), lowered cap locks in the freed space (~93.5%); v78 2026-06-15 (was 57500 at 95.2%): v63/v64 service bench relocated to calc-service.js (54.7->49.5 KB gz); v73 2026-06-15 (was 60000 at 96.2%): v62 storm-drainage bench relocated to calc-drainage.js; v64 2026-06-13 (57000->60000): +2 pipe-support-spacing / softener-sizing tiles
  "calc-septic.js": 7000, // v86 2026-06-16 new onsite-wastewater / septic bench split out of calc-plumbing.js (5 tiles: septic-tank, septic-drainfield, septic-dose-tank, septic-pumpout-interval, septic-lpp-orifice; ~5.7 KB gz, lazy-loaded, not in the home-view payload, current + ~22% headroom)
  "calc-service.js": 8000, // v78 2026-06-15 new post-rough-in service bench split out of calc-plumbing.js (4 tiles: gas-appliance-demand, tpr-discharge, pipe-support-spacing, softener-sizing; ~6.9 KB gz, lazy-loaded, fits with headroom)
  "calc-drainage.js": 6000, // v73 2026-06-15 new storm-drainage bench split out of calc-plumbing.js (2 tiles: roof-drain-sizing, sump-basin-sizing; ~4.5 KB gz, lazy-loaded, fits with headroom)
  "calc-gas.js": 5500, // v42 2026-06-11 new fuel-gas bench split out of calc-plumbing.js (3 tiles: gas-pipe-sizing, gas-leak-rate, gas-pipe-pressure-drop; ~4.4 KB gz, fits with headroom)
  "calc-rigging.js": 15000, // v66 2026-06-13 (9000->15000): Group Z complete at 13 tiles (v65 lift-planning core + v66 hardware/below-the-hook); built ~13.3 KB gz; split to calc-heavylift.js authorized per spec-v66 if it grows further
  // Bumped 36500 -> 39000 for v9 §B.3 hood-exhaust (IMC duty table) and
  // §B.1 shr-latent (psychrometric humidity-ratio helpers and altitude
  // correction). Per spec-v10 §H.1 the per-tile split remains preferred
  // long-term once the bundle routinely brushes its cap.
  // Bumped 41000 -> 48000 for the spec-v16 Group C first-principles batch
  // (chiller tonnage, heat-exchanger LMTD/effectiveness-NTU, air changes
  // per hour); built module ~42.3 KB gzipped, cap carries the documented
  // ~20% headroom. Bumped 48000 -> 57000 on 2026-06-04 (current + ~20%
  // headroom rule) for the spec-v16 Group C second batch (C.6 boiler
  // distribution pipe sizing with its copper/steel/PEX dimension tables,
  // C.8 compressor short-cycle protection, C.10 humidifier capacity),
  // taking the built module to ~47.6 KB gzipped. Per spec-v10 §H.1 the
  // per-tile module split stays the preferred long-term remediation.
  "calc-hvac.js": 43500, // v99 2026-06-18 (41000->43500): +2 building-envelope tiles (assembly-r-value, blown-insulation-coverage); built ~40.4 KB gz // v89 2026-06-17 (was 47000 at 94.3%): the refrigerant-circuit bench (refrigerant-pt, superheat-subcool, compare-refrigerants, refrigerant-charge, refrigerant-charging) relocated to calc-refrigerant.js, lowering this to ~38.2 KB gz; lowered cap locks in the freed space (~93.1%); v81 2026-06-16 (was 60000 at 94.9%): spec-v16 first-principles HVAC engineering batch (chiller-tons, hx-lmtd-ntu, air-changes-hour, boiler-pipe-sizing, compressor-short-cycle, humidifier-capacity, filter-pressure-drop) relocated to calc-hvacsystems.js (56.9->44.0 KB gz), lowered cap locks in the freed space (~93.6%); v74 2026-06-15 (was 61000 at 95.9%): v23 velocity bench relocated to calc-velocity.js; v20 2026-06-06 (57000->61000)
  "calc-refrigerant.js": 9800, // v89 2026-06-17 new refrigerant-circuit bench split out of calc-hvac.js (5 tiles: refrigerant-pt, superheat-subcool, compare-refrigerants, refrigerant-charge, refrigerant-charging; ~8.2 KB gz, lazy-loaded, not in the home-view payload, current + ~19% headroom)
  "calc-hvacsystems.js": 16500, // v81 2026-06-16 new building-systems HVAC engineering bench split out of calc-hvac.js (7 spec-v16 tiles: chiller-tons, hx-lmtd-ntu, air-changes-hour, boiler-pipe-sizing, compressor-short-cycle, humidifier-capacity, filter-pressure-drop; ~14.7 KB gz, lazy-loaded, fits with headroom)
  "calc-velocity.js": 4000, // v74 2026-06-15 new velocity bench split out of calc-hvac.js (2 tiles: duct-velocity-pressure, refrigerant-velocity; ~2.7 KB gz, lazy-loaded, fits with headroom)
  // Bumped 37000 -> 48000 on 2026-06-01 (current + ~20% headroom rule) when the
  // spec-v15 Group E close added the E.7 header-sizing and E.8 deck-beam-post
  // tiles (built-up-member search, NDS column check, ledger schedule), taking
  // the built module to ~40 KB gzipped. Per spec-v10 §H.1 the per-tile split
  // stays the preferred long-term remediation once it brushes the new cap.
  "calc-construction.js": 65000, // v94+v96 2026-06-18 (62000->65000): +4 tiles (fence-estimate, post-hole-concrete, control-joint-spacing, rebar-lap-splice); built ~61.4 KB gz // v80 2026-06-16 (was 66000 at 95.0%): v25 site-civil bench (horizontal-curve, vertical-curve, earthwork-end-area, slope-stake-cut-fill) relocated to calc-civil.js (62.7->57.9 KB gz), lowered cap locks in the freed space (~93.3%); v70 2026-06-15 (70000->66000): 5 spec-v67 earthwork tiles relocated to calc-earthwork.js (68.3->62.7 KB). Prior: v69 (67000->70000) +2 coatings; v67 (64000->67000) +5 earthwork
  "calc-finish.js": 8500, // v95 2026-06-18 new finish-and-site-carpentry take-off module (6 tiles: thinset-coverage, flooring-takeoff, paver-patio, retaining-wall-block, attic-ventilation, gutter-downspout; ~6.8 KB gz, lazy-loaded, not in the home-view payload, current + ~20% headroom)
  "calc-elecdesign.js": 5000, // v101 2026-06-19 new electrician design/layout bench split out of calc-electrical.js (2 tiles: pull-box-sizing, lumen-method; ~2 KB gz, lazy-loaded, not in the home-view payload, current + ~20% headroom)
  "calc-hvacservice.js": 4000, // v102 2026-06-19 new HVAC field-service bench split out of calc-hvac.js (2 tiles: condensate-drain, recovery-cylinder; ~2 KB gz, lazy-loaded, not in the home-view payload, current + ~20% headroom)
  "calc-disinfect.js": 4000, // v103 2026-06-19 new pipe/well disinfection bench split out of calc-plumbing.js (2 tiles: main-disinfection-chlorine, well-shock-chlorination; ~2 KB gz, lazy-loaded, not in the home-view payload, current + ~20% headroom)
  "calc-civil.js": 8000, // v80 2026-06-16 new site-civil / roadway-geometry bench split out of calc-construction.js (4 tiles: horizontal-curve, vertical-curve, earthwork-end-area, slope-stake-cut-fill; ~6.6 KB gz, lazy-loaded, fits with headroom)
  "calc-earthwork.js": 8500, // v70 2026-06-15 new earthwork/excavation module (5 tiles split out of calc-construction.js: soil-swell-shrink, haul-cycle-production, dewatering-rate, spoil-setback, pipe-bedding-backfill; built ~7.0 KB; cap = current + ~20% headroom); lazy-loaded, not in the home-view payload

  // calc-electrical cap raised 39000 -> 42000 when v9 §A.3 + §A.4 landed.
  // Per spec-v10 §H.1: prefer per-tile split once the module routinely
  // brushes its cap. The arc-flash-screen + motor-branch-from-nameplate
  // additions are within the spec-v10 5 KB-per-tile budget; the bundled
  // Group A renderer-set is still inside the platform-wide envelope.
  // Bumped 44000 -> 62500 on 2026-06-01 (current + ~20% headroom rule)
  // when the spec-v15 Group A close added the last five Electrical tiles
  // (voltage-drop-reactance, power-triangle, ev-charger-load,
  // ambient-ampacity-adjust, service-load-optional). Group A is now 40
  // tiles in one module; the per-tile split is the preferred long-term
  // remediation once it brushes the new cap.
  "calc-electrical.js": 52000, // v88 2026-06-17 (was 58000 at 94.7%): the solar-PV / battery-storage / EV-charging bench (pv-string-sizing, battery-runtime, pv-interconnection-busbar, off-grid-battery, ev-charger-load) relocated to calc-solar.js, lowering this to ~48.7 KB gz; lowered cap locks in the freed space (~93.7%); v79 2026-06-15 (was 62000 at 95.1%): v20 §A advanced-analysis bench (parallel-conductor-derate, neutral-current-3ph, motor-vd-starting) relocated to calc-powerquality.js (59.0->54.9 KB gz), lowered cap locks in the freed space (~94.7%); v72 2026-06-15 (was 64500 at 96.7%): v26 feeder/transformer-protection bench relocated to calc-feeder.js; v39 2026-06-11 (66000->64500): v24 conduit-bending suite relocated to calc-fab.js; v20 2026-06-06 (62500)
  "calc-solar.js": 10500, // v88 2026-06-17 new solar-PV / battery-storage / EV-charging electrification bench split out of calc-electrical.js (5 tiles: pv-string-sizing, battery-runtime, pv-interconnection-busbar, off-grid-battery, ev-charger-load; ~8.8 KB gz, lazy-loaded, not in the home-view payload, current + ~19% headroom)
  "calc-powerquality.js": 6500, // v79 2026-06-15 new advanced AC power-system analysis bench split out of calc-electrical.js (3 tiles: parallel-conductor-derate, neutral-current-3ph, motor-vd-starting; ~5.2 KB gz, lazy-loaded, fits with headroom)

  // Worker and v5 platform.
  "manual-j-worker.js": 1500,
  "v5-platform.js": 6000,

  // v12 Group U (Veterinary). U.1 weight-based dose, U.2 maintenance
  // fluid rate, U.3 RER / MER, U.4 ETT/IVC sizing, U.6 BCS reference,
  // U.7 pet-age, U.10 bloodwork ranges, U.11 urine specific gravity,
  // U.12 anesthesia vitals, U.14 target weight loss, U.15 gestation,
  // U.18 ASA classification. Per spec-v12 §14.3 the group cap is
  // 22 KB once fully populated; current state sits at ~15 KB.
  // Bumped 28000 -> 30000 on 2026-05-21 for the spec-v14 §7.1 Phase C
  // dims-annotation closeout (~2400 bytes of inline annotation across
  // 36 exports including eighteen DOM-mount renderers). Bumped 30000 ->
  // 36000 on 2026-06-07 (current + ~20% headroom rule) for the spec-v17
  // batch: U.1 vet-cri, U.3 vet-transfusion, U.4 equine-weight.
  "calc-vet.js": 41000, // v20 2026-06-06 (36000)

  // v12 Group V (EMS / Pre-hospital). V.1 Glasgow Coma Scale, V.2
  // Parkland formula, V.4 APGAR, V.5 Cincinnati Prehospital Stroke
  // Scale, V.7 pediatric weight estimate, V.8 IV drip rate, V.10 O2
  // cylinder duration, V.11 shock index, V.12 mean arterial pressure,
  // V.13 anion gap, V.14 corrected calcium, V.16 CHA2DS2-VASc.
  // Per spec-v12 §14.3 the group cap is 25 KB once fully populated;
  // current state sits at ~14 KB. Every tile carries the §B.1
  // limitation banner (medical director and receiving facility govern).
  // Bumped 28500 -> 34000 on 2026-06-05 (current + ~20% headroom rule)
  // for the spec-v17 Group V completion (V.1 ideal-body-weight, V.3
  // corrected-qt) that closes the EMS deepening surface.
  "calc-ems.js": 39000, // v20 2026-06-06 (34000)

  // v12 Group W (Pilots / Aviation). W.1 density-altitude, W.3
  // crosswind, W.7 hypoxia-altitude, W.8 fuel-planning, W.9 ETE/ETA,
  // W.10 wind-triangle, W.11 pressure-altitude, W.12 phonetic-
  // alphabet, W.13 weather phrasing reference, W.14 transponder
  // codes, W.15 standard turn / climb / descent rate, W.16 top-
  // of-descent. Pure deterministic geometry / lookup / reference.
  // Per spec-v12 §14.3 the group cap is 18 KB once fully populated
  // (the METAR / TAF decoder is the largest piece at ~6 KB);
  // current state sits at ~15 KB.
  // Bumped 27000 -> 29000 on 2026-05-21 for the spec-v14 §7.1 Phase C
  // dims-annotation closeout (~2400 bytes of inline annotation across
  // the remaining 35 exports including eighteen DOM-mount renderers).
  // Bumped 29000 -> 33000 on 2026-06-08 (current + ~20% headroom rule)
  // for the spec-v17 W.5 holding-fuel tile.
  "calc-aviation.js": 39000, // v20 2026-06-06 (33000)

  // v12 Group X (Real Estate). X.1 PITI, X.2 amortization schedule,
  // X.3 DTI, X.4 LTV, X.5 cap rate / DSCR, X.6 1031 timeline, X.7
  // §121 home-sale exclusion, X.9 property tax, X.11 cash-on-cash,
  // X.13 cost of waiting, X.14 commission split, X.15 closing-cost
  // estimator. Pure deterministic math / calendar arithmetic over
  // public IRC + FNMA / FHA / VA / CFPB conventions. Per spec-v12
  // §14.3 the group cap target was 12 KB at starter; the full v12
  // §8 inventory (X.1-X.15) lands at ~16 KB. Bumped 12000 -> 17000 B
  // on 2026-05-15 when the X.2 / X.13 / X.15 third expansion landed.
  // Bumped 22000 -> 24000 on 2026-05-20 for the spec-v14 §7.1 Phase C
  // dims-annotation closeout (~3500 bytes of inline annotation across
  // 30 exports including 15 DOM-mount renderers). Bumped 24000 -> 31000
  // on 2026-06-06 (current + ~20% headroom rule) for the spec-v17
  // financing batch: X.1 mortgage-point-breakeven, X.3 per-diem-interest,
  // X.4 mortgage-reserves. Bumped 31000 -> 35000 on 2026-06-08 (current
  // + ~20% headroom rule) for the spec-v17 X.2 rent-vs-buy NPV tile.
  "calc-realestate.js": 41000, // v20 2026-06-06 (35000)

  // v12 Group Y (Educators / K-12). Y.1 Flesch-Kincaid readability,
  // Y.3 Lexile band by grade, Y.4 GPA calculator, Y.5 statistics
  // quick-read, Y.6 confidence interval (proportion + mean Wald),
  // Y.7 quadratic formula, Y.8 2x2 linear system (Cramer's rule),
  // Y.9 sig figs, Y.10 scientific notation, Y.11 codon table, Y.13
  // standards-based grade, Y.14 bell-curve z-score, Y.15 base
  // converter. Pure-math + reference tables; the codon-table is the
  // largest piece at ~1.5 KB. Per spec-v12 §14.3 the group cap was
  // 14 KB at starter; bumped 14000 -> 16000 B on 2026-05-13 (Y.4 /
  // Y.6 / Y.8 second expansion); bumped 16000 -> 21000 B on
  // 2026-05-16 when the Y.3 / Y.13 / Y.14 third expansion landed.
  // Bumped 26000 -> 30000 on 2026-06-05 for the spec-v17 Y.4
  // pearson-correlation tile; built module ~25.1 KB gzipped.
  "calc-edu.js": 35000, // v20 2026-06-06 (30000)

  // pure-math.js: the shared physics/statistics kernel, lazy-loaded by
  // the calc-*.js modules (not in the home payload). Given an explicit
  // cap on 2026-06-05 (was the 6 KB default) for the spec-v17 §Z.4
  // statistical special functions (erf / normCdf / gammaln / gammainc /
  // chi2Cdf / betainc / tcdf); built module ~7.0 KB gzipped, cap carries
  // the documented ~20% headroom.
  "pure-math.js": 8500,

  // Reference / citation modules. citations.js is the structured §3
  // reference block that every per-tile source-stamp resolves against;
  // it is dynamic-imported from the calc modules. Large by nature
  // because it carries every published citation; tracked separately.
  // Bumped 75000 -> 80000 on 2026-05-12 when the v12 Group V (EMS),
  // W (Pilots), X (Real Estate), and Y (Educators) starters added
  // ~10 CITATIONS entries plus the new GOVERNANCE.education,
  // GOVERNANCE.real_estate, and GOVERNANCE.ems_prehospital variants.
  // Re-bumped 80000 -> 86000 on 2026-05-12 when the Group V / W / X
  // expansion (+9 tile citations) and Group U starter (+3) landed.
  // Re-bumped 86000 -> 90000 on 2026-05-13 when the Group W second
  // expansion (+3 aviation citations: fuel-planning, wind-triangle,
  // top-of-descent) landed.
  // Re-bumped 90000 -> 94000 on 2026-05-15 when Group U third
  // expansion (+3 vet citations) and Group W third expansion
  // (+3 aviation citations: weather-phrasing, transponder-codes,
  // standard-turn-rate) landed.
  // Re-bumped 110000 -> 133000 on 2026-06-01 (current + ~20% headroom rule)
  // when the spec-v15 Group A + Group G closes added nine new tile citation
  // entries, taking the built module past 110 KB gzipped.
  // Per spec-v10 §H.1 a per-group citation split is the preferred
  // long-term remediation once the module routinely brushes its cap.
  "citations.js": 192000, // v90-v100 2026-06-18 (187000->192000): +25 citation entries; built ~188.9 KB gz // v83-v85 2026-06-16 (182000->187000): +10 citation entries (3 septic, 3 sprayer, 4 welding); built ~180.4 KB; v67 2026-06-13 (178000->182000): v62-v67 added 24 citation entries (incl. the 13 Group Z rigging tiles and the 5 earthwork tiles); v20 2026-06-06 (133000)

  // v10 §B.1 limitation-banner shared component. The CANONICAL copy
  // registry grew with v12 Group U / V additions (vet + EMS tiles
  // all carry the spec-v12 §13.1 limitation banner). Bumped
  // 4000 -> 5500 B on 2026-05-12 to absorb the v12 entries; re-bumped
  // 5500 -> 7000 B on 2026-05-13 when the U / V second expansions
  // added another 6 canonical entries. Re-bumped 9500 -> 11500 B on
  // 2026-06-05 for the spec-v17 V.1 ideal-body-weight and V.3 corrected-qt
  // canonical copy (current + ~20% headroom rule).
  "limitation-banner.js": 11500,
  // v10 Phase D pure-functional resolvers.
  "search-discovery.js": 2500,
  // v10 Phase B.2 per-tile meta-object registry. Grows incrementally
  // toward full TOOLS coverage; cap raised in lockstep. Bumped from
  // 7000 -> 9000 B on 2026-05-18 (spec-v13 Phase E seed of 55
  // related-tiles entries), then 9000 -> 11000 B later the same day
  // (Phase E expansion to 206 entries). Dropped back to 7000 B the
  // same day when the RELATED registry was lifted out into
  // scripts/related-tiles.mjs (a build-time-only module the SPA
  // never sees); tile-meta.js no longer carries the editorial map
  // and so does not grow with it.
  "tile-meta.js": 8800, // v83-v85 2026-06-16 (8000->8800): +10 _TILES rows (3 septic, 3 sprayer, 4 welding) tipped it to ~8085 B; v30 2026-06-09 bumped 7000 -> 8000: the _TILES [id, group] registry grows one row per tile (552 -> 555 tipped it to 7023 B); cap = current + ~14% headroom
};

// Modules excluded entirely. The home-view bundle is enforced by
// check-home-payload.mjs; we don't double-count it.
const EXCLUDE = new Set([
  "index.html",
  "styles.css",
  "theme.js",
  "app.js",
  "integrity.js",
  "routing.js",
  "sw.js",
  "changelog.js",
  "changelog.html",
]);

async function main() {
  if (!existsSync(DIST)) {
    console.warn("WARN: dist/ not present; run `npm run build` first. Skipping per-module size lint.");
    return;
  }
  const entries = await readdir(DIST);
  const candidates = entries.filter(
    (e) => e.endsWith(".js") && !EXCLUDE.has(e),
  );

  const rows = [];
  for (const name of candidates) {
    const p = resolve(DIST, name);
    const st = await stat(p);
    if (!st.isFile()) continue;
    const buf = await readFile(p);
    const gz = gzipSync(buf).length;
    const cap = CAPS[name] ?? DEFAULT_CAP;
    rows.push({ name, gzip: gz, cap });
  }
  rows.sort((a, b) => a.name.localeCompare(b.name));

  console.log("per-module gzipped sizes (spec-v10 §H.1):");
  let failed = 0;
  let warned = 0;
  for (const r of rows) {
    const pct = ((r.gzip / r.cap) * 100).toFixed(1);
    const tag = r.gzip > r.cap ? " FAIL" : r.gzip > r.cap * 0.9 ? " WARN" : "";
    console.log(
      "  " +
        r.name.padEnd(28) +
        " " +
        String(r.gzip).padStart(7) +
        " B / " +
        String(r.cap).padStart(7) +
        " B (" +
        pct +
        "%)" +
        tag,
    );
    if (r.gzip > r.cap) failed += 1;
    else if (r.gzip > r.cap * 0.9) warned += 1;
  }

  if (failed > 0) {
    console.error(
      "FAIL: " + failed + " module(s) exceed their gzipped budget. Either split the module per-tile (preferred) or raise the cap in scripts/check-module-sizes.mjs with a CHANGELOG note.",
    );
    process.exit(1);
  }
  if (warned > 0) {
    console.warn(
      "WARN: " + warned + " module(s) within 10% of their cap. Plan a split before the next batch.",
    );
  }
  console.log("v10 per-module size lint OK.");
}

await main();
