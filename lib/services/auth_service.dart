import 'package:shared_preferences/shared_preferences.dart';

class AuthService {
  static const String _employeeCodeKey = 'employee_code';

  Future<void> saveEmployeeCode(String employeeCode) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_employeeCodeKey, employeeCode);
  }

  Future<String?> getEmployeeCode() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_employeeCodeKey);
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_employeeCodeKey);
  }

  Future<bool> isAuthenticated() async {
    final employeeCode = await getEmployeeCode();
    return employeeCode != null && employeeCode.isNotEmpty;
  }
}
