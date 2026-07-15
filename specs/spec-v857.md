# roughlogic.com Specification v857 -- Pipe Insulation and Jacket Material Takeoff (calc-plumbing.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-plumbing.js`** (Group B),
> no new module, group, or dependency. Inherits spec.md through spec-v856.md. Mechanical-insulation install-ops sweep.
>
> **The gap, and the evidence for it.** The catalog sizes insulation thickness for heat loss (`insulation-thickness`,
> `pipe-heat-loss-radial`) but nothing takes off the **material** -- the cut length with fitting allowances, the jacket
> area, and the sections to order. Grep confirmed no insulation-takeoff tile. The number this settles: 250 ft of 2 in pipe
> with a dozen ells at a 5% waste is **274.5 ft** of insulation -- **92 three-foot sections** and **323 sf** of jacket --
> the mechanical insulator's material list.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the takeoff
pattern: the pipe length, fitting allowance, section length, and insulation OD carry `L`, the waste and fitting count are
dimensionless, the cut length is `L`, the section count is dimensionless, and the jacket area is `L^2`. The v18/v21
contract: a non-finite or non-positive pipe length, fitting allowance, section length, or insulation OD returns
`{ error }`; a negative waste or fitting count returns `{ error }`. Citation discipline (v19/v22): the insulation-takeoff
identity by name (cut = pipe x (1 + waste) + fittings x allowance; sections = ceil(cut / section length); jacket = pi x
insulation OD x cut), `GOVERNANCE.general`; the note states that the fitting allowance covers ells, tees, and valves (a
valve is several feet of equivalent length), that the jacket area uses the insulation outside diameter (not the pipe),
that this is a material takeoff distinct from the thermal `insulation-thickness`, and that the spec sets the thickness and
jacket type.

## 2. The tile

### 2.1 `pipe-insulation-takeoff` -- Pipe Insulation and Jacket Material Takeoff

```
inputs:
  pipe_ft          pipe run length (ft)
  waste_pct        waste allowance (percent, default 5)
  num_fittings     ells/tees/valves (count)
  fitting_allow_ft insulation allowance per fitting (ft, default 1)
  section_len_ft   insulation section length (ft, default 3)
  insul_od_in      insulation outside diameter (in)

cut_ft    = pipe_ft * (1 + waste_pct/100) + num_fittings * fitting_allow_ft
sections  = ceil(cut_ft / section_len_ft)
jacket_sf = PI * (insul_od_in/12) * cut_ft
```

**Pinned worked example.** Pipe 250 ft, 5% waste, 12 fittings at 1 ft, 3 ft sections, insulation OD 4.5 in:
`cut = 250*1.05 + 12*1 = ` **274.5 ft**; `sections = ceil(274.5/3) = ` **92**; `jacket = PI*(4.5/12)*274.5 = ` **323 sf**.
Cross-check: thicker insulation at a 6 in OD raises the jacket to `PI*(6/12)*274.5 = ` **431 sf** while the section count
holds -- the OD drives the jacket, the length drives the sections.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["insulation", "plumbing"]`, inside the `// Group B` plumbing block near
`pipe-expansion-loop`) -- the Group B citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`B`); a
`citations.js` entry (cut = pipe(1+waste) + fittings x allow; jacket = pi x OD x cut, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the thicker-insulation cross-check);
`test/fixtures/compute-map.js` (`pipe-insulation-takeoff` -> `computePipeInsulationTakeoff`, module
`../../calc-plumbing.js`); `scripts/related-tiles.mjs` (-> `insulation-thickness` / `pipe-heat-loss-radial` /
`solder-joint-quantity`); `data/search/aliases.json` (5 collision-checked aliases: "pipe insulation takeoff", "pipe
insulation quantity", "insulation jacket area", "insulation sections count", "mechanical insulation takeoff"); a
hand-written renderer in the `PLUMBING_RENDERERS` map mirroring a simple output renderer (non-exported, so no DOM-sentinel
dims row), and the id added to the calc-plumbing declare list in `app.js`; the `// dims:` annotation directly above the
compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the cut length,
the section count, the jacket area, and the error seams (non-positive pipe, allowance, section, OD; negative waste or
fittings). The calc-plumbing.js gzip cap is watched at build. Verify at build, including `check-shells` and
`check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count 1,305 -> 1,306.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group B audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(250*1.05 + 12 -> 274.5 ft, 92 sections).

## 5. Roadmap position

Mechanical-insulation takeoff beside the thermal `insulation-thickness`, serving the insulator and plumber (insulation /
plumbing). Stays evidence-driven; the spec sets the thickness and jacket.
