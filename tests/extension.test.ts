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
});
