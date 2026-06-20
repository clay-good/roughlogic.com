# roughlogic.com Specification v114 -- Smooth-Bore Nozzle Flow (GPM from Nozzle Pressure) (calc-fire.js, Group F, 1 New Tile)

> **Status: SPECIFIED 2026-06-20, awaiting an execution pass.** In-scope catalog expansion under
> the spec-v106 charter: one fire-ground tile from first-principles fire-stream hydraulics, incident
> command governed. Group F is the documented edge-case keep (spec-v106 §8): clean public physics,
> the pump operator owns the call. Adds one tile to **`calc-fire.js`**; no new module, group, or
> dependency. Inherits spec.md through spec-v113.md.
>
> **The gap, and the evidence for it.** The catalog computes nozzle *reaction* from pressure and
> flow (`Nozzle / Fire-Stream Reaction Force`, 1.57 d^2 NP) and hydrant GPM from a Pitot at the
> hydrant outlet (`Hydrant Flow`), but never the forward fire-stream answer a pump operator sets
> the panel by: the GPM a smooth-bore tip delivers at a given nozzle pressure. That is the everyday
> "am I flowing my rated gallons?"

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. Flow
is `L^3 T^-1`, bore diameter `L`, nozzle pressure `M L^-1 T^-2`. The bundled discharge coefficient
(29.7 for the GPM = 29.7 d^2 sqrt(NP) smooth-bore relation) and the default nozzle pressures (50
psi handline, 80 psi master) are annotated editable fields. The v18/v21 contract: any non-finite
input, or a non-positive bore or nozzle pressure, returns `{ error }`. Citation discipline
(v19/v22): `GOVERNANCE.general` over the IFSTA smooth-bore discharge relation; no licensed table is
reproduced; incident command and the pump operator govern.

## 2. The tile

### 2.1 `smooth-bore-flow` -- Smooth-Bore Nozzle Flow (GPM from Nozzle Pressure)

```
inputs:
  bore_in              L              tip (orifice) diameter
  nozzle_pressure_psi  M L^-1 T^-2    nozzle pressure (default 50 handline / 80 master)

gpm = 29.7 x bore_in^2 x sqrt(nozzle_pressure_psi)
companion: reaction_lb = 1.57 x bore_in^2 x nozzle_pressure_psi   (cross-ref to the reaction tile)
```

**Pinned worked example.** A 1-1/8 in tip (1.125 in) at 50 psi: `gpm = 29.7 x 1.125^2 x sqrt(50) =
29.7 x 1.2656 x 7.071 = 266 gpm`. **Cross-check:** a 1-1/2 in master tip at 80 psi: `gpm = 29.7 x
2.25 x 8.944 = 598 gpm`. The nozzle pressure is editable for the tip in use; incident command
governs the flow target.

## 3. Wiring

A `tools-data.js` row (group `F`, trade `["fire"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the 29.7 d^2 sqrt(NP) formula, IFSTA Pumping Apparatus
by name); worked-examples fixtures (example + cross-check); `compute-map.js` (`smooth-bore-flow` ->
`computeSmoothBoreFlow` in `../../calc-fire.js`); `related-tiles.mjs` (->
`nozzle-fire-stream-reaction` / `pump-discharge-pressure` / `master-stream-reach`);
`data/search/aliases.json` ("smooth bore gpm", "nozzle flow", "tip flow", "gpm from nozzle
pressure", "fire stream flow"); the id appended to the existing `FIRE_RENDERERS` declare in
`app.js`; the `// dims:` annotation; regenerated corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning the example, cross-check, and error seams. Raise the `calc-fire.js` size cap by ~20
percent if needed; bump the `citations.js` cap if needed. Lazy-loaded, absent from home first
paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` +1 tile);
`npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated
sitemap); `data:verify`; worked-examples runner; 320 px audit (the GPM and reaction lines wrap);
render-no-nan + a11y sweep, output read to the value (1-1/8 in / 50 psi -> 266 gpm; 1-1/2 in / 80
psi -> 598 gpm).

## 5. Roadmap position

Pairs the forward fire-stream flow with the existing reaction and pump-discharge tiles so a pump
operator can move bore -> flow -> reaction -> pump pressure in one hop each. Further Group F growth
stays evidence-driven.
