# roughlogic.com Specification v623 -- Buffer Tank with Distribution-Loop Credit (calc-hvacsystems.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-11). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacsystems.js`**
> (Group C, HVAC systems), no new module, group, or dependency. Inherits spec.md through spec-v622.md.
>
> **The gap, and the evidence for it.** Spec-v587 (`hydronic-buffer-tank`) sizes the anti-short-cycle buffer for a
> boiler or chiller, `V = on_time x (source_min - zone_load) / (500 x delta_T)`, and its own note says the driver is
> "worst case at about zero load" and that **"the existing distribution-piping water may already supply part of the
> volume"** -- naming a distribution-volume credit as a deliberate future follow-on. The sibling tile hands back the
> *gross* buffer requirement; a tech then subtracts the water already circulating in the loop before buying a tank,
> and on a large-pipe primary loop that credit is not small. This tile does the whole job in one place: it computes
> the gross buffer exactly as spec-v587 does, computes the fluid already held in the distribution piping from its
> internal diameter and developed length (`0.0408 x d^2 x L` gallons per foot per square inch of diameter -- the same
> pure-geometry constant the `pipe-volume` and shock-chlorination tiles use), and returns the **net** tank the
> installer still has to add. The number that catches installers out: a 60-gallon gross requirement on a 1.5 in,
> 200 ft primary loop already has 18 gallons of water in the pipe, so only a **42-gallon** tank is needed -- and a
> fat, long primary can wipe the requirement out entirely, turning a tank purchase into a decoupler tee.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The on-time and swing
carry the same dimensions the `hydronic-buffer-tank` sibling assigns (`min_on_time_min: T`, `delta_t_f: T`), the
source minimum and zone load are power (`M L^2 T^-3`), the pipe internal diameter and loop length are length
(`L`), and the three volumes are `L^3`. The v18/v21 contract: any non-finite input, a non-positive on-time, source
minimum, or swing, or a negative zone load, pipe diameter, or loop length returns `{ error }`. When the minimum zone
load meets or exceeds the source minimum output, no buffer is required and the tile returns zero volumes with the
no-buffer note (the sibling's behavior). Citation discipline (v19/v22): `GOVERNANCE.general` over ASHRAE / Idronics
(Caleffi) anti-short-cycle buffer-tank practice by name, matching the `hydronic-buffer-tank` sibling; `editionNote`
prints `V_gross = on_time x (source_min - zone_load) / (500 x delta_T)`,
`loop_gal = 0.0408 x d^2 x L`, and `V_net = max(0, V_gross - loop_gal)`, and states that **the loop credit is only
valid for water fully coupled to the buffer (a common primary loop, not a decoupled secondary), the 500 factor is
for water (adjust for glycol), and the equipment minimum-cycle data and the manufacturer govern** -- a sizing aid,
not the manufacturer's data.

## 2. The tile

### 2.1 `buffer-tank-loop-credit` -- Net Buffer Tank After Crediting the Loop Water

```
inputs:
  min_on_time_min      min      required source minimum on-time (> 0)
  source_min_btu       Btu/hr   source (boiler/chiller) minimum output (> 0)
  zone_min_load_btu    Btu/hr   minimum simultaneous zone load (>= 0, 0 = worst case)
  delta_t_f            degF     allowable temperature swing (> 0)
  pipe_id_in           in       distribution-loop internal diameter (>= 0)
  loop_length_ft       ft       distribution-loop developed length (>= 0)

gross_buffer_gal = min_on_time_min x (source_min_btu - zone_min_load_btu) / (500 x delta_t_f)   [gal]
loop_volume_gal  = 0.0408 x pipe_id_in^2 x loop_length_ft                                        [gal]
net_tank_gal     = max(0, gross_buffer_gal - loop_volume_gal)                                    [gal]
```

**Pinned worked example (a small boiler on a common primary loop).** On-time 10 min, boiler minimum 60,000 Btu/hr,
zero simultaneous load, 20 degF swing, 1.5 in loop, 200 ft developed length: `gross_buffer_gal = 10 x 60000 /
(500 x 20) = ` **60 gal**, `loop_volume_gal = 0.0408 x 1.5^2 x 200 = 0.0408 x 2.25 x 200 = ` **18.36 gal**, so
`net_tank_gal = 60 - 18.36 = ` **41.64 gal** -- a 42-gallon tank, not a 60. **Cross-check (a fat, long primary
absorbs the whole requirement).** Same boiler, 2 in loop, 1,000 ft: `loop_volume_gal = 0.0408 x 4 x 1000 = `
**163.2 gal** exceeds the 60-gallon gross, so `net_tank_gal = ` **0** -- the loop water alone stops the short-cycle
and a decoupler tee replaces the tank.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, beside `hydronic-buffer-tank`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json`
(both examples); `test/fixtures/compute-map.js` (`buffer-tank-loop-credit` -> `computeBufferTankLoopCredit` in
`../../calc-hvacsystems.js`); `scripts/related-tiles.mjs` (-> `hydronic-buffer-tank` / `pipe-volume` /
`expansion-tank`); `data/search/aliases.json` ("buffer tank piping credit", "loop volume credit", "net buffer
tank", "distribution volume credit", plus question rows); `HVACSYSTEMS_RENDERERS["buffer-tank-loop-credit"]` via a
hand-written renderer (the module's `makeNumber` / `makeOutputLine` / `attachExampleButton` / `debounce` / `fmt`
helpers, mirroring `hydronic-buffer-tank`) and the id added to the calc-hvacsystems declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning both examples, the no-buffer case, the loop-covers-it clamp to zero, and the error seams (non-finite,
non-positive on-time / source / swing, negative load / diameter / length). Group C has no exact audit-count
assertion and the mechanical-governance test is an explicit list, so no count bump. The calc-hvacsystems.js gzip
cap is expected to hold (verify at build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output
read to the value (the pinned example -> gross 60 gal, loop 18.36 gal, net 41.64 gal).

## 5. Roadmap position

Closes the distribution-volume-credit follow-on spec-v587 named beside `hydronic-buffer-tank`. The glycol-corrected
fluid factor (a 2-D concentration-by-temperature table whose sources disagree on method) remains deliberately
deferred until a single authoritative table is adopted. Further Group C growth stays evidence-driven.
