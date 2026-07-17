# roughlogic.com Specification v881 -- Guard Baluster / Picket Count (4-in Sphere Rule) (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v880.md. Carpentry / railing sweep, beside
> `guard-handrail-check`.
>
> **The gap, and the evidence for it.** `guard-handrail-check` checks the guard height and load but nothing spaces the
> **balusters** so a 4 in sphere cannot pass. Grep confirmed no baluster / picket tile. The number this settles: a 96 in
> clear rail with 1.5 in pickets needs **17 pickets** to hold the gap at **3.9 in**, under the 4 in limit -- the layout
> before the first picket goes up.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
railing sibling (`guard-handrail-check`): the rail clear span, picket width, max gap, and actual gap carry `L`, and the
picket and gap counts are dimensionless. The v18/v21 contract: a non-finite or non-positive rail clear span, picket
width, or max gap returns `{ error }`; a picket width at or above the clear span returns `{ error }`. Citation discipline
(v19/v22): the spacing identity by name (pickets = ceil((clear - max gap) / (picket width + max gap)); actual gap = (clear
- pickets x width) / (pickets + 1)), `GOVERNANCE.general`; the note states that the IRC limits the opening so a 4 in
sphere cannot pass through a guard (the triangle at a stair open riser uses a 6 in sphere and the space below the rail a
4 3/8 in), that this holds the actual gap at or under the maximum, that the guard height and load are checked by
`guard-handrail-check`, and that the adopted code governs.

## 2. The tile

### 2.1 `baluster-picket-count` -- Guard Baluster / Picket Count (4-in Sphere Rule)

```
inputs:
  rail_clear_in    clear span between posts (in)
  picket_width_in  picket width (in, default 1.5)
  max_gap_in       maximum clear gap (in, default 4)

pickets       = ceil((rail_clear_in - max_gap_in) / (picket_width_in + max_gap_in))
gaps          = pickets + 1
actual_gap_in = (rail_clear_in - pickets * picket_width_in) / gaps
```

**Pinned worked example.** Rail clear 96 in, 1.5 in pickets, 4 in max gap:
`pickets = ceil((96 - 4) / (1.5 + 4)) = ceil(92/5.5) = ceil(16.7) = ` **17**; `gaps = 18`;
`actual gap = (96 - 17*1.5) / 18 = 70.5/18 = ` **3.92 in** (under 4 in). Cross-check: wider 3.5 in pickets need
`ceil((96-4)/(3.5+4)) = ceil(12.3) = ` **13 pickets** at a `(96-45.5)/14 = ` **3.61 in** gap -- fewer, wider pickets, but
the gap still has to clear the sphere rule.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["carpentry", "construction"]`, inside the `// Group E` construction block near
`guard-handrail-check`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (pickets = ceil((clear - max gap)/(width + max gap)) [IRC 4 in sphere], `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the wide-picket cross-check); `test/fixtures/compute-map.js`
(`baluster-picket-count` -> `computeBalusterPicketCount`, module `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `guard-handrail-check` / `stair-code-check` / `fence-estimate`);
`data/search/aliases.json` (5 collision-checked aliases: "baluster count", "picket spacing", "guard baluster spacing",
"4 inch sphere rule", "railing picket count"); a hand-written renderer in the `CONSTRUCTION_RENDERERS` map mirroring the
`guard-handrail-check` renderer (non-exported, so no DOM-sentinel dims row), and the id added to the calc-construction
declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning the picket count, gap count, actual gap, and the error seams
(non-positive clear span, picket width, max gap; picket width >= clear span). The calc-construction.js gzip cap is watched
at build. Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home
first paint. Home tile count 1,329 -> 1,330.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(ceil((96-4)/(1.5+4)) -> 17 pickets, 3.92 in gap).

## 5. Roadmap position

Railing layout tile beside `guard-handrail-check` (height/load) and `stair-code-check`, serving the carpenter / deck
builder (carpentry / construction). Stays evidence-driven; the adopted code sets the sphere rule.
