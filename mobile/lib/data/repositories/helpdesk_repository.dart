import 'package:dio/dio.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../models/helpdesk_model.dart';

class HelpdeskRepository {
  final Dio _dio = ApiClient().dio;

  Future<List<HelpdeskTicketModel>> getTickets() async {
    final response = await _dio.get(ApiEndpoints.helpdeskTickets);
    final List list = response.data['items'] ?? response.data ?? [];
    return list.map((e) => HelpdeskTicketModel.fromJson(e)).toList();
  }

  Future<HelpdeskTicketModel> createTicket(HelpdeskTicketModel ticket) async {
    final response = await _dio.post(
      ApiEndpoints.helpdeskTickets,
      data: ticket.toJson(),
    );
    return HelpdeskTicketModel.fromJson(response.data);
  }

  Future<List<KBArticleModel>> getKBArticles({String? query}) async {
    final response = await _dio.get(
      ApiEndpoints.helpdeskKB,
      queryParameters: query != null ? {'q': query} : null,
    );
    final List list = response.data['items'] ?? response.data ?? [];
    return list.map((e) => KBArticleModel.fromJson(e)).toList();
  }
}
