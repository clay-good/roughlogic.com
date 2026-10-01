// collections.js -- spec-v1926: curated cross-group collections.
//
// A collection is a hand-ordered list of tiles from many trade groups under one
// URL, /collections/<slug>/. Each tile still belongs to the group that owns it;
// a collection only gathers them in the order the work happens. Plain data, no
// logic: read by scripts/build-shells.mjs and scripts/check-collections.mjs at
// build time, never loaded by the site at runtime (check-home-payload).
//
// An id may name a tile that has not landed yet, as long as a PROPOSED spec
// names it; the build omits it (and logs the omission) rather than linking a
// 404. check-collections rejects an unknown id, a duplicate, and an empty section.

export const COLLECTIONS = [
  {
    slug: "disaster-response",
    title: "Disaster Response and Recovery",
    lead: "The calculators a crew needs after a flood, a storm, or a collapse, gathered from every trade in the order the work happens. Each one is a check, not the stamp, and each names the authority that governs it.",
    sections: [
      {
        heading: "Emergency water and sanitation",
        ids: [
          "emergency-water-bleach-dose", "boil-water-altitude", "well-shock-chlorination",
          "main-disinfection-chlorine", "chlorine-demand", "contact-time-baffling",
          "disinfection-ct", "uv-dose", "chlorine-decay", "dechlorination-dose",
          "rtcr-coliform-samples", "well-casing-purge-volume", "main-flushing-volume",
          "cistern-storage-days", "rainwater-yield", "rainwater-catchment-area",
          "first-flush-diverter", "solar-water-pump-sizing", "pump-tdh", "friction-loss",
          "pressure-zone-hgl", "design-flow-peaking", "lift-station-outage-storage",
          "wet-well-cycle-time", "sump-basin-sizing", "osha-toilet-count",
          "responder-camp-sanitation",
        ],
      },
      {
        heading: "Emergency and temporary power",
        ids: [
          "generator-sizing", "generator-motor-starting", "generator-altitude-temp-derate",
          "generator-part-load-fuel", "generator-fuel-runtime", "generator-fleet-fuel-resupply",
          "generator-droop-load-share", "split-phase-leg-balance", "critical-load-shed-tiers",
          "generator-conductor-445", "power-distro", "voltage-drop", "existing-load-220-87",
          "battery-runtime", "off-grid-battery", "battery-series-parallel",
          "battery-inverter-dc-conductor", "battery-hydrogen-vent", "generator-battery-hybrid-fuel",
          "pv-array-sizing", "pv-string-sizing", "pv-circuit-ampacity",
          "mppt-controller-output-current", "radio-site-duty-cycle-battery",
          "propane-vaporization-rate", "propane-run-time",
        ],
      },
      {
        heading: "Collapse shoring and rescue support",
        ids: [
          "collapse-floor-load", "usr-vertical-shore-capacity", "usr-crib-capacity",
          "usr-raker-shore", "picket-anchor-soil", "column-buckling-wood",
          "wood-bearing-perpendicular", "shore-post-load", "excavation-protection-trigger",
          "trench-slope", "excavation-bench-plan", "osha-timber-trench-shoring", "spoil-setback",
          "lateral-earth-pressure", "soil-vertical-effective-stress", "confined-space-purge",
          "retrieval-winch-force", "rope-ma", "sling-angle", "fall-arrest-clearance",
          "fall-arrest-anchorage", "guy-anchor-holding-capacity", "crane-ground-bearing",
          "relief-storage-floor-load",
        ],
      },
      {
        heading: "Flood fight and storm damage",
        ids: [
          "sandbag-levee-quantity", "emergency-earth-levee-section", "flood-lateral-load",
          "flood-debris-impact", "flood-uplift-cover-slab", "pipe-flotation", "dewatering-rate",
          "pit-dewatering-staging", "basement-flood-pumpdown", "standing-water",
          "water-extraction-rate", "flood-cut-takeoff", "flood-cut-quantity",
          "substantial-improvement-check", "flood-opening-area", "roof-snow-ice-weight",
          "snow-load", "snow-drift-load", "rain-load-ponding", "ceiling-water-load",
          "wind-pressure", "storm-panel-plywood", "manufactured-home-anchor-count",
        ],
      },
      {
        heading: "Debris management",
        ids: [
          "hurricane-debris-estimate", "structure-debris-estimate", "demo-debris",
          "debris-management-site-sizing", "chipper-debris", "debris-load-ticket",
          "dump-truck-loads", "haul-cycle-production", "loader-production", "dumpster-count",
          "hazard-tree-stump-screen", "stump-grinding-volume", "timber-cruise",
        ],
      },
      {
        heading: "Relief logistics, shelter, and temporary housing",
        ids: [
          "relief-commodity-truckloads", "pod-site-configuration", "pallet-loadout",
          "dock-door-count-throughput", "warehouse-cube-utilization", "shelter-capacity-sanitation",
          "occupant-load", "plumbing-fixture-count", "heat-stress", "safe-room-capacity",
          "temp-housing-park-feeder-demand",
        ],
      },
      {
        heading: "Buildings in an outage and restoration",
        ids: [
          "building-outage-cooldown", "building-ua", "pipe-freeze-time", "heat-trace-sizing",
          "refrigeration-outage-holdover", "walk-in-cooler-load", "co-alarm-placement",
          "class-of-loss-screen", "dehumidifier", "drying-balance", "antimicrobial-dilution",
          "sewage-loss-disposal", "mold-remediation-level",
        ],
      },
    ],
  },
];
