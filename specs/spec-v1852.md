# roughlogic.com Specification v1852 -- Explicit landed-spec aliases

> **Status: LANDED 2026-09-28.** Spec status validation only.

## Outcome

A landed spec cannot hide a missing calculator by mentioning an unrelated live ID.

## Requirements

1. A single missing heading ID may be resolved by an explicit `built as` alias whose target exists in the catalog.
2. Incidental backticked IDs do not resolve missing calculators.
3. An unqualified alias cannot resolve multiple missing heading IDs; require separate specs or explicit future mapping support.
4. Preserve existing single-tile aliases and verify the committed spec history with the gate.

## Validation

Add regression cases for incidental IDs and multiple missing IDs, then run the unit suite, lint, and build.
