# roughlogic.com Specification v187 -- Swimming-Pool Equipotential Bonding Reference (NEC 680.26) (calc-references.js, Group A, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v179..v187 (electrician trade, second pass).** In-scope
> catalog expansion under the spec-v106 trades-only charter, and the closing tile of the second pass:
> one reference tile listing the components that NEC 680.26 requires to be connected to the
> equipotential bonding grid, and the minimum #8 AWG solid copper bonding conductor. Adds one tile to
> **`calc-references.js`** (Group A); no new module, group, or dependency. Inherits spec.md through
> spec-v178.md.
>
> **The gap, and the evidence for it.** Pool equipotential bonding (680.26) is among the most-cited
> residential inspection items and the most-misunderstood: which metal parts, the perimeter surface
> within 3 ft, the water itself, and the #8 solid copper minimum. The catalog has bonding-jumper sizing
> (`bonding-jumper`) and grounding tiles, but nothing that lays out the 680.26 equipotential grid
> checklist an electrician walks before a pool inspection. It is a pure reference and there is no tile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. This is
a reference-lookup tile (the `gfci-afci-reference` / `color-codes` pattern): a pool-type selection
returns the applicable bonded-component checklist and the conductor minimum; the perimeter distance is
`L` (ft) and the conductor size is the `#8 AWG solid copper` constant. There is no numeric computation
beyond the lookup. The v18/v21 contract: an unrecognized pool type returns `{ error }`. Citation
discipline (v19/v22): `GOVERNANCE.electrical`, edition `NEC 2023 680.26 (equipotential bonding) with
the #8 AWG solid copper minimum`, `editionNote` `NEC_DISCLOSURE`, with the note that the perimeter
surface extends 3 ft horizontally from the inside pool wall, that the bonding grid is **not** required
to be connected to a remote grounding electrode (it is equipotential, not a ground path), that listed
pool-water bonding (a minimum 9 sq-in conductive surface in contact with the water) satisfies 680.26(C),
and that the AHJ governs.

## 2. The tile

### 2.1 `pool-bonding-680-26` -- NEC 680.26 Equipotential Bonding Checklist

```
inputs:
  pool_type   select   "permanent pool/spa" | "storable pool" (limited) |
                       "permanently installed spa/hot tub"

returns the 680.26(B) bonded-component list for the type, each with its citation:
  - conductive pool shell / structural reinforcing steel (or listed equivalent)       680.26(B)(1)
  - perimeter surfaces within 3 ft horizontally (paved and unpaved)                    680.26(B)(2)
  - metallic components of the pool structure                                          680.26(B)(3)
  - underwater metal forming shells / luminaire / niche                                680.26(B)(4)
  - metal fittings (ladders, rails, diving stands) sized 1 in or larger                680.26(B)(5)
  - electrical equipment: pump motor, etc. (motor bonded; double-insulated note)       680.26(B)(6)
  - metal piping, metal awnings/fences within 5 ft                                     680.26(B)(7)
  - pool water via a listed water-bond fitting (>= 9 sq in)                            680.26(C)
conductor: solid copper, #8 AWG minimum; connections listed/irreversible
```

**Pinned worked example.** A **permanent in-ground pool**: the equipotential grid must bond the
structural rebar (or a listed equivalent), the perimeter surface out to **3 ft**, the underwater
luminaire forming shell, all metal fittings 1 in and larger (ladder, handrail), the pump motor, and
the pool water through a listed water-bond fitting, all with a **#8 AWG solid copper** conductor; the
grid is equipotential and need not run to a remote electrode. **Cross-check (different type).** A
**permanently installed spa/hot tub** follows 680.26 the same way for its conductive parts and a
listed-equipment spa carries the manufacturer's bonding provisions; a *storable* pool is treated
differently and the checklist narrows. The AHJ governs the final inspection.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["electrical"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.electrical`, NEC 2023 680.26, the bonded-component list, the 3 ft
perimeter, the water bond, and the #8 solid copper minimum listed, `editionNote` `NEC_DISCLOSURE`);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`pool-bonding-680-26` -> `computePoolBonding68026` in `../../calc-references.js`);
`scripts/related-tiles.mjs` (-> `bonding-jumper` / `egc-sizing` / `gfci-afci-reference`);
`data/search/aliases.json` ("pool bonding", "680.26", "equipotential", "pool grid", "#8 solid
copper", "pool inspection"); the id appended to the existing `REFERENCES_RENDERERS` declare in
`app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning the permanent-pool checklist, the spa cross-check, and the unrecognized-type error seam.
Raise the `calc-references.js` size cap by ~20 percent if needed (dated comment); bump the
`citations.js` cap if needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block, the spa path); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the component
checklist wraps on a phone); render-no-nan + a11y sweep, output read to the value (permanent pool ->
full grid + #8 solid copper; spa -> narrowed list).

## 5. Roadmap position

Closes the v179..v187 second-pass batch and joins the bonding/grounding family (`bonding-jumper`,
`egc-sizing`) and the reference family (`gfci-afci-reference`, working space v176, burial depth v177,
support spacing v178). Further Group A growth stays evidence-driven.
