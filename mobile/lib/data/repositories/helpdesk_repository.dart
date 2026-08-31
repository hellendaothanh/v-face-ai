import 'package:dio/dio.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../models/helpdesk_model.dart';

class HelpdeskRepository {
  final Dio _dio = ApiClient().dio;

  Future<List<HelpdeskTicketModel>> getTickets() async {
    final response = await _dio.get(ApiEndpoints.helpdeskTickets);
    final raw = response.data;
    List list = [];
    if (raw is List) {
      list = raw;
    } else if (raw is Map) {
      if (raw['data'] is List) {
        list = raw['data'];
      } else if (raw['data'] is Map && raw['data']['items'] is List) {
        list = raw['data']['items'];
      } else if (raw['items'] is List) {
        list = raw['items'];
      }
    }
    return list.map((e) => HelpdeskTicketModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<HelpdeskTicketModel> getTicketDetail(dynamic ticketId) async {
    final response = await _dio.get("${ApiEndpoints.helpdeskTickets}/$ticketId");
    final raw = response.data;
    final data = (raw is Map && raw.containsKey('data') && raw['data'] is Map) ? raw['data'] : raw;
    return HelpdeskTicketModel.fromJson(data as Map<String, dynamic>);
  }

  Future<HelpdeskTicketModel> createTicket({
    required String title,
    required String description,
    String ticketType = "incident",
    String impact = "medium",
    String urgency = "medium",
    String? categoryId,
  }) async {
    final payload = {
      'title': title,
      'description': description,
      'ticket_type': ticketType,
      'impact': impact,
      'urgency': urgency,
      if (categoryId != null && categoryId.isNotEmpty) 'category_id': categoryId,
    };

    final response = await _dio.post(
      ApiEndpoints.helpdeskTickets,
      data: payload,
    );
    final raw = response.data;
    final data = (raw is Map && raw.containsKey('data') && raw['data'] is Map) ? raw['data'] : raw;
    return HelpdeskTicketModel.fromJson(data as Map<String, dynamic>);
  }

  Future<void> addComment({required dynamic ticketId, required String content}) async {
    await _dio.post(
      "${ApiEndpoints.helpdeskTickets}/$ticketId/comments",
      data: {
        'content': content,
        'is_internal': false,
      },
    );
  }

  Future<List<KBArticleModel>> getKBArticles({String? query}) async {
    final response = await _dio.get(
      ApiEndpoints.helpdeskKB,
      queryParameters: query != null && query.isNotEmpty ? {'search': query} : null,
    );
    final raw = response.data;
    List list = [];
    if (raw is List) {
      list = raw;
    } else if (raw is Map) {
      if (raw['data'] is List) {
        list = raw['data'];
      } else if (raw['data'] is Map && raw['data']['items'] is List) {
        list = raw['data']['items'];
      } else if (raw['items'] is List) {
        list = raw['items'];
      }
    }
    return list.map((e) => KBArticleModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> voteHelpful(dynamic articleId) async {
    await _dio.post("${ApiEndpoints.helpdeskKB}/$articleId/helpful");
  }
}
