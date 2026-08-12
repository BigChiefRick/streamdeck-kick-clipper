const BRIDGE_URL = "ws://127.0.0.1:17777";
const RECONNECT_ALARM = "kick-clip-bridge-reconnect";
const KICK_TAB_PATTERNS = ["https://kick.com/*", "https://www.kick.com/*"];

let socket;
let reconnectTimer;
let keepAliveTimer;
let clipQueue = Promise.resolve();

function bridgeConnected() {
  return socket?.readyState === WebSocket.OPEN;
}

function clearSocketTimers() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (keepAliveTimer) clearInterval(keepAliveTimer);
  reconnectTimer = undefined;
  keepAliveTimer = undefined;
}

function scheduleReconnect(delay = 2_000) {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = undefined;
    connectBridge();
  }, delay);
}

function connectBridge() {
  if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) return;
  clearSocketTimers();

  try {
    socket = new WebSocket(BRIDGE_URL);
  } catch {
    scheduleReconnect();
    return;
  }

  socket.addEventListener("open", () => {
    socket.send(JSON.stringify({ type: "hello", version: chrome.runtime.getManifest().version }));
    keepAliveTimer = setInterval(() => {
      if (bridgeConnected()) socket.send(JSON.stringify({ type: "ping" }));
    }, 20_000);
  });

  socket.addEventListener("message", (event) => {
    let message;
    try {
      message = JSON.parse(String(event.data));
    } catch {
      return;
    }

    if (message?.type !== "clip" || typeof message.id !== "string") return;
    clipQueue = clipQueue
      .then(() => handleClipCommand(message))
      .then((result) => sendResult(message.id, result))
      .catch((error) => sendResult(message.id, {
        status: "error",
        message: error instanceof Error ? error.message : "The browser companion failed unexpectedly."
      }));
  });

  socket.addEventListener("close", () => {
    socket = undefined;
    clearSocketTimers();
    scheduleReconnect();
  });

  socket.addEventListener("error", () => {
    socket?.close();
  });
}

function sendResult(id, result) {
  if (!bridgeConnected()) return;
  socket.send(JSON.stringify({ id, type: "result", ...result }));
}

function sendProgress(id, stage, message) {
  if (!bridgeConnected()) return;
  socket.send(JSON.stringify({ id, type: "progress", stage, message }));
}

function channelSlugFromTab(tab, expectedSlug) {
  if (!tab.url) return false;
  try {
    const url = new URL(tab.url);
    const firstPathPart = url.pathname.split("/").filter(Boolean)[0]?.toLowerCase();
    return (url.hostname === "kick.com" || url.hostname === "www.kick.com") && firstPathPart === expectedSlug;
  } catch {
    return false;
  }
}

async function waitForTab(tabId, timeoutMs = 20_000) {
  const existing = await chrome.tabs.get(tabId);
  if (existing.status === "complete") return existing;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error("The Kick channel tab did not finish loading."));
    }, timeoutMs);

    function listener(updatedTabId, changeInfo, tab) {
      if (updatedTabId !== tabId || changeInfo.status !== "complete") return;
      clearTimeout(timeout);
      chrome.tabs.onUpdated.removeListener(listener);
      resolve(tab);
    }

    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function findOrOpenChannelTab(channelSlug) {
  const tabs = await chrome.tabs.query({ url: KICK_TAB_PATTERNS });
  const matching = tabs.find((tab) => channelSlugFromTab(tab, channelSlug));
  if (matching?.id) return waitForTab(matching.id);

  const created = await chrome.tabs.create({
    active: false,
    url: `https://kick.com/${encodeURIComponent(channelSlug)}`
  });
  if (!created.id) throw new Error("The browser could not open the Kick channel tab.");
  return waitForTab(created.id);
}

async function handleClipCommand(message) {
  const channelSlug = String(message.channelSlug || "").trim().toLowerCase();
  if (!/^[a-z0-9_-]+$/.test(channelSlug)) {
    return { status: "error", message: "The Stream Deck action has an invalid Kick channel." };
  }

  sendProgress(message.id, "command-received", `channel=${channelSlug}`);
  const tab = await findOrOpenChannelTab(channelSlug);
  if (!tab.id) return { status: "error", message: "No usable Kick browser tab was found." };
  sendProgress(message.id, "channel-tab-ready", `channel=${channelSlug}`);

  const injection = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: "MAIN",
    args: [{ channelSlug, duration: 30, title: String(message.title || "").trim() }],
    func: async (command) => {
      const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
      const requestJson = async (url, options) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15_000);
        try {
          const response = await fetch(url, {
            credentials: "include",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              "X-Requested-With": "XMLHttpRequest"
            },
            signal: controller.signal,
            ...options
          });
          const text = await response.text();
          let payload;
          try {
            payload = text ? JSON.parse(text) : null;
          } catch {
            payload = null;
          }
          if (!response.ok) {
            const detail = payload?.message || payload?.error || text.slice(0, 160) || response.statusText;
            throw new Error(`Kick request failed (${response.status}): ${detail}`);
          }
          return payload;
        } finally {
          clearTimeout(timeout);
        }
      };

      try {
        const response = await fetch(`/api/v2/channels/${encodeURIComponent(command.channelSlug)}`, {
          credentials: "include",
          headers: { Accept: "application/json" }
        });
        if (!response.ok) {
          return {
            status: "error",
            message: response.status === 401 || response.status === 403
              ? "Sign in to Kick in this browser, then press the Stream Deck key again."
              : `Kick channel lookup failed (${response.status}).`
          };
        }

        const channel = await response.json();
        const livestream = channel?.livestream;
        if (!livestream) {
          return { status: "offline", message: `${command.channelSlug} is offline.` };
        }

        const clipTitle = String(command.title || livestream.session_title || "").trim().slice(0, 50);
        const streamSlug = String(livestream.slug || "").trim();
        if (!streamSlug) {
          return { status: "error", message: "Kick did not return a live stream identifier." };
        }

        // Use the same live-clip endpoints shipped in Kick's current web app.
        // This avoids the interactive creator dialog and mirrors the direct
        // create-then-share behavior of mature Stream Deck clip plugins.
        const initiated = await requestJson(
          `/api/internal/v1/livestreams/${encodeURIComponent(streamSlug)}/clips`,
          { method: "POST", body: JSON.stringify({ duration: 180 }) }
        );
        const temporaryClip = initiated?.data || initiated;
        const clipId = String(temporaryClip?.id || "").trim();
        const sourceDuration = Number(temporaryClip?.source_duration);
        if (!clipId || !Number.isFinite(sourceDuration)) {
          return { status: "error", message: "Kick returned an invalid live clip initiation response." };
        }

        const finalized = await requestJson(
          `/api/internal/v1/livestreams/${encodeURIComponent(streamSlug)}/clips/${encodeURIComponent(clipId)}/finalize`,
          {
            method: "POST",
            body: JSON.stringify({
              duration: command.duration,
              start_time: Math.max(0, sourceDuration - command.duration),
              title: clipTitle
            })
          }
        );
        const finalClip = finalized?.data || finalized;
        const finalClipId = String(finalClip?.id || "").trim();
        if (!finalClipId) {
          return { status: "error", message: "Kick returned an invalid finalized clip response." };
        }

        const clipUrl = `https://kick.com/${command.channelSlug}/clips/${finalClipId}`;
        const chatInput = document.querySelector('[data-testid="chat-input"][contenteditable="true"]');
        const chatButton = document.querySelector("#send-message-button");
        if (!chatInput || !chatButton || chatButton.disabled) {
          return { status: "chat-error", clipUrl, message: "The clip was created, but the Kick chat input was unavailable." };
        }

        chatInput.focus();
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(chatInput);
        selection?.removeAllRanges();
        selection?.addRange(range);
        document.execCommand("delete", false);
        const inserted = document.execCommand("insertText", false, clipUrl);
        if (!inserted || String(chatInput.textContent || "").trim() !== clipUrl) {
          chatInput.textContent = clipUrl;
          chatInput.dispatchEvent(new InputEvent("input", {
            bubbles: true,
            inputType: "insertText",
            data: clipUrl
          }));
        }
        await sleep(100);
        chatButton.click();

        const chatDeadline = Date.now() + 8_000;
        while (Date.now() < chatDeadline) {
          const chatroom = document.querySelector('[data-testid="chatroom-messages"]');
          if (chatroom?.textContent?.includes(clipUrl)) {
            return { status: "success", clipUrl };
          }
          await sleep(200);
        }
        return { status: "chat-error", clipUrl, message: "The clip was created, but the link was not confirmed in Kick chat." };
      } catch (error) {
        return {
          status: "error",
          message: error instanceof Error ? error.message : "Kick clip automation failed in the browser tab."
        };
      }
    }
  });

  const result = injection[0]?.result || { status: "error", message: "The Kick tab returned no clip result." };
  sendProgress(
    message.id,
    result.status === "success" ? "chat-posted" : "browser-result",
    result.clipUrl || result.message
  );
  return result;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "status") return false;
  sendResponse({ connected: bridgeConnected() });
  return false;
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(RECONNECT_ALARM, { periodInMinutes: 1 });
  connectBridge();
});
chrome.runtime.onStartup.addListener(connectBridge);
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === RECONNECT_ALARM && !bridgeConnected()) connectBridge();
});

chrome.alarms.create(RECONNECT_ALARM, { periodInMinutes: 1 });
connectBridge();
