# roughlogic.com Specification v447 -- Concrete Threshold and Cracking Torsion (ACI 318-19 22.7) (calc-concrete.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-03). First tile of a structural member-capacity trio (v447 concrete torsion -> v448 glulam
> volume factor -> v449 masonry anchor bolt). `rc-beam-shear` covers one-way shear but not torsion; this tile gives the two
> torsion thresholds every spandrel and edge beam is checked against -- the threshold below which torsion is ignored and the
> cracking torsion.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A beam carrying torsion (a spandrel, a curved beam, an
> edge beam with eccentric load) must be checked against ACI 318-19 §22.7: torsion may be neglected when the factored torque
> is below `phi * Tth`, where the threshold torsion is `Tth = lambda * sqrt(f'c) * (Acp^2 / pcp)` with `Acp` the area
> enclosed by the outside perimeter and `pcp` that perimeter; the cracking torsion is `Tcr = 4 * Tth`. `rc-beam-shear` has no
> torsion term. This adds the torsion tile to the existing **`calc-concrete.js`** module (Group E); no new group, trade, or
> dependency. Inherits spec.md through spec-v446.md.
>
> **The gap, and the evidence for it.** A `12 in` by `20 in` beam of `4000 psi` concrete has `Acp = 240 in^2`, `pcp = 64 in`,
> so `Tth = 1.0 * sqrt(4000) * (240^2 / 64) = 56,921 in-lb = 4.74 ft-kip`. Torsion may be ignored when the factored torque is
> below `0.75 * 4.74 = 3.56 ft-kip`, and the section cracks in torsion at `Tcr = 4 * 4.74 = 18.97 ft-kip`. No tile does this;
> a designer had no way to tell whether a spandrel's torque even needed designing for.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The specified strength `f'c`
is a pressure (psi); the lightweight factor `lambda` is dimensionless; the section width and height are lengths (in); `Acp`
is an area (in^2) and `pcp` a length (in); the torques are moments (in-lb, also reported in ft-kip). The v18/v21 contract:
any non-finite input, or a non-positive `f'c` or dimension, returns `{ error }`; the tile computes `Acp` and `pcp` from a
rectangular section (or accepts them directly), and reports the threshold torsion, the `phi*Tth` neglect limit (`phi = 0.75`),
and the cracking torsion. Citation discipline (v19/v22): `GOVERNANCE.general` over the ACI torsion thresholds by name;
`editionNote` names **ACI 318-19 §22.7.4.1, the threshold torsion `Tth = lambda*sqrt(f'c)*(Acp^2/pcp)` (nominal, without
`phi`), the neglect criterion `Tu < phi*Tth` with `phi = 0.75`, the cracking torsion `Tcr = 4*Tth`, and `Acp`/`pcp` the area
and perimeter of the outside section**, and states that **this returns the torsion thresholds for a solid non-prestressed
section, that above `phi*Tth` closed stirrups and longitudinal steel must be designed (§22.7 / §9.5.4), and that it is a
design aid, not a substitute for the engineer of record**.

## 2. The tile

### 2.1 `concrete-torsion-threshold` -- Concrete Threshold and Cracking Torsion (ACI 318-19)

```
inputs:
  fc_psi   psi   specified compressive strength f'c
  b_in     in    section width
  h_in     in    section height
  lambda   -     lightweight factor (default 1.0)

acp = b_in * h_in
pcp = 2 * (b_in + h_in)
tth = lambda * sqrt(fc_psi) * (acp^2 / pcp)      in-lb
neglect_limit = 0.75 * tth                        in-lb   (Tu below this -> ignore torsion)
tcr = 4 * tth                                      in-lb   (cracking torsion)
```

**Pinned worked example (4000 psi, 12 in x 20 in).** `Acp = 240 in^2`, `pcp = 64 in`;
`Tth = sqrt(4000)*(240^2/64) = 56,921 in-lb = 4.74 ft-kip`; neglect if `Tu < 0.75*4.74 = 3.56 ft-kip`;
`Tcr = 18.97 ft-kip`. **Cross-check (a bigger section).** An `18 in` by `24 in` beam raises `Acp` to `432 in^2` and the
threshold to `14.6 ft-kip` -- torsion capacity grows fast with section size. A non-positive `f'c` or dimension takes the
error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["concrete"]`, beside `rc-beam-shear`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, ACI 318-19 §22.7.4, `editionNote` naming the `Tth`, neglect-limit, and `Tcr`
relations and the `Acp`/`pcp` definitions); `test/fixtures/worked-examples.json` (the 12x20 example + the 18x24
cross-check); `test/fixtures/compute-map.js` (`concrete-torsion-threshold` -> `computeConcreteTorsionThreshold` in
`../../calc-concrete.js`); `scripts/related-tiles.mjs` (-> `rc-beam-shear` / `rc-beam-flexure` /
`concrete-beam-min-flexural-steel` / `combined-stress-axial-bending`); `data/search/aliases.json` ("concrete torsion",
"threshold torsion", "cracking torsion", "aci 22.7", "Tth Tcr", "beam torsion", "torsion neglect", "spandrel torsion", "Acp
pcp torsion"); the id appended to the existing concrete renderers block in `app.js`; the `// dims:` annotation (f'c
pressure, dims length, Acp area, pcp length, torques moment); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning both examples, the neglect limit and cracking relations, and the non-positive / non-finite error seams. No new
module; re-pin `calc-concrete.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the threshold/cracking relations, the error paths); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the Tth / neglect / Tcr set wraps on a
phone); render-no-nan + a11y sweep, output read to the value (4000 psi, 12x20 -> Tth 4.74 ft-kip).

## 5. Roadmap position

Opens the structural member-capacity trio: `glulam-volume-factor` (v448) and `masonry-anchor-bolt` (v449) continue the
material-check theme. A full torsion-reinforcement design (closed stirrups `At/s` and longitudinal `Al`) above the threshold
is the deliberate next follow-on.
