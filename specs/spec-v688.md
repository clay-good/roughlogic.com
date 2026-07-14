# roughlogic.com Specification v688 -- Point-Method Required Candela for a Target (calc-elecdesign.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-elecdesign.js`** (Group A,
> electrical / lighting design), no new module, group, or dependency. Inherits spec.md through spec-v687.md.
>
> **The gap, and the evidence for it.** Spec-v175 (`point-illuminance`) runs the IES point method forward: given a
> fixture's candlepower, it returns the illuminance at a point. The design question a lighting designer asks is the
> inverse -- **what luminous intensity must the fixture aim toward the point to hit the target footcandles**. The forward
> tile makes you guess candela and re-read the footcandles; the inverse solves it directly. From `E = I x cos^3(angle) /
> height^2`, `I = E x height^2 / cos^3(angle)` (E in footcandles, lux / 10.764). The number this settles: hitting 10 fc
> from 10 ft up straight below needs **1,000 cd**, and the same 10 fc at a point 30 deg to the side needs about **1,540
> cd** -- the cos^3 penalty off-nadir, which is why the aiming angle and the fixture's candela at that angle matter as
> much as its rating.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`point-illuminance` sibling: the target illuminance is `L^-2` (fc or lux via a unit select), the mounting height is `L`
(ft), the angle is `dimensionless` (degrees), and the returned intensity is `J` (candela). It reuses the sibling's
`10.764` lux-per-footcandle constant and the `[0, 90)` angle domain. The v18/v21 contract: any non-finite input, a
non-positive target or height, an unknown unit, or an angle outside `[0, 90)` returns `{ error }`. Citation discipline
(v19/v22): the IES point method solved for intensity, `GOVERNANCE.electrical` matching the sibling; the note states that
**the candela rises with the square of the mounting height and with 1/cos^3(angle) off-nadir (a point 30 deg to the side
needs about 54% more candlepower for the same footcandles), this is the direct component from one source ignoring
interreflection, and the photometric file and the IES target level govern**.

## 2. The tile

### 2.1 `point-method-required-candela` -- Point-Method Required Candela for a Target

```
inputs:
  target_illuminance   fc/lux   target illuminance at the point (> 0)
  illuminance_unit     -        fc or lux
  mount_height_ft      ft       mounting height above the work plane (> 0)
  angle_deg            deg      angle from nadir, [0, 90)

E_fc = (illuminance_unit == "lux" ? target / 10.764 : target)
required_cd = E_fc x mount_height_ft^2 / cos(angle_deg)^3   [cd]
```

**Pinned worked example (straight below).** target = 10 fc, height = 10 ft, angle = 0:
`I = 10 x 10^2 / cos(0)^3 = 10 x 100 / 1 = ` **1,000 cd**; feeding 1,000 cd back through `point-illuminance` returns 10
fc, the input. **Cross-check (off-nadir).** Same 10 fc target at 30 deg: `I = 10 x 100 / cos(30)^3 = 1000 / 0.6495 = `
**1,540 cd** -- the cos^3 in the denominator makes the off-axis point need about 54% more candlepower.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`, beside `point-illuminance`; Group A has no exact-count audit
block, so no count bump); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (IES point method solved for
intensity, `GOVERNANCE.electrical` matching the sibling, the note per §1); `test/fixtures/worked-examples.json` (both
examples); `test/fixtures/compute-map.js` (`point-method-required-candela` -> `computePointMethodRequiredCandela` in
`../../calc-elecdesign.js`); `scripts/related-tiles.mjs` (-> `point-illuminance` / `lumen-method` / `lux-to-footcandle`
/ `lighting-beam`, and the forward tile links back); `data/search/aliases.json` ("required candela for a footcandle
target", "candela needed to hit footcandles", "fixture candlepower for a lux target", plus adjacent rows);
`ELECDESIGN_RENDERERS["point-method-required-candela"]` via the module's `_simpleRenderer` factory with a unit select
(the select feeds the compute, satisfying check-dead-inputs) and the id added to the calc-elecdesign declare list in
`app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings;
a `bounds-fuzzer.test.js` block pinning both examples, the fc/lux unit conversion, the off-nadir penalty, the round-trip
through `computePointIlluminance`, and the error seams. The calc-elecdesign.js gzip cap and the electrical group-shell
cap are expected to hold (verify at build, including `check-shells`). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes); `npm test` (+2 fixtures, the new
fuzzer block); `npm run build` (one new shell, regenerated sitemap); `node scripts/check-shells.mjs` and
`check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`; worked-examples runner; 320 px audit; render +
output read to the value (the pinned example -> 1,000 cd for a 10 fc target 10 ft up).

## 5. Roadmap position

Pairs the forward point-method tile (`point-illuminance`, illuminance from candela) with its inverse (candela from a
target illuminance), the two halves of the point-method aiming question. Further Group A growth stays evidence-driven.
