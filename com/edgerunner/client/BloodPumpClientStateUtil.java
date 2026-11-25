package com.edgerunner.client;

import javax.annotation.Nullable;
import net.minecraft.client.player.LocalPlayer;
import net.minecraft.resources.ResourceLocation;
import net.threetag.palladium.power.IPowerHolder;
import net.threetag.palladium.power.Power;
import net.threetag.palladium.power.PowerHandler;
import net.threetag.palladium.power.PowerManager;
import net.threetag.palladium.power.ability.AbilityInstance;

public final class BloodPumpClientStateUtil {
   private static final ResourceLocation POWER_ID = ResourceLocation.fromNamespaceAndPath("project_edgerunner", "blood_pump");
   private static final String MAIN_ABILITY_ID = "blood_pump";
   private static final String[] CAPACITY_ABILITY_IDS = new String[]{"", "charge_capacity_1", "charge_capacity_2", "charge_capacity_3"};
   private static final String[] RECHARGE_VISUAL_ABILITY_IDS = new String[]{"", "blood_pump_slot_1_recharge_visual", "blood_pump_slot_2_recharge_visual", "blood_pump_slot_3_recharge_visual"};
   private static final String[] INJECT_VISUAL_ABILITY_IDS = new String[]{"", "blood_pump_slot_1_inject_visual", "blood_pump_slot_2_inject_visual", "blood_pump_slot_3_inject_visual"};

   private BloodPumpClientStateUtil() {
   }

   public static State resolve(@Nullable LocalPlayer player) {
      if (player != null && player.m_9236_() != null) {
         Power power = PowerManager.getInstance(player.m_9236_()).getPower(POWER_ID);
         if (power == null) {
            return BloodPumpClientStateUtil.State.empty();
         } else {
            PowerHandler handler = (PowerHandler)PowerManager.getPowerHandler(player).orElse((Object)null);
            if (handler == null) {
               return BloodPumpClientStateUtil.State.empty();
            } else {
               IPowerHolder holder = handler.getPowerHolder(power);
               if (holder == null) {
                  return BloodPumpClientStateUtil.State.empty();
               } else {
                  AbilityInstance mainAbility = (AbilityInstance)holder.getAbilities().get("blood_pump");
                  if (!isUnlocked(mainAbility)) {
                     return BloodPumpClientStateUtil.State.empty();
                  } else {
                     int maxCharges = resolveMaxCharges(holder);
                     int currentCharges = 0;
                     int nextRechargeTicks = 0;
                     int nextRechargeSlot = 0;
                     int activeTicks = 0;
                     int[] slotRechargeTicks = new int[4];
                     int[] slotRechargeMaxTicks = new int[4];
                     int[] slotInjectTicks = new int[4];

                     for(int slot = 1; slot <= maxCharges; ++slot) {
                        AbilityInstance rechargeAbility = (AbilityInstance)holder.getAbilities().get(RECHARGE_VISUAL_ABILITY_IDS[slot]);
                        AbilityInstance injectAbility = (AbilityInstance)holder.getAbilities().get(INJECT_VISUAL_ABILITY_IDS[slot]);
                        int rechargeTicks = Math.max(0, rechargeAbility == null ? 0 : rechargeAbility.cooldown);
                        int syncedRechargeMax = rechargeAbility == null ? 600 : Math.max(0, rechargeAbility.maxCooldown);
                        int rechargeMaxTicks = rechargeTicks > 0 ? Math.max(rechargeTicks, syncedRechargeMax > 0 ? syncedRechargeMax : 600) : 0;
                        int injectTicks = Math.max(0, injectAbility == null ? 0 : injectAbility.activationTimer);
                        slotRechargeTicks[slot] = rechargeTicks;
                        slotRechargeMaxTicks[slot] = rechargeMaxTicks;
                        slotInjectTicks[slot] = injectTicks;
                        if (rechargeTicks <= 0) {
                           ++currentCharges;
                        } else if (nextRechargeTicks <= 0 || rechargeTicks < nextRechargeTicks) {
                           nextRechargeTicks = rechargeTicks;
                           nextRechargeSlot = slot;
                        }

                        if (injectTicks > activeTicks) {
                           activeTicks = injectTicks;
                        }
                     }

                     return new State(currentCharges, maxCharges, nextRechargeTicks, nextRechargeSlot, activeTicks, 120, slotRechargeTicks, slotRechargeMaxTicks, slotInjectTicks);
                  }
               }
            }
         }
      } else {
         return BloodPumpClientStateUtil.State.empty();
      }
   }

   private static int resolveMaxCharges(IPowerHolder holder) {
      for(int slot = 3; slot >= 1; --slot) {
         if (isUnlocked((AbilityInstance)holder.getAbilities().get(CAPACITY_ABILITY_IDS[slot]))) {
            return slot;
         }
      }

      return 1;
   }

   private static boolean isUnlocked(@Nullable AbilityInstance ability) {
      return ability != null && ability.isUnlocked();
   }

   public static record State(int currentCharges, int maxCharges, int nextRechargeTicks, int nextRechargeSlot, int activeTicks, int activeMaxTicks, int[] slotRechargeTicks, int[] slotRechargeMaxTicks, int[] slotInjectTicks) {
      public State(int currentCharges, int maxCharges, int nextRechargeTicks, int nextRechargeSlot, int activeTicks, int activeMaxTicks, int[] slotRechargeTicks, int[] slotRechargeMaxTicks, int[] slotInjectTicks) {
         slotRechargeTicks = slotRechargeTicks == null ? new int[4] : (int[])(([I)slotRechargeTicks).clone();
         slotRechargeMaxTicks = slotRechargeMaxTicks == null ? new int[4] : (int[])(([I)slotRechargeMaxTicks).clone();
         slotInjectTicks = slotInjectTicks == null ? new int[4] : (int[])(([I)slotInjectTicks).clone();
         this.currentCharges = currentCharges;
         this.maxCharges = maxCharges;
         this.nextRechargeTicks = nextRechargeTicks;
         this.nextRechargeSlot = nextRechargeSlot;
         this.activeTicks = activeTicks;
         this.activeMaxTicks = activeMaxTicks;
         this.slotRechargeTicks = slotRechargeTicks;
         this.slotRechargeMaxTicks = slotRechargeMaxTicks;
         this.slotInjectTicks = slotInjectTicks;
      }

      public static State empty() {
         return new State(0, 0, 0, 0, 0, 120, new int[4], new int[4], new int[4]);
      }

      public int slotRechargeTicks(int slot) {
         return slot >= 0 && slot < this.slotRechargeTicks.length ? Math.max(0, this.slotRechargeTicks[slot]) : 0;
      }

      public int slotRechargeMaxTicks(int slot) {
         return slot >= 0 && slot < this.slotRechargeMaxTicks.length ? Math.max(0, this.slotRechargeMaxTicks[slot]) : 0;
      }

      public int slotInjectTicks(int slot) {
         return slot >= 0 && slot < this.slotInjectTicks.length ? Math.max(0, this.slotInjectTicks[slot]) : 0;
      }
   }
}
