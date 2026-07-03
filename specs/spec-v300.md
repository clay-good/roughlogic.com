# roughlogic.com Specification v300 -- Doubly-Reinforced Concrete Beam Flexural Capacity (ACI 318-19) (calc-concrete.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v299..v301 (the reinforced-concrete depth-2 trio -- min
> thickness (v299), the doubly-reinforced beam (this spec), shear friction (v301)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: `rc-beam-flexure` is singly-reinforced (tension steel
> only) and explicitly names "compression steel ... separate checks." When a beam's depth is limited and the tension steel
> exceeds what a singly-reinforced section can balance, the designer adds compression steel, and the capacity gains a second
> couple `A's fy (d - d')`. The catalog has no doubly-reinforced tile. Adds one tile to the existing **`calc-concrete.js`**
> module (Group E); no new group, trade, or dependency. Inherits spec.md through spec-v299.md.
>
> **The gap, and the evidence for it.** For a rectangular beam with tension steel `As` and compression steel `A's` (both
> assumed to yield), ACI equilibrium gives the stress-block depth `a = (As - A's) fy / (0.85 f'c b)` and the nominal moment
> `Mn = (As - A's) fy (d - a/2) + A's fy (d - d')` -- the singly-reinforced couple plus the steel-to-steel couple. For a
> 14 x 24 in beam (`d = 22`, `d' = 2.0`) of 4,000 psi concrete with `As = 8.0 in^2` and `A's = 3.0 in^2` (Grade 60),
> `a = 6.30 in`, the compression steel yields (`epsilon's = 0.00219 > 0.00207`), the section is tension-controlled
> (`epsilon_t = 0.0059 > 0.005`), and `Mn = 5 x 60 x (22 - 3.15) + 3 x 60 x 20 = 9,255 kip-in = 771 kip-ft`, `phi Mn = 694 kip-ft`
> -- well above the singly-reinforced capacity the same section could reach, exactly the case `rc-beam-flexure` defers. The
> singly-reinforced tile bends the shallow beam; this tile bends the deep-demand beam with compression steel.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The width `b`, effective depth
`d`, compression-steel depth `d'` are lengths (in); `As`, `A's` are areas (in^2); `f'c`, `fy` are stresses (psi); the
stress-block depth `a`, neutral axis `c`, and steel strains are lengths and dimensionless; the nominal and design moments
are moments (reported in kip-ft). The v18/v21 contract: any non-finite input, or any dimension/area/strength at or below
zero, or `As <= A's` (no net tension couple), returns `{ error }`; the compression-steel-yields assumption is checked
(`epsilon's >= epsilon_y`) and flagged if not met, and the tension-controlled `phi = 0.90` is confirmed against
`epsilon_t`. Citation discipline (v19/v22): `GOVERNANCE.general` over the ACI 318-19 doubly-reinforced flexure by name;
`editionNote` names **the ACI 318-19 doubly-reinforced rectangular-beam capacity `a = (As - A's) fy / (0.85 f'c b)`,
`Mn = (As - A's) fy (d - a/2) + A's fy (d - d')`, the compression-steel yield check `epsilon's = 0.003 (c - d')/c >= fy/Es`,
and the tension-controlled `phi = 0.90` at `epsilon_t >= 0.005`**, and states that **this assumes both steel layers yield
(flagged when the compression steel does not, where a rigorous solution would iterate with `f's = Es epsilon's <= fy`),
covers a rectangular section (no T-beam flange), and does not check minimum steel, bar spacing, or development; and this is a
design aid, not a substitute for a licensed engineer's design** -- the structural engineer of record's stamped design
governs.

## 2. The tile

### 2.1 `rc-doubly-reinforced` -- Doubly-Reinforced Concrete Beam Flexural Capacity (ACI 318-19)

```
inputs:
  b_in    in    beam width
  d_in    in    effective depth to tension steel
  dp_in   in    depth to compression steel (d')
  As_in2  in^2  tension steel area
  Asp_in2 in^2  compression steel area
  fc_psi  psi   concrete strength
  fy_psi  psi   steel yield strength

a  = (As - Asp) * fy / (0.85 * fc * b)         ; stress-block depth, in
c  = a / beta1                                  ; beta1 = 0.85 for fc <= 4000, step down above
eps_sp = 0.003 * (c - dp)/c                     ; compression-steel strain (check >= fy/Es)
eps_t  = 0.003 * (d - c)/c                      ; tension-steel strain (>= 0.005 => phi=0.90)
Mn = (As - Asp)*fy*(d - a/2) + Asp*fy*(d - dp)  ; lb-in -> report kip-ft
phiMn = phi * Mn                                ; phi = 0.90 if tension-controlled
```

**Pinned worked example (a 14 x 24 in beam, d = 22, d' = 2.0, As = 8.0, A's = 3.0, 4,000 psi Grade 60).**
`a = (8 - 3) x 60,000 / (0.85 x 4,000 x 14) = 300,000/47,600 = 6.30 in`; `c = 6.30/0.85 = 7.41 in`;
`epsilon's = 0.003(7.41 - 2.0)/7.41 = 0.00219 >= 0.00207` (compression steel yields);
`epsilon_t = 0.003(22 - 7.41)/7.41 = 0.0059 >= 0.005` (tension-controlled, `phi = 0.90`);
`Mn = 5 x 60 x (22 - 3.15) + 3 x 60 x (22 - 2.0) = 5,655 + 3,600 = 9,255 kip-in = 771 kip-ft`; `phi Mn = 694 kip-ft`.
**Cross-check (remove the compression steel, A's = 0, back to singly-reinforced).** `a = 8 x 60/(0.85 x 4 x 14) = 10.08 in`,
`Mn = 8 x 60 x (22 - 5.04) = 8,141 kip-in = 678 kip-ft` -- lower and with a deeper stress block, confirming the compression
steel both raised the capacity and shrank `a` (relieving the concrete). The non-finite, non-positive, and `As <= A's` error
paths bracket the result, and the compression-steel-yield flag fires when `epsilon's < epsilon_y`.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","carpentry"]`, matching `rc-beam-flexure`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the ACI 318-19 doubly-reinforced flexure, `editionNote`
naming `a`, `Mn`, the compression-steel-yield check, and the both-yield, rectangular, not-min-steel caveats);
`test/fixtures/worked-examples.json` (the doubly-reinforced example + the singly-reinforced cross-check);
`test/fixtures/compute-map.js` (`rc-doubly-reinforced` -> `computeRcDoublyReinforced` in `../../calc-concrete.js`);
`scripts/related-tiles.mjs` (-> `rc-beam-flexure` / `rc-beam-shear` / `rc-column-axial` / `rebar-schedule`);
`data/search/aliases.json` ("doubly reinforced beam", "compression steel", "A's beam", "double reinforced", "ACI beam
compression bars", "top steel beam", "deep demand beam", "two layer reinforcement", "compression reinforcement"); the id
appended to the existing concrete renderers block in `app.js`; the `// dims:` annotation (lengths length, areas area,
strengths stress, strains dimensionless, moments moment); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning both examples, the compression-steel-yield flag, the tension-controlled `phi` check, and the non-positive /
`As <= A's` / non-finite error seams. No new module; re-pin `calc-concrete.js` on the `check:module-sizes` allowlist.
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the yield-and-phi assertions); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `a` / `c` / strains / `Mn` / `phiMn`
stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (14x24, As 8 A's 3 -> 771 kip-ft Mn, 694
design).

## 5. Roadmap position

Middle of the reinforced-concrete depth-2 batch (v299..v301) in `calc-concrete.js`, closing the compression-steel gap
`rc-beam-flexure` names. Shear friction (v301) follows. The non-yielding-compression-steel iteration, the T-beam
(flanged-section) flexure, and the minimum/maximum flexural steel limits (9.6.1) are the deliberate next follow-ons once the
trio lands.
