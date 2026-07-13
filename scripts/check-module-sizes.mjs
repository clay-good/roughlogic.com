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
  "tools-data.js": 170000, // spec-v594..v613 follow-on campaign 2026-07-10 (155000->170000): +20 tiles' catalog rows -> ~155 KB gz (100.1%); the registry grows with every tile, raised generously to avoid frequent re-raises; lazy-loaded, not in home-view payload // spec-v489..v588 campaign 2026-07-09 (140000->155000): the single-tile landing campaign passed tile 984, taking the catalog registry past 140K raw; +~10% headroom for the remaining ~55 backlog tiles; lazy-loaded (spec-v10 H.2), not in the home-view payload // spec-v489..v588 campaign 2026-07-09 (130000->140000): the single-tile landing campaign (v489+) took the catalog registry past 130K raw at tile 953; +~7% headroom for the remaining ~87 backlog tiles; lazy-loaded (spec-v10 H.2), not in the home-view payload // spec-v375..v474 campaign 2026-07-04 (115000->130000): the ~48 landed catalog rows this campaign took the registry past 115K raw; +~13% headroom for the remaining backlog; lazy-loaded (spec-v10 H.2), not in the home-view payload // spec-v275..v331 campaign 2026-07-03 (100000->115000): 57 landed catalog rows took the registry to 100.6 KB gz; current + ~14% headroom; lazy-loaded (spec-v10 H.2), not in the home-view payload // spec-v275..v286 campaign 2026-07-03 (92000->100000): 12 landed tiles took the registry to 88.4 KB gz (96.1% of the old cap); current + ~13% headroom; lazy-loaded (spec-v10 H.2), not in the home-view payload // spec-v248..v271 2026-07-02 (84000->92000): +12 catalog rows across the fire-sprinkler / RC / geotech / masonry new-module trios -> ~82.3 KB gz (100.3% of old cap); cap = current + ~11% headroom; lazy-loaded, not in the home-view payload. Prior: spec-v230..v241 2026-06-30 (77000->84000): +12 catalog rows (the energy-cost-savings / heat-pump / battery-economics / compressed-air batch) -> ~75.5 KB gz (89.9%); cap = current + ~11% headroom; lazy-loaded, not in the home-view payload. spec-v218..v229 2026-06-30 (70000->77000): +12 catalog rows (the energy/structural/solar building-science batch) -> ~70.4 KB gz (91.4%); cap = current + ~9% headroom; lazy-loaded, not in the home-view payload. spec-v189..v198 2026-06-26 (66000->70000): +8 restoration catalog rows (drying-balance, bound-water, disinfectant-dwell, carpet-restore-replace, category-deterioration, hydroxyl-sizing, cavity-drying-system, dry-time-projection) -> ~63.5 KB gz (98.5% of old cap); cap = current + ~7.5% headroom; lazy-loaded, not in the home-view payload. spec-v199..v203 2026-06-24 (62000->66000): +5 catalog rows (radiant-loop-sizing, condensate-return-sizing, branch-saddle-cutback, reducer-offset, flange-rating); built ~61.0 KB gz; lazy-loaded, not in the home-view payload // v109-v111 2026-06-20 (58000->62000): +7 catalog rows (3 electrical grounding/bonding, 2 HVAC gas-heat, 2 fuel-gas); built ~57.2 KB gz; lazy-loaded, not in the home-view payload // v90-v100 2026-06-18 (54000->58000): +25 catalog rows; built ~55.8 KB gz; lazy-loaded, not in the home-view payload // v83-v85 2026-06-16 (52000->54000): +10 catalog rows (3 septic, 3 sprayer, 4 welding); built ~51.6 KB; v66 2026-06-13 (50000->52000): registry grows one row per tile (v62-v66 added 19 rows incl. the 13 Group Z rigging tiles); was 48000 v43; 47000 v41; 46000 v34; lazy-loaded, not in the home-view payload
  // Per-trade calc bundles.
  "calc-historical.js": 5000,
  // v5 expansion (Groups R / S / T) modules. Brought into the build
  // manifest 2026-05-11 (they had been referenced by app.js and tested
  // locally since v0.9.0 but were missing from scripts/build.mjs FILES,
  // so the size lint never saw them). Caps set to current + ~20%
  // headroom per the policy in this file. Per spec-v10 §H.1 the per-tile
  // split is the preferred long-term path once a module routinely
  // brushes its cap.
  // Bumped 15000 -> 18000 on 2026-06-05 for the spec-v17 R.3 home-office
  // tile (simplified-vs-actual deduction); built module ~15.1 KB gzipped.
  "calc-accounting.js": 33000, // spec-v390..v392 contractor-billing trio 2026-07-03 (28000->33000): +3 Group R tiles (wip-percent-complete, change-order-markup, retainage-tracker) -> ~25.6 KB raw (91.5% of the old cap); headroom for the remaining accounting tiles in the v375..v474 backlog (v444-446 contractor-cost); lazy-loaded, not in the home-view payload // spec-v362..v364 2026-07-03 (23000->28000): +3 Group R contractor cost-recovery tiles (labor-burden-rate, equipment-hourly-rate, overhead-recovery-rate) -> ~23.2 KB gz; current + ~20% headroom. v20 2026-06-06 (18000)
  // Bumped 10500 -> 11500 on 2026-05-20 for the spec-v14 §7.1 Phase C
  // dims-annotation closeout (~700 bytes of inline annotation across
  // the ten exports).
  // Bumped 11500 -> 13000 on 2026-06-06 for the spec-v23 T.1
  // gel-percent-agarose tile + the shared _v23SimpleRenderer helper
  // (built module ~12.4 KB gzipped).
  "calc-lab.js": 21000, // v20 2026-06-06 (13000); spec-v531..v534 Group T campaign (17000)
  // Bumped 7500 -> 10000 when v9 §H.6 sous-vide-pasteurization added
  // the FDA Annex 6 Table A break points + diffusivity table. Per
  // spec-v10 §H.1 the per-tile split is the preferred long-term path.
  "calc-kitchen.js": 19000, // spec-v537..v539 Group O batch (menu-engineering, kitchen-sanitizer-ppm, drink-abv-dilution) (16000) // v90 2026-06-18 (13000->16000): +3 food-service cost-control tiles (food-cost-percentage, prime-cost, pour-cost); built ~14.5 KB gz; current + ~10% headroom // v20 2026-06-06 (10000)
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
  "calc-agriculture.js": 48000, // spec-v417..v419 landscape/ag trio 2026-07-04 (44000->48000): +3 Group L tiles (mulch-topsoil-volume, grain-drying-energy, manure-nutrient-application) -> ~37.6 KB raw (85.4%); headroom for backlog; lazy-loaded // // spec-v338..v340 2026-07-03 (37500->44000): +3 Group L tiles (grain-shrink-moisture, livestock-dry-matter-intake, manure-application-rate) -> ~36.7 KB gz; current + ~20% headroom. spec-v118 2026-06-20 (32000->37500): +1 hay-dry-matter tile takes the bench to ~31.1 KB gz (97.1% of the old cap); +~20% headroom. v87 2026-06-16 (was 37000 at 95.1%): the v68 tree-care / arborist-rigging bench (log-limb-weight, tree-rigging-shock, felling-notch-hinge, porta-wrap-friction, chipper-debris) relocated to calc-arborist.js, lowering this to ~30.0 KB gz; lowered cap locks in the freed space (~93.8%); v84 2026-06-16 (34000->37000): +3 sprayer tiles (nozzle-flow-pressure, spray-drift-buffer, sprayer-field-capacity); built ~34.4 KB; v68 2026-06-13 (28000->34000): +5 tree-care / arborist-rigging tiles (log/limb weight, shock load, felling hinge, porta-wrap, chipper); built ~32.2 KB; v20 2026-06-06 (24000)
  "calc-arborist.js": 16000, // spec-v598 quadratic-mean-diameter + v607 tree-open-cavity 2026-07-10 (13000->16000): +2 Group L tiles -> ~13.2 KB gz (101.5% of the old cap); raised to ~16 KB with headroom; lazy-loaded, not in home-view payload // spec-v563..v566 forestry/tree-risk batch (basal-area-prism, reineke-sdi, trunk-decay-strength, tree-protection-zone) (8000->10000->13000) // v87 2026-06-16 new tree-care / arborist-rigging bench split out of calc-agriculture.js (5 tiles: log-limb-weight, tree-rigging-shock, felling-notch-hinge, porta-wrap-friction, chipper-debris; ~6.7 KB gz, lazy-loaded, not in the home-view payload, current + ~19% headroom)
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
  "calc-water.js": 24500, // spec-v116 2026-06-20 (21000->24500): +2 disinfection tiles (chlorine-demand, uv-dose) -> ~20.3 KB gz (96.5%); +~20% headroom. v75 2026-06-15 (was 23500 at 95.8%): v20 Phase M bench (weir-flow, langelier-index, chemical-feed-pump) relocated to calc-treatment.js (22.5->19.0 KB gz), lowered cap locks in the freed space and clears the WARN; v20 2026-06-06 (19500->23500)
  "calc-treatment.js": 21000, // spec-v613 flocculator-paddle-power 2026-07-10 (18000->21000): +1 Group M tile -> ~18.2 KB gz (101.1%); raised to ~21 KB with headroom; lazy-loaded, not in home-view payload // spec-v573/v575/v576 wastewater-ops 2026-07-10 (15000->18000): +3 Group M tiles (digester-vs-loading, flocculation-g-value, chlorine-cylinder-withdrawal) crossed 15000 at v576. // spec-v405..v407 wastewater-ops 2026-07-04 (12000->15000): +3 Group M tiles (clarifier-surface-loading, bod-tss-loading-removal, tds-from-conductivity) -> ~10.0 KB raw (83.2% of the old cap); headroom for backlog; lazy-loaded // spec-v353..v355 2026-07-03 (8500->12000): +3 Group M pool chlorination/heating tiles (pool-chlorine-dose, pool-heater-btu, breakpoint-chlorination) -> ~9.8 KB gz; current + ~20% headroom. v93 2026-06-18 (6000->8500): +3 pool-chemistry dosing tiles (pool-alkalinity-adjust, pool-cya-dose, pool-salt-dose); built ~7.3 KB gz // v75 2026-06-15 new water-treatment bench split out of calc-water.js (3 tiles: weir-flow, langelier-index, chemical-feed-pump; ~4.6 KB gz, lazy-loaded, fits with headroom)
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
  "calc-survey.js": 9000, // spec-v631 level-loop-adjustment 2026-07-11 (8000->9000): +1 Group P survey tile (array in/out renderer) tipped it over the old cap; raised ~13% with headroom; lazy-loaded, not in home-view payload // // spec-v311..v313 2026-07-03 (5000->8000): +3 field-surveying depth tiles (differential-leveling, stadia-distance, taping-corrections) -> ~7.2 KB gz (90%); current + ~11% headroom; lazy-loaded, not in home-view payload
  // spec-v72 2026-06-15: the spec-v26 feeder + transformer-conductor
  // overcurrent bench (motor-feeder-multiple, transformer-conductor-protection)
  // split out of calc-electrical.js. ~4.5 KB; cap 6000 (current + headroom).
  // Lazy-loaded, so not in the home-view first-paint payload.
  "calc-feeder.js": 11000, // spec-v493/v519 2026-07-09 (8500->11000): +2 Group A tiles (generator-conductor-445, existing-load-220-87) take the built copy to ~9.1 KB gz (106.8% of the old cap); cap = current + ~21% headroom; lazy-loaded, not in the home-view payload // spec-v280 2026-07-03 (7000->8500): +continuous-load-ocpd took the built copy to 6795 B (97.1%); +~25% headroom. Lazy-loaded, absent from the home payload. // v164 2026-06-23 (6000->7000): +feeder-tap-rule took the built copy to 5721 B (95.3%, WARN); +~17% locks in headroom for the v164..v178 electrician batch.
  // Bumped 8500 -> 10500 for v9 §H.2 spl-atmospheric (ANSI S1.26-2014
  // relaxation-frequency closed-form). Per spec-v10 §H.1 per-tile split
  // remains preferred long-term.
  "calc-stage.js": 24000, // spec-v542 counterweight-arbor-load (21500) // v92 2026-06-18 (18500->21500): +2 video tiles (led-video-wall, projector-brightness); built ~19.3 KB gz // v51 2026-06-12 + lighting-beam stage photometry (was 17000 v24); lazy-loaded, not in home payload
  // Bumped 11000 -> 13500 on 2026-05-20 for the spec-v14 §7.1 Phase C
  // dims-annotation closeout (~1500 bytes of inline annotation across
  // nine exports including the exported renderStoppingSightDistance
  // DOM-mount renderer).
  // Bumped 13500 -> 15500 on 2026-06-06 for the spec-v23 J.1
  // cargo-securement-wll + J.2 fuel-tax-ifta tiles (built module ~14.3 KB gz).
  "calc-trucking.js": 30000, // spec-v423..v425 trucking-business trio 2026-07-04 (26500->30000): +3 Group J tiles (detention-demurrage-billing, driver-pay-cpm-vs-percentage, invoice-factoring-cost) -> ~22.1 KB raw (83.4%); headroom for backlog; lazy-loaded // // spec-v115 2026-06-20 (22500->26500): +2 weight-compliance tiles (gcwr-check, tire-load-check) -> ~22.1 KB gz (98.2%); +~20% headroom. v91 2026-06-18 (19500->22500): +3 owner-operator load-economics tiles (load-profitability, fuel-surcharge, maintenance-reserve); built ~20.7 KB gz // v20 2026-06-06 (15500)
  // Bumped 11500 -> 13000 on 2026-06-06 for the spec-v23 K.2 screw-conveyor
  // tile; re-bumped 13000 -> 14000 the same day for the EN.13 fuel-range
  // solve-for inverse and EN.14 brake-pad per-axle enhancements (~13.2 KB gz).
  "calc-mechanic.js": 36000, // spec-v514..v516 2026-07-09 (32000->36000): +3 more Group K tiles (brake-pedal-hydraulic, dyno-correction-sae, aircraft-weight-balance) take the built copy to ~32.2 KB gz (100.5% of the old cap); cap = current + ~12% headroom for the remaining Group K campaign tiles; lazy-loaded, not in the home-view payload // spec-v505..v507 2026-07-09 (28000->32000): +3 more Group K marine/engine tiles (anchor-rode-scope, turbo-pressure-ratio, crouch-planing-speed) take the built copy to ~28.3 KB gz (101.1% of the old cap); cap = current + ~13% headroom for the remaining Group K campaign tiles; lazy-loaded, not in the home-view payload // spec-v500..v502 2026-07-09 (25000->28000): +3 Group K tiles (density-altitude, crosswind-component, hull-speed) take the built copy to ~26.4 KB gz (105.6% of the old cap); cap = current + ~6% headroom; lazy-loaded, not in the home-view payload // spec-v396..v398 fluid-power/cooling trio 2026-07-04 (19500->25000): +3 Group K tiles (hydraulic-pump-horsepower, hydraulic-motor-torque-speed, cooling-system-flow) -> ~18.5 KB raw (94.8% of the old cap); headroom for the remaining calc-mechanic tiles in the v375..v474 backlog; lazy-loaded, not in the home-view payload // v100 2026-06-18 (18000->19500): +1 auto-body tile (paint-mix-ratio); built ~17.9 KB gz // v76 2026-06-15 (was 19500 at 95.6%): machining bench (cutting-speed-rpm, drill-point-depth) relocated to calc-machining.js (18.6->16.8 KB gz), lowered cap locks in the freed space; v31 2026-06-10 cutting-speed-rpm (was 18500 v20 2026-06-06; 14000 orig)
  "calc-machining.js": 15000, // spec-v649 gear-identification 2026-07-13 (13000->15000): the gear-identification inverse tile took the built module to ~13.4 KB gz (102.7% of the old cap); cap = current + ~12% headroom; lazy-loaded, not in the home-view payload // spec-v504/v509 2026-07-09 (11000->13000): +2 Group K tiles (bearing-l10-life, countersink-depth) take the built copy to ~11.2 KB gz (102% of the old cap); cap = current + ~16% headroom; lazy-loaded, not in the home-view payload // spec-v317..v319 2026-07-03 (6500->11000): +3 machining depth tiles (radial-chip-thinning, boring-bar-deflection, ballnose-scallop-height) -> ~8.3 KB gz (75%); current + ~33% headroom; lazy-loaded, not in home-view payload
  // Bumped 12500 -> 15500 on 2026-05-20 for the spec-v14 §7.1 Phase C
  // dims-annotation closeout (~1700 bytes of inline annotation across
  // 27 exports including twelve DOM-mount renderers). Bumped 15500 ->
  // 19000 on 2026-06-04 (current + ~20% headroom rule) for the spec-v16
  // D.5 equipment-power-draw tile (NEC 210.20 continuous-load check with
  // its inline nameplate-amps table and DOM-mount renderer; built module
  // ~16.0 KB gzipped). Per spec-v10 §H.1 the per-tile split stays the
  // preferred long-term remediation.
  "calc-restoration.js": 52000, // spec-v143/v150/v155/v156 2026-07-01 (44000->52000): +4 restoration novelty tiles (surface-condensation-risk, spore-io-ratio, hardwood-floor-drying-mat, mold-cleaning-labor) -> ~46.7 KB gz (106% of old cap); cap = current + ~11% headroom; lazy-loaded, not in the home-view payload. spec-v189..v198 2026-06-26 (36000->44000): +8 water-damage restoration second/third-pass tiles (drying-balance, bound-water, disinfectant-dwell, carpet-restore-replace, category-deterioration, hydroxyl-sizing, cavity-drying-system, dry-time-projection) -> ~36.0 KB gz (99.9% of old cap); cap = current + ~20% headroom. spec-v136..v140 2026-06-23 (30500->36000): +5 on-arrival water-loss tiles (flood-cut-takeoff, ceiling-water-load, dehumidifier-derate, class-of-loss-screen, desiccant-airflow-sizing) -> ~29.3 KB gz (98.3% of old cap); +~20% headroom. spec-v119 2026-06-20 (26000->30500): +1 wood-emc tile -> ~25.2 KB gz (97.1%); +~20% headroom. v77 2026-06-15 (was 29000 at 95.2%): demolition/abatement bench (moisture-dry-goal, flood-cut-quantity, abatement-containment) relocated to calc-demo.js (27.6->24.4 KB gz), lowered cap locks in the freed space; v69 2026-06-13 (27000->29000): +1 abatement-containment tile; v60 (22000->24000->26500->27000); lazy-loaded
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
  "calc-fire.js": 34000, // spec-v581 2026-07-10 (28000->34000): fire-ground water-supply batch v577-v581 (nfa-fireground-flow, relay-pump-distance, draft-lift-max, tanker-shuttle-flow, foam-eductor-limit) -> ~28.9 KB gz (85.0%); +~18% headroom. spec-v114 2026-06-20 (24500->28000): +1 smooth-bore-flow tile -> ~23.4 KB gz (95.4%); +~20% headroom. v82 2026-06-16 (was 27000 at 94.9%): v3 technical-rescue bench (confined-space-purge, rope-ma, sling-angle) relocated to calc-rescue.js (25.6->22.8 KB gz), lowered cap locks in the freed space; v20 2026-06-06 (24000)
  "calc-rescue.js": 8000, // spec-v540..v541 Group P batch (search-track-spacing, sweat-rate-hydration) (5500) // v82 2026-06-16: spec-v3 technical-rescue bench split out of calc-fire.js (built module ~4.4 KB gzipped, current + ~20% headroom); lazy-loaded, not in the home-view payload
  "calc-references.js": 17500, // v187 2026-06-24 (15500->17500): +1 electrician second-pass tile (pool-bonding-680-26) takes the module to ~16.1 KB gz (92.0%); current + ~8% headroom
  // Bumped 25500 -> 35000 on 2026-06-01 (current + ~20% headroom rule) when the
  // spec-v15 Group G close added four cross-trade mechanical tiles (pump-tdh,
  // hydraulic-cylinder, vbelt-drive, gear-cascade), taking the built module to
  // ~29 KB gzipped. Per spec-v10 §H.1 the per-tile split stays the preferred
  // long-term remediation once it brushes the new cap.
  "calc-cross.js": 36000, // v36 2026-06-10 split: spec-v26+ fab/layout tiles moved to calc-fab.js (was 41000 at 96.6%; now ~31 KB with headroom restored)
  "calc-fab.js": 24000, // v129..v134 2026-06-23 (16000->24000): +6 metal-trades tiles (weld-metal-volume, wire-feed-deposition, weld-transverse-shrinkage, weld-group-eccentric, min-bend-radius, shrink-fit); built ~19.8 KB gz, lazy-loaded, +~21% headroom; v85 2026-06-16 (13000->16000): +4 welding gas/cutting/cost tiles (shielding-gas-runtime, oxyfuel-cutting-gas, weld-preheat-fuel, weld-cost-per-foot); built ~14.1 KB, lazy-loaded; v56 2026-06-13 split (was 20000 at 96%): the 8 layout / shop-geometry tiles moved to calc-layout.js, leaving the pipe & conduit fabrication bench (~10.1 KB); v39 2026-06-11 had raised it to 20000 for the conduit suite; v36 2026-06-10 split out of calc-cross.js
  "calc-layout.js": 13500, // v56 2026-06-13 new layout & shop-geometry bench (8 tiles: center-of-gravity-2point, bolt-circle, decimal-to-fraction, sine-bar, thread-pitch, circular-arc, circle-from-3-points, polygon-miter; ~10.6 KB), split out of calc-fab.js once it reached 96% of its cap
  "calc-shop.js": 20000, // spec-v399..v400 fab shop-math 2026-07-04 (16000->20000): +2 Group G tiles (tolerance-stack-rss, cone-flat-pattern) -> ~14.4 KB raw (90.0% of the old cap); headroom for remaining backlog; lazy-loaded, not in home-view payload // v40 2026-06-11 new machine-shop & fab bench (10 tiles: machining-time, material-removal-rate, turning-surface-finish, taper-calc, dividing-head, thread-measure-wire, press-brake-tonnage, punch-force, weld-duty-cycle, carbon-equivalent; first-principles, fits with headroom)
  "calc-lowvoltage.js": 13000, // spec-v456..v458 2026-07-04 (11000->13000): +3 AV/security/data tiles (camera-lens-fov, ceiling-speaker-coverage, structured-cabling-channel) -> ~11.8 KB gz (107% of the old cap); cap = current + ~10% headroom; lazy-loaded, not in the home-view payload // v28 2026-06-09 new low-voltage/data/security module (6 tiles, ~8.9 KB gzipped; cap = current + 20% headroom)
  "calc-pipefit.js": 21000, // spec-v588 2026-07-10 (17000->21000): +1 steam orifice/PRV tile (steam-prv-napier) -> ~17.9 KB gz (85.0%); +~17% headroom; lazy-loaded, absent from home payload. spec-v199..v203 2026-06-24 (12700->17000): +4 tiles (condensate-return-sizing, branch-saddle-cutback, reducer-offset, flange-rating) -> ~14.5 KB gz (85.2%); +~17% headroom; lazy-loaded, absent from home payload. spec-v157..v162 2026-06-23 (5000->12700): +6 steamfitting / pressure-piping / pipe-support tiles (flash-steam-pct, steam-pipe-velocity, steam-trap-sizing, pipe-pressure-rating, pipe-filled-support-load, hanger-rod-sizing) -> ~10.3 KB gz; +~20% headroom; lazy-loaded, absent from home payload. v29 2026-06-09 new pipe/raceway field-layout module (3 tiles: cold-spring, raceway-expansion-fitting, pipe-spacing-rack; cap = current + ~20% headroom)
  "calc-metalair.js": 6000, // v30 2026-06-09 new metal/air/refrigerant module (3 tiles: groove-weld-strength, duct-static-pressure-total, compression-ratio-refrig; cap = current + ~20% headroom)
  // Bumped 31500 -> 42000 for the spec-v16 Group B batch (water-heater
  // recovery, thermal expansion tank, sanitary DFU sizing, trap primer);
  // built module ~34.8 KB gzipped, cap carries the documented ~20% headroom.
  // Bumped 42000 -> 46000 on 2026-06-05 (current + ~20% headroom rule) for
  // the spec-v16 B.8 backflow-sizing screen and the B.3 recirc annual-cost
  // extension; built module ~37.8 KB gzipped. Per spec-v10 §H.1 the
  // per-tile split stays the preferred long-term remediation.
  "calc-plumbing.js": 66000, // spec-v388 thrust-block-sizing 2026-07-03 (60000->66000): +1 hydraulics tile (thrust-block-sizing) -> ~57.4 KB raw (95.7% of the old cap); headroom for the remaining plumbing tiles in the v375..v474 backlog (v450-452); lazy-loaded, not in the home-view payload // spec-v112 2026-06-20 (52000->60000): +1 water-heater-storage-sizing tile -> ~49.9 KB gz (95.9%); +~20% headroom. v86 2026-06-16 (was 53000 at 98.9%): onsite-wastewater / septic bench (septic-tank, septic-drainfield, septic-dose-tank, septic-pumpout-interval, septic-lpp-orifice) relocated to calc-septic.js (52.4->48.6 KB gz), lowered cap locks in the freed space (~93.5%); v78 2026-06-15 (was 57500 at 95.2%): v63/v64 service bench relocated to calc-service.js (54.7->49.5 KB gz); v73 2026-06-15 (was 60000 at 96.2%): v62 storm-drainage bench relocated to calc-drainage.js; v64 2026-06-13 (57000->60000): +2 pipe-support-spacing / softener-sizing tiles
  "calc-septic.js": 7000, // v86 2026-06-16 new onsite-wastewater / septic bench split out of calc-plumbing.js (5 tiles: septic-tank, septic-drainfield, septic-dose-tank, septic-pumpout-interval, septic-lpp-orifice; ~5.7 KB gz, lazy-loaded, not in the home-view payload, current + ~22% headroom)
  "calc-service.js": 18500, // spec-v230..v232 2026-06-30 (13000->18500): +3 electrical energy-cost-savings tiles (vfd-energy-savings, lighting-retrofit-savings, power-factor-billing-savings) -> ~15.2 KB gz (82.1%); current + ~22% headroom; lazy-loaded, not in the home-view payload // v180/v181 2026-06-24 (10500->13000): +2 electrician second-pass tiles (commercial-lighting-load, noncoincident-load) take the module to ~11.4 KB gz (87.6%); current + ~12% headroom // v167..v169 2026-06-24 (8000->10500): +3 dwelling demand-factor tiles (range-demand-220-55, dryer-demand-220-54, neutral-demand-220-61) take the module to ~9.7 KB gz; current + ~8% headroom // v78 2026-06-15 new post-rough-in service bench split out of calc-plumbing.js (4 tiles: gas-appliance-demand, tpr-discharge, pipe-support-spacing, softener-sizing; ~6.9 KB gz, lazy-loaded, fits with headroom)
  "calc-drainage.js": 9000, // spec-v426..v427 drainage trio 2026-07-04 (6000->9000): +2 Group B tiles (overflow-scupper-sizing, sewage-force-main-velocity) -> ~4.5 KB raw (74.6%); headroom; lazy-loaded // // v73 2026-06-15 new storm-drainage bench split out of calc-plumbing.js (2 tiles: roof-drain-sizing, sump-basin-sizing; ~4.5 KB gz, lazy-loaded, fits with headroom)
  "calc-gas.js": 8500, // v111 2026-06-20 (5500->8500): +2 fuel-gas tiles (gas-altitude-derate, gas-fuel-conversion) take the bench to 5 tiles (~6.8 KB gz, lazy-loaded, not in the home-view payload, current + ~20% headroom) // v42 2026-06-11 new fuel-gas bench split out of calc-plumbing.js (3 tiles: gas-pipe-sizing, gas-leak-rate, gas-pipe-pressure-drop; ~4.4 KB gz, fits with headroom)
  "calc-rigging.js": 24000, // spec-v615 2026-07-10 (21000->24000): three-point-bridle pushed the module to ~21.9 KB gz (104.1% of the old cap); +~10% headroom. (21000) spec-v544..v545 Group Z batch (bridle-leg-tension, winch-drum-line-pull) (18000) // spec-v117 2026-06-20 (15000->18000): +2 tiles (multi-leg-sling, wire-rope-strength) -> ~15.0 KB gz (99.8%); +~20% headroom. v66 2026-06-13 (9000->15000): Group Z complete at 13 tiles (v65 lift-planning core + v66 hardware/below-the-hook); built ~13.3 KB gz; split to calc-heavylift.js authorized per spec-v66 if it grows further
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
  "calc-hvac.js": 74000, // spec-v441..v443 energy-recovery/hydronic/economizer 2026-07-04 (68000->74000): the campaign HVAC trios (v375-377, v384, v387, v408, v441-443) took calc-hvac to ~63 KB raw (92.6%); +headroom for the remaining HVAC batches (v459-461); lazy-loaded, not in home-view // spec-v375..v377 psychrometric coil trio 2026-07-03 (62000->68000): +3 tiles (moist-air-enthalpy, cooling-coil-total-load, coil-bypass-factor) -> ~58.1 KB raw (93.7% of the old cap); headroom for the remaining HVAC trios in the v375..v474 backlog; lazy-loaded, not in the home-view payload // spec-v275..v331 campaign 2026-07-03 (55000->62000): +9 tiles across the ventilation, pump-fluid, and building-energy trios -> ~52.5 KB gz (84.7%); current + ~15% headroom; lazy-loaded, not in the home-view payload // spec-v233..v235 + v239..v241 2026-06-30 (43500->55000): +6 tiles (heat-pump-seasonal-energy, dual-fuel-balance-point, heat-pump-cold-capacity, air-leak-cost, compressed-air-power, air-pressure-setpoint-savings) -> ~45.4 KB gz (82.5%); current + ~21% headroom; lazy-loaded, not in the home-view payload // v99 2026-06-18 (41000->43500): +2 building-envelope tiles (assembly-r-value, blown-insulation-coverage); built ~40.4 KB gz // v89 2026-06-17 (was 47000 at 94.3%): the refrigerant-circuit bench (refrigerant-pt, superheat-subcool, compare-refrigerants, refrigerant-charge, refrigerant-charging) relocated to calc-refrigerant.js, lowering this to ~38.2 KB gz; lowered cap locks in the freed space (~93.1%); v81 2026-06-16 (was 60000 at 94.9%): spec-v16 first-principles HVAC engineering batch (chiller-tons, hx-lmtd-ntu, air-changes-hour, boiler-pipe-sizing, compressor-short-cycle, humidifier-capacity, filter-pressure-drop) relocated to calc-hvacsystems.js (56.9->44.0 KB gz), lowered cap locks in the freed space (~93.6%); v74 2026-06-15 (was 61000 at 95.9%): v23 velocity bench relocated to calc-velocity.js; v20 2026-06-06 (57000->61000)
  "calc-refrigerant.js": 16500, // spec-v432..v434 walk-in refrigeration trio 2026-07-04 (13000->16500): +3 Group C tiles (walk-in-cooler-load, product-pull-down-load, evaporator-td-dtd) -> ~10.9 KB raw (83.8%); headroom; lazy-loaded // // spec-v320..v322 2026-07-03 (9800->13000): +3 refrigeration-cycle tiles (refrigerant-mass-flow, refrigeration-cop, condenser-heat-rejection) -> ~10.9 KB gz (83.8%); current + ~19% headroom; lazy-loaded, not in home-view payload
  "calc-hvacsystems.js": 23000, // spec-v409..v410 duct-design 2026-07-04 (19000->23000): +2 Group C tiles (coil-face-velocity, vav-box-airflow) -> ~17.3 KB raw (90.9% of the old cap); headroom for backlog; lazy-loaded // spec-v227..v229 2026-06-30 (16500->19000): +3 cooling-load-components tiles (window-solar-heat-gain, internal-heat-gains, envelope-conduction-load) -> ~16.9 KB gz (88.8%); current + ~10% headroom; lazy-loaded, not in the home-view payload // v81 2026-06-16 new building-systems HVAC engineering bench split out of calc-hvac.js (7 spec-v16 tiles: chiller-tons, hx-lmtd-ntu, air-changes-hour, boiler-pipe-sizing, compressor-short-cycle, humidifier-capacity, filter-pressure-drop; ~14.7 KB gz, lazy-loaded, fits with headroom)
  "calc-velocity.js": 4000, // v74 2026-06-15 new velocity bench split out of calc-hvac.js (2 tiles: duct-velocity-pressure, refrigerant-velocity; ~2.7 KB gz, lazy-loaded, fits with headroom)
  // Bumped 37000 -> 48000 on 2026-06-01 (current + ~20% headroom rule) when the
  // spec-v15 Group E close added the E.7 header-sizing and E.8 deck-beam-post
  // tiles (built-up-member search, NDS column check, ledger schedule), taking
  // the built module to ~40 KB gzipped. Per spec-v10 §H.1 the per-tile split
  // stays the preferred long-term remediation once it brushes the new cap.
  "calc-construction.js": 132000, // spec-v480+v481 2026-07-08 (110000->132000): the seismic-overturning-moment (ASCE 7 12.8.5) and stair-code-check (IBC 1011) tiles brought the module to ~110.6 KB gz, at the old 110000 cap; +~20% headroom (a module split is the eventual preferred fix for this shared Group E module). spec-v341..v343 2026-07-03 (95000->110000): +3 Group E structural-mechanics tiles (cantilever-beam, section-properties, combined-stress-axial-bending) -> ~90.0 KB gz (97% of the old cap); +~20% headroom for the campaign's remaining construction batches (v359-v361). spec-v242..v247 + v251..v253 2026-07-02 (75500->95000): +9 Group E tiles (IBC/IPC occupancy trio, cast-in-place concrete trio, IBC plan-review trio) -> ~79.0 KB gz; current + ~20% headroom. spec-v113 2026-06-20 (65000->75500): +1 guard-handrail-check tile -> ~62.7 KB gz (96.4%); +~20% headroom. v94+v96 2026-06-18 (62000->65000): +4 tiles (fence-estimate, post-hole-concrete, control-joint-spacing, rebar-lap-splice); built ~61.4 KB gz // v80 2026-06-16 (was 66000 at 95.0%): v25 site-civil bench (horizontal-curve, vertical-curve, earthwork-end-area, slope-stake-cut-fill) relocated to calc-civil.js (62.7->57.9 KB gz), lowered cap locks in the freed space (~93.3%); v70 2026-06-15 (70000->66000): 5 spec-v67 earthwork tiles relocated to calc-earthwork.js (68.3->62.7 KB). Prior: v69 (67000->70000) +2 coatings; v67 (64000->67000) +5 earthwork
  "calc-finish.js": 8500, // v95 2026-06-18 new finish-and-site-carpentry take-off module (6 tiles: thinset-coverage, flooring-takeoff, paver-patio, retaining-wall-block, attic-ventilation, gutter-downspout; ~6.8 KB gz, lazy-loaded, not in the home-view payload, current + ~20% headroom)
  "calc-elecdesign.js": 11000, // spec-v558 step-touch-voltage (8500) // spec-v365..v367 2026-07-03 (5000->8500): +3 Group A lighting light-loss/compliance tiles (lighting-light-loss-factor, lighting-uniformity-ratio, egress-lighting-check) -> ~6.7 KB gz; current + ~20% headroom. v101 2026-06-19 new electrician design/layout bench split out of calc-electrical.js (2 tiles: pull-box-sizing, lumen-method; ~2 KB gz, lazy-loaded, not in the home-view payload, current + ~20% headroom)
  "calc-hvacservice.js": 21000, // spec-v652 gas-meter-clock-target 2026-07-13 (19000->21000): the meter-clock inverse tile took the built module to ~19.2 KB gz (100.8% of the old cap); cap = current + ~9% headroom; lazy-loaded, not in the home-view payload // spec-v583..v585 2026-07-10 (15500->19000): +3 combustion/venting bench tiles (excess-air-o2, co-air-free, chimney-draft) -> ~15.9 KB gz (83.7%); +~19% headroom; lazy-loaded, not in the home-view payload. spec-v386 outside-air-percent-temps 2026-07-03 (13000->15500): +1 field-methods tile (outside-air-percent-temps) -> ~12.2 KB raw (94.2% of the old cap); headroom for the remaining HVAC field-check tiles in the v375..v474 backlog; lazy-loaded, not in the home-view payload // spec-v218..v220 2026-06-30 (11500->13000): +3 residential air-tightness/ventilation tiles (blower-door-ach50, ashrae-622-ventilation, infiltration-load) -> ~11.5 KB gz (88.6%); current + ~13% headroom; lazy-loaded, not in the home-view payload // v110 2026-06-20 9000->11500: +2 gas-heat start-up tiles (gas-meter-clock, furnace-temp-rise) take the bench to 8 tiles (~9.2 KB gz, lazy-loaded, not in the home-view payload, current + ~20% headroom) // v105 2026-06-20 6500->9000: +2 evacuation/leak-check tiles (vacuum-decay-test, nitrogen-pressure-test) take the bench to 6 tiles (~7.5 KB gz, lazy-loaded, not in the home-view payload, current + ~20% headroom) [v104 4000->6500]
  "calc-disinfect.js": 4000, // v103 2026-06-19 new pipe/well disinfection bench split out of calc-plumbing.js (2 tiles: main-disinfection-chlorine, well-shock-chlorination; ~2 KB gz, lazy-loaded, not in the home-view payload, current + ~20% headroom)
  "calc-civil.js": 11000, // spec-v335..v337 2026-07-03 (8000->11000): +3 Group E roadway geometric-design tiles (superelevation, vertical-curve-sight-distance, horizontal-sightline-offset) -> ~9.0 KB gz; current + ~20% headroom. v80 2026-06-16 new site-civil / roadway-geometry bench split out of calc-construction.js (4 tiles: horizontal-curve, vertical-curve, earthwork-end-area, slope-stake-cut-fill; ~6.6 KB gz, lazy-loaded, fits with headroom)
  "calc-steel.js": 24000, // spec-v603 doubler-plate sizer 2026-07-10 (21000->24000): +1 Group E tile (steel-doubler-plate) -> ~21.0 KB gz (102.4% of the old cap); raised to ~24 KB with headroom for the v555-named high-axial branch; lazy-loaded, not in home-view payload // spec-v411..v413 composite-beam trio 2026-07-04 (16500->21000): +3 Group E tiles (shear-stud-strength, composite-beam-flexure, steel-camber) -> ~15.8 KB raw (95.5% of the old cap); headroom for backlog; lazy-loaded // // spec-v293..v295 2026-07-03 (13000->16500): +3 connection/detailing tiles (steel-web-local-strength, steel-bolt-slip-critical, steel-fillet-weld-size) -> ~13.3 KB gz (80.5%); current + ~24% headroom; lazy-loaded, not in home-view payload // spec-v281..v283 2026-07-03 (9000->13000): +3 members-and-connections depth tiles (steel-beam-ltb, steel-block-shear, steel-tension-member) -> ~10.6 KB gz (81.2%); current + ~23% headroom; lazy-loaded, not in home-view payload // spec-v254..v256 + v266..v268 2026-07-02 new AISC 360 steel member+connection bench (6 tiles; built ~7.1 KB gz)
  "calc-firesprinkler.js": 6000, // spec-v248..v250 2026-07-02 new NFPA 13/20 fire-sprinkler system-design bench split off beside calc-fire.js (3 tiles: fire-pump-curve, sprinkler-system-demand, sprinkler-head-layout; lazy-loaded, not in home-view payload; cap = current + ~25% headroom)
  "calc-concrete.js": 23000, // spec-v612 concrete-anchor-pullout 2026-07-10 (20000->23000): +1 Group E tile -> ~20.5 KB gz (102.3% of the old cap); raised to ~23 KB with headroom; lazy-loaded, not in home-view payload // spec-v548 concrete-anchor-breakout (17000) // spec-v378..v380 concrete material-properties trio 2026-07-03 (12500->17000): +3 tiles (concrete-elastic-modulus, concrete-modulus-of-rupture, concrete-shrinkage-temperature-steel) -> ~11.8 KB raw (94.2% of the old cap); headroom for the remaining calc-concrete tiles in the v375..v474 backlog (v393-395, v447); lazy-loaded, not in home-view payload // spec-v299..v301 2026-07-03 (9000->12500): +3 depth-2 tiles (rc-slab-min-thickness, rc-doubly-reinforced, rc-shear-friction) -> ~10.0 KB gz (80.2%); current + ~25% headroom; lazy-loaded, not in home-view payload // spec-v284..v286 2026-07-03 (6000->9000): +3 member depth tiles (rc-column-axial, rc-punching-shear, rc-hook-development) -> ~7.1 KB gz (78.4%); current + ~27% headroom; lazy-loaded, not in home-view payload // spec-v257..v259 2026-07-02 new ACI 318-19 reinforced-concrete member bench, the RC companion to calc-steel.js (3 tiles: rc-beam-flexure, rc-beam-shear, rc-development-length; built ~4.5 KB gz, lazy-loaded, not in home-view payload; cap = current + ~25% headroom)
  "calc-geotech.js": 18000, // spec-v624..v628 earth-pressure limit-state cluster 2026-07-11 (16500->18000): +5 Group E tiles (at-rest-earth-pressure, submerged-earth-pressure, sloped-backfill-earth-pressure, slope-stability-seepage, coulomb-earth-pressure) -> ~15.85 KB gz at v627 (96.1% of old cap); the Coulomb capstone tips it over, raised to ~18 KB with headroom; lazy-loaded, not in home-view payload // spec-v414..v416 settlement/foundation trio 2026-07-04 (13500->16500): +3 Group E tiles (consolidation-time-rate, spt-bearing-capacity, liquefaction-screening) -> ~10.4 KB raw (76.7%); headroom for backlog; lazy-loaded // // spec-v308..v310 2026-07-03 (10000->13500): +3 depth-2 tiles (soil-consolidation-settlement, footing-eccentric-pressure, boussinesq-surcharge-wall) -> ~10.4 KB gz (76.8%); current + ~30% headroom; lazy-loaded, not in home-view payload // spec-v287..v289 2026-07-03 (7000->10000): +3 foundation depth tiles (soil-settlement-elastic, pile-axial-capacity, slope-stability-infinite) -> ~8.0 KB gz (79.8%); current + ~25% headroom; lazy-loaded, not in home-view payload // spec-v260..v262 2026-07-02 new shallow-foundation / earth-retaining geotech bench (3 tiles: soil-bearing-capacity, lateral-earth-pressure, retaining-wall-stability; built ~5.4 KB gz, lazy-loaded, not in home-view payload; cap = current + ~25% headroom)
  "calc-masonry.js": 11000, // spec-v551 masonry-prism-fm 2026-07-12 (9000->11000): +1 Group E TMS 602 unit-strength f'm tile (the value the CMU wall bench consumes but none derived) -> ~9.56 KB gz (106.2% of the old cap); raised to 11 KB with ~15% headroom; lazy-loaded, not in home-view payload. spec-v368..v370 2026-07-03 (6500->9000): +3 Group E masonry-loads tiles (masonry-wall-weight, brick-veneer-anchor-spacing, masonry-lintel-loading) -> ~7.2 KB gz; current + ~20% headroom. spec-v269..v271 2026-07-02 new TMS 402-16 reinforced-masonry member bench (3 tiles: cmu-wall-flexure, cmu-shear-wall, cmu-wall-axial; built ~5.2 KB gz, lazy-loaded, not in home-view payload; cap = current + ~25% headroom)
  "calc-lateral.js": 6000, // spec-v272..v274 2026-07-02 new SDPWS wood lateral-system bench (3 tiles: diaphragm-shear, shearwall-overturning, shearwall-deflection; built ~4.6 KB gz, lazy-loaded, not in home-view payload; cap = current + ~25% headroom)
  "calc-earthwork.js": 12500, // spec-v326..v328 2026-07-03 (8500->12500): +3 soil characterization/QC tiles (relative-compaction, soil-phase-relations, atterberg-indices) -> ~9.8 KB gz (78.4%); current + ~27% headroom; lazy-loaded, not in home-view payload

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
  "calc-electrical.js": 78000, // spec-v494..v496 2026-07-09 (72000->78000): +3 Group A tiles (transformer-voltage-regulation, capacitor-discharge-time, asymmetrical-fault-xr) take the built copy to ~73.1 KB gz (101.5% of the old cap); cap = current + ~7% headroom; lazy-loaded, not in the home-view payload // spec-v471..v473 2026-07-04 (67000->72000): +3 energy-economics tiles (motor-efficiency-upgrade-savings, transformer-loading-efficiency, economic-conductor-sizing) take the module over the old cap; cap = current + ~7% headroom; lazy-loaded, not in the home-view payload // v179/v185/v186 2026-06-24 (63000->67000): +3 electrician second-pass tiles (motor-branch-protection, bends-between-pulls, shock-approach-boundary) take the module to ~64.1 KB gz (95.7%); current + ~4% headroom // v165/v170/v174/v176 2026-06-24 (60000->63000): +4 electrician-batch tiles (buck-boost-sizing, wireway-fill, rooftop-temp-adder, working-space-110-26) take the module to ~61.0 KB gz (96.9%); current + ~3% headroom // v129 2026-06-23: the spec-v121..v124 motor bench (motor-synchronous-speed-slip, motor-shaft-torque, motor-operating-cost, multi-motor-feeder) relocated to calc-motor.js, lowering this from 60031 B (100.1%, over) to ~56.9 KB gz (94.8%); cap held at 60000 (the 4-tile split freed ~3 KB; calc-electrical does not grow in the v129+ fab/restoration batches) // v109 2026-06-20 (52000->60000): +3 service grounding/bonding/inverse-VD tiles (grounding-electrode-conductor, bonding-jumper, min-conductor-for-vd) take the module to ~52.1 KB gz (~87%); current + ~15% headroom // v88 2026-06-17 (was 58000 at 94.7%): the solar-PV / battery-storage / EV-charging bench (pv-string-sizing, battery-runtime, pv-interconnection-busbar, off-grid-battery, ev-charger-load) relocated to calc-solar.js, lowering this to ~48.7 KB gz; lowered cap locks in the freed space (~93.7%); v79 2026-06-15 (was 62000 at 95.1%): v20 §A advanced-analysis bench (parallel-conductor-derate, neutral-current-3ph, motor-vd-starting) relocated to calc-powerquality.js (59.0->54.9 KB gz), lowered cap locks in the freed space (~94.7%); v72 2026-06-15 (was 64500 at 96.7%): v26 feeder/transformer-protection bench relocated to calc-feeder.js; v39 2026-06-11 (66000->64500): v24 conduit-bending suite relocated to calc-fab.js; v20 2026-06-06 (62500)
  "calc-solar.js": 26000, // spec-v647 pv-array-sizing 2026-07-13 (23000->26000): the PV-array-sizing inverse tile took the built module to ~23.3 KB gz (101.1% of the old cap); cap = current + ~12% headroom; lazy-loaded, not in the home-view payload // spec-v350..v352 2026-07-03 (18000->23000): +3 PV performance/protection tiles (pv-cell-temperature-power, pv-performance-ratio, pv-string-fusing) -> ~17.8 KB gz; current + ~20% headroom; lazy-loaded, not in the home-view payload // spec-v236..v238 2026-06-30 (14000->18000): +3 grid-tied battery-economics tiles (battery-tou-arbitrage, battery-peak-shaving, battery-c-rate) -> ~15.0 KB gz (83.5%); current + ~20% headroom; lazy-loaded, not in the home-view payload // spec-v221..v223 2026-06-30 (11500->14000): +3 PV system-design tiles (pv-energy-yield, pv-row-spacing, pv-inverter-ratio) -> ~12.2 KB gz (87.0%); current + ~12% headroom; lazy-loaded, not in the home-view payload // v182 2026-06-24 (10500->11500): +1 electrician second-pass tile (pv-circuit-ampacity) takes the module to ~9.9 KB gz (86.0%); current + ~14% headroom // v88 2026-06-17 new solar-PV / battery-storage / EV-charging electrification bench split out of calc-electrical.js (5 tiles: pv-string-sizing, battery-runtime, pv-interconnection-busbar, off-grid-battery, ev-charger-load; ~8.8 KB gz, lazy-loaded, not in the home-view payload)
  "calc-powerquality.js": 12000, // spec-v523/v524 2026-07-09 (9500->12000): +2 Group A tiles (harmonic-resonance, tdd-ieee-519) take the built copy over the old cap (was 97.4% at v523); cap = current + headroom; lazy-loaded, not in the home-view payload // v183/v184 2026-06-24 (6500->9500): +2 electrician second-pass tiles (transformer-k-factor, motor-capacitor-max) take the module to ~8.2 KB gz (86.7%); current + ~13% headroom // v79 2026-06-15 new advanced AC power-system analysis bench split out of calc-electrical.js (3 tiles: parallel-conductor-derate, neutral-current-3ph, motor-vd-starting; ~5.2 KB gz, lazy-loaded, fits with headroom)
  "calc-motor.js": 12000, // spec-v557 vfd-reflected-wave (10000) // spec-v499/v521 2026-07-09 (7500->10000): +2 Group A tiles (motor-locked-rotor-kva, motor-fault-contribution) take the built copy over the old cap (was 95.7% at v499); cap = current + headroom; lazy-loaded, not in the home-view payload // spec-v278 2026-07-03 (6000->7500): +motor-overload-sizing took the built copy to 5775 B (96.3%); +~30% headroom. Lazy-loaded, absent from the home payload. // v129 2026-06-23 new motor analysis bench split out of calc-electrical.js to relieve its 100.1% cap (4 tiles: motor-synchronous-speed-slip, motor-shaft-torque, motor-operating-cost, multi-motor-feeder; ~4.7 KB gz)

  // Worker and v5 platform.
  "manual-j-worker.js": 1500,
  "v5-platform.js": 6000,

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
  "calc-realestate.js": 48000, // spec-v402..v404 RE-investing 2026-07-04 (41000->48000): +3 Group X tiles (fix-flip-profit, brrrr-refi, rental-total-return) -> ~38.5 KB raw (93.8% of the old cap); headroom for remaining backlog; lazy-loaded, not in home-view payload // v20 2026-06-06 (35000)

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
  "citations.js": 410000, // spec-v639..v648 inverse-tile session 2026-07-13 (380000->410000): the 10 landed single-tile citation blocks this session (orifice/manning/channel/pump/steam/gas/consolidation/NER/PV/settlement inverses) took CITATIONS to ~380.1 KB gz (100.0% of the old cap); cap = current + ~8% headroom; lazy-loaded (prerendered into shells at build), NOT in the home-view payload // spec-v489..v588 campaign 2026-07-10 (360000->380000): the ~90+ landed single-tile citation blocks this campaign took CITATIONS past the 360000 cap (100.1%); +~5% headroom for the v588 tail; lazy-loaded (prerendered into shells at build), NOT in the home-view payload. spec-v375..v474 campaign 2026-07-04 (320000->360000): the ~50+ landed citation blocks this campaign took CITATIONS to ~298 KB raw (93.3%); +~12% headroom for the remaining backlog; lazy-loaded (prerendered into shells at build), NOT in the home-view payload // spec-v375..v474 campaign 2026-07-04 (285000->320000): the 30+ landed tiles this campaign grew CITATIONS past 285K raw; +~12% headroom for the remaining backlog; lazy-loaded (spec-v45 shells prerender from it at build), NOT in the home-view payload // spec-v335..v346 campaign 2026-07-03 (260000->285000): the roadway/farm/mechanics/RE landing trios pushed the registry to ~254.9 KB gz (100.4% of the old cap); current + ~10% headroom; lazy-loaded, not in home-view payload // spec-v275..v301 campaign 2026-07-03 (240000->260000): the depth-trio citations pushed the registry to 241.4 KB gz (100.6% of the old cap); current + ~7.5% headroom; lazy-loaded, not in home-view payload // spec-v248..v262 2026-07-02 (224000->240000): +9 citation entries across the fire-sprinkler / reinforced-concrete / geotechnical new-module trios -> ~224.4 KB (100.2% of old cap); cap = current + ~7% headroom; lazy-loaded, not in the home-view payload. Prior: spec-v230..v241 2026-06-30 (212000->224000): +12 citation entries (the energy-cost-savings / heat-pump / battery-economics / compressed-air batch) -> ~207.4 KB gz (92.6%); current + ~8% headroom // spec-v218..v229 2026-06-30 (200000->212000): +12 citation entries (the energy/structural/solar building-science batch) -> ~196.8 KB gz (92.8%); current + ~5% headroom // v105 2026-06-20 (192000->200000): +2 citation entries (vacuum-decay-test, nitrogen-pressure-test); built ~187.9 KB gz // v90-v100 2026-06-18 (187000->192000): +25 citation entries; built ~188.9 KB gz // v83-v85 2026-06-16 (182000->187000): +10 citation entries (3 septic, 3 sprayer, 4 welding); built ~180.4 KB; v67 2026-06-13 (178000->182000): v62-v67 added 24 citation entries (incl. the 13 Group Z rigging tiles and the 5 earthwork tiles); v20 2026-06-06 (133000)

  // v10 §B.1 limitation-banner shared component. The CANONICAL copy
  // registry grew with v12 Group U / V additions (vet + EMS tiles
  // all carry the spec-v12 §13.1 limitation banner). Bumped
  // 4000 -> 5500 B on 2026-05-12 to absorb the v12 entries; re-bumped
  // 5500 -> 7000 B on 2026-05-13 when the U / V second expansions
  // added another 6 canonical entries. Re-bumped 9500 -> 11500 B on
  // 2026-06-05 for the spec-v17 V.1 ideal-body-weight and V.3 corrected-qt
  // canonical copy (current + ~20% headroom rule).
  "limitation-banner.js": 11500,
  // v10 Phase D pure-functional resolvers. Bumped 2500 -> 7000 B on
  // 2026-07-10 for the spec-v589 deterministic NL ranking layer
  // (stopword set, synonym table, ranker, edit-distance fallback):
  // 5925 B as landed plus the ~20% headroom rule (the spec's 6000 B
  // estimate left under 2% headroom). Re-bumped 7000 -> 8500 B later on
  // 2026-07-10 for the spec-v591 quantity slot parser
  // (extractQuantities / mapSlots, 7053 B as landed + ~20% headroom).
  "search-discovery.js": 8500,
  // v10 Phase B.2 per-tile meta-object registry. Grows incrementally
  // toward full TOOLS coverage; cap raised in lockstep. Bumped from
  // 7000 -> 9000 B on 2026-05-18 (spec-v13 Phase E seed of 55
  // related-tiles entries), then 9000 -> 11000 B later the same day
  // (Phase E expansion to 206 entries). Dropped back to 7000 B the
  // same day when the RELATED registry was lifted out into
  // scripts/related-tiles.mjs (a build-time-only module the SPA
  // never sees); tile-meta.js no longer carries the editorial map
  // and so does not grow with it.
  "tile-meta.js": 16500, // spec-v489..v588 campaign 2026-07-10 (14500->16500): the single-tile landing campaign crossed 14500 at tile v576; +~13% headroom for the v577-v588 tail. // spec-v489..v588 campaign 2026-07-09 (13000->14500): the single-tile landing campaign (v489+) pushed the _TILES id/group table past 13K at tile 953; +~11% headroom for the remaining backlog; lazy-loaded, not in the home-view payload // spec-v275..v331 campaign 2026-07-03 (11000->13000): the 57 landed tiles pushed the _TILES id/group table to 11.0 KB gz (100.1% of the old cap); current + ~18% headroom; lazy-loaded, not in the home-view payload // spec-v248..v271 2026-07-02 (10000->11000): +12 _TILES rows across the four new-module trios tipped it to 100.1%; cap = current + ~10% headroom. Prior: spec-v112..v119 2026-06-20 (8800->10000): +11 _TILES rows tipped it to ~8828 B (100.3% of the old cap); cap = current + ~13% headroom; v83-v85 2026-06-16 (8000->8800): +10 _TILES rows (3 septic, 3 sprayer, 4 welding) tipped it to ~8085 B; v30 2026-06-09 bumped 7000 -> 8000: the _TILES [id, group] registry grows one row per tile (552 -> 555 tipped it to 7023 B); cap = current + ~14% headroom
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
