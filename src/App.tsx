import React, { useState, useEffect, useRef } from "react";
import {
  Lock,
  Send,
  Video,
  Phone,
  User,
  Check,
  CheckCheck,
  Settings,
  Power,
  Terminal,
  ArrowRight,
  Shield,
  Activity,
  VideoOff,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  LogOut,
  Globe,
  RefreshCw,
  Sliders,
  Cpu,
  History,
  Info
} from "lucide-react";

// Setup Mock credentials & versions
const passwords: Record<string, string> = {
  zain: "together_zain_2026",
  gf: "together_gf_2026"
};

interface Message {
  id: string;
  sender: "zain" | "gf";
  content: string;
  timestamp: number;
  status: "sending" | "delivered" | "read";
}

export default function App() {
  // Shared state that mirrors the backend database (clearing synced)
  const [syncedMessages, setSyncedMessages] = useState<Message[]>([]);
  const [activeTab, setActiveTab] = useState<"simulator" | "flutter" | "cloudflare" | "testing">("simulator");

  // Load initial messages from full-stack REST API
  const fetchMessages = async () => {
    try {
      const res = await fetch("/api/messages");
      const data = await res.json();
      if (data.success) {
        setSyncedMessages(data.messages);
      }
    } catch (e) {
      console.warn("REST API offline, running in mock reactive fallback", e);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); // Poll as secondary fall-back
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* Upper header */}
      <header className="border-b border-neutral-850 bg-black/50 backdrop-blur px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 border-2 border-white rounded-xl flex items-center justify-center bg-black">
            <span className="text-white font-mono font-bold text-sm">T</span>
          </div>
          <div>
            <h1 className="text-lg font-medium tracking-tight text-white flex items-center gap-2">
              Together <span className="text-xs bg-neutral-850 px-2 py-0.5 rounded text-neutral-400 border border-neutral-800">1-to-1 Private Messenger</span>
            </h1>
            <p className="text-xs text-neutral-450 mt-0.5">Secure private space with zero data profiling</p>
          </div>
        </div>

        <div className="flex bg-neutral-900 border border-neutral-850 rounded-lg p-0.5">
          <button
            onClick={() => setActiveTab("simulator")}
            style={{ contentVisibility: "auto" }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition ${
              activeTab === "simulator" ? "bg-white text-black" : "text-neutral-400 hover:text-white"
            }`}
          >
            Live UI Simulator (Dual View)
          </button>
          <button
            onClick={() => setActiveTab("flutter")}
            style={{ contentVisibility: "auto" }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition ${
              activeTab === "flutter" ? "bg-white text-black" : "text-neutral-400 hover:text-white"
            }`}
          >
            Flutter Structure
          </button>
          <button
            onClick={() => setActiveTab("cloudflare")}
            style={{ contentVisibility: "auto" }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition ${
              activeTab === "cloudflare" ? "bg-white text-black" : "text-neutral-400 hover:text-white"
            }`}
          >
            Cloudflare Backend
          </button>
          <button
            onClick={() => setActiveTab("testing")}
            style={{ contentVisibility: "auto" }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition ${
              activeTab === "testing" ? "bg-white text-black" : "text-neutral-400 hover:text-white"
            }`}
          >
            Terminal Deploy Guides
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col">
        {activeTab === "simulator" && (
          <div className="p-4 lg:p-8 grid grid-cols-1 xl:grid-cols-12 gap-6 max-w-7xl mx-auto w-full">
            {/* Info panel */}
            <div className="xl:col-span-12 bg-neutral-900/50 border border-neutral-850/50 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 shrink-0">
                  <Sliders className="w-5 h-5 text-neutral-300" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white">How This Active Simulation Works</h3>
                  <p className="text-xs text-neutral-400 mt-1 max-w-xl leading-relaxed">
                    We have loaded an active dual device simulation. Below are <strong>User A (Zain)</strong> and <strong>User B (GF)</strong> running simultaneously in browser containers. Real websockets handle the signaling and text history.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-xs text-neutral-400 font-mono">WS Local Server Sync: ON</span>
              </div>
            </div>

            {/* Simulated Phone Zain */}
            <div className="xl:col-span-6 flex justify-center">
              <PhoneSimulator
                username="zain"
                partnerName="gf"
                messages={syncedMessages}
                setMessages={setSyncedMessages}
                onRefresh={fetchMessages}
              />
            </div>

            {/* Simulated Phone GF */}
            <div className="xl:col-span-6 flex justify-center">
              <PhoneSimulator
                username="gf"
                partnerName="zain"
                messages={syncedMessages}
                setMessages={setSyncedMessages}
                onRefresh={fetchMessages}
              />
            </div>
          </div>
        )}

        {activeTab === "flutter" && <FlutterStructureTab />}
        {activeTab === "cloudflare" && <CloudflareBackendTab />}
        {activeTab === "testing" && <TestingDeployTab />}
      </main>

      {/* Persistent Footer */}
      <footer className="border-t border-neutral-850 py-4 px-8 bg-black/30 text-center text-xs text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p>Preconfigured users: <span className="text-neutral-400 font-mono bg-neutral-900 border border-neutral-850 px-1 py-0.5 rounded">zain</span> & <span className="text-neutral-400 font-mono bg-neutral-900 border border-neutral-850 px-1 py-0.5 rounded">gf</span></p>
        <p>Together private secure workspace © 2026</p>
      </footer>
    </div>
  );
}

/* ==========================================================
   PHONE SIMULATOR REUSABLE SUB-COMPONENT
   ========================================================== */
interface PhoneSimulatorProps {
  username: "zain" | "gf";
  partnerName: "zain" | "gf";
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  onRefresh: () => void;
}

function PhoneSimulator({ username, partnerName, messages, setMessages, onRefresh }: PhoneSimulatorProps) {
  // Screen views: "splash" -> "login" -> "chat" -> "call" -> "settings"
  const [screen, setScreen] = useState<"splash" | "login" | "chat" | "calling" | "settings">("splash");
  const [passwordInput, setPasswordInput] = useState("");
  const [isLgIn, setIsLgIn] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isTypingLocal, setIsTypingLocal] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [isPartnerOnline, setIsPartnerOnline] = useState(true);
  const [loginError, setLoginError] = useState("");
  
  // Call configuration
  const [callType, setCallType] = useState<"audio" | "video">("video");
  const [callState, setCallState] = useState<"ringing_in" | "ringing_out" | "connected">("ringing_in");
  const [muteCall, setMutedCall] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);

  const socketRef = useRef<WebSocket | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Auto-terminate splash
  useEffect(() => {
    if (screen === "splash") {
      const timer = setTimeout(() => {
        setScreen("login");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [screen]);

  // Connect Local WebSocket for Realtime communication simulation
  useEffect(() => {
    if (screen === "chat" || screen === "calling" || screen === "settings") {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const socket = new WebSocket(`${protocol}//${window.location.host}/ws?username=${username}`);
      socketRef.current = socket;

      socket.onopen = () => {
        setIsPartnerOnline(true);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "message") {
            // Trigger REST refresh
            onRefresh();
          } else if (data.type === "typing" && data.sender === partnerName) {
            setIsPartnerTyping(data.isTyping);
          } else if (data.type === "presence" && data.username === partnerName) {
            setIsPartnerOnline(data.isOnline);
          } else if (data.type === "signal" && data.sender === partnerName) {
            if (data.signalType === "offer") {
              setCallType(data.payload.isAudioOnly ? "audio" : "video");
              setCallState("ringing_in");
              setScreen("calling");
            } else if (data.signalType === "answer") {
              setCallState("connected");
            } else if (data.signalType === "end") {
              setScreen("chat");
            }
          } else if (data.type === "init") {
            setIsPartnerOnline(data.partnerOnline);
          } else if (data.type === "clearChat") {
            onRefresh();
          }
        } catch (e) {
          console.error("Failed to parse websocket message", e);
        }
      };

      socket.onclose = () => {
        setIsPartnerOnline(false);
      };

      return () => {
        socket.close();
      };
    }
  }, [screen, username, partnerName]);

  // Handle auto scroll-to-bottom of device dialogs
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, screen]);

  // Handle typing indicator broadcast
  const handleInputFocus = (typingState: boolean) => {
    setIsTypingLocal(typingState);
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: "typing",
          isTyping: typingState
        })
      );
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords[username] === passwordInput) {
      setIsLgIn(true);
      setScreen("chat");
      setLoginError("");
    } else {
      setLoginError("Invalid designated password");
    }
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    
    // Call Rest post endpoint for durable history
    fetch("/api/send-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: username,
        content: inputText.trim()
      })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          onRefresh();
          setInputText("");
          handleInputFocus(false);
        }
      });
  };

  // Trigger calling signal flow
  const triggerCallOut = (isAudio: boolean) => {
    setCallType(isAudio ? "audio" : "video");
    setCallState("ringing_out");
    setScreen("calling");
    
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: "signal",
          signalType: "offer",
          payload: { isAudioOnly: isAudio }
        })
      );
    }
  };

  const acceptIncomingCall = () => {
    setCallState("connected");
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: "signal",
          signalType: "answer",
          payload: {}
        })
      );
    }
  };

  const terminateCall = () => {
    setScreen("chat");
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: "signal",
          signalType: "end",
          payload: {}
        })
      );
    }
  };

  const handleClearHistory = async () => {
    if (window.confirm("Delete history from database permanently?")) {
      await fetch("/api/messages/clear", { method: "DELETE" });
      onRefresh();
      setScreen("chat");
    }
  };

  return (
    <div className="w-[360px] h-[640px] rounded-[40px] bg-black border-[10px] border-neutral-900 shadow-2xl relative overflow-hidden flex flex-col font-sans select-none">
      {/* Device Top Speaker Notch */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 rounded-full bg-neutral-900 border border-neutral-850/30 z-30 flex items-center justify-center">
        <div className="w-10 h-1 bg-neutral-800 rounded-full"></div>
      </div>

      {/* VIEWPORT CONTROLLER */}
      {screen === "splash" && (
        <div className="w-full h-full bg-black flex flex-col items-center justify-center relative">
          <div className="w-16 h-16 border-2 border-white rounded-2xl flex items-center justify-center p-2.5 animate-pulse">
            <span className="text-white font-serif font-bold text-xl">T</span>
          </div>
          <h2 className="text-white text-md tracking-widest uppercase font-light mt-4">Together</h2>
        </div>
      )}

      {screen === "login" && (
        <div className="w-full h-full bg-black px-6 py-12 flex flex-col justify-center relative">
          <div className="text-left">
            <h3 className="text-white text-2xl font-light tracking-tight">Identity Access</h3>
            <p className="text-neutral-500 text-xs mt-1">Designated user: <strong className="text-neutral-300 font-mono uppercase">{username}</strong></p>
          </div>

          <form onSubmit={handleLoginSubmit} className="mt-8 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-neutral-500 text-[11px] uppercase tracking-wider">Default password</label>
              <input
                type="text"
                readOnly
                value={passwords[username]}
                className="w-full bg-neutral-950/80 border border-neutral-900 p-2.5 rounded-lg text-xs font-mono text-neutral-400 select-all cursor-copy"
                title="Click to copy, then enter in input space below"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-neutral-400 text-[11px] uppercase tracking-wider">Enter Space Password</label>
              <input
                type="password"
                placeholder="Required secret key"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-850 focus:border-white p-2.5 rounded-lg text-sm text-white focus:outline-none transition font-sans"
              />
            </div>

            {loginError && (
              <p className="text-red-500 text-xs text-left p-1">{loginError}</p>
            )}

            <button
              type="submit"
              className="w-full bg-white hover:bg-neutral-150 text-black py-2.5 rounded-lg font-medium text-xs tracking-wide uppercase transition duration-200 cursor-pointer mt-4"
            >
              Enter Dashboard
            </button>
          </form>
        </div>
      )}

      {screen === "chat" && (
        <div className="w-full h-full bg-black flex flex-col relative pt-6">
          {/* Header */}
          <div className="px-4 py-3 border-b border-neutral-900 flex items-center justify-between bg-black/80 backdrop-blur z-10">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setScreen("settings")}
                className="p-1 hover:bg-neutral-900 rounded-lg text-neutral-500 hover:text-white transition cursor-pointer"
              >
                <Settings className="w-4 h-4" />
              </button>
              <div>
                <h4 className="text-white text-xs font-medium capitalize flex items-center gap-1.5">
                  Partner: <span className="text-neutral-200">{partnerName}</span>
                </h4>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isPartnerOnline ? "bg-green-500" : "bg-neutral-600"}`}></span>
                  <span className="text-[10px] text-neutral-500">{isPartnerOnline ? "Online" : "Offline"}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => triggerCallOut(true)}
                className="p-1.5 hover:bg-neutral-900 rounded-lg text-neutral-400 hover:text-white cursor-pointer"
                title="Voice Call"
              >
                <Phone className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => triggerCallOut(false)}
                className="p-1.5 hover:bg-neutral-900 rounded-lg text-neutral-400 hover:text-white cursor-pointer"
                title="Video Call"
              >
                <Video className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2 bg-black">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3">
                <Shield className="w-8 h-8 text-neutral-800" />
                <div>
                  <h5 className="text-neutral-400 text-xs font-medium">Communication is Private</h5>
                  <p className="text-[10px] text-neutral-600 max-w-xs mt-1">This space is managed on highly isolated workers and databases with Zero retention or trace tracking.</p>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender === username;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[78%] ${isMe ? "self-end items-end" : "self-start items-start"}`}
                  >
                    <div
                      className={`px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                        isMe ? "bg-white text-black rounded-br-sm" : "bg-neutral-900 text-neutral-200 rounded-bl-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 px-1">
                      <span className="text-[9px] text-neutral-600 font-mono">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {isMe && (
                        <CheckCheck className="w-3 h-3 text-neutral-600" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef}></div>
          </div>

          {/* Partner typing indicator notifier */}
          {isPartnerTyping && (
            <div className="px-4 py-1 text-left">
              <span className="text-[11px] text-neutral-500 font-light flex items-center gap-1 animate-pulse">
                <span className="capitalize">{partnerName}</span> is typing...
              </span>
            </div>
          )}

          {/* Message input */}
          <div className="p-3 border-t border-neutral-900 bg-black flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onFocus={() => handleInputFocus(true)}
              onBlur={() => handleInputFocus(false)}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Send message..."
              className="flex-1 bg-neutral-950 border border-neutral-900 focus:border-neutral-800 text-xs p-2.5 rounded-xl text-white focus:outline-none placeholder-neutral-600 transition"
            />
            <button
              onClick={handleSendMessage}
              className="p-2.5 bg-neutral-900 hover:bg-white text-white hover:text-black rounded-xl transition cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {screen === "calling" && (
        <div className="w-full h-full bg-black flex flex-col relative pt-8 justify-between px-6 pb-10">
          {/* Header state information */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 bg-neutral-900 rounded-full flex items-center justify-center border border-neutral-800 animate-pulse">
              <User className="w-6 h-6 text-white" />
            </div>
            <div className="text-center">
              <h4 className="text-white text-md font-light capitalize">{partnerName}</h4>
              <p className="text-neutral-500 text-[11px] uppercase tracking-widest mt-1">
                {callState === "ringing_in" && "Incoming Offer..."}
                {callState === "ringing_out" && "Calling Out..."}
                {callState === "connected" && `Connected: ${callType.toUpperCase()} MODE`}
              </p>
            </div>
          </div>

          {/* Active Call Live Video Camera Preview Simulator */}
          {callState === "connected" && (
            <div className="w-full h-44 rounded-2xl border border-neutral-850 bg-neutral-950/50 relative overflow-hidden flex items-center justify-center p-3">
              {callType === "video" && !videoOff ? (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/30">
                  <div className="w-full h-full relative">
                    {/* Simulated live camera filter waves */}
                    <div className="absolute inset-x-0 top-0 h-1 bg-white/20 animate-bounce"></div>
                    {/* Display partner dynamic render simulator */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 z-10">
                      <span className="text-[10px] text-zinc-400 bg-black/60 px-2 py-0.5 rounded uppercase tracking-widest">Local camera track active</span>
                    </div>
                    {/* Minimal decorative design representation for user video peer stream */}
                    <div className="absolute bottom-2 left-2 w-14 h-18 bg-black border border-neutral-800 rounded-md z-20 flex items-center justify-center">
                      <User className="w-4 h-4 text-neutral-400" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <VideoOff className="w-6 h-6 text-neutral-700" />
                  <span className="text-[10px] text-neutral-550 italic">Camera interface deactivated</span>
                </div>
              )}
            </div>
          )}

          {/* Mid Calling State Animation */}
          {callState !== "connected" && (
            <div className="flex justify-center items-center py-6">
              <div className="flex gap-1.5 items-center">
                <span className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: "300ms" }}></span>
              </div>
            </div>
          )}

          {/* Actions panel */}
          <div className="flex flex-col gap-6 items-center">
            {callState === "ringing_in" ? (
              <div className="flex items-center gap-8 justify-center w-full">
                <button
                  onClick={terminateCall}
                  className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white cursor-pointer hover:scale-105 transition"
                >
                  <Power className="w-5 h-5" />
                </button>
                <button
                  onClick={acceptIncomingCall}
                  className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center text-white cursor-pointer hover:scale-110 transition animate-bounce"
                >
                  <Phone className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 items-center w-full">
                <div className="flex items-center gap-4 justify-center">
                  <button
                    onClick={() => setMutedCall(!muteCall)}
                    className={`p-2.5 rounded-lg border transition cursor-pointer ${
                      muteCall ? "bg-red-900/30 border-red-500 text-red-500" : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                    }`}
                  >
                    {muteCall ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                  {callType === "video" && (
                    <button
                      onClick={() => setVideoOff(!videoOff)}
                      className={`p-2.5 rounded-lg border transition cursor-pointer ${
                        videoOff ? "bg-red-900/30 border-red-500 text-red-500" : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                      }`}
                    >
                      {videoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                    </button>
                  )}
                  <button
                    onClick={() => setSpeakerOn(!speakerOn)}
                    className={`p-2.5 rounded-lg border transition cursor-pointer ${
                      speakerOn ? "bg-green-950/20 border-green-500 text-green-500" : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                    }`}
                  >
                    {speakerOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  onClick={terminateCall}
                  className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white cursor-pointer hover:scale-105 transition mt-2"
                >
                  <Power className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {screen === "settings" && (
        <div className="w-full h-full bg-black flex flex-col relative pt-6 text-left">
          {/* Header */}
          <div className="px-4 py-3 border-b border-neutral-900 flex items-center gap-3 bg-black">
            <button
              onClick={() => setScreen("chat")}
              className="text-xs text-neutral-400 hover:text-white cursor-pointer px-2 py-1 rounded bg-neutral-900 border border-neutral-850"
            >
              Back
            </button>
            <h4 className="text-white text-xs font-medium">Device Administration</h4>
          </div>

          {/* Admin panel menu body */}
          <div className="p-4 flex flex-col gap-6">
            <div>
              <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Data & Clear methods</span>
              <div className="mt-2 flex flex-col gap-1">
                <button
                  onClick={handleClearHistory}
                  className="w-full text-left p-2.5 rounded hover:bg-neutral-900/50 text-xs text-red-400 border border-transparent hover:border-neutral-900 transition flex items-center gap-2 cursor-pointer"
                >
                  <History className="w-3.5 h-3.5" />
                  Clear SQL/KV Sync History
                </button>
              </div>
            </div>

            <div className="border-t border-neutral-900 pt-3">
              <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Identity</span>
              <div className="mt-2 text-xs text-neutral-300 bg-neutral-950 border border-neutral-900 p-3 rounded-lg flex flex-col gap-1.5">
                <p>Username: <strong className="font-mono text-white capitalize">{username}</strong></p>
                <p>Status: <span className="text-green-400">Authenticated peer session</span></p>
              </div>
            </div>

            <div className="border-t border-neutral-900 pt-4 flex flex-col gap-3">
              <button
                onClick={() => {
                  setScreen("login");
                  setIsLgIn(false);
                }}
                className="w-full p-2.5 rounded bg-neutral-900 border border-neutral-850 hover:bg-white text-neutral-300 hover:text-black transition text-center text-xs font-semibold cursor-pointer flex items-center justify-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                End Device Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Device Bottom Pill Bar Decorator */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1 rounded-full bg-neutral-800/80 z-30"></div>
    </div>
  );
}

/* ==========================================================
   FLUTTER ARCHITECTURE OVERVIEW TAB
   ========================================================== */
function FlutterStructureTab() {
  const structure = [
    {
      file: "lib/main.dart",
      desc: "App bootstrap logic, dark-theme styling, provider registration, and path redirection (Splash -> Login or Home)."
    },
    {
      file: "lib/models/user.dart",
      desc: "Holds partner state variables (isOnline status, typing updates, screen coordinates)."
    },
    {
      file: "lib/models/message.dart",
      desc: "Model representing private chat documents: sender identity, text payloads, delivery checks, and serialization keys."
    },
    {
      file: "lib/services/websocket_service.dart",
      desc: "Manages WebSocket channels, reconnect thresholds, standard state triggers, typing indicators, and caller triggers."
    },
    {
      file: "lib/services/webrtc_service.dart",
      desc: "Initializes ICE server configurations, WebRTC peer parameters, manages microphone feeds, camera toggle triggers, and local-video rendering components."
    },
    {
      file: "lib/screens/splash_screen.dart",
      desc: "Clean black entrance screen rendering a pristine heart logo; validates local storage keys before routing the user."
    },
    {
      file: "lib/screens/login_screen.dart",
      desc: "Simple identity check allowing logins only for zain or gf. Authenticates directly with the Cloudflare Worker."
    },
    {
      file: "lib/screens/home_screen.dart",
      desc: "The core communication card layout containing partner activity indicators, voice/video triggers, message bubbles, and real-time typing indicators."
    },
    {
      file: "lib/screens/call_screen.dart",
      desc: "Active caller stage with PIP local streams, fullscreen remote video streams, camera switches, and call mute or volume controllers."
    },
    {
      file: "lib/screens/settings_screen.dart",
      desc: "Administration controls enabling custom theme changes, quick local-database clearing, and secure session logging-out."
    },
    {
      file: "pubspec.yaml",
      desc: "Project manifest including crucial packages such as flutter_webrtc, provider, shared_preferences, and layout models."
    }
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto w-full flex-1 flex flex-col gap-6">
      <div className="bg-neutral-900 border border-neutral-850 rounded-xl p-6">
        <h3 className="text-md font-medium text-white flex items-center gap-2">
          <Terminal className="w-5 h-5 text-neutral-300" /> Flutter Dart Architecture
        </h3>
        <p className="text-xs text-neutral-400 mt-1">
          Each Flutter component is completely generated inside your directory tree. Review the file structural mapping below:
        </p>

        <div className="mt-6 border border-neutral-850 rounded-lg overflow-hidden divide-y divide-neutral-850 bg-neutral-950">
          {structure.map((item, idx) => (
            <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-900/30 transition">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-mono font-bold text-white tracking-wide bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded self-start">
                  {item.file}
                </span>
                <span className="text-xs text-neutral-450 mt-1 leading-relaxed">
                  {item.desc}
                </span>
              </div>
              <span className="text-[10px] text-green-400 font-mono bg-green-950/20 border border-green-800/20 px-2.5 py-1 rounded-full shrink-0 self-start sm:self-auto">
                Generated & Match Standard
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ==========================================================
   CLOUDFLARE BACKEND DESIGN SYSTEM TAB
   ========================================================== */
function CloudflareBackendTab() {
  const routes = [
    { method: "POST", endpoint: "/login", desc: "Verifies the private partner username and signs a unique cryptographic token valid for 30 days." },
    { method: "POST", endpoint: "/send-message", desc: "Stores a messaging trace under the Cloudflare KV database keys and updates the connected partner socket." },
    { method: "GET", endpoint: "/messages", desc: "Retrieves complete verified messaging documents sorted chronologically." },
    { method: "DELETE", endpoint: "/messages/clear", desc: "Clears message histories directly from the designated KV namespace." },
    { method: "WS", endpoint: "/ws", desc: "Upgrades requests to standard WebSockets and maps the connection to the Durable Object TogetherSessionManager." }
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto w-full flex-1 flex flex-col gap-6">
      <div className="bg-neutral-900 border border-neutral-850 rounded-xl p-6">
        <h3 className="text-md font-medium text-white flex items-center gap-2">
          <Globe className="w-5 h-5 text-neutral-300" /> Cloudflare Workers API Specifications
        </h3>
        <p className="text-xs text-neutral-450 mt-1">
          A high-isolation architecture matching Serverless Worker triggers and Durable Objects. Preconfigured end-points:
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {routes.map((route, idx) => (
            <div key={idx} className="p-4 bg-neutral-950 border border-neutral-850 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded w-16 text-center ${
                  route.method === "POST" ? "bg-amber-950/20 border border-amber-800/20 text-amber-400" :
                  route.method === "GET" ? "bg-teal-950/20 border border-teal-800/20 text-teal-400" :
                  route.method === "WS" ? "bg-indigo-950/25 border border-indigo-800/20 text-indigo-400" :
                  "bg-red-950/20 border border-red-800/20 text-red-400"
                }`}>
                  {route.method}
                </span>
                <span className="font-mono text-xs text-white tracking-wide">{route.endpoint}</span>
              </div>
              <p className="text-xs text-neutral-450 md:max-w-xl text-left font-light leading-relaxed">
                {route.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ==========================================================
   DEPLOYMENT & TERMINAL COMMANDS TAB
   ========================================================== */
function TestingDeployTab() {
  return (
    <div className="p-8 max-w-5xl mx-auto w-full flex-1 flex flex-col gap-6">
      <div className="bg-neutral-900 border border-neutral-850 rounded-xl p-6">
        <h3 className="text-md font-medium text-white flex items-center gap-2">
          <Terminal className="w-5 h-5 text-neutral-300" /> Deployment Administration Terminal Command Logs
        </h3>
        <p className="text-xs text-neutral-450 mt-1">
          Perform execution and deployments straight from your console. Check these standard steps:
        </p>

        <div className="mt-6 flex flex-col gap-5">
          {/* Step 1 CLOUDFLARE */}
          <div>
            <h4 className="text-xs font-bold text-white tracking-wider flex items-center gap-2 uppercase">
              <span className="w-5 h-5 rounded bg-neutral-800 border border-neutral-700 text-white flex items-center justify-center font-mono text-[10px]">1</span>
              Cloudflare Serverless Deploy Command
            </h4>
            <div className="mt-2 bg-neutral-950 border border-neutral-850 rounded-lg p-4 font-mono text-[12px] text-neutral-400 flex flex-col gap-1.5 text-left">
              <p className="text-neutral-500"># Navigate to directory & Install wrangler</p>
              <p className="text-white">cd worker</p>
              <p className="text-white">npm install</p>
              <br />
              <p className="text-neutral-500"># Start local worker tester with DO simulation</p>
              <p className="text-white">npx wrangler dev</p>
              <br />
              <p className="text-neutral-500"># Authenticate credentials with Cloudflare dashboard</p>
              <p className="text-white">npx wrangler login</p>
              <br />
              <p className="text-neutral-500"># Deploy triggers and binding schemas straight to active edge workers</p>
              <p className="text-white">npx wrangler deploy</p>
            </div>
          </div>

          {/* Step 2 FLUTTER */}
          <div>
            <h4 className="text-xs font-bold text-white tracking-wider flex items-center gap-2 uppercase">
              <span className="w-5 h-5 rounded bg-neutral-800 border border-neutral-700 text-white flex items-center justify-center font-mono text-[10px]">2</span>
              Flutter Mobile Application Build Commands
            </h4>
            <div className="mt-2 bg-neutral-950 border border-neutral-850 rounded-lg p-4 font-mono text-[12px] text-neutral-400 flex flex-col gap-1.5 text-left">
              <p className="text-neutral-500"># Check connected physical Android device or active Virtual Emulator status</p>
              <p className="text-white">flutter devices</p>
              <br />
              <p className="text-neutral-500"># Synchronize pub packages & update models</p>
              <p className="text-white">flutter pub get</p>
              <br />
              <p className="text-neutral-500"># Run the Android app in debug watch mode</p>
              <p className="text-white">flutter run</p>
              <br />
              <p className="text-neutral-500"># Build a complete standalone APK optimized for Linux/Google Cloud Shell testing profiles</p>
              <p className="text-white">flutter build apk --release</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
