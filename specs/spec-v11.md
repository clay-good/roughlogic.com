# roughlogic.com Specification v11 — Surface Reduction: Remove Recents and Big Buttons

> **Implementation status (drafted 2026-05-11, completed 2026-05-11):
> shipped.** v11 is a surface-reduction spec. It removes two long-
> standing platform affordances from earlier specs:
>
> - **Recents** (utility 120, v2 §3): the auto-tracked ring of the most
>   recently opened tools, rendered above the pinned region on the home
>   view and round-tripped through the URL hash (`r=...`) and the
>   project bundle (`recents` field).
> - **Big Buttons mode** (utility 182, v3 §1): the header "Big" toggle
>   that scaled inputs and buttons to 64 px for gloved-hand and bright-
>   sun field use, persisted in the `rl-bigbuttons` localStorage key.
>
> The constraints below remain in force for any future work. No new
> tiles, no new groups, no new external dependencies. Just less surface.

> Foreword, in the voice of a maintainer who has watched two features
> sit on the home view for two years and watched the usage data say
> nothing (because there is no usage data, and that is the point).
>
> Every kept feature costs maintenance. Recents and Big Buttons each
> cost: localStorage handling (Big Buttons), hash-state surface
> (Recents), test fixtures, accessibility-audit cycles per theme, an
> extra header button (Big Buttons), an extra above-the-fold region
> (Recents), a "what is this for?" question every time a new
> contributor reads the home view, and a bullet on the README. The
> three meta-tools that compose Recents (Job Estimate Roll-Up, Material
> Order List, Job Pack) inherit the same maintenance overhead one
> level deeper.
>
> Recents stops earning its keep the moment you realize it duplicates
> Pinned without the user's consent. If you opened a tool, the tile is
> already in your history; if you want it back, type its name in the
> search bar (the alias index is fast) or pin it. The auto-track has
> never been a feature; it has been an opinion about what users want.
> Removing it is a return to "the user is the judgment."
>
> Big Buttons stops earning its keep the moment you realize the
> browser already does this better. Every major mobile and desktop
> browser ships zoom (Ctrl/Cmd-plus, pinch on touch, system text-size
> in settings). The site already meets WCAG 2.2 AA 48 px touch
> targets at the default size; the High-Contrast theme already
> handles bright-sun legibility. Big Buttons is an additional axis of
> presentation that the site has been responsible for testing in
> every release for two years and that nobody has missed.

This document is the v11 spec. It inherits everything from spec.md,
spec-v2.md, spec-v3.md, spec-v4.md, spec-v5.md, spec-v6.md, spec-v7.md,
spec-v8.md, spec-v9.md, and spec-v10.md. Where v11 conflicts with an
earlier spec, **v11 wins for the two removals named here, and only
those two removals.** Every other constraint from every earlier spec
remains in force.

Repository: github.com/clay-good/roughlogic.com

US standards only. Assume all visitors are in the United States.

## 1. The two removals

### 1.1 Recents (utility 120)

The Recents ring is removed in full. Concretely:

- The `recents-region` section in [../index.html](../index.html) is
  removed (header, "Clear recents" button, grid).
- The `state.recents` field in [../app.js](../app.js) is removed.
  `pushRecent` and the call site that auto-tracks the opened tool are
  removed. The "Clear recents" handler is removed.
- The `r=...` segment of the URL hash is no longer written by the app.
  For back-compatibility with old shared links, the parser in
  [../routing.js](../routing.js) silently drops any `r=` segment it
  encounters (resolves to home with no recents). This is the only v11
  exception to the spec-v10 §G.2 hash-schema regression promise: the
  payload still routes to a valid home view, but it no longer carries
  the recents list because there is no recents list to carry.
- The `recents` field of a Project Bundle (utility 121) is no longer
  written by `encodeBundle`. On decode, the field is silently dropped
  for back-compat with bundles produced before v11.
- The three meta-utilities that composed Recents — Job Estimate
  Roll-Up (utility 170), Material Order List (utility 172), and Job
  Pack (utility 180) — are rewired to compose **Pinned** instead.
  This preserves their value (compose multiple tools into one
  printable sheet) and removes their dependency on the auto-tracked
  ring. The CHANGELOG carries this as a behavior change; the prior
  "uses Recents" copy is replaced with "uses Pinned" everywhere it
  appears in citation/citations.js strings and on-screen helper text.

### 1.2 Big Buttons mode (utility 182)

The Big Buttons mode is removed in full. Concretely:

- The `big-buttons-toggle` button in [../index.html](../index.html) is
  removed from the header.
- The `applyBigButtons`, `syncBigButton`, and Big Buttons branch of
  `wireToggles` in [../theme.js](../theme.js) are removed. The
  `BIG_KEY` constant (`rl-bigbuttons`) is removed.
- The `[data-bigbuttons="1"]` selectors and the `.big-buttons-toggle`
  rule in [../styles.css](../styles.css) are removed.
- The `rl-bigbuttons` localStorage key is no longer written. For
  users who set it before v11, the value remains in their localStorage
  (the site never reads it). It is harmless and will be cleared the
  next time the user clears browsing data. v11 does not add code to
  proactively clear it; that would be a wasted localStorage write
  with no corresponding user benefit.

## 2. What survives

The following platform affordances from earlier specs are explicitly
**kept**:

- **Theme toggle** (utility 183): dark / light / high-contrast. The
  three themes already cover the bright-sun field use case via the
  High-Contrast theme. The toggle persists in `rl-theme`.
- **Pinned set** (utility 119): user-selected, user-curated. The
  pinned region remains the above-the-fold region. Round-trips via
  `p=...` in the URL hash.
- **Project Bundle** (utility 121): pinned + per-tool inputs.
  Continues to round-trip via `#b=<base64url>` and JSON download.
  `recents` is no longer part of the bundle payload.
- **All 301 tiles** and every group A through T.
- **The single h1, the citation footer, the source stamps, the print
  view, the CSV export, the offline indicator, the example deep-link,
  the copy-share-link, and every other v2 / v3 / v5 cross-cutting
  affordance** other than Recents.

## 3. Storage and state after v11

- localStorage keys in use after v11: **`rl-theme`** only.
  `rl-bigbuttons` is removed from the write path; it is the only key
  in the spec's previous allowlist that v11 retires.
- URL hash grammar after v11:
  - `#` or `#home` -> home
  - `#p=a,b,c` -> home + pinned
  - `#b=<base64url>` -> bundle (decoded by application layer)
  - `#toolId` -> tool view
  - `#toolId?v=1&k=v&...` -> tool view with calculator state
  - `#r=...` (back-compat only) -> home; the `r=` payload is parsed
    and discarded.
- DOM after v11: the header carries the theme toggle only. The home
  view carries Pinned (when non-empty) followed by the eighteen group
  sections. No Recents region.

## 4. Why this is not a breaking change for shared links

- A pre-v11 shared link like `#voltage-drop?v=1&vd-amps=20&vd-len=150`
  routes identically before and after v11; the calculator opens with
  the same inputs. v11 does not touch tool-view hashes.
- A pre-v11 shared link like `#p=ohms-law&r=voltage-drop` routes to
  home with `ohms-law` pinned (same as before) and silently discards
  the `r=` segment (different — the recents region would have
  rendered the recents row, and after v11 it does not). The site
  still works; the user is not stranded.
- A pre-v11 Project Bundle (`#b=...`) with a `recents` array decodes
  to a sanitized bundle whose pinned and inputs apply normally; the
  recents array is dropped. The user is not stranded.

## 5. Migration of the meta-utilities

The three meta-utilities (Job Estimate Roll-Up, Material Order List,
Job Pack) are rewired to compose **Pinned** in place of Recents. The
contract becomes:

- The meta-utility lists the tools the user has **pinned**, not the
  tools they have **opened**.
- The empty-state copy changes from "Open a few tools, then return"
  to "Pin a few tools, then return."
- The citation strings in [../citations.js](../citations.js) for
  `job-estimate-rollup`, `material-order-list`, and `job-pack` are
  updated to describe the Pinned-based composition.

This change is documented in CHANGELOG.md and is the only user-visible
behavior delta for users who relied on the meta-utilities.

## 6. Test and lint changes

- [../test/unit/routing.test.js](../test/unit/routing.test.js): the
  Recents block is removed (parseHashRoute no longer surfaces a
  `recents` field; pushRecent invariants are removed). A single
  back-compat test asserts that `#r=...` parses to a home route
  without raising and without exposing a `recents` field.
- [../test/unit/hash-state-schema.test.js](../test/unit/hash-state-schema.test.js):
  the `r=`-bearing fixtures are updated. Per spec-v10 §G.2 the file
  is append-only, but v11 is an explicit accepted exception: the
  `recents` field of the fixtures is removed, since the parser no
  longer surfaces one. The hashes themselves remain in the fixture
  list as back-compat smoke tests asserting "still routes to home,
  doesn't throw."
- [../test/unit/bundle.test.js](../test/unit/bundle.test.js): the
  Recents round-trip assertions are removed. A back-compat test
  asserts that a pre-v11 bundle containing a `recents` array decodes
  cleanly (the field is dropped, no error).
- [../test/unit/limitation-banner.test.js](../test/unit/limitation-banner.test.js)
  and the Playwright `a11y` parameterized loop: the per-tile a11y
  audit no longer needs to verify each tile in Big-Buttons mode. The
  contributor checklist is updated to drop that line.

## 7. Documentation changes

- [../README.md](../README.md): the "Big" header-toggle paragraph in
  Quick start is removed; the "Recents" mention in the cross-cutting
  affordances list is removed.
- [../docs/architecture.md](../docs/architecture.md): the
  `rl-bigbuttons` localStorage entry is removed from the storage
  table; the Recents bullet is removed from the home-view layout
  description.
- [../docs/accessibility.md](../docs/accessibility.md): the
  Big-Buttons row in the WCAG checklist is removed (the default
  48 px touch targets already meet AA without it).
- [../docs/threat-model.md](../docs/threat-model.md): the storage
  surface drops `rl-bigbuttons`.
- [../docs/launch-checklist.md](../docs/launch-checklist.md) and
  [../docs/contributor-checklist.md](../docs/contributor-checklist.md):
  the "Tile passes axe-core in default and Big-Buttons modes" line
  becomes "Tile passes axe-core in default mode" across the three
  themes.
- [../docs/hash-state.md](../docs/hash-state.md): the `r=` segment
  is documented as accepted-and-discarded for back-compatibility,
  with a note that it is no longer emitted by the app.
- [../docs/maintainer-quickstart.md](../docs/maintainer-quickstart.md):
  any mention of Big Buttons in the per-tile checklist is removed.

## 8. CHANGELOG stanza

A single stanza in `## Unreleased` describes the removal:

```
- v11 surface reduction: removed Recents (utility 120) and Big Buttons
  mode (utility 182). Recents auto-tracking is gone; the recents
  region, the `r=` URL segment, the `Clear recents` button, and the
  `recents` field of Project Bundle are all retired. Big Buttons mode
  is gone; the header "Big" toggle and the `rl-bigbuttons` localStorage
  key are retired. The three meta-utilities (job-estimate-rollup,
  material-order-list, job-pack) now compose Pinned in place of
  Recents. Old shared links and bundles still resolve; their `r=` /
  `recents` payloads are silently discarded.
```

## 9. Why a spec, not a CHANGELOG entry

This is a removal, not an addition. Removals deserve the same paper
trail as additions, for the same reason: a future maintainer
reading the repo two years from now will see `r=` in old hashes,
will see `recents` in old bundles, will see the meta-utilities
mentioning "Pinned" but find git history mentioning "Recents," and
will need to know whether the absence is a deletion (intentional)
or an erosion (an in-progress refactor someone forgot to finish).
spec-v11.md says: this was intentional, here is what was removed,
here is what stayed, and here is the back-compat posture.

The spec is also the single place that records the design rationale.
The CHANGELOG records the fact of the change. The spec records the
why — which is what makes the change reversible (or not) if a future
user actually shows up with a legitimate use case that Pinned cannot
serve.

## 10. Closing note

A platform is a sum of features. Each feature is a debt: maintenance,
tests, accessibility audits, documentation, mental model. Removals
pay debt down. v11 pays down two features whose ongoing cost
exceeded their delivered value.

The site is still everything it claimed to be in spec.md: a calm,
fast, ad-free, account-free, ever-free reference. After v11 it is
slightly smaller, slightly cleaner, slightly easier for a new
contributor to read in one sitting. That is the only kind of v11
worth shipping.
