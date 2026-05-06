# Derivations (build-side index)

This file is the build-side counterpart to [docs/derivations.md](../docs/derivations.md), per the file layout in spec section 6. It exists to make the derivation record discoverable from the same folder as the data pipeline that produces the corresponding shards.

The authoritative derivation record lives at `docs/derivations.md`. That document is the load-bearing record showing each physics-derived calculator is original work computed from first principles, not a reproduction of a licensed code table.

## Derivations index

For each derivation, see the corresponding section in `docs/derivations.md`:

v1 (utilities 1 through 64):

1. Conductor resistance at temperature
2. Wire ampacity from physics
3. Hazen-Williams friction loss
4. Darcy-Weisbach friction loss (water and gas)
5. Psychrometric calculations
6. Three-phase and single-phase power
7. Voltage drop
8. Refrigerant pressure-temperature interpolation
9. Beam mechanics
10. Fire-ground friction loss
11. Hydrant flow

v2 (utilities 65 through 119):

12. Solar PV string sizing
13. Battery runtime with Peukert correction
14. Pipe thermal expansion
15. Outdoor air mixing
16. Pipe insulation thickness (cylindrical conduction)
17. Joist mid-span deflection
18. Excavation volume with side slopes (frustum)
19. Wind velocity pressure (ASCE 7)
20. Snow load (ASCE 7)
21. Anchor bolt embedment
22. Reverse-lay tandem-pump friction
23. Vehicle braking distance
24. Haversine distance and initial bearing

## Adding a new derivation

When a new physics-derived calculator is added:

1. Add a section to `docs/derivations.md` with inputs, governing equations, citations, and verification approach.
2. Add the corresponding pure-math function to `pure-math.js` with at least 10 unit tests.
3. Add a first-principles cross-check in `test/unit/first-principles.test.js` against published worked examples or code-equivalent values, with the tolerance documented.
4. Update `data/<folder>/manifest.json` and `scripts/expected-hashes.json` if the derivation produces shipped data.

The grep checks (`scripts/grep-checks.mjs`) and the unit tests must pass before merging.
