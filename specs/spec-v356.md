# roughlogic.com Specification v356 -- Weld Dilution Ratio (calc-fab.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.125.0). Batch spec-v356..v358 (the welding-process trio -- the metallurgy and
> production numbers the strength and cost tiles never compute: the weld dilution ratio (this spec), the number of passes
> and arc time to fill a groove (v357), and the travel speed for a target heat input (v358).)**
> In-scope catalog expansion under the spec-v106 trades-only charter: the catalog computes weld strength, heat input, and
> deposition, but not dilution -- the fraction of the weld metal that came from the melted base metal rather than the
> filler. Dilution governs the final weld chemistry, and it is the number that decides whether a hardfacing overlay or a
> dissimilar-metal joint has the alloy content it needs. Adds one tile to the existing **`calc-fab.js`** module (Group E);
> no new group, trade, or dependency. Inherits spec.md through spec-v355.md.
>
> **The gap, and the evidence for it.** Dilution is the base-metal share of the total weld-metal cross-section:
> `dilution = A_base / (A_base + A_filler)`, where `A_base` is the melted (penetration) area and `A_filler` the added
> (reinforcement) area. For a single-pass weld with `0.03 in^2` of base-metal penetration and `0.05 in^2` of filler,
> `dilution = 0.03/0.08 = 37.5%` -- a typical structural-weld value. But for a hardfacing or corrosion-resistant overlay,
> low dilution is the goal (so the deposit keeps its alloy): a shallow `0.02 in^2` penetration under a broad `0.10 in^2`
> bead gives `0.02/0.12 = 16.7%`, keeping the overlay's chemistry close to the filler's. High dilution on an overlay ruins
> the alloy; high dilution on a dissimilar joint can crack it. The strength tiles size the weld; this tile reads its
> chemistry mix.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The base-metal (penetration)
area and filler (reinforcement) area are areas (in^2 or mm^2); the dilution is a dimensionless percentage. The v18/v21
contract: any non-finite input, or an area at or below zero (the total must be positive), returns `{ error }`. Citation
discipline (v19/v22): `GOVERNANCE.general` over the weld-dilution definition by name; `editionNote` names **the dilution
`= A_base/(A_base + A_filler)`, measured from a weld cross-section (macro-etch) as the melted-base area over the total
fusion-zone area, the low-dilution goal for overlays/cladding (often < 10-20%) and the process-dependence (SAW and high
current raise it, low-penetration processes and buttering lower it), as compiled in the AWS welding-metallurgy references**,
and states that **this returns the dilution ratio from the entered areas -- it uses the cross-sectional areas from a macro
or an estimate (it does not compute penetration from the parameters), applies to a single pass or a characteristic section,
and does not compute the resulting weld chemistry (mix the base and filler compositions by the dilution to get that) or the
dilution's effect on cracking; and this is a metallurgy aid** -- a qualified WPS/PQR and macro-etch govern.

## 2. The tile

### 2.1 `weld-dilution` -- Weld Dilution Ratio

```
inputs:
  A_base     in^2   melted base-metal (penetration) area
  A_filler   in^2   added filler (reinforcement) area

dilution = A_base / (A_base + A_filler) * 100      ; %
filler_share = 100 - dilution                       ; %
```

**Pinned worked example (a structural single-pass weld).** `A_base = 0.03`, `A_filler = 0.05`:
`dilution = 0.03/(0.03 + 0.05) = 37.5%`; the deposit is 37.5% base metal, 62.5% filler. **Cross-check (a hardfacing
overlay, low dilution).** A shallow penetration under a broad bead, `A_base = 0.02`, `A_filler = 0.10`:
`dilution = 0.02/0.12 = 16.7%` -- keeping the overlay chemistry near the filler's, the whole aim of a low-dilution overlay
technique (weave, buttering, lower current), where a 37.5% dilution would water the alloy down too far. The non-finite and
non-positive error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["welding","fabrication"]`, matching the weld tiles); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, the dilution definition, `editionNote` naming
`dilution = A_base/(A_base + A_filler)`, the overlay low-dilution goal, the process-dependence, and the enter-areas,
not-chemistry caveats); `test/fixtures/worked-examples.json` (the structural example + the overlay cross-check);
`test/fixtures/compute-map.js` (`weld-dilution` -> `computeWeldDilution` in `../../calc-fab.js`);
`scripts/related-tiles.mjs` (-> `weld-metal-volume` / `weld-heat-input` / `carbon-equivalent` / `weld-passes-arc-time`);
`data/search/aliases.json` ("weld dilution", "dilution ratio welding", "base metal dilution", "overlay dilution",
"hardfacing dilution", "penetration reinforcement area", "cladding dilution", "weld chemistry mix", "fusion zone
dilution"); the id appended to the existing fab renderers block in `app.js`; the `// dims:` annotation (areas area,
dilution dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the
ratio, the filler-share complement, and the non-positive / non-finite error seams. No new module; re-pin `calc-fab.js` on
the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the ratio assertion); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `dilution` / filler-share pair wraps on a
phone); render-no-nan + a11y sweep, output read to the value (0.03/0.05 -> 37.5%).

## 5. Roadmap position

Opens the welding-process batch (v356..v358) in `calc-fab.js`, adding the dilution metallurgy to the strength and cost
tiles. The passes/arc-time (v357) and travel-speed (v358) follow. A base-plus-filler weld-chemistry mix from the
dilution, a process-typical dilution reference table, and a dissimilar-metal Schaeffler-diagram chain are the deliberate
next follow-ons once the trio lands.
