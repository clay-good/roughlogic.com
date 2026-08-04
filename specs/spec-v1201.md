# roughlogic.com Specification v1201 -- SCS/NRCS Curve Number Runoff Depth (calc-drainage.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-08-04). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-drainage.js`** (Group B),
> no new module, group, or dependency. Inherits spec.md through spec-v1200.md.
>
> **The gap, and the evidence for it.** The `stormwater-rational` tile gives the peak flow RATE (Q = C i A) and the new
> `tr55-time-of-concentration` (spec-v1200) the timing, but neither gives the runoff DEPTH or VOLUME a detention basin is
> sized on. The NRCS Curve Number method (TR-55 Chapter 2) is the standard for that and had no tile; a detention-sizing
> user had to compute the runoff depth by hand.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the hydrology
tiles already in this module. The v18/v21 contract: a non-finite input (via `_finiteGuard`), a non-positive rainfall, a
curve number outside (0, 100], or a negative area returns `{ error }`. Citation discipline (v19/v22): NRCS TR-55 (1986)
Chapter 2 by name, `GOVERNANCE.general`. **No copyrighted table is reproduced** -- the runoff equation is public, and the
curve number itself (from TR-55 Table 2-2, land cover x hydrologic soil group) is the user's own single input, not a
reproduced table.

## 2. The tile

### 2.1 `curve-number-runoff` -- Curve Number Runoff Depth (SCS/NRCS)

```
S  = 1000 / CN - 10                         potential maximum retention (in)
Ia = 0.2 S                                  initial abstraction (in)
Q  = (P - Ia)^2 / (P - Ia + S)  for P > Ia  runoff depth (in);  else Q = 0
volume (with area in acres) = (Q / 12) x area   acre-ft  (x 43560 ft^3, x 7.48052 gal)
```

**Pinned worked example (verified against the TR-55 runoff figure).** A P = 5 in storm on CN 80: S = 2.5 in, Ia = 0.5 in,
Q = (4.5)^2 / (4.5 + 2.5) = **2.89 in** (58% of the rain), matching the published TR-55 runoff figure for CN 80. Over
10 acres that is **2.41 acre-ft** (105,011 ft^3, 785,535 gal). The seams the fuzzer pins: the Ia threshold (a 0.3 in
storm on CN 70 yields exactly zero runoff), CN = 100 giving Q = P, monotonicity in CN with Q never exceeding P, null
volume when no area is entered, and the error seams.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["plumbing","civil"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry; two `test/fixtures/worked-examples.json` rows (the CN 80 example and the below-Ia zero-runoff cross-check);
`test/fixtures/compute-map.js` and `test/fixtures/renderer-map.js` (spec-v1191 reachability parity);
`test/unit/bounds-fuzzer.test.js` (the new fuzzer block); `scripts/related-tiles.mjs` (<-> `stormwater-rational`,
`tr55-time-of-concentration`, `stormwater-detention-volume`, `time-of-concentration`); `data/search/aliases.json`
(4 collision-checked aliases; alias shards regenerated); the `DRAINAGE_RENDERERS` entry (bespoke renderer, MCP field
schema auto-extracted); the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index.
`calc-drainage.js` module-size cap raised 15000 -> 17000 B (the hydrology pair v1200/v1201; small module, raise not
split). Home tile count 1,573 -> 1,574 (index.html JSON-LD + hero lede, AGENTS.md). Lazy-loaded, absent from home first
paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` (calc-drainage.js
under its raised cap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(P 5 in, CN 80 -> 2.89 in, 2.41 acre-ft over 10 acres).

## 5. Roadmap position

Completes the small-watershed hydrology set: the rational method (peak flow), the two time-of-concentration methods
(timing), and now the curve-number runoff (depth and volume). Together they feed the detention-volume tile a designer
uses to hold a post-development peak to the pre-development rate.
