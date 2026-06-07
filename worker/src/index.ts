import { TogetherSessionManager } from "./durable-object";

export interface Env {
  TOGETHER_KV: KVNamespace;
  TOGETHER_SESSION: DurableObjectNamespace;
  JWT_SECRET: string;
}

// Re-export the Durable Object class for Cloudflare Workers
export { TogetherSessionManager };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Dynamic CORS Headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // 1. Auth Endpoint
      if (url.pathname === "/login" && request.method === "POST") {
        const { username, password } = await request.json<any>();

        // Pre-defined private logins
        const USERS: Record<string, string> = {
          zain: "together_zain_2026", // Pre-defined private passwords
          gf: "together_gf_2026",
        };

        if (USERS[username] && USERS[username] === password) {
          // Sign a simple JWT or a secure auth token
          const header = b64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
          const payload = b64Url(
            JSON.stringify({
              username,
              exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
            })
          );
          const rawSig = await crypto.subtle.sign(
            "HMAC",
            await crypto.subtle.importKey(
              "raw",
              new TextEncoder().encode(env.JWT_SECRET),
              { name: "HMAC", hash: "SHA-256" },
              false,
              ["sign"]
            ),
            new TextEncoder().encode(`${header}.${payload}`)
          );
          const signature = b64Sign(rawSig);
          const token = `${header}.${payload}.${signature}`;

          return new Response(
            JSON.stringify({
              success: true,
              token,
              username,
              partnerName: username === "zain" ? "gf" : "zain",
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        return new Response(JSON.stringify({ error: "Unauthorized credentials" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2. Validate token for all other operations (excluding websockets which validate inside the DO or URL params)
      const authHeader = request.headers.get("Authorization");
      let username: string | null = null;

      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        username = await verifyJWT(token, env.JWT_SECRET);
      }

      // 3. WS Endpoint routing directly to DO
      if (url.pathname === "/ws") {
        // The token is passed via query string for WebSocket handshakes
        const wsToken = url.searchParams.get("token");
        if (wsToken) {
          username = await verifyJWT(wsToken, env.JWT_SECRET);
        }

        if (!username) {
          return new Response("Unauthorized WebSocket Connection", { status: 401 });
        }

        // Forward to Durable Object matching a single static workspace namespace ID (since there is only 1 room)
        const id = env.TOGETHER_SESSION.idFromName("together_private_room");
        const doStub = env.TOGETHER_SESSION.get(id);

        // Forward the fetch containing WS upgrade
        const newUrl = new URL(request.url);
        newUrl.searchParams.set("username", username);
        const wsRequest = new Request(newUrl.toString(), request);
        return await doStub.fetch(wsRequest);
      }

      // All remaining API calls must be verified
      if (!username) {
        return new Response(JSON.stringify({ error: "Missing/Invalid Auth Token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 4. Save Message history
      if (url.pathname === "/send-message" && request.method === "POST") {
        const payload = await request.json<any>();
        const msgId = payload.id || Math.random().toString(36).substr(2, 9);
        const messageObj = {
          id: msgId,
          sender: username,
          content: payload.content,
          timestamp: Date.now(),
          status: "delivered",
        };

        // Write directly to KV (key: messages:username:<timestamp>)
        await env.TOGETHER_KV.put(
          `messages:${Date.now()}:${msgId}`,
          JSON.stringify(messageObj)
        );

        // Also trigger real-time sync inside Durable Object if it's running
        const doId = env.TOGETHER_SESSION.idFromName("together_private_room");
        const doStub = env.TOGETHER_SESSION.get(doId);
        await doStub.fetch(
          new Request(`http://do/internal-msg`, {
            method: "POST",
            body: JSON.stringify({ type: "message", ...messageObj }),
          })
        );

        return new Response(JSON.stringify({ success: true, message: messageObj }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 5. Query Message history
      if (url.pathname === "/messages" && request.method === "GET") {
        // List from KV with prefix 'messages:'
        const list = await env.TOGETHER_KV.list({ prefix: "messages:" });
        const messages = [];
        for (const key of list.keys) {
          const val = await env.TOGETHER_KV.get(key.name);
          if (val) {
            messages.push(JSON.parse(val));
          }
        }

        // Sort by timestamp
        messages.sort((a, b) => a.timestamp - b.timestamp);

        return new Response(JSON.stringify({ success: true, messages }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 6. Clear chat history
      if (url.pathname === "/messages/clear" && request.method === "DELETE") {
        const list = await env.TOGETHER_KV.list({ prefix: "messages:" });
        for (const key of list.keys) {
          await env.TOGETHER_KV.delete(key.name);
        }
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Endpoint Not Found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message || "Internal Server Error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};

// --- Helpers for JWT validation on Cloudflare without external npm dependencies ---
function b64Url(str: string): string {
  return btoa(str).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64Sign(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function verifyJWT(token: string, secret: string): Promise<string | null> {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split(".");
    if (!headerB64 || !payloadB64 || !signatureB64) return null;

    // Verify HMAC
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const binSig = atob(signatureB64.replace(/-/g, "+").replace(/_/g, "/"));
    const sigBytes = new Uint8Array(binSig.length);
    for (let i = 0; i < binSig.length; i++) {
      sigBytes[i] = binSig.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify("HMAC", key, sigBytes, data);
    if (!isValid) return null;

    // Decode Payload
    const decodedPayload = JSON.parse(
      atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"))
    );
    if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }

    return decodedPayload.username || null;
  } catch (e) {
    return null;
  }
}
