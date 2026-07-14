# roughlogic.com Specification v659 -- UV Required Intensity or Contact Time (calc-water.js, Group M, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-water.js`**
> (Group M, water/wastewater), no new module, group, or dependency. Inherits spec.md through spec-v658.md.
>
> **The gap, and the evidence for it.** The `uv-dose` tile (spec-v116) takes *both* the intensity and the contact
> time and checks the delivered dose against a target. The design question is the reverse: given a target dose,
> how long must a lamp of a known intensity expose the flow, or how strong must the lamp be for a fixed contact
> time. From `dose = intensity x time`, `time = dose / intensity` or `intensity = dose / time`. First-principles;
> the 40 mJ/cm^2 default target is already in the sibling. The pinned example: a **40 mJ/cm^2** target at
> **10 mW/cm^2** needs **4 s** of contact; at a fixed 8 s it needs a 5 mW/cm^2 lamp.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The target dose is
`M T^-2` (mJ/cm^2), the intensity is `M T^-3` (mW/cm^2), and the times are `T` (s). The `mW.s/cm^2 = mJ/cm^2`
identity is the same one `uv-dose` already uses. The v18/v21 contract: any non-finite input, a non-positive target
dose, or the wrong number of knowns (both intensity and time given, or neither) returns `{ error }` -- exactly one
of intensity or time is entered and the tile solves for the other. Citation discipline (v19/v22): the UV dose
relation solved for the missing operand (USEPA UV Disinfection Guidance Manual), the inverse of the uv-dose tile,
by name and with `GOVERNANCE.water`; the note states that **time = dose/intensity or intensity = dose/time, the
40 mJ/cm^2 target is editable to the validated reactor value, and a short delivered dose in service points to an
aged lamp, a fouled sleeve, or low UV transmittance** -- the validated reactor dose and the state primacy agency
govern compliance.

## 2. The tile

### 2.1 `uv-required-exposure` -- The Intensity or Contact Time Needed for a Target UV Dose

```
inputs:
  target_dose_mj_cm2   mJ/cm^2   validated target dose (> 0; default 40)
  intensity_mw_cm2     mW/cm^2   UV intensity (0 = solve for it)
  exposure_time_s      s         contact time (0 = solve for it)
                                 (enter exactly one of intensity / time)

required_time_s          = target_dose_mj_cm2 / intensity_mw_cm2   (when intensity is given)
required_intensity_mw_cm2 = target_dose_mj_cm2 / exposure_time_s    (when time is given)
```

**Pinned worked example.** `target = 40 mJ/cm^2`, `intensity = 10 mW/cm^2` (time left blank):
`time = 40 / 10 = ` **4 s** -- the exact inverse of the `uv-dose` example (10 mW/cm^2 x 4 s = 40 mJ/cm^2).
**Cross-check (solve the other operand).** Leave the intensity blank at a fixed 8 s: `intensity = 40 / 8 = `
**5 mW/cm^2**.
**Cross-check (exact inverse).** The fuzzer feeds the solved 4 s at 10 mW/cm^2 back through `uv-dose` and confirms
it delivers 40 mJ/cm^2 and meets the target.

## 3. Wiring

A `tools-data.js` row inside the `// Group M: Water` block (group `M`, trades `["water"]`, beside `uv-dose`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.water`, the note per §1); `test/fixtures/worked-
examples.json` (the time-solve pinned example plus the intensity-solve cross-check); `test/fixtures/compute-map.js`
(`uv-required-exposure` -> `computeUvRequiredExposure`); `scripts/related-tiles.mjs` (<-> `uv-dose`,
`disinfection-ct`, `chlorine-demand`); `data/search/aliases.json` ("uv required exposure", "uv contact time",
"required uv intensity", plus question rows, all collision-checked);
`WATER_RENDERERS["uv-required-exposure"]` via the `_v23SimpleRenderer` factory (field DOM ids = the input keys) and
the id added to the calc-water declare list in `app.js`; the `// dims:` annotation directly above the compute;
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both solve directions, the exact
inverse round-trip through `computeUvDose`, and the error seams (both given, neither given, non-positive target);
and the **Group M citation-audit count bump (34 -> 35 in citations.test.js)**. The two `index.html` home-count spots
go 1,107 -> 1,108 (check-readme-counts gates them). The calc-water.js gzip cap is raised as needed (verify at
build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block, the Group M count
bump); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px
audit; render + output read to the value (the pinned example -> 4 s).

## 5. Roadmap position

Completes the UV dose pair: `uv-dose` (intensity + time -> dose check) and now `uv-required-exposure` (target dose ->
the missing intensity or time), exact inverses through the same dose = intensity x time relation. Further Group M
growth stays evidence-driven.
