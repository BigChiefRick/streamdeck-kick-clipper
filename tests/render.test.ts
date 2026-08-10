import assert from "node:assert/strict";
import test from "node:test";

import { renderKeySvg, svgDataUri } from "../src/render";

test("ready and success key states are glanceable", () => {
  assert.match(renderKeySvg("ready"), />CLIP</);
  assert.match(renderKeySvg("ready"), />30 SEC</);
  assert.match(renderKeySvg("success"), />POSTED</);
  assert.match(renderKeySvg("success"), />TO CHAT</);
});

test("SVG data is encoded for Stream Deck", () => {
  assert.match(svgDataUri(renderKeySvg("working")), /^data:image\/svg\+xml,/);
});
