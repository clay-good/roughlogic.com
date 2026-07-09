# roughlogic.com Specification v587 -- Hydronic Buffer Tank Sizing, Anti-Short-Cycle (calc-hvacsystems.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacsystems.js`**
> (Group C, the HVAC systems bench); no new module, group, or dependency. Inherits spec.md through spec-v586.md.
>
> **The gap, and the evidence for it.** A boiler or chiller with a minimum output larger than the smallest zone load
> short-cycles -- firing, satisfying the tiny load in seconds, and shutting off, over and over, which wears the
> equipment and wastes fuel. A buffer tank adds thermal mass so the source runs a minimum on-time. The bench sizes
> expansion tanks but not buffer tanks. The sizing is `V = t x (Q_min - Q_load) / (500 x delta_T)`, and the catch is the
> load term: the **worst case is at nearly zero load**, when the full minimum output has nowhere to go but the tank.
> Sizing the buffer at the design load badly undersizes it, because at design load there is little excess to buffer.
> The same formula sizes a chiller buffer, and existing distribution-piping water may already provide part of the
> volume. The tile takes the minimum on-time, the source minimum output, the minimum simultaneous zone load, and the
> allowable temperature swing, and returns the required buffer volume -- sized for the worst case, not the design case.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The minimum on-time is a
time (`T`, in min); the source minimum output and the zone load are powers (`M L^2 T^-3`, in Btu/hr); the allowable
temperature swing carries the temperature dimension (degrees F); the buffer volume is a volume (`L^3`, in gal); the
`500` constant (8.33 lb/gal x 60 min/hr for water) is `dimensionless`. The v18/v21 contract: any non-finite input, a
non-positive on-time, source minimum output, or temperature swing, a negative zone load, or a zone load at or above the
source minimum (no buffering needed) returns `{ error }` or a zero-volume result. Citation discipline (v19/v22):
`GOVERNANCE.general` over the buffer relations by name (ASHRAE; Idronics / Caleffi anti-short-cycle practice);
`editionNote` names the **hydronic buffer tank sizing (anti-short-cycle)**, prints
`V = on_time x (Q_min - Q_load) / (500 x delta_T)`, notes the `500` factor is for water (adjust for glycol), and states
that **the driver is the source minimum output minus the load, worst case at about zero load, so sizing at the design
load undersizes the tank badly, the same formula sizes a chiller buffer, the existing distribution-piping water may
already supply part of the volume, and the equipment minimum-cycle data and the manufacturer govern** -- a sizing aid,
not the manufacturer's data.

## 2. The tile

### 2.1 `hydronic-buffer-tank` -- Why the Buffer Is Sized at Zero Load, Not Design Load

```
inputs:
  min_on_time_min    min      required minimum burner/compressor on-time
  source_min_btu     Btu/hr   source (boiler/chiller) minimum output
  zone_min_load_btu  Btu/hr   minimum simultaneous zone load (0 for worst case)
  delta_t_f          degF     allowable buffer temperature swing

V_gal = min_on_time_min x (source_min_btu - zone_min_load_btu) / (500 x delta_t_f)     [gal]
```

**Pinned worked example (a 10-minute minimum on-time, a boiler with a 60,000 Btu/hr minimum output, worst-case zero
load, a 20 F swing).** The excess to buffer is the full `60,000 - 0 = 60,000 Btu/hr`, so the tank must be
`10 x 60,000 / (500 x 20) = 600,000 / 10,000 = ` **60 gallons** to guarantee the 10-minute run. **Cross-check (a
standing minimum load shrinks the tank).** If the smallest simultaneous zone actually draws `40,000 Btu/hr`, only
`60,000 - 40,000 = 20,000 Btu/hr` of excess needs buffering: `V = 10 x 20,000 / 10,000 = ` **20 gallons** -- a third the
size, which is exactly why sizing at a design load (rather than the worst-case near-zero load) would badly undersize the
buffer. The tile returns the required buffer volume.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the zero-load example + the standing-
load cross-check); `test/fixtures/compute-map.js` (`hydronic-buffer-tank` -> `computeHydronicBufferTank` in
`../../calc-hvacsystems.js`); `scripts/related-tiles.mjs` (-> `expansion-tank` / `boiler-pipe-sizing` /
`compressor-short-cycle`); `data/search/aliases.json` ("buffer tank", "hydronic buffer", "anti short cycle", "boiler
buffer tank", "chiller buffer", "minimum on time", "short cycle boiler", "buffer tank sizing"); the id appended to the
hvacsystems renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the buffer-volume relation, the worst-case-zero-load driver, and
the error seams (non-finite, non-positive on-time / output / swing, load >= source minimum). Hand-writes its renderer
(mirroring the calc-hvacsystems.js `expansion-tank` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the buffer-volume stack wraps on a phone); render-no-nan + a11y on the new tile, output read to
the value (the zero-load example -> 60 gallons).

## 5. Roadmap position

Adds the anti-short-cycle buffer beside `expansion-tank` (the pressure/thermal-expansion vessel) and points at
`compressor-short-cycle` (the refrigerant analog). A glycol-corrected fluid factor and a distribution-volume credit
(subtracting the piping water already in the loop) are deliberate future follow-ons. Further Group C growth stays
evidence-driven.
