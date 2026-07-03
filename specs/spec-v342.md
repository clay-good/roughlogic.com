# roughlogic.com Specification v342 -- Cross-Section Properties (Area, Moment of Inertia, Section Modulus, Radius of Gyration) (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.120.0). Batch spec-v341..v343 (the mechanics-of-materials trio -- cantilever beam
> (v341), the cross-section properties (this spec), combined axial-plus-bending stress (v343)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: every beam, column, and stress calculation needs the
> section's area, moment of inertia, section modulus, and radius of gyration, but the catalog has no tile that computes them
> from dimensions for the common shapes -- rectangle, solid round, pipe, and tube. The beam tiles take `I` as a given; this
> tile produces it. Adds one tile to the existing **`calc-construction.js`** module (Group E); no new group, trade, or
> dependency. Inherits spec.md through spec-v341.md.
>
> **The gap, and the evidence for it.** The elastic section properties follow from the geometry: for a rectangle
> `A = b h`, `I = b h^3/12`, `S = b h^2/6`, `r = sqrt(I/A) = h/sqrt(12)`; for a solid round `A = pi d^2/4`, `I = pi d^4/64`,
> `S = pi d^3/32`, `r = d/4`; for a hollow round or rectangle, the same forms with the inner subtracted. For a nominal 2x8
> (actual 1.5 x 7.25 in), `A = 10.9 in^2`, `I = 1.5 x 7.25^3/12 = 47.6 in^4`, `S = 13.1 in^3`, `r = 2.09 in` -- the moment
> of inertia a joist-deflection check needs and the section modulus an allowable-moment check needs, both off the lumber's
> actual dimensions. The `h^3` in `I` is why depth beats width for stiffness, the intuition the numbers make exact. The
> beam and column tiles consume these; this tile computes them.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The dimensions (width, height,
diameters) are lengths (in); the area is an area (in^2); the moment of inertia is a length^4 (in^4); the section modulus is
a length^3 (in^3); the radius of gyration and the extreme-fiber distance `c` are lengths (in). The v18/v21 contract: any
non-finite input, a dimension at or below zero, or a hollow section whose inner dimension is not smaller than the outer,
returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the section-property formulas by name;
`editionNote` names **the elastic section properties -- rectangle `I = b h^3/12`, `S = b h^2/6`; solid round
`I = pi d^4/64`, `S = pi d^3/32`; hollow forms by subtraction; `r = sqrt(I/A)`, `S = I/c` -- for bending about the given
axis, as compiled in the standard references (AISC/Machinery's Handbook)**, and states that **this returns the elastic
(not plastic `Z`) section properties about the labeled bending axis for a rectangle, solid round, pipe, or rectangular
tube -- it is a single simple shape (a built-up or composite section uses the parallel-axis theorem, a follow-on), gives the
geometric properties only (not the material strength), and the strong-axis convention is height = depth; and this is a
computational aid** -- the member's actual (not nominal) dimensions govern.

## 2. The tile

### 2.1 `section-properties` -- Cross-Section Properties (A, I, S, r)

```
inputs:
  shape    -    rectangle | round | pipe | tube
  b_in     in   width (rectangle/tube)
  h_in     in   height/depth (rectangle/tube, bending-axis dimension)
  d_in     in   outer diameter (round/pipe)
  di_in    in   inner diameter (pipe) / bo,ho inner (tube)

rectangle: A=b*h ; I=b*h^3/12 ; c=h/2 ; S=I/c=b*h^2/6 ; r=sqrt(I/A)
round:     A=pi*d^2/4 ; I=pi*d^4/64 ; c=d/2 ; S=pi*d^3/32 ; r=d/4
pipe:      A=pi*(d^2-di^2)/4 ; I=pi*(d^4-di^4)/64 ; c=d/2 ; S=I/c ; r=sqrt(I/A)
tube:      A=b*h-bi*hi ; I=(b*h^3-bi*hi^3)/12 ; c=h/2 ; S=I/c ; r=sqrt(I/A)
```

**Pinned worked example (a nominal 2x8, actual 1.5 x 7.25 in, strong axis).** `A = 1.5 x 7.25 = 10.9 in^2`;
`I = 1.5 x 7.25^3/12 = 47.6 in^4`; `S = 1.5 x 7.25^2/6 = 13.1 in^3`; `c = 3.625 in`; `r = sqrt(47.6/10.9) = 2.09 in`.
**Cross-check (a 2 in solid round bar).** `A = pi x 2^2/4 = 3.14 in^2`; `I = pi x 2^4/64 = 0.785 in^4`;
`S = pi x 2^3/32 = 0.785 in^3`; `r = 2/4 = 0.50 in` -- and turning the 2x8 on its weak axis (`b = 7.25`, `h = 1.5`) drops
`I` to `2.0 in^4`, a 24x loss, the `h^3` penalty for loading a board flatwise. The non-finite, non-positive, and
inner-not-smaller-than-outer error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","carpentry","welding"]`, matching the beam tiles); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the section-property formulas, `editionNote`
naming the rectangle/round/pipe/tube forms, `r = sqrt(I/A)`, `S = I/c`, and the single-shape, elastic-not-plastic,
actual-dimensions caveats); `test/fixtures/worked-examples.json` (the 2x8 example + the round-bar/weak-axis cross-check);
`test/fixtures/compute-map.js` (`section-properties` -> `computeSectionProperties` in `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `cantilever-beam` / `beam-loading` / `combined-stress-axial-bending` / `metal-weight`);
`data/search/aliases.json` ("section properties", "moment of inertia", "section modulus", "radius of gyration", "I beam
property", "area moment inertia", "S section modulus", "bh cubed over 12", "cross section properties"); the id appended to
the existing construction renderers block in `app.js`; the `// dims:` annotation (dimensions length, `A` area, `I`
length^4, `S` length^3, `r`/`c` length); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples, the four shape branches, the strong-vs-weak-axis `h^3` behavior, and the non-positive / inner-ge-outer /
non-finite error seams. No new module; re-pin `calc-construction.js` on the `check:module-sizes` allowlist. Lazy-loaded,
absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the shape-branch assertions); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `A` / `I` / `S` / `r` stack wraps on
a phone); render-no-nan + a11y sweep, output read to the value (2x8 -> I 47.6 in^4, S 13.1 in^3).

## 5. Roadmap position

Middle of the mechanics-of-materials batch (v341..v343) in `calc-construction.js`, producing the `I` and `S` the beam tiles
consume. Combined stress (v343) follows. A built-up/composite section via the parallel-axis theorem, the plastic modulus
`Z`, and a channel/angle/tee shape library are the deliberate next follow-ons once the trio lands.
