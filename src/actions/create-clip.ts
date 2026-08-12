import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";

import { BrowserBridge, BrowserBridgeError } from "../bridge";
import { ConfigurationError, resolveSettings, type KickClipSettings } from "../config";
import { renderKeySvg, svgDataUri, type KeyState } from "../render";

@action({ UUID: "com.bigchiefrick.kickclipper.createclip" })
export class CreateClipAction extends SingletonAction<KickClipSettings> {
  private readonly active = new Set<string>();

  constructor(private readonly bridge: BrowserBridge) {
    super();
  }

  override async onWillAppear(ev: WillAppearEvent<KickClipSettings>): Promise<void> {
    if (!ev.action.isKey()) return;
    await ev.action.setImage(svgDataUri(renderKeySvg("ready")));
  }

  override async onKeyDown(ev: KeyDownEvent<KickClipSettings>): Promise<void> {
    if (!ev.action.isKey() || this.active.has(ev.action.id)) return;
    this.active.add(ev.action.id);
    await ev.action.setImage(svgDataUri(renderKeySvg("working")));

    try {
      const settings = resolveSettings(await ev.action.getSettings());
      streamDeck.logger.info(`Kick clip key pressed: channel=${settings.channelSlug}`);
      const result = await this.bridge.requestClip({
        channelSlug: settings.channelSlug,
        duration: 30,
        title: settings.clipTitle
      });
      if (result.status === "offline") {
        await this.fail(ev, "offline", result.message || `${settings.channelSlug} is offline.`);
        return;
      }
      if (result.status === "chat-error") {
        await this.fail(ev, "chat-error", `Clip created but chat post failed; clip=${result.clipUrl || "unknown"}`);
        return;
      }
      if (result.status !== "success" || !result.clipUrl) {
        await this.fail(ev, "clip-error", result.message || "Kick clip creation failed.");
        return;
      }

      await ev.action.setImage(svgDataUri(renderKeySvg("success")));
      await ev.action.showOk();
      streamDeck.logger.info(`Kick clip created and posted: ${result.clipUrl}`);
      setTimeout(() => ev.action.setImage(svgDataUri(renderKeySvg("ready"))), 4_000);
    } catch (error) {
      const state: KeyState = error instanceof ConfigurationError
        ? "setup"
        : error instanceof BrowserBridgeError
          ? "browser-error"
          : "clip-error";
      const message = error instanceof Error ? error.message : "Unexpected Kick Clip Creator error.";
      await this.fail(ev, state, message);
    } finally {
      this.active.delete(ev.action.id);
    }
  }

  private async fail(
    ev: KeyDownEvent<KickClipSettings>,
    state: KeyState,
    message: string
  ): Promise<void> {
    if (!ev.action.isKey()) return;
    await ev.action.setImage(svgDataUri(renderKeySvg(state)));
    await ev.action.showAlert();
    streamDeck.logger.error(message);
    setTimeout(() => ev.action.isKey() && ev.action.setImage(svgDataUri(renderKeySvg("ready"))), 5_000);
  }
}
