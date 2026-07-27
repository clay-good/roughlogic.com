# roughlogic.com Specification v1035 -- Snow Guard / Retention Row Layout (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1034.md.
>
> **The gap, and the evidence for it.** Zero hits for `snow.?guard`, `snow retention`, or `snow bar` in
> tools-data.js, any calc module, or aliases.json. The catalog has seven snow-LOAD tiles including
> `sliding-snow-load`, but that one catches snow on a lower roof -- the opposite design decision from
> keeping it on the upper roof. Discovery batch 5: CLEAR.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: non-positive
snow load / pitch / lengths / capacity, a safety factor below 1.0, or a non-integer row count return
`{ error }`. Citation discipline: manufacturer snow-retention design method, named as such. **No holding
capacity is shipped** -- it is a manufacturer test value and an input. Renderer: `_simpleRenderer`.

## 2. The tile

### 2.1 `snow-guard-layout` -- Snow Guard / Retention Row Layout

```
inputs:  roof_snow_psf (design sloped-roof value), pitch_rise_per_12, rafter_length_ft (SLOPE length),
         eave_length_ft, guard_capacity_lb (manufacturer TESTED), safety_factor (2), rows (1)
compute: theta       = atan(rise/12)
         vector_psf  = snow_psf x sin(theta)            only this component tries to slide
         force_plf   = vector_psf x rafter_length       per ft of eave
         per_row     = force_plf / rows
         required    = per_row x safety_factor
         guards/ft   = required / capacity;  spacing = 12 / guards_per_ft
         guards_per_row = ceil(eave_length x guards_per_ft);  total = per_row x rows
outputs: slope_deg, vector_psf, force_plf, per_row_plf, required_plf, guards_per_ft, spacing_in,
         guards_per_row, guards_total, note
```

**Verification.** The method is the one manufacturers publish: "roof snow (psf) x sine of the roof angle =
vector force (psf)," then multiplied by the rafter length and the tributary width. Web-verified across
independent snow-retention references 2026-07-27.

**A conservatism stated rather than hidden.** The manufacturer method multiplies by the RAFTER (slope)
length, while ASCE roof snow loads are defined on the horizontal projection. Using the slope length
therefore over-counts by 1/cos(theta) -- about 5% at 4:12, 12% at 8:12. The tile follows the manufacturer
method (so its numbers match a manufacturer's own worksheet) and says in both the note and the citation
which length it uses and that the choice runs conservative, so a user reconciling against a code-based
calculation knows why the numbers differ.

**Worked example (pinned).** 40 psf, 4:12, 30-ft rafter, 40-ft eave, 500-lb tested clamps, SF 2.0, one row:
theta 18.43 deg, vector 12.65 psf, 379.5 lb per ft of eave, 1.518 guards/ft = 7.91 in on center, 61 guards.

## 3. Scope limits and the safety framing

The holding capacity must be the manufacturer's tested value for the exact panel profile, seam, and
attachment -- a clamp on a standing seam and a screw into a through-fastened panel are different numbers,
and the panel or its fastening often fails before the guard does. The note says so. Rows are assumed to
share the load, which holds when they are spaced for comparable tributaries; concentrating rows near the
eave is common practice and changes the distribution. Above roughly 12:12 the standard method needs the
manufacturer's steep-slope guidance. **Retention keeps snow ON the roof, so the structure must be able to
carry it -- shedding was the previous load path**, which is the consequence a layout calculation alone hides.
The manufacturer's tested data and the engineer of record govern.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, backlinked from `sliding-snow-load`. Fuzzer pins the worked
example, the exact sin(theta) vector identity at several pitches (including the 45-degree case where
sin = cos), exact inverse scaling in capacity and exact linearity in safety factor, the rows division,
spacing x guards-per-ft = 12 exactly, and error seams. Cap ledger: calc-construction.js 172000 -> 182000
(was at 97.4%).
