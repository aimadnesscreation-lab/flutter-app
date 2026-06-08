import '../config/credentials.dart';

class AppConstants {
  static const String appName = "Together";
  static const String apiBaseUrl = "https://together-backend.dgfrii1800.workers.dev";
  static const String wsUrl = "wss://together-backend.dgfrii1800.workers.dev/ws";

  // Pre-configured private users
  // Delegates to AppCredentials (lib/config/credentials.dart) as the single source of truth.
  static List<String> get allowedUsers => AppCredentials.allowedUsernames;

  // Helper names — delegates to AppCredentials
  static String getPartnerName(String currentUser) {
    return AppCredentials.getPartnerDisplayName(currentUser);
  }
}
