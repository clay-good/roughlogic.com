# roughlogic.com Specification v646 -- Required Face Rent from a Target Net Effective Rent (calc-realestate.js, Group X, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-realestate.js`**
> (Group X, real estate), no new module, group, or dependency. Inherits spec.md through spec-v645.md.
>
> **The gap, and the evidence for it.** The `net-effective-rent` tile (spec-v526) takes a face rent plus
> concessions and returns the effective rate a tenant pays. The landlord's pricing question is the reverse: "I
> want to net $30/SF, and I plan to give 20 months free plus a TI credit -- what FACE rent must I quote?" That is
> the same straight-line spread solved for the face: `face = (target_NER x term + one_time_credit) / (term -
> free_periods)`. Pure business algebra, no constants. The pinned example: to net **$30/SF** over 120 months with
> 20 months free and no credit, the landlord must quote a **$36.00** face -- 16.7% above the effective rate; a
> $240/SF TI credit pushes the required face to **$38.40**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. Mirroring the
sibling, every input and output is `dimensionless` (currency-per-period and period counts). The v18/v21 contract
(mirroring the forward tile): a non-finite input, a non-positive target NER or term, free periods not in `[0, term)`,
or a negative credit returns `{ error }`. Citation discipline (v19/v22): the required-face-rent inverse of the
straight-line net-effective-rent spread, by name; the note states that **face = (target_NER x term +
one_time_credit) / (term - free_periods), more concessions force a higher face, and this is a straight-line spread,
not a present-value rent** -- a pricing aid, not lease terms; the executed lease governs.

## 2. The tile

### 2.1 `required-face-rent` -- The Face Rent Needed to Net a Target Effective Rate

```
inputs:
  target_ner       $/period   net effective rate to hit (> 0)
  term_periods     periods    lease term (> 0)
  free_periods     periods    free-rent periods (0 <= free < term)
  one_time_credit  $          one-time TI / concession credit (>= 0)

face_rent    = (target_ner x term + one_time_credit) / (term - free_periods)
paid         = face_rent x (term - free_periods)
discount_pct = (1 - target_ner / face_rent) x 100      (face sits this far above the effective rate)
```

**Pinned worked example.** `target_NER = 30`, `term = 120`, `free = 20`, `credit = 0`:
`face = (30 x 120 + 0) / (120 - 20) = 3600 / 100 = ` **$36.00**; the face sits `(1 - 30/36) x 100 = ` **16.7%**
above the effective rate.
**Cross-check (a TI credit raises the required face).** Add a `$240` one-time credit: `face = (3600 + 240)/100 = `
**$38.40** -- the landlord must quote more to still net $30 after funding the credit.
**Cross-check (exact inverse of net-effective-rent).** The fuzzer feeds the returned face back through
`net-effective-rent` across several term/free/credit combinations and recovers the target NER to 1e-9.

## 3. Wiring

A `tools-data.js` row (group `X`, trades `["real-estate"]`, beside `net-effective-rent`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (required-face-rent inverse, Appraisal Institute / lease practice, the note per §1);
`test/fixtures/worked-examples.json` (the pinned example plus the TI-credit cross-check); `test/fixtures/compute-
map.js` (`required-face-rent` -> `computeRequiredFaceRent`); `scripts/related-tiles.mjs` (<-> `net-effective-rent`,
`commercial-load-factor`, `rental-worksheet`, `cap-rate-dscr`); `data/search/aliases.json` ("required face rent",
"gross up net effective rent", "what face rent to quote", plus question rows, all collision-checked);
`REALESTATE_RENDERERS["required-face-rent"]` via a hand-written renderer (the module's `makeNumber` /
`makeOutputLine` / `attachExampleButton` / `debounce` / `fmt` helpers, mirroring `net-effective-rent`) and the id
added to the calc-realestate declare list in `app.js`; the `// dims:` annotation directly above the compute;
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the example, the credit effect, the
exact inverse round-trip through `computeNetEffectiveRent`, and the error seams. The two `index.html` home-count
spots go 1,094 -> 1,095 (check-readme-counts gates them). The calc-realestate.js gzip cap is expected to hold
(verify at build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output
read to the value (the pinned example -> $36.00 face, 16.7% above effective).

## 5. Roadmap position

Completes the concession pair: `net-effective-rent` (face -> effective) and now `required-face-rent` (target
effective -> face), exact inverses through the same straight-line spread. Further Group X growth stays
evidence-driven.
