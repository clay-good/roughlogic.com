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
- The search results dropdown is arrow-key navigable: Up/Down move the highlight, Enter opens the highlighted tool, Esc dismisses the list.
- Leader-key shortcuts (G prefix) per spec.md section 11.4: G H Home, G S Search, G U Unit Converter, G O Ohm's Law, G W Wire Ampacity, G V Voltage Drop, G F Friction Loss, G D Duct Sizing, G R Refrigerant P-T, G L Lumber Spans, G C Concrete Volume, G T Static Pressure. (These match the live `SHORTCUTS` map in app.js and the `?` overlay; the legacy G P "Pinned" target was retired with the pinned-tools feature.)
- The `?` key opens a shortcut help overlay (theme-aware panel, legible in both dark and light). It is a proper modal dialog: `role="dialog"` + `aria-modal="true"`, focus moves into the dialog on open, Tab / Shift+Tab are trapped inside it, and Esc closes it.
- Escape always returns focus to the previously focused element (the overlay restores focus to its opener on close, per WCAG 2.4.3).

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
- The `.preset-chip` style sets `min-height: var(--touch-min)` (48 px platform default; Big Buttons mode was retired in spec-v11 and no longer applies an override) and uses the same `--bg-tertiary` / `--border` tokens as the rest of the view-region buttons (the original token-source comparison was the now-retired `.view-bundle-load` class; the chips draw from the same design-system tokens that the surviving view-pin / view-share / view-print buttons use), so dark / light / high-contrast themes flow through automatically. Chips are not used as the sole means of conveying ambient state - the underlying numeric input remains visible and editable.
- The pattern is intentionally narrow: chips prefill a numeric field and re-run compute. They are not toggles, not radio buttons, and do not carry `aria-pressed` state - clicking a chip is a one-way prefill, not a mode selector. When the v8 punch list extends preset chips to additional tiles (insulation rating, friction-rate band, climate selector, etc.), the same `<button class="preset-chip">` + `role="group"` pattern applies.

## v2 affordances

- The trade and group filter button rows were retired in favor of a single header search bar that live-filters across all group sections. The home view originally rendered eight sections (A through H at v2 close) and now renders twenty-four sections (A through Y; I was retired in v8) as `<section class="tools-section">` blocks; each section header carries its own `<h2 class="tools-section-label">` for screen-reader navigation. The search bar grows with the catalog without any per-group affordance change.
- The Recents region above Pinned was retired in spec-v11. The Pinned region remains the single above-the-fold tile region; it uses the same tile structure (`<ul role="list">` with `tile`/`tile-link`/`tile-pin` items), so arrow-key navigation, focus rings, and 48 px touch targets are unchanged.
- The tool view header gains "Copy share link" and "Print this calculator" actions. Each is a real `<button>` with text content. (The "Copy bundle URL", "Download bundle", and "Load bundle" affordances were retired in commit 5734d28 along with the rest of the Project Bundle feature.)
- The offline pill in the footer is hidden by default and only revealed when `navigator.onLine` is false. It is rendered as an inline-block `<span>` with sufficient contrast and is large enough to read without a tooltip.
- The Print action calls `window.print()` directly without opening any dialog. (The Project Bundle JSON download path was retired in commit 5734d28; the same-origin Blob URL affordance no longer ships.)
- The print stylesheet (`@media print` in [styles.css](../styles.css)) hides the sticky header (including the search and theme toggle), the primary nav, the skip link, the copy / copy-all buttons, the tile-actions row (which carries the surviving pin / share / print actions; the bundle buttons were retired in commit 5734d28), the integrity banner, the back link, and the footer badges; it preserves the inline notice, citation, inputs (with values), output region, and source stamp. Body and panels flip back to white-on-black for ink.
- Reference utilities in Group H render with a single `<h2>` per system or category and `<dl>`/`<ul>` lists for content. Heading levels descend without skipping under the page's h1.

## v5 affordances

- The v5 inline-notice variants (tax-law on Group R, bench-science on Group T; legal-information reached only through the `sales-tax-nexus` per-id override since Group S was retired) follow the same `role="note"` pattern as the existing default / fire / historical variants. Each is a full sentence, not a tooltip, so screen readers read it inline before the input region. Per-id overrides for cross-trade Group H tiles (sales-tax-nexus -> legal, irs-form-index -> tax-law) are wired in [app.js](../app.js) before the per-group fallback.
- The hardened safety notice on utility 268 (lab-safety quick-read) appears at the top of the output region with `role="note"` and remains visible even if the user scrolls past the GHS pictogram list. The notice is asserted by [test/unit/calc-references-v5.test.js](../test/unit/calc-references-v5.test.js).
- **Glossary tooltip (utility 271)** uses `role="tooltip"` and `aria-describedby` linking the input element to the tooltip span. The tooltip opens on `mouseenter` and on `focus`, closes on `mouseleave`, `blur`, and `Escape`. Per WCAG 2.2 success criterion 1.4.13 (Content on Hover or Focus), the tooltip is dismissable (Escape), hoverable (the tooltip itself stays in the DOM during hover), and persistent until the trigger is moved away from. Verified by the `keydown` Escape handler in `attachGlossaryTooltip`.
- **CSV export button (utility 269)** is a real `<button>` with text "Copy CSV", an `aria-label="Download table as CSV"`, and the same 48 px touch target as the existing copy buttons. The download is an anchor `click()` event with no popup or new window.
- **The shells print their proof from a copy, not from the disclosure.** The
  collapsed "Details, formula, and sources" block has to print in full: paper
  has no disclosure to click, and the formula and its authority are what the
  page carries. On the SPA, `app.js` sets `open` on `beforeprint`. A shell runs
  zero JavaScript, so it had only the `::details-content` print rule -- which
  Chromium honours and no other engine does. Measured 2026-08-31: printing a
  tile shell in WebKit dropped the formula and every source line. Nothing in
  CSS can open a closed `<details>`, so each shell now carries a
  `.shell-print-proof` copy, `display: none` on screen and `aria-hidden` so no
  screen reader is read the same paragraphs twice; in print media the
  `<details>` is hidden and the copy takes its place, on every engine.
  [../test/integration/shell-print.test.js](../test/integration/shell-print.test.js)
  runs on Chromium **and** WebKit, because a Chromium-only pass is exactly what
  hid this.
- **Print-table CSS (utility 270)** uses `@media print` rules scoped under `.tabular-tool`. The `thead { display: table-header-group; }` rule ensures the column header repeats on every printed page so a multi-page amortization or PCR master-mix table remains readable.
- All v5 calculator views render with a single `<h1>` per the existing pattern, descending `<h2>` per logical section, and `<dl>` / `<table>` for tabular output. The numeric inputs use `inputmode="decimal"` and named `<label>` elements; voice input ("five thousand" -> 5000) works on every Group R and Group T tile.

## v12 affordances

The spec-v12 expansion added Groups U Veterinary / V EMS / W Pilots / X Real Estate / Y Educators without changing the accessibility contract. Groups U, V and W have since been retired; what remains live is X and Y, and the contract below is stated for those. The retired-group specifics are kept out rather than left reading as current.

- **48 px touch targets** carry through to every tile. The numeric inputs and the per-course GPA rows use the same `<input>` / `<select>` / `<button>` patterns with the existing `--touch-min: 48px` token. No tile in Group X or Y introduces a tap target smaller than the platform floor.
- **Voice input** (`inputmode="decimal"` on numeric fields, named "Test with example" buttons, no event handlers that block dictation) holds across every v12 tile. Verified manually on the PITI and Flesch-Kincaid tiles, the highest-frequency dictation surfaces in the groups that remain.
- **Single h1 per view** carries over; each new tile-view inserts an h1 with the tile name and focuses it on route change, identical to the v3-v11 pattern.
- **Live regions** (`aria-live="polite"` on each output region) are wired in every Group X and Y renderer. The "Copy" announcements continue to fire on every tile that surfaces a copyable output (e.g. the X.2 amortization-schedule rows).
- **Group X / Y citation discipline** continues the existing source-stamp pattern: each tile cites the canonical public-domain or federally-published source (FNMA / FHA / VA / FHFA / HUD / 26 USC for X; Kincaid 1975 / McLaughlin SMOG / Coleman-Liau / Achieve the Core / IUPAC for Y) in the source-stamp line. The cite-strong "lender governs" / "teacher governs" verbiage names the AHJ-equivalent directly so a screen-reader user does not have to follow a link to learn the governance posture.
- **Phase F mobile-responsive sweep** ([docs/mobile-responsive.md](mobile-responsive.md)) signed off the v12 groups at 320 / 375 / 414 / 760 px on 2026-05-16. The F.1 reference-block fix (commit f57ca6e) governs all new tiles: single-column dt/dd layout at the `@media (max-width: 760px)` breakpoint, `overflow-wrap: anywhere` on the citation / source-stamp / limitation-banner / reference-block dd values, and `inputmode` on every numeric input.

## v13 shells

The spec-v13 expansion adds 385 per-tile prerendered HTML shells under
`/tools/<id>/index.html` and 24 per-group shells under
`/groups/<slug>/index.html`. The shells are static reference pages
served as plain HTML with one cached CSS load; the SPA at the home URL
is unchanged.

- **Single `<h1>` per shell.** Each tile shell carries one h1 (the tile
  name); each group shell carries one h1 (the group name). The h1
  ordering and the `<h2>` / `<h3>` descending structure match the SPA
  view of the same tile so a visitor moving between the shell and the
  interactive page reads the same semantic hierarchy.
- **Breadcrumb is a real `<nav aria-label="Breadcrumb">`** with an
  ordered list and the current page marked `aria-current="page"`.
- **Related-tiles block is a real `<ul>`** of `<a>` anchors, not a
  div-soup pattern. Each link is a same-origin anchor to another shell.
- **No JavaScript on any shell.** The "Run the calculator" link is a
  plain `<a href="/#<id>">` anchor; no onclick handler, no script tag
  beyond the inline JSON-LD data block. Screen readers, voice-input
  drivers, and keyboard-only users see the page as a static document.
- **Touch targets** carry the same `--touch-min: 48px` token via the
  shared `styles.css`; the wordmark, the "Tools index" link, the
  "Run the calculator" link, and every related-tile link sit at or
  above the 48 px floor.
- **Color contrast and high-contrast theme** carry over via the same
  `styles.css`. The shells respect `prefers-color-scheme` and the
  high-contrast theme tokens the SPA uses.
- **JSON-LD blocks are data, not content.** Screen readers ignore the
  inline `<script type="application/ld+json">` block; the `<head>`-only
  position keeps it out of the document reading order entirely.
- **axe-core verification:** this said "the shells pass the same
  axe-core ruleset the SPA passes" from spec-v13 until 2026-08-31, and
  nothing checked it. The axe sweep in
  [../test/integration/a11y.test.js](../test/integration/a11y.test.js)
  runs 1,804 routes that are all SPA hash routes; the shells are a
  different document, and the Lighthouse run this used to cite was
  removed from CI on 2026-08-23. When the claim was finally measured,
  **all 21 group hubs failed WCAG 1.4.1** -- each tile link sits in a
  text block ("<link> - one line about the tile") and was distinguished
  from the prose only by color, at 2.45:1 against a 3:1 floor.
  [../test/integration/shell-a11y.test.js](../test/integration/shell-a11y.test.js)
  now sweeps the shells with the same ruleset: the home page, the
  catalog hub, all 21 group hubs, one tile shell per group, every
  reference page, and three structural outliers (longest name, a name
  needing HTML escaping, the widest worked example). It does **not**
  sweep the remaining tile shells -- **1,804 tile shells** exist and the
  sweep visits one per group -- since they come from one generator and
  differ only in text; volume lives in the SPA sweep.
  [../scripts/check-shells.mjs](../scripts/check-shells.mjs) continues
  to assert the structural invariants that prevent the most common
  violations.

## Verification

- axe-core runs in CI on every utility view; the build fails on any new serious or critical violation.
- Manual keyboard-only audit is part of the launch checklist.
- Manual voice-input audit is part of the launch checklist.
- W3C HTML validator passes on every view.
