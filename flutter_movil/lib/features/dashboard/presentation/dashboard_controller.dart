import 'package:flutter/material.dart';
import '../../dashboard/data/dashboard_repository.dart';
import '../../dashboard/data/dashboard_models.dart';

class DashboardController extends ChangeNotifier {
  final DashboardRepository _repository = DashboardRepository();
  
  bool loading = false;
  String? error;
  DashboardKpiResponse? data;

  Future<void> loadKPIs() async {
    loading = true;
    error = null;
    notifyListeners();

    try {
      data = await _repository.getKPIs();
    } catch (e) {
      error = e.toString();
      data = null;
    } finally {
      loading = false;
      notifyListeners();
    }
  }
}
