// 103 tiles say in their code that they are "the inverse of" another tile.
// An inverse that does not undo its forward tile gives a different answer
// depending on which way the user comes at the same question. This test
// finds every declared pair and runs the round trip: the forward tile on its
// worked example, its output into the inverse, and the inverse's answer back
// against the forward tile's input.
//
// Keys match by name, or after stripping a target_/max_/required_ prefix.
// FEED names the forward output an inverse input takes when the names differ.
// BACK names the forward input an inverse output lands on. SET fixes an
// inverse input the forward tile has no key for. The 19 pairs none of these
// connect are limit inverses, run the other way under REVERSE below; the
// floor keeps the forward count from falling by accident.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { COMPUTE_MAP, importCalc } from "../fixtures/compute-map.js";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..", "..");

const FEED = {
  "baseboard-output baseboard-length-for-load": { target_btuhr: "btu_total" },
  "battery-hydrogen-vent battery-vent-max-current": { available_cfm: "q_cfm" },
  "bearing-l10-life bearing-max-load": { target_life_hr: "l10_hr" },
  "boring-bar-deflection boring-bar-max-overhang": { allowable_deflection_in: "delta_in" },
  "coil-face-velocity coil-face-area": { target_fpm: "face_velocity_fpm" },
  "condenser-heat-rejection condenser-cop-for-heat-rejection": { target_thr: "thr_tons" },
  "countersink-depth countersink-diameter-from-depth": { plunge_depth_in: "z_in" },
  "drawbar-power drawbar-pull": { power_hp: "drawbar_hp" },
  "driveshaft-crit driveshaft-max-length": { target_rpm: "recommended_max_rpm" },
  "fan-motor-bhp fan-motor-max-airflow": { power_hp: "bhp" },
  "filter-loading filter-area-for-loading": { target_loading_gpm_ft2: "loading_gpm_per_ft2" },
  "grain-bin-capacity grain-bin-height-for-capacity": { target_bushels: "total_bushels" },
  "grease-trap grease-interceptor-flow-capacity": { interceptor_volume_gal: "volume_gal" },
  "groove-weld-strength groove-weld-length-for-load": { applied_load_lb: "capacity_lb" },
  "harmonic-resonance capacitor-bank-for-resonance-order": { target_resonant_order: "h_resonant" },
  "helical-pile helical-pile-torque": { target_capacity_lb: "allowable_lb" },
  "hydraulic-pump-horsepower hydraulic-drive-flow-limit": { drive_hp: "input_hp" },
  "lighting-beam lighting-throw-for-pool": { target_pool_diameter: "beam_diameter" },
  "masonry-anchor-bolt masonry-anchor-embedment": { required_tension_lb: "ba_lb" },
  "mean-piston-speed max-rpm-from-piston-speed": { mps_limit_fpm: "mps_fpm" },
  "moist-air-enthalpy drybulb-from-enthalpy": { enthalpy_btu: "h" },
  "motor-locked-rotor-kva motor-max-hp-for-starting-current": { max_starting_current_a: "lra_a" },
  "motor-operating-cost motor-run-hours-for-budget": { cost_budget_usd: "annual_cost" },
  "overflow-scupper-sizing scupper-width-for-flow": { required_gpm: "q_gpm" },
  "pile-axial-capacity pile-length-for-capacity": { qall_target_kip: "qall_kip" },
  "point-illuminance luminaire-height-for-illuminance": { target_fc: "e_fc" },
  "press-brake-tonnage press-brake-max-thickness": { available_tonnage_tons: "total_tons" },
  "product-pull-down-load product-pull-down-time": { capacity_btuh: "rate_btuh" },
  "punch-force punch-capacity": { capacity_tons: "force_tons" },
  "pv-cell-temperature-power pv-max-ambient-for-power": { target_power_W: "P_W" },
  "pv-row-spacing pv-row-shade-angle": { row_pitch_ft: "pitch_ft" },
  "rc-column-axial rc-column-steel-for-load": { target_load_kip: "phi_pn_kip" },
  "rc-slab-min-thickness rc-slab-max-span-for-thickness": { available_thickness_in: "hmin_in" },
  "screw-conveyor screw-conveyor-rpm": { target_ft3_hr: "capacity_ft3_hr" },
  "shaft-torsion shaft-diameter-for-torsion": { tau_allow_psi: "tau_psi" },
  "soil-settlement-elastic elastic-settlement-allowable-pressure": { settlement_limit_in: "se_in" },
  "spanline-sag-tension spanline-sag-for-tension": { allowable_tension_lb: "support_tension_lb" },
  "spreader-beam spreader-beam-min-height": { sling_wll_lb: "top_sling_tension_lb" },
  "sprinkler-system-demand sprinkler-protection-area-for-supply": { available_supply_gpm: "total_gpm" },
  "spt-bearing-capacity spt-required-n60": { qa_target_ksf: "qa_ksf" },
  "standby-battery-sizing standby-battery-runtime": { battery_ah: "required_ah" },
  "steam-prv-napier steam-prv-area-for-capacity": { required_capacity_lb_hr: "steam_capacity_lb_hr" },
  "steel-camber steel-inertia-for-deflection": { allow_defl_in: "defl_in" },
  "stopping-sight-distance ssd-design-speed": { sight_distance_ft: "total_ssd_ft" },
  "stormwater-rational stormwater-max-drainage-area": { allowable_flow_cfs: "peak_flow_cfs" },
  "thermal-stress-restrained thermal-stress-max-deltat": { allowable_stress_psi: "sigma_psi" },
  "trunk-decay-strength trunk-min-shell-thickness": { allow_loss_pct: "loss_pct" },
  "turbo-pressure-ratio turbo-max-boost-for-charge-temp": { max_charge_temp_f: "t_out_f" },
  "turning-surface-finish feed-for-surface-finish": { target_finish_uin: "ra_uin" },
  "wind-chill wind-chill-wind-speed": { target_wc_F: "wind_chill_F" },
  "wind-pressure wind-speed-from-velocity-pressure": { velocity_pressure_psf: "q_psf" },
  "wire-rope-strength wire-rope-diameter-for-wll": { wll_required_tons: "wll_tons" },
};

const BACK = {
  "boring-bar-deflection boring-bar-max-overhang": { max_overhang_in: "l_in" },
  "chimney-draft chimney-height-for-draft": { required_height_ft: "stack_height_ft" },
  "clarifier-surface-loading clarifier-area-for-loading": { required_area_ft2: "surface_ft2" },
  "crouch-planing-speed crouch-hp-for-speed": { required_hp: "shaft_hp" },
  "filter-loading filter-area-for-loading": { required_area_ft2: "filter_area_ft2" },
  "mean-piston-speed max-rpm-from-piston-speed": { rpm_max: "rpm" },
  "overflow-scupper-sizing scupper-width-for-flow": { width_suppressed_in: "length_in" },
  "pool-heater-btu pool-heater-size": { required_output_btu: "output" },
  "pv-cell-temperature-power pv-max-ambient-for-power": { max_ambient_C: "T_amb_C" },
  "rc-column-axial rc-column-steel-for-load": { ast_required_in2: "ast_in2" },
  "rc-slab-min-thickness rc-slab-max-span-for-thickness": { max_span_ft: "l_ft" },
  "soil-settlement-elastic elastic-settlement-allowable-pressure": { allowable_pressure_ksf: "q_ksf" },
  "sprinkler-precip-rate sprinkler-gpm-for-precip": { required_gpm: "zone_gpm" },
  "sprinkler-system-demand sprinkler-protection-area-for-supply": { max_design_area_ft2: "design_area" },
  "spur-gear-geometry gear-identification": { pd: "diametral_pitch" },
  "steam-prv-napier steam-prv-area-for-capacity": { required_area_in2: "orifice_area_in2" },
  "trunk-decay-strength trunk-min-shell-thickness": { min_shell_in: "shell_thick_in" },
  "turning-surface-finish feed-for-surface-finish": { max_feed_ipr: "feed_ipr_in" },
  "well-drawdown well-max-yield": { max_yield_gpm: "discharge_gpm" },
  "wind-pressure wind-speed-from-velocity-pressure": { wind_speed_mph: "V_mph" },
};

const SET = {
  "drawbar-power drawbar-pull": { power_basis: "drawbar" },
};

// Every "inverse of <tile>" in a compute function's comment block or body.
function declaredPairs() {
  const fnToTile = {};
  for (const [id, v] of Object.entries(COMPUTE_MAP)) fnToTile[v.fn] = id;
  const pairs = new Set();
  for (const f of readdirSync(ROOT).filter((n) => /^calc-.*\.js$/.test(n))) {
    const lines = readFileSync(resolve(ROOT, f), "utf8").split("\n");
    let cur = null;
    lines.forEach((line, i) => {
      const m = line.match(/^export function (compute\w+)/);
      if (m) cur = m[1];
      else if (/^}/.test(line)) cur = null;
      for (const mm of line.matchAll(/inverse of (?:the )?([a-z][a-z0-9]+(?:-[a-z0-9]+)+)/g)) {
        let owner = cur;
        if (/^\s*\/\//.test(line)) {
          for (let j = i + 1; j < Math.min(lines.length, i + 8); j++) {
            const n = lines[j].match(/^export function (compute\w+)/);
            if (n) { owner = n[1]; break; }
          }
        }
        const inv = fnToTile[owner];
        if (inv && COMPUTE_MAP[mm[1]] && mm[1] !== inv) pairs.add(mm[1] + " " + inv);
      }
    });
  }
  return [...pairs].sort();
}

const rows = JSON.parse(readFileSync(resolve(ROOT, "test/fixtures/worked-examples.json"), "utf8")).rows;
const exampleFor = (id) => rows.find((r) => r.tile_id === id);
const strip = (k) => k.replace(/^(target|required|available|max|allowable|min|desired|design|known)_/, "");
const rel = (x, y) => Math.abs(x - y) / Math.max(Math.abs(x), Math.abs(y), 1e-12);

async function roundTrip(pair) {
  const [fwdId, invId] = pair.split(" ");
  const ef = exampleFor(fwdId), ei = exampleFor(invId);
  if (!ef || !ei) return { skipped: "no worked example" };
  const fwd = (await importCalc(COMPUTE_MAP[fwdId].module))[COMPUTE_MAP[fwdId].fn];
  const inv = (await importCalc(COMPUTE_MAP[invId].module))[COMPUTE_MAP[invId].fn];
  const ia = ef.inputs, oa = fwd(ia);
  if (!oa || oa.error) return { skipped: "forward example errors" };
  const ib = { ...ei.inputs }, feed = FEED[pair] || {};
  const fed = [], unfed = [];
  for (const k of Object.keys(ib)) {
    if (feed[k] && typeof oa[feed[k]] === "number") { ib[k] = oa[feed[k]]; fed.push(k); }
    else if (typeof oa[k] === "number" && !(k in ia)) { ib[k] = oa[k]; fed.push(k); }
    else if (strip(k) !== k && typeof oa[strip(k)] === "number") { ib[k] = oa[strip(k)]; fed.push(k); }
    else if (k in ia) ib[k] = ia[k];
    else if (typeof ib[k] === "number") unfed.push(k);
  }
  if (!fed.length || unfed.length) return { skipped: "no key connects the pair" };
  Object.assign(ib, SET[pair] || {});
  const ob = inv(ib);
  if (!ob || ob.error) return { failure: `inverse errors on the forward answer: ${ob && ob.error}` };
  const back = [];
  for (const [o, i] of Object.entries(BACK[pair] || {})) back.push([o, i]);
  for (const o of Object.keys(ob)) {
    if (typeof ob[o] !== "number") continue;
    if (typeof ia[o] === "number" && !(o in ib)) back.push([o, o]);
    else if (!(o in ia) && typeof ia[strip(o)] === "number") back.push([o, strip(o)]);
  }
  if (!back.length) return { skipped: "no output lands on a forward input" };
  const bad = back.filter(([o, i]) => !(typeof ob[o] === "number" && rel(ob[o], ia[i]) <= 1e-6));
  if (bad.length) return { failure: bad.map(([o, i]) => `${o} = ${ob[o]}, forward ${i} = ${ia[i]}`).join("; ") };
  return { ok: true };
}

test("every declared inverse tile undoes its forward tile on the worked example", async () => {
  const pairs = declaredPairs();
  assert.ok(pairs.length >= 100, `found only ${pairs.length} declared pairs`);
  const failures = [], skipped = [];
  let ok = 0;
  for (const p of pairs) {
    const r = await roundTrip(p);
    if (r.ok) ok++;
    else if (r.failure) failures.push(`${p}: ${r.failure}`);
    else skipped.push(`${p} (${r.skipped})`);
  }
  assert.deepEqual(failures, [], "an inverse tile does not undo its forward tile");
  // 84 of 103 round-trip on 2026-09-18. The rest need a key the two tiles do not share.
  assert.ok(ok >= 84, `only ${ok} pairs round-tripped; newly skipped? ${skipped.join(", ")}`);
});

test("every FEED, BACK and SET entry names a declared pair", () => {
  const pairs = new Set(declaredPairs());
  for (const map of [FEED, BACK, SET]) for (const p of Object.keys(map)) assert.ok(pairs.has(p), `${p} is not a declared pair`);
});

// Limit inverses solve for the input at which a forward margin reaches zero,
// and share few key names with the forward tile. These run the other way: the
// inverse on its own example, its answer set into the forward tile (whose
// remaining inputs come from the inverse's example where the names match),
// and the forward tile must land on the inverse's target.
// { set: { forwardInput: inverseOutput }, expect: { forwardOutput: inverseInput or inverseOutput }, tol? }
const REVERSE = {
  "block-redirect-load block-redirect-max-angle": { set: { direction_chg_deg: "max_angle_deg" }, expect: { resultant_lb: "block_wll_lb" } },
  "coil-face-velocity coil-face-area": { set: { face_width_in: "square_side_in", face_height_in: "square_side_in" }, expect: { face_velocity_fpm: "target_fpm" } },
  "combustion-air combustion-air-max-input": { set: { btu_input: "max_btu_input" }, expect: { required_volume_ft3: "room_volume_ft3" } },
  "conduit-thermal-expansion conduit-expansion-max-run": { set: { run_length_ft: "max_run_ft" }, expect: { delta_l_in: "trigger_in" } },
  "fiber-loss-budget fiber-max-length": { set: { length_m: "max_length_m" }, expect: { total_loss_db: "max_channel_loss_db" } },
  "ground-potential-rise max-grid-resistance-for-touch": { set: { grid_resistance_ohm: "max_grid_resistance_ohm" }, expect: { gpr_v: "tolerable_touch_v" } },
  "hoop-stress-thin-wall hoop-stress-mawp": { set: { P_psi: "p_max_psi" }, expect: { sigma_h_psi: "S_allow" } },
  "hull-speed waterline-for-hull-speed": { set: { lwl_ft: "waterline_length_ft" }, expect: { hull_speed_kn: "target_hull_speed_kn" } },
  "led-tape-run led-tape-max-run": { set: { run_length_ft: "max_run_ft" }, expect: { drop_pct: "drop_tolerance_pct" } },
  "point-illuminance point-method-required-candela": { set: { intensity_cd: "required_cd" }, expect: { e_fc: "target_illuminance" } },
  "projector-brightness projector-max-screen-size": { set: { screen_w_ft: "max_width_ft", screen_h_ft: "max_height_ft" }, expect: { required_lumens: "available_lumens" } },
  "reineke-sdi thinning-target-tpa": { set: { trees_per_acre: "tpa_target" }, expect: { percent_max: "target_pct" } },
  "room-acoustics room-absorption-target": { set: { total_sabins: "required_sabins" }, expect: { rt60_s: "target_rt60_s" } },
  "septic-drainfield septic-drainfield-capacity": { set: { design_flow_gpd: "design_flow_gpd" }, expect: { trench_feet: "available_trench_ft" } },
  "steam-pipe-velocity steam-pipe-capacity": { set: { steam_flow_lbhr: "capacity_lbhr" }, expect: { req_area_in2: "area_in2" } },
  "taper-calc taper-diameter": { set: { large_dia_in: "large_dia_in", small_dia_in: "small_dia_in" }, expect: { tpf_in: "taper_per_foot" } },
  "two-stroke-mix two-stroke-mix-ratio-check": { set: { ratio: "ratio" }, expect: { oil_oz: "oil_amount" } },
  // The forward tile computes 12 AWG from the AWG formula (6,529.9 cmil); the
  // inverse's example enters NEC Chapter 9 Table 8's printed 6,530. 8 ppm.
  "voltage-drop max-circuit-length-for-vd": { set: { length_ft: "max_length_ft", awg: "12", source_voltage_V: "source_voltage_v", current_A: "current_a" }, expect: { percent: "target_vd_pct" }, tol: 2e-5 },
  "voltage-drop min-conductor-for-vd": { set: { awg: "min_awg_copper" }, expect: { percent: "resulting_percent" } },
};

async function reverseTrip(pair) {
  const [fwdId, invId] = pair.split(" ");
  const spec = REVERSE[pair];
  const ef = exampleFor(fwdId), ei = exampleFor(invId);
  const fwd = (await importCalc(COMPUTE_MAP[fwdId].module))[COMPUTE_MAP[fwdId].fn];
  const inv = (await importCalc(COMPUTE_MAP[invId].module))[COMPUTE_MAP[invId].fn];
  const ib = ei.inputs, ob = inv(ib);
  if (!ob || ob.error) return `inverse example errors: ${ob && ob.error}`;
  const pick = (k) => (k in ob ? ob[k] : k in ib ? ib[k] : k);
  const ia = { ...ef.inputs };
  for (const k of Object.keys(ia)) if (k in ib) ia[k] = ib[k];
  for (const [k, from] of Object.entries(spec.set)) ia[k] = pick(from);
  const oa = fwd(ia);
  if (!oa || oa.error) return `forward errors on the inverse answer: ${oa && oa.error}`;
  const bad = Object.entries(spec.expect).filter(([o, from]) => !(typeof oa[o] === "number" && rel(oa[o], Number(pick(from))) <= (spec.tol || 1e-6)));
  return bad.map(([o, from]) => `${o} = ${oa[o]}, inverse ${from} = ${pick(from)}`).join("; ");
}

test("every limit inverse puts its forward tile exactly at the limit", async () => {
  const pairs = new Set(declaredPairs());
  const failures = [];
  for (const p of Object.keys(REVERSE)) {
    assert.ok(pairs.has(p), `${p} is not a declared pair`);
    const msg = await reverseTrip(p);
    if (msg) failures.push(`${p}: ${msg}`);
  }
  assert.deepEqual(failures, []);
});
