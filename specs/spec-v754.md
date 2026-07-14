# roughlogic.com Specification v754 -- Required Moment of Inertia for a Deflection Limit (calc-steel.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-steel.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v753.md. Explore sweep #14 (entry 9, final clean
> candidate).
>
> **The gap, and the evidence for it.** The `steel-camber` tile runs the simple-span deflection forward: from a moment of
> inertia it returns the dead-load deflection (and camber). The beam-selection question is the inverse -- **the moment of
> inertia a beam needs to hold the deflection to a limit**. From `delta = 5 w L^4 / (384 E I)` (L = span x 12),
> `I = 5 w L^4 / (384 E delta_allow)`. The number this settles: a **1.0 kip/ft**, **40 ft** beam held to **1.0 in** needs
> Ix about **1,986 in^4**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the `steel-camber`
sibling: the uniform load is `M T^-2` (kip/ft), the span and allowable deflection are `L` (ft, in), the modulus is
`M L^-1 T^-2` (ksi), and the returned moment of inertia is `L^4`. It reuses the sibling's simple-span uniform-load
deflection, solved for the moment of inertia. The v18/v21 contract: any non-finite input, a non-positive load, span,
allowable deflection, or modulus returns `{ error }`. Citation discipline (v19/v22): the deflection relation solved for
the inertia, `GOVERNANCE.general` matching the sibling; the note gives the common **span/360** (live) and **span/240**
(total) limits, notes the **L^4** span sensitivity, says to pick a rolled shape with **at least** this Ix and **verify
strength separately**, and that this sizes for **stiffness only** with the entered load being the **service** load.

## 2. The tile

### 2.1 `steel-inertia-for-deflection` -- Required Moment of Inertia for a Deflection Limit

```
inputs:
  w_kip_ft        M T^-2        uniform (service) load (kip/ft, > 0)
  span_ft         L             simple span (ft, > 0)
  allow_defl_in   L             allowable deflection (in, > 0)
  e_ksi           M L^-1 T^-2   modulus E (ksi, > 0; default 29000)

L                = span_ft x 12
required_moi_in4 = 5 x (w_kip_ft / 12) x L^4 / (384 x e_ksi x allow_defl_in)
span_over_defl   = L / allow_defl_in
```

**Pinned worked example.** w = 1.0 kip/ft, span = 40 ft, allow = 1.0 in, E = 29,000 ksi:
`L = 480 in`, `I = 5 x (1/12) x 480^4 / (384 x 29000 x 1.0) = ` **1,986 in^4** (span/480 limit). Feeding 1,986 in^4 back
through `steel-camber` at the same beam returns a 1.0 in deflection, the limit. A tighter 0.5 in limit doubles the required
Ix to ~3,972 in^4.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["welding","construction"]`) placed beside `steel-camber` (Group E is not
exact-count audited); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (deflection relation solved for the inertia,
`GOVERNANCE.general` matching the sibling); `test/fixtures/worked-examples.json` (the pinned example);
`test/fixtures/compute-map.js` (`steel-inertia-for-deflection` -> `computeSteelInertiaForDeflection`);
`scripts/related-tiles.mjs` (-> `steel-camber` / `steel-beam-flexure` / `beam-loading`); `data/search/aliases.json` (5
collision-checked question aliases: "moment of inertia for deflection", "inertia for l360", ...); the calc-steel
`STEEL_RENDERERS` map entry via the shared `_simpleRenderer` factory (four number fields) and the id added to the
calc-steel declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus +
tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the round-trip through
`computeSteelCamber` across a load/span/deflection sweep, the tighter-limit-stiffer and longer-span-much-stiffer (L^4)
behavior, and the error seams. The calc-steel.js gzip cap (raised to 26000 B in this spec) covers the addition. Verify at
build, including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,202 -> 1,203.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 1,986 in^4 for a 1.0 kip/ft
40 ft beam held to 1.0 in).

## 5. Roadmap position

Pairs the forward camber tile (`steel-camber`, deflection from the inertia) with its inverse (the inertia for a
deflection), the two halves of the deflection-driven beam-selection question. Closes the clean run of Explore sweep #14
(entry #6 gas-leak-hole-diameter remains, pending a calc-gas review). Further Group E steel growth stays evidence-driven.
