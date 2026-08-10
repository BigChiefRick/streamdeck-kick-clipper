const statusElement = document.querySelector("#status");

chrome.runtime.sendMessage({ type: "status" }, (status) => {
  const connected = !chrome.runtime.lastError && status?.connected;
  statusElement.textContent = connected ? "Connected to Stream Deck" : "Waiting for Stream Deck plugin";
  statusElement.className = connected ? "connected" : "waiting";
});
