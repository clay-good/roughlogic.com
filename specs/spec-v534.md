# roughlogic.com Specification v534 -- Ligation Insert:Vector Molar Ratio (calc-lab.js, Group T, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lab.js`**
> (Group T, bench science and lab math); no new module, group, or dependency. Inherits spec.md through spec-v533.md.
>
> **The gap, and the evidence for it.** Setting up a cloning ligation means hitting a target **molar** ratio of insert
> to vector -- commonly 3:1 -- and the bench has no tile for it. The catch that kills ligations is that the ratio is
> molar, not by mass: a short insert has far more copies per nanogram than a long vector, so using equal masses wildly
> over-represents the small fragment and drops efficiency. The insert mass needed scales by the length ratio:
> `insert_ng = ratio x (insert_length / vector_length) x vector_ng`. The tile takes the vector mass and length, the
> insert length, and the desired molar ratio, and returns the insert mass to add and the amounts of each in picomoles
> (using the 650 g/mol per base pair average for double-stranded DNA), so a tech pipettes the right nanograms instead of
> guessing by mass. It notes that 650 is the dsDNA average and that single-stranded or RNA fragments differ.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The vector and insert
masses are masses (`M`, in ng); the lengths are counts of base pairs (`dimensionless`); the molar ratio and the 650 and
1e6 constants are `dimensionless`; the picomole amounts are amounts of substance (`N`, in pmol). The v18/v21 contract:
any non-finite input, a non-positive vector mass, vector length, insert length, or molar ratio returns `{ error }`.
Citation discipline (v19/v22): `GOVERNANCE.general` over the ligation-ratio relations by name (standard molecular
cloning); `editionNote` names the **ligation insert:vector molar-ratio setup**, prints
`insert_ng = ratio x (insert_length / vector_length) x vector_ng`, `vector_pmol = vector_ng / (vector_length x 650) x
1e6`, and `insert_pmol = ratio x vector_pmol`, and states that **the ratio is molar not mass so a short insert needs
proportionally less mass than the vector (equal masses over-represent small fragments and cut efficiency), 650 g/mol per
base pair is the double-stranded DNA average (single-stranded and RNA differ), the standard 3:1 insert:vector is a
starting point that is optimized empirically, and the enzyme protocol and fragment ends govern** -- a setup aid, not a
protocol.

## 2. The tile

### 2.1 `ligation-molar-ratio` -- Why a Short Insert Needs Less Mass, Not Equal Mass

```
inputs:
  vector_ng        ng    mass of vector to use
  vector_length_bp bp    vector length in base pairs
  insert_length_bp bp    insert length in base pairs
  molar_ratio      -     desired insert:vector molar ratio (e.g. 3 for 3:1)

insert_ng   = molar_ratio x (insert_length_bp / vector_length_bp) x vector_ng     [ng]
vector_pmol = vector_ng / (vector_length_bp x 650) x 1e6                           [pmol]
insert_pmol = molar_ratio x vector_pmol                                           [pmol]
```

**Pinned worked example (50 ng of a 5,000 bp vector, a 1,000 bp insert, 3:1 molar ratio).** The insert mass to add is
`3 x (1,000 / 5,000) x 50 = 3 x 0.2 x 50 = ` **30 ng** -- only 30 ng of insert against 50 ng of vector, even at a 3:1
molar excess, because the insert is a fifth the length. In picomoles the vector is
`50 / (5,000 x 650) x 1e6 = ` **15.4 fmol** (0.0154 pmol) and the insert is `3 x = 46.2 fmol`. **Cross-check (equal mass
would be a 15:1 molar excess).** Using 50 ng of the 1,000 bp insert instead would be
`50 / (1,000 x 650) x 1e6 = 76.9 fmol`, a `76.9 / 15.4 = ` **5:1** molar ratio -- and a 3,000 bp vector with a 200 bp
insert at equal mass would balloon to 15:1, the over-representation that tanks the reaction. The tile returns the insert
mass and the picomole amounts of each.

## 3. Wiring

A `tools-data.js` row (group `T`, trades `["lab"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 3:1 example + the equal-mass
cross-check); `test/fixtures/compute-map.js` (`ligation-molar-ratio` -> `computeLigationMolarRatio` in
`../../calc-lab.js`); `scripts/related-tiles.mjs` (-> `nucleic-acid-a260` / `mass-moles` / `pcr-master-mix`);
`data/search/aliases.json` ("ligation ratio", "insert vector ratio", "molar ratio cloning", "ligation calculator",
"3:1 insert vector", "pmol dna", "cloning setup", "650 g/mol bp"); the id appended to the lab renderers declare in
`app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples, the length-ratio mass scaling, the pmol relation, and the error seams (non-finite, non-positive vector mass /
lengths / ratio). Hand-writes its renderer (mirroring the calc-lab.js `mass-moles` pattern). Lazy-loaded, absent from
home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the insert-mass / pmol stack wraps on a phone); render-no-nan + a11y on the new tile, output read
to the value (the 3:1 example -> 30 ng insert).

## 5. Roadmap position

Sits downstream of `nucleic-acid-a260` (which quantifies the DNA this tile proportions) and beside `mass-moles`. A
Gibson/Golden-Gate multi-fragment equimolar-pool variant and a total-ligation-volume helper are deliberate future
follow-ons. Further Group T growth stays evidence-driven.
