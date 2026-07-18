# roughlogic.com Specification v946 -- 4-20 mA Current-Loop Signal Scaling (calc-lowvoltage.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lowvoltage.js`** (Group A),
> no new module, group, or dependency. Inherits spec.md through spec-v945.md. Instrumentation / controls install-ops
> sweep, beside the accepted `fire-alarm-nac-voltage-drop`, `access-control-power-supply`, and `structured-cabling-
> channel` tiles.
>
> **The gap, and the evidence for it.** The low-voltage module covers fire alarm, access control, CCTV, and structured
> cabling, but nothing scales the single most universal industrial signal -- the **4-20 mA current loop**. Grep confirmed
> no analog-signal / transmitter / milliamp-scaling tile anywhere in the catalog (every "loop" hit is a hydronic or
> survey loop). Every instrumentation tech, controls electrician, and industrial-maintenance hand converts a loop reading
> to engineering units daily. The number this settles: 12 mA on a transmitter ranged 0-100 psi is **50 psi**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, since the engineering value carries whatever unit the
transmitter is ranged in), bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input or a zero span (range high equal to low) returns `{ error }`; an out-of-range signal is NOT an error --
it scales linearly (percent can go below 0 or above 100) and is flagged by status, because reading an out-of-range
signal is exactly when the tool is needed. Citation discipline (v19/v22): the live-zero linear scaling by name
(ANSI/ISA-50.00.01 analog signal ranges; NAMUR NE43 fault levels), `GOVERNANCE.general`; the note states that 4 mA is a
LIVE zero (so a dead wire at 0 mA is distinguishable from a real zero), that <=3.6 / >=21 mA are driven NAMUR NE43 fault
signals, and that a differential-pressure (square-root-extracted) flow transmitter is a different relation -- the
transmitter's configured range and calibration govern.

## 2. The tile

### 2.1 `loop-signal-scaling` -- 4-20 mA Current-Loop Signal Scaling

```
inputs:
  signal_ma   measured loop current (mA), default 12
  range_low   process value at 4 mA (the low end), default 0
  range_high  process value at 20 mA (the high end), default 100

percent_of_span   = (signal_ma - 4) / 16 x 100
engineering_value = range_low + (percent_of_span / 100) x (range_high - range_low)
status            = NAMUR NE43 band (in range / under-over range / fault-low / fault-high)
```

**Pinned worked example.** 12 mA on a 0-100 psi transmitter: `percent = (12 - 4)/16 x 100 = ` **50%**, value =
`0 + 0.5 x 100 = ` **50 psi**. Cross-check: 16 mA on 0-100 is 75 psi; the same 12 mA on a **-40 to 120 F** transmitter is
still 50% of span but `-40 + 0.5 x 160 = ` **40 F** -- the live zero is offset, not absolute. A 3.6 mA reading returns a
**fault-low** status (NAMUR NE43 downscale fault).

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["low-voltage", "electrical"]`, beside `fire-alarm-nac-voltage-drop`); a
`tile-meta.js` `_TILES` entry (`A`); a `citations.js` entry (ANSI/ISA-50.00.01 + NAMUR NE43, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the 0-100 psi example plus the offset-range cross-check, pinning the percent and
value); `test/fixtures/compute-map.js` (`loop-signal-scaling` -> `computeLoopSignalScaling`, module `../../calc-
lowvoltage.js`); `scripts/related-tiles.mjs` (-> `access-control-power-supply` / `voltage-drop` / `structured-cabling-
channel`); `data/search/aliases.json` (5 collision-checked aliases: "4-20ma scaling", "loop signal scaling", "milliamp
to engineering units", "transmitter scaling", "current loop scaling"), then `node scripts/build-alias-shards.mjs`; a
hand-written renderer in the `LOWVOLTAGE_RENDERERS` map (non-exported, so no DOM-sentinel dims row), and the id added to
the calc-lowvoltage declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14
corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the endpoints (4 mA -> low, 20 mA ->
high), the offset-zero case, the NAMUR status flags, the out-of-range linear behavior, the reversed-range case, and the
error seams (zero span, non-finite). The calc-lowvoltage.js gzip cap and the Group A group shell are watched at build
(cap raised for this tile). Home tile count 1,394 -> 1,395.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(12 mA / 0-100 -> 50% / 50).

## 5. Roadmap position

Instrumentation / controls install-ops beside `fire-alarm-nac-voltage-drop`, serving the instrumentation tech / controls
electrician / industrial-maintenance hand (low-voltage / electrical). Deliberately the linear live-zero scaling; a DP
square-root flow transmitter is a separate relation, and the transmitter's configured range and calibration govern.
Stays evidence-driven. Opens the instrumentation / controls install-ops sweep at 1 new spec (v946).
