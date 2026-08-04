# roughlogic.com Specification v1202 -- Over-Consolidated Primary Consolidation Settlement (calc-geotech.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-08-04). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-geotech.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v1201.md.
>
> **The gap, and the evidence for it.** The `soil-consolidation-settlement` tile is named "Primary Consolidation
> Settlement (NC Clay)" and computes only the normally-consolidated case (Cc alone); its citation even names the "Cc/Cr
> distinction" it does not implement. Most natural clays are OVER-consolidated, where settlement follows the flat
> recompression index Cr until the load crosses the preconsolidation pressure sigma'p. No tile covered that.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the NC-clay
sibling (same `_simpleRenderer` factory, so the MCP field schema is auto-exposed). The v18/v21 contract: a non-finite
input (via `_finiteGuard`), a non-positive Cc/Cr/H/sigma'0, Cr greater than Cc, sigma'p less than sigma'0
(under-consolidated), or a negative stress increase returns `{ error }`. Citation discipline (v19/v22): Terzaghi/Das/
NAVFAC by name, `GOVERNANCE.general`. **No copyrighted table is reproduced** -- Cc, Cr, and sigma'p are the user's own
oedometer results.

## 2. The tile

### 2.1 `overconsolidated-settlement` -- Primary Consolidation Settlement (Over-Consolidated Clay)

```
final = sigma'0 + d_sigma
if final <= sigma'p:   Sc = (Cr H/(1+e0)) log10(final/sigma'0)                              recompression only
else:                  Sc = (Cr H/(1+e0)) log10(sigma'p/sigma'0)
                          + (Cc H/(1+e0)) log10(final/sigma'p)                              recompression + virgin
OCR = sigma'p / sigma'0
```

**Pinned worked example (verified from first principles, Das).** A 10 ft clay (Cc 0.25, Cr 0.05, e0 0.90) at sigma'0
2,000 psf with sigma'p 3,000 psf: a d_sigma of 2,000 psf pushes the final stress to 4,000 > sigma'p, so
Sc = (0.05 x 10/1.9) log10(1.5) + (0.25 x 10/1.9) log10(4/3) = **2.53 in** (OCR 1.5). A smaller 500 psf load stays below
sigma'p and settles only **0.31 in** -- an eighth as much, and a fraction of the NC prediction. The seams the fuzzer
pins: the two branches, the exact reduction to the NC tile at OCR = 1, monotonicity in the load, and the error seams
(Cr > Cc, sigma'p < sigma'0).

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","carpentry"]`, mirroring the NC sibling); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry; two `test/fixtures/worked-examples.json` rows (the crossing case and the
below-sigma'p cross-check); `test/fixtures/compute-map.js` and `test/fixtures/renderer-map.js` (spec-v1191 reachability
parity); `test/unit/bounds-fuzzer.test.js` (the new fuzzer block, including the NC-reduction cross-check);
`scripts/related-tiles.mjs` (<-> `soil-consolidation-settlement`, `consolidation-time-rate`, `settlement-limit-load`,
`soil-vertical-effective-stress`); `data/search/aliases.json` (4 collision-checked aliases; alias shards regenerated);
the `GEOTECH_RENDERERS` entry via the `_simpleRenderer` factory (auto-exposing the MCP field schema); the `// dims:`
annotation directly above the compute; regenerated v14 corpus + tile-index. `calc-geotech.js` fits within its cap. Home
tile count 1,574 -> 1,575 (index.html JSON-LD + hero lede, AGENTS.md). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` (calc-geotech.js
under its cap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value (the Das
example -> 2.53 in, OCR 1.5).

## 5. Roadmap position

Closes a self-declared gap: the NC-clay tile named the Cc/Cr distinction it does not compute. The two now cover both the
normally-consolidated and the over-consolidated primary consolidation, beside the consolidation time-rate and
degree-of-consolidation tiles that give the timing.
