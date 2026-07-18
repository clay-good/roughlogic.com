# roughlogic.com Specification v961 -- PID Loop Tuning (Ziegler-Nichols Closed-Loop) (calc-lowvoltage.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lowvoltage.js`** (Group
> A), no new module, group, or dependency. Inherits spec.md through spec-v960.md. Instrumentation / controls sweep,
> beside the accepted `loop-signal-scaling`, `rtd-resistance-to-temp`, and `dp-level-hydrostatic` tiles.
>
> **The gap, and the evidence for it.** The catalog now scales loops, reads sensors, and checks loop power, but nothing
> gives starting PID gains -- the number a controls tech computes when commissioning a loop. Grep confirmed no Ziegler-
> Nichols / PID / ultimate-gain tile. The number this settles: with Ku = 4 and Tu = 2 s a PID starts at **Kp 2.4, Ti 1.0
> s, Td 0.25 s**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, mixing a gain, seconds, and a percentage),
bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input or a
non-positive ultimate gain or period returns `{ error }`. Citation discipline (v19/v22): the Ziegler-Nichols closed-loop
tuning rules by name (Ziegler & Nichols, 1942), `GOVERNANCE.general`; the note gives the P/PI/PID rules, warns about
proportional-band / reset units and the interacting-vs-parallel controller form, and stresses that Ziegler-Nichols is
aggressive (quarter-amplitude decay, overshoots) -- a starting point that the process dynamics, the controller algorithm
form, and the commissioning technician govern.

## 2. The tile

### 2.1 `pid-tuning-ziegler-nichols` -- PID Loop Tuning (Ziegler-Nichols Closed-Loop)

```
inputs:
  ultimate_gain_ku         gain at which the loop just oscillates steadily, default 4
  ultimate_period_tu_sec   period of that oscillation (s), default 2

PID:  pid_kp = 0.6 x Ku;  pid_ti_sec = 0.5 x Tu;  pid_td_sec = 0.125 x Tu
PI:   pi_kp  = 0.45 x Ku; pi_ti_sec  = Tu / 1.2
P:    p_kp   = 0.5 x Ku
proportional_band_pct = 100 / pid_kp
```

**Pinned worked example.** Ku = 4, Tu = 2 s: PID `Kp = 0.6 x 4 = ` **2.4**, `Ti = 0.5 x 2 = ` **1.0 s**, `Td = 0.125 x 2
= ` **0.25 s**, proportional band `100/2.4 = ` **41.67%**. Cross-check: the PI variant is `Kp = 0.45 x 4 = ` **1.8**,
`Ti = 2/1.2 = ` **1.667 s** (no derivative), and P-only is Kp 2.0.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["low-voltage", "electrical"]`, before `dp-level-hydrostatic`); a
`tile-meta.js` `_TILES` entry (`A`); a `citations.js` entry (Ziegler-Nichols 1942, `GOVERNANCE.general`); `test/fixtures/
worked-examples.json` (the PID example plus the PI/P cross-check, pinning the gains and times); `test/fixtures/compute-
map.js` (`pid-tuning-ziegler-nichols` -> `computePidTuningZieglerNichols`, module `../../calc-lowvoltage.js`);
`scripts/related-tiles.mjs` (-> `loop-signal-scaling` / `loop-voltage-budget` / `rtd-resistance-to-temp`); `data/search/
aliases.json` (5 collision-checked aliases: "pid tuning", "ziegler nichols", "pid gains", "loop tuning", "ultimate gain
tuning"), then `node scripts/build-alias-shards.mjs`; a hand-written renderer in the `LOWVOLTAGE_RENDERERS` map
(non-exported, so no DOM-sentinel dims row), and the id added to the calc-lowvoltage declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-
fuzzer.test.js` block pinning the P/PI/PID rules, the proportional band, the Ku/Tu linearity, and the error seams. The
calc-lowvoltage.js gzip cap and the Group A group shell are watched at build (cap raised for this sweep). Home tile count
1,409 -> 1,410.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(Ku 4 / Tu 2 -> Kp 2.4, Ti 1.0 s, Td 0.25 s).

## 5. Roadmap position

Instrumentation / controls beside `loop-signal-scaling`, serving the controls / instrumentation tech (low-voltage /
electrical). Deliberately the Ziegler-Nichols starting gains; the process dynamics, the controller's algorithm form and
units (gain/time vs proportional-band/reset, interacting vs parallel), and the commissioning technician's trim govern the
final tune. Stays evidence-driven. Continues the instrumentation / controls sweep at 1 new spec (v961).
