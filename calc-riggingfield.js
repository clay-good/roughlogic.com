// =====================================================================
// calc-riggingfield.js - spec-v1866 rigging field-safety bench.
//
// Extracted from calc-rigging.js to keep both lazy-loaded modules within
// their gzip budgets. Calculator behavior is unchanged.
// =====================================================================

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

const _finiteGuard = (o) => {
  if (o && typeof o === "object" && !Array.isArray(o)) {
    for (const v of Object.values(o)) {
      if (typeof v === "number" && !Number.isFinite(v)) {
        return { error: "All numeric inputs must be finite numbers." };
      }
    }
  }
  return null;
};

export const RIGGINGFIELD_RENDERERS = {};

// ===================== spec-v938: wire-rope clip count and spacing (OSHA Table H-2/H-20) =====================
// OSHA 29 CFR 1926.251 Table H-2: [rope diameter in, drop-forged clips,
// other-material clips]; minimum spacing is 6 x the diameter on every row.
// The turnback is the Crosby G-450 application table's "amount of rope to
// turn back", a manufacturer figure for forged clips. Until 2026-09-24 the
// tile took clips x 6d as the tail -- 9 in at 1/2 in where Crosby turns back
// 11-1/2 -- and gave every clip the drop-forged count.
const WIRE_ROPE_CLIP_ROWS = [
  [0.125, 2, null, 3.25], [0.1875, 2, null, 3.75], [0.25, 2, null, 4.75], [0.3125, 2, null, 5.25],
  [0.375, 2, null, 6.5], [0.4375, 2, null, 7],
  [0.5, 3, 4, 11.5], [0.5625, 3, 4, 12], [0.625, 3, 4, 12], [0.75, 4, 5, 18], [0.875, 4, 5, 19],
  [1.0, 5, 6, 26], [1.125, 6, 6, 34], [1.25, 6, 7, 44], [1.375, 7, 7, 44], [1.5, 7, 8, 54],
];

// dims: in { rope_diameter_in: L, clip_material: dimensionless } out: { clip_count: dimensionless, spacing_in: L, minimum_tail_in: L }
export function computeWireRopeClips({ rope_diameter_in = 0.75, clip_material = "drop_forged" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(rope_diameter_in > 0)) return { error: "Rope diameter must be positive (in)." };
  if (clip_material !== "drop_forged" && clip_material !== "other") return { error: "Clip material must be drop_forged or other." };
  const d = rope_diameter_in;
  // Between listed sizes, the next larger row governs.
  const row = WIRE_ROPE_CLIP_ROWS.find((rw) => rw[0] >= d - 1e-9);
  if (!row) return { error: "OSHA Table H-2 stops at 1-1/2 in rope; above it, follow the clip manufacturer's table." };
  const forged = row[1];
  const other = row[2];
  if (clip_material === "other" && other === null) {
    return { error: "OSHA Table H-2 starts at 1/2 in rope and the 2-clip minimum below it is for forged clips; for other clip materials follow the manufacturer's table." };
  }
  const clip_count = clip_material === "other" ? other : forged;
  const spacing_in = 6 * rope_diameter_in;
  // Crosby G-450: "If a greater number of clips are used than shown in the
  // table, the amount of turnback should be increased proportionately."
  // (Until 2026-09-24 this added one 6d spacing per extra clip, up to 0.83 in short.)
  const minimum_tail_in = row[3] * clip_count / forged;
  if (![clip_count, spacing_in, minimum_tail_in].every(Number.isFinite)) return { error: "Wire-rope-clip math is not a finite value." };
  return {
    clip_count,
    spacing_in,
    minimum_tail_in,
    note: "The minimum number of U-bolt wire-rope clips and their spacing to form a load-bearing eye, per OSHA 29 CFR 1926.251 Table H-2 (the old H-20): a 3/4 in rope takes 4 drop-forged clips, or 5 of any other material, at 6 x the diameter (4.5 in) on center. The turnback is the Crosby G-450 table's amount of rope to turn back from the thimble (18 in at 3/4 in), increased in proportion to the clip count when other materials need more clips (Crosby G-450); another maker's table governs its own clips, and Crosby itself calls for 7 clips at 1-1/4 in and 8 at 1-1/2 in, one more than OSHA. Install the U-bolt on the DEAD (short) end and the saddle on the LIVE (load) end -- 'never saddle a dead horse' -- torqued to the maker's value in sequence and retorqued after the first load. Below 1/2 in the OSHA table does not list a count; 2 forged clips is the Crosby minimum. A properly formed clip eye develops only about 80% of the rope's strength; the clip and rope manufacturer and OSHA govern the termination.",
  };
}

export const wireRopeClipsExample = { inputs: { rope_diameter_in: 0.75 } };

function _v938renderWireRopeClips(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: wire-rope clip count and spacing by name (OSHA 29 CFR 1926.251 Table H-2 / H-20). Drop-forged clips by rope diameter (1/2->3, 3/4->4, 1->5, ...), one more at most sizes for other materials; spacing = 6 x diameter. Turnback per the Crosby G-450 application instructions. U-bolt on the dead end ('never saddle a dead horse'); torque per the maker. The manufacturer and OSHA govern the termination.";
  const dia = makeNumber("Wire rope diameter (in)", "wrc-dia", { step: "any", min: "0" });
  const mat = makeSelect("Clip material", "wrc-mat", [
    { value: "drop_forged", label: "Drop forged", selected: true },
    { value: "other", label: "Other material (e.g. malleable iron)" },
  ]);
  inputRegion.appendChild(dia.wrap);
  inputRegion.appendChild(mat.wrap);
  attachExampleButton(inputRegion, () => { dia.input.value = "0.75"; mat.select.value = "drop_forged"; update(); });
  const oClips = makeOutputLine(outputRegion, "Minimum clips", "wrc-out-clips");
  const oSpace = makeOutputLine(outputRegion, "Clip spacing (6 x diameter)", "wrc-out-space");
  const oTail = makeOutputLine(outputRegion, "Rope turnback from the thimble", "wrc-out-tail");
  const update = debounce(() => {
    const r = computeWireRopeClips({ rope_diameter_in: dia.input.value === "" ? 0.75 : Number(dia.input.value), clip_material: mat.select.value });
    if (r.error) { oClips.textContent = r.error; oSpace.textContent = "-"; oTail.textContent = "-"; return; }
    oClips.textContent = fmt(r.clip_count, 0) + " clips";
    oSpace.textContent = fmt(r.spacing_in, 2) + " in on center";
    oTail.textContent = fmt(r.minimum_tail_in, 2) + " in";
  }, DEBOUNCE_MS);
  dia.input.addEventListener("input", update);
  mat.select.addEventListener("input", update);
}
RIGGINGFIELD_RENDERERS["wire-rope-clips"] = _v938renderWireRopeClips;

// ===================== spec-v953: crane load radius and boom-tip height from boom geometry =====================
// dims: in { boom_length_ft: L, boom_angle_deg: dimensionless, boom_foot_offset_ft: L, boom_foot_height_ft: L, target_radius_ft: L } out: { load_radius_ft: L, boom_tip_height_ft: L, angle_for_target_radius_deg: dimensionless }
export function computeCraneLoadRadiusBoom({ boom_length_ft = 30, boom_angle_deg = 60, boom_foot_offset_ft = 4, boom_foot_height_ft = 6, target_radius_ft = 25 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(boom_length_ft > 0)) return { error: "Boom length must be positive (ft)." };
  if (!(boom_angle_deg >= 0 && boom_angle_deg <= 90)) return { error: "Boom angle must be between 0 and 90 degrees from horizontal." };
  if (!(boom_foot_offset_ft >= 0)) return { error: "Boom-foot offset cannot be negative (ft)." };
  if (!(boom_foot_height_ft >= 0)) return { error: "Boom-foot height cannot be negative (ft)." };
  if (!(target_radius_ft > 0)) return { error: "Target radius must be positive (ft)." };
  // Load radius = the horizontal distance from the center of rotation to the hook; tip height above ground.
  const theta = boom_angle_deg * Math.PI / 180;
  const load_radius_ft = boom_foot_offset_ft + boom_length_ft * Math.cos(theta);
  const boom_tip_height_ft = boom_foot_height_ft + boom_length_ft * Math.sin(theta);
  // Inverse: the boom angle that puts the hook at a target load radius (if the boom can reach it).
  const ratio = (target_radius_ft - boom_foot_offset_ft) / boom_length_ft;
  let angle_for_target_radius_deg = null;
  let target_reachable = true;
  if (ratio >= -1 && ratio <= 1) angle_for_target_radius_deg = Math.acos(ratio) * 180 / Math.PI;
  else target_reachable = false;
  if (![load_radius_ft, boom_tip_height_ft].every(Number.isFinite)) return { error: "Crane-geometry math is not a finite value." };
  return {
    load_radius_ft,
    boom_tip_height_ft,
    angle_for_target_radius_deg,
    target_reachable,
    note: "The load radius and boom-tip height from the boom length and angle -- the geometry that turns the crane's boom-angle-indicator reading into the RADIUS the load chart is actually indexed by. Load radius = the boom-foot horizontal offset from the center of rotation + boom length x cos(angle); tip height = the boom-foot height + boom length x sin(angle). A 30 ft boom at 60 degrees off a foot 4 ft out and 6 ft up puts the hook at a 19 ft radius and a 32 ft tip height; lowering the boom to 45 degrees swings the hook out to a 25 ft radius. The inverse -- the angle that lands the hook at a target radius -- is acos((target - offset)/boom length), so a 25 ft radius needs about 46 degrees; if the target exceeds the boom's reach it is flagged unreachable. This is boom geometry only: it does NOT include boom deflection under load, the load-radius increase as the boom bends out, wire-rope stretch, or out-of-level effects, all of which INCREASE the actual radius. The crane's load chart, the load-moment indicator, and a qualified operator/lift director govern the rated capacity at the radius.",
  };
}

export const craneLoadRadiusBoomExample = { inputs: { boom_length_ft: 30, boom_angle_deg: 60, boom_foot_offset_ft: 4, boom_foot_height_ft: 6, target_radius_ft: 25 } };

function _v953renderCraneLoadRadiusBoom(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: crane load radius and boom-tip height from boom geometry, by name. radius = boom-foot offset + boom length x cos(angle); tip height = boom-foot height + boom length x sin(angle); angle for a target radius = acos((target - offset)/length). Boom geometry only (no deflection/stretch/out-of-level, which increase the real radius). The load chart, load-moment indicator, and qualified operator govern.";
  const bl = makeNumber("Boom length (ft)", "clr-bl", { step: "any", min: "0" });
  const ba = makeNumber("Boom angle from horizontal (deg)", "clr-ba", { step: "any", min: "0" });
  const bo = makeNumber("Boom-foot offset from center pin (ft)", "clr-bo", { step: "any", min: "0" });
  const bh = makeNumber("Boom-foot height (ft)", "clr-bh", { step: "any", min: "0" });
  const tr = makeNumber("Target load radius (ft)", "clr-tr", { step: "any", min: "0" });
  for (const f of [bl, ba, bo, bh, tr]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { bl.input.value = "30"; ba.input.value = "60"; bo.input.value = "4"; bh.input.value = "6"; tr.input.value = "25"; update(); });
  const oR = makeOutputLine(outputRegion, "Load radius", "clr-out-r");
  const oH = makeOutputLine(outputRegion, "Boom-tip height", "clr-out-h");
  const oA = makeOutputLine(outputRegion, "Angle for target radius", "clr-out-a");
  const update = debounce(() => {
    const r = computeCraneLoadRadiusBoom({
      boom_length_ft: bl.input.value === "" ? 30 : Number(bl.input.value), boom_angle_deg: ba.input.value === "" ? 60 : Number(ba.input.value),
      boom_foot_offset_ft: bo.input.value === "" ? 4 : Number(bo.input.value), boom_foot_height_ft: bh.input.value === "" ? 6 : Number(bh.input.value),
      target_radius_ft: tr.input.value === "" ? 25 : Number(tr.input.value),
    });
    if (r.error) { oR.textContent = r.error; oH.textContent = "-"; oA.textContent = "-"; return; }
    oR.textContent = fmt(r.load_radius_ft, 2) + " ft";
    oH.textContent = fmt(r.boom_tip_height_ft, 2) + " ft";
    oA.textContent = r.target_reachable ? fmt(r.angle_for_target_radius_deg, 1) + " deg for " + fmt(Number(tr.input.value) || 25, 0) + " ft radius" : "target radius beyond boom reach";
  }, DEBOUNCE_MS);
  for (const f of [bl, ba, bo, bh, tr]) f.input.addEventListener("input", update);
}
RIGGINGFIELD_RENDERERS["crane-load-radius-boom"] = _v953renderCraneLoadRadiusBoom;

// ===================== spec-v991: block-and-tackle reeving line pull =====================
// dims: in { load_lb: M L T^-2, parts_of_line: dimensionless, sheave_efficiency: dimensionless, lead_sheave: dimensionless } out: { hauling_line_pull_lb: M L T^-2, frictionless_pull_lb: M L T^-2, reeving_efficiency: dimensionless }
export function computeReevingPartsOfLine({ load_lb = 20000, parts_of_line = 4, sheave_efficiency = 0.98, lead_sheave = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(load_lb > 0)) return { error: "Load must be positive (lb)." };
  if (!(parts_of_line >= 1) || !Number.isInteger(parts_of_line)) return { error: "Parts of line must be a whole number >= 1." };
  if (!(sheave_efficiency > 0 && sheave_efficiency <= 1)) return { error: "Per-sheave efficiency must be between 0 and 1 (~0.98 roller, 0.96 plain)." };
  const N = parts_of_line;
  const k = sheave_efficiency;
  const frictionless_pull_lb = load_lb / N;
  // Friction stacks per sheave: tension in part i = T*k^(i-1); summing = load, so T = load*(1-k)/(1-k^N).
  // When the hauling line leaves the upper block over one more sheave (the usual case), that sheave costs
  // another factor k: pull = load / (k + k^2 + ... + k^N), the Crosby "How to Figure Line Parts" ratio
  // (1 part 0.98, 4 parts 3.81, 8 parts 7.32 anti-friction). Until 2026-09-25 the lead sheave was left out.
  const lead = Number(lead_sheave) === 0 ? 0 : 1;
  const base_pull = (k === 1) ? frictionless_pull_lb : load_lb * (1 - k) / (1 - Math.pow(k, N));
  const hauling_line_pull_lb = lead ? base_pull / k : base_pull;
  const reeving_efficiency = load_lb / (N * hauling_line_pull_lb);
  if (![hauling_line_pull_lb, frictionless_pull_lb, reeving_efficiency].every(Number.isFinite)) return { error: "Reeving math is not a finite value." };
  return {
    hauling_line_pull_lb,
    frictionless_pull_lb,
    reeving_efficiency,
    note: "The pull needed on the hauling (lead) line of a block-and-tackle or crane hoist reeved with N parts of line, and how much friction costs you. In a frictionless ideal the load divides evenly over the parts, so each part -- and the pull -- is the load divided by N. Real sheaves lose a few percent each to bearing and rope-bending friction, and that loss STACKS: the part nearest the hauling end carries the most, and the tension in successive parts falls by the per-sheave efficiency k, so summing the parts to equal the load gives a hauling-line pull of load x (1 - k) / (1 - k^N). With a 20,000 lb load on 4 parts and k = 0.98 (a roller-bearing sheave), the pull is 20,000 x 0.02 / (1 - 0.98^4) = 5,152 lb -- above the frictionless 5,000 lb -- and the reeving efficiency is load / (N x pull) = 97.0%. Plain-bronze (bushed) sheaves run nearer k = 0.96 and cost more; more parts multiply the load advantage but also stack more friction, so doubling the parts never quite halves the pull. This is the STEADY hauling pull, not the higher force to overcome inertia and start the load moving, and it is the pull on the lead line only. A rigging screen; the block and rope ratings, the actual sheave friction, the reeving pattern, and a qualified rigger and the lift plan govern.",
  };
}

export const reevingPartsOfLineExample = { inputs: { load_lb: 20000, parts_of_line: 4, sheave_efficiency: 0.98, lead_sheave: 1 } };

function _v991renderReevingPartsOfLine(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: block-and-tackle reeving line pull, by name. pull = load / (k + k^2 + ... + k^N) with the lead line over a sheave (the Crosby line-parts ratio), or load x (1 - k) / (1 - k^N) without; reeving efficiency = load / (N x pull); k per-sheave ~0.98 roller / 0.96 plain. Steady hauling pull on the lead line only (not the inertia to start the load). The block/rope ratings, the sheave friction, and a qualified rigger and lift plan govern.";
  const ld = makeNumber("Load (lb)", "rpl-ld", { step: "any", min: "0" });
  const np = makeNumber("Parts of line", "rpl-np", { step: "1", min: "1" });
  const ke = makeNumber("Per-sheave efficiency (0.98 roller, 0.96 plain)", "rpl-ke", { step: "any", min: "0", max: "1" });
  const lsh = makeSelect("Lead line leaves the block", "rpl-ls", [
    { value: "1", label: "Over a sheave (Crosby, usual)", selected: true }, { value: "0", label: "Straight off a part (no lead sheave)" },
  ]);
  for (const f of [ld, np, ke, lsh]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ld.input.value = "20000"; np.input.value = "4"; ke.input.value = "0.98"; lsh.select.value = "1"; update(); });
  const oP = makeOutputLine(outputRegion, "Hauling-line pull", "rpl-out-p");
  const oE = makeOutputLine(outputRegion, "Reeving efficiency", "rpl-out-e");
  const update = debounce(() => {
    const r = computeReevingPartsOfLine({
      load_lb: ld.input.value === "" ? 20000 : Number(ld.input.value), parts_of_line: np.input.value === "" ? 4 : Number(np.input.value),
      sheave_efficiency: ke.input.value === "" ? 0.98 : Number(ke.input.value), lead_sheave: Number(lsh.select.value),
    });
    if (r.error) { oP.textContent = r.error; oE.textContent = "-"; return; }
    oP.textContent = fmt(r.hauling_line_pull_lb, 0) + " lb (frictionless " + fmt(r.frictionless_pull_lb, 0) + " lb)";
    oE.textContent = fmt(r.reeving_efficiency * 100, 1) + "%";
  }, DEBOUNCE_MS);
  for (const f of [ld, np, ke]) f.input.addEventListener("input", update);
  lsh.select.addEventListener("input", update);
}
RIGGINGFIELD_RENDERERS["reeving-parts-of-line"] = _v991renderReevingPartsOfLine;

// ===================== spec-v996: guy-wire / down-guy tension and mast download =====================
// dims: in { horizontal_load_lb: M L T^-2, attachment_height_ft: L, anchor_lead_ft: L } out: { guy_angle_deg: dimensionless, guy_tension_lb: dimensionless, mast_download_lb: dimensionless, anchor_uplift_lb: dimensionless }
export function computeGuyWireTension({ horizontal_load_lb = 500, attachment_height_ft = 20, anchor_lead_ft = 20 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(horizontal_load_lb > 0)) return { error: "Horizontal load must be positive (lb)." };
  if (!(attachment_height_ft > 0)) return { error: "Attachment height must be positive (ft)." };
  if (!(anchor_lead_ft > 0)) return { error: "Anchor lead distance must be positive (ft)." };
  // Statics: a guy at angle theta above horizontal resists a horizontal top load H.
  const theta = Math.atan(attachment_height_ft / anchor_lead_ft);
  const guy_angle_deg = theta * 180 / Math.PI;
  const guy_tension_lb = horizontal_load_lb / Math.cos(theta);
  const mast_download_lb = horizontal_load_lb * Math.tan(theta);
  const anchor_uplift_lb = mast_download_lb; // the guy's vertical pull on the anchor equals the mast download
  if (![guy_angle_deg, guy_tension_lb, mast_download_lb].every(Number.isFinite)) return { error: "Guy-wire math is not a finite value." };
  return {
    guy_angle_deg,
    guy_tension_lb,
    mast_download_lb,
    anchor_uplift_lb,
    note: "The tension in a guy wire holding a mast, pole, or tower against a horizontal load, and the vertical compression that guy stacks onto the mast. A single down-guy attached at a height H_a up the mast and anchored a horizontal lead distance L away makes an angle theta above horizontal of arctan(H_a / L). To resist a horizontal load H at the top -- wind on an antenna, the pull of a conductor or a highline, a sign's wind area -- the guy must carry a tension of H / cos(theta), which is always MORE than the load itself and climbs steeply as the guy gets steeper. At the same time the guy pulls DOWN on the mast, adding a vertical compression (mast download) of H x tan(theta) that the pole and its footing must carry on top of everything else, and it pulls UP on the anchor by the same amount. A 500 lb horizontal load on a guy attached 20 ft up and anchored 20 ft out sits at 45 degrees, so the guy tension is 500 / cos45 = 707 lb and the mast download is 500 x tan45 = 500 lb. Steepen the guy -- a short anchor lead -- and both the tension and the download shoot up (a guy at 63 degrees (a 2:1 rise-to-lead) roughly doubles the download), which is exactly why crews want long anchor leads and shallow guy angles. This is single-guy statics only (a real installation balances guys in multiple directions, adds the mast's own wind and weight, and pretensions the guys); the pole class, the anchor holding capacity, the guy grade, and the engineer of record or the NESC / RUS standard govern the actual design.",
  };
}

export const guyWireTensionExample = { inputs: { horizontal_load_lb: 500, attachment_height_ft: 20, anchor_lead_ft: 20 } };

function _v996renderGuyWireTension(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: guy-wire / down-guy tension and mast download, by name. theta = atan(height/lead); guy tension = H / cos(theta); mast download (and anchor uplift) = H x tan(theta). Single-guy statics only (real rigs balance multiple guys, mast wind/weight, pretension). The pole class, anchor capacity, guy grade, and the engineer / NESC / RUS govern.";
  const hl = makeNumber("Horizontal load at top (lb)", "gwt-hl", { step: "any", min: "0" });
  const ah = makeNumber("Guy attachment height (ft)", "gwt-ah", { step: "any", min: "0" });
  const al = makeNumber("Anchor lead distance (ft)", "gwt-al", { step: "any", min: "0" });
  for (const f of [hl, ah, al]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { hl.input.value = "500"; ah.input.value = "20"; al.input.value = "20"; update(); });
  const oT = makeOutputLine(outputRegion, "Guy tension", "gwt-out-t");
  const oD = makeOutputLine(outputRegion, "Mast download / anchor uplift", "gwt-out-d");
  const update = debounce(() => {
    const r = computeGuyWireTension({
      horizontal_load_lb: hl.input.value === "" ? 500 : Number(hl.input.value), attachment_height_ft: ah.input.value === "" ? 20 : Number(ah.input.value),
      anchor_lead_ft: al.input.value === "" ? 20 : Number(al.input.value),
    });
    if (r.error) { oT.textContent = r.error; oD.textContent = "-"; return; }
    oT.textContent = fmt(r.guy_tension_lb, 0) + " lb (guy at " + fmt(r.guy_angle_deg, 1) + " deg)";
    oD.textContent = fmt(r.mast_download_lb, 0) + " lb";
  }, DEBOUNCE_MS);
  for (const f of [hl, ah, al]) f.input.addEventListener("input", update);
}
RIGGINGFIELD_RENDERERS["guy-wire-tension"] = _v996renderGuyWireTension;

// --- spec-v1157: crane power line clearance (OSHA 1926.1408) ---
// The number everyone carries is 20 ft. It is a DEFAULT you take when you have not
// determined the voltage - one of three options, and usually the most expensive one on a
// tight site. Option (2) keeps everything 20 ft away. Option (3) lets you determine the
// line's voltage and use Table A instead, and Table A starts at 10 FEET for lines up to
// 50 kV - which is most distribution. Halving the exclusion zone by making a phone call to
// the utility is the cheapest thing on this page. Option (1) is deenergize and visibly
// ground, which removes the problem entirely.
// The trap: 20 ft is only the default for lines UP TO 350 kV. Above that the default is
// 50 ft, and Table A keeps climbing past it - so on transmission the number people carry
// is not conservative, it is wrong in the dangerous direction.
// Table A is a US federal regulation table and is in the public domain.
// dims: in { option: dimensionless, voltage_kv: L^2 M T^-3 I^-1, actual_clearance_ft: L, boom_length_ft: L } out: { required_clearance_ft: L, default_clearance_ft: L, clearance_shortfall_ft: L, table_a_saving_ft: L }
export function computeCranePowerLineClearance({ option = "default", voltage_kv = 0, actual_clearance_ft = 0, boom_length_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const kv = Number(voltage_kv) || 0;
  const act = Number(actual_clearance_ft) || 0;
  const boom = Number(boom_length_ft) || 0;
  const KNOWN = ["deenergized", "default", "table-a"];
  if (!KNOWN.includes(option)) return { error: "Option must be deenergized, default, or table-a." };
  if (kv < 0) return { error: "Voltage cannot be negative (kV)." };
  if (act < 0) return { error: "Actual clearance cannot be negative (ft)." };
  if (boom < 0) return { error: "Boom length cannot be negative (ft)." };
  if (option === "table-a" && !(kv > 0)) return { error: "Table A requires the line voltage - that determination is the whole point of the option." };

  // Table A, 29 CFR 1926.1408 - a federal regulation table, public domain.
  const tableA = (v) => v <= 50 ? 10 : v <= 200 ? 15 : v <= 350 ? 20 : v <= 500 ? 25 : v <= 750 ? 35 : v <= 1000 ? 45 : null;
  const table_a_ft = kv > 0 ? tableA(kv) : null;
  const over_1000kv = kv > 1000;

  // The default is 20 ft only up to 350 kV; above that it is 50, and over 1,000 kV there is no
  // default number -- the utility or a registered PE sets it (1926.1409(a) and (b)).
  const voltage_known = kv > 0;
  const default_clearance_ft = voltage_known ? (kv <= 350 ? 20 : kv <= 1000 ? 50 : null) : 20;
  const default_assumed = !voltage_known;

  let required_clearance_ft, route;
  if (option === "deenergized") {
    required_clearance_ft = 0;
    route = "deenergized and visibly grounded";
  } else if (option === "table-a") {
    required_clearance_ft = table_a_ft;
    route = "Table A at " + kv + " kV";
  } else {
    required_clearance_ft = default_clearance_ft;
    route = "the default clearance";
  }

  const determinable = required_clearance_ft !== null;
  const clearance_ok = determinable ? act >= required_clearance_ft : null;
  const clearance_shortfall_ft = determinable ? Math.max(0, required_clearance_ft - act) : 0;
  // What determining the voltage would buy, against the default you would otherwise take.
  const table_a_saving_ft = table_a_ft !== null && default_clearance_ft !== null ? Math.max(0, default_clearance_ft - table_a_ft) : 0;
  const table_a_helps = table_a_saving_ft > 0;
  const default_is_unsafe = voltage_known && kv > 350 && option === "default" && act >= 20 - 1e-9 * Math.abs(20) && act < 50;
  const boom_reaches = boom > 0 && determinable ? boom > act : null;

  const passes = option === "deenergized" || (clearance_ok === true);

  const note = "THE 20 FT EVERYONE CARRIES IS A DEFAULT, not the rule. 1926.1408 gives three options and the default is the one you take when you have NOT determined the voltage. "
    + "Option 1, deenergize and visibly ground the line at the worksite, removes the problem entirely. Option 2 keeps every part of the equipment, load line, and load - including rigging and lifting accessories - at least 20 ft away. Option 3 lets you DETERMINE the line's voltage and use Table A instead. "
    + "Table A starts at 10 FT for lines up to 50 kV, which is most distribution. "
    + (table_a_helps ? "Here that is " + table_a_ft + " ft against a " + default_clearance_ft + " ft default - determining the voltage buys back " + table_a_saving_ft + " ft of working radius, and it costs a phone call to the utility. On a tight site that is the cheapest thing on the page. " : voltage_known ? "At " + kv + " kV Table A gives " + (table_a_ft === null ? "no figure - over 1,000 kV the distance comes from the utility owner or a qualified engineer" : table_a_ft + " ft, which is no better than the " + default_clearance_ft + " ft default here") + ". " : "")
    + "THE TRAP RUNS THE OTHER WAY TOO: 20 ft is the default only for lines UP TO 350 kV. Above that the default is 50 ft and Table A keeps climbing - 25 ft over 350, 35 over 500, 45 over 750 - so on transmission the number people carry is not conservative, it is wrong in the dangerous direction. "
    + (default_assumed ? "No voltage was entered, so the 20 ft default shown assumes the line is at or under 350 kV. If it is not, that assumption is the failure. " : "")
    + (over_1000kv ? "Over 1,000 kV Table A gives no number: the minimum clearance is established by the utility owner or operator or by a registered professional engineer who is a qualified person with respect to electrical power transmission and distribution. " : "")
    + "This setup: " + route + (determinable ? ", requiring " + required_clearance_ft + " ft, with " + act + " ft actual - " + (clearance_ok ? "OK. " : "SHORT by " + clearance_shortfall_ft.toFixed(1) + " ft. ") : ", which this tile cannot reduce to a number. ")
    + (default_is_unsafe ? "WARNING: this line is over 350 kV and the clearance entered would satisfy a 20 ft default that does not apply to it. " : "")
    + (boom_reaches ? "The boom at " + boom + " ft is longer than the clearance being held, so the line is inside the machine's reach - which is exactly the condition the encroachment-prevention measures exist for, and it means clearance is a matter of control rather than geometry. " : "")
    + "Not checked: the encroachment-prevention measures the options require - a dedicated spotter, proximity alarms, range control, insulating links, or a range limiting device - which are conditions of using the clearance rather than optional extras; the planning meeting and the requirement to identify the work zone; assembly and disassembly near power lines, which has its own section; travel under or near lines with no load; the utility's confirmation of voltage; and the separate rules for lines over 350 kV and for equipment operating near transmission. A screen, not a lift plan; 29 CFR 1926 Subpart CC, the utility owner or operator, and the qualified person govern.";

  return { route, required_clearance_ft, default_clearance_ft, default_assumed, table_a_ft, table_a_saving_ft, table_a_helps, over_1000kv, determinable, clearance_ok, clearance_shortfall_ft, default_is_unsafe, boom_reaches, passes, note };
}

export const cranePowerLineClearanceExample = { inputs: { option: "table-a", voltage_kv: 12, actual_clearance_ft: 12, boom_length_ft: 80 } };

function _v1157renderCranePowerLineClearance(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: OSHA 29 CFR 1926.1408 and 1926.1409 (lines over 350 kV), US federal regulations in the public domain. For power lines up to 350 kV the employer must either confirm from the utility owner or operator that the line has been deenergized and visibly grounded at the worksite; or ensure that no part of the equipment, load line, or load - including rigging and lifting accessories - gets closer than 20 feet to the line while implementing the encroachment-prevention measures of paragraph (b); or determine the line's voltage and use the Table A minimum clearance distance while implementing those same measures. Table A: up to 50 kV, 10 ft; over 50 to 200 kV, 15 ft; over 200 to 350 kV, 20 ft; over 350 to 500 kV, 25 ft; over 500 to 750 kV, 35 ft; over 750 to 1,000 kV, 45 ft; over 1,000 kV, as established by the utility owner or operator or a registered professional engineer who is a qualified person with respect to electrical power transmission and distribution. Not checked: the encroachment-prevention measures themselves, the planning meeting and work-zone identification, assembly and disassembly near power lines, travel with no load, or the utility's voltage confirmation. A screen, not a lift plan; Subpart CC, the utility, and the qualified person govern.";
  const op = makeSelect("Which option", "cpc-op", [
    { value: "default", label: "Default clearance (voltage not determined)", selected: true },
    { value: "table-a", label: "Table A (voltage determined)" },
    { value: "deenergized", label: "Deenergized and visibly grounded" },
  ]);
  const kv = makeNumber("Line voltage (kV; 0 = not determined)", "cpc-kv", { step: "any", min: "0" }); kv.input.value = "0";
  const ac = makeNumber("Actual clearance held (ft)", "cpc-ac", { step: "any", min: "0" });
  const bl = makeNumber("Boom length (ft; 0 to skip)", "cpc-bl", { step: "any", min: "0" });
  inputRegion.appendChild(op.wrap); inputRegion.appendChild(kv.wrap); inputRegion.appendChild(ac.wrap); inputRegion.appendChild(bl.wrap);
  attachExampleButton(inputRegion, () => { op.select.value = "table-a"; kv.input.value = "12"; ac.input.value = "12"; bl.input.value = "80"; update(); });
  const oR = makeOutputLine(outputRegion, "Required clearance", "cpc-out-r");
  const oV = makeOutputLine(outputRegion, "Verdict", "cpc-out-v");
  const oT = makeOutputLine(outputRegion, "What determining the voltage buys", "cpc-out-t");
  const oD = makeOutputLine(outputRegion, "Default in force", "cpc-out-d");
  const oB = makeOutputLine(outputRegion, "Boom vs clearance", "cpc-out-b");
  const oN = makeOutputLine(outputRegion, "Note", "cpc-out-n");
  const update = debounce(() => {
    const r = computeCranePowerLineClearance({ option: op.select.value, voltage_kv: Number(kv.input.value) || 0, actual_clearance_ft: Number(ac.input.value) || 0, boom_length_ft: Number(bl.input.value) || 0 });
    if (r.error) { oR.textContent = r.error; oV.textContent = "-"; oT.textContent = "-"; oD.textContent = "-"; oB.textContent = "-"; oN.textContent = "-"; return; }
    oR.textContent = r.required_clearance_ft === null ? "not a number - utility or qualified engineer sets it" : r.required_clearance_ft + " ft via " + r.route;
    oV.textContent = r.passes ? "PASSES the clearance entered" : r.clearance_ok === null ? "cannot be determined here" : "SHORT by " + fmt(r.clearance_shortfall_ft, 1) + " ft";
    oT.textContent = r.table_a_ft === null ? "-" : r.table_a_helps ? r.table_a_saving_ft + " ft of working radius (" + r.table_a_ft + " ft vs a " + r.default_clearance_ft + " ft default)" : "nothing at this voltage";
    oD.textContent = r.default_clearance_ft === null ? "none over 1,000 kV - the utility or a registered PE sets it" : r.default_clearance_ft + " ft" + (r.default_assumed ? " - ASSUMES the line is 350 kV or under, since no voltage was entered" : "");
    oB.textContent = r.boom_reaches === null ? "-" : r.boom_reaches ? "the line is inside the machine's reach - clearance is control, not geometry" : "the boom cannot reach the line";
    oN.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const x of [kv, ac, bl]) x.input.addEventListener("input", update);
  op.select.addEventListener("change", update);
}
RIGGINGFIELD_RENDERERS["crane-power-line-clearance"] = _v1157renderCranePowerLineClearance;
