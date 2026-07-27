# roughlogic.com Specification v1021 -- Concrete Anchor Steel Strength (calc-concrete.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-concrete.js`**
> (Group E), no new module, group, or dependency. Inherits spec.md through spec-v1020.md. Third of the anchor
> follow-ons: the anchor family now checks every concrete mode (tension breakout / pullout / blowout / shear
> breakout / pryout) and NOTHING checks the steel itself -- yet every one of those tiles' notes says a design
> "takes the least of steel, ..." while the catalog cannot produce the steel number.
>
> **Dupe status.** The existing bolt tiles are AISC 360 J3 structural-connection checks (`bolt-shear-bearing`
> Fnv stress tables, `steel-bolt-tension-shear` J3.7) -- a different code path with different numbers. The
> ACI Chapter 17 steel strength uses Ase from the thread geometry and futa with the 1.9 fya / 125 ksi cap;
> no existing tile returns Nsa or Vsa.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: non-finite,
non-positive, or geometrically impossible inputs (thread pitch eating the whole diameter) return `{ error }`.
Citation discipline: ACI 318-19 by section number only; the Ase expression is the published commentary formula
(RD.6.1.2 / R17.6.1.2), not a table reproduction. `GOVERNANCE.general`. Renderer: `_simpleRenderer`.

## 2. The tile

### 2.1 `concrete-anchor-steel-strength` -- Concrete Anchor Steel Strength (ACI 318-19 17.6.1 / 17.7.1)

```
inputs:  anchor_dia_in (da), threads_per_in (n, from the bolt callout e.g. 5/8-11 -> 11),
         fya_psi (default 36000), futa_psi (default 58000)
compute: Ase   = (pi/4)(da - 0.9743/n)^2          R17.6.1.2 commentary formula
         futa_used = min(futa, 1.9 fya, 125000)    17.6.1.2 cap
         Nsa   = Ase futa_used                     17.6.1.2
         phiNsa = 0.75 Nsa    (ductile steel, tension, Table 17.5.3)
         Vsa   = 0.6 Ase futa_used                 17.7.1.2(b), cast-in headed/hooked bolt
         phiVsa = 0.65 Vsa    (ductile steel, shear, Table 17.5.3)
outputs: ase_in2, futa_used_psi, nsa_lb, phi_nsa_lb, vsa_lb, phi_vsa_lb, note
```

**Verification.** Every constant reproduces the K-State/PCA-notes published worked examples exactly:
5/8-11 bolt, futa 58 ksi -> Ase = 0.226 in^2, Nsa = 13.11 kip, phiNsa = 9.83 kip (phi 0.75 ductile),
Vsa = 7.86 kip, phiVsa = 5.11 kip (phi 0.65 ductile). The Ase formula and the futa cap (lesser of 1.9 fya
and 125,000 psi) are stated verbatim in the Williams Form 318-19 reference; 17.7.1.2b's 0.6 factor is stated
in both.

**Worked example (pinned).** The K-State bolt above, plus a 3/4-10: Ase = 0.33446 in^2, Nsa = 19,398.7 lb,
phiNsa = 14,549.0 lb, Vsa = 11,639.2 lb, phiVsa = 7,565.5 lb.

## 3. Scope limits

Cast-in headed and hooked BOLTS (the 0.6 shear factor). Welded headed studs use the full Ase futa per
17.7.1.2(a) and are NOT modeled -- noted in the tile. Ductile steel only (A307 / F1554 class): a brittle
element takes lower phi (not offered rather than recalled). Grout-pad reduction (0.80 factor), seismic
reductions, and the concrete modes are separate -- the anchor design takes the LEAST of this tile and the
concrete-mode tiles. ACI 318 Chapter 17 and the engineer of record govern.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5. Fuzzer pins both K-State examples, the futa cap seam (a
125-ksi-capped high-strength rod), the exact Vsa = 0.6 Nsa identity, monotonicity in da, and the
thread-pitch-exceeds-diameter error seam.
