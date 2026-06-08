import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send, Video, Phone, User, CheckCheck, Settings,
  Power, Shield, VideoOff, Volume2, VolumeX, Mic, MicOff,
  LogOut, History, MessageCircle, ArrowLeft, Camera
} from "lucide-react";

const API_BASE = "https://together-backend.dgfrii1800.workers.dev";
const WS_URL = "wss://together-backend.dgfrii1800.workers.dev/ws";
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

// Read allowed usernames from Vite env var (loaded from web/.env)
// Fallback ensures existing deployments still work.
const rawUsers = import.meta.env.VITE_USERS ||
  '[{"username":"zain"},{"username":"gf"}]';
const ALLOWED_USERS: string[] = (() => {
  try {
    return JSON.parse(rawUsers).map((u: any) => u.username);
  } catch {
    return ["zain", "gf"];
  }
})();

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: number;
  status: string;
}

type Screen = "splash" | "login" | "chat" | "calling" | "settings";
type CallState = "idle" | "ringing_in" | "ringing_out" | "connected";

// LocalStorage helpers for session & message persistence
const STORAGE_KEY = "together_session";
const MSG_CACHE_KEY = "together_messages";

function loadSession(): { token: string; username: string; partnerName: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.token && data.username && data.partnerName) return data;
    return null;
  } catch { return null; }
}

function saveSession(token: string, username: string, partnerName: string) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, username, partnerName }));
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

function loadCachedMessages(): Message[] {
  try {
    const raw = localStorage.getItem(MSG_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function cacheMessage(msg: Message) {
  try {
    const msgs = loadCachedMessages();
    const exists = msgs.some((m) => m.id === msg.id);
    if (!exists) {
      msgs.push(msg);
      localStorage.setItem(MSG_CACHE_KEY, JSON.stringify(msgs));
    }
  } catch { /* ignore */ }
}

// Play a notification chime using Web Audio API (no external files needed)
let audioCtx: AudioContext | null = null;
function playNotification() {
  if (document.visibilityState !== "hidden") return;
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    const ctx = audioCtx;
    if (ctx.state === "suspended") ctx.resume();

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc1.connect(gain1).connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(660, now + 0.12);
    gain2.gain.setValueAtTime(0.12, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.3);
  } catch (e) {
    console.warn("Notification sound failed:", e);
  }
}

// Show a browser OS notification popup
function showBrowserNotification(partnerName: string, content: string, tag = "together-message") {
  if (document.visibilityState !== "hidden") return;
  if (!("Notification" in window)) return;
  if (Notification.permission === "denied") return;
  if (Notification.permission === "granted") {
    new Notification("Together", {
      body: `${partnerName}: ${content}`,
      icon: "/favicon.ico",
      tag,
    });
  }
}

// Ringtone using Web Audio API (repeating ring pattern)
let ringtoneTimer: ReturnType<typeof setTimeout> | null = null;
function playRingtone() {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    const ctx = audioCtx;
    if (ctx.state === "suspended") ctx.resume();

    const ring = () => {
      const now = ctx.currentTime;
      // First ring burst: 440Hz for 0.5s
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(440, now);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc1.connect(gain1).connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.5);

      // Second ring burst: 440Hz for 0.5s after a 0.2s pause
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(440, now + 0.7);
      gain2.gain.setValueAtTime(0.2, now + 0.7);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
      osc2.connect(gain2).connect(ctx.destination);
      osc2.start(now + 0.7);
      osc2.stop(now + 1.2);
    };

    ring();
    // Repeat every 2 seconds (ring pattern + pause)
    ringtoneTimer = setInterval(ring, 2000);
  } catch (e) {
    console.warn("Ringtone failed:", e);
  }
}

function stopRingtone() {
  if (ringtoneTimer !== null) {
    clearInterval(ringtoneTimer);
    ringtoneTimer = null;
  }
}

export default function App() {
  // Restore session & messages from localStorage on mount
  const savedSession = useRef(loadSession());
  const cachedMessages = savedSession.current ? loadCachedMessages() : [];

  const initialScreen = savedSession.current ? "chat" : "splash";
  const initialUsername = savedSession.current?.username || "";
  const initialToken = savedSession.current?.token || "";
  const initialPartnerName = savedSession.current?.partnerName || "";

  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [username, setUsername] = useState(initialUsername);
  const [token, setToken] = useState(initialToken);
  const [partnerName, setPartnerName] = useState(initialPartnerName);
  const [messages, setMessages] = useState<Message[]>(cachedMessages);

  // Message ID set for dedup across server fetch + WS
  const seenIdsRef = useRef(new Set(cachedMessages.map((m) => m.id)));
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Chat state (initialized from localStorage cache above)
  const [inputText, setInputText] = useState("");
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);

  // Call state
  const [callType, setCallType] = useState<"audio" | "video">("video");
  const [callState, setCallState] = useState<CallState>("idle");
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [incomingCallPayload, setIncomingCallPayload] = useState<any>(null);

  // Refs
  const socketRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- Media & PeerConnection helpers ---
  const getMedia = async (audioOnly: boolean) => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: audioOnly ? false : { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      return stream;
    } catch (err) {
      // If video failed (e.g. camera in use by another tab), fall back to audio-only
      if (!audioOnly) {
        console.warn("Video getUserMedia failed, falling back to audio-only:", err);
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          localStreamRef.current = audioStream;
          return audioStream;
        } catch (err2) {
          console.error("Audio getUserMedia also failed:", err2);
          throw err2;
        }
      }
      throw err;
    }
  };

  const createPC = () => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate && socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: "signal", signalType: "candidate", payload: e.candidate.toJSON(),
        }));
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE state:", pc.iceConnectionState);
      if (pc.iceConnectionState === "disconnected" ||
          pc.iceConnectionState === "failed" ||
          pc.iceConnectionState === "closed") {
        cleanupMedia();
        setCallState("idle");
        setMuted(false);
        setCamOff(false);
        setScreen("chat");
        socketRef.current?.send(JSON.stringify({ type: "signal", signalType: "end", payload: {} }));
      }
    };

    pc.ontrack = (e) => {
      console.log("Remote track received:", e.track.kind);
      remoteStreamRef.current = e.streams[0];
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
      // If remote has no video but we expected video, downgrade to audio
      if (!e.streams[0]?.getVideoTracks().length) {
        setCallType("audio");
      }
      setCallState("connected");
    };

    return pc;
  };

  const addLocalTracks = (pc: RTCPeerConnection, stream: MediaStream) => {
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
  };

  const cleanupMedia = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  // --- Splash ---
  useEffect(() => {
    if (screen === "splash") {
      const t = setTimeout(() => setScreen("login"), 1500);
      return () => clearTimeout(t);
    }
  }, [screen]);

  // --- Auto-scroll ---
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- Fetch messages from server (merges with local cache) ---
  const fetchMessages = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setMessages((prev) => {
          const merged = [...prev];
          let changed = false;
          for (const msg of data.messages) {
            if (!seenIdsRef.current.has(msg.id)) {
              seenIdsRef.current.add(msg.id);
              cacheMessage(msg);
              merged.push(msg);
              changed = true;
            }
          }
          return changed ? merged.sort((a, b) => a.timestamp - b.timestamp) : prev;
        });
      }
    } catch (e) { console.warn("fetchMessages failed:", e); }
  }, [token]);

  // Keep ref up to date for WS closure to avoid stale closures
  const partnerNameRef = useRef(partnerName);
  partnerNameRef.current = partnerName;

  // --- WebSocket (stable connection - only reconnect on token/username change) ---
  useEffect(() => {
    if (!token || !username) return;

    const ws = new WebSocket(`${WS_URL}?token=${token}`);
    socketRef.current = ws;

    ws.onopen = () => setIsPartnerOnline(true);
    ws.onclose = () => {
      setIsPartnerOnline(false);
      socketRef.current = null;
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        const currentPartner = partnerNameRef.current;

        switch (data.type) {
          case "init":
            setIsPartnerOnline(data.partnerOnline);
            break;
          case "status":
            if (data.sender === currentPartner) setIsPartnerOnline(data.isOnline);
            break;
          case "typing":
            if (data.sender === currentPartner) setIsPartnerTyping(data.isTyping);
            break;
          case "message":
            playNotification();
            showBrowserNotification(currentPartner, data.content);
            setMessages((prev) => {
              if (seenIdsRef.current.has(data.id)) return prev;
              seenIdsRef.current.add(data.id);
              cacheMessage(data);
              return [...prev, data];
            });
            break;
          case "signal":
            if (data.sender !== currentPartner) break;
            const payload = data.payload || {};

            if (data.signalType === "offer") {
              setCallType(payload.isAudioOnly ? "audio" : "video");
              setIncomingCallPayload(payload);
              setCallState("ringing_in");
              setScreen("calling");
              showBrowserNotification(
                currentPartner,
                `${payload.isAudioOnly ? "Audio" : "Video"} call...`,
                "together-call"
              );
            } else if (data.signalType === "answer" && pcRef.current) {
              try {
                await pcRef.current.setRemoteDescription(
                  new RTCSessionDescription({ sdp: payload.sdp, type: "answer" })
                );
              } catch (e) {
                console.error("setRemoteDescription failed:", e);
              }
            } else if (data.signalType === "candidate" && pcRef.current) {
              try {
                await pcRef.current.addIceCandidate(new RTCIceCandidate(payload));
              } catch (e) {
                console.error("addIceCandidate failed:", e);
              }
            } else if (data.signalType === "end") {
              cleanupMedia();
              setCallState("idle");
              setMuted(false);
              setCamOff(false);
              setScreen("chat");
            }
            break;
          case "clearChat":
            setMessages([]);
            localStorage.removeItem(MSG_CACHE_KEY);
            seenIdsRef.current = new Set();
            break;
        }
      } catch (e) {
        console.error("WS message error:", e);
      }
    };

    return () => {
      ws.close();
      socketRef.current = null;
    };
  }, [token, username]); // only reconnect when auth changes

  useEffect(() => {
    if (token) fetchMessages();
  }, [token, fetchMessages]);

  // --- Handlers ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError("");
    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.toLowerCase(), password }),
      });
      const data = await res.json();
      if (data.success) {
        saveSession(data.token, data.username, data.partnerName);
        setToken(data.token);
        setUsername(data.username);
        setPartnerName(data.partnerName);
        setScreen("chat");
        // Request notification permission after successful login (user gesture)
        if ("Notification" in window && Notification.permission === "default") {
          Notification.requestPermission().catch(() => {});
        }
      } else setLoginError(data.error || "Login failed");
    } catch {
      setLoginError("Network error. Check backend status.");
    } finally { setIsLoading(false); }
  };

  const sendMessage = () => {
    if (!inputText.trim() || !socketRef.current) return;
    const msg: Message = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      sender: username,
      content: inputText.trim(),
      timestamp: Date.now(),
      status: "sending",
    };
    seenIdsRef.current.add(msg.id);
    cacheMessage(msg);
    setMessages((prev) => [...prev, msg]);
    setInputText("");

    // Send via WebSocket — the DO now persists to KV automatically
    socketRef.current.send(JSON.stringify({ type: "message", id: msg.id, content: msg.content }));
  };

  const sendTyping = (typing: boolean) => {
    socketRef.current?.send(JSON.stringify({ type: "typing", isTyping: typing }));
  };

  // --- WebRTC Call ---
  const startCall = async (audioOnly: boolean) => {
    try {
      setMuted(false);
      setCamOff(false);
      setCallType(audioOnly ? "audio" : "video");
      setScreen("calling");

      // Wait for React to paint the video elements into the DOM
      await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));

      const stream = await getMedia(audioOnly);
      // If no video tracks (fallback from camera conflict or audio-only), update callType
      if (stream.getVideoTracks().length === 0) {
        setCallType("audio");
      }
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPC();
      addLocalTracks(pc, stream);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      setCallState("ringing_out");
      socketRef.current?.send(JSON.stringify({
        type: "signal", signalType: "offer",
        payload: { sdp: offer.sdp, type: offer.type, isAudioOnly: audioOnly },
      }));
    } catch (err) {
      console.error("startCall failed:", err);
      cleanupMedia();
      setCallState("idle");
      setScreen("chat");
    }
  };

  const acceptCall = async () => {
    if (!incomingCallPayload) return;
    try {
      setMuted(false);
      setCamOff(false);
      const isAudioOnly = callType === "audio";

      // screen is already "calling" from incoming offer handler
      // Wait for React to paint the video elements into the DOM
      await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));

      const stream = await getMedia(isAudioOnly);
      // If no video tracks (fallback from camera conflict), update callType
      if (stream.getVideoTracks().length === 0) {
        setCallType("audio");
      }
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPC();
      addLocalTracks(pc, stream);

      const sdp = incomingCallPayload.sdp || incomingCallPayload;
      await pc.setRemoteDescription(new RTCSessionDescription({ sdp, type: "offer" }));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketRef.current?.send(JSON.stringify({
        type: "signal", signalType: "answer",
        payload: { sdp: answer.sdp, type: answer.type },
      }));
    } catch (err) {
      console.error("acceptCall failed:", err);
      cleanupMedia();
      setCallState("idle");
      setScreen("chat");
    }
  };

  // Ringtone: play when ringing, stop when answered or ended
  useEffect(() => {
    if (callState === "ringing_in" || callState === "ringing_out") {
      playRingtone();
    } else {
      stopRingtone();
    }
    return () => stopRingtone();
  }, [callState]);

  // Call timeout: auto-cancel ringing_out after 30s
  useEffect(() => {
    if (callState !== "ringing_out") return;
    const t = setTimeout(() => {
      stopRingtone();
      socketRef.current?.send(JSON.stringify({ type: "signal", signalType: "end", payload: {} }));
      cleanupMedia();
      setCallState("idle");
      setMuted(false);
      setCamOff(false);
      setScreen("chat");
    }, 30000);
    return () => clearTimeout(t);
  }, [callState]);

  const endCall = () => {
    cleanupMedia();
    setCallState("idle");
    setMuted(false);
    setCamOff(false);
    setScreen("chat");
    socketRef.current?.send(JSON.stringify({ type: "signal", signalType: "end", payload: {} }));
  };

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = muted; });
    setMuted(!muted);
  };

  const toggleCam = () => {
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = camOff; });
    setCamOff(!camOff);
  };

  const clearHistory = async () => {
    if (!confirm("Clear all chat history?")) return;
    try {
      await fetch(`${API_BASE}/api/messages/clear`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages([]);
      localStorage.removeItem(MSG_CACHE_KEY);
      seenIdsRef.current = new Set();
    } catch {}
  };

  const handleLogout = () => {
    clearSession();
    cleanupMedia();
    socketRef.current?.close();
    setToken(""); setUsername(""); setPartnerName(""); setMessages([]);
    localStorage.removeItem(MSG_CACHE_KEY);
    setScreen("login");
  };

  // --- Render ---
  return (
    <div className="h-dvh bg-black text-white flex flex-col font-sans overflow-hidden">
      {screen === "splash" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-20 h-20 border-2 border-white rounded-2xl flex items-center justify-center animate-pulse">
            <span className="text-white font-bold text-3xl">T</span>
          </div>
          <h1 className="text-2xl tracking-[0.2em] font-light">TOGETHER</h1>
          <p className="text-neutral-600 text-xs">Private Messenger</p>
        </div>
      )}

      {screen === "login" && (
        <div className="flex-1 flex flex-col justify-center px-8 max-w-md mx-auto w-full">
          <h2 className="text-3xl font-light mb-2">Sign In</h2>
          <p className="text-neutral-500 text-sm mb-10">Access your private space.</p>
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div>
              <label className="text-neutral-500 text-xs uppercase tracking-wider block mb-1.5">Username</label>
              <input type="text" placeholder={ALLOWED_USERS.join(" or ")} value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm text-white outline-none focus:border-white transition" required />
            </div>
            <div>
              <label className="text-neutral-500 text-xs uppercase tracking-wider block mb-1.5">Password</label>
              <input type="password" placeholder="Your secret key" value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm text-white outline-none focus:border-white transition" required />
            </div>
            {loginError && <p className="text-red-400 text-sm bg-red-950/20 border border-red-900/30 rounded-lg px-3 py-2">{loginError}</p>}
            <button type="submit" disabled={isLoading}
              className="w-full bg-white text-black py-3 rounded-lg font-semibold text-sm hover:bg-neutral-200 transition disabled:opacity-50 cursor-pointer">
              {isLoading ? "Connecting..." : "Access Space"}
            </button>
          </form>
          <p className="text-neutral-600 text-xs text-center mt-8">
            Pre-authorized:{' '}
            {ALLOWED_USERS.map((u, i) => (
              <span key={u}>
                {i > 0 && <span className="text-neutral-600 mx-1">&</span>}
                <span className="text-neutral-400 font-mono">{u}</span>
              </span>
            ))}
          </p>
        </div>
      )}

      {screen === "chat" && (
        <div className="flex-1 grid grid-rows-[auto_1fr_auto] overflow-hidden">
          <header className="flex items-center justify-between px-4 py-3 border-b border-neutral-900 bg-black/80 backdrop-blur">
            <div className="flex items-center gap-3">
              <button onClick={() => setScreen("settings")} className="p-1.5 hover:bg-neutral-900 rounded-lg transition cursor-pointer">
                <Settings className="w-4 h-4 text-neutral-400" />
              </button>
              <div>
                <h2 className="text-sm font-medium capitalize">{partnerName || "Partner"}</h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isPartnerOnline ? "bg-green-500" : "bg-neutral-600"}`} />
                  <span className="text-[10px] text-neutral-500">{isPartnerOnline ? "Online" : "Offline"}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => startCall(true)} className="p-2 hover:bg-neutral-900 rounded-lg transition cursor-pointer" title="Voice Call">
                <Phone className="w-4 h-4 text-neutral-400" />
              </button>
              <button onClick={() => startCall(false)} className="p-2 hover:bg-neutral-900 rounded-lg transition cursor-pointer" title="Video Call">
                <Video className="w-4 h-4 text-neutral-400" />
              </button>
            </div>
          </header>

          <div className="overflow-y-auto px-4 py-4 flex flex-col gap-2 min-h-0">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
                <MessageCircle className="w-8 h-8 text-neutral-800" />
                <p className="text-neutral-600 text-xs max-w-xs">No messages yet. Start a conversation.</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender === username;
                return (
                  <div key={msg.id} className={`flex flex-col max-w-[80%] ${isMe ? "self-end items-end" : "self-start items-start"}`}>
                    <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe ? "bg-white text-black rounded-br-sm" : "bg-neutral-900 text-neutral-200 rounded-bl-sm"}`}>
                      {msg.content}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 px-1">
                      <span className="text-[10px] text-neutral-600">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {isMe && <CheckCheck className="w-3 h-3 text-neutral-600" />}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          <div>
            {isPartnerTyping && (
              <div className="px-4 pt-2 pb-1">
                <span className="text-[11px] text-neutral-500 animate-pulse">{partnerName} is typing...</span>
              </div>
            )}
            <div className="p-3 border-t border-neutral-900 flex items-center gap-2">
            <input type="text" value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onFocus={() => sendTyping(true)} onBlur={() => sendTyping(false)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-white outline-none focus:border-neutral-700 transition placeholder-neutral-600" />
            <button onClick={sendMessage} className="p-3 bg-neutral-900 hover:bg-white hover:text-black rounded-xl transition cursor-pointer">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      )}

      {screen === "calling" && (
        <div className="flex-1 flex flex-col relative bg-black">
          {/* Remote video (full screen) - mirrored like local so both sides match */}
          <video ref={remoteVideoRef} autoPlay playsInline
            className={`absolute inset-0 w-full h-full object-contain bg-black scale-x-[-1] transition-opacity duration-500 ${callState === "connected" && !callType.includes("audio") ? "opacity-100" : "opacity-0 pointer-events-none"}`} />

          {/* Local video PIP (mirrored for natural self-view like a mirror) */}
          <div className={`absolute top-4 right-4 w-28 h-36 rounded-xl overflow-hidden border-2 border-neutral-700 z-10 bg-black shadow-lg transition-opacity duration-300 ${callState === "connected" && callType === "video" && !camOff ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
          </div>

          {/* Overlay content */}
          <div className="flex-1 flex flex-col items-center justify-between px-6 py-12 relative z-10">
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 bg-neutral-900/80 rounded-full flex items-center justify-center border border-neutral-700 backdrop-blur">
                <User className="w-8 h-8 text-white" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-light capitalize">{partnerName}</h3>
                <p className="text-neutral-400 text-xs uppercase tracking-widest mt-1">
                  {callState === "ringing_in" && "Incoming Call..."}
                  {callState === "ringing_out" && "Calling..."}
                  {callState === "connected" && `${callType.toUpperCase()} Active`}
                </p>
              </div>
            </div>

            {callState !== "connected" && (
              <div className="flex gap-2">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="w-2.5 h-2.5 rounded-full bg-white animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            )}

            {callState === "connected" && callType === "audio" && (
              <div className="flex items-center gap-3 px-6 py-3 bg-neutral-900/50 rounded-full border border-neutral-800">
                <Volume2 className="w-4 h-4 text-green-400 animate-pulse" />
                <span className="text-xs text-neutral-400">Audio active</span>
              </div>
            )}

            <div className="flex flex-col items-center gap-6 w-full">
              {callState === "ringing_in" ? (
                <div className="flex items-center gap-8">
                  <button onClick={endCall} className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition cursor-pointer">
                    <Power className="w-6 h-6" />
                  </button>
                  <button onClick={acceptCall} className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center animate-bounce transition cursor-pointer">
                    <Phone className="w-6 h-6" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <button onClick={toggleMute}
                      className={`p-3 rounded-xl border transition cursor-pointer ${muted ? "bg-red-900/30 border-red-500 text-red-500" : "bg-neutral-900/80 border-neutral-700 text-neutral-400 hover:text-white backdrop-blur"}`}>
                      {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                    {callType === "video" && (
                      <button onClick={toggleCam}
                        className={`p-3 rounded-xl border transition cursor-pointer ${camOff ? "bg-red-900/30 border-red-500 text-red-500" : "bg-neutral-900/80 border-neutral-700 text-neutral-400 hover:text-white backdrop-blur"}`}>
                        {camOff ? <VideoOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                  <button onClick={endCall} className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition cursor-pointer">
                    <Power className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {screen === "settings" && (
        <div className="flex-1 flex flex-col">
          <header className="flex items-center gap-3 px-4 py-3 border-b border-neutral-900">
            <button onClick={() => setScreen("chat")}
              className="text-xs text-neutral-400 hover:text-white px-2 py-1 rounded bg-neutral-900 border border-neutral-800 transition cursor-pointer">
              <ArrowLeft className="w-3.5 h-3.5 inline mr-1" /> Back
            </button>
            <h3 className="text-sm font-medium">Settings</h3>
          </header>
          <div className="p-4 flex flex-col gap-6">
            <div>
              <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Account</span>
              <div className="mt-2 bg-neutral-950 border border-neutral-900 rounded-lg p-3 text-xs flex flex-col gap-1">
                <p>Username: <strong className="text-white font-mono capitalize">{username}</strong></p>
                <p>Status: <span className="text-green-400">Connected</span></p>
              </div>
            </div>
            <div>
              <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Data</span>
              <button onClick={clearHistory}
                className="mt-2 w-full text-left p-3 rounded-lg bg-neutral-950 border border-neutral-900 hover:border-red-900/50 text-xs text-red-400 transition flex items-center gap-2 cursor-pointer">
                <History className="w-3.5 h-3.5" /> Clear Chat History
              </button>
            </div>
            <div className="border-t border-neutral-900 pt-4">
              <button onClick={handleLogout}
                className="w-full p-3 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-white hover:text-black transition text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer">
                <LogOut className="w-3.5 h-3.5" /> Logout
              </button>
            </div>
            <p className="text-neutral-700 text-[10px] text-center mt-4">Together v1.0.0</p>
          </div>
        </div>
      )}
    </div>
  );
}
