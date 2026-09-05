// calc-doorhardware.js -- Group E and A (cont.): door hardware and
// locksmithing bench.
//
// specs/scope-trade-expansion-2.md probed the live catalog for the vocabulary
// of thirty US trades. Locksmithing and door hardware came back zero: the
// catalog knew a door's clear width and its maneuvering clearance, and nothing
// about the closer, the lock prep, the panic device, the key system, the fire
// door's clearances, the gate operator, or the revolving door.
//
// Tiles (nine keep group "E", the existing Carpentry and Construction
// category; the two electrified-hardware tiles keep group "A", Electrical --
// a module is independent of the group letter per the v28/v70..v103 split
// precedent):
//   v1571 door-closer-opening-force   v1577 key-cut-macs-check
//   v1572 lock-backset-strike-layout  v1578 door-undercut-transfer-air
//   v1573 panic-hardware-force        v1579 fire-door-clearance
//   v1574 electric-lock-power-budget  v1580 gate-operator-duty-cycle
//   v1575 maglock-holding-leverage    v1581 revolving-door-throughput
//   v1576 master-key-bitting-capacity
//
// Half of these sit against life-safety limits -- egress force, fire door
// clearance, entrapment protection -- and NONE of them ships a code table:
// every limit is ENTERED from the adopted edition. GOVERNANCE.general
// throughout. See spec-v1571.md through spec-v1581.md.

import {
  DEBOUNCE_MS, debounce, makeNumber,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

// v18 §7 contract guard: reject a non-finite numeric input (copied verbatim
// from the sibling calc-* modules; non-exported, no corpus row).
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

// Compact renderer factory (number inputs only here; same shape as the
// calc-disinfect.js / calc-rail.js / calc-elevator.js _simpleRenderer).
function _simpleRenderer(spec) {
  const _rlRender = function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    attachExampleButton(inputRegion, () => fillExample(spec.example));
    const fields = {};
    for (const f of spec.fields) {
      const field = makeNumber(f.label, f.id || f.key, f.attrs || { step: "any", min: "0" });
      fields[f.key] = field;
      if (f.default !== undefined) field.input.value = String(f.default);
      inputRegion.appendChild(field.wrap);
    }
    const outs = {};
    for (const o of spec.outputs) outs[o.key] = makeOutputLine(outputRegion, o.label, o.id);
    function fillExample(v) {
      for (const f of spec.fields) {
        if (v[f.key] === undefined) continue;
        fields[f.key].input.value = v[f.key];
      }
      update();
    }
    const update = debounce(() => {
      const params = {};
      for (const f of spec.fields) params[f.key] = Number(fields[f.key].input.value) || 0;
      const r = spec.compute(params);
      if (r.error) { for (const k of Object.keys(outs)) outs[k].textContent = "-"; outs[spec.outputs[0].key].textContent = r.error; return; }
      for (const o of spec.outputs) outs[o.key].textContent = o.value(r);
    }, DEBOUNCE_MS);
    for (const f of spec.fields) fields[f.key].input.addEventListener("input", update);
  };

  _rlRender.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind, options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? null })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _rlRender;
}

export const DOORHARDWARE_RENDERERS = {};

// One inch of water column exerts 5.2 lbf per square foot; 144 square inches
// per square foot.
const _LBF_PER_SQFT_PER_INWC = 5.2;
const _SQIN_PER_SQFT = 144;

// ===================== spec-v1571: door closer size and opening force =====================

// dims: in { door_width_in: L, door_height_in: L, door_weight_lb: M L T^-2, measured_opening_force_lbf: M L T^-2, force_limit_lbf: M L T^-2, measured_closing_time_s: T, min_closing_time_s: T, pressure_difference_inwc: M L^-1 T^-2 } out: { closer_size: dimensionless, force_margin_lbf: M L T^-2, pressure_force_lbf: M L T^-2, closer_force_lbf: M L T^-2 }
export function computeDoorCloserForce({ door_width_in = 0, door_height_in = 0, door_weight_lb = 0, measured_opening_force_lbf = 0, force_limit_lbf = 5, measured_closing_time_s = 0, min_closing_time_s = 5, pressure_difference_inwc = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(door_width_in > 0)) return { error: "Door width must be positive." };
  if (!(door_height_in > 0)) return { error: "Door height must be positive." };
  if (!(door_weight_lb > 0)) return { error: "Door weight must be positive." };
  if (!(measured_opening_force_lbf > 0)) return { error: "Measured opening force must be positive." };
  if (!(force_limit_lbf > 0)) return { error: "Opening force limit must be positive." };
  if (!(measured_closing_time_s > 0)) return { error: "Measured closing time must be positive." };
  if (!(min_closing_time_s > 0)) return { error: "Minimum closing time must be positive." };
  if (!(pressure_difference_inwc >= 0)) return { error: "Pressure difference cannot be negative." };
  // ANSI/BHMA A156.4 size bands run 1 through 6 by door width, one size per
  // six inches from a 30 in size-1 door. A heavy leaf or a pressure
  // difference across the opening pushes the selection up a size.
  const width_size = Math.min(6, Math.max(1, Math.ceil((door_width_in - 24) / 6)));
  const heavy_bump = door_weight_lb > 100 ? 1 : 0;
  const pressure_bump = pressure_difference_inwc >= 0.05 ? 1 : 0;
  const closer_size = Math.min(6, width_size + heavy_bump + pressure_bump);
  const force_margin_lbf = force_limit_lbf - measured_opening_force_lbf;
  const force_ok = measured_opening_force_lbf <= force_limit_lbf;
  // A uniform pressure on a leaf hinged at one edge resolves to half the
  // total pressure force at the pull, because the pressure acts at the
  // leaf's centreline and the pull is a full width from the hinge.
  const door_area_sqft = door_width_in * door_height_in / _SQIN_PER_SQFT;
  const pressure_force_lbf = door_area_sqft * pressure_difference_inwc * _LBF_PER_SQFT_PER_INWC / 2;
  const closer_force_lbf = measured_opening_force_lbf - pressure_force_lbf;
  const closing_time_ok = measured_closing_time_s >= min_closing_time_s;
  const pressure_explains = !force_ok && closer_force_lbf <= force_limit_lbf;
  return {
    closer_size, width_size, force_margin_lbf, force_ok, door_area_sqft,
    pressure_force_lbf, closer_force_lbf, closing_time_ok, pressure_explains,
    verdict: force_ok ? "within the entered opening force limit" : "OVER the entered opening force limit",
    diagnosis: pressure_explains
      ? "the pressure difference across the door accounts for the overage -- this is a mechanical problem, not a hardware one"
      : force_ok ? "no conflict at the entered readings"
        : "the closer itself is over the limit; check hinge bind and latch and strike alignment before turning the spring down",
    note: "A closer has to be strong enough to close and latch the door and weak enough that a person can open it, and those two requirements fight. A closer sized down until the opening force meets the limit may not have the power to close the door against its latch, its gasketing, and the building's stack pressure -- and a fire door that does not latch is a failed fire door. When both cannot be met the answer is a lower-friction hinge set, a different latch, addressing the pressure difference across the door, or a power operator, not a weaker spring. The adjustments are commonly confused. Spring power sets the opening force; sweep speed and latch speed set how fast it closes and are hydraulic rather than spring; backcheck protects the door and the closer from being thrown open into a wall. Slowing the sweep does not reduce opening force. Accessibility also imposes a minimum closing TIME, so a door tuned to slam shut fails even when its opening force is fine. This is a sizing band and a limit comparison, not a closer selection: that is a manufacturer choice based on width, weight, mounting, and the pressure condition, and the manufacturer's chart governs. Limits and how they are measured differ between the accessibility standards, the building code, and the life safety code, and fire doors are treated differently again. On a rated door the assembly MUST close and latch from any position, and adjusting below the power needed to do that defeats a life-safety device whatever the force reading says. NFPA 80, the adopted building and accessibility codes, the manufacturers' listings, and the authority having jurisdiction govern.",
  };
}
const doorCloserExample = { inputs: { door_width_in: 36, door_height_in: 84, door_weight_lb: 85, measured_opening_force_lbf: 6.5, force_limit_lbf: 5, measured_closing_time_s: 4.2, min_closing_time_s: 5, pressure_difference_inwc: 0.03 } };
DOORHARDWARE_RENDERERS["door-closer-opening-force"] = _simpleRenderer({
  citation: "Citation: ANSI/BHMA A156.4 closer size bands by door width (one size per six inches from a 30 in size 1), with the accessibility and building-code opening force limits and minimum closing time named, and NFPA 80 cited for rated doors. Limits are entered from the adopted code; the closer itself is a manufacturer selection.",
  example: doorCloserExample.inputs,
  fields: [
    { key: "door_width_in", label: "Door width (in)", kind: "number", default: 36 },
    { key: "door_height_in", label: "Door height (in)", kind: "number", default: 84 },
    { key: "door_weight_lb", label: "Door leaf weight (lb)", kind: "number", default: 85 },
    { key: "measured_opening_force_lbf", label: "Measured opening force at the latch edge (lbf)", kind: "number", default: 6.5 },
    { key: "force_limit_lbf", label: "Applicable opening force limit (lbf)", kind: "number", default: 5 },
    { key: "measured_closing_time_s", label: "Measured closing time, 90 to 12 degrees (s)", kind: "number", default: 4.2 },
    { key: "min_closing_time_s", label: "Required minimum closing time (s)", kind: "number", default: 5 },
    { key: "pressure_difference_inwc", label: "Pressure difference across the door (in wc)", kind: "number", default: 0.03 },
  ],
  outputs: [
    { key: "s", id: "dcf-out-s", label: "Closer size band", value: (r) => "size " + fmt(r.closer_size, 0) + " (width alone gives size " + fmt(r.width_size, 0) + ")" },
    { key: "f", id: "dcf-out-f", label: "Measured force against the limit", value: (r) => r.verdict + ", margin " + fmt(r.force_margin_lbf, 2) + " lbf" },
    { key: "p", id: "dcf-out-p", label: "Force the pressure difference adds", value: (r) => fmt(r.pressure_force_lbf, 2) + " lbf of the reading" },
    { key: "c", id: "dcf-out-c", label: "Force attributable to the closer", value: (r) => fmt(r.closer_force_lbf, 2) + " lbf" },
    { key: "d", id: "dcf-out-d", label: "Where the overage is", value: (r) => r.diagnosis },
    { key: "t", id: "dcf-out-t", label: "Closing time", value: (r) => r.closing_time_ok ? "meets the entered minimum" : "FASTER than the entered minimum -- the door closes too quickly" },
    { key: "n", id: "dcf-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDoorCloserForce,
});

// ===================== spec-v1572: lock backset, bore, and strike layout =====================

// dims: in { backset_in: L, cross_bore_dia_in: L, edge_bore_dia_in: L, door_thickness_in: L, lock_height_in: L, stile_width_in: L, accessible_min_in: L, accessible_max_in: L } out: { min_stile_required_in: L, edge_bore_side_wall_in: L, cross_bore_far_side_in: L }
export function computeLockBacksetLayout({ backset_in = 2.375, cross_bore_dia_in = 2.125, edge_bore_dia_in = 1, door_thickness_in = 1.75, lock_height_in = 38, stile_width_in = 0, accessible_min_in = 34, accessible_max_in = 48 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(backset_in > 0)) return { error: "Backset must be positive." };
  if (!(cross_bore_dia_in > 0)) return { error: "Cross bore diameter must be positive." };
  if (!(edge_bore_dia_in > 0)) return { error: "Edge bore diameter must be positive." };
  if (!(door_thickness_in > 0)) return { error: "Door thickness must be positive." };
  if (!(edge_bore_dia_in < door_thickness_in)) return { error: "Edge bore cannot be as wide as the door is thick." };
  if (!(lock_height_in > 0)) return { error: "Lock height must be positive." };
  if (!(stile_width_in > 0)) return { error: "Stile width must be positive." };
  if (!(accessible_min_in > 0)) return { error: "Accessible minimum height must be positive." };
  if (!(accessible_max_in > accessible_min_in)) return { error: "Accessible maximum must exceed the minimum." };
  const cross_bore_far_side_in = backset_in + cross_bore_dia_in / 2;
  const cross_bore_near_side_in = backset_in - cross_bore_dia_in / 2;
  const min_stile_required_in = cross_bore_far_side_in;
  const stile_ok = stile_width_in >= min_stile_required_in;
  const edge_bore_center_from_face_in = door_thickness_in / 2;
  const edge_bore_side_wall_in = (door_thickness_in - edge_bore_dia_in) / 2;
  const height_ok = lock_height_in >= accessible_min_in && lock_height_in <= accessible_max_in;
  // The classic error: boring one standard backset for a lock supplied at the
  // other leaves the latch face short of the door edge by the difference.
  const other_backset_in = Math.abs(backset_in - 2.375) < 1e-9 ? 2.75 : 2.375;
  const backset_mismatch_in = Math.abs(other_backset_in - backset_in);
  return {
    cross_bore_far_side_in, cross_bore_near_side_in, min_stile_required_in, stile_ok,
    edge_bore_center_from_face_in, edge_bore_side_wall_in, height_ok,
    strike_height_in: lock_height_in, other_backset_in, backset_mismatch_in,
    height_verdict: height_ok ? "inside the entered operable-parts range" : "OUTSIDE the entered operable-parts range",
    stile_verdict: stile_ok ? "the stile clears the cross bore" : "the stile is TOO NARROW for this prep -- a narrow-stile or mortise lock is required",
    note: "The two standard backsets exist because of door and stile geometry, and mixing them up is the common error: boring for one and fitting a lock supplied at the other leaves the latch short of the strike and the lock proud of the door edge, and there is no adjustment that fixes it. Confirming which one the lock is before the hole saw touches the door takes ten seconds and saves a door. The strike location is where layout errors show up. It sits at the same height as the cross bore, but its horizontal position depends on the door stop location and the door's clearance in the frame, so it is laid out from the CLOSED door rather than measured from the jamb edge; a strike set from the wrong reference produces a door that either will not latch or that rattles. Handing and bevel are the third dimension: a latch bolt has to face the right way and a bevelled edge has to be bevelled toward the stop, and both are determined before boring rather than corrected after. This is a layout aid using standard dimensions and it does not replace the lock manufacturer's own template, which is supplied with the lock and which governs -- manufacturers vary in bore sizes, latch face dimensions, and required clearances, and mortise and multipoint hardware follow entirely different preps. On a rated door, field modification is restricted and any prep beyond the listing voids the label. NFPA 80, the manufacturers' listings and templates, the adopted accessibility standard, and the authority having jurisdiction govern.",
  };
}
const lockBacksetExample = { inputs: { backset_in: 2.375, cross_bore_dia_in: 2.125, edge_bore_dia_in: 1, door_thickness_in: 1.75, lock_height_in: 38, stile_width_in: 5, accessible_min_in: 34, accessible_max_in: 48 } };
DOORHARDWARE_RENDERERS["lock-backset-strike-layout"] = _simpleRenderer({
  citation: "Citation: the standard cylindrical-lock prep dimensions by name -- a 2 3/8 in or 2 3/4 in backset to the cross bore centre, a 2 1/8 in cross bore, and a 1 in edge bore -- with the lock manufacturer's template and NFPA 80 named as governing. The template supplied with the lock is the authority.",
  example: lockBacksetExample.inputs,
  fields: [
    { key: "backset_in", label: "Backset, edge to cross bore centre (in)", kind: "number", default: 2.375 },
    { key: "cross_bore_dia_in", label: "Cross bore diameter (in)", kind: "number", default: 2.125 },
    { key: "edge_bore_dia_in", label: "Edge bore diameter (in)", kind: "number", default: 1 },
    { key: "door_thickness_in", label: "Door thickness (in)", kind: "number", default: 1.75 },
    { key: "lock_height_in", label: "Lock height to centre (in)", kind: "number", default: 38 },
    { key: "stile_width_in", label: "Lock stile width (in)", kind: "number", default: 5 },
    { key: "accessible_min_in", label: "Operable parts minimum height (in)", kind: "number", default: 34 },
    { key: "accessible_max_in", label: "Operable parts maximum height (in)", kind: "number", default: 48 },
  ],
  outputs: [
    { key: "b", id: "lbl-out-b", label: "Cross bore reaches into the stile", value: (r) => fmt(r.cross_bore_far_side_in, 4) + " in from the door edge" },
    { key: "s", id: "lbl-out-s", label: "Minimum stile the prep needs", value: (r) => fmt(r.min_stile_required_in, 4) + " in -- " + r.stile_verdict },
    { key: "e", id: "lbl-out-e", label: "Edge bore centre and remaining wall", value: (r) => fmt(r.edge_bore_center_from_face_in, 3) + " in from each face, " + fmt(r.edge_bore_side_wall_in, 3) + " in of material each side" },
    { key: "k", id: "lbl-out-k", label: "Strike centreline height", value: (r) => fmt(r.strike_height_in, 2) + " in, positioned horizontally from the CLOSED door face" },
    { key: "h", id: "lbl-out-h", label: "Lock height", value: (r) => r.height_verdict },
    { key: "m", id: "lbl-out-m", label: "If the lock is actually the other backset", value: (r) => "the latch face lands " + fmt(r.backset_mismatch_in, 3) + " in off (a " + fmt(r.other_backset_in, 3) + " in lock)" },
    { key: "n", id: "lbl-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeLockBacksetLayout,
});

// ===================== spec-v1573: panic hardware operating force =====================

// dims: in { release_force_lbf: M L T^-2, set_in_motion_lbf: M L T^-2, swing_force_lbf: M L T^-2, release_limit_lbf: M L T^-2, set_in_motion_limit_lbf: M L T^-2, swing_limit_lbf: M L T^-2, door_leaf_width_in: L, actuating_portion_in: L, mounting_height_in: L } out: { release_margin_lbf: M L T^-2, set_in_motion_margin_lbf: M L T^-2, swing_margin_lbf: M L T^-2, required_actuating_in: L }
export function computePanicHardwareForce({ release_force_lbf = 0, set_in_motion_lbf = 0, swing_force_lbf = 0, release_limit_lbf = 15, set_in_motion_limit_lbf = 30, swing_limit_lbf = 15, door_leaf_width_in = 0, actuating_portion_in = 0, mounting_height_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(release_force_lbf > 0)) return { error: "Measured release force must be positive." };
  if (!(set_in_motion_lbf > 0)) return { error: "Measured set-in-motion force must be positive." };
  if (!(swing_force_lbf > 0)) return { error: "Measured swing force must be positive." };
  if (!(release_limit_lbf > 0)) return { error: "Release force limit must be positive." };
  if (!(set_in_motion_limit_lbf > 0)) return { error: "Set-in-motion force limit must be positive." };
  if (!(swing_limit_lbf > 0)) return { error: "Swing force limit must be positive." };
  if (!(door_leaf_width_in > 0)) return { error: "Door leaf width must be positive." };
  if (!(actuating_portion_in > 0)) return { error: "Actuating portion length must be positive." };
  if (!(mounting_height_in > 0)) return { error: "Mounting height must be positive." };
  const release_margin_lbf = release_limit_lbf - release_force_lbf;
  const set_in_motion_margin_lbf = set_in_motion_limit_lbf - set_in_motion_lbf;
  const swing_margin_lbf = swing_limit_lbf - swing_force_lbf;
  const release_ok = release_force_lbf <= release_limit_lbf;
  const set_in_motion_ok = set_in_motion_lbf <= set_in_motion_limit_lbf;
  const swing_ok = swing_force_lbf <= swing_limit_lbf;
  const required_actuating_in = door_leaf_width_in / 2;
  const actuating_ok = actuating_portion_in >= required_actuating_in;
  const height_ok = mounting_height_in >= 34 && mounting_height_in <= 48;
  const all_ok = release_ok && set_in_motion_ok && swing_ok && actuating_ok && height_ok;
  const points_at = all_ok ? "nothing -- every measured value is inside its entered limit"
    : !release_ok ? "the DEVICE: binding, a bent bar, a latch dragging on a misaligned strike, or a device never lubricated"
      : (!set_in_motion_ok || !swing_ok) ? "the DOOR and its environment: the closer, the hinges, or a pressure difference across the opening holding it shut"
        : "the installation geometry rather than any force";
  return {
    release_margin_lbf, set_in_motion_margin_lbf, swing_margin_lbf,
    release_ok, set_in_motion_ok, swing_ok, required_actuating_in, actuating_ok, height_ok,
    all_ok, points_at,
    note: "Three separate forces are measured and they fail for different reasons. Release force is the bar itself, and a high reading points at the device: binding, a bent bar, a latch dragging on a misaligned strike, or a device that has never been lubricated. Set-in-motion and swing forces are the door, and a high reading there points at the closer, the hinges, or a pressure difference across the opening. That last cause is the one people miss. A stair door in a pressurized stairwell can be well within every hardware specification and still take far more than its limit to move, because the building is holding it shut -- and the harder the stairwell is pressurized for smoke control, the worse it gets. Release passing while set-in-motion fails is the signature of something holding the door shut rather than something wrong with the bar, and replacing the exit device would change nothing. Fire exit hardware carries an additional constraint that gets violated with good intentions: on a rated door the latch must engage, so a device dogged down to make a door swing freely for convenience has defeated a fire door, and only listed fire exit hardware without a dogging feature belongs on a rated opening. The limits, how and where the force is measured, and the exceptions differ between the building code, the life safety code, and the accessibility standards, and the adopted code governs. This does not determine whether panic hardware is required for the occupancy and occupant load, address delayed or controlled egress, evaluate the fire door assembly or its annual inspection, or compute the pressure difference across the door. Egress hardware is life-safety equipment and a door that will not open under crowd load is a fatality mechanism: the adopted building and fire codes, the hardware listings, and the authority having jurisdiction govern.",
  };
}
const panicHardwareExample = { inputs: { release_force_lbf: 9, set_in_motion_lbf: 34, swing_force_lbf: 12, release_limit_lbf: 15, set_in_motion_limit_lbf: 30, swing_limit_lbf: 15, door_leaf_width_in: 36, actuating_portion_in: 20, mounting_height_in: 40 } };
DOORHARDWARE_RENDERERS["panic-hardware-force"] = _simpleRenderer({
  citation: "Citation: the egress door operating force limits by name -- release of the latch, force to set the door in motion, and force to swing it to full open, each measured separately -- with the actuating portion required to span at least half the leaf width and a 34 to 48 in mounting height, and NFPA 80 cited for rated doors. Limits are entered from the adopted code.",
  example: panicHardwareExample.inputs,
  fields: [
    { key: "release_force_lbf", label: "Measured latch release force (lbf)", kind: "number", default: 9 },
    { key: "set_in_motion_lbf", label: "Measured force to set the door in motion (lbf)", kind: "number", default: 34 },
    { key: "swing_force_lbf", label: "Measured force to swing to full open (lbf)", kind: "number", default: 12 },
    { key: "release_limit_lbf", label: "Release force limit (lbf)", kind: "number", default: 15 },
    { key: "set_in_motion_limit_lbf", label: "Set-in-motion force limit (lbf)", kind: "number", default: 30 },
    { key: "swing_limit_lbf", label: "Swing force limit (lbf)", kind: "number", default: 15 },
    { key: "door_leaf_width_in", label: "Door leaf width (in)", kind: "number", default: 36 },
    { key: "actuating_portion_in", label: "Actuating portion length (in)", kind: "number", default: 20 },
    { key: "mounting_height_in", label: "Bar mounting height (in)", kind: "number", default: 40 },
  ],
  outputs: [
    { key: "r", id: "phf-out-r", label: "Latch release", value: (r) => (r.release_ok ? "pass" : "FAIL") + ", margin " + fmt(r.release_margin_lbf, 1) + " lbf" },
    { key: "m", id: "phf-out-m", label: "Set the door in motion", value: (r) => (r.set_in_motion_ok ? "pass" : "FAIL") + ", margin " + fmt(r.set_in_motion_margin_lbf, 1) + " lbf" },
    { key: "s", id: "phf-out-s", label: "Swing to full open", value: (r) => (r.swing_ok ? "pass" : "FAIL") + ", margin " + fmt(r.swing_margin_lbf, 1) + " lbf" },
    { key: "a", id: "phf-out-a", label: "Actuating portion", value: (r) => fmt(r.required_actuating_in, 1) + " in required -- " + (r.actuating_ok ? "the installed bar spans it" : "the installed bar is TOO SHORT") },
    { key: "h", id: "phf-out-h", label: "Mounting height", value: (r) => r.height_ok ? "inside 34 to 48 in" : "OUTSIDE 34 to 48 in" },
    { key: "p", id: "phf-out-p", label: "A failure here points at", value: (r) => r.points_at },
    { key: "n", id: "phf-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePanicHardwareForce,
});

// ===================== spec-v1574: electric lock power and standby budget =====================

// dims: in { device_count: dimensionless, holding_current_a: I, inrush_current_a: I, standby_hours: T, battery_derate: dimensionless, supply_rating_a: I, installed_battery_ah: I T } out: { steady_current_a: I, peak_inrush_a: I, amp_hours_required: I T, amp_hours_after_derate: I T }
export function computeElectricLockPowerBudget({ device_count = 0, holding_current_a = 0, inrush_current_a = 0, standby_hours = 24, battery_derate = 0.8, supply_rating_a = 0, installed_battery_ah = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(device_count >= 1)) return { error: "Device count must be at least 1." };
  if (!(holding_current_a > 0)) return { error: "Holding current must be positive." };
  if (!(inrush_current_a > 0)) return { error: "Inrush current must be positive." };
  if (!(inrush_current_a >= holding_current_a)) return { error: "Inrush current cannot be below the holding current." };
  if (!(standby_hours > 0)) return { error: "Standby duration must be positive." };
  if (!(battery_derate > 0 && battery_derate <= 1)) return { error: "Battery derate must be in (0, 1]." };
  if (!(supply_rating_a > 0)) return { error: "Power supply rating must be positive." };
  if (!(installed_battery_ah > 0)) return { error: "Installed battery capacity must be positive." };
  const steady_current_a = device_count * holding_current_a;
  const peak_inrush_a = device_count * inrush_current_a;
  const supply_margin_a = supply_rating_a - steady_current_a;
  const supply_ok = supply_rating_a >= steady_current_a;
  const inrush_ok = supply_rating_a >= peak_inrush_a;
  const amp_hours_required = steady_current_a * standby_hours;
  const amp_hours_after_derate = amp_hours_required / battery_derate;
  const battery_margin_ah = installed_battery_ah - amp_hours_after_derate;
  const battery_ok = installed_battery_ah >= amp_hours_after_derate;
  const batteries_needed = Math.ceil(amp_hours_after_derate / installed_battery_ah);
  return {
    steady_current_a, peak_inrush_a, supply_margin_a, supply_ok, inrush_ok,
    amp_hours_required, amp_hours_after_derate, battery_margin_ah, battery_ok, batteries_needed,
    supply_verdict: !supply_ok ? "UNDER the steady load"
      : !inrush_ok ? "covers the steady load but NOT a simultaneous release -- it will sag on an alarm"
        : "covers both the steady load and a simultaneous release",
    battery_verdict: battery_ok ? "the installed battery covers the standby duration"
      : "the installed battery is SHORT -- this needs an external battery cabinet or a shorter standby requirement",
    note: "Three separate failures hide behind one power supply. Steady current is the easy one and the one everyone computes. Inrush is the second: a strike or magnet energizing draws several times its holding current for a few tens of milliseconds, and a supply sized on holding current alone browns out when every door releases at once on a fire alarm signal, which is exactly when they must all release. Standby is the third and the most commonly wrong. Batteries are sized in amp-hours against a required duration, and that duration is often set by the fire alarm interface rather than by the access control system's own needs. Sizing to nameplate ignores that a battery at end of life and at low temperature delivers considerably less, which is why a derate is applied and why battery replacement is a scheduled item rather than a failure-driven one. The quiet fourth failure is voltage drop: a magnet at the end of a long small-gauge run sees less than its rated voltage and holds with less than its rated force, and the symptom reads as a lock problem when it is a wiring problem. That calculation is the low-voltage DC drop calculator and is not repeated here. Device currents, and especially inrush, must come from the manufacturer's specifications. This does not address the fire alarm interface requirements, which govern both the standby duration and the manner in which locks must release on alarm and which are life-safety requirements rather than design choices, and it does not evaluate egress: electrically locked egress doors are heavily constrained by the building and fire codes, and a lock that fails secure on a door required for egress is a violation regardless of its power budget. The adopted building and fire codes, the device manufacturers' specifications, and the authority having jurisdiction govern.",
  };
}
const electricLockPowerExample = { inputs: { device_count: 14, holding_current_a: 0.45, inrush_current_a: 1.5, standby_hours: 24, battery_derate: 0.8, supply_rating_a: 12, installed_battery_ah: 12 } };
DOORHARDWARE_RENDERERS["electric-lock-power-budget"] = _simpleRenderer({
  citation: "Citation: the standby amp-hour and inrush sizing method by name -- steady current summed across devices, amp-hours as steady current times the required standby duration, and a derate applied for battery age and temperature -- with the fire alarm and egress interface requirements named as governing the duration and the release behaviour. Device currents come from the manufacturer.",
  example: electricLockPowerExample.inputs,
  fields: [
    { key: "device_count", label: "Number of locking devices", kind: "number", default: 14 },
    { key: "holding_current_a", label: "Holding current per device (A)", kind: "number", default: 0.45 },
    { key: "inrush_current_a", label: "Inrush current per device (A)", kind: "number", default: 1.5 },
    { key: "standby_hours", label: "Standby duration required (h)", kind: "number", default: 24 },
    { key: "battery_derate", label: "Battery derate factor", kind: "number", default: 0.8 },
    { key: "supply_rating_a", label: "Power supply rating (A)", kind: "number", default: 12 },
    { key: "installed_battery_ah", label: "Installed battery capacity (Ah)", kind: "number", default: 12 },
  ],
  outputs: [
    { key: "s", id: "elp-out-s", label: "Steady current", value: (r) => fmt(r.steady_current_a, 2) + " A" },
    { key: "i", id: "elp-out-i", label: "Peak inrush, all devices at once", value: (r) => fmt(r.peak_inrush_a, 1) + " A" },
    { key: "m", id: "elp-out-m", label: "Supply against the load", value: (r) => r.supply_verdict + " (" + fmt(r.supply_margin_a, 2) + " A of steady margin)" },
    { key: "a", id: "elp-out-a", label: "Amp-hours for the standby duration", value: (r) => fmt(r.amp_hours_required, 1) + " Ah, " + fmt(r.amp_hours_after_derate, 1) + " Ah after derate" },
    { key: "b", id: "elp-out-b", label: "Installed battery", value: (r) => r.battery_verdict + " (" + fmt(r.battery_margin_ah, 1) + " Ah of margin)" },
    { key: "c", id: "elp-out-c", label: "Batteries of the installed size required", value: (r) => fmt(r.batteries_needed, 0) },
    { key: "n", id: "elp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeElectricLockPowerBudget,
});

// ===================== spec-v1575: maglock holding force and door leverage =====================

// dims: in { rated_holding_lb: M L T^-2, lock_distance_from_hinge_in: L, handle_distance_from_hinge_in: L, door_width_in: L, gap_derate_pct: dimensionless, voltage_at_lock: M L^2 T^-3 I^-1, rated_voltage: M L^2 T^-3 I^-1, target_resistance_lb: M L T^-2 } out: { lever_ratio: dimensionless, force_at_handle_lb: M L T^-2, best_case_force_lb: M L T^-2, effective_force_lb: M L T^-2, rating_needed_lb: M L T^-2 }
export function computeMaglockLeverage({ rated_holding_lb = 0, lock_distance_from_hinge_in = 0, handle_distance_from_hinge_in = 0, door_width_in = 0, gap_derate_pct = 0, voltage_at_lock = 24, rated_voltage = 24, target_resistance_lb = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(rated_holding_lb > 0)) return { error: "Rated holding force must be positive." };
  if (!(door_width_in > 0)) return { error: "Door width must be positive." };
  if (!(lock_distance_from_hinge_in > 0)) return { error: "Lock distance from the hinge must be positive." };
  if (!(lock_distance_from_hinge_in <= door_width_in)) return { error: "The lock cannot sit beyond the door width." };
  if (!(handle_distance_from_hinge_in > 0)) return { error: "Handle distance from the hinge must be positive." };
  if (!(handle_distance_from_hinge_in <= door_width_in)) return { error: "The handle cannot sit beyond the door width." };
  if (!(gap_derate_pct >= 0 && gap_derate_pct < 100)) return { error: "Gap derate must be in [0, 100) percent." };
  if (!(voltage_at_lock > 0)) return { error: "Voltage at the lock must be positive." };
  if (!(rated_voltage > 0)) return { error: "Rated voltage must be positive." };
  if (!(target_resistance_lb > 0)) return { error: "Target resistance at the handle must be positive." };
  const lever_ratio = lock_distance_from_hinge_in / handle_distance_from_hinge_in;
  const force_at_handle_lb = rated_holding_lb * lever_ratio;
  // Best practice puts the magnet as close to the strike edge as the header
  // allows -- the same setback from the far edge that it currently has from
  // the hinge.
  const best_lock_distance_in = Math.max(lock_distance_from_hinge_in, door_width_in - lock_distance_from_hinge_in);
  const best_case_force_lb = rated_holding_lb * best_lock_distance_in / handle_distance_from_hinge_in;
  const improvement_factor = best_case_force_lb / force_at_handle_lb;
  // An electromagnet's force follows the square of the flux, so it follows
  // the square of the supply voltage; the gap derate is entered because a
  // real gap's effect depends on the lock and is not a clean function.
  const voltage_factor = Math.min(1, (voltage_at_lock / rated_voltage) ** 2);
  const gap_factor = 1 - gap_derate_pct / 100;
  const effective_force_lb = force_at_handle_lb * gap_factor * voltage_factor;
  const rating_needed_lb = target_resistance_lb / lever_ratio;
  return {
    lever_ratio, force_at_handle_lb, best_lock_distance_in, best_case_force_lb, improvement_factor,
    voltage_factor, gap_factor, effective_force_lb, rating_needed_lb,
    meets_target: effective_force_lb >= target_resistance_lb,
    note: "The door is a lever and the magnet is what it works against. A magnet mounted a few inches from the hinge on a three-foot door works at a large mechanical disadvantage against someone pulling at the handle, so a four-figure rating becomes a two-figure resistance -- defeatable by one determined person. Mounting the same magnet near the strike edge changes the ratio to nearly one to one and the lock performs as rated, at no cost. Lock position is the whole design. Two further reductions apply before anyone pulls. Rated holding force assumes full face contact between the armature and the magnet with no gap, and a warped door, paint, dirt, or a misaligned armature drops it sharply -- a sixteenth of an inch is a large loss, and the derate here is entered because the real effect depends on the specific lock. And the magnet must have its rated voltage AT THE LOCK, which a long undersized run does not deliver; force follows roughly the square of the supply voltage, so a small shortfall costs more than it looks. A well-mounted magnet that is dirty and undervolted can end up back where a badly mounted one started. The egress caution is not optional. A magnet holds until it is de-energized, so on any door required for egress the release arrangement -- request to exit, motion sensing, fire alarm interface, and power failure behaviour -- is a code matter, and a magnet that stays locked when the building is on fire is a fatality mechanism regardless of its rating. This does not evaluate the door, frame, or the fasteners securing the magnet and armature, which are frequently the actual failure point, and it does not size power or wiring. The adopted building and fire codes, the lock manufacturer's listing and installation instructions, and the authority having jurisdiction govern.",
  };
}
const maglockLeverageExample = { inputs: { rated_holding_lb: 1200, lock_distance_from_hinge_in: 3, handle_distance_from_hinge_in: 36, door_width_in: 36, gap_derate_pct: 50, voltage_at_lock: 20, rated_voltage: 24, target_resistance_lb: 600 } };
DOORHARDWARE_RENDERERS["maglock-holding-leverage"] = _simpleRenderer({
  citation: "Citation: the lever relation for a door hinged at one edge -- force at the handle = rated holding force x (lock distance from the hinge) / (handle distance from the hinge) -- with the electromagnet's force following the square of supply voltage, and the adopted codes named as governing electrically locked egress. Rated holding force is the manufacturer's.",
  example: maglockLeverageExample.inputs,
  fields: [
    { key: "rated_holding_lb", label: "Lock rated holding force (lb)", kind: "number", default: 1200 },
    { key: "door_width_in", label: "Door width (in)", kind: "number", default: 36 },
    { key: "lock_distance_from_hinge_in", label: "Hinge to lock centre (in)", kind: "number", default: 3 },
    { key: "handle_distance_from_hinge_in", label: "Hinge to handle or pull (in)", kind: "number", default: 36 },
    { key: "gap_derate_pct", label: "Holding loss from armature gap and contamination (%)", kind: "number", default: 50 },
    { key: "voltage_at_lock", label: "Voltage measured at the lock (V)", kind: "number", default: 20 },
    { key: "rated_voltage", label: "Lock rated voltage (V)", kind: "number", default: 24 },
    { key: "target_resistance_lb", label: "Target resistance at the handle (lb)", kind: "number", default: 600 },
  ],
  outputs: [
    { key: "l", id: "mhl-out-l", label: "Lever ratio", value: (r) => fmt(r.lever_ratio, 4) },
    { key: "f", id: "mhl-out-f", label: "Force resisting a pull at the handle", value: (r) => fmt(r.force_at_handle_lb, 0) + " lb" },
    { key: "b", id: "mhl-out-b", label: "Moving the lock toward the strike edge", value: (r) => fmt(r.best_case_force_lb, 0) + " lb at " + fmt(r.best_lock_distance_in, 1) + " in from the hinge (" + fmt(r.improvement_factor, 1) + " times better)" },
    { key: "e", id: "mhl-out-e", label: "After the gap and voltage losses", value: (r) => fmt(r.effective_force_lb, 0) + " lb (voltage alone costs " + fmt((1 - r.voltage_factor) * 100, 0) + "%)" },
    { key: "t", id: "mhl-out-t", label: "Against the target resistance", value: (r) => r.meets_target ? "meets it" : "SHORT of it" },
    { key: "r", id: "mhl-out-r", label: "Rating needed at this lock position", value: (r) => fmt(r.rating_needed_lb, 0) + " lb" },
    { key: "n", id: "mhl-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMaglockLeverage,
});

// ===================== spec-v1576: master key system bitting capacity =====================

// dims: in { cut_positions: dimensionless, usable_depths: dimensionless, mastered_positions: dimensionless, alternative_mastered_positions: dimensionless, change_keys_required: dimensionless } out: { theoretical_total: dimensionless, per_mastered_position: dimensionless, change_keys_available: dimensionless, alternative_change_keys: dimensionless, margin: dimensionless }
export function computeMasterKeyCapacity({ cut_positions = 0, usable_depths = 0, mastered_positions = 0, alternative_mastered_positions = 0, change_keys_required = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(cut_positions >= 1)) return { error: "Cut positions must be at least 1." };
  if (!(usable_depths >= 2)) return { error: "Usable depths must be at least 2." };
  if (!(mastered_positions >= 1)) return { error: "Mastered positions must be at least 1." };
  if (!(mastered_positions <= cut_positions)) return { error: "Mastered positions cannot exceed the cut positions." };
  if (!(alternative_mastered_positions >= 1)) return { error: "Alternative mastered positions must be at least 1." };
  if (!(alternative_mastered_positions <= cut_positions)) return { error: "Alternative mastered positions cannot exceed the cut positions." };
  if (!(change_keys_required >= 1)) return { error: "Change keys required must be at least 1." };
  const theoretical_total = Math.pow(usable_depths, cut_positions);
  // A two-step progression uses every other depth at a mastered position, and
  // the master claims one of them.
  const per_mastered_position = Math.floor(usable_depths / 2);
  const change_keys_available = Math.pow(per_mastered_position, mastered_positions);
  const alternative_change_keys = Math.pow(per_mastered_position, alternative_mastered_positions);
  const margin = change_keys_available - change_keys_required;
  const utilisation_pct = change_keys_required / change_keys_available * 100;
  return {
    theoretical_total, per_mastered_position, change_keys_available, alternative_change_keys,
    margin, utilisation_pct,
    sufficient: change_keys_available >= change_keys_required,
    tight: change_keys_available >= change_keys_required && utilisation_pct > 75,
    verdict: change_keys_available >= change_keys_required
      ? (utilisation_pct > 75 ? "enough, but the requirement uses most of the capacity -- there is no room to expand" : "enough, with room to expand")
      : "NOT ENOUGH -- this system is short before the first cylinder is pinned",
    note: "The theoretical count is a power, and powers grow fast enough to be misleading. Six positions with six usable depths gives tens of thousands of combinations, which sounds inexhaustible -- until the master key claims one value at each mastered position, adjacent-cut and maximum-adjacent-cut rules eliminate a large fraction, keyway restrictions cut it again, and the requirement that change keys not accidentally operate other cylinders cuts it further. The number of genuinely usable change keys in a two-level system is a small fraction of the headline figure, commonly by an order of magnitude or more. The failure this prevents is specific and expensive. A system designed without a proper progression eventually issues a change key whose cuts, combined with the master wafer stack, operate a cylinder it was never meant to -- a cross-keying accident. Discovering that in a building with a thousand cylinders means rekeying the building. The design decision the arithmetic supports is how many positions to master: mastering more gives more change keys and less security, mastering fewer gives a tighter system with a smaller capacity, and the trade should be made deliberately at the start rather than discovered at key three hundred. This is a capacity estimate for a simple two-level, two-step progression. Multi-level systems with grand masters, selective keying, cross-keying, constant cuts, keyway families, and manufacturer-specific restricted keyways all change the arithmetic substantially, and the usable depth count itself depends on the manufacturer's cut specification. It does not generate a bitting list, check for cross-keying conflicts, or verify that no change key inadvertently operates another cylinder -- which is the actual work of system design. The lock manufacturer's system specification, a qualified locksmith or system designer, and the facility's key control policy govern.",
  };
}
const masterKeyExample = { inputs: { cut_positions: 6, usable_depths: 4, mastered_positions: 2, alternative_mastered_positions: 3, change_keys_required: 40 } };
DOORHARDWARE_RENDERERS["master-key-bitting-capacity"] = _simpleRenderer({
  citation: "Citation: the progression capacity relation as standard master keying practice by name -- theoretical combinations = usable depths raised to the number of cut positions, and the change keys a two-step progression yields = the usable depths halved, raised to the number of mastered positions. The manufacturer's system specification governs.",
  example: masterKeyExample.inputs,
  fields: [
    { key: "cut_positions", label: "Cut positions (pins)", kind: "number", default: 6 },
    { key: "usable_depths", label: "Usable depths per position after the cut rules", kind: "number", default: 4 },
    { key: "mastered_positions", label: "Positions carrying the master cut", kind: "number", default: 2 },
    { key: "alternative_mastered_positions", label: "Alternative mastered position count", kind: "number", default: 3 },
    { key: "change_keys_required", label: "Change keys the building needs", kind: "number", default: 40 },
  ],
  outputs: [
    { key: "t", id: "mkc-out-t", label: "Theoretical combinations", value: (r) => fmt(r.theoretical_total, 0) },
    { key: "p", id: "mkc-out-p", label: "Change values per mastered position", value: (r) => fmt(r.per_mastered_position, 0) },
    { key: "c", id: "mkc-out-c", label: "Change keys actually available", value: (r) => fmt(r.change_keys_available, 0) },
    { key: "v", id: "mkc-out-v", label: "Against the requirement", value: (r) => r.verdict + " (margin " + fmt(r.margin, 0) + ")" },
    { key: "a", id: "mkc-out-a", label: "At the alternative mastering", value: (r) => fmt(r.alternative_change_keys, 0) + " change keys" },
    { key: "n", id: "mkc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMasterKeyCapacity,
});

// ===================== spec-v1577: key cut depths and the MACS check =====================

// dims: in { depth_1: dimensionless, depth_2: dimensionless, depth_3: dimensionless, depth_4: dimensionless, depth_5: dimensionless, depth_6: dimensionless, macs: dimensionless, min_depth: dimensionless, max_depth: dimensionless } out: { max_difference: dimensionless, failing_pairs: dimensionless, worst_position: dimensionless }
export function computeKeyCutMacs({ depth_1 = 0, depth_2 = 0, depth_3 = 0, depth_4 = 0, depth_5 = 0, depth_6 = 0, macs = 7, min_depth = 0, max_depth = 9 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(macs > 0)) return { error: "MACS must be positive." };
  if (!(max_depth > min_depth)) return { error: "Maximum depth must exceed the minimum depth." };
  if (!(min_depth >= 0)) return { error: "Minimum depth cannot be negative." };
  const bitting = [depth_1, depth_2, depth_3, depth_4, depth_5, depth_6];
  for (let i = 0; i < bitting.length; i++) {
    if (bitting[i] < min_depth || bitting[i] > max_depth) {
      return { error: "Cut " + (i + 1) + " is outside the entered depth range." };
    }
  }
  const differences = [];
  const failing = [];
  for (let i = 0; i < bitting.length - 1; i++) {
    const d = Math.abs(bitting[i] - bitting[i + 1]);
    differences.push(d);
    if (d > macs) failing.push(i + 1);
  }
  const max_difference = Math.max(...differences);
  const worst_position = differences.indexOf(max_difference) + 1;
  const at_limit = differences.filter((d) => d === macs).length;
  // A long run of identical depths decodes and impressions easily.
  let longest_run = 1, run = 1;
  for (let i = 1; i < bitting.length; i++) {
    run = bitting[i] === bitting[i - 1] ? run + 1 : 1;
    if (run > longest_run) longest_run = run;
  }
  const shallow_shoulder = depth_1 === min_depth;
  return {
    bitting: bitting.join("-"),
    differences: differences.join(", "),
    max_difference, worst_position,
    failing_pairs: failing.length,
    failing_positions: failing.length ? failing.map((p) => p + " to " + (p + 1)).join(", ") : "none",
    at_limit, longest_run, shallow_shoulder,
    pass: failing.length === 0,
    nearest_compliant: failing.length === 0 ? "the bitting is cuttable as entered"
      : "raise the shallower cut or lower the deeper one at position " + worst_position + " to " + (max_difference - macs) + " step(s) less difference",
    verdict: failing.length === 0
      ? (at_limit > 0 ? "cuttable, with " + at_limit + " transition(s) sitting exactly at MACS" : "cuttable, with margin at every transition")
      : "NOT CUTTABLE -- " + failing.length + " adjacent pair(s) exceed MACS",
    note: "The rule exists because a key's cuts are angled flats, and two adjacent cuts at very different depths have their slopes intersect below the top of the blade. The metal that should sit between them is not there, so the cutter either breaks through or leaves a fragile ridge that fails in service -- usually inside a cylinder, which is the expensive way to find out. A violation is also a system design problem rather than only a cutting one. In a master key system the progression generates bittings automatically, and a progression that does not respect the rule will produce uncuttable change keys somewhere in the sequence, so checking the whole bitting list before any cylinder is pinned is the discipline. Two related checks travel with it and are reported alongside: a long run of identical depths produces a key that is easy to decode and to impression, and the shallowest cut at the shoulder position leaves the key weakest where it is worked hardest. Neither is a MACS matter but both are looked at in the same moment. The rule value, the depth increment, the allowable depth range, root spacing, and cut angle are all manufacturer and keyway specific, and a value used for the wrong keyway gives a confident wrong answer. This does not verify that a bitting is appropriate for a system -- that it does not conflict with a master, does not cross-key another cylinder, and follows the intended progression -- which is a bitting chart's work, and it does not address key blank selection, keyway restriction, the controls on duplicating restricted keys, or high-security, dimple, sidebar, and electronic systems. This layout covers a six-position bitting; other pin counts follow the same rule against the manufacturer's own specification. The lock manufacturer's cut specification, a qualified locksmith, and the facility's key control policy govern.",
  };
}
const keyCutMacsExample = { inputs: { depth_1: 2, depth_2: 9, depth_3: 1, depth_4: 4, depth_5: 6, depth_6: 3, macs: 7, min_depth: 0, max_depth: 9 } };
DOORHARDWARE_RENDERERS["key-cut-macs-check"] = _simpleRenderer({
  citation: "Citation: the maximum adjacent cut specification rule by name -- the absolute difference between every pair of adjacent cut depths must not exceed the manufacturer's stated value -- with the manufacturer's cut specification named as governing the value, the depth increment, and the allowable range.",
  example: keyCutMacsExample.inputs,
  fields: [
    { key: "depth_1", label: "Cut 1 depth (shoulder end)", kind: "number", default: 2 },
    { key: "depth_2", label: "Cut 2 depth", kind: "number", default: 9 },
    { key: "depth_3", label: "Cut 3 depth", kind: "number", default: 1 },
    { key: "depth_4", label: "Cut 4 depth", kind: "number", default: 4 },
    { key: "depth_5", label: "Cut 5 depth", kind: "number", default: 6 },
    { key: "depth_6", label: "Cut 6 depth (tip end)", kind: "number", default: 3 },
    { key: "macs", label: "Manufacturer MACS value", kind: "number", default: 7 },
    { key: "min_depth", label: "Shallowest allowable depth number", kind: "number", default: 0 },
    { key: "max_depth", label: "Deepest allowable depth number", kind: "number", default: 9 },
  ],
  outputs: [
    { key: "b", id: "kcm-out-b", label: "Bitting", value: (r) => r.bitting },
    { key: "d", id: "kcm-out-d", label: "Adjacent differences", value: (r) => r.differences },
    { key: "v", id: "kcm-out-v", label: "Against MACS", value: (r) => r.verdict },
    { key: "f", id: "kcm-out-f", label: "Failing positions", value: (r) => r.failing_positions },
    { key: "c", id: "kcm-out-c", label: "Correction", value: (r) => r.nearest_compliant },
    { key: "r", id: "kcm-out-r", label: "Other checks", value: (r) => "longest run of identical depths " + fmt(r.longest_run, 0) + (r.shallow_shoulder ? "; the shoulder cut is at the shallowest depth" : "; the shoulder cut is not at the shallowest depth") },
    { key: "n", id: "kcm-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeKeyCutMacs,
});

// ===================== spec-v1578: door undercut free area and transfer air =====================

// dims: in { door_width_in: L, undercut_in: L, required_cfm: L^3 T^-1, max_velocity_fpm: L T^-1 } out: { free_area_sqin: L^2, free_area_sqft: L^2, cfm_at_velocity: L^3 T^-1, velocity_at_required_fpm: L T^-1, undercut_needed_in: L, grille_free_area_sqft: L^2 }
export function computeDoorUndercutTransferAir({ door_width_in = 0, undercut_in = 0, required_cfm = 0, max_velocity_fpm = 300 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(door_width_in > 0)) return { error: "Door width must be positive." };
  if (!(undercut_in > 0)) return { error: "Undercut height must be positive." };
  if (!(required_cfm > 0)) return { error: "Required transfer airflow must be positive." };
  if (!(max_velocity_fpm > 0)) return { error: "Acceptable face velocity must be positive." };
  const free_area_sqin = door_width_in * undercut_in;
  const free_area_sqft = free_area_sqin / _SQIN_PER_SQFT;
  const cfm_at_velocity = free_area_sqft * max_velocity_fpm;
  const velocity_at_required_fpm = required_cfm / free_area_sqft;
  const noisy = velocity_at_required_fpm > max_velocity_fpm;
  const undercut_needed_in = required_cfm / ((door_width_in / 12) * max_velocity_fpm) * 12;
  const grille_free_area_sqft = required_cfm / max_velocity_fpm;
  const shortfall_cfm = required_cfm - cfm_at_velocity;
  return {
    free_area_sqin, free_area_sqft, cfm_at_velocity, velocity_at_required_fpm, noisy,
    undercut_needed_in, grille_free_area_sqft, shortfall_cfm,
    verdict: noisy
      ? "the gap would run at " + fmt(velocity_at_required_fpm, 0) + " fpm to pass the required air -- it will whistle"
      : "the existing undercut passes the required air below the entered velocity",
    note: "The relation is trivial and the constraint is acoustic. A door gap will pass almost any airflow if you push it hard enough, and the result is a whistle that occupants notice immediately -- so the practical limit is a face velocity around 300 fpm, and above that the answer is more free area rather than more pressure. That is the arithmetic that decides between an undercut and a transfer grille. A room needing a few hundred cfm of transfer air needs free area measured in square feet, not square inches, and no realistic undercut provides it: a door cut two or three inches to solve an airflow problem also fails its fire rating, fails its smoke and sound performance, and looks like a mistake. There is a second consequence worth flagging. The same gap is a sound path, so an undercut sized for airflow undoes much of the door's acoustic rating, which in an office or an exam room is a privacy problem rather than an airflow one -- and where privacy matters the answer is a lined transfer boot rather than a plain grille. This does not address fire and smoke doors, where the undercut is limited by the door's listing and by NFPA 80 clearance requirements and where a transfer opening is generally not permitted at all, because cutting a rated door voids its label. It does not evaluate acoustic performance, address smoke control or pressurization, or account for the pressure difference the transfer path actually operates under, which determines the real flow rather than an assumed face velocity, and it does not size the room's supply or return. The adopted mechanical code, NFPA 80 for rated doors, and the mechanical designer govern.",
  };
}
const doorUndercutExample = { inputs: { door_width_in: 36, undercut_in: 0.75, required_cfm: 250, max_velocity_fpm: 300 } };
DOORHARDWARE_RENDERERS["door-undercut-transfer-air"] = _simpleRenderer({
  citation: "Citation: the free-area transfer relation by name -- free area = door width x undercut height, airflow = free area x face velocity -- with a practical face-velocity ceiling around 300 fpm before the gap becomes audible, and NFPA 80 named for rated door clearances. The mechanical designer governs the transfer path.",
  example: doorUndercutExample.inputs,
  fields: [
    { key: "door_width_in", label: "Door width (in)", kind: "number", default: 36 },
    { key: "undercut_in", label: "Undercut height (in)", kind: "number", default: 0.75 },
    { key: "required_cfm", label: "Required transfer airflow (cfm)", kind: "number", default: 250 },
    { key: "max_velocity_fpm", label: "Acceptable face velocity (fpm)", kind: "number", default: 300 },
  ],
  outputs: [
    { key: "a", id: "dut-out-a", label: "Free area", value: (r) => fmt(r.free_area_sqin, 1) + " sq in (" + fmt(r.free_area_sqft, 3) + " sq ft)" },
    { key: "c", id: "dut-out-c", label: "Airflow at the entered velocity", value: (r) => fmt(r.cfm_at_velocity, 0) + " cfm" },
    { key: "v", id: "dut-out-v", label: "Velocity needed for the required airflow", value: (r) => fmt(r.velocity_at_required_fpm, 0) + " fpm -- " + r.verdict },
    { key: "u", id: "dut-out-u", label: "Undercut the required airflow would need", value: (r) => fmt(r.undercut_needed_in, 2) + " in" },
    { key: "g", id: "dut-out-g", label: "Transfer grille free area instead", value: (r) => fmt(r.grille_free_area_sqft, 2) + " sq ft" },
    { key: "n", id: "dut-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDoorUndercutTransferAir,
});

// ===================== spec-v1579: fire door clearance and inspection limits =====================

// dims: in { head_in: L, hinge_jamb_in: L, strike_jamb_in: L, meeting_edge_in: L, bottom_in: L, perimeter_limit_in: L, meeting_limit_in: L, bottom_limit_in: L } out: { head_margin_in: L, hinge_margin_in: L, strike_margin_in: L, meeting_margin_in: L, bottom_margin_in: L }
export function computeFireDoorClearance({ head_in = 0, hinge_jamb_in = 0, strike_jamb_in = 0, meeting_edge_in = 0, bottom_in = 0, perimeter_limit_in = 0.125, meeting_limit_in = 0.1875, bottom_limit_in = 0.75 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  for (const [name, v] of [["head", head_in], ["hinge jamb", hinge_jamb_in], ["strike jamb", strike_jamb_in], ["meeting edge", meeting_edge_in], ["bottom", bottom_in]]) {
    if (!(v >= 0)) return { error: "The " + name + " clearance cannot be negative." };
  }
  if (!(perimeter_limit_in > 0)) return { error: "Perimeter clearance limit must be positive." };
  if (!(meeting_limit_in > 0)) return { error: "Meeting edge clearance limit must be positive." };
  if (!(bottom_limit_in > 0)) return { error: "Bottom clearance limit must be positive." };
  const head_margin_in = perimeter_limit_in - head_in;
  const hinge_margin_in = perimeter_limit_in - hinge_jamb_in;
  const strike_margin_in = perimeter_limit_in - strike_jamb_in;
  const meeting_margin_in = meeting_limit_in - meeting_edge_in;
  const bottom_margin_in = bottom_limit_in - bottom_in;
  const failures = [];
  if (head_margin_in < 0) failures.push("head");
  if (hinge_margin_in < 0) failures.push("hinge jamb");
  if (strike_margin_in < 0) failures.push("strike jamb");
  if (meeting_margin_in < 0) failures.push("meeting edges");
  if (bottom_margin_in < 0) failures.push("bottom");
  const pass = failures.length === 0;
  // The bottom limit is a MAXIMUM, so floor covering added under the door
  // reduces the clearance and helps; a shortfall is how far the bottom has to
  // come down to comply.
  const covering_headroom_in = Math.max(0, bottom_margin_in);
  const bottom_reduction_needed_in = Math.max(0, -bottom_margin_in);
  return {
    head_margin_in, hinge_margin_in, strike_margin_in, meeting_margin_in, bottom_margin_in,
    pass, failure_count: failures.length,
    failing_locations: failures.length ? failures.join(", ") : "none",
    covering_headroom_in, bottom_reduction_needed_in,
    verdict: pass ? "every measured clearance is inside its entered limit"
      : "FAILS on " + failures.length + " clearance(s): " + failures.join(", "),
    note: "The clearance limits are the part that fails most often and the part that is easiest to check. Too much gap and the assembly does not resist the passage of smoke and flame; a door that has dropped on its hinges, a frame that has been shimmed, or a floor covering removed after installation all move the clearance out of range without anyone touching the door. The bottom clearance is measured to the FLOOR, so adding carpet or tile under a rated door reduces it -- usually fine -- while removing flooring increases it, which is not; a door with an inch and a half of gap over a threshold taken out during a renovation is a failed assembly even though nothing about the door changed. A jamb over its limit is a door that has settled or a frame that has moved, and it is corrected by adjusting the hinges or the frame, not by adding a gasket, which does not restore the assembly's listing. A bottom over its limit takes a threshold or a door bottom listed for the assembly, not a sweep chosen for draught control. The rest of the inspection is not arithmetic and belongs beside the numbers: the label has to be legible, there can be no field modifications -- a hole drilled for a card reader voids the label unless done under the listing -- and the door must close and latch from any position, every time, with nothing blocking, wedging, or dogging it. A door that fails any of those fails regardless of its clearances. Limits differ by door material, construction, the specific listing, and the adopted edition of NFPA 80; the assembly's own listing governs. This is not a fire door inspection, which must be performed by a person with knowledge of the assembly's operating components, covers items well beyond clearances, and requires written records. NFPA 80, the assembly's listing, the adopted fire code, and the authority having jurisdiction govern.",
  };
}
const fireDoorExample = { inputs: { head_in: 0.125, hinge_jamb_in: 0.125, strike_jamb_in: 0.1875, meeting_edge_in: 0.125, bottom_in: 1.25, perimeter_limit_in: 0.125, meeting_limit_in: 0.1875, bottom_limit_in: 0.75 } };
DOORHARDWARE_RENDERERS["fire-door-clearance"] = _simpleRenderer({
  citation: "Citation: the NFPA 80 fire door clearance limits by name -- commonly 1/8 in at the head and jambs, 3/16 in between the meeting edges of a pair, and 3/4 in maximum from the bottom of the door to the floor -- with the assembly's own listing named as governing. Limits are entered because they differ by material, construction, listing, and adopted edition.",
  example: fireDoorExample.inputs,
  fields: [
    { key: "head_in", label: "Measured clearance at the head (in)", kind: "number", default: 0.125 },
    { key: "hinge_jamb_in", label: "Measured clearance at the hinge jamb (in)", kind: "number", default: 0.125 },
    { key: "strike_jamb_in", label: "Measured clearance at the strike jamb (in)", kind: "number", default: 0.1875 },
    { key: "meeting_edge_in", label: "Measured clearance at the meeting edges (in)", kind: "number", default: 0.125 },
    { key: "bottom_in", label: "Measured clearance at the bottom (in)", kind: "number", default: 1.25 },
    { key: "perimeter_limit_in", label: "Head and jamb limit (in)", kind: "number", default: 0.125 },
    { key: "meeting_limit_in", label: "Meeting edge limit (in)", kind: "number", default: 0.1875 },
    { key: "bottom_limit_in", label: "Bottom clearance limit (in)", kind: "number", default: 0.75 },
  ],
  outputs: [
    { key: "v", id: "fdc-out-v", label: "Overall", value: (r) => r.verdict },
    { key: "h", id: "fdc-out-h", label: "Head and jambs, margin to the limit", value: (r) => "head " + fmt(r.head_margin_in, 4) + " in, hinge " + fmt(r.hinge_margin_in, 4) + " in, strike " + fmt(r.strike_margin_in, 4) + " in" },
    { key: "m", id: "fdc-out-m", label: "Meeting edges, margin to the limit", value: (r) => fmt(r.meeting_margin_in, 4) + " in" },
    { key: "b", id: "fdc-out-b", label: "Bottom, margin to the limit", value: (r) => fmt(r.bottom_margin_in, 4) + " in" },
    { key: "c", id: "fdc-out-c", label: "Bottom correction", value: (r) => r.bottom_reduction_needed_in > 0 ? "the bottom must come down " + fmt(r.bottom_reduction_needed_in, 4) + " in -- a listed threshold or door bottom, not a sweep" : "floor covering up to " + fmt(r.covering_headroom_in, 4) + " in could still be added" },
    { key: "k", id: "fdc-out-k", label: "Checks that are not measurements", value: () => "label legible; no field modifications; closes and latches from any position; nothing blocking, wedging or dogging it -- any one of these fails the door on its own" },
    { key: "n", id: "fdc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeFireDoorClearance,
});

// ===================== spec-v1580: slide gate operator force and duty cycle =====================

// dims: in { gate_weight_lb: M L T^-2, rolling_coefficient: dimensionless, grade_pct: dimensionless, gate_length_ft: L, operator_speed_fps: L T^-1, cycles_per_day: dimensionless, operating_hours: T, operator_rated_force_lb: M L T^-2, intermittent_duty_limit_pct: dimensionless } out: { rolling_force_lb: M L T^-2, grade_force_lb: M L T^-2, total_force_lb: M L T^-2, travel_time_s: T, cycle_time_s: T, duty_cycle_pct: dimensionless }
export function computeGateOperatorDuty({ gate_weight_lb = 0, rolling_coefficient = 0.1, grade_pct = 0, gate_length_ft = 0, operator_speed_fps = 0, cycles_per_day = 0, operating_hours = 0, operator_rated_force_lb = 0, intermittent_duty_limit_pct = 10 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(gate_weight_lb > 0)) return { error: "Gate weight must be positive." };
  if (!(rolling_coefficient > 0 && rolling_coefficient <= 1)) return { error: "Rolling coefficient must be in (0, 1]." };
  if (!(grade_pct >= 0)) return { error: "Grade cannot be negative." };
  if (!(gate_length_ft > 0)) return { error: "Gate length must be positive." };
  if (!(operator_speed_fps > 0)) return { error: "Operator speed must be positive." };
  if (!(cycles_per_day >= 1)) return { error: "Cycles per day must be at least 1." };
  if (!(operating_hours > 0)) return { error: "Operating window must be positive." };
  if (!(operator_rated_force_lb > 0)) return { error: "Operator rated force must be positive." };
  if (!(intermittent_duty_limit_pct > 0 && intermittent_duty_limit_pct <= 100)) return { error: "Intermittent duty limit must be in (0, 100] percent." };
  const rolling_force_lb = gate_weight_lb * rolling_coefficient;
  // A grade percent is a rise over run; the component along the slope is the
  // weight times the sine of that angle.
  const grade_angle = Math.atan(grade_pct / 100);
  const grade_force_lb = gate_weight_lb * Math.sin(grade_angle);
  const total_force_lb = rolling_force_lb + grade_force_lb;
  const force_margin_lb = operator_rated_force_lb - total_force_lb;
  const force_ok = operator_rated_force_lb >= total_force_lb;
  const travel_time_s = gate_length_ft / operator_speed_fps;
  const cycle_time_s = 2 * travel_time_s;
  const run_time_hr = cycles_per_day * cycle_time_s / 3600;
  const duty_cycle_pct = run_time_hr / operating_hours * 100;
  const continuous_required = duty_cycle_pct > intermittent_duty_limit_pct;
  return {
    rolling_force_lb, grade_force_lb, total_force_lb, force_margin_lb, force_ok,
    travel_time_s, cycle_time_s, run_time_hr, duty_cycle_pct, continuous_required,
    grade_share_pct: grade_force_lb / total_force_lb * 100,
    duty_verdict: continuous_required
      ? "OVER the entered intermittent-duty limit -- this application needs a continuous-duty operator"
      : "inside the entered intermittent-duty limit",
    note: "The force calculation is straightforward and usually not the problem: a well-mounted gate on good rollers needs perhaps a tenth of its weight to move, and operators are generally sized with margin. What kills them is DUTY. An operator rated for intermittent duty in a residential application, installed on a commercial site that cycles it a couple of hundred times a day, overheats and fails -- and gets replaced with the same model, twice, before anyone computes the duty cycle. And an average understates it, because the cycles are not evenly spread: a shift change puts twenty of them in ten minutes. The force term does have two traps. Grade adds the component of gate weight along the slope, which on a sloped driveway can rival or exceed the rolling force. And a gate that binds -- a settled post, a damaged roller, debris in the track -- raises the force without warning, which is why an operator drawing more current than it used to is reporting a gate problem rather than a motor problem. Entrapment protection is not part of this arithmetic and is not negotiable. A gate operator is a machine that can kill a child; the required sensing devices, the classification of the installation, and the inherent force limits are safety requirements independent of anything computed here, and a correctly sized operator does not satisfy them. This does not select an operator -- manufacturer duty classifications, thermal ratings, and the distribution of cycles through the day all matter more than an average percentage -- and it does not size the gate structure, the rollers, the track, or the posts, or evaluate wind load on the gate leaf, which for a solid or heavily clad gate can dominate everything else. UL 325, ASTM F2200, the operator manufacturer's instructions, and the authority having jurisdiction govern.",
  };
}
const gateOperatorExample = { inputs: { gate_weight_lb: 2400, rolling_coefficient: 0.1, grade_pct: 5, gate_length_ft: 24, operator_speed_fps: 1, cycles_per_day: 150, operating_hours: 10, operator_rated_force_lb: 400, intermittent_duty_limit_pct: 10 } };
DOORHARDWARE_RENDERERS["gate-operator-duty-cycle"] = _simpleRenderer({
  citation: "Citation: the rolling force relation -- gate weight x rolling coefficient, plus the weight component along the grade -- and the duty cycle as run time over the operating window, with UL 325 named as governing entrapment protection and ASTM F2200 the gate construction. Neither is satisfied by a correctly sized operator.",
  example: gateOperatorExample.inputs,
  fields: [
    { key: "gate_weight_lb", label: "Gate leaf weight (lb)", kind: "number", default: 2400 },
    { key: "rolling_coefficient", label: "Rolling resistance coefficient", kind: "number", default: 0.1 },
    { key: "grade_pct", label: "Driveway grade (%)", kind: "number", default: 5 },
    { key: "gate_length_ft", label: "Gate travel length (ft)", kind: "number", default: 24 },
    { key: "operator_speed_fps", label: "Operator speed (ft/s)", kind: "number", default: 1 },
    { key: "cycles_per_day", label: "Cycles per day", kind: "number", default: 150 },
    { key: "operating_hours", label: "Operating window (h per day)", kind: "number", default: 10 },
    { key: "operator_rated_force_lb", label: "Operator rated force (lb)", kind: "number", default: 400 },
    { key: "intermittent_duty_limit_pct", label: "Intermittent-duty rating limit (%)", kind: "number", default: 10 },
  ],
  outputs: [
    { key: "r", id: "god-out-r", label: "Rolling force", value: (r) => fmt(r.rolling_force_lb, 0) + " lb" },
    { key: "g", id: "god-out-g", label: "Grade component", value: (r) => fmt(r.grade_force_lb, 0) + " lb (" + fmt(r.grade_share_pct, 0) + "% of the total)" },
    { key: "t", id: "god-out-t", label: "Total force against the rating", value: (r) => fmt(r.total_force_lb, 0) + " lb -- " + (r.force_ok ? "within the rating" : "OVER the rating") + ", margin " + fmt(r.force_margin_lb, 0) + " lb" },
    { key: "c", id: "god-out-c", label: "Travel and cycle time", value: (r) => fmt(r.travel_time_s, 1) + " s each way, " + fmt(r.cycle_time_s, 1) + " s per cycle" },
    { key: "d", id: "god-out-d", label: "Duty cycle", value: (r) => fmt(r.duty_cycle_pct, 1) + "% (" + fmt(r.run_time_hr, 2) + " h of running) -- " + r.duty_verdict },
    { key: "n", id: "god-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeGateOperatorDuty,
});

// ===================== spec-v1581: revolving door and turnstile throughput =====================

// dims: in { rpm: T^-1, wings: dimensionless, people_per_compartment: dimensionless, utilization_pct: dimensionless, building_population: dimensionless, peak_fraction_pct: dimensionless, peak_window_min: T, device_count: dimensionless, operating_hours: T } out: { theoretical_per_hour: T^-1, effective_per_hour: T^-1, peak_rate_per_hour: T^-1, devices_required: dimensionless, queue_at_peak: dimensionless }
export function computeRevolvingDoorThroughput({ rpm = 0, wings = 0, people_per_compartment = 0, utilization_pct = 60, building_population = 0, peak_fraction_pct = 0, peak_window_min = 0, device_count = 1, operating_hours = 8 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(rpm > 0)) return { error: "Rotation rate must be positive." };
  if (!(wings >= 2)) return { error: "A revolving door needs at least 2 wings." };
  if (!(people_per_compartment > 0)) return { error: "People per compartment must be positive." };
  if (!(utilization_pct > 0 && utilization_pct <= 100)) return { error: "Utilization must be in (0, 100] percent." };
  if (!(building_population >= 1)) return { error: "Building population must be at least 1." };
  if (!(peak_fraction_pct > 0 && peak_fraction_pct <= 100)) return { error: "Peak fraction must be in (0, 100] percent." };
  if (!(peak_window_min > 0)) return { error: "Peak window must be positive." };
  if (!(device_count >= 1)) return { error: "Device count must be at least 1." };
  if (!(operating_hours > 0)) return { error: "Operating hours must be positive." };
  const theoretical_per_hour = rpm * wings * people_per_compartment * 60;
  const effective_per_hour = theoretical_per_hour * utilization_pct / 100;
  const total_per_hour = effective_per_hour * device_count;
  const peak_people = building_population * peak_fraction_pct / 100;
  const peak_rate_per_hour = peak_people / (peak_window_min / 60);
  const devices_required = Math.ceil(peak_rate_per_hour / effective_per_hour);
  const cleared_in_peak = total_per_hour * (peak_window_min / 60);
  const queue_at_peak = Math.max(0, peak_people - cleared_in_peak);
  const average_rate_per_hour = building_population / operating_hours;
  const devices_by_average = Math.ceil(average_rate_per_hour / effective_per_hour);
  return {
    theoretical_per_hour, effective_per_hour, total_per_hour, peak_people, peak_rate_per_hour,
    devices_required, cleared_in_peak, queue_at_peak, average_rate_per_hour, devices_by_average,
    installed_enough: device_count >= devices_required,
    verdict: device_count >= devices_required
      ? "the entered device count clears the peak without a queue"
      : "SHORT by " + (devices_required - device_count) + " -- a queue of about " + fmt(queue_at_peak, 0) + " people builds over the peak window",
    note: "The headline throughput and the achievable one differ, and the difference is behaviour. People arrive unevenly, carry things, hesitate, and do not fill every compartment, so a realistic figure is a large discount on the theoretical one, and designing to the theoretical number produces a queue at the one moment the building is judged on it. The comparison that matters is against the PEAK. A building of two thousand people does not arrive over eight hours; it arrives in two twenty-minute waves, and the design case is that wave. Dividing daily population by operating hours produces a number that flatters every entrance ever built -- here the average and the peak are printed side by side, and they routinely differ by a factor of five. Egress is a separate and code-governed matter. Revolving doors and turnstiles receive limited or no credit toward required egress capacity depending on the code and the arrangement, so a lobby that meets its throughput target with revolving doors alone still needs conventional swinging doors for egress, and the two requirements are sized independently. The utilization discount is a judgment rather than a measurement, and real throughput depends on bag and cart traffic, badge interaction time, and wheelchair and accessible-door usage diverting traffic -- and bidirectional use roughly halves a revolving door's one-way figure. This does not address the credit a revolving door or turnstile receives toward egress capacity, the collapsible-wing requirement, or the adjacent swinging door requirement, and it does not address accessibility, which requires an accessible route that a revolving door or turnstile does not provide. The adopted building, fire, and accessibility codes, the manufacturer's rated capacities, and the authority having jurisdiction govern.",
  };
}
const revolvingDoorExample = { inputs: { rpm: 3, wings: 4, people_per_compartment: 2, utilization_pct: 60, building_population: 2000, peak_fraction_pct: 70, peak_window_min: 20, device_count: 3, operating_hours: 8 } };
DOORHARDWARE_RENDERERS["revolving-door-throughput"] = _simpleRenderer({
  citation: "Citation: the compartment throughput relation by name -- people per hour = rotations per minute x wings x people per compartment x 60, discounted for realistic utilization -- compared against a peak arrival rate rather than a daily average, with the adopted building and fire codes named as governing egress credit.",
  example: revolvingDoorExample.inputs,
  fields: [
    { key: "rpm", label: "Rotation rate (rpm)", kind: "number", default: 3 },
    { key: "wings", label: "Number of wings", kind: "number", default: 4 },
    { key: "people_per_compartment", label: "People per compartment", kind: "number", default: 2 },
    { key: "utilization_pct", label: "Realistic utilization (%)", kind: "number", default: 60 },
    { key: "building_population", label: "Building population", kind: "number", default: 2000 },
    { key: "peak_fraction_pct", label: "Fraction arriving in the peak window (%)", kind: "number", default: 70 },
    { key: "peak_window_min", label: "Peak window (min)", kind: "number", default: 20 },
    { key: "device_count", label: "Doors or lanes installed", kind: "number", default: 3 },
    { key: "operating_hours", label: "Operating hours per day", kind: "number", default: 8 },
  ],
  outputs: [
    { key: "t", id: "rdt-out-t", label: "Throughput per door", value: (r) => fmt(r.theoretical_per_hour, 0) + " people/h theoretical, " + fmt(r.effective_per_hour, 0) + " at the entered utilization" },
    { key: "p", id: "rdt-out-p", label: "Peak arrival rate", value: (r) => fmt(r.peak_people, 0) + " people in the window, " + fmt(r.peak_rate_per_hour, 0) + " people/h equivalent" },
    { key: "d", id: "rdt-out-d", label: "Doors the peak requires", value: (r) => fmt(r.devices_required, 0) },
    { key: "v", id: "rdt-out-v", label: "Against the installed count", value: (r) => r.verdict },
    { key: "a", id: "rdt-out-a", label: "What the daily average would have said", value: (r) => fmt(r.average_rate_per_hour, 0) + " people/h, " + fmt(r.devices_by_average, 0) + " door(s)" },
    { key: "n", id: "rdt-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRevolvingDoorThroughput,
});
