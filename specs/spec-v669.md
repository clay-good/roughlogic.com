# roughlogic.com Specification v669 -- Chimney Height for a Target Draft (calc-hvacservice.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacservice.js`** (Group
> C, HVAC), no new module, group, or dependency. Inherits spec.md through spec-v668.md.
>
> **The gap, and the evidence for it.** Spec-v585 (`chimney-draft`) runs the natural-draft relation forward: given the
> stack height, temperatures, and barometric pressure, it returns the draft `D_t = 0.52 x B x H x (1/T_o - 1/T_m)` and a
> net-available estimate. The design question a mechanical contractor actually asks is the inverse -- **how tall a stack
> do I need to produce the draft the appliance requires**. The forward tile makes you guess a height and re-read the
> draft; the inverse solves it directly: `H = D_net_target / (net_factor x 0.52 x B x (1/T_o - 1/T_m))`. The number this
> settles: a 400 F mean flue over 60 F ambient at sea level needs about **30 ft** for a **0.10 in wc** net draft, and at
> 5,000 ft (~12.2 psia) the thinner air demands **36 ft** for the same draft -- the altitude penalty the forward tile
> reports as a smaller number, here turned into the taller stack it forces.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`chimney-draft` sibling: the target draft and the barometric pressure are `M L^-1 T^-2` (in wc, psia), the temperatures
are `T` (deg F, converted to Rankine internally), the net factor is `dimensionless`, and the returned height is `L`
(ft). The `0.52` constant and the `460` Rankine offset are the sibling's. The v18/v21 contract: any non-finite input,
or a non-positive target draft / barometric pressure / net factor, or a mean flue temperature at or below ambient (no
draft possible), returns `{ error }`. Citation discipline (v19/v22): ASHRAE Handbook HVAC Systems (chimney/vent) / NFPA
211 theoretical chimney draft solved for the height, by name; the note states that **the target is the NET draft (the
net_factor of 0.5 to 0.8 already accounts for flow and fitting losses), the barometric pressure must be
altitude-corrected because thinner air at elevation cuts the draft, T_m is the mean flue temperature not the outlet, and
this is a design aid, not a venting sign-off -- NFPA 211 and the appliance instructions govern**.

## 2. The tile

### 2.1 `chimney-height-for-draft` -- Chimney Height for a Target Draft

```
inputs:
  target_draft_net_inwc  in wc  net draft the appliance needs (> 0)
  ambient_temp_f         F      outside air temperature
  mean_flue_temp_f       F      mean flue-gas temperature (> ambient)
  baro_psia              psia   barometric pressure, altitude-corrected (> 0, default 14.7)
  net_factor             -      net-available factor 0.5-0.8 (> 0, default 0.6)

T_o_R = ambient + 460; T_m_R = mean_flue + 460
H = target_draft_net_inwc / (net_factor x 0.52 x baro_psia x (1/T_o_R - 1/T_m_R))   [ft]
```

**Pinned worked example (a sea-level stack).** target = 0.1046 in wc, T_o = 60 F, T_m = 400 F, B = 14.7 psia, factor =
0.6: with T_o_R = 520 and T_m_R = 860, `H = 0.1046 / (0.6 x 0.52 x 14.7 x (1/520 - 1/860)) = ` **30.0 ft**; feeding 30 ft
back through `chimney-draft` returns a net draft of 0.1046 in wc, the input. **Cross-check (altitude).** Same target and
temperatures at 5,000 ft (~12.2 psia): `H = ` **36.1 ft** -- about 20% taller purely because the thinner air produces
less draft per foot, the reciprocal of the forward tile's altitude reduction.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac", "plumbing"]`, beside `chimney-draft`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (ASHRAE / NFPA 211 solved for height, `GOVERNANCE.general` matching the sibling, the note
per §1); `test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js`
(`chimney-height-for-draft` -> `computeChimneyHeightForDraft` in `../../calc-hvacservice.js`);
`scripts/related-tiles.mjs` (-> `chimney-draft` / `combustion-air` / `excess-air-o2` / `flue-gas-combustion-eff`, and the
forward tile links back); `data/search/aliases.json` ("chimney height", "how tall a chimney", "stack height for draft",
plus adjacent rows); `HVACSERVICE_RENDERERS["chimney-height-for-draft"]` via a hand-written renderer (the module's
`makeNumber` / `makeOutputLine` / `attachExampleButton` / `debounce` / `fmt` helpers, mirroring `chimney-draft`) and the
id added to the calc-hvacservice declare list in `app.js`; the `// dims:` annotation directly above the compute;
regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning both examples, the
altitude increase, the round-trip through `computeChimneyDraft`, and the error seams. The Group C audit-coverage test
asserts a lower bound and only requires a citation entry (present); the mechanical-governance test uses an explicit id
list (this tile is not on it), so `GOVERNANCE.general` is correct and no count bump is needed. The calc-hvacservice.js
gzip cap is expected to hold (verify at build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes); `npm test` (+2 fixtures, the new
fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner;
320 px audit; render + output read to the value (the pinned example -> 30 ft at sea level for a 0.10 in wc net draft).

## 5. Roadmap position

Pairs the forward chimney tile (`chimney-draft`, draft from height) with its inverse (height from the target draft), the
two halves of the venting-sizing question. Further Group C growth stays evidence-driven.
