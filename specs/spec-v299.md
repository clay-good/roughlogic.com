# roughlogic.com Specification v299 -- One-Way Slab/Beam Minimum Thickness for Deflection (ACI 318-19 Table 7.3.1.1 / 9.3.1.1) (calc-concrete.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v299..v301 (the reinforced-concrete depth-2 trio -- the ACI
> checks the strength tiles never make: the deflection-control minimum thickness (this spec), the doubly-reinforced beam
> with compression steel (v300), and shear friction across an interface (v301).)**
> In-scope catalog expansion under the spec-v106 trades-only charter: the concrete tiles compute strength (flexure, shear,
> column, punching), but ACI lets a designer skip a deflection calculation entirely if the member is at least a minimum
> thickness -- the `l/20`, `l/24`, `l/28`, `l/10` table that sets slab and beam depth before any steel is sized. The catalog
> has no such serviceability tile. Adds one tile to the existing **`calc-concrete.js`** module (Group E); no new group,
> trade, or dependency. Inherits spec.md through spec-v298.md.
>
> **The gap, and the evidence for it.** ACI 318-19 Table 7.3.1.1 (one-way slabs) and 9.3.1.1 (beams) give the minimum
> thickness that waives a deflection check for members not supporting partitions likely to be damaged: `l/20` simply
> supported, `l/24` one end continuous, `l/28` both ends continuous, `l/10` cantilever, with a multiplier
> `(0.4 + fy/100,000)` for `fy` other than 60,000 psi (and a lightweight-concrete factor). For a simply supported one-way
> slab spanning 12 ft with Grade 60 steel, `hmin = 144/20 = 7.2 in` -- the depth a designer picks before sizing bars, and
> the number that decides whether a thinner slab needs an explicit deflection calculation. The strength tiles size the
> steel; this tile sizes the depth so deflection never governs.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The clear span `l` is a length
(entered in ft, converted to in); the support condition selects the denominator (20/24/28/10); `fy` is a stress (psi); the
lightweight modifier is dimensionless; the minimum thickness `hmin` is a length (in). The v18/v21 contract: any non-finite
input, or a span or `fy` at or below zero, returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the
ACI 318-19 minimum-thickness tables by name; `editionNote` names **the ACI 318-19 Table 7.3.1.1 (one-way slabs) and 9.3.1.1
(beams) minimum thickness `l/20` (simply supported), `l/24` (one end continuous), `l/28` (both continuous), `l/10`
(cantilever), the `(0.4 + fy/100,000)` non-Grade-60 modifier, and the 1.65 - 0.005 wc lightweight factor (>= 1.09)**, and
states that **this returns the deflection-control minimum thickness that waives an explicit deflection calculation -- it
applies to normalweight (unless `wc` is set) members not supporting or attached to partitions or construction likely to be
damaged by large deflections, uses the clear span, and is not the strength (flexure/shear) design or the actual deflection
of a thinner member; and this is a design aid, not a substitute for a licensed engineer's design** -- the structural
engineer of record's stamped design governs.

## 2. The tile

### 2.1 `rc-slab-min-thickness` -- One-Way Slab/Beam Minimum Thickness for Deflection (ACI 318-19)

```
inputs:
  l_ft      ft    span (clear span for the table)
  support   -     simply | one-end | both-ends | cantilever
  fy_psi    psi   steel yield strength (default 60000)
  wc_pcf    pcf   concrete unit weight (default 145, normalweight)

denom = { simply:20, one-end:24, both-ends:28, cantilever:10 }[support]
base  = (l_ft * 12) / denom                                  ; base minimum thickness, in
kfy   = (fy_psi == 60000) ? 1.0 : (0.4 + fy_psi/100000)      ; grade modifier
klw   = (wc_pcf >= 145) ? 1.0 : max(1.65 - 0.005*wc_pcf, 1.09)  ; lightweight modifier
hmin  = base * kfy * klw
```

**Pinned worked example (a simply supported one-way slab, 12 ft, Grade 60, normalweight).** `l = 12 ft`, `support = simply`,
`fy = 60,000`, `wc = 145`: `base = 144/20 = 7.2 in`; `kfy = 1.0`, `klw = 1.0`; `hmin = 7.2 in`. **Cross-check (Grade 40
steel and a both-ends-continuous slab).** `support = both-ends`, `fy = 40,000`: `base = 144/28 = 5.14 in`;
`kfy = 0.4 + 40,000/100,000 = 0.8`; `hmin = 5.14 x 0.8 = 4.11 in` -- the continuity cuts the depth and the softer,
lower-strength steel deflects less at service so it needs even less, the two effects the single `l/20` rule of thumb misses.
The non-finite and non-positive error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","carpentry"]`, matching the `rc-*` tiles); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the ACI 318-19 min-thickness tables, `editionNote` naming the
20/24/28/10 denominators, the `(0.4 + fy/100,000)` modifier, the lightweight factor, and the not-supporting-partitions,
clear-span, not-strength caveats); `test/fixtures/worked-examples.json` (the simply-supported example + the Grade-40
continuous cross-check); `test/fixtures/compute-map.js` (`rc-slab-min-thickness` -> `computeRcSlabMinThickness` in
`../../calc-concrete.js`); `scripts/related-tiles.mjs` (-> `rc-beam-flexure` / `rc-beam-shear` / `joist-deflection` /
`plywood-span`); `data/search/aliases.json` ("slab thickness", "minimum slab thickness", "deflection control", "ACI 7.3.1",
"l over 20", "one way slab depth", "beam minimum depth", "no deflection check", "slab span depth"); the id appended to the
existing concrete renderers block in `app.js`; the `// dims:` annotation (`l`/`hmin` length, `fy` stress, `wc` unit weight,
modifiers dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the
four support denominators, the `kfy` and `klw` modifiers, and the non-positive / non-finite error seams. No new module;
re-pin `calc-concrete.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the support-denominator and modifier assertions); `npm run build` (one
new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `base` / `kfy` / `hmin`
stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (12 ft simply supported -> 7.2 in).

## 5. Roadmap position

Opens the reinforced-concrete depth-2 batch (v299..v301) in `calc-concrete.js` with the serviceability depth the strength
tiles assumed. The doubly-reinforced beam (v300) and shear friction (v301) follow. The two-way slab minimum thickness
(Table 8.3.1.1 with `alpha_fm`), an explicit immediate-plus-long-term deflection tile, and the partition-damage deflection
limits (Table 24.2.2) are the deliberate next follow-ons once the trio lands.
