# roughlogic.com Specification v177 -- Underground Burial Cover-Depth Reference (NEC Table 300.5) (calc-references.js, Group A, 1 New Tile)

> **Status: LANDED 2026-06-24 (package 0.79.0; part of catalog 628 -> 639). Batch spec-v164..v178 (electrician trade).** In-scope catalog
> expansion under the spec-v106 trades-only charter: one reference tile returning the minimum cover
> depth for underground wiring by method and location per NEC Table 300.5 (the <= 1000 V columns).
> Adds one tile to **`calc-references.js`** (Group A); no new module, group, or dependency. Inherits
> spec.md through spec-v163.md.
>
> **The gap, and the evidence for it.** The catalog references GFCI/AFCI rules and color codes but not
> the burial-depth table every trencher and directional bore is dug to. Direct-burial cable, PVC, and
> rigid each get a different minimum cover, and locations (under a building, under a driveway, the
> residential 120 V/20 A GFCI branch) change it again. Getting it wrong means re-excavation; the table
> is pure lookup and there is no tile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. This is
a reference-lookup tile (the `gfci-afci-reference` / `color-codes` pattern): the wiring method and
location select a row, the output is a minimum cover in `L` (in). The bundled Table 300.5 cover values
(Columns 1-5: direct burial, RMC/IMC, nonmetallic raceway listed for direct burial, residential
120 V/20 A GFCI branch, and irrigation/lighting <= 30 V) are annotated as the public NEC values. The
v18/v21 contract: an unrecognized method/location combination returns `{ error }`; there are no
computations or divisions, only the table read. Citation discipline (v19/v22): `GOVERNANCE.electrical`,
edition `NEC 2023 Table 300.5 (minimum cover requirements, 0 to 1000 volts)`, `editionNote`
`NEC_DISCLOSURE`, with the note that "cover" is measured to the top of the raceway/cable, that the
table footnotes (raceways under buildings, in/under concrete, supplemental protection) modify specific
cells, and that the AHJ governs.

## 2. The tile

### 2.1 `burial-depth-300-5` -- NEC Table 300.5 Minimum Cover Lookup

```
inputs:
  wiring_method   select   "direct burial cable/conductors" | "RMC or IMC" |
                           "nonmetallic raceway (PVC etc.)" | "residential 120V/20A GFCI branch" |
                           "low-voltage <=30V (irrigation/landscape)"
  location        select   "general earth" | "under a building" | "under 4in concrete in trench" |
                           "under streets/roads/driveways(public)" | "one/two-family driveway/parking"

min_cover_in = Table 300.5 cell for (wiring_method, location)
   # general earth: direct burial 24 in; RMC/IMC 6 in; PVC 18 in;
   #   residential 120V/20A GFCI branch 12 in; low-voltage 6 in
   # under streets/roads/driveways(public): 24 in for all methods
   # under a building: 0 in (in raceway only) per footnote
```

**Pinned worked example.** A PVC conduit branch in general earth ("nonmetallic raceway",
"general earth"): minimum cover **18 in** to the top of the conduit. A direct-burial UF cable in the
same trench needs **24 in**, and rigid (RMC/IMC) only **6 in** -- the method drives the depth.
**Cross-check (location).** Any of those methods crossing under a public street, road, or commercial
driveway is **24 in** minimum; and a one/two-family dwelling driveway is 18 in for many methods. The
table footnotes (under buildings, in concrete, supplemental cover) modify specific cells; the AHJ
governs.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["electrical"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.electrical`, NEC 2023 Table 300.5, the column values and the
measured-to-top and footnote notes listed, `editionNote` `NEC_DISCLOSURE`);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`burial-depth-300-5` -> `computeBurialDepth3005` in `../../calc-references.js`);
`scripts/related-tiles.mjs` (-> `working-space-110-26` / `conduit-fill` / `cable-bend-radius`);
`data/search/aliases.json` ("burial depth", "300.5", "underground cover", "trench depth", "direct
burial", "conduit burial depth"); the id appended to the existing `REFERENCES_RENDERERS` declare in
`app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning both lookups, a location override, and the unrecognized-combination error seam. Raise
the `calc-references.js` size cap by ~20 percent if needed (dated comment); bump the `citations.js`
cap if needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block, the location-override path); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the
method, location, and cover lines wrap on a phone); render-no-nan + a11y sweep, output read to the
value (PVC/general -> 18 in; direct burial -> 24 in; RMC -> 6 in; under public driveway -> 24 in).

## 5. Roadmap position

Joins the reference family (`gfci-afci-reference`, `color-codes`) with the burial-depth table,
alongside v176 (working space) and v178 (support spacing). Further Group A growth stays
evidence-driven.
