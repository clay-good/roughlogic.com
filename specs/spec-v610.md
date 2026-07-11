# roughlogic.com Specification v610 -- Ground Potential Rise Screen (calc-elecdesign.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-elecdesign.js`**
> (Group A, the electrical-design bench); no new module, group, or dependency. Inherits spec.md through spec-v609.md.
>
> **The gap, and the evidence for it.** Spec-v558 (`step-touch-voltage`) names this tile as a deliberate follow-on:
> "a ground-potential-rise and mesh/step-voltage-attained comparison (the actual yard voltages against these limits)."
> The step-touch tile gives the tolerable limits a person can survive; it never gives the voltage the grid actually
> rises to. That number is the ground potential rise, and it is the first screen in every IEEE 80 grounding study:
> **GPR = I_G x R_g**, the grid current times the grounding-grid resistance. The power of GPR is a shortcut the code
> makes explicit -- if the entire GPR is at or below the tolerable touch voltage, then no point in the yard can exceed
> that limit, so the grid is safe **without** the detailed mesh and step analysis. A modest 200-amp grid current on a
> 0.5-ohm grid rises only 100 volts; against a 200-volt tolerable touch, the yard passes on the spot. But a 5,000-amp
> fault on a 1-ohm grid rises 5,000 volts, twenty-five times the limit, and now the mesh and step potentials must be
> worked out in full because the GPR alone says nothing about whether any given footstep is safe. The tile computes the
> GPR and runs that screen against the tolerable touch voltage from `step-touch-voltage`, so an engineer knows in one
> step whether the grid is done or the real study is just beginning.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The grid (fault) current
is `I` (A), the grounding-grid resistance carries the dimension of resistance and the ground potential rise and the
tolerable touch voltage are `M L^2 T^-3 I^-1` (V); like the `step-touch-voltage` sibling, the resistance and voltages
are carried `dimensionless` to the parse-only lint (grounding-study quantities). The v18/v21 contract: any non-finite
input, a non-positive grid current or grid resistance, or a negative tolerable touch voltage returns `{ error }`; a
tolerable touch voltage of zero skips the screen and reports the GPR alone. Citation discipline (v19/v22):
`GOVERNANCE.general` over the IEEE Std 80 ground-potential-rise relation by name (matching the `step-touch-voltage`
sibling); `editionNote` prints `GPR = grid_current_a x grid_resistance_ohm` and the screen
`safe_by_gpr = GPR <= tolerable_touch_v`, and states that **the GPR is the whole grid's rise, the shortcut is that a
GPR at or below the tolerable touch voltage means no yard point can exceed it (no mesh/step analysis needed), a GPR
above it says nothing about any single footstep so the full mesh and step study is required, the grid current is the
portion of fault current returning through the grid to remote earth (not the total fault), and IEEE Std 80 and a
qualified grounding study govern** -- a screen, not a grounding design.

## 2. The tile

### 2.1 `ground-potential-rise` -- GPR and the IEEE 80 Tolerable-Touch Screen

```
inputs:
  grid_current_a       A      grid current I_G returning through the grid to remote earth
  grid_resistance_ohm  ohm    grounding-grid resistance to remote earth R_g
  tolerable_touch_v    V      tolerable touch voltage from step-touch-voltage (0 to skip the screen)

gpr_v        = grid_current_a x grid_resistance_ohm         [V]
safe_by_gpr  = tolerable_touch_v > 0 AND gpr_v <= tolerable_touch_v
margin_v     = tolerable_touch_v - gpr_v                     [V]  (when a limit is given)
```

**Pinned worked example (a 200-amp grid current on a 0.5-ohm grid, 200-volt tolerable touch).**
`GPR = 200 x 0.5 = ` **100 V**, which is at or below the 200-volt tolerable touch, so `safe_by_gpr = true` with a
**100-volt margin** -- the grid passes the IEEE 80 screen outright and no mesh or step analysis is needed.
**Cross-check (a 5,000-amp fault on a 1-ohm grid against the same limit).**
`GPR = 5,000 x 1.0 = ` **5,000 V**, twenty-five times the 200-volt tolerable touch, so `safe_by_gpr = false` -- the
screen fails, and the mesh and step potentials attained must be computed in full because the GPR alone cannot clear any
individual footstep.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (both examples);
`test/fixtures/compute-map.js` (`ground-potential-rise` -> `computeGroundPotentialRise` in `../../calc-elecdesign.js`);
`scripts/related-tiles.mjs` (-> `step-touch-voltage` / `neutral-grounding-resistor` / `grounding-electrode`);
`data/search/aliases.json` ("ground potential rise", "gpr grounding", "grid rise voltage", "ieee 80 gpr", "earth
potential rise", plus question rows); the id appended to the calc-elecdesign declare list in `app.js` and the
`ELECDESIGN_RENDERERS["ground-potential-rise"] = _simpleRenderer({...})` block; the `// dims:` annotation directly above
the compute; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the
GPR-equals-I-times-R relation, the screen pass/fail, the skip-when-no-limit case, and the error seams (non-finite,
non-positive current / resistance, negative tolerable). Renderer uses the module's `_simpleRenderer` factory. Group A
has no exact per-group audit count (`> 20`), so no count bump. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2
fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the 200-amp example -> 100 V, safe).

## 5. Roadmap position

Gives `step-touch-voltage` the yard-voltage side of the pair its follow-on named -- the GPR and the IEEE 80 screen --
beside `neutral-grounding-resistor` (which sets the fault current) and `grounding-electrode`. A full mesh/step-voltage-
attained solver (Km, Ks grid factors) remains a deliberate future follow-on. Further Group A growth stays
evidence-driven.
