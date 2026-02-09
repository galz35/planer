class DashboardKpiResponse {
  final ResumenKPIS resumen;
  final List<ProyectoKPI> proyectos;

  DashboardKpiResponse({required this.resumen, required this.proyectos});

  factory DashboardKpiResponse.fromJson(Map<String, dynamic> json) {
    return DashboardKpiResponse(
      resumen: ResumenKPIS.fromJson(json['resumen'] ?? {}),
      proyectos: (json['proyectos'] as List? ?? [])
          .map((e) => ProyectoKPI.fromJson(e))
          .toList(),
    );
  }
}

class ResumenKPIS {
  final int total;
  final int hechas;
  final int pendientes;
  final int bloqueadas;
  final double promedioAvance;

  ResumenKPIS({
    this.total = 0,
    this.hechas = 0,
    this.pendientes = 0,
    this.bloqueadas = 0,
    this.promedioAvance = 0.0,
  });

  factory ResumenKPIS.fromJson(Map<String, dynamic> json) {
    return ResumenKPIS(
      total: json['total'] ?? 0,
      hechas: json['hechas'] ?? 0,
      pendientes: json['pendientes'] ?? 0,
      bloqueadas: json['bloqueadas'] ?? 0,
      promedioAvance: (json['promedioAvance'] is num) ? (json['promedioAvance'] as num).toDouble() : 0.0,
    );
  }
}

class ProyectoKPI {
  final String proyecto;
  final String area;
  final int total;
  final int hechas;

  ProyectoKPI({
    required this.proyecto,
    required this.area,
    this.total = 0,
    this.hechas = 0,
  });
  
  int get avancePercent => total > 0 ? ((hechas / total) * 100).round() : 0;

  factory ProyectoKPI.fromJson(Map<String, dynamic> json) {
    return ProyectoKPI(
      proyecto: json['proyecto'] ?? 'Sin nombre',
      area: json['area'] ?? 'General',
      total: json['total'] ?? 0,
      hechas: json['hechas'] ?? 0,
    );
  }
}
