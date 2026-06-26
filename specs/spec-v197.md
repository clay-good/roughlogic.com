# roughlogic.com Specification v197 -- Injection / Wall-Cavity Drying System Sizing (calc-restoration.js, Group D, 1 New Tile)

> **Status: LANDED 2026-06-26 (package 0.83.0; part of catalog 656 -> 664). Batch spec-v197..v198 (water-damage restoration, second pass).**
> In-scope catalog expansion under the spec-v106 trades-only charter: one specialty-drying tile sizing
> an injection / wall-cavity drying system -- the port count across affected stud bays and the number
> of air-delivery systems needed to dry enclosed cavities without removing the wall. Adds one tile to
> **`calc-restoration.js`** (Group D); no new module, group, or dependency. Inherits spec.md through
> spec-v196.md.
>
> **The gap, and the evidence for it.** The restoration buildout sizes whole-room desiccant airflow
> (`desiccant-airflow-sizing`, v140), hardwood mat systems (`hardwood-floor-drying-mat`, v155), and air
> movers, but nothing sizes the *injection* method: forcing air through drilled ports into wall
> cavities, behind cabinets, or under built-ins to dry an enclosed assembly in place. It is the
> minimally invasive alternative to a flood cut, scoped by the number of stud bays and the system port
> capacity, and a grep across the registry and every spec confirms there is no tile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The
affected wall length is `L` (ft), the stud spacing is `L` (in), bays and ports are counts, and the
system count is a count. The v18/v21 contract: any non-finite input, a non-positive wall length, a
non-positive stud spacing, or a non-positive ports-per-system returns `{ error }`; the only divisions
are by the guarded-positive stud spacing and ports-per-system, and the bay and system counts round
**up**. Citation discipline (v19/v22): `GOVERNANCE.general` over the bays-from-length geometry, by
name; `editionNote` names ANSI/IICRC S500 and states that the port count, airflow per port, and
ports per system are **equipment-manufacturer specific** (the bundled defaults are typical, not
prescriptive), that the cavity-drying decision (versus a flood cut) and access drilling follow S500,
and that **cavity air pressure direction must respect contamination** -- do not push Category 2/3
cavity air into clean spaces -- with the restorer and S500 governing.

## 2. The tile

### 2.1 `cavity-drying-system` -- Injection Port Count and Air-System Sizing

```
inputs:
  affected_wall_ft       L       linear feet of wall with a wet cavity to dry
  stud_spacing_in        L       on-center stud spacing (default 16)
  ports_per_bay          count   injection ports per stud bay (default 1)
  ports_per_system       count   ports a single air system / manifold serves (default 12)

bays         = ceil(affected_wall_ft x 12 / stud_spacing_in)
ports        = bays x ports_per_bay
systems      = ceil(ports / ports_per_system)
```

**Pinned worked example.** A **32 ft** wet wall on **16 in** centers, one port per bay, a manifold
serving **12** ports: `bays = ceil(32 x 12 / 16) = ceil(24) = 24 bays`; `ports = 24 x 1 = 24`;
`systems = ceil(24 / 12) = 2` injection air systems. **Cross-check (smaller run).** A **16 ft** wall
on the same basis: `bays = ceil(16 x 12 / 16) = 12`; `ports = 12`; `systems = ceil(12 / 12) = 1`
system. Port count, per-port airflow, and ports per system are manufacturer-specific; respect cavity
contamination and pressure direction; the restorer and S500 govern.

## 3. Wiring

A `tools-data.js` row (group `D`, trade `["restoration"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the bays-from-length geometry, `editionNote` naming
ANSI/IICRC S500 and the manufacturer-specific and contamination-direction caveats);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`cavity-drying-system` -> `computeCavityDryingSystem` in `../../calc-restoration.js`);
`scripts/related-tiles.mjs` (-> `flood-cut-takeoff` / `hardwood-floor-drying-mat` /
`desiccant-airflow-sizing`); `data/search/aliases.json` ("injection drying", "wall cavity drying",
"cavity dry", "injection ports", "interair", "dry in place"); the id appended to the existing
`RESTORATION_RENDERERS` declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning the 32 ft example, the 16 ft cross-check, and
error seams (non-finite, wall <= 0, spacing <= 0, ports_per_system <= 0). Raise the
`calc-restoration.js` size cap by ~20 percent if needed (dated comment); bump the `citations.js` cap if
needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block, the round-up paths); `npm run build` (one new
shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the bays,
ports, and systems wrap on a phone); render-no-nan + a11y sweep, output read to the value (32 ft / 16
in -> 24 bays / 24 ports / 2 systems; 16 ft -> 12 / 12 / 1).

## 5. Roadmap position

Adds the injection cavity-drying method to the specialty-drying family (`hardwood-floor-drying-mat`,
`desiccant-airflow-sizing`) as the in-place alternative to `flood-cut-takeoff`. Further Group D growth
stays evidence-driven.
