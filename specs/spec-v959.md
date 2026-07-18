# roughlogic.com Specification v959 -- Driveline U-Joint Operating Angle and Cancellation (calc-mechanic.js, Group K, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`** (Group K),
> no new module, group, or dependency. Inherits spec.md through spec-v958.md. Driveline sweep, beside the accepted
> `driveshaft-crit` and `driveshaft-max-length` tiles.
>
> **The gap, and the evidence for it.** The catalog has driveshaft critical speed and max length, but nothing on U-joint
> OPERATING ANGLE -- the number a tech measures with an inclinometer on a lifted or vibrating truck. Grep confirmed
> `driveshaft-crit` uses the U-joint LENGTH as an input; no working-angle / cancellation tile exists. The number this
> settles: a 10 degree working angle makes a **3.1%** speed fluctuation.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, since the outputs are percentages and a degree
difference), bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite
input or a working angle outside 0-90 degrees returns `{ error }`. Citation discipline (v19/v22): the Cardan (Hooke)
joint kinematics and the two-joint cancellation rule by name, `GOVERNANCE.general`; the note states that a single joint's
output speed ranges cos(b) to 1/cos(b) of input twice per rev, that cancellation needs equal working angles (within ~1
degree) AND in-plane yoke phasing, and that the exact maximum angle for a given rpm comes from the manufacturer's chart
(Spicer/Dana, GMB) -- the service manual and the measured inclinations govern.

## 2. The tile

### 2.1 `ujoint-operating-angle` -- Driveline U-Joint Operating Angle and Cancellation

```
inputs:
  input_angle_deg   first (front) U-joint working angle (deg, 0-90), default 10
  output_angle_deg  second (rear) U-joint working angle (deg, 0-90), default 10

variation(b) = 100 x (1/cos(b) - cos(b))        [peak-to-peak speed variation, twice per rev]
first_joint_variation_pct  = variation(input_angle_deg)
second_joint_variation_pct = variation(output_angle_deg)
angle_difference_deg       = |input_angle_deg - output_angle_deg|
cancelled                  = angle_difference_deg <= 1.0  (and yokes phased in-plane)
```

**Pinned worked example.** 10 degrees at both joints: each joint's speed variation is `1/cos(10) - cos(10) = 1.01543 -
0.98481 = ` **3.06%**, and because the two angles are equal the fluctuation **cancels** (with correct yoke phasing).
Cross-check: a mismatched **15 degrees front / 10 degrees rear** raises the front joint to **6.94%** against the rear's
3.06%, and the 5-degree difference leaves it **UNCANCELLED** -- a 2/rev vibration.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic"]`, beside `driveshaft-crit`); a `tile-meta.js` `_TILES` entry
(`K`); a `citations.js` entry (Cardan kinematics / cancellation, `GOVERNANCE.general`); `test/fixtures/worked-
examples.json` (the equal-angle example plus the mismatched cross-check, pinning the per-joint variation and the angle
difference); `test/fixtures/compute-map.js` (`ujoint-operating-angle` -> `computeUjointOperatingAngle`, module
`../../calc-mechanic.js`); `scripts/related-tiles.mjs` (-> `driveshaft-crit` / `driveshaft-max-length` / `tire-gearing`);
`data/search/aliases.json` (5 collision-checked aliases: "u-joint angle", "driveline angle", "ujoint cancellation",
"driveshaft vibration angle", "u joint operating angle"), then `node scripts/build-alias-shards.mjs`; a hand-written
renderer in the `MECHANIC_RENDERERS` map (non-exported, so no DOM-sentinel dims row), and the id added to the
calc-mechanic declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus +
tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the per-joint variation, the larger-angle
direction, the equal-angle cancellation and its 1-degree boundary, the straight-shaft zero, and the error seams. The
calc-mechanic.js gzip cap and the Group K group shell are watched at build. Home tile count 1,407 -> 1,408.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(10 deg both -> 3.06%, cancelled).

## 5. Roadmap position

Driveline diagnosis beside `driveshaft-crit`, serving the auto / diesel mechanic (mechanic). Deliberately the Cardan
kinematics and the equal-angle cancellation check; the manufacturer's angle-vs-rpm chart, the yoke phasing, and the
vehicle service manual and measured inclinations govern the setup. Stays evidence-driven. Continues the driveline sweep
at 1 new spec (v959).
