import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/websocket_service.dart';
import '../services/webrtc_service.dart';
import 'login_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _darkMode = true;
  final String _appVersion = "Together v1.0.0 (Beta)";

  Future<void> _handleLogout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    await prefs.remove('username');

    if (mounted) {
      // Disconnect socket & WebRTC connections
      Provider.of<WebSocketService>(context, listen: false).disconnect();
      Provider.of<WebRTCService>(context, listen: false).endCall();

      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (context) => const LoginScreen()),
        (route) => false,
      );
    }
  }

  void _handleClearChat() {
    showDialog(
      context: context,
      builder: (BuildContext ctx) {
        return AlertDialog(
          backgroundColor: Colors.grey[950],
          title: const Text("Clear History", style: TextStyle(color: Colors.white)),
          content: const Text(
            "Do you want to clear your current session chat history? This action is irreversible.",
            style: TextStyle(color: Colors.grey),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text("Cancel", style: TextStyle(color: Colors.grey)),
            ),
            TextButton(
              onPressed: () {
                Provider.of<WebSocketService>(context, listen: false).clearChat();
                Navigator.of(ctx).pop();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text("Chat history cleared locally"),
                    backgroundColor: Colors.white,
                  ),
                );
              },
              child: const Text("Clear", style: TextStyle(color: Colors.red)),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        iconTheme: const IconThemeData(color: Colors.white),
        title: const Text(
          "Settings",
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w300),
        ),
      ),
      body: ListView(
        children: [
          const SizedBox(height: 16),
          _buildSectionHeader("Appearance"),
          ListTile(
            leading: const Icon(Icons.dark_mode_outlined, color: Colors.white),
            title: const Text("Dark Theme Mode", style: TextStyle(color: Colors.white)),
            trailing: Switch(
              value: _darkMode,
              activeColor: Colors.white,
              activeTrackColor: Colors.grey[800],
              inactiveThumbColor: Colors.grey,
              inactiveTrackColor: Colors.grey[950],
              onChanged: (val) {
                setState(() {
                  _darkMode = val;
                });
              },
            ),
          ),
          const Divider(color: Colors.grey, height: 1),
          _buildSectionHeader("Data & Privacy"),
          ListTile(
            leading: const Icon(Icons.delete_sweep_outlined, color: Colors.white),
            title: const Text("Clear Session History", style: TextStyle(color: Colors.white)),
            onTap: _handleClearChat,
          ),
          const Divider(color: Colors.grey, height: 1),
          _buildSectionHeader("Account Security"),
          ListTile(
            leading: const Icon(Icons.logout, color: Colors.redAccent),
            title: const Text("End Active Session", style: TextStyle(color: Colors.redAccent)),
            onTap: _handleLogout,
          ),
          const Divider(color: Colors.grey, height: 1),
          const SizedBox(height: 36),
          Center(
            child: Text(
              _appVersion,
              style: const TextStyle(color: Colors.grey, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 16, top: 24, bottom: 8),
      style: const TextStyle(
        color: Colors.grey,
        fontSize: 12,
        fontWeight: FontWeight.bold,
        letterSpacing: 1.0,
      ),
      child: Text(title.toUpperCase()),
    );
  }
}
