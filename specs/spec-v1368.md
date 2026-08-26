# roughlogic.com Specification v1368 -- Two-Transmitter Intermodulation Frequency Screen (calc-stage.js, Group N, stage and live production, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-stage.js`**
> (Group N, stage and live production), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Wireless microphone coordination lives or dies on third-order intermodulation products, and the catalog does not compute them. Two transmitters produce two third-order products and two fifth-order ones at predictable frequencies, and a third transmitter parked on one of them will drop out with no other symptom.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive frequency, two identical frequencies, or a computed product outside a plausible RF range, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the third- and fifth-order two-transmitter intermodulation products (standard RF coordination practice; FCC Part 74 Subpart H governs licensed operation), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `wireless-intermod` -- Two-Transmitter Intermodulation Frequency Screen

```
spacing   = |f2 - f1|
third order:  2 f1 - f2   and   2 f2 - f1
fifth order:  3 f1 - 2 f2 and   3 f2 - 2 f1
```

When two transmitters are close enough for one's signal to reach the other's output stage -- or for both to hit a
shared receiver front end -- the nonlinearity mixes them, and the mixing products fall at predictable
frequencies. The third-order pair lands one full spacing outside each carrier: two transmitters 3 MHz apart put
products 3 MHz below the lower and 3 MHz above the upper. Fifth-order products land two spacings out, weaker but
still capable of taking down a channel.

The practical consequence is that an evenly spaced channel plan is the worst possible plan. Space three
transmitters 3 MHz apart and the middle-to-upper pair generates a product landing exactly on the lower one.
Coordination software solves the whole set at once; this tile solves the pair, which is what a tech in a room
needs when one channel out of twelve is dropping and the rest are fine.

**Inputs:** two carrier frequencies (MHz), and optionally a third frequency to test against the products.

**Outputs:** the spacing, the two third-order and two fifth-order product frequencies, and -- when a test
frequency is given -- how far it sits from the nearest product.

## 3. Worked example

Two transmitters at 542.000 MHz and 545.000 MHz:

```
spacing      = 3.000 MHz
third order  = 2(542) - 545 = 539.000 MHz
               2(545) - 542 = 548.000 MHz
fifth order  = 3(542) - 2(545) = 536.000 MHz
               3(545) - 2(542) = 551.000 MHz
```

A third channel at 539.000 MHz -- which looks like a perfectly reasonable 3 MHz step down -- sits directly on a
third-order product and will be unusable when both other transmitters are on. Move it to 540.100 MHz and it clears
every product in the list by at least a megahertz. Note also that 536.000 and 551.000 are live: an evenly spaced
five-channel plan on 3 MHz steps collides with itself at both ends.

## 4. Scope and non-goals

Two transmitters at a time. A real coordination is an all-pairs problem across every transmitter in the building
plus the local television allocations, and it is solved with coordination software against a current spectrum
scan, not by hand. This tile ignores product amplitude entirely -- a product's frequency says nothing about
whether it is strong enough to matter, which depends on transmitter spacing, antenna placement, and receiver
front-end design. It does not check whether a frequency is legal to operate on: US wireless microphone operation
is governed by FCC Part 74 Subpart H and the current television band plan, both of which have changed repeatedly.
The FCC and the frequency coordinator govern.
