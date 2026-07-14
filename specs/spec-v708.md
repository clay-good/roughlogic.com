# roughlogic.com Specification v708 -- Concrete f'c from Modulus of Elasticity (calc-concrete.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-concrete.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v707.md. Sweep-9 inverse queue.
>
> **The gap, and the evidence for it.** The single-mode `concrete-elastic-modulus` tile runs ACI 318-19 forward: from a
> compressive strength it returns the elastic modulus. The field question is the inverse -- **what in-place strength does
> a measured (or specified) stiffness imply**. From `Ec = wc^1.5 x 33 x sqrt(f'c)`, solving for the strength gives
> `f'c = (Ec / (wc^1.5 x 33))^2`. The number this settles: an **Ec of 3,644,000 psi** at 145 pcf implies **~4,000 psi**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`concrete-elastic-modulus` sibling: the modulus and returned strength are `M L^-1 T^-2` (psi) and the unit weight is
`M L^-3` (pcf). The v18/v21 contract: any non-finite input, or a non-positive modulus or unit weight, returns
`{ error }`; a unit weight outside the ACI 90-160 pcf band is flagged (`out_of_band`) but still returns a value.
Citation discipline (v19/v22): the ACI 318-19 19.2.2.1(a) modulus relation solved for the strength, `GOVERNANCE.general`
matching the sibling; the note states that **this backs out an equivalent in-place f'c from a resonance / sonic-modulus
test or a specified stiffness, the in-place modulus scatters with aggregate and moisture so this is an equivalent
strength (not a cylinder-break value), and the structural engineer of record's stamped design governs**.

## 2. The tile

### 2.1 `concrete-strength-from-modulus` -- Concrete f'c from Modulus of Elasticity (ACI 318-19 19.2.2)

```
inputs:
  ec_psi   M L^-1 T^-2   elastic modulus (> 0)
  wc_pcf   M L^-3        unit weight (> 0, default 145)

f'c = (ec_psi / (wc_pcf^1.5 x 33))^2
```

**Pinned worked example.** Ec = 3,644,147 psi, wc = 145 pcf: `f'c = (3644147 / (145^1.5 x 33))^2 = (3644147 / 57619)^2 =
63.25^2 = ` **~4,000 psi**; feeding 4,000 psi back through `concrete-elastic-modulus` returns 3,644,147 psi, the input. A
stiffer 4.5e6 psi modulus at the same unit weight implies a higher strength.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","carpentry"]`) placed beside `concrete-elastic-modulus`
(Group E is un-audited); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (modulus relation solved for the
strength, `GOVERNANCE.general` matching the sibling); `test/fixtures/worked-examples.json` (the pinned example);
`test/fixtures/compute-map.js` (`concrete-strength-from-modulus` -> `computeConcreteStrengthFromModulus`);
`scripts/related-tiles.mjs` (-> `concrete-elastic-modulus` / `concrete-modulus-of-rupture` / `rc-beam-flexure` /
`concrete-cracking-moment`); `data/search/aliases.json` (5 collision-checked question aliases: "fc from elastic modulus",
"equivalent fc from sonic modulus", ...); the calc-concrete `CONCRETE_RENDERERS` map entry via the shared
`_simpleRenderer` factory (a modulus field and the unit weight) and the id added to the calc-concrete declare list in
`app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the example, the round-trip through `computeConcreteElasticModulus` across an
f'c/unit-weight sweep, the stiffer-modulus-higher-strength monotonicity, the out-of-band flag, and the error seams. The
calc-concrete.js gzip cap (raised to 25000 B in spec-v707) is expected to hold. Verify at build, including `check-shells`.
Lazy-loaded, absent from home first paint. Home tile count 1,156 -> 1,157.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> ~4,000 psi for Ec
3,644,147 psi at 145 pcf).

## 5. Roadmap position

Pairs the forward modulus tile (`concrete-elastic-modulus`, Ec from f'c) with its inverse (f'c from Ec). Further Group E
concrete growth stays evidence-driven.
