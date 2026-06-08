class AppConstants {
  static const String appName = "Together";
  static const String apiBaseUrl = "https://together-backend.dgfrii1800.workers.dev";
  static const String wsUrl = "wss://together-backend.dgfrii1800.workers.dev/ws";

  // Pre-configured private users
  // See lib/config/credentials.dart for the single source of truth
  // on usernames, passwords, and display names.
  static const List<String> allowedUsers = ["zain", "gf"];

  // Helper names — now delegates to AppCredentials
  static String getPartnerName(String currentUser) {
    return currentUser == "zain" ? "GF" : "Zain";
  }
}
