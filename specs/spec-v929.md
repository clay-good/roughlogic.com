# roughlogic.com Specification v929 -- Access-Control Power Supply and Standby Battery (calc-lowvoltage.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lowvoltage.js`** (Group
> A), no new module, group, or dependency. Inherits spec.md through spec-v928.md. Low-voltage install-ops sweep, beside
> the accepted `cable-support-jhook` and `standby-battery-sizing` tiles.
>
> **The gap, and the evidence for it.** The catalog sizes fire-alarm and camera power but nothing sizes an
> **access-control door supply**. Grep confirmed no maglock / door-PSU tile. Every card-access job sizes a supply and a
> standby battery. The number this settles: four 0.5 A maglocks, two readers, and a controller draw **2.53 A**, needing
> a 4 A supply and a **12.6 Ah** battery for 4 hours of standby.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, beside the sibling LV
tiles: the device currents and the load / supply carry `I` (current), the standby time carries `T`, the battery capacity
carries `I*T` (amp-hours), and the device counts are dimensionless. The v18/v21 contract: a negative count, current, or
standby time, or a zero total load, returns `{ error }`. Citation discipline (v19/v22): the load-rollup and battery
sizing by name (load = locks x hold + readers + other; supply = 1.25 x load; battery = load x hours x 1.25),
`GOVERNANCE.general`; the note states that the supply carries a 25% continuous-load headroom and the battery a 25% aging
derate, that fail-safe maglocks draw continuously (and release on power loss for egress) while fail-secure strikes draw
only on unlock, that NFPA 72 sets the standby time for a system on the fire-alarm or egress path, and that the listed
panel, the door-hardware datasheets, the AHJ, and the life-safety interface govern.

## 2. The tile

### 2.1 `access-control-power-supply` -- Access-Control Power Supply and Standby Battery

```
inputs:
  lock_count        maglock count
  lock_current_a    per-lock hold current (A, default 0.5)
  reader_count      reader count
  reader_current_a  per-reader current (A, default 0.15)
  other_load_a      REX + controller + misc (A, default 0.225)
  standby_hours     required standby time (hr, default 4)

total_load_a = lock_count x lock_current_a + reader_count x reader_current_a + other_load_a
psu_min_a    = 1.25 x total_load_a
battery_ah   = total_load_a x standby_hours x 1.25
```

**Pinned worked example.** 4 maglocks @ 0.5 A, 2 readers @ 0.15 A, 0.225 A other, 4 hr standby:
`load = 4 x 0.5 + 2 x 0.15 + 0.225 = ` **2.525 A**; `supply = 1.25 x 2.525 = ` **3.16 A** (pick a 4 A unit); `battery =
2.525 x 4 x 1.25 = ` **12.6 Ah**. Cross-check: raising the required standby to 24 hours quadruples the battery to **75.75
Ah** -- the standby time, not the supply, is what drives the battery bank, and a fail-secure lockset (no continuous hold
current) would cut it sharply.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["low-voltage"]`, beside `cable-support-jhook`); a `tile-meta.js` `_TILES`
entry (`A`); a `citations.js` entry (load rollup and battery sizing, NFPA 72 / UL 294, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the 4 hr example plus the 24 hr cross-check, pinning the load, supply, and battery);
`test/fixtures/compute-map.js` (`access-control-power-supply` -> `computeAccessControlPowerSupply`, module
`../../calc-lowvoltage.js`); `scripts/related-tiles.mjs` (-> `standby-battery-sizing` / `lv-cable-pull-footage` /
`cctv-storage`); `data/search/aliases.json` (5 collision-checked aliases: "access control power supply", "maglock power
supply", "door power supply sizing", "access control standby battery", "maglock battery backup"), then
`node scripts/build-alias-shards.mjs`; a hand-written renderer in the `LOWVOLTAGE_RENDERERS` map (non-exported, so no
DOM-sentinel dims row), and the id added to the calc-lowvoltage declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block
pinning the load, supply, and battery across two standby times and the error seams (negative count / current / hours,
zero total load, non-finite). The calc-lowvoltage.js gzip cap is raised 17500 -> 19000 with a ledger note. Verify at
build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile
count 1,377 -> 1,378.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build (cap
raise); `npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(4 x 0.5 + 2 x 0.15 + 0.225 -> 2.53 A load, 3.16 A supply, 12.6 Ah).

## 5. Roadmap position

Low-voltage install-ops beside `cable-support-jhook`, serving the LV / security installer (low-voltage). Deliberately a
sizing estimate; the listed access-control panel, the door-hardware datasheets, the AHJ, and the fire / life-safety
interface govern the final design. Stays evidence-driven. Continues the LV install-ops sweep at 1 new spec (v929).
