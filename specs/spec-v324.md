# roughlogic.com Specification v324 -- Mean Piston Speed and RPM-Limit Reading (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v323..v325 (the engine-build performance trio -- injector
> size (v323), mean piston speed (this spec), trap-speed horsepower (v325)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: the catalog gives displacement, compression ratio,
> and horsepower, but nothing tells a builder whether an rpm target is safe for the stroke -- the mean piston speed, the
> single best predictor of reciprocating-assembly stress and the reason a long-stroke engine cannot rev like a short-stroke
> one. Adds one tile to the existing **`calc-mechanic.js`** module (Group K); no new group, trade, or dependency. Inherits
> spec.md through spec-v323.md.
>
> **The gap, and the evidence for it.** Mean piston speed is the average speed the piston travels over a stroke,
> `MPS = 2 x stroke x RPM`, which in shop units (stroke in inches, speed in ft/min) is `MPS = stroke_in x RPM / 6`. It sets
> the inertial load on the rods, pins, and bearings independent of bore, so it is the number that says whether an rpm is
> conservative or on the edge: street and endurance builds stay under about 3,500 to 4,000 ft/min, well-built performance
> engines run 4,000 to 4,500, and only race engines with exotic parts exceed 4,500. For a 3.48 in stroke small-block at
> 6,000 rpm, `MPS = 3.48 x 6,000 / 6 = 3,480 ft/min` -- comfortably in the street band; take the same engine to 7,000 rpm
> and it hits 4,060 ft/min, into performance territory. The horsepower tile rewards rpm; this tile prices its risk.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The stroke is a length (in);
the engine speed `RPM` is a rotational speed (rev/min); the mean piston speed is a speed (reported in ft/min and m/s); the
regime is a categorical band. The v18/v21 contract: any non-finite input, or a stroke or RPM at or below zero, returns
`{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the mean-piston-speed relation by name; `editionNote`
names **the mean piston speed `MPS = 2 x stroke x RPM` (`= stroke_in x RPM / 6` in ft/min), and the practical bands
(~<3,500 to 4,000 ft/min street/endurance, 4,000 to 4,500 performance, >4,500 race), as compiled in the engine-building
references**, and states that **this returns the mean piston speed and its regime reading -- it is the average (not peak,
which is roughly `pi/2` higher and offset by the rod ratio) speed, the bands are guidance for typical materials (a
specific assembly's limit depends on the rods, pistons, and pins), and it does not compute the peak acceleration or the
inertial bearing load; and this is a shop aid** -- the component makers' rpm ratings govern.

## 2. The tile

### 2.1 `mean-piston-speed` -- Mean Piston Speed and RPM-Limit Reading

```
inputs:
  stroke_in   in       crankshaft stroke
  rpm         rev/min  engine speed

mps_fpm = stroke_in * rpm / 6                    ; mean piston speed, ft/min
mps_ms  = mps_fpm * 0.00508                      ; m/s
regime  = mps_fpm < 4000 ? "street/endurance"
        : mps_fpm < 4500 ? "performance"
        : "race-only"
```

**Pinned worked example (a 3.48 in stroke at 6,000 rpm).** `stroke = 3.48`, `rpm = 6,000`:
`MPS = 3.48 x 6,000 / 6 = 3,480 ft/min` (17.7 m/s) -> **street/endurance**. **Cross-check (rev it to 7,000 rpm).**
`MPS = 3.48 x 7,000 / 6 = 4,060 ft/min` -> **performance** -- the same short-stroke engine crosses into the harder-use band
just from rpm, and a longer 4.00 in stroke would already sit at 4,000 ft/min at only 6,000 rpm, the trade a stroker build
accepts. The non-finite and non-positive error paths bracket the result, and the regime crosses at 4,000 and 4,500 ft/min.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic"]`, matching `displacement-cr`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the mean-piston-speed relation, `editionNote` naming `MPS = stroke_in x RPM/6`,
the regime bands, and the average-not-peak, guidance-band caveats); `test/fixtures/worked-examples.json` (the 6,000 rpm
example + the 7,000 rpm cross-check); `test/fixtures/compute-map.js` (`mean-piston-speed` -> `computeMeanPistonSpeed` in
`../../calc-mechanic.js`); `scripts/related-tiles.mjs` (-> `displacement-cr` / `hp-from-torque` / `volumetric-efficiency` /
`injector-size`); `data/search/aliases.json` ("mean piston speed", "piston speed", "rpm limit stroke", "MPS engine", "safe
rpm", "reciprocating stress", "stroke rpm", "piston speed limit", "engine rpm ceiling"); the id appended to the existing
mechanic renderers block in `app.js`; the `// dims:` annotation (`stroke` length, `rpm` rotational speed, `mps` speed);
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the ft/min-to-m/s conversion,
the regime boundaries, and the non-positive / non-finite error seams. No new module; re-pin `calc-mechanic.js` on the
`check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the regime-boundary assertions); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `mps` ft/min and m/s with the
regime wrap on a phone); render-no-nan + a11y sweep, output read to the value (3.48 in at 6,000 -> 3,480 ft/min).

## 5. Roadmap position

Middle of the engine-build performance batch (v323..v325) in `calc-mechanic.js`, adding the durability read to the fuel and
power tiles. Trap-speed horsepower (v325) follows. The peak piston speed/acceleration with the rod-ratio offset, the
inertial bearing load, and a rod-ratio geometry tile are the deliberate next follow-ons once the trio lands.
