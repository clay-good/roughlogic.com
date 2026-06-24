# roughlogic.com Specification v165 -- Buck-Boost Transformer Sizing (Single-Phase) (calc-electrical.js, Group A, 1 New Tile)

> **Status: LANDED 2026-06-24 (package 0.79.0; part of catalog 628 -> 639). Batch spec-v164..v178 (electrician trade).** In-scope catalog
> expansion under the spec-v106 trades-only charter: one tile sizing a single-phase buck-boost
> transformer (autotransformer connection) to correct a line voltage up or down for a load, AHJ and
> manufacturer governed. Adds one tile to **`calc-electrical.js`** (Group A); no new module, group, or
> dependency. Inherits spec.md through spec-v163.md.
>
> **The gap, and the evidence for it.** The catalog sizes full isolation transformers
> (`transformer-kva-sizing`, `transformer-sizing`) by full load kVA, but a buck-boost is the everyday
> field fix for a 208 V supply feeding 230 V equipment, or a 240 V supply that needs trimming to 208 V.
> Its defining trick is that the transformer is rated only for the *boost/buck* voltage times the load
> current -- a fraction of the load kVA -- so sizing it by the full load kVA grossly oversizes (and
> overspends). No tile computes the boost amount or the small autotransformer kVA.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The
supply and desired load voltages are `voltage`; the boost/buck amount is `voltage`; the load current
is `I`; the autotransformer rating and the full load kVA are power, computed as `voltage x I / 1000`.
The v18/v21 contract: any non-finite input, a non-positive supply voltage, or a non-positive load
current returns `{ error }`; a zero boost (supply already equals desired) yields a zero
autotransformer rating with a note that no transformer is needed. Citation discipline (v19/v22):
`GOVERNANCE.electrical`, edition `NEC 2023 Article 450 (transformers); autotransformer connection per
the manufacturer`, `editionNote` `NEC_DISCLOSURE`, with the note that **buck-boost selection,
connection, and overcurrent protection are the manufacturer's and the AHJ's** -- this sizes the
required kVA, it does not select a catalog unit or its protection.

## 2. The tile

### 2.1 `buck-boost-sizing` -- Buck-Boost Transformer kVA From Voltage Correction and Load

```
inputs:
  supply_v          voltage   available line voltage
  desired_v         voltage   voltage the load needs
  load_a            I         load current at the desired voltage

boost_v       = desired_v - supply_v               # positive = boost, negative = buck
load_kva      = desired_v x load_a / 1000          # the full load (for reference)
xfmr_kva      = abs(boost_v) x load_a / 1000        # the buck-boost autotransformer rating
ratio_pct     = xfmr_kva / load_kva x 100          # fraction of full load the unit must carry
```

**Pinned worked example.** A 208 V supply must feed a 230 V, 50 A single-phase load:
`boost_v = 230 - 208 = +22 V` (a boost); `load_kva = 230 x 50 / 1000 = 11.5 kVA`;
`xfmr_kva = 22 x 50 / 1000 = 1.10 kVA`. The buck-boost need only be rated ~1.1 kVA (select the next
standard size, e.g. 1.5 kVA) to support an 11.5 kVA load -- that is the point of the connection.
**Cross-check (buck path).** A 240 V supply trimmed to 208 V at 20 A: `boost_v = 208 - 240 = -32 V`
(a buck); `xfmr_kva = 32 x 20 / 1000 = 0.64 kVA`. The manufacturer's wiring table and the AHJ govern
the actual unit, taps, and overcurrent protection.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["electrical"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.electrical`, NEC 2023 Article 450 with the manufacturer-governs and
autotransformer-connection notes, `editionNote` `NEC_DISCLOSURE`);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`buck-boost-sizing` -> `computeBuckBoostSizing` in `../../calc-electrical.js`);
`scripts/related-tiles.mjs` (-> `transformer-kva-sizing` / `transformer-conductor-protection` /
`three-phase`); `data/search/aliases.json` ("buck boost", "buck-boost transformer", "voltage
correction", "208 to 230", "240 to 208", "boost transformer"); the id appended to the existing
`ELECTRICAL_RENDERERS` declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning the boost and buck examples, the zero-boost note,
and error seams (non-finite, supply_v <= 0, load_a <= 0). Raise the `calc-electrical.js` size cap by
~20 percent if needed (dated comment); bump the `citations.js` cap if needed. Lazy-loaded, absent
from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block, the buck path and zero-boost note); `npm run
build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px
audit (the boost amount, the autotransformer kVA, and the load kVA wrap on a phone); render-no-nan +
a11y sweep, output read to the value (208->230 at 50 A -> 1.10 kVA unit, 11.5 kVA load).

## 5. Roadmap position

Adds the autotransformer (buck-boost) sizing to the transformer family
(`transformer-kva-sizing`, `transformer-conductor-protection`). Further Group A growth stays
evidence-driven.
