# roughlogic.com Specification v887 -- Joist Hanger and Connector-Nail Count (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v886.md. Framing sweep, beside `deck-ledger-fasteners`
> and `residential-framing`.
>
> **The gap, and the evidence for it.** Nothing counts **joist hangers** and the connector nails that fill them. Grep
> confirmed no joist-hanger tile (`deck-ledger-fasteners` is the ledger-to-band connection). The number this settles: a
> 16 ft-wide floor at 16 in on center is 13 joists, hung both ends, so **26 hangers** and, with all holes filled, about
> **260 connector nails** -- the hardware order that gets forgotten until the joists are cut.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
framing siblings (`deck-ledger-fasteners`, `residential-framing`): the joist-run width and spacing carry `L`, and the
joist, hanger, ends-per-joist, nails-per-hanger, and nail counts are dimensionless. The v18/v21 contract: a non-finite or
non-positive width or spacing returns `{ error }`; a negative ends-per-joist or nails-per-hanger returns `{ error }`.
Citation discipline (v19/v22): the hanger-count identity by name (joists = floor(width / spacing) + 1; hangers = joists x
ends; nails = hangers x nails per hanger), `GOVERNANCE.general`; the note states that a hanger goes on each joist end that
lands in a ledger or beam face (a joist bearing on top of a beam needs no hanger that end -- set ends to 1), that every
hanger hole is filled with the specified structural connector nails or screws (not roofing nails), and that the hanger
model follows the manufacturer for the joist size and load.

## 2. The tile

### 2.1 `joist-hanger-count` -- Joist Hanger and Connector-Nail Count

```
inputs:
  run_width_ft     width of the joist run (ft)
  spacing_in       joist spacing (in, default 16)
  ends_per_joist   hung ends per joist (count, default 2)
  nails_per_hanger connector nails per hanger (count, default 10)

joists       = floor(run_width_ft * 12 / spacing_in) + 1
hangers      = joists * ends_per_joist
hanger_nails = hangers * nails_per_hanger
```

**Pinned worked example.** Run width 16 ft, 16 in spacing, 2 hung ends, 10 nails/hanger:
`joists = floor(16*12/16) + 1 = 12 + 1 = ` **13**; `hangers = 13*2 = ` **26**; `nails = 26*10 = ` **260**. Cross-check:
if one end bears on a beam (ends = 1), it is `13*1 = ` **13 hangers** and 130 nails -- half the hardware, because only the
ledger end is hung.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["carpentry", "construction"]`, inside the `// Group E` construction block near
`deck-ledger-fasteners`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (hangers = joists x ends; nails = hangers x nails/hanger, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned two-end example plus the one-end cross-check); `test/fixtures/compute-map.js`
(`joist-hanger-count` -> `computeJoistHangerCount`, module `../../calc-construction.js`); `scripts/related-tiles.mjs`
(-> `deck-ledger-fasteners` / `residential-framing` / `deck-board-takeoff`); `data/search/aliases.json` (5
collision-checked aliases: "joist hanger count", "joist hanger nails", "hanger takeoff", "framing connector count", "deck
joist hangers"); a hand-written renderer in the `CONSTRUCTION_RENDERERS` map mirroring a count renderer (non-exported, so
no DOM-sentinel dims row), and the id added to the calc-construction declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning
the joist, hanger, and nail counts and the error seams (non-positive width or spacing; negative ends or nails). The
calc-construction.js gzip cap is watched at build. Verify at build, including `check-shells` and `check-module-sizes`
post-build. Lazy-loaded, absent from home first paint. Home tile count 1,335 -> 1,336.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(floor(16*12/16)+1 -> 13 joists, 26 hangers).

## 5. Roadmap position

Framing hardware takeoff beside `deck-ledger-fasteners` and `deck-board-takeoff`, serving the framer / deck builder
(carpentry / construction). Stays evidence-driven; the manufacturer sets the hanger and nailing.
