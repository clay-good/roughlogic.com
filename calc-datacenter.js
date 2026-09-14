// Group A/C: data-center and mission-critical facilities.
// spec-v1800..v1808 cover facility energy, rack airflow, UPS redundancy,
// computer-room cooling capacity, containment, PDU branches, chilled-water
// ride-through, server inlet conditions, and raised-floor tile delivery.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

const HOURS_PER_YEAR = 8760;
const BTU_H_PER_KW = 3412;

const _finiteGuard = (o) => {
  if (o && typeof o === "object" && !Array.isArray(o)) {
    for (const value of Object.values(o)) {
      if (typeof value === "number" && !Number.isFinite(value)) {
        return { error: "All numeric inputs must be finite numbers." };
      }
    }
  }
  return null;
};

function _simpleRenderer(spec) {
  const render = function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    const fields = {};
    for (const f of spec.fields) {
      const field = f.kind === "select"
        ? makeSelect(f.label, f.id || f.key, f.options)
        : makeNumber(f.label, f.id || f.key, f.attrs || { step: "any", min: "0" });
      fields[f.key] = field;
      if (f.default !== undefined) field[f.kind === "select" ? "select" : "input"].value = String(f.default);
      inputRegion.appendChild(field.wrap);
    }
    const outs = {};
    for (const o of spec.outputs) outs[o.key] = makeOutputLine(outputRegion, o.label, o.id);
    function update() {
      const params = {};
      for (const f of spec.fields) {
        const el = fields[f.key][f.kind === "select" ? "select" : "input"];
        params[f.key] = f.kind === "select" ? el.value : Number(el.value) || 0;
      }
      const result = spec.compute(params);
      if (result.error) {
        for (const out of Object.values(outs)) out.textContent = "-";
        outs[spec.outputs[0].key].textContent = result.error;
        return;
      }
      for (const o of spec.outputs) outs[o.key].textContent = o.value(result);
    }
    const debounced = debounce(update, DEBOUNCE_MS);
    for (const f of spec.fields) {
      fields[f.key][f.kind === "select" ? "select" : "input"].addEventListener("input", debounced);
    }
    attachExampleButton(inputRegion, () => {
      for (const f of spec.fields) {
        if (spec.example[f.key] !== undefined) fields[f.key][f.kind === "select" ? "select" : "input"].value = String(spec.example[f.key]);
      }
      update();
    });
  };
  render.schema = {
    inputs: spec.fields.map((f) => ({
      key: f.key, label: f.label, kind: f.kind || "number",
      options: f.options || null, default: f.default ?? null, attrs: f.attrs ?? null,
    })),
    outputs: spec.outputs.map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation,
    scope: spec.scope ?? null,
  };
  return render;
}

export const DATACENTER_RENDERERS = {};

// ===================== spec-v1800: PUE =====================

// dims: in { it_load_kw: L^2 M T^-3, cooling_kw: L^2 M T^-3, ups_loss_kw: L^2 M T^-3, miscellaneous_kw: L^2 M T^-3, tariff_per_kwh: dimensionless, target_pue: dimensionless, reduced_it_kw: L^2 M T^-3, reduced_cooling_kw: L^2 M T^-3, reduced_ups_loss_kw: L^2 M T^-3 } out: { total_facility_kw: L^2 M T^-3, pue: dimensionless, dcie_pct: dimensionless, annual_energy_kwh: L^2 M T^-2, annual_cost: dimensionless }
export function computeDatacenterPue({ it_load_kw = 0, cooling_kw = 0, ups_loss_kw = 0, miscellaneous_kw = 0, tariff_per_kwh = 0, target_pue = 0, reduced_it_kw = 0, reduced_cooling_kw = 0, reduced_ups_loss_kw = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(it_load_kw > 0) || !(tariff_per_kwh > 0)) return { error: "IT load and electricity tariff must be positive." };
  if (![cooling_kw, ups_loss_kw, miscellaneous_kw].every((v) => v >= 0)) return { error: "Facility overhead loads cannot be negative." };
  if (!(target_pue >= 1)) return { error: "Target PUE must be at least 1.0." };
  if (!(reduced_it_kw > 0) || ![reduced_cooling_kw, reduced_ups_loss_kw].every((v) => v >= 0)) return { error: "The reduced-load case must have positive IT load and nonnegative overhead." };
  const total_facility_kw = it_load_kw + cooling_kw + ups_loss_kw + miscellaneous_kw;
  const overhead_kw = total_facility_kw - it_load_kw;
  const annual_energy_kwh = total_facility_kw * HOURS_PER_YEAR;
  const annual_cost = annual_energy_kwh * tariff_per_kwh;
  const target_total_kw = it_load_kw * target_pue;
  const target_annual_energy_kwh = target_total_kw * HOURS_PER_YEAR;
  const target_annual_cost = target_annual_energy_kwh * tariff_per_kwh;
  const reduced_total_kw = reduced_it_kw + reduced_cooling_kw + reduced_ups_loss_kw + miscellaneous_kw;
  const reduced_annual_energy_kwh = reduced_total_kw * HOURS_PER_YEAR;
  const reduced_annual_cost = reduced_annual_energy_kwh * tariff_per_kwh;
  return {
    total_facility_kw, pue: total_facility_kw / it_load_kw,
    dcie_pct: 100 * it_load_kw / total_facility_kw,
    overhead_kw, overhead_pct_of_it: 100 * overhead_kw / it_load_kw,
    annual_energy_kwh, annual_cost, target_total_kw,
    target_annual_energy_kwh, target_annual_cost,
    target_annual_savings: annual_cost - target_annual_cost,
    reduced_total_kw, reduced_pue: reduced_total_kw / reduced_it_kw,
    reduced_annual_energy_kwh, reduced_annual_cost,
    reduced_energy_savings_pct: 100 * (annual_energy_kwh - reduced_annual_energy_kwh) / annual_energy_kwh,
    reduced_annual_savings: annual_cost - reduced_annual_cost,
    note: "PUE is an annual energy ratio only when both meters cover the same annual boundary. Report total energy beside it: reducing useful IT load can lower the building's energy while worsening the ratio. The Green Grid measurement category, site meters, and facility engineer govern.",
  };
}

const pueExample = { it_load_kw: 500, cooling_kw: 210, ups_loss_kw: 35, miscellaneous_kw: 15, tariff_per_kwh: 0.1, target_pue: 1.3, reduced_it_kw: 400, reduced_cooling_kw: 175, reduced_ups_loss_kw: 30 };
DATACENTER_RENDERERS["datacenter-pue"] = _simpleRenderer({
  citation: "Citation: The Green Grid PUE definition, total facility energy divided by IT equipment energy, and reciprocal DCiE. Use the same measurement boundary and an annual period; the site's metering and measurement category govern.",
  example: pueExample,
  fields: [
    { key: "it_load_kw", label: "IT equipment load (kW)" },
    { key: "cooling_kw", label: "Cooling, pumps, and fans (kW)" },
    { key: "ups_loss_kw", label: "UPS and distribution losses (kW)" },
    { key: "miscellaneous_kw", label: "Lighting and building services (kW)" },
    { key: "tariff_per_kwh", label: "Electricity tariff ($/kWh)" },
    { key: "target_pue", label: "Target PUE", default: 1.3, attrs: { step: "any", min: "1" } },
    { key: "reduced_it_kw", label: "Reduced-case IT load (kW)" },
    { key: "reduced_cooling_kw", label: "Reduced-case cooling load (kW)" },
    { key: "reduced_ups_loss_kw", label: "Reduced-case UPS losses (kW)" },
  ],
  outputs: [
    { key: "total_facility_kw", id: "dcp-total", label: "Total facility load", unit: "kW", value: (r) => fmt(r.total_facility_kw, 1) + " kW" },
    { key: "pue", id: "dcp-pue", label: "PUE / DCiE", value: (r) => fmt(r.pue, 3) + " / " + fmt(r.dcie_pct, 1) + " %" },
    { key: "overhead_kw", id: "dcp-over", label: "Facility overhead", unit: "kW", value: (r) => fmt(r.overhead_kw, 1) + " kW (" + fmt(r.overhead_pct_of_it, 1) + " % of IT)" },
    { key: "annual_energy_kwh", id: "dcp-energy", label: "Annual facility energy", unit: "kWh", value: (r) => fmt(r.annual_energy_kwh, 0) + " kWh" },
    { key: "annual_cost", id: "dcp-cost", label: "Annual facility cost", unit: "$", value: (r) => "$" + fmt(r.annual_cost, 0) },
    { key: "target_annual_cost", id: "dcp-target", label: "At target PUE", unit: "$", value: (r) => fmt(r.target_total_kw, 1) + " kW; $" + fmt(r.target_annual_cost, 0) + "/yr; save $" + fmt(r.target_annual_savings, 0) },
    { key: "reduced_pue", id: "dcp-reduced", label: "Reduced IT-load case", value: (r) => "PUE " + fmt(r.reduced_pue, 3) + "; " + fmt(r.reduced_total_kw, 1) + " kW; " + fmt(r.reduced_energy_savings_pct, 1) + " % less energy; save $" + fmt(r.reduced_annual_savings, 0) + "/yr" },
    { key: "note", id: "dcp-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeDatacenterPue,
});

// ===================== spec-v1801: rack airflow =====================

// dims: in { rack_load_kw: L^2 M T^-3, equipment_delta_t_f: T^1, standard_tile_cfm: L^3 T^-1, comparison_rack_kw: L^2 M T^-3, high_flow_tile_cfm: L^3 T^-1, alternative_delta_t_f: T^1 } out: { heat_btu_h: L^2 M T^-3, required_cfm: L^3 T^-1, cfm_per_kw: L M^-1 T^2, standard_tiles_required: dimensionless }
export function computeRackPowerDensityAirflow({ rack_load_kw = 0, equipment_delta_t_f = 0, standard_tile_cfm = 0, comparison_rack_kw = 0, high_flow_tile_cfm = 0, alternative_delta_t_f = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (![rack_load_kw, equipment_delta_t_f, standard_tile_cfm, comparison_rack_kw, high_flow_tile_cfm, alternative_delta_t_f].every((v) => v > 0)) return { error: "Loads, temperature rises, and tile delivery values must be positive." };
  const airflowAt = (kw, delta) => kw * BTU_H_PER_KW / (1.08 * delta);
  const heat_btu_h = rack_load_kw * BTU_H_PER_KW;
  const required_cfm = airflowAt(rack_load_kw, equipment_delta_t_f);
  const comparison_required_cfm = airflowAt(comparison_rack_kw, equipment_delta_t_f);
  const alternative_delta_t_cfm = airflowAt(comparison_rack_kw, alternative_delta_t_f);
  return {
    heat_btu_h, required_cfm, cfm_per_kw: required_cfm / rack_load_kw,
    standard_tiles_required: required_cfm / standard_tile_cfm,
    comparison_required_cfm,
    comparison_standard_tiles_required: comparison_required_cfm / standard_tile_cfm,
    comparison_high_flow_tiles_required: comparison_required_cfm / high_flow_tile_cfm,
    alternative_delta_t_cfm,
    alternative_airflow_reduction_pct: 100 * (comparison_required_cfm - alternative_delta_t_cfm) / comparison_required_cfm,
    note: "Every watt entering an air-cooled rack leaves as heat. The server fan's actual temperature rise fixes the required airflow; tile delivery comes from its measured curve at the surveyed plenum pressure. Equipment data and ASHRAE TC 9.9 limits govern.",
  };
}

const rackAirExample = { rack_load_kw: 8, equipment_delta_t_f: 20, standard_tile_cfm: 500, comparison_rack_kw: 15, high_flow_tile_cfm: 900, alternative_delta_t_f: 30 };
DATACENTER_RENDERERS["rack-power-density-airflow"] = _simpleRenderer({
  citation: "Citation: sensible heat Q = 1.08 x CFM x delta-T, with rack heat = electrical kW x 3,412 Btu/h. Equipment airflow data, measured tile delivery, and ASHRAE TC 9.9 inlet limits govern.",
  example: rackAirExample,
  fields: [
    { key: "rack_load_kw", label: "Rack load (kW)" },
    { key: "equipment_delta_t_f", label: "Temperature rise across equipment (deg F)" },
    { key: "standard_tile_cfm", label: "Standard tile delivery (cfm)" },
    { key: "comparison_rack_kw", label: "Higher-density rack load (kW)" },
    { key: "high_flow_tile_cfm", label: "High-flow tile delivery (cfm)" },
    { key: "alternative_delta_t_f", label: "Alternative temperature rise (deg F)" },
  ],
  outputs: [
    { key: "heat_btu_h", id: "rpa-heat", label: "Rack heat", unit: "Btu/h", value: (r) => fmt(r.heat_btu_h, 0) + " Btu/h" },
    { key: "required_cfm", id: "rpa-air", label: "Required rack airflow", unit: "cfm", value: (r) => fmt(r.required_cfm, 0) + " cfm (" + fmt(r.cfm_per_kw, 0) + " cfm/kW)" },
    { key: "standard_tiles_required", id: "rpa-tiles", label: "Standard tiles required", value: (r) => fmt(r.standard_tiles_required, 2) },
    { key: "comparison_required_cfm", id: "rpa-high", label: "Higher-density rack", value: (r) => fmt(r.comparison_required_cfm, 0) + " cfm; " + fmt(r.comparison_standard_tiles_required, 2) + " standard tiles" },
    { key: "comparison_high_flow_tiles_required", id: "rpa-hft", label: "With high-flow tiles", value: (r) => fmt(r.comparison_high_flow_tiles_required, 2) + " tiles" },
    { key: "alternative_delta_t_cfm", id: "rpa-alt", label: "Airflow at alternative rise", unit: "cfm", value: (r) => fmt(r.alternative_delta_t_cfm, 0) + " cfm (" + fmt(r.alternative_airflow_reduction_pct, 1) + " % less)" },
    { key: "note", id: "rpa-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeRackPowerDensityAirflow,
});

// ===================== spec-v1802: UPS redundancy =====================

// dims: in { it_load_kw: L^2 M T^-3, power_factor: dimensionless, module_rating_kva: L^2 M T^-3, n_plus_one_efficiency_pct: dimensionless, two_n_efficiency_pct: dimensionless, tariff_per_kwh: dimensionless, cooling_cop: dimensionless } out: { apparent_power_kva: L^2 M T^-3, required_modules: dimensionless, n_plus_one_loss_kw: L^2 M T^-3, annual_total_penalty_delta: dimensionless }
export function computeUpsModuleRedundancy({ it_load_kw = 0, power_factor = 0, module_rating_kva = 0, n_plus_one_efficiency_pct = 0, two_n_efficiency_pct = 0, tariff_per_kwh = 0, cooling_cop = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(it_load_kw > 0) || !(module_rating_kva > 0) || !(tariff_per_kwh > 0) || !(cooling_cop > 0)) return { error: "IT load, module rating, tariff, and cooling COP must be positive." };
  if (!(power_factor > 0 && power_factor <= 1)) return { error: "Power factor must be greater than 0 and no more than 1." };
  if (![n_plus_one_efficiency_pct, two_n_efficiency_pct].every((v) => v > 0 && v <= 100)) return { error: "UPS efficiencies must be greater than 0 and no more than 100 percent." };
  const apparent_power_kva = it_load_kw / power_factor;
  const required_modules = Math.ceil(apparent_power_kva / module_rating_kva);
  const n_plus_one_modules = required_modules + 1;
  const two_n_modules = 2 * required_modules;
  const n_plus_one_loss_kw = it_load_kw * (100 / n_plus_one_efficiency_pct - 1);
  const two_n_loss_kw = it_load_kw * (100 / two_n_efficiency_pct - 1);
  const loss_delta_kw = two_n_loss_kw - n_plus_one_loss_kw;
  const annual_metered_delta = loss_delta_kw * HOURS_PER_YEAR * tariff_per_kwh;
  const annual_cooling_delta = loss_delta_kw / cooling_cop * HOURS_PER_YEAR * tariff_per_kwh;
  return {
    apparent_power_kva, required_modules, n_plus_one_modules, two_n_modules,
    required_load_pct: 100 * apparent_power_kva / (required_modules * module_rating_kva),
    n_plus_one_load_pct: 100 * apparent_power_kva / (n_plus_one_modules * module_rating_kva),
    two_n_load_pct: 100 * apparent_power_kva / (two_n_modules * module_rating_kva),
    n_plus_one_loss_kw, two_n_loss_kw, loss_delta_kw,
    annual_metered_delta, annual_cooling_delta,
    annual_total_penalty_delta: annual_metered_delta + annual_cooling_delta,
    cooling_share_pct: 100 * annual_cooling_delta / (annual_metered_delta + annual_cooling_delta),
    note: "Redundancy lowers module load fraction, so use the manufacturer's efficiency at each actual fraction rather than a nameplate peak. Conversion loss is paid at the meter and again through the cooling plant; topology and facility availability requirements govern.",
  };
}

const upsExample = { it_load_kw: 500, power_factor: 0.9, module_rating_kva: 250, n_plus_one_efficiency_pct: 95.5, two_n_efficiency_pct: 94, tariff_per_kwh: 0.1, cooling_cop: 3 };
DATACENTER_RENDERERS["ups-module-redundancy"] = _simpleRenderer({
  citation: "Citation: apparent power kVA = kW / power factor; N is the ceiling of load/module rating, N+1 adds one module, and 2N duplicates required capacity. UPS loss = IT kW x (1/efficiency - 1); manufacturer efficiency curves and facility topology requirements govern.",
  example: upsExample,
  fields: [
    { key: "it_load_kw", label: "IT equipment load (kW)" },
    { key: "power_factor", label: "IT load power factor", attrs: { step: "any", min: "0", max: "1" } },
    { key: "module_rating_kva", label: "UPS module rating (kVA)" },
    { key: "n_plus_one_efficiency_pct", label: "N+1 efficiency (%)", attrs: { step: "any", min: "0", max: "100" } },
    { key: "two_n_efficiency_pct", label: "2N efficiency (%)", attrs: { step: "any", min: "0", max: "100" } },
    { key: "tariff_per_kwh", label: "Electricity tariff ($/kWh)" },
    { key: "cooling_cop", label: "Cooling plant COP" },
  ],
  outputs: [
    { key: "apparent_power_kva", id: "umr-kva", label: "Apparent power", unit: "kVA", value: (r) => fmt(r.apparent_power_kva, 1) + " kVA" },
    { key: "required_modules", id: "umr-mod", label: "Module counts", value: (r) => "N " + r.required_modules + "; N+1 " + r.n_plus_one_modules + "; 2N " + r.two_n_modules },
    { key: "required_load_pct", id: "umr-load", label: "Module load fractions", value: (r) => "N " + fmt(r.required_load_pct, 1) + " %; N+1 " + fmt(r.n_plus_one_load_pct, 1) + " %; 2N " + fmt(r.two_n_load_pct, 1) + " %" },
    { key: "n_plus_one_loss_kw", id: "umr-loss1", label: "N+1 conversion loss", unit: "kW", value: (r) => fmt(r.n_plus_one_loss_kw, 1) + " kW" },
    { key: "two_n_loss_kw", id: "umr-loss2", label: "2N conversion loss", unit: "kW", value: (r) => fmt(r.two_n_loss_kw, 1) + " kW (" + fmt(r.loss_delta_kw, 1) + " kW more)" },
    { key: "annual_metered_delta", id: "umr-meter", label: "Annual metered penalty", unit: "$", value: (r) => "$" + fmt(r.annual_metered_delta, 0) },
    { key: "annual_total_penalty_delta", id: "umr-total", label: "Annual 2N penalty including cooling", unit: "$", value: (r) => "$" + fmt(r.annual_total_penalty_delta, 0) + " (" + fmt(r.cooling_share_pct, 1) + " % cooling)" },
    { key: "note", id: "umr-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeUpsModuleRedundancy,
});

// ===================== spec-v1803: CRAC/CRAH sensible capacity =====================

// dims: in { airflow_cfm: L^3 T^-1, supply_temp_f: T^1, return_temp_f: T^1, contained_return_temp_f: T^1, bypass_return_temp_f: T^1 } out: { capacity_btu_h: L^2 M T^-3, capacity_tons: dimensionless, capacity_kw: L^2 M T^-3, contained_capacity_kw: L^2 M T^-3 }
export function computeCracSensibleDerate({ airflow_cfm = 0, supply_temp_f = 0, return_temp_f = 0, contained_return_temp_f = 0, bypass_return_temp_f = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(airflow_cfm > 0)) return { error: "Unit airflow must be positive." };
  if (![return_temp_f, contained_return_temp_f, bypass_return_temp_f].every((v) => v > supply_temp_f)) return { error: "Every return-air temperature must be above supply-air temperature." };
  const capacityAt = (returnF) => 1.08 * airflow_cfm * (returnF - supply_temp_f);
  const capacity_btu_h = capacityAt(return_temp_f);
  const contained_capacity_btu_h = capacityAt(contained_return_temp_f);
  const bypass_capacity_btu_h = capacityAt(bypass_return_temp_f);
  return {
    capacity_btu_h, capacity_tons: capacity_btu_h / 12000, capacity_kw: capacity_btu_h / BTU_H_PER_KW,
    contained_capacity_btu_h, contained_capacity_kw: contained_capacity_btu_h / BTU_H_PER_KW,
    contained_change_pct: 100 * (contained_capacity_btu_h - capacity_btu_h) / capacity_btu_h,
    bypass_capacity_btu_h, bypass_capacity_kw: bypass_capacity_btu_h / BTU_H_PER_KW,
    bypass_change_pct: 100 * (bypass_capacity_btu_h - capacity_btu_h) / capacity_btu_h,
    note: "The sensible relation describes the air side, not an unlimited coil. Containment raises return temperature and apparent capacity; bypass dilutes it. Manufacturer performance at the actual air and water conditions governs.",
  };
}

const cracExample = { airflow_cfm: 12000, supply_temp_f: 55, return_temp_f: 75, contained_return_temp_f: 85, bypass_return_temp_f: 68 };
DATACENTER_RENDERERS["crac-sensible-derate"] = _simpleRenderer({
  citation: "Citation: sensible capacity Q = 1.08 x CFM x (return deg F - supply deg F), evaluated at the manufacturer's stated rating condition. Unit performance data and ASHRAE TC 9.9 guidance govern.",
  example: cracExample,
  fields: [
    { key: "airflow_cfm", label: "Unit airflow (cfm)" },
    { key: "supply_temp_f", label: "Supply air temperature (deg F)" },
    { key: "return_temp_f", label: "Rated return air temperature (deg F)" },
    { key: "contained_return_temp_f", label: "Contained return air temperature (deg F)" },
    { key: "bypass_return_temp_f", label: "Bypassed return air temperature (deg F)" },
  ],
  outputs: [
    { key: "capacity_btu_h", id: "csd-base", label: "Rated-condition sensible capacity", unit: "Btu/h", value: (r) => fmt(r.capacity_btu_h, 0) + " Btu/h" },
    { key: "capacity_tons", id: "csd-tons", label: "Rated-condition tons / kW", value: (r) => fmt(r.capacity_tons, 1) + " tons / " + fmt(r.capacity_kw, 1) + " kW" },
    { key: "contained_capacity_kw", id: "csd-contained", label: "Contained-return capacity", unit: "kW", value: (r) => fmt(r.contained_capacity_kw, 1) + " kW (" + fmt(r.contained_change_pct, 1) + " %)" },
    { key: "bypass_capacity_kw", id: "csd-bypass", label: "Bypassed-return capacity", unit: "kW", value: (r) => fmt(r.bypass_capacity_kw, 1) + " kW (" + fmt(r.bypass_change_pct, 1) + " %)" },
    { key: "note", id: "csd-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeCracSensibleDerate,
});

// ===================== spec-v1804: containment bypass =====================

// dims: in { it_load_kw: L^2 M T^-3, equipment_delta_t_f: T^1, unit_count: dimensionless, airflow_per_unit_cfm: L^3 T^-1, supply_temp_f: T^1, exhaust_temp_f: T^1, fan_power_per_unit_kw: L^2 M T^-3, tariff_per_kwh: dimensionless } out: { it_airflow_cfm: L^3 T^-1, supply_airflow_cfm: L^3 T^-1, bypass_cfm: L^3 T^-1, return_temp_f: T^1, annual_fan_savings: dimensionless }
export function computeContainmentBypassAirflow({ it_load_kw = 0, equipment_delta_t_f = 0, unit_count = 0, airflow_per_unit_cfm = 0, supply_temp_f = 0, exhaust_temp_f = 0, fan_power_per_unit_kw = 0, tariff_per_kwh = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(it_load_kw > 0) || !(equipment_delta_t_f > 0) || !(unit_count > 0) || !(airflow_per_unit_cfm > 0) || !(tariff_per_kwh > 0)) return { error: "Load, temperature rise, unit count, airflow, and tariff must be positive." };
  if (!(exhaust_temp_f > supply_temp_f) || !(fan_power_per_unit_kw >= 0)) return { error: "Exhaust temperature must exceed supply temperature, and fan power cannot be negative." };
  const it_airflow_cfm = it_load_kw * BTU_H_PER_KW / (1.08 * equipment_delta_t_f);
  const supply_airflow_cfm = unit_count * airflow_per_unit_cfm;
  const bypass_cfm = Math.max(0, supply_airflow_cfm - it_airflow_cfm);
  const recirculation_cfm = Math.max(0, it_airflow_cfm - supply_airflow_cfm);
  const bypass_fraction_pct = 100 * bypass_cfm / supply_airflow_cfm;
  const return_temp_f = supply_airflow_cfm >= it_airflow_cfm
    ? (it_airflow_cfm * exhaust_temp_f + bypass_cfm * supply_temp_f) / supply_airflow_cfm
    : exhaust_temp_f;
  const heat_removed_btu_h = 1.08 * supply_airflow_cfm * (return_temp_f - supply_temp_f);
  const current_fan_power_kw = unit_count * fan_power_per_unit_kw;
  const matched_airflow_ratio = Math.min(1, it_airflow_cfm / supply_airflow_cfm);
  const matched_fan_power_kw = current_fan_power_kw * Math.pow(matched_airflow_ratio, 3);
  const fan_savings_kw = current_fan_power_kw - matched_fan_power_kw;
  const one_failed_supply_cfm = Math.max(0, unit_count - 1) * airflow_per_unit_cfm;
  const two_failed_supply_cfm = Math.max(0, unit_count - 2) * airflow_per_unit_cfm;
  return {
    it_airflow_cfm, supply_airflow_cfm, bypass_cfm, recirculation_cfm,
    bypass_fraction_pct, return_temp_f, heat_removed_btu_h,
    current_fan_power_kw, matched_fan_power_kw, fan_savings_kw,
    annual_fan_savings: fan_savings_kw * HOURS_PER_YEAR * tariff_per_kwh,
    one_failed_supply_cfm, one_failed_margin_cfm: one_failed_supply_cfm - it_airflow_cfm,
    one_failed_margin_pct: 100 * (one_failed_supply_cfm - it_airflow_cfm) / it_airflow_cfm,
    two_failed_supply_cfm, two_failed_margin_cfm: two_failed_supply_cfm - it_airflow_cfm,
    two_failed_margin_pct: 100 * (two_failed_supply_cfm - it_airflow_cfm) / it_airflow_cfm,
    note: "Bypass does not create extra cooling; it spends fan energy and failure margin while lowering return temperature. Whole-room averages can hide simultaneous local recirculation, so a rack-inlet survey and ASHRAE TC 9.9 limits govern.",
  };
}

const bypassExample = { it_load_kw: 500, equipment_delta_t_f: 20, unit_count: 8, airflow_per_unit_cfm: 12000, supply_temp_f: 65, exhaust_temp_f: 85, fan_power_per_unit_kw: 7.5, tariff_per_kwh: 0.1 };
DATACENTER_RENDERERS["containment-bypass-airflow"] = _simpleRenderer({
  citation: "Citation: sensible airflow demand = kW x 3,412 / (1.08 x delta-T), return temperature from an airflow-weighted mixing balance, and fan power proportional to airflow cubed. Rack-inlet surveys, unit data, and ASHRAE TC 9.9 govern.",
  example: bypassExample,
  fields: [
    { key: "it_load_kw", label: "IT equipment load (kW)" },
    { key: "equipment_delta_t_f", label: "Temperature rise across equipment (deg F)" },
    { key: "unit_count", label: "Running cooling units", attrs: { step: "1", min: "1" } },
    { key: "airflow_per_unit_cfm", label: "Airflow per cooling unit (cfm)" },
    { key: "supply_temp_f", label: "Supply air temperature (deg F)" },
    { key: "exhaust_temp_f", label: "Server exhaust temperature (deg F)" },
    { key: "fan_power_per_unit_kw", label: "Fan power per unit (kW)" },
    { key: "tariff_per_kwh", label: "Electricity tariff ($/kWh)" },
  ],
  outputs: [
    { key: "it_airflow_cfm", id: "cba-it", label: "IT airflow demand", unit: "cfm", value: (r) => fmt(r.it_airflow_cfm, 0) + " cfm" },
    { key: "supply_airflow_cfm", id: "cba-supply", label: "Cooling-unit supply", unit: "cfm", value: (r) => fmt(r.supply_airflow_cfm, 0) + " cfm" },
    { key: "bypass_cfm", id: "cba-bypass", label: "Bypass / recirculation", value: (r) => fmt(r.bypass_cfm, 0) + " / " + fmt(r.recirculation_cfm, 0) + " cfm (" + fmt(r.bypass_fraction_pct, 1) + " % bypass)" },
    { key: "return_temp_f", id: "cba-return", label: "Mixed return temperature", unit: "deg F", value: (r) => fmt(r.return_temp_f, 1) + " deg F" },
    { key: "heat_removed_btu_h", id: "cba-heat", label: "Heat removed", unit: "Btu/h", value: (r) => fmt(r.heat_removed_btu_h, 0) + " Btu/h" },
    { key: "fan_savings_kw", id: "cba-fan", label: "Matched-airflow fan saving", unit: "kW", value: (r) => fmt(r.fan_savings_kw, 1) + " kW; $" + fmt(r.annual_fan_savings, 0) + "/yr" },
    { key: "one_failed_margin_cfm", id: "cba-one", label: "With one unit failed", unit: "cfm", value: (r) => fmt(r.one_failed_supply_cfm, 0) + " cfm; margin " + fmt(r.one_failed_margin_cfm, 0) + " cfm (" + fmt(r.one_failed_margin_pct, 1) + " %)" },
    { key: "two_failed_margin_cfm", id: "cba-two", label: "With two units failed", unit: "cfm", value: (r) => fmt(r.two_failed_supply_cfm, 0) + " cfm; margin " + fmt(r.two_failed_margin_cfm, 0) + " cfm (" + fmt(r.two_failed_margin_pct, 1) + " %)" },
    { key: "note", id: "cba-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeContainmentBypassAirflow,
});

// ===================== spec-v1805: PDU branch loading =====================

// dims: in { line_voltage_v: I^-1 L^2 M T^-3, phase_configuration: dimensionless, breaker_rating_a: I, continuous_load_pct: dimensionless, power_factor: dimensionless, device_draw_w: L^2 M T^-3 } out: { usable_current_a: I, branch_capacity_kva: L^2 M T^-3, branch_capacity_kw: L^2 M T^-3, supported_device_count: dimensionless, survivor_current_a: I }
export function computePduBranchLoading({ line_voltage_v = 0, phase_configuration = "three_phase", breaker_rating_a = 0, continuous_load_pct = 0, power_factor = 0, device_draw_w = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(line_voltage_v > 0) || !(breaker_rating_a > 0) || !(device_draw_w > 0)) return { error: "Voltage, breaker rating, and device draw must be positive." };
  if (!(continuous_load_pct > 0 && continuous_load_pct <= 100) || !(power_factor > 0 && power_factor <= 1)) return { error: "Continuous-load percentage and power factor must be greater than 0 and no more than 100 percent or 1.0." };
  if (!new Set(["single_phase", "three_phase"]).has(phase_configuration)) return { error: "Phase configuration must be single-phase or three-phase." };
  const phaseFactor = phase_configuration === "three_phase" ? Math.sqrt(3) : 1;
  const usable_current_a = breaker_rating_a * continuous_load_pct / 100;
  const branch_capacity_va = phaseFactor * line_voltage_v * usable_current_a;
  const branch_capacity_kw = branch_capacity_va * power_factor / 1000;
  const supported_device_count = Math.floor(branch_capacity_kw * 1000 / device_draw_w);
  const naive_capacity_kw = phaseFactor * line_voltage_v * breaker_rating_a * power_factor / 1000;
  const naive_device_count = Math.floor(naive_capacity_kw * 1000 / device_draw_w);
  const connected_load_w = supported_device_count * device_draw_w;
  const failover_current_a = connected_load_w / (phaseFactor * line_voltage_v * power_factor);
  return {
    usable_current_a, branch_capacity_kva: branch_capacity_va / 1000,
    branch_capacity_kw, supported_device_count, naive_capacity_kw, naive_device_count,
    connected_load_w, normal_current_per_branch_a: failover_current_a / 2,
    failover_current_a, normal_breaker_utilization_pct: 50 * failover_current_a / breaker_rating_a,
    pair_filled_survivor_current_a: 2 * failover_current_a,
    pair_filled_survivor_breaker_pct: 200 * failover_current_a / breaker_rating_a,
    note: "Dual-corded equipment makes each A/B branch a failover path, so each must carry the full connected load alone. The resulting roughly half-loaded normal reading is the redundancy margin, not spare circuit capacity. NEC design and the authority having jurisdiction govern.",
  };
}

const pduExample = { line_voltage_v: 208, phase_configuration: "three_phase", breaker_rating_a: 30, continuous_load_pct: 80, power_factor: 0.99, device_draw_w: 450 };
DATACENTER_RENDERERS["pdu-branch-loading"] = _simpleRenderer({
  citation: "Citation: NEC continuous-load sizing and three-phase VA = sqrt(3) x line voltage x amperes. Dual-corded failover is checked with the full connected load on either branch; the NEC and authority having jurisdiction govern.",
  example: pduExample,
  fields: [
    { key: "line_voltage_v", label: "Line voltage (V)" },
    { key: "phase_configuration", label: "Phase configuration", kind: "select", options: [{ value: "three_phase", label: "Three-phase" }, { value: "single_phase", label: "Single-phase" }], default: "three_phase" },
    { key: "breaker_rating_a", label: "Branch breaker rating (A)" },
    { key: "continuous_load_pct", label: "Continuous-load limit (%)", default: 80, attrs: { step: "any", min: "0", max: "100" } },
    { key: "power_factor", label: "Equipment power factor", default: 0.99, attrs: { step: "any", min: "0", max: "1" } },
    { key: "device_draw_w", label: "Measured draw per device (W)" },
  ],
  outputs: [
    { key: "usable_current_a", id: "pbl-use", label: "Usable continuous current", unit: "A", value: (r) => fmt(r.usable_current_a, 1) + " A" },
    { key: "branch_capacity_kva", id: "pbl-kva", label: "Branch capacity", value: (r) => fmt(r.branch_capacity_kva, 2) + " kVA / " + fmt(r.branch_capacity_kw, 2) + " kW" },
    { key: "supported_device_count", id: "pbl-count", label: "Supported devices", value: (r) => r.supported_device_count + " devices" },
    { key: "naive_device_count", id: "pbl-naive", label: "Naive full-breaker count", value: (r) => r.naive_device_count + " devices" },
    { key: "normal_current_per_branch_a", id: "pbl-normal", label: "Normal current on each A/B branch", unit: "A", value: (r) => fmt(r.normal_current_per_branch_a, 1) + " A (" + fmt(r.normal_breaker_utilization_pct, 1) + " % of breaker)" },
    { key: "failover_current_a", id: "pbl-fail", label: "Survivor current at correct loading", unit: "A", value: (r) => fmt(r.failover_current_a, 1) + " A" },
    { key: "pair_filled_survivor_current_a", id: "pbl-over", label: "Survivor if both branches are filled", unit: "A", value: (r) => fmt(r.pair_filled_survivor_current_a, 1) + " A (" + fmt(r.pair_filled_survivor_breaker_pct, 0) + " % of breaker)" },
    { key: "note", id: "pbl-note", label: "Use", value: (r) => r.note },
  ],
  compute: computePduBranchLoading,
});

// ===================== spec-v1806: chilled-water ride-through =====================

// dims: in { loop_volume_gal: L^3, it_load_kw: L^2 M T^-3, supply_temp_f: T^1, max_temp_f: T^1, generator_transfer_min: T, chiller_restart_min: T, smaller_loop_volume_gal: L^3 } out: { stored_cooling_btu: L^2 M T^-2, ride_through_min: T, required_restart_min: T, ride_margin_min: T, additional_volume_gal: L^3 }
export function computeChilledWaterRideThrough({ loop_volume_gal = 0, it_load_kw = 0, supply_temp_f = 0, max_temp_f = 0, generator_transfer_min = 0, chiller_restart_min = 0, smaller_loop_volume_gal = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(loop_volume_gal > 0) || !(it_load_kw > 0) || !(smaller_loop_volume_gal > 0)) return { error: "Loop volumes and IT load must be positive." };
  if (!(max_temp_f > supply_temp_f) || !(generator_transfer_min >= 0) || !(chiller_restart_min >= 0)) return { error: "Maximum temperature must exceed supply temperature, and restart times cannot be negative." };
  const delta_t_f = max_temp_f - supply_temp_f;
  const it_heat_btu_h = it_load_kw * BTU_H_PER_KW;
  const energyAt = (gallons) => gallons * 8.34 * delta_t_f;
  const rideAt = (gallons) => 60 * energyAt(gallons) / it_heat_btu_h;
  const stored_cooling_btu = energyAt(loop_volume_gal);
  const ride_through_min = rideAt(loop_volume_gal);
  const required_restart_min = generator_transfer_min + chiller_restart_min;
  const required_volume_gal = it_heat_btu_h * required_restart_min / 60 / (8.34 * delta_t_f);
  const smaller_loop_ride_min = rideAt(smaller_loop_volume_gal);
  return {
    delta_t_f, it_heat_btu_h, stored_cooling_btu, ride_through_min,
    required_restart_min, ride_margin_min: ride_through_min - required_restart_min,
    generator_only_volume_gal: it_heat_btu_h * generator_transfer_min / 60 / (8.34 * delta_t_f),
    smaller_loop_ride_min, smaller_loop_shortfall_min: required_restart_min - smaller_loop_ride_min,
    required_volume_gal, additional_volume_gal: Math.max(0, required_volume_gal - smaller_loop_volume_gal),
    note: "Loop-water storage works only while pumps and air-handler fans remain powered. Cover generator transfer plus the chiller's full restart and loading sequence; usable temperature rise and coil capacity are bounded by equipment inlet limits and manufacturer data.",
  };
}

const rideExample = { loop_volume_gal: 5000, it_load_kw: 500, supply_temp_f: 45, max_temp_f: 60, generator_transfer_min: 0.5, chiller_restart_min: 7, smaller_loop_volume_gal: 1200 };
DATACENTER_RENDERERS["chilled-water-ride-through"] = _simpleRenderer({
  citation: "Citation: stored sensible cooling = gallons x 8.34 lb/gal x 1.0 Btu/lb-deg F x allowable temperature rise; ride-through is stored Btu divided by IT heat in Btu/h. Chiller restart sequence, equipment limits, and ASHRAE TC 9.9 govern.",
  example: rideExample,
  fields: [
    { key: "loop_volume_gal", label: "Chilled-water loop volume (gal)" },
    { key: "it_load_kw", label: "IT equipment load (kW)" },
    { key: "supply_temp_f", label: "Chilled-water supply temperature (deg F)" },
    { key: "max_temp_f", label: "Highest tolerable water temperature (deg F)" },
    { key: "generator_transfer_min", label: "Generator start and transfer (min)" },
    { key: "chiller_restart_min", label: "Chiller restart and loading (min)" },
    { key: "smaller_loop_volume_gal", label: "Smaller comparison loop (gal)" },
  ],
  outputs: [
    { key: "stored_cooling_btu", id: "cwrt-store", label: "Stored cooling", unit: "Btu", value: (r) => fmt(r.stored_cooling_btu, 0) + " Btu" },
    { key: "ride_through_min", id: "cwrt-ride", label: "Loop ride-through", unit: "min", value: (r) => fmt(r.ride_through_min, 1) + " min" },
    { key: "required_restart_min", id: "cwrt-need", label: "Restart sequence", unit: "min", value: (r) => fmt(r.required_restart_min, 1) + " min" },
    { key: "ride_margin_min", id: "cwrt-margin", label: "Ride-through margin", unit: "min", value: (r) => fmt(r.ride_margin_min, 1) + " min" },
    { key: "generator_only_volume_gal", id: "cwrt-gen", label: "Volume for generator transfer alone", unit: "gal", value: (r) => fmt(r.generator_only_volume_gal, 0) + " gal" },
    { key: "smaller_loop_ride_min", id: "cwrt-small", label: "Smaller-loop ride-through", unit: "min", value: (r) => fmt(r.smaller_loop_ride_min, 1) + " min; shortfall " + fmt(r.smaller_loop_shortfall_min, 1) + " min" },
    { key: "additional_volume_gal", id: "cwrt-add", label: "Additional volume for smaller loop", unit: "gal", value: (r) => fmt(r.additional_volume_gal, 0) + " gal" },
    { key: "note", id: "cwrt-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeChilledWaterRideThrough,
});

// ===================== spec-v1807: server inlet envelope =====================

function _dewPointF(tempF, rhPct) {
  const tempC = (tempF - 32) * 5 / 9;
  const gamma = Math.log(rhPct / 100) + 17.27 * tempC / (237.7 + tempC);
  return 237.7 * gamma / (17.27 - gamma) * 9 / 5 + 32;
}

// dims: in { dry_bulb_f: T^1, relative_humidity_pct: dimensionless, recommended_min_f: T^1, recommended_max_f: T^1, allowable_min_f: T^1, allowable_max_f: T^1, upper_dew_point_f: T^1, upper_rh_pct: dimensionless, alternative_temp_f: T^1, alternative_rh_pct: dimensionless } out: { dew_point_f: T^1, dew_point_margin_f: T^1, allowable_upper_margin_f: T^1, alternative_dew_point_f: T^1 }
export function computeServerInletEnvelope({ dry_bulb_f = 0, relative_humidity_pct = 0, recommended_min_f = 0, recommended_max_f = 0, allowable_min_f = 0, allowable_max_f = 0, upper_dew_point_f = 0, upper_rh_pct = 0, alternative_temp_f = 0, alternative_rh_pct = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  const temps = [dry_bulb_f, recommended_min_f, recommended_max_f, allowable_min_f, allowable_max_f, upper_dew_point_f, alternative_temp_f];
  if (!temps.every((v) => v > -459.67 && v >= -40 && v <= 140)) return { error: "Temperatures must be from -40 to 140 deg F and above absolute zero." };
  if (!(recommended_min_f < recommended_max_f) || !(allowable_min_f < allowable_max_f) || recommended_min_f < allowable_min_f || recommended_max_f > allowable_max_f) return { error: "Enter ordered recommended limits inside the allowable limits." };
  if (![relative_humidity_pct, alternative_rh_pct, upper_rh_pct].every((v) => v > 0 && v <= 100)) return { error: "Relative humidity values must be greater than 0 and no more than 100 percent." };
  const dew_point_f = _dewPointF(dry_bulb_f, relative_humidity_pct);
  const warm_same_rh_dew_point_f = _dewPointF(alternative_temp_f, relative_humidity_pct);
  const alternative_dew_point_f = _dewPointF(alternative_temp_f, alternative_rh_pct);
  return {
    dew_point_f,
    recommended_pass: dry_bulb_f >= recommended_min_f && dry_bulb_f <= recommended_max_f,
    allowable_pass: dry_bulb_f >= allowable_min_f && dry_bulb_f <= allowable_max_f,
    dew_point_pass: dew_point_f <= upper_dew_point_f,
    rh_pass: relative_humidity_pct <= upper_rh_pct,
    dew_point_margin_f: upper_dew_point_f - dew_point_f,
    rh_margin_pct: upper_rh_pct - relative_humidity_pct,
    allowable_upper_margin_f: allowable_max_f - dry_bulb_f,
    warm_same_rh_dew_point_f,
    warm_same_rh_dew_point_margin_f: upper_dew_point_f - warm_same_rh_dew_point_f,
    alternative_dew_point_f,
    alternative_recommended_pass: alternative_temp_f >= recommended_min_f && alternative_temp_f <= recommended_max_f,
    alternative_allowable_pass: alternative_temp_f >= allowable_min_f && alternative_temp_f <= allowable_max_f,
    alternative_dew_point_pass: alternative_dew_point_f <= upper_dew_point_f,
    alternative_rh_pass: alternative_rh_pct <= upper_rh_pct,
    alternative_dew_point_margin_f: upper_dew_point_f - alternative_dew_point_f,
    note: "Measure at the equipment inlet, not at the room sensor or cooling-unit return. Recommended and allowable bands make different reliability promises, and dew point is the absolute-moisture limit that often binds first. Current ASHRAE TC 9.9 and equipment limits govern.",
  };
}

const inletExample = { dry_bulb_f: 78, relative_humidity_pct: 45, recommended_min_f: 64.4, recommended_max_f: 80.6, allowable_min_f: 59, allowable_max_f: 89.6, upper_dew_point_f: 59, upper_rh_pct: 60, alternative_temp_f: 82, alternative_rh_pct: 50 };
DATACENTER_RENDERERS["server-inlet-envelope"] = _simpleRenderer({
  citation: "Citation: ASHRAE TC 9.9 equipment-inlet thermal envelope and the Tetens/Magnus dew-point relation. Enter the current class limits; equipment manufacturer limits and an inlet-level survey govern.",
  example: inletExample,
  fields: [
    { key: "dry_bulb_f", label: "Rack inlet dry bulb (deg F)" },
    { key: "relative_humidity_pct", label: "Rack inlet relative humidity (%)", attrs: { step: "any", min: "0", max: "100" } },
    { key: "recommended_min_f", label: "Recommended minimum (deg F)" },
    { key: "recommended_max_f", label: "Recommended maximum (deg F)" },
    { key: "allowable_min_f", label: "Allowable minimum (deg F)" },
    { key: "allowable_max_f", label: "Allowable maximum (deg F)" },
    { key: "upper_dew_point_f", label: "Upper dew point limit (deg F)" },
    { key: "upper_rh_pct", label: "Upper relative humidity limit (%)", attrs: { step: "any", min: "0", max: "100" } },
    { key: "alternative_temp_f", label: "Alternative dry bulb (deg F)" },
    { key: "alternative_rh_pct", label: "Alternative relative humidity (%)", attrs: { step: "any", min: "0", max: "100" } },
  ],
  outputs: [
    { key: "dew_point_f", id: "sie-dp", label: "Entered dew point", unit: "deg F", value: (r) => fmt(r.dew_point_f, 1) + " deg F -- " + (r.dew_point_pass ? "PASS" : "FAIL") },
    { key: "recommended_pass", id: "sie-dry", label: "Entered dry-bulb status", value: (r) => (r.recommended_pass ? "INSIDE recommended" : r.allowable_pass ? "OUTSIDE recommended; INSIDE allowable" : "OUTSIDE allowable") },
    { key: "dew_point_margin_f", id: "sie-margin", label: "Entered dew-point / RH margin", value: (r) => fmt(r.dew_point_margin_f, 1) + " deg F / " + fmt(r.rh_margin_pct, 1) + " points" },
    { key: "warm_same_rh_dew_point_f", id: "sie-warm", label: "Alternative temperature at original RH", unit: "deg F", value: (r) => fmt(r.warm_same_rh_dew_point_f, 1) + " deg F dew point; margin " + fmt(r.warm_same_rh_dew_point_margin_f, 1) + " deg F" },
    { key: "alternative_dew_point_f", id: "sie-alt", label: "Alternative condition", value: (r) => fmt(r.alternative_dew_point_f, 1) + " deg F dew point -- " + (r.alternative_dew_point_pass && r.alternative_rh_pass && r.alternative_allowable_pass ? "PASS" : "FAIL") },
    { key: "alternative_dew_point_margin_f", id: "sie-altm", label: "Alternative dew-point margin", unit: "deg F", value: (r) => fmt(r.alternative_dew_point_margin_f, 1) + " deg F" },
    { key: "note", id: "sie-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeServerInletEnvelope,
});

// ===================== spec-v1808: raised-floor tile airflow =====================

// dims: in { tile_area_ft2: L^2, open_area_pct: dimensionless, discharge_coefficient: dimensionless, plenum_pressure_in_wc: dimensionless, total_supply_cfm: L^3 T^-1, open_tile_count: dimensionless, high_flow_open_pct: dimensionless, reduced_pressure_in_wc: dimensionless, increased_tile_count: dimensionless } out: { free_area_ft2: L^2, tile_airflow_cfm: L^3 T^-1, high_flow_airflow_cfm: L^3 T^-1, required_plenum_pressure_in_wc: dimensionless }
export function computeRaisedFloorTileAirflow({ tile_area_ft2 = 0, open_area_pct = 0, discharge_coefficient = 0, plenum_pressure_in_wc = 0, total_supply_cfm = 0, open_tile_count = 0, high_flow_open_pct = 0, reduced_pressure_in_wc = 0, increased_tile_count = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(tile_area_ft2 > 0) || !(plenum_pressure_in_wc > 0) || !(total_supply_cfm > 0) || !(open_tile_count > 0) || !(increased_tile_count > 0)) return { error: "Tile area, pressure, total airflow, and tile counts must be positive." };
  if (![open_area_pct, high_flow_open_pct].every((v) => v > 0 && v <= 100) || !(discharge_coefficient > 0 && discharge_coefficient <= 1) || !(reduced_pressure_in_wc > 0)) return { error: "Open area, discharge coefficient, and reduced pressure must be within their positive physical ranges." };
  const free_area_ft2 = tile_area_ft2 * open_area_pct / 100;
  const high_flow_free_area_ft2 = tile_area_ft2 * high_flow_open_pct / 100;
  const flowAt = (area, pressure) => 4005 * discharge_coefficient * area * Math.sqrt(pressure);
  const pressureFor = (flow, area) => Math.pow(flow / (4005 * discharge_coefficient * area), 2);
  const tile_airflow_cfm = flowAt(free_area_ft2, plenum_pressure_in_wc);
  const high_flow_airflow_cfm = flowAt(high_flow_free_area_ft2, plenum_pressure_in_wc);
  const reduced_pressure_airflow_cfm = flowAt(free_area_ft2, reduced_pressure_in_wc);
  const per_tile_supply_cfm = total_supply_cfm / open_tile_count;
  const increased_count_per_tile_cfm = total_supply_cfm / increased_tile_count;
  return {
    free_area_ft2, tile_airflow_cfm, high_flow_free_area_ft2, high_flow_airflow_cfm,
    high_flow_ratio: high_flow_airflow_cfm / tile_airflow_cfm,
    reduced_pressure_airflow_cfm,
    reduced_pressure_flow_change_pct: 100 * (reduced_pressure_airflow_cfm - tile_airflow_cfm) / tile_airflow_cfm,
    per_tile_supply_cfm,
    required_plenum_pressure_in_wc: pressureFor(per_tile_supply_cfm, free_area_ft2),
    increased_count_per_tile_cfm,
    increased_count_pressure_in_wc: pressureFor(increased_count_per_tile_cfm, free_area_ft2),
    increased_count_flow_change_pct: 100 * (increased_count_per_tile_cfm - per_tile_supply_cfm) / per_tile_supply_cfm,
    increased_count_pressure_change_pct: 100 * (pressureFor(increased_count_per_tile_cfm, free_area_ft2) - pressureFor(per_tile_supply_cfm, free_area_ft2)) / pressureFor(per_tile_supply_cfm, free_area_ft2),
    note: "A raised floor distributes the fans' total airflow; it does not create more. Opening more standard tiles reduces every tile's share and pressure unless fan output rises. Manufacturer flow curves and an under-floor pressure survey govern real delivery.",
  };
}

const floorTileExample = { tile_area_ft2: 4, open_area_pct: 25, discharge_coefficient: 0.7, plenum_pressure_in_wc: 0.05, total_supply_cfm: 96000, open_tile_count: 150, high_flow_open_pct: 56, reduced_pressure_in_wc: 0.02, increased_tile_count: 200 };
DATACENTER_RENDERERS["raised-floor-tile-airflow"] = _simpleRenderer({
  citation: "Citation: orifice airflow Q = 4,005 x discharge coefficient x free area in sq ft x sqrt(plenum pressure in inches w.c.). Tile manufacturer flow curves and an under-floor pressure survey govern.",
  example: floorTileExample,
  fields: [
    { key: "tile_area_ft2", label: "Tile gross area (sq ft)" },
    { key: "open_area_pct", label: "Standard tile open area (%)", attrs: { step: "any", min: "0", max: "100" } },
    { key: "discharge_coefficient", label: "Discharge coefficient", attrs: { step: "any", min: "0", max: "1" } },
    { key: "plenum_pressure_in_wc", label: "Plenum static pressure (in w.c.)" },
    { key: "total_supply_cfm", label: "Total supply airflow (cfm)" },
    { key: "open_tile_count", label: "Open standard tiles", attrs: { step: "1", min: "1" } },
    { key: "high_flow_open_pct", label: "High-flow grate open area (%)", attrs: { step: "any", min: "0", max: "100" } },
    { key: "reduced_pressure_in_wc", label: "Reduced plenum pressure (in w.c.)" },
    { key: "increased_tile_count", label: "Increased open tile count", attrs: { step: "1", min: "1" } },
  ],
  outputs: [
    { key: "free_area_ft2", id: "rft-area", label: "Standard tile free area", unit: "sq ft", value: (r) => fmt(r.free_area_ft2, 2) + " sq ft" },
    { key: "tile_airflow_cfm", id: "rft-flow", label: "Standard tile airflow", unit: "cfm", value: (r) => fmt(r.tile_airflow_cfm, 0) + " cfm" },
    { key: "high_flow_airflow_cfm", id: "rft-high", label: "High-flow grate airflow", unit: "cfm", value: (r) => fmt(r.high_flow_airflow_cfm, 0) + " cfm (" + fmt(r.high_flow_ratio, 2) + "x)" },
    { key: "reduced_pressure_airflow_cfm", id: "rft-low", label: "Airflow at reduced pressure", unit: "cfm", value: (r) => fmt(r.reduced_pressure_airflow_cfm, 0) + " cfm (" + fmt(r.reduced_pressure_flow_change_pct, 1) + " %)" },
    { key: "per_tile_supply_cfm", id: "rft-share", label: "Airflow per current tile", unit: "cfm", value: (r) => fmt(r.per_tile_supply_cfm, 0) + " cfm" },
    { key: "required_plenum_pressure_in_wc", id: "rft-need", label: "Required current pressure", unit: "in w.c.", value: (r) => fmt(r.required_plenum_pressure_in_wc, 3) + " in w.c." },
    { key: "increased_count_per_tile_cfm", id: "rft-more", label: "With increased tile count", value: (r) => fmt(r.increased_count_per_tile_cfm, 0) + " cfm/tile; " + fmt(r.increased_count_pressure_in_wc, 3) + " in w.c. (" + fmt(r.increased_count_pressure_change_pct, 0) + " % pressure)" },
    { key: "note", id: "rft-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeRaisedFloorTileAirflow,
});
