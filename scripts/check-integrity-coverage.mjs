#!/usr/bin/env node
// Integrity-coverage gate.
//
// docs/threat-model.md says a tampered shard is visible to the user before any
// calculation depends on it. That was not true. Two things were missing:
//
//   1. integrity.js verified each data/<folder>/manifest.json and stopped
//      there. Nothing ever hashed a shard, so altering data/electrical/*.json
//      while leaving the manifest alone produced no banner at all -- even
//      though the manifest already records that shard's SHA-256.
//   2. data/search and data/fields were not in data/integrity.json at all, and
//      every one of their 46 shard hashes was the literal string "pending".
//      check-manifests asserts "every listed shard has a recorded hash", and a
//      placeholder satisfied it.
//
// integrity.js now exposes verifyShard(folder, file, text) and every runtime
// shard fetch calls it. verifyShard deliberately does NOT fail on a shard with
// no recorded hash -- inventing a mismatch there would banner the innocent --
// so the recorded set has to be complete for the check to mean anything. That
// is this gate's job:
//
//   A. every data folder carrying a manifest.json is anchored in
//      data/integrity.json, with a hash matching the file on disk;
//   B. every shard file on disk has a real recorded hash in its folder's
//      manifest, and that hash matches the file;
//   C. no placeholder ("pending") survives anywhere.
//   D. every entry scripts/expected-hashes.json carries matches the file on
//      disk.
//
// A failure here means the site would either miss a tampered shard (B/C) or
// show every visitor a false integrity banner (A). Deterministic, offline.
//
// D was added 2026-09-05 after a tile band went red on the FIRST push. There
// are two hash registries -- the runtime data/integrity.json checked here, and
// the build's scripts/expected-hashes.json checked by `npm run data:verify`.
// That is a CI step and is NOT in the lint chain, so re-stamping one and not
// the other was green through every local gate and red forty minutes later.
// The two drift for the same reasons and there is no argument for catching one
// class of it locally and the other only in CI.

import { readFile, readdir } from "node:fs/promises";
import { resolve, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = resolve(ROOT, "data");
const HEX64 = /^[0-9a-f]{64}$/;

const sha256 = (text) => createHash("sha256").update(text, "utf8").digest("hex");

async function walk(dir, base = dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const abs = resolve(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(abs, base)));
    else out.push(relative(base, abs).split(sep).join("/"));
  }
  return out;
}

async function main() {
  const errors = [];
  const integrity = JSON.parse(await readFile(resolve(DATA, "integrity.json"), "utf8"));
  const anchored = integrity.manifests || {};

  const folders = (await readdir(DATA, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  let shardsChecked = 0;
  let foldersChecked = 0;

  for (const folder of folders) {
    const manifestPath = resolve(DATA, folder, "manifest.json");
    if (!existsSync(manifestPath)) continue;
    foldersChecked += 1;
    const manifestText = await readFile(manifestPath, "utf8");

    // A. anchored at boot, and the anchor is current.
    if (!anchored[folder]) {
      errors.push(
        `data/${folder}/manifest.json is not listed in data/integrity.json, so integrity.js never verifies it. ` +
          `Add its SHA-256 there and in scripts/expected-hashes.json.`,
      );
    } else if (anchored[folder] !== sha256(manifestText)) {
      errors.push(
        `data/integrity.json records a stale hash for data/${folder}/manifest.json. ` +
          `Every visitor would see the integrity banner. Re-stamp it after regenerating this folder.`,
      );
    }

    const manifest = JSON.parse(manifestText);
    const hashes = manifest.hashes || {};
    const onDisk = (await walk(resolve(DATA, folder))).filter(
      (f) => f.endsWith(".json") && f !== "manifest.json",
    );

    for (const file of onDisk) {
      shardsChecked += 1;
      const recorded = hashes[file];
      // B / C.
      if (!recorded) {
        errors.push(
          `data/${folder}/${file} has no recorded hash in its manifest, so verifyShard() skips it ` +
            `and a tampered copy would load unnoticed.`,
        );
      } else if (!HEX64.test(recorded)) {
        errors.push(
          `data/${folder}/manifest.json records "${recorded}" for ${file} instead of a SHA-256. ` +
            `A placeholder passes check-manifests while verifying nothing.`,
        );
      } else if (recorded !== sha256(await readFile(resolve(DATA, folder, file), "utf8"))) {
        errors.push(
          `data/${folder}/manifest.json records a hash for ${file} that does not match the file. ` +
            `Re-run that folder's generator; shipping this would banner every visitor who opens the tile.`,
        );
      }
    }

    for (const file of Object.keys(hashes)) {
      if (!onDisk.includes(file)) {
        errors.push(`data/${folder}/manifest.json records a hash for ${file}, which is not on disk.`);
      }
    }
  }

  // D. The build registry. Same files, second list, checked by the CI-only
  // `npm run data:verify` -- brought into the lint chain here so the two
  // registries cannot silently diverge between a local run and a push.
  let expectedChecked = 0;
  const expectedPath = resolve(ROOT, "scripts", "expected-hashes.json");
  const expected = JSON.parse(await readFile(expectedPath, "utf8"));
  for (const [rel, want] of Object.entries(expected.hashes || {})) {
    const abs = resolve(DATA, rel);
    if (!existsSync(abs)) {
      errors.push(`scripts/expected-hashes.json lists data/${rel}, which is not on disk.`);
      continue;
    }
    expectedChecked++;
    if (!HEX64.test(want)) {
      errors.push(`scripts/expected-hashes.json records "${want}" for data/${rel} instead of a SHA-256.`);
    } else if (sha256(await readFile(abs, "utf8")) !== want) {
      errors.push(
        `scripts/expected-hashes.json records a stale hash for data/${rel}. ` +
        "`npm run data:verify` fails in CI on this. Re-stamp it after regenerating this folder.",
      );
    }
  }

  // Anchors pointing at folders that no longer carry a manifest.
  for (const folder of Object.keys(anchored)) {
    if (!existsSync(resolve(DATA, folder, "manifest.json"))) {
      errors.push(`data/integrity.json anchors data/${folder}/manifest.json, which does not exist.`);
    }
  }

  if (errors.length) {
    console.error("check-integrity-coverage FAILED:");
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }
  console.log(
    `check-integrity-coverage OK: ${foldersChecked} data folders anchored in data/integrity.json, ` +
      `${shardsChecked} shards carry a real SHA-256 matching the file on disk, and ` +
      `${expectedChecked} scripts/expected-hashes.json entries match theirs (the registry \`npm run data:verify\` reads).`,
  );
}

main().catch((e) => {
  console.error("check-integrity-coverage: unexpected error", e);
  process.exit(1);
});
