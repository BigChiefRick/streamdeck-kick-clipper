import streamDeck from "@elgato/streamdeck";

import { CreateClipAction } from "./actions/create-clip";
import { BrowserBridge } from "./bridge";

streamDeck.logger.setLevel("info");
const bridge = new BrowserBridge();
try {
  await bridge.start();
  streamDeck.logger.info("Browser companion bridge listening on 127.0.0.1:17777.");
} catch (error) {
  streamDeck.logger.error(error instanceof Error ? error.message : "Browser companion bridge failed to start.");
}
streamDeck.actions.registerAction(new CreateClipAction(bridge));
streamDeck.connect();
