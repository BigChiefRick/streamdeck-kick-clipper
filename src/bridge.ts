import { randomUUID } from "node:crypto";
import WebSocket, { WebSocketServer } from "ws";

export type ClipCommand = {
  channelSlug: string;
  duration: 30;
  title: string;
};

export type ClipBridgeResult = {
  status: "success" | "offline" | "chat-error" | "error";
  clipUrl?: string;
  message?: string;
};

type BridgeMessage = {
  id?: string;
  type?: string;
  status?: ClipBridgeResult["status"];
  clipUrl?: string;
  message?: string;
};

export class BrowserBridgeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BrowserBridgeError";
  }
}

export function isAllowedCompanionOrigin(origin: string | undefined): boolean {
  return !!origin && /^(?:chrome|edge)-extension:\/\/[a-p]{32}$/.test(origin);
}

export class BrowserBridge {
  private server?: WebSocketServer;
  private companion?: WebSocket;
  private readonly pending = new Map<string, {
    resolve: (result: ClipBridgeResult) => void;
    reject: (error: Error) => void;
    timer: NodeJS.Timeout;
  }>();

  constructor(private readonly port = 17777) {}

  start(): Promise<void> {
    if (this.server) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const server = new WebSocketServer({
        host: "127.0.0.1",
        port: this.port,
        verifyClient: ({ origin }, done) => done(isAllowedCompanionOrigin(origin), 403, "Browser companion only")
      });
      this.server = server;
      server.once("listening", () => resolve());
      server.once("error", (error) => {
        this.server = undefined;
        reject(new BrowserBridgeError(`Browser bridge failed to start: ${error.message}`));
      });
      server.on("connection", (socket) => {
        socket.on("message", (raw) => this.handleMessage(socket, String(raw)));
        socket.on("close", () => {
          if (this.companion === socket) this.companion = undefined;
        });
      });
    });
  }

  async stop(): Promise<void> {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new BrowserBridgeError("Browser bridge stopped."));
    }
    this.pending.clear();
    this.companion?.close();
    this.companion = undefined;
    const server = this.server;
    this.server = undefined;
    if (!server) return;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  isReady(): boolean {
    return this.companion?.readyState === WebSocket.OPEN;
  }

  listeningPort(): number {
    const address = this.server?.address();
    return address && typeof address !== "string" ? address.port : this.port;
  }

  requestClip(command: ClipCommand): Promise<ClipBridgeResult> {
    if (!this.isReady() || !this.companion) {
      throw new BrowserBridgeError("Install or enable the Kick Clip Creator browser companion.");
    }
    const id = randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new BrowserBridgeError("The browser did not finish the clip within 60 seconds."));
      }, 60_000);
      this.pending.set(id, { resolve, reject, timer });
      this.companion!.send(JSON.stringify({ id, type: "clip", ...command }));
    });
  }

  private handleMessage(socket: WebSocket, raw: string): void {
    let message: BridgeMessage;
    try {
      message = JSON.parse(raw) as BridgeMessage;
    } catch {
      return;
    }
    if (message.type === "hello") {
      if (this.companion && this.companion !== socket) this.companion.close(1000, "Replaced by a newer companion");
      this.companion = socket;
      socket.send(JSON.stringify({ type: "hello-ack" }));
      return;
    }
    if (message.type === "ping") {
      socket.send(JSON.stringify({ type: "pong" }));
      return;
    }
    if (message.type !== "result" || !message.id || !message.status) return;
    const pending = this.pending.get(message.id);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pending.delete(message.id);
    pending.resolve({ status: message.status, clipUrl: message.clipUrl, message: message.message });
  }
}
