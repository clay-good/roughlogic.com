# roughlogic.com Specification v1853 -- Complete Spec-Status Coverage

> **Status: LANDED 2026-09-28.** Documentation and validation only. No calculator, route, formula, or catalog change.

## Outcome

Every numbered specification contributes a recognized state to the spec-status gate. Historical
`Implementation status` and `Status: **SHIPPED**` forms are normalized instead of silently skipped.

## Requirements

1. Parse the canonical status form and both historical forms used by numbered specs.
2. Normalize `CLOSED`, `COMPLETE`, `SHIPPED`, and `IMPLEMENTED` to landed; normalize `DRAFT` and
   `PLANNED` to proposed.
3. Fail when a numbered spec has no recognized status.
4. Correct stale draft or planned labels for work already present in the repository.
5. Preserve intentional design and blocked states.
6. Read the lettered tile headings used by early expansion specs and require an explicit old-to-live ID mapping
   for every missing tile when one landed spec reconciles several duplicates.

## Proof

The gate's summary must account for all numbered specs, and its unit tests must cover every supported form
plus the missing-status case.
