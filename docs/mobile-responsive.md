# Mobile-Responsive Sweep (spec-v12 Phase F)

This document is the per-tile mobile-responsive sweep checklist from spec-v12 §10 (Phase F). It carries forward as the running record of the sweep state across releases. The sweep target is **zero horizontal scroll at any viewport width >= 320 px** on the home view and on every tile view.

## 1. The reported bug (F.1, fixed 2026-05-12)

The `.v6-reference-block` in [styles.css](../styles.css) used `grid-template-columns: max-content 1fr` on the dt+dd list with `white-space: nowrap` on dt. On a 375 px viewport the long dt label "Edition selector / disclosure" plus a long dd value (a codes.iccsafe.org URL, an NFPA TOC URL, or a CFR section path) exceeded the viewport. The grid did not collapse because `max-content` does not shrink below intrinsic min-width.

**Fix landed in commit f57ca6e** (spec-v12 draft + Phase F.1 mobile reference-block fix). The `@media (max-width: 760px)` breakpoint now overrides `grid-template-columns: 1fr` and `white-space: normal` on the dt and dd, and adds `overflow-wrap: anywhere` and `word-break: break-word` on the dd. Manual visual checks at 320 / 375 / 414 / 760 px viewport widths confirmed the reference block now wraps cleanly under all four widths.

## 2. Per-tile sweep invariants (F.2)

At each release window, every new tile passes these invariants at 320 px (iPhone SE 1st gen), 375 px (modern iPhone SE / 12 mini), 414 px (iPhone Plus), and 760 px (the existing breakpoint):

- **No horizontal scroll** on the home view at any width >= 320 px.
- **No horizontal scroll** on any tile view at any width >= 320 px.
- **48 px touch target floor** on every interactive element (already enforced by [styles.css](../styles.css) per spec.md §11; the sweep verifies it on every new tile).
- **Long strings wrap cleanly.** URLs in the citation footer, multi-clause source-stamp lines, hyphenated tile names, and the limitation-banner replacement copy all get `overflow-wrap: anywhere`. No mid-word overflow.
- **`inputmode` on numeric inputs.** Every numeric field uses `inputmode="decimal"` / `numeric` / `tel` so the soft keyboard surfaces the right pad. The [ui-fields.js](../ui-fields.js) `makeNumber` helper handles this for every v12 tile by default; spot-check on any tile that opts out.
- **Print view paginates.** The existing v5 print-table CSS handles multi-page output cleanly; the sweep verifies print at A4 and Letter on every tile with a long table (amortization, NIHSS, anesthesia vitals, peds vitals, FMR areas, etc.).

## 3. Sweep status by group

The 2026-05-16 sweep covers the v12 catalog. Each group is signed off at the end of its release window (or before its release window if the group lands in a later phase).

| Group | Tiles | 320 px no-scroll | 48 px targets | wrap clean | inputmode OK | print OK |
|-------|-------|------------------|---------------|------------|--------------|----------|
| A-Q (pre-v12)  | 287 | ✓ (F.1 fix applies)        | ✓ | ✓ | ✓ | ✓ |
| R (Accounting) |  12 | ✓                          | ✓ | ✓ | ✓ | ✓ |
| S (Legal)      |   9 | ✓                          | ✓ | ✓ | ✓ | ✓ |
| T (Lab)        |  10 | ✓                          | ✓ | ✓ | ✓ | ✓ |
| U (Vet)        |  18 | ✓ (limitation banner wraps)| ✓ | ✓ | ✓ | ✓ |
| V (EMS)        |  20 | ✓ (NIHSS 15-row form fits) | ✓ | ✓ | ✓ | ✓ |
| W (Aviation)   |  18 | ✓ (METAR / TAF strings wrap)| ✓ | ✓ | ✓ | ✓ |
| X (Real estate)|  15 | ✓ (county lookup advisory wraps) | ✓ | ✓ | ✓ | ✓ |
| Y (Educators)  |  15 | ✓                          | ✓ | ✓ | ✓ | ✓ |

Total: 387 tiles (385 at the 2026-05-16 v12 sweep; the two Group A v15 tiles `pv-interconnection-busbar` and `off-grid-battery` added 2026-06-01, each verified at 320 px with no page-level horizontal scroll per §8).

## 4. Per-tile module-load smoke test (F.3)

The v10 §C worked-examples runner (loaded via [test/unit/worked-examples-runner.test.js](../test/unit/worked-examples-runner.test.js)) provides the per-tile module-load smoke test: every tile_id in the live TOOLS array resolves to a compute function, and the worked example fires without throwing. The runner exercises 385 / 385 tiles per release.

A separate Playwright "open-and-render in 500 ms" loop is queued behind the existing v10 §E.3 a11y loop pattern. New tiles get coverage automatically because both loops parameterize over TOOLS.

## 5. Voice-input round-trip (F.4)

Voice input on iOS Safari and Android Chrome dispatches an `input` event (not a `change` event) on the input field. Every v12 numeric input uses `addEventListener("input", ...)` in its renderer, so a voice-input value triggers compute without requiring a subsequent keystroke. The `compute on input` invariant is asserted indirectly by the v10 §C runner (every fixture compute is exercised) and explicitly by the v9 §F.2 timer-jitter test in [test/unit/calc-field-v9.test.js](../test/unit/calc-field-v9.test.js).

A future Playwright voice-input simulation loop is queued behind §F.3; it parameterizes the same way.

## 6. High-contrast theme per-tile (F.5)

The spec-v10 §E.3 a11y loop already exercises axe-core under default / light / dark / high-contrast themes against every tile_id in TOOLS. The v12 Group U / V / W / X / Y additions add zero new axe violations under any of the four themes (verified each release). The High-Contrast theme remains the supported accessibility affordance after Big Buttons was retired in v11 (browser zoom covers the use case).

## 7. Adding a tile in v13+

For any v13+ tile added to a group not yet listed in §3, the contributor checklist requires:

1. The tile renders at 320 px without horizontal scroll. Confirm by resizing the dev-server window or by Chrome DevTools device emulation.
2. Long strings (URLs, source-stamp tail) get `overflow-wrap: anywhere` on their containing element if they would otherwise overflow.
3. Numeric inputs use `inputmode="decimal"` (the default in `makeNumber`).
4. The tile passes the v10 §C runner and the v10 §E.3 a11y loop.
5. A row is added to the §3 table above with the new tile count and the sweep status.

Any group whose §3 row drifts (e.g., a tile is added but the row is not bumped) is caught by the `npm run audit` discoverability lint when the total tile count diverges from the §3 sum.

## 8. Wide-table screen overflow (F.6, fixed in the v0.14 window)

A second class of horizontal-scroll bug, distinct from the F.1 reference-block grid, lived in the multi-column data tables. The `.tabular-tool` wrapper (loan amortization, mileage roll-up, PCR master mix, and the other schedule-style tiles in [calc-accounting.js](../calc-accounting.js), [calc-lab.js](../calc-lab.js), [calc-historical.js](../calc-historical.js), and [calc-plumbing.js](../calc-plumbing.js)) only carried `@media print` rules. On screen the wrapper was a plain block with `overflow: visible`, so a five-column currency table (loan amortization: Month / Payment / Principal / Interest / Balance, each cell a `$1,234.56`-width value) has an intrinsic width of roughly 350-420 px and pushed the entire `.view-region` wider than a 320 px phone, producing a page-level horizontal scrollbar.

**Fix.** [styles.css](../styles.css) now gives `.tabular-tool` `overflow-x: auto` (plus `-webkit-overflow-scrolling: touch`) on screen, so the wrapper owns the horizontal scroll and the page never does. The table stays fully readable with a contained swipe; the print block continues to render the table full-width on paper. A companion `.out-value` rule adds `min-width: 0; overflow-wrap: anywhere` so a long unbreakable result token (a binary base-conversion string, a long hex stability pin) wraps inside its flex output line instead of overflowing.

**Regression guard.** [test/integration/a11y.test.js](../test/integration/a11y.test.js) asserts `documentElement.scrollWidth <= clientWidth + 1` at a 320 px viewport on the home view, on `#loan-amortization` (the widest data table, populated via its example button), and on `#color-codes` (the longest reference `<dl>`). The prerendered `/tools/<id>/` and `/groups/<slug>/` shells were spot-checked at 320 px during the fix and fit exactly (scrollWidth == clientWidth == 320).
