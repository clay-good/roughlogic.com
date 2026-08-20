# scope-one-box.md — One box in, an instrument out

> Status: **PLANNED (2026-08-20).** Nine specs, `spec-v1337` through `spec-v1345`.
> Ports the shipped sophiewell.com program (`spec-v751`–`spec-v758`) onto this catalog.
> No tile is added, removed, or renumbered. The catalog stays **1,709** throughout.

## The product in one line

An electrician types the job the way they would say it — `voltage drop 120v 150 ft 12awg 20a` —
and gets the number, the inputs it came from, and the code section. Nothing else on the page.

## Why a card, not a chat

The output is a number that goes on a panel schedule, not prose. Three reasons the instrument wins:

| | |
|---|---|
| **Verification** | `2.9 V drop` in a chat bubble has to be trusted. `120 V · 150 ft · 12 AWG · 20 A` sitting under the 2.9 catches a mis-parse in a second. That glance is the whole safety story. |
| **Posture** | A chat box invites "is this to code?". A box that returns an instrument never makes that offer. The site stays a math aid, which is what every NOTICE on it already says. |
| **Scrollback** | On a truck at 6am the current number should fill the screen, not sit under three previous jobs'. `search → find → use → leave` is still right. |

What we want *from* chat needs no model: type how you talk, see what the machine understood, and be
asked for what is missing instead of handed a blank form. All three are deterministic table lookup.
**No model runs, local or remote.** That keeps the home page's "no AI, no tracking" claim true.

## This is not a re-theme

The two sites already share a palette, a spacing scale, and a header/footer shape. The token
*names* differ (`--fg` here, `--text-primary` there) and the accent differs on purpose —
roughlogic's brand blue `#5aa9ff`, not sophiewell's clinical teal. **Nothing in the palette
changes.** What is being adopted is the *product* pattern and the components it needs: the one-box
home, the answer-first tile, and four new cards. Every new rule uses tokens that already exist.

## What we already have that sophiewell had to build

| | |
|---|---|
| **The field registry** | 1,330 of 1,709 tiles carry a `render.schema` or a `BESPOKE_SCHEMAS` entry: `key`, `label`, `kind`, `options`, `default`, `attrs`. 7,322 field descriptors. `key` **is** the DOM id, so a filled field and a hash param are the same thing — sophiewell needed a `dom`/`arg` split, we do not. |
| **A quantity parser** | `search-discovery.extractQuantities()` already pulls `{value, unit}` pairs out of a typed query, glued or spaced, fractions included. |
| **A ranker** | `rankTools()` already scores the catalog and is shared with the MCP server, so browser and agent recall cannot drift. |
| **Deep-link plumbing** | `buildHash`/`applyHashState` are live and versioned, and already dispatch **both** `input` and `change` — the pre-existing bug spec-v754 had to fix does not exist here. |
| **Browsable hubs** | 21 prerendered `/groups/<slug>/` pages, in the sitemap, and linked from **every one of the 1,709 tile shells**. Half of spec-v757 is already solved; the other half — a hub for `/tools/` itself — is not, and is [v1345](spec-v1345.md). |
| **Empty-on-open tiles** | Since `2ef4ac05` no tile opens pre-filled, and examples are click-to-fill. spec-v754's worst bug — the worked example silently topping up a partly answered question and changing the answer — **cannot happen here.** |

## What is actually missing

| | |
|---|---|
| **Prefill reaches 49 tiles, not 1,709** | `data/search/slots.json` is hand-maintained: one row per tile, hand-picked unit tokens per param. 49 of 1,709. Which tile a typed query prefills is luck. |
| **Enter lands on a picklist** | Typing a sentence returns twelve tool names. The reader asked a question and got a filing cabinet. |
| **The answer is below the inputs** | `renderToolView` builds title → lead → **inputs** → **answer**. On a 16-field tile the number is off-screen. |
| **Nothing asks for a missing value** | Three of four values typed gets you a form with one empty box and no sign which one. |
| **Nothing carries provenance** | A prefilled field looks identical to one the reader typed. |

## Two decisions, made

- **The trade nav moves into an `All calculators` footer badge, beside Clay Good and GitHub.**
  The first cut of this doc proposed demoting the nav below the fold, on the assumption that the
  home page's 21 links were load-bearing for the hubs. **They are not**, and the numbers say so:

  | | |
  |---|---|
  | Tile shells that already link their group hub | **1,709 of 1,709** |
  | Home-page links to the same 21 hubs | 21 |
  | `/tools/` — the parent of all 1,709 pre-rendered tile pages | **currently a 404** |

  Each hub already carries roughly 81 inbound internal links from its own tiles. The home page's
  21 are a rounding error on top of that, so removing them costs the hubs approximately nothing —
  and routing the badge through a real `/tools/` index *gains* every hub a link from a page that
  all 1,709 shells point at. The crawl graph comes out strictly ahead, not merely intact.

  **The condition that makes it true:** the badge must point at a pre-rendered `/tools/` page, not
  a JavaScript affordance. That page is [spec-v1345](spec-v1345.md), and it lands **before**
  v1337 removes anything. It also becomes the no-JS path off the home document, and it is a better
  one than the nav it replaces — it reaches all 1,709 tiles, where the nav reached 21 hubs.

- **The accent stays roughlogic blue.** New components use the existing `--accent` /
  `--accent-strong`, which already clear WCAG AA in both themes. No new palette tokens.

## The nine specs

Build order is **substrate first**: v1339 and v1340 are invisible and CI-verifiable, so the
extraction is live and proven before any pixel moves. That sequencing is the one thing sophiewell
called out as having earned its keep.

| Spec | What it does | Depends on | Visible |
|---|---|---|---|
| v1339 | The field index: `data/fields/<group>.json` from the renderer schemas | — | no |
| v1340 | `query-fill.js` — query + tile → filled, missing, unmatched | v1339 | no |
| v1341 | Enter routes to the answer, with provenance on every filled field | v1340 | behaviour |
| v1342 | Ask for the first missing value, in words | v1341 | yes |
| v1343 | Two or three plain choices when the query is ambiguous | v1341 | yes |
| v1345 | The catalog gets a page: `/tools/`, and the footer badge that reaches it | — | yes |
| v1337 | The home page becomes one box; the trade nav moves to the badge | v1345 | yes |
| v1338 | Answer first, inputs second | — | yes |
| v1344 | An MCP `answer_query` that reads the same registry | v1340 | no |

## The three problems this port has that sophiewell did not

**1. Units live in the label, not in a field.** sophiewell's descriptors carry `unit: "kg"`.
Ours carry `label: "Length one-way (ft)"` — 4,357 of 7,322 fields end in a parenthesized unit.
The trailing-paren convention is already a governed contract (`docs/unit-notation-in-labels.md`,
`check-us-defaults`), so it is parseable, but the parser is ours to write and it must be tested
against the **actual distinct trailing tokens in the catalog**, not an idealized list. `(ft²)`,
`(in⁴)`, `(°F)`, and `(C)` — which is *not* always Celsius — are all live.

**2. There is no `required` flag.** sophiewell's registry says which inputs a tile cannot answer
without; ours does not. v1342's ask card needs one. The proposed rule: a field is required when
its `attrs` carry no usable `default` and the compute returns non-finite without it — derived at
build time by running each tile's compute with that one field blanked, which is cheap and honest,
rather than hand-annotating 7,322 fields.

**3. 379 tiles have names but no labels.** They degrade to compute-param introspection, so the
extractor sees `area_ft2` and no human text. Those tiles get the same treatment sophiewell gave
its unlabelled cases: **no card rather than a bad one.** They keep working exactly as today.

## What this program is not

- **Not an LLM.** No model, no inference cost, no server, no path by which a wrong number gets
  invented. Every step is regex and table lookup.
- **Not query telemetry.** The home page says no tracking and that stays true. Failed queries are
  diagnosed by running the extractor over a checked-in corpus (`test/fixtures/queries.txt`), never
  by recording what anyone typed.
- **Not a catalog change.** 1,709 before, 1,709 after. No compute is touched.
- **Not a palette change.** See *This is not a re-theme*.

## The safety rule that governs all nine

**A wrong prefill is worse than no prefill.** One field with two readings fills neither. One
fragment claimed by two fields fills neither. A number whose unit does not match the field's unit
is refused, not converted by guess. Across sophiewell's 4,953-field measurement the extractor was
either right or blank on every one but two, and that is the bar.
