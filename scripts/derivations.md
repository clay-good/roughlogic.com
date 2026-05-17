# Derivations (build-side pointer)

This file is the build-side counterpart to [docs/derivations.md](../docs/derivations.md), per the file layout in spec section 6. It exists to make the derivation record discoverable from the same folder as the data pipeline that produces the corresponding shards.

The authoritative derivation record lives at [docs/derivations.md](../docs/derivations.md). That document is the load-bearing record showing each physics-derived calculator is original work computed from first principles, not a reproduction of a licensed code table.

## Adding a new derivation

When a new physics-derived calculator is added:

1. Add a section to `docs/derivations.md` with inputs, governing equations, citations, and verification approach.
2. Add the corresponding pure-math function to `pure-math.js` with at least 10 unit tests.
3. Add a first-principles cross-check in `test/unit/first-principles.test.js` against published worked examples or code-equivalent values, with the tolerance documented.
4. Update `data/<folder>/manifest.json` and `scripts/expected-hashes.json` if the derivation produces shipped data.

The grep checks (`scripts/grep-checks.mjs`) and the unit tests must pass before merging.

Earlier revisions of this file carried a hand-maintained derivation index covering v1 and v2 (utilities 1 through ~64). That index drifted as v3 through v12 added more derivations (v3-v8 trades expansion; v9 commodity series, magnetic-declination, lightning-countdown, noise-dose; v10 Phase-C worked-example registry; v11 platform hardening; v12 Groups U / V / W / X / Y at +83 tiles across veterinary, EMS, aviation, real estate, and education) and was retired in favor of the single source of truth in `docs/derivations.md`.
