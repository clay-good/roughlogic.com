# roughlogic.com Specification v684 -- Tractor Drawbar Pull from Power (calc-agriculture.js, Group L, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-agriculture.js`** (Group
> L, agriculture), no new module, group, or dependency. Inherits spec.md through spec-v683.md.
>
> **The gap, and the evidence for it.** Spec-v206 (`drawbar-power`) runs the tractor relation forward: given a pull and
> speed, it returns the drawbar power. The implement-matching question a farmer asks is the inverse -- **how much pull
> can my tractor develop at a working speed for its rated power**. The forward tile makes you guess pulls and re-read the
> power; the inverse solves it directly. From `drawbar_hp = pull x speed / 375`, `pull = 375 x drawbar_hp / speed`, and a
> PTO rating converts to drawbar first with the ASABE D497 tractive efficiency (`drawbar_hp = pto_hp x efficiency`). The
> number this settles: a **75 PTO-hp** tractor at **4.5 mph** on firm soil (efficiency 0.72) pulls about **4,500 lb**;
> the same power on sand (0.50) develops only **3,125 lb**, because wheel slip wastes engine power.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`drawbar-power` sibling: it reuses the same `TRACTIVE_EFFICIENCY` surface table and the same `surface` select, the power
is `M L^2 T^-3` (hp), the speed is `L T^-1` (mph), and the returned pull is `M L T^-2` (lb). The `375` unit constant is
the sibling's. The v18/v21 contract: any non-finite input, a non-positive power or speed, an unknown power basis, or an
unknown surface returns `{ error }`. Citation discipline (v19/v22): ASABE D497 drawbar relation solved for the pull, by
name and `GOVERNANCE.general` matching the sibling; the note states that **a PTO rating converts to drawbar with the
tractive efficiency (a soft surface wastes power as slip), pull rises as speed drops (why heavy tillage is pulled in a
low gear), this is the steady-state pull the power supports (traction -- weight x soil coefficient -- can limit the
usable pull below it), and the ballast, tires, and conditions govern**.

## 2. The tile

### 2.1 `drawbar-pull` -- Tractor Drawbar Pull from Power

```
inputs:
  power_hp        hp     engine power (> 0)
  power_basis     -      drawbar (use directly) or pto (convert with tractive efficiency)
  speed_mph       mph    ground speed (> 0)
  surface         -      concrete 0.87 / firm_soil 0.72 / tilled_soil 0.55 / sand 0.50

drawbar_hp = (power_basis == "pto" ? power_hp x efficiency : power_hp)
pull_lb = 375 x drawbar_hp / speed_mph
```

**Pinned worked example (a 75 PTO-hp tractor).** power = 75 hp PTO, firm soil (0.72), 4.5 mph:
`drawbar_hp = 75 x 0.72 = 54`, `pull = 375 x 54 / 4.5 = ` **4,500 lb**; feeding 4,500 lb at 4.5 mph through
`drawbar-power` returns 54 drawbar hp (and 75 PTO), the input. **Cross-check (a soft surface).** Same 75 PTO hp on sand
(0.50): `drawbar_hp = 75 x 0.50 = 37.5`, `pull = 375 x 37.5 / 4.5 = ` **3,125 lb** -- the softer surface wastes more
power as slip, so less reaches the drawbar.

## 3. Wiring

A `tools-data.js` row (group `L`, trades `["agriculture"]`) placed in the LATER Group L section beside `log-limb-weight`,
NOT beside `drawbar-power` in the original block -- the Group L audit-coverage test asserts exactly 30 ids in the
`// Group L: Agriculture`..`// Group M` block, so the row must stay out of it; a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (ASABE D497 solved for pull, `GOVERNANCE.general` matching the sibling, the note per §1);
`test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js` (`drawbar-pull` ->
`computeDrawbarPull` in `../../calc-agriculture.js`); `scripts/related-tiles.mjs` (-> `drawbar-power` /
`sprayer-calibration` / `gpa-rate`, and the forward tile links back); `data/search/aliases.json` ("drawbar pull from
horsepower", "how much can a tractor pull", "pull from pto hp and speed", plus adjacent rows); the calc-agriculture
RENDERERS map entry `"drawbar-pull": renderDrawbarPull` via the module's `_r` renderer factory with a power-basis and
surface select (both feed the compute, satisfying check-dead-inputs) and the id added to the calc-agriculture declare
list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning both examples, the PTO conversion, the softer-surface-less-pull
check, the round-trip through `computeDrawbarPower`, and the error seams. The calc-agriculture.js gzip cap is expected to
hold (verify at build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes); `npm test` (+2 fixtures, the new
fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner;
320 px audit; render + output read to the value (the pinned example -> 4,500 lb pull for a 75 PTO-hp tractor at 4.5 mph).

## 5. Roadmap position

Pairs the forward tractor tile (`drawbar-power`, power from pull) with its inverse (pull from power), the two halves of
the tractor-implement matching question. Further Group L growth stays evidence-driven.
