#!/usr/bin/env node
// Gate: every `overrides` entry in package.json is still doing something, and
// the lockfile still reflects it.
//
// An override is a standing claim that something upstream is wrong. It is the
// right tool when a transitive dependency is pinned to a vulnerable version by
// a package you do not control -- `sharp` reached this tree as an OPTIONAL
// dependency of `miniflare`, which arrives with `wrangler`, and miniflare pins
// it to an exact `0.35.2`, so no amount of upgrading wrangler moves it off a
// high-severity libheif advisory. The pin to `0.35.4` is the only lever.
//
// It is also the kind of entry nobody deletes. When miniflare finally asks for
// the patched version itself, the override stops changing anything and becomes
// a second source of truth for a decision upstream has already made -- and the
// next reader has no way to tell a live pin from a dead one. So:
//
//   A. Every override names a package something in the tree actually depends
//      on. An entry with no dependents is dead weight.
//   B. Every override still CHANGES something: at least one dependent must ask
//      for a version other than the one pinned. When every dependent already
//      asks for exactly the pinned version, upstream has caught up and the
//      entry should go.
//   C. The lockfile agrees: every installed copy of an overridden package sits
//      at the pinned version. A stray `npm install` that dropped the override
//      would show up here rather than in a Dependabot alert weeks later.
//
// Only exact-version overrides are checked for (B); a range override cannot be
// judged inert without resolving semver, and (C) still covers it. Zero
// dependencies, no network. `node scripts/check-dependency-overrides.mjs`.

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];

const pkg = JSON.parse(await readFile(resolve(ROOT, "package.json"), "utf8"));
const lock = JSON.parse(await readFile(resolve(ROOT, "package-lock.json"), "utf8"));
const overrides = pkg.overrides || {};
const packages = lock.packages || {};

const EXACT = /^\d+\.\d+\.\d+(?:[-+].*)?$/;

// Every place a package is depended upon, with the spec that was requested.
function dependentsOf(name) {
  const out = [];
  for (const [path, entry] of Object.entries(packages)) {
    if (!entry) continue;
    for (const field of ["dependencies", "optionalDependencies", "devDependencies", "peerDependencies"]) {
      const spec = entry[field] && entry[field][name];
      if (typeof spec === "string") out.push({ path: path || "(root)", field, spec });
    }
  }
  return out;
}

// Every installed copy, wherever npm hoisted it.
function installedVersions(name) {
  const out = [];
  for (const [path, entry] of Object.entries(packages)) {
    if (!entry || !entry.version) continue;
    if (path === `node_modules/${name}` || path.endsWith(`/node_modules/${name}`)) {
      out.push({ path, version: entry.version });
    }
  }
  return out;
}

let checked = 0;
for (const [name, pin] of Object.entries(overrides)) {
  if (typeof pin !== "string") {
    problems.push(`overrides.${name}: nested override objects are not checked here; flatten it or extend this gate.`);
    continue;
  }
  checked += 1;
  const dependents = dependentsOf(name);
  const installed = installedVersions(name);

  // A. named by nothing
  if (!dependents.length && !installed.length) {
    problems.push(
      `overrides.${name}: nothing in package-lock.json depends on "${name}" and no copy is installed. ` +
      `The override does nothing -- delete it.`,
    );
    continue;
  }

  // B. no longer changes anything
  if (EXACT.test(pin) && dependents.length) {
    const differing = dependents.filter((d) => d.spec !== pin);
    if (!differing.length) {
      problems.push(
        `overrides.${name}: every dependent already asks for exactly "${pin}" ` +
        `(${dependents.map((d) => d.path).join(", ")}). Upstream has caught up -- delete the override ` +
        `so the pin is not a second source of truth.`,
      );
    }
  }

  // C. the lockfile drifted off the pin
  if (EXACT.test(pin)) {
    const wrong = installed.filter((i) => i.version !== pin);
    if (wrong.length) {
      problems.push(
        `overrides.${name}: pinned to "${pin}" but package-lock.json installs ` +
        wrong.map((w) => `${w.version} at ${w.path}`).join(", ") +
        `. Run \`npm install --package-lock-only\` and commit the lockfile.`,
      );
    }
  }
}

if (problems.length) {
  console.error("✗ check-dependency-overrides:");
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}

console.log(
  `check-dependency-overrides OK: ${checked} override(s) still live` +
  (checked ? ` (${Object.keys(overrides).join(", ")})` : "; none declared") + ".",
);
