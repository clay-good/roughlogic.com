# roughlogic.com Specification v619 -- Thinning Target TPA From a Target SDI (calc-arborist.js, Group L, 1 New Tile)

> **Status: PROPOSED (2026-07-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-arborist.js`**
> (Group L, forestry/arborist bench); no new module, group, or dependency. Inherits spec.md through spec-v618.md.
>
> **The gap, and the evidence for it.** Spec-v564 (`reineke-sdi`) names this tile as a deliberate follow-on: "a
> stocking-chart / thinning-target (residual TPA at a target SDI)." The SDI tile diagnoses -- it says a stand at 75%
> of maximum SDI is past the thinning threshold -- but it never answers the forester's next question: **how many
> trees per acre should be left?** The arithmetic is the same Reineke relation inverted:
> `TPA_target = SDI_target / (QMD/10)^1.605`, with `SDI_target = SDI_max x target%`. The prescription writes itself
> from three numbers: a ponderosa stand (SDI_max 450) thinned to the 35% onset-of-competition floor at a 10 in QMD
> keeps **157 trees per acre** -- so a 300-TPA stand marks 143 for cutting, and the residual carries about 86 ft^2
> of basal area. The tile also states the catch the sibling only implies: thinning from below *raises* the QMD, so
> the residual stand sits a little further from the maximum than the pre-thin QMD suggests -- the target is
> conservative in the safe direction.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The QMD is `L` (in);
the SDI values, the percent, the TPA values, and the basal area (a per-acre summary) are `dimensionless`. The
v18/v21 contract: any non-finite input, a non-positive maximum SDI or QMD, a target percent outside `(0, 100]`, or
a negative current TPA returns `{ error }` (a current TPA of 0 means "target only, no cut count"). Citation
discipline (v19/v22): `GOVERNANCE.general` over the Reineke relation by name (Reineke 1933; USDA FS stocking-guide
practice, matching the `reineke-sdi` sibling); `editionNote` prints `SDI_target = SDI_max x target% / 100`,
`TPA_target = SDI_target / (QMD/10)^1.605`, `cut = max(0, TPA_current - TPA_target)`, and
`BA_target = TPA_target x 0.005454 x QMD^2`, and states that **the maximum SDI is species-specific, the common
management band runs from ~35% (onset of competition) to ~55-60% (lower limit of the self-thinning zone), thinning
from below raises the QMD so the residual lands conservatively below the target density, and a qualified
silvicultural prescription governs** -- a management aid, not a prescription.

## 2. The tile

### 2.1 `thinning-target-tpa` -- How Many Trees to Leave

```
inputs:
  sdi_max      -    species maximum SDI (e.g. ~450 ponderosa pine, ~600 Douglas-fir)
  target_pct   %    target percent of maximum SDI, in (0, 100]
  qmd_in       in   quadratic mean diameter of the stand
  current_tpa  -    current trees per acre (0 = skip the cut count)

sdi_target  = sdi_max x target_pct / 100
tpa_target  = sdi_target / (qmd_in / 10)^1.605
cut_tpa     = current_tpa > 0 ? max(0, current_tpa - tpa_target) : null
ba_target   = tpa_target x 0.005454 x qmd_in^2        [ft^2/acre]
```

**Pinned worked example (ponderosa to the competition floor).** `SDI_max 450`, target 35%, QMD 10 in, current
300 TPA: `SDI_target = 157.5`, and at a 10 in QMD the exponent term is exactly 1, so `TPA_target = ` **157.5**
(158 trees left), `cut = ` **142.5 TPA**, `BA_target = ` **85.9 ft^2/acre**. **Cross-check (Douglas-fir upper
band).** `SDI_max 600`, target 55%, QMD 14 in, current 260 TPA: `SDI_target = 330`,
`TPA_target = 330 / 1.4^1.605 = ` **192.3**, `cut = ` **67.7 TPA**, `BA_target = ` **205.6 ft^2/acre** -- both
confirming the inverse relation against `reineke-sdi` (running the outputs back through the sibling reproduces the
target SDI exactly).

## 3. Wiring

A `tools-data.js` row (group `L`, trades `["forester", "timber"]`, matching `reineke-sdi`, placed OUTSIDE the
counted Group L comment block beside `reineke-sdi` -- the Group L audit count does NOT bump); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, `editionNote` per §1);
`test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js` (`thinning-target-tpa` ->
`computeThinningTargetTpa` in `../../calc-arborist.js`); `scripts/related-tiles.mjs` (-> `reineke-sdi` /
`quadratic-mean-diameter` / `basal-area-prism`); `data/search/aliases.json` ("thinning target", "residual trees per acre",
"leave trees", "stocking target", plus question rows); `ARBORIST_RENDERERS["thinning-target-tpa"]` appended with a
hand-written renderer (the module's `makeNumber` / `makeOutputLine` / `attachExampleButton` / `debounce` / `fmt`
helpers, mirroring `reineke-sdi`) and the id added to the arborist declare list in `app.js`; the `// dims:`
annotation directly above the compute; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning
both examples, the QMD-10 identity (`TPA_target = SDI_target`), the round-trip through `computeReinekeSdi`, and the
error seams (non-finite, non-positive SDI_max / QMD, percent out of (0, 100], negative current TPA). The
calc-arborist.js gzip cap (13000) is expected to hold (verify at build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2
fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 157.5 TPA target).

## 5. Roadmap position

Closes the last v564-named follow-on: `qmd-from-tally` measures the diameter, `reineke-sdi` diagnoses the density,
and this tile writes the residual-stand number the prescription needs. No further SDI follow-on is named; further
Group L growth stays evidence-driven.
