# Together — A Private Messenger for Two

Together is a fully private messaging and WebRTC calling app designed for exactly two people. It supports real-time text messaging, typing indicators, online presence, and audio/video calls — all routed through a serverless Cloudflare backend.

## Project Structure

```
├── web/                    # Web app (React + Vite + Tailwind)
│   ├── src/
│   │   ├── App.tsx         # Main app with chat, calling, settings screens
│   │   ├── main.tsx        # Entry point
│   │   └── index.css       # Tailwind imports
│   ├── vite.config.ts
│   └── package.json
│
├── worker/                 # Cloudflare Worker backend
│   ├── src/
│   │   ├── index.ts        # HTTP API + WebSocket routing
│   │   └── durable-object.ts  # Durable Object for real-time signaling
│   ├── wrangler.toml       # Worker configuration
│   └── package.json
│
├── lib/                    # Flutter mobile app (Android/iOS)
│   ├── main.dart
│   ├── screens/            # UI screens (login, chat, calling, settings)
│   ├── services/           # WebSocket & WebRTC services
│   ├── models/             # Data models
│   └── utils/
│       └── constants.dart  # API URLs, user config
│
├── pubspec.yaml            # Flutter dependencies
├── server.ts               # Local Express dev server (simulator)
└── package.json            # Local dev server dependencies
```

## Features

- **Text messaging** — Real-time delivery via WebSocket
- **Typing indicators** — See when the other person is typing
- **Online presence** — Know when your partner is connected
- **Audio/Video calls** — WebRTC peer-to-peer with STUN
- **Message persistence** — Messages survive page refresh (KV storage + localStorage cache)
- **Session persistence** — Stay logged in across page refreshes
- **Notifications** — Sound + OS popup when messages arrive in the background
- **Call ringtone** — Phone-style ring for incoming calls
- **Mirrored video** — Both sides see mirrored self-view

## How to Use

### Web App (Deployed)

1. Open the web app URL
2. Login with one of the pre-configured accounts
3. Open a second browser tab and login with the other account
4. Start chatting or place a call

**Default credentials:**

| Username | Password |
|----------|----------|
| `zain`   | `together_zain_2026` |
| `gf`     | `together_gf_2026`   |

### Flutter Mobile App (APK)

The Flutter APK is built separately and connects to the same Cloudflare backend.

1. Build the APK:
   ```bash
   flutter build apk --release
   ```
2. Install the APK on both Android devices
3. Login with the same credentials

## Changing Usernames & Passwords

Credentials are now centralized — you only need to change them in **one file per platform**:

### 1. Cloudflare Worker Backend (`worker/wrangler.toml`)

Edit the `USERS` JSON var in the `[vars]` section:

```toml
[vars]
JWT_SECRET = "your_secret_key_here"
USERS = '[{"username":"zain","password":"new_password"},{"username":"gf","password":"new_password"}]'
```

Then redeploy:

```bash
cd worker
npx wrangler deploy
```

### 2. Flutter Mobile App (`lib/config/credentials.dart`)

Edit the `users` list:

```dart
static const List<Map<String, String>> users = [
  {'username': 'zain', 'password': 'new_password', 'displayName': 'Zain'},
  {'username': 'gf', 'password': 'new_password', 'displayName': 'GF'},
];
```

Then rebuild:

```bash
flutter build apk --release
```

### 3. Local Dev Server (`.env` file)

Edit the `USERS` variable:

```
USERS=[{"username":"zain","password":"new_password"},{"username":"gf","password":"new_password"}]
VITE_USERS=[{"username":"zain","password":"new_password"},{"username":"gf","password":"new_password"}]
```

### After Changing Credentials

All existing JWT tokens will become invalid (they were signed with the old secret). Users will need to log in again with the new credentials.

## Architecture

```
┌──────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   Flutter App     │────▶│  Cloudflare Worker   │────▶│  KV Storage     │
│  (Android/iOS)    │◀────│  (API + WebSocket)   │◀────│  (Messages)     │
└──────────────────┘     │                      │     └─────────────────┘
                         │  Durable Object      │
┌──────────────────┐     │  (Real-time +        │
│   Web App         │────▶│   WebRTC signaling)  │
│  (React + Vite)  │◀────│                      │
└──────────────────┘     └──────────────────────┘

WebRTC media flows peer-to-peer (not through the server).
```

### Components

#### Cloudflare Worker (Backend)
- **`src/index.ts`** — REST API for login, message CRUD, and WebSocket upgrade routing
- **`src/durable-object.ts`** — Durable Object managing real-time connections, broadcasting, WebRTC signaling, and KV persistence

#### Web App (React + Vite + Tailwind)
- Single-page app with splash, login, chat, calling, and settings screens
- Connects to the Cloudflare Worker via WebSocket and REST API
- Uses the Web Audio API for notification sounds and ringtone (no audio files needed)
- Uses the Notification API for OS-level popups
- Messages cached in localStorage for instant display on refresh

#### Flutter App (Mobile)
- Full native Android/iOS app with the same functionality
- Uses `flutter_webrtc` for WebRTC calling
- Connects to the same Cloudflare Worker backend

## Deployment

### Prerequisites

- **Node.js 18+** and npm
- **Cloudflare account** with Workers and KV
- **Wrangler CLI** (`npm install -g wrangler`)
- **Flutter SDK** (for mobile builds)

### Quick Deploy

```bash
# 1. Deploy the Cloudflare Worker backend
cd worker
npx wrangler deploy

# 2. Deploy the web app to Cloudflare Pages
cd ../web
npm install
npm run build
npx wrangler pages deploy dist/ --project-name together-web --branch main

# 3. (Optional) Build the Flutter APK
cd ..
flutter build apk --release
```

### Environment Configuration

Create a `.env` file in the root (see `.env.example`):

```
JWT_SECRET=your_secret_key
```

## Local Development

```bash
# Start the Express dev server (with Vite HMR for the web app)
npm install
npm run dev
# Opens at http://localhost:3000

# Or run the web app standalone with hot reload
cd web
npm install
npm run dev

# Run the Cloudflare Worker locally
cd worker
npm install
npx wrangler dev
```

## API Endpoints

| Method | Path                | Description               |
|--------|---------------------|---------------------------|
| POST   | `/api/login`        | Authenticate user         |
| GET    | `/api/messages`     | Fetch message history     |
| POST   | `/api/send-message` | Send and persist message  |
| DELETE | `/api/messages/clear` | Clear all messages      |
| WS     | `/ws`               | WebSocket for real-time   |

## WebSocket Message Types

| Type       | Direction     | Description                     |
|------------|---------------|---------------------------------|
| `message`  | Both          | Text message                    |
| `typing`   | Both          | Typing indicator                |
| `signal`   | Both          | WebRTC signaling (offer/answer/candidate) |
| `status`   | Server→Client | Online/offline presence         |
| `init`     | Server→Client | Initial state on connect        |
| `clearChat`| Both          | Clear chat history              |
| `heartbeat`| Client→Server | Keep-alive ping                 |

## License

Private — for personal use between two partners.
