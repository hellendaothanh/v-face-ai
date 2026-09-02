import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../data/models/helpdesk_model.dart';
import '../../../data/repositories/helpdesk_repository.dart';
import '../../widgets/status_badge.dart';

class TicketDetailScreen extends StatefulWidget {
  final HelpdeskTicketModel ticket;

  const TicketDetailScreen({super.key, required this.ticket});

  @override
  State<TicketDetailScreen> createState() => _TicketDetailScreenState();
}

class _TicketDetailScreenState extends State<TicketDetailScreen> {
  final HelpdeskRepository _repo = HelpdeskRepository();
  late HelpdeskTicketModel _ticket;
  final _commentController = TextEditingController();
  bool _isLoading = false;
  bool _isSending = false;

  @override
  void initState() {
    super.initState();
    _ticket = widget.ticket;
    _refreshDetail();
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _refreshDetail() async {
    setState(() => _isLoading = true);
    try {
      final updated = await _repo.getTicketDetail(_ticket.id);
      if (mounted) {
        setState(() {
          _ticket = updated;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _sendComment() async {
    final text = _commentController.text.trim();
    if (text.isEmpty) return;

    setState(() => _isSending = true);
    try {
      await _repo.addComment(ticketId: _ticket.id, content: text);
      _commentController.clear();
      await _refreshDetail();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.tr('send_reply_error')), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  MarkdownStyleSheet _buildMarkdownStyleSheet({double baseFontSize = 14}) {
    return MarkdownStyleSheet(
      p: TextStyle(
        color: Colors.white.withOpacity(0.9),
        fontSize: baseFontSize,
        height: 1.55,
      ),
      h1: TextStyle(
        color: Colors.white,
        fontSize: baseFontSize + 6,
        fontWeight: FontWeight.bold,
        height: 1.4,
      ),
      h2: TextStyle(
        color: Colors.white,
        fontSize: baseFontSize + 4,
        fontWeight: FontWeight.bold,
        height: 1.4,
      ),
      h3: TextStyle(
        color: AppColors.primaryLight,
        fontSize: baseFontSize + 2,
        fontWeight: FontWeight.w600,
        height: 1.4,
      ),
      h4: TextStyle(
        color: Colors.white,
        fontSize: baseFontSize + 1,
        fontWeight: FontWeight.w600,
      ),
      strong: const TextStyle(
        color: Colors.white,
        fontWeight: FontWeight.bold,
      ),
      em: TextStyle(
        color: Colors.white.withOpacity(0.85),
        fontStyle: FontStyle.italic,
      ),
      code: TextStyle(
        color: AppColors.primaryLight,
        backgroundColor: AppColors.bgDark,
        fontFamily: 'monospace',
        fontSize: baseFontSize - 1,
      ),
      codeblockDecoration: BoxDecoration(
        color: AppColors.bgDark,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.borderDark),
      ),
      codeblockPadding: const EdgeInsets.all(12),
      blockquote: TextStyle(
        color: Colors.white.withOpacity(0.85),
        fontStyle: FontStyle.italic,
        fontSize: baseFontSize,
      ),
      blockquoteDecoration: BoxDecoration(
        color: AppColors.primary.withOpacity(0.08),
        borderRadius: BorderRadius.circular(8),
        border: const Border(
          left: BorderSide(color: AppColors.primaryLight, width: 3.5),
        ),
      ),
      blockquotePadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      listBullet: const TextStyle(
        color: AppColors.primaryLight,
        fontSize: 14,
      ),
      listIndent: 20,
      tableBorder: TableBorder.all(
        color: AppColors.borderDark,
        width: 1,
        borderRadius: BorderRadius.circular(8),
      ),
      tableHead: const TextStyle(
        color: Colors.white,
        fontWeight: FontWeight.bold,
        fontSize: 13,
      ),
      tableBody: TextStyle(
        color: Colors.white.withOpacity(0.9),
        fontSize: 13,
      ),
      tableCellsPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      horizontalRuleDecoration: BoxDecoration(
        border: Border(
          top: BorderSide(
            color: Colors.white.withOpacity(0.15),
            width: 1,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgDark,
      appBar: AppBar(
        title: Text(_ticket.ticketCode),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, size: 20),
            onPressed: _refreshDetail,
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Status & Priority
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          "#${_ticket.category}",
                          style: const TextStyle(color: AppColors.primaryLight, fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                      ),
                      StatusBadge(status: _ticket.status),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Title
                  Text(
                    _ticket.title,
                    style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),

                  // Priority tag
                  Text(
                    "${context.tr('priority_prefix')}: ${_ticket.priority}",
                    style: const TextStyle(color: AppColors.warning, fontSize: 13, fontWeight: FontWeight.w500),
                  ),
                  const SizedBox(height: 16),

                  // Description Box
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceDark,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.borderDark),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "${context.tr('issue_content_header')}:",
                          style: const TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                        MarkdownBody(
                          data: _ticket.description,
                          selectable: true,
                          styleSheet: _buildMarkdownStyleSheet(baseFontSize: 14),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  if (_ticket.assignedTo != null) ...[
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.primaryLight.withOpacity(0.3)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.person_pin_rounded, color: AppColors.primaryLight, size: 20),
                          const SizedBox(width: 8),
                          Text(
                            "${context.tr('assigned_tech_prefix')}: ${_ticket.assignedTo}",
                            style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Resolution Summary (if resolved)
                  if (_ticket.resolutionSummary != null && _ticket.resolutionSummary!.isNotEmpty) ...[
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.success.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.success.withOpacity(0.4)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.check_circle_outline, color: AppColors.success, size: 18),
                              const SizedBox(width: 6),
                              Text(
                                "${context.tr('resolution_header')}:",
                                style: const TextStyle(color: AppColors.success, fontSize: 13, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          MarkdownBody(
                            data: _ticket.resolutionSummary!,
                            selectable: true,
                            styleSheet: _buildMarkdownStyleSheet(baseFontSize: 14),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Comments Thread
                  Text(
                    context.tr('discussion_header'),
                    style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 10),

                  if (_ticket.comments.isEmpty) ...[
                    Text(
                      context.tr('no_discussion_yet'),
                      style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 13),
                    ),
                  ] else ...[
                    ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: _ticket.comments.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final c = _ticket.comments[index];
                        final author = c['author_name'] ?? 'IT Support';
                        final content = c['content'] ?? '';
                        final time = c['created_at'] != null ? c['created_at'].toString().substring(0, 10) : '';
                        final isAiAuthor = author.toLowerCase().contains('ai') || content.contains('🤖') || author.toLowerCase().contains('bot');

                        return Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: isAiAuthor ? AppColors.primary.withOpacity(0.08) : AppColors.surfaceDark,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: isAiAuthor ? AppColors.primaryLight.withOpacity(0.35) : AppColors.borderDark,
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      if (isAiAuthor) ...[
                                        const Icon(Icons.auto_awesome_rounded, color: AppColors.primaryLight, size: 14),
                                        const SizedBox(width: 4),
                                      ],
                                      Text(
                                        author,
                                        style: TextStyle(
                                          color: isAiAuthor ? AppColors.primaryLight : Colors.white,
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),
                                  Text(
                                    time,
                                    style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 11),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              MarkdownBody(
                                data: content,
                                selectable: true,
                                styleSheet: _buildMarkdownStyleSheet(baseFontSize: 13),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ],
                ],
              ),
            ),
          ),

          // Send Comment Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: const BoxDecoration(
              color: AppColors.surfaceDark,
              border: Border(top: BorderSide(color: AppColors.borderDark)),
            ),
            child: SafeArea(
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _commentController,
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        hintText: context.tr('reply_hint'),
                        hintStyle: TextStyle(color: Colors.white.withOpacity(0.35), fontSize: 13),
                        filled: true,
                        fillColor: AppColors.bgDark,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: BorderSide.none),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    onPressed: _isSending ? null : _sendComment,
                    icon: _isSending
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Icon(Icons.send_rounded, color: AppColors.primaryLight),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
