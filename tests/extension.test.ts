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
  assert.match(worker, /\/api\/internal\/v1\/livestreams\/\$\{encodeURIComponent\(streamSlug\)\}\/clips/);
  assert.match(worker, /active: false/);
  assert.match(worker, /chatButton\.click\(\)/);
  assert.match(worker, /command\.title \|\| livestream\.session_title \|\| ""/);
  assert.match(worker, /duration: command\.duration/);
  assert.match(worker, /start_time: Math\.max\(0, sourceDuration - command\.duration\)/);
  assert.match(worker, /\[data-testid="chat-input"\]\[contenteditable="true"\]/);
  assert.match(worker, /#send-message-button/);
  assert.match(worker, /sendProgress\(message\.id, "command-received"/);
});

test("browser companion always supplies Kick's required clip title", async () => {
  const worker = await readFile("companion-extension/service-worker.js", "utf8");

  assert.match(worker, /const clipTitle = String\([^)]+\)\.trim\(\)\.slice\(0, 50\)/);
  assert.match(worker, /title: clipTitle/);
});

test("browser companion directly creates a live clip and confirms the chat post", async () => {
  const worker = await readFile("companion-extension/service-worker.js", "utf8");

  assert.doesNotMatch(worker, /openClipCreator/);
  assert.match(worker, /duration: 180/);
  assert.match(worker, /document\.execCommand\("insertText", false, clipUrl\)/);
  assert.match(worker, /chatButton\.click\(\)/);
  assert.match(worker, /chatroom\?\.textContent\?\.includes\(clipUrl\)/);
});
