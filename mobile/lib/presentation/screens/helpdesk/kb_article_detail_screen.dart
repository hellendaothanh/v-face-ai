import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../data/models/helpdesk_model.dart';
import '../../../data/repositories/helpdesk_repository.dart';

class KBArticleDetailScreen extends StatefulWidget {
  final KBArticleModel article;

  const KBArticleDetailScreen({super.key, required this.article});

  @override
  State<KBArticleDetailScreen> createState() => _KBArticleDetailScreenState();
}

class _KBArticleDetailScreenState extends State<KBArticleDetailScreen> {
  final HelpdeskRepository _repo = HelpdeskRepository();
  late int _helpfulCount;
  bool _hasVoted = false;

  @override
  void initState() {
    super.initState();
    _helpfulCount = widget.article.helpfulVotes;
  }

  Future<void> _voteHelpful() async {
    if (_hasVoted) return;
    try {
      await _repo.voteHelpful(widget.article.id);
      setState(() {
        _helpfulCount += 1;
        _hasVoted = true;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(context.tr('vote_helpful_thanks')),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final tags = widget.article.tagList;

    return Scaffold(
      backgroundColor: AppColors.bgDark,
      appBar: AppBar(
        title: Text(context.tr('kb_detail_title')),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Category & Meta Row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.primaryLight.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.folder_outlined, color: AppColors.primaryLight, size: 14),
                      const SizedBox(width: 5),
                      Text(
                        widget.article.category,
                        style: const TextStyle(color: AppColors.primaryLight, fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
                Row(
                  children: [
                    Icon(Icons.visibility_outlined, size: 14, color: Colors.white.withValues(alpha: 0.4)),
                    const SizedBox(width: 4),
                    Text(
                      "${widget.article.viewCount} ${context.tr('views_count')}",
                      style: TextStyle(color: Colors.white.withValues(alpha: 0.4), fontSize: 12),
                    ),
                    const SizedBox(width: 12),
                    Icon(Icons.thumb_up_alt_outlined, size: 14, color: AppColors.success.withValues(alpha: 0.8)),
                    const SizedBox(width: 4),
                    Text(
                      "$_helpfulCount",
                      style: const TextStyle(color: AppColors.success, fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Title
            Text(
              widget.article.title,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 22,
                fontWeight: FontWeight.bold,
                height: 1.3,
              ),
            ),
            const SizedBox(height: 12),

            // Tags List
            if (tags.isNotEmpty) ...[
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: tags.map((tag) {
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceDark,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: AppColors.borderDark),
                    ),
                    child: Text(
                      "#$tag",
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.75),
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 14),
            ],

            const Divider(color: AppColors.borderDark),
            const SizedBox(height: 14),

            // Summary Box (if present)
            if (widget.article.summary.isNotEmpty) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.primaryLight.withValues(alpha: 0.2)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.info_outline_rounded, color: AppColors.primaryLight, size: 20),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        widget.article.summary,
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.9),
                          fontSize: 14,
                          height: 1.5,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
            ],

            // Rich Markdown Body
            MarkdownBody(
              data: widget.article.content,
              selectable: true,
              styleSheet: MarkdownStyleSheet(
                p: TextStyle(
                  color: Colors.white.withValues(alpha: 0.88),
                  fontSize: 15,
                  height: 1.65,
                ),
                h1: const TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  height: 1.4,
                ),
                h2: const TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  height: 1.4,
                ),
                h3: const TextStyle(
                  color: AppColors.primaryLight,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  height: 1.4,
                ),
                h4: const TextStyle(
                  color: Colors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
                strong: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
                em: TextStyle(
                  color: Colors.white.withValues(alpha: 0.85),
                  fontStyle: FontStyle.italic,
                ),
                code: const TextStyle(
                  color: AppColors.primaryLight,
                  backgroundColor: AppColors.surfaceDark,
                  fontFamily: 'monospace',
                  fontSize: 13,
                ),
                codeblockDecoration: BoxDecoration(
                  color: AppColors.surfaceDark,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.borderDark),
                ),
                codeblockPadding: const EdgeInsets.all(14),
                blockquote: TextStyle(
                  color: Colors.white.withValues(alpha: 0.8),
                  fontStyle: FontStyle.italic,
                  fontSize: 14,
                ),
                blockquoteDecoration: BoxDecoration(
                  color: AppColors.surfaceDark,
                  borderRadius: BorderRadius.circular(8),
                  border: const Border(
                    left: BorderSide(color: AppColors.primary, width: 4),
                  ),
                ),
                blockquotePadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                listBullet: const TextStyle(
                  color: AppColors.primaryLight,
                  fontSize: 15,
                ),
                listIndent: 24,
                tableBorder: TableBorder.all(
                  color: AppColors.borderDark,
                  width: 1,
                  borderRadius: BorderRadius.circular(8),
                ),
                tableHead: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
                tableBody: TextStyle(
                  color: Colors.white.withValues(alpha: 0.85),
                  fontSize: 13,
                ),
                tableHeadAlign: TextAlign.center,
                tableCellsPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                horizontalRuleDecoration: BoxDecoration(
                  border: Border(
                    top: BorderSide(
                      color: AppColors.borderDark.withValues(alpha: 0.8),
                      width: 1,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 36),

            // Helpful Feedback Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppColors.surfaceDark,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.borderDark),
              ),
              child: Column(
                children: [
                  Text(
                    context.tr('was_helpful_question'),
                    style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 14),
                  ElevatedButton.icon(
                    onPressed: _hasVoted ? null : _voteHelpful,
                    icon: Icon(
                      Icons.thumb_up_rounded,
                      size: 18,
                      color: _hasVoted ? Colors.white54 : Colors.white,
                    ),
                    label: Text(
                      _hasVoted
                          ? context.tr('voted_helpful')
                          : "${context.tr('vote_helpful_btn')} ($_helpfulCount)",
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _hasVoted ? Colors.white12 : AppColors.success,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}
