import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/websocket_service.dart';
import '../services/webrtc_service.dart';
import '../utils/constants.dart';
import 'call_screen.dart';
import 'settings_screen.dart';

class HomeScreen extends StatefulWidget {
  final String username;
  final String token;

  const HomeScreen({super.key, required this.username, required this.token});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  bool _isTyping = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final wsService = Provider.of<WebSocketService>(context, listen: false);
      wsService.init(widget.username, widget.token);

      final webrtcService = Provider.of<WebRTCService>(context, listen: false);
      webrtcService.initializeRenderers();

      // Listen for incoming call WebRTC triggers
      wsService.addListener(_handleCallTriggers);
    });

    _messageController.addListener(_onTextChanged);
  }

  void _onTextChanged() {
    final hasText = _messageController.text.isNotEmpty;
    if (_isTyping != hasText) {
      _isTyping = hasText;
      Provider.of<WebSocketService>(context, listen: false).sendTyping(_isTyping);
    }
  }

  void _handleCallTriggers() {
    final webrtcService = Provider.of<WebRTCService>(context, listen: false);
    if (webrtcService.state == CallState.ringing) {
      // Direct user to CallScreen to accept/refuse
      Navigator.push(
        context,
        MaterialPageRoute(builder: (context) => const CallScreen()),
      );
    }
  }

  void _handleSendMessage() {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;

    Provider.of<WebSocketService>(context, listen: false).sendMessage(text);
    _messageController.clear();
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.settings, color: Colors.grey),
          onPressed: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const SettingsScreen()),
            );
          },
        ),
        title: Consumer<WebSocketService>(
          builder: (context, ws, _) {
            final partner = ws.partner;
            return Row(
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.username == 'zain' ? 'GF' : 'Zain',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: partner.isOnline ? Colors.green : Colors.grey,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          partner.isOnline ? "Online" : "Offline",
                          style: TextStyle(
                            color: partner.isOnline ? Colors.green : Colors.grey,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            );
          },
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.call_outlined, color: Colors.white),
            onPressed: () {
              Provider.of<WebRTCService>(context, listen: false).startCall(audioOnly: true);
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const CallScreen()),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.videocam_outlined, color: Colors.white),
            onPressed: () {
              Provider.of<WebRTCService>(context, listen: false).startCall(audioOnly: false);
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const CallScreen()),
              );
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Consumer<WebSocketService>(
        builder: (context, ws, _) {
          return Column(
            children: [
              // Chat List area
              Expanded(
                child: ws.messages.isEmpty
                    ? Center(
                        child: Text(
                          "This conversation is private and encrypted.",
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.grey[750], fontSize: 13),
                        ),
                      )
                    : ListView.builder(
                        controller: _scrollController,
                        reverse: true,
                        itemCount: ws.messages.length,
                        itemBuilder: (context, index) {
                          final msg = ws.messages[index];
                          final isMe = msg.sender == widget.username;
                          return Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16.0,
                              vertical: 4.0,
                            ),
                            child: Align(
                              alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 14.0,
                                  vertical: 10.0,
                                ),
                                decoration: BoxDecoration(
                                  color: isMe ? Colors.white : Colors.grey[900],
                                  borderRadius: BorderRadius.only(
                                    topLeft: const Radius.circular(16),
                                    topRight: const Radius.circular(16),
                                    bottomLeft: Radius.circular(isMe ? 16 : 4),
                                    bottomRight: Radius.circular(isMe ? 4 : 16),
                                  ),
                                ),
                                child: Text(
                                  msg.content,
                                  style: TextStyle(
                                    color: isMe ? Colors.black : Colors.white,
                                    fontSize: 15,
                                  ),
                                ),
                              ),
                            ),
                          );
                        },
                      ),
              ),

              // typing notification
              if (ws.partner.isTyping)
                Padding(
                  padding: const EdgeInsets.all(8.0),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      "${AppConstants.getPartnerName(widget.username)} is typing...",
                      style: const TextStyle(
                        fontStyle: FontStyle.italic,
                        color: Colors.grey,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ),

              // Bottom send bar
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                color: Colors.black,
                child: Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        decoration: BoxDecoration(
                          color: Colors.grey[950],
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(color: Colors.grey[900]!),
                        ),
                        child: TextField(
                          controller: _messageController,
                          style: const TextStyle(color: Colors.white, fontSize: 15),
                          decoration: const InputDecoration(
                            hintText: "Type message...",
                            hintStyle: TextStyle(color: Colors.grey, fontSize: 15),
                            border: InputBorder.none,
                          ),
                          onSubmitted: (_) => _handleSendMessage(),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton(
                      icon: const Icon(Icons.send, color: Colors.white),
                      onPressed: _handleSendMessage,
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
