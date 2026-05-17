# Accessibility

roughlogic.com targets WCAG 2.2 Level AA. The following checklist is the project's working contract. It is verified by axe-core in CI and by manual review on representative hardware.

## Conformance target

- WCAG 2.2 Level AA on every view.
- Body text contrast at least 7:1 (exceeds AA, supports outdoor readability).

## Structure

- One h1 per view.
- Heading levels descend without skipping.
- Landmarks used: header, nav, main, footer.
- Each calculator has a labeled form region.

## Keyboard

- Every interactive element is reachable by Tab in visual order.
- Focus rings are visible on every focusable element.
- The tile grid is arrow-key navigable when focused.
- Leader-key shortcuts (G prefix) per spec.md section 11.4: G H Home, G S Search, G P Pinned, G U Unit Converter, G O Ohm's Law, G W Wire Ampacity, G V Voltage Drop, G F Friction Loss, G D Duct Sizing, G R Refrigerant P-T, G L Lumber Span, G C Concrete Volume, G T Static Pressure.
- The `?` key opens a shortcut help overlay; Esc closes any overlay.
- Escape always returns focus to the previously focused element.

## Touch

- Touch targets at least 48 by 48 pixels (slightly larger than the WCAG minimum of 44) for gloved-hand operation.
- Adequate spacing between adjacent targets to prevent accidental activation.

## Forms and inputs

- Every input has a visible label.
- Numeric inputs use `inputmode="decimal"` and appropriate `min`, `max`, and `step` attributes.
- Invalid input shows a brief plain-text reason in the same field; the previous valid output remains visible with strikethrough until input becomes valid.
- No submit buttons. Output renders live, debounced 50 ms, into an `aria-live="polite"` region.

## Live regions and announcements

- Each calculator output region has `aria-live="polite"`.
- Copy and Copy all actions announce "Copied" via the live region.
- Error messages are announced via the live region.

## Voice input compatibility

- The site does not block dictation.
- Numeric inputs accept dictated values cleanly.
- The "Test with example" button is named so dictation can trigger it.

## Color and contrast

- Light theme only. Pure white #FFFFFF background. Near-black #0A0A0A primary text. Mid-gray #4A4A4A secondary text. Light gray #DDDDDD borders. Very light gray #F5F5F5 disabled states.
- No color used as the sole means of conveying information.
- Contrast ratios verified for body text (7:1+), secondary text (AA+), and borders against background.

## Motion and animation

- No motion beyond instantaneous state transitions.
- prefers-reduced-motion respected if any transition is added.

## Inline notice

- Every calculator displays the following inline notice immediately above the input region:

  "This is a math aid for verification. Local codes, manufacturer specifications, and the authority having jurisdiction govern all installations and inspections."

- For fire-ground utilities the notice expands:

  "This is a math aid for verification. Departmental SOPs and incident command govern all fireground operations."

## v8 preset chips

- **Preset chip rows** (introduced in v8 Phase C.1 for `wire-ampacity`) render a horizontal `<button type="button" class="preset-chip">` group below the input the chip prefills (e.g. "Indoor 30 C", "Field 45 C", "Extreme 60 C" set the ambient-temperature field). The wrapper is a `<div role="group" aria-label="...">` so screen readers announce the chip group as a labeled cluster.
- Each chip is a real `<button>` (not a `<span>` or `<a>`) with descriptive text and a `title` attribute that names the underlying engineering condition (NEC 30 C base ambient / hot attic / direct-sun rooftop). Tab order follows visual order; focus rings carry through unchanged.
- The `.preset-chip` style sets `min-height: var(--touch-min)` (48 px platform default; Big Buttons mode was retired in spec-v11 and no longer applies an override) and uses the same `--bg-tertiary` / `--border` tokens as `.view-bundle-load`, so dark / light / high-contrast themes flow through automatically. Chips are not used as the sole means of conveying ambient state - the underlying numeric input remains visible and editable.
- The pattern is intentionally narrow: chips prefill a numeric field and re-run compute. They are not toggles, not radio buttons, and do not carry `aria-pressed` state - clicking a chip is a one-way prefill, not a mode selector. When the v8 punch list extends preset chips to additional tiles (insulation rating, friction-rate band, climate selector, etc.), the same `<button class="preset-chip">` + `role="group"` pattern applies.

## v2 affordances

- The trade and group filter button rows were retired in favor of a single header search bar that live-filters across all eight group sections (A through H). The home view renders the eight sections as `<section class="tools-section">` blocks; each section header carries its own `<h2 class="tools-section-label">` for screen-reader navigation.
- The Recents region above Pinned was retired in spec-v11. The Pinned region remains the single above-the-fold tile region; it uses the same tile structure (`<ul role="list">` with `tile`/`tile-link`/`tile-pin` items), so arrow-key navigation, focus rings, and 48 px touch targets are unchanged.
- The tool view header gains "Copy share link", "Copy bundle URL", "Download bundle", "Load bundle", and "Print this calculator" actions. Each is a real `<button>` with text content; the file-input "Load bundle" affordance is wrapped in a label so screen readers announce its purpose.
- The offline pill in the footer is hidden by default and only revealed when `navigator.onLine` is false. It is rendered as an inline-block `<span>` with sufficient contrast and is large enough to read without a tooltip.
- The Project Bundle JSON download is a same-origin Blob URL triggered by an anchor click; no popup, no new window. The Print action calls `window.print()` directly without opening any dialog.
- The print stylesheet hides the sticky header (including the search and theme toggle), copy/pin/share/bundle buttons, the integrity banner, the pinned region, the back link, and the footer badges; it preserves the inline notice, citation, inputs (with values), output region, and source stamp. Body and panels flip back to white-on-black for ink.
- Reference utilities in Group H render with a single `<h2>` per system or category and `<dl>`/`<ul>` lists for content. Heading levels descend without skipping under the page's h1.

## v5 affordances

- The three v5 inline-notice variants (tax-law on Group R, legal-information on Group S, bench-science on Group T) follow the same `role="note"` pattern as the existing default / fire / historical variants. Each is a full sentence, not a tooltip, so screen readers read it inline before the input region. Per-id overrides for cross-trade Group H tiles (sales-tax-nexus -> legal, irs-form-index -> tax-law) are wired in [app.js](../app.js) before the per-group fallback.
- The hardened safety notice on utility 268 (lab-safety quick-read) appears at the top of the output region with `role="note"` and remains visible even if the user scrolls past the GHS pictogram list. The notice is asserted by [test/unit/calc-references-v5.test.js](../test/unit/calc-references-v5.test.js).
- **Glossary tooltip (utility 271)** uses `role="tooltip"` and `aria-describedby` linking the input element to the tooltip span. The tooltip opens on `mouseenter` and on `focus`, closes on `mouseleave`, `blur`, and `Escape`. Per WCAG 2.2 success criterion 1.4.13 (Content on Hover or Focus), the tooltip is dismissable (Escape), hoverable (the tooltip itself stays in the DOM during hover), and persistent until the trigger is moved away from. Verified by the `keydown` Escape handler in `attachGlossaryTooltip`.
- **CSV export button (utility 269)** is a real `<button>` with text "Copy CSV", an `aria-label="Download table as CSV"`, and the same 48 px touch target as the existing copy buttons. The download is an anchor `click()` event with no popup or new window.
- **Print-table CSS (utility 270)** uses `@media print` rules scoped under `.tabular-tool`. The `thead { display: table-header-group; }` rule ensures the column header repeats on every printed page so a multi-page amortization or PCR master-mix table remains readable.
- All v5 calculator views render with a single `<h1>` per the existing pattern, descending `<h2>` per logical section, and `<dl>` / `<table>` for tabular output. The numeric inputs use `inputmode="decimal"` and named `<label>` elements; voice input ("five thousand" -> 5000) works on every Group R, S, T tile.

## v12 affordances

The spec-v12 expansion adds Groups U Veterinary / V EMS / W Pilots / X Real Estate / Y Educators (+83 tiles across 5 new groups) without changing the accessibility contract:

- **48 px touch targets** carry through to every new tile. The numeric inputs, the species / age-band / cylinder-size selectors, the per-region burn-percent toggles, the per-runway crosswind selector, and the per-course GPA rows all use the same `<input>` / `<select>` / `<button>` patterns with the existing `--touch-min: 48px` token. No tile in Groups U / V / W / X / Y introduces a tap target smaller than the platform floor.
- **Voice input** (`inputmode="decimal"` on numeric fields, named "Test with example" buttons, no event handlers that block dictation) holds across every v12 tile. Verified manually on the GCS / APGAR / Parkland / METAR / PITI / Flesch-Kincaid tiles, which are the highest-frequency dictation surfaces in the new groups.
- **Single h1 per view** carries over; each new tile-view inserts an h1 with the tile name and focuses it on route change, identical to the v3-v11 pattern.
- **Live regions** (`aria-live="polite"` on each output region) are wired in every Group U / V / W / X / Y renderer. The "Copy" announcements continue to fire on every tile that surfaces a copyable output (e.g. the X.2 amortization-schedule rows, the W.5 METAR-decoder fields, the V.20 NIHSS total).
- **Spec-v10 §B.1 limitation banner** renders on every Group U vet tile and every Group V EMS tile per the spec-v12 §13.1 override. The banner uses the existing `<aside class="inline-notice limitation-banner" role="note" aria-label="Tile limitations">` shell, so screen readers announce the limitation block inline before the input region. The per-tile CANONICAL registry entries name what each tile is NOT and who governs (the attending veterinarian / EMS medical director / receiving facility).
- **Group W / X / Y citation discipline** continues the existing source-stamp pattern: each tile cites the canonical public-domain or federally-published source (FAA-H-8083-25C / FAA AC 00-45H / 14 CFR Part 91 for W; FNMA / FHA / VA / FHFA / HUD / 26 USC for X; Kincaid 1975 / McLaughlin SMOG / Coleman-Liau / Achieve the Core / IUPAC for Y) in the source-stamp line. The cite-strong "PIC governs" / "lender governs" / "teacher governs" verbiage names the AHJ-equivalent directly so a screen-reader user does not have to follow a link to learn the governance posture.
- **Phase F mobile-responsive sweep** ([docs/mobile-responsive.md](mobile-responsive.md)) signed off Groups U / V / W / X / Y at 320 / 375 / 414 / 760 px on 2026-05-16. The F.1 reference-block fix (commit f57ca6e) governs all new tiles: single-column dt/dd layout at the `@media (max-width: 760px)` breakpoint, `overflow-wrap: anywhere` on the citation / source-stamp / limitation-banner / reference-block dd values, and `inputmode` on every numeric input.

## Verification

- axe-core runs in CI on every utility view; the build fails on any new serious or critical violation.
- Manual keyboard-only audit is part of the launch checklist.
- Manual voice-input audit is part of the launch checklist.
- W3C HTML validator passes on every view.
