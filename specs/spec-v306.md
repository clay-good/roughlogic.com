# roughlogic.com Specification v306 -- Hydronic System Flow from Load and Delta-T (calc-hvac.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v305..v307 (the pump-and-fluid fundamentals trio -- Reynolds
> number (v305), the hydronic flow from load and delta-T (this spec), pump specific speed (v307)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: the catalog sizes radiant loops (`radiant-loop-sizing`)
> and DHW recirculation (`recirc-loop-sizing`) but has no tile for the single most fundamental hydronic relationship -- the
> system flow a heating or chilled-water load needs at a chosen design delta-T. Every balancing valve, pump, and pipe size
> starts from this GPM. Adds one tile to the existing **`calc-hvac.js`** module (Group C); no new group, trade, or
> dependency. Inherits spec.md through spec-v305.md.
>
> **The gap, and the evidence for it.** The water-side heat-transport equation `Q = 500 x GPM x dT` (with
> `500 = 8.33 lb/gal x 60 min/h x 1.0 Btu/lb-degF` for water) rearranges to the design flow `GPM = Q / (500 dT)`, or for
> chilled water `GPM = 24 x tons / dT` (since `12,000/500 = 24`). For a 10-ton chilled-water coil at a 10 degF design
> delta-T, `GPM = 120,000 / (500 x 10) = 24 GPM` -- the flow the balancing contractor sets and the pipe is sized to carry.
> The delta-T is the lever: a hot-water boiler at 100,000 Btu/h and a 20 degF delta-T needs only 10 GPM, so a wide design
> delta-T shrinks the pump and pipe for the same load. `radiant-loop-sizing` lays out one loop; this tile sizes the whole
> system's flow.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The load `Q` is a power
(entered in Btu/h or tons); the design temperature difference `dT` is a temperature (degF); the flow `GPM` is a volumetric
flow (gal/min); the fluid factor (500 for water, reduced for glycol) is dimensionless in these units. The v18/v21 contract:
any non-finite input, or a load or delta-T at or below zero, returns `{ error }`. Citation discipline (v19/v22):
`GOVERNANCE.general` over the water-side sensible-heat equation by name; `editionNote` names **the hydronic flow
`GPM = Q / (500 dT)` from `Q = 500 GPM dT` (`500 = 8.33 x 60 x 1.0` for water), the chilled-water form `GPM = 24 tons/dT`,
and that a propylene-glycol mix lowers the `500` factor (about 485 at 30% PG) via its density and specific heat**, and
states that **this returns the design system flow for pure water at the sea-level factor -- it uses `500` (adjust for glycol
or a different fluid via the fluid factor), assumes the full load is carried by the entered delta-T (no bypass or primary/
secondary decoupling), and does not size the pump head (`pump-tdh`), the pipe (`pipe-velocity`), or the coil; and this is a
design aid, not a substitute for the mechanical engineer's design** -- the mechanical engineer of record's design governs.

## 2. The tile

### 2.1 `hydronic-gpm-deltat` -- Hydronic System Flow from Load and Delta-T

```
inputs:
  load      Btu/h or tons    heating/cooling load (unit selectable)
  dT_F      degF             design supply-to-return temperature difference
  factor    -                fluid factor (default 500 water; ~485 at 30% PG)

Q_btuh = (unit == tons) ? load * 12000 : load
GPM = Q_btuh / (factor * dT_F)
; chilled-water shortcut check: GPM == 24 * tons / dT_F  (water)
```

**Pinned worked example (a 10-ton chilled-water coil, 10 degF delta-T, water).** `load = 10 tons = 120,000 Btu/h`,
`dT = 10`, `factor = 500`: `GPM = 120,000 / (500 x 10) = 24 GPM`, which the `24 x 10 / 10 = 24` chilled-water shortcut
confirms. **Cross-check (a 100,000 Btu/h boiler at a wide 20 degF delta-T).** `GPM = 100,000 / (500 x 20) = 10 GPM` -- half
the flow of a 10 degF design for a comparable load, the pump-and-pipe savings a wide delta-T buys. The non-finite and
non-positive error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, matching the hydronic tiles); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the water-side heat equation, `editionNote` naming `GPM = Q/(500 dT)`,
`GPM = 24 tons/dT`, the glycol factor, and the pure-water, full-load, not-pump-head caveats);
`test/fixtures/worked-examples.json` (the chilled-water example + the boiler cross-check); `test/fixtures/compute-map.js`
(`hydronic-gpm-deltat` -> `computeHydronicGpmDeltat` in `../../calc-hvac.js`); `scripts/related-tiles.mjs` (->
`radiant-loop-sizing` / `pump-tdh` / `pipe-velocity` / `chiller-tons`); `data/search/aliases.json` ("hydronic flow",
"GPM from BTU", "500 GPM delta T", "chilled water flow", "24 tons delta T", "system flow rate", "hot water GPM", "coil flow
rate", "delta T flow"); the id appended to the existing hvac renderers block in `app.js`; the `// dims:` annotation (`load`
power, `dT` temperature, `GPM` volumetric flow, `factor` dimensionless); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the tons-to-Btu/h unit path, the `24 tons/dT` identity, and the
non-positive / non-finite error seams. No new module; re-pin `calc-hvac.js` on the `check:module-sizes` allowlist.
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the shortcut-identity assertion); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `Q_btuh` / `GPM` pair wraps on a
phone); render-no-nan + a11y sweep, output read to the value (10 tons, 10 degF -> 24 GPM).

## 5. Roadmap position

Middle of the pump-and-fluid fundamentals batch (v305..v307) in `calc-hvac.js`, supplying the system flow the pump and pipe
tiles start from. Pump specific speed (v307) follows. A full glycol fluid-factor table by concentration, the primary/
secondary decoupled-flow case, and a coil-GPM-to-pipe-size chain into `pipe-velocity` are the deliberate next follow-ons
once the trio lands.
