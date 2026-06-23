# roughlogic.com Specification v179 -- Motor Branch-Circuit Protective Device Maximum and Disconnect Rating (NEC 430.52 / 430.110) (calc-electrical.js, Group A, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v179..v187 (electrician trade, second pass).** In-scope
> catalog expansion under the spec-v106 trades-only charter, completing the second tier of electrician
> gaps after the v164..v178 batch: one tile sizing the motor branch-circuit short-circuit and
> ground-fault protective device (NEC 430.52, Table 430.52) and the motor disconnect (430.110), both
> from the table FLC. Adds one tile to **`calc-electrical.js`** (Group A); no new module, group, or
> dependency. Inherits spec.md through spec-v178.md.
>
> **The gap, and the evidence for it.** The catalog sizes the motor branch *conductor* and the
> *overload* device (`motor-branch-from-nameplate`) and the motor *feeder* protection
> (`motor-feeder-multiple`, 430.62), but never the branch-circuit *short-circuit and ground-fault*
> device -- the 430.52 maximum that depends on the device type (250% inverse-time breaker, 175%
> dual-element fuse, 300% nontime-delay fuse), nor the 430.110 disconnect rated at least 115% of FLC.
> These are separate sizing questions an electrician answers on every motor, and a grep confirms 430.52
> appears nowhere in the calc layer.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The
table FLC and the resulting device/disconnect ampacities are current `I`; the table multipliers and
the 115% factor are `dimensionless`. The v18/v21 contract: any non-finite input, or a non-positive
FLC, returns `{ error }`; there are no user-denominator divisions. Citation discipline (v19/v22):
`GOVERNANCE.electrical`, edition `NEC 2023 430.52 and Table 430.52 (branch-circuit short-circuit and
ground-fault protection) with 430.110 (disconnect ampere rating)`, `editionNote` `NEC_DISCLOSURE`,
with the note that the table value uses the **table FLC** (430.6(A)), not nameplate; that this device
protects against short-circuit and ground-fault only, with overload handled separately by the v-prior
`motor-branch-from-nameplate` 430.32 device; that 430.52(C)(1) Exception 1 permits rounding **up** to
the next standard size (240.6) and Exception 2 permits a further increase if the motor will not start;
and that the figures shown are squirrel-cage/induction values -- the AHJ and the table govern.

## 2. The tile

### 2.1 `motor-branch-protection` -- Max Branch OCPD (430.52) and Min Disconnect (430.110)

```
inputs:
  flc_a           I              motor full-load current from NEC Table 430.247-430.250
  device_type     select         "inverse-time breaker" (250%) | "dual-element/time-delay fuse" (175%)
                                 | "nontime-delay fuse" (300%) | "instantaneous-trip breaker" (800%)

multiplier        = Table 430.52 for device_type
max_ocpd_a        = flc_a x multiplier
max_ocpd_std_a    = round UP to next standard OCPD size (240.6) if not already standard  (Exc. 1)
min_disconnect_a  = 1.15 x flc_a                              # 430.110(A); HP rating >= motor HP
```

**Pinned worked example.** A 10 HP, 230 V, three-phase motor: table FLC = **28 A** (Table 430.250).
With an **inverse-time breaker** (250%): `28 x 2.50 = 70 A`, which is a standard size -> **70 A
breaker maximum**. The disconnect must be rated at least `1.15 x 28 = 32.2 A` -> a 60 A (or 30 A
HP-rated) switch with an HP rating at or above 10 HP. **Cross-check (fuse + round-up).** The same
motor on a **dual-element fuse** (175%): `28 x 1.75 = 49 A`, not a standard fuse size -> round up to
the next standard **50 A** (430.52(C)(1) Exception 1). A nontime-delay fuse (300%) would be
`28 x 3.00 = 84 A` -> next standard 90 A. The overload device is sized separately (430.32); the AHJ
governs.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["electrical"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.electrical`, NEC 2023 Table 430.52 with 430.110, the multipliers,
the standard-size round-up exception, and the overload-is-separate note listed, `editionNote`
`NEC_DISCLOSURE`); `test/fixtures/worked-examples.json` (example + cross-check);
`test/fixtures/compute-map.js` (`motor-branch-protection` -> `computeMotorBranchProtection` in
`../../calc-electrical.js`); `scripts/related-tiles.mjs` (-> `motor-branch-from-nameplate` /
`motor-fla` / `breaker-sizing`); `data/search/aliases.json` ("motor protection", "430.52", "motor
breaker size", "motor disconnect", "430.110", "short circuit ground fault"); the id appended to the
existing `ELECTRICAL_RENDERERS` declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus
+ tile-index; a `bounds-fuzzer.test.js` block pinning the breaker example, the fuse round-up, the
disconnect line, and error seams (non-finite, FLC <= 0, unrecognized device_type). Raise the
`calc-electrical.js` size cap by ~20 percent if needed (dated comment); bump the `citations.js` cap if
needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block, the fuse round-up path); `npm run build` (one
new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the
multiplier, max OCPD, standard size, and disconnect lines wrap on a phone); render-no-nan + a11y
sweep, output read to the value (28 A / inverse-time -> 70 A, disconnect 32.2 A; dual-element -> 49 A
-> 50 A).

## 5. Roadmap position

Opens the second-pass electrician batch (v179..v187) and completes the motor branch package alongside
`motor-branch-from-nameplate` (conductor + overload) and `motor-feeder-multiple` (feeder). Further
Group A growth stays evidence-driven.
