// Group B (cont.): the plumbing CODE-COMPLIANCE bench, split out of calc-plumbing.js for
// cap relief. calc-plumbing.js had reached 99.8% of its 92,000 B gzip cap and CI's
// per-module budget failed at 92,027 B; check-module-sizes states the preferred
// remediation is a per-tile split rather than another cap raise, and spec-v1030 set the
// precedent with calc-plumbingtakeoff.js.
//
// These eight tiles are the fixture and layout half of the plumbing bench -- what the
// CODE requires of a rough-in's dimensions, rather than what the hydraulics require. They
// form a contiguous, fully self-contained block at the tail of the module: every compute
// and renderer is co-located, and the only module-level names they read are the renderer
// registry and the finite-input guard, both reproduced here. Tiles:
//   v1132 fixture-clearance-check        (IPC 405.3.1 side, center, front)
//   v1134 shower-compartment-check       (IPC 417.4 area and least dimension)
//   v1135 vent-terminal-check            (IPC 904 roof and opening clearances)
//   v1136 aav-install-check              (IPC 918 air admittance valve install)
//   v1137 grab-bar-layout                (ADA 604.5 rear and side bars)
//   v1140 cleanout-layout                (IPC 708 spacing and clearance)
//   v1146 water-service-pressure-check   (IPC 604.8 / 604.6 service pressure)
//   v1160 accessible-toilet-compartment  (ADA 604.8 compartment size and door)
// Every tile keeps group: "B" -- a tile's group letter is independent of the module that
// holds it. Lazy-loaded, so it is not in the home-view first-paint payload.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

export const PLUMBINGCODE_RENDERERS = {};

// v18 SS7 contract guard: reject a non-finite numeric input (copied verbatim from the
// sibling calc-* modules; non-exported, so it adds no corpus row).
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

// --- spec-v1132: plumbing fixture clearances (IPC 405.3.1) ---
// The layout check every bathroom rough-in turns on and nothing in the catalog did.
// IPC 405.3.1 gives four numbers: 15 in from a fixture centerline to any side wall,
// partition, vanity, or other obstruction; 30 in center to center between adjacent fixtures
// where no partition separates them; 21 in of clearance in front to any wall, fixture, or
// door; and a water-closet compartment not less than 30 in wide by 60 in deep for a
// floor-mounted closet. The useful derived number is the minimum wall-to-wall width for a
// row of fixtures, 2 x 15 + (n - 1) x 30, which is what actually decides whether a layout
// fits before anything is drawn.
// dims: in { center_to_left_in: L, center_to_right_in: L, front_clearance_in: L, adjacent_center_in: L, fixture_count: dimensionless, compartment_width_in: L, compartment_depth_in: L, min_side_in: L, min_center_in: L, min_front_in: L } out: { min_row_width_in: L, side_deficit_in: L, front_deficit_in: L, center_deficit_in: L }
export function computeFixtureClearanceCheck({ center_to_left_in = 0, center_to_right_in = 0, front_clearance_in = 0, adjacent_center_in = 0, fixture_count = 1, compartment_width_in = 0, compartment_depth_in = 0, min_side_in = 15, min_center_in = 30, min_front_in = 21 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const L = Number(center_to_left_in) || 0;
  const R = Number(center_to_right_in) || 0;
  const F = Number(front_clearance_in) || 0;
  const adj = Number(adjacent_center_in) || 0;
  const n = Number(fixture_count) || 0;
  const cw = Number(compartment_width_in) || 0;
  const cd = Number(compartment_depth_in) || 0;
  const minSide = Number(min_side_in) || 0;
  const minCenter = Number(min_center_in) || 0;
  const minFront = Number(min_front_in) || 0;
  if (!(L > 0) || !(R > 0)) return { error: "Both centerline-to-obstruction distances must be positive (in)." };
  if (!(F > 0)) return { error: "Clearance in front must be positive (in)." };
  if (adj < 0) return { error: "Adjacent fixture center-to-center distance cannot be negative (in)." };
  if (!Number.isInteger(n) || n < 1) return { error: "Fixture count must be a whole number of 1 or more." };
  if (cw < 0 || cd < 0) return { error: "Compartment dimensions cannot be negative (in)." };
  if (!(minSide > 0) || !(minCenter > 0) || !(minFront > 0)) return { error: "The code minimums must all be positive (in)." };

  const left_ok = L >= minSide;
  const right_ok = R >= minSide;
  const front_ok = F >= minFront;
  const has_adjacent = adj > 0;
  const center_ok = has_adjacent ? adj >= minCenter : null;
  const side_deficit_in = Math.max(0, minSide - Math.min(L, R));
  const front_deficit_in = Math.max(0, minFront - F);
  const center_deficit_in = has_adjacent ? Math.max(0, minCenter - adj) : 0;

  const is_compartment = cw > 0 || cd > 0;
  const compartment_width_ok = is_compartment ? cw >= 30 : null;
  const compartment_depth_ok = is_compartment ? cd >= 60 : null;

  // The number that decides a layout before anything is drawn.
  const min_row_width_in = 2 * minSide + (n - 1) * minCenter;
  const min_alcove_depth_in = minFront;
  const passes = left_ok && right_ok && front_ok && (center_ok !== false) && (compartment_width_ok !== false) && (compartment_depth_ok !== false);

  const note = "IPC 405.3.1 in four numbers: " + minSide + " in from a fixture centerline to any side wall, partition, vanity, or other obstruction; " + minCenter + " in center to center between adjacent fixtures where no partition separates them; " + minFront + " in of clearance in FRONT to any wall, fixture, or door; and a water-closet compartment not less than 30 in wide by 60 in deep for a floor-mounted closet. "
    + "Left " + L + " in " + (left_ok ? "OK" : "FAILS") + ", right " + R + " in " + (right_ok ? "OK" : "FAILS") + ", front " + F + " in " + (front_ok ? "OK" : "FAILS by " + front_deficit_in.toFixed(1) + " in")
    + (has_adjacent ? ", adjacent centers " + adj + " in " + (center_ok ? "OK" : "FAILS by " + center_deficit_in.toFixed(1) + " in") : ", no adjacent fixture entered")
    + (is_compartment ? ", compartment " + cw + " x " + cd + " in (" + (compartment_width_ok ? "width OK" : "width FAILS") + ", " + (compartment_depth_ok ? "depth OK" : "depth FAILS") + ")" : "") + ". " + (passes ? "PASSES. " : "DOES NOT PASS. ")
    + "The number that decides a layout before anything is drawn: a row of " + n + " fixture" + (n === 1 ? "" : "s") + " needs " + min_row_width_in + " in of wall-to-wall width, from 2 x " + minSide + " for the two end walls plus " + (n - 1) + " x " + minCenter + " between them. At the code minimums of 15 in to a side wall and 30 in between centers, two fixtures want 60 in and three want 90 - so a 5 ft wall holds two and not three, which is where most half-bath layouts come apart. Depth needs at least " + min_alcove_depth_in + " in clear in front of the fixture, measured to the nearest wall, fixture, OR DOOR - a door that swings into that space is an obstruction just as a wall is, and it is the clearance most often missed on a plan that otherwise fits. "
    + "The obstruction is anything: a side wall, a partition, a vanity cabinet, a shower knee wall, a tub deck. Measure from the fixture CENTERLINE, not its edge. "
    + "These are the IPC plumbing minimums and they are the FLOOR, not an accessible layout. ANSI A117.1 and the ADA Standards require substantially more - a different centerline range off the side wall, a defined clear floor space, and grab-bar blocking - and an accessible fixture designed to these numbers will not comply. The minimums are editable inputs because state and local amendments exist; check what your AHJ adopted. Wall-hung and floor-mounted compartments differ, and the fixture's own rough-in dimension, the supply and waste locations, and swing-door hardware are separate. A screen, not a code-official determination; the adopted code and the AHJ govern.";

  return { left_ok, right_ok, front_ok, center_ok, has_adjacent, compartment_width_ok, compartment_depth_ok, is_compartment, passes, side_deficit_in, front_deficit_in, center_deficit_in, min_row_width_in, min_alcove_depth_in, note };
}

export const fixtureClearanceCheckExample = { inputs: { center_to_left_in: 15, center_to_right_in: 18, front_clearance_in: 24, adjacent_center_in: 30, fixture_count: 2, compartment_width_in: 0, compartment_depth_in: 0, min_side_in: 15, min_center_in: 30, min_front_in: 21 } };

function _v1132renderFixtureClearanceCheck(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IPC 405.3.1 - a water closet, urinal, lavatory, or bidet not set closer than 15 in from its center to any side wall, partition, vanity, or other obstruction; adjacent fixtures not closer than 30 in center to center where no partition separates them; not less than 21 in of clearance in front to any wall, fixture, or door; and water-closet compartments not less than 30 in wide by 60 in deep for floor-mounted closets. The derived minimum wall-to-wall width for a row of n fixtures is 2 x 15 + (n - 1) x 30. All minimums are editable inputs because state and local amendments exist. These are the PLUMBING minimums, not an accessible layout: ANSI A117.1 and the ADA Standards require substantially more, including a different centerline range, a defined clear floor space, and grab-bar blocking. A screen, not a code-official determination; the adopted code and the AHJ govern.";
  const l = makeNumber("Centerline to the left obstruction (in)", "fcc-l", { step: "any", min: "0" });
  const r = makeNumber("Centerline to the right obstruction (in)", "fcc-r", { step: "any", min: "0" });
  const f = makeNumber("Clearance in front (in)", "fcc-f", { step: "any", min: "0" });
  const a = makeNumber("Adjacent fixture center to center (in; 0 = none)", "fcc-a", { step: "any", min: "0" });
  const n = makeNumber("Fixtures in the row", "fcc-n", { step: "1", min: "1" });
  const cw = makeNumber("Compartment width (in; 0 = not a compartment)", "fcc-cw", { step: "any", min: "0" });
  const cd = makeNumber("Compartment depth (in)", "fcc-cd", { step: "any", min: "0" });
  const ms = makeNumber("Minimum side clearance (in; IPC 15)", "fcc-ms", { step: "any", min: "0" });
  const mc = makeNumber("Minimum center to center (in; IPC 30)", "fcc-mc", { step: "any", min: "0" });
  const mf = makeNumber("Minimum front clearance (in; IPC 21)", "fcc-mf", { step: "any", min: "0" });
  for (const x of [l, r, f, a, n, cw, cd, ms, mc, mf]) inputRegion.appendChild(x.wrap);
  attachExampleButton(inputRegion, () => { l.input.value = "15"; r.input.value = "18"; f.input.value = "24"; a.input.value = "30"; n.input.value = "2"; cw.input.value = "0"; cd.input.value = "0"; ms.input.value = "15"; mc.input.value = "30"; mf.input.value = "21"; update(); });
  const oV = makeOutputLine(outputRegion, "Verdict", "fcc-out-v");
  const oS = makeOutputLine(outputRegion, "Side clearances", "fcc-out-s");
  const oF = makeOutputLine(outputRegion, "Front clearance", "fcc-out-f");
  const oW = makeOutputLine(outputRegion, "Minimum wall-to-wall width for this row", "fcc-out-w");
  const oNote = makeOutputLine(outputRegion, "Note", "fcc-out-note");
  const update = debounce(() => {
    const res = computeFixtureClearanceCheck({ center_to_left_in: Number(l.input.value) || 0, center_to_right_in: Number(r.input.value) || 0, front_clearance_in: Number(f.input.value) || 0, adjacent_center_in: Number(a.input.value) || 0, fixture_count: Number(n.input.value) || 0, compartment_width_in: Number(cw.input.value) || 0, compartment_depth_in: Number(cd.input.value) || 0, min_side_in: Number(ms.input.value) || 0, min_center_in: Number(mc.input.value) || 0, min_front_in: Number(mf.input.value) || 0 });
    if (res.error) { oV.textContent = res.error; oS.textContent = "-"; oF.textContent = "-"; oW.textContent = "-"; oNote.textContent = "-"; return; }
    oV.textContent = res.passes ? "PASSES the IPC 405.3.1 clearances entered" : "DOES NOT PASS";
    oS.textContent = (res.left_ok ? "left OK" : "left SHORT") + ", " + (res.right_ok ? "right OK" : "right SHORT") + (res.has_adjacent ? ", adjacent centers " + (res.center_ok ? "OK" : "SHORT by " + fmt(res.center_deficit_in, 1) + " in") : "");
    oF.textContent = res.front_ok ? "OK" : "SHORT by " + fmt(res.front_deficit_in, 1) + " in";
    oW.textContent = res.min_row_width_in + " in, with at least " + res.min_alcove_depth_in + " in clear in front";
    oNote.textContent = res.note;
  }, DEBOUNCE_MS);
  for (const x of [l, r, f, a, n, cw, cd, ms, mc, mf]) x.input.addEventListener("input", update);
}
PLUMBINGCODE_RENDERERS["fixture-clearance-check"] = _v1132renderFixtureClearanceCheck;

// --- spec-v1134: shower compartment size (IPC 417.4) ---
// The other "area is not the test" trap, and a two-path one. IPC 417.4 asks for BOTH not
// less than 900 sq in of interior cross-sectional area AND not less than 30 in in least
// dimension - so a 28 x 36 compartment has 1,008 sq in, comfortably past the area rule, and
// still fails on the 28 in side. The exception gives a second path: a least dimension down
// to 25 in is allowed if the area reaches 1,300 sq in. Both are measured from the FINISHED
// interior at the top of the threshold, exclusive of valves, showerheads, soap dishes, and
// grab bars, and the dimension has to hold up to 70 in above the drain.
// dims: in { width_in: L, depth_in: L, base_min_area_sqin: L^2, base_min_dim_in: L, exception_min_area_sqin: L^2, exception_min_dim_in: L } out: { area_sqin: L^2, least_dim_in: L, area_needed_in: L^2, other_dim_needed_in: L }
export function computeShowerCompartmentCheck({ width_in = 0, depth_in = 0, base_min_area_sqin = 900, base_min_dim_in = 30, exception_min_area_sqin = 1300, exception_min_dim_in = 25 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const w = Number(width_in) || 0;
  const d = Number(depth_in) || 0;
  const A0 = Number(base_min_area_sqin) || 0;
  const D0 = Number(base_min_dim_in) || 0;
  const A1 = Number(exception_min_area_sqin) || 0;
  const D1 = Number(exception_min_dim_in) || 0;
  if (!(w > 0) || !(d > 0)) return { error: "Both finished interior dimensions must be positive (in)." };
  if (!(A0 > 0) || !(D0 > 0)) return { error: "The base minimum area and least dimension must be positive." };
  if (!(A1 > 0) || !(D1 > 0)) return { error: "The exception minimum area and least dimension must be positive." };

  const area_sqin = w * d;
  const least_dim_in = Math.min(w, d);
  const greater_dim_in = Math.max(w, d);

  const base_area_ok = area_sqin >= A0;
  const base_dim_ok = least_dim_in >= D0;
  const base_path_ok = base_area_ok && base_dim_ok;
  const exc_area_ok = area_sqin >= A1;
  const exc_dim_ok = least_dim_in >= D1;
  const exception_path_ok = exc_area_ok && exc_dim_ok;
  const passes = base_path_ok || exception_path_ok;
  const path = base_path_ok ? "the base 417.4 rule" : exception_path_ok ? "the 417.4 exception" : "neither path";

  // A 30 in disc fits a rectangle exactly when the SHORT side reaches 30.
  const disc_fits = least_dim_in >= D0;
  // What it would take to comply, on each path, holding the least dimension where it is.
  const base_other_needed_in = least_dim_in >= D0 ? Math.max(D0, A0 / least_dim_in) : null;
  const exc_other_needed_in = least_dim_in >= D1 ? Math.max(D1, A1 / least_dim_in) : null;
  const area_deficit_base = Math.max(0, A0 - area_sqin);
  const area_deficit_exc = Math.max(0, A1 - area_sqin);

  const note = "Finished interior " + w + " x " + d + " = " + area_sqin.toFixed(0) + " sq in with a least dimension of " + least_dim_in + " in. "
    + "IPC 417.4 has TWO paths and both have two conditions. Base: at least " + A0 + " sq in AND at least " + D0 + " in in least dimension - here " + (base_area_ok ? "area OK" : "area short by " + area_deficit_base.toFixed(0)) + ", " + (base_dim_ok ? "dimension OK" : "dimension short by " + (D0 - least_dim_in).toFixed(1)) + ". "
    + "Exception: a least dimension down to " + D1 + " in is allowed if the area reaches " + A1 + " sq in - here " + (exc_dim_ok ? "dimension OK" : "dimension short") + ", " + (exc_area_ok ? "area OK" : "area short by " + area_deficit_exc.toFixed(0)) + ". "
    + (passes ? "PASSES via " + path + ". " : "FAILS both paths. ")
    + "The trap is that area alone never settles it: at the base IPC figures, a 28 x 36 compartment is 1,008 sq in, well past the 900, and still fails because 28 is under 30 and 1,008 is under the 1,300 the exception would want. Adding area in the long direction does nothing for the short one. "
    + (base_other_needed_in !== null ? "At this " + least_dim_in + " in least dimension the other side must reach " + base_other_needed_in.toFixed(2) + " in for the base path" : "At " + least_dim_in + " in the base path is unavailable at any length - the least dimension itself is under " + D0)
    + (exc_other_needed_in !== null ? ", or " + exc_other_needed_in.toFixed(2) + " in for the exception path. " : ", and the exception path is unavailable too. ")
    + "A " + D0 + " in disc fits a rectangle exactly when the SHORT side reaches " + D0 + " in, so here it " + (disc_fits ? "fits" : "does NOT fit") + " - the disc test and the least-dimension test are the same test for a rectangle, which is why a long narrow stall never rescues itself with square inches. "
    + "Measured from the FINISHED interior at the top of the threshold, exclusive of fixture valves, showerheads, soap dishes, and safety grab bars or rails - so tile, mud bed, and a bench all come out of the number, and the rough framing is not what is checked. The dimension has to continue to a height of at least 70 in above the shower drain outlet, so a sloped ceiling or a low soffit can fail a stall that measures fine at the curb. "
    + "Rectangular compartments only: a neo-angle, round, or irregular stall needs the disc drawn on the actual plan. Not checked: the door or opening size and its swing, the receptor slope and drain, waterproofing, the 70 in height itself, or accessible (ANSI A117.1 / ADA) roll-in and transfer stalls, which are governed separately and are larger. All four thresholds are editable because local amendments exist. A screen, not a code-official determination; the adopted code and the AHJ govern.";

  return { area_sqin, least_dim_in, greater_dim_in, base_area_ok, base_dim_ok, base_path_ok, exc_area_ok, exc_dim_ok, exception_path_ok, passes, path, disc_fits, base_other_needed_in, exc_other_needed_in, area_deficit_base, area_deficit_exc, note };
}

export const showerCompartmentCheckExample = { inputs: { width_in: 28, depth_in: 36, base_min_area_sqin: 900, base_min_dim_in: 30, exception_min_area_sqin: 1300, exception_min_dim_in: 25 } };

function _v1134renderShowerCompartmentCheck(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IPC 417.4 - shower compartments not less than 900 sq in in interior cross-sectional area and not less than 30 in in least dimension, measured from the finished interior dimension at a height equal to the top of the threshold and at a point tangent to its centerline, exclusive of fixture valves, showerheads, soap dishes, and safety grab bars or rails, and continued to a height not less than 70 in above the shower drain outlet; with the exception permitting a least dimension of not less than 25 in where the compartment has not less than 1,300 sq in of cross-sectional area. Both conditions of a path must be met - area alone never settles it. Rectangular compartments only; a neo-angle or irregular stall needs the disc drawn on the plan. The door and its swing, the receptor and drain, waterproofing, the 70 in height, and accessible (ANSI A117.1 / ADA) stalls are not checked. All thresholds are editable inputs because local amendments exist. A screen, not a code-official determination; the adopted code and the AHJ govern.";
  const w = makeNumber("Finished interior width (in)", "scc-w", { step: "any", min: "0" });
  const d = makeNumber("Finished interior depth (in)", "scc-d", { step: "any", min: "0" });
  const a0 = makeNumber("Base minimum area (sq in; IPC 900)", "scc-a0", { step: "any", min: "0" });
  const d0 = makeNumber("Base minimum least dimension (in; IPC 30)", "scc-d0", { step: "any", min: "0" });
  const a1 = makeNumber("Exception minimum area (sq in; IPC 1300)", "scc-a1", { step: "any", min: "0" });
  const d1 = makeNumber("Exception minimum least dimension (in; IPC 25)", "scc-d1", { step: "any", min: "0" });
  for (const x of [w, d, a0, d0, a1, d1]) inputRegion.appendChild(x.wrap);
  attachExampleButton(inputRegion, () => { w.input.value = "28"; d.input.value = "36"; a0.input.value = "900"; d0.input.value = "30"; a1.input.value = "1300"; d1.input.value = "25"; update(); });
  const oV = makeOutputLine(outputRegion, "Verdict", "scc-out-v");
  const oA = makeOutputLine(outputRegion, "Area and least dimension", "scc-out-a");
  const oB = makeOutputLine(outputRegion, "Base path (900 and 30)", "scc-out-b");
  const oE = makeOutputLine(outputRegion, "Exception path (1300 and 25)", "scc-out-e");
  const oN = makeOutputLine(outputRegion, "What the other side would have to reach", "scc-out-n");
  const oNote = makeOutputLine(outputRegion, "Note", "scc-out-note");
  const update = debounce(() => {
    const r = computeShowerCompartmentCheck({ width_in: Number(w.input.value) || 0, depth_in: Number(d.input.value) || 0, base_min_area_sqin: Number(a0.input.value) || 0, base_min_dim_in: Number(d0.input.value) || 0, exception_min_area_sqin: Number(a1.input.value) || 0, exception_min_dim_in: Number(d1.input.value) || 0 });
    if (r.error) { oV.textContent = r.error; oA.textContent = "-"; oB.textContent = "-"; oE.textContent = "-"; oN.textContent = "-"; oNote.textContent = "-"; return; }
    oV.textContent = r.passes ? "PASSES via " + r.path : "FAILS both paths";
    oA.textContent = fmt(r.area_sqin, 0) + " sq in, least dimension " + fmt(r.least_dim_in, 2) + " in - a 30 in disc " + (r.disc_fits ? "fits" : "does NOT fit");
    oB.textContent = (r.base_area_ok ? "area OK" : "area short by " + fmt(r.area_deficit_base, 0)) + ", " + (r.base_dim_ok ? "dimension OK" : "dimension short");
    oE.textContent = (r.exc_area_ok ? "area OK" : "area short by " + fmt(r.area_deficit_exc, 0)) + ", " + (r.exc_dim_ok ? "dimension OK" : "dimension short");
    oN.textContent = (r.base_other_needed_in === null ? "base path unavailable at this least dimension" : "base: " + fmt(r.base_other_needed_in, 2) + " in") + "; " + (r.exc_other_needed_in === null ? "exception unavailable" : "exception: " + fmt(r.exc_other_needed_in, 2) + " in");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const x of [w, d, a0, d0, a1, d1]) x.input.addEventListener("input", update);
}
PLUMBINGCODE_RENDERERS["shower-compartment-check"] = _v1134renderShowerCompartmentCheck;

// --- spec-v1135: vent terminal height, frost closure, and location (IPC 903) ---
// Three independent rules that all land on the same pipe, and a plumber can satisfy any two
// and still fail. 903.1: terminate at least 6 in above the roof OR 6 in above the
// anticipated snow accumulation, whichever is greater - and at least 7 FT where the roof is
// used for any purpose other than weather protection. 903.1.1: where the 97.5% outdoor
// design temperature is 0 F or less the extension must be not less than 3 in in diameter,
// and any increase in size must be made not less than 1 ft INSIDE the thermal envelope -
// the part everyone forgets, because an increaser fitted up in the cold attic frosts shut
// exactly like the small pipe it replaced. 903.2: not directly beneath and not within 10 ft
// horizontally of any door, openable window, or other air intake unless 3 ft above it.
// dims: in { height_above_roof_in: L, snow_accumulation_in: L, roof_other_use: dimensionless, design_temp_f: T, vent_diameter_in: L, increase_inside_envelope_in: L, horizontal_to_opening_ft: L, height_above_opening_ft: L } out: { required_height_in: L, height_deficit_in: L, min_diameter_in: L, min_increase_depth_in: L }
export function computeVentTerminalCheck({ height_above_roof_in = 6, snow_accumulation_in = 0, roof_other_use = "no", design_temp_f = 20, vent_diameter_in = 2, increase_inside_envelope_in = 0, horizontal_to_opening_ft = 20, height_above_opening_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const h = Number(height_above_roof_in) || 0;
  const snow = Number(snow_accumulation_in) || 0;
  const t = Number(design_temp_f);
  const dia = Number(vent_diameter_in) || 0;
  const inc = Number(increase_inside_envelope_in) || 0;
  const horiz = Number(horizontal_to_opening_ft) || 0;
  const above = Number(height_above_opening_ft) || 0;
  const otherUse = roof_other_use === "yes";
  if (!(h > 0)) return { error: "Vent height above the roof must be positive (in)." };
  if (snow < 0) return { error: "Anticipated snow accumulation cannot be negative (in)." };
  if (!Number.isFinite(t)) return { error: "Outdoor design temperature must be a number (degF)." };
  if (!(dia > 0)) return { error: "Vent diameter must be positive (in)." };
  if (inc < 0) return { error: "Depth of the size increase inside the thermal envelope cannot be negative (in)." };
  if (horiz < 0) return { error: "Horizontal distance to the nearest opening cannot be negative (ft)." };
  if (above < 0) return { error: "Height above the opening cannot be negative (ft) - a terminal below an opening is the condition the code prohibits outright." };

  // 903.1
  const required_height_in = otherUse ? 84 : Math.max(6, snow + 6);
  const height_ok = h >= required_height_in;
  const height_deficit_in = Math.max(0, required_height_in - h);
  const snow_governs = !otherUse && snow + 6 > 6;

  // 903.1.1
  const frost_zone = t <= 0;
  const min_diameter_in = frost_zone ? 3 : null;
  const min_increase_depth_in = frost_zone ? 12 : null;
  const diameter_ok = frost_zone ? dia >= 3 : null;
  const needs_increase = frost_zone && dia >= 3 && inc > 0;
  const increase_ok = frost_zone && inc > 0 ? inc >= 12 : null;
  const frost_ok = frost_zone ? (diameter_ok && increase_ok !== false) : null;

  // 903.2
  const clears_horizontally = horiz >= 10;
  const clears_vertically = above >= 3;
  const location_ok = clears_horizontally || clears_vertically;

  const passes = height_ok && (frost_ok !== false) && location_ok;

  const note = "IPC 903 puts three independent rules on the same pipe, and satisfying two of them is not compliance. "
    + "HEIGHT (903.1): " + (otherUse ? "this roof is used for a purpose other than weather protection, so the extension must run at least 7 ft - 84 in - above it, not 6 in. " : "at least 6 in above the roof or 6 in above the anticipated snow accumulation, whichever is greater; with " + snow + " in of snow that is " + required_height_in + " in" + (snow_governs ? " and the SNOW governs, not the 6 in floor. " : ". "))
    + "This terminal is " + h + " in: " + (height_ok ? "OK. " : "SHORT by " + height_deficit_in.toFixed(1) + " in. ")
    + "FROST CLOSURE (903.1.1): the 97.5% outdoor design temperature entered is " + t + " F, "
    + (frost_zone
      ? "which is 0 F or less, so the extension must be not less than 3 in in diameter - this one is " + dia + " in, " + (diameter_ok ? "OK" : "TOO SMALL") + ". "
        + (inc > 0
          ? "The size increase is made " + inc + " in inside the thermal envelope against the 1 ft minimum: " + (increase_ok ? "OK. " : "TOO SHALLOW. ")
          : "No increase depth entered. This is the part that gets missed: the increaser has to be at least 1 ft INSIDE the thermal envelope, because a fitting made up in a cold attic frosts shut exactly like the small pipe it replaced. ")
      : "which is above 0 F, so the 3 in frost-closure rule does not apply and the vent may be sized by the drainage rules alone. ")
    + "LOCATION (903.2): a terminal may not sit directly beneath, or within 10 ft horizontally of, any door, openable window, or other air intake of this or an adjacent building unless it is 3 ft above the opening. At " + horiz + " ft horizontally and " + above + " ft above: "
    + (location_ok ? (clears_horizontally ? "clears on the 10 ft horizontal separation. " : "inside 10 ft horizontally but 3 ft or more above, which the code permits. ") : "FAILS - inside 10 ft horizontally and less than 3 ft above. Move it, or take it up. ")
    + (passes ? "PASSES all three. " : "DOES NOT PASS. ")
    + "Note that the neighbour's windows count as much as your own: the section says this or an ADJACENT building, which is the one that surprises people on a tight lot. Snow accumulation is a local figure - the code says ANTICIPATED, not a national number - so use what your AHJ or the local design data gives. "
    + "Not checked here: the vent's required SIZE from the drainage fixture units and developed length, whether the vent is required at all, the connection and grade of the branch below, roof flashing and the sleeve, wall terminations and their own separations, or combustion and fuel-gas venting, which is an entirely different chapter. A screen, not a code-official determination; the adopted code and the AHJ govern.";

  return { required_height_in, height_ok, height_deficit_in, snow_governs, other_use: otherUse, frost_zone, min_diameter_in, min_increase_depth_in, diameter_ok, increase_ok, needs_increase, frost_ok, clears_horizontally, clears_vertically, location_ok, passes, note };
}

export const ventTerminalCheckExample = { inputs: { height_above_roof_in: 6, snow_accumulation_in: 18, roof_other_use: "no", design_temp_f: -10, vent_diameter_in: 2, increase_inside_envelope_in: 6, horizontal_to_opening_ft: 4, height_above_opening_ft: 1 } };

function _v1135renderVentTerminalCheck(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IPC 903.1 - open vent pipes extending through a roof terminated not less than 6 in above the roof or 6 in above the anticipated snow accumulation, whichever is greater, except not less than 7 ft where the roof is used for any purpose other than weather protection. IPC 903.1.1 - where the 97.5-percent value for outdoor design temperature is 0 degF or less, vent extensions through a roof or wall not less than 3 in in diameter, with any increase in the size of the vent made not less than 1 ft inside the thermal envelope of the building. IPC 903.2 - an open vent terminal not located directly beneath any door, openable window, or other air intake of the building or of an adjacent building, and not within 10 ft horizontally of such an opening unless it is 3 ft above it. Anticipated snow accumulation and the design temperature are local figures. Not checked: the vent SIZE from drainage fixture units and developed length, whether a vent is required, the branch below, flashing, wall terminations, or fuel-gas venting. A screen, not a code-official determination; the adopted code and the AHJ govern.";
  const h = makeNumber("Height above the roof (in)", "vtc-h", { step: "any", min: "0" });
  const sn = makeNumber("Anticipated snow accumulation (in)", "vtc-sn", { step: "any", min: "0" });
  const ru = makeSelect("Roof used for anything but weather protection?", "vtc-ru", [{ value: "no", label: "No", selected: true }, { value: "yes", label: "Yes - 7 ft applies" }]);
  const dt = makeNumber("97.5% outdoor design temperature (°F)", "vtc-dt", { step: "any" });
  const di = makeNumber("Vent diameter through the roof (in)", "vtc-di", { step: "any", min: "0" });
  const ic = makeNumber("Size increase made this far inside the thermal envelope (in; 0 = none)", "vtc-ic", { step: "any", min: "0" });
  const hz = makeNumber("Horizontal distance to the nearest door, openable window, or intake (ft)", "vtc-hz", { step: "any", min: "0" });
  const ab = makeNumber("Height above that opening (ft)", "vtc-ab", { step: "any", min: "0" });
  inputRegion.appendChild(h.wrap); inputRegion.appendChild(sn.wrap); inputRegion.appendChild(ru.wrap);
  for (const x of [dt, di, ic, hz, ab]) inputRegion.appendChild(x.wrap);
  attachExampleButton(inputRegion, () => { h.input.value = "6"; sn.input.value = "18"; ru.select.value = "no"; dt.input.value = "-10"; di.input.value = "2"; ic.input.value = "6"; hz.input.value = "4"; ab.input.value = "1"; update(); });
  const oV = makeOutputLine(outputRegion, "Verdict", "vtc-out-v");
  const oH = makeOutputLine(outputRegion, "Height (903.1)", "vtc-out-h");
  const oF = makeOutputLine(outputRegion, "Frost closure (903.1.1)", "vtc-out-f");
  const oL = makeOutputLine(outputRegion, "Location (903.2)", "vtc-out-l");
  const oNote = makeOutputLine(outputRegion, "Note", "vtc-out-note");
  const update = debounce(() => {
    const r = computeVentTerminalCheck({ height_above_roof_in: Number(h.input.value) || 0, snow_accumulation_in: Number(sn.input.value) || 0, roof_other_use: ru.select.value, design_temp_f: Number(dt.input.value), vent_diameter_in: Number(di.input.value) || 0, increase_inside_envelope_in: Number(ic.input.value) || 0, horizontal_to_opening_ft: Number(hz.input.value) || 0, height_above_opening_ft: Number(ab.input.value) || 0 });
    if (r.error) { oV.textContent = r.error; oH.textContent = "-"; oF.textContent = "-"; oL.textContent = "-"; oNote.textContent = "-"; return; }
    oV.textContent = r.passes ? "PASSES all three rules" : "DOES NOT PASS";
    oH.textContent = "needs " + fmt(r.required_height_in, 1) + " in" + (r.snow_governs ? " (snow governs)" : r.other_use ? " (roof in use)" : "") + " - " + (r.height_ok ? "OK" : "short by " + fmt(r.height_deficit_in, 1) + " in");
    oF.textContent = !r.frost_zone ? "does not apply above 0 degF" : (r.diameter_ok ? "3 in diameter OK" : "diameter TOO SMALL") + ", " + (r.increase_ok === null ? "no increase entered - it must be 1 ft inside the envelope" : r.increase_ok ? "increase depth OK" : "increase TOO SHALLOW");
    oL.textContent = r.location_ok ? (r.clears_horizontally ? "clears 10 ft horizontally" : "within 10 ft but 3 ft or more above - permitted") : "FAILS - within 10 ft and under 3 ft above";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const x of [h, sn, dt, di, ic, hz, ab]) x.input.addEventListener("input", update);
  ru.select.addEventListener("change", update);
}
PLUMBINGCODE_RENDERERS["vent-terminal-check"] = _v1135renderVentTerminalCheck;

// --- spec-v1136: air admittance valve installation check (IPC 918) ---
// The AAV is sold as the thing that saves you a vent through the roof, and 918.7 says
// plainly that it does not: at least one vent pipe must still extend to the OUTDOORS,
// because an AAV admits air to relieve negative pressure and can do nothing about positive
// pressure. A system vented entirely by AAVs has no path for the air a discharging stack
// pushes ahead of it. The rest is placement: not less than 4 in above the horizontal branch
// or fixture drain being vented (918.4), not less than 6 in above insulation (918.6), in a
// ventilated space with access, and rated for the fixture units it serves.
// dims: in { height_above_drain_in: L, height_above_insulation_in: L, has_outdoor_vent: dimensionless, ventilated_space: dimensionless, accessible: dimensionless, dfu_served: dimensionless, valve_dfu_rating: dimensionless } out: { drain_deficit_in: L, insulation_deficit_in: L, dfu_margin: dimensionless }
export function computeAavInstallCheck({ height_above_drain_in = 0, height_above_insulation_in = 0, has_outdoor_vent = "yes", ventilated_space = "yes", accessible = "yes", dfu_served = 0, valve_dfu_rating = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const hd = Number(height_above_drain_in) || 0;
  const hi = Number(height_above_insulation_in) || 0;
  const dfu = Number(dfu_served) || 0;
  const rating = Number(valve_dfu_rating) || 0;
  const outdoor = has_outdoor_vent === "yes";
  const ventilated = ventilated_space === "yes";
  const access = accessible === "yes";
  if (!(hd > 0)) return { error: "Height above the branch or fixture drain must be positive (in)." };
  if (hi < 0) return { error: "Height above insulation cannot be negative (in)." };
  if (dfu < 0) return { error: "Drainage fixture units served cannot be negative." };
  if (rating < 0) return { error: "Valve DFU rating cannot be negative." };

  const MIN_DRAIN = 4, MIN_INSUL = 6;
  const drain_ok = hd >= MIN_DRAIN;
  const drain_deficit_in = Math.max(0, MIN_DRAIN - hd);
  const has_insulation = hi > 0;
  const insulation_ok = has_insulation ? hi >= MIN_INSUL : null;
  const insulation_deficit_in = has_insulation ? Math.max(0, MIN_INSUL - hi) : 0;
  const rated = rating > 0 && dfu > 0;
  const dfu_ok = rated ? rating >= dfu : null;
  const dfu_margin = rated ? rating - dfu : null;

  const passes = outdoor && ventilated && access && drain_ok && (insulation_ok !== false) && (dfu_ok !== false);

  const note = "THE ONE THAT VOIDS THE REST: IPC 918.7 requires at least one vent pipe to extend to the OUTDOORS even where air admittance valves are used, and this system "
    + (outdoor ? "has one. " : "does NOT. An AAV admits air to relieve NEGATIVE pressure and can do nothing about POSITIVE pressure - the air a discharging stack pushes ahead of it has to go somewhere, and with every vent capped by a valve there is no path for it. Venting a whole building on AAVs is the failure this rule exists to prevent, and no amount of correct placement fixes it. ")
    + "PLACEMENT: 918.4 puts the valve not less than " + MIN_DRAIN + " in above the horizontal branch drain or fixture drain being vented - this one is " + hd + " in, " + (drain_ok ? "OK" : "SHORT by " + drain_deficit_in.toFixed(1) + " in") + ". "
    + (has_insulation
      ? "918.6 puts it not less than " + MIN_INSUL + " in above insulation materials - this one is " + hi + " in, " + (insulation_ok ? "OK. " : "SHORT by " + insulation_deficit_in.toFixed(1) + " in. ")
      : "No insulation height entered; where the valve sits above insulation 918.6 wants at least " + MIN_INSUL + " in of clearance, since buried or blanketed valves are a common attic failure. ")
    + "The valve must be in a VENTILATED space - " + (ventilated ? "stated as ventilated" : "NOT stated as ventilated, and a valve sealed inside a tight cabinet or a closed wall cavity has no air to admit") + " - and must remain ACCESSIBLE - " + (access ? "stated as accessible" : "NOT accessible, and a valve is a mechanical device with a diaphragm that eventually fails, so burying it behind finished work guarantees an expensive repair") + ". "
    + (rated ? "Capacity: the valve is rated " + rating + " DFU against " + dfu + " served, " + (dfu_ok ? "with " + dfu_margin + " DFU of margin. " : "which is UNDER by " + Math.abs(dfu_margin) + " DFU. ") : "Enter the served fixture units and the valve's rating to check capacity; ratings are listed per ASSE 1051 or 1050 and are not interchangeable between individual, branch, and stack types. ")
    + (passes ? "PASSES the checks entered. " : "DOES NOT PASS. ")
    + "Not checked: whether AAVs are permitted at all by the adopted code and the AHJ - several jurisdictions restrict or prohibit them, and that is the first question, not the last; the developed length and sizing of the vent the valve terminates; the relief vent a horizontal branch more than four branch intervals below the top of the stack requires; use in a return-air plenum or where prohibited by the manufacturer's listing; or the trap seal and fixture arrangement below. A screen, not a code-official determination; the adopted code, the valve's listing, and the AHJ govern.";

  return { drain_ok, drain_deficit_in, has_insulation, insulation_ok, insulation_deficit_in, outdoor_vent_ok: outdoor, ventilated_ok: ventilated, accessible_ok: access, rated, dfu_ok, dfu_margin, passes, note };
}

export const aavInstallCheckExample = { inputs: { height_above_drain_in: 4, height_above_insulation_in: 6, has_outdoor_vent: "yes", ventilated_space: "yes", accessible: "yes", dfu_served: 6, valve_dfu_rating: 20 } };

function _v1136renderAavInstallCheck(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IPC 918 - individual and branch-type air admittance valves located not less than 4 in above the horizontal branch drain or fixture drain being vented (918.4); installed not less than 6 in above insulation materials (918.6); located in a ventilated space and remaining accessible; and, the requirement that governs everything else, at least one vent pipe extending to the OUTDOORS even where air admittance valves are used (918.7), because a valve admits air to relieve negative pressure and provides no relief of positive pressure. Valve capacity is rated in drainage fixture units per its ASSE 1051 or 1050 listing and is not interchangeable between individual, branch, and stack types. Not checked: whether AAVs are permitted at all by the adopted code and the AHJ, the developed length and sizing of the vent, the relief vent required where a horizontal branch is more than four branch intervals from the top of the stack, plenum restrictions, or the fixture arrangement below. A screen, not a code-official determination; the adopted code, the valve's listing, and the AHJ govern.";
  const hd = makeNumber("Height above the branch or fixture drain (in)", "aav-hd", { step: "any", min: "0" });
  const hi = makeNumber("Height above insulation (in; 0 = no insulation below)", "aav-hi", { step: "any", min: "0" });
  const ov = makeSelect("At least one vent extends to the outdoors?", "aav-ov", [{ value: "yes", label: "Yes", selected: true }, { value: "no", label: "No" }]);
  const vs = makeSelect("Valve is in a ventilated space?", "aav-vs", [{ value: "yes", label: "Yes", selected: true }, { value: "no", label: "No" }]);
  const ac = makeSelect("Valve remains accessible?", "aav-ac", [{ value: "yes", label: "Yes", selected: true }, { value: "no", label: "No" }]);
  const df = makeNumber("Drainage fixture units served", "aav-df", { step: "any", min: "0" });
  const vr = makeNumber("Valve DFU rating (from its listing)", "aav-vr", { step: "any", min: "0" });
  inputRegion.appendChild(hd.wrap); inputRegion.appendChild(hi.wrap);
  inputRegion.appendChild(ov.wrap); inputRegion.appendChild(vs.wrap); inputRegion.appendChild(ac.wrap);
  inputRegion.appendChild(df.wrap); inputRegion.appendChild(vr.wrap);
  attachExampleButton(inputRegion, () => { hd.input.value = "4"; hi.input.value = "6"; ov.select.value = "yes"; vs.select.value = "yes"; ac.select.value = "yes"; df.input.value = "6"; vr.input.value = "20"; update(); });
  const oV = makeOutputLine(outputRegion, "Verdict", "aav-out-v");
  const oO = makeOutputLine(outputRegion, "Outdoor vent still required (918.7)", "aav-out-o");
  const oP = makeOutputLine(outputRegion, "Placement", "aav-out-p");
  const oC = makeOutputLine(outputRegion, "Capacity", "aav-out-c");
  const oNote = makeOutputLine(outputRegion, "Note", "aav-out-note");
  const update = debounce(() => {
    const r = computeAavInstallCheck({ height_above_drain_in: Number(hd.input.value) || 0, height_above_insulation_in: Number(hi.input.value) || 0, has_outdoor_vent: ov.select.value, ventilated_space: vs.select.value, accessible: ac.select.value, dfu_served: Number(df.input.value) || 0, valve_dfu_rating: Number(vr.input.value) || 0 });
    if (r.error) { oV.textContent = r.error; oO.textContent = "-"; oP.textContent = "-"; oC.textContent = "-"; oNote.textContent = "-"; return; }
    oV.textContent = r.passes ? "PASSES the checks entered" : "DOES NOT PASS";
    oO.textContent = r.outdoor_vent_ok ? "present - OK" : "MISSING; an AAV relieves negative pressure only and cannot substitute";
    oP.textContent = (r.drain_ok ? "4 in above the drain OK" : "SHORT by " + fmt(r.drain_deficit_in, 1) + " in above the drain") + ", " + (r.insulation_ok === null ? "no insulation entered" : r.insulation_ok ? "6 in above insulation OK" : "SHORT by " + fmt(r.insulation_deficit_in, 1) + " in above insulation") + ", " + (r.ventilated_ok ? "ventilated" : "NOT ventilated") + ", " + (r.accessible_ok ? "accessible" : "NOT accessible");
    oC.textContent = r.dfu_ok === null ? "- (enter the served DFU and the valve rating)" : r.dfu_ok ? "OK with " + fmt(r.dfu_margin, 0) + " DFU of margin" : "UNDER by " + fmt(Math.abs(r.dfu_margin), 0) + " DFU";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const x of [hd, hi, df, vr]) x.input.addEventListener("input", update);
  for (const x of [ov, vs, ac]) x.select.addEventListener("change", update);
}
PLUMBINGCODE_RENDERERS["aav-install-check"] = _v1136renderAavInstallCheck;

// --- spec-v1137: ADA grab bar layout and blocking load (2010 ADA Standards 604.5 / 609) ---
// The accessible-fixture geometry the IPC clearance tile explicitly says it does not cover,
// plus the number nobody puts on a drawing: 609.8 requires the bar and its mounting to
// sustain 250 lbf, and a bar standing 1.5 in off the wall turns that into a prying moment
// the blocking has to resolve over the fastener spacing - the same lever-arm collapse the
// guard-post tile shows, in miniature. A bar screwed to drywall anchors meets none of it.
// dims: in { bar_height_in: L, side_bar_length_in: L, side_bar_from_rear_in: L, rear_bar_length_in: L, rear_toward_side_in: L, rear_toward_open_in: L, load_lb: M L T^-2, standoff_in: L, fastener_spacing_in: L } out: { pull_out_lb: M L T^-2, prying_moment_inlb: M L^2 T^-2, fastener_force_lb: M L T^-2 }
export function computeGrabBarLayout({ bar_height_in = 34, side_bar_length_in = 42, side_bar_from_rear_in = 12, rear_bar_length_in = 36, rear_toward_side_in = 12, rear_toward_open_in = 24, load_lb = 250, standoff_in = 1.5, fastener_spacing_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const h = Number(bar_height_in) || 0;
  const sl = Number(side_bar_length_in) || 0;
  const sf = Number(side_bar_from_rear_in) || 0;
  const rl = Number(rear_bar_length_in) || 0;
  const rs = Number(rear_toward_side_in) || 0;
  const ro = Number(rear_toward_open_in) || 0;
  const P = Number(load_lb) || 0;
  const off = Number(standoff_in) || 0;
  const fs = Number(fastener_spacing_in) || 0;
  if (!(h > 0)) return { error: "Grab bar height must be positive (in)." };
  if (!(sl > 0) || !(rl > 0)) return { error: "Both grab bar lengths must be positive (in)." };
  if (sf < 0 || rs < 0 || ro < 0) return { error: "Grab bar positions cannot be negative (in)." };
  if (!(P > 0)) return { error: "Design load must be positive (lb)." };
  if (off < 0) return { error: "Standoff from the wall cannot be negative (in)." };
  if (fs < 0) return { error: "Fastener spacing cannot be negative (in)." };

  const H_MIN = 33, H_MAX = 36, SIDE_MIN = 42, SIDE_FROM_REAR_MAX = 12, REAR_MIN = 36, REAR_SIDE_MIN = 12, REAR_OPEN_MIN = 24;
  const height_ok = h >= H_MIN && h <= H_MAX;
  const side_length_ok = sl >= SIDE_MIN;
  const side_position_ok = sf <= SIDE_FROM_REAR_MAX;
  const rear_length_ok = rl >= REAR_MIN;
  const rear_side_ok = rs >= REAR_SIDE_MIN;
  const rear_open_ok = ro >= REAR_OPEN_MIN;
  // A rear bar has to reach both ways from the centerline, so its length is not independent
  // of the two extensions - this is the check people miss on a 36 in bar.
  const rear_span_needed_in = rs + ro;
  const rear_span_ok = rl >= rear_span_needed_in;
  const layout_ok = height_ok && side_length_ok && side_position_ok && rear_length_ok && rear_side_ok && rear_open_ok && rear_span_ok;

  // 609.8: the bar AND its mounting sustain the load. Standoff turns a pull into a pry.
  const pull_out_lb = P;
  const prying_moment_inlb = P * off;
  const fastener_force_lb = fs > 0 ? prying_moment_inlb / fs : null;
  const force_multiplier = fs > 0 ? off / fs : null;

  const note = "POSITION (609.4): horizontal, " + H_MIN + " to " + H_MAX + " in above the finish floor to the TOP of the gripping surface - this one is at " + h + " in, " + (height_ok ? "OK. " : "OUT OF RANGE. ")
    + "SIDE WALL (604.5.1): at least " + SIDE_MIN + " in long, no more than " + SIDE_FROM_REAR_MAX + " in from the rear wall - this one is " + sl + " in at " + sf + " in, " + (side_length_ok ? "length OK" : "TOO SHORT") + " and " + (side_position_ok ? "position OK" : "TOO FAR from the rear wall") + ". "
    + "REAR WALL: at least " + REAR_MIN + " in long, extending at least " + REAR_SIDE_MIN + " in from the water closet centerline toward the side wall and at least " + REAR_OPEN_MIN + " in toward the open side - this one is " + rl + " in reaching " + rs + " and " + ro + " in, " + (rear_length_ok ? "length OK" : "TOO SHORT") + ", " + (rear_side_ok ? "side extension OK" : "side extension SHORT") + ", " + (rear_open_ok ? "open extension OK" : "open extension SHORT") + ". "
    + "The check people miss: those two extensions have to fit ON the bar. They add to " + rear_span_needed_in + " in, so a " + REAR_MIN + " in bar only works when they total " + REAR_MIN + " or less - here the bar is " + rl + " in and " + (rear_span_ok ? "covers it. " : "does NOT cover it, so the bar has to grow even though every individual dimension reads compliant. ")
    + "LOAD (609.8): the bar and its MOUNTING must sustain " + P + " lbf. That is not a fastener count, it is a load path. A bar standing " + off + " in off the wall converts a straight " + P + " lb pull into " + prying_moment_inlb.toFixed(0) + " in-lb of prying moment at the flange"
    + (fs > 0 ? ", and resolving that across " + fs + " in of fastener spacing puts " + fastener_force_lb.toFixed(0) + " lb on the outer fastener - " + force_multiplier.toFixed(2) + " times the applied load, before the straight pull-out is even counted. " : ". Enter the flange's fastener spacing to see what that does to the outer fastener. ")
    + "Which is why this fails in practice on the anchor and not the bar: drywall toggles and plastic anchors do not carry it, and the answer is solid blocking or a steel backing plate behind the finish, installed before the board goes up. Retrofitting into an existing wall usually means opening it. "
    + (layout_ok ? "The layout dimensions entered PASS. " : "The layout dimensions entered DO NOT all pass. ")
    + "Scope: the standard water-closet configuration with a side wall and a rear wall. Ambulatory-accessible stalls, bathtubs, and roll-in and transfer showers each have their own bar layouts under 604.8, 607, and 608 and are NOT this. Not checked: the clear floor space, the water closet centerline at 16-18 in, seat height, flush-control side, dispenser locations, the 1-1/4 to 2 in gripping diameter, or the 1-1/2 in clearance behind the bar. The 2010 ADA Standards and ANSI A117.1 differ in places and a state may adopt either; a screen, not a certification of accessibility - the adopted standard and the AHJ govern.";

  return { height_ok, side_length_ok, side_position_ok, rear_length_ok, rear_side_ok, rear_open_ok, rear_span_needed_in, rear_span_ok, layout_ok, pull_out_lb, prying_moment_inlb, fastener_force_lb, force_multiplier, note };
}

export const grabBarLayoutExample = { inputs: { bar_height_in: 34, side_bar_length_in: 42, side_bar_from_rear_in: 12, rear_bar_length_in: 36, rear_toward_side_in: 12, rear_toward_open_in: 24, load_lb: 250, standoff_in: 1.5, fastener_spacing_in: 3 } };

function _v1137renderGrabBarLayout(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: 2010 ADA Standards for Accessible Design - 609.4, grab bars installed in a horizontal position 33 in minimum and 36 in maximum above the finish floor measured to the top of the gripping surface; 604.5.1, a side-wall grab bar 42 in minimum long located 12 in maximum from the rear wall, and a rear-wall grab bar 36 in minimum long extending at least 12 in from the water closet centerline toward the side wall and at least 24 in toward the open side; 609.8, grab bars and their mounting sustaining 250 lbf. Prying moment and fastener force are statics from the standoff and flange geometry, not code values. Standard water-closet configuration only: ambulatory stalls, bathtubs, and roll-in and transfer showers have their own layouts under 604.8, 607, and 608. Clear floor space, the 16-18 in centerline, seat height, gripping diameter, and the 1-1/2 in clearance behind the bar are not checked. The 2010 ADA Standards and ANSI A117.1 differ in places; a screen, not a certification of accessibility - the adopted standard and the AHJ govern.";
  const h = makeNumber("Bar height to the top of the gripping surface (in)", "gbl-h", { step: "any", min: "0" });
  const sl = makeNumber("Side-wall bar length (in)", "gbl-sl", { step: "any", min: "0" });
  const sf = makeNumber("Side bar distance from the rear wall (in)", "gbl-sf", { step: "any", min: "0" });
  const rl = makeNumber("Rear-wall bar length (in)", "gbl-rl", { step: "any", min: "0" });
  const rs = makeNumber("Rear bar reach toward the side wall (in)", "gbl-rs", { step: "any", min: "0" });
  const ro = makeNumber("Rear bar reach toward the open side (in)", "gbl-ro", { step: "any", min: "0" });
  const ld = makeNumber("Design load (lbf; ADA 250)", "gbl-ld", { step: "any", min: "0" });
  const so = makeNumber("Standoff from the wall to the bar centerline (in)", "gbl-so", { step: "any", min: "0" });
  const fs = makeNumber("Flange fastener spacing (in; 0 to skip)", "gbl-fs", { step: "any", min: "0" });
  for (const x of [h, sl, sf, rl, rs, ro, ld, so, fs]) inputRegion.appendChild(x.wrap);
  attachExampleButton(inputRegion, () => { h.input.value = "34"; sl.input.value = "42"; sf.input.value = "12"; rl.input.value = "36"; rs.input.value = "12"; ro.input.value = "24"; ld.input.value = "250"; so.input.value = "1.5"; fs.input.value = "3"; update(); });
  const oV = makeOutputLine(outputRegion, "Layout verdict", "gbl-out-v");
  const oS = makeOutputLine(outputRegion, "Side wall bar", "gbl-out-s");
  const oR = makeOutputLine(outputRegion, "Rear wall bar", "gbl-out-r");
  const oL = makeOutputLine(outputRegion, "Blocking load path (609.8)", "gbl-out-l");
  const oNote = makeOutputLine(outputRegion, "Note", "gbl-out-note");
  const update = debounce(() => {
    const r = computeGrabBarLayout({ bar_height_in: Number(h.input.value) || 0, side_bar_length_in: Number(sl.input.value) || 0, side_bar_from_rear_in: Number(sf.input.value) || 0, rear_bar_length_in: Number(rl.input.value) || 0, rear_toward_side_in: Number(rs.input.value) || 0, rear_toward_open_in: Number(ro.input.value) || 0, load_lb: Number(ld.input.value) || 0, standoff_in: Number(so.input.value) || 0, fastener_spacing_in: Number(fs.input.value) || 0 });
    if (r.error) { oV.textContent = r.error; oS.textContent = "-"; oR.textContent = "-"; oL.textContent = "-"; oNote.textContent = "-"; return; }
    oV.textContent = (r.layout_ok ? "PASSES" : "DOES NOT PASS") + "; height " + (r.height_ok ? "OK" : "out of the 33-36 in range");
    oS.textContent = (r.side_length_ok ? "42 in length OK" : "TOO SHORT") + ", " + (r.side_position_ok ? "within 12 in of the rear wall" : "TOO FAR from the rear wall");
    oR.textContent = (r.rear_length_ok ? "36 in length OK" : "TOO SHORT") + ", reaches " + (r.rear_side_ok ? "OK" : "SHORT") + " / " + (r.rear_open_ok ? "OK" : "SHORT") + ", and the two reaches need " + fmt(r.rear_span_needed_in, 0) + " in of bar - " + (r.rear_span_ok ? "covered" : "NOT covered");
    oL.textContent = fmt(r.pull_out_lb, 0) + " lb pull-out plus " + fmt(r.prying_moment_inlb, 0) + " in-lb of pry" + (r.fastener_force_lb === null ? "" : " = " + fmt(r.fastener_force_lb, 0) + " lb on the outer fastener (" + fmt(r.force_multiplier, 2) + "x)");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const x of [h, sl, sf, rl, rs, ro, ld, so, fs]) x.input.addEventListener("input", update);
}
PLUMBINGCODE_RENDERERS["grab-bar-layout"] = _v1137renderGrabBarLayout;

// --- spec-v1140: drainage cleanout layout (IPC 708) ---
// Three separate triggers put cleanouts in a drain and they are additive, which is why a
// count done from any one of them comes out low: spacing along the horizontal run, every
// change of horizontal direction greater than 45 degrees, and the base of every waste or
// soil stack. The subtlety is the grouping allowance - where more than one change over 45
// degrees occurs within 40 ft of developed length, the cleanout at the FIRST change serves
// all of them - which caps the change-driven count at ceil(run / 40) no matter how many
// bends are drawn. This tile reports that cap alongside the entered count, because it is
// the difference between a fitting on every elbow and a sane number of them.
// dims: in { horizontal_run_ft: L, max_spacing_ft: L, direction_changes: dimensionless, changes_grouped_away: dimensionless, stack_count: dimensionless, pipe_size_in: L, clear_space_in: L, crawl_height_in: L } out: { spacing_cleanouts: dimensionless, change_cleanouts: dimensionless, change_cap: dimensionless, stack_cleanouts: dimensionless, total_cleanouts: dimensionless }
export function computeCleanoutLayout({ horizontal_run_ft = 0, max_spacing_ft = 100, direction_changes = 0, changes_grouped_away = 0, stack_count = 0, pipe_size_in = 4, clear_space_in = 18, crawl_height_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const L = Number(horizontal_run_ft) || 0;
  const spacing = Number(max_spacing_ft) || 0;
  const changes = Number(direction_changes) || 0;
  const grouped = Number(changes_grouped_away) || 0;
  const stacks = Number(stack_count) || 0;
  const size = Number(pipe_size_in) || 0;
  const clear = Number(clear_space_in) || 0;
  const crawl = Number(crawl_height_in) || 0;
  if (!(L > 0)) return { error: "Horizontal drain run must be positive (ft)." };
  if (!(spacing > 0)) return { error: "Maximum cleanout spacing must be positive (ft)." };
  if (!Number.isInteger(changes) || changes < 0) return { error: "Direction-change count must be a whole number of 0 or more." };
  if (!Number.isInteger(grouped) || grouped < 0) return { error: "Grouped-away change count must be a whole number of 0 or more." };
  if (grouped > changes) return { error: "More changes grouped away than entered." };
  if (!Number.isInteger(stacks) || stacks < 0) return { error: "Stack count must be a whole number of 0 or more." };
  if (!(size > 0)) return { error: "Pipe size must be positive (in)." };
  if (clear < 0) return { error: "Clear space cannot be negative (in)." };
  if (crawl < 0) return { error: "Crawl-space pathway height cannot be negative (in)." };

  // Spacing: intermediate cleanouts along the run, assuming the run begins at one.
  const spacing_cleanouts = Math.max(0, Math.ceil(L / spacing) - 1);
  // Changes: the 40 ft grouping allowance caps how many can ever be required.
  const change_cap = Math.ceil(L / 40);
  const change_claimed = changes - grouped;
  const change_cleanouts = Math.min(change_claimed, change_cap);
  const cap_governs = change_claimed > change_cap;
  const stack_cleanouts = stacks;
  const total_cleanouts = spacing_cleanouts + change_cleanouts + stack_cleanouts;

  const small_bore = size <= 6;
  const clear_ok = small_bore ? clear >= 18 : null;
  const in_crawl = crawl > 0;
  const crawl_ok = in_crawl ? crawl >= 24 : null;
  const access_ok = (clear_ok !== false) && (crawl_ok !== false);

  const note = "Three triggers, and they ADD - counting from any one of them comes out low. "
    + "SPACING (708.1): horizontal drains get cleanouts not more than " + spacing + " ft apart, so a " + L + " ft run takes " + spacing_cleanouts + " intermediate cleanout" + (spacing_cleanouts === 1 ? "" : "s") + " on top of whatever sits at its head. "
    + "CHANGES OF DIRECTION: a cleanout at every change of horizontal direction greater than 45 degrees - but where more than one such change occurs within 40 ft of developed length, the cleanout at the FIRST change serves all of them. That caps the change-driven count at ceil(" + L + "/40) = " + change_cap + " for this run no matter how many bends are drawn. "
    + "You entered " + changes + " change" + (changes === 1 ? "" : "s") + (grouped > 0 ? " with " + grouped + " grouped away" : "") + ", giving " + change_cleanouts + (cap_governs ? " - the 40 ft grouping CAP governs here, not your count, which is the allowance that keeps a bendy run from needing a fitting at every elbow. " : ". ")
    + "STACK BASES: one at the base of each waste or soil stack, " + stack_cleanouts + " here. "
    + "TOTAL " + total_cleanouts + ". "
    + "ACCESS is a requirement, not a courtesy, and it is where cleanouts get valued-engineered into uselessness. "
    + (small_bore ? "For a cleanout " + size + " in and smaller the opening needs at least 18 in of clear space in front - " + clear + " in entered, " + (clear_ok ? "OK. " : "SHORT. ") : "This is over 6 in, and larger cleanouts carry their own larger clearance requirement which this tile does not check - read the section. ")
    + (in_crawl ? "In a crawl space the unobstructed height along the pathway to the cleanout must be at least 24 in - " + crawl + " in entered, " + (crawl_ok ? "OK. " : "TOO LOW, so the cleanout is not accessible even if it exists. ") : "")
    + (access_ok ? "" : "A cleanout that cannot be reached and turned does not count as one. ")
    + "The spacing count assumes the run BEGINS at a cleanout - a stack base, an upstream cleanout, or the point where the code otherwise requires one. If it does not, add one at the head. "
    + "Not checked: cleanout SIZE relative to the pipe, which is its own rule; whether a fitting or a fixture is permitted to serve as the cleanout; the building drain and building sewer junction; manholes on large sewers; the direction the cleanout must face; concealed piping and access covers; or cleanout material and thread type. A screen; the adopted code and the AHJ govern.";

  return { spacing_cleanouts, change_cap, change_cleanouts, cap_governs, stack_cleanouts, total_cleanouts, small_bore, clear_ok, in_crawl, crawl_ok, access_ok, note };
}

export const cleanoutLayoutExample = { inputs: { horizontal_run_ft: 240, max_spacing_ft: 100, direction_changes: 9, changes_grouped_away: 0, stack_count: 2, pipe_size_in: 4, clear_space_in: 18, crawl_height_in: 30 } };

function _v1140renderCleanoutLayout(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IPC 708 - horizontal drains provided with cleanouts located not more than 100 ft apart; a cleanout where a horizontal drainage pipe, building drain, or building sewer has a change of horizontal direction greater than 45 degrees, with the allowance that where more than one such change occurs within 40 ft of developed length the cleanout at the first change serves all of them; a cleanout at the base of each waste or soil stack; a clear space of not less than 18 in at the opening of cleanouts 6 in and smaller; and, where a cleanout is in a crawl space, an unobstructed pathway height of not less than 24 in. Larger cleanouts carry their own clearance requirement, not checked here. Also not checked: cleanout size relative to the pipe, fittings or fixtures serving as cleanouts, the building drain and sewer junction, manholes, cleanout orientation, concealed piping and access covers, or material and threads. A screen; the adopted code and the AHJ govern.";
  const L = makeNumber("Horizontal drain run (ft)", "clo-l", { step: "any", min: "0" });
  const sp = makeNumber("Maximum cleanout spacing (ft; IPC 100)", "clo-sp", { step: "any", min: "0" });
  const dc = makeNumber("Changes of horizontal direction over 45 degrees", "clo-dc", { step: "1", min: "0" });
  const gp = makeNumber("Of those, how many are grouped away (0 = let the 40 ft cap decide)", "clo-gp", { step: "1", min: "0" });
  const st = makeNumber("Waste or soil stacks", "clo-st", { step: "1", min: "0" });
  const ps = makeNumber("Cleanout / pipe size (in)", "clo-ps", { step: "any", min: "0" });
  const cs = makeNumber("Clear space at the opening (in)", "clo-cs", { step: "any", min: "0" });
  const ch = makeNumber("Crawl-space pathway height (in; 0 = not in a crawl space)", "clo-ch", { step: "any", min: "0" });
  for (const x of [L, sp, dc, gp, st, ps, cs, ch]) inputRegion.appendChild(x.wrap);
  attachExampleButton(inputRegion, () => { L.input.value = "240"; sp.input.value = "100"; dc.input.value = "9"; gp.input.value = "0"; st.input.value = "2"; ps.input.value = "4"; cs.input.value = "18"; ch.input.value = "30"; update(); });
  const oT = makeOutputLine(outputRegion, "Total cleanouts", "clo-out-t");
  const oS = makeOutputLine(outputRegion, "From spacing", "clo-out-s");
  const oC = makeOutputLine(outputRegion, "From changes of direction", "clo-out-c");
  const oB = makeOutputLine(outputRegion, "From stack bases", "clo-out-b");
  const oA = makeOutputLine(outputRegion, "Access", "clo-out-a");
  const oNote = makeOutputLine(outputRegion, "Note", "clo-out-note");
  const update = debounce(() => {
    const r = computeCleanoutLayout({ horizontal_run_ft: Number(L.input.value) || 0, max_spacing_ft: Number(sp.input.value) || 0, direction_changes: Number(dc.input.value) || 0, changes_grouped_away: Number(gp.input.value) || 0, stack_count: Number(st.input.value) || 0, pipe_size_in: Number(ps.input.value) || 0, clear_space_in: Number(cs.input.value) || 0, crawl_height_in: Number(ch.input.value) || 0 });
    if (r.error) { oT.textContent = r.error; oS.textContent = "-"; oC.textContent = "-"; oB.textContent = "-"; oA.textContent = "-"; oNote.textContent = "-"; return; }
    oT.textContent = r.total_cleanouts + "";
    oS.textContent = r.spacing_cleanouts + " intermediate along the run";
    oC.textContent = r.change_cleanouts + (r.cap_governs ? " - the 40 ft grouping cap of " + r.change_cap + " governs, not the entered count" : " (the 40 ft cap for this run is " + r.change_cap + ")");
    oB.textContent = r.stack_cleanouts + "";
    oA.textContent = (r.clear_ok === null ? "over 6 in - its own clearance rule applies" : r.clear_ok ? "18 in clear space OK" : "clear space SHORT of 18 in") + (r.in_crawl ? ", crawl pathway " + (r.crawl_ok ? "OK" : "under 24 in - not accessible") : "");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const x of [L, sp, dc, gp, st, ps, cs, ch]) x.input.addEventListener("input", update);
}
PLUMBINGCODE_RENDERERS["cleanout-layout"] = _v1140renderCleanoutLayout;

// --- spec-v1146: water service static pressure, PRV, and the closed system it creates ---
// A causal chain people walk into one step at a time. IPC 604.8 caps static water pressure
// at 80 psi and requires an approved pressure-reducing valve where the main exceeds it.
// Fitting that valve solves the pressure problem and creates a NEW one: 607.3 says a
// storage water heater supplied through a check valve, pressure-reducing valve, or backflow
// preventer needs a thermal expansion control device downstream of all of them, because the
// system is now CLOSED and heated water has nowhere to expand back to. The homeowner who
// fixes banging pipes with a PRV and then wonders why the T&P valve started weeping has
// completed the chain without being told it existed. This tile walks it in one place.
// dims: in { static_pressure_psi: M L^-1 T^-2, min_fixture_pressure_psi: M L^-1 T^-2, has_check_or_backflow: dimensionless, has_storage_water_heater: dimensionless, expansion_control_present: dimensionless, prv_setpoint_psi: M L^-1 T^-2 } out: { over_by_psi: M L^-1 T^-2, headroom_psi: M L^-1 T^-2 }
export function computeWaterServicePressureCheck({ static_pressure_psi = 0, min_fixture_pressure_psi = 20, has_check_or_backflow = "no", has_storage_water_heater = "yes", expansion_control_present = "no", prv_setpoint_psi = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const p = Number(static_pressure_psi) || 0;
  const minFix = Number(min_fixture_pressure_psi) || 0;
  const set = Number(prv_setpoint_psi) || 0;
  const otherClosure = has_check_or_backflow === "yes";
  const heater = has_storage_water_heater === "yes";
  const control = expansion_control_present === "yes";
  if (!(p > 0)) return { error: "Static water pressure must be positive (psi)." };
  if (minFix < 0) return { error: "Minimum fixture pressure cannot be negative (psi)." };
  if (set < 0) return { error: "PRV setpoint cannot be negative (psi)." };

  const MAX = 80;
  const prv_required = p > MAX;
  const over_by_psi = Math.max(0, p - MAX);
  const setpoint_entered = set > 0;
  const setpoint_ok = setpoint_entered ? set <= MAX : null;
  const delivered = setpoint_entered && prv_required ? set : p;
  const headroom_psi = delivered - minFix;
  const fixture_ok = headroom_psi >= 0;

  // The closed system: a PRV, a check valve, or a backflow preventer all close it.
  const closed_system = prv_required || otherClosure;
  const expansion_required = closed_system && heater;
  const expansion_ok = expansion_required ? control : null;
  const passes = (!prv_required || setpoint_ok !== false) && fixture_ok && (expansion_ok !== false);

  const note = "STATIC PRESSURE (604.8): the cap is " + MAX + " psi, and at " + p + " psi this service is "
    + (prv_required ? over_by_psi.toFixed(1) + " psi OVER, so an approved pressure-reducing valve conforming to ASSE 1003 or CSA B356 is required on the branch main or riser at the connection to the water service pipe. High static pressure is not a comfort complaint - it is what splits supply lines, wears out fill valves and cartridges, and makes a house sound like it is being hit with a hammer every time a valve closes. " : "within the cap, so no pressure-reducing valve is required on pressure grounds. ")
    + (setpoint_entered ? "The PRV setpoint entered is " + set + " psi, " + (setpoint_ok ? "which is at or under the cap. " : "which is ABOVE the 80 psi cap and defeats the purpose of fitting it. ") : "")
    + "AT THE FIXTURE: " + delivered.toFixed(1) + " psi delivered against a " + minFix + " psi minimum leaves " + headroom_psi.toFixed(1) + " psi of headroom" + (fixture_ok ? ". Remember this is STATIC pressure - friction loss, elevation, and the meter all come off it under flow, so headroom on paper is not headroom at the shower head. " : " - NEGATIVE, so the setpoint is too low for the fixtures before a drop of flow loss is counted. ")
    + "THE PART PEOPLE WALK INTO: " + (closed_system
      ? "this system is CLOSED" + (prv_required && otherClosure ? " by both the required PRV and a check valve or backflow preventer" : prv_required ? " by the pressure-reducing valve the pressure rule just required" : " by a check valve or backflow preventer") + ". "
        + (heater
          ? "With a storage water heater on it, 607.3 requires a thermal expansion control device on the cold water supply, downstream of ALL check valves, pressure-reducing valves, and backflow preventers - " + (control ? "present, OK. " : "MISSING. Heated water expands and in a closed system it has nowhere to go back to, so the pressure climbs until the T and P relief valve weeps. The classic sequence is someone fixing banging pipes with a PRV and then, weeks later, wondering why the water heater started dripping - they completed a chain nobody told them about. An expansion tank sized per the manufacturer, so the system pressure still stays under 604.8, is the fix; a relief valve is not a substitute for one. ")
          : "There is no storage water heater, so 607.3's expansion control requirement is not triggered - it is written around a storage heater being supplied through the closure. ")
      : "the system is OPEN - no PRV required and no check valve or backflow preventer entered - so expanding hot water can push back toward the main and 607.3 is not triggered. Adding any of those three devices later closes it and does trigger it, which is worth knowing BEFORE a backflow preventer goes in for irrigation. ")
    + (passes ? "The items entered PASS. " : "The items entered DO NOT pass. ")
    + "Not checked: the expansion tank SIZE or precharge, which follows the manufacturer's instructions and the water heater volume; the minimum flow pressure and flow rate each specific fixture needs; pipe sizing and the friction, elevation, and meter losses that separate static from flowing pressure; whether the service pressure varies through the day or season, which it usually does; PRV maintenance and the fact that they fail high; or the water heater's own T and P relief and discharge piping. A screen; the adopted code, the device listings, and the AHJ govern.";

  return { prv_required, over_by_psi, setpoint_entered, setpoint_ok, delivered_psi: delivered, headroom_psi, fixture_ok, closed_system, expansion_required, expansion_ok, passes, note };
}

export const waterServicePressureCheckExample = { inputs: { static_pressure_psi: 95, min_fixture_pressure_psi: 20, has_check_or_backflow: "no", has_storage_water_heater: "yes", expansion_control_present: "no", prv_setpoint_psi: 60 } };

function _v1146renderWaterServicePressureCheck(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IPC 604.8 - static water pressure not greater than 80 psi, with an approved pressure-reducing valve conforming to ASSE 1003 or CSA B356 installed on the domestic water branch main or riser at the connection to the water service pipe where the main pressure exceeds it. IPC 607.3 - where a storage water heater is supplied with cold water that passes through a check valve, pressure-reducing valve, or backflow preventer, a thermal expansion control device connected to the cold water supply downstream of all such devices, and expansion tanks sized per the manufacturer so that system pressure does not exceed what 604.8 requires. Not checked: expansion tank size or precharge, per-fixture flow pressure and flow rate, pipe sizing and the friction, elevation, and meter losses between static and flowing pressure, seasonal pressure variation, PRV maintenance and failure modes, or the water heater's T and P relief and discharge piping. A screen; the adopted code, the device listings, and the AHJ govern.";
  const sp = makeNumber("Static water pressure at the service (psi)", "wsp-sp", { step: "any", min: "0" });
  const ps = makeNumber("PRV setpoint if one is fitted (psi; 0 = none)", "wsp-ps", { step: "any", min: "0" });
  const mf = makeNumber("Minimum pressure the fixtures need (psi)", "wsp-mf", { step: "any", min: "0" });
  const cb = makeSelect("Check valve or backflow preventer on the service?", "wsp-cb", [{ value: "no", label: "No", selected: true }, { value: "yes", label: "Yes" }]);
  const wh = makeSelect("Storage water heater?", "wsp-wh", [{ value: "yes", label: "Yes", selected: true }, { value: "no", label: "No" }]);
  const ec = makeSelect("Thermal expansion control installed?", "wsp-ec", [{ value: "no", label: "No", selected: true }, { value: "yes", label: "Yes" }]);
  for (const x of [sp, ps, mf]) inputRegion.appendChild(x.wrap);
  inputRegion.appendChild(cb.wrap); inputRegion.appendChild(wh.wrap); inputRegion.appendChild(ec.wrap);
  attachExampleButton(inputRegion, () => { sp.input.value = "95"; ps.input.value = "60"; mf.input.value = "20"; cb.select.value = "no"; wh.select.value = "yes"; ec.select.value = "no"; update(); });
  const oV = makeOutputLine(outputRegion, "Verdict", "wsp-out-v");
  const oP = makeOutputLine(outputRegion, "Pressure (604.8)", "wsp-out-p");
  const oF = makeOutputLine(outputRegion, "Headroom at the fixtures", "wsp-out-f");
  const oE = makeOutputLine(outputRegion, "Closed system and expansion (607.3)", "wsp-out-e");
  const oNote = makeOutputLine(outputRegion, "Note", "wsp-out-note");
  const update = debounce(() => {
    const r = computeWaterServicePressureCheck({ static_pressure_psi: Number(sp.input.value) || 0, prv_setpoint_psi: Number(ps.input.value) || 0, min_fixture_pressure_psi: Number(mf.input.value) || 0, has_check_or_backflow: cb.select.value, has_storage_water_heater: wh.select.value, expansion_control_present: ec.select.value });
    if (r.error) { oV.textContent = r.error; oP.textContent = "-"; oF.textContent = "-"; oE.textContent = "-"; oNote.textContent = "-"; return; }
    oV.textContent = r.passes ? "PASSES the items entered" : "DOES NOT PASS";
    oP.textContent = r.prv_required ? "over 80 psi by " + fmt(r.over_by_psi, 1) + " - a PRV is required" + (r.setpoint_ok === false ? ", and the setpoint entered is itself over 80" : "") : "within the 80 psi cap";
    oF.textContent = fmt(r.delivered_psi, 1) + " psi delivered, " + fmt(r.headroom_psi, 1) + " psi of static headroom" + (r.fixture_ok ? "" : " - NEGATIVE");
    oE.textContent = !r.closed_system ? "open system - 607.3 not triggered" : !r.expansion_required ? "closed, but no storage water heater - 607.3 not triggered" : r.expansion_ok ? "closed with a storage heater - expansion control present, OK" : "closed with a storage heater - expansion control REQUIRED and missing";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const x of [sp, ps, mf]) x.input.addEventListener("input", update);
  for (const x of [cb, wh, ec]) x.select.addEventListener("change", update);
}
PLUMBINGCODE_RENDERERS["water-service-pressure-check"] = _v1146renderWaterServicePressureCheck;

// --- spec-v1160: accessible toilet compartments (2010 ADA Standards 213.3.1, 604.8) ---
// Where toilet compartments are provided at least one must be WHEELCHAIR accessible, and a
// second, AMBULATORY accessible compartment is required in addition where six or more
// compartments are provided OR where urinals and water closets together total six or more
// fixtures. That OR is the trap: a room with four stalls and three urinals is seven fixtures
// and owes an ambulatory compartment even though nobody counted six stalls.
// The wheelchair compartment is 60 in wide minimum and 56 in deep for a WALL HUNG water
// closet or 59 in for a FLOOR MOUNTED one - so swapping the fixture type breaks a 56 in stall
// without moving a partition.
// The ambulatory compartment's width is a WINDOW, 35 in minimum to 37 in maximum: a 40 in
// stall is too WIDE to qualify, because the point is grab bars on both sides within reach.
// dims: in { compartment_count: dimensionless, urinal_count: dimensionless, water_closet_count: dimensionless, wheelchair_width_in: L, wheelchair_depth_in: L, wc_mounting: dimensionless, ambulatory_provided: dimensionless, ambulatory_width_in: L, ambulatory_depth_in: L } out: { required_wheelchair_depth_in: L, wheelchair_depth_deficit_in: L, wheelchair_width_deficit_in: L, fixture_total: dimensionless }
export function computeAccessibleToiletCompartment({ compartment_count = 0, urinal_count = 0, water_closet_count = 0, wheelchair_width_in = 0, wheelchair_depth_in = 0, wc_mounting = "wall-hung", ambulatory_provided = "no", ambulatory_width_in = 0, ambulatory_depth_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const stalls = Number(compartment_count) || 0;
  const urinals = Number(urinal_count) || 0;
  const wcs = Number(water_closet_count) || 0;
  const wW = Number(wheelchair_width_in) || 0;
  const wD = Number(wheelchair_depth_in) || 0;
  const aW = Number(ambulatory_width_in) || 0;
  const aD = Number(ambulatory_depth_in) || 0;
  const floorMounted = wc_mounting === "floor-mounted";
  const ambProvided = ambulatory_provided === "yes";
  if (wc_mounting !== "wall-hung" && wc_mounting !== "floor-mounted") return { error: "Water closet mounting must be wall-hung or floor-mounted - the required compartment depth differs by 3 in between them." };
  if (!Number.isInteger(stalls) || stalls <= 0) return { error: "Toilet compartments provided must be a positive whole number." };
  if (!Number.isInteger(urinals) || urinals < 0) return { error: "Urinal count must be a whole number, zero or more." };
  if (!Number.isInteger(wcs) || wcs <= 0) return { error: "Water closet count must be a positive whole number." };
  if (!(wW > 0) || !(wD > 0)) return { error: "Wheelchair compartment width and depth must be positive (in)." };
  if (ambProvided && (!(aW > 0) || !(aD > 0))) return { error: "Ambulatory compartment width and depth must be positive (in) when one is provided." };

  const MIN_W = 60, DEPTH_WALL = 56, DEPTH_FLOOR = 59;
  const AMB_MIN_W = 35, AMB_MAX_W = 37, AMB_MIN_D = 60;
  const TRIGGER = 6;

  const required_wheelchair_depth_in = floorMounted ? DEPTH_FLOOR : DEPTH_WALL;
  const wheelchair_width_ok = wW >= MIN_W;
  const wheelchair_depth_ok = wD >= required_wheelchair_depth_in;
  const wheelchair_width_deficit_in = Math.max(0, MIN_W - wW);
  const wheelchair_depth_deficit_in = Math.max(0, required_wheelchair_depth_in - wD);
  const wheelchair_ok = wheelchair_width_ok && wheelchair_depth_ok;
  // The same stall as the other mounting, for the swap nobody prices.
  const other_mounting_depth_in = floorMounted ? DEPTH_WALL : DEPTH_FLOOR;
  const survives_mounting_swap = wD >= other_mounting_depth_in;

  const fixture_total = urinals + wcs;
  const by_compartments = stalls >= TRIGGER;
  const by_fixtures = fixture_total >= TRIGGER;
  const ambulatory_required = by_compartments || by_fixtures;
  const fixtures_alone_trigger = by_fixtures && !by_compartments;

  const ambulatory_width_ok = ambProvided ? (aW >= AMB_MIN_W && aW <= AMB_MAX_W) : null;
  const ambulatory_too_wide = ambProvided ? aW > AMB_MAX_W : null;
  const ambulatory_depth_ok = ambProvided ? aD >= AMB_MIN_D : null;
  const ambulatory_ok = ambProvided ? (ambulatory_width_ok && ambulatory_depth_ok) : null;
  const ambulatory_missing = ambulatory_required && !ambProvided;

  const passes = wheelchair_ok && !ambulatory_missing && (ambulatory_required ? ambulatory_ok === true : true);

  const note = "TWO COMPARTMENTS CAN BE OWED, and the second is triggered by an OR that people read as an AND. 213.3.1 requires one WHEELCHAIR accessible compartment wherever toilet compartments are provided, and one AMBULATORY accessible compartment IN ADDITION where six or more compartments are provided OR where urinals and water closets together total six or more fixtures. "
    + "This room has " + stalls + " compartment" + (stalls === 1 ? "" : "s") + " and " + fixture_total + " fixtures (" + wcs + " water closet" + (wcs === 1 ? "" : "s") + " + " + urinals + " urinal" + (urinals === 1 ? "" : "s") + "): an ambulatory compartment is " + (ambulatory_required ? "REQUIRED" : "not required") + ". "
    + (fixtures_alone_trigger ? "NOTE WHICH LIMB FIRED: only " + stalls + " compartments, which is under six, but the FIXTURE count is " + fixture_total + " - the urinals carry it over. This is the case that gets missed, because the stalls get counted and the urinals do not. " : "")
    + "WHEELCHAIR COMPARTMENT (604.8.1.1): 60 in wide minimum, and " + required_wheelchair_depth_in + " in deep minimum for a " + (floorMounted ? "FLOOR MOUNTED" : "WALL HUNG") + " water closet. Provided " + wW + " x " + wD + " in: "
    + (wheelchair_ok ? "OK. " : (wheelchair_width_ok ? "" : "WIDTH short by " + wheelchair_width_deficit_in.toFixed(1) + " in. ") + (wheelchair_depth_ok ? "" : "DEPTH short by " + wheelchair_depth_deficit_in.toFixed(1) + " in. "))
    + "THE DEPTH FOLLOWS THE FIXTURE: 56 in for wall hung, 59 in for floor mounted. " + (survives_mounting_swap ? "This stall would still comply if the mounting changed. " : "Changing to a " + (floorMounted ? "wall hung" : "floor mounted") + " water closet " + (floorMounted ? "would relax the depth to 56 in" : "would demand 59 in and this stall has " + wD + " in") + " - a fixture substitution that moves no partition can pass or fail the compartment. ")
    + (ambulatory_required
      ? (ambProvided
        ? "AMBULATORY COMPARTMENT (604.8.2.1): 60 in deep minimum, and a width WINDOW of 35 in minimum to 37 in maximum. Provided " + aW + " x " + aD + " in: " + (ambulatory_ok ? "OK. " : (ambulatory_width_ok ? "" : (ambulatory_too_wide ? "TOO WIDE at " + aW + " in - and too wide is a real failure, not a bonus, because the compartment exists to put grab bars on BOTH side walls within reach of someone who walks but needs support. A generous stall defeats it. " : "TOO NARROW at " + aW + " in. ")) + (ambulatory_depth_ok ? "" : "DEPTH short by " + (AMB_MIN_D - aD).toFixed(1) + " in. "))
        : "AMBULATORY COMPARTMENT: REQUIRED and none provided. It is IN ADDITION to the wheelchair compartment, not an alternative to it - a room with one large accessible stall and five ordinary ones does not comply. ")
      : "No ambulatory compartment is required at this count. ")
    + (passes ? "The items entered PASS. " : "The items entered DO NOT pass. ")
    + "Not checked: door swing and the requirement that a compartment door not swing into the minimum required area, door opening width and location; toe clearance under the front and side partitions and the exception at greater depths; grab bar length, height, and position; water closet centerline location; the clear floor space and turning space in the room itself; lavatory, dispenser, and mirror requirements; the accessible route to the room; children's-use dimensions, which differ; and the higher or additional requirements in ANSI A117.1, the adopted building code, and state and local accessibility law. A compartment sizing screen, not a restroom design; the 2010 ADA Standards and the authority having jurisdiction govern.";

  return { required_wheelchair_depth_in, wheelchair_width_ok, wheelchair_depth_ok, wheelchair_width_deficit_in, wheelchair_depth_deficit_in, wheelchair_ok, other_mounting_depth_in, survives_mounting_swap, fixture_total, by_compartments, by_fixtures, fixtures_alone_trigger, ambulatory_required, ambulatory_provided: ambProvided, ambulatory_width_ok, ambulatory_too_wide, ambulatory_depth_ok, ambulatory_ok, ambulatory_missing, passes, note };
}

export const accessibleToiletCompartmentExample = { inputs: { compartment_count: 4, urinal_count: 3, water_closet_count: 4, wheelchair_width_in: 60, wheelchair_depth_in: 56, wc_mounting: "floor-mounted", ambulatory_provided: "no", ambulatory_width_in: 0, ambulatory_depth_in: 0 } };

function _v1160renderAccessibleToiletCompartment(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: 2010 ADA Standards for Accessible Design, 213.3.1 and 604.8. Section 213.3.1: where toilet compartments are provided, at least one shall comply with 604.8.1, and in addition at least one shall comply with 604.8.2 where six or more toilet compartments are provided or where the combination of urinals and water closets totals six or more fixtures. Section 604.8.1.1: wheelchair accessible compartments shall be 60 in wide minimum measured perpendicular to the side wall, and 56 in deep minimum for wall hung water closets and 59 in deep minimum for floor mounted water closets measured perpendicular to the rear wall. Section 604.8.2.1: ambulatory accessible compartments shall have a depth of 60 in minimum and a width of 35 in minimum and 37 in maximum. A US federal standard in the public domain. Not checked: door swing and the requirement that the door not swing into the minimum required area, toe clearance under the partitions and its exception at greater depths, grab bars, water closet centerline, clear floor and turning space in the room, lavatories and dispensers, the accessible route, children's-use dimensions, or the additional requirements of ANSI A117.1 and state and local accessibility law. A compartment sizing screen, not a restroom design; the 2010 ADA Standards and the AHJ govern.";
  const nStall = makeNumber("Toilet compartments in the room", "atc-n", { step: "1", min: "1" });
  const nWc = makeNumber("Water closets in the room", "atc-wc", { step: "1", min: "1" });
  const nUr = makeNumber("Urinals in the room", "atc-ur", { step: "1", min: "0" });
  const mount = makeSelect("Water closet mounting", "atc-mount", [{ value: "wall-hung", label: "Wall hung (56 in deep min)" }, { value: "floor-mounted", label: "Floor mounted (59 in deep min)" }]);
  mount.select.value = "floor-mounted";
  const wW = makeNumber("Wheelchair compartment width (in)", "atc-ww", { step: "any", min: "0" });
  const wD = makeNumber("Wheelchair compartment depth (in)", "atc-wd", { step: "any", min: "0" });
  const ambP = makeSelect("Ambulatory compartment provided?", "atc-ap", [{ value: "no", label: "No" }, { value: "yes", label: "Yes" }]);
  const aW = makeNumber("Ambulatory compartment width (in)", "atc-aw", { step: "any", min: "0" });
  const aD = makeNumber("Ambulatory compartment depth (in)", "atc-ad", { step: "any", min: "0" });
  for (const x of [nStall, nWc, nUr, mount, wW, wD, ambP, aW, aD]) inputRegion.appendChild(x.wrap);
  attachExampleButton(inputRegion, () => { nStall.input.value = "4"; nWc.input.value = "4"; nUr.input.value = "3"; mount.select.value = "floor-mounted"; wW.input.value = "60"; wD.input.value = "56"; ambP.select.value = "no"; aW.input.value = "0"; aD.input.value = "0"; update(); });
  const oV = makeOutputLine(outputRegion, "Verdict", "atc-out-v");
  const oT = makeOutputLine(outputRegion, "What is required", "atc-out-t");
  const oW = makeOutputLine(outputRegion, "Wheelchair compartment", "atc-out-w");
  const oA = makeOutputLine(outputRegion, "Ambulatory compartment", "atc-out-a");
  const oS = makeOutputLine(outputRegion, "If the water closet mounting changed", "atc-out-s");
  const oNote = makeOutputLine(outputRegion, "Note", "atc-out-note");
  const update = debounce(() => {
    const r = computeAccessibleToiletCompartment({ compartment_count: Number(nStall.input.value) || 0, water_closet_count: Number(nWc.input.value) || 0, urinal_count: Number(nUr.input.value) || 0, wc_mounting: mount.select.value, wheelchair_width_in: Number(wW.input.value) || 0, wheelchair_depth_in: Number(wD.input.value) || 0, ambulatory_provided: ambP.select.value, ambulatory_width_in: Number(aW.input.value) || 0, ambulatory_depth_in: Number(aD.input.value) || 0 });
    if (r.error) { oV.textContent = r.error; oT.textContent = "-"; oW.textContent = "-"; oA.textContent = "-"; oS.textContent = "-"; oNote.textContent = "-"; return; }
    oV.textContent = r.passes ? "PASSES the items entered" : "DOES NOT PASS";
    oT.textContent = "1 wheelchair compartment" + (r.ambulatory_required ? " + 1 ambulatory (triggered by " + (r.fixtures_alone_trigger ? r.fixture_total + " fixtures, not by the compartment count" : r.by_compartments && r.by_fixtures ? "both the compartment and fixture counts" : "the compartment count") + ")" : "; no ambulatory required at this count");
    oW.textContent = "needs 60 x " + r.required_wheelchair_depth_in + " in: " + (r.wheelchair_ok ? "OK" : [r.wheelchair_width_ok ? null : "width short " + fmt(r.wheelchair_width_deficit_in, 1) + " in", r.wheelchair_depth_ok ? null : "depth short " + fmt(r.wheelchair_depth_deficit_in, 1) + " in"].filter(Boolean).join(", "));
    oA.textContent = !r.ambulatory_required ? "not required" : r.ambulatory_missing ? "REQUIRED and not provided" : r.ambulatory_ok ? "OK (35-37 in wide, 60 in deep min)" : [r.ambulatory_width_ok ? null : (r.ambulatory_too_wide ? "too WIDE for the 35-37 in window" : "too narrow"), r.ambulatory_depth_ok ? null : "depth under 60 in"].filter(Boolean).join(", ");
    oS.textContent = r.survives_mounting_swap ? "still complies at " + r.other_mounting_depth_in + " in" : "would need " + r.other_mounting_depth_in + " in deep and has " + fmt(Number(wD.input.value) || 0, 1) + " in";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const x of [nStall, nWc, nUr, wW, wD, aW, aD]) x.input.addEventListener("input", update);
  for (const x of [mount, ambP]) x.select.addEventListener("change", update);
}
PLUMBINGCODE_RENDERERS["accessible-toilet-compartment"] = _v1160renderAccessibleToiletCompartment;
