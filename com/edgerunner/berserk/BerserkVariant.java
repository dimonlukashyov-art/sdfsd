package com.edgerunner.berserk;

import com.edgerunner.config.EdgerunnerServerConfig;
import java.util.Arrays;
import java.util.Locale;
import javax.annotation.Nullable;

public enum BerserkVariant {
   MOORE_TECH(1, "project_edgerunner:berserk_moore_tech", "Moore Tech Berserk", new double[]{(double)30.0F, (double)40.0F, (double)50.0F}, new double[]{(double)8.0F, (double)9.5F, (double)11.0F}, new double[]{(double)60.0F, (double)45.0F, (double)35.0F, (double)25.0F}, new double[]{(double)0.0F}, new double[]{(double)0.0F}, new double[]{(double)0.0F}, new double[]{(double)0.0F}, false),
   BIODYNE(2, "project_edgerunner:berserk_biodyne", "BioDyne Berserk", new double[]{(double)30.0F, (double)40.0F, (double)50.0F}, new double[]{(double)8.0F, (double)9.5F, (double)11.0F}, new double[]{(double)60.0F, (double)47.5F, (double)35.0F}, new double[]{(double)15.0F, (double)22.5F, (double)30.0F}, new double[]{(double)5.0F, (double)10.0F, (double)15.0F, (double)20.0F}, new double[]{(double)0.0F}, new double[]{(double)0.0F}, false),
   ZETATECH(3, "project_edgerunner:berserk_zetatech", "Zetatech Berserk", new double[]{(double)35.0F, (double)42.5F, (double)50.0F}, new double[]{(double)9.0F, (double)10.0F, (double)11.0F}, new double[]{(double)45.0F, (double)35.0F, (double)25.0F}, new double[]{(double)10.0F, (double)15.0F, (double)20.0F}, new double[]{(double)0.0F}, new double[]{(double)20.0F, (double)25.0F, (double)30.0F}, new double[]{(double)0.0F}, false),
   MILITECH(4, "project_edgerunner:berserk_militech", "Militech Berserk", new double[]{(double)100.0F}, new double[]{(double)11.0F, (double)12.0F}, new double[]{(double)40.0F, (double)32.5F, (double)25.0F}, new double[]{(double)25.0F, (double)30.0F}, new double[]{(double)0.0F}, new double[]{(double)100.0F}, new double[]{(double)15.0F, (double)20.0F}, true);

   private final int networkId;
   private final String itemId;
   private final String displayName;
   private final double[] damageReduction;
   private final double[] durationSeconds;
   private final double[] cooldownSeconds;
   private final double[] attackSpeedPercent;
   private final double[] critChancePercent;
   private final double[] fallReductionPercent;
   private final double[] movementSpeedPercent;
   private final boolean invulnerable;

   private BerserkVariant(int networkId, String itemId, String displayName, double[] damageReduction, double[] durationSeconds, double[] cooldownSeconds, double[] attackSpeedPercent, double[] critChancePercent, double[] fallReductionPercent, double[] movementSpeedPercent, boolean invulnerable) {
      this.networkId = networkId;
      this.itemId = itemId;
      this.displayName = displayName;
      this.damageReduction = damageReduction;
      this.durationSeconds = durationSeconds;
      this.cooldownSeconds = cooldownSeconds;
      this.attackSpeedPercent = attackSpeedPercent;
      this.critChancePercent = critChancePercent;
      this.fallReductionPercent = fallReductionPercent;
      this.movementSpeedPercent = movementSpeedPercent;
      this.invulnerable = invulnerable;
   }

   public int networkId() {
      return this.networkId;
   }

   public String itemId() {
      return this.itemId;
   }

   public String displayName() {
      return this.displayName;
   }

   public String powerId() {
      return this.itemId;
   }

   public String internalPartsItemId() {
      String var10000;
      switch (this) {
         case MOORE_TECH:
         case BIODYNE:
            var10000 = "project_edgerunner:cyberware_internal_parts_t2";
            break;
         case ZETATECH:
            var10000 = "project_edgerunner:cyberware_internal_parts_t3";
            break;
         case MILITECH:
            var10000 = "project_edgerunner:cyberware_internal_parts_t4";
            break;
         default:
            throw new IncompatibleClassChangeError();
      }

      return var10000;
   }

   public String[] specializationIds() {
      String[] var10000;
      switch (this) {
         case MOORE_TECH -> var10000 = new String[]{"bastion", "breach"};
         case BIODYNE -> var10000 = new String[]{"hemorrhage", "predation"};
         case ZETATECH -> var10000 = new String[]{"momentum", "seismic"};
         case MILITECH -> var10000 = new String[]{"last_stand", "shock_assault"};
         default -> throw new IncompatibleClassChangeError();
      }

      return var10000;
   }

   public int respecFee() {
      return 3;
   }

   public boolean invulnerable() {
      return this.invulnerable;
   }

   public double damageReductionPercent(int tier) {
      return Math.min((double)100.0F, valueAt(this.damageReduction, tier) * EdgerunnerServerConfig.getBerserkMultiplier(this.name().toLowerCase(Locale.ROOT), EdgerunnerServerConfig.BerserkMultiplier.DAMAGE_REDUCTION));
   }

   public int durationTicks(int tier) {
      return Math.max(1, (int)Math.round(valueAt(this.durationSeconds, tier) * (double)20.0F * EdgerunnerServerConfig.getBerserkMultiplier(this.name().toLowerCase(Locale.ROOT), EdgerunnerServerConfig.BerserkMultiplier.DURATION)));
   }

   public int cooldownTicks(int tier) {
      return Math.max(1, (int)Math.round(valueAt(this.cooldownSeconds, tier) * (double)20.0F * EdgerunnerServerConfig.getBerserkMultiplier(this.name().toLowerCase(Locale.ROOT), EdgerunnerServerConfig.BerserkMultiplier.COOLDOWN)));
   }

   public double attackSpeedPercent(int tier) {
      return valueAt(this.attackSpeedPercent, tier);
   }

   public double critChancePercent(int tier) {
      return valueAt(this.critChancePercent, tier);
   }

   public double fallReductionPercent(int tier) {
      return valueAt(this.fallReductionPercent, tier);
   }

   public double movementSpeedPercent(int tier) {
      return valueAt(this.movementSpeedPercent, tier);
   }

   public int maxDamageReductionTier() {
      return maxTier(this.damageReduction);
   }

   public int maxDurationTier() {
      return maxTier(this.durationSeconds);
   }

   public int maxCooldownTier() {
      return maxTier(this.cooldownSeconds);
   }

   public int maxAttackSpeedTier() {
      return maxTier(this.attackSpeedPercent);
   }

   public int maxCritChanceTier() {
      return maxTier(this.critChancePercent);
   }

   public int maxFallReductionTier() {
      return maxTier(this.fallReductionPercent);
   }

   public int maxMovementSpeedTier() {
      return maxTier(this.movementSpeedPercent);
   }

   @Nullable
   public static BerserkVariant byItemId(String itemId) {
      if (itemId != null && !itemId.isBlank()) {
         String normalized = itemId.trim().toLowerCase(Locale.ROOT);
         return (BerserkVariant)Arrays.stream(values()).filter((value) -> value.itemId.equals(normalized)).findFirst().orElse((Object)null);
      } else {
         return null;
      }
   }

   @Nullable
   public static BerserkVariant byNetworkId(int id) {
      return (BerserkVariant)Arrays.stream(values()).filter((value) -> value.networkId == id).findFirst().orElse((Object)null);
   }

   private static double valueAt(double[] values, int tier) {
      if (values != null && values.length != 0) {
         int index = Math.max(0, Math.min(tier, values.length - 1));
         return values[index];
      } else {
         return (double)0.0F;
      }
   }

   private static int maxTier(double[] values) {
      return values == null ? 0 : Math.max(0, values.length - 1);
   }

   // $FF: synthetic method
   private static BerserkVariant[] $values() {
      return new BerserkVariant[]{MOORE_TECH, BIODYNE, ZETATECH, MILITECH};
   }
}
