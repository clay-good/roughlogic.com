# roughlogic.com Specification v1229 -- Arrhenius Activation Energy (calc-lab.js, Group T, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lab.js`** (Group T),
> no new module, group, or dependency. Inherits spec.md through spec-v1228.md.
>
> **The gap.** Family-completion: the lab kinetics set (`doubling-time`, `growth-projected-count`, `michaelis-menten`,
> `substrate-for-velocity`) has no rate-vs-temperature member.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input (via `_finiteGuard`), a non-positive rate constant, equal temperatures, or a temperature at/below
absolute zero returns `{ error }`; a rate that falls with temperature yields a negative Ea (reported, not errored).
Citation discipline (v19/v22): the Arrhenius equation (Arrhenius, 1889), by name, `GOVERNANCE.lab`. **No copyrighted
table is reproduced** -- first-principles kinetics; the rate constants and temperatures are the user's measurements.

## 2. The tile

### 2.1 `arrhenius-equation` -- Arrhenius Activation Energy (Rate vs Temperature)

```
Ea = R ln(k2/k1) / (1/T1 - 1/T2)     R = 8.314 J/(mol*K), T in kelvin
A  = k1 exp(Ea/(R T1))               pre-exponential factor
Q10 = (k2/k1)^(10 / (T2_C - T1_C))   temperature coefficient
```

**Inputs:** rate constant k1 at temperature 1 (C), rate constant k2 at temperature 2 (C).

**Outputs:** activation energy Ea (kJ/mol and J/mol), the pre-exponential A, and Q10.

## 3. Worked example

`k1 = 1.0 at 25 C, k2 = 2.0 at 35 C`:

```
Ea = 8.314 x ln(2) / (1/298.15 - 1/308.15) = 52,946 J/mol = 52.95 kJ/mol
A  = 1 x exp(52946/(8.314 x 298.15)) = 1.89e9
Q10 = 2^(10/10) = 2.0
```

A rate that triples over 10 C gives Q10 = 3.0 and a higher Ea.

## 4. Limitations

Assumes Arrhenius behavior over the interval -- a single mechanism with no change of rate-limiting step; a curved
Arrhenius plot signals a mechanism change. A first-principles chemistry aid; the measured kinetics govern.

## 5. Verification

- Bounds-fuzzer `bounds: spec-v1229` pins Ea from two points, A, Q10, the k = A exp(-Ea/RT) round-trip, the
  steeper-response trend, the negative-Ea (rate falls with temperature) case, and the error seams.
- Two worked-example rows in `test/fixtures/worked-examples.json` (the doubling example and the Q10=3 cross-check).
- Formula checked against the Arrhenius equation (Arrhenius, 1889; R = 8.314 J/(mol*K)).
