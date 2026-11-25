package com.edgerunner.berserk;

import net.minecraft.util.Mth;

public final class BerserkCombatMath {
   private BerserkCombatMath() {
   }

   public static int manualExitCooldown(int cooldown, int activeMax, int remaining) {
      double used = activeMax <= 0 ? (double)1.0F : (double)(activeMax - remaining) / (double)activeMax;
      return (int)Math.round((double)cooldown * Math.max((double)0.5F, Math.min((double)1.0F, used)));
   }

   public static double combineReductions(double primaryPercent, double secondaryPercent) {
      double primaryRemaining = (double)1.0F - Mth.m_14008_(primaryPercent, (double)0.0F, (double)100.0F) / (double)100.0F;
      double secondaryRemaining = (double)1.0F - Mth.m_14008_(secondaryPercent, (double)0.0F, (double)100.0F) / (double)100.0F;
      return Mth.m_14008_((double)100.0F * ((double)1.0F - primaryRemaining * secondaryRemaining), (double)0.0F, (double)100.0F);
   }

   public static float reduceDamage(float incoming, double reductionPercent) {
      return Math.max(0.0F, incoming) * (float)((double)1.0F - Mth.m_14008_(reductionPercent, (double)0.0F, (double)100.0F) / (double)100.0F);
   }

   public static float clampToHealthFloor(float currentHealth, float maxHealth, float incoming, float floorRatio) {
      float floor = Math.max(0.0F, maxHealth) * Mth.m_14036_(floorRatio, 0.0F, 1.0F);
      return Mth.m_14036_(incoming, 0.0F, Math.max(0.0F, currentHealth - floor));
   }

   public static int reduceCooldownTicks(int currentTicks, double reductionPercent) {
      if (currentTicks <= 0) {
         return 0;
      } else if (Double.isFinite(reductionPercent) && !(reductionPercent <= (double)0.0F)) {
         double reductionFactor = Mth.m_14008_(reductionPercent / (double)100.0F, (double)0.0F, (double)1.0F);
         int reduced = (int)Math.floor((double)currentTicks * ((double)1.0F - reductionFactor));
         if (reduced >= currentTicks) {
            reduced = currentTicks - 1;
         }

         return Math.max(0, reduced);
      } else {
         return currentTicks;
      }
   }
}
