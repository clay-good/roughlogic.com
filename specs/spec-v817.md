# roughlogic.com Specification v817 -- Annular Grout Volume for Cased Bore / Pipe-in-Casing (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v816.md. Underground-utility sweep, beside the
> `cmu-grout-volume` masonry-cell grout tile (different geometry).
>
> **The gap, and the evidence for it.** The catalog grouts masonry cells (`cmu-grout-volume`) but nothing gives the
> **annular grout** in the ring between a bored casing (or drilled-shaft casing) and the carrier pipe -- the volume a
> utility crew pumps to fill a pipe-in-casing. Grep confirmed no annular / pipe-in-casing grout tile. The number this
> settles: a 24 in bore around a 16 in carrier over 100 ft is a **6.46 cy** ring (1,306 gallons), which with 5% pumping
> waste rounds up to about **6.79 cy** ordered -- the void that has to be filled so the carrier does not float or settle.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
construction siblings (`cmu-grout-volume`, `pipe-bedding-backfill`): the bore and carrier diameters and the length carry
`L`, the waste percent is dimensionless, the annular area is `L^2`, and both grout volumes are `L^3`. The v18/v21 contract:
a non-finite or non-positive bore diameter, carrier diameter, or length returns `{ error }`; a carrier diameter greater
than or equal to the bore (a non-positive annulus) returns `{ error }`; a negative waste percent returns `{ error }`.
Citation discipline (v19/v22): the annular-area identity by name (area = pi/4 x (bore^2 - carrier^2); volume = area x
length), `GOVERNANCE.general`; the note states that the grout fills the void so the carrier neither floats during the pour
nor settles after, that the theoretical volume assumes a clean concentric annulus and the field always overruns it
(voids, overcut, an out-of-round bore), and that the mix design and the AHJ / owner spec govern.

## 2. The tile

### 2.1 `annular-grout-volume` -- Annular Grout Volume for Cased Bore / Pipe-in-Casing

```
inputs:
  bore_dia_in    inside diameter of the bore / casing (in)
  carrier_od_in  outside diameter of the carrier pipe (in)
  length_ft      run length (ft)
  waste_pct      pumping / overcut waste (percent, default 5)

annular_area_in2 = (PI/4) * (bore_dia_in^2 - carrier_od_in^2)
neat_ft3         = annular_area_in2 / 144 * length_ft
grout_cy         = neat_ft3 / 27 * (1 + waste_pct/100)
grout_gal        = neat_ft3 * 7.48052 * (1 + waste_pct/100)
```

**Pinned worked example.** Bore 24 in, carrier 16 in, length 100 ft, waste 5%:
`area = (PI/4)*(24^2 - 16^2) = 0.7854*320 = ` **251.3 in^2**; `neat = 251.3/144*100 = ` **174.5 ft^3** (6.46 cy, 1,306 gal);
`ordered = 6.46 * 1.05 = ` **6.79 cy**. Cross-check: a snug 20 in bore around the same 16 in carrier shrinks the ring to
`(PI/4)*(400-256) = 113.1 in^2`, `113.1/144*100 = 78.5 ft^3` and only **3.06 cy** with waste -- the annulus is the lever,
and it grows with the square of the diameters.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "plumbing"]`, inside the `// Group E` construction block near
`pipe-bedding-backfill`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (annular area = pi/4 (bore^2 - carrier^2), `GOVERNANCE.general`); `test/fixtures/worked-examples.json`
(the pinned example plus the snug-bore cross-check); `test/fixtures/compute-map.js` (`annular-grout-volume` ->
`computeAnnularGroutVolume`, module `../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `cmu-grout-volume` /
`pipe-bedding-backfill` / `concrete`); `data/search/aliases.json` (5 collision-checked aliases: "annular grout volume",
"pipe in casing grout", "cased bore grout", "casing annulus fill", "carrier pipe grout"); a hand-written renderer in the
`CONSTRUCTION_RENDERERS` map mirroring the `cmu-grout-volume` renderer (non-exported, so no DOM-sentinel dims row), and the
id added to the calc-construction declare list in `app.js`; the `// dims:` annotation directly above the compute;
regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the annular area, the neat
volume, both grout figures, and the error seams (non-positive bore, carrier, length; carrier >= bore; negative waste). The
calc-construction.js gzip cap is watched at build. Verify at build, including `check-shells` and `check-module-sizes`
post-build. Lazy-loaded, absent from home first paint. Home tile count 1,265 -> 1,266.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
((PI/4)*(24^2-16^2)/144*100/27*1.05 -> 6.79 cy).

## 5. Roadmap position

Adds the annular grout beside the masonry-cell `cmu-grout-volume` and the `pipe-bedding-backfill` trench take-off, serving
the underground-utility and boring contractor (construction / plumbing). Stays evidence-driven; the field always overruns
the neat annulus.
