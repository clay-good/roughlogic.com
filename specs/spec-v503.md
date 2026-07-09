# roughlogic.com Specification v503 -- Bolt Proof, Yield, and Tensile Load (calc-cross.js, Group G, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-cross.js`**
> (Group G, cross-trade utilities); no new module, group, or dependency. Inherits spec.md through spec-v502.md.
>
> **The gap, and the evidence for it.** `bolt-torque` gives the torque to reach a target clamp load, but it never tells
> you the bolt's own ceiling -- the proof load it must stay under, the yield where it starts to deform, and the tensile
> where it breaks. Every mechanic, fabricator, and framer who torques a fastener is implicitly betting the clamp load is
> below the proof load, and the bench has no tile that bounds it. The catch is twofold. First, the strength acts on the
> **tensile stress area** at the thread root, which is about 15% smaller than the nominal shank area, so a nominal-area
> estimate over-predicts capacity. Second, the numbers come entirely from the **grade** -- the head markings -- so a
> Grade 2 bolt, a Grade 5, and a Grade 8 of the identical diameter carry wildly different loads, and mixing them up is a
> classic failure. The tile computes the stress area from the SAE J429 formula and multiplies it by the grade's proof,
> yield, and tensile strengths, returning all three loads plus the recommended clamp (about 75% of proof) -- the ceiling
> that `bolt-torque` assumes but does not show.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The nominal diameter is a
length (`L`); the threads per inch is `dimensionless`; the tensile stress area is an area (`L^2`); the grade strengths
are stresses (`M L^-1 T^-2`, worked in psi); the proof, yield, tensile, and clamp loads are forces (`M L T^-2`, in
pounds). The v18/v21 contract: any non-finite input, a non-positive diameter or threads-per-inch, or an unrecognized
grade returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the stress-area and grade relations
by name (SAE J429 inch series; ASME B1.1 stress area); `editionNote` names the **SAE J429 bolt strength model (tensile
stress area x grade strength)**, prints `At = 0.7854 x (D - 0.9743 / n)^2`, `proof_load = At x proof_strength`,
`tensile_load = At x tensile_strength`, and `recommended_clamp = 0.75 x proof_load`, lists the grade strengths (**Grade
2: 55 ksi proof / 74 ksi tensile; Grade 5 and A325: 85 / 120; Grade 8 and A490: 120 / 150**), and states that **the
strength acts on the tensile stress area at the thread root (about 15% under the nominal shank area, so a nominal-area
estimate over-predicts), the grade is read from the head markings and sets every number, the recommended clamp of about
75% of proof leaves margin for torque scatter and service loads, and the joint design, torque method, and any preload
requirement govern** -- a design aid, not the engineer of record.

## 2. The tile

### 2.1 `bolt-proof-load` -- The Fastener Ceiling `bolt-torque` Assumes but Never Shows

```
inputs:
  nominal_diameter_in   in    bolt nominal (major) diameter D
  threads_per_inch      -     thread count n (TPI)
  grade                 -     SAE grade 2 / 5 / 8 (or A325 = 5, A490 = 8)

At_in2       = 0.7854 x (nominal_diameter_in - 0.9743 / threads_per_inch)^2   [in^2]
proof_load   = At_in2 x proof_strength(grade)                                 [lb]
yield_load   = At_in2 x yield_strength(grade)                                 [lb]
tensile_load = At_in2 x tensile_strength(grade)                              [lb]
rec_clamp    = 0.75 x proof_load                                             [lb]
```

**Pinned worked example (a 1/2-13 Grade 5 bolt).** The stress area is
`At = 0.7854 x (0.5 - 0.9743/13)^2 = 0.7854 x (0.4251)^2 = ` **0.1419 in^2**. At the Grade 5 proof strength of 85 ksi
the proof load is `0.1419 x 85000 = ` **12,060 lb**, the tensile load at 120 ksi is `0.1419 x 120000 = ` **17,030 lb**,
and the recommended clamp is `0.75 x 12,060 = ` **9,045 lb** -- the working target a torque value should aim for.
**Cross-check (the grade is everything).** Keep the identical 1/2-13 bolt but make it Grade 8 (120 ksi proof): the proof
load jumps to `0.1419 x 120000 = ` **17,028 lb** and the recommended clamp to **12,771 lb** -- the same-size fastener
carries 40% more purely from the grade stamp, which is why substituting a Grade 5 for a Grade 8 is a real failure. The
tile returns the stress area and the proof, yield, tensile, and recommended-clamp loads.

## 3. Wiring

A `tools-data.js` row (group `G`, trades `["mechanic", "fabrication", "carpentry"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the Grade 5
example + the Grade 8 cross-check); `test/fixtures/compute-map.js` (`bolt-proof-load` -> `computeBoltProofLoad` in
`../../calc-cross.js`); `scripts/related-tiles.mjs` (-> `bolt-torque` / `thread-engagement` / `thread-pitch`);
`data/search/aliases.json` ("bolt proof load", "tensile stress area", "sae j429", "grade 5 grade 8", "bolt strength",
"clamp load", "proof yield tensile", "a325 a490"); the id appended to the cross renderers declare in `app.js`; the
`// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the
stress-area formula, the grade strength lookup (2/5/8), the proof < yield < tensile ordering, and the error seams (non-
finite, non-positive diameter / TPI, bad grade). Hand-writes its renderer (mirroring the calc-cross.js `bolt-torque`
pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the stress-area / proof / tensile / clamp stack wraps on a phone); render-no-nan + a11y on the new
tile, output read to the value (the Grade 5 example -> At 0.1419 in^2, 12,060 lb proof).

## 5. Roadmap position

Bounds the fastener capacity that `bolt-torque` assumes and pairs with `thread-engagement` (the tapped-hole side of the
same joint). A metric ISO 898 grade set (8.8 / 10.9 / 12.9), a bolt-shear-capacity companion, and a preload-from-
torque-scatter band are deliberate future follow-ons. Further Group G growth stays evidence-driven.
