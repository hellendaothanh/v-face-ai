import 'package:dio/dio.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../models/request_model.dart';
import '../models/payroll_model.dart';

class HrmRepository {
  final Dio _dio = ApiClient().dio;

  Future<List<HrmRequestModel>> getMyRequests() async {
    final response = await _dio.get(ApiEndpoints.requests);
    final List list = response.data['items'] ?? response.data ?? [];
    return list.map((e) => HrmRequestModel.fromJson(e)).toList();
  }

  Future<HrmRequestModel> createRequest(HrmRequestModel req) async {
    final response = await _dio.post(
      ApiEndpoints.requests,
      data: req.toJson(),
    );
    return HrmRequestModel.fromJson(response.data);
  }

  Future<PayrollRecordModel> getPayrollRecord({required int month, required int year}) async {
    final response = await _dio.get(
      ApiEndpoints.payrollRecords,
      queryParameters: {'month': month, 'year': year},
    );
    final data = response.data['item'] ?? response.data;
    return PayrollRecordModel.fromJson(data);
  }
}
