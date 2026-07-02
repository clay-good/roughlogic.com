# roughlogic.com Specification v266 -- Eccentric Bolt Group in Shear (Elastic Vector Method) (calc-steel.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-02, package 0.92.0; was PROPOSED 2026-07-02). Batch spec-v266..v268 (the AISC 360 steel-connection trio -- how the member trio
> v254..v256 actually gets bolted together: the eccentrically loaded bolt group at a bracket or shear tab (this spec), the
> single-bolt shear/bearing/tearout limit that caps each hole (v267), and the column base plate that lands the whole thing
> on concrete (v268). The catalog already does the *welded* eccentric group by the elastic method (`weld-group-eccentric`,
> calc-fab.js); this spec is its bolted twin.)**
> In-scope catalog expansion under the spec-v106 trades-only charter (steel erection and structural fabrication are
> first-class trades). The catalog sizes steel *members* (the `steel-beam-flexure` / `steel-beam-shear` /
> `steel-column-capacity` trio, spec-v254..v256, calc-steel.js) and resolves an eccentric *weld* group
> (`weld-group-eccentric`), but nothing resolves the force on the worst bolt of a *bolt* group loaded in-plane at an
> eccentricity -- the bracket, the seated-beam clip, the shear tab pulled off the column face. Adds one tile to the
> **`calc-steel.js`** Group E cluster (introduced by the steel-member trio); no new group, module, trade, or dependency.
> Inherits spec.md through spec-v265.md.
>
> **The gap, and the evidence for it.** A vertical load `P` applied at a horizontal eccentricity `e` from the centroid of a
> bolt group is carried two ways at once: a direct shear `P/n` shared equally by all `n` bolts, and a torsional shear
> `M = P x e` distributed in proportion to each bolt's distance from the centroid. The elastic (vector) method superposes
> them: with the group's polar moment `Ip = sum(x_i^2 + y_i^2)` (unit-area bolts), the torsional force on a bolt at
> `(x, y)` has components `M y / Ip` (horizontal) and `M x / Ip` (vertical), and the governing bolt is the corner where the
> vertical torsional component adds to the direct shear, giving a resultant
> `R = sqrt( (M y / Ip)^2 + (P/n + M x / Ip)^2 )`. For a 2-column by 3-row group at a 3 in gage and 3 in pitch under
> `P = 30 kip` at `e = 6 in`, that worst bolt sees about `15.1 kip` -- a number a detailer needs to compare against the bolt
> shear value (v267) but that no one wants to assemble from a polar-moment sum by hand at a layout table. The elastic method
> is the same one the catalog already trusts for welds, and the same one AISC documents as the conservative alternative to
> the instantaneous-center-of-rotation coefficient tables (which give a higher, less conservative capacity).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The applied load `P` is a
force (kip); the eccentricity `e`, the bolt gage `gx` and pitch `gy`, and the resulting centroid distances are lengths
(in); the bolt counts `nc` (columns) and `nr` (rows) are dimensionless integers; the moment `M = P x e` is a moment
(kip-in); the polar moment `Ip = sum(x^2 + y^2)` carries units of length squared (in^2, unit-area bolt convention); the
direct shear, the torsional components, and the resultant `R` are forces (kip). The v18/v21 contract: any non-finite
input, a load, eccentricity, gage, or pitch below zero, or a column/row count below 1 (which cannot form a group), returns
`{ error }`; a single bolt (`nc = nr = 1`) has `Ip = 0` and no torsional term, so the tile returns the pure direct shear
`P` with a note rather than dividing by zero. Citation discipline (v19/v22): `GOVERNANCE.general` over the elastic
(vector) bolt-group method by name; `editionNote` names **the AISC 360 / Steel Construction Manual elastic (vector)
method for an eccentrically loaded bolt group -- direct shear `P/n` superposed on torsional shear `M c / Ip` with
`Ip = sum(x_i^2 + y_i^2)` over unit-area bolts, the resultant taken at the critical bolt**, defaults the pattern to a
**2 x 3 group at a 3 in gage and 3 in pitch** and the load to an **in-plane vertical `P` at a horizontal eccentricity `e`
measured from the group centroid**, and states that **this is the conservative elastic method (the instantaneous-center-
of-rotation method of AISC Manual Part 7 gives a larger, less conservative capacity via the tabulated coefficient `C`); it
returns the resultant *force on the critical bolt*, which the user compares against the bolt's design shear / bearing
strength (v267); the group is assumed planar and rigid with the load in the plane of the faying surface; and this is a
design aid, not a substitute for a licensed engineer's connection design** -- the engineer of record's stamped design
governs.

## 2. The tile

### 2.1 `bolt-group-eccentric` -- Eccentric Bolt Group in Shear (Elastic Vector Method)

```
inputs:
  load_kip   kip   in-plane vertical load P on the group
  ecc_in     in    horizontal eccentricity e of P from the group centroid
  ncols      -     number of bolt columns nc (>= 1), default 2
  nrows      -     number of bolt rows nr (>= 1), default 3
  gage_in    in    horizontal spacing gx between columns, default 3
  pitch_in   in    vertical spacing gy between rows, default 3

n   = ncols * nrows                              ; total bolts
M   = load_kip * ecc_in                          ; torsional moment, kip-in
; centroidal coordinates (group centered on its centroid)
xmax = (ncols - 1) * gage_in / 2                 ; critical column offset
ymax = (nrows - 1) * pitch_in / 2                ; critical row offset
; polar moment of the unit-area bolts about the centroid
Ix  = ncols * pitch_in^2 * (nrows^3 - nrows) / 12    ; sum of y^2 over all bolts
Iy  = nrows * gage_in^2  * (ncols^3 - ncols) / 12    ; sum of x^2 over all bolts
Ip  = Ix + Iy
direct_kip = load_kip / n                        ; direct shear per bolt (vertical)
; critical corner bolt at (xmax, ymax): torsional components
tors_h = (Ip > 0) ? M * ymax / Ip : 0            ; horizontal torsional component
tors_v = (Ip > 0) ? M * xmax / Ip : 0            ; vertical torsional component
Rx = tors_h
Ry = direct_kip + tors_v
R  = sqrt(Rx^2 + Ry^2)                            ; resultant force on the critical bolt, kip
```

**Pinned worked example (a 2 x 3 bracket group, 3 in gage and pitch, 30 kip at 6 in).** `P = 30 kip`, `e = 6 in`,
`nc = 2`, `nr = 3`, `gx = gy = 3 in`: `n = 6`, `M = 30 x 6 = 180 kip-in`. Coordinates: columns at `x = +/-1.5`, rows at
`y = -3, 0, +3`, so `xmax = 1.5`, `ymax = 3`. Polar moment: `sum x^2 = 6 x 1.5^2 = 13.5`, `sum y^2 = 2 x (3^2 + 0 + 3^2)
= 36`, `Ip = 49.5 in^2`. Direct shear `P/n = 30/6 = 5.00 kip` (vertical). Torsional components at the far corner:
horizontal `M ymax / Ip = 180 x 3 / 49.5 = 10.91 kip`, vertical `M xmax / Ip = 180 x 1.5 / 49.5 = 5.45 kip`. Resultant
`Rx = 10.91`, `Ry = 5.00 + 5.45 = 10.45`, so `R = sqrt(10.91^2 + 10.45^2) = sqrt(119.0 + 109.3) = sqrt(228.3) = `
**15.1 kip** on the critical bolt -- which a 3/4 in A325-N bolt (design shear `~17.9 kip`, v267) carries with about 16%
reserve. **Cross-check (move the load out to `e = 12 in`).** Hold the group and double the eccentricity: `M = 360 kip-in`,
so the torsional components double to `21.8 kip` horizontal and `10.9 kip` vertical, `Ry = 5.00 + 10.9 = 15.9`, and
`R = sqrt(21.8^2 + 15.9^2) = sqrt(475 + 253) = ` **27.0 kip** -- past the same bolt's capacity, the expected outcome when
the load walks away from the group and torsion dominates. The `Ip = 0` single-bolt path (`nc = nr = 1` returns `R = P`),
the non-finite input, and the below-range load / eccentricity / spacing / count error seams bracket the resultant.

## 3. Wiring

A `tools-data.js` row (group `E`, trade `["welding","construction"]`, matching the weld-group tile and the steel-member
trio); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the elastic vector bolt-group
method, `editionNote` naming the direct-plus-torsional superposition with `Ip = sum(x^2 + y^2)`, the default 2 x 3 pattern
and in-plane-vertical-load assumption, the conservative-vs-instantaneous-center caveat, the "force on the critical bolt,
compare to v267" scope, and the design-aid caveat); `test/fixtures/worked-examples.json` (the `e = 6 in` example + the
`e = 12 in` cross-check); `test/fixtures/compute-map.js` (`bolt-group-eccentric` -> `computeBoltGroupEccentric` in
`../../calc-steel.js`); `scripts/related-tiles.mjs` (-> `weld-group-eccentric` / `bolt-shear-bearing` /
`steel-column-capacity`); `data/search/aliases.json` ("eccentric bolt group", "bolt group shear", "bracket bolts",
"elastic vector method", "worst bolt force", "bolt group polar moment", "shear tab bolts", "how much load on the corner
bolt", "eccentric shear connection"); the id appended to the `STEEL_RENDERERS["bolt-group-eccentric"]=` block at the file
end of `app.js`'s steel bundle; the `// dims:` annotation (`load_kip` force, `ecc_in`/`gage_in`/`pitch_in` length,
`ncols`/`nrows` dimensionless, resultant force); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning both examples, the `Ip`/direct/torsional intermediate values, the single-bolt `R = P` path, and the error seams
(non-finite, `load_kip <= 0`, `ecc_in < 0`, `gage_in <= 0`, `pitch_in <= 0`, `ncols < 1`, `nrows < 1`). Bump the
`calc-steel.js` size in the `check:module-sizes` allowlist if the gate flags it (dated comment). Lazy-loaded, absent from
home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block asserting the resultant, the `Ip` sum, the single-bolt path, and the error seams);
`npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the
direct / torsional-h / torsional-v / resultant stack wraps on a phone); render-no-nan + a11y sweep, output read to the
value (2 x 3 group, 30 kip at 6 in -> critical bolt 15.1 kip).

## 5. Roadmap position

Opens the AISC 360 steel-connection batch (v266..v268), the bolted counterpart to the welded `weld-group-eccentric` and
the natural next step after the steel-member trio (v254..v256): members sized, now the connections that join them. The
per-bolt shear / bearing / tearout limit the resultant is checked against is v267; the base plate that lands the column is
v268. An instantaneous-center-of-rotation option (the tabulated coefficient `C` of AISC Manual Part 7, less conservative
than the elastic method here), an out-of-plane (tension + prying) bolt-group form, and a combined shear-plus-tension bolt
interaction (AISC §J3.7) are the deliberate next follow-ons.
