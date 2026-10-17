# spec-v1968.md -- Your state's code edition

> **Status: PROPOSED (2026-10-17). Platform spec, no tile added. Roadmap pillar 1 of [spec-v106](spec-v106.md) section 7, "jurisdiction / edition awareness (highest leverage)". Design and data plan only; nothing ships until the maintainer has reviewed this spec and verified the first state rows against their primary sources.**

## What it would do for you

You set your state once. Every code-anchored calculator then tells you which edition your state enforces, next to the edition the calculator computes to. For example, with placeholders rather than real states: "[Your state] enforces NEC [edition]. This calculator follows NEC 2026; see what changed." The answer meets you at the code your inspector holds you to, not just the newest one.

## Why the data is the whole problem

Telling an electrician the wrong enforced edition is worse than saying nothing. The public compilations disagree with each other:

| Source | What it says |
|---|---|
| [EC&M, Oct 2025](https://www.ecmweb.com/industry-viewpoint/blog/55330015/unpacking-key-revisions-to-the-2026-nec) | 20 states on NEC 2023 |
| [Citel, Mar 2025](https://citel.us/en/where-is-the-national-electrical-code-in-effect-as-of-2025) | 17 states on NEC 2023 |
| [SurgePV](https://www.surgepv.com/solar-compliance/usa/tools/nec-version-by-state) and [Eaton](https://www.newark.com/sc/eaton/eaton-nec-2026) | conflict on individual states |
| [ICC Master I-Code Adoption Chart](https://www.iccsafe.org/wp-content/uploads/Master-I-Code-Adoption-Chart-FEB-22.pdf) (a February 2022 copy; ICC updates it) | notes that not every jurisdiction reports its adoptions to ICC |

Many states also adopt no statewide code at all and leave the choice to cities and counties. So:

- **Every state row cites that state's own statute or administrative-code section, and that citation is the source of truth.** The compilations ([IAEI's NEC adoption table](https://www.iaei.org/page/nec-code-adoption), NFPA's own adoption map, the ICC chart, [DOE's energy-code status](https://energycodes.gov/state-portal)) are cross-checks only, never the sole source.
- **"Local adoption" is a first-class answer**, not a gap: "[State] adopts no statewide NEC; your city or county sets the edition." (No real state is named here, because none has been verified yet.)
- **No row older than its refresh cadence is shown.** A stale row is withheld with a note, never displayed as current.

## Data model: reuse what already works

The repo already ships per-state legal data this way: [data/legal/sales-tax-nexus.json](../data/legal/sales-tax-nexus.json). Each state row carries its own citation and `verified_on` date, under `check-shard-source-drift`, the verified-on ledger and the refresh-cadence gates. The new shard `data/legal/code-adoption.json` follows the same shape:

| Field | Meaning |
|---|---|
| `code` | `nec`, then `irc`, `ibc`, `ipc` / `upc`, `imc` / `umc`, `iecc`, `ifc`, `ifgc` / `nfpa54` |
| `status` | `statewide`, `statewide-amended`, `local`, or `none` |
| `edition`, `effective` | the enforced edition and its effective date, when statewide |
| `citation` | the state statute or administrative-code section |
| `verified_on` | the date a person checked that citation |

## Proposed v1 scope

- **One code: NEC, for all 50 states plus DC.** Electrical is Tier 1, the NEC is the most-asked edition question, and [docs/edition-rollover.md](../docs/edition-rollover.md) already plans a dual-edition window for it.
- **The setting:** a state picker stored only in the browser. Nothing is sent anywhere, consistent with "private by default."
- **The display:** one line on NEC-anchored tiles naming the state's edition and the tile's, with a link to the state's own adoption source.
- **Not in v1:** flagging when a specific answer would differ between editions. That needs per-tile edition-sensitivity data and is v2. v1 states the editions honestly and stops there.

## Proof that would ship with it

- A gate that refuses the shard unless all 51 rows are present, each with a citation and a `verified_on` inside its cadence.
- The existing drift and ledger gates applied to the new shard.
- A test that a withheld (stale) row never renders as current.
- A seeded wrong edition caught by the cross-check report.

## Decisions for the maintainer

1. Is v1 NEC-only, or does it include the IRC from the start?
2. Who verifies each row against its primary source: the maintainer by hand, or a drafted row the maintainer signs off?
3. What refresh cadence? Quarterly is proposed; adoption changes are slow but uneven.
