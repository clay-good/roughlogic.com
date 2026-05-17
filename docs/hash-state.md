# URL hash-state encoding

> Implementation status: introduced by spec-v10 §G. Current schema is
> `v=1` (the encoding shipped from v1 onward; v10 adds the explicit
> version segment so a future change can land without breaking deep
> links).

The URL fragment (everything after `#`) is the only state mechanism
the site uses. There is no localStorage, no sessionStorage, no
cookies, no IndexedDB beyond `rl-theme`. (The `rl-bigbuttons` key
was retired in spec-v11 along with Big Buttons mode.) Every
shareable bookmark — pinned tiles and calculator inputs — is encoded
in the hash. (Pre-retirement `#b=` Project Bundle hashes are still
accepted and silently routed to the home view; the Project Bundle
decoder retired in commit 5734d28 alongside `bundle.js`.) This
document specifies the encoding so future changes can be made
without breaking shared links.

## Schema versions

| Version | Status | Introduced | Description |
| ------- | ------ | ---------- | ----------- |
| `v=1`   | current | spec.md (encoding); explicit pin in spec-v10 | Per-tile inputs encoded as URL-encoded `key=value` query parameters. Home-view multi-key form `p=` (pinned-tile list) is unversioned. Back-compat-only: pre-v11 hashes carrying `r=` (recents, retired in spec-v11 §1.1) and pre-retirement hashes carrying `b=` (Project Bundle, retired in commit 5734d28) are still accepted; the payload is silently discarded and the parser routes to the home view. |

A hash without an explicit `v=` segment is interpreted as `v=1`. This
preserves every link shared before spec-v10 landed.

## Fragment grammar

```
fragment    := "" | home | tool
home        := "home" | (homeKV ("&" homeKV)*)
homeKV      := "p=" idList | "b=" bundleBody (back-compat: accepted, discarded) | "r=" idList (back-compat: accepted, discarded)
tool        := toolId ("?" toolQuery)?
toolQuery   := versionKV ("&" toolKV)* | toolKV ("&" toolKV)*
versionKV   := "v=" digit+
toolKV      := key "=" urlEncodedValue
idList      := toolId ("," toolId)*
toolId      := [a-z0-9-]+
key         := DOM input/select/textarea `id` attribute
```

When `wireHashState` writes a fresh hash, it always emits the
`versionKV` first. Parsers that do not understand the version key
ignore it; parsers that do can route on it.

## Encoding rules (v=1)

### Numeric inputs

Numbers are written verbatim in their text form (the value of the
underlying `<input type="number">`). No fixed precision is enforced
at write time. Browsers preserve the user's typed precision (e.g.
`12.5` stays `12.5`, not `12.500000`).

A reader normalizes by passing the string through `parseFloat`. A
number that round-trips to a different string (e.g. `1e2` → `100`)
will display normalized on the next input event but the prior link
still resolves to the same numeric value.

### Select inputs

Each `<option>`'s `value` is written verbatim. Option values are
project-controlled stable identifiers (`auto`, `copper`, `pvc-40`,
etc.). New options append; existing values are not renamed without
a 90-day deprecation notice (per spec.md §10).

### Checkbox inputs

`1` for checked, `0` for unchecked. Empty / unset checkboxes are
written as `0` (because the DOM type-coerces to a boolean), so a
shared link explicitly carries the unchecked state.

### Multi-row inputs

Tiles introduced in spec-v9 that take repeated rows (noise-dose
samples, drying-log entries, SHR points) encode each row as a
separate `key` whose name carries a one-based row index suffix:

```
nd-row-1=85,30   nd-row-2=92,15   nd-row-3=100,5
```

The comma-separated tuple is `<dB>,<minutes>` for noise-dose; tile
documentation in [../calc-fire.js](../calc-fire.js) and the
restoration / hvac modules states the per-tuple shape.

### Stateful timer inputs

The lightning-countdown tile (spec-v9 §F.2) carries a 30-minute NWS
resume timer alongside the flash-to-bang seconds input. The timer
state lives in a hidden DOM input with `id="lc-timer"` so the
existing `wireHashState` path carries it like any other field. The
value uses a small `<state>:<value>` grammar:

```
lc-timer = "" | "active:" digit+ | "paused:" digit+
```

- `""` — idle; no timer running. `wireHashState` drops empty values,
  so an idle timer leaves no `lc-timer=` segment in the hash.
- `active:<end_at_unix_seconds>` — the timer is counting down toward
  the given wall-clock epoch. A reload inside the 30-minute window
  resumes at the correct remaining count without any extra state.
- `paused:<remaining_seconds>` — the timer is paused with the given
  number of seconds remaining; resume sets `end_at = now + remaining`.

The `:` separator percent-encodes to `%3A` on the wire. Helper
functions `parseTimerState` / `encodeTimerState` /
`timerRemainingSeconds` are exported from
[../calc-field.js](../calc-field.js) and exercised by
[../test/unit/calc-field-v9.test.js](../test/unit/calc-field-v9.test.js)
and the §G.2 regression fixtures in
[../test/unit/hash-state-schema.test.js](../test/unit/hash-state-schema.test.js).

### Reserved characters

The fragment uses `URLSearchParams`, which percent-encodes any byte
outside `[A-Za-z0-9*\-._]`. Specifically:

- `&`, `=`, `#`, `+`, `?`, `/`, space → percent-encoded.
- `,` is not encoded (used for id-lists and multi-row tuples).
- Reserved keys: `v`, `p`, `r`, `b`. A tile must not declare an
  input with `id="v"`; `collectParams` rejects it. The home-view
  keys `p`, `r`, `b` only appear at the top level.

### Idempotence

`applyHashState(region, parseHashRoute(hash).route.params)` followed
by `flush()` (the wireHashState debounced writer) must round-trip:
the regenerated hash equals the input hash, character-for-character,
provided no normalization occurred. The hash-schema regression
suite (introduced in spec-v10 §G.2) holds this invariant against
≥50 known shared links.

## Migration policy when introducing v=2

A future encoding change adds `v=2` and is gated on the version key:

1. Add the new encoder/decoder paths behind a `v === 2` branch in
   [../hash-state.js](../hash-state.js) and [../routing.js](../routing.js).
2. Continue to read `v=1` and unversioned hashes through the
   existing path. Do not delete v=1 support without a 12-month
   deprecation window and a CHANGELOG entry.
3. Begin emitting `v=2` from `wireHashState` only after the test
   matrix proves both encodings round-trip every fixture in the
   regression suite.
4. The append-only fixture set in
   `test/unit/hash-state-schema.test.js` (introduced in spec-v10
   §G.2) gains a v=2 stanza; pre-existing v=1 fixtures continue to
   resolve.
5. Update this document with a new schema row and the diff against
   v=1.

A change that breaks v=1 links is a **breaking change** under
spec.md semver and is not permitted without 90-day deprecation
notice plus a major-version bump. The point of versioning the
fragment is to make this contract explicit and testable.

## Why versioning the hash, not the URL path

The site is a single-page static bundle with no server-side
routing. The path stays at `/` (or `/changelog.html`) for every
tile; the hash carries the rest. Adding a path-level version
(`/v1/#...`) would require a redirect layer the site doesn't have.
The hash version is the simplest forward-compatible pin.

## See also

- [../hash-state.js](../hash-state.js) — the implementation.
- [../routing.js](../routing.js) — the parser used at view-startup.
- [../specs/spec-v10.md](../specs/spec-v10.md) §G — the spec.
- [../specs/spec.md](../specs/spec.md) §11.5 — the original
  hash-state contract.
