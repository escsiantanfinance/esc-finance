import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../models/models.dart';
import '../../providers/auth_provider.dart';
import '../../providers/finance_provider.dart';
import '../offering/buka_sesi_screen.dart';
import '../offering/sesi_ibadah_screen.dart';
import '../expense/pengeluaran_screen.dart';
import '../report/laporan_screen.dart';

const _hariIndo = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const _bulanIndo = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

String _tanggalIndo(DateTime d) =>
    '${_hariIndo[d.weekday - 1]}, ${d.day} ${_bulanIndo[d.month - 1]} ${d.year}';

String _salamWaktu(DateTime d) {
  if (d.hour < 11) return 'Selamat pagi';
  if (d.hour < 15) return 'Selamat siang';
  if (d.hour < 18) return 'Selamat sore';
  return 'Selamat malam';
}

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool _showSaldo = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final fullAccess = context.read<AuthProvider>().profile?.isFullAccess ?? false;
      context.read<FinanceProvider>().loadDashboard(fullAccess);
      context.read<FinanceProvider>().ensureKasKategori();
    });
  }

  String _saldoAtauTitik(String saldo) => _showSaldo ? saldo : 'Rp ••••••••';

  Future<void> _confirmLogout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Keluar dari Aplikasi?'),
        content: const Text('Anda perlu masuk kembali untuk menggunakan aplikasi.'),
        actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            style: TextButton.styleFrom(foregroundColor: AppColors.muted),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            child: const Text('Ya, Keluar'),
          ),
        ],
      ),
    );
    if (confirm == true && mounted) {
      context.read<AuthProvider>().logout();
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final fin = context.watch<FinanceProvider>();
    final s = fin.summary;
    final profile = auth.profile;
    final fullAccess = profile?.isFullAccess ?? false;
    final kasList = fin.kasUntuk(fullAccess);
    final loadingAwal = fin.busy && s == null && kasList.isEmpty;
    final now = DateTime.now();

    return Scaffold(
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: () async {
          final fa = context.read<AuthProvider>().profile?.isFullAccess ?? false;
          await context.read<FinanceProvider>().loadDashboard(fa);
        },
        child: CustomScrollView(
          slivers: [
            // ── Header gradient ────────────────────────────────
            SliverAppBar(
              expandedHeight: 200,
              pinned: true,
              backgroundColor: AppColors.primaryDark,
              foregroundColor: Colors.white,
              title: const Text(
                'ESC Finance',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, letterSpacing: -0.2),
              ),
              actions: [
                _AvatarInitials(name: profile?.fullName ?? ''),
                IconButton(
                  icon: const Icon(Icons.logout_outlined),
                  tooltip: 'Keluar',
                  onPressed: _confirmLogout,
                ),
                const SizedBox(width: 4),
              ],
              flexibleSpace: FlexibleSpaceBar(
                background: Container(
                  decoration: const BoxDecoration(gradient: AppGradients.brand),
                  child: SafeArea(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 16, 20, 18),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Text(
                            '${_salamWaktu(now)},',
                            style: const TextStyle(color: Color(0xFFC7D2FE), fontSize: 13),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Flexible(
                                child: Text(
                                  (profile?.fullName.split(' ').first.isNotEmpty ?? false)
                                      ? profile!.fullName.split(' ').first
                                      : 'Pengguna',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 22,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: -0.4,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              _RoleChip(profile: profile),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            _tanggalIndo(now),
                            style: TextStyle(color: Colors.white.withOpacity(0.55), fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),

            // ── Konten ────────────────────────────────────────
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 100),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  // Judul saldo + toggle privasi
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const _SectionTitle('Saldo Kas'),
                      InkWell(
                        onTap: () => setState(() => _showSaldo = !_showSaldo),
                        borderRadius: BorderRadius.circular(8),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                          child: Row(
                            children: [
                              Icon(
                                _showSaldo ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                                size: 16,
                                color: AppColors.muted,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                _showSaldo ? 'Sembunyikan' : 'Tampilkan',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: AppColors.muted,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  if (loadingAwal) ...[
                    const _SkeletonCard(height: 112),
                    const SizedBox(height: 20),
                    const _SkeletonCard(height: 72),
                  ] else ...[
                    // Kartu saldo
                    if (!fullAccess && kasList.isNotEmpty)
                      ...kasList.map((k) => _SaldoCard(
                            nama: k.nama,
                            saldo: _saldoAtauTitik(formatRupiah(k.saldoSaatIni)),
                          ))
                    else
                      _SaldoCard(
                        nama: 'Total Saldo Kas',
                        saldo: _saldoAtauTitik(formatRupiah(s?.totalSaldo)),
                        isTotal: true,
                      ),

                    const SizedBox(height: 20),

                    // Ringkasan bulan ini (admin)
                    if (fullAccess) ...[
                      const _SectionTitle('Ringkasan Bulan Ini'),
                      const SizedBox(height: 12),
                      Row(children: [
                        _MiniStat(
                          label: 'Pemasukan',
                          value: _saldoAtauTitik(formatRupiah(s?.pemasukanBulanIni)),
                          color: AppColors.success,
                          icon: Icons.trending_up_rounded,
                        ),
                        const SizedBox(width: 12),
                        _MiniStat(
                          label: 'Pengeluaran',
                          value: _saldoAtauTitik(formatRupiah(s?.pengeluaranBulanIni)),
                          color: AppColors.danger,
                          icon: Icons.trending_down_rounded,
                        ),
                      ]),
                      const SizedBox(height: 20),
                    ],
                  ],

                  // Aksi cepat
                  const _SectionTitle('Aksi Cepat'),
                  const SizedBox(height: 12),
                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 1.4,
                    children: [
                      _ActionCard(
                        icon: Icons.church_outlined,
                        label: 'Buka Sesi Ibadah',
                        caption: 'Catat persembahan',
                        color: AppColors.primary,
                        onTap: () => Navigator.push(
                            context, MaterialPageRoute(builder: (_) => const BukaSesiScreen())),
                      ),
                      _ActionCard(
                        icon: Icons.receipt_long_outlined,
                        label: 'Pengeluaran',
                        caption: 'Ajukan & kelola',
                        color: AppColors.danger,
                        onTap: () => Navigator.push(
                            context, MaterialPageRoute(builder: (_) => const PengeluaranScreen())),
                      ),
                      _ActionCard(
                        icon: Icons.bar_chart_rounded,
                        label: 'Laporan',
                        caption: 'Rekap keuangan',
                        color: AppColors.success,
                        onTap: () => Navigator.push(
                            context, MaterialPageRoute(builder: (_) => const LaporanScreen())),
                      ),
                      _ActionCard(
                        icon: Icons.history_rounded,
                        label: 'Sesi Ibadah',
                        caption: 'Riwayat sesi',
                        color: AppColors.warning,
                        onTap: () => Navigator.push(
                            context, MaterialPageRoute(builder: (_) => const SesiIbadahScreen())),
                      ),
                    ],
                  ),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Widget pendukung ─────────────────────────────────────────

class _AvatarInitials extends StatelessWidget {
  final String name;
  const _AvatarInitials({required this.name});

  String get _initials {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts.first[0].toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: name.isEmpty ? 'Pengguna' : name,
      child: Container(
        width: 34,
        height: 34,
        margin: const EdgeInsets.only(right: 4),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.18),
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white.withOpacity(0.25)),
        ),
        child: Text(
          _initials,
          style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700),
        ),
      ),
    );
  }
}

class _RoleChip extends StatelessWidget {
  final Profile? profile;
  const _RoleChip({required this.profile});

  @override
  Widget build(BuildContext context) {
    if (profile == null) return const SizedBox.shrink();
    final label = profile!.isSuperAdmin
        ? 'SUPER ADMIN'
        : profile!.role.toUpperCase();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.16),
        borderRadius: BorderRadius.circular(99),
        border: Border.all(color: Colors.white.withOpacity(0.22)),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 9.5,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}

class _SaldoCard extends StatelessWidget {
  final String nama, saldo;
  final bool isTotal;
  const _SaldoCard({required this.nama, required this.saldo, this.isTotal = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: isTotal ? AppGradients.cardDeep : AppGradients.card,
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withOpacity(0.30),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(22),
        child: Stack(
          children: [
            Positioned(
              top: -30,
              right: -20,
              child: Container(
                width: 110,
                height: 110,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withOpacity(0.08),
                ),
              ),
            ),
            Positioned(
              top: 30,
              right: 40,
              child: Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withOpacity(0.06),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(7),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.16),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.account_balance_wallet_outlined,
                            color: Colors.white, size: 16),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          nama,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Color(0xFFC7D2FE),
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Text(
                    saldo,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.5,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  final String label, value;
  final Color color;
  final IconData icon;
  const _MiniStat({required this.label, required this.value, required this.color, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8, offset: const Offset(0, 2)),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withOpacity(0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 16),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: const TextStyle(
                          color: AppColors.muted, fontSize: 11, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 2),
                  Text(value,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 13.5)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String caption;
  final Color color;
  final VoidCallback onTap;
  const _ActionCard({
    required this.icon,
    required this.label,
    required this.caption,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: color.withOpacity(0.11),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color, size: 21),
              ),
              const Spacer(),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: AppColors.ink,
                  fontWeight: FontWeight.w700,
                  fontSize: 13.5,
                  letterSpacing: -0.2,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                caption,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: AppColors.muted, fontSize: 11),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SkeletonCard extends StatelessWidget {
  final double height;
  const _SkeletonCard({required this.height});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      width: double.infinity,
      decoration: BoxDecoration(
        color: const Color(0xFFE9EAF6),
        borderRadius: BorderRadius.circular(22),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String text;
  const _SectionTitle(this.text);

  @override
  Widget build(BuildContext context) => Text(text,
      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, letterSpacing: -0.3));
}
