import 'package:flutter/material.dart';
import '../../core/theme.dart';

class StepperHeader extends StatelessWidget {
  final int step;
  const StepperHeader({super.key, required this.step});

  @override
  Widget build(BuildContext context) {
    const totalSteps = 4;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      color: Colors.white,
      child: Row(
        children: List.generate(totalSteps * 2 - 1, (index) {
          if (index.isOdd) {
            final isLineActive = (index ~/ 2 + 1) < step;
            return Expanded(
              child: Container(
                height: 2,
                color: isLineActive ? AppColors.primary : const Color(0xFFE5E7EB),
                margin: const EdgeInsets.symmetric(horizontal: 4),
              ),
            );
          }
          final stepIndex = index ~/ 2 + 1;
          final isActive = stepIndex <= step;
          return Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: isActive ? AppColors.primary : const Color(0xFFF3F4F6),
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: Text(
              '$stepIndex',
              style: TextStyle(
                color: isActive ? Colors.white : const Color(0xFF9CA3AF),
                fontSize: 13,
                fontWeight: FontWeight.bold,
              ),
            ),
          );
        }),
      ),
    );
  }
}
