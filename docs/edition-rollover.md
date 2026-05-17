# Triennial code-edition rollover runbook

> Implementation status: introduced by spec-v10 §F.1.

This runbook documents the exact steps for rolling a code edition
(e.g., NEC 2023 → NEC 2026, IPC 2024 → IPC 2027, ASHRAE 62.1-2022 →
62.1-2025). The point is that a triennial rollover should be a
predictable Tuesday-afternoon job, not a panic.

## Pre-flight

Before touching any file, confirm the new edition has actually
published and is the AHJ-relevant edition for at least one US state:

- Confirm the publisher has posted the new edition (NFPA, ICC,
  ASHRAE, FDA, NOAA, AASHTO, etc.).
- Confirm the free-access portal is live for the new edition (where
  applicable: nfpa.org/freeaccess, codes.iccsafe.org,
  ashrae.org/technical-resources, ecfr.gov, fda.gov/food-code).
- Spot-check at least three states' adoption status. If no US state
  has adopted, prefer the spec-v10 §F.3 dual-edition window over a
  hard cutover.

## Steps

1. **Update [scripts/sources-cycle.json](../scripts/sources-cycle.json).**
   Bump the standard's `current_edition`, `current_release`, and
   `next_expected` fields. For date-bounded models (WMM, etc.) also
   bump `expires_on`. Run `node scripts/check-citation-freshness.mjs`
   and confirm the lint goes from "0 warnings" to "warnings about
   manifests that still name the prior edition" (this is the work
   list).

2. **Read the new edition's TOC.** Open the free-access URL. Compare
   section numbers against the prior edition. Capture any moved or
   renumbered sections in a per-rollover scratch file. The most
   common gotchas:
   - NEC: chapter / article / section renumbering on grounding,
     bonding, GFCI / AFCI scope.
   - IPC / IRC: re-arrangement of fixture-unit and pipe-sizing
     tables.
   - ASHRAE 62.1: Rp / Ra value changes per occupancy class.

3. **Update [docs/citation-discipline.md](citation-discipline.md).**
   For every tile that cites the rolling standard, edit the source-
   stamp string. Where a section number changed, add a parenthetical
   "(formerly §X in YYYY edition)" so users on older AHJ-adopted
   editions can still find the reference. Keep the prior-edition row
   in the per-tile history table per spec-v10 §F.3 (dual-edition
   window).

4. **Run `npm run lint`.** The v10 citation-freshness lint
   (added in Phase A.1) flags every manifest that names the old
   edition. Use that list as the work queue.

5. **Update each affected `data/<folder>/manifest.json` `edition`
   field.** Bump `asOf` to today. Keep the original verifiedOn dates
   on per-state shards; bump only the manifest-level asOf unless the
   per-state values themselves moved.

6. **Regenerate `docs/citation-strings.generated.json`** via
   `npm run docs:citation-strings` (the spec-v10 Phase A.3
   build-citation-strings.mjs generator landed in v0.10; the
   `--check` mode is wired into `npm run lint` and fails the build
   on out-of-sync edits). Run the citation-strings unit test
   (`node --test test/unit/citations.test.js`) and confirm it
   passes.

7. **Update [../CHANGELOG.md](../CHANGELOG.md).** One stanza per
   standard rolled, naming every tile whose source-stamp changed
   and any data shard whose values moved.

8. **Cut a release.** A rollover is non-breaking unless a section
   renumbering changes a tile's input-id or output shape (in which
   case the change is gated by a 90-day deprecation per spec.md).
   For a simple edition-string roll: minor version bump.

## Standard-specific notes

### NEC (NFPA 70)

- Cycle: 3 years. Editions: 2017 / 2020 / 2023 / 2026 / 2029.
- Free-access portal: nfpa.org/freeaccess.
- State adoption is the slowest part of the rollover. Some
  jurisdictions still enforce NEC 2017 in 2026. Use the spec-v10
  §F.3 dual-edition window until 50% population-weighted adoption.
- Tiles affected: every Group A tile plus generator-sizing,
  pv-string-sizing, ev-charging, service-load-standard, panel-
  rebalance.

### IPC / IRC / IBC / IMC / IFC / IFGC

- Cycle: 3 years per the ICC family. Editions: 2018 / 2021 / 2024 /
  2027.
- Free-access portal: codes.iccsafe.org (read-only).
- Often roll together; budget time to read each TOC.
- Tiles affected: Group B (plumbing / gas), Group E (carpentry),
  Group F (fire-ground occupancy classifications).

### ASHRAE 62.1 / 62.2 / 90.1

- Cycle: 3 years (continuous-maintenance addenda between cycles).
- Free-access portal: ashrae.org/technical-resources/standards.
- Watch for Rp / Ra changes per occupancy. Manual J cooling /
  heating tiles do not depend on ASHRAE values directly but the
  outdoor-air-ventilation tile does.

### FDA Food Code

- Cycle: 4 years. Current 2022; next due 2026.
- Free-access portal: fda.gov/food/retail-food-protection/fda-food-code.
- Tiles affected: kitchen / food-service group (Group O).

### NOAA World Magnetic Model

- Cycle: 5 years. Current WMM2025 valid 2025–2030.
- Free-access portal: ncei.noaa.gov/products/world-magnetic-model.
- Bundled coefficients live in `data/physical-constants/` (or its
  successor). The check-citation-freshness lint hard-fails when the
  bundle is past `expires_on`; a soft-warn fires when within 6
  months. Plan the bundle refresh accordingly.

### AASHTO Green Book

- Cycle: ~7 years. Current 2018 (7th ed.); next due ~2025.
- Not free-access; cite by edition only. Tiles affected:
  stopping-sight-distance, road-grade-stopping.

## Anti-patterns

- **Rolling without reading the TOC.** Section numbers move; copying
  the prior citation string with the new year stamped on it produces
  a wrong reference.
- **Skipping the per-state history row.** Until 50% adoption,
  jurisdictions on the prior edition need the prior section number
  visible.
- **Bumping `asOf` without bumping `edition`.** The lint catches
  this (asOf without an edition string update) but it is a real
  rollover smell.
- **Skipping the CHANGELOG stanza.** Public-utility expectations
  require every edition roll be visible to users on the changelog
  page.

## See also

- [../scripts/check-citation-freshness.mjs](../scripts/check-citation-freshness.mjs)
  — the lint that drives the work list.
- [../scripts/sources-cycle.json](../scripts/sources-cycle.json)
  — the per-standard cycle table.
- [edition-amendment.md](edition-amendment.md) — the runbook for
  mid-cycle amendments (OSHA, USEPA, ASHRAE addenda).
- [citation-discipline.md](citation-discipline.md) — the per-tile
  source-stamp registry.
- [../specs/spec-v10.md](../specs/spec-v10.md) §F — the spec.
