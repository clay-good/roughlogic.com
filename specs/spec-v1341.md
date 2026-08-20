# spec-v1341.md — Enter goes to the answer, not a picklist

> Status: **SHIPPED (2026-08-20).** Part of [scope-one-box](scope-one-box.md). Depends on [v1340](spec-v1340.md).
> Routing + provenance. No tile added, no compute changed. Catalog stays **1,709**.

## Why

Typing a full sentence into the box today produces a dropdown of twelve tool names. The reader
asked a question and got a filing cabinet.

Enter already routes to the top match, and `prefillHash()` already carries typed quantities into
the hash — for the **49 tiles** in `slots.json`. For the other 1,660 the tile opens empty and the
values the reader just typed are thrown away. [v1340](spec-v1340.md) makes those values usable for
1,331 tiles. This spec spends them.

## What it does

| | |
|---|---|
| **Enter** | Routes to the best tile with `queryFill`'s values in the hash, through the existing `prefillHash` path and its `v=1&` schema prefix. Deep links keep working; a prefilled answer is now a shareable URL. |
| **Template priority** | A `slots.json` hit still wins outright. `queryFill` fills only what the template did not, and only for tiles the template does not cover. |
| **Confidence gate** | Route directly only when the ranker clears its threshold and no runner-up is within a close margin. Below that, hand off to [v1343](spec-v1343.md) rather than guessing. |
| **Provenance** | Every field the query filled renders a `from your question` caption beneath it and takes `--accent` on its border. **This is the verification affordance — the reason a card beats a chat bubble — so it is not optional chrome.** |
| **Editing clears it** | The first edit to a field drops its caption. Once the reader has touched it, it is their value, not ours. |
| **Listbox** | Stays, unchanged, for typeahead. Someone who types `ohms law` still gets the list. It is no longer the only way through. |

## What shipped differently, and why it had to

**The fill happens after the render, against the live DOM — not as a hash built before
navigation.** The plan assumed `queryFill`'s keys could be written straight into a hash, because
spec-v1339 recorded that a field key "is ALSO the DOM id". **That is false**, and it was found by
opening the page rather than by reading the code:

| | |
|---|---|
| Field index says | `source_voltage_V`, `length_ft`, `current_A` |
| The page's inputs are | `vd-src`, `vd-len`, `vd-cur` |

Hand-written renderers name their inputs for the page while their extracted schema is keyed by the
compute's parameters, and the declarative factory builds ids as `f.id \|\| f.key`, so any tile
declaring an explicit id diverges too. `check-slots.mjs` had already written this hazard down —
*"factory-built renderers pass field KEYS around as string literals too, but applyHashState targets
DOM ids, so a key-position literal is a dead prefill"* — and v1339 recorded the opposite as fact.

Building a hash from those keys would have produced a URL full of parameters that match no input:
a silent no-op on the good days, and values in the wrong boxes on the bad ones.

So nothing is assumed now. `resolveFields()` matches each index row to a real element **by id
first, then by the rendered `<label>` text**, which the index already carries and which is the
string a human reads beside that input. A row that resolves to neither is skipped. Then the values
are written to the elements, both events are dispatched, and **the existing `wireHashState` encodes
the result into the URL from the DOM** — so a prefilled answer is still a shareable link without
this path ever constructing one.

## The wrong answer this found on a live tile

`voltage drop 120v 150 ft 12 awg copper 20a single phase`, before this spec:

| | |
|---|---|
| AWG select | **18** — its first option |
| Answer | **47.65 V drop, 39.71%** |
| Correct answer | **11.85 V drop, 9.88%** |

`slots.json`'s template covers source, length, and current for this tile. It does not list the AWG
select, so the reader's own "12 awg" was discarded and the tile computed on a conductor size nobody
had chosen — with no sign that anything had been ignored. **This is pre-existing, and it is why the
generic fill runs even when a template already fired:** a template covers the fields somebody
hand-listed, and the gaps are exactly where a confident wrong number lives.

## The unit-select veto

22 tiles put the unit in a **select** beside the number instead of in the number's label —
`drainage-invert`'s "Slope" with a `slope_units` of `in_per_ft|percent`, `refrigerant-charging`'s
"Suction pressure" with `psig|psia`. Those number fields correctly declare no unit of their own, so
none of `query-fill`'s unit checks can see one.

That makes an unfilled unit select dangerous: `slope 2 in per ft` fills `slope=2` by name while the
select sits on its default, and if that default is `percent` the tile computes a slope forty times
too steep. **When a unit select is left unfilled, every unitless number the query filled is
dropped.** Cost across the catalog: one field.

## A vetoed fragment is burned, not passed on

Making selects compete for a name (needed so `lv-dc-drop`'s "System voltage" select is not
outranked by its "Device min voltage" neighbour) surfaced a second bug immediately: a fragment
Phase A refused as ambiguous fell through into Phase B, which matched its bare `in` against the
tile's Pipe OD field and wrote a 2 into it. **A weaker rule must never re-home a fragment a stronger
rule already refused.**

A select now only competes for a number it could actually hold — `12` is one of `lv-dc-drop`'s
options, `2` is not one of `slope_units`' — which kept the safety and returned 111 of the 128 fills
the first cut had cost.

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
