# roughlogic.com Specification v193 -- Disinfectant / Antimicrobial Contact (Dwell) Time Reference (calc-restoration.js, Group D, 1 New Tile)

> **Status: LANDED 2026-06-26 (package 0.83.0; part of catalog 656 -> 664). Batch spec-v188..v196 (water-damage restoration).** In-scope catalog
> expansion under the spec-v106 trades-only charter: one reference tile returning the label contact
> (dwell) time required for common EPA-registered antimicrobial classes and the keep-wet rule that
> governs whether a disinfection claim is actually achieved. Adds one tile to **`calc-restoration.js`**
> (Group D); no new module, group, or dependency. Inherits spec.md through spec-v187.md.
>
> **The gap, and the evidence for it.** The catalog mixes antimicrobials to a ratio and a coverage
> rate (`antimicrobial-dilution`, `dilution`) but never states the contact time the label requires --
> the part techs most often shortcut. A quaternary that needs ten wet minutes but is wiped dry in two
> has disinfected nothing. The dwell time and the keep-wet rule are a label-and-standard reference, and
> no tile carries them.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. This is
a reference-lookup tile (the `mold-conditions` / `water-classes` pattern): a product-class selection
returns a typical label contact-time range (`time`, minutes) and the keep-wet / pre-clean rules. There
is no numeric computation beyond the lookup. The v18/v21 contract: an unrecognized product class
returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the contact-time
principle, by name; `editionNote` names ANSI/IICRC S500 and S520 and states that antimicrobials are
**EPA-registered pesticides whose label is the legal authority** (FIFRA), that the typical ranges shown
are guidance and the specific product label governs the exact dwell, that the surface must remain
**visibly wet** for the full contact time (re-apply if it dries), and that disinfection requires
**pre-cleaning** because product cannot penetrate soil.

## 2. The tile

### 2.1 `disinfectant-dwell` -- Antimicrobial Contact-Time and Keep-Wet Reference

```
inputs:
  product_class   select   "quaternary ammonium (quat)" | "hydrogen peroxide (AHP)" |
                           "sodium hypochlorite (bleach solution)" | "phenolic" | "botanical/thymol"

returns:
  typical_contact_min   time   label-typical wet contact time range for the class
  keep_wet_rule         text   surface must stay visibly wet for the full contact time
  pre_clean_rule        text   pre-clean to remove soil; disinfect cannot penetrate organic load
  authority             text   the EPA-registered product label governs the exact dwell (FIFRA)
```

**Pinned worked example.** A **quaternary ammonium** disinfectant: typical label contact time is about
**10 minutes** of *wet* contact -- the surface must be kept visibly wet for the full ten minutes
(re-wet if it flashes off), applied only **after pre-cleaning** the soil. **Cross-check (faster
chemistry).** An **accelerated hydrogen peroxide** product often claims disinfection in **about 1 to 5
minutes** per its label, while a **bleach solution** typically needs **~10 minutes**. The ranges are
guidance only; the specific EPA-registered label is the legal authority and S500/S520 govern the
remediation context.

## 3. Wiring

A `tools-data.js` row (group `D`, trade `["restoration"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the contact-time/keep-wet/pre-clean principles,
`editionNote` naming ANSI/IICRC S500 and S520 and the EPA-label-governs (FIFRA) authority);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`disinfectant-dwell` -> `computeDisinfectantDwell` in `../../calc-restoration.js`);
`scripts/related-tiles.mjs` (-> `antimicrobial-dilution` / `dilution` / `mold-conditions`);
`data/search/aliases.json` ("contact time", "dwell time", "disinfectant", "antimicrobial dwell",
"keep wet", "quat contact time"); the id appended to the existing `RESTORATION_RENDERERS` declare in
`app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning the quat lookup, the AHP/bleach cross-check, and the unrecognized-class error seam.
Raise the `calc-restoration.js` size cap by ~20 percent if needed (dated comment); bump the
`citations.js` cap if needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block, the unrecognized-class seam); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the
contact-time and rule lines wrap on a phone); render-no-nan + a11y sweep, output read to the value
(quat -> ~10 min wet, pre-clean first; AHP -> ~1-5 min).

## 5. Roadmap position

Completes the antimicrobial family (`antimicrobial-dilution`, `dilution`) with the contact-time
discipline that makes the application count. Further Group D growth stays evidence-driven.
