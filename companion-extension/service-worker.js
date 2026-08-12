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

  const tab = await findOrOpenChannelTab(channelSlug);
  if (!tab.id) return { status: "error", message: "No usable Kick browser tab was found." };

  const injection = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: "MAIN",
    args: [{ channelSlug, duration: 30, title: String(message.title || "").trim() }],
    func: async (command) => {
      const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
      const elementValue = (element) => String(element?.value || element?.getAttribute?.("value") || element?.textContent || "").trim();
      const shareSelector = '[data-testid="clip-share-url"]';

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

        const priorUrls = new Set(
          Array.from(document.querySelectorAll(shareSelector))
            .map(elementValue)
            .filter((value) => value.includes("/clips/"))
        );
        const source = {
          type: "livestream",
          streamSlug: livestream.slug || command.channelSlug
        };
        if (livestream.vod_id) source.webVideoId = livestream.vod_id;

        const clipTitle = String(command.title || livestream.session_title || "").trim().slice(0, 50);
        const detail = { mode: "command", source, duration: command.duration, title: clipTitle };
        window.dispatchEvent(new CustomEvent("openClipCreator", { detail }));

        const clipDeadline = Date.now() + 50_000;
        let shareElement;
        let clipUrl = "";
        while (Date.now() < clipDeadline) {
          const candidates = Array.from(document.querySelectorAll(shareSelector));
          shareElement = candidates.find((candidate) => {
            const value = elementValue(candidate);
            return value.includes("/clips/") && !priorUrls.has(value);
          });
          if (shareElement) {
            clipUrl = elementValue(shareElement);
            break;
          }
          await sleep(250);
        }

        if (!shareElement || !clipUrl) {
          return {
            status: "error",
            message: "Kick did not produce a clip. Confirm this browser is signed in and allowed to clip the channel."
          };
        }

        const chatDeadline = Date.now() + 8_000;
        let chatButton;
        while (Date.now() < chatDeadline) {
          let container = shareElement.closest('[role="dialog"]') || shareElement.closest("dialog") || shareElement.parentElement;
          for (let depth = 0; container && depth < 8 && !chatButton; depth += 1, container = container.parentElement) {
            chatButton = Array.from(container.querySelectorAll("button"))
              .find((button) => button.textContent?.trim().toLowerCase() === "chat");
          }
          if (chatButton) break;
          await sleep(200);
        }

        if (!chatButton || chatButton.disabled) {
          return { status: "chat-error", clipUrl, message: "The clip was created, but Kick's Chat button was unavailable." };
        }

        chatButton.click();
        await sleep(750);
        return { status: "success", clipUrl };
      } catch (error) {
        return {
          status: "error",
          message: error instanceof Error ? error.message : "Kick clip automation failed in the browser tab."
        };
      }
    }
  });

  return injection[0]?.result || { status: "error", message: "The Kick tab returned no clip result." };
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
