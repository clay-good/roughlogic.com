# spec-v1342.md — Ask for the missing value, in words

> Status: **PLANNED.** Part of [scope-one-box](scope-one-box.md).
> Depends on [v1340](spec-v1340.md), [v1341](spec-v1341.md). Adds one field to the v1339 index.
> Catalog stays **1,709**.

## Why

`voltage drop 150 ft 12awg 20a` carries three of the four values the calculation needs. After
v1341 the reader lands on a tile with three fields filled, one empty, and no answer — and has to
work out which field is holding everything up.

That is the moment the design either feels like an assistant or feels like a form. One question,
in words, at the top of the page, is the difference.

## First: there is no `required` flag, and we will not fake one

sophiewell's registry declares which inputs a tile cannot answer without. **Ours does not.** The
tempting proxy — "a field with no `default` is required" — is a guess dressed as data, and it is
wrong in both directions: plenty of fields default to `0` precisely because `0` means *absent*
(*"Height above insulation (in; 0 = no insulation below)"*).

Derive it honestly instead. Every one of the 1,709 tiles has a publisher-verified worked example
(`check-both-doors` now gates that). So for each field: take the example's inputs, blank that one
field, run the tile's own compute, and compare.

| Blanking the field causes | Verdict |
|---|---|
| a throw, or a non-finite result | **required** |
| a different finite answer | **required** — it is load-bearing |
| an identical answer | optional |

That is a build step over ~5,367 fields, it is mechanical, and it is checkable. It writes `r: 1`
onto the v1339 rows and the shards regenerate with it. **A field the extractor cannot see is never
marked required** — the 1,956 unlabelled fields stay out of the index, so the card can never ask
for something it cannot name.

## What the card does

Renders above the answer when `queryFill` filled at least one field **and** a required field is
still empty:

| | |
|---|---|
| **The question** | The first missing required field, phrased as a question naming its unit: *What is the circuit length in ft?* |
| **The receipt** | One line of what is already in, so the work does not look lost: *Everything else is in: wire size 12 AWG, load 20 A.* |
| **The input** | One control matching the target's kind. Submitting writes to the real field, dispatches `input` **and** `change` so the tile recomputes, and dismisses the card. |
| **Dismissal** | Also disappears if the reader fills the field directly below. It is a shortcut, never a gate — the tile stays fully interactive underneath it. |
| **One at a time** | Only the first missing field is asked. A queue of seven questions is a form with extra steps. |

If nothing was filled, no card: the reader typed a tool name, not a sentence, and the tile's own
form is the right answer.

## The question text comes from the page, not the registry

Registry labels are written for machines and rendering them at a person has misfired before. Build
the question from the **rendered `<label for>` text in the tile body** — the string a human is
already reading beside that input. `queryFill` returns field keys and those keys are DOM ids, so
`document.querySelector('label[for="<key>"]')` is a direct lookup. **Where no label is found,
render no card.** Fail quiet.

## Gotchas

- **The question must name its unit.** *"What is the length?"* is unanswerable beside a field whose
  unit is inches when the reader means feet. Ask in the unit the field is **currently showing**.
- **The question is a `<label>`, not an `aria-label`.** `scripts/check-field-accessors.mjs` and the
  a11y sweep hold dynamically created inputs to a real `label[for]`, and they will catch it. It is
  better anyway: visible text and accessible name become one string that cannot drift.
- **The answer must hide while the question is open.** A tile whose compute reads a blank required
  field as zero renders a confident `0.0 V` that looks exactly like an answer. Hide the output
  region while the card is up; dismissing brings it straight back.
- **The card is not a live region and must not go inside the output region.** It is a question, not
  a result.
- **Do not move focus to the ask input.** `renderToolView` already focuses the `h1` for screen
  reader users and a second focus call in the same microtask races it. The card is first in the
  tool body, so Tab reaches it anyway.
- The receipt line is the most likely place to produce a long slash-joined token. Commas and
  spaces, or the 320px sweep fails.
- A select or checkbox target needs a matching control, not a text box. Where the kind has no
  obvious one-line control, render no card.
- The blanking build step must not be run inside `npm run lint` at full cost if it is slow —
  measure it. If it is, it belongs in `build-field-index.mjs` with `--check` catching drift, which
  is where the rest of the index's cost already lives.

## Where it lives

- `scripts/build-field-index.mjs` — the blanking pass, writing `r`.
- `data/fields/*.json` — regenerated with `r`; re-check the 24 KB per-shard cap.
- `app.js` — `askCard()`, `askUnit()`, `renderedLabel()`, and its `renderToolView()` mount.
- `styles.css` — `.ask-card` and friends, on existing tokens.

## Proof

- A unit test on the blanking derivation: a field whose absence changes the answer is required, one
  whose absence does not is optional, and an unlabelled field is never marked required.
- A smoke test: a three-of-four query renders the question naming the right field **and its unit**,
  a receipt naming the filled values in human terms (not raw codes), a hidden answer, and — on
  submit — a dismissed card, a filled field, and a live answer.
- `check-field-accessors` + the a11y sweep, clean.
- The shard cap still holds after `r` lands.
