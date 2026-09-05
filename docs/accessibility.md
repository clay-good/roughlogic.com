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
- Leader-key shortcuts (G prefix) per spec.md section 11.4: G H Home, G S Search, G U Unit Converter, G O Ohm's Law, G W Wire Ampacity, G V Voltage Drop, G F Friction Loss, G D Duct Sizing, G R Refrigerant P-T Chart, G L Lumber Spans, G C Concrete Volume, G T Static Pressure. (The legacy G P "Pinned" target was retired with the pinned-tools feature.) These match the live `SHORTCUTS` map in `app.js` and the `?` overlay because `test/unit/keyboard-shortcuts.test.js` reads all three and compares them, and checks that every destination is a live tile and that each label is that tile's own name -- the overlay said "Refrigerant P-T" for a tile called "Refrigerant P-T Chart" until 2026-09-02.
- The `?` key opens a shortcut help overlay (theme-aware panel, legible in both dark and light). It is a proper modal dialog: `role="dialog"` + `aria-modal="true"`, focus moves into the dialog on open, Tab / Shift+Tab are trapped inside it, and Esc closes it.
- Escape always returns focus to the previously focused element (the overlay restores focus to its opener on close, per WCAG 2.4.3).

## Touch

Two floors, and `test/integration/touch-targets.test.js` measures both at a
390 px phone viewport, on the live views **and** the prerendered pages -- which
share one stylesheet but not one set of markup. Nothing measured them until
2026-09-02, and the promise below had been false the whole time: every text
field was 46 px, the footer badges 46, the header wordmark 36, the catalog
page's group headings 38, and a shell's breadcrumb, related-tile and
catalog-list links 18. axe-core does not cover this -- SC 2.5.8 carries an
inline exception and a spacing exception a static rule cannot decide, so it
leaves target size alone.

- **48 by 48 pixels** on the controls a reader operates to do the work: text
  fields, selects, textareas, buttons, disclosure summaries, and the primary
  navigation links styled as controls (the header wordmark, the footer badges,
  "Run the calculator", the catalog page's trade headings). Stricter than
  WCAG 2.2 SC 2.5.8's 24 px on purpose, for gloved-hand operation.
- **24 by 24 pixels**, SC 2.5.8's Level AA minimum, on every other target.
- The one exception the test honours is the one the success criterion names: a
  link sitting **inside a sentence**, whose size is set by the prose around it.
  A link that is the whole content of its list item or paragraph is not that,
  and does not get the exception -- which is what a tile page's related-tiles
  list and the catalog page's per-trade lists are.
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

**Two themes ship, and which one a reader gets follows their system.** `:root`
in `styles.css` carries the dark palette; the light one is declared twice, at
`:root[data-theme="light"]` for the in-page toggle and again under
`@media (prefers-color-scheme: light)` for everyone else. On the SPA `theme.js`
sets `data-theme` before first paint, from the stored preference or the system
one. The 1,826 prerendered pages load no script at all, so the media query is
the only thing that reaches them -- and until 2026-09-02 there was none, which
meant every static page rendered dark whatever the reader's system asked for,
while its own `<meta name="color-scheme" content="dark light">` told the
browser it handled both. Each shell now also carries a `theme-color` per
scheme, so the browser chrome matches the page it sits above.

This section said "Light theme only. Pure white #FFFFFF background. Near-black
#0A0A0A primary text." until the same day -- the exact inverse of the default,
under a heading a reader would consult to know whether the site is legible for
them.

No color is used as the sole means of conveying information.

Every ratio below is computed from the tokens in `styles.css` by
`scripts/check-contrast.mjs`, which fails the build if a pair drops under its
floor **or if a number here stops matching the stylesheet**. The floors: 7:1
for body and secondary text (the project's own promise, stricter than AA's
4.5:1), 4.5:1 for dim text and links (WCAG 2.2 SC 1.4.3), and 3:1 for a field's
visual boundary (SC 1.4.11).

| Pair | Dark / light values | Dark | Light |
| --- | --- | --- | --- |
| `--fg` on `--bg-primary` | #ffffff/#0a0a0a, #0a0a0a/#ffffff | 19.80:1 | 19.80:1 |
| `--fg` on `--bg-secondary` | #ffffff/#1a1a1a, #0a0a0a/#f5f5f5 | 17.40:1 | 18.16:1 |
| `--fg-muted` on `--bg-primary` | #c8c8c8/#0a0a0a, #404040/#ffffff | 11.83:1 | 10.37:1 |
| `--fg-muted` on `--bg-secondary` | #c8c8c8/#1a1a1a, #404040/#f5f5f5 | 10.40:1 | 9.51:1 |
| `--fg-dim` on `--bg-primary` | #9a9a9a/#0a0a0a, #5e5e5e/#ffffff | 7.04:1 | 6.48:1 |
| `--fg-dim` on `--bg-secondary` | #9a9a9a/#1a1a1a, #5e5e5e/#f5f5f5 | 6.19:1 | 5.95:1 |
| `--accent` on `--bg-primary` | #5aa9ff/#0a0a0a, #0a66c2/#ffffff | 8.06:1 | 5.69:1 |
| `--error-text` on `--bg-primary` | #ff8c95/#0a0a0a, #a93226/#ffffff | 8.90:1 | 6.62:1 |
| `--border-control` on `--bg-tertiary` | #757575/#2a2a2a, #767676/#e8e8e8 | 3.12:1 | 3.71:1 |
| `--border-control` on `--bg-primary` | #757575/#0a0a0a, #767676/#ffffff | 4.30:1 | 4.54:1 |
| `--border-control` on `--bg-secondary` | #757575/#1a1a1a, #767676/#f5f5f5 | 3.78:1 | 4.17:1 |

The same palette is declared a **third** time inside `@media print`. The print
rules had forced `body` and three containers to white with black text, and left
every descendant holding its token -- so printing a calculator with the dark
theme active put the **answer in white on white paper**, along with the title,
and filled the input boxes solid black. `print.test.js` never saw it because
Playwright renders in the light scheme by default: the suite was green on one of
the two states a reader can be in. It now runs its colour assertions in both,
and `check-contrast` holds all three copies of the palette identical.

`--border-control` is new as of 2026-09-02 and exists for SC 1.4.11. A text
field that is empty has nothing but its edge to say where to type, so that edge
has to reach 3:1 against both what is inside it and what surrounds it. The
fields used `--border`, which is **1.14:1** against the region they sit in --
a line you can barely see, and one axe-core cannot flag, because whether a
given border is "required to identify the component" is not machine-decidable.
Fields only: a button or a chip carries a text label that identifies it without
help from its edge, so those keep `--border` and their existing weight.

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
  sweep the remaining tile shells -- **1,849 tile shells** exist and the
  sweep visits one per group -- since they come from one generator and
  differ only in text; volume lives in the SPA sweep.
  [../scripts/check-shells.mjs](../scripts/check-shells.mjs) continues
  to assert the structural invariants that prevent the most common
  violations.

## Verification

- axe-core runs in CI on every utility view; the build fails on any new serious or critical violation.
- That sweep, and the shell sweep beside it, run in the **light** scheme --
  Playwright's default. `test/integration/a11y-dark.test.js` runs axe over the
  **dark** palette on one route of each page shape: the SPA home, the catalog
  hub, the 404, a group hub, a calculator shell, a reference shell with no
  worked example, and four tile views. A sample rather than a second full pass,
  because the palettes are two token sets shared by every page -- a contrast
  violation in one is a violation across that page's whole shape. It exists
  because the one-scheme blind spot produced two real defects on 2026-09-02:
  the prerendered pages ignoring `prefers-color-scheme`, and the dark theme
  printing its answer white on white paper.
- Manual keyboard-only audit is part of the launch checklist.
- Manual voice-input audit is part of the launch checklist.
- The structural half of W3C validation is checked offline on all 1,826
  prerendered pages by `check-shells`: exactly one `<main>`, `<header>`,
  `<footer>`, `<h1>` and `<title>` each, and a `lang` on `<html>` -- the
  properties [launch-checklist.md](launch-checklist.md) names in that row.
  `render-no-nan` adds the runtime half on every tile view: no duplicate id,
  no id stamped from a missing value, no `label[for]` pointing at nothing.
- The validator **itself** has not been run against the deployed site. It needs
  the network, which `check-build-hermetic` forbids the build to touch, so it
  stays a manual step and [launch-checklist.md](launch-checklist.md) still
  lists it as open. This line said "W3C HTML validator passes on every view"
  until 2026-09-02 -- stated as done, under Verification, while the checklist
  two files over recorded it as not yet run.
