class HelpdeskTicketModel {
  final dynamic id;
  final String ticketCode;
  final String title;
  final String description;
  final String category; // 'camera', 'hardware', 'iam', 'attendance', 'other'
  final String priority; // 'P1 - Critical', 'P2 - High', 'P3 - Medium', 'P4 - Low'
  final String status; // 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'
  final String? assignedTo;
  final int? csatRating;
  final String createdAt;
  final String? resolutionSummary;
  final List<dynamic> comments;

  HelpdeskTicketModel({
    required this.id,
    required this.ticketCode,
    required this.title,
    required this.description,
    required this.category,
    required this.priority,
    required this.status,
    this.assignedTo,
    this.csatRating,
    required this.createdAt,
    this.resolutionSummary,
    this.comments = const [],
  });

  factory HelpdeskTicketModel.fromJson(Map<String, dynamic> json) {
    String priorityFormatted = (json['priority'] ?? 'P3_MEDIUM').toString().toUpperCase();
    if (priorityFormatted.contains('P1') || priorityFormatted.contains('CRITICAL')) {
      priorityFormatted = 'P1 - Khẩn cấp';
    } else if (priorityFormatted.contains('P2') || priorityFormatted.contains('HIGH')) {
      priorityFormatted = 'P2 - Cao';
    } else if (priorityFormatted.contains('P3') || priorityFormatted.contains('MEDIUM')) {
      priorityFormatted = 'P3 - Bình thường';
    } else {
      priorityFormatted = 'P4 - Thấp';
    }

    String categoryFormatted = json['category_name'] ?? json['category']?['name'] ?? json['ticket_type'] ?? 'Hỗ trợ chung';

    return HelpdeskTicketModel(
      id: json['id'] ?? 0,
      ticketCode: json['ticket_code'] ?? 'INC-000',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      category: categoryFormatted,
      priority: priorityFormatted,
      status: (json['status'] ?? 'OPEN').toString().toUpperCase(),
      assignedTo: json['assignee_name'] ?? json['assigned_to']?['full_name'],
      csatRating: json['satisfaction_rating'] ?? json['csat_rating'],
      createdAt: json['created_at'] ?? '',
      resolutionSummary: json['resolution_summary'],
      comments: json['comments'] is List ? json['comments'] as List : [],
    );
  }

  Map<String, dynamic> toJson() => {
    'title': title,
    'description': description,
    'ticket_type': 'incident',
    'impact': 'medium',
    'urgency': 'medium',
  };
}

class KBArticleModel {
  final dynamic id;
  final String title;
  final String summary;
  final String content;
  final String category;
  final String? tags;
  final int viewCount;
  final int helpfulVotes;
  final String createdAt;

  KBArticleModel({
    required this.id,
    required this.title,
    required this.summary,
    required this.content,
    required this.category,
    this.tags,
    this.viewCount = 0,
    required this.helpfulVotes,
    required this.createdAt,
  });

  List<String> get tagList {
    if (tags == null || tags!.trim().isEmpty) return [];
    final raw = tags!.trim();
    if (raw.startsWith('[') && raw.endsWith(']')) {
      final clean = raw.substring(1, raw.length - 1);
      return clean
          .split(',')
          .map((s) => s.replaceAll('"', '').replaceAll("'", '').trim())
          .where((s) => s.isNotEmpty)
          .toList();
    }
    return raw.split(',').map((s) => s.trim()).where((s) => s.isNotEmpty).toList();
  }

  factory KBArticleModel.fromJson(Map<String, dynamic> json) {
    String categoryName = 'Hướng dẫn chung';
    if (json['category'] is Map && json['category']['name'] != null) {
      categoryName = json['category']['name'].toString();
    } else if (json['category_name'] != null) {
      categoryName = json['category_name'].toString();
    }

    dynamic rawTags = json['tags'];
    String? tagsFormatted;
    if (rawTags is List) {
      tagsFormatted = rawTags.map((e) => e.toString()).join(', ');
    } else if (rawTags != null) {
      tagsFormatted = rawTags.toString();
    }

    return KBArticleModel(
      id: json['id'] ?? 0,
      title: json['title'] ?? '',
      summary: json['summary'] ?? '',
      content: json['content'] ?? '',
      category: categoryName,
      tags: tagsFormatted,
      viewCount: (json['view_count'] as num?)?.toInt() ?? 0,
      helpfulVotes: (json['helpful_count'] ?? json['helpful_votes'] as num?)?.toInt() ?? 0,
      createdAt: json['created_at'] ?? '',
    );
  }
}
