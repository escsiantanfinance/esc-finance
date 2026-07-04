import 'package:flutter/material.dart';

/// Gradient brand — dipakai splash, login, dan header dashboard
/// supaya identitas visual konsisten dari layar pertama sampai utama.
class AppGradients {
  static const brand = LinearGradient(
    colors: [Color(0xFF1E1B4B), Color(0xFF4F46E5), Color(0xFF7C3AED)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  static const card = LinearGradient(
    colors: [Color(0xFF4F46E5), Color(0xFF7C3AED)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  static const cardDeep = LinearGradient(
    colors: [Color(0xFF1E1B4B), Color(0xFF4F46E5)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}

/// Logo mark aplikasi — kotak frosted dengan ikon dompet.
class BrandMark extends StatelessWidget {
  final double size;
  const BrandMark({super.key, this.size = 84});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.14),
        borderRadius: BorderRadius.circular(size * 0.29),
        border: Border.all(color: Colors.white.withOpacity(0.22), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.18),
            blurRadius: 24,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Icon(
        Icons.account_balance_wallet_rounded,
        color: Colors.white,
        size: size * 0.48,
      ),
    );
  }
}

/// Warna baru — Indigo premium, selaras dengan web.
class AppColors {
  static const primary       = Color(0xFF4F46E5); // Indigo 600
  static const primaryDark   = Color(0xFF3730A3); // Indigo 800
  static const primaryLight  = Color(0xFF818CF8); // Indigo 400
  static const accent        = Color(0xFF7C3AED); // Violet 600
  static const success       = Color(0xFF059669); // Emerald 600
  static const danger        = Color(0xFFDC2626); // Red 600
  static const warning       = Color(0xFFD97706); // Amber 600
  static const surface       = Color(0xFFF5F5FF); // Putih ungu lembut
  static const surfaceCard   = Color(0xFFFFFFFF);
  static const ink           = Color(0xFF1F2937);
  static const muted         = Color(0xFF6B7280);
  static const border        = Color(0xFFE0E7FF); // Indigo 100
}

ThemeData buildAppTheme() {
  final base = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      primary: AppColors.primary,
      secondary: AppColors.accent,
      surface: AppColors.surface,
    ),
    scaffoldBackgroundColor: AppColors.surface,
    fontFamily: 'Roboto',
  );

  return base.copyWith(
    appBarTheme: AppBarTheme(
      backgroundColor: AppColors.primary,
      foregroundColor: Colors.white,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: const TextStyle(
        fontFamily: 'Roboto',
        fontSize: 18,
        fontWeight: FontWeight.w700,
        color: Colors.white,
      ),
      iconTheme: const IconThemeData(color: Colors.white),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: Colors.white,
      indicatorColor: const Color(0xFFEEF2FF), // Indigo 50
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        final active = states.contains(WidgetState.selected);
        return TextStyle(
          fontSize: 11,
          fontWeight: active ? FontWeight.w700 : FontWeight.w500,
          color: active ? AppColors.primary : AppColors.muted,
        );
      }),
      iconTheme: WidgetStateProperty.resolveWith((states) {
        final active = states.contains(WidgetState.selected);
        return IconThemeData(
          color: active ? AppColors.primary : AppColors.muted,
          size: 22,
        );
      }),
      elevation: 4,
      shadowColor: const Color(0x1A4F46E5),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFE0E7FF)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFE0E7FF)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.primary, width: 2),
      ),
      labelStyle: const TextStyle(color: AppColors.muted),
      hintStyle: const TextStyle(color: Color(0xFFD1D5DB)),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 24),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
        elevation: 2,
        shadowColor: const Color(0x404F46E5),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: AppColors.primary,
        textStyle: const TextStyle(fontWeight: FontWeight.w600),
      ),
    ),
    cardTheme: CardThemeData(
      color: AppColors.surfaceCard,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: AppColors.border),
      ),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: const Color(0xFFEEF2FF),
      labelStyle: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600, fontSize: 12),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(99)),
      side: BorderSide.none,
    ),
    dividerTheme: const DividerThemeData(
      color: Color(0xFFF3F4F6),
      thickness: 1,
      space: 1,
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: AppColors.ink,
      contentTextStyle: const TextStyle(color: Colors.white, fontSize: 13.5),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      elevation: 4,
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      titleTextStyle: const TextStyle(
        color: AppColors.ink,
        fontSize: 17,
        fontWeight: FontWeight.w700,
      ),
      contentTextStyle: const TextStyle(color: AppColors.muted, fontSize: 14, height: 1.5),
    ),
  );
}

/// Gradient AppBar widget (pakai ini sebagai AppBar di screens utama)
class GradientAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final List<Widget>? actions;
  const GradientAppBar({super.key, required this.title, this.actions});

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.primaryDark, AppColors.primary, AppColors.accent],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
      ),
      child: AppBar(
        title: Text(title),
        actions: actions,
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
    );
  }
}
