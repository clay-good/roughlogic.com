# spec-v1343.md — Two plain choices when the query is ambiguous

> Status: **PLANNED.** Part of [scope-one-box](scope-one-box.md). Depends on [v1341](spec-v1341.md).
> Catalog stays **1,709**.

## Why

`pipe sizing` is a dozen different calculators. Water supply, gas, drainage, steam, compressed
air — they are not variants, they answer different questions, and picking wrong on a job is not a
small error. `voltage drop` splits branch-circuit from feeder. `load calculation` splits
electrical service from HVAC.

v1341's confidence gate already refuses to route in this case. This spec says what happens instead.

Today the fallback is the twelve-row listbox, which is the wrong shape twice over: it shows tool
names rather than what each one answers, and twelve options at a decision point is not a decision,
it is a search result.

## What it does

When the gate declines to route, a card appears in place of the answer:

| | |
|---|---|
| **At most three** | Two where the ranker's top pair separates cleanly from the rest; three at the outside. Never more. If the ranker cannot produce a confident two or three, the listbox **is** the honest answer — say `No single match` and show it. |
| **Named by the question they answer** | Tile name plus its plain-language lead sentence, not its group label. `text-lead.js` already produces exactly this string for the tile pages; reuse it rather than writing new copy. |
| **What each one needs** | One short line naming the inputs, from the v1339 field index: *Needs length, wire size, and load.* So the reader can pick by what they have in front of them. |
| **Values carry over** | Picking an option routes with whatever `queryFill` extracted **for that tile**. Nothing typed is retyped. |

This is the only state in the program where a page appears before an answer does, and that is the
point: ambiguity is the one case where guessing costs more than asking.

## How ambiguity is detected

The ranker already says so plainly — `rankTools` returns scores. The gate is: the runner-up scores
at least **95%** of the leader, the leader did not come from a curated alias in
`data/search/aliases.json` (a deliberate routing decision, not a coincidence of token scores), and
no `slots.json` template fired.

**The check runs on Enter, not on every keystroke.** A second ranking pass per character is wasted
work for a decision only Enter makes.

## The bug to look for first

sophiewell's equivalent never fired, because `render()` called `setActive(0)` and so `activeIndex`
was `0` the instant anything was typed — every Enter looked like a deliberate pick. Its fix was a
`userPicked` flag separating *the reader chose this row* (arrow keys, hover) from *the list
highlighted the first one for them*.

`bindSearch()` here has the same `setActive` / `activeIndex` / `pick()` structure. **Read what
`render()` does to `activeIndex` before writing the Enter branch**, and if it pre-selects, add the
same flag. Otherwise this feature will be silently dead and every test will pass.

## Gotchas

- The `Needs …` line is generated from field labels. Same restraint as [v1342](spec-v1342.md):
  short, human, two or three input names then stop — and **no card rather than a bad one**. A tile
  outside the 1,330 indexed has no `Needs` line; render the option without it, not with a blank one.
- Options are `button`s, not links, and route through the **same** code path as the listbox so
  focus handling, hash building, and provenance stay in one place.
- Each option is a 44px touch target (`--touch-min` is 48px here) and three stacked cards must
  survive the 320px sweep.
- The lead sentence comes from the tile description via `text-lead.js`, whose splitter contract has
  known sharp edges (a lead ending on a unit word never splits). Use the existing function; do not
  re-split.
- Section headings inside the card must be `h2`, never `h3`.

## Proof

- A smoke test: an ambiguous trade query renders two or three options, each with a `Needs …` line;
  **nothing routes until the reader chooses**; picking the first lands on that tile with the typed
  values carried over.
- A second test that an unambiguous query does **not** render the card — the gate must not fire on
  `ohms law`.
- The 320px sweep and the touch-target sweep with three cards stacked.
