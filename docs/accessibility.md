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

## v2 affordances

- The trade and group filter button rows were retired in favor of a single header search bar that live-filters across all eight group sections (A through H). The home view renders the eight sections as `<section class="tools-section">` blocks; each section header carries its own `<h2 class="tools-section-label">` for screen-reader navigation.
- The Recents region above Pinned uses the same tile structure (`<ul role="list">` with `tile`/`tile-link`/`tile-pin` items), so arrow-key navigation, focus rings, and 48 px touch targets carry through unchanged.
- The tool view header gains "Copy share link", "Copy bundle URL", "Download bundle", "Load bundle", and "Print this calculator" actions. Each is a real `<button>` with text content; the file-input "Load bundle" affordance is wrapped in a label so screen readers announce its purpose.
- The offline pill in the footer is hidden by default and only revealed when `navigator.onLine` is false. It is rendered as an inline-block `<span>` with sufficient contrast and is large enough to read without a tooltip.
- The Project Bundle JSON download is a same-origin Blob URL triggered by an anchor click; no popup, no new window. The Print action calls `window.print()` directly without opening any dialog.
- The print stylesheet hides the sticky header (including the search and theme toggle), copy/pin/share/bundle buttons, the integrity banner, recents/pinned regions, the back link, and the footer badges; it preserves the inline notice, citation, inputs (with values), output region, and source stamp. Body and panels flip back to white-on-black for ink.
- Reference utilities in Group H render with a single `<h2>` per system or category and `<dl>`/`<ul>` lists for content. Heading levels descend without skipping under the page's h1.

## Verification

- axe-core runs in CI on every utility view; the build fails on any new serious or critical violation.
- Manual keyboard-only audit is part of the launch checklist.
- Manual voice-input audit is part of the launch checklist.
- W3C HTML validator passes on every view.
