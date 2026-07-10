#!/usr/bin/env node
// spec-v592 preview-map generator. The hand-authored table below (args:
// DOM input id -> compute argument name; defaults: renderer example-fill
// values for arguments the slots do not supply; headline: which result
// keys the dropdown preview shows) is joined with test/fixtures/
// compute-map.js for each tile's { module, fn } and written to
// data/search/preview-map.json. Run manually when the slot seed grows;
// scripts/check-slots.mjs verifies the committed shard every lint.

import { writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { COMPUTE_MAP } = await import(resolve(ROOT, 'test', 'fixtures', 'compute-map.js'));

const TABLE = {
  "asphalt-tonnage": {
    "args": {
      "area_ft2": "area_ft2",
      "depth_in": "depth_in",
      "paving_width_ft": "paving_width_ft"
    },
    "defaults": {},
    "headline": [
      {
        "key": "tons",
        "label": "asphalt",
        "unit": "tons",
        "decimals": 1
      }
    ]
  },
  "board-footage": {
    "args": {
      "bf-t": "thickness_in",
      "bf-l": "length_ft"
    },
    "defaults": {
      "width_in": 4
    },
    "headline": [
      {
        "key": "board_feet_each",
        "label": "board feet per piece",
        "unit": "bf",
        "decimals": 2
      }
    ]
  },
  "bolt-shear-bearing": {
    "args": {
      "d_in": "d_in"
    },
    "defaults": {},
    "headline": [
      {
        "key": "phi_rn",
        "label": "LRFD design strength",
        "unit": "kip",
        "decimals": 1
      }
    ]
  },
  "brake-pad-life": {
    "args": {
      "vehicle_weight_lb": "vehicle_weight_lb",
      "speed_delta_mph": "speed_delta_mph"
    },
    "defaults": {},
    "headline": [
      {
        "key": "miles_until_worn",
        "label": "pad life",
        "unit": "mi",
        "decimals": 0
      }
    ]
  },
  "breaker-sizing": {
    "args": {
      "bs-load": "load_A",
      "bs-w": "load_W",
      "bs-v": "voltage_V"
    },
    "defaults": {
      "continuous": true
    },
    "headline": [
      {
        "key": "next_standard_A",
        "label": "breaker size",
        "unit": "A",
        "decimals": 0
      }
    ]
  },
  "camera-lens-fov": {
    "args": {
      "clf-di": "distance_ft"
    },
    "defaults": {
      "sensor_width_mm": 5.37,
      "focal_length_mm": 4,
      "h_pixels": 1920
    },
    "headline": [
      {
        "key": "ppf",
        "label": "pixel density",
        "unit": "ppf",
        "decimals": 1
      }
    ]
  },
  "cg-load-share": {
    "args": {
      "cls-w": "total_weight_lb",
      "cls-span": "span_in"
    },
    "defaults": {
      "cg_from_p1_in": 40
    },
    "headline": [
      {
        "key": "load_p1",
        "label": "pick 1 load",
        "unit": "lb",
        "decimals": 0
      },
      {
        "key": "load_p2",
        "label": "pick 2 load",
        "unit": "lb",
        "decimals": 0
      }
    ]
  },
  "column-base-plate": {
    "args": {
      "d_in": "d_in"
    },
    "defaults": {
      "pu_kip": 400,
      "bf_in": 10,
      "b_in": 14,
      "n_in": 14
    },
    "headline": [
      {
        "key": "tp",
        "label": "plate thickness",
        "unit": "in",
        "decimals": 2
      }
    ]
  },
  "crane-net-capacity": {
    "args": {
      "cnc-load": "load_weight_lb"
    },
    "defaults": {
      "gross_chart_lb": 30000,
      "hook_block_lb": 800,
      "wire_rope_lb": 400,
      "below_hook_lb": 600
    },
    "headline": [
      {
        "key": "pct_of_net",
        "label": "percent of net",
        "unit": "%",
        "decimals": 1
      }
    ]
  },
  "dim-weight": {
    "args": {
      "length_in": "length_in",
      "actual_weight_lb": "actual_weight_lb"
    },
    "defaults": {
      "width_in": 12,
      "height_in": 12
    },
    "headline": [
      {
        "key": "billable_lb",
        "label": "billable weight",
        "unit": "lb",
        "decimals": 1
      }
    ]
  },
  "displacement-cr": {
    "args": {
      "bore_in": "bore_in"
    },
    "defaults": {
      "stroke_in": 3.48,
      "cylinders": 8,
      "chamber_cc": 64,
      "gasket_bore_in": 4.1,
      "gasket_thickness_in": 0.04,
      "deck_clearance_in": 0.005
    },
    "headline": [
      {
        "key": "displacement_in3",
        "label": "displacement",
        "unit": "in^3",
        "decimals": 1
      },
      {
        "key": "compression_ratio",
        "label": "compression ratio",
        "unit": "",
        "decimals": 2
      }
    ]
  },
  "drying-goal": {
    "args": {
      "dg-ot": "outdoor_temperature_F"
    },
    "defaults": {
      "outdoor_RH_percent": 70,
      "indoor_temperature_F": 72
    },
    "headline": [
      {
        "key": "target_indoor_GPP",
        "label": "drying goal",
        "unit": "GPP",
        "decimals": 1
      }
    ]
  },
  "drywall": {
    "args": {
      "wall_area_ft2": "wall_area_ft2"
    },
    "defaults": {},
    "headline": [
      {
        "key": "sheets",
        "label": "drywall sheets",
        "unit": "",
        "decimals": 0
      }
    ]
  },
  "duct-sizing": {
    "args": {
      "ds-cfm": "cfm"
    },
    "defaults": {},
    "headline": [
      {
        "key": "round_diameter_in",
        "label": "round duct diameter",
        "unit": "in",
        "decimals": 1
      }
    ]
  },
  "filter-loading": {
    "args": {
      "filter_area_ft2": "filter_area_ft2",
      "flow_gpm": "flow_gpm"
    },
    "defaults": {},
    "headline": [
      {
        "key": "loading_gpm_per_ft2",
        "label": "filter loading",
        "unit": "gpm/ft^2",
        "decimals": 2
      }
    ]
  },
  "fire-friction": {
    "args": {
      "ff-q": "gpm",
      "ff-l": "length_ft"
    },
    "defaults": {
      "hose_diameter": "2.5_in"
    },
    "headline": [
      {
        "key": "friction_loss_psi",
        "label": "friction loss",
        "unit": "psi",
        "decimals": 1
      }
    ]
  },
  "freight-density": {
    "args": {
      "length_in": "length_in",
      "weight_lb": "weight_lb"
    },
    "defaults": {
      "width_in": 40,
      "height_in": 48
    },
    "headline": [
      {
        "key": "density_pcf",
        "label": "density",
        "unit": "lb/ft^3",
        "decimals": 2
      },
      {
        "key": "density_class",
        "label": "class",
        "unit": "",
        "decimals": 0
      }
    ]
  },
  "friction-loss": {
    "args": {
      "fl-len": "length_ft",
      "fl-flow": "flow_gpm"
    },
    "defaults": {
      "method": "hazen-williams",
      "material": "PVC",
      "nominal_size": "1"
    },
    "headline": [
      {
        "key": "pressureLoss_psi",
        "label": "pressure loss",
        "unit": "psi",
        "decimals": 2
      }
    ]
  },
  "gpa-rate": {
    "args": {
      "gpm": "gpm",
      "spacing_in": "spacing_in",
      "speed_mph": "speed_mph"
    },
    "defaults": {},
    "headline": [
      {
        "key": "gpa",
        "label": "application rate",
        "unit": "GPA",
        "decimals": 1
      }
    ]
  },
  "lumber-spans": {
    "args": {
      "ls-tw": "tributary_width_in"
    },
    "defaults": {
      "species_grade": "DF-L_No2",
      "nominal_size": "2x10",
      "total_load_psf": 50
    },
    "headline": [
      {
        "key": "allowable_span_ft",
        "label": "allowable span",
        "unit": "ft",
        "decimals": 2
      }
    ]
  },
  "manual-j-cooling": {
    "args": {
      "mjc-fa": "floor_area_ft2",
      "mjc-od": "outdoor_design_F"
    },
    "defaults": {
      "wall_area_ft2": 1200,
      "window_area_ft2": 200,
      "ceiling_area_ft2": 1500,
      "occupants": 4
    },
    "headline": [
      {
        "key": "total_BTU_hr",
        "label": "cooling load",
        "unit": "BTU/hr",
        "decimals": 0
      },
      {
        "key": "tons",
        "label": "tons",
        "unit": "",
        "decimals": 2
      }
    ]
  },
  "manual-j-heating": {
    "args": {
      "mjh-fa": "floor_area_ft2",
      "mjh-od": "outdoor_design_F"
    },
    "defaults": {
      "wall_area_ft2": 1200,
      "window_area_ft2": 200,
      "ceiling_area_ft2": 1500
    },
    "headline": [
      {
        "key": "total_BTU_hr",
        "label": "heating load",
        "unit": "BTU/hr",
        "decimals": 0
      },
      {
        "key": "tons",
        "label": "system size",
        "unit": "tons",
        "decimals": 2
      }
    ]
  },
  "mulch-topsoil-volume": {
    "args": {
      "mtv-area": "area_ft2",
      "mtv-depth": "depth_in"
    },
    "defaults": {
      "bulk_density": 1.1
    },
    "headline": [
      {
        "key": "yd3",
        "label": "volume",
        "unit": "yd^3",
        "decimals": 2
      }
    ]
  },
  "ohms-law": {
    "args": {
      "ol-v": "V",
      "ol-i": "I",
      "ol-p": "P"
    },
    "defaults": {
      "V": null,
      "I": null,
      "R": null,
      "P": null
    },
    "headline": [
      {
        "key": "R",
        "label": "resistance",
        "unit": "ohm",
        "decimals": 2
      },
      {
        "key": "P",
        "label": "power",
        "unit": "W",
        "decimals": 1
      }
    ]
  },
  "pacing-distance": {
    "args": {
      "calibration_distance_ft": "calibration_distance_ft"
    },
    "defaults": {
      "calibration_paces": 38,
      "current_paces": 120
    },
    "headline": [
      {
        "key": "distance_ft",
        "label": "distance",
        "unit": "ft",
        "decimals": 1
      }
    ]
  },
  "paint-coverage": {
    "args": {
      "pc-a": "area_ft2"
    },
    "defaults": {},
    "headline": [
      {
        "key": "total_paint_gallons",
        "label": "total paint",
        "unit": "gal",
        "decimals": 2
      }
    ]
  },
  "pdp": {
    "args": {
      "pdp-np": "nozzle_pressure_psi",
      "pdp-e": "elevation_ft"
    },
    "defaults": {
      "friction_loss_psi": 25
    },
    "headline": [
      {
        "key": "pdp_psi",
        "label": "pump discharge pressure",
        "unit": "psi",
        "decimals": 1
      }
    ]
  },
  "pipe-volume": {
    "args": {
      "pv-len": "length_ft"
    },
    "defaults": {
      "nominal_size": "1"
    },
    "headline": [
      {
        "key": "gallons",
        "label": "volume",
        "unit": "gal",
        "decimals": 2
      }
    ]
  },
  "prop-slip": {
    "args": {
      "pitch_in": "pitch_in"
    },
    "defaults": {
      "rpm": 4500,
      "gear_ratio": 1.85,
      "gps_speed_kt": 35
    },
    "headline": [
      {
        "key": "slip_percent",
        "label": "prop slip",
        "unit": "%",
        "decimals": 1
      },
      {
        "key": "theoretical_kt",
        "label": "theoretical speed",
        "unit": "kt",
        "decimals": 1
      }
    ]
  },
  "psychrometric": {
    "args": {
      "py-t": "temperature_F"
    },
    "defaults": {
      "RH_percent": 50
    },
    "headline": [
      {
        "key": "dew_point_F",
        "label": "dew point",
        "unit": "F",
        "decimals": 1
      },
      {
        "key": "GPP",
        "label": "grains per pound",
        "unit": "",
        "decimals": 1
      }
    ]
  },
  "rebar": {
    "args": {
      "rb-l": "length_ft",
      "rb-sp": "spacing_in"
    },
    "defaults": {
      "width_ft": 10
    },
    "headline": [
      {
        "key": "total_length_ft",
        "label": "total rebar",
        "unit": "ft",
        "decimals": 0
      }
    ]
  },
  "roof-pitch": {
    "args": {
      "rp-r": "rise"
    },
    "defaults": {},
    "headline": [
      {
        "key": "degrees",
        "label": "roof angle",
        "unit": "deg",
        "decimals": 1
      }
    ]
  },
  "search-track-spacing": {
    "args": {
      "sts-w": "sweep_width_m"
    },
    "defaults": {
      "track_spacing_m": 164,
      "target_pod": 0.8
    },
    "headline": [
      {
        "key": "coverage",
        "label": "coverage factor",
        "unit": "",
        "decimals": 2
      },
      {
        "key": "spacing_for_pod_m",
        "label": "spacing for 80% pod",
        "unit": "ft",
        "decimals": 0
      }
    ]
  },
  "service-load": {
    "args": {
      "sl-area": "area_ft2"
    },
    "defaults": {
      "fixed_appliances_W": 6000,
      "range_W": 12000,
      "dryer_W": 5000,
      "hvac_cooling_W": 5000,
      "hvac_heating_W": 8000
    },
    "headline": [
      {
        "key": "required_A",
        "label": "required ampacity",
        "unit": "A",
        "decimals": 1
      },
      {
        "key": "next_standard_A",
        "label": "next standard service",
        "unit": "A",
        "decimals": 0
      }
    ]
  },
  "softener-sizing": {
    "args": {
      "sof-salt": "salt_per_regen"
    },
    "defaults": {
      "people": 4,
      "hardness_gpg": 20,
      "iron_ppm": 2,
      "capacity": 32000
    },
    "headline": [
      {
        "key": "days_between",
        "label": "days between regens",
        "unit": "days",
        "decimals": 0
      },
      {
        "key": "annual_salt",
        "label": "annual salt",
        "unit": "lb/yr",
        "decimals": 0
      }
    ]
  },
  "stairs": {
    "args": {
      "st-tr": "total_rise_in"
    },
    "defaults": {},
    "headline": [
      {
        "key": "risers",
        "label": "risers",
        "unit": "",
        "decimals": 0
      },
      {
        "key": "riser_height_in",
        "label": "riser height",
        "unit": "in",
        "decimals": 2
      }
    ]
  },
  "sump-basin-sizing": {
    "args": {
      "sb-dia": "basin_dia",
      "sb-inflow": "inflow_gpm"
    },
    "defaults": {
      "drawdown_in": 12,
      "pump_gpm": 30
    },
    "headline": [
      {
        "key": "run_time_s",
        "label": "run time per cycle",
        "unit": "s",
        "decimals": 1
      },
      {
        "key": "cycles_per_hr",
        "label": "cycles per hour",
        "unit": "",
        "decimals": 1
      }
    ]
  },
  "three-phase": {
    "args": {
      "tp-v": "V_LL",
      "tp-i": "I_L"
    },
    "defaults": {
      "pf": 0.9
    },
    "headline": [
      {
        "key": "kW",
        "label": "real power",
        "unit": "kW",
        "decimals": 1
      },
      {
        "key": "kVA",
        "label": "apparent power",
        "unit": "kVA",
        "decimals": 1
      }
    ]
  },
  "timber-cruise": {
    "args": {
      "small_end_dib_in": "small_end_dib_in",
      "log_length_ft": "log_length_ft"
    },
    "defaults": {},
    "headline": [
      {
        "key": "board_feet",
        "label": "board feet",
        "unit": "bf",
        "decimals": 1
      }
    ]
  },
  "transformer-sizing": {
    "args": {
      "tx-pri": "primary_V"
    },
    "defaults": {
      "load_kW": 90,
      "power_factor": 0.9,
      "secondary_V": 208
    },
    "headline": [
      {
        "key": "required_kVA",
        "label": "required kva",
        "unit": "kVA",
        "decimals": 1
      },
      {
        "key": "next_standard_kVA",
        "label": "next standard",
        "unit": "kVA",
        "decimals": 1
      }
    ]
  },
  "truss-capacity": {
    "args": {
      "tr-s": "span_ft"
    },
    "defaults": {
      "point_loads": []
    },
    "headline": [
      {
        "key": "udl_max_lb_per_ft",
        "label": "udl capacity",
        "unit": "lb/ft",
        "decimals": 0
      }
    ]
  },
  "voltage-drop": {
    "args": {
      "vd-len": "length_ft",
      "vd-cur": "current_A",
      "vd-src": "source_voltage_V"
    },
    "defaults": {
      "phase": "single",
      "material": "copper",
      "awg": "12"
    },
    "headline": [
      {
        "key": "drop_V",
        "label": "drop",
        "unit": "V",
        "decimals": 1
      },
      {
        "key": "percent",
        "label": "percent drop",
        "unit": "%",
        "decimals": 2
      }
    ]
  },
  "water-heater-storage-sizing": {
    "args": {
      "whss-tank": "tank_gal",
      "whss-in": "input_btuh",
      "whss-rise": "rise_F"
    },
    "defaults": {
      "peak_hour_gal": 80
    },
    "headline": [
      {
        "key": "fhr_gph",
        "label": "first-hour rating",
        "unit": "gph",
        "decimals": 1
      },
      {
        "key": "recovery_gph",
        "label": "recovery",
        "unit": "gph",
        "decimals": 1
      }
    ]
  },
  "yield-ep": {
    "args": {
      "ap_weight": "ap_weight"
    },
    "defaults": {
      "trim_weight": 1.5,
      "cooking_loss_pct": 15
    },
    "headline": [
      {
        "key": "ep_weight",
        "label": "ep weight",
        "unit": "lb",
        "decimals": 2
      },
      {
        "key": "yield_pct",
        "label": "yield",
        "unit": "%",
        "decimals": 1
      }
    ]
  }
};

const tiles = {};
for (const [tile, entry] of Object.entries(TABLE)) {
  const reg = COMPUTE_MAP[tile];
  if (!reg) throw new Error('preview table tile not in compute-map: ' + tile);
  tiles[tile] = {
    module: reg.module.replace(/^(\.\.\/)+/, './'),
    fn: reg.fn,
    args: entry.args,
    defaults: entry.defaults,
    headline: entry.headline,
  };
}

const shard = {
  version: 1,
  _comment: 'spec-v592 answer-preview map, generated by scripts/build-preview-map.mjs. module/fn come from test/fixtures/compute-map.js; args maps DOM input ids (slots.json params) to compute argument names; defaults are the renderer example-fill values for arguments the slots do not supply; headline lists the result keys the search dropdown preview renders. Gated by scripts/check-slots.mjs.',
  tiles,
};
await writeFile(resolve(ROOT, 'data', 'search', 'preview-map.json'), JSON.stringify(shard, null, 2) + '\n');
console.log('build-preview-map: wrote ' + Object.keys(tiles).length + ' preview entries.');
