import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("browser companion has the minimum permissions and background workflow", async () => {
  const manifest = JSON.parse(await readFile("companion-extension/manifest.json", "utf8")) as {
    manifest_version: number;
    host_permissions: string[];
    permissions: string[];
  };
  const worker = await readFile("companion-extension/service-worker.js", "utf8");

  assert.equal(manifest.manifest_version, 3);
  assert.ok(manifest.permissions.includes("scripting"));
  assert.ok(manifest.host_permissions.includes("https://kick.com/*"));
  assert.match(worker, /openClipCreator/);
  assert.ok(worker.includes('[data-testid="clip-share-url"]'));
  assert.match(worker, /active: false/);
  assert.match(worker, /chatButton\.click\(\)/);
  assert.match(worker, /command\.title \|\| livestream\.session_title \|\| ""/);
  assert.match(worker, /title: clipTitle/);
});

test("browser companion always supplies Kick's required title string", async () => {
  const worker = await readFile("companion-extension/service-worker.js", "utf8");

  assert.doesNotMatch(worker, /if \(command\.title\) detail\.title/);
  assert.match(worker, /const clipTitle = String\([^)]+\)\.trim\(\)\.slice\(0, 50\)/);
  assert.match(worker, /const detail = \{ mode: "command", source, duration: command\.duration, title: clipTitle \}/);
});
