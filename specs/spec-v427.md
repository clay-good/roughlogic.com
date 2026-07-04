# roughlogic.com Specification v427 -- Sewage Force-Main Scour Velocity (calc-drainage.js, Group B, 1 New Tile)

> **Status: LANDED (2026-07-04, 0.148.0; proposed 2026-07-03). Second tile of the drainage-hydraulics trio (v426 overflow scupper -> v427 sewage
> force-main velocity -> v428 stormwater detention volume). `sump-basin-sizing` checks the ejector basin's drawdown and
> cycling; this tile handles the other half of a pressurized sewage system -- the force-main pipe size that keeps solids
> from settling out, the scour velocity.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A sewage force main must move fast enough to keep
> solids in suspension: IPC 712 and the Hydraulic Institute call for a minimum scour velocity of about `2 ft/s`. The velocity
> is `v = 0.4085 * GPM / d^2` (with `d` the inside diameter in inches), so an oversized main runs too slow and clogs. The
> minimum diameter that still scours at the pump flow is `d = sqrt(0.4085 * GPM / 2)`. `sump-basin-sizing` handles the basin,
> not the force-main velocity. This adds the force-main tile to the existing **`calc-drainage.js`** module (Group B); no new
> group, trade, or dependency. Inherits spec.md through spec-v426.md.
>
> **The gap, and the evidence for it.** A `50 GPM` grinder pump into a `2 in` force main runs at `v = 0.4085*50/2^2 = 5.11
> ft/s`, well above the `2 ft/s` scour minimum. Upsize the main to `3 in` and the velocity drops to `2.27 ft/s`, still just
> scouring; the largest diameter that keeps `2 ft/s` is `d = sqrt(0.4085*50/2) = 3.20 in`. Go bigger and solids settle and
> plug the line. No tile does this; the catalog sized the basin but not the pipe that keeps it clear.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The pump flow is a volumetric
flow (GPM); the inside diameter is a length (in); the velocity is a speed (ft/s). The v18/v21 contract: any non-finite
input, or a non-positive flow or diameter, returns `{ error }`; the tile reports the velocity at the given diameter, the
maximum diameter that still holds the `2 ft/s` scour minimum, and a pass/fail against that minimum. Citation discipline
(v19/v22): `GOVERNANCE.general` over the sewage force-main scour velocity by name; `editionNote` names **the velocity
`v = 0.4085 * GPM / d^2` (d inside diameter in inches), the IPC 712 / Hydraulic Institute minimum scour velocity of about
`2 ft/s` (and an upper practical limit near `8 ft/s`), and the scour-diameter `d = sqrt(0.4085 * GPM / 2)`**, and states that
**this returns the force-main velocity and the scour-limited pipe size, that grinder-pump systems may use a lower minimum,
that surge and head loss are separate checks, and that it is a design aid, not a substitute for the pump curve or the AHJ**.

## 2. The tile

### 2.1 `sewage-force-main-velocity` -- Sewage Force-Main Scour Velocity

```
inputs:
  gpm      gpm   pump flow
  id_in    in    force-main inside diameter

velocity = 0.4085 * gpm / id_in^2                ft/s
d_max_scour = sqrt(0.4085 * gpm / 2)             in   (largest ID holding 2 ft/s)
scours = velocity >= 2.0
```

**Pinned worked example (50 GPM, 2 in main).** `v = 0.4085*50/4 = 5.11 ft/s` -> scours. The largest ID still holding
`2 ft/s` is `d = sqrt(0.4085*50/2) = 3.20 in`. **Cross-check (borderline upsize).** A `3 in` main gives
`v = 0.4085*50/9 = 2.27 ft/s`, still above `2 ft/s`; a `4 in` main falls to `1.28 ft/s` and solids settle. A non-positive
flow or diameter takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["plumbing"]`, beside `sump-basin-sizing`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, sewage force-main scour, `editionNote` naming the velocity relation, the
`2 ft/s` IPC 712 scour minimum, and the scour-diameter); `test/fixtures/worked-examples.json` (the 2 in example + the 3 in
cross-check); `test/fixtures/compute-map.js` (`sewage-force-main-velocity` -> `computeSewageForceMainVelocity` in
`../../calc-drainage.js`); `scripts/related-tiles.mjs` (-> `sump-basin-sizing` / `roof-drain-sizing` / `friction-loss` /
`overflow-scupper-sizing`); `data/search/aliases.json` ("force main velocity", "sewage force main", "scour velocity",
"grinder pump pipe", "2 fps scour", "ejector force main", "force main sizing", "sewage pump pipe", "solids scour
velocity"); the id appended to the existing drainage renderers block in `app.js`; the `// dims:` annotation (GPM flow, ID
length, velocity speed); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the
scour threshold, and the non-positive / non-finite error seams. No new module; re-pin `calc-drainage.js` on the
`check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the scour threshold, the error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the velocity / d-max output wraps on a phone);
render-no-nan + a11y sweep, output read to the value (50 GPM, 2 in -> 5.11 ft/s, 3.20 in scour limit).

## 5. Roadmap position

The middle of the drainage-hydraulics trio: `overflow-scupper-sizing` (v426) and `stormwater-detention-volume` (v428)
bracket it. A force-main head-loss (Hazen-Williams) and a surge/water-hammer companion for the pumped line are the
deliberate next follow-ons.
