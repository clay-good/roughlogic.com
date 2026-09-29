# spec-v1926.md -- A Disaster Response and Recovery collection page

> **Status: PROPOSED 2026-09-25.** Part of [scope-disaster-response](scope-disaster-response.md). Depends on the
> 47 tile specs v1879-v1925 for its new entries; can ship first with the existing entries alone.
> One new page type (a curated cross-group collection), one data module, one gate. **Pure addition: no group letter,
> no URL change, no tile moves group.** Catalog count is unchanged by this spec.

## Why

The disaster-response tiles are real trade work -- a water operator's disinfection, an electrician's temporary power,
a carpenter's shoring, a restoration tech's pump-down, a logistics coordinator's truckloads -- so each one belongs in
the trade group that owns it, and the charter (spec-v106) forbids a new group letter for them. But a person
standing in a flooded town does not browse by trade. They need the water tiles, the generator tiles, and the shoring
tiles on one page, in the order the work happens.

Today that page cannot exist: the site has group hubs (`/groups/<slug>/`) and the catalog (`/tools/`), and both are
organised by group. This spec adds the one thing missing, a **curated collection** -- a hand-ordered list of tiles
from many groups, with its own URL -- and uses it once.

## What it does

| | |
|---|---|
| **The page** | `/collections/disaster-response/` -- "Disaster Response and Recovery", 137 tiles in seven sections. |
| **Sections, in the order the work happens** | 1 Emergency water and sanitation · 2 Emergency and temporary power · 3 Collapse shoring and rescue support · 4 Flood fight and storm damage · 5 Debris management · 6 Relief logistics, shelter, and temporary housing · 7 Buildings in an outage and restoration |
| **What each row shows** | The tile name linking `/tools/<id>/`, its one-line summary (the same `rowSummary` the hubs use), and its group as a small label -- so a reader sees that the shoring tile is a Construction tile. |
| **New and existing together** | 47 new tiles (v1879-v1925) and 90 existing ones, interleaved by task. A tile that has not landed yet is **omitted, and the omission is logged** -- never linked to a 404. |
| **Lead** | One sentence under the h1: what the page is, that every tile is a check and not the stamp, and that the governing authority is named on each tile. No safety claims beyond the tiles' own. |
| **Entry points** | A line on `/tools/` above the group list ("Collections: Disaster Response and Recovery"); a line on each member tile's shell, beside its hub link ("Also in: Disaster Response and Recovery"); the sitemap. |
| **Not on the home page** | The home page is search-first by design (scope-one-box); this spec adds no home link. Search reaches the tiles directly. |

## The seven sections

Each list is the collection's data, not a query. New tiles are marked (new).

1. **Emergency water and sanitation** -- emergency-water-bleach-dose (new), boil-water-altitude (new), well-shock-chlorination, main-disinfection-chlorine, chlorine-demand, contact-time-baffling (new), disinfection-ct, uv-dose, chlorine-decay, dechlorination-dose, rtcr-coliform-samples (new), well-casing-purge-volume, main-flushing-volume, cistern-storage-days, rainwater-yield, rainwater-catchment-area, first-flush-diverter (new), solar-water-pump-sizing (new), pump-tdh, friction-loss, pressure-zone-hgl, design-flow-peaking, lift-station-outage-storage (new), wet-well-cycle-time, sump-basin-sizing, osha-toilet-count (new), responder-camp-sanitation (new)
2. **Emergency and temporary power** -- generator-sizing, generator-motor-starting, generator-altitude-temp-derate (new), generator-part-load-fuel (new), generator-fuel-runtime, generator-fleet-fuel-resupply (new), generator-droop-load-share (new), split-phase-leg-balance (new), critical-load-shed-tiers (new), generator-conductor-445, power-distro, voltage-drop, existing-load-220-87, battery-runtime, off-grid-battery, battery-series-parallel, battery-inverter-dc-conductor, battery-hydrogen-vent, generator-battery-hybrid-fuel (new), pv-array-sizing, pv-string-sizing, pv-circuit-ampacity, mppt-controller-output-current (new), radio-site-duty-cycle-battery (new), propane-vaporization-rate, propane-run-time
3. **Collapse shoring and rescue support** -- collapse-floor-load (new), usr-vertical-shore-capacity (new), usr-crib-capacity (new), usr-raker-shore (new), picket-anchor-soil (new), column-buckling-wood, wood-bearing-perpendicular, shore-post-load, excavation-protection-trigger, trench-slope, excavation-bench-plan, osha-timber-trench-shoring (new), spoil-setback, lateral-earth-pressure, soil-vertical-effective-stress, confined-space-purge, retrieval-winch-force, rope-ma, sling-angle, fall-arrest-clearance, fall-arrest-anchorage, guy-anchor-holding-capacity, crane-ground-bearing, relief-storage-floor-load (new)
4. **Flood fight and storm damage** -- sandbag-levee-quantity (new), emergency-earth-levee-section (new), flood-lateral-load (new), flood-debris-impact (new), flood-uplift-cover-slab (new), pipe-flotation, dewatering-rate, pit-dewatering-staging, basement-flood-pumpdown (new), standing-water, water-extraction-rate, flood-cut-takeoff, flood-cut-quantity, substantial-improvement-check, flood-opening-area, roof-snow-ice-weight (new), snow-load, snow-drift-load, rain-load-ponding, ceiling-water-load, wind-pressure, storm-panel-plywood (new), manufactured-home-anchor-count (new)
5. **Debris management** -- hurricane-debris-estimate (new), structure-debris-estimate (new), demo-debris, debris-management-site-sizing (new), chipper-debris, debris-load-ticket (new), dump-truck-loads, haul-cycle-production, loader-production, dumpster-count, hazard-tree-stump-screen (new), stump-grinding-volume, timber-cruise
6. **Relief logistics, shelter, and temporary housing** -- relief-commodity-truckloads (new), pod-site-configuration (new), pallet-loadout, dock-door-count-throughput, warehouse-cube-utilization, shelter-capacity-sanitation (new), occupant-load, plumbing-fixture-count, heat-stress, safe-room-capacity (new), temp-housing-park-feeder-demand (new)
7. **Buildings in an outage and restoration** -- building-outage-cooldown (new), building-ua, pipe-freeze-time (new), heat-trace-sizing, refrigeration-outage-holdover (new), walk-in-cooler-load, co-alarm-placement, class-of-loss-screen, dehumidifier, drying-balance, antimicrobial-dilution, sewage-loss-disposal, mold-remediation-level

Counts: sections 1-7 hold 27, 26, 24, 23, 13, 11, and 13 tiles -- 137 in all, 47 new and 90 existing. Every existing id
above was checked against `tools-data.js` on 2026-09-25.

## Where it lives

- `collections.js` -- **new.** `export const COLLECTIONS = [{ slug, title, lead, sections: [{ heading, ids }] }]`.
  One entry. Plain data, no logic, loaded only by the build (never by the home page -- `check-home-payload` must not
  move).
- `scripts/build-shells.mjs` -- a `collectionShell(collection, tools, groupNames)` beside `groupShell` and
  `toolsIndexShell`, reusing `shellHead`, `shellHeader`, `shellFooter`, `jsonLdBlock` (an `ItemList` per section),
  `rowSummary`, `GROUP_SLUG`, and `escapeHtml`. Writes `dist/collections/<slug>/index.html`. Adds the URL to the
  sitemap. Adds the "Also in" line to member tile shells and the "Collections" line to `/tools/`.
- `scripts/check-collections.mjs` -- **new gate.** Every collection id must be a live tile or a tile named in a
  PROPOSED spec (so an unlanded tile is allowed, and an unknown id or typo is not); no id may appear twice; every
  section must be non-empty. Pure read-and-report.
- `styles.css` -- the group label on a row, using existing tokens only.

## Gotchas carried from spec-v1345

- **`<body class="shell-page">`** or 40 scoped rules silently do not apply.
- **`check-shells` globs `dist/tools/<id>/`** and will not see `dist/collections/`. Add the new path explicitly under
  the group-page gzip cap, or the page ships with no gate watching it.
- **`check-readme-counts` computes the sitemap total from a formula** (`tiles + groups + 2` today). One collection
  URL makes it `+ 3`, and the README, `docs/launch-checklist.md` sitemap figure, and the static-shell counts in
  `docs/architecture.md` and `docs/deployment.md` move by one. Edit the formula and the prose in the same commit.
- **A new lint gate bumps the documented gate count** (README, CONTRIBUTING, launch checklist), which
  `check-readme-counts` spells out in words.
- **Omit, do not link, an unlanded tile** -- and `log()` each omission, so a partly landed collection reads as partly
  landed.
- The "Also in" line goes through the single tile-shell builder, not pasted per tile.

## Proof

- `check-collections` passes, and fails when an id is misspelled or duplicated (seed both).
- `check-dist` -- the page is present and every link on it resolves; no orphan is created.
- A test asserting the rendered page lists exactly the landed subset of the collection, in order, with each tile's
  group label matching `TOOLS`.
- `check:shell-mobile` and the 320px sweep on `/collections/disaster-response/` -- no horizontal scroll.
- `check-readme-counts` -- the sitemap count rises by exactly 1.
- No diff to any group hub shell. Member tile shells differ only by the "Also in" line; non-member shells not at all.

## Not in this spec

A second collection (wildfire, winter storm), a collection link on the home page, collection-aware search ranking, a
collection listing in `llms.txt` or the MCP server's tool list, and printable field packets. Each is a reasonable
follow-up and none is needed for the page to be useful.
