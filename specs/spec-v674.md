# roughlogic.com Specification v674 -- Max Temperature Change for a Stress Limit (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group
> E, construction / carpentry / pipefitting), no new module, group, or dependency. Inherits spec.md through
> spec-v673.md.
>
> **The gap, and the evidence for it.** Spec-v360 (`thermal-stress-restrained`) runs the restrained-thermal-stress
> relation forward: given a temperature change, it returns the stress. The design question a pipefitter or steel
> detailer asks is the inverse -- **how big a temperature swing can this restrained member take before its stress
> reaches the allowable**. The forward tile makes you guess a temperature and re-read the stress; the inverse solves it
> directly. From `sigma = E x alpha x dT x restraint`, `dT_max = sigma_allow / (E x alpha x restraint)`. The number this
> settles: fully restrained structural steel at an 18,850 psi allowable can swing **100 F**, aluminum tolerates **145 F**
> for the same stress (its lower modulus wins despite the larger expansion coefficient), and half restraint doubles the
> swing to 200 F.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`thermal-stress-restrained` sibling: the allowable stress and the modulus are `M L^-1 T^-2` (psi), the expansion
coefficient and the restraint factor are `dimensionless`, and the returned temperature change is `T` (deg F). The
v18/v21 contract: any non-finite input, or a non-positive allowable / modulus / expansion coefficient, or a restraint
factor outside (0, 1], returns `{ error }` (a zero or non-finite restraint defaults to 1, matching the sibling).
Citation discipline (v19/v22): the restrained-thermal-stress relation solved for the temperature change, by name; the
note states that **the stress is independent of length so the limit depends only on the material, restraint, and
allowable, heating is compression and cooling is tension (use the governing allowable), a lower modulus or expansion
coefficient or partial restraint raises the tolerable swing, and this is a design aid -- the engineer of record
governs**.

## 2. The tile

### 2.1 `thermal-stress-max-deltat` -- Max Temperature Change for a Stress Limit

```
inputs:
  allowable_stress_psi   psi   allowable thermal stress (> 0)
  E_psi                  psi   modulus of elasticity (> 0; 29e6 steel, 10e6 alum)
  alpha                  /F    thermal expansion coefficient (> 0; 6.5e-6 steel)
  restraint              -     restraint factor 0-1 (default 1)

dT_max = allowable_stress_psi / (E_psi x alpha x restraint)   [deg F]
```

**Pinned worked example (fully restrained steel).** allowable = 18,850 psi, E = 29e6 psi, alpha = 6.5e-6 /F,
restraint = 1: `dT_max = 18850 / (29e6 x 6.5e-6 x 1) = 18850 / 188.5 = ` **100 F**; feeding 100 F back through
`thermal-stress-restrained` returns 18,850 psi, the input. **Cross-check (aluminum).** Same allowable with E = 10e6 psi,
alpha = 13e-6 /F: `dT_max = 18850 / (10e6 x 13e-6) = ` **145 F** -- aluminum's lower modulus lets it swing farther for
the same stress even though it expands twice as much per degree.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "carpentry", "pipefitting"]`, beside
`thermal-stress-restrained`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (restrained thermal stress solved
for dT, `GOVERNANCE.general` matching the sibling, the note per §1); `test/fixtures/worked-examples.json` (both
examples); `test/fixtures/compute-map.js` (`thermal-stress-max-deltat` -> `computeThermalStressMaxDeltaT` in
`../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `thermal-stress-restrained` / `pipe-expansion` /
`pipe-expansion-loop` / `conduit-thermal-expansion`, and the forward tile links back); `data/search/aliases.json` ("max
temperature change for stress", "allowable temperature swing", "delta t for a stress limit", plus adjacent rows);
`CONSTRUCTION_RENDERERS["thermal-stress-max-deltat"]` via the module's `_simpleRenderer` factory (mirroring
`thermal-stress-restrained`) and the id added to the calc-construction declare list in `app.js`; the `// dims:`
annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning both examples, the half-restraint doubling, the round-trip through
`computeThermalStressRestrained`, and the error seams. The Group E audit-coverage test parses only the original
`// Group E: Carpentry` block (this tile is in a later section) and asserts a lower bound, so no count bump. The
calc-construction.js gzip cap is expected to hold (verify at build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes); `npm test` (+2 fixtures, the new
fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner;
320 px audit; render + output read to the value (the pinned example -> 100 F for an 18,850 psi steel allowable).

## 5. Roadmap position

Pairs the forward thermal tile (`thermal-stress-restrained`, stress from temperature) with its inverse (temperature from
the allowable stress), the two halves of the restrained-expansion question. Further Group E growth stays
evidence-driven.
