import '../../../core/network/cache_store.dart';

/// Servicio reutilizable para patrón de lectura híbrida:
/// 1) Intentar API (online)
/// 2) Si falla, responder desde caché local (offline)
///
/// Esto permite que cada módulo (agenda, proyectos, equipo, etc.)
/// no duplique la misma lógica de fallback.
class OfflineResourceService {
  const OfflineResourceService();

  Future<OfflineListResult> loadList({
    required String cacheKey,
    required Future<List<dynamic>> Function() remote,
  }) async {
    try {
      final items = await remote();
      await CacheStore.instance.save(cacheKey, items);
      return OfflineListResult(items: items, fromCache: false);
    } catch (_) {
      final cached = await CacheStore.instance.getList(cacheKey);
      return OfflineListResult(items: cached, fromCache: true);
    }
  }

  Future<OfflineMapResult> loadMap({
    required String cacheKey,
    required Future<Map<String, dynamic>> Function() remote,
  }) async {
    try {
      final map = await remote();
      await CacheStore.instance.save(cacheKey, map);
      return OfflineMapResult(data: map, fromCache: false);
    } catch (_) {
      final cached = await CacheStore.instance.getMap(cacheKey);
      return OfflineMapResult(data: cached ?? <String, dynamic>{}, fromCache: true);
    }
  }
}

class OfflineListResult {
  final List<dynamic> items;
  final bool fromCache;

  const OfflineListResult({required this.items, required this.fromCache});
}

class OfflineMapResult {
  final Map<String, dynamic> data;
  final bool fromCache;

  const OfflineMapResult({required this.data, required this.fromCache});
}
