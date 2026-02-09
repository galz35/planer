import '../../../core/network/api_client.dart';
import '../../common/data/offline_resource_service.dart';
import 'dashboard_models.dart';

class DashboardRepository {
  Future<DashboardKpiResponse> getKPIs() async {
    try {
      final response = await ApiClient.dio.get('/kpis/dashboard');
      final data = response.data;
      
      if (data is Map<String, dynamic>) {
        if (data.containsKey('data')) {
           return DashboardKpiResponse.fromJson(data['data']);
        }
        return DashboardKpiResponse.fromJson(data);
      }
      throw Exception('Formato de respuesta inválido');
    } catch (e) {
      throw Exception('Error cargando KPIs: $e');
    }
  }
}
