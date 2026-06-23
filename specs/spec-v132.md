# roughlogic.com Specification v132 -- Eccentrically Loaded Fillet Weld Group (Elastic Method) (calc-fab.js, Group E, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v129..v135.** In-scope catalog expansion under the
> spec-v106 trades-only charter: one fabrication tile from the public AISC elastic (vector) method
> for an eccentrically loaded weld group, engineer-of-record governed, redo-not-harm. Adds one tile
> to **`calc-fab.js`** (Group E); no new module, group, or dependency. Inherits spec.md through
> spec-v131.md.
>
> **The gap, and the evidence for it.** The catalog sizes a concentrically loaded fillet
> (`fillet-weld-strength`) and a groove weld (`groove-weld-strength`), but never a weld group whose
> load misses the centroid -- a bracket, a clip angle, a shelf, the everyday connection where the
> torsional term, not the direct shear, sizes the weld. The elastic (line) method is the long-hand
> AISC procedure for exactly that, and a fabricator or detailer has no tile to run it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply.
The weld is treated as a line of unit throat: weld length is `L`, the line "polar moment" J is
`L^3`, the applied load is a force, the eccentricity is `L`, and the resulting unit force is force
per length (lb/in). The fillet-leg allowable (E70: 0.928 kip/in per 1/16 in of leg, ASD) is an
annotated editable field. The v18/v21 contract: any non-finite input, or a non-positive weld length
or plate dimension, returns `{ error }`; the only divisions are by a guarded-positive total weld
length and a guarded-positive polar moment. Citation discipline (v19/v22):
`GOVERNANCE.engineer_of_record`, edition `AISC 360 / AISC Steel Construction Manual Part 8 elastic
(vector) method for eccentric weld groups`, by name; this is the conservative elastic method (not
the instantaneous-center tables), a screen, and the engineer of record governs the connection.

## 2. The tile

### 2.1 `weld-group-eccentric` -- Two Vertical Fillet Welds Under In-Plane Eccentric Load (Elastic Method)

```
inputs:
  load_lb        force          in-plane load P (vertical), at eccentricity e
  ecc_in         L              horizontal eccentricity from the weld-group centroid
  weld_len_in    D              length of each of the two vertical welds
  separation_in  B              horizontal distance between the two vertical welds
  allow_per_16   force/L        fillet allowable per 1/16 in leg (default 928 lb/in, E70 ASD)

L_w   = 2 x D                                   # total weld length (line)
Ix    = D^3 / 6                                 # about horizontal centroidal axis
Iy    = D x B^2 / 2                             # about vertical centroidal axis
J     = Ix + Iy                                 # line polar moment (in^3)
f_d   = P / L_w                                 # direct shear, vertical (lb/in)
T     = P x ecc_in                              # torsional moment (in-lb)
f_tx  = T x (D/2) / J                           # torsional comp, horizontal (lb/in)
f_ty  = T x (B/2) / J                           # torsional comp, vertical (lb/in)
f_r   = sqrt( f_tx^2 + (f_d + f_ty)^2 )         # resultant at the critical corner (lb/in)
req_leg_16 = ceil( f_r / allow_per_16 )         # required fillet leg, sixteenths
```

**Pinned worked example.** P = 12,000 lb at e = 6 in; two D = 10 in welds, B = 4 in apart:
`L_w = 20 in`, `f_d = 12000/20 = 600 lb/in`; `Ix = 1000/6 = 166.7`, `Iy = 10 x 16 / 2 = 80`,
`J = 246.7 in^3`; `T = 72,000 in-lb`; `f_tx = 72000 x 5 / 246.7 = 1,459 lb/in`,
`f_ty = 72000 x 2 / 246.7 = 584 lb/in`; `f_r = sqrt(1459^2 + (600 + 584)^2) = sqrt(1459^2 + 1184^2)
= 1,879 lb/in`; `req_leg = ceil(1879 / 928) = 3` -> a 3/16 in fillet (then check the AISC minimum
fillet for the plate thickness). **Cross-check (concentric, e = 0).** The torsional term vanishes:
`f_r = f_d = 600 lb/in`, `req_leg = ceil(600/928) = 1` (1/16, governed by the minimum fillet) --
the eccentricity tripled the demand, the whole point of running the method. The engineer of record
governs.

## 3. Wiring

A `tools-data.js` row (group `E`, trade `["welding", "construction"]`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.engineer_of_record`, AISC 360 / Manual Part 8 elastic
method, the J / direct / torsional / resultant formulas, the 928 lb/in E70 ASD allowable listed,
`editionNote` noting AISC edition cycles and the elastic-vs-instantaneous-center conservatism, the
screen scope); `test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-
map.js` (`weld-group-eccentric` -> `computeWeldGroupEccentric` in `../../calc-fab.js`);
`scripts/related-tiles.mjs` (-> `fillet-weld-strength` / `groove-weld-strength` /
`flange-bolt-torque`); `data/search/aliases.json` ("eccentric weld", "weld group", "elastic method",
"bracket weld", "torsion on weld", "polar moment weld"); the id appended to the existing
`FAB_RENDERERS` declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index;
a `bounds-fuzzer.test.js` block pinning the example, cross-check (e = 0 path), and error seams
(non-finite, length/separation <= 0). Raise the `calc-fab.js` size cap by ~20 percent if needed
(dated comment); bump the `citations.js` cap if needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the resultant and required-
leg lines wrap on a phone); render-no-nan + a11y sweep, output read to the value (12 kip at 6 in,
two 10 in welds 4 in apart -> 1,879 lb/in, 3/16 in fillet).

## 5. Roadmap position

Completes the weld-strength family (concentric fillet, groove, now eccentric group). Further Group E
growth stays evidence-driven.
