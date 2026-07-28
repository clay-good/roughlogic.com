# roughlogic.com Specification v1113 -- ASME UG-27 Shell Thickness (calc-pipefit.js, Group B, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-pipefit.js`** (Group B), no new module, group, or dependency. Inherits spec.md through
> spec-v1112.md.
>
> **The gap, and the evidence for it.** A self-declared gap: `hoop-stress-mawp` returns
> `{p_max_psi, p_max_long_psi, Dt, thin_wall_ok}` from the bare `P = 2tS/D` and its own note says a
> pressure-vessel code governs; the citation on that family says it "does not cover ... a code-required
> joint efficiency and corrosion allowance." Neither E nor CA appears anywhere in the hoop-stress family.
> Discovery batch 8, survivor 9.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: unknown
geometry, non-positive pressure / radius / stress, efficiency outside (0, 1], negative allowance, or a
pressure that drives the denominator non-positive return `{ error }`. Citation discipline: **no
allowable-stress table and no joint-efficiency table are reproduced** -- both are entered, with the common
E values named in the field label only. Renderer: hand-written non-exported (module convention).

## 2. The tile

### 2.1 `asme-shell-thickness` -- ASME UG-27 Shell Thickness (Joint Efficiency and Corrosion)

```
inputs:  design_pressure_psi, inside_radius_in (CORRODED condition), allowable_stress_psi
         (at DESIGN temperature), joint_efficiency (0.85), corrosion_allowance_in (0.0625),
         geometry (cylindrical | spherical)
compute: cylinder  t = P R / (S E - 0.6 P)
         sphere    t = P R / (2 S E - 0.2 P)
         t_total = t + CA
         MAWP inverse: cylinder S E t/(R + 0.6 t), sphere 2 S E t/(R + 0.2 t)
         validity: t <= R/2 always; cylinder additionally P <= 0.385 S E
outputs: t_required_in, t_with_allowance_in, mawp_psi, se, pressure_limit_psi, thickness_limit_in,
         over_pressure_limit, over_thickness_limit, outside_ug27, cylindrical, note
```

**Verification, and one equation deliberately left out.** The cylindrical form, the spherical form, and
both validity limits were each confirmed against **two independent published sources** before shipping.
The longitudinal-stress case on the circumferential joint (`t = PR/(2SE + 0.4P)`) could NOT be
double-confirmed -- one source returned the outside-radius variant instead -- so it is **not shipped**, and
both the note and the citation say so explicitly. That case rarely governs a cylinder anyway; the
circumferential-stress check is the one people actually run.

**What the tile is for.** Joint efficiency and corrosion allowance both belong in this calculation and both
move the answer a long way. Choosing not to radiograph takes E from 1.00 to 0.70 and costs about **30% more
wall** -- the fuzzer pins that ratio. And the allowance is added AFTER the strength calculation, on a radius
already taken in the corroded condition, which is the step most often skipped.

**Worked example (pinned).** 150 psig, 24-in inside radius, 17,500 psi allowable, E 0.85, CA 0.0625:
t = 0.24349 in, 0.30599 in with allowance, inside both limits. The MAWP inverse returns **exactly 150 psi**.
Cross-check: the same inputs on a sphere give 0.12113 in, half the wall -- the geometric reason spheres are
used for high pressure.

## 3. Scope limits

Nozzle reinforcement, heads, external pressure and buckling, and discontinuity stresses are all outside
this tile. The allowable stress must come from the code's table at the DESIGN temperature, not room
temperature. Beyond either validity limit the thin-shell equations do not apply and Appendix 1 thick-wall
rules govern -- the tile says which limit was crossed. ASME BPVC Section VIII and the vessel engineer
govern; this is a check, not a stamped design.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `pipe-pressure-rating` and the
hoop-stress family. Fuzzer pins both forms against their own algebra, the exact MAWP round trip for BOTH
geometries, the joint-efficiency ratio, that the allowance is purely additive, both validity limits firing,
radius linearity, and the non-positive-denominator error.

## 5. A candidate killed by the dupe check in the same session

Discovery batch 8 proposed an ACI 22.5.1.2 "Vs section-size cap" tile, citing `rc-beam-shear`'s note that it
"does not check the §22.5.1.2 upper limit." Reading the nearest sibling's actual output showed
`rc-min-shear-reinforcement` (spec-v1009) **already computes that cap** -- item (3) in its own note. The
`rc-beam-shear` note is simply stale. Recorded here because it is the third time this campaign that a
self-declared gap turned out to be closed by a later sibling: the phrase is a lead, never a verdict.
