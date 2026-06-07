class Message {
  final String id;
  final String sender;
  final String content;
  final int timestamp;
  final String status; // 'sending' | 'delivered' | 'read'

  Message({
    required this.id,
    required this.sender,
    required this.content,
    required this.timestamp,
    this.status = 'delivered',
  });

  factory Message.fromJson(Map<String, dynamic> json) {
    return Message(
      id: json['id'] as String,
      sender: json['sender'] as String,
      content: json['content'] as String,
      timestamp: json['timestamp'] as int,
      status: json['status'] as String? ?? 'delivered',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'sender': sender,
      'content': content,
      'timestamp': timestamp,
      'status': status,
    };
  }
}
