# spec-v1968.md -- Your state's code edition

> **Status: LANDED (2026-10-17). Platform spec, no tile added. Roadmap pillar 1 of [spec-v106](spec-v106.md) section 7, "jurisdiction / edition awareness (highest leverage)". The mechanism ships; the data waits for the maintainer: 0 of 51 rows are signed, so nothing shows on any page until rows are signed from [the sign-off sheet](../docs/code-adoption-signoff.md).** Catalog stays at **2,267**.

## What it does for you

On the 101 calculators whose citation names the NEC, the reference block gains a "Your state's edition" row. Pick your state once and it says which NEC edition your state enforces, next to the edition the calculator follows. For example: "Georgia enforces NEC 2023 (since Jan 1, 2025). This calculator follows NEC 2023. Source: Ga. Comp. R. & Regs. 110-11-1-.31." The source links to the state's own rule. The choice is remembered in one browser storage key (`rl-state`) and is never sent anywhere.

## Decisions (maintainer, 2026-10-17)

| Question | Decision |
|---|---|
| Which codes in v1? | NEC only: all 50 states and DC (51 rows). |
| Who verifies? | Claude drafts each row with the state's statute or rule; the maintainer signs each one off. |
| Refresh cadence? | Quarterly (92 days). |

## Why nothing shows until a row is signed

Telling an electrician the wrong enforced edition is worse than saying nothing, and the public compilations disagree with each other. Drafting found five rows where good sources conflict outright: MD, ND, NH, NV and WY. It also found Texas and Vermont adopting editions after NFPA's map was read. So:

- **Each row cites its state's own statute or rule, and that citation is the source of truth.** NFPA's enforcement map is stored beside each row as a cross-check only.
- **"Local adoption" is a real answer.** Arizona, Mississippi and Missouri have no statewide NEC, so the row says your city or county sets the edition.
- **Limited and split adoptions are stated as such.** Examples: Kansas covers only state-owned buildings; Michigan uses one edition for houses and another for everything else.
- **Only signed rows ship, and a signed row older than 92 days is withheld** with a note to check with the inspector. It is never shown as current.
- **The edition in force is worked out for today's date.** Washington moves to NEC 2026 on Dec 31, 2026 and South Carolina to NEC 2023 on Jan 1, 2027, without anyone editing the page.

## How it is built

| Piece | Role |
|---|---|
| [docs/code-adoption-rows.json](../docs/code-adoption-rows.json) | All 51 drafted rows: status, editions by scope, upcoming editions, citation, source link, draft note, NFPA cross-check, sign-off fields. |
| [docs/code-adoption-signoff.md](../docs/code-adoption-signoff.md) | Generated sign-off sheet, conflicts first, with the steps to sign a row. |
| `data/legal/code-adoption.json` | The shipped shard: state names plus signed rows only. `build-data.mjs` writes it, and it rides the existing legal-folder manifest, hash and integrity chain. |
| `code-adoption.js` | Resolves the edition in force, writes the sentence, and draws the picker. It loads only on an NEC calculator. |
| `scripts/check-code-adoption.mjs` | Lint gate. `--write` regenerates the shard and the sheet after a sign-off, and re-hashes only the legal folder. |

## Proof

The gate is `check-code-adoption`, run in lint, with tests in `test/unit/code-adoption.test.js`. Each rule below is seeded red there:
- a missing state, an uncited row, or a non-https source;
- an edition the NFPA map does not show, with no explanation;
- a non-ISO date, or a local row that lists an edition;
- a shipped string over the 140-character data-prose cap;
- a date without a signer, or a signer without a date;
- signing a row whose citation is not a primary source, or a sign-off dated in the future;
- a row two rechecks late (one recheck late warns).

Disabling the cross-check or the primary-citation rule turns the test red. The tests also check that:
- an unsigned, missing or stale row never prints an edition;
- the edition in force flips on the effective date;
- no picker is built while zero rows are signed.

Checked in the browser on `wire-ampacity` with one temporarily signed row:
- the row sits under "Source and edition" and fits at 375 px;
- the state survives a reload;
- an unsigned state says it is not verified;
- with nothing signed, no row appears.

## Not in v1

- Flagging when a specific answer would differ between editions. That needs per-tile edition-sensitivity data; see v2.
- Codes other than the NEC (IRC, IBC, plumbing, mechanical, energy).
- City-level adoptions (NYC, Chicago, Philadelphia, and others).
