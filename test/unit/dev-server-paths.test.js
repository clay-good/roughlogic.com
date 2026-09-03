// The dev server's path handling, exercised rather than pattern-matched.
//
// tooling-security.test.js asserts the SHAPE of scripts/dev.mjs -- that it
// calls lstat, realpath and relative(ROOT, file). That is worth having, but it
// cannot tell whether those guards are applied to the file actually served.
// When directory resolution was added so `/tools/<id>/` works the way it does
// in production, the guards had to be re-run against the resolved index.html
// rather than the directory that was asked for. This is what checks that.
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

// Ask the OS for a free port rather than naming one. 8080 is the Playwright
// webServer and 8099 is check-shell-mobile's dev-server instance, so any fixed choice
// is a collision waiting for someone to run two things at once -- which is
// exactly what a developer does.
async function freePort() {
  const srv = createServer();
  await new Promise((res) => srv.listen(0, "127.0.0.1", res));
  const { port } = srv.address();
  await new Promise((res) => srv.close(res));
  return port;
}

async function withServer(run) {
  if (!existsSync(resolve(ROOT, "dist", "index.html"))) return "no-dist";
  const PORT = await freePort();
  const base = `http://localhost:${PORT}`;
  const proc = spawn(process.execPath, [resolve(ROOT, "scripts", "dev.mjs")], {
    cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    const deadline = Date.now() + 15000;
    for (;;) {
      try { await fetch(base + "/index.html"); break; } catch {
        if (Date.now() > deadline) throw new Error("dev server did not start");
        await new Promise((r) => setTimeout(r, 150));
      }
    }
    return await run(base);
  } finally {
    proc.kill("SIGTERM");
    await once(proc, "exit").catch(() => {});
  }
}

test("dev server resolves a directory to index.html, and still refuses traversal", async () => {
  const outcome = await withServer(async (base) => {
    const code = async (p) => (await fetch(base + p, { redirect: "manual" })).status;

    // The canonical url shape this site publishes in its sitemap, its JSON-LD
    // and every shell's <link rel=canonical>. It answered 403 before.
    assert.equal(await code("/tools/voltage-drop/"), 200, "canonical tile url");
    assert.equal(await code("/tools/voltage-drop/index.html"), 200, "explicit file");
    assert.equal(await code("/"), 200, "root");

    // A directory with no index.html is not a listing.
    assert.equal(await code("/data/"), 404, "no directory listing");
    assert.equal(await code("/tools/not-a-real-tile/"), 404, "missing tile");

    // The guards are re-applied to the resolved file, not just the directory.
    for (const p of ["/%2e%2e/package.json", "/tools/../../package.json",
                     "/tools/voltage-drop/../../../scripts/dev.mjs"]) {
      assert.equal(await code(p), 404, `traversal refused: ${p}`);
    }
    return "ran";
  });
  if (outcome === "no-dist") return; // dist/ is a build artifact; skip when absent
});
