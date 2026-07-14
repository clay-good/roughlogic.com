# roughlogic.com Specification v693 -- Fiber Max Length for a Loss Budget (calc-lowvoltage.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lowvoltage.js`** (Group A,
> low-voltage / electrical), no new module, group, or dependency. Inherits spec.md through spec-v692.md.
>
> **The gap, and the evidence for it.** Spec-v Z.1 (`fiber-loss-budget`) runs the optical link budget forward: given a
> run length, it returns the total loss and the margin against the channel maximum. The install question a cabling tech
> asks is the inverse -- **how far can I run this fiber and still pass the loss budget**. The forward tile makes you
> guess lengths and re-read the margin; the inverse solves it directly. From `total_loss = (len/1000) x attenuation +
> connectors + splices`, setting the total to the budget, `len_max = 1000 x (max_channel_loss - connector_loss -
> splice_loss) / attenuation`. The number this settles: a 2.6 dB budget on OM4 (3.0 dB/km) with two connectors reaches
> about **367 m**; single-mode (0.4 dB/km) reaches **2,750 m** for the same budget.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`fiber-loss-budget` sibling: it reuses the sibling's `_FIBER_DEFAULT_ATT` attenuation table and fiber/wavelength select,
the losses and counts are `dimensionless` (dB, count), and the returned length is `L` (m, also shown in ft). The v18/v21
contract: any non-finite input, a non-positive max channel loss or attenuation returns `{ error }`; additionally, if the
connector and splice losses alone meet or exceed the budget (leaving no fiber length), the tile returns `{ error }`.
Citation discipline (v19/v22): the optical link loss budget solved for length, per TIA-568 / TIA-526 / IEEE 802.3, by
name and `GOVERNANCE.electrical` matching the sibling; the note states that **the connector and splice losses are
subtracted first, every patch point eats budget that would buy distance, and this is a planning estimate -- the
OTDR/power-meter field test certifies the link**.

## 2. The tile

### 2.1 `fiber-max-length` -- Fiber Max Length for a Loss Budget

```
inputs:
  max_channel_loss_db     dB      application channel-loss limit (> 0)
  attenuation_db_km       dB/km   fiber attenuation (> 0; default by fiber/wavelength)
  connector_count         -       connector pairs
  loss_per_connector_db   dB      per connector (default 0.75)
  splice_count            -       splices
  loss_per_splice_db      dB      per splice (default 0.3)

fixed_loss = connector_count x loss_per_connector + splice_count x loss_per_splice
len_max_m = 1000 x (max_channel_loss_db - fixed_loss) / attenuation_db_km
```

**Pinned worked example (OM4).** budget = 2.6 dB, attenuation = 3.0 dB/km, 2 connectors x 0.75 dB, 0 splices:
`fixed_loss = 1.5`, `len_max = 1000 x (2.6 - 1.5) / 3.0 = ` **366.7 m**; feeding 366.7 m back through `fiber-loss-budget`
gives a total loss of 2.6 dB (margin 0), the budget. **Cross-check (single-mode).** Same budget on SMF (0.4 dB/km):
`len_max = 1000 x 1.1 / 0.4 = ` **2,750 m** -- the far lower attenuation reaches over seven times as far.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`, beside `fiber-loss-budget`; Group A has no exact-count audit
block, so no count bump); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (loss budget solved for length,
`GOVERNANCE.electrical` matching the sibling, the note per §1); `test/fixtures/worked-examples.json` (both examples);
`test/fixtures/compute-map.js` (`fiber-max-length` -> `computeFiberMaxLength` in `../../calc-lowvoltage.js`);
`scripts/related-tiles.mjs` (-> `fiber-loss-budget` / `poe-budget` / `structured-cabling-channel` / `coax-rg-loss`, and
the forward tile links back); `data/search/aliases.json` ("max fiber length for a loss budget", "how far can i run this
fiber", "fiber distance from db budget", plus adjacent rows); `LOWVOLTAGE_RENDERERS["fiber-max-length"]` via a
hand-written renderer with the same fiber/wavelength `makeSelect` (which fills the default attenuation, feeding the
compute; check-dead-inputs satisfied) and the id added to the calc-lowvoltage declare list in `app.js`; the `// dims:`
annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js`
block pinning both examples, the single-mode-reaches-farther check, the round-trip through `computeFiberLossBudget` (to
margin 0), and the error seams (including the fixed-losses-exceed-budget guard). The calc-lowvoltage.js gzip cap and the
electrical group-shell cap are expected to hold (verify at build, including `check-shells`). Lazy-loaded, absent from
home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes); `npm test` (+2 fixtures, the new
fuzzer block); `npm run build` (one new shell, regenerated sitemap); `node scripts/check-shells.mjs` and
`check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`; worked-examples runner; 320 px audit; render +
output read to the value (the pinned example -> 366.7 m for a 2.6 dB OM4 budget).

## 5. Roadmap position

Pairs the forward fiber tile (`fiber-loss-budget`, loss from length) with its inverse (max length from a budget), the
two halves of the fiber-run question. Further Group A growth stays evidence-driven.
