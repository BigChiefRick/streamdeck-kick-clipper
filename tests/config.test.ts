import assert from "node:assert/strict";
import test from "node:test";

import { ConfigurationError, resolveSettings } from "../src/config";

test("resolveSettings defaults to TickleFitz and a blank title", () => {
  assert.deepEqual(resolveSettings({}), { channelSlug: "ticklefitz", clipTitle: "" });
});

test("resolveSettings normalizes a channel slug", () => {
  assert.deepEqual(resolveSettings({ channelSlug: "  TickleFitz  ", clipTitle: " Finish Line " }), {
    channelSlug: "ticklefitz",
    clipTitle: "Finish Line"
  });
});

test("resolveSettings rejects invalid slugs and long titles", () => {
  assert.throws(() => resolveSettings({ channelSlug: "not a channel" }), ConfigurationError);
  assert.throws(() => resolveSettings({ clipTitle: "x".repeat(51) }), ConfigurationError);
});
