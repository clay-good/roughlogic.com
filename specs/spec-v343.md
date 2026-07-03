# roughlogic.com Specification v343 -- Combined Axial and Bending Stress (P/A +/- Mc/I) (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v341..v343 (the mechanics-of-materials trio -- cantilever beam
> (v341), section properties (v342), the combined axial-plus-bending stress (this spec)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: a member carrying axial load and bending at once --
> an eccentrically loaded column, a post with a side load, a chord with a nodal load -- has a combined extreme-fiber stress
> the catalog computes for no material generically. The material-specific interaction tiles exist (wood, steel), but the
> underlying `P/A +/- Mc/I` superposition, the number a fabricator or inspector checks against an allowable, does not. Adds
> one tile to the existing **`calc-construction.js`** module (Group E); no new group, trade, or dependency. Inherits spec.md
> through spec-v342.md.
>
> **The gap, and the evidence for it.** The combined normal stress on a section carrying an axial force `P` and a bending
> moment `M` is the superposition `sigma = P/A +/- M c/I`, where `A` is the area, `c` the extreme-fiber distance, and `I`
> the moment of inertia; the maximum (compression) and minimum (which may go into tension) fiber stresses are the two signs.
> For a 6x6 post (actual 5.5 in, `A = 30.25 in^2`, `I = 76.3 in^4`, `c = 2.75 in`) carrying a 20,000 lb axial load plus a
> 30,000 lb-in bending moment, the axial stress is `661 psi`, the bending stress `+/-1,082 psi`, so the fibers run from
> `+1,743 psi` (compression) to `-421 psi` (tension) -- the section goes into net tension on one face, the thing an eccentric
> load does that a pure axial check misses, and the stress a design compares to the allowable. The section-property tile
> gives `A`, `I`, `c`; this tile combines the loads on them.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The axial force `P` is a
force (lb); the moment `M` is a moment (lb-in); the area `A` is an area (in^2); the extreme-fiber distance `c` is a length
(in); the moment of inertia `I` is a length^4 (in^4); the axial, bending, and combined stresses are stresses (psi). The
v18/v21 contract: any non-finite input, or an area, `c`, or `I` at or below zero, returns `{ error }`; the eccentricity
form `M = P e` may be entered instead of `M` directly. Citation discipline (v19/v22): `GOVERNANCE.general` over the
combined-stress superposition by name; `editionNote` names **the combined normal stress `sigma = P/A +/- M c/I`, the
axial `P/A` and bending `M c/I = M/S` components, the sign convention (compression positive), and the eccentric-axial form
`M = P e`, from the standard mechanics-of-materials references**, and states that **this returns the elastic extreme-fiber
stresses under combined axial and uniaxial bending -- it is the linear-elastic superposition (valid where the section stays
elastic and second-order/P-delta effects are negligible; `wood-combined-bending-axial` and `steel-h1-interaction` add the
amplification and the code interaction), covers uniaxial bending about one axis, and does not itself check buckling or the
allowable stress; and this is a computational aid, not a substitute for the engineer of record** -- the structural engineer
of record's stamped design governs.

## 2. The tile

### 2.1 `combined-stress-axial-bending` -- Combined Axial and Bending Stress

```
inputs:
  P_lb    lb     axial force (+ compression)
  M_lbin  lb-in  bending moment (or enter P and eccentricity e)
  A_in2   in^2   cross-sectional area
  c_in    in     extreme-fiber distance
  I_in4   in^4   moment of inertia
  (alt) e_in     eccentricity => M = P * e

sigma_axial = P_lb / A_in2                        ; axial stress, psi
sigma_bend  = M_lbin * c_in / I_in4               ; bending stress, psi (= M/S)
sigma_max   = sigma_axial + sigma_bend            ; extreme compression fiber
sigma_min   = sigma_axial - sigma_bend            ; other fiber (tension if < 0)
```

**Pinned worked example (a 6x6 post, P = 20,000 lb, M = 30,000 lb-in; A = 30.25, I = 76.3, c = 2.75).**
`sigma_axial = 20,000/30.25 = 661 psi`; `sigma_bend = 30,000 x 2.75/76.3 = 1,082 psi`; `sigma_max = 661 + 1,082 = 1,743 psi`
(compression), `sigma_min = 661 - 1,082 = -421 psi` (net tension on the far face). **Cross-check (halve the moment to
15,000 lb-in).** `sigma_bend = 541 psi`; `sigma_max = 1,202 psi`, `sigma_min = 661 - 541 = +120 psi` -- now the whole
section stays in compression, the threshold (`M c/I < P/A`, i.e. `e < r^2/c` = the kern) below which no tension develops,
the same kern idea the eccentric-footing tile uses. The non-finite and non-positive-`A`/`c`/`I` error paths bracket the
result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","carpentry","welding"]`, matching the beam tiles); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the combined-stress superposition,
`editionNote` naming `sigma = P/A +/- M c/I`, the components, the sign convention, the `M = P e` form, and the elastic,
uniaxial, not-buckling caveats); `test/fixtures/worked-examples.json` (the net-tension example + the all-compression
cross-check); `test/fixtures/compute-map.js` (`combined-stress-axial-bending` -> `computeCombinedStressAxialBending` in
`../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `section-properties` / `cantilever-beam` /
`wood-combined-bending-axial` / `steel-h1-interaction`); `data/search/aliases.json` ("combined stress", "axial plus
bending", "P over A plus Mc over I", "eccentric load stress", "combined loading stress", "extreme fiber stress",
"bending plus axial", "M over S stress", "kern eccentricity"); the id appended to the existing construction renderers block
in `app.js`; the `// dims:` annotation (`P` force, `M` moment, `A` area, `c` length, `I` length^4, stresses stress);
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the two-sign superposition, the
net-tension threshold, and the non-positive / non-finite error seams. No new module; re-pin `calc-construction.js` on the
`check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the net-tension-threshold assertion); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the axial / bending / max / min stack
wraps on a phone); render-no-nan + a11y sweep, output read to the value (P 20,000 M 30,000 -> 1,743 / -421 psi).

## 5. Roadmap position

Closes the mechanics-of-materials batch (v341..v343) in `calc-construction.js`: the cantilever beam, the section
properties, and the combined stress now give the generic beam-and-stress toolkit beneath the material-specific wood and
steel interaction tiles. Biaxial bending (`+/- M_x c_x/I_x +/- M_y c_y/I_y`), the eccentric-load kern check as its own
output, and a shear-stress (`VQ/It`) companion are the deliberate next follow-ons once the trio lands.
