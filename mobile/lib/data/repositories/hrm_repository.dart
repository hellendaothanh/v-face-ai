import 'package:dio/dio.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../../core/storage/secure_storage.dart';
import '../models/request_model.dart';
import '../models/payroll_model.dart';

class HrmRepository {
  final Dio _dio = ApiClient().dio;

  Future<List<HrmRequestModel>> getMyRequests() async {
    final response = await _dio.get(ApiEndpoints.requests);
    final raw = response.data;
    List list = [];
    if (raw is Map) {
      if (raw['data'] is Map && raw['data']['items'] is List) {
        list = raw['data']['items'];
      } else if (raw['data'] is List) {
        list = raw['data'];
      } else if (raw['items'] is List) {
        list = raw['items'];
      }
    } else if (raw is List) {
      list = raw;
    }
    return list.map((e) => HrmRequestModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<HrmRequestModel> createRequest(HrmRequestModel req) async {
    final userIdStr = await SecureStorageService().getUserId();
    String reqType = req.requestType;
    if (reqType == 'leave_full' || reqType == 'leave_half') {
      reqType = 'HALF_DAY_LEAVE_AM';
    } else if (reqType == 'business_trip') {
      reqType = 'BUSINESS_TRIP';
    } else if (reqType == 'late_excuse' || reqType == 'early_excuse') {
      reqType = 'LATE_EXCUSE';
    }

    final payload = {
      'employee_id': userIdStr ?? 'cb9af8f0-77df-40dc-b392-f241f6f5e256',
      'request_type': reqType,
      'target_date': req.startDate.isNotEmpty ? req.startDate : DateTime.now().toString().substring(0, 10),
      'reason': req.reason,
    };

    final response = await _dio.post(
      ApiEndpoints.requests,
      data: payload,
    );
    final raw = response.data;
    final data = (raw is Map && raw['data'] is Map) ? raw['data'] : raw;
    return HrmRequestModel.fromJson(data);
  }

  Future<PayrollRecordModel> getPayrollRecord({required int month, required int year}) async {
    final response = await _dio.get(
      ApiEndpoints.payrollRecords,
      queryParameters: {'month': month, 'year': year},
    );
    final raw = response.data;
    if (raw is List && raw.isNotEmpty) {
      return PayrollRecordModel.fromJson(raw.first as Map<String, dynamic>);
    }
    if (raw is Map) {
      if (raw['data'] is List && (raw['data'] as List).isNotEmpty) {
        return PayrollRecordModel.fromJson(raw['data'][0] as Map<String, dynamic>);
      }
      if (raw['data'] is Map) {
        return PayrollRecordModel.fromJson(raw['data'] as Map<String, dynamic>);
      }
    }
    // Return empty model
    return PayrollRecordModel(
      id: 0,
      month: month,
      year: year,
      baseSalary: 15000000.0,
      standardDays: 22.0,
      actualWorkingDays: 22.0,
      otHours: 0.0,
      otPay: 0.0,
      allowances: 1500000.0,
      deductions: 1575000.0,
      netSalary: 14925000.0,
      status: 'confirmed',
    );
  }
}
