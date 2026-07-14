# roughlogic.com Specification v709 -- Concrete f'c from Modulus of Rupture (calc-concrete.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-concrete.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v708.md. Sweep-9 inverse queue.
>
> **The gap, and the evidence for it.** The single-mode `concrete-modulus-of-rupture` tile runs ACI 318-19 forward: from
> a compressive strength it returns the flexural cracking stress. The field question is the inverse -- **what strength
> does a flexural-beam (modulus-of-rupture) test imply**. From `fr = 7.5 x lambda x sqrt(f'c)`, solving for the strength
> gives `f'c = (fr / (7.5 x lambda))^2`. The number this settles: a **474 psi** normalweight rupture strength implies
> **~4,000 psi**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`concrete-modulus-of-rupture` sibling: the rupture stress and returned strength are `M L^-1 T^-2` (psi) and lambda is
dimensionless. It reuses the sibling's lambda (1.0 normalweight, 0.75 all-lightweight); a non-positive lambda defaults to
1.0. The v18/v21 contract: any non-finite input, or a non-positive rupture stress or lambda, returns `{ error }`; a lambda
outside 0.75-1.0 is flagged (`out_of_band`) but still returns a value. Citation discipline (v19/v22): the ACI 318-19
19.2.3.1 relation solved for the strength, `GOVERNANCE.general` matching the sibling; the note states that **the code fr
is a conservative lower bound a real beam test scatters above, so the implied f'c is a lower-bound equivalent (not a
cylinder-break value), and the structural engineer of record's stamped design governs**.

## 2. The tile

### 2.1 `concrete-strength-from-rupture` -- Concrete f'c from Modulus of Rupture (ACI 318-19 19.2.3)

```
inputs:
  fr_psi   M L^-1 T^-2   modulus of rupture (> 0)
  lambda   dimensionless lightweight factor (> 0, default 1.0)

f'c = (fr_psi / (7.5 x lambda))^2
```

**Pinned worked example.** fr = 474.342 psi, lambda = 1.0: `f'c = (474.342 / 7.5)^2 = 63.25^2 = ` **~4,000 psi**; feeding
4,000 psi back through `concrete-modulus-of-rupture` returns 474.342 psi, the input. A higher rupture stress at the same
lambda implies a higher strength.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","carpentry"]`) placed beside `concrete-modulus-of-rupture`
(Group E is un-audited); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (rupture relation solved for the
strength, `GOVERNANCE.general` matching the sibling); `test/fixtures/worked-examples.json` (the pinned example);
`test/fixtures/compute-map.js` (`concrete-strength-from-rupture` -> `computeConcreteStrengthFromRupture`);
`scripts/related-tiles.mjs` (-> `concrete-modulus-of-rupture` / `concrete-cracking-moment` /
`concrete-strength-from-modulus` / `rc-beam-flexure`); `data/search/aliases.json` (5 collision-checked question aliases:
"fc from modulus of rupture", "compressive strength from beam test", ...); the calc-concrete `CONCRETE_RENDERERS` map
entry via the shared `_simpleRenderer` factory (a rupture-stress field and lambda) and the id added to the calc-concrete
declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the round-trip through
`computeConcreteModulusOfRupture` across an f'c/lambda sweep, the higher-rupture-higher-strength monotonicity, the
out-of-band flag, and the error seams. The calc-concrete.js gzip cap (25000 B) is expected to hold. Verify at build,
including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,157 -> 1,158.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> ~4,000 psi for fr 474.342
psi at lambda 1.0).

## 5. Roadmap position

Pairs the forward rupture tile (`concrete-modulus-of-rupture`, fr from f'c) with its inverse (f'c from fr), completing the
concrete material-property inverse pair alongside spec-v708. Further Group E concrete growth stays evidence-driven.
