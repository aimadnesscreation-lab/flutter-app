import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import '../services/webrtc_service.dart';

class CallScreen extends StatelessWidget {
  const CallScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Consumer<WebRTCService>(
        builder: (context, webrtc, _) {
          // If call ended, pop from screen
          if (webrtc.state == CallState.idle) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              Navigator.of(context).pop();
            });
            return const SizedBox();
          }

          return Stack(
            children: [
              // 1. Remote Full Screen view (If video is active)
              if (!webrtc.isAudioOnly && webrtc.state == CallState.active)
                Positioned.fill(
                  child: RTCVideoView(
                    webrtc.remoteRenderer,
                    objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
                  ),
                )
              else
                // Audio call default aesthetic representation
                Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 100,
                        height: 100,
                        decoration: BoxDecoration(
                          color: Colors.grey[900],
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.person, color: Colors.white, size: 50),
                      ),
                      const SizedBox(height: 24),
                      Text(
                        webrtc.isAudioOnly ? "Voice Call" : "Video Call Connecting",
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 24,
                          fontWeight: FontWeight.w200,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _getCallStateLabel(webrtc.state),
                        style: const TextStyle(color: Colors.grey, fontSize: 14),
                      ),
                    ],
                  ),
                ),

              // 2. Local View PIP (If video active, local stream exists, not camera off)
              if (!webrtc.isAudioOnly && webrtc.state == CallState.active && !webrtc.isCameraOff)
                Positioned(
                  right: 20,
                  top: 50,
                  width: 120,
                  height: 160,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      color: Colors.black,
                      child: RTCVideoView(
                        webrtc.localRenderer,
                        mirror: true,
                        objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
                      ),
                    ),
                  ),
                ),

              // 3. Bottom controls
              Positioned(
                bottom: 40,
                left: 0,
                right: 0,
                child: Column(
                  children: [
                    // Incoming call action bar
                    if (webrtc.state == CallState.ringing) ...[
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          FloatingActionButton(
                            heroTag: "decline_call",
                            backgroundColor: Colors.red,
                            foregroundColor: Colors.white,
                            onPressed: () => webrtc.endCall(),
                            child: const Icon(Icons.call_end),
                          ),
                          FloatingActionButton(
                            heroTag: "accept_call",
                            backgroundColor: Colors.green,
                            foregroundColor: Colors.white,
                            onPressed: () => webrtc.handleIncomingOffer({}, webrtc.isAudioOnly),
                            child: const Icon(Icons.call),
                          ),
                        ],
                      ),
                    ] else ...[
                      // Active/connecting call controls
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          IconButton(
                            icon: Icon(
                              webrtc.isMuted ? Icons.mic_off : Icons.mic,
                              color: webrtc.isMuted ? Colors.red : Colors.white,
                              size: 28,
                            ),
                            onPressed: () => webrtc.toggleMute(),
                          ),
                          if (!webrtc.isAudioOnly)
                            IconButton(
                              icon: const Icon(Icons.switch_camera, color: Colors.white, size: 28),
                              onPressed: () => webrtc.switchCamera(),
                            ),
                          if (!webrtc.isAudioOnly)
                            IconButton(
                              icon: Icon(
                                webrtc.isCameraOff ? Icons.videocam_off : Icons.videocam,
                                color: webrtc.isCameraOff ? Colors.red : Colors.white,
                                size: 28,
                              ),
                              onPressed: () => webrtc.toggleCamera(),
                            ),
                          IconButton(
                            icon: Icon(
                              webrtc.isSpeakerOn ? Icons.volume_up : Icons.volume_off,
                              color: webrtc.isSpeakerOn ? Colors.green : Colors.white,
                              size: 28,
                            ),
                            onPressed: () => webrtc.toggleSpeaker(),
                          ),
                          FloatingActionButton(
                            heroTag: "hangup_call",
                            backgroundColor: Colors.red,
                            foregroundColor: Colors.white,
                            onPressed: () => webrtc.endCall(),
                            child: const Icon(Icons.call_end),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  String _getCallStateLabel(CallState s) {
    switch (s) {
      case CallState.ringing:
        return "Ringing...";
      case CallState.connecting:
        return "Connecting dial...";
      case CallState.active:
        return "Call active";
      case CallState.ending:
        return "Disconnecting...";
      default:
        return "";
    }
  }
}
