# spec-v1343.md — Two plain choices when the query is ambiguous

> Status: **SHIPPED (2026-08-20).** Part of [scope-one-box](scope-one-box.md). Depends on [v1341](spec-v1341.md).
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

## The bug the spec predicted was there

`render()` calls `setActive(0)`, so `activeIndex` is `0` the instant anything is typed and the
Enter branch at `app.js` took it as a deliberate pick every time. **The ambiguity check would
never have run and every test would still have passed** — the feature would have shipped silently
dead, exactly as it first did on sophiewell. A `userPicked` flag now separates *the reader chose
this row* (arrow keys, hover) from *the list highlighted the first one for them*, and there is an
e2e case asserting that arrowing to a row still routes.

## Measured: the gate fires where it should, and stays out of the way where it shouldn't

Over 36 realistic probes, **17 come back with the runner-up scoring at least 95% of the leader**:

| Query | The two it cannot separate |
|---|---|
| `pressure drop` | compressed-air, filter |
| `heat loss` | duct heat gain, pipe heat loss |
| `payment` | loan payment, PITI |
| `grounding` | grounding electrode, grounding electrode conductor |
| `anchor` | anchor embedment, anchor rode scope |

And the split falls in the right place on its own: **a query carrying values almost always
separates cleanly**, so `voltage drop 120v 150 ft 12 awg copper 20a` routes straight through with
its six fields filled, while a bare `pressure drop` asks. Nothing had to be tuned for that; it
falls out of the ranker scoring a specific query higher.

## What shipped differently

- **The card is a lazily-imported module (`pick-card.js`), not code in `app.js`.** Adding it inline
  pushed the home view's **JS sub-budget** past its 49 KB ceiling (`spec-v10 §H.2`) — 51,059 B
  against 50,176 B. That budget is not negotiable and raising it would be the wrong trade for a
  card that only matters after someone has searched.
- **The tile-side prefill moved out too, into `tile-prefill.js`.** Even after extracting the card
  the budget was still 441 B over, and the honest fix was the same one: `resolveFields`,
  `markProvenance` and `askCard` from v1341/v1342 are unreachable from the home view, so they do
  not belong in the file the home page pays for. `app.js` is now at **94.1%** of the JS
  sub-budget, with headroom. `syncAnswerVisibility` stayed behind on purpose — it runs on every
  tile, prefilled or not.

## Gotchas

- The `Needs …` line is generated from field labels. Same restraint as [v1342](spec-v1342.md):
  short, human, two or three input names then stop — and **no card rather than a bad one**. A tile
  outside the 1,331 indexed has no `Needs` line; render the option without it, not with a blank one.
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
