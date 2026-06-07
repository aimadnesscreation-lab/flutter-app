import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'websocket_service.dart';

enum CallState { idle, ringing, connecting, active, ending }

class WebRTCService with ChangeNotifier {
  final WebSocketService _wsService;
  
  RTCPeerConnection? _peerConnection;
  MediaStream? _localStream;
  MediaStream? _remoteStream;

  CallState state = CallState.idle;
  bool isAudioOnly = false;
  bool isMuted = false;
  bool isSpeakerOn = true;
  bool isCameraOff = false;

  RTCVideoRenderer localRenderer = RTCVideoRenderer();
  RTCVideoRenderer remoteRenderer = RTCVideoRenderer();

  WebRTCService(this._wsService) {
    _wsService.onWebRTCSignal = _onSignalingReceived;
  }

  Future<void> initializeRenderers() async {
    await localRenderer.initialize();
    await remoteRenderer.initialize();
  }

  void disposeRenderers() {
    localRenderer.dispose();
    remoteRenderer.dispose();
  }

  /// Builds media constraints based on whether audio-only or video call.
  Map<String, dynamic> _getMediaConstraints() {
    return {
      'audio': true,
      'video': isAudioOnly
          ? false
          : {
              'mandatory': {
                'minWidth': '640',
                'minHeight': '480',
                'minFrameRate': '30',
              },
              'facingMode': 'user',
              'optional': [],
            },
    };
  }

  /// Returns the default ICE server configuration with Google STUN servers.
  Map<String, dynamic> _getIceConfig() {
    return {
      'iceServers': [
        {'urls': 'stun:stun.l.google.com:19302'},
        {'urls': 'stun:stun1.l.google.com:19302'},
      ],
    };
  }

  /// Shared setup: gets user media, creates the peer connection, adds tracks,
  /// and wires up ICE candidate / track event handlers.
  Future<void> _initializePeerConnection() async {
    final mediaConstraints = _getMediaConstraints();
    _localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
    localRenderer.srcObject = _localStream;

    final config = _getIceConfig();
    _peerConnection = await createPeerConnection(config);

    _localStream!.getTracks().forEach((track) {
      _peerConnection!.addTrack(track, _localStream!);
    });

    _peerConnection!.onIceCandidate = (candidate) {
      _wsService.sendSignal('candidate', {
        'candidate': candidate.candidate,
        'sdpMid': candidate.sdpMid,
        'sdpMLineIndex': candidate.sdpMLineIndex,
      });
    };

    _peerConnection!.onTrack = (event) {
      if (event.streams.isNotEmpty) {
        _remoteStream = event.streams[0];
        remoteRenderer.srcObject = _remoteStream;
        state = CallState.active;
        notifyListeners();
      }
    };
  }

  /// Initiates an outgoing call by acquiring media, creating an offer,
  /// and sending it via the signaling channel.
  Future<void> startCall({required bool audioOnly}) async {
    if (state != CallState.idle) return;
    
    state = CallState.connecting;
    isAudioOnly = audioOnly;
    notifyListeners();

    try {
      await _initializePeerConnection();

      // Create and send offer
      final offer = await _peerConnection!.createOffer();
      await _peerConnection!.setLocalDescription(offer);

      _wsService.sendSignal('offer', {
        'sdp': offer.sdp,
        'type': offer.type,
      });
    } catch (e) {
      endCall();
    }
  }

  /// Handles an incoming offer from the remote peer: acquires media,
  /// sets the remote description, creates an answer, and sends it back.
  Future<void> handleIncomingOffer(Map<String, dynamic> signalPayload, bool audioOnly) async {
    state = CallState.connecting;
    isAudioOnly = audioOnly;
    notifyListeners();

    try {
      await _initializePeerConnection();

      // Set remote offer and create answer
      final offer = RTCSessionDescription(signalPayload['sdp'], signalPayload['type']);
      await _peerConnection!.setRemoteDescription(offer);

      final answer = await _peerConnection!.createAnswer();
      await _peerConnection!.setLocalDescription(answer);

      _wsService.sendSignal('answer', {
        'sdp': answer.sdp,
        'type': answer.type,
      });
    } catch (e) {
      endCall();
    }
  }

  void _onSignalingReceived(Map<String, dynamic> event) async {
    final signalType = event['signalType'] as String;
    final payload = event['payload'];

    if (_peerConnection == null && signalType != 'offer') return;

    switch (signalType) {
      case 'offer':
        state = CallState.ringing;
        notifyListeners();
        break;

      case 'answer':
        final answer = RTCSessionDescription(payload['sdp'], payload['type']);
        await _peerConnection!.setRemoteDescription(answer);
        break;

      case 'candidate':
        final candidate = RTCIceCandidate(
          payload['candidate'],
          payload['sdpMid'],
          payload['sdpMLineIndex'],
        );
        await _peerConnection!.addCandidate(candidate);
        break;
    }
  }

  void toggleMute() {
    if (_localStream == null) return;
    isMuted = !isMuted;
    _localStream!.getAudioTracks().forEach((track) {
      track.enabled = !isMuted;
    });
    notifyListeners();
  }

  void toggleSpeaker() {
    isSpeakerOn = !isSpeakerOn;
    Helper.setSpeakerphoneOn(isSpeakerOn);
    notifyListeners();
  }

  void toggleCamera() {
    if (_localStream == null || isAudioOnly) return;
    isCameraOff = !isCameraOff;
    _localStream!.getVideoTracks().forEach((track) {
      track.enabled = !isCameraOff;
    });
    notifyListeners();
  }

  void switchCamera() {
    if (_localStream == null || isAudioOnly) return;
    Helper.switchCamera(_localStream!.getVideoTracks().first);
  }

  void endCall() {
    _localStream?.getTracks().forEach((track) => track.stop());
    _localStream?.dispose();
    _localStream = null;

    _remoteStream?.getTracks().forEach((track) => track.stop());
    _remoteStream?.dispose();
    _remoteStream = null;

    _peerConnection?.close();
    _peerConnection = null;

    localRenderer.srcObject = null;
    remoteRenderer.srcObject = null;

    state = CallState.idle;
    isMuted = false;
    isSpeakerOn = true;
    isCameraOff = false;
    notifyListeners();

    _wsService.sendSignal('endCall', {});
  }
}
