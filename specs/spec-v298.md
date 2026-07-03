# roughlogic.com Specification v298 -- Main Wind-Force-Resisting-System Wall Pressure (ASCE 7 Ch. 27) (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v296..v298 (the ASCE 7 wind-and-snow load depth trio -- C&C
> pressure (v296), snow drift (v297), the MWFRS pressure (this spec)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: `wind-pressure` gives the velocity pressure and
> `wind-cc-pressure` (v296) gives the local cladding suction, but the lateral force the whole building must resist -- the
> windward-plus-leeward wall pressure that loads the diaphragm, the shear walls, and the overturning anchors -- follows the
> ASCE 7 Chapter 27 MWFRS equation with the gust factor `G` and the wall `Cp`. Adds one tile to the existing
> **`calc-construction.js`** module (Group E); no new group, trade, or dependency. Inherits spec.md through spec-v297.md.
>
> **The gap, and the evidence for it.** ASCE 7 §27.3.1 takes the MWFRS design wall pressure as `p = q G Cp - qi (GCpi)`,
> where `q` is the velocity pressure (`qz` windward, `qh` leeward), `G = 0.85` the gust-effect factor for a rigid building,
> `Cp` the wall pressure coefficient (`+0.8` windward, `-0.5` leeward for a typical building), and `GCpi = +/-0.18`
> (enclosed). For a 115 mph, Exposure C building with `qh = 25.9 psf`, the windward wall carries
> `p = 25.9 x 0.85 x 0.8 - 25.9(-0.18) = +22.3 psf` and the leeward wall `25.9 x 0.85 x (-0.5) - 25.9(0.18) = -15.7 psf`,
> for a net horizontal design pressure of `37.9 psf` -- the pressure the story force, the `seismic-base-shear` comparison,
> and the `diaphragm-shear` load all start from, and one neither `wind-pressure` nor the C&C tile provides. `wind-cc-pressure`
> sizes the fastener; this tile sizes the lateral system.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The velocity pressures `qz`,
`qh` and the design pressures are pressures (psf); the gust factor `G`, wall coefficients `Cp`, and internal `GCpi` are
dimensionless. The v18/v21 contract: any non-finite input, or a velocity pressure at or below zero, returns `{ error }`;
the internal pressure cancels in the net (windward minus leeward) when the same enclosure sign is used, which the tile
notes. Citation discipline (v19/v22): `GOVERNANCE.general` over the ASCE 7 Chapter 27 MWFRS provisions by name;
`editionNote` names **the ASCE 7-22 §27.3.1 MWFRS pressure `p = q G Cp - qi (GCpi)`, `G = 0.85` (rigid), the wall `Cp`
(`+0.8` windward, `-0.5` leeward for L/B <= 1), and `GCpi = +/-0.18` (enclosed)**, and states that **this returns the
windward and leeward wall MWFRS pressures and their net horizontal sum for a rectangular enclosed building -- it uses the
entered `qz`/`qh` (from `wind-pressure`) and wall `Cp`, `G = 0.85` (not the flexible-building `Gf`), and does not compute the
roof MWFRS pressures, the internal-pressure effect on the roof diaphragm, or the torsional (Case 2-4) load patterns; and
this is a design aid, not a substitute for the engineer of record** -- the structural engineer of record's stamped design
governs.

## 2. The tile

### 2.1 `wind-mwfrs-pressure` -- MWFRS Wall Pressure (ASCE 7 Ch. 27)

```
inputs:
  qz_psf   psf   windward velocity pressure (at height z)
  qh_psf   psf   leeward velocity pressure (at mean roof height)
  Cp_ww    -     windward wall Cp (default +0.8)
  Cp_lw    -     leeward wall Cp (default -0.5)
  G        -     gust-effect factor (default 0.85)
  GCpi     -     internal pressure magnitude (default 0.18 enclosed)

p_ww = qz_psf * G * Cp_ww - qh_psf * (-GCpi)         ; windward wall design pressure, psf
p_lw = qh_psf * G * Cp_lw - qh_psf * (+GCpi)         ; leeward wall design pressure, psf
p_net = p_ww - p_lw                                  ; net horizontal design pressure, psf
```

**Pinned worked example (115 mph, Exposure C, qz = qh = 25.9 psf, enclosed).** `qz = qh = 25.9`, `Cp_ww = 0.8`,
`Cp_lw = -0.5`, `G = 0.85`, `GCpi = 0.18`: `p_ww = 25.9 x 0.85 x 0.8 - 25.9(-0.18) = 17.6 + 4.7 = 22.3 psf` (pushing in);
`p_lw = 25.9 x 0.85 x (-0.5) - 25.9(0.18) = -11.0 - 4.7 = -15.7 psf` (suction, pulling out); `p_net = 22.3 - (-15.7) = 37.9 psf`
of net horizontal pressure the lateral system resists. **Cross-check (a taller windward wall, qz raised to 32 psf).** Hold
the leeward `qh = 25.9`: `p_ww = 32 x 0.85 x 0.8 + 32 x 0.18 = 21.8 + 5.8 = 27.5 psf`; using the consistent internal-pressure
sign, the net simplifies to `qz G Cp_ww - qh G Cp_lw = 32 x 0.85 x 0.8 - 25.9 x 0.85 x (-0.5) = 21.8 + 11.0 = 32.8 psf` --
the internal pressure cancels in the net, the reason the story force is insensitive to enclosure while the individual walls
are not. The non-finite and non-positive-`q` error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["carpentry","construction"]`, matching `wind-pressure`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the ASCE 7 Ch. 27 MWFRS provisions, `editionNote` naming
`p = q G Cp - qi(GCpi)`, `G = 0.85`, the wall `Cp` values, and the rigid-building, walls-only, enclosed caveats);
`test/fixtures/worked-examples.json` (the equal-q example + the taller-windward cross-check); `test/fixtures/compute-map.js`
(`wind-mwfrs-pressure` -> `computeWindMwfrsPressure` in `../../calc-construction.js`); `scripts/related-tiles.mjs` (->
`wind-pressure` / `wind-cc-pressure` / `diaphragm-shear` / `seismic-base-shear`); `data/search/aliases.json` ("MWFRS",
"main wind force resisting system", "wind wall pressure", "ASCE 7 chapter 27", "windward leeward pressure", "gust factor G",
"net wind pressure", "lateral wind load", "wind story force"); the id appended to the existing construction renderers block
in `app.js`; the `// dims:` annotation (pressures pressure, `G`/`Cp`/`GCpi` dimensionless); regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the windward/leeward split, the net-cancels-internal
identity, and the non-positive / non-finite error seams. No new module; re-pin `calc-construction.js` on the
`check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the net-pressure assertion); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `p_ww` / `p_lw` / `p_net` stack
wraps on a phone); render-no-nan + a11y sweep, output read to the value (25.9 psf -> +22.3 / -15.7, net 37.9 psf).

## 5. Roadmap position

Closes the ASCE 7 wind-and-snow load depth batch (v296..v298) in `calc-construction.js`: the velocity pressure, the local
C&C envelope pressure, and now the whole-building MWFRS pressure that feeds `diaphragm-shear` and the shear-wall tiles. The
roof MWFRS pressures, the flexible-building gust factor `Gf`, and the torsional load-case patterns are the deliberate next
follow-ons once the trio lands. With this batch the ASCE 7 load set spans wind (velocity, C&C, MWFRS), snow (balanced,
drift), rain, seismic, and the load combinations that resolve them.
