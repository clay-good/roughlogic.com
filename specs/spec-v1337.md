# spec-v1337.md — The home page becomes one box

> Status: **SHIPPED (2026-08-20).** Part of [scope-one-box](scope-one-box.md). Depends on [v1345](spec-v1345.md).
> Presentation only. No tile added, no number changed, **no link removed.** Catalog stays **1,709**.

## Why

The home page reads as a directory with a search box on top. Above the box sit a heading and a
three-sentence lede; below it, twenty-one trade links under a heading. A tradesperson arrives
knowing what they need. The job of this page is to take the question, not to offer a menu of
places the question might live.

The placeholder is the other tell. `ohms law, duct sizing, refrigerant P-T...` teaches the reader
to type a **tool name** — the one thing they have to already know the site's vocabulary to do. It
should teach the opposite: type the sentence you would say out loud, with the numbers in it.

## What it does

| | |
|---|---|
| **Heading** | `Trade calculators for the field` → **`Field math, answered.`** |
| **Intro** | Three sentences → one, and it **keeps the count**: *1,709 free calculators for the trades. Type the job the way you'd say it — you get the number, the inputs, and the code section.* |
| **Placeholder** | A tool-name list → one full natural-language question: `voltage drop 120v 150 ft 12awg 20a` |
| **Examples** | Four tappable chips under the box, each a real query that routes. **They are the instructions**; there is no other instruction text. |
| **Trade nav** | **Kept — every one of the 21 links.** Demoted to a compact strip below the box: no `h2`, smaller type, quieter colour. It stops competing with the box; it does not leave the document. |
| **Footer** | Gains the `All calculators` badge from [v1345](spec-v1345.md). |
| **Header** | Unchanged. |

The chips are `button`s, not links: clicking one fills the input and fires the same code path as
typing, so what the reader sees demonstrated is exactly what their own typing will do.

## Why the links stay

This is the deliberate divergence from sophiewell's v751, which deleted its browse nav outright.

sophiewell's nav was the only in-page path to fourteen hub pages. Ours is not — all 1,709 tile
shells link their own hub. But **`/groups/construction/` is this site's top organic landing page**,
and the honest position is that we do not yet know how much of that depends on the home-page link.

So this spec buys the entire visual simplification at **zero link-graph cost**, and
[v1347](spec-v1347.md) removes the strip later, on evidence, as a one-line revertible change. The
reader gets a page that reads as one box either way; the difference is whether we find out the
hard way.

## The count stays in the lede, and that is not a compromise

`check-readme-counts` requires **exactly two** `"<N> free calculators for"` strings in
`index.html` — the JSON-LD `description` and the hero lede. sophiewell hit the same gate and
**retired** its surface.

We should not. Keeping the count costs four words, keeps a drift check that has already caught a
stale README, and the number is a genuine reason to trust the page. Dropping it would mean
editing a gate to make a copy change easier, which is the wrong direction.

**Do not leave a count in the new copy without keeping it as a surface.** A visible count that no
gate watches is exactly how a README once reached 1145 against a catalog of 1564.

## Where it lives

- `index.html` — `h1.home-h1`, `p.home-lede`, the `#search-input` placeholder, `.hero-examples`
  with four `button.hero-chip`, and the `.home-trades` demotion (class change, not deletion).
- `app.js` — `bindSearch()` gains a chip click handler that sets `input.value` and calls the
  existing `render()`. **No new routing logic.**
- `styles.css` — `.hero-examples`, `.hero-chip`; `.home-trades*` restyled quieter. Existing
  tokens only; the chips use `--accent`.

## What shipped differently

- **The placeholder goal was already half-built, by `spec-v592`.** That spec rotates a
  natural-language question through the box, one per day of the month, deterministically and with
  no timer. The static placeholder in `index.html` is only the pre-JS fallback. So this spec did
  not replace the rotation; it **fixed what was in it**. Half the entries carried no numbers
  (*"how many squares on a roof"*, *"how much can the crane pick after deductions"*), and since
  [v1341](spec-v1341.md) the box does something with numbers — it fills the calculator in. A
  placeholder without values now teaches half the feature. The two that had nothing to give were
  replaced, not padded.
- **The chip-closes-its-own-listbox bug is real and was hit exactly as predicted.** The document
  click handler treats anything outside the input and the list as an outside click. `.hero-chip`
  is now exempt.
- **The lede keeps its count**, so `check-readme-counts` keeps both of its `index.html` surfaces.
  sophiewell retired the equivalent surface; there was no reason to follow it there, and four
  words is a cheap price for a drift check that has already caught a stale README once.
- **`&mdash;` is banned** by `check-ngrams`. The lede is punctuated with a comma.

## Gotchas

- **The document click handler that closes the listbox will treat a chip as a click *outside* the
  search UI**, so a chip fills the box and instantly closes the results it just opened. sophiewell
  hit this exact bug. Exempt `.hero-chip` from that handler in the same change.
- **Every chip query must actually route today**, on a real tile, or the page teaches a question
  the site cannot answer. Verify all four against the live ranker before shipping.
- **Chip labels must be free of slash-joined tokens over 30 characters** or the 320px
  `check:shell-mobile` / responsive sweeps fail. Use commas and spaces.
- Chips are a 44px touch target minimum (`--touch-min` is 48px here).
- The readable-type floor is gated: reading text and controls ≥ 1rem, meta ≥ 0.9375rem. The
  demoted trade strip must stay above it — "quieter" means colour and weight, **not** smaller than
  the floor.
- `.home-lede` and `.home-h1` keep their selectors. `check-home-payload` has a 100 KB budget at
  57.7% today; four chips will not move it, but re-run it.
- Do not touch `<title>`, `<meta name="description">`, the canonical, or the JSON-LD block beyond
  the count string that is already there.

## Proof

- A new smoke test: the new `h1`, four chips, **21 trade links still present in the DOM**, and a
  chip click that fills the box and opens the listbox.
- `check-readme-counts` — still finds exactly 2 count strings, both reading 1,709.
- `check:shell-mobile` + the 320px whole-catalog sweep + the 44px touch-target sweep.
- `check-home-payload` — under budget.
- **Diff assertion: `index.html` loses zero `href` values.** Every URL reachable from the home
  document before this spec is reachable after it.
