# roughlogic.com Specification v853 -- Electrical Duct-Bank Concrete Encasement Volume (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v852.md. Electrical / underground sweep, beside
> `post-hole-concrete` and `annular-grout-volume`.
>
> **The gap, and the evidence for it.** Nothing gives the **concrete for an electrical duct bank** -- the encasement
> around a bundle of conduits, which is the cross-section minus the conduits times the run. Grep confirmed no duct-bank
> tile (`post-hole-concrete` is a single hole, `annular-grout-volume` is one pipe-in-casing). The number this settles: a
> 24 x 18 in bank around six 4-in conduits over 100 ft is **8.66 cy** of concrete (9.1 cy with waste) -- the order that has
> to be right so the pour finishes in one continuous lift with no cold joint.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
concrete siblings (`post-hole-concrete`, `concrete`): the bank width, height, length, and conduit OD carry `L`, the
conduit count and waste are dimensionless, the net area is `L^2`, and the volumes are `L^3`. The v18/v21 contract: a
non-finite or non-positive bank width, height, length, or conduit OD returns `{ error }`; a negative conduit count or
waste returns `{ error }`; a conduit area that exceeds the bank area (a non-positive net) returns `{ error }`. Citation
discipline (v19/v22): the encasement identity by name (net area = bank width x height - conduits x pi/4 x OD^2; volume =
net area x length / 27), `GOVERNANCE.general`; the note states that the conduit OD is the actual outside diameter (a 4-in
conduit runs about 4.5 in OD), that the mix (often red-dyed concrete or flowable fill) and the encasement dimensions come
from the engineer and AHJ, and that rebar and spacers are taken off separately.

## 2. The tile

### 2.1 `duct-bank-concrete` -- Electrical Duct-Bank Concrete Encasement Volume

```
inputs:
  bank_width_ft   duct-bank envelope width (ft)
  bank_height_ft  duct-bank envelope height (ft)
  length_ft       run length (ft)
  num_conduits    number of conduits in the bank (count)
  conduit_od_in   conduit actual outside diameter (in)
  waste_pct       waste allowance (percent, default 5)

net_area_ft2 = bank_width_ft * bank_height_ft - num_conduits * (PI/4) * (conduit_od_in/12)^2
volume_cy    = net_area_ft2 * length_ft / 27
ordered_cy   = volume_cy * (1 + waste_pct/100)
```

**Pinned worked example.** Bank 2.0 x 1.5 ft, length 100 ft, six 4.5 in-OD conduits, 5% waste:
`net = 3.0 - 6*(PI/4)*(4.5/12)^2 = 3.0 - 6*0.1105 = ` **2.337 ft^2**; `volume = 2.337*100/27 = ` **8.66 cy**;
`ordered = 8.66*1.05 = ` **9.09 cy**. Cross-check: a bigger 2.5 x 2.0 ft bank around the same conduits is
`5.0 - 0.663 = 4.337 ft^2`, `4.337*100/27 = ` **16.06 cy** -- the envelope, not the conduits, drives the pour.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["electrical", "construction"]`, inside the `// Group E` construction block near
`post-hole-concrete`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (net area = bank area - conduits x pi/4 x OD^2; volume = net x length / 27, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the larger-bank cross-check); `test/fixtures/compute-map.js`
(`duct-bank-concrete` -> `computeDuctBankConcrete`, module `../../calc-construction.js`); `scripts/related-tiles.mjs`
(-> `post-hole-concrete` / `annular-grout-volume` / `concrete`); `data/search/aliases.json` (5 collision-checked aliases:
"duct bank concrete", "electrical duct bank volume", "conduit encasement concrete", "duct bank pour", "concrete encased
duct"); a hand-written renderer in the `CONSTRUCTION_RENDERERS` map mirroring the `post-hole-concrete` renderer
(non-exported, so no DOM-sentinel dims row), and the id added to the calc-construction declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the net area, both volumes, and the error seams (non-positive bank dims, length,
conduit OD; negative count or waste; conduit area exceeding bank). The calc-construction.js gzip cap is watched at build.
Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint.
Home tile count 1,301 -> 1,302.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
((3.0 - 6*(PI/4)*(4.5/12)^2)*100/27 -> 8.66 cy).

## 5. Roadmap position

Electrical / underground tile beside `post-hole-concrete` and `annular-grout-volume`, serving the electrical and utility
contractor (electrical / construction). Stays evidence-driven; the engineer sets the encasement.
