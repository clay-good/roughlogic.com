# roughlogic.com Specification v269 -- Reinforced CMU Wall Out-of-Plane Flexure (TMS 402 ASD, Cracked Transformed Section) (calc-masonry.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-02, package 0.96.0; was PROPOSED 2026-07-02). Batch spec-v269..v271 (the TMS 402-16 reinforced-masonry member trio -- the three
> limit states a masonry wall answers once the concrete and steel batches have sized their members: how much moment the
> wall takes bending out-of-plane under wind or seismic (this spec), how much in-plane shear the same wall carries as a
> shear wall (v270), and how much axial load it stands up under (v271). Flexure / shear / axial, the exact triad the AISC
> steel batch (v254..v256) traced for a wide-flange, now traced for a reinforced concrete-masonry wall.)**
> In-scope catalog expansion under the spec-v106 trades-only charter: masonry is a first-class trade (the catalog already
> carries `cmu-grout-volume`, `masonry-coursing`, and `masonry-count`), but every masonry tile to date is a *material
> takeoff* -- how many blocks, how much grout, does the course land on a module -- and none of them resolves a *structural*
> limit state. The steel batch (v254..v256) and the reinforced-concrete batch (v257..v259) size their members; nothing
> tells a mason or a plan reviewer how much out-of-plane moment a reinforced CMU wall can carry. Adds one tile to a new
> **`calc-masonry.js`** Group E cluster (reinforced-masonry allowable-stress design, beside the steel-member, reinforced-
> concrete, and geotechnical clusters); no new group, trade, or dependency. Inherits spec.md through spec-v268.md.
>
> **The gap, and the evidence for it.** A single-wythe reinforced CMU wall spanning between the floor and the roof takes
> the wind (or the out-of-plane seismic force on its own weight) as a one-way vertical beam, and the question the wall
> answers is the allowable bending moment per foot of wall. Masonry allowable-stress design resolves it with the same
> cracked transformed-section working-stress method the trade has used for a century: with the modular ratio `n = Es/Em`
> (`Em = 900 f'm` for concrete masonry), the reinforcement ratio `rho = As/(b d)`, the neutral-axis coefficient
> `k = sqrt(2 rho n + (rho n)^2) - rho n`, and the lever-arm coefficient `j = 1 - k/3`, the wall's allowable moment is the
> lesser of a steel-governed value `Ms = As Fs j d` (`Fs = 32,000 psi` for Grade 60) and a masonry-governed value
> `Mm = 0.5 Fb k j b d^2` (`Fb = 0.45 f'm`). For a fully grouted 8 in wall (`f'm = 2,000 psi`) reinforced with #5 bars at
> 24 in on center, that lesser value is about `1,430 lb-ft` per foot of wall, and it is *steel-governed* -- exactly the
> outcome a masonry-design text prints for a lightly reinforced wall, and the number a designer needs before dividing the
> factored wind moment into it. `cmu-grout-volume` tells the mason how much grout the cells take; this tile tells the plan
> reviewer whether the bars in those cells are enough.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The specified masonry
compressive strength `f'm`, the allowable steel stress `Fs`, and the allowable masonry bending stress `Fb = 0.45 f'm` are
stresses (psi); the strip width `b`, the effective depth `d` (face of wall to bar center), and the bar spacing `s` are
lengths (in); the reinforcement area `As` is an area (in^2, taken per the strip); the modular ratio `n`, the reinforcement
ratio `rho`, and the coefficients `k` and `j` are dimensionless; the allowable moments `Ms`, `Mm`, and the governing `Ma`
are moments (reported lb-ft per foot of wall, computed in lb-in). The v18/v21 contract: any non-finite input, a masonry
strength, effective depth, or steel area at or below zero, a bar spacing at or below zero, or a strip width at or below
zero, returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the masonry allowable-stress flexure
method by name; `editionNote` names **the TMS 402-16 (Building Code Requirements for Masonry Structures, ACI 530 /
ASCE 5) allowable-stress-design cracked transformed-section flexure method: `n = Es/Em` with `Es = 29,000,000 psi` and
`Em = 900 f'm` for concrete masonry, `rho = As/(b d)`, `k = sqrt(2 rho n + (rho n)^2) - rho n`, `j = 1 - k/3`, the steel-
governed allowable moment `Ms = As Fs j d` and the masonry-governed `Mm = 0.5 Fb k j b d^2`, with `Fs = 32,000 psi` for
Grade 60 reinforcement and `Fb = 0.45 f'm`, as compiled in the Masonry Designers' Guide and CMHA TEK 14-07C (Allowable
Stress Design of Concrete Masonry)**, defaults `Fs` to **32,000 psi (Grade 60)** and `f'm` to **2,000 psi (a common
fully grouted specified strength)**, and states that **this returns the allowable service-level bending moment of a
singly reinforced, fully grouted masonry section by the working-stress (allowable-stress) method -- it assumes the section
is cracked, the reinforcement is developed and in tension, the axial compression is negligible (a wall in near-pure
flexure), and one layer of steel at the reported effective depth; it does not add the axial term, does not apply the
one-third stress increase, and is not the strength-design (LRFD) moment; take `f'm`, the bar size, and the spacing from
the structural drawings; and this is a design aid, not a substitute for the engineer of record's stamped design** -- the
structural engineer of record's stamped design governs.

## 2. The tile

### 2.1 `cmu-wall-flexure` -- Reinforced CMU Wall Out-of-Plane Flexure (TMS 402 ASD)

```
inputs:
  fm_psi     psi   specified masonry compressive strength f'm (default 2000)
  as_in2     in2   reinforcement area As over the design strip
  d_in       in    effective depth (compression face to bar centroid)
  b_in       in    strip width b (default 12, a one-foot design strip)
  fs_psi     psi   allowable steel stress Fs (default 32000, Grade 60)

Es  = 29000000                                   ; psi, steel modulus
Em  = 900 * fm_psi                               ; psi, masonry modulus (concrete masonry)
n   = Es / Em                                    ; modular ratio
rho = as_in2 / (b_in * d_in)                     ; reinforcement ratio
k   = sqrt(2*rho*n + (rho*n)^2) - rho*n          ; neutral-axis depth ratio
j   = 1 - k/3                                     ; lever-arm ratio
Fb  = 0.45 * fm_psi                              ; allowable masonry bending stress, psi
Ms  = as_in2 * fs_psi * j * d_in                 ; steel-governed allowable moment, lb-in
Mm  = 0.5 * Fb * k * j * b_in * d_in^2           ; masonry-governed allowable moment, lb-in
Ma  = min(Ms, Mm)                                ; governing allowable moment, lb-in
Ma_ftlb = Ma / 12                                ; reported per foot of strip, lb-ft
governs = (Ms <= Mm) ? "steel" : "masonry"
```

**Pinned worked example (an 8 in fully grouted wall, #5 at 24 in on center, f'm = 2,000 psi).** A one-foot strip:
`b = 12 in`; the bar is centered in the 7.625 in actual thickness, so `d = 3.81 in`; `As = 0.31 in^2` per 24 in is
`0.155 in^2` per foot; `Fs = 32,000 psi`. `Em = 900 x 2,000 = 1,800,000 psi`, so `n = 29,000,000 / 1,800,000 = 16.11`.
`rho = 0.155 / (12 x 3.81) = 0.003390`; `rho n = 0.05462`;
`k = sqrt(2 x 0.05462 + 0.05462^2) - 0.05462 = sqrt(0.11222) - 0.05462 = 0.3350 - 0.0546 = 0.2804`;
`j = 1 - 0.2804/3 = 0.9065`. `Fb = 0.45 x 2,000 = 900 psi`.
`Ms = 0.155 x 32,000 x 0.9065 x 3.81 = 17,131 lb-in = 1,428 lb-ft`;
`Mm = 0.5 x 900 x 0.2804 x 0.9065 x 12 x 3.81^2 = 19,921 lb-in = 1,660 lb-ft`.
`Ma = min(1,428, 1,660) = ` **1,428 lb-ft per foot, steel-governed** -- the outcome a masonry text prints for a lightly
reinforced wall, where the steel yields before the masonry crushes. **Cross-check (tighten the bars to #5 at 16 in on
center, the governing-mode switch).** Hold everything and raise the steel to `As = 0.31 x 12/16 = 0.2325 in^2` per foot:
`rho = 0.005085`, `rho n = 0.08192`, `k = 0.3311`, `j = 0.8897`;
`Ms = 0.2325 x 32,000 x 0.8897 x 3.81 = 25,218 lb-in = 2,102 lb-ft`;
`Mm = 0.5 x 900 x 0.3311 x 0.8897 x 12 x 14.516 = 23,088 lb-in = 1,924 lb-ft`. Now `Mm < Ms`, so
`Ma = ` **1,924 lb-ft per foot, masonry-governed** -- adding steel past the balance point stops paying off because the
masonry compression block, not the bar, now sets the limit. The two examples pin both branches of the `min(Ms, Mm)` seam;
the non-finite, `fm_psi <= 0`, `d_in <= 0`, `as_in2 <= 0`, `b_in <= 0`, and `fs_psi <= 0` error paths bracket them.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["masonry","construction"]`, matching the CMU material tiles and the structural
Group E cluster); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the TMS 402 ASD cracked
transformed-section flexure method, `editionNote` naming `n = Es/Em` with `Em = 900 f'm`, `k`/`j`, `Ms = As Fs j d`,
`Mm = 0.5 Fb k j b d^2`, `Fs = 32,000 psi` / `Fb = 0.45 f'm`, the Masonry Designers' Guide / CMHA TEK 14-07C compilation,
and the cracked-section / pure-flexure / no-axial / not-strength-design / take-from-drawings / design-aid caveats);
`test/fixtures/worked-examples.json` (the #5 at 24 in steel-governed example + the #5 at 16 in masonry-governed cross-
check); `test/fixtures/compute-map.js` (`cmu-wall-flexure` -> `computeCmuWallFlexure` in `../../calc-masonry.js`);
`scripts/related-tiles.mjs` (-> `cmu-shear-wall` / `cmu-wall-axial` / `cmu-grout-volume` / `rc-beam-flexure`);
`data/search/aliases.json` ("masonry wall moment", "CMU wall bending", "reinforced masonry flexure", "allowable moment
masonry", "TMS 402 flexure", "masonry j and k", "cracked transformed section masonry", "how much moment can a block wall
take", "out of plane wall design"); the id appended to a new `MASONRY_RENDERERS["cmu-wall-flexure"]=` block declared at
the file end of `app.js`'s masonry bundle; the `// dims:` annotation (`fm_psi`/`fs_psi` pressure, `as_in2` area,
`d_in`/`b_in` length, `Ma` moment); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples, the `k`/`j`/`n` intermediates, the steel-vs-masonry governing branch, and the five error seams (non-finite,
`fm_psi <= 0`, `d_in <= 0`, `as_in2 <= 0`, `b_in <= 0`, `fs_psi <= 0`). Add the new `calc-masonry.js` size to the
`check:module-sizes` allowlist (dated comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the five error paths, the governing-mode assertions); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `n` / `k` / `j` / `Ms` / `Mm` / `Ma`
stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (8 in wall, #5 at 24 in -> 1,428 lb-ft per
foot, steel-governed).

## 5. Roadmap position

Opens the TMS 402-16 reinforced-masonry member batch (v269..v271) and the new `calc-masonry.js` module, the masonry
counterpart to the AISC steel-member trio (v254..v256) and the ACI reinforced-concrete trio (v257..v259). The out-of-plane
flexure check is the first of the flexure / shear / axial triad: the in-plane shear-wall check is v270 and the allowable
axial-compression check is v271. A slender-wall (P-delta, TMS 402 §9.3.5.4 strength-design) out-of-plane companion, a
combined axial-plus-flexure interaction (the unity check), and a two-way (panel) wall form are the deliberate next
follow-ons once the trio lands; with the batch complete the masonry cluster stands beside the steel-member,
reinforced-concrete, and geotechnical clusters in Group E.
