# roughlogic.com Specification v413 -- Steel Beam Camber from Dead-Load Deflection (calc-steel.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-03). Third and final tile of the steel composite-beam trio (v411 shear stud strength ->
> v412 composite flexure -> v413 beam camber). Long composite floor beams deflect under the wet concrete before it cures;
> this tile computes that dead-load deflection and the shop camber a fabricator should cold-bend into the beam so it ends up
> flat.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A steel floor beam sags under the weight of the wet
> slab; to leave a level floor, the fabricator cambers the beam upward by roughly `80%` of the calculated dead-load
> deflection, rounded to the nearest `1/4 in`. The deflection of a simply supported beam under a uniform load is
> `delta = 5*w*L^4 / (384*E*I)`. Nothing in the catalog computes deflection or camber. This adds the camber tile to the
> existing **`calc-steel.js`** module (Group E); no new group, trade, or dependency. Inherits spec.md through spec-v412.md.
>
> **The gap, and the evidence for it.** A `40 ft` beam (`I = 2100 in^4`) under a `1.0 kip/ft` dead load deflects
> `delta = 5*(1.0/12)*480^4 / (384*29000*2100) = 0.95 in`; `80%` of that is `0.76 in`, which rounds to a `3/4 in` shop
> camber. A short `20 ft` beam under a light load deflects only `0.05 in`, below the practical `~3/4 in` minimum, so it is
> left uncambered. No tile does this; a detailer specifying camber on a shop drawing had no deflection number.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The dead load `w` is a
line load (kip/ft); the span `L` is a length (ft); the modulus `E` is a pressure (ksi); the moment of inertia `I` is a
length to the fourth (in^4); the deflection and camber are lengths (in). The v18/v21 contract: any non-finite input, or a
non-positive load, span, modulus, or moment of inertia, returns `{ error }`; the camber fraction defaults to `0.80` and the
rounding increment to `1/4 in`, and the tile returns the dead-load deflection, the recommended camber, and a note that a
camber below the practical minimum (about `3/4 in`, or spans under about `24 ft`) is typically left flat. Citation discipline
(v19/v22): `GOVERNANCE.general` over steel beam camber by name; `editionNote` names **the simple-span uniform-load
deflection `delta = 5*w*L^4 / (384*E*I)`, the AISC/fabrication practice of cambering to about `80%` of the calculated
dead-load deflection rounded to `1/4 in`, `E = 29000 ksi` for steel, and the practical minimum camber (about `3/4 in`)**,
and states that **this returns the dead-load deflection and recommended shop camber for a uniformly loaded simple span, that
the dead load is the deflection-causing load (wet concrete plus steel, not the live load), and that it is a detailing aid,
not a substitute for the fabricator's standard practice or the engineer of record**.

## 2. The tile

### 2.1 `steel-camber` -- Steel Beam Camber from Dead-Load Deflection

```
inputs:
  w_kip_ft   kip/ft   uniform dead load (deflection-causing)
  span_ft    ft       simple span
  moi_in4    in^4     moment of inertia
  e_ksi      ksi      modulus (default 29000)
  fraction   -        camber fraction of DL deflection (default 0.80)

L        = span_ft * 12
defl_in  = 5 * (w_kip_ft/12) * L^4 / (384 * e_ksi * moi_in4)
camber   = round( fraction * defl_in  to nearest 1/4 in )
```

**Pinned worked example (1.0 kip/ft, 40 ft, I 2100 in^4).** `delta = 5*(1.0/12)*480^4/(384*29000*2100) = 0.95 in`;
`camber = round(0.80*0.95 = 0.76) = 3/4 in`. **Cross-check (a short beam is left flat).** A `20 ft` beam under `0.5 kip/ft`
(`I 1350`) deflects `0.05 in`; `80%` is `0.04 in`, well below the `~3/4 in` practical minimum, so it is not cambered. A
non-positive load, span, modulus, or moment of inertia takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["welding", "construction"]`, beside `steel-beam-flexure` /
`composite-beam-flexure`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, steel camber,
`editionNote` naming the deflection relation, the `80%`/`1/4 in` camber practice, and the practical minimum);
`test/fixtures/worked-examples.json` (the cambered example + the left-flat cross-check); `test/fixtures/compute-map.js`
(`steel-camber` -> `computeSteelCamber` in `../../calc-steel.js`); `scripts/related-tiles.mjs` (-> `composite-beam-flexure`
/ `steel-beam-flexure` / `shear-stud-strength` / `beam-loading`); `data/search/aliases.json` ("steel camber", "beam
camber", "dead load deflection", "camber calculator", "5wL4/384EI", "shop camber", "beam deflection steel", "camber
fabrication", "floor beam camber"); the id appended to the existing steel renderers block in `app.js`; the `// dims:`
annotation (load line-load, span/deflection/camber length, E pressure, I length^4); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the rounding, the practical-minimum note, and the non-positive /
non-finite error seams. No new module; re-pin `calc-steel.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent
from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the rounding, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the deflection / camber output wraps on a phone);
render-no-nan + a11y sweep, output read to the value (1.0 kip/ft, 40 ft -> 0.95 in defl, 3/4 in camber).

## 5. Roadmap position

Closes the steel composite-beam trio: v411 sizes the studs, v412 the composite moment, and v413 cambers out the dead-load
sag of the long spans composite framing enables. A live-load deflection check against `L/360` and a ponding-stability tile
are the deliberate next follow-ons.
