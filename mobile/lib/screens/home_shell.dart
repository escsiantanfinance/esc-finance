import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import 'dashboard/dashboard_screen.dart';
import 'offering/sesi_ibadah_screen.dart';
import 'expense/pengeluaran_screen.dart';
import 'report/laporan_screen.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});
  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final profile = auth.profile;
    
    // Logic akses dinamis:
    bool showLaporan = false;
    if (profile != null) {
      if (profile.isFullAccess) {
        showLaporan = true;
      } else if (profile.allowedPages.isNotEmpty) {
        showLaporan = profile.allowedPages.contains('/laporan');
      } else {
        showLaporan = profile.role != 'bendahara';
      }
    }

    final pages = [
      const DashboardScreen(),
      const SesiIbadahScreen(),
      const PengeluaranScreen(),
      if (showLaporan) const LaporanScreen(),
    ];

    final destinations = [
      const NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Beranda'),
      const NavigationDestination(icon: Icon(Icons.church_outlined), selectedIcon: Icon(Icons.church), label: 'Sesi'),
      const NavigationDestination(icon: Icon(Icons.receipt_long_outlined), selectedIcon: Icon(Icons.receipt_long), label: 'Pengeluaran'),
      if (showLaporan) const NavigationDestination(icon: Icon(Icons.bar_chart_outlined), selectedIcon: Icon(Icons.bar_chart), label: 'Laporan'),
    ];

    // Cek batas index jika laporan hilang saat _index = 3
    int currentIndex = _index;
    if (currentIndex >= pages.length) {
      currentIndex = pages.length - 1;
    }

    return Scaffold(
      body: IndexedStack(index: currentIndex, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: currentIndex,
        onDestinationSelected: (i) {
          if (_index != i) setState(() => _index = i);
        },
        destinations: destinations,
      ),
    );
  }
}
