# roughlogic.com Specification v867 -- Sill-Plate Anchor Bolt Count (IRC R403.1.6) (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v866.md. Framing sweep, beside `deck-ledger-fasteners`
> and `residential-framing`.
>
> **The gap, and the evidence for it.** Nothing lays out **sill-plate anchor bolts** -- the count for a wall at the IRC
> maximum spacing with a bolt near each end. Grep confirmed no sill-anchor tile (`anchor-embedment` is a design capacity).
> IRC R403.1.6 caps the spacing at 6 ft, wants a minimum of two per plate, and puts a bolt within 12 in of each end. The
> number this settles: a 40 ft wall at 6 ft spacing with 9 in end distances takes **8 bolts** -- the layout before the
> plate goes down.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
framing siblings (`deck-ledger-fasteners`, `wall-bracing-length`): the wall length, spacing, and end distance carry `L`,
the effective length is `L`, and the bolt count is dimensionless. The v18/v21 contract: a non-finite or non-positive wall
length or max spacing returns `{ error }`; a negative end distance, or an end distance so large the effective length is
non-positive, returns `{ error }`. Citation discipline (v19/v22): the anchor-count identity by name (bolts = max(2,
ceil((wall - 2 x end distance) / max spacing) + 1)), IRC R403.1.6, `GOVERNANCE.general`; the note states that the IRC caps
the spacing at 6 ft (high-wind and seismic provisions or engineered plans tighten it -- entered here), that each plate
section gets a minimum of two bolts with one within 12 in of each end and corner, that a 1/2 in bolt needs at least 7 in
of embedment, and that the adopted code and any engineered plan govern -- this is distinct from the `anchor-embedment`
capacity calc.

## 2. The tile

### 2.1 `sill-plate-anchor-count` -- Sill-Plate Anchor Bolt Count (IRC R403.1.6)

```
inputs:
  wall_length_ft   wall / plate length (ft)
  max_spacing_ft   maximum anchor spacing (ft, default 6)
  end_distance_in  bolt distance from each end (in, default 9)

effective_len_ft = wall_length_ft - 2 * (end_distance_in/12)
bolts            = max(2, ceil(effective_len_ft / max_spacing_ft) + 1)
```

**Pinned worked example.** Wall 40 ft, max spacing 6 ft, end distance 9 in:
`effective = 40 - 2*(9/12) = ` **38.5 ft**; `bolts = max(2, ceil(38.5/6) + 1) = max(2, 7+1) = ` **8**. Cross-check: an
8 ft wall gives `effective = 8 - 1.5 = 6.5 ft`, and since 6.5 ft between the end bolts exceeds the 6 ft spacing,
`ceil(6.5/6)+1 = ` **3 bolts** -- a mid bolt is required, which the two-bolt minimum alone would miss.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["carpentry", "construction"]`, inside the `// Group E` construction block near
`deck-ledger-fasteners`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (bolts = max(2, ceil((wall - 2 ends)/spacing)+1) [IRC R403.1.6], `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the short-wall cross-check); `test/fixtures/compute-map.js`
(`sill-plate-anchor-count` -> `computeSillPlateAnchorCount`, module `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `deck-ledger-fasteners` / `anchor-embedment` / `wall-bracing-length`);
`data/search/aliases.json` (5 collision-checked aliases: "sill plate anchor count", "anchor bolt spacing sill", "mudsill
anchor bolts", "foundation anchor count", "sill bolt layout"); a hand-written renderer in the `CONSTRUCTION_RENDERERS` map
mirroring a count renderer (non-exported, so no DOM-sentinel dims row), and the id added to the calc-construction declare
list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning the effective length, the bolt count (including the two-minimum
and the short-wall mid-bolt cases), and the error seams (non-positive wall or spacing; negative or oversized end
distance). The calc-construction.js gzip cap is watched at build. Verify at build, including `check-shells` and
`check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count 1,315 -> 1,316.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(max(2, ceil((40 - 1.5)/6) + 1) -> 8 bolts).

## 5. Roadmap position

Framing layout tile beside `deck-ledger-fasteners`, distinct from the `anchor-embedment` capacity calc, serving the framer
(carpentry / construction). Stays evidence-driven; the adopted code and engineered plans govern.
