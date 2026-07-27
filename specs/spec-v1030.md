# roughlogic.com Specification v1030 -- calc-plumbing.js Cap-Relief Split (New Module calc-plumbingtakeoff.js, 7 Tiles Moved, 0 New Tiles)

> **Status: LANDED (2026-07-27). Refactor spec -- no new tiles, no behavior change.**
> Splits the plumbing takeoff / materials bench out of **`calc-plumbing.js`** into a new lazy module
> **`calc-plumbingtakeoff.js`** (the 57th `calc-*` module). Inherits spec.md through spec-v1029.md.
>
> **Why now.** `calc-plumbing.js` had reached **75,543 B gz of its 76,000 B cap (99.4%)**, so the next plumbing tile
> would have failed `check-module-sizes`. `scripts/check-module-sizes.mjs` states the repo's preference in its own
> failure message: *"Either split the module per-tile (preferred) or raise the cap ... with a CHANGELOG note."* This
> module's ledger has been raised repeatedly and three separate entries in the file say a split is "the eventual
> preferred fix." This does the split instead of the eleventh raise.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. What moved, and why these seven

The **takeoff / materials** half of the plumbing bench -- what you *buy and install*, as opposed to what the
hydraulics require:

| Tile | Spec |
|---|---|
| `solder-joint-quantity` | v856 |
| `pipe-insulation-takeoff` | v857 |
| `heat-trace-sizing` | v858 |
| `pipe-purge-volume` | v894 |
| `hydronic-system-volume` | v903 |
| `pex-homerun-takeoff` | v906 |
| `solar-thermal-collector` | v987 |

They were chosen for **mechanical safety**, not just theme. All seven are the newer co-located style (compute,
example, and renderer adjacent), they occupy one contiguous block at the tail of the file, and a scan for external
identifiers found they read nothing from the rest of the module beyond the standard scaffolding (`_finiteGuard`,
`DEBOUNCE_MS`, the `ui-fields.js` helpers). **The move therefore leaves no cross-module import.**

Every tile keeps `group: "B"` -- a tile's group letter is independent of the module holding it, per the
spec-v70..v98 split precedent. No tile id, input, output, citation, or worked example changed.

## 2. The boundary that was rejected, and why it is written down

The first candidate was the larger **site-water hydraulics** cluster (open-channel flow, orifice/tank, pipe-flow
energy, thrust blocks, stormwater -- roughly 15 tiles, ~11 KB gz of relief). It was rejected after scoping, and the
findings are recorded here so the next attempt does not rediscover them:

- **`MANNING_ROUGHNESS` straddles the boundary.** It is read by exactly three tiles: `manning-slope`,
  `manning-pipe-capacity`, and `pipe-partial-flow-depth`. A clean move must take all three or leave all three;
  duplicating the table would collide with the shared-constant guards.
- **The older tiles use the split `// --- Utility N ---` layout**, where a tile's compute sits hundreds of lines away
  from its renderer (`computeManningSlope` at ~1032, `renderManningSlope` at ~1346). A contiguous-slice extraction
  would silently drag or drop code.
- **`renderManningSlope` is an exported renderer**, which carries the DOM-sentinel dimensional annotation and
  fuzzer-header requirements.
- `manning-slope` also carries a data-shard slot binding in `app.js`. That is keyed by tile id, not module, so it
  survives a move -- but it needs checking, not assuming.

That split is still worth doing and would give more relief than this one. It is a separate piece of work with a
separate risk profile, and it should be done deliberately rather than folded into a cap-relief change.

## 3. Result

| | before | after |
|---|---|---|
| `calc-plumbing.js` | 75,543 B gz (99.4% of 76,000) | **69,039 B gz (90.8%)** |
| `calc-plumbingtakeoff.js` | -- | **8,356 B gz (76.0% of 11,000)** |

`calc-plumbing.js` gains roughly 7,000 B of headroom, enough for several more plumbing tiles.

## 4. Wiring

The five new-module scaffolding spots: `app.js` `declare("./calc-plumbingtakeoff.js", "PLUMBINGTAKEOFF_RENDERERS",
[...])` (the seven ids removed from the plumbing declare list), `sw.js` precache list, `scripts/build.mjs` FILES
array, `scripts/check-module-sizes.mjs` cap entry (dated ledger comment), and `scripts/check-dimensions.mjs`
`GRADUATED_MODULES` set. Plus `test/fixtures/compute-map.js` (7 module paths), `test/unit/bounds-fuzzer.test.js`
(7 import statements repathed), the README's gate-anchored `"N per-group calculator modules"` phrase (56 -> 57), and
the regenerated corpus / derivations artifacts. `calc-plumbing.js` keeps a split-note comment naming the destination,
matching the spec-v86 septic-split precedent already in that file.

## 5. Verification

Behavior-preserving refactor, so the evidence is that **nothing changed**: full `npm run lint` (all gates, including
`check-dimensions`, `check-related-tiles`, `check-us-defaults`, corpus and tile-index cross-validation), **5,873 unit
tests pass with 0 failures** (the same count as before the split -- every moved tile's bounds-fuzzer row and worked
example still runs, now against the new module path), `npm run build`, and `check-dist` / `check-shells` /
`check-module-sizes` / `check-shell-mobile` / `check-csp` / `data:verify` / `check-readme-counts`. All seven moved
tiles were additionally **render-verified in a real browser** via the targeted Playwright a11y run, which is the
failure mode a module move actually risks: a tile that resolves in Node but never mounts because its renderer is not
reachable from the new registry.
