/// Single source of truth for user credentials.
///
/// To change usernames, passwords, or display names, edit the [users] list.
/// All screens and services derive their logic from this one place.
class AppCredentials {
  /// The list of authorized users.
  /// To add or change users, edit this list.
  static const List<Map<String, String>> users = [
    {'username': 'zain', 'password': 'together_zain_2026', 'displayName': 'Zain'},
    {'username': 'gf', 'password': 'together_gf_2026', 'displayName': 'GF'},
  ];

  /// Returns the list of valid usernames (e.g., `['zain', 'gf']`).
  static List<String> get allowedUsernames =>
      users.map((u) => u['username']!).toList();

  /// Returns the display name for a given username.
  static String getDisplayName(String username) {
    try {
      return users.firstWhere((u) => u['username'] == username)['displayName']!;
    } catch (_) {
      return username;
    }
  }

  /// Returns the password for a given username, or `null` if not found.
  static String? getPassword(String username) {
    try {
      return users.firstWhere((u) => u['username'] == username)['password'];
    } catch (_) {
      return null;
    }
  }

  /// Given the current user's username, returns the partner's username.
  static String getPartnerUsername(String currentUser) {
    try {
      return users.firstWhere((u) => u['username'] != currentUser)['username']!;
    } catch (_) {
      return 'partner';
    }
  }

  /// Given the current user's username, returns the partner's display name.
  static String getPartnerDisplayName(String currentUser) {
    return getDisplayName(getPartnerUsername(currentUser));
  }
}
