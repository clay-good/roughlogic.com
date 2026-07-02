# roughlogic.com Specification v271 -- Reinforced CMU Wall Allowable Axial Compression (TMS 402 ASD, Slenderness-Reduced Pa) (calc-masonry.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-02, package 0.96.0; was PROPOSED 2026-07-02). Batch spec-v269..v271 (the TMS 402-16 reinforced-masonry member trio -- flexure /
> shear / axial for a reinforced CMU wall). This spec closes the trio with the third limit state: after the out-of-plane
> moment (v269) and the in-plane shear (v270), the gravity question -- how much vertical load the wall stands up under
> before it either crushes or buckles.)**
> In-scope catalog expansion under the spec-v106 trades-only charter: masonry is a first-class trade, and the catalog now
> resolves a reinforced CMU wall's out-of-plane moment (`cmu-wall-flexure`, v269) and in-plane shear (`cmu-shear-wall`,
> v270), but nothing tells the designer how much *axial* gravity load that wall carries or where slenderness starts eating
> the capacity. Adds one tile to the **`calc-masonry.js`** Group E cluster (opened by v269), completing the flexure /
> shear / axial triad; no new group, trade, or dependency. Inherits spec.md through spec-v270.md.
>
> **The gap, and the evidence for it.** A load-bearing masonry wall carries the floors and roof above it in axial
> compression, and its allowable axial load is limited two ways at once: material crushing (the masonry plus the vertical
> steel) and slenderness (a Euler-type reduction that grows with the height-to-radius-of-gyration ratio `h/r`). TMS 402
> allowable-stress design writes it as `Pa = (0.25 f'm An + 0.65 Ast Fs) x R`, where the slenderness factor is
> `R = 1 - (h/(140 r))^2` for `h/r <= 99` and `R = (70 r / h)^2` for `h/r > 99` -- the two branches meeting exactly at
> `h/r = 99`, so the curve is continuous. For a fully grouted 8 in wall (`f'm = 2,000 psi`) 12 ft tall with #5 vertical
> bars at 24 in, a one-foot strip carries about `38 kip` of allowable axial load; stretch the same wall to 24 ft and the
> slenderness branch flips and the allowable falls to about `14 kip` -- the number a designer needs before stacking the
> tributary floor load on the wall, and the reason a tall unbraced masonry wall needs either more thickness or an
> intermediate brace. `cmu-wall-flexure` handles the wall bending; this tile handles the load pushing straight down on it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The specified masonry
strength `f'm` and the allowable steel stress `Fs` are stresses (psi); the net cross-sectional area `An` and the total
vertical steel area `Ast` are areas (in^2); the effective (unsupported) height `h` and the radius of gyration `r` are
lengths (in); the slenderness ratio `h/r` and the reduction factor `R` are dimensionless; the allowable axial load `Pa`
is a force (reported kip, computed lb). The v18/v21 contract: any non-finite input, a masonry strength, net area, height,
or radius of gyration at or below zero, or a negative steel area, returns `{ error }`; the tile selects the `h/r <= 99`
branch or the `h/r > 99` branch and reports which governs. Citation discipline (v19/v22): `GOVERNANCE.general` over the
TMS 402 ASD allowable-axial method by name; `editionNote` names **the TMS 402-16 (ACI 530 / ASCE 5) allowable-stress
axial-compression provisions for reinforced masonry: `Pa = (0.25 f'm An + 0.65 Ast Fs) [1 - (h/(140 r))^2]` for the
slenderness ratio `h/r <= 99` and `Pa = (0.25 f'm An + 0.65 Ast Fs) (70 r / h)^2` for `h/r > 99`, with `Fs` the allowable
compressive stress in the reinforcement, as compiled in the Masonry Designers' Guide and CMHA TEK 14-07C**, defaults
`f'm` to **2,000 psi** and `Fs` to **32,000 psi (Grade 60)**, and states that **this returns the allowable service-level
concentric axial compression of a reinforced, fully grouted masonry wall or column by the allowable-stress method -- the
`0.65 Ast Fs` reinforcement term applies where the vertical bars are laterally tied per the code's column provisions (for
an untied wall the conservative practice is to drop that term and take only `0.25 f'm An R`); it is pure axial only and
does not include the moment interaction (combine it with the flexure of v269 through the unity check), the radius of
gyration `r` and effective height `h` come from the section and the wall's actual bracing, and this is a design aid, not a
substitute for the engineer of record's stamped design** -- the structural engineer of record's stamped design governs.

## 2. The tile

### 2.1 `cmu-wall-axial` -- Reinforced CMU Wall Allowable Axial Compression (TMS 402 ASD)

```
inputs:
  fm_psi     psi   specified masonry compressive strength f'm (default 2000)
  an_in2     in2   net cross-sectional area An of the strip or column
  ast_in2    in2   total vertical reinforcement area Ast (default 0)
  h_in       in    effective (unsupported) height h
  r_in       in    radius of gyration r of the section
  fs_psi     psi   allowable steel compressive stress Fs (default 32000, Grade 60)

hr    = h_in / r_in                                       ; slenderness ratio
P0    = 0.25 * fm_psi * an_in2 + 0.65 * ast_in2 * fs_psi  ; unreduced material capacity, lb
R     = (hr <= 99) ? (1 - (h_in / (140 * r_in))^2)        ; slenderness reduction factor
              : (70 * r_in / h_in)^2
Pa_lb = P0 * R                                            ; allowable axial load, lb
Pa_kip = Pa_lb / 1000
branch = (hr <= 99) ? "short/intermediate" : "slender"
```

**Pinned worked example (an 8 in fully grouted wall, 12 ft tall, #5 vertical at 24 in, f'm = 2,000 psi).** A one-foot
strip of a fully grouted 7.625 in wall: `An = 7.625 x 12 = 91.5 in^2`; `Ast = 0.31 x 12/24 = 0.155 in^2`; the section is
solid, so `r = t / sqrt(12) = 7.625 / 3.4641 = 2.201 in`; `h = 144 in`, so `h/r = 65.4 <= 99` (short/intermediate
branch); `Fs = 32,000 psi`. Material capacity `P0 = 0.25 x 2,000 x 91.5 + 0.65 x 0.155 x 32,000 = 45,750 + 3,224 =
48,974 lb`. Slenderness: `h/(140 r) = 144/(140 x 2.201) = 0.4673`, squared `= 0.2184`, so `R = 1 - 0.2184 = 0.7816`.
`Pa = 48,974 x 0.7816 = 38,278 lb = ` **38.3 kip per foot of wall**. **Cross-check (stretch the same wall to 24 ft, the
slender branch).** Hold the section and steel, set `h = 288 in`: `h/r = 130.8 > 99`, so the second branch governs;
`70 r / h = 70 x 2.201 / 288 = 0.5350`, squared `= 0.2862`; `Pa = 48,974 x 0.2862 = 14,016 lb = ` **14.0 kip per foot**.
Doubling the unbraced height more than halves the allowable load, the buckling penalty the two-branch curve is built to
capture. **Continuity seam.** At the branch boundary `h/r = 99` the two forms agree: `1 - (99/140)^2 = 0.4999` and
`(70/99)^2 = 0.4999`, so the fuzzer pins that the reported `Pa` is continuous across the branch switch. The non-finite,
`fm_psi <= 0`, `an_in2 <= 0`, `h_in <= 0`, `r_in <= 0`, and `ast_in2 < 0` error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["masonry","construction"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, the TMS 402 ASD allowable-axial provisions, `editionNote` naming
`Pa = (0.25 f'm An + 0.65 Ast Fs) R` with the `1 - (h/140r)^2` and `(70r/h)^2` branches meeting at `h/r = 99`, the
Masonry Designers' Guide / CMHA TEK 14-07C compilation, and the tied-reinforcement, pure-axial-no-moment-interaction,
take-`r`-and-`h`-from-the-section, and design-aid caveats); `test/fixtures/worked-examples.json` (the 12 ft short-branch
example + the 24 ft slender-branch cross-check); `test/fixtures/compute-map.js` (`cmu-wall-axial` ->
`computeCmuWallAxial` in `../../calc-masonry.js`); `scripts/related-tiles.mjs` (-> `cmu-wall-flexure` / `cmu-shear-wall` /
`steel-column-capacity` / `cmu-grout-volume`); `data/search/aliases.json` ("masonry axial capacity", "CMU wall axial
load", "allowable axial masonry", "TMS 402 Pa", "masonry slenderness reduction", "h over r masonry", "load bearing block
wall capacity", "how much load can a block wall carry", "reinforced masonry column"); the id appended to the
`MASONRY_RENDERERS["cmu-wall-axial"]=` block at the file end of `app.js`'s masonry bundle; the `// dims:` annotation
(`fm_psi`/`fs_psi` pressure, `an_in2`/`ast_in2` area, `h_in`/`r_in` length, `Pa` force); regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the `P0`/`R`/`h/r` intermediates, the branch selection
and the `h/r = 99` continuity, and the six error seams (non-finite, `fm_psi <= 0`, `an_in2 <= 0`, `h_in <= 0`,
`r_in <= 0`, `ast_in2 < 0`). Bump the `calc-masonry.js` size in the `check:module-sizes` allowlist if the gate flags it
(dated comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the six error paths, the branch-selection and continuity assertions); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `P0` / `h/r` /
`R` / `Pa` stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (12 ft wall -> 38.3 kip per foot;
24 ft wall -> 14.0 kip per foot).

## 5. Roadmap position

Closes the TMS 402-16 reinforced-masonry member batch (v269..v271) and completes the `calc-masonry.js` flexure / shear /
axial triad, the masonry counterpart to the AISC steel-member trio (v254..v256, whose third member was column
compression) and the ACI reinforced-concrete trio (v257..v259). The natural next step is the combined axial-plus-flexure
interaction (the unity check that ties this tile to v269), a slender-wall strength-design (P-delta) companion, and an
empirical-design (unreinforced, TMS 402 Chapter 8 non-reinforced) axial form; with the batch complete the masonry cluster
stands beside the steel-member, reinforced-concrete, geotechnical, and building-code clusters in Group E, and masonry
joins steel and concrete as a trade with both a material-takeoff and a structural-design presence in the catalog.
