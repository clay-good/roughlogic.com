# roughlogic.com Specification v258 -- Reinforced Concrete Beam Shear Capacity and Stirrup Spacing (ACI 318-19 §22.5) (calc-concrete.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02). Batch spec-v257..v259 (the ACI 318-19 reinforced-concrete member trio). This spec adds
> the shear check -- the second of the two limit states that size an RC beam, and the one whose failure is brittle.**
> In-scope catalog expansion under the spec-v106 trades-only charter: with `rc-beam-flexure` (v257) the catalog checks the
> moment on a rectangular section but not the shear, and shear failure in concrete is sudden and without warning, so it is
> the check a contractor and inspector care about most at the stirrups. Adds one tile to the **`calc-concrete.js`** Group E
> cluster opened by v257; no new group, trade, or dependency. Inherits spec.md through spec-v257.md.
>
> **The gap, and the evidence for it.** After the moment, the beam must carry the shear, and ACI 318-19 §22.5 splits the
> nominal shear strength into a concrete part and a stirrup part: `Vn = Vc + Vs`. For a member without axial load the
> concrete contribution is `Vc = 2 x lambda x sqrt(f'c) x bw x d` (§22.5.5.1, the traditional simplified form, psi units),
> the vertical-stirrup contribution is `Vs = Av x fyt x d / s` (§22.5.10.5.3), and the design strength is `phi x Vn` with
> `phi = 0.75` for shear (§21.2.1). When the factored shear `Vu` exceeds `phi x Vc`, stirrups must make up the difference,
> and the required spacing follows by inverting the `Vs` term. A 12-by-21.5 in beam on 4,000 psi concrete carries about
> 24.5 kip of design concrete shear alone; a 40 kip demand then needs #3 stirrups at roughly 10 in on center. The catalog
> checks the moment on this section but not the shear that governs the stirrup layout the ironworker actually ties.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The concrete strength `f'c`
and stirrup yield `fyt` are stresses (psi); the web width `bw` and effective depth `d` are lengths (in); the stirrup area
`Av` is an area (in^2); the concrete, stirrup, and nominal shears and the demand `Vu` are forces (reported in kip after
the lb-to-kip divide); the required spacing `s` is a length (in). The v18/v21 contract: any non-finite input, or a
concrete strength, yield, web width, effective depth, or stirrup area at or below zero, returns `{ error }`. Citation
discipline (v19/v22): `GOVERNANCE.general` over the shear relation by name; `editionNote` names **ACI 318-19 §22.5.5.1
(`Vc = 2 x lambda x sqrt(f'c) x bw x d`, the simplified concrete shear for a non-prestressed member without axial load,
psi), §22.5.10.5.3 (`Vs = Av x fyt x d / s` for vertical stirrups), §21.2.1 (`phi = 0.75` for shear), and §9.7.6.2.2 (the
`d/2` maximum stirrup spacing, halved to `d/4` when `Vs > 4 x sqrt(f'c) x bw x d`)**, gives `fyt` a default of **60,000 psi
(Grade 60)** and `lambda` a default of **1.0 (normalweight concrete; 0.75 lightweight, §19.2.4)**, and states that **this
uses the simplified `Vc` (not the detailed §22.5.5.1 expression with the reinforcement-ratio and size-effect terms), covers
vertical stirrups on a member without significant axial load, and does not check the §22.5.1.2 upper limit
`Vs <= 8 x sqrt(f'c) x bw x d` on the section size, the §9.6.3 minimum shear reinforcement, or deep-beam action; and this
is a design aid, not a substitute for a licensed engineer's design** -- the engineer of record's stamped design governs.

## 2. The tile

### 2.1 `rc-beam-shear` -- Reinforced Concrete Beam Shear Capacity and Stirrup Spacing

```
inputs:
  fc        psi     specified concrete compressive strength (default 4000)
  fyt       psi     stirrup yield strength (default 60000, Grade 60)
  bw        in      web (beam) width
  d         in      effective depth
  av_in2    in^2    total stirrup area crossing the crack (two legs of one stirrup)
  vu        kip     factored (required) shear at the section (optional, default 0 = capacity only)
  lambda    -       lightweight factor (default 1.0 normalweight)

vc_kip     = 2 * lambda * sqrt(fc) * bw * d / 1000       ; concrete shear, kip
phi_vc     = 0.75 * vc_kip                                ; design concrete shear, kip
vs_req_kip = vu > 0 ? max(0, vu / 0.75 - vc_kip) : 0      ; stirrup shear demand, kip
s_req_in   = vs_req_kip > 0 ? av_in2 * fyt * d / (vs_req_kip * 1000) : -   ; required spacing, in
s_max_in   = d / 2                                        ; code max spacing (d/4 if Vs high)
stirrups   = vu > phi_vc                                  ; are stirrups required by strength?
```

**Pinned worked example (a 12x21.5 beam, #3 stirrups).** `f'c = 4,000 psi`, `bw = 12 in`, `d = 21.5 in`, `lambda = 1.0`:
`Vc = 2 x 1.0 x sqrt(4,000) x 12 x 21.5 / 1,000 = 2 x 63.25 x 258 / 1,000 = 32.6 kip`; `phi Vc = 0.75 x 32.6 = ` **24.5 kip**
design concrete shear. A factored demand `Vu = 40 kip` exceeds `phi Vc`, so stirrups are required: `Vs,req = 40/0.75 - 32.6
= 53.3 - 32.6 = 20.7 kip`; with #3 two-leg stirrups (`Av = 0.22 in^2`, `fyt = 60,000`), `s = 0.22 x 60,000 x 21.5 / (20,700)
= 283,800 / 20,700 = 13.7 in`, but the `d/2 = ` **10.75 in** maximum governs, so the layout is #3 at 10 in on center.
**Cross-check (a demand the concrete alone carries).** Same section, `Vu = 20 kip < phi Vc = 24.5 kip`: `stirrups = false`
by strength, `Vs,req = 0`; only the §9.6.3 minimum reinforcement and `d/2` spacing rule apply, showing that below
`phi Vc` the concrete carries the shear and the stirrups become a detailing minimum rather than a strength requirement.

## 3. Wiring

A `tools-data.js` row (group `E`, trade `["construction","carpentry"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, the shear relation, `editionNote` naming ACI 318-19 §22.5.5.1 / §22.5.10.5.3 / §21.2.1 /
§9.7.6.2.2 with the simplified-`Vc`, vertical-stirrups, upper-limit-not-checked, and design-aid caveats);
`test/fixtures/worked-examples.json` (the 40 kip stirrups-required example + the 20 kip concrete-carries cross-check);
`test/fixtures/compute-map.js` (`rc-beam-shear` -> `computeRcBeamShear` in `../../calc-concrete.js`);
`scripts/related-tiles.mjs` (-> `rc-beam-flexure` / `rc-development-length` / `steel-beam-shear`); `data/search/aliases.json`
("concrete beam shear", "stirrup spacing", "ACI 318 shear", "Vc Vs", "phi Vc", "2 root fc bw d", "shear reinforcement
spacing", "does the concrete beam shear"); the id appended to the concrete renderers declare in `app.js`; the `// dims:`
annotation (`fc`/`fyt` pressure, `bw`/`d`/`s` length, `av_in2` length^2, shears force, `lambda` dimensionless); regenerated
v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples and error seams (non-finite, `fc <= 0`,
`fyt <= 0`, `bw <= 0`, `d <= 0`, `av_in2 <= 0`) plus the `Vu <= phi Vc` no-stirrups-by-strength boundary. Re-pin the
`calc-concrete.js` size in the `check:module-sizes` allowlist (dated comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the five non-positive error paths and the no-stirrups boundary); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the Vc / phi-Vc / Vs /
spacing stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (12x21.5 at f'c 4000 -> 24.5 kip
phi Vc, #3 at 10 in for a 40 kip demand).

## 5. Roadmap position

The middle of the ACI 318-19 reinforced-concrete member batch (v257..v259). The shear check pairs with the moment check
`rc-beam-flexure` (v257) to size the beam and with the development check `rc-development-length` (v259) to detail its bars.
The detailed §22.5.5.1 `Vc` (with the `rho_w` reinforcement-ratio and `1/(1 + d/(10 sqrt(...)))` size-effect terms new to
318-19), the §9.6.3 minimum-shear-reinforcement trigger, and a one-way slab / footing shear form are the deliberate next
follow-ons once the base member checks land.
