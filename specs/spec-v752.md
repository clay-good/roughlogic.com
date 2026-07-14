# roughlogic.com Specification v752 -- Concrete Section Depth for a Target Cracking Moment (calc-concrete.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-concrete.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v751.md. Explore sweep #14 (entry 7).
>
> **The gap, and the evidence for it.** The `concrete-cracking-moment` tile runs ACI 318-19 forward: from a section depth
> it returns the cracking moment. The design question is the inverse -- **the section depth that reaches a target cracking
> moment** for a given width. From `Mcr = fr b h^2 / 6` with `fr = 7.5 lambda sqrt(f'c)`, `h = sqrt( 6 Mcr / (fr b) )`. The
> number this settles: a **12 in** wide section at **4000 psi** needs about a **20 in** depth to crack at **31.6 kip-ft**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`concrete-cracking-moment` sibling: the target moment is `M L^2 T^-2` (kip-ft), the width and returned depth are `L` (in),
f'c and fr are `M L^-1 T^-2` (psi), lambda is dimensionless, and the section modulus is `L^3`. It reuses the sibling's ACI
318-19 cracking-moment relation, solved for the depth. The v18/v21 contract: any non-finite input, a non-positive target
moment, width, f'c, or lambda returns `{ error }`; a lambda outside 0.75-1.0 is flagged (not errored). Citation discipline
(v19/v22): the relation solved for the depth, `GOVERNANCE.general` matching the sibling; the note gives the common use
(enter **1.2 Mcr** for the minimum-flexural-reinforcement check), notes the **gross rectangular section** approximation
(a T-beam uses the transformed Ig), and says the **flexure/shear/deflection design still governs** the final depth.

## 2. The tile

### 2.1 `concrete-depth-for-cracking-moment` -- Concrete Section Depth for a Target Cracking Moment

```
inputs:
  target_mcr_kipft   M L^2 T^-2    target cracking moment Mcr (kip-ft, > 0)
  b_in               L             section width b (in, > 0)
  fc_psi             M L^-1 T^-2   concrete strength f'c (psi, > 0; default 4000)
  lambda             dimensionless lightweight factor (> 0; default 1.0)

fr_psi   = 7.5 x lambda x sqrt(fc_psi)
mcr_lbin = target_mcr_kipft x 12000
h_in     = sqrt( 6 x mcr_lbin / (fr_psi x b_in) )
sm_in3   = b_in x h_in^2 / 6
```

**Pinned worked example.** target Mcr = 31.62 kip-ft, b = 12 in, f'c = 4000 psi, lambda = 1.0:
`fr = 7.5 x sqrt(4000) = 474.3 psi`, `Mcr_lbin = 379,440`, `h = sqrt( 6 x 379440 / (474.3 x 12) ) = ` **20.0 in**. Feeding
20.0 in back through `concrete-cracking-moment` at the same section returns 31.6 kip-ft, the target. A larger 60 kip-ft
target needs a deeper ~27.6 in section.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction"]`) placed beside `concrete-cracking-moment` (Group E is not
exact-count audited); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (relation solved for the depth,
`GOVERNANCE.general` matching the sibling); `test/fixtures/worked-examples.json` (the pinned example);
`test/fixtures/compute-map.js` (`concrete-depth-for-cracking-moment` -> `computeConcreteDepthForCrackingMoment`);
`scripts/related-tiles.mjs` (-> `concrete-cracking-moment` / `concrete-modulus-of-rupture` / `rc-beam-flexure`);
`data/search/aliases.json` (5 collision-checked question aliases: "depth for cracking moment", "how deep for cracking
moment", ...); the calc-concrete `CONCRETE_RENDERERS` map entry via the shared `_simpleRenderer` factory (four number
fields) and the id added to the calc-concrete declare list in `app.js`; the `// dims:` annotation directly above the
compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the
round-trip through `computeConcreteCrackingMoment` across a Mcr/b/f'c/lambda sweep, the larger-Mcr-deeper and
wider-section-shallower monotonicity, and the error seams. The calc-concrete.js gzip cap (raised to 28000 B in this spec,
covering v752 and v753) covers the addition. Verify at build, including `check-shells`. Lazy-loaded, absent from home
first paint. Home tile count 1,200 -> 1,201.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 20.0 in for a 31.6 kip-ft
target on a 12 in wide 4000 psi section).

## 5. Roadmap position

Pairs the forward cracking tile (`concrete-cracking-moment`, Mcr from the depth) with its inverse (the depth for an Mcr),
the two halves of the minimum-reinforcement section-sizing question. Continues Explore sweep #14; further Group E concrete
growth stays evidence-driven.
