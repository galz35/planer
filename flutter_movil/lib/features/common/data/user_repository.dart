import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../../core/network/api_client.dart';
import '../domain/empleado.dart';

class UserRepository {
  final _storage = const FlutterSecureStorage();
  static const _recentsKey = 'user_search_recents';

  Future<List<Empleado>> search(String query) async {
    try {
      final response = await ApiClient.dio.get('acceso/empleados/buscar',
          queryParameters: {'q': query, 'limit': 10});
      final list = (response.data as List)
          .map((e) => e as Map<String, dynamic>)
          .toList();
      return list.map((e) => Empleado.fromJson(e)).toList();
    } catch (e) {
      debugPrint('❌ Error searching users: $e');
      return [];
    }
  }

  Future<List<Empleado>> getEmployeesByDepartment(String department) async {
    try {
      final response =
          await ApiClient.dio.get('acceso/empleados/gerencia/$department');
      final list = (response.data as List)
          .map((e) => e as Map<String, dynamic>)
          .toList();
      return list.map((e) => Empleado.fromJson(e)).toList();
    } catch (e) {
      debugPrint('❌ Error getting management users: $e');
      return [];
    }
  }

  Future<List<Empleado>> getRecents() async {
    final str = await _storage.read(key: _recentsKey);
    if (str == null) return [];
    try {
      final List list = jsonDecode(str);
      return list.map((e) => Empleado.fromJson(e)).toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> saveRecent(Empleado empleado) async {
    final list = await getRecents();
    // Remover si ya existe para ponerlo al principio
    list.removeWhere((e) => e.idUsuario == empleado.idUsuario);
    list.insert(0, empleado);
    // Limitar a 5
    if (list.length > 5) list.removeLast();

    final str = jsonEncode(list
        .map((e) => {
              'idUsuario': e.idUsuario,
              'nombreCompleto': e.nombreCompleto,
              'carnet': e.carnet,
              'cargo': e.cargo,
              'area': e.area,
            })
        .toList());

    await _storage.write(key: _recentsKey, value: str);
  }
}
