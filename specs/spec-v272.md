# roughlogic.com Specification v272 -- Flexible Wood Diaphragm Unit Shear and Chord Force (SDPWS) (calc-lateral.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02). Batch spec-v272..v274 (the SDPWS wood lateral-force-resisting-system trio -- how the
> lateral force the building already knows how to *demand* actually gets carried by the wood framing that resists it: the
> roof or floor diaphragm that collects the story force and spans it to the walls (this spec), the shear wall that takes
> that force down to the foundation with its holdown (v273), and the drift that same wall deflects under it (v274).
> Diaphragm / shear wall / deflection -- the load path from the `seismic-base-shear` demand into the wood.)**
> In-scope catalog expansion under the spec-v106 trades-only charter: carpentry is the catalog's largest trade, and the
> catalog now computes an ASCE 7 seismic base shear (`seismic-base-shear`), a wind velocity pressure (`wind-pressure`), and
> the NDS sawn-lumber member capacities (the v263..v265 batch), but nothing resolves how a diaphragm distributes that
> lateral force -- the unit shear the sheathing and its nailing must carry, and the chord (drag) force the perimeter member
> must take. Adds one tile to a new **`calc-lateral.js`** Group E cluster (SDPWS wood lateral system, beside the NDS-member,
> steel-member, reinforced-concrete, masonry, and geotechnical clusters); no new group, trade, or dependency. Inherits
> spec.md through spec-v271.md.
>
> **The gap, and the evidence for it.** A roof or floor diaphragm behaves as a deep horizontal beam: the lateral load `w`
> (plf, from wind or seismic on the wall tributary to the diaphragm edge) spans the length `L` between the end shear walls,
> and the diaphragm depth `b` (the dimension parallel to the load) is the beam's depth. The maximum unit shear the
> sheathing-to-framing nailing must carry is `v = w L / (2 b)` (plf), and the maximum chord force -- the tension and
> compression couple the diaphragm boundary members resolve the bending moment into -- is `T = C = M / b` with
> `M = w L^2 / 8`. For a `516 plf` load on a `192 ft` by `120 ft` diaphragm, `v = 516 x 192 / (2 x 120) = 413 plf`, the
> exact unit shear a WoodWorks diaphragm design example prints for that section -- the number a carpenter or plan reviewer
> compares against the SDPWS nailing-schedule allowable, and one no one wants to reduce from a shear-and-moment diagram at
> the framing table. `seismic-base-shear` and `wind-pressure` produce the load; this tile turns it into the unit shear and
> chord force the diaphragm is actually detailed for.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The distributed lateral load
`w` is a force per length (plf); the diaphragm span `L` (between the resisting shear-wall lines) and the diaphragm depth
`b` (parallel to the load) are lengths (ft); the end reaction `V` and the chord force `T = C` are forces (lb, reported
alongside in kip); the maximum moment `M` is a moment (lb-ft); the unit shear `v` is a force per length (plf). The v18/v21
contract: any non-finite input, a load below zero, or a span or depth at or below zero (a diaphragm cannot have zero depth
or span), returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the flexible-diaphragm beam analogy
by name; `editionNote` names **the AWC Special Design Provisions for Wind and Seismic (SDPWS) simple-span flexible-diaphragm
model -- the diaphragm as a deep beam with maximum unit shear `v = w L / (2 b)` at the supports and chord force
`T = C = M / b` from the maximum moment `M = w L^2 / 8`, as compiled in the AWC/APA engineered-wood-diaphragm design guides**,
and states that **this returns the maximum service-level unit shear and chord force of a simple-span, uniformly loaded
flexible diaphragm -- it assumes the diaphragm spans between two parallel resisting lines under a uniform load, is the
flexible-diaphragm (tributary-area) distribution rather than a rigid-diaphragm (relative-stiffness) one, and does not add
the collector/drag-strut force at intermediate lines, the diaphragm deflection, or openings; the unit shear is compared
against the SDPWS nominal capacity for the chosen sheathing and nailing (with the ASD reduction or the seismic factor); and
this is a design aid, not a substitute for the engineer of record's stamped lateral design** -- the structural engineer of
record's stamped design governs.

## 2. The tile

### 2.1 `diaphragm-shear` -- Flexible Wood Diaphragm Unit Shear and Chord Force (SDPWS)

```
inputs:
  w_plf    plf   uniform lateral load on the diaphragm (from wind or seismic)
  L_ft     ft    diaphragm span between the resisting shear-wall lines
  b_ft     ft    diaphragm depth parallel to the load (the beam depth)

V_lb   = w_plf * L_ft / 2                 ; end reaction (total shear at each support), lb
v_plf  = V_lb / b_ft                      ; = w L / (2 b), maximum unit shear, plf
M_ftlb = w_plf * L_ft^2 / 8               ; maximum diaphragm moment, lb-ft
chord_lb = M_ftlb / b_ft                  ; chord (drag) tension = compression, lb
chord_kip = chord_lb / 1000
```

**Pinned worked example (a 192 ft by 120 ft diaphragm at 516 plf, the WoodWorks section).** `w = 516 plf`, `L = 192 ft`,
`b = 120 ft`: `V = 516 x 192 / 2 = 49,536 lb`; `v = 49,536 / 120 = 413 plf` (`= 516 x 192 / (2 x 120)`), matching the unit
shear the published WoodWorks diaphragm example prints for this section to the plf. Moment `M = 516 x 192^2 / 8 =
516 x 36,864 / 8 = 2,377,728 lb-ft`; chord force `T = C = 2,377,728 / 120 = 19,814 lb = ` **19.8 kip** at the diaphragm
midspan, tension on one chord and compression on the other. **Cross-check (narrow the diaphragm to b = 60 ft).** Halve the
depth and hold the span and load: `v = 516 x 192 / (2 x 60) = 826 plf` and `chord = 2,377,728 / 60 = 39,629 lb = 39.6 kip`
-- both exactly double, the `1/b` dependence a deeper diaphragm rewards and a narrow one penalizes. The unit shear at
`413 plf` sits inside a blocked 15/32 in Structural I sheathing schedule; at `826 plf` it forces a heavier nailing or a
deeper diaphragm. The non-finite, `w_plf < 0`, `L_ft <= 0`, and `b_ft <= 0` error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["carpentry","construction"]`, matching the NDS-member and header tiles); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the SDPWS flexible-diaphragm beam analogy,
`editionNote` naming `v = w L / (2 b)` and `chord = w L^2 / (8 b)`, the AWC/APA engineered-wood-diaphragm compilation, and
the simple-span, flexible-distribution, no-collector/deflection/openings, compare-to-nailing-schedule, and design-aid
caveats); `test/fixtures/worked-examples.json` (the 192 x 120 at 516 plf example + the b = 60 ft cross-check);
`test/fixtures/compute-map.js` (`diaphragm-shear` -> `computeDiaphragmShear` in `../../calc-lateral.js`);
`scripts/related-tiles.mjs` (-> `shearwall-overturning` / `shearwall-deflection` / `seismic-base-shear` / `wind-pressure`);
`data/search/aliases.json` ("diaphragm shear", "wood diaphragm unit shear", "roof diaphragm design", "chord force
diaphragm", "drag strut force", "SDPWS diaphragm", "diaphragm as a deep beam", "how much shear in the roof sheathing",
"floor diaphragm lateral"); the id appended to a new `LATERAL_RENDERERS["diaphragm-shear"]=` block declared at the file end
of `app.js`'s lateral bundle; the `// dims:` annotation (`w_plf` force/length, `L_ft`/`b_ft` length, `v` force/length,
`chord` force); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the `V`/`M`
intermediates, the `1/b` scaling, and the four error seams (non-finite, `w_plf < 0`, `L_ft <= 0`, `b_ft <= 0`). Add the new
`calc-lateral.js` size to the `check:module-sizes` allowlist (dated comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the four error paths, the `1/b` assertion); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `V` / `v` / `M` / `chord` stack wraps on a
phone); render-no-nan + a11y sweep, output read to the value (192 x 120 at 516 plf -> 413 plf unit shear, 19.8 kip chord).

## 5. Roadmap position

Opens the SDPWS wood lateral-force-resisting-system batch (v272..v274) and the new `calc-lateral.js` module, the lateral
counterpart to the NDS sawn-lumber member trio (v263..v265): the members were sized, now the diaphragm and shear walls that
carry the lateral force into them. The shear wall the diaphragm reaction lands on -- unit shear plus holdown/overturning --
is v273; the drift that wall deflects is v274. A collector/drag-strut force at intermediate lines, a rigid-diaphragm
(relative-stiffness) distribution, and a diaphragm-deflection companion (the SDPWS diaphragm equation) are the deliberate
next follow-ons once the trio lands; with the batch complete the wood lateral cluster stands beside the NDS-member,
steel-member, reinforced-concrete, masonry, and geotechnical clusters in Group E.
