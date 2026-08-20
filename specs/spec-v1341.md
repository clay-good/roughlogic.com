# spec-v1341.md — Enter goes to the answer, not a picklist

> Status: **PLANNED.** Part of [scope-one-box](scope-one-box.md). Depends on [v1340](spec-v1340.md).
> Routing + provenance. No tile added, no compute changed. Catalog stays **1,709**.

## Why

Typing a full sentence into the box today produces a dropdown of twelve tool names. The reader
asked a question and got a filing cabinet.

Enter already routes to the top match, and `prefillHash()` already carries typed quantities into
the hash — for the **49 tiles** in `slots.json`. For the other 1,660 the tile opens empty and the
values the reader just typed are thrown away. [v1340](spec-v1340.md) makes those values usable for
1,330 tiles. This spec spends them.

## What it does

| | |
|---|---|
| **Enter** | Routes to the best tile with `queryFill`'s values in the hash, through the existing `prefillHash` path and its `v=1&` schema prefix. Deep links keep working; a prefilled answer is now a shareable URL. |
| **Template priority** | A `slots.json` hit still wins outright. `queryFill` fills only what the template did not, and only for tiles the template does not cover. |
| **Confidence gate** | Route directly only when the ranker clears its threshold and no runner-up is within a close margin. Below that, hand off to [v1343](spec-v1343.md) rather than guessing. |
| **Provenance** | Every field the query filled renders a `from your question` caption beneath it and takes `--accent` on its border. **This is the verification affordance — the reason a card beats a chat bubble — so it is not optional chrome.** |
| **Editing clears it** | The first edit to a field drops its caption. Once the reader has touched it, it is their value, not ours. |
| **Listbox** | Stays, unchanged, for typeahead. Someone who types `ohms law` still gets the list. It is no longer the only way through. |

## The unit trap that would ship a wrong number

sophiewell shipped `17.69 mL/min instead of 39` because `queryFill` returned a canonical value
into a field whose unit select was pre-selecting something else — and that bug was **already live**
in its 22 templates before the general path existed.

This catalog has the same shape of hazard and it must be checked, not assumed. Some tiles carry a
unit `<select>` beside a number field, and `check-us-defaults` exists because US-customary is the
pre-selected happy path here. **Before implementing:** enumerate the tiles whose field set includes
a unit select, and confirm what `applyHashState` does to the pair. If a hash value can land in a
field whose select then reinterprets it, the fix is the one sophiewell landed — reset those selects
to the unit the query actually named, **and only for fields the query itself filled**, because a
deep link carries its own unit state and must keep it.

Do not skip this because `slots.json` has not misfired. It covers 49 tiles and mostly unit-free
ones; absence of evidence here is not evidence of absence.

## Gotchas

- **Hash state is the transport, not the provenance.** A deep link someone was sent and a query
  someone just typed produce an identical hash. Keep the provenance set **in memory**, scoped to
  one navigation, cleared on the next route — otherwise a shared link claims the recipient typed it.
- **`applyHashState` already dispatches both `input` and `change`** (`hash-state.js`). The
  pre-existing bug sophiewell's v754 had to fix does not exist here. Do not "fix" it again.
- **Tiles open empty since `2ef4ac05`, and examples are click-to-fill.** sophiewell's worst bug —
  the worked example silently topping up a partly answered question and changing a score from 3 to
  6 — cannot happen here. Verify that stays true rather than re-deriving it: if any tile
  auto-fills on mount, a partial query must suppress it.
- Provenance captions are per-field text in the tile body. `collapseLongNotes` folds direct
  `p.muted` children; make the caption a `span` or give it its own class so it cannot be swallowed.
- **Do not put provenance inside the output region.** It is `aria-live="polite"`; the caption would
  be announced as part of the answer on every keystroke.
- A caption under every field on a 16-field tile is a lot of text at 320px. Keep the string short —
  `from your question`, not an explanation — and re-run the whole-catalog hscroll sweep.
- `navigateTo()` becomes async. Check every caller.

## Proof

- A smoke test: a full-sentence electrical query lands on the right tile with its fields filled,
  the live answer computed, one provenance caption per filled field, and a caption dropping when
  that field is edited.
- A second: a query that fills **some** fields leaves the rest empty and does not invent them.
- The whole-catalog 320px hscroll sweep and the 44px touch-target sweep, green with captions.
- `check-both-doors` (v1346) — still 1,709 searchable. This spec changes what Enter does; the gate
  is what proves it did not orphan anything.
