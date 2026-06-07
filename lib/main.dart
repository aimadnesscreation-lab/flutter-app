import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'screens/splash_screen.dart';
import 'services/websocket_service.dart';
import 'services/webrtc_service.dart';

void main() {
  runApp(const TogetherApp());
}

class TogetherApp extends StatelessWidget {
  const TogetherApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => WebSocketService()),
        ChangeNotifierProxyProvider<WebSocketService, WebRTCService>(
          create: (context) => WebRTCService(
            Provider.of<WebSocketService>(context, listen: false),
          ),
          update: (context, ws, previous) => previous ?? WebRTCService(ws),
        ),
      ],
      child: MaterialApp(
        title: 'Together',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          brightness: Brightness.dark,
          scaffoldBackgroundColor: Colors.black,
          appBarTheme: const AppBarTheme(
            backgroundColor: Colors.black,
            elevation: 0,
          ),
          colorScheme: const ColorScheme.dark(
            primary: Colors.white,
            secondary: Colors.white,
            surface: Colors.black,
          ),
        ),
        home: const SplashScreen(),
      ),
    );
  }
}
