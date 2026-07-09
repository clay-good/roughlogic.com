# roughlogic.com Specification v533 -- Nucleic Acid Concentration (A260) (calc-lab.js, Group T, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lab.js`**
> (Group T, bench science and lab math); no new module, group, or dependency. Inherits spec.md through spec-v532.md.
>
> **The gap, and the evidence for it.** `beer-lambert` runs the molar `A = epsilon c l`, but nucleic-acid quantitation
> on a spectrophotometer does not use a molar coefficient -- it uses empirical **mass extinction factors** at 260 nm,
> and the factor depends on what the sample is: an A260 of 1.0 means 50 ug/mL of double-stranded DNA, 33 of single-
> stranded DNA, or 40 of RNA. Single-stranded DNA absorbs more per unit mass, so the same A260 reads a **lower**
> concentration than for dsDNA. The bench has no tile for this everyday reading, nor for the purity check that goes with
> it: the 260/280 ratio flags protein or phenol carryover (below about 1.8 for DNA, 2.0 for RNA), and a concentration
> from a contaminated sample is meaningless. The tile takes the A260, the nucleic-acid type, the dilution factor, and an
> optional A280, and returns the concentration and the purity ratio -- the two numbers off every NanoDrop or cuvette
> read.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The absorbance readings
and the 260/280 ratio are `dimensionless`; the dilution factor is `dimensionless`; the mass factor (50/33/40) is
`dimensionless` (a ug/mL per absorbance-unit constant); the concentration is a mass concentration (`M L^-3`, reported in
ng/uL). The v18/v21 contract: any non-finite input, a negative A260, a non-positive dilution factor, an unrecognized
nucleic-acid type, or a non-positive A280 when a ratio is requested returns `{ error }`. Citation discipline (v19/v22):
`GOVERNANCE.general` over the A260 quantitation by name (Beer-Lambert at 260 nm; standard spectrophotometric factors);
`editionNote` names the **A260 nucleic-acid quantitation (mass extinction factors)**, prints
`concentration = A260 x factor x dilution` (factor **50 dsDNA, 33 ssDNA/oligo, 40 RNA**) and
`purity_260_280 = A260 / A280`, and states that **the factor is an empirical mass coefficient not a molar one and it
differs by strandedness (ssDNA absorbs more per mass so it reads a lower concentration at the same A260), a 260/280
below about 1.8 (DNA) or 2.0 (RNA) flags protein or phenol carryover that makes the concentration unreliable, the read
assumes a clean 1 cm path and a blanked instrument, and the sample and instrument govern** -- a quantitation aid, not a
certified assay.

## 2. The tile

### 2.1 `nucleic-acid-a260` -- Concentration and Purity Off a 260 nm Read (Factor Depends on the Sample)

```
inputs:
  a260              -     absorbance at 260 nm
  na_type           -     dsDNA (50) / ssDNA / oligo (33) / RNA (40)
  dilution_factor   -     dilution applied before reading
  a280              -     absorbance at 280 nm (0 = skip purity ratio)

factor        = 50 dsDNA / 33 ssDNA or oligo / 40 RNA                    [ug/mL per A260]
concentration = a260 x factor x dilution_factor                         [ng/uL]
purity_260_280 = a280 > 0 ? a260 / a280 : null                          [-]
```

**Pinned worked example (A260 = 0.6 on a 1:50 dilution of a genomic dsDNA prep, A280 = 0.324).**
`concentration = 0.6 x 50 x 50 = ` **1,500 ng/uL** of dsDNA, and the purity is
`0.6 / 0.324 = ` **1.85** -- above the 1.8 DNA threshold, so the prep is clean and the number is trustworthy.
**Cross-check (strandedness changes the concentration at the same A260).** Read the identical 0.6 A260 as single-
stranded DNA (factor 33): `0.6 x 33 x 50 = ` **990 ng/uL** -- a third less than the dsDNA value for the same
absorbance, because ssDNA absorbs more per unit mass. And an A280 that pushed the ratio below 1.8 would flag protein
carryover regardless. The tile returns the concentration and the 260/280 purity ratio.

## 3. Wiring

A `tools-data.js` row (group `T`, trades `["lab"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the dsDNA example + the ssDNA
strandedness cross-check); `test/fixtures/compute-map.js` (`nucleic-acid-a260` -> `computeNucleicAcidA260` in
`../../calc-lab.js`); `scripts/related-tiles.mjs` (-> `beer-lambert` / `od600-cell-count` / `molarity-from-stock`);
`data/search/aliases.json` ("a260", "nucleic acid concentration", "dna quantitation", "260/280 ratio", "nanodrop",
"dsdna 50 factor", "rna concentration", "dna purity ratio"); the id appended to the lab renderers declare in `app.js`;
the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples,
the factor by type, the strandedness difference, the 260/280 ratio, and the error seams (non-finite, negative A260,
non-positive dilution, bad type, non-positive A280 with ratio). Hand-writes its renderer (mirroring the calc-lab.js
`beer-lambert` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the concentration / purity stack wraps on a phone); render-no-nan + a11y on the new tile, output
read to the value (the dsDNA example -> 1,500 ng/uL, 1.85 ratio).

## 5. Roadmap position

Adds nucleic-acid quantitation beside `beer-lambert` (the molar case) and `od600-cell-count`, and feeds
`ligation-molar-ratio` (proposed next), which needs the DNA concentration this tile gives. A 260/230 purity check and a
yield (total ug from elution volume) companion are deliberate future follow-ons. Further Group T growth stays evidence-
driven.
