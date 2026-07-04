# roughlogic.com Specification v448 -- Glulam Volume Factor Cv (NDS 5.3.6) (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-04). Second tile of the structural member-capacity trio (v447 concrete torsion ->
> v448 glulam volume factor -> v449 masonry anchor bolt). `wood-beam-bending` computes the sawn-lumber beam-stability factor
> `CL`; a glued-laminated beam has an additional strength reduction, the volume factor `Cv`, that no tile applies.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A glulam beam's bending strength is reduced for its
> volume, because a larger stressed volume is more likely to contain a strength-limiting defect. NDS 5.3.6 gives
> `Cv = KL * (21/L)^(1/x) * (12/d)^(1/x) * (5.125/b)^(1/x) <= 1.0`, where `L` is the span (ft), `d` and `b` the depth and
> width (in), and `x = 10` for softwoods (`x = 20` for Southern Pine); the allowable bending is governed by the lesser of
> `Cv` and the stability factor `CL`. `wood-beam-bending` handles sawn lumber and never applies `Cv`. This adds the volume-
> factor tile to the existing **`calc-construction.js`** module (Group E); no new group, trade, or dependency. Inherits
> spec.md through spec-v447.md.
>
> **The gap, and the evidence for it.** A `5-1/8 in` by `18 in` glulam spanning `20 ft` has a volume factor of
> `Cv = (21/20)^0.1 * (12/18)^0.1 * (5.125/5.125)^0.1 = 1.005 * 0.960 * 1.0 = 0.965`, so its reference bending value is cut
> about `3.5%`. Stretch it to a `6-3/4 in` by `24 in` girder over `32 ft` and `Cv = 0.870` -- a `13%` reduction, because the
> bigger the beam, the larger the stressed volume. No tile does this; a designer using `wood-beam-bending` on a glulam missed
> the volume penalty.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The span is a length (ft); the
depth and width are lengths (in); the loading and volume factors are dimensionless. The v18/v21 contract: any non-finite
input, or a non-positive span, depth, or width, returns `{ error }`; the exponent `x` defaults to `10` (softwood) with `20`
selectable for Southern Pine, `KL` defaults to `1.0`, and `Cv` is capped at `1.0`. Citation discipline (v19/v22):
`GOVERNANCE.general` over the NDS glulam volume factor by name; `editionNote` names **NDS 2018 §5.3.6, the volume factor
`Cv = KL*(21/L)^(1/x)*(12/d)^(1/x)*(5.125/b)^(1/x) <= 1.0`, `x = 10` (softwood) or `20` (Southern Pine), `KL` the loading
condition factor (`1.0` for a uniformly loaded simple span), and that the allowable bending uses the lesser of `Cv` and the
beam-stability factor `CL`**, and states that **this returns the glulam volume factor, that it applies to glulam bending
about the x-x axis (not sawn lumber), and that it is a design aid, not a substitute for the engineer of record**.

## 2. The tile

### 2.1 `glulam-volume-factor` -- Glulam Volume Factor Cv (NDS 5.3.6)

```
inputs:
  span_ft   ft   beam span L
  depth_in  in   beam depth d
  width_in  in   beam width b
  x         -    species exponent (10 softwood, 20 Southern Pine)
  kl        -    loading condition factor (default 1.0)

cv = min( kl * (21/span_ft)^(1/x) * (12/depth_in)^(1/x) * (5.125/width_in)^(1/x), 1.0 )
```

**Pinned worked example (5.125 in x 18 in glulam, 20 ft, softwood).**
`Cv = (21/20)^0.1 * (12/18)^0.1 * (5.125/5.125)^0.1 = 0.965` -- a `3.5%` reduction. **Cross-check (a large girder).** A
`6.75 in` by `24 in` glulam over `32 ft` gives `Cv = 0.870`, a `13%` reduction, because volume drives the penalty. A
non-positive span, depth, or width takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["carpentry"]`, beside `wood-beam-bending`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, NDS 2018 §5.3.6, `editionNote` naming the `Cv` relation, the `x` and `KL`
factors, and the lesser-of-`Cv`-or-`CL` rule); `test/fixtures/worked-examples.json` (the small-beam example + the large-
girder cross-check); `test/fixtures/compute-map.js` (`glulam-volume-factor` -> `computeGlulamVolumeFactor` in
`../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `wood-beam-bending` / `wood-beam-shear` / `beam-loading` /
`lumber-spans`); `data/search/aliases.json` ("glulam volume factor", "Cv glulam", "nds 5.3.6", "glulam bending", "volume
factor wood", "glued laminated beam", "glulam design", "Cv wood beam", "glulam strength reduction"); the id appended to the
existing construction renderers block in `app.js`; the `// dims:` annotation (span/depth/width length, factors
dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the `1.0` cap,
and the non-positive / non-finite error seams. No new module; re-pin `calc-construction.js` on the `check:module-sizes`
allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the `1.0` cap, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the `Cv` output wraps on a phone); render-no-nan + a11y sweep,
output read to the value (5.125x18, 20 ft -> 0.965).

## 5. Roadmap position

The middle of the structural member-capacity trio: `concrete-torsion-threshold` (v447) and `masonry-anchor-bolt` (v449)
bracket it. A combined `Cv`-and-`CL` governing-factor glulam bending-capacity tile is the deliberate next follow-on.
