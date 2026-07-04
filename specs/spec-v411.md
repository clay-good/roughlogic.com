# roughlogic.com Specification v411 -- Composite Shear Stud Strength and Count (AISC 360-22 I8) (calc-steel.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-03). First tile of a steel composite-beam trio (v411 shear stud strength -> v412 composite
> flexure -> v413 beam camber). `steel-beam-flexure` gives a bare-steel beam's capacity; a composite floor beam is far
> stronger because shear studs make the slab work with it -- and the number of studs comes from the single-stud strength this
> tile computes.**
> In-scope catalog expansion under the spec-v106 trades-only charter. In a composite beam the horizontal shear between the
> steel and the concrete slab is carried by welded headed studs. AISC 360-22 §I8.2a gives one stud's strength as
> `Qn = 0.5 * Asc * sqrt(f'c * Ec)`, capped at `Rg * Rp * Asc * Fu`; the total horizontal shear for full composite action is
> `V' = min(As * Fy, 0.85 * f'c * Ac)`, and the stud count on each side of the maximum-moment point is `V' / Qn`. Nothing in
> the catalog does composite action. This adds the stud tile to the existing **`calc-steel.js`** module (Group E); no new
> group, trade, or dependency. Inherits spec.md through spec-v410.md.
>
> **The gap, and the evidence for it.** A `3/4 in` headed stud (`Asc = 0.442 in^2`) in `4000 psi` normalweight concrete
> (`Ec = 3,644,000 psi`, from `concrete-elastic-modulus`) has `Qn = 0.5 * 0.442 * sqrt(4000 * 3644000) = 26.7 kip`, but the
> `Rg*Rp*Asc*Fu = 1.0 * 0.75 * 0.442 * 65 = 21.6 kip` cap governs, so `Qn = 21.6 kip`. If full composite action needs
> `V' = 400 kip` of horizontal shear, that is `400 / 21.6 = 19` studs each side of midspan (`38` total). No tile does this;
> a designer had bare-steel flexure but no way to size the studs that make a beam composite.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The stud cross-sectional area
`Asc` is an area (in^2); `f'c`, `Ec`, and `Fu` are pressures (psi/ksi); `Rg` and `Rp` are dimensionless; the horizontal
shear `V'` is a force (kip); the stud strength is a force (kip) and the count is dimensionless. The v18/v21 contract: any
non-finite input, or a non-positive area or strength, returns `{ error }`; the tile applies the `Rg*Rp*Asc*Fu` cap to the
computed `Qn`, reports which limit governs, and rounds the stud count up to a whole number. Citation discipline (v19/v22):
`GOVERNANCE.general` over the AISC composite stud strength by name; `editionNote` names **AISC 360-22 §I8.2a,
`Qn = 0.5 * Asc * sqrt(f'c * Ec)` capped at `Rg * Rp * Asc * Fu`, `Rg`/`Rp` the group and position factors (Table I8.1),
the horizontal shear `V' = min(As*Fy, 0.85*f'c*Ac)` for full composite action, and the stud count `V'/Qn` each side of the
maximum moment**, and states that **this returns the single-stud strength and the full-composite stud count, that `Ec` comes
from `concrete-elastic-modulus`, and that it is a design aid, not a substitute for the engineer of record**.

## 2. The tile

### 2.1 `shear-stud-strength` -- Composite Shear Stud Strength and Count (AISC 360-22)

```
inputs:
  asc_in2    in^2   stud cross-sectional area
  fc_psi     psi    slab concrete strength f'c
  ec_psi     psi    concrete modulus (from concrete-elastic-modulus)
  fu_ksi     ksi    stud tensile strength (Fu, typ 65)
  rg         -      group factor (Table I8.1)
  rp         -      position factor (Table I8.1)
  vprime_kip kip    total horizontal shear for full composite (optional)

qn_calc = 0.5 * asc_in2 * sqrt(fc_psi * ec_psi)          (converted to kip)
qn_cap  = rg * rp * asc_in2 * fu_ksi
qn      = min(qn_calc, qn_cap)
studs_each_side = ceil(vprime_kip / qn)
```

**Pinned worked example (3/4 in stud, f'c 4000, Ec 3.644e6, Fu 65, Rg 1.0, Rp 0.75).**
`Qn_calc = 0.5*0.442*sqrt(4000*3644000) = 26.7 kip`; `Qn_cap = 1.0*0.75*0.442*65 = 21.6 kip` governs, so `Qn = 21.6 kip`.
For `V' = 400 kip`, `studs = ceil(400/21.6) = 19` each side. **Cross-check (weak-position stud).** At `Rp = 0.6` the cap
drops to `17.2 kip` and the count rises to `24` each side -- deck orientation and stud position matter. A non-positive input
takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["welding", "construction"]`, beside `steel-beam-flexure`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, AISC 360-22 §I8.2a, `editionNote` naming the `Qn` relation,
the cap, the `Rg`/`Rp` factors, and the `V'/Qn` count); `test/fixtures/worked-examples.json` (the strong-position example +
the weak-position cross-check); `test/fixtures/compute-map.js` (`shear-stud-strength` -> `computeShearStudStrength` in
`../../calc-steel.js`); `scripts/related-tiles.mjs` (-> `composite-beam-flexure` / `steel-beam-flexure` /
`concrete-elastic-modulus` / `fillet-weld-strength`); `data/search/aliases.json` ("shear stud strength", "composite stud",
"Qn stud", "shear connector", "stud count composite", "aisc i8", "headed stud strength", "composite beam studs", "nelson
stud"); the id appended to the existing steel renderers block in `app.js`; the `// dims:` annotation (Asc area, strengths
pressure, factors dimensionless, shear force, count dimensionless); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the governing-limit switch, the count rounding, and the non-positive /
non-finite error seams. No new module; re-pin `calc-steel.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent
from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the governing-limit assertion, the error paths); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the Qn / count output wraps on a phone);
render-no-nan + a11y sweep, output read to the value (3/4 in stud, f'c 4000 -> 21.6 kip, 19 studs each side).

## 5. Roadmap position

Opens the steel composite-beam trio: this stud strength sets the shear connection for `composite-beam-flexure` (v412), and
`steel-camber` (v413) handles the dead-load deflection those long composite spans need cambered out. A partial-composite-
action mode (fewer studs, reduced `Mn`) is the deliberate next follow-on.
