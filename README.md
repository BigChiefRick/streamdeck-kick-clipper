# Kick Clip Creator for Stream Deck

One Stream Deck press creates the previous 30 seconds of a live Kick channel and posts the resulting clip URL to that channel's chat.

The default channel is `ticklefitz`. The action is designed for a moderator team: every moderator uses the same distributable files but their own signed-in Kick browser session. No shared KickBot account, bot token, password, cookie, OAuth token, client ID, or client secret is needed.

## How it works

Kick handles `/clip 30` inside its website rather than as a normal chat API message. The solution therefore has two local pieces:

1. The **Stream Deck plugin** receives the physical key press and sends a clip request over a localhost-only bridge.
2. The **Chrome/Edge companion** finds the configured Kick channel in the moderator's signed-in browser, opens a background tab if necessary, invokes Kick's native 30-second clip command, and clicks **Chat** on the completed clip.

The Kick page does not need to be focused or visible. The browser must be running and signed in to the moderator's Kick account.

## Per-moderator setup

Each moderator installs both files from `dist`:

1. Double-click `com.bigchiefrick.kickclipper.streamDeckPlugin` and approve the Stream Deck installation.
2. Extract `kick-clip-creator-companion.zip` to a permanent folder.
3. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
4. Enable **Developer mode**, select **Load unpacked**, and choose the extracted companion folder.
5. Sign in to Kick in that browser using the moderator's own account.
6. In Stream Deck, drag **Kick Clip Creator > Clip Previous 30s** onto a key.
7. Leave the channel set to `ticklefitz`, or enter another Kick channel slug.
8. Click the companion extension icon once and confirm it says **Connected to Stream Deck**.

Pressing the Stream Deck key now works while another application, browser tab, or window is focused.

## Key feedback

- `CLIPPING / PLEASE WAIT` - the browser is creating the clip.
- `POSTED / TO CHAT` - the clip URL was shared to Kick chat.
- `OFFLINE / NO LIVE STREAM` - the configured channel is not live.
- `CLIPPED / CHAT FAILED` - Kick created the clip but its Chat action was unavailable.
- `BROWSER / NOT READY` - install/enable the companion or start the signed-in browser.
- `SETUP / OPEN SETTINGS` - the configured channel or title is invalid.

## Privacy and security

- The bridge listens only on `127.0.0.1:17777` and accepts Chromium-extension origins only.
- The companion uses Kick inside the signed-in browser tab. It does not extract, copy, store, or transmit the browser's Kick cookies or tokens.
- All work occurs locally between Stream Deck, the browser companion, and Kick.

An obsolete version of this public repository committed a Kick client secret. That secret must remain rotated; deleting it from the current branch does not remove it from Git history. The current design does not use that credential.

## Build and validate

```powershell
npm install
npm test
npm run typecheck
npm run build
npm run validate
npm run pack
```

`npm run pack` produces:

- `dist/com.bigchiefrick.kickclipper.streamDeckPlugin`
- `dist/kick-clip-creator-companion.zip`

## Validation boundary

Automated tests cover settings validation, key rendering, the authenticated-extension-only localhost bridge, command/result exchange, manifest permissions, background-tab behavior, and the presence of Kick clip/share integration points.

A live end-to-end test requires the target Kick channel to be broadcasting. This integration follows Kick's current first-party website behavior and may need an update if Kick changes its internal clip command or clip-result interface.
