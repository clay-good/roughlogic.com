# roughlogic.com Specification v635 -- Substrate Concentration for a Target Fraction of Vmax (calc-lab.js, Group T, 1 New Tile)

> **Status: PROPOSED (2026-07-11). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 charter (Group T lab-science, already in the catalog). Adds one
> tile to **`calc-lab.js`** (Group T), no new module, group, or dependency. Inherits spec.md through spec-v634.md.
>
> **The gap, and the evidence for it.** The `michaelis-menten` tile goes one way: enter Vmax, Km, and the substrate
> concentration, get the reaction velocity. The bench question is often the inverse -- "how much substrate do I need
> to run this enzyme at 90% of Vmax?" -- which sets the assay concentration and shows just how much excess
> saturation costs. Inverting the same hyperbola is one line: `[S] = Km x f/(1 - f)` for a target fraction
> `f = v/Vmax`. The number this settles: reaching half of Vmax takes exactly one Km (the definition of Km), but 90%
> takes **9 x Km** and 99% takes **99 x Km** -- the runaway excess that is why an enzyme approaches Vmax but never
> reaches it, made explicit instead of guessed at through the forward tile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`michaelis-menten` forward tile: the Km, target fraction, substrate, and Km-multiple are all `dimensionless`
(concentrations in the user's own units, ratios otherwise). The v18/v21 contract: any non-finite input, a
non-positive Km, or a target fraction outside `(0, 100)` percent returns `{ error }` (at 100% the required substrate
is infinite -- Vmax is never reached). Citation discipline (v19/v22): the Michaelis-Menten equation inverted for the
substrate concentration by name; the note states that **[S] = Km x f/(1 - f), at 50% [S] = Km (the definition of
Km), the required concentration climbs steeply toward saturation (9 x Km at 90%, 99 x Km at 99%), and this assumes
steady state with substrate far in excess of enzyme** -- the actual assay conditions govern.

## 2. The tile

### 2.1 `substrate-for-velocity` -- How Much Substrate for a Target Fraction of Vmax

```
inputs:
  km              -    Michaelis constant (substrate at half Vmax, in the user's concentration units; > 0)
  target_percent  %    desired velocity as a fraction of Vmax (in (0, 100))

f          = target_percent / 100                [-]
substrate  = km x f / (1 - f)                    [same units as Km]
fold_km    = f / (1 - f)                         [-]   (substrate as a multiple of Km)
```

**Pinned worked example (running at 90% of Vmax).** Km = 25 uM, target = 90%: `f = 0.90`, `substrate = 25 x
0.90/0.10 = ` **225 uM** (`fold_km = 9`, i.e. 9 x Km). Feeding 225 uM back into `michaelis-menten` with the same Km
returns 90% of Vmax, closing the loop. **Cross-check (the Km identity and the saturation tail).** target = 50% gives
`substrate = 25 x 0.5/0.5 = ` **25 uM = Km** exactly (the definition of Km); target = 99% gives `substrate = ` **2,475
uM = 99 x Km** -- an order of magnitude more substrate for the last nine points, the diminishing return the hyperbola
imposes.

## 3. Wiring

A `tools-data.js` row (group `T`, trades `["lab"]`, beside `michaelis-menten`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (Michaelis-Menten inverted, the note per §1); `test/fixtures/worked-examples.json` (both
examples); `test/fixtures/compute-map.js` (`substrate-for-velocity` -> `computeSubstrateForVelocity` in
`../../calc-lab.js`); `scripts/related-tiles.mjs` (-> `michaelis-menten` / `doubling-time` where present);
`data/search/aliases.json` ("substrate for velocity", "michaelis menten inverse", "substrate for 90 percent vmax",
"km multiple for saturation", plus question rows); `LAB_RENDERERS["substrate-for-velocity"]` via a hand-written
renderer (the module's `makeNumber` / `makeOutputLine` / `attachExampleButton` / `debounce` / `fmt` helpers,
mirroring `michaelis-menten`) and the id added to the calc-lab declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples, the exact round-trip through `computeMichaelisMenten`, the [S]=Km-at-50% identity, and the error seams
(non-finite, non-positive Km, target out of (0, 100)). Group T has no exact audit-count assertion and the
mechanical-governance test is an explicit list, so no count bump. The calc-lab.js gzip cap is expected to hold
(verify at build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output
read to the value (the pinned example -> substrate 225 uM, 9 x Km).

## 5. Roadmap position

Completes the Michaelis-Menten pair: the forward tile gives velocity from substrate, this one gives the substrate
for a target velocity. Both are the same hyperbola solved each way. Further Group T growth stays evidence-driven.
