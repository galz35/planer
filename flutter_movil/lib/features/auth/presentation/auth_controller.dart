import 'package:flutter/foundation.dart';

import '../data/auth_repository.dart';
import '../domain/session_user.dart';

class AuthController extends ChangeNotifier {
  AuthController({AuthRepository? repository}) : _repository = repository ?? AuthRepository();

  final AuthRepository _repository;

  SessionUser? user;
  bool loading = false;
  bool initialized = false;
  String? error;

  bool get isAuthenticated => user != null;

  Future<void> initialize() async {
    loading = true;
    notifyListeners();

    try {
      user = await _repository.restoreSession();
    } catch (_) {
      user = null;
    } finally {
      loading = false;
      initialized = true;
      notifyListeners();
    }
  }

  Future<bool> login(String correo, String password) async {
    loading = true;
    error = null;
    notifyListeners();

    try {
      user = await _repository.login(correo: correo, password: password);
      return true;
    } catch (e) {
      error = 'No se pudo iniciar sesión. Verifica tus credenciales.';
      return false;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    await _repository.logout();
    user = null;
    notifyListeners();
  }
}
