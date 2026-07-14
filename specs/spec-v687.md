# roughlogic.com Specification v687 -- Standby Battery Runtime from Capacity (calc-lowvoltage.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lowvoltage.js`** (Group A,
> low-voltage / fire), no new module, group, or dependency. Inherits spec.md through spec-v686.md.
>
> **The gap, and the evidence for it.** Spec-v Z.5 (`standby-battery-sizing`) runs the NFPA 72 secondary-power worksheet
> forward: given a required standby period, it returns the battery amp-hours. The service question a fire-alarm tech asks
> is the inverse -- **how long will this installed battery hold up the panel**. The forward tile makes you guess periods
> and re-read the Ah against the battery; the inverse solves it directly. From `required_Ah = (I_standby x Hs + I_alarm x
> alarm_min/60) x derate`, `Hs = (battery_Ah/derate - alarm_Ah) / I_standby`. The number this settles: a **14.6 Ah**
> battery at 0.5 A standby, 2 A / 5 min alarm, and 1.2 derate holds **24 h**; an **18 Ah** battery holds about **30 h**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`standby-battery-sizing` sibling: the currents are `I` (A), the alarm minutes are `T`, the battery capacity and derate
are `dimensionless` (Ah, factor), and the returned standby period is `T` (h). The v18/v21 contract: any non-finite
input, a non-positive battery capacity, a non-positive standby current, a negative alarm current or period, or a
non-positive derate returns `{ error }`; additionally, a battery too small to cover even the alarm reserve after
derating (which would give zero or negative standby time) returns `{ error }`. Citation discipline (v19/v22): the NFPA
72 §10.6 secondary-power sizing worksheet solved for the standby period, by name and `GOVERNANCE.fire` matching the
sibling; the note states that **the derate divides the usable capacity (not credited; NFPA 72 expects >= 1.0, commonly
1.2), the alarm reserve is subtracted before dividing by the standby current, and the AHJ-adopted edition, the listed
panel, and the battery manufacturer's derating govern**.

## 2. The tile

### 2.1 `standby-battery-runtime` -- Standby Battery Runtime from Capacity

```
inputs:
  battery_ah          Ah   installed battery capacity (> 0)
  standby_current_a   A    standby / supervisory current (> 0)
  alarm_current_a     A    alarm current (>= 0)
  alarm_minutes       min  alarm period (>= 0)
  derate              -    aging/derate factor (> 0, default 1.2)

alarm_Ah = alarm_current_a x (alarm_minutes / 60)
Hs = (battery_ah / derate - alarm_Ah) / standby_current_a   [h]
```

**Pinned worked example (a 14.6 Ah battery).** Ah = 14.6, Is = 0.5 A, Ia = 2 A, Ma = 5 min, derate = 1.2:
`alarm_Ah = 2 x 5/60 = 0.1667`, `usable = 14.6 / 1.2 = 12.167`, `Hs = (12.167 - 0.1667) / 0.5 = ` **24 h**; feeding 24 h
back through `standby-battery-sizing` returns 14.6 Ah, the input. **Cross-check (a larger battery).** An 18 Ah battery
with the same loads: `Hs = (18/1.2 - 0.1667) / 0.5 = ` **29.7 h** -- the bigger battery holds the panel up longer.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical", "fire"]`, beside `standby-battery-sizing`; Group A has no
exact-count audit block, so no count bump); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (NFPA 72 §10.6
solved for the standby period, `GOVERNANCE.fire` matching the sibling, the note per §1);
`test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js` (`standby-battery-runtime` ->
`computeStandbyBatteryRuntime` in `../../calc-lowvoltage.js`); `scripts/related-tiles.mjs` (-> `standby-battery-sizing`
/ `battery-runtime` / `off-grid-battery`, and the forward tile links back); `data/search/aliases.json` ("standby
battery runtime", "how long will a fire alarm battery last", "backup hours for an alarm panel battery", plus adjacent
rows); `LOWVOLTAGE_RENDERERS["standby-battery-runtime"]` via a hand-written renderer (the module's `makeNumber` /
`makeOutputLine` / `attachExampleButton` / `debounce` / `fmt` helpers, mirroring `standby-battery-sizing`) and the id
added to the calc-lowvoltage declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated
v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning both examples, the round-trip
through `computeStandbyBatterySizing`, and the error seams (including the too-small-battery guard). The
calc-lowvoltage.js gzip cap and the electrical group-shell cap are expected to hold (verify at build, including
`check-shells`). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes); `npm test` (+2 fixtures, the new
fuzzer block); `npm run build` (one new shell, regenerated sitemap); `node scripts/check-shells.mjs` and
`check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`; worked-examples runner; 320 px audit; render +
output read to the value (the pinned example -> 24 h for a 14.6 Ah battery).

## 5. Roadmap position

Pairs the forward battery tile (`standby-battery-sizing`, Ah from a required period) with its inverse (period from an
installed Ah), the two halves of the fire-alarm secondary-power question. Further Group A growth stays evidence-driven.
