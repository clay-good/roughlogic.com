import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..", "..");
const GATE = resolve(ROOT, "scripts/check-data-stamp-monotonic.mjs");

// Build a throwaway repository that reproduces the shape of a stale
// data-refresh pull request: a branch cut from an old main, and a correction
// that landed on main afterwards.
function makeRepo({ baseStamp, branchStamp, branchCap }) {
  const dir = mkdtempSync(join(tmpdir(), "stamp-gate-"));
  const git = (...args) => execFileSync("git", args, { cwd: dir, encoding: "utf8" });
  git("init", "-q", "-b", "main");
  git("config", "user.email", "t@example.com");
  git("config", "user.name", "t");
  mkdirSync(join(dir, "data", "accounting"), { recursive: true });
  mkdirSync(join(dir, "scripts"), { recursive: true });
  execFileSync("cp", [GATE, join(dir, "scripts", "check-data-stamp-monotonic.mjs")]);

  const shard = (verified, cap) =>
    JSON.stringify({ verified_on: verified, by_year: { 2026: { cap_usd: cap } } }, null, 2);
  const file = join(dir, "data", "accounting", "section-179-limits.json");

  // The commit the refresh branch was cut from.
  writeFileSync(file, shard("2026-08-01", 1290000));
  git("add", "-A");
  git("commit", "-q", "-m", "cut point");
  const cutPoint = git("rev-parse", "HEAD").trim();

  // The refresh branch: regenerated, stamped the day it ran.
  git("checkout", "-q", "-b", "refresh", cutPoint);
  writeFileSync(file, shard(branchStamp, branchCap));
  git("add", "-A");
  git("commit", "-q", "-m", "data: monthly refresh");

  // Meanwhile main learned something the branch has never seen.
  git("checkout", "-q", "main");
  writeFileSync(file, shard(baseStamp, 2560000));
  git("add", "-A");
  git("commit", "-q", "-m", "fix(accounting): OBBBA figures");

  git("checkout", "-q", "refresh");
  return { dir, git };
}

function runGate(dir) {
  try {
    const stdout = execFileSync("node", ["scripts/check-data-stamp-monotonic.mjs"], {
      cwd: dir,
      encoding: "utf8",
      env: { ...process.env, DATA_STAMP_BASE: "main" },
    });
    return { code: 0, out: stdout };
  } catch (err) {
    return { code: err.status, out: (err.stdout || "") + (err.stderr || "") };
  }
}

test("a stale refresh branch that would revert a correction is rejected", () => {
  // The exact shape of the open monthly-refresh PR: the branch's stamp is
  // older than main's, and merging it would halve the Section 179 cap.
  const { dir } = makeRepo({
    baseStamp: "2026-09-02",
    branchStamp: "2026-09-01",
    branchCap: 1290000,
  });
  try {
    const { code, out } = runGate(dir);
    assert.equal(code, 1, "gate must fail on a backwards stamp");
    assert.match(out, /section-179-limits\.json \/verified_on: 2026-09-02 -> 2026-09-01/);
    assert.match(out, /move BACKWARDS against main/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the comparison is against the base TIP, not the merge base", () => {
  // The trap this gate exists to avoid: against the merge base a stale branch
  // looks fine, because it agrees with the commit it was cut from. Only the
  // base tip carries the newer stamp. Assert the gate reads the tip by giving
  // the branch a stamp NEWER than the cut point but OLDER than main.
  const { dir, git } = makeRepo({
    baseStamp: "2026-09-02",
    branchStamp: "2026-08-15",
    branchCap: 1290000,
  });
  try {
    const shard = git("show", "HEAD:data/accounting/section-179-limits.json");
    assert.match(shard, /2026-08-15/, "branch stamp is ahead of its own cut point");
    const { code, out } = runGate(dir);
    assert.equal(code, 1, "a stamp behind the base tip is a regression even when it moved forward from the cut point");
    assert.match(out, /2026-09-02 -> 2026-08-15/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a genuinely newer refresh passes", () => {
  const { dir } = makeRepo({
    baseStamp: "2026-09-02",
    branchStamp: "2026-09-03",
    branchCap: 2560000,
  });
  try {
    const { code, out } = runGate(dir);
    assert.equal(code, 0, out);
    assert.match(out, /check-data-stamp-monotonic OK/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the gate refuses to pass when it has no base to compare against", () => {
  // A gate that silently skips is worse than no gate: it reports green having
  // looked at nothing.
  const dir = mkdtempSync(join(tmpdir(), "stamp-gate-nobase-"));
  try {
    execFileSync("git", ["init", "-q", "-b", "main"], { cwd: dir });
    execFileSync("git", ["config", "user.email", "t@example.com"], { cwd: dir });
    execFileSync("git", ["config", "user.name", "t"], { cwd: dir });
    mkdirSync(join(dir, "scripts"), { recursive: true });
    execFileSync("cp", [GATE, join(dir, "scripts", "check-data-stamp-monotonic.mjs")]);
    writeFileSync(join(dir, "x.txt"), "x");
    execFileSync("git", ["add", "-A"], { cwd: dir });
    execFileSync("git", ["commit", "-q", "-m", "only commit"], { cwd: dir });
    let code = 0;
    let out = "";
    try {
      execFileSync("node", ["scripts/check-data-stamp-monotonic.mjs"], {
        cwd: dir,
        encoding: "utf8",
        env: { ...process.env, DATA_STAMP_BASE: "no-such-ref" },
      });
    } catch (err) {
      code = err.status;
      out = (err.stdout || "") + (err.stderr || "");
    }
    assert.equal(code, 1);
    assert.match(out, /no base commit to compare against/);
    assert.match(out, /Refusing to pass without looking/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
