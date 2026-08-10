import assert from "node:assert/strict";
import test from "node:test";
import WebSocket from "ws";

import { BrowserBridge, isAllowedCompanionOrigin } from "../src/bridge";

const extensionOrigin = "chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function waitForMessage(socket: WebSocket): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    socket.once("message", (raw) => resolve(JSON.parse(String(raw)) as Record<string, unknown>));
  });
}

test("only Chromium extension origins can connect", () => {
  assert.equal(isAllowedCompanionOrigin(extensionOrigin), true);
  assert.equal(isAllowedCompanionOrigin("edge-extension://bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"), true);
  assert.equal(isAllowedCompanionOrigin("https://kick.com"), false);
  assert.equal(isAllowedCompanionOrigin(undefined), false);
});

test("bridge sends a clip request and resolves the companion result", async () => {
  const bridge = new BrowserBridge(0);
  await bridge.start();
  const socket = new WebSocket(`ws://127.0.0.1:${bridge.listeningPort()}`, { origin: extensionOrigin });

  try {
    await new Promise<void>((resolve, reject) => {
      socket.once("open", resolve);
      socket.once("error", reject);
    });
    socket.send(JSON.stringify({ type: "hello" }));
    assert.deepEqual(await waitForMessage(socket), { type: "hello-ack" });
    assert.equal(bridge.isReady(), true);

    const resultPromise = bridge.requestClip({ channelSlug: "ticklefitz", duration: 30, title: "" });
    const request = await waitForMessage(socket);
    assert.equal(request.type, "clip");
    assert.equal(request.channelSlug, "ticklefitz");
    assert.equal(request.duration, 30);
    assert.equal(typeof request.id, "string");

    socket.send(JSON.stringify({
      id: request.id,
      type: "result",
      status: "success",
      clipUrl: "https://kick.com/ticklefitz/clips/example"
    }));
    assert.deepEqual(await resultPromise, {
      status: "success",
      clipUrl: "https://kick.com/ticklefitz/clips/example",
      message: undefined
    });
  } finally {
    socket.close();
    await bridge.stop();
  }
});
