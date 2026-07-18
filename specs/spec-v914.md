# roughlogic.com Specification v914 -- Tractor Ballast for a Target Weight-to-Power Ratio (calc-agriculture.js, Group L, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-agriculture.js`** (Group
> L), no new module, group, or dependency. Inherits spec.md through spec-v913.md. Field-machinery setup sweep, mirroring
> the accepted `drawbar-pull` tractor-power precedent (whose note ends "ballast and tires govern").
>
> **The gap, and the evidence for it.** The catalog computes a tractor's drawbar power and pull but nothing sizes its
> **ballast**. Grep confirmed no tractor-ballast tile ("ballast" appears only in the PV-roof tile and drawbar-pull's
> note). Traction, fuel economy, and tire life all hinge on hitting the right weight-to-power ratio. The number this
> settles: a 180 hp tractor at 125 lb/hp targets **22,500 lb**, so an 18,000 lb machine adds **4,500 lb**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the accepted
`drawbar-pull` tile: the power carries `M L^2 T^-3` (hp), the weight-to-power ratio carries `T L^-1` (the reduced
dimension of lbf per hp), and the weights carry `M L T^-2` (lbf). The v18/v21 contract: a non-finite or non-positive
power or ratio, or a negative current weight, returns `{ error }`. Citation discipline (v19/v22): the ballast identity by
name (target = ratio x power; change = target - current), `GOVERNANCE.general`; the note gives the ASABE / operator-manual
ranges (about 120 to 145 lb/hp for field draft, 90 to 110 for transport, targeting 8 to 15% wheel slip), states that a
positive result is ballast to ADD and a negative result is ballast to REMOVE, that too much ballast wastes fuel to rolling
resistance while too little spins the tires, and that the ratio, the front/rear split, and the tire and inflation ratings
come from the operator's manual and the implement.

## 2. The tile

### 2.1 `tractor-ballast` -- Tractor Ballast for a Target Weight-to-Power Ratio

```
inputs:
  power_hp                engine or PTO power (hp)
  weight_to_power_ratio   target ballast ratio (lb/hp, default 125)
  current_weight_lb       current tractor weight (lb)

target_weight_lb  = weight_to_power_ratio x power_hp
ballast_change_lb = target_weight_lb - current_weight_lb   (positive = add, negative = remove)
```

**Pinned worked example.** 180 hp, 125 lb/hp, 18,000 lb current:
`target = 125 x 180 = ` **22,500 lb**; `change = 22,500 - 18,000 = ` **+4,500 lb** (add). Cross-check: a 120 hp tractor
at 130 lb/hp targets `130 x 120 = ` **15,600 lb**, so a 16,000 lb machine `15,600 - 16,000 = ` **-400 lb** (remove) --
an over-ballasted light tractor sheds weight to stop wasting fuel to rolling resistance.

## 3. Wiring

A `tools-data.js` row (group `L`, trades `["agriculture"]`, beside `drawbar-pull`); a `tile-meta.js` `_TILES` entry
(`L`); a `citations.js` entry (ballast identity, ASABE guidance, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the add example plus the remove cross-check, pinning target weight and signed
change); `test/fixtures/compute-map.js` (`tractor-ballast` -> `computeTractorBallast`, module
`../../calc-agriculture.js`); `scripts/related-tiles.mjs` (-> `drawbar-pull` / `drawbar-power` / `tire-contact-patch`);
`data/search/aliases.json` (5 collision-checked aliases: "tractor ballast", "weight to power ratio", "tractor
ballasting", "ballast lb per hp", "wheel slip ballast"), then `node scripts/build-alias-shards.mjs`; a hand-written
renderer in the `AGRICULTURE_RENDERERS` map (non-exported, so no DOM-sentinel dims row), and the id added to the
calc-agriculture declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus +
tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the target weight, the signed change (add and
remove), and the error seams (non-positive power / ratio, negative current, non-finite); the Group L audit count is
bumped if the new row lands inside the parsed block. The calc-agriculture.js gzip cap is watched at build. Verify at
build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile
count 1,362 -> 1,363.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, any Group L audit bump); `npm run
build`; `node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(125 x 180 -> 22,500 lb target, add 4,500 lb).

## 5. Roadmap position

Field-machinery setup beside `drawbar-pull`, serving the farmer / operator (agriculture). Deliberately a ballasting
estimate; the operator's manual, the implement, and the tire ratings govern. Stays evidence-driven. Continues the
agriculture field-ops sweep at 1 new spec (v914).
