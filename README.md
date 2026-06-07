# Together - Private One-to-One Messenger

Together is a minimalist, fast, lightweight, and modern messaging app developed specifically for private communication between **exactly two pre-authorized partners** (`zain` and `gf`). 

This workspace hosts a **fully integrated Flutter Frontend, Cloudflare Serverless Worker Backend, and an interactive side-by-side Web Simulator**.

## 🛠 Project Components
1. **Frontend Flutter App** (`/lib/`, `pubspec.yaml`): Standalone Material 3 Android/iOS mobile application with real-time WebSockets and peer-to-peer WebRTC audio/video call management.
2. **Backend Cloudflare Worker** (`/worker/`): Ultra-fast serverless API endpoints, secure JSON Web Token authentication, KV for historic messages, and Durable Objects to coordinate instant signaling.
3. **Interactive Device Simulator** (Visual Iframe Preview): Dual viewport smartphone mockup sandbox in your browser window to simulate Zain and GF typing, chatting, and calling in real-time.

---

## 📱 Phase 1: Architecture Mapping & Directory Layout
```text
Together/
├── lib/                             # FLUTTER FRONTEND APPLICATION
│   ├── models/
│   │   ├── message.dart             # Message schema
│   │   └── user.dart                # Partner presence state modeling
│   ├── services/
│   │   ├── websocket_service.dart   # Instant WebSocket handlers
│   │   └── webrtc_service.dart      # Standard signaling & WebRTC Peer connection
│   ├── screens/
│   │   ├── splash_screen.dart       # Minimalist black loading logo
│   │   ├── login_screen.dart        # Authorization (zain / gf ONLY)
│   │   ├── home_screen.dart         # Direct chat & typing awareness page
│   │   ├── call_screen.dart         # PIP user video & controls layout
│   │   └── settings_screen.dart     # Clear databases & logouts
│   ├── utils/
│   │   └── constants.dart           # App credentials & URL settings
│   └── main.dart                    # Application bootstrap and global providers
│
├── worker/                          # CLOUDFLARE SERVERLESS BACKEND
│   ├── src/
│   │   ├── index.ts                 # REST controllers, login & JWT actions
│   │   └── durable-object.ts        # TogetherSessionManager WS coordinates
│   ├── package.json                 # Worker dependency package
│   └── wrangler.toml                # Durable Object & KV configuration bindings
│
└── README.md                        # Documentation and command index
```

---

## ☁️ Phase 2 & 5: Cloudflare Worker Backend Implementation & Deployments

Cloudflare Workers provides instant serverless endpoints on the Free Tier with Durable Objects for fast state tracking.

### Local Mock Terminal Execution
To test modifications or configure the worker on your terminal:
```bash
# Move to worker container
cd worker

# Install dependencies
npm install

# Deploy instant dev playground matching DO configurations
npx wrangler dev
```

### Direct Live Cloudflare Deployment
When you are ready to publish live to your production Cloudflare Dashboard:
```bash
# Connect and authenticate wrangler credentials
npx wrangler login

# Deploy standard triggers, KV spaces, and Durable Objects configurations to the edge
npx wrangler deploy
```

*Note: Update `lib/utils/constants.dart` with your newly deployed worker URL after this step!*

---

## 🎯 Phase 3 & 4: Flutter WebRTC Frontend Integration

The Flutter app leverages `flutter_webrtc` to bind direct socket signals into functional, safe cross-platform channels.

### Setup & Run Commands:
```bash
# Pull dependencies and establish package links
flutter pub get

# Find connected physical Android hardware or active simulators
flutter devices

# Run on watch mode in your IDE/console
flutter run

# Build a production-grade release APK
flutter build apk --release
```

---

## 🔍 Phase 6: System Testing & Sandbox Verifications

Because testing a 1-to-1 app requires two devices, we designed the **Interactive Dual-Device Visual Simulator** in the workspace!
1. Log in to the left mock device viewport with user `zain` and password `together_zain_2026`.
2. Log in to the right mock device viewport with user `gf` and password `together_gf_2526`.
3. Try typing a message in Zain's input; you will see the active `gf is typing...` indicator animate on GF's viewport instantly!
4. Click the Audio or Video Calling icon in Zain's screen to ring GF's phone with live call controls.

---

## 🛡️ Phase 7: Production Hardening Guidelines

To ensure maximum security and performance:
1. **Dynamic Secret Rotation**: Update the default `JWT_SECRET` in `worker/wrangler.toml` before going production.
2. **STUN/TURN Servers**: While our code sets up public Google STUN servers (`stun.l.google.com`), production setups with strict firewall users should incorporate a TURN profile (such as Xirsys or Metered.ca) in `lib/services/webrtc_service.dart`.
3. **Password Customization**: Replace the default passwords in `worker/src/index.ts` with custom shared phrases known only to you and your partner.
