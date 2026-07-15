# roughlogic.com Specification v901 -- Chain-Link Fabric, Post, and Tension-Band Takeoff (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v900.md. Fencing sweep, beside `fence-estimate` and
> `post-hole-concrete`.
>
> **The gap, and the evidence for it.** `fence-estimate` is generic but nothing enumerates **chain-link-specific parts** --
> fabric, top rail, tension wire, line and terminal posts, and tension bands. Grep confirmed no chain-link tile. The number
> this settles: a 200 ft run of 4 ft fence with one gate is **196 LF** of fabric, **20 posts** (14 line, 6 terminal),
> **200 LF** each of top rail and tension wire, and **18 tension bands** -- the parts list a chain-link crew orders.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
fencing siblings (`fence-estimate`, `post-hole-concrete`): the perimeter, height, gate width, and post spacing carry `L`,
the fabric and rail/wire lengths carry `L`, and the terminal, post, and band counts are dimensionless. The v18/v21
contract: a non-finite or non-positive perimeter, height, or post spacing returns `{ error }`; a negative gate width or
corner count, or a gate wider than the perimeter, returns `{ error }`. Citation discipline (v19/v22): the takeoff identity
by name (fabric = perimeter - gates; total posts = ceil(perimeter / spacing); terminals = corners + gate jambs; line
posts = total - terminals; bands = terminals x (height - 1)), `GOVERNANCE.general`; the note states that line posts run
about 10 ft on center, that terminals (corners, ends, gate jambs) each get tension bands, a rail end, and a brace, that
the fabric is stretched against a tension wire and bar, and that gate hardware is taken off separately -- distinct from
the generic `fence-estimate`.

## 2. The tile

### 2.1 `chain-link-fence-takeoff` -- Chain-Link Fabric, Post, and Tension-Band Takeoff

```
inputs:
  perimeter_ft          fence run / perimeter (ft)
  height_ft             fence height (ft)
  gate_width_ft         total gate width (ft, default 0)
  corners               corner + end terminal posts (count, default 4)
  line_post_spacing_ft  line post spacing (ft, default 10)

fabric_lf     = perimeter_ft - gate_width_ft
rail_wire_lf  = perimeter_ft
terminals     = corners + (gate_width_ft > 0 ? 2 : 0)
total_posts   = ceil(perimeter_ft / line_post_spacing_ft)
line_posts    = max(0, total_posts - terminals)
tension_bands = terminals * (height_ft - 1)
```

**Pinned worked example.** Perimeter 200 ft, height 4 ft, one 4 ft gate, 4 corners, 10 ft spacing:
`fabric = 200 - 4 = ` **196 LF**; `rail/wire = ` **200 LF** each; `terminals = 4 + 2 = ` **6**; `total posts = ceil(200/10) = `
**20**; `line posts = 20 - 6 = ` **14**; `bands = 6*(4-1) = ` **18**. Cross-check: a taller 6 ft fence raises the bands to
`6*(6-1) = ` **30** while the posts and fabric hold -- height drives the bands, the run drives the posts.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["fencing", "landscaping"]`, inside the `// Group E` construction block beside
`fence-estimate`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (fabric = perimeter - gates; posts = ceil(perimeter/spacing); bands = terminals x (height-1),
`GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the pinned example plus the taller-fence cross-check);
`test/fixtures/compute-map.js` (`chain-link-fence-takeoff` -> `computeChainLinkFenceTakeoff`, module
`../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `fence-estimate` / `post-hole-concrete` / `siding-takeoff`);
`data/search/aliases.json` (5 collision-checked aliases: "chain link fence takeoff", "chain link fabric", "fence post
count", "tension band count", "chain link parts"); a hand-written renderer in the `CONSTRUCTION_RENDERERS` map mirroring
the `fence-estimate` renderer (non-exported, so no DOM-sentinel dims row), and the id added to the calc-construction
declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning the fabric footage, post and terminal counts, tension bands,
and the error seams (non-positive perimeter, height, spacing; negative gate or corners; gate exceeding perimeter). The
calc-construction.js gzip cap is watched at build. Verify at build, including `check-shells` and `check-module-sizes`
post-build. Lazy-loaded, absent from home first paint. Home tile count 1,349 -> 1,350.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(200-4 -> 196 LF fabric, 6 terminals, 18 bands).

## 5. Roadmap position

Fencing takeoff beside the generic `fence-estimate`, serving the fence installer (fencing / landscaping). Home tile count
crosses 1,350. Stays evidence-driven; the layout governs the parts.
