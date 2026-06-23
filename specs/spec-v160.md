# roughlogic.com Specification v160 -- Pipe Pressure Rating and Required Wall Thickness (ASME B31.1) (calc-pipefit.js, Group B, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v157..v163 (plumbing/pipefitting -- steamfitting, pressure
> piping, and pipe support).** In-scope catalog expansion under the spec-v106 trades-only charter: the
> pressure-piping core for industrial pipefitting. Adds one tile to **`calc-pipefit.js`** (Group B); no
> new module, group, or dependency. Inherits spec.md through spec-v159.md.
>
> **The gap, and the evidence for it.** The catalog tests a finished line (`hydrostatic-test` gives the
> field test pressure and hold), but nothing tells the fitter what pressure the pipe itself is rated to
> carry, or what wall thickness a service pressure demands. That is the first question on any process,
> steam, or compressed-fluid line: the internal-pressure relation (Barlow for the first cut, the ASME
> B31.1 pressure-design equation for the real one) ties OD, wall, the material's allowable stress, the
> weld-joint factor, and the temperature coefficient together. A fitter handed a schedule and a material
> needs the maximum allowable pressure; a fitter handed a design pressure needs the minimum wall. The
> catalog gives neither.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The outside
diameter, nominal wall, corrosion/threading allowance, and the resulting minimum wall are a length (`L`,
in); the allowable stress and the resulting allowable pressure are a pressure (`M L^-1 T^-2`, psi); the
weld-joint factor `E`, the temperature coefficient `y`, and the mill-tolerance fraction are
`dimensionless`. The v18/v21 contract: any non-finite input, a non-positive OD, allowable stress, or wall,
an `E` or mill-fraction outside (0,1], or a geometry where `D - 2y(t - A) <= 0` returns `{ error }`; the
divisions are by guarded-positive denominators. Citation discipline (v19/v22): `GOVERNANCE.general` over
the pressure-design relation by name; `editionNote` names **ASME B31.1 Power Piping** (and notes B31.3
Process Piping uses the same form with its own allowables) and states that **the allowable stress, the
joint factor, and the y-coefficient are read from the applicable code edition's tables for the specific
material and temperature, and the engineer of record and the AHJ govern** -- this is a design screen, not
a stamped calculation.

## 2. The tile

### 2.1 `pipe-pressure-rating` -- Allowable Pressure or Required Wall (ASME B31.1)

```
inputs:
  od_in          L                outside diameter, in
  wall_in        L                nominal wall thickness, in (for the allowable-pressure mode)
  allow_stress   M L^-1 T^-2      material allowable stress S at temperature, psi
  joint_factor   dimensionless    weld-joint efficiency E (seamless = 1.0)
  y_coeff        dimensionless    temperature coefficient y (ferritic <= 900F = 0.4)
  mill_tol_frac  dimensionless    mill under-tolerance fraction (default 0.125)
  allowance_in   L                corrosion + threading allowance A, in (default 0)
  mode = "allowable_pressure" | "required_wall"
  design_p       M L^-1 T^-2      design pressure, psi (for the required-wall mode)

t_avail = wall_in x (1 - mill_tol_frac)                              # available wall after mill tolerance
# allowable-pressure mode (B31.1, rearranged for P):
P_allow = (2 x allow_stress x joint_factor x (t_avail - allowance_in))
          / (od_in - 2 x y_coeff x (t_avail - allowance_in))
# required-wall mode (B31.1 pressure-design):
t_min   = (design_p x od_in) / (2 x (allow_stress x joint_factor + design_p x y_coeff)) + allowance_in
```

**Pinned worked example (allowable pressure).** 4 in Sch 40 A106-B (OD 4.5 in, nominal wall 0.237 in),
S = 17,100 psi, E = 1.0, y = 0.4, 12.5 percent mill tolerance, no allowance: `t_avail = 0.237 x 0.875 =
0.2074 in`; `P_allow = (2 x 17100 x 1 x 0.2074) / (4.5 - 2 x 0.4 x 0.2074) = 7093 / 4.334 = ` **1,637
psi** maximum allowable. (Matches the published MAWP band for 4 in Sch 40 A106-B at moderate temperature.)
**Cross-check (required wall the other direction).** Same pipe and material at a 300 psi design pressure:
`t_min = (300 x 4.5) / (2 x (17100 x 1 + 300 x 0.4)) + 0 = 1350 / 34440 = 0.0392 in` -- far below the
0.207 in available, so Sch 40 is ample with large margin. The two modes are inverses of the same
relation.

## 3. Wiring

A `tools-data.js` row (group `B`, trade `["pipefitting"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the B31.1 pressure-design relation, `editionNote` naming ASME
B31.1 / B31.3 and the tables-and-EOR-govern caveat); `test/fixtures/worked-examples.json` (both-mode
example + cross-check); `test/fixtures/compute-map.js` (`pipe-pressure-rating` ->
`computePipePressureRating` in `../../calc-pipefit.js`); `scripts/related-tiles.mjs` (->
`hydrostatic-test` / `pipe-velocity` / `flange-bolt-torque`); `data/search/aliases.json` ("pipe pressure
rating", "wall thickness", "barlow", "MAWP", "B31.1", "allowable pressure", "schedule pressure"); the id
appended to the existing pipefit renderers declare in `app.js`; the `// dims:` annotation; regenerated
v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both modes, the cross-check, and error
seams (non-finite, OD/S/wall <= 0, E or mill fraction outside (0,1], degenerate
`D - 2y(t - A) <= 0`). Raise the `calc-pipefit.js` size cap by ~20 percent if needed (dated comment).
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**);
`npm test` (+2 fixtures, the new fuzzer block, both modes); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the inputs and the mode toggle
wrap on a phone); render-no-nan + a11y sweep, output read to the value (4 in Sch 40 A106-B -> ~1,637 psi
allowable).

## 5. Roadmap position

The pressure-piping anchor of the batch; pairs with the existing `hydrostatic-test` (the line is rated
here, tested there) and the steam cluster (a steam main has both a velocity size and a pressure rating).
Further pressure-piping growth (branch-reinforcement area-replacement, flange-rating class lookup) stays
evidence-driven.
