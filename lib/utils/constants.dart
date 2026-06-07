class AppConstants {
  static const String appName = "Together";
  static const String apiBaseUrl = "https://together-backend.your-username.workers.dev";
  static const String wsUrl = "wss://together-backend.your-username.workers.dev/ws";

  // Pre-configured private users
  static const List<String> allowedUsers = ["zain", "gf"];

  // Helper names
  static String getPartnerName(String currentUser) {
    return currentUser == "zain" ? "GF" : "Zain";
  }
}
