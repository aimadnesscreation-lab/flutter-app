interface SessionConnection {
  socket: WebSocket;
  username: string;
  isOnline: boolean;
}

export class TogetherSessionManager {
  state: any;
  env: any;
  connections: Map<string, SessionConnection>;

  constructor(state: any, env: any) {
    this.state = state;
    this.env = env;
    this.connections = new Map();
  }

  async fetch(request: Request) {
    const url = new URL(request.url);

    // Only allow websocket upgrade
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket Upgrade", { status: 426 });
    }

    const username = url.searchParams.get("username");
    if (!username || (username !== "zain" && username !== "gf")) {
      return new Response("Invalid partner username", { status: 400 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    await this.handleConnection(server, username);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async handleConnection(ws: WebSocket, username: string) {
    ws.accept();

    // Store socket
    const id = `${username}_${Math.random().toString(36).substr(2, 9)}`;
    this.connections.set(id, { socket: ws, username, isOnline: true });

    // Announce online status
    this.broadcast({
      type: "status",
      sender: username,
      isOnline: true,
      timestamp: Date.now(),
    });

    ws.addEventListener("message", (msg) => {
      try {
        const data = JSON.parse(msg.data as string);

        // Standardize event types: message, typing, signal (WebRTC Offer/Answer/ICE)
        if (data.type === "message") {
          // Broadcast to everyone else
          this.broadcast(
            {
              type: "message",
              id: data.id || Math.random().toString(36).substr(2, 9),
              sender: username,
              content: data.content,
              timestamp: Date.now(),
              status: "delivered",
            },
            id
          );
        } else if (data.type === "typing") {
          this.broadcast(
            {
              type: "typing",
              sender: username,
              isTyping: data.isTyping || false,
            },
            id
          );
        } else if (data.type === "signal") {
          // WebRTC Signaling (offer, answer, candidate)
          this.broadcast(
            {
              type: "signal",
              sender: username,
              signalType: data.signalType, // "offer" | "answer" | "candidate"
              payload: data.payload,
            },
            id
          );
        } else if (data.type === "heartbeat") {
          ws.send(JSON.stringify({ type: "heartbeat_ack" }));
        }
      } catch (e) {
        console.error("Failed to parse websocket message", e);
      }
    });

    ws.addEventListener("close", () => {
      this.connections.delete(id);
      // Check if user has other sessions active, otherwise announce offline
      const isStillOnline = [...this.connections.values()].some(
        (c) => c.username === username
      );
      if (!isStillOnline) {
        this.broadcast({
          type: "status",
          sender: username,
          isOnline: false,
          timestamp: Date.now(),
        });
      }
    });

    // Send current presence of the partner to this newly connected user
    const partner = username === "zain" ? "gf" : "zain";
    const isPartnerOnline = [...this.connections.values()].some(
      (c) => c.username === partner
    );
    ws.send(
      JSON.stringify({
        type: "init",
        partnerOnline: isPartnerOnline,
      })
    );
  }

  broadcast(message: any, excludeId?: string) {
    const payload = JSON.stringify(message);
    for (const [id, conn] of this.connections.entries()) {
      if (id !== excludeId) {
        try {
          conn.socket.send(payload);
        } catch (e) {
          console.error("Failed to write to socket", id, e);
          this.connections.delete(id);
        }
      }
    }
  }
}
