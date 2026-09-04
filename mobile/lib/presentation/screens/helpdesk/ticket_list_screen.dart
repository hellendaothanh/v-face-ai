import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../data/models/helpdesk_model.dart';
import '../../../data/repositories/helpdesk_repository.dart';
import '../../widgets/status_badge.dart';
import 'create_ticket_screen.dart';
import 'kb_article_detail_screen.dart';
import 'ticket_detail_screen.dart';

class TicketListScreen extends StatefulWidget {
  const TicketListScreen({super.key});

  @override
  State<TicketListScreen> createState() => _TicketListScreenState();
}

class _TicketListScreenState extends State<TicketListScreen> {
  final HelpdeskRepository _repo = HelpdeskRepository();

  bool _isLoadingTickets = true;
  bool _isLoadingKB = true;
  String? _ticketError;
  String? _kbError;

  List<HelpdeskTicketModel> _tickets = [];
  List<KBArticleModel> _articles = [];
  final _searchKBController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadAll();
  }

  @override
  void dispose() {
    _searchKBController.dispose();
    super.dispose();
  }

  Future<void> _loadAll() async {
    _loadTickets();
    _loadKB();
  }

  Future<void> _loadTickets() async {
    setState(() {
      _isLoadingTickets = true;
      _ticketError = null;
    });
    try {
      final list = await _repo.getTickets();
      if (mounted) {
        setState(() {
          _tickets = list;
          _isLoadingTickets = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _ticketError = "Không thể tải danh sách phiếu hỗ trợ.";
          _isLoadingTickets = false;
        });
      }
    }
  }

  Future<void> _loadKB([String? query]) async {
    setState(() {
      _isLoadingKB = true;
      _kbError = null;
    });
    try {
      final list = await _repo.getKBArticles(query: query);
      if (mounted) {
        setState(() {
          _articles = list;
          _isLoadingKB = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _kbError = "Không thể tải bài viết hướng dẫn KB.";
          _isLoadingKB = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: AppColors.bgDark,
        appBar: AppBar(
          title: Text(context.tr('helpdesk_title')),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh_rounded, size: 20),
              onPressed: _loadAll,
            ),
          ],
          bottom: TabBar(
            indicatorColor: AppColors.primaryLight,
            indicatorWeight: 3,
            labelColor: Colors.white,
            unselectedLabelColor: Colors.white60,
            tabs: [
              Tab(icon: const Icon(Icons.confirmation_number_outlined, size: 18), text: context.tr('tab_tickets')),
              Tab(icon: const Icon(Icons.menu_book_rounded, size: 18), text: context.tr('tab_kb')),
            ],
          ),
        ),
        floatingActionButton: FloatingActionButton.extended(
          heroTag: 'create_ticket_fab',
          onPressed: () async {
            final res = await Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const CreateTicketScreen()),
            );
            if (res == true) _loadTickets();
          },
          backgroundColor: AppColors.primary,
          icon: const Icon(Icons.add_rounded, color: Colors.white, size: 20),
          label: Text(context.tr('create_ticket_btn'), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
        ),
        body: TabBarView(
          children: [
            _buildTicketsTab(),
            _buildKBTab(),
          ],
        ),
      ),
    );
  }

  Widget _buildTicketsTab() {
    if (_isLoadingTickets) {
      return const Center(child: CircularProgressIndicator(color: AppColors.primary));
    }
    if (_ticketError != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline_rounded, color: AppColors.error, size: 44),
            const SizedBox(height: 12),
            Text(_ticketError!, style: const TextStyle(color: Colors.white70)),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadTickets,
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
              child: Text(context.tr('retry'), style: const TextStyle(color: Colors.white)),
            ),
          ],
        ),
      );
    }
    if (_tickets.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.support_agent_rounded, color: Colors.white.withValues(alpha: 0.25), size: 56),
            const SizedBox(height: 16),
            Text(context.tr('no_tickets'), style: const TextStyle(color: Colors.white70, fontSize: 15, fontWeight: FontWeight.w600)),
            const SizedBox(height: 6),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Text(context.tr('no_tickets_sub'), textAlign: TextAlign.center, style: TextStyle(color: Colors.white.withValues(alpha: 0.4), fontSize: 12)),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadTickets,
      color: AppColors.primary,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
        itemCount: _tickets.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, index) {
          final ticket = _tickets[index];
          return GestureDetector(
            onTap: () async {
              await Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => TicketDetailScreen(ticket: ticket)),
              );
              _loadTickets();
            },
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.surfaceDark,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.borderDark),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          ticket.ticketCode,
                          style: const TextStyle(color: AppColors.primaryLight, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ),
                      StatusBadge(status: ticket.status),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    ticket.title,
                    style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    ticket.description,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 13),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Icon(Icons.calendar_today_rounded, size: 12, color: Colors.white.withValues(alpha: 0.4)),
                      const SizedBox(width: 4),
                      Text(
                        ticket.createdAt.length > 10 ? ticket.createdAt.substring(0, 10) : ticket.createdAt,
                        style: TextStyle(color: Colors.white.withValues(alpha: 0.4), fontSize: 12),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        ticket.priority,
                        style: const TextStyle(color: AppColors.warning, fontSize: 11, fontWeight: FontWeight.w500),
                      ),
                      if (ticket.assignedTo != null) ...[
                        const Spacer(),
                        Text(
                          "IT: ${ticket.assignedTo}",
                          style: const TextStyle(color: AppColors.primaryLight, fontSize: 12),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildKBTab() {
    return Column(
      children: [
        // KB Search Bar
        Padding(
          padding: const EdgeInsets.all(16),
          child: TextField(
            controller: _searchKBController,
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              hintText: context.tr('search_kb_hint'),
              hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.35)),
              prefixIcon: const Icon(Icons.search_rounded, color: Colors.white70, size: 20),
              suffixIcon: _searchKBController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, color: Colors.white70, size: 18),
                      onPressed: () {
                        _searchKBController.clear();
                        _loadKB();
                      },
                    )
                  : null,
              filled: true,
              fillColor: AppColors.surfaceDark,
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.borderDark)),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.primaryLight)),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            ),
            onSubmitted: (val) => _loadKB(val.trim()),
          ),
        ),

        // Articles List
        Expanded(
          child: _isLoadingKB
              ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
              : _kbError != null
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.error_outline_rounded, color: AppColors.error, size: 44),
                          const SizedBox(height: 12),
                          Text(_kbError!, style: const TextStyle(color: Colors.white70)),
                          const SizedBox(height: 16),
                          ElevatedButton(
                            onPressed: () => _loadKB(),
                            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                            child: Text(context.tr('retry'), style: const TextStyle(color: Colors.white)),
                          ),
                        ],
                      ),
                    )
                  : _articles.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.menu_book_rounded, color: Colors.white.withValues(alpha: 0.25), size: 56),
                              const SizedBox(height: 16),
                              Text(context.tr('no_articles'), style: const TextStyle(color: Colors.white70, fontSize: 15)),
                            ],
                          ),
                        )
                      : RefreshIndicator(
                          onRefresh: () => _loadKB(_searchKBController.text.trim()),
                          color: AppColors.primary,
                          child: ListView.separated(
                            padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
                            itemCount: _articles.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 10),
                            itemBuilder: (context, index) {
                              final art = _articles[index];
                              final tags = art.tagList;

                              return Material(
                                color: Colors.transparent,
                                child: InkWell(
                                  borderRadius: BorderRadius.circular(16),
                                  onTap: () => Navigator.push(
                                    context,
                                    MaterialPageRoute(builder: (_) => KBArticleDetailScreen(article: art)),
                                  ),
                                  child: Container(
                                    padding: const EdgeInsets.all(16),
                                    decoration: BoxDecoration(
                                      color: AppColors.surfaceDark,
                                      borderRadius: BorderRadius.circular(16),
                                      border: Border.all(color: AppColors.borderDark),
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                                              decoration: BoxDecoration(
                                                color: AppColors.primary.withValues(alpha: 0.15),
                                                borderRadius: BorderRadius.circular(6),
                                                border: Border.all(color: AppColors.primaryLight.withValues(alpha: 0.25)),
                                              ),
                                              child: Row(
                                                mainAxisSize: MainAxisSize.min,
                                                children: [
                                                  const Icon(Icons.folder_outlined, color: AppColors.primaryLight, size: 12),
                                                  const SizedBox(width: 4),
                                                  Text(
                                                    art.category,
                                                    style: const TextStyle(color: AppColors.primaryLight, fontSize: 11, fontWeight: FontWeight.bold),
                                                  ),
                                                ],
                                              ),
                                            ),
                                            Row(
                                              children: [
                                                Icon(Icons.visibility_outlined, size: 12, color: Colors.white.withValues(alpha: 0.4)),
                                                const SizedBox(width: 4),
                                                Text("${art.viewCount}", style: TextStyle(color: Colors.white.withValues(alpha: 0.4), fontSize: 11)),
                                                const SizedBox(width: 10),
                                                Icon(Icons.thumb_up_alt_outlined, size: 12, color: AppColors.success.withValues(alpha: 0.8)),
                                                const SizedBox(width: 4),
                                                Text("${art.helpfulVotes}", style: const TextStyle(color: AppColors.success, fontSize: 11, fontWeight: FontWeight.bold)),
                                              ],
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 10),
                                        Text(
                                          art.title,
                                          style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold, height: 1.3),
                                        ),
                                        if (art.summary.isNotEmpty) ...[
                                          const SizedBox(height: 6),
                                          Text(
                                            art.summary,
                                            maxLines: 2,
                                            overflow: TextOverflow.ellipsis,
                                            style: TextStyle(color: Colors.white.withValues(alpha: 0.65), fontSize: 13, height: 1.4),
                                          ),
                                        ],
                                        if (tags.isNotEmpty) ...[
                                          const SizedBox(height: 10),
                                          Wrap(
                                            spacing: 6,
                                            runSpacing: 4,
                                            children: tags.take(3).map((tag) {
                                              return Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                                decoration: BoxDecoration(
                                                  color: Colors.white.withValues(alpha: 0.05),
                                                  borderRadius: BorderRadius.circular(4),
                                                  border: Border.all(color: Colors.white12),
                                                ),
                                                child: Text(
                                                  "#$tag",
                                                  style: TextStyle(color: Colors.white.withValues(alpha: 0.6), fontSize: 10, fontWeight: FontWeight.w500),
                                                ),
                                              );
                                            }).toList(),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
        ),
      ],
    );
  }
}
