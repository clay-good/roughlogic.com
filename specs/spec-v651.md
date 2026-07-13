# roughlogic.com Specification v651 -- Concrete Cracking Moment Mcr (calc-concrete.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-concrete.js`**
> (Group E, construction/structural), no new module, group, or dependency. Inherits spec.md through spec-v650.md.
>
> **The gap, and the evidence for it.** The `concrete-modulus-of-rupture` tile (spec-v379) computes the rupture
> stress `fr = 7.5 lambda sqrt(f'c)`, and its own note states verbatim that *"fr sets the cracking moment Mcr
> behind deflection (Ie) and minimum-reinforcement checks"* -- but it stops at the stress and never computes Mcr.
> Mcr is the moment a designer actually needs: it is the threshold in the effective-moment-of-inertia (Ie)
> deflection analysis and in the ACI minimum-flexural-reinforcement check (design strength must reach at least
> 1.2 Mcr). It is basic mechanics on top of the sibling's constant: `Mcr = fr Ig/yt = fr b h^2/6` for a gross
> rectangular section. The pinned example: a 12 x 20 in section at 4000 psi normalweight (fr 474 psi, S 800 in^3)
> cracks at **31.6 kip-ft**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The width and depth
are `L`, the concrete strength and rupture stress are `M L^-1 T^-2` (psi), the lightweight factor is
`dimensionless`, the gross section modulus is `L^3`, and the cracking moment is `M L^2 T^-2` (lb-in / kip-ft). The
`7.5` rupture coefficient and the lambda handling are the same ones `concrete-modulus-of-rupture` already uses. The
v18/v21 contract: any non-finite input, or a non-positive width, depth, strength, or lambda, returns `{ error }`; a
lambda outside 0.75-1.0 sets an out-of-band flag but still returns a number (mirroring the sibling). Citation
discipline (v19/v22): the ACI 318-19 cracking moment `Mcr = fr Ig/yt` with the 19.2.3.1 rupture stress, by name;
the note states that **Mcr = fr b h^2/6 for a gross rectangular section, it is the value behind the Ie deflection
analysis and the minimum-reinforcement check (>= 1.2 Mcr), and a T-beam or heavily reinforced section uses the
transformed Ig** -- a design aid, the engineer of record's stamped design governs.

## 2. The tile

### 2.1 `concrete-cracking-moment` -- The Moment at Which a Concrete Section First Cracks

```
inputs:
  b_in     in    section width (> 0)
  h_in     in    section total depth (> 0)
  fc_psi   psi   concrete compressive strength f'c (> 0)
  lambda   -     lightweight factor (> 0; 1.0 normalweight, 0.75 all-lightweight)

fr    = 7.5 x lambda x sqrt(fc_psi)         [psi]
S     = b_in x h_in^2 / 6                    [in^3]   (= Ig/yt, gross rectangular)
Mcr   = fr x S                              [lb-in]  (= fr Ig/yt)
Mcr_kipft = Mcr / 12000
```

**Pinned worked example.** `b = 12 in`, `h = 20 in`, `f'c = 4000 psi`, `lambda = 1.0`:
`fr = 7.5 sqrt(4000) = 474 psi`, `S = 12 x 20^2/6 = 800 in^3`, `Mcr = 474 x 800 = 379,473 lb-in = ` **31.6 kip-ft**.
**Cross-check (Mcr grows with h^2).** A 24 in deep section (same width and strength) cracks at
`31.6 x (24/20)^2 = ` **45.5 kip-ft** -- the section modulus, and thus Mcr, scales with the square of the depth.
**Cross-check (consistency with the rupture tile).** The fr this tile uses is identical to the
`concrete-modulus-of-rupture` tile's output at the same f'c and lambda (the fuzzer asserts equality to 1e-12).

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction"]`, beside `concrete-modulus-of-rupture`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (ACI 318-19 cracking moment, the note per §1); `test/fixtures/worked-
examples.json` (the pinned example plus the h^2 cross-check); `test/fixtures/compute-map.js`
(`concrete-cracking-moment` -> `computeConcreteCrackingMoment`); `scripts/related-tiles.mjs` (<-> `concrete-
modulus-of-rupture`, `concrete-elastic-modulus`, `rc-beam-flexure`, `rc-slab-min-thickness`); `data/search/
aliases.json` ("concrete cracking moment", "cracking moment", "when does concrete crack in bending", plus question
rows, all collision-checked); `CONCRETE_RENDERERS["concrete-cracking-moment"]` via the `_simpleRenderer` factory
(field DOM ids = the input keys) and the id added to the calc-concrete declare list in `app.js`; the `// dims:`
annotation directly above the compute; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning
the example, the equality of fr with `computeConcreteModulusOfRupture`, the h^2 growth, the lightweight flag, and
the error seams. The two `index.html` home-count spots go 1,099 -> 1,100 (check-readme-counts gates them). The
calc-concrete.js gzip cap is expected to hold (verify at build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output
read to the value (the pinned example -> 31.6 kip-ft, fr 474 psi, S 800 in^3).

## 5. Roadmap position

Completes the concrete cracking chain: `concrete-modulus-of-rupture` (the rupture stress fr) and now
`concrete-cracking-moment` (the moment Mcr the rupture tile names as its purpose), feeding the Ie deflection and
minimum-reinforcement checks. Further Group E growth stays evidence-driven.
