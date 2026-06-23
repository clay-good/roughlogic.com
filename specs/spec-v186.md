# roughlogic.com Specification v186 -- Shock Approach Boundaries Reference (NFPA 70E Table 130.4) (calc-electrical.js, Group A, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v179..v187 (electrician trade, second pass).** In-scope
> catalog expansion under the spec-v106 trades-only charter: one reference tile returning the
> limited-approach and restricted-approach *shock* boundaries by nominal AC voltage from NFPA 70E
> Table 130.4. Adds one tile to **`calc-electrical.js`** (Group A); no new module, group, or
> dependency. Inherits spec.md through spec-v178.md.
>
> **The gap, and the evidence for it.** The catalog computes the *arc-flash* incident energy and the
> arc-flash boundary plus a PPE band (`arc-flash-screen`), but the *shock* approach boundaries -- the
> limited-approach distance that an unqualified person may not cross and the restricted-approach
> distance that requires an energized-work permit and PPE -- are a separate Table 130.4 lookup keyed to
> voltage, not incident energy. They govern who may stand where around live parts, and no tile returns
> them.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. This is
a reference-lookup tile (the `gfci-afci-reference` pattern): the nominal voltage selects a row, the
outputs are approach distances in `L` (ft-in). The bundled Table 130.4 boundaries (limited approach for
exposed movable and exposed fixed conductors, and restricted approach) by AC voltage band are annotated
as the public NFPA 70E values. The v18/v21 contract: a voltage outside the table's bands returns
`{ error }`; there are no computations or divisions, only the table read. Citation discipline
(v19/v22): `GOVERNANCE.electrical`, edition `NFPA 70E-2024 Table 130.4(E)(a) (AC shock approach
boundaries)`, `editionNote` `NEC_DISCLOSURE`, with the note that these are **shock** boundaries
distinct from the **arc-flash** boundary of `arc-flash-screen`, that an energized-work permit and
qualified-person requirements attach inside the restricted approach, and that 70E and the employer's
electrical safety program govern.

## 2. The tile

### 2.1 `shock-approach-boundary` -- NFPA 70E Limited / Restricted Approach Lookup

```
inputs:
  nominal_v_ac   select   voltage band, e.g. "<50 V" | "50-150 V" | "151-750 V" |
                          "751-15,000 V" (phase-to-phase, AC)

limited_approach_movable_ft_in   = Table 130.4 (exposed movable conductor)
limited_approach_fixed_ft_in     = Table 130.4 (exposed fixed circuit part)
restricted_approach_ft_in        = Table 130.4 (restricted approach; requires permit + PPE)
note: below 50 V no shock approach boundary is specified (risk assessment still applies)
```

**Pinned worked example.** A 480 V panel (the "151-750 V" band): limited approach **3 ft 6 in** to an
exposed fixed circuit part (10 ft 0 in to an exposed *movable* conductor) and restricted approach
**1 ft 0 in**. An unqualified person must stay outside 3 ft 6 in; crossing 1 ft 0 in requires a
qualified person, an energized-work permit, and shock PPE. **Cross-check (low voltage).** A 24 V
control circuit ("<50 V"): **no shock approach boundary** is specified by Table 130.4, though a risk
assessment still applies. Voltage sets the row; the employer's safety program and 70E govern.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["electrical"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.electrical`, NFPA 70E-2024 Table 130.4, the limited/restricted
boundaries and the shock-vs-arc-flash distinction listed, `editionNote` `NEC_DISCLOSURE`);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`shock-approach-boundary` -> `computeShockApproachBoundary` in `../../calc-electrical.js`);
`scripts/related-tiles.mjs` (-> `arc-flash-screen` / `loto-steps` / `gfci-afci-reference`);
`data/search/aliases.json` ("approach boundary", "70E", "limited approach", "restricted approach",
"shock boundary", "130.4"); the id appended to the existing `ELECTRICAL_RENDERERS` declare in
`app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning the 480 V lookup, the <50 V no-boundary case, and the out-of-band error seam. Raise the
`calc-electrical.js` size cap by ~20 percent if needed (dated comment); bump the `citations.js` cap if
needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block, the <50 V path); `npm run build` (one new
shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the limited
and restricted lines wrap on a phone); render-no-nan + a11y sweep, output read to the value (480 V ->
3 ft 6 in limited fixed / 1 ft 0 in restricted; <50 V -> none).

## 5. Roadmap position

Pairs the shock boundaries with the existing arc-flash screen (`arc-flash-screen`) and LOTO
(`loto-steps`) to complete the energized-work safety set. Further Group A growth stays
evidence-driven.
