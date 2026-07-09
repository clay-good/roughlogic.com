# roughlogic.com Specification v565 -- Hollow / Decayed Trunk Strength Loss (calc-arborist.js, Group L, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-arborist.js`**
> (Group L, agriculture and forestry); no new module, group, or dependency. Inherits spec.md through spec-v564.md.
>
> **The gap, and the evidence for it.** `char-depth-capacity` handles the residual section of a fire-charred milled beam,
> but a tree-risk assessor screening a standing tree with internal decay has no tile. The Wagener strength-loss formula
> estimates the loss of section modulus from a central hollow, `loss% = (d^3 / D^3) x 100`, and the Mattheck t/R rule
> flags a thin sound shell. The catch is the **cube law**: strength loss goes as the cube of the hollow-to-diameter
> ratio, so a trunk can be roughly two-thirds hollow and still keep most of its strength -- the loss is small until the
> hollow is large, then rises sharply. The Mattheck threshold of a sound shell below about 30% of the radius (t/R < 0.30)
> is the common concern trigger. And an **open** cavity (a slot, not a closed pipe) is far weaker than the closed-hollow
> number. The tile takes the trunk diameter and sound-shell thickness, and returns the strength loss, the t/R ratio, and
> the concern flag -- a screen a qualified arborist and a TRAQ assessment then take further.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The trunk diameter, shell
thickness, and hollow diameter are lengths (`L`, in inches); the strength-loss percent, the t/R ratio, and the cube
ratio are `dimensionless`. The v18/v21 contract: any non-finite input, a non-positive diameter, a non-positive shell
thickness, or a shell thickness of at least half the diameter (no hollow) returns `{ error }` or a zero-loss result.
Citation discipline (v19/v22): `GOVERNANCE.general` over the strength-loss relations by name (Wagener 1963; Smiley &
Fraedrich 1992; Mattheck & Breloer t/R; ISA TRAQ); `editionNote` names the **hollow-trunk strength-loss screen**,
prints `d = D - 2t`, `loss_pct = (d^3 / D^3) x 100`, and `t_over_R = t / (D / 2)`, notes the Mattheck concern trigger
(**t/R < 0.30**), and states that **strength loss goes as the cube of the hollow ratio so a trunk can be about two-thirds
hollow and keep most of its strength (loss is small until the hollow is large then rises sharply), an open cavity (a
slot) is far weaker than this closed-hollow estimate, this is a screen not a load rating, and a qualified arborist and a
TRAQ assessment govern** -- a screening aid, not a tree-risk determination.

## 2. The tile

### 2.1 `trunk-decay-strength` -- The Cube-Law Loss That Stays Small Until the Hollow Is Large

```
inputs:
  diameter_in       in    trunk diameter outside bark D
  shell_thick_in    in    sound-wood shell thickness t (radial)

hollow_d   = diameter_in - 2 x shell_thick_in                [in]
loss_pct   = (hollow_d^3 / diameter_in^3) x 100              [%]
t_over_R   = shell_thick_in / (diameter_in / 2)              [-]
concern    = t_over_R < 0.30
```

**Pinned worked example (a 24 in trunk with a 4 in sound shell).** The hollow diameter is `24 - 8 = 16 in`, so the
strength loss is `(16^3 / 24^3) x 100 = (4096 / 13824) x 100 = ` **29.6%** -- the trunk is a third hollow by diameter
but retains about 70% of its strength, the reassurance the cube law gives. The `t/R = 4 / 12 = ` **0.33** sits just above
the 0.30 concern threshold. **Cross-check (a thinner shell crosses the trigger).** Reduce the sound shell to `3 in`
(hollow 18 in): the loss rises to `(18^3 / 24^3) x 100 = ` **42.2%**, and `t/R = 3 / 12 = ` **0.25** -- now below 0.30,
so the concern flag fires; the last inch of shell mattered far more than the first, the sharp rise the cube law produces.
The tile returns the strength loss, the t/R ratio, and the concern flag.

## 3. Wiring

A `tools-data.js` row (group `L`, trades `["arborist"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 4 in shell example + the 3 in
shell cross-check); `test/fixtures/compute-map.js` (`trunk-decay-strength` -> `computeTrunkDecayStrength` in
`../../calc-arborist.js`); `scripts/related-tiles.mjs` (-> `char-depth-capacity` / `tree-protection-zone` /
`log-limb-weight`); `data/search/aliases.json` ("hollow tree strength", "trunk decay", "wagener strength loss", "t/r
ratio", "mattheck", "tree risk decay", "sound shell", "cavity strength loss"); the id appended to the arborist
renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning both examples, the cube-law loss, the t/R ratio, the concern trigger below 0.30, and the error seams (non-
finite, non-positive diameter, shell >= half diameter). Hand-writes its renderer (mirroring the calc-arborist.js
`char-depth-capacity` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the loss / t/R / concern stack wraps on a phone); render-no-nan + a11y on the new tile, output
read to the value (the 4 in shell example -> 29.6% loss, t/R 0.33).

## 5. Roadmap position

Adds the standing-tree decay screen beside `char-depth-capacity` (charred-beam residual) and `tree-protection-zone`. An
open-cavity (opening-angle) reduction per Smiley & Fraedrich and a load-vs-capacity (wind moment against residual
section) screen are deliberate future follow-ons. Further Group L growth stays evidence-driven.
