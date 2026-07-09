# roughlogic.com Specification v585 -- Theoretical Chimney Draft (calc-hvacservice.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacservice.js`**
> (Group C, the HVAC service bench); no new module, group, or dependency. Inherits spec.md through spec-v584.md.
>
> **The gap, and the evidence for it.** The natural draft that pulls flue gas up a chimney comes from the density
> difference between the hot column inside and the cold air outside, and the bench has no tile for it. The theoretical
> draft is `D_t = 0.52 x B x H x (1/T_o - 1/T_m)` with temperatures absolute (Rankine) and the result in inches of water
> column. Three catches make it easy to get wrong. It is the **theoretical, no-flow** draft -- the net available draft
> after flow and fitting losses is far lower (apply roughly 0.5 to 0.8). The barometric pressure **must be altitude-
> corrected**, because thinner air at elevation cuts the draft. And the temperatures must be **absolute**, with `T_m` the
> mean flue-gas temperature, not the outlet. The tile takes the stack height, the ambient and mean flue temperatures,
> and the barometric pressure, and returns the theoretical draft and a net-available estimate -- the number that tells
> whether a chimney will pull the appliance's products.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The stack height is a
length (`L`, in ft); the ambient and mean flue temperatures carry the temperature dimension (worked in Rankine); the
barometric pressure is `M L^-1 T^-2` (psia); the theoretical draft is a pressure (in inches of water column, carried per
the empirical constant); the `0.52` constant and the net-available factor are `dimensionless`. The v18/v21 contract:
any non-finite input, a non-positive stack height or barometric pressure, a flue temperature not above ambient (no
draft), or a temperature at or below absolute zero returns `{ error }`. Citation discipline (v19/v22):
`GOVERNANCE.general` over the draft relation by name (ASHRAE Handbook HVAC Systems, chimney/vent; NFPA 211);
`editionNote` names the **theoretical chimney draft**, prints
`D_t = 0.52 x B x H x (1 / T_o - 1 / T_m)` with temperatures in Rankine and `D_t` in inches of water column, and the
net-available `D_net = factor x D_t` (factor about 0.5 to 0.8), and states that **this is the theoretical no-flow draft
so the net available after flow and fitting losses is far lower, the barometric pressure must be altitude-corrected
because thinner air at elevation cuts the draft, the temperatures must be absolute and T_m is the mean flue temperature
not the outlet, and the venting standard and the appliance instructions govern** -- a design aid, not a venting sign-off.

## 2. The tile

### 2.1 `chimney-draft` -- The No-Flow Draft (and Why Altitude and Absolute Temps Matter)

```
inputs:
  stack_height_ft    ft     vertical stack height H
  ambient_temp_f     F      outside ambient temperature T_o
  mean_flue_temp_f   F      mean flue-gas temperature T_m
  baro_psia          psia   barometric pressure (altitude-corrected)
  net_factor         -      flow/fitting-loss factor (0.5 to 0.8, default 0.6)

T_o_R  = ambient_temp_f + 460
T_m_R  = mean_flue_temp_f + 460
D_t    = 0.52 x baro_psia x stack_height_ft x (1 / T_o_R - 1 / T_m_R)    [in wc]
D_net  = net_factor x D_t                                                [in wc]
```

**Pinned worked example (a 30 ft stack, 60 F ambient, 400 F mean flue, sea-level 14.7 psia).** In absolute terms
`T_o = 520 R` and `T_m = 860 R`, so `D_t = 0.52 x 14.7 x 30 x (1/520 - 1/860) = 229.3 x 0.000760 = ` **0.174 in wc** of
theoretical draft, and at a 0.6 net factor the usable draft is `0.6 x 0.174 = ` **0.105 in wc** -- a light natural
draft. **Cross-check (altitude cuts the draft).** Move the same chimney to a 5,000 ft town where the barometric
pressure is about 12.2 psia: `D_t = 0.52 x 12.2 x 30 x 0.000760 = ` **0.145 in wc** -- 17% less draft purely from the
thinner air, the reason a vent that drafts at sea level can be marginal in the mountains. The tile returns the
theoretical and net-available draft.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac", "plumbing"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the sea-level example + the
altitude cross-check); `test/fixtures/compute-map.js` (`chimney-draft` -> `computeChimneyDraft` in
`../../calc-hvacservice.js`); `scripts/related-tiles.mjs` (-> `combustion-air` / `flue-gas-dewpoint` / `excess-air-o2`);
`data/search/aliases.json` ("chimney draft", "theoretical draft", "stack draft", "natural draft", "flue draft in wc",
"draft altitude", "ashrae chimney", "vent draft"); the id appended to the hvacservice renderers declare in `app.js`;
the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples,
the Rankine conversion, the draft relation, the altitude reduction, the net factor, and the error seams (non-finite,
non-positive height / pressure, flue <= ambient, sub-absolute-zero temp). Hand-writes its renderer (mirroring the
calc-hvacservice.js pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the theoretical / net draft stack wraps on a phone); render-no-nan + a11y on the new tile, output
read to the value (the sea-level example -> 0.174 in wc theoretical, 0.105 net).

## 5. Roadmap position

Adds the draft calculation to the venting family beside `combustion-air` (NFPA 54 openings) and points at
`flue-gas-dewpoint` (the condensation risk in the same vent). A required-vs-available draft comparison (against the
appliance's draft requirement) and a stack-sizing companion are deliberate future follow-ons. Further Group C growth
stays evidence-driven.
