# roughlogic.com Specification v178 -- Raceway and Cable Support / Securing Spacing Reference (NEC Chapter 3) (calc-references.js, Group A, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v164..v178 (electrician trade).** In-scope catalog
> expansion under the spec-v106 trades-only charter, and the closing tile of the electrician batch: one
> reference tile returning the support-interval and box-proximity securing rules for the common wiring
> methods (EMT, RMC, PVC, NM, MC, AC) from their NEC Chapter 3 .30 sections. Adds one tile to
> **`calc-references.js`** (Group A); no new module, group, or dependency. Inherits spec.md through
> spec-v163.md.
>
> **The gap, and the evidence for it.** Every wiring method has its own securing rule -- EMT within 3
> ft of a box and every 10 ft, NM within 12 in of a box and every 4.5 ft, MC within 12 in and every 6
> ft -- and these are the lines an inspector counts straps against. The catalog has reference tiles for
> codes and color but nothing for the .30 support sections, which electricians look up on every rough-in
> and there is no tile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. This is
a reference-lookup tile (the `gfci-afci-reference` / `color-codes` pattern): the wiring method selects
a row, the outputs are the maximum support interval and the box-proximity distance, both `L` (ft/in).
The bundled values (EMT 358.30, RMC 344.30, PVC 352.30, NM 334.30, MC 330.30, AC 320.30) are annotated
as the public NEC values; the RMC and PVC interval-by-trade-size cells note that the largest interval
depends on conduit size. The v18/v21 contract: an unrecognized method returns `{ error }`; there are
no computations or divisions, only the table read. Citation discipline (v19/v22):
`GOVERNANCE.electrical`, edition `NEC 2023 Chapter 3 securing-and-supporting sections (320.30, 330.30,
334.30, 344.30, 352.30, 358.30)`, `editionNote` `NEC_DISCLOSURE`, with the note that RMC/PVC maximum
intervals vary with trade size (the size-specific tables govern), that some methods have securing
exceptions (e.g. EMT/NM fishing in finished walls, MC at terminations), and that the AHJ governs.

## 2. The tile

### 2.1 `support-spacing` -- Raceway / Cable Support and Securing Lookup

```
inputs:
  wiring_method   select   "EMT" | "RMC/IMC" | "PVC (rigid nonmetallic)" |
                           "NM cable (Romex)" | "MC cable" | "AC cable (BX)"
  trade_size_in   L        conduit trade size (used only for RMC/PVC interval, optional otherwise)

secure_within_in   = box-proximity securing distance (in)
max_interval_ft    = maximum support interval (ft)
   EMT       -> within 36 in (3 ft) of each box; every 10 ft
   RMC/IMC   -> within 3 ft of each box; every 10-20 ft by trade size (Table 344.30(B)(2))
   PVC       -> within 3 ft of each box; every 3-8 ft by trade size (Table 352.30)
   NM        -> within 12 in of each box/fitting; every 4.5 ft
   MC        -> within 12 in of each box; every 6 ft
   AC        -> within 12 in of each box; every 4.5 ft
```

**Pinned worked example.** EMT: secure **within 3 ft (36 in)** of each box and support **every 10
ft** of run (358.30). A straight EMT home run across open joists therefore needs a strap at least
every 10 ft, plus one within 3 ft of each termination. **Cross-check (cable method).** NM cable
(Romex): secure **within 12 in** of each box or fitting and **every 4.5 ft** along the run (334.30) --
a much tighter pattern than EMT. MC cable relaxes the interval to 6 ft. For RMC and PVC the maximum
interval depends on trade size (larger conduit spans farther); the size-specific tables and the AHJ
govern.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["electrical"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.electrical`, NEC 2023 320.30/330.30/334.30/344.30/352.30/358.30, the
per-method intervals and box-proximity distances listed, `editionNote` `NEC_DISCLOSURE`);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`support-spacing` -> `computeSupportSpacing` in `../../calc-references.js`);
`scripts/related-tiles.mjs` (-> `working-space-110-26` / `burial-depth-300-5` / `conduit-fill`);
`data/search/aliases.json` ("support spacing", "strap spacing", "358.30", "secure within", "raceway
support", "cable support", "romex support"); the id appended to the existing `REFERENCES_RENDERERS`
declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning the EMT and NM lookups, an RMC/PVC size-dependent note, and the
unrecognized-method error seam. Raise the `calc-references.js` size cap by ~20 percent if needed
(dated comment); bump the `citations.js` cap if needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block, the RMC/PVC size note); `npm run build` (one
new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the
secure-within and interval lines wrap on a phone); render-no-nan + a11y sweep, output read to the
value (EMT -> 3 ft / 10 ft; NM -> 12 in / 4.5 ft; MC -> 12 in / 6 ft).

## 5. Roadmap position

Closes the v164..v178 electrician batch and the reference trio (working space v176, burial depth
v177, support spacing here) alongside `gfci-afci-reference` and `color-codes`. Further Group A growth
stays evidence-driven.
