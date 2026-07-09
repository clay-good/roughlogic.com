# roughlogic.com Specification v485 -- Torque Wrench Extension / Crowfoot Correction (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K); no new module, group, or dependency. Inherits spec.md through spec-v484.md.
>
> **The gap, and the evidence for it.** The catalog computes the torque a bolt needs (`bolt-torque`, `flange-bolt-torque`
> from `T = K D F`) but has nothing for the single most common way a tech gets that torque wrong in the field: a crowfoot
> or extension on the torque wrench. The moment a crowfoot, a swivel adapter, or an in-line extension moves the point of
> force away from the wrench's drive, it changes the effective lever length, so the number on the wrench dial is no longer
> the number at the fastener. The correction is textbook (Snap-on / FAA AC 43.13 torque-adapter relation): the wrench
> setting `TW = TA x L / (L + E)`, where `TA` is the torque wanted at the fastener, `L` is the wrench's own lever length
> (drive to the center of the hand grip), and `E` is the adapter's effective length along the wrench axis. The catch the
> tile exists to flag is that an in-line crowfoot **over-torques** if the tech dials the target straight in: a 3 in
> crowfoot on an 18 in wrench delivers 100 / 85.7 = 17% more than the dial reads, enough to snap a small fastener or
> yield a flange stud -- and the fix a tech reaches for, mounting the crowfoot at 90 degrees to the wrench, drops the
> correction to zero because the adapter no longer lengthens the lever. The `bolt-torque` tile gives the target; nothing
> corrects the wrench that applies it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The torques are
`M L^2 T^-2`; the wrench and adapter lengths are `L`; the adapter angle and the correction percent are `dimensionless`.
The v18/v21 contract: any non-finite input, a non-positive target torque or wrench length, a negative adapter length, or
an adapter geometry that drives the effective lever to zero or less (`L + E cos(angle) <= 0`) returns `{ error }`.
Citation discipline (v19/v22): `GOVERNANCE.general` over the torque-adapter relation by name; `editionNote` names the
**standard torque-adapter correction (Snap-on / FAA AC 43.13.1B torque-wrench extension relation)**, prints
`TW = TA x L / (L + E cos(angle))` and `actual = TA x (L + E cos(angle)) / L`, and states that **`L` is measured from
the wrench drive (ratchet) center to the center of the hand grip where force is applied, `E` is the adapter's length
along the wrench axis (a crowfoot mounted at 90 degrees to the handle adds no effective length and needs no correction,
which is the standard field workaround), the relation assumes the extension lies in the plane of the swing, and the
calibrated wrench and the manufacturer's fastener torque spec govern** -- a shop aid, not a substitute for a calibrated
click at the joint.

## 2. The tile

### 2.1 `torque-adapter-correction` -- The Wrench Setting a Crowfoot Demands

```
inputs:
  target_torque_ftlb   ft-lb   the torque wanted at the fastener
  wrench_length_in     in      the torque wrench lever length (drive center to hand-grip center)
  adapter_length_in    in      the crowfoot / extension length
  adapter_angle_deg    deg     angle of the adapter from the wrench axis (0 in-line, 90 perpendicular; default 0)

E_eff  = adapter_length_in x cos(adapter_angle_deg)     [in]     effective added lever
TW     = target x wrench_length_in / (wrench_length_in + E_eff)  [ft-lb]  dial the wrench to this
actual = target x (wrench_length_in + E_eff) / wrench_length_in  [ft-lb]  what you get if you DON'T correct
correction_pct = (TW - target) / target x 100          [%]      negative = dial down
```

**Pinned worked example (a 3 in crowfoot, in-line).** To land **100 ft-lb** at a flange nut with a 3 in in-line
crowfoot on an 18 in torque wrench: `E_eff = 3 x cos(0) = 3 in`, so `TW = 100 x 18 / (18 + 3) = 1800 / 21 = ` **85.7
ft-lb** -- dial the wrench down to 85.7. Set it to 100 instead and `actual = 100 x 21 / 18 = ` **116.7 ft-lb**, a **17%
over-torque** the tile exists to flag. **Cross-check (the 90-degree workaround).** Swing the same 3 in crowfoot to 90
degrees from the handle: `E_eff = 3 x cos(90) = 0`, so `TW = 100 x 18 / 18 = ` **100 ft-lb** -- no correction, because a
perpendicular adapter does not lengthen the lever, the exact reason a tech mounts a crowfoot square to the wrench when a
chart is not handy. The tile returns the wrench setting, the uncorrected over/under-torque, and the correction percent.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the in-line crowfoot example + the
90-degree no-correction cross-check); `test/fixtures/compute-map.js` (`torque-adapter-correction` ->
`computeTorqueAdapterCorrection` in `../../calc-mechanic.js`); `scripts/related-tiles.mjs` (-> `bolt-torque` /
`flange-bolt-torque` / `bolt-stretch`); `data/search/aliases.json` ("crowfoot", "torque adapter", "torque wrench
extension", "crows foot", "wrench setting", "torque correction", "swivel adapter", "effective length"); the id appended
to the mechanic renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the over-torque relation, the 90-degree null, and the error seams
(non-finite, non-positive target / wrench length, negative adapter, degenerate lever). Hand-writes its renderer (three
`makeNumber` fields + a `makeNumber` angle, mirroring the calc-mechanic.js `hp-from-torque` pattern). Lazy-loaded, absent
from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the setting / uncorrected / correction stack wraps on a phone); render-no-nan + a11y on the new
tile, output read to the value (the 3 in crowfoot example -> 85.7 ft-lb setting).

## 5. Roadmap position

Adds the wrench-side correction beside the fastener-side target: `bolt-torque` and `flange-bolt-torque` give the torque
a joint needs, and this tile corrects the wrench that delivers it through a crowfoot or extension. An angle-of-swing
mode for a non-in-line adapter beyond the simple cos term, a torque-to-angle (turn-of-nut) companion, and a
torque-to-tension bolt-stretch cross-check are deliberate future follow-ons. Further Group K growth stays
evidence-driven.
