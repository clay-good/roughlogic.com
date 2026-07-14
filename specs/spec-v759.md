# roughlogic.com Specification v759 -- Steam PRV Orifice Area for a Required Capacity (calc-pipefit.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-pipefit.js`** (Group B),
> no new module, group, or dependency. Inherits spec.md through spec-v758.md. Explore sweep #15 (entry 6).
>
> **The gap, and the evidence for it.** The `steam-prv-napier` tile runs the choked Napier form forward: from an orifice
> area it returns the steam relief capacity. The sizing question is the inverse -- **the orifice / seat area a required
> relief capacity needs**, so a sizer can pick an API 526 orifice letter. From `W = 51.43 Cd A P1`,
> `A = W / (51.43 Cd P1)`. The number this settles: a **5,000 lb/hr** relief at **100 psia** and **Cd 0.9** wants about
> **1.08 in^2**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`steam-prv-napier` sibling: the required capacity is `M T^-1` (lb/hr), the upstream pressure and choke threshold are
`M L^-1 T^-2` (psia), the discharge coefficient is dimensionless, and the returned area is `L^2` (in^2). It reuses the
sibling's choked Napier capacity form, solved for the area. The v18/v21 contract: any non-finite input, a non-positive
required capacity or upstream pressure, or a discharge coefficient outside (0, 1] returns `{ error }`. The tile assumes
**choked flow** (the standard relief condition) and reports the choke threshold (0.58 x P1). Citation discipline (v19/v22):
the Napier form solved for the area, `GOVERNANCE.general` matching the sibling; the note says to **round up to a standard
API 526 orifice letter**, that a **liquid Cv is wrong** for choked steam, that Napier is for **saturated steam** (superheat
needs a Ksh factor), and that this is a **sizing aid, not a relief-valve certification** with ASME/API and the valve maker
governing.

## 2. The tile

### 2.1 `steam-prv-area-for-capacity` -- Steam PRV Orifice Area for a Required Capacity (Napier)

```
inputs:
  required_capacity_lb_hr   M T^-1        required relief capacity W (lb/hr, > 0)
  upstream_p_psia           M L^-1 T^-2   upstream absolute pressure P1 (psia, > 0)
  discharge_coeff           dimensionless discharge coefficient Cd (0 < Cd <= 1; default 0.9)

required_area_in2   = required_capacity_lb_hr / (51.43 x discharge_coeff x upstream_p_psia)
choke_threshold_psia = 0.58 x upstream_p_psia
```

**Pinned worked example.** W = 5,000 lb/hr, P1 = 100 psia, Cd = 0.9:
`A = 5000 / (51.43 x 0.9 x 100) = 5000 / 4628.7 = ` **1.08 in^2** (choke threshold 58 psia). Feeding 1.08 in^2 back through
`steam-prv-napier` at 100 psia (with a choked downstream) returns 5,000 lb/hr, the required capacity. Doubling the upstream
pressure to 200 psia halves the required area to 0.54 in^2.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["pipefitting","plumbing"]`) placed beside `steam-prv-napier` (Group B is not
exact-count audited); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (Napier form solved for the area,
`GOVERNANCE.general` matching the sibling); `test/fixtures/worked-examples.json` (the pinned example);
`test/fixtures/compute-map.js` (`steam-prv-area-for-capacity` -> `computeSteamPrvAreaForCapacity`);
`scripts/related-tiles.mjs` (-> `steam-prv-napier` / `flash-steam-pct` / `steam-trap-sizing`);
`data/search/aliases.json` (5 collision-checked question aliases: "prv orifice area", "relief valve orifice size", ...);
the calc-pipefit `PIPEFIT_RENDERERS` map entry via a hand-written renderer (three number fields) and the id added to the
calc-pipefit declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus +
tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the round-trip through
`computeSteamPrvNapier` (choked) across a capacity/pressure/Cd sweep, the more-capacity-more-area and
higher-pressure-less-area monotonicity, and the error seams. The calc-pipefit.js gzip cap (21000 B) holds. Verify at
build, including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,207 -> 1,208.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 1.08 in^2 for a 5,000 lb/hr
relief at 100 psia).

## 5. Roadmap position

Pairs the forward PRV tile (`steam-prv-napier`, capacity from the area) with its inverse (the area for a capacity), the two
halves of the choked-steam-relief sizing question. Continues Explore sweep #15; further Group B pipefitting growth stays
evidence-driven.
