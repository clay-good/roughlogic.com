# roughlogic.com Specification v1859 -- Farm-Production Module Split

> **Status: LANDED — 2026-09-28.** Move the existing agricultural-production,
> irrigation, farm-input, grain, manure, and livestock bench from
> `calc-agriculture.js` to a dedicated lazy-loaded `calc-farmproduction.js`
> module. This is structural hardening: calculator IDs, formulas, fields,
> outputs, citations, examples, and Group L assignments remain unchanged.

## Scope

Move these 17 calculators as one contiguous production workflow:

- `mulch-topsoil-volume`
- `grain-drying-energy`
- `manure-nutrient-application`
- `center-pivot-runtime`
- `pivot-application-rate`
- `pivot-timer-depth`
- `grain-aeration-airflow`
- `manure-storage-volume`
- `manure-cover-savings`
- `tractor-ballast`
- `anhydrous-ammonia-rate`
- `mad-irrigation-trigger`
- `fertigation-injection-rate`
- `cattle-heart-girth-weight`
- `corn-yield-estimate`
- `dressing-percentage`
- `reference-et0`

Update the website and MCP registries, build and service-worker inventories,
direct test imports, generated indexes, and documented module counts. Do not
raise the existing `calc-agriculture.js` cap.

## Acceptance

1. The moved calculator source is unchanged apart from its module-local renderer
   registry name.
2. Every moved calculator resolves through both the website and MCP paths.
3. `calc-agriculture.js` is below a reduced gzip cap, and the new module has a
   measured cap with normal headroom.
4. `npm run lint`, `npm test`, and `npm run build` pass.
