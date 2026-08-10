export type KickClipSettings = {
  channelSlug?: string;
  clipTitle?: string;
};

export type ResolvedKickClipSettings = {
  channelSlug: string;
  clipTitle: string;
};

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export function resolveSettings(settings: KickClipSettings): ResolvedKickClipSettings {
  const resolved: ResolvedKickClipSettings = {
    channelSlug: String(settings.channelSlug || "ticklefitz").trim().toLowerCase(),
    clipTitle: String(settings.clipTitle || "").trim()
  };

  if (!resolved.channelSlug || !/^[a-z0-9_-]+$/i.test(resolved.channelSlug)) {
    throw new ConfigurationError("Enter a valid Kick channel slug.");
  }
  if (resolved.clipTitle.length > 50) throw new ConfigurationError("Clip titles cannot exceed 50 characters.");

  return resolved;
}
