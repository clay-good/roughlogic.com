# spec-v1338.md — Answer first, inputs second

> Status: **PLANNED.** Part of [scope-one-box](scope-one-box.md).
> Presentation only. No compute changes, no number changes. Catalog stays **1,709**.

## Why

`renderToolView()` builds every tile in source order: back link, title, lead sentence, **inputs**,
then the answer. On a 16-field tile the number is off the bottom of the screen.

The order the reader needs is the reverse of the order the page is built in. The number is what
they came for. The inputs are what let them check it in one glance. That glance is the entire
reason a card beats a chat bubble, and it only works if both are on screen together.

This matters more after [v1341](spec-v1341.md): a reader who arrives with values already filled
from their own question lands on a form whose answer is somewhere below the fold.

The good news is it is one hook, not 1,709 renderers. `renderToolView` creates
`section.output-region` itself and hands it to every renderer.

## What it does

| | |
|---|---|
| **Hoist** | After the renderer runs, move `.output-region` above `.input-region`. One call in `renderToolView`, beside the existing wiring. |
| **Empty state** | `.output-region:empty` is `display: none`, so a tile that has not computed yet opens on its inputs exactly as today. Since `2ef4ac05` every tile opens empty, so **this is the common case** — the answer card appears as the reader types. |
| **Headline** | The first output row renders as the headline: large, `tabular-nums`, unit at label size in `--fg-dim`. |
| **Remaining rows** | Unchanged — the same `Label: Value Units` lines below the headline. |
| **Copy payload** | **Byte-identical.** `collectOutputs` and the copy-all format are untouched, so a pasted result is the same string it is today. |
| **Static shells** | Check before changing anything: the pre-rendered pages already lead with the worked example and its result, above the input list. If they are already answer-first, they need **no change**, and forcing one string to serve both would make one of them wrong. |

The order settles at **title → answer → inputs → detail → notice → proof**.

## Ordering conflicts, resolved here

- **The ask card outranks the answer.** When [v1342](spec-v1342.md) is asking for a missing value
  there is no answer yet, and hoisting past the card leaves a confident `0.0 V` sitting directly
  above the question asking for the value it needed.
- **The proof stays where it is.** It is already a collapsed `details.proof` below the answer
  (`5e8f2e57`). This spec does not touch it.

## Gotchas

- **`.output-region` is `aria-live="polite"`. Moving a populated live region re-announces its
  contents.** Hoist **once**, synchronously, immediately after the renderer returns and before any
  microtask fills anything. Do not re-hoist on update.
- **If a re-assert is needed after a late fill, `setTimeout(…, 0)` is the answer, not a frame.**
  sophiewell measured this: microtask, `requestAnimationFrame`, and double-`rAF` were all too
  early, because observer callbacks are microtasks too. Do not "optimize" that timeout into a frame.
- **`theme.js` opens every `<details>` on `beforeprint`.** A closed `<details>` does not print. The
  proof block must stay a `<details>`, never become a hidden div.
- **`collapseLongNotes` scopes to direct `p.muted` children.** After the hoist it must not reach
  into the answer card. Check its selector.
- **Do not reorder the output `<li>`s themselves.** A tile whose result leads with a band keeps the
  band first: `check-render-output-keys` and the numeric-correctness sweeps read `textContent`
  order across the catalog, and reordering would churn them for a cosmetic gain. Render the
  headline **in place**.
- The headline must not introduce a long unbreakable token — `check:shell-mobile` and the
  whole-catalog 320px sweep will catch it, and the answer units work (`87f6472a`) means many rows
  now carry a unit suffix that did not exist when the layout was designed.
- The readable-type floor is gated: reading text ≥ 1rem, meta ≥ 0.9375rem. A larger headline is
  fine; the unit at label size must stay above the floor.
- Section headings inside a tile must be `h2`, never `h3`. A chromium-only sweep catches it and no
  local gate does.
- `app.js`'s copy-reference button builds its summary from `collectOutputs(outputRegion)`, **not**
  `outputRegion.textContent`, because the latter fuses each value with its per-line Copy button
  label. Moving the region must not tempt anyone back to `textContent`.

## Where it lives

- `app.js` — `hoistAnswer()` and its call in `renderToolView()`.
- `styles.css` — `.output-region:empty`, the headline treatment. Existing tokens only.

## Proof

- A smoke test: `.output-region` is above `.input-region` in the DOM **and** its bounding box sits
  above the first input once a value is entered.
- A test that an untouched tile shows **no** empty answer box on open.
- `print-details` — every closed disclosure still opens for print and closes again.
- `check-render-output-keys` and the numeric sweeps — unchanged, proving `textContent` order held.
- The whole-catalog 320px sweep with the headline in place.
- A copy-payload test asserting the pasted string is byte-identical to before.
