# roughlogic.com Specification v509 -- Countersink Diameter and Cutting Depth (calc-machining.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-machining.js`**
> (Group K, the machining bench); no new module, group, or dependency. Inherits spec.md through spec-v508.md.
>
> **The gap, and the evidence for it.** `drill-point-depth` handles the conical tip a drill leaves, but nothing converts
> a countersink between the diameter a print calls out and the Z-depth a machinist dials into the machine. That
> conversion is the whole job of the tile, because the two live in different units: the print specifies the finished
> **major diameter** of the countersink, while the operator sets a **plunge depth**. A few thousandths of over-plunge
> and a flat-head screw sits proud or buried. The second catch is the included angle: 82 degrees is the inch flat-head
> standard and 90 degrees is the metric standard, and they are **not interchangeable** in the same countersink -- a
> screw and a sink of mismatched angles never seat flush. The tile takes the desired countersink diameter, the included
> angle, and the pilot-hole diameter, and returns the Z-depth below the surface to reach that diameter, so the operator
> dials a depth that produces the diameter the print wanted.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The countersink diameter,
the pilot-hole diameter, and the cutting depth are lengths (`L`, in inches); the included angle is an angle (in degrees,
carried as `dimensionless`, the lint having no angle base). The v18/v21 contract: any non-finite input, a non-positive
countersink diameter, a negative pilot-hole diameter, a pilot-hole diameter at or above the countersink diameter, or an
included angle outside `(0, 180)` returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the
countersink-geometry relation by name (Machinery's Handbook countersinking; 82 deg inch / 90 deg metric flat-head
heads); `editionNote` names the **countersink diameter-to-depth relation**, prints
`Z = (D_cs - d_hole) / (2 x tan(angle / 2))` (the depth below the surface to open the cone from the pilot hole to the
countersink diameter) and the full-cone travel `Z_full = D_cs / (2 x tan(angle / 2))`, and states that **the print
calls out a diameter while the machine is set to a depth (a small over-plunge sits a flat-head screw proud or sunken),
82 degree inch flat-head heads and 90 degree metric heads are not interchangeable in the same sink, and the actual tool
geometry and the fastener callout govern** -- a setup aid, not the print.

## 2. The tile

### 2.1 `countersink-depth` -- Dialing a Z-Depth When the Print Calls a Diameter

```
inputs:
  countersink_dia_in   in    desired finished (major) countersink diameter D_cs
  included_angle_deg   deg   included angle (82 inch flat-head / 90 metric / 100 / 120)
  pilot_hole_dia_in    in    the pilot / through-hole diameter the sink opens from

half     = included_angle_deg / 2
Z_in     = (countersink_dia_in - pilot_hole_dia_in) / (2 x tan(half deg))     [in]   depth from surface
Z_full   = countersink_dia_in / (2 x tan(half deg))                          [in]   theoretical full-cone travel
```

**Pinned worked example (a 0.500 in countersink, 82 degree inch head, 0.250 in pilot hole).**
`Z = (0.500 - 0.250) / (2 x tan(41)) = 0.250 / (2 x 0.8693) = 0.250 / 1.7386 = ` **0.1438 in** below the surface -- the
plunge depth that opens the existing quarter-inch hole out to a half-inch cone. **Cross-check (a shallower angle sinks
deeper for the same diameter).** Cut the same 0.500 in diameter with a 60 degree tool (a lathe-center style sink):
`Z = 0.250 / (2 x tan(30)) = 0.250 / 1.1547 = ` **0.2165 in** -- the narrower included angle drives the tool half again
as deep to reach the identical diameter, which is why the angle callout matters as much as the diameter. The tile
returns the plunge depth and the full-cone travel.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["machinist", "mechanic"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 82 degree example + the
60 degree cross-check); `test/fixtures/compute-map.js` (`countersink-depth` -> `computeCountersinkDepth` in
`../../calc-machining.js`); `scripts/related-tiles.mjs` (-> `drill-point-depth` / `keyseat-key-size` / `tap-drill`);
`data/search/aliases.json` ("countersink depth", "countersink diameter", "82 degree countersink", "flat head screw
sink", "csink z depth", "counterbore vs countersink", "included angle depth", "machinist countersink"); the id appended
to the machining renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the depth growing as the angle narrows, the Z < Z_full ordering,
and the error seams (non-finite, non-positive countersink diameter, pilot >= countersink, angle out of range). Hand-
writes its renderer (mirroring the calc-machining.js `drill-point-depth` pattern). Lazy-loaded, absent from home first
paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the depth / full-cone stack wraps on a phone); render-no-nan + a11y on the new tile, output read
to the value (the 82 degree example -> 0.1438 in).

## 5. Roadmap position

Adds the countersink setup number beside `drill-point-depth` (the drill tip) and the tapping tiles. A counterbore-depth
companion (flat-bottom recess for socket-head caps) and a flat-head-screw-flush check (does the head sit at the surface
for a given screw and material) are deliberate future follow-ons. Further Group K growth stays evidence-driven.
