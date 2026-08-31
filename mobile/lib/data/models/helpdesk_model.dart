class HelpdeskTicketModel {
  final int id;
  final String title;
  final String description;
  final String category; // 'camera', 'hardware', 'iam', 'attendance', 'other'
  final String priority; // 'P1 - Critical', 'P2 - High', 'P3 - Medium', 'P4 - Low'
  final String status; // 'Open', 'In Progress', 'Resolved', 'Closed'
  final String? assignedTo;
  final int? csatRating;
  final String createdAt;

  HelpdeskTicketModel({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.priority,
    required this.status,
    this.assignedTo,
    this.csatRating,
    required this.createdAt,
  });

  factory HelpdeskTicketModel.fromJson(Map<String, dynamic> json) {
    return HelpdeskTicketModel(
      id: json['id'] ?? 0,
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      category: json['category'] ?? 'other',
      priority: json['priority'] ?? 'P3 - Medium',
      status: json['status'] ?? 'Open',
      assignedTo: json['assigned_to']?['full_name'],
      csatRating: json['csat_rating'],
      createdAt: json['created_at'] ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
    'title': title,
    'description': description,
    'category': category,
    'priority': priority,
  };
}

class KBArticleModel {
  final int id;
  final String title;
  final String summary;
  final String content;
  final String category;
  final int helpfulVotes;

  KBArticleModel({
    required this.id,
    required this.title,
    required this.summary,
    required this.content,
    required this.category,
    required this.helpfulVotes,
  });

  factory KBArticleModel.fromJson(Map<String, dynamic> json) {
    return KBArticleModel(
      id: json['id'] ?? 0,
      title: json['title'] ?? '',
      summary: json['summary'] ?? '',
      content: json['content'] ?? '',
      category: json['category']?['name'] ?? 'Chung',
      helpfulVotes: json['helpful_votes'] ?? 0,
    );
  }
}
