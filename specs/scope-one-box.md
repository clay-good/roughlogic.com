# scope-one-box.md — One box in, an instrument out

> Status: **IN PROGRESS.** Eleven specs, `spec-v1337` through `spec-v1347`.
> Adapts the shipped sophiewell.com program (`spec-v751`–`v758`) to this catalog and this
> catalog's traffic. No tile is added, removed, or renumbered **by this program**. (The
> catalog itself has grown since: **1,709 when this was written, 1,804 as of 2026-09-02**.
> Every count below was re-measured on that date -- this is the live charter, and a live
> charter with the counts it was born with is a charter nobody can check.)
>
> **Ten of eleven shipped:** v1337, v1338, v1339, v1340, v1341, v1342, v1343, v1344, v1345, v1346.
> Only v1347 remains, and it is deliberately blocked on Search Console evidence.

## The product in one line

An electrician types the job the way they would say it — `voltage drop 120v 150 ft 12awg 20a` —
and gets the number, the inputs it came from, and the code section. Nothing else on the page.

## Why a card, not a chat

The output is a number that goes on a panel schedule, not prose. Three reasons the instrument wins:

| | |
|---|---|
| **Verification** | `2.9 V drop` in a chat bubble has to be trusted. `120 V · 150 ft · 12 AWG · 20 A` sitting under the 2.9 catches a mis-parse in a second. |
| **Posture** | A chat box invites "is this to code?". A box that returns an instrument never makes that offer. The site stays a math aid, which is what every NOTICE on it already says. |
| **Scrollback** | On a truck at 6am the current number should fill the screen, not sit under three previous jobs'. |

**No model runs, local or remote.** Every step is regex and table lookup. That is what keeps the
home page's "no signup, no tracking, no AI" claim literally true.

## The traffic constrains the design

~20k/mo at the DNS layer, 120 Google clicks in the last 28 days, and the top organic landing page
is **`/groups/construction/`**. That is not a site whose navigation should be rearranged on
aesthetic grounds, and three measured facts set hard limits on what these specs may do:

| Measured | Consequence |
|---|---|
| **All 1,804 tile shells link their own group hub** (re-measured 2026-09-02; 0 exceptions). `/groups/construction/` is linked by its 479 tiles. | The hubs are not fragile. The home page's 21 links are a small share of their inbound links. |
| ~~**The hubs cross-link by SPA hash**~~ -- **fixed 2026-08-31 (`d5633af9`)**: every hub now carries an "Other trades" section listing the other 20 as real `/groups/<slug>/` URLs with their live counts, and `check-shells` fails a hub that drops a sibling. A second fragment link, the hubs' "Open the live group view" call to action, pointed at a route the SPA no longer has and was replaced on 2026-09-02 (`052c6fdf`). **No `#group=` link remains on the site.** | Hub-to-hub link equity now flows. This was one of the two facts gating v1347; it no longer holds, so the case against removing the home nav rests on the remaining one. |
| ~~**`/tools/` is a 404**~~ — **fixed by [v1345](spec-v1345.md)**: it now lists all 1,804 by trade, links all 21 hubs as real URLs, and is reachable from every page's footer. | The free, zero-risk addition is banked. Subtraction ([v1347](spec-v1347.md)) now has something to wait on. |

**So the nav change is split in two, and the risky half is gated on evidence.** v1345 adds
`/tools/` and the footer badge — pure addition, nothing removed, no URL changed. v1337 simplifies
the home page while **keeping all 21 links**, demoted to a compact strip below the box. Only
v1347 removes them, and only after Search Console confirms `/tools/` is indexed and hub
impressions are flat. That ordering means the site is never carrying two link-graph changes at
once, and the one with any risk is trivially revertible.

## Both doors are already open. Nothing gates them shut.

The ask was that every calculator be reachable from the website's search **and** the local MCP
server. Measured across the whole catalog:

| | |
|---|---|
| Tiles reachable in the search dropdown by their own name | **1,804 / 1,804** (1,801 rank first) |
| Tiles runnable through the MCP server | **1,804 / 1,804** |
| Tiles with a publisher-verified worked example | **1,804 / 1,804** |
| Tiles whose inputs the field index describes (v1339) | **1,763 of 1,804** (1,331 at v1339; the schema-less tiles were added 2026-08-28 from the captions they already print; the 41 skipped carry only list-valued or unlabelled inputs) |

Both doors are at 100% **today, by luck rather than by construction** — no gate asserts either
one. A renamed export, a tile added without a `COMPUTE_MAP` row, or a name that collides its way
out of the top twelve would all pass CI silently. [v1346](spec-v1346.md) pins both properties, and
it lands **early**, because it is the safety net the rest of this program is built over.

## This is not a re-theme

The two sites already share a palette, a spacing scale, and a header/footer shape. Only the token
*names* differ, and the accent differs on purpose — roughlogic's brand blue `#5aa9ff`, not
sophiewell's clinical teal. **Nothing in the palette changes.** What is adopted is the product
pattern and the components it needs. Every new rule uses tokens that already exist.

## The eleven specs

Build order is **substrate first, addition before subtraction**. The invisible, CI-verifiable work
lands before any pixel moves; the additive nav work lands before any link is removed.

| Spec | What it does | Depends on | Risk |
|---|---|---|---|
| ~~v1339~~ | ~~The field index: `data/fields/*.json` from the renderers' own schemas~~ **SHIPPED** | — | none |
| ~~[v1346](spec-v1346.md)~~ | ~~Gate both doors: every tile searchable **and** MCP-runnable~~ **SHIPPED** | — | none |
| ~~[v1340](spec-v1340.md)~~ | ~~`query-fill.js` — query + tile → filled, missing, unmatched~~ **SHIPPED** | v1339 | none |
| ~~[v1341](spec-v1341.md)~~ | ~~Enter routes to the answer, with provenance on every filled field~~ **SHIPPED** | v1340 | behaviour |
| ~~[v1342](spec-v1342.md)~~ | ~~Ask for the first missing value, in words~~ **SHIPPED** | v1341 | behaviour |
| ~~[v1343](spec-v1343.md)~~ | ~~Two or three plain choices when the query is ambiguous~~ **SHIPPED** | v1341 | behaviour |
| ~~[v1345](spec-v1345.md)~~ | ~~`/tools/` — every calculator by category — and the footer badge~~ **SHIPPED** | v1346 | none |
| ~~[v1337](spec-v1337.md)~~ | ~~The home page becomes one box. **All 21 trade links kept.**~~ **SHIPPED** | v1345 | low |
| ~~[v1338](spec-v1338.md)~~ | ~~Answer first, inputs second~~ **SHIPPED** | — | low |
| ~~[v1344](spec-v1344.md)~~ | ~~An MCP `answer_query` that reads the same registry~~ **SHIPPED** | v1340 | none |
| [v1347](spec-v1347.md) | Retire the home trade strip — **gated on Search Console evidence** | v1337 | the only real one |

## The four SEO invariants, enforced not promised

Every spec in this program is held to all four. [v1346](spec-v1346.md) and the existing
`check-dist` / `check-shells` / `build-sitemap` gates do the enforcing.

1. **No URL changes and no redirects.** `/`, `/tools/<id>/`, `/groups/<slug>/` all stay exactly
   where they are. This program adds `/tools/` and nothing else.
2. **No group-hub shell is edited.** Titles, meta descriptions, canonicals, JSON-LD, and the
   466-tile listings on `/groups/construction/` are untouched by all eleven specs.
3. **The home page keeps its count surfaces.** `check-readme-counts` requires **exactly two**
   `"<N> free calculators for"` strings in `index.html` — the JSON-LD description and the hero
   lede. The rewritten intro keeps the count rather than retiring the surface, which is both
   shorter copy *and* one less way for the site to drift. (sophiewell retired its equivalent
   surface; we do not need to.)
4. **Every hub stays reachable without JavaScript.** Today that is the home nav. After v1345 it is
   the footer badge → `/tools/`, a pre-rendered page — and that path reaches all 1,804 tiles,
   where the nav reached 21 hubs.

## What we already had that sophiewell had to build

| | |
|---|---|
| **The field registry** | 1,425 tiles carry `render.schema` or a `BESPOKE_SCHEMAS` entry; the rest are indexed from their printed captions. (`key` is **not** reliably the DOM id — see [v1341](spec-v1341.md); resolve against the live DOM by id, then by rendered label.) |
| **A quantity parser** | `search-discovery.extractQuantities()` already pulls `{value, unit}` out of a typed query. |
| **A shared ranker** | `rankTools()` is used by the browser *and* the MCP server, so recall cannot drift between them. |
| **Deep links that work** | `applyHashState` already dispatches **both** `input` and `change` — the pre-existing bug sophiewell's v754 had to fix does not exist here. |
| **Empty-on-open tiles** | Since `2ef4ac05` no tile opens pre-filled. sophiewell's worst bug — the worked example silently topping up a partly answered question and changing the answer — **cannot happen here.** |

## The three problems this port has that sophiewell did not

**1. Units live in the label, not in a field.** Solved in v1339: `unitFromLabel` refuses by
default and resolves 63.3% of fields. **A bare `(C)` is never Celsius** — in this catalog it is as
often Hazen-Williams or Manning's coefficient.

**2. There is no `required` flag.** ~~v1342 derives it~~ **Solved in [v1342](spec-v1342.md)**:
3,846 of 5,367 fields (71.7%), derived by zeroing one field at a time and re-running the tile's own
worked example. Zeroing, not deleting — the browser sends `Number("") || 0` for an empty box and
never reaches the compute's own default.

**3. 378 tiles have names but no labels.** They degrade to compute-parameter introspection, so the
extractor sees `area_ft2` and no human text. They get the same treatment sophiewell gave its
unlabelled cases: **no card rather than a bad one.** They keep working exactly as today, and
v1346 keeps them reachable and runnable.

## What this program is not

- **Not an LLM.** No model, no server, no path by which a wrong number gets invented.
- **Not query telemetry.** The home page says no tracking and that stays true. Failed queries are
  diagnosed against a checked-in corpus (`test/fixtures/queries.txt`), never by recording what
  anyone typed. Given that a large share of the 20k/mo appears to be agents, this matters more
  here than it did on sophiewell: agent traffic is exactly the kind that makes query logging look
  cheap and useful.
- **Not a catalog change.** The program adds and removes no tile: 1,709 before it and 1,709 after it, and the growth to 1,804 since is the trade-expansion work, not this. No compute is touched.
- **Not a palette change.**

## The safety rule that governs all eleven

**A wrong prefill is worse than no prefill.** One field with two readings fills neither. One
fragment claimed by two fields fills neither. A number whose unit does not match the field's is
refused, not converted by guess.
