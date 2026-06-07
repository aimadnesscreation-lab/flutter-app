import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/message.dart';
import '../models/user.dart';
import '../utils/constants.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

class WebSocketService with ChangeNotifier {
  WebSocketChannel? _channel;
  bool _isConnected = false;
  bool _isConnecting = false;
  String? _currentUser;
  String? _token;

  PartnerUser partner = PartnerUser(username: 'partner', displayName: 'Partner');
  List<Message> messages = [];
  
  // Callbacks for WebRTC signaling
  Function(Map<String, dynamic>)? onWebRTCSignal;

  bool get isConnected => _isConnected;
  String? get currentUser => _currentUser;

  Future<void> init(String username, String token) async {
    _currentUser = username;
    _token = token;
    partner = PartnerUser(
      username: username == 'zain' ? 'gf' : 'zain',
      displayName: username == 'zain' ? 'GF' : 'Zain',
    );
    connect();
  }

  void connect() {
    if (_isConnecting || _isConnected || _token == null || _currentUser == null) return;
    _isConnecting = true;

    final uri = Uri.parse('${AppConstants.wsUrl}?token=$_token');
    
    try {
      _channel = WebSocketChannel.connect(uri);
      _isConnected = true;
      _isConnecting = false;
      notifyListeners();

      _channel!.stream.listen(
        (data) => _onMessageReceived(data),
        onDone: () => _handleDisconnect(),
        onError: (err) => _handleDisconnect(),
      );

      _startHeartbeat();
    } catch (e) {
      _isConnecting = false;
      _handleDisconnect();
    }
  }

  void _onMessageReceived(dynamic rawData) {
    try {
      final Map<String, dynamic> data = jsonDecode(rawData as String);
      final String type = data['type'] as String;

      switch (type) {
        case 'init':
          partner = partner.copyWith(isOnline: data['partnerOnline'] as bool? ?? false);
          notifyListeners();
          break;

        case 'status':
          if (data['sender'] == partner.username) {
            partner = partner.copyWith(isOnline: data['isOnline'] as bool? ?? false);
            notifyListeners();
          }
          break;

        case 'typing':
          if (data['sender'] == partner.username) {
            partner = partner.copyWith(isTyping: data['isTyping'] as bool? ?? false);
            notifyListeners();
          }
          break;

        case 'message':
          final msg = Message.fromJson(data);
          messages.insert(0, msg);
          notifyListeners();
          break;

        case 'signal':
          if (onWebRTCSignal != null) {
            onWebRTCSignal!(data);
          }
          break;
      }
    } catch (e) {
      if (kDebugMode) print("Error parsing ws event: $e");
    }
  }

  void sendMessage(String content) {
    if (!_isConnected || _channel == null) return;

    final msgId = DateTime.now().millisecondsSinceEpoch.toString();
    final localMsg = Message(
      id: msgId,
      sender: _currentUser!,
      content: content,
      timestamp: DateTime.now().millisecondsSinceEpoch,
    );

    // Apply locally
    messages.insert(0, localMsg);
    notifyListeners();

    // Send payload
    final payload = {
      'type': 'message',
      'id': msgId,
      'content': content,
    };
    _channel!.sink.add(jsonEncode(payload));
  }

  void sendTyping(bool isTyping) {
    if (!_isConnected || _channel == null) return;
    final payload = {
      'type': 'typing',
      'isTyping': isTyping,
    };
    _channel!.sink.add(jsonEncode(payload));
  }

  void sendSignal(String signalType, dynamic payloadData) {
    if (!_isConnected || _channel == null) return;
    final payload = {
      'type': 'signal',
      'signalType': signalType,
      'payload': payloadData,
    };
    _channel!.sink.add(jsonEncode(payload));
  }

  Timer? _heartbeatTimer;
  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 15), (timer) {
      if (_isConnected && _channel != null) {
        _channel!.sink.add(jsonEncode({'type': 'heartbeat'}));
      } else {
        timer.cancel();
      }
    });
  }

  void _handleDisconnect() {
    _isConnected = false;
    _channel = null;
    notifyListeners();
    // Attempt auto reconnect
    Future.delayed(const Duration(seconds: 5), () => connect());
  }

  void clearChat() {
    messages.clear();
    notifyListeners();
  }

  void disconnect() {
    _heartbeatTimer?.cancel();
    _channel?.sink.close();
    _channel = null;
    _isConnected = false;
    notifyListeners();
  }
}
