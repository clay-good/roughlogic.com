# roughlogic.com Specification v1197 -- Wood Beam Compression-Side End Notch Shear (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-08-03). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v1196.md.
>
> **The gap, and the evidence for it.** The landed `wood-beam-shear` tile (spec-v264) computes the tension-side end-notch
> reduction and names its own limit in its note and citation: it "does not cover compression-side notches (a different
> rule)." The compression-side rule is genuinely different -- and far gentler -- and no tile computes it (grep confirmed no
> compression-notch tile). A carpenter told "notch the compression side, not the tension side" has no tool to quantify how
> much capacity that actually keeps.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the tension-side
sibling `wood-beam-shear` (same `_simpleRenderer` factory, same input pattern plus the notch offset `e`). The v18/v21
contract: a non-finite input (via `_finiteGuard`), a non-positive `Fv'`/`b`/`d`/`dn`, `dn > d`, or a negative `e` or `V`
returns `{ error }`. Citation discipline (v19/v22): NDS 3.4.3.2(e) by name, `GOVERNANCE.general` matching the sibling; the
note states the effective-depth rule, the `e <= dn` validity and the `dn`-governs cap, and the contrast with the
tension-side `(dn/d)^2`. **No copyrighted table is reproduced** -- the equation is stated in NDS 3.4, published free
read-only by AWC at awc.org, and `Fv'` is the user's own adjusted design value.

## 2. The tile

### 2.1 `wood-beam-compression-notch` -- Wood Beam Compression-Side End Notch Shear (NDS 3.4.3.2)

```
inputs:
  fv_prime_psi   adjusted shear design value Fv' (psi)
  b_in, d_in     breadth and full depth (in)
  dn_in          net depth remaining at the notch (in, dn <= d)
  e_in           distance the notch extends from the inner edge of the support (in)
  v_applied_lb   applied end shear V (lb, 0 to skip the stress check)

NDS 2018 Eq 3.4-5 (compression face at the end):
  de  = d - ((d - dn)/dn) e     (e capped at dn; for e >= dn, dn governs per Eq 3.4-2)
  Vr' = (2/3) Fv' b de
contrast (tension side, Eq 3.4-4):
  Vt' = (2/3) Fv' b dn (dn/d)^2
```

**Pinned worked example (verified against the AWC NDS 2018 Chapter 3 PDF).** A 4x12 (`Fv'` 180 psi, `b` 3.5, `d` 11.25,
`dn` 9.25) notched on the compression face 3 in from the support: `de = 11.25 - (2/9.25)(3) =` **10.60 in**, so
`Vr' =` **4,453 lb** -- against **2,626 lb** for the same notch on the tension side, about **1.7x** more. The seams the
fuzzer pins: at `e = 0` (notch at the bearing) `de = d` and `Vr'` is the un-notched 4,725 lb; at `e = dn` and beyond,
`de = dn` (continuous with Eq 3.4-2, cap flag set past `dn`).

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","carpentry"]`, mirroring `wood-beam-shear`) beside it; a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (NDS 3.4.3.2(e), `GOVERNANCE.general`, `freeAccess` noting AWC's
free read-only access); `test/fixtures/worked-examples.json` (the pinned example, pinning `de_in`, `vr_lb`,
`vr_tension_lb`, `dcr`); `test/fixtures/compute-map.js` and `test/fixtures/renderer-map.js` (spec-v1191 reachability
parity); `scripts/related-tiles.mjs` (-> `wood-beam-shear` and back, plus `wood-beam-bending` / `joist-notch-bore-limit`);
`data/search/aliases.json` (4 collision-checked aliases; alias shards regenerated); the `CONSTRUCTION_RENDERERS` entry via
the `_simpleRenderer` factory (auto-exposing the MCP field schema); the `// dims:` annotation directly above the compute;
regenerated v14 corpus + tile-index. Home tile count 1,569 -> 1,570 (index.html JSON-LD + hero lede, AGENTS.md).
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` (calc-construction.js
is near its cap -- confirm the tile fits); `npm run data:verify`; worked-examples runner; 320 px audit; render + output read
to the value (4x12, 3 in from the support -> de 10.60 in, Vr' 4,453 lb).

## 5. Roadmap position

Closes a self-declared gap: the tension-side shear tile deferred the compression-side notch, which is a different NDS rule
with the opposite lesson -- it is the safe place to notch. The two now cover both faces of the end-notch provision, beside
wood-beam bending and the joist/stud notch-and-bore field checks.
