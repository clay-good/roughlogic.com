# roughlogic.com Specification v871 -- Roll-Off Dumpster / Haul Count (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v870.md. Demolition sweep, beside `demo-debris`.
>
> **The gap, and the evidence for it.** `demo-debris` gives the debris volume and weight but nothing turns it into a
> **haul count**, where either the box volume or the container weight cap governs. Grep confirmed no dumpster / haul-count
> tile. The number this settles: 60 cy of debris fills **3** boxes by volume, but at 45 tons the 8-ton weight cap forces
> **6** hauls -- and for heavy concrete debris the weight always wins.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E demo
siblings (`demo-debris`, `dump-truck-loads`): the debris volume and container volume carry `L^3`, the debris and cap
weights carry `M`, the fill efficiency is dimensionless, and the three counts are dimensionless. The v18/v21 contract: a
non-finite or non-positive debris volume, debris weight, container volume, fill efficiency, or weight cap returns
`{ error }`. Citation discipline (v19/v22): the haul-count identity by name (by volume = ceil(cy / (container x fill)); by
weight = ceil(tons / cap); hauls = max), `GOVERNANCE.general`; the note states that the debris volume and weight come from
`demo-debris`, that the container size and weight cap come from the hauler (heavy debris such as concrete and masonry hits
the weight cap first, light debris the volume), that the fill efficiency is below one for bulky debris, and that overweight
boxes are a haul-back.

## 2. The tile

### 2.1 `dumpster-count` -- Roll-Off Dumpster / Haul Count

```
inputs:
  debris_cy        debris volume (cy)
  debris_tons      debris weight (tons)
  container_cy     roll-off box size (cy, default 30)
  fill_efficiency  usable fill fraction (dimensionless, default 0.7)
  weight_cap_tons  container weight cap (tons, default 8)

by_vol  = ceil(debris_cy / (container_cy * fill_efficiency))
by_wt   = ceil(debris_tons / weight_cap_tons)
hauls   = max(by_vol, by_wt)
governs = by_wt > by_vol ? "weight" : "volume"
```

**Pinned worked example.** Debris 60 cy, 45 tons, 30 cy box, 0.7 fill, 8-ton cap:
`by volume = ceil(60/(30*0.7)) = ceil(2.86) = ` **3**; `by weight = ceil(45/8) = ceil(5.63) = ` **6**;
`hauls = max(3,6) = ` **6** (weight governs). Cross-check: lighter debris at 12 tons has `by weight = ceil(12/8) = 2`, so
`hauls = max(3,2) = ` **3** -- now the volume governs, and the boxes go out full but not heavy.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["demolition", "construction"]`, inside the `// Group E` construction block near
`demo-debris`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (hauls = max(ceil(cy/(box x fill)), ceil(tons/cap)), `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned weight-governs example plus the volume-governs cross-check);
`test/fixtures/compute-map.js` (`dumpster-count` -> `computeDumpsterCount`, module `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `demo-debris` / `dump-truck-loads` / `stockpile-volume`);
`data/search/aliases.json` (5 collision-checked aliases: "dumpster count", "roll off count", "debris haul count",
"dumpster hauls", "demolition container count"); a hand-written renderer in the `CONSTRUCTION_RENDERERS` map mirroring the
`demo-debris` renderer (non-exported, so no DOM-sentinel dims row), and the id added to the calc-construction declare list
in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings;
a `bounds-fuzzer.test.js` block pinning the by-volume and by-weight counts, the hauls and governing label (both cases),
and the error seams (non-positive debris cy/tons, container, fill, cap). The calc-construction.js gzip cap is watched at
build. Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first
paint. Home tile count 1,319 -> 1,320.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(max(ceil(60/(30*0.7)), ceil(45/8)) -> 6 hauls).

## 5. Roadmap position

Demolition tile beside `demo-debris` (the debris) and `dump-truck-loads` (the haul side), serving the demolition
contractor (demolition / construction). Stays evidence-driven; the hauler's caps govern.
