# roughlogic.com Specification v412 -- Composite Beam Flexural Strength (AISC 360-22 I3) (calc-steel.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-03). Second tile of the steel composite-beam trio (v411 shear stud strength -> v412 composite
> flexure -> v413 beam camber). `steel-beam-flexure` gives the bare-steel plastic moment; this tile gives the fully composite
> moment, where the studs make the concrete slab carry the compression and the moment arm grows to the slab -- the real
> capacity of a composite floor beam.**
> In-scope catalog expansion under the spec-v106 trades-only charter. When shear studs fully connect a steel beam to its
> slab, the beam yields in tension while the slab takes compression. For full composite action with the plastic neutral axis
> in the slab, the compression block depth is `a = As*Fy / (0.85*f'c*be)` and the nominal moment is
> `Mn = As*Fy * (d/2 + t_slab - a/2)`, with `phi = 0.90`. `steel-beam-flexure` is bare steel only; nothing computes
> composite `Mn`. This adds the composite-flexure tile to the existing **`calc-steel.js`** module (Group E); no new group,
> trade, or dependency. Inherits spec.md through spec-v411.md.
>
> **The gap, and the evidence for it.** A steel section with `As = 8.0 in^2`, `Fy = 50 ksi`, depth `d = 16 in`, under a
> `4 in` slab on an effective width `be = 90 in` of `4 ksi` concrete: the steel tension force is `C = As*Fy = 400 kip`, the
> compression block depth is `a = 400 / (0.85*4*90) = 1.31 in` (inside the slab, so the neutral axis is in the concrete), and
> `Mn = 400 * (16/2 + 4 - 1.31/2) = 400 * 11.35 = 4539 kip-in = 378 kip-ft`, so `phi*Mn = 340 kip-ft`. The bare `steel-beam-
> flexure` on the same section would give roughly half that -- the composite jump is why floors are framed this way. No tile
> does it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The steel area `As` is an area
(in^2); `Fy` and `f'c` are pressures (ksi); the depth `d`, slab thickness `t_slab`, effective width `be`, and block depth
`a` are lengths (in); the moment is a moment (kip-ft). The v18/v21 contract: any non-finite input, or a non-positive area,
strength, or dimension, returns `{ error }`; the tile assumes full composite action with the plastic neutral axis in the
slab and flags the case `a > t_slab` (PNA in the steel, requiring the more detailed method) rather than returning a wrong
`Mn`, and reports `Mn` and `phi*Mn`. Citation discipline (v19/v22): `GOVERNANCE.general` over the AISC composite flexural
strength by name; `editionNote` names **AISC 360-22 §I3.2, full composite action with PNA in the slab, the block depth
`a = As*Fy/(0.85*f'c*be)`, the nominal moment `Mn = As*Fy*(d/2 + t_slab - a/2)`, `phi = 0.90`, and `be` from the effective-
width rules (see `t-beam-effective-flange-width`)**, and states that **this returns the fully composite nominal and design
moment with the PNA in the slab, that partial composite action or a PNA in the steel needs the general method, and that it
is a design aid, not a substitute for the engineer of record**.

## 2. The tile

### 2.1 `composite-beam-flexure` -- Composite Beam Flexural Strength (AISC 360-22)

```
inputs:
  as_in2      in^2   steel cross-sectional area
  fy_ksi      ksi    steel yield strength
  d_in        in     steel section depth
  tslab_in    in     slab thickness
  be_in       in     effective slab width
  fc_ksi      ksi    slab concrete strength f'c

C     = as_in2 * fy_ksi                       (kip)
a     = C / (0.85 * fc_ksi * be_in)           (in)  [require a <= tslab_in]
Mn    = C * (d_in/2 + tslab_in - a/2)         (kip-in)
phiMn = 0.90 * Mn / 12                          (kip-ft)
```

**Pinned worked example (As 8.0, Fy 50, d 16, slab 4, be 90, f'c 4).** `C = 400 kip`;
`a = 400/(0.85*4*90) = 1.31 in` (< 4, PNA in slab); `Mn = 400*(8 + 4 - 0.653) = 4539 kip-in = 378 kip-ft`;
`phi*Mn = 340 kip-ft`. **Cross-check (a narrower slab pushes the PNA down).** Cut `be` to `24 in` and `a = 4.9 in > 4 in`,
so the tile flags PNA-in-steel and defers to the general method rather than reporting a wrong `Mn`. A non-positive input
takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["welding", "construction"]`, beside `steel-beam-flexure` / `shear-stud-strength`);
a `tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, AISC 360-22 §I3.2, `editionNote` naming the
block-depth and `Mn` relations, `phi = 0.90`, and the PNA-in-slab assumption); `test/fixtures/worked-examples.json` (the
composite example + the PNA-in-steel flag cross-check); `test/fixtures/compute-map.js` (`composite-beam-flexure` ->
`computeCompositeBeamFlexure` in `../../calc-steel.js`); `scripts/related-tiles.mjs` (-> `shear-stud-strength` /
`steel-beam-flexure` / `t-beam-effective-flange-width` / `steel-camber`); `data/search/aliases.json` ("composite beam",
"composite flexure", "composite moment", "aisc i3", "composite beam strength", "steel concrete composite", "composite Mn",
"floor beam composite", "phi Mn composite"); the id appended to the existing steel renderers block in `app.js`; the
`// dims:` annotation (As area, strengths pressure, dims length, moment moment); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the PNA-in-slab check, and the non-positive / non-finite error seams.
No new module; re-pin `calc-steel.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the PNA flag, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the a / Mn / phiMn output wraps on a phone); render-no-nan +
a11y sweep, output read to the value (As 8, Fy 50 -> a 1.31 in, phiMn 340 kip-ft).

## 5. Roadmap position

The middle of the steel composite-beam trio: `shear-stud-strength` (v411) provides the connection that makes this composite
action possible, and `steel-camber` (v413) cambers out the dead-load deflection of the long spans it enables. A
partial-composite-action reduction and a lower-bound moment-of-inertia (for deflection) tile are the deliberate next
follow-ons.
