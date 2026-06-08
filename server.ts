import express from "express";
import path from "path";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
dotenv.config();

// Load user credentials from environment (USERS JSON array)
const rawUsers = process.env.USERS ||
  '[{"username":"zain","password":"together_zain_2026"},{"username":"gf","password":"together_gf_2026"}]';
const USERS: Array<{ username: string; password: string }> = (() => {
  try {
    return JSON.parse(rawUsers);
  } catch {
    return [
      { username: "zain", password: "together_zain_2026" },
      { username: "gf", password: "together_gf_2026" },
    ];
  }
})();

const VALID_USERNAMES = USERS.map((u) => u.username);
type Username = (typeof VALID_USERNAMES)[number];

interface UserConnection {
  ws: WebSocket;
  username: Username;
}

function getPartnerName(currentUser: string): string {
  return USERS.find((u) => u.username !== currentUser)?.username || "partner";
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ noServer: true });
  const PORT = 3000;

  app.use(express.json());

  // In-memory message history for direct mock of KV/DO persistence
  let messageHistory: Array<{
    id: string;
    sender: Username;
    content: string;
    timestamp: number;
    status: string;
  }> = [
    {
      id: "init_1",
      sender: VALID_USERNAMES[0] as Username,
      content: "Hey, setting up this together space for us! Clean and minimal.",
      timestamp: Date.now() - 3600000,
      status: "read"
    },
    {
      id: "init_2",
      sender: VALID_USERNAMES[1] as Username,
      content: "Oh wow, I love how lightweight it feels. Completely private!",
      timestamp: Date.now() - 3500000,
      status: "read"
    }
  ];

  // Store active websocket connections
  const activeConnections = new Map<string, UserConnection>();

  // REST endpoints
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;

    // Validate against env-driven user credentials
    const matchedUser = USERS.find((u) => u.username === username && u.password === password);

    if (matchedUser) {
      return res.json({
        success: true,
        token: `mock_jwt_for_${username}_${Date.now()}`,
        username,
        partnerName: getPartnerName(username)
      });
    }

    return res.status(401).json({ error: "Invalid designated partner credentials" });
  });

  app.get("/api/messages", (req, res) => {
    res.json({ success: true, messages: messageHistory });
  });

  app.post("/api/send-message", (req, res) => {
    const { sender, content } = req.body;
    if (!sender || !content) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    const newMessage = {
      id: Math.random().toString(36).substr(2, 9),
      sender,
      content,
      timestamp: Date.now(),
      status: "delivered"
    };

    messageHistory.push(newMessage);

    // Broadcast message to any websockets
    broadcast({
      type: "message",
      ...newMessage
    });

    res.json({ success: true, message: newMessage });
  });

  app.delete("/api/messages/clear", (req, res) => {
    messageHistory = [];
    broadcast({ type: "clearChat" });
    res.json({ success: true });
  });

  // Upgrade handling for WebSockets
  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    if (url.pathname === "/ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // WebSocket connections handler
  wss.on("connection", (ws: WebSocket, request) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    const usernameParam = url.searchParams.get("username") || VALID_USERNAMES[0];
    const username = VALID_USERNAMES.includes(usernameParam) ? (usernameParam as Username) : (VALID_USERNAMES[0] as Username);

    const connectionId = `${username}_${Math.random().toString(36).substr(2, 9)}`;
    activeConnections.set(connectionId, { ws, username });

    // Announce connection state
    broadcast({
      type: "presence",
      username,
      isOnline: true
    });

    ws.on("message", (raw) => {
      try {
        const payload = JSON.parse(raw.toString());
        
        switch (payload.type) {
          case "message":
            const msg = {
              id: Math.random().toString(36).substr(2, 9),
              sender: username,
              content: payload.content,
              timestamp: Date.now(),
              status: "delivered"
            };
            messageHistory.push(msg);
            // Broadcast to other sessions
            broadcast({
              type: "message",
              ...msg
            });
            break;

          case "typing":
            broadcast({
              type: "typing",
              sender: username,
              isTyping: payload.isTyping
            }, connectionId);
            break;

          case "signal":
            // RTC Signaling (offers, answers, candidates, and triggers)
            broadcast({
              type: "signal",
              sender: username,
              signalType: payload.signalType,
              payload: payload.payload
            }, connectionId);
            break;

          case "clearChat":
            messageHistory = [];
            broadcast({ type: "clearChat" });
            break;
        }
      } catch (err) {
        console.error("WebSocket message error", err);
      }
    });

    ws.on("close", () => {
      activeConnections.delete(connectionId);
      const isOnline = Array.from(activeConnections.values()).some(
        c => c.username === username
      );
      if (!isOnline) {
        broadcast({
          type: "presence",
          username,
          isOnline: false
        });
      }
    });

    // Provide immediate initial data
    const partnerName = getPartnerName(username);
    const isPartnerOnline = Array.from(activeConnections.values()).some(
      c => c.username === partnerName
    );
    ws.send(JSON.stringify({
      type: "init",
      partnerOnline: isPartnerOnline,
      history: messageHistory
    }));
  });

  // Helper to broadcast to connected users
  function broadcast(obj: any, excludeConnectionId?: string) {
    const raw = JSON.stringify(obj);
    activeConnections.forEach((conn, id) => {
      if (id !== excludeConnectionId && conn.ws.readyState === WebSocket.OPEN) {
        try {
          conn.ws.send(raw);
        } catch (e) {
          activeConnections.delete(id);
        }
      }
    });
  }

  // API endpoint to expose user config (for the simulator UI)
  app.get("/api/config", (req, res) => {
    const safeUsers = USERS.map(({ username, password: _p }) => ({
      username,
      // Password is intentionally excluded for security; client logs in via /api/login
    }));
    res.json({ success: true, users: safeUsers });
  });

  // Vite middleware for rendering the responsive dashboard in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Together private space running on port ${PORT}`);
  });
}

startServer();
