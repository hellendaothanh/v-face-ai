import React, { useState, useEffect, useCallback } from 'react';
import {
  LifeBuoy,
  BookOpen,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  MessageSquare,
  ThumbsUp,
  ExternalLink,
  ChevronRight,
  Send,
  User,
  Shield,
  FileText,
  Sparkles,
  Link2,
  XCircle,
  Tag,
  Star,
  Edit,
  Trash2,
  Bold,
  Italic,
  Heading2,
  Code,
  List,
  Info,
  X,
  Bot,
  Cpu,
  RefreshCw
} from 'lucide-react';
import api from '../services/api';
import { useI18n } from '../i18n/I18nContext';
import { useAuth } from '../context/AuthContext';

// Helper Rich Content Renderer for KB (Markdown parser without external dependency)
const renderRichMarkdown = (content) => {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let inCodeBlock = false;
  let codeBuffer = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block check
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${i}`} className="p-4 my-2 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 font-mono text-[11px] overflow-x-auto">
            <code>{codeBuffer.join('\n')}</code>
          </pre>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Callout Note / Warning check
    if (line.trim().startsWith('> [!NOTE]') || line.trim().startsWith('> [!TIP]')) {
      elements.push(
        <div key={`note-${i}`} className="p-3.5 my-2 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 text-xs flex items-start space-x-2.5">
          <Info className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
          <div>{line.replace(/^>\s*\[!(NOTE|TIP)\]/i, '').trim()}</div>
        </div>
      );
      continue;
    }

    if (line.trim().startsWith('> [!WARNING]') || line.trim().startsWith('> [!CAUTION]')) {
      elements.push(
        <div key={`warn-${i}`} className="p-3.5 my-2 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs flex items-start space-x-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <div>{line.replace(/^>\s*\[!(WARNING|CAUTION)\]/i, '').trim()}</div>
        </div>
      );
      continue;
    }

    // Heading H1, H2, H3
    if (line.startsWith('# ')) {
      elements.push(
        <h2 key={`h1-${i}`} className="text-base font-bold text-white mt-4 mb-2 pb-1 border-b border-slate-800">
          {line.replace(/^#\s+/, '')}
        </h2>
      );
      continue;
    }

    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={`h2-${i}`} className="text-sm font-bold text-amber-300 mt-3 mb-1.5 flex items-center space-x-1.5">
          <span>{line.replace(/^##\s+/, '')}</span>
        </h3>
      );
      continue;
    }

    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={`h3-${i}`} className="text-xs font-bold text-cyan-300 mt-2 mb-1">
          {line.replace(/^###\s+/, '')}
        </h4>
      );
      continue;
    }

    // List item
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      elements.push(
        <li key={`li-${i}`} className="ml-4 list-disc text-xs text-slate-300 my-0.5">
          {formatInlineStyles(line.trim().replace(/^[-*]\s+/, ''))}
        </li>
      );
      continue;
    }

    // Empty line spacer
    if (!line.trim()) {
      elements.push(<div key={`sp-${i}`} className="h-2" />);
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${i}`} className="text-xs text-slate-300 leading-relaxed my-1">
        {formatInlineStyles(line)}
      </p>
    );
  }

  return <div className="space-y-1">{elements}</div>;
};

// Helper for inline bold, code, and italic
const formatInlineStyles = (text) => {
  if (!text) return text;
  const parts = [];
  // Tokenize `code`, **bold**, *italic*
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={match.index} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] text-cyan-300">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(<strong key={match.index} className="font-bold text-white">{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(<em key={match.index} className="italic text-slate-200">{token.slice(1, -1)}</em>);
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
};

// Helper to get consistent Tag badge color
const getTagBadgeStyle = (tag) => {
  const tLower = tag.toLowerCase().trim();
  if (tLower.includes('camera') || tLower.includes('face') || tLower.includes('ai')) {
    return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/25';
  }
  if (tLower.includes('network') || tLower.includes('rtsp') || tLower.includes('ip')) {
    return 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25';
  }
  if (tLower.includes('iam') || tLower.includes('user') || tLower.includes('auth')) {
    return 'bg-purple-500/15 text-purple-300 border-purple-500/30 hover:bg-purple-500/25';
  }
  if (tLower.includes('helpdesk') || tLower.includes('sla') || tLower.includes('itil')) {
    return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25';
  }
  return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/25';
};

const HelpdeskManager = () => {
  const { t } = useI18n();
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState('tickets'); // 'tickets', 'kb', 'create'
  
  // Tickets State
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketSearch, setTicketSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Knowledge Base State
  const [categories, setCategories] = useState([]);
  const [articles, setArticles] = useState([]);
  const [kbSearch, setKbSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(null);

  // KB Article Create / Edit Modal State
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState(null);
  const [articleForm, setArticleForm] = useState({
    title: '',
    category_id: '',
    summary: '',
    content: '',
    tags: '',
    is_published: true,
  });
  const [articleSubmitting, setArticleSubmitting] = useState(false);

  // New Ticket Form
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    ticket_type: 'INCIDENT',
    impact: 'MEDIUM',
    urgency: 'MEDIUM',
    category_id: '',
    linked_kb_id: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [suggestedKBs, setSuggestedKBs] = useState([]);

  // Comment & Resolution State
  const [newComment, setNewComment] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveKbId, setResolveKbId] = useState('');

  // Feedback State
  const [csatRating, setCsatRating] = useState(5);
  const [csatFeedback, setCsatFeedback] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // AI Diagnose Loading State
  const [aiDiagnosing, setAiDiagnosing] = useState(false);

  // Notification Toast
  const [notification, setNotification] = useState(null);
  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // 1. Fetch Tickets
  const fetchTickets = useCallback(async () => {
    setTicketsLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (ticketSearch) params.search = ticketSearch;
      const res = await api.getTickets(params);
      setTickets(Array.isArray(res) ? res : res?.data || []);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setTicketsLoading(false);
    }
  }, [statusFilter, priorityFilter, ticketSearch]);

  // 2. Fetch KB Categories & Articles
  const fetchKB = useCallback(async () => {
    try {
      const [catRes, artRes] = await Promise.all([
        api.getKBCategories(),
        api.getKBArticles({ category_id: selectedCategory || undefined, search: kbSearch || undefined }),
      ]);
      setCategories(Array.isArray(catRes) ? catRes : catRes?.data || []);
      setArticles(Array.isArray(artRes) ? artRes : artRes?.data || []);
    } catch (err) {
      console.error('Error fetching KB:', err);
    }
  }, [selectedCategory, kbSearch]);

  // Open Create Article Modal
  const handleOpenAddArticle = () => {
    setEditingArticleId(null);
    setArticleForm({
      title: '',
      category_id: categories.length > 0 ? categories[0].id : '',
      summary: '',
      content: '',
      tags: '',
      is_published: true,
    });
    setShowArticleModal(true);
  };

  // Open Edit Article Modal
  const handleOpenEditArticle = (art) => {
    setEditingArticleId(art.id);
    setArticleForm({
      title: art.title || '',
      category_id: art.category_id || '',
      summary: art.summary || '',
      content: art.content || '',
      tags: art.tags || '',
      is_published: art.is_published !== false,
    });
    setShowArticleModal(true);
  };

  // Save KB Article (Create or Update)
  const handleSaveArticle = async (e) => {
    e.preventDefault();
    if (!articleForm.title.trim() || !articleForm.content.trim() || !articleForm.category_id) {
      showToast('Vui lòng điền đầy đủ tiêu đề, danh mục và nội dung bài viết', 'error');
      return;
    }
    setArticleSubmitting(true);
    try {
      if (editingArticleId) {
        const updated = await api.updateKBArticle(editingArticleId, articleForm);
        showToast(t('helpdesk_kb_toast_updated', 'Đã cập nhật bài viết tri thức thành công!'));
        if (selectedArticle && selectedArticle.id === editingArticleId) {
          setSelectedArticle(updated);
        }
      } else {
        await api.createKBArticle(articleForm);
        showToast(t('helpdesk_kb_toast_created', 'Đã tạo bài viết tri thức mới thành công!'));
      }
      setShowArticleModal(false);
      fetchKB();
    } catch (err) {
      showToast(err.message || 'Lỗi khi lưu bài viết', 'error');
    } finally {
      setArticleSubmitting(false);
    }
  };

  // Delete KB Article
  const handleDeleteArticle = async (articleId) => {
    if (!window.confirm(t('helpdesk_kb_delete_confirm', 'Bạn có chắc chắn muốn xóa bài viết tri thức này không?'))) {
      return;
    }
    try {
      await api.deleteKBArticle(articleId);
      showToast(t('helpdesk_kb_toast_deleted', 'Đã xóa bài viết tri thức thành công!'));
      setSelectedArticle(null);
      fetchKB();
    } catch (err) {
      showToast(err.message || 'Lỗi khi xóa bài viết', 'error');
    }
  };

  // Insert markdown snippet into content textarea
  const insertMarkdown = (snippet, wrap = false) => {
    setArticleForm(prev => {
      if (wrap) {
        return { ...prev, content: prev.content ? `${prev.content}\n${snippet}` : snippet };
      }
      return { ...prev, content: `${prev.content} ${snippet}` };
    });
  };

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    fetchKB();
  }, [fetchKB]);

  // Search Suggested KBs when typing ticket title
  useEffect(() => {
    if (newTicket.title.trim().length >= 3) {
      const filtered = articles.filter(a => 
        a.title.toLowerCase().includes(newTicket.title.toLowerCase()) ||
        (a.tags && a.tags.toLowerCase().includes(newTicket.title.toLowerCase()))
      );
      setSuggestedKBs(filtered.slice(0, 3));
    } else {
      setSuggestedKBs([]);
    }
  }, [newTicket.title, articles]);

  // 3. Create Ticket Submit
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        title: newTicket.title.trim(),
        description: newTicket.description.trim(),
        ticket_type: newTicket.ticket_type,
        impact: newTicket.impact,
        urgency: newTicket.urgency,
        category_id: newTicket.category_id || null,
        linked_kb_id: newTicket.linked_kb_id || null,
      };
      const res = await api.createTicket(payload);
      showToast(`${t('helpdesk_toast_created', 'Tạo yêu cầu hỗ trợ thành công!')} #${res.ticket_code}`);
      setNewTicket({
        title: '',
        description: '',
        ticket_type: 'INCIDENT',
        impact: 'MEDIUM',
        urgency: 'MEDIUM',
        category_id: '',
        linked_kb_id: '',
      });
      setActiveTab('tickets');
      fetchTickets();
    } catch (err) {
      showToast(err.message || t('helpdesk_toast_create_error', 'Lỗi khi tạo ticket'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Send Comment
  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedTicket) return;
    try {
      await api.addTicketComment(selectedTicket.id, {
        content: newComment.trim(),
        is_internal: isInternalComment,
      });
      setNewComment('');
      // Refresh selected ticket detail
      const refreshed = await api.getTicketDetail(selectedTicket.id);
      setSelectedTicket(refreshed);
      fetchTickets();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // 5. Resolve Ticket with KB
  const handleResolveTicket = async () => {
    if (!selectedTicket) return;
    try {
      await api.updateTicket(selectedTicket.id, {
        status: 'RESOLVED',
        resolution_summary: resolutionSummary || 'Resolved according to standard ITIL procedures.',
        linked_kb_id: resolveKbId || selectedTicket.linked_kb_id || null,
      });
      showToast(`${t('helpdesk_toast_resolved', 'Đã chuyển Ticket sang trạng thái RESOLVED.')} #${selectedTicket.ticket_code}`);
      setShowResolveModal(false);
      const refreshed = await api.getTicketDetail(selectedTicket.id);
      setSelectedTicket(refreshed);
      fetchTickets();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // 6. Submit CSAT Feedback
  const handleSubmitFeedback = async () => {
    if (!selectedTicket) return;
    try {
      await api.submitTicketFeedback(selectedTicket.id, {
        rating: csatRating,
        feedback: csatFeedback,
      });
      showToast(t('helpdesk_toast_csat_success', 'Cảm ơn bạn đã đánh giá chất lượng dịch vụ hỗ trợ!'));
      setShowFeedbackModal(false);
      const refreshed = await api.getTicketDetail(selectedTicket.id);
      setSelectedTicket(refreshed);
      fetchTickets();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Helper Priority Badge
  const renderPriorityBadge = (p) => {
    switch (p) {
      case 'P1_CRITICAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">P1 CRITICAL</span>;
      case 'P2_HIGH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">P2 HIGH</span>;
      case 'P3_MEDIUM':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">P3 MEDIUM</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-700 text-slate-300">P4 LOW</span>;
    }
  };

  // Helper Status Badge
  const renderStatusBadge = (s) => {
    switch (s) {
      case 'OPEN':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">{t('helpdesk_status_open', 'OPEN')}</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 animate-pulse">{t('helpdesk_status_in_progress', 'IN PROGRESS')}</span>;
      case 'RESOLVED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">{t('helpdesk_status_resolved', 'RESOLVED')}</span>;
      case 'CLOSED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">{t('helpdesk_status_closed', 'CLOSED')}</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">{s}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 text-xs font-semibold backdrop-blur-md transition-all ${
            notification.type === 'error'
              ? 'bg-rose-500/90 text-white border border-rose-400'
              : 'bg-emerald-500/90 text-white border border-emerald-400'
          }`}
        >
          {notification.type === 'error' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Top Banner: Service Desk ITIL Overview */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 shadow-xl">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
            <LifeBuoy className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-white tracking-wide">{t('helpdesk_banner_title', 'ITIL Helpdesk & Knowledge Base Hub')}</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                ITIL v4 Ready
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {t('helpdesk_banner_sub', 'Quản lý sự cố (Incident), yêu cầu dịch vụ (Service Request), cam kết SLA tự động & Cơ sở tri thức chuẩn ITIL')}
            </p>
          </div>
        </div>

        {/* Action Buttons in Banner */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('create')}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-amber-600/30 transition-all flex-1 md:flex-none justify-center"
          >
            <Plus className="w-4 h-4" />
            <span>{t('helpdesk_btn_new_ticket', 'Tạo Ticket Mới')}</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => { setActiveTab('tickets'); setSelectedTicket(null); }}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all ${
            activeTab === 'tickets'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <LifeBuoy className="w-4 h-4" />
          <span>{t('helpdesk_tab_tickets', 'Danh Sách Yêu Cầu')} ({tickets.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab('kb'); setSelectedArticle(null); }}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all ${
            activeTab === 'kb'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>{t('helpdesk_tab_kb', 'Cơ Sở Tri Thức (KB)')} ({articles.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('create')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all ${
            activeTab === 'create'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>{t('helpdesk_tab_create', 'Gửi Sự Cố / Yêu Cầu')}</span>
        </button>
      </div>

      {/* ====================================================================== */}
      {/* TAB 1: TICKETS LIST & DETAIL */}
      {/* ====================================================================== */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          {selectedTicket ? (
            /* Ticket Detail View */
            <div className="space-y-4">
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-xs text-amber-400 hover:underline flex items-center space-x-1"
              >
                <span>{t('helpdesk_back_to_list', '← Quay lại danh sách yêu cầu')}</span>
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Main Ticket Discussion */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-amber-400 text-sm">
                            {selectedTicket.ticket_code}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                            {selectedTicket.ticket_type}
                          </span>
                          {renderPriorityBadge(selectedTicket.priority)}
                        </div>
                        <h3 className="text-lg font-bold text-white mt-2">{selectedTicket.title}</h3>
                      </div>
                      <div>{renderStatusBadge(selectedTicket.status)}</div>
                    </div>

                    <p className="text-xs text-slate-300 whitespace-pre-line bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                      {selectedTicket.description}
                    </p>

                    {/* Linked Knowledge Base Solution Badge */}
                    {selectedTicket.linked_kb_title && (
                      <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between">
                        <div className="flex items-center space-x-2.5 text-xs text-indigo-300">
                          <BookOpen className="w-4 h-4 text-indigo-400" />
                          <span>{t('helpdesk_linked_kb_badge', 'Giải pháp đính kèm từ KB:')} <strong>{selectedTicket.linked_kb_title}</strong></span>
                        </div>
                        <button
                          onClick={() => {
                            const found = articles.find(a => a.id === selectedTicket.linked_kb_id);
                            if (found) {
                              setSelectedArticle(found);
                              setActiveTab('kb');
                            }
                          }}
                          className="text-[11px] text-indigo-400 hover:underline flex items-center space-x-1 font-semibold"
                        >
                          <span>{t('helpdesk_view_article', 'Xem bài viết')}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Resolution Summary if resolved */}
                    {selectedTicket.resolution_summary && (
                      <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 space-y-1">
                        <div className="font-bold flex items-center space-x-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>{t('helpdesk_resolution_note_title', 'Tóm tắt cách giải quyết (Resolution Note):')}</span>
                        </div>
                        <p className="text-slate-300">{selectedTicket.resolution_summary}</p>
                      </div>
                    )}
                  </div>

                  {/* Comments / Activity Timeline */}
                  <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                        <MessageSquare className="w-4 h-4 text-amber-400" />
                        <span>{t('helpdesk_timeline_title', 'Lịch Sử Trao Đổi & Phản Hồi')} ({selectedTicket.comments?.length || 0})</span>
                      </h4>

                      {/* AI Re-diagnose Button */}
                      <button
                        onClick={async () => {
                          setAiDiagnosing(true);
                          try {
                            const res = await api.triggerAIDiagnose(selectedTicket.id);
                            showToast(t('helpdesk_ai_toast_diagnosed', 'AI Agent đã hoàn tất chẩn đoán và cập nhật hướng dẫn vào Timeline!'));
                            setSelectedTicket(res);
                            fetchTickets();
                          } catch (err) {
                            showToast(err.message || 'Lỗi khi kích hoạt AI', 'error');
                          } finally {
                            setAiDiagnosing(false);
                          }
                        }}
                        disabled={aiDiagnosing}
                        className="px-3 py-1 rounded-xl bg-cyan-600/20 border border-cyan-500/30 hover:bg-cyan-600/30 text-cyan-300 text-[11px] font-semibold flex items-center space-x-1.5 transition-all shadow-sm shadow-cyan-500/10"
                      >
                        {aiDiagnosing ? (
                          <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        )}
                        <span>{aiDiagnosing ? t('helpdesk_ai_diagnosing', 'AI đang phân tích...') : t('helpdesk_ai_btn_redediagnose', 'Yêu cầu AI Chẩn Đoán Lại')}</span>
                      </button>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                      {selectedTicket.comments?.map((c) => {
                        const isAI = c.content && (
                          c.content.includes('V-Face AI Support Agent') || 
                          c.content.includes('AI Helpdesk') ||
                          c.content.includes('🤖')
                        );
                        return (
                          <div
                            key={c.id}
                            className={`p-4 rounded-2xl border text-xs transition-all ${
                              isAI
                                ? 'bg-gradient-to-br from-cyan-950/40 via-indigo-950/30 to-slate-900/90 border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                                : c.is_internal
                                ? 'bg-amber-950/30 border-amber-500/30 text-amber-200'
                                : 'bg-slate-900/60 border-slate-800 text-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 pb-1.5 border-b border-slate-800/80">
                              <span className="font-bold flex items-center space-x-1.5">
                                {isAI ? (
                                  <span className="flex items-center space-x-1.5 text-cyan-300">
                                    <div className="w-5 h-5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
                                      <Bot className="w-3.5 h-3.5 text-cyan-400" />
                                    </div>
                                    <span className="font-bold tracking-wide">{t('helpdesk_ai_badge', 'V-Face AI IT Assistant')}</span>
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                      AI Auto-Resolution
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-white flex items-center space-x-1">
                                    <User className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{c.author_name}</span>
                                    {c.is_internal && <span className="text-amber-400 font-semibold">{t('helpdesk_internal_badge', '[Ghi chú nội bộ IT]')}</span>}
                                  </span>
                                )}
                              </span>
                              <span className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleString()}</span>
                            </div>

                            {/* Markdown Render for AI or plain content */}
                            {isAI ? (
                              <div className="prose prose-invert max-w-none text-xs text-slate-200">
                                {renderRichMarkdown(c.content)}
                              </div>
                            ) : (
                              <p className="whitespace-pre-line text-slate-200">{c.content}</p>
                            )}
                          </div>
                        );
                      })}
                      {(!selectedTicket.comments || selectedTicket.comments.length === 0) && (
                        <p className="text-xs text-slate-500 text-center py-4">{t('helpdesk_no_comments', 'Chưa có bình luận nào.')}</p>
                      )}
                    </div>

                    {/* Add Comment Form */}
                    <form onSubmit={handleSendComment} className="space-y-2 pt-2 border-t border-slate-800">
                      <textarea
                        rows="2"
                        placeholder={t('helpdesk_comment_placeholder', 'Nhập nội dung trao đổi hoặc cập nhật tiến độ...')}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl glass-input text-xs text-white"
                        required
                      />
                      <div className="flex items-center justify-between">
                        <label className="flex items-center space-x-2 text-[11px] text-slate-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isInternalComment}
                            onChange={(e) => setIsInternalComment(e.target.checked)}
                            className="rounded border-slate-700 text-amber-600 focus:ring-amber-500"
                          />
                          <span>{t('helpdesk_internal_note_lbl', 'Ghi chú nội bộ (Chỉ Kỹ thuật viên thấy)')}</span>
                        </label>
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs flex items-center space-x-1.5 shadow-md shadow-amber-600/20"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{t('helpdesk_btn_send_comment', 'Gửi Phản Hồi')}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Right: ITIL Sidebar Info & Actions */}
                <div className="space-y-4">
                  {/* Action Controls */}
                  <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">{t('helpdesk_actions_title', 'Thao Tác ITIL')}</h4>
                    
                    {selectedTicket.status !== 'RESOLVED' && selectedTicket.status !== 'CLOSED' && (
                      <button
                        onClick={() => setShowResolveModal(true)}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/30 transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{t('helpdesk_btn_resolve', 'Đóng & Giải Quyết Ticket (Resolve)')}</span>
                      </button>
                    )}

                    {selectedTicket.status === 'RESOLVED' && !selectedTicket.satisfaction_rating && (
                      <button
                        onClick={() => setShowFeedbackModal(true)}
                        className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-amber-600/30 transition-all"
                      >
                        <Star className="w-4 h-4" />
                        <span>{t('helpdesk_btn_csat', 'Đánh Giá Hài Lòng (CSAT)')}</span>
                      </button>
                    )}
                  </div>

                  {/* ITIL Metadata & SLA Card */}
                  <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3 text-xs">
                    <h4 className="font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
                      {t('helpdesk_sla_card_title', 'Thông Tin Cam Kết SLA')}
                    </h4>

                    <div className="space-y-2 text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-400">{t('helpdesk_requester_lbl', 'Người yêu cầu:')}</span>
                        <span className="font-semibold text-white">{selectedTicket.requester_name || 'Admin'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">{t('helpdesk_category_lbl', 'Danh mục:')}</span>
                        <span className="font-semibold text-white">{selectedTicket.category_name || 'System'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">{t('helpdesk_impact_lbl', 'Mức độ tác động (Impact):')}</span>
                        <span className="font-semibold text-amber-300">{selectedTicket.impact}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">{t('helpdesk_urgency_lbl', 'Mức độ khẩn cấp (Urgency):')}</span>
                        <span className="font-semibold text-amber-300">{selectedTicket.urgency}</span>
                      </div>
                      <div className="border-t border-slate-800/80 pt-2 flex justify-between">
                        <span className="text-slate-400">{t('helpdesk_sla_response_lbl', 'Hạn phản hồi (Response SLA):')}</span>
                        <span className="font-mono text-cyan-300">
                          {selectedTicket.sla_response_due ? new Date(selectedTicket.sla_response_due).toLocaleTimeString() : '--'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">{t('helpdesk_sla_resolve_lbl', 'Hạn giải quyết (Resolve SLA):')}</span>
                        <span className="font-mono text-cyan-300">
                          {selectedTicket.sla_resolve_due ? new Date(selectedTicket.sla_resolve_due).toLocaleString() : '--'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Tickets Roster Table */
            <>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder={t('helpdesk_search_ticket_placeholder', 'Tìm mã ticket, tiêu đề sự cố...')}
                    value={ticketSearch}
                    onChange={(e) => setTicketSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs text-white"
                  />
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2.5 rounded-xl glass-input text-xs text-white"
                  >
                    <option value="">{t('helpdesk_filter_status_all', 'Tất cả trạng thái')}</option>
                    <option value="OPEN">OPEN</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>

                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="px-3 py-2.5 rounded-xl glass-input text-xs text-white"
                  >
                    <option value="">{t('helpdesk_filter_priority_all', 'Tất cả mức ưu tiên')}</option>
                    <option value="P1_CRITICAL">P1 - CRITICAL (15m/2h)</option>
                    <option value="P2_HIGH">P2 - HIGH (30m/4h)</option>
                    <option value="P3_MEDIUM">P3 - MEDIUM (2h/24h)</option>
                    <option value="P4_LOW">P4 - LOW (4h/48h)</option>
                  </select>
                </div>
              </div>

              <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="p-4">{t('helpdesk_th_code_type', 'Mã & Phân Loại')}</th>
                        <th className="p-4">{t('helpdesk_th_title_requester', 'Tiêu Đề Sự Cố / Yêu Cầu')}</th>
                        <th className="p-4">{t('helpdesk_th_priority', 'Mức Ưu Tiên (ITIL)')}</th>
                        <th className="p-4">{t('helpdesk_th_status', 'Trạng Thái')}</th>
                        <th className="p-4">{t('helpdesk_th_sla_due', 'Hạn Giải Quyết SLA')}</th>
                        <th className="p-4 text-right">{t('helpdesk_th_details', 'Chi Tiết')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {tickets.map((tItem) => (
                        <tr
                          key={tItem.id}
                          onClick={() => setSelectedTicket(tItem)}
                          className="hover:bg-slate-900/40 transition-all cursor-pointer"
                        >
                          <td className="p-4">
                            <div className="font-mono font-bold text-amber-400 text-xs">{tItem.ticket_code}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{tItem.ticket_type}</div>
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-white">{tItem.title}</div>
                            <div className="text-[11px] text-slate-400 flex items-center space-x-2 mt-0.5">
                              <span>{t('helpdesk_requested_by', 'Yêu cầu bởi:')} {tItem.requester_name || 'Admin'}</span>
                              {tItem.linked_kb_id && (
                                <span className="flex items-center space-x-0.5 text-indigo-400 font-semibold">
                                  <BookOpen className="w-3 h-3" />
                                  <span>{t('helpdesk_attached_kb', 'Gắn KB')}</span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">{renderPriorityBadge(tItem.priority)}</td>
                          <td className="p-4">{renderStatusBadge(tItem.status)}</td>
                          <td className="p-4 font-mono text-[11px] text-slate-300">
                            {tItem.sla_resolve_due ? new Date(tItem.sla_resolve_due).toLocaleString() : '--'}
                          </td>
                          <td className="p-4 text-right text-amber-400 font-semibold">
                            <ChevronRight className="w-4 h-4 inline-block" />
                          </td>
                        </tr>
                      ))}
                      {tickets.length === 0 && (
                        <tr>
                          <td colSpan="6" className="p-8 text-center text-slate-400">
                            {t('helpdesk_no_tickets', 'Chưa có yêu cầu hỗ trợ nào. Bấm "Tạo Ticket Mới" để gửi sự cố.')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ====================================================================== */}
      {/* TAB 2: KNOWLEDGE BASE (KB) */}
      {/* ====================================================================== */}
      {activeTab === 'kb' && (
        <div className="space-y-6">
          {selectedArticle ? (
            /* KB Article Reader with Rich Markdown & Action Controls */
            <div className="glass-panel p-8 rounded-3xl border border-slate-800 space-y-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="text-xs text-amber-400 hover:underline flex items-center space-x-1"
                >
                  <span>{t('helpdesk_back_to_kb', '← Quay lại danh sách Cơ sở tri thức')}</span>
                </button>

                {/* Article Edit & Delete Actions */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleOpenEditArticle(selectedArticle)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center space-x-1.5 border border-slate-700 transition-all"
                  >
                    <Edit className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t('helpdesk_kb_btn_edit_article', 'Chỉnh Sửa')}</span>
                  </button>
                  <button
                    onClick={() => handleDeleteArticle(selectedArticle.id)}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center space-x-1.5 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>{t('helpdesk_kb_btn_delete_article', 'Xóa')}</span>
                  </button>
                </div>
              </div>

              <div className="border-b border-slate-800 pb-4">
                <div className="flex items-center space-x-2 text-xs text-amber-400 font-semibold mb-2">
                  <BookOpen className="w-4 h-4" />
                  <span>{selectedArticle.category?.name || 'Guide'}</span>
                </div>
                <h2 className="text-xl font-bold text-white">{selectedArticle.title}</h2>
                <p className="text-xs text-slate-400 mt-1">
                  {t('helpdesk_published_on', 'Đăng ngày')} {new Date(selectedArticle.created_at).toLocaleDateString()} • {selectedArticle.view_count} {t('helpdesk_views', 'lượt xem')} • {selectedArticle.helpful_count} {t('helpdesk_helpful_count_label', 'lượt hữu ích')}
                </p>
              </div>

              {/* Rich Markdown Formatted Article Body */}
              <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 text-slate-300">
                {renderRichMarkdown(selectedArticle.content)}
              </div>

              {/* Article Footer: Interactive Tag Badges & Helpful Button */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 border-t border-slate-800">
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                  <Tag className="w-3.5 h-3.5 text-slate-400 mr-1" />
                  <span className="font-semibold text-slate-300">{t('helpdesk_kb_tags_lbl', 'Thẻ:')}</span>
                  {selectedArticle.tags ? (
                    selectedArticle.tags.split(',').map((tag, idx) => {
                      const tTrimmed = tag.trim();
                      if (!tTrimmed) return null;
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            setSelectedTag(tTrimmed);
                            setSelectedArticle(null);
                          }}
                          className={`px-2.5 py-0.5 rounded-lg border text-[11px] font-mono transition-all ${getTagBadgeStyle(tTrimmed)}`}
                        >
                          #{tTrimmed}
                        </button>
                      );
                    })
                  ) : (
                    <span className="text-slate-500 italic">none</span>
                  )}
                </div>

                <button
                  onClick={async () => {
                    await api.markKBArticleHelpful(selectedArticle.id);
                    showToast(t('helpdesk_toast_helpful_success', 'Cảm ơn bạn đã phản hồi bài viết hữu ích!'));
                    fetchKB();
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/40 text-indigo-300 text-xs font-semibold flex items-center space-x-1.5 transition-all"
                >
                  <ThumbsUp className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{t('helpdesk_kb_helpful_btn', 'Bài viết hữu ích')} ({selectedArticle.helpful_count})</span>
                </button>
              </div>
            </div>
          ) : (
            /* KB Search & Browse Catalog with Add Article button & Tag Filters */
            <>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-96">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder={t('helpdesk_kb_search_placeholder', 'Tìm kiếm giải pháp theo từ khóa...')}
                    value={kbSearch}
                    onChange={(e) => setKbSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs text-white"
                  />
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-2.5 rounded-xl glass-input text-xs text-white"
                  >
                    <option value="">{t('helpdesk_kb_all_categories', 'Tất cả danh mục')}</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>

                  {/* Add New Article Button */}
                  <button
                    onClick={handleOpenAddArticle}
                    className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-indigo-600/30 transition-all flex-shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t('helpdesk_kb_btn_new_article', 'Thêm Bài Viết')}</span>
                  </button>
                </div>
              </div>

              {/* Active Tag Filter Chip */}
              {selectedTag && (
                <div className="flex items-center space-x-2 bg-indigo-950/40 border border-indigo-500/30 px-3 py-1.5 rounded-xl text-xs text-indigo-300 w-fit">
                  <span>{t('helpdesk_kb_filter_tag_badge', 'Đang lọc theo tag:')} <strong>#{selectedTag}</strong></span>
                  <button
                    onClick={() => setSelectedTag('')}
                    className="p-0.5 hover:bg-indigo-600/30 rounded-full text-indigo-300 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Categories Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-amber-500/15 border-amber-500/40 shadow-lg shadow-amber-500/10'
                        : 'glass-panel border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-xs">{cat.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{cat.description || 'KB Solutions'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Articles Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {articles
                  .filter(art => !selectedTag || (art.tags && art.tags.toLowerCase().includes(selectedTag.toLowerCase())))
                  .map((art) => (
                    <div
                      key={art.id}
                      onClick={() => setSelectedArticle(art)}
                      className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-amber-500/40 transition-all cursor-pointer space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-amber-400">
                          <span>{art.category?.name || 'Solution'}</span>
                          <span className="text-slate-400">{art.view_count} {t('helpdesk_views', 'views')}</span>
                        </div>
                        <h4 className="font-bold text-white text-sm hover:text-amber-300 transition-all">{art.title}</h4>
                        <p className="text-xs text-slate-400 line-clamp-2">{art.summary || art.content}</p>
                      </div>

                      {/* Interactive Tag Badges */}
                      <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-800/80 pt-2.5">
                        <div className="flex flex-wrap gap-1">
                          {art.tags ? (
                            art.tags.split(',').map((tg, idx) => {
                              const tClean = tg.trim();
                              if (!tClean) return null;
                              return (
                                <span
                                  key={idx}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTag(tClean);
                                  }}
                                  className={`px-2 py-0.5 rounded border text-[10px] font-mono cursor-pointer transition-all ${getTagBadgeStyle(tClean)}`}
                                >
                                  #{tClean}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-slate-600">#helpdesk</span>
                          )}
                        </div>

                        <span className="text-indigo-400 font-semibold flex items-center space-x-1 flex-shrink-0 ml-2">
                          <ThumbsUp className="w-3 h-3" />
                          <span>{art.helpful_count}</span>
                        </span>
                      </div>
                    </div>
                  ))}
              </div>

              {articles.length === 0 && (
                <div className="p-8 text-center glass-panel rounded-2xl border border-slate-800 text-slate-400 text-xs">
                  {t('helpdesk_kb_no_articles_found', 'Không tìm thấy bài viết tri thức nào phù hợp.')}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ====================================================================== */}
      {/* TAB 3: CREATE NEW TICKET */}
      {/* ====================================================================== */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Plus className="w-5 h-5 text-amber-400" />
              <span>{t('helpdesk_create_title', 'Gửi Yêu Cầu Hỗ Trợ Kỹ Thuật (ITIL Support Ticket)')}</span>
            </h3>

            <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">{t('helpdesk_create_ticket_title_lbl', 'Tiêu đề sự cố / Yêu cầu *')}</label>
                <input
                  type="text"
                  required
                  placeholder={t('helpdesk_create_ticket_title_placeholder', 'Ví dụ: Camera Cổng Chính không nhận diện, Quên mật khẩu IAM...')}
                  value={newTicket.title}
                  onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-white text-xs"
                />
              </div>

              {/* Dynamic Suggested KB Articles */}
              {suggestedKBs.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs text-indigo-300 font-bold">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span>{t('helpdesk_smart_kb_suggestion', 'Giải pháp có sẵn trong Cơ sở tri thức (KB) - Bạn có thể tự khắc phục ngay:')}</span>
                  </div>
                  <div className="space-y-1.5">
                    {suggestedKBs.map((kb) => (
                      <div
                        key={kb.id}
                        onClick={() => {
                          setSelectedArticle(kb);
                          setActiveTab('kb');
                        }}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 hover:bg-indigo-600/30 text-slate-200 hover:text-white transition-all cursor-pointer text-xs"
                      >
                        <span className="font-semibold">{kb.title}</span>
                        <span className="text-[10px] text-indigo-400 flex items-center space-x-1">
                          <span>{t('helpdesk_view_kb_guide', 'Xem hướng dẫn')}</span>
                          <ExternalLink className="w-3 h-3" />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">{t('helpdesk_type_lbl', 'Loại yêu cầu (ITIL Type)')}</label>
                  <select
                    value={newTicket.ticket_type}
                    onChange={(e) => setNewTicket({ ...newTicket, ticket_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white"
                  >
                    <option value="INCIDENT">{t('helpdesk_type_incident', 'Incident (Sự cố / Lỗi)')}</option>
                    <option value="SERVICE_REQUEST">{t('helpdesk_type_service_request', 'Service Request (Yêu cầu cấp phát)')}</option>
                    <option value="PROBLEM">{t('helpdesk_type_problem', 'Problem (Vấn đề gốc)')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">{t('helpdesk_impact_lbl', 'Mức độ tác động (Impact)')}</label>
                  <select
                    value={newTicket.impact}
                    onChange={(e) => setNewTicket({ ...newTicket, impact: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white"
                  >
                    <option value="HIGH">{t('helpdesk_impact_high', 'Cao (Toàn bộ / Nhiều người)')}</option>
                    <option value="MEDIUM">{t('helpdesk_impact_medium', 'Trung bình (Phòng ban)')}</option>
                    <option value="LOW">{t('helpdesk_impact_low', 'Thấp (Cá nhân)')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">{t('helpdesk_urgency_lbl', 'Tính khẩn cấp (Urgency)')}</label>
                  <select
                    value={newTicket.urgency}
                    onChange={(e) => setNewTicket({ ...newTicket, urgency: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white"
                  >
                    <option value="HIGH">{t('helpdesk_urgency_high', 'Khẩn cấp (Cần xử lý ngay)')}</option>
                    <option value="MEDIUM">{t('helpdesk_urgency_medium', 'Bình thường')}</option>
                    <option value="LOW">{t('helpdesk_urgency_low', 'Có thể chờ')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">{t('helpdesk_category_lbl', 'Danh mục dịch vụ')}</label>
                <select
                  value={newTicket.category_id}
                  onChange={(e) => setNewTicket({ ...newTicket, category_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl glass-input text-white"
                >
                  <option value="">{t('helpdesk_select_category_prompt', '-- Chọn danh mục liên quan --')}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">{t('helpdesk_description_lbl', 'Mô tả chi tiết sự cố / Yêu cầu *')}</label>
                <textarea
                  rows="4"
                  required
                  placeholder={t('helpdesk_description_placeholder', 'Mô tả cụ thể hiện tượng gặp phải, thông báo lỗi...')}
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-white text-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('tickets')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  {t('helpdesk_btn_cancel', 'Hủy Bỏ')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-lg shadow-amber-600/30 transition-all"
                >
                  {submitting ? t('helpdesk_submitting', 'Đang gửi...') : t('helpdesk_btn_submit', 'Gửi Yêu Cầu Hỗ Trợ')}
                </button>
              </div>
            </form>
          </div>

          {/* Right ITIL SLA Matrix Reference Card */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>{t('helpdesk_sla_matrix_title', 'Cam Kết Chất Lượng SLA (ITIL)')}</span>
            </h4>
            <p className="text-slate-400">
              {t('helpdesk_sla_matrix_desc', 'Mức độ ưu tiên tự động tính toán từ Impact (Tác động) và Urgency (Khẩn cấp):')}
            </p>

            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
                <div className="font-bold">{t('helpdesk_sla_p1_title', 'P1 - CRITICAL (Khẩn cấp)')}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{t('helpdesk_sla_p1_desc', 'Phản hồi: 15 phút • Giải quyết: 2 giờ')}</div>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
                <div className="font-bold">{t('helpdesk_sla_p2_title', 'P2 - HIGH (Cao)')}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{t('helpdesk_sla_p2_desc', 'Phản hồi: 30 phút • Giải quyết: 4 giờ')}</div>
              </div>
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
                <div className="font-bold">{t('helpdesk_sla_p3_title', 'P3 - MEDIUM (Trung bình)')}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{t('helpdesk_sla_p3_desc', 'Phản hồi: 2 giờ • Giải quyết: 24 giờ')}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
                <div className="font-bold">{t('helpdesk_sla_p4_title', 'P4 - LOW (Thấp)')}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{t('helpdesk_sla_p4_desc', 'Phản hồi: 4 giờ • Giải quyết: 48 giờ')}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* MODAL: RESOLVE TICKET WITH KB */}
      {/* ====================================================================== */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md rounded-3xl border border-slate-800 p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>{t('helpdesk_modal_resolve_title', 'Đóng & Giải Quyết Ticket')}</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">{t('helpdesk_resolution_summary_lbl', 'Tóm tắt cách khắc phục *')}</label>
                <textarea
                  rows="3"
                  required
                  placeholder={t('helpdesk_resolution_summary_placeholder', 'Ghi rõ các bước kỹ thuật đã thực hiện để khắc phục lỗi...')}
                  value={resolutionSummary}
                  onChange={(e) => setResolutionSummary(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">{t('helpdesk_link_kb_lbl', 'Đính kèm bài viết giải pháp chuẩn từ KB')}</label>
                <select
                  value={resolveKbId}
                  onChange={(e) => setResolveKbId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-white"
                >
                  <option value="">{t('helpdesk_no_kb_attached', '-- Không đính kèm / Giải quyết tùy biến --')}</option>
                  {articles.map((a) => (
                    <option key={a.id} value={a.id}>{a.title}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  {t('helpdesk_btn_cancel', 'Hủy')}
                </button>
                <button
                  type="button"
                  onClick={handleResolveTicket}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/30"
                >
                  {t('helpdesk_btn_confirm_resolve', 'Xác Nhận Giải Quyết')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* MODAL: CSAT FEEDBACK */}
      {/* ====================================================================== */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md rounded-3xl border border-slate-800 p-6 space-y-4 shadow-2xl text-center">
            <h3 className="text-base font-bold text-white flex items-center justify-center space-x-2">
              <Star className="w-5 h-5 text-amber-400" />
              <span>{t('helpdesk_modal_csat_title', 'Đánh Giá Độ Hài Lòng (CSAT)')}</span>
            </h3>

            <p className="text-xs text-slate-400">
              {t('helpdesk_csat_question', 'Bạn đánh giá thế nào về tốc độ và chất lượng hỗ trợ xử lý sự cố này?')}
            </p>

            <div className="flex items-center justify-center space-x-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setCsatRating(star)}
                  className={`p-2 rounded-xl text-xl transition-all ${
                    csatRating >= star ? 'text-amber-400 scale-110' : 'text-slate-600'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>

            <textarea
              rows="3"
              placeholder={t('helpdesk_csat_feedback_placeholder', 'Ý kiến đóng góp thêm cho đội ngũ kỹ thuật...')}
              value={csatFeedback}
              onChange={(e) => setCsatFeedback(e.target.value)}
              className="w-full px-3 py-2 rounded-xl glass-input text-xs text-white text-left"
            />

            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowFeedbackModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                {t('helpdesk_btn_close', 'Đóng')}
              </button>
              <button
                type="button"
                onClick={handleSubmitFeedback}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-600/30"
              >
                {t('helpdesk_btn_submit_feedback', 'Gửi Đánh Giá')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* MODAL: CREATE / EDIT KB ARTICLE */}
      {/* ====================================================================== */}
      {showArticleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="glass-panel w-full max-w-2xl rounded-3xl border border-slate-800 p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <span>
                  {editingArticleId
                    ? t('helpdesk_kb_modal_edit_title', 'Chỉnh Sửa Bài Viết Tri Thức')
                    : t('helpdesk_kb_modal_add_title', 'Soạn Thảo Bài Viết Tri Thức (KB Solution)')}
                </span>
              </h3>
              <button
                onClick={() => setShowArticleModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveArticle} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">
                  {t('helpdesk_kb_article_title_lbl', 'Tiêu đề bài viết giải pháp *')}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('helpdesk_kb_article_title_ph', 'Ví dụ: Hướng dẫn cấu hình độ nhạy Face AI...')}
                  value={articleForm.title}
                  onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-white text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">
                    {t('helpdesk_kb_category_lbl', 'Danh mục bài viết *')}
                  </label>
                  <select
                    value={articleForm.category_id}
                    onChange={(e) => setArticleForm({ ...articleForm, category_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white text-xs"
                    required
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">
                    {t('helpdesk_kb_tags_lbl', 'Thẻ phân loại (Tags)')}
                  </label>
                  <input
                    type="text"
                    placeholder={t('helpdesk_kb_tags_ph', 'camera, network, iam, error...')}
                    value={articleForm.tags}
                    onChange={(e) => setArticleForm({ ...articleForm, tags: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">
                  {t('helpdesk_kb_summary_lbl', 'Tóm tắt giải pháp (Hiển thị xem trước)')}
                </label>
                <input
                  type="text"
                  placeholder={t('helpdesk_kb_summary_ph', 'Mô tả ngắn gọn về giải pháp kỹ thuật...')}
                  value={articleForm.summary}
                  onChange={(e) => setArticleForm({ ...articleForm, summary: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl glass-input text-white text-xs"
                />
              </div>

              {/* Markdown Formatting Toolbar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-300 font-semibold">
                    {t('helpdesk_kb_content_lbl', 'Nội dung chi tiết (Hỗ trợ định dạng Markdown, Code, Callout)')}
                  </label>
                  <span className="text-[10px] text-indigo-400 font-mono">Markdown Active</span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-900 border border-slate-800 rounded-t-xl">
                  <button
                    type="button"
                    onClick={() => insertMarkdown('**In đậm**')}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] flex items-center space-x-1"
                    title={t('helpdesk_kb_fmt_bold', 'In đậm')}
                  >
                    <Bold className="w-3 h-3" />
                    <span>Bold</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown('*In nghiêng*')}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] flex items-center space-x-1"
                    title={t('helpdesk_kb_fmt_italic', 'In nghiêng')}
                  >
                    <Italic className="w-3 h-3" />
                    <span>Italic</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown('## Tiêu đề mục', true)}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] flex items-center space-x-1"
                    title={t('helpdesk_kb_fmt_h2', 'Tiêu đề H2')}
                  >
                    <Heading2 className="w-3 h-3" />
                    <span>H2</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown('- Mục danh sách 1\n- Mục danh sách 2', true)}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] flex items-center space-x-1"
                    title={t('helpdesk_kb_fmt_list', 'Danh sách')}
                  >
                    <List className="w-3 h-3" />
                    <span>List</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown('```bash\n# Lệnh thực thi\nservice face-ai status\n```', true)}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] flex items-center space-x-1"
                    title={t('helpdesk_kb_fmt_code', 'Khối Code')}
                  >
                    <Code className="w-3 h-3 text-cyan-400" />
                    <span>Code</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown('> [!NOTE] Lưu ý quan trọng cho kỹ thuật viên...', true)}
                    className="px-2 py-1 rounded bg-indigo-900/50 border border-indigo-500/30 hover:bg-indigo-900 text-indigo-300 text-[11px] flex items-center space-x-1"
                    title={t('helpdesk_kb_fmt_note', 'Hộp Lưu Ý')}
                  >
                    <Info className="w-3 h-3 text-indigo-400" />
                    <span>Note</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown('> [!WARNING] Cảnh báo nguy cơ gián đoạn dịch vụ...', true)}
                    className="px-2 py-1 rounded bg-amber-900/50 border border-amber-500/30 hover:bg-amber-900 text-amber-300 text-[11px] flex items-center space-x-1"
                    title={t('helpdesk_kb_fmt_warning', 'Hộp Cảnh Báo')}
                  >
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    <span>Warning</span>
                  </button>
                </div>

                <textarea
                  rows="7"
                  required
                  placeholder={t('helpdesk_kb_content_ph', 'Nhập nội dung chi tiết theo định dạng Markdown...')}
                  value={articleForm.content}
                  onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-b-xl glass-input text-white text-xs font-mono border-t-0"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowArticleModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  {t('helpdesk_btn_cancel', 'Hủy')}
                </button>
                <button
                  type="submit"
                  disabled={articleSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {articleSubmitting
                      ? t('helpdesk_submitting', 'Đang lưu...')
                      : editingArticleId
                      ? t('helpdesk_kb_btn_edit_article', 'Cập Nhật Bài Viết')
                      : t('helpdesk_kb_btn_new_article', 'Lưu Bài Viết')}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpdeskManager;
