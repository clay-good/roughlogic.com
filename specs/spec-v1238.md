# roughlogic.com Specification v1238 -- Stub Acme Thread Depth (calc-machining.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-machining.js`** (Group K),
> no new module, group, or dependency. Inherits spec.md through spec-v1237.md.
>
> **The gap.** Sibling names the gap: `acme-thread-depth` (spec-v1220) states "the Stub Acme (0.3 P depth) ... differ."
> This is the Stub Acme companion, completing the thread-form family (60-degree UN, general-purpose Acme, Stub Acme).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input (via `_finiteGuard`), a non-positive diameter or TPI, or a pitch so coarse the minor diameter goes
non-positive returns `{ error }`. Citation discipline (v19/v22): Stub Acme dimensions (Machinery's Handbook / ASME
B1.8), `GOVERNANCE.general`, distinct from the general-purpose `acme-thread-depth` tile. **No table is reproduced** --
the dimensions come from the 29-degree geometry and the 0.3 P height.

## 2. The tile

### 2.1 `stub-acme-thread-depth` -- Stub Acme (29-degree) Thread Depth and Dimensions

```
P          = 1 / TPI
h (depth)  = 0.3 P                         (vs P/2 for general-purpose Acme)
pitch dia  = D - 0.3 P
minor dia  = D - 2h = D - 0.6 P
crest flat = P/2 - h tan(14.5 deg) = 0.4224 P
```

**Inputs:** major (nominal) diameter D (in), threads per inch (TPI).

**Outputs:** pitch, thread depth, pitch diameter, minor (root) diameter, crest flat width.

## 3. Worked example

`D = 1 in, TPI = 5` (a "1-5 Stub Acme"):

```
P          = 1/5 = 0.200 in
h          = 0.3 x 0.200 = 0.060 in
pitch dia  = 1 - 0.060 = 0.940 in
minor dia  = 1 - 0.120 = 0.880 in
crest flat = 0.200/2 - 0.060 tan(14.5 deg) = 0.0845 in  (= 0.4224 x 0.200)
```

Contrast the general-purpose 1-5 Acme: 0.110 in depth, 0.780 in minor, 0.0741 in crest flat. The stub thread is
shallower (stronger root) with a wider crest flat.

## 4. Scope and non-goals

The crest flat is derived from the same 29-degree half-angle (14.5 deg) geometry the general-purpose tile uses to get
0.3707 P at the full P/2 depth. Suits hardened or heavily loaded lead screws, valve stems, and thin-wall parts. Cut
with a 29-degree tool and verify the pitch diameter over wires. ASME B1.8 and the thread gauge govern the finished fit.
