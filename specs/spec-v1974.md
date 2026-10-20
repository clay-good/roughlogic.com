# spec-v1974.md -- Your state's code edition, for the building codes

> **Status: LANDED 2026-10-20 (proposed 2026-10-19), mechanism only, as this spec specifies: no state row is drafted. Built: six empty rows files, `validateCodeRows` (the spec-v1968 rules plus the family rule) run by `check-code-adoption`, `codesCited` (which ignores the Internal Revenue Code's 'IRC 179'), the family sentence, the residential and commercial scopes, and a picker that prints one line per cited code with drafted rows. The NEC rows stay where they are rather than moving under `codes.NEC`, and `codes` appears in the shard only once a building code has rows, so the shipped shard and the 101 NEC tiles are byte-for-byte unchanged; the per-code sign-off sheet sections are added when the first rows are. Drafting the rows (IRC first, by the spec's default) is the maintainer's next step. **IRC rows drafted 2026-10-20: all 51, unsigned**, each from the state's own rule where one was found (42 primary, 9 secondary), ICC's April 2026 adoption chart beside each as the cross-check; five disagree and show no edition (HI, MS, NC, RI, WV). The sign-off sheet gained a per-code section. **IBC rows drafted 2026-10-20 the same way: all 51, unsigned** (48 primary, 3 secondary; HI, MS, NC and WV conflict and show no edition; Oklahoma and South Dakota disagree with ICC only because its April chart predates their 2026 rules, so they show their edition). **IPC, IMC and IFGC rows drafted 2026-10-20 together: all 51 each, unsigned**; the family field carries 15 UPC and 5 own-code plumbing states, 3 UMC and 1 other mechanical, 6 UPC and 6 NFPA 54 fuel-gas states, whose sentence names the code they use instead. **IECC rows drafted 2026-10-20: all 51, unsigned**, residential and commercial editions listed separately (ASHRAE 90.1-only commercial codes named in scope; California and one other state on codes of their own). Every building-code file now holds all 51 jurisdictions; signing remains the maintainer's, as for the NEC. Part of [scope-product-expansion](scope-product-expansion.md). Roadmap pillar 1 of [spec-v106](spec-v106.md) section 7, extended from the NEC ([spec-v1968](spec-v1968.md)) to the IRC, IBC, IPC, IMC, IFGC and IECC. Design and data plan only: no state row is drafted by this spec.** Catalog stays at **2,267**.

## What it does for you

The "Your state's edition" row that 101 NEC calculators show would appear on the calculators that cite the building, plumbing, mechanical, fuel-gas and energy codes too, with the same picker and the same memory of your state. A deck builder in Ohio would see "Ohio enforces the 2024 IRC (Residential Code of Ohio, effective ...). This calculator follows IRC 2024." A plumber would see the IPC edition, or that their state uses the UPC instead and this calculator's IPC rule may not apply.

| Code | Calculators that cite it | Order |
|---|---|---|
| IRC | 113 | first |
| IBC | 74 | second |
| IPC | 67 | third |
| IFGC | 29 | with the IPC |
| IMC | 19 | with the IPC |
| IECC | 17 | last |

## Why this is harder than the NEC, and what that changes

The NEC is one document adopted statewide by most states. The building codes are adopted per occupancy (residential versus commercial), per code family (IPC versus UPC, IMC versus UMC), often by a state agency for one scope and by cities for another, and with amendment packages that rename the code (Florida Building Code, California Residential Code). Three consequences:

1. **A row records the family, not only the edition.** A state on the UPC has no IPC edition; the row says so and the sentence reads "Your state adopts the Uniform Plumbing Code, not the IPC this calculator follows; the IPC rule may not apply." That is a more useful sentence than any edition.
2. **Scope is per row, as spec-v1968 already allows.** `applies_to` values grow from `all` and `state-buildings` to `residential`, `commercial`, `residential-and-commercial`.
3. **Local adoption is a first-class answer**, as it already is for Arizona, Mississippi and Missouri under the NEC.

## Rules

- **Same discipline as spec-v1968, unchanged:** each row cites the state's own statute or rule as the source of truth; ICC's state-adoption map is stored as the cross-check only (`icc_<date>` beside `nfpa_<date>`); unsigned rows show labeled "not verified" with the inspector advice; conflicting sources show no edition; the enforced edition is worked out for today's date; quarterly recheck.
- **One rows file per code**, `docs/code-adoption-rows.<code>.json`, each with the `code`, `cadence_days`, `about`, `rows` shape of the NEC file so the sign-off sheet generator and the gate run per code without change. The shipped shard becomes `data/legal/code-adoption.json` with a `codes` map.
- **A calculator shows the row for each code its citation names**, so a tile citing both the IRC and the IBC shows two sentences. The matcher `citesNec` generalises to `codesCited(editionText)` with one regex per code; a tile naming "ICC A117.1" or "IEBC" matches nothing in v1.
- **Family rows.** A row's `family` is `IPC`, `UPC`, `IMC`, `UMC`, `NFPA 54`, `IFGC`, or `other`; the sentence branches on it. The IRC's plumbing and mechanical chapters are the IRC's own and need no family.
- **No row is drafted in this spec.** The first draft runs the spec-v1968 method per code: one state at a time, from the state's own rule, the cross-check beside it, the conflicts listed first on the sign-off sheet. Drafting the IRC rows first gives the most calculators the row soonest.

## Decisions the maintainer makes before drafting starts

| Question | Default if nothing is decided |
|---|---|
| Draft all six codes or the IRC first? | IRC first, then IBC, then the three plumbing-mechanical-gas files together, then IECC. |
| Show the UPC/UMC family sentence, or only states on the I-codes? | Show it: a wrong-family warning is the most useful sentence this feature can print. |
| City rows (NYC, Chicago, LA, Philadelphia)? | Not in v1. |

## How it is built

| Piece | Change |
|---|---|
| `docs/code-adoption-rows.<code>.json` x 6 | Rows, drafted later. |
| `docs/code-adoption-signoff.md` | One section per code, conflicts first. |
| `data/legal/code-adoption.json` | `{ states, codes: { NEC: rows, IRC: rows, ... } }`. The NEC rows move under `codes.NEC` with no change to their content. |
| `code-adoption.js` | `codesCited`, the per-family sentence, and two rows on a tile that cites two codes. Still loads only on a calculator that cites a covered code. |
| `scripts/check-code-adoption.mjs` | Runs per code file; the family field is validated; a UPC row with an IPC edition fails. |

## Proof

- Every spec-v1968 gate rule, seeded red, per code file.
- A rendering test: a state on the UPC prints the family sentence on an IPC tile and nothing on an IRC tile; a state with residential 2021 and commercial 2024 prints the right one by scope; a tile citing IRC and IBC prints two rows.
- The NEC behaviour is byte-for-byte unchanged on the 101 NEC tiles (the existing tests keep passing against the moved rows).

## Not in v1

- City-level adoptions, and state amendment packages that change a value (Florida's wind provisions, California's energy code). The row names the edition and links the state's rule; the amendment is the reader's to read there.
- The IEBC, IFC, ISPSC and ICC A117.1.
