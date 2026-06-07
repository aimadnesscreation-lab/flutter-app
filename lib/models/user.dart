class PartnerUser {
  final String username;
  final String displayName;
  final bool isOnline;
  final bool isTyping;

  PartnerUser({
    required this.username,
    required this.displayName,
    this.isOnline = false,
    this.isTyping = false,
  });

  PartnerUser copyWith({
    String? username,
    String? displayName,
    bool? isOnline,
    bool? isTyping,
  }) {
    return PartnerUser(
      username: username ?? this.username,
      displayName: displayName ?? this.displayName,
      isOnline: isOnline ?? this.isOnline,
      isTyping: isTyping ?? this.isTyping,
    );
  }
}
