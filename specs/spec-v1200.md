# roughlogic.com Specification v1200 -- TR-55 Time of Concentration (calc-drainage.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-08-04). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-drainage.js`** (Group B),
> no new module, group, or dependency. Inherits spec.md through spec-v1199.md.
>
> **The gap, and the evidence for it.** The landed `time-of-concentration` tile (spec-v302) computes only the Kirpich
> single-channel estimate and its own note names the gap: it "is not the TR-55 three-segment (sheet + shallow
> concentrated + channel) travel-time sum." The TR-55 velocity method is the method modern US stormwater design actually
> uses; Kirpich is the older rural single-channel shortcut. No tile computed it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Manning
family already in this module (bespoke renderer, `makeNumber`/`makeSelect`). The v18/v21 contract: a non-finite input
(via `_finiteGuard`), a negative segment length, no active segment, or an active segment missing a positive parameter
returns `{ error }`. Citation discipline (v19/v22): NRCS TR-55 (1986) Chapter 3 by name, `GOVERNANCE.general`. **No
copyrighted table is reproduced** -- TR-55 is a public USDA/NRCS document and the equations and their constants are
published in it and in every hydrology text; the overland roughness and the 2-year rainfall are the user's own inputs.

## 2. The tile

### 2.1 `tr55-time-of-concentration` -- Time of Concentration (TR-55 Velocity Method)

```
Tc = Tt_sheet + Tt_shallow + Tt_channel   (enter length 0 to skip a segment)

sheet (TR-55 Eq 3-3):   Tt = 0.007 (n L)^0.8 / (P2^0.5 s^0.4)   hr   (L capped at 100 ft)
shallow concentrated:   V = 16.1345 sqrt(s) unpaved / 20.3282 sqrt(s) paved;  Tt = L/(3600 V)  hr
channel (Manning):      V = (1.49/n) R^(2/3) sqrt(s);  Tt = L/(3600 V)  hr
```

**Pinned worked example (verified against the TR-55 Chapter 3 example).** Sheet: n 0.24 dense grass, L 100 ft, P2 3.6 in,
s 0.01 -> **17.75 min**. Shallow: unpaved, L 1400 ft, s 0.01 -> V 1.6135 ft/s -> **14.46 min**. Channel: n 0.05, R 0.75 ft,
s 0.005, L 3000 ft -> V 1.7394 ft/s -> **28.74 min**. Tc = **60.96 min**. The seams the fuzzer pins: additivity
(Tc equals the segment sum exactly), the paved/unpaved velocity-constant ratio, a single active segment with the others
contributing exactly zero, the 100 ft sheet-flow cap flag, channel-slope monotonicity, and the error seams.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["plumbing","civil"]`, beside `time-of-concentration`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry; a `test/fixtures/worked-examples.json` row (the TR-55 example, pinning the three
segment times, `tc_min`, and the two velocities); `test/fixtures/compute-map.js` and `test/fixtures/renderer-map.js`
(spec-v1191 reachability parity); `test/unit/bounds-fuzzer.test.js` (the new fuzzer block); `scripts/related-tiles.mjs`
(<-> `time-of-concentration`, `stormwater-rational`, `manning-pipe-capacity`, `stormwater-detention-volume`);
`data/search/aliases.json` (4 collision-checked aliases; alias shards regenerated); the `DRAINAGE_RENDERERS` entry
(bespoke renderer, MCP field schema auto-extracted); the `// dims:` annotation directly above the compute; regenerated
v14 corpus + tile-index. `calc-drainage.js` fits within its cap. Home tile count 1,572 -> 1,573 (index.html JSON-LD +
hero lede, AGENTS.md). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` (calc-drainage.js
under its cap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value (the TR-55
Chapter 3 example -> 61.0 min).

## 5. Roadmap position

Closes a self-declared gap: the Kirpich time-of-concentration tile named the three-segment TR-55 method it does not do.
The two now cover both the quick single-channel estimate and the segment-by-segment velocity method modern stormwater
design requires, beside the rational-method and detention tiles they feed.
