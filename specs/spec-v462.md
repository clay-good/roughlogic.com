# roughlogic.com Specification v462 -- Marine Propeller Pitch Selection (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-03). First tile of an engine/vehicle-systems trio (v462 prop pitch -> v463 engine fuel burn ->
> v464 alternator charging). `prop-slip` measures how much a fixed propeller slips; this tile is the selection side --
> repitching a prop to hit the engine's rated wide-open-throttle (WOT) RPM.**
> In-scope catalog expansion under the spec-v106 trades-only charter. If a boat over- or under-revs at wide-open throttle,
> the fix is a pitch change: as a rule of thumb, one inch of propeller pitch changes WOT RPM by about `200 rpm` (less pitch
> raises RPM, more pitch lowers it). To move from the measured WOT RPM to the target, change the pitch by
> `(target_rpm - current_rpm) / 200` inches. `prop-slip` computes slip for a fixed pitch; nothing selects the pitch for a
> target RPM. This adds the repitch tile to the existing **`calc-mechanic.js`** module (Group K); no new group, trade, or
> dependency. Inherits spec.md through spec-v461.md.
>
> **The gap, and the evidence for it.** A boat turning `5000 rpm` at WOT with a `19 in` prop, whose engine is rated for
> `5400 rpm`, is lugging `400 rpm` low; dropping `400 / 200 = 2 in` of pitch to a `17 in` prop lets it reach the rated RPM
> band. Over-pitching (too much pitch) holds RPM below the power band and overloads the engine; under-pitching over-revs it.
> No tile does this; a mechanic diagnosing a WOT-RPM miss had `prop-slip` but not the repitch.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The propeller pitch and the
pitch change are lengths (in); the RPMs are rotational speeds (rpm); the rpm-per-inch sensitivity is dimensionless. The
v18/v21 contract: any non-finite input, or a non-positive current pitch or RPM, returns `{ error }`; the sensitivity
defaults to `200 rpm/in` (selectable for the `150 to 200 rpm/in` range), and the tile reports the pitch change and the new
pitch. Citation discipline (v19/v22): `GOVERNANCE.general` over the propeller repitch rule by name; `editionNote` names
**the marine rule of thumb that one inch of pitch changes WOT RPM by about `150 to 200 rpm` (less pitch raises RPM), the
pitch change `= (target_rpm - current_rpm) / rpm_per_inch`, and the goal of landing WOT RPM in the engine's rated band**,
and states that **this returns the pitch change to hit a target WOT RPM, that diameter, blade count, cupping, and load also
affect RPM, and that it is a selection aid, not a substitute for a prop shop's recommendation or an on-water test**.

## 2. The tile

### 2.1 `prop-pitch-selection` -- Marine Propeller Pitch Selection

```
inputs:
  current_pitch_in  in     current propeller pitch
  current_wot_rpm   rpm    measured WOT RPM with the current prop
  target_wot_rpm    rpm    desired WOT RPM (engine rated band)
  rpm_per_inch      rpm    RPM change per inch of pitch (default 200)

pitch_change = (target_wot_rpm - current_wot_rpm) / rpm_per_inch
new_pitch    = current_pitch_in - pitch_change
```

**Pinned worked example (19 in prop, 5000 rpm WOT, target 5400 rpm).** `pitch change = (5400 - 5000)/200 = 2 in`;
`new pitch = 19 - 2 = 17 in` -- a `2 in` lower pitch lets the engine reach its rated RPM. **Cross-check (an over-revving
boat).** A boat hitting `6000 rpm` against a `5400` target is over-revved by `600 rpm`; adding `600/200 = 3 in` of pitch
(to a `22 in` prop) pulls RPM down into the band. A non-positive current pitch or RPM takes the error path; the non-finite
seam is covered.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic"]`, beside `prop-slip`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the propeller repitch rule, `editionNote` naming the rpm-per-inch sensitivity
and the pitch-change relation); `test/fixtures/worked-examples.json` (the under-revving example + the over-revving
cross-check); `test/fixtures/compute-map.js` (`prop-pitch-selection` -> `computePropPitchSelection` in
`../../calc-mechanic.js`); `scripts/related-tiles.mjs` (-> `prop-slip` / `displacement-cr` / `hp-from-torque` /
`gear-mph-rpm`); `data/search/aliases.json` ("prop pitch", "propeller repitch", "wot rpm prop", "boat prop pitch", "prop
selection", "200 rpm per inch", "marine propeller", "over revving boat", "prop pitch change"); the id appended to the
existing mechanic renderers block in `app.js`; the `// dims:` annotation (pitch/change length, rpm rotational speed,
sensitivity dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the
sensitivity, and the non-positive / non-finite error seams. No new module; re-pin `calc-mechanic.js` on the
`check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the pitch-change / new-pitch output wraps on a phone);
render-no-nan + a11y sweep, output read to the value (19 in, 5000 -> 5400 rpm -> 17 in).

## 5. Roadmap position

Opens the engine/vehicle-systems trio: `engine-fuel-burn-gph` (v463) and `alternator-charging-load` (v464) continue the
theme. A predicted-top-speed-from-pitch-and-RPM companion is the deliberate next follow-on.
