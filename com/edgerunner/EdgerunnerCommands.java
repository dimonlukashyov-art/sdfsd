package com.edgerunner;

import com.edgerunner.animation.ArmsCommand;
import com.edgerunner.animation.bedrock.BedrockAnimCommand;
import com.edgerunner.animation.bedrock.FirstPersonAnimationDebugCommand;
import com.edgerunner.compat.tacz.TacZGunnerCommands;
import com.edgerunner.content.ripperdoc.gui.RipperdocMenu;
import com.edgerunner.cyberpsychosis.BloodPumpChargeRuntime;
import com.edgerunner.cyberpsychosis.CyberpsychosisRuntime;
import com.edgerunner.cyberware.CyberwareBanCommand;
import com.edgerunner.cyberware.CyberwareCapacityCommand;
import com.edgerunner.cyberware.CyberwareCooldownCommand;
import com.edgerunner.cyberware.SkeletonCyberwareRuntime;
import com.edgerunner.gorilla.GorillaArmsRuntime;
import com.edgerunner.gui.ClientGuiCommand;
import com.edgerunner.mantis.MantisBladesRuntime;
import com.edgerunner.sandevistan.SandevistanController;
import com.edgerunner.sandevistan.SandevistanPalladiumBridge;
import com.edgerunner.sandevistan.TemporalFieldManager;
import com.edgerunner.sandevistan.TemporalFieldRegistry;
import com.edgerunner.sandevistan.TemporalMath;
import com.edgerunner.sandevistan.TemporalPlayerActionBudget;
import com.mojang.brigadier.arguments.DoubleArgumentType;
import com.mojang.brigadier.arguments.IntegerArgumentType;
import com.mojang.brigadier.arguments.StringArgumentType;
import com.mojang.brigadier.builder.LiteralArgumentBuilder;
import com.mojang.brigadier.builder.RequiredArgumentBuilder;
import com.mojang.brigadier.suggestion.SuggestionProvider;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;
import net.minecraft.ChatFormatting;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.commands.Commands;
import net.minecraft.commands.SharedSuggestionProvider;
import net.minecraft.commands.arguments.EntityArgument;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.MutableComponent;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.SimpleMenuProvider;
import net.minecraft.world.effect.MobEffect;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.entity.Entity;
import net.minecraftforge.event.RegisterCommandsEvent;
import net.minecraftforge.network.NetworkHooks;
import net.minecraftforge.registries.ForgeRegistries;

public final class EdgerunnerCommands {
   private static final String ROOT_COMMAND = "projectedgerunner";
   private static final String KUBEJS_CYBERWARE_ROOT = "cyberware";
   private static final String CYBERWARE_CAPACITY_KEY = "max_capacity";
   private static final String CYBERWARE_CAPACITY_BASE_KEY = "max_capacity_base";
   private static final String CYBERWARE_CAPACITY_TIER_CACHE_KEY = "capacity_upgrade_tier_cache";
   private static final String CYBERWARE_CAPACITY_UPGRADE_SEEN_KEY = "capacity_upgrade_seen";
   private static final String CYBERWARE_CAPACITY_MARKER_KEY = "capacity_upgrade_marker";
   private static final ResourceLocation CYBERWARE_CAPACITY_INMUNOSUPRESION_EFFECT = ResourceLocation.m_214293_("project_edgerunner", "inmunosupresion");
   private static final int CYBERWARE_CAPACITY_SANITY_LIMIT = 10000;
   private static final double CYBERWARE_CAPACITY_INMUNOSUPRESION_BASE_BONUS = 0.3;
   private static final double CYBERWARE_CAPACITY_INMUNOSUPRESION_PER_LEVEL = 0.1;
   private static final SuggestionProvider<CommandSourceStack> SYMPTOM_ID_SUGGESTIONS = (context, builder) -> SharedSuggestionProvider.m_82970_(CyberpsychosisRuntime.getSupportedManualSymptomIds(), builder);
   private static final SuggestionProvider<CommandSourceStack> SYMPTOM_CLEAR_SUGGESTIONS = (context, builder) -> SharedSuggestionProvider.m_82981_(Stream.concat(Stream.of("all"), CyberpsychosisRuntime.getSupportedManualSymptomIds().stream()), builder);

   private EdgerunnerCommands() {
   }

   private static boolean isJoinGuardActive(ServerPlayer player) {
      long now = player.m_284548_().m_46467_();
      long lockUntil = 0L;
      if (player.getPersistentData().m_128425_("cyberware_join_lock_until", 99)) {
         lockUntil = Math.max(lockUntil, player.getPersistentData().m_128454_("cyberware_join_lock_until"));
      }

      if (player.getPersistentData().m_128425_("cyberware_os_lock_until", 99)) {
         lockUntil = Math.max(lockUntil, player.getPersistentData().m_128454_("cyberware_os_lock_until"));
      }

      return now <= lockUntil;
   }

   private static boolean canUseSandevistan(CommandSourceStack source) {
      Entity var2 = source.m_81373_();
      if (!(var2 instanceof ServerPlayer player)) {
         return source.m_6761_(2);
      } else if (EdgerunnerMod.isSandevistanJoinGuardActive(player)) {
         return false;
      } else if (isJoinGuardActive(player)) {
         return false;
      } else {
         return player.m_20310_(2) || player.m_19880_().contains("edgerunner_sandy_internal");
      }
   }

   private static int openRipperdocUi(ServerPlayer player) {
      NetworkHooks.openScreen(player, new SimpleMenuProvider((containerId, playerInventory, ignored) -> new RipperdocMenu(containerId, playerInventory), Component.m_237115_("text.project_edgerunner.edgerunnercommands.ripperdoc")));
      return 1;
   }

   private static void lockAbilityForPlayer(ServerPlayer target, String powerId, String abilityId) {
      if (target != null && target.f_8924_ != null) {
         CommandSourceStack source = target.m_20203_().m_81325_(4).m_81324_();
         target.f_8924_.m_129892_().m_230957_(source, "ability lock @s " + powerId + " " + abilityId);
      }
   }

   private static int lockBuyableUpgradeAbilitiesForPlayer(ServerPlayer target) {
      if (target == null) {
         return 0;
      } else {
         Map<ResourceLocation, List<String>> abilityIdsByPower = SandevistanPalladiumBridge.getResettableUpgradeAbilityIdsByPower(target, "project_edgerunner");
         int lockedCount = 0;

         for(Map.Entry<ResourceLocation, List<String>> entry : abilityIdsByPower.entrySet()) {
            String powerId = ((ResourceLocation)entry.getKey()).toString();

            for(String abilityId : (List)entry.getValue()) {
               lockAbilityForPlayer(target, powerId, abilityId);
               ++lockedCount;
            }
         }

         return lockedCount;
      }
   }

   private static void resetCyberwareCapacityUpgradeCache(ServerPlayer target) {
      CompoundTag persistent = target.getPersistentData();
      if (persistent.m_128425_("cyberware", 10)) {
         CompoundTag cyberware = persistent.m_128469_("cyberware");
         cyberware.m_128405_("capacity_upgrade_tier_cache", 0);
         cyberware.m_128473_("capacity_upgrade_seen");
         cyberware.m_128473_("capacity_upgrade_marker");
         int baseCapacity = cyberware.m_128425_("max_capacity_base", 99) ? Math.max(1, cyberware.m_128451_("max_capacity_base")) : 0;
         if (baseCapacity <= 0 && persistent.m_128425_("cyberware_capacity_profile_base", 99)) {
            baseCapacity = Math.max(1, persistent.m_128451_("cyberware_capacity_profile_base"));
         }

         if (baseCapacity > 0) {
            double temporaryBonusMultiplier = resolveTemporaryCapacityBonusMultiplier(target);
            int effectiveCapacity = Math.max(1, Math.min(10000, (int)Math.floor((double)baseCapacity * ((double)1.0F + temporaryBonusMultiplier))));
            cyberware.m_128405_("max_capacity", effectiveCapacity);
         }

         persistent.m_128365_("cyberware", cyberware);
      }
   }

   private static double resolveTemporaryCapacityBonusMultiplier(ServerPlayer target) {
      double bonus = (double)0.0F;
      MobEffect inmunosupresion = (MobEffect)ForgeRegistries.MOB_EFFECTS.getValue(CYBERWARE_CAPACITY_INMUNOSUPRESION_EFFECT);
      if (inmunosupresion != null) {
         MobEffectInstance instance = target.m_21124_(inmunosupresion);
         if (instance != null) {
            bonus += 0.3 + (double)Math.max(0, instance.m_19564_()) * 0.1;
         }
      }

      bonus += SkeletonCyberwareRuntime.getCapacityBonusMultiplier(target);
      return Math.max((double)0.0F, bonus);
   }

   private static int resetKnownPowerUpgrades(ServerPlayer target) {
      if (target == null) {
         return 0;
      } else {
         SandevistanController.deactivate(target);
         BloodPumpChargeRuntime.forceReset(target);
         GorillaArmsRuntime.forceReset(target);
         GorillaArmsRuntime.resetUpgradeData(target);
         MantisBladesRuntime.forceReset(target);
         MantisBladesRuntime.resetUpgradeData(target);
         int lockedCount = lockBuyableUpgradeAbilitiesForPlayer(target);
         resetCyberwareCapacityUpgradeCache(target);
         return lockedCount;
      }
   }

   private static int wipePlayerData(CommandSourceStack source, ServerPlayer target) {
      EdgerunnerPlayerDataReset.WipeResult result = EdgerunnerPlayerDataReset.wipe(target);
      boolean self = source.m_81373_() == target;
      source.m_288197_(() -> self ? Component.m_237110_("command.edgerunner.wipe.success.self", new Object[]{result.itemsDropped(), result.scoreObjectivesCleared(), result.nbtKeysRemoved(), result.powersRemoved()}) : Component.m_237110_("command.edgerunner.wipe.success.target", new Object[]{target.m_7755_(), result.itemsDropped(), result.scoreObjectivesCleared(), result.nbtKeysRemoved(), result.powersRemoved()}), !self);
      return 1;
   }

   private static int repairPlayerData(CommandSourceStack source, ServerPlayer target) {
      EdgerunnerPlayerDataRepair.RepairResult result = EdgerunnerPlayerDataRepair.repair(target);
      boolean self = source.m_81373_() == target;
      boolean hasMenu = result.menuSlotCount() > 0;
      boolean hasCanonical = EdgerunnerPlayerDataRepair.hasCanonicalInstallation(target);
      source.m_288197_(() -> self ? Component.m_237110_(hasMenu ? (hasCanonical ? "command.edgerunner.repair.success.self" : "command.edgerunner.repair.partial.self") : "command.edgerunner.repair.empty_menu.self", new Object[]{result.powersStripped(), result.menuSlotCount()}) : Component.m_237110_(hasMenu ? (hasCanonical ? "command.edgerunner.repair.success.target" : "command.edgerunner.repair.partial.target") : "command.edgerunner.repair.empty_menu.target", new Object[]{target.m_7755_(), result.powersStripped(), result.menuSlotCount()}), !self);
      return 1;
   }

   private static Component buildCyberpsychosisStatus(ServerPlayer target) {
      int phase = CyberpsychosisRuntime.getDebugPhase(target);
      int pressure = CyberpsychosisRuntime.getDebugPressure(target);
      int degradation = CyberpsychosisRuntime.getDebugDegradation(target);
      boolean frozen = CyberpsychosisRuntime.isDebugProgressionFrozen(target);
      boolean forceLock = CyberpsychosisRuntime.isDebugForceLock(target);
      CyberpsychosisRuntime.DebugFsmView fsm = CyberpsychosisRuntime.getDebugFsmView(target);
      MutableComponent var10000 = Component.m_237113_("[Edgerunner] ").m_130940_(ChatFormatting.AQUA).m_7220_(Component.m_237115_("text.project_edgerunner.edgerunnercommands.cyberpsychosis").m_130940_(ChatFormatting.WHITE));
      String var10001 = target.m_6302_();
      return var10000.m_7220_(Component.m_237113_(var10001 + " -> ").m_130940_(ChatFormatting.GRAY)).m_7220_(Component.m_237110_("text.project_edgerunner.edgerunnercommands.phase_s", new Object[]{phase}).m_130940_(ChatFormatting.YELLOW)).m_7220_(Component.m_237110_("text.project_edgerunner.edgerunnercommands.pressure_s", new Object[]{pressure}).m_130940_(ChatFormatting.GOLD)).m_7220_(Component.m_237110_("text.project_edgerunner.edgerunnercommands.degradation_s", new Object[]{degradation}).m_130940_(ChatFormatting.RED)).m_7220_(Component.m_237110_("text.project_edgerunner.edgerunnercommands.control_s", new Object[]{fsm.controlState().name()}).m_130940_(ChatFormatting.LIGHT_PURPLE)).m_7220_(Component.m_237110_("text.project_edgerunner.edgerunnercommands.cue_s", new Object[]{fsm.lastCueSummary()}).m_130940_(ChatFormatting.GRAY)).m_7220_(Component.m_237110_("hud.project_edgerunner.presentation.freeze_s", new Object[]{Component.m_237115_(frozen ? "hud.project_edgerunner.presentation.on" : "hud.project_edgerunner.presentation.off")}).m_130940_(frozen ? ChatFormatting.AQUA : ChatFormatting.DARK_GRAY)).m_7220_(Component.m_237110_("hud.project_edgerunner.presentation.forcelock_s", new Object[]{Component.m_237115_(forceLock ? "hud.project_edgerunner.presentation.on" : "hud.project_edgerunner.presentation.off")}).m_130940_(forceLock ? ChatFormatting.LIGHT_PURPLE : ChatFormatting.DARK_GRAY));
   }

   private static int showCyberpsychosisStatus(CommandSourceStack source, ServerPlayer target) {
      source.m_288197_(() -> buildCyberpsychosisStatus(target), false);
      return 1;
   }

   private static int setCyberpsychosisPhase(CommandSourceStack source, ServerPlayer target, int value) {
      CyberpsychosisRuntime.debugSetPhase(target, value);
      source.m_288197_(() -> {
         MutableComponent var10000 = Component.m_237115_("text.project_edgerunner.edgerunnercommands.edgerunner_set_cyberpsychosis_phase_for").m_130940_(ChatFormatting.AQUA);
         String var10001 = target.m_6302_();
         return var10000.m_7220_(Component.m_237113_(var10001 + " -> " + value).m_130940_(ChatFormatting.YELLOW));
      }, true);
      source.m_288197_(() -> buildCyberpsychosisStatus(target), false);
      return 1;
   }

   private static int setCyberpsychosisPressure(CommandSourceStack source, ServerPlayer target, int value) {
      CyberpsychosisRuntime.debugSetPressure(target, value);
      source.m_288197_(() -> {
         MutableComponent var10000 = Component.m_237115_("text.project_edgerunner.edgerunnercommands.edgerunner_set_cyberpsychosis_pressure_for").m_130940_(ChatFormatting.AQUA);
         String var10001 = target.m_6302_();
         return var10000.m_7220_(Component.m_237113_(var10001 + " -> " + value).m_130940_(ChatFormatting.GOLD));
      }, true);
      source.m_288197_(() -> buildCyberpsychosisStatus(target), false);
      return 1;
   }

   private static int setCyberpsychosisDegradation(CommandSourceStack source, ServerPlayer target, int value) {
      CyberpsychosisRuntime.debugSetDegradation(target, value);
      source.m_288197_(() -> {
         MutableComponent var10000 = Component.m_237115_("text.project_edgerunner.edgerunnercommands.edgerunner_set_cyberpsychosis_degradation_for").m_130940_(ChatFormatting.AQUA);
         String var10001 = target.m_6302_();
         return var10000.m_7220_(Component.m_237113_(var10001 + " -> " + value).m_130940_(ChatFormatting.RED));
      }, true);
      source.m_288197_(() -> buildCyberpsychosisStatus(target), false);
      return 1;
   }

   private static int setCyberpsychosisFreeze(CommandSourceStack source, ServerPlayer target, boolean value) {
      CyberpsychosisRuntime.debugSetProgressionFrozen(target, value);
      source.m_288197_(() -> {
         MutableComponent var10000 = Component.m_237115_("text.project_edgerunner.edgerunnercommands.edgerunner_set_cyberpsychosis_freeze_for").m_130940_(ChatFormatting.AQUA);
         String var10001 = target.m_6302_();
         return var10000.m_7220_(Component.m_237113_(var10001 + " -> " + (value ? "ON" : "OFF")).m_130940_(ChatFormatting.YELLOW));
      }, true);
      source.m_288197_(() -> buildCyberpsychosisStatus(target), false);
      return 1;
   }

   private static int setCyberpsychosisForceLock(CommandSourceStack source, ServerPlayer target, boolean value) {
      CyberpsychosisRuntime.debugSetForceLock(target, value);
      source.m_288197_(() -> {
         MutableComponent var10000 = Component.m_237115_("text.project_edgerunner.edgerunnercommands.edgerunner_set_cyberpsychosis_forcelock_for").m_130940_(ChatFormatting.AQUA);
         String var10001 = target.m_6302_();
         return var10000.m_7220_(Component.m_237113_(var10001 + " -> " + (value ? "ON" : "OFF")).m_130940_(ChatFormatting.LIGHT_PURPLE));
      }, true);
      source.m_288197_(() -> buildCyberpsychosisStatus(target), false);
      return 1;
   }

   private static Component buildCyberpsychosisFsmSnapshot(ServerPlayer target) {
      CyberpsychosisRuntime.DebugFsmView fsm = CyberpsychosisRuntime.getDebugFsmView(target);
      return Component.m_237113_("[Edgerunner] ").m_130940_(ChatFormatting.AQUA).m_7220_(Component.m_237115_("text.project_edgerunner.edgerunnercommands.fsm").m_130940_(ChatFormatting.WHITE)).m_7220_(Component.m_237113_(target.m_6302_() + " -> ").m_130940_(ChatFormatting.GRAY)).m_7220_(Component.m_237110_("text.project_edgerunner.edgerunnercommands.phase_s_s", new Object[]{fsm.phase(), fsm.renderPhase()}).m_130940_(ChatFormatting.YELLOW)).m_7220_(Component.m_237110_("text.project_edgerunner.edgerunnercommands.ctl_s", new Object[]{fsm.controlState().name()}).m_130940_(ChatFormatting.LIGHT_PURPLE)).m_7220_(Component.m_237115_("text.project_edgerunner.edgerunnercommands.flags").m_130940_(ChatFormatting.WHITE)).m_7220_(Component.m_237110_("text.project_edgerunner.edgerunnercommands.shared_s_watcher_s_hall_s_iff_s_chroma_s_shadow_s", new Object[]{onOff(fsm.sharedEyesActive()), onOff(fsm.watcherEyesActive()), onOff(fsm.hallucinationActive()), onOff(fsm.iffBroken()), String.format(Locale.ROOT, "%.2f", fsm.chromaticStrength()), onOff(fsm.shadowFiguresActive())}).m_130940_(ChatFormatting.GRAY)).m_7220_(Component.m_237110_("text.project_edgerunner.edgerunnercommands.timers_s_s_s_s_s", new Object[]{shortTimer(fsm.nextPopupTicks()), shortTimer(fsm.nextMisfireTicks()), shortTimer(fsm.nextDebuffTicks()), shortTimer(fsm.nextMotorLockTicks()), shortTimer(fsm.nextEpisodeTicks())}).m_130940_(ChatFormatting.GOLD)).m_7220_(Component.m_237110_("text.project_edgerunner.edgerunnercommands.cue_s", new Object[]{fsm.lastCueSummary()}).m_130940_(ChatFormatting.RED));
   }

   private static int showCyberpsychosisFsmSnapshot(CommandSourceStack source, ServerPlayer target) {
      source.m_288197_(() -> buildCyberpsychosisFsmSnapshot(target), false);
      return 1;
   }

   private static int showCyberpsychosisTrace(CommandSourceStack source, ServerPlayer target) {
      List<String> trace = CyberpsychosisRuntime.getDebugTrace(target);
      if (trace.isEmpty()) {
         source.m_288197_(() -> Component.m_237113_("[Edgerunner] ").m_130940_(ChatFormatting.AQUA).m_7220_(Component.m_237115_("text.project_edgerunner.edgerunnercommands.fsm_trace").m_130940_(ChatFormatting.WHITE)).m_7220_(Component.m_237110_("text.project_edgerunner.edgerunnercommands.s_empty", new Object[]{target.m_6302_()}).m_130940_(ChatFormatting.GRAY)), false);
         return 1;
      } else {
         source.m_288197_(() -> Component.m_237113_("[Edgerunner] ").m_130940_(ChatFormatting.AQUA).m_7220_(Component.m_237115_("text.project_edgerunner.edgerunnercommands.fsm_trace").m_130940_(ChatFormatting.WHITE)).m_7220_(Component.m_237113_(target.m_6302_()).m_130940_(ChatFormatting.GOLD)), false);

         for(String entry : trace) {
            source.m_288197_(() -> Component.m_237113_(" - " + entry).m_130940_(ChatFormatting.GRAY), false);
         }

         return trace.size();
      }
   }

   private static int showRampageDebugDump(CommandSourceStack source, ServerPlayer target) {
      List<String> dump = CyberpsychosisRuntime.dumpRampageDebug(target);
      source.m_288197_(() -> Component.m_237113_("[Edgerunner] ").m_130940_(ChatFormatting.AQUA).m_7220_(Component.m_237115_("text.project_edgerunner.edgerunnercommands.rampage_debug").m_130940_(ChatFormatting.GOLD)).m_7220_(Component.m_237113_(target.m_6302_()).m_130940_(ChatFormatting.YELLOW)), false);

      for(String entry : dump) {
         ChatFormatting color = entry.startsWith("FAIL") && !entry.equals("FAIL none") ? ChatFormatting.RED : ChatFormatting.GRAY;
         source.m_288197_(() -> Component.m_237113_(" " + entry).m_130940_(color), false);
      }

      return dump.size();
   }

   private static String onOff(boolean value) {
      return value ? "ON" : "OFF";
   }

   private static String shortTimer(int ticks) {
      return ticks >= Integer.MAX_VALUE ? "INF" : Integer.toString(Math.max(0, ticks));
   }

   private static int showSandevistanDebugStats(CommandSourceStack source, ServerPlayer target) {
      SandevistanController.TemporalDebugStats stats = SandevistanController.getDebugStats(target);
      source.m_288197_(() -> Component.m_237113_("[Edgerunner] ").m_130940_(ChatFormatting.AQUA).m_7220_(Component.m_237115_("text.project_edgerunner.edgerunnercommands.temporal_stats").m_130940_(ChatFormatting.WHITE)).m_7220_(Component.m_237113_(target.m_6302_() + " -> ").m_130940_(ChatFormatting.GRAY)).m_7220_(Component.m_237110_("text.project_edgerunner.edgerunnercommands.deny_s", new Object[]{formatPct(stats.denyRatePct())}).m_130940_(ChatFormatting.YELLOW)).m_7220_(Component.m_237110_("text.project_edgerunner.edgerunnercommands.invresync_s_s", new Object[]{stats.inventoryResyncApplied(), stats.inventoryResyncRequested()}).m_130940_(ChatFormatting.GOLD)).m_7220_(Component.m_237110_("text.project_edgerunner.edgerunnercommands.sync_local_bubble_nearby_s_s_s", new Object[]{stats.localStateSyncPackets(), stats.bubbleSyncPackets(), stats.nearbyPlayerSyncPackets()}).m_130940_(ChatFormatting.LIGHT_PURPLE)).m_7220_(Component.m_237110_("text.project_edgerunner.edgerunnercommands.nearbyplayerssent_s", new Object[]{stats.nearbyPlayerEntries()}).m_130940_(ChatFormatting.GREEN)), false);

      for(TemporalPlayerActionBudget.ActionFamily family : TemporalPlayerActionBudget.ActionFamily.values()) {
         long attempts = stats.attempts(family);
         long denied = stats.denied(family);
         if (attempts > 0L || denied > 0L) {
            double denyRate = attempts <= 0L ? (double)0.0F : (double)denied * (double)100.0F / (double)attempts;
            String line = " - " + family.name() + ": " + denied + "/" + attempts + " denied (" + formatPct(denyRate) + ")";
            source.m_288197_(() -> Component.m_237113_(line).m_130940_(ChatFormatting.GRAY), false);
         }
      }

      return 1;
   }

   private static int resetSandevistanDebugStats(CommandSourceStack source, ServerPlayer target) {
      SandevistanController.resetDebugStats(target);
      source.m_288197_(() -> Component.m_237113_("[Edgerunner] ").m_130940_(ChatFormatting.AQUA).m_7220_(Component.m_237115_("text.project_edgerunner.edgerunnercommands.temporal_stats_reset_for").m_130940_(ChatFormatting.WHITE)).m_7220_(Component.m_237113_(target.m_6302_()).m_130940_(ChatFormatting.GOLD)), true);
      return 1;
   }

   private static String formatPct(double value) {
      return String.format(Locale.ROOT, "%.1f%%", Math.max((double)0.0F, value));
   }

   private static long parseSymptomDurationTicks(String token) {
      if (token != null && !token.isBlank()) {
         String normalized = token.trim().toLowerCase(Locale.ROOT);
         if ("forever".equals(normalized)) {
            return Long.MAX_VALUE;
         } else {
            long multiplier = 20L;
            String numberPart = normalized;
            char suffix = normalized.charAt(normalized.length() - 1);
            if (Character.isLetter(suffix)) {
               numberPart = normalized.substring(0, normalized.length() - 1);
               long var10000;
               switch (suffix) {
                  case 'm' -> var10000 = 1200L;
                  case 's' -> var10000 = 20L;
                  case 't' -> var10000 = 1L;
                  default -> throw new IllegalArgumentException("Invalid duration suffix. Use t, s, m or forever.");
               }

               multiplier = var10000;
            }

            if (numberPart.isBlank()) {
               throw new IllegalArgumentException("Duration is missing its numeric value.");
            } else {
               long value;
               try {
                  value = Long.parseLong(numberPart);
               } catch (NumberFormatException var10) {
                  throw new IllegalArgumentException("Invalid duration value: " + token);
               }

               if (value <= 0L) {
                  throw new IllegalArgumentException("Duration must be greater than zero.");
               } else {
                  try {
                     return Math.multiplyExact(value, multiplier);
                  } catch (ArithmeticException var9) {
                     throw new IllegalArgumentException("Duration is too large: " + token);
                  }
               }
            }
         }
      } else {
         throw new IllegalArgumentException("Duration is required.");
      }
   }

   private static String formatDurationTicks(long durationTicks) {
      if (durationTicks == Long.MAX_VALUE) {
         return "forever";
      } else if (durationTicks % 1200L == 0L) {
         return durationTicks / 1200L + "m";
      } else {
         return durationTicks % 20L == 0L ? durationTicks / 20L + "s" : durationTicks + "t";
      }
   }

   private static ServerPlayer requireCommandPlayer(CommandSourceStack source) {
      Entity var2 = source.m_81373_();
      if (var2 instanceof ServerPlayer player) {
         return player;
      } else {
         source.m_81352_(Component.m_237115_("text.project_edgerunner.edgerunnercommands.edgerunner_this_form_requires_a_player_target").m_130940_(ChatFormatting.RED));
         return null;
      }
   }

   private static int addCyberpsychosisSymptom(CommandSourceStack source, ServerPlayer target, String symptomId, String durationToken, int intensity) {
      CyberpsychosisRuntime.ManualSymptom symptom = CyberpsychosisRuntime.getManualSymptom(symptomId);
      if (symptom == null) {
         source.m_81352_(Component.m_237110_("text.project_edgerunner.edgerunnercommands.edgerunner_unknown_symptom_id_s", new Object[]{symptomId}).m_130940_(ChatFormatting.RED).m_7220_(Component.m_237110_("text.project_edgerunner.edgerunnercommands.valid_ids_s", new Object[]{String.join(", ", CyberpsychosisRuntime.getSupportedManualSymptomIds())}).m_130940_(ChatFormatting.GRAY)));
         return 0;
      } else {
         long durationTicks;
         try {
            durationTicks = parseSymptomDurationTicks(durationToken);
         } catch (IllegalArgumentException exception) {
            source.m_81352_(Component.m_237110_("text.project_edgerunner.edgerunnercommands.edgerunner_s", new Object[]{exception.getMessage()}).m_130940_(ChatFormatting.RED));
            return 0;
         }

         CyberpsychosisRuntime.addManualSymptom(target, symptom, durationTicks, intensity);
         source.m_288197_(() -> Component.m_237115_("text.project_edgerunner.edgerunnercommands.edgerunner_added_symptom").m_130940_(ChatFormatting.AQUA).m_7220_(Component.m_237113_(symptom.id()).m_130940_(ChatFormatting.YELLOW)).m_7220_(Component.m_237113_(" to ").m_130940_(ChatFormatting.WHITE)).m_7220_(Component.m_237113_(target.m_6302_()).m_130940_(ChatFormatting.GOLD)).m_7220_(Component.m_237115_("text.project_edgerunner.edgerunnercommands.for").m_130940_(ChatFormatting.WHITE)).m_7220_(Component.m_237113_(formatDurationTicks(durationTicks)).m_130940_(ChatFormatting.LIGHT_PURPLE)).m_7220_(Component.m_237115_("text.project_edgerunner.edgerunnercommands.at_intensity").m_130940_(ChatFormatting.WHITE)).m_7220_(Component.m_237113_(Integer.toString(intensity)).m_130940_(ChatFormatting.RED)), true);
         return 1;
      }
   }

   private static int showCyberpsychosisSymptoms(CommandSourceStack source, ServerPlayer target) {
      List<CyberpsychosisRuntime.ManualSymptomView> symptoms = CyberpsychosisRuntime.getActiveManualSymptoms(target);
      if (symptoms.isEmpty()) {
         source.m_288197_(() -> Component.m_237113_("[Edgerunner] ").m_130940_(ChatFormatting.AQUA).m_7220_(Component.m_237115_("text.project_edgerunner.edgerunnercommands.manual_symptoms").m_130940_(ChatFormatting.WHITE)).m_7220_(Component.m_237110_("text.project_edgerunner.edgerunnercommands.s_none", new Object[]{target.m_6302_()}).m_130940_(ChatFormatting.GRAY)), false);
         return 1;
      } else {
         StringBuilder builder = new StringBuilder();

         for(int index = 0; index < symptoms.size(); ++index) {
            CyberpsychosisRuntime.ManualSymptomView symptom = (CyberpsychosisRuntime.ManualSymptomView)symptoms.get(index);
            if (index > 0) {
               builder.append(", ");
            }

            builder.append(symptom.id()).append("@").append(symptom.intensity()).append("(").append(symptom.forever() ? "forever" : formatDurationTicks(symptom.remainingTicks())).append(")");
         }

         source.m_288197_(() -> Component.m_237113_("[Edgerunner] ").m_130940_(ChatFormatting.AQUA).m_7220_(Component.m_237115_("text.project_edgerunner.edgerunnercommands.manual_symptoms").m_130940_(ChatFormatting.WHITE)).m_7220_(Component.m_237113_(target.m_6302_() + " -> ").m_130940_(ChatFormatting.GOLD)).m_7220_(Component.m_237113_(builder.toString()).m_130940_(ChatFormatting.YELLOW)), false);
         return symptoms.size();
      }
   }

   private static int clearCyberpsychosisSymptom(CommandSourceStack source, ServerPlayer target, String symptomId) {
      if ("all".equalsIgnoreCase(symptomId)) {
         int cleared = CyberpsychosisRuntime.clearAllManualSymptoms(target);
         source.m_288197_(() -> {
            MutableComponent var10000 = Component.m_237115_("text.project_edgerunner.edgerunnercommands.edgerunner_cleared_manual_symptoms_for").m_130940_(ChatFormatting.AQUA);
            String var10001 = target.m_6302_();
            return var10000.m_7220_(Component.m_237113_(var10001 + " -> " + cleared).m_130940_(ChatFormatting.YELLOW));
         }, true);
         return Math.max(1, cleared);
      } else {
         CyberpsychosisRuntime.ManualSymptom symptom = CyberpsychosisRuntime.getManualSymptom(symptomId);
         if (symptom == null) {
            source.m_81352_(Component.m_237110_("text.project_edgerunner.edgerunnercommands.edgerunner_unknown_symptom_id_s", new Object[]{symptomId}).m_130940_(ChatFormatting.RED));
            return 0;
         } else {
            boolean cleared = CyberpsychosisRuntime.clearManualSymptom(target, symptom);
            if (!cleared) {
               MutableComponent var10001 = Component.m_237115_("text.project_edgerunner.edgerunnercommands.edgerunner_symptom_not_active_for").m_130940_(ChatFormatting.RED);
               String var10002 = target.m_6302_();
               source.m_81352_(var10001.m_7220_(Component.m_237113_(var10002 + ": " + symptom.id()).m_130940_(ChatFormatting.YELLOW)));
               return 0;
            } else {
               source.m_288197_(() -> Component.m_237115_("text.project_edgerunner.edgerunnercommands.edgerunner_cleared_symptom").m_130940_(ChatFormatting.AQUA).m_7220_(Component.m_237113_(symptom.id()).m_130940_(ChatFormatting.YELLOW)).m_7220_(Component.m_237115_("text.project_edgerunner.edgerunnercommands.for").m_130940_(ChatFormatting.WHITE)).m_7220_(Component.m_237113_(target.m_6302_()).m_130940_(ChatFormatting.GOLD)), true);
               return 1;
            }
         }
      }
   }

   public static void onRegisterCommands(RegisterCommandsEvent event) {
      ArmsCommand.register(event.getDispatcher(), "projectedgerunner");
      ClientGuiCommand.register(event.getDispatcher(), "projectedgerunner");
      BedrockAnimCommand.register(event.getDispatcher(), "projectedgerunner");
      FirstPersonAnimationDebugCommand.register(event.getDispatcher(), "projectedgerunner");
      CyberwareCapacityCommand.register(event.getDispatcher(), "projectedgerunner");
      CyberwareBanCommand.register(event.getDispatcher(), "projectedgerunner");
      CyberwareCooldownCommand.register(event.getDispatcher(), "projectedgerunner");
      TacZGunnerCommands.register(event.getDispatcher(), "projectedgerunner");
      event.getDispatcher().register((LiteralArgumentBuilder)Commands.m_82127_("projectedgerunner").then(((LiteralArgumentBuilder)((LiteralArgumentBuilder)((LiteralArgumentBuilder)((LiteralArgumentBuilder)Commands.m_82127_("sandevistan").requires(EdgerunnerCommands::canUseSandevistan)).executes((ctx) -> {
         Entity patt36740$temp = ((CommandSourceStack)ctx.getSource()).m_81373_();
         if (patt36740$temp instanceof ServerPlayer player) {
            SandevistanController.requestToggle(player);
            return 1;
         } else {
            return 0;
         }
      })).then(Commands.m_82127_("toggle").executes((ctx) -> {
         Entity patt37100$temp = ((CommandSourceStack)ctx.getSource()).m_81373_();
         if (patt37100$temp instanceof ServerPlayer player) {
            SandevistanController.requestToggle(player);
            return 1;
         } else {
            return 0;
         }
      }))).then(Commands.m_82127_("off").executes((ctx) -> {
         Entity patt37564$temp = ((CommandSourceStack)ctx.getSource()).m_81373_();
         if (patt37564$temp instanceof ServerPlayer player) {
            if (!EdgerunnerMod.isSandevistanJoinGuardActive(player) && !isJoinGuardActive(player)) {
               SandevistanController.deactivate(player);
               return 1;
            } else {
               return 0;
            }
         } else {
            return 0;
         }
      }))).then(((LiteralArgumentBuilder)((LiteralArgumentBuilder)((LiteralArgumentBuilder)((LiteralArgumentBuilder)((LiteralArgumentBuilder)Commands.m_82127_("debug").requires((src) -> src.m_6761_(2))).then(Commands.m_82127_("create").then(Commands.m_82129_("slowPct", DoubleArgumentType.doubleArg((double)0.0F, (double)1.0F)).executes((ctx) -> {
         Entity patt38383$temp = ((CommandSourceStack)ctx.getSource()).m_81373_();
         if (patt38383$temp instanceof ServerPlayer player) {
            double slowPct = DoubleArgumentType.getDouble(ctx, "slowPct");
            UUID id = SandevistanController.createDebugBubble(player, slowPct, (UUID)null, "debug");
            ((CommandSourceStack)ctx.getSource()).m_288197_(() -> Component.m_237115_("text.project_edgerunner.edgerunnercommands.edgerunner_debug_bubble").m_130940_(ChatFormatting.AQUA).m_7220_(Component.m_237113_(id.toString()).m_130940_(ChatFormatting.YELLOW)).m_7220_(Component.m_237110_("text.project_edgerunner.edgerunnercommands.slow_s", new Object[]{slowPct}).m_130940_(ChatFormatting.GRAY)), false);
            return 1;
         } else {
            return 0;
         }
      })))).then(Commands.m_82127_("clear").executes((ctx) -> {
         Entity patt39646$temp = ((CommandSourceStack)ctx.getSource()).m_81373_();
         if (patt39646$temp instanceof ServerPlayer player) {
            int removed = SandevistanController.clearDebugBubbles(player.m_284548_());
            ((CommandSourceStack)ctx.getSource()).m_288197_(() -> Component.m_237110_("text.project_edgerunner.edgerunnercommands.edgerunner_cleared_debug_bubbles_s", new Object[]{removed}).m_130940_(ChatFormatting.AQUA), false);
            return removed;
         } else {
            return 0;
         }
      }))).then(Commands.m_82127_("inspect").executes((ctx) -> {
         Entity patt40440$temp = ((CommandSourceStack)ctx.getSource()).m_81373_();
         if (patt40440$temp instanceof ServerPlayer player) {
            TemporalFieldManager field = TemporalFieldRegistry.get(player.m_284548_());
            double worldSlow = field.queryWorldSlowPctAt(player.m_20183_());
            double effectiveSlow = field.queryEffectiveSlowForPlayer(player);
            ((CommandSourceStack)ctx.getSource()).m_288197_(() -> Component.m_237113_("[Edgerunner] ").m_130940_(ChatFormatting.AQUA).m_7220_(Component.m_237115_("text.project_edgerunner.edgerunnercommands.worldslow").m_130940_(ChatFormatting.WHITE)).m_7220_(Component.m_237113_(String.format(Locale.ROOT, "%.3f", worldSlow)).m_130940_(ChatFormatting.YELLOW)).m_7220_(Component.m_237115_("text.project_edgerunner.edgerunnercommands.effectiveslow").m_130940_(ChatFormatting.WHITE)).m_7220_(Component.m_237113_(String.format(Locale.ROOT, "%.3f", effectiveSlow)).m_130940_(ChatFormatting.YELLOW)).m_7220_(Component.m_237115_("text.project_edgerunner.edgerunnercommands.worldscale").m_130940_(ChatFormatting.WHITE)).m_7220_(Component.m_237113_(String.format(Locale.ROOT, "%.3f", TemporalMath.speedScaleFromSlow(worldSlow))).m_130940_(ChatFormatting.GREEN)).m_7220_(Component.m_237115_("text.project_edgerunner.edgerunnercommands.effectivescale").m_130940_(ChatFormatting.WHITE)).m_7220_(Component.m_237113_(String.format(Locale.ROOT, "%.3f", TemporalMath.speedScaleFromSlow(effectiveSlow))).m_130940_(ChatFormatting.GREEN)).m_7220_(Component.m_237115_("text.project_edgerunner.edgerunnercommands.bubbles").m_130940_(ChatFormatting.WHITE)).m_7220_(Component.m_237113_(Integer.toString(field.queryRelevantBubbles(player.m_20183_()).size())).m_130940_(ChatFormatting.GOLD)), false);
            return 1;
         } else {
            return 0;
         }
      }))).then(((LiteralArgumentBuilder)Commands.m_82127_("stats").executes((ctx) -> {
         Entity patt43076$temp = ((CommandSourceStack)ctx.getSource()).m_81373_();
         if (patt43076$temp instanceof ServerPlayer player) {
            return showSandevistanDebugStats((CommandSourceStack)ctx.getSource(), player);
         } else {
            return 0;
         }
      })).then(Commands.m_82129_("target", EntityArgument.m_91466_()).executes((ctx) -> showSandevistanDebugStats((CommandSourceStack)ctx.getSource(), EntityArgument.m_91474_(ctx, "target")))))).then(((LiteralArgumentBuilder)Commands.m_82127_("stats_reset").executes((ctx) -> {
         Entity patt43781$temp = ((CommandSourceStack)ctx.getSource()).m_81373_();
         if (patt43781$temp instanceof ServerPlayer player) {
            return resetSandevistanDebugStats((CommandSourceStack)ctx.getSource(), player);
         } else {
            return 0;
         }
      })).then(Commands.m_82129_("target", EntityArgument.m_91466_()).executes((ctx) -> resetSandevistanDebugStats((CommandSourceStack)ctx.getSource(), EntityArgument.m_91474_(ctx, "target"))))))));
      event.getDispatcher().register((LiteralArgumentBuilder)Commands.m_82127_("projectedgerunner").then(((LiteralArgumentBuilder)Commands.m_82127_("ripperdoc").then(((RequiredArgumentBuilder)Commands.m_82129_("target", EntityArgument.m_91466_()).requires((source) -> source.m_6761_(2))).executes((context) -> openRipperdocUi(EntityArgument.m_91474_(context, "target"))))).executes((context) -> {
         Entity patt44898$temp = ((CommandSourceStack)context.getSource()).m_81373_();
         if (patt44898$temp instanceof ServerPlayer player) {
            return openRipperdocUi(player);
         } else {
            return 0;
         }
      })));
      event.getDispatcher().register((LiteralArgumentBuilder)Commands.m_82127_("projectedgerunner").then(((LiteralArgumentBuilder)((LiteralArgumentBuilder)Commands.m_82127_("gorilla_reset").requires((source) -> source.m_6761_(2))).executes((context) -> {
         Entity patt45449$temp = ((CommandSourceStack)context.getSource()).m_81373_();
         if (patt45449$temp instanceof ServerPlayer player) {
            GorillaArmsRuntime.forceReset(player);
            ((CommandSourceStack)context.getSource()).m_288197_(() -> Component.m_237115_("command.edgerunner.gorilla_reset.success.self"), false);
            return 1;
         } else {
            return 0;
         }
      })).then(Commands.m_82129_("target", EntityArgument.m_91466_()).executes((context) -> {
         ServerPlayer target = EntityArgument.m_91474_(context, "target");
         GorillaArmsRuntime.forceReset(target);
         ((CommandSourceStack)context.getSource()).m_288197_(() -> Component.m_237110_("command.edgerunner.gorilla_reset.success.target", new Object[]{target.m_7755_()}), true);
         return 1;
      }))));
      event.getDispatcher().register((LiteralArgumentBuilder)Commands.m_82127_("projectedgerunner").then(((LiteralArgumentBuilder)((LiteralArgumentBuilder)Commands.m_82127_("upgrades_reset").requires((source) -> source.m_6761_(2))).executes((context) -> {
         Entity patt47162$temp = ((CommandSourceStack)context.getSource()).m_81373_();
         if (patt47162$temp instanceof ServerPlayer player) {
            resetKnownPowerUpgrades(player);
            ((CommandSourceStack)context.getSource()).m_288197_(() -> Component.m_237115_("command.edgerunner.upgrades_reset.success.self"), false);
            return 1;
         } else {
            return 0;
         }
      })).then(Commands.m_82129_("target", EntityArgument.m_91466_()).executes((context) -> {
         ServerPlayer target = EntityArgument.m_91474_(context, "target");
         resetKnownPowerUpgrades(target);
         ((CommandSourceStack)context.getSource()).m_288197_(() -> Component.m_237110_("command.edgerunner.upgrades_reset.success.target", new Object[]{target.m_7755_()}), true);
         return 1;
      }))));
      event.getDispatcher().register((LiteralArgumentBuilder)Commands.m_82127_("projectedgerunner").then(((LiteralArgumentBuilder)((LiteralArgumentBuilder)Commands.m_82127_("wipe").requires((source) -> source.m_6761_(2))).executes((context) -> {
         Entity patt48855$temp = ((CommandSourceStack)context.getSource()).m_81373_();
         if (patt48855$temp instanceof ServerPlayer player) {
            return wipePlayerData((CommandSourceStack)context.getSource(), player);
         } else {
            return 0;
         }
      })).then(Commands.m_82129_("target", EntityArgument.m_91466_()).executes((context) -> wipePlayerData((CommandSourceStack)context.getSource(), EntityArgument.m_91474_(context, "target"))))));
      event.getDispatcher().register((LiteralArgumentBuilder)Commands.m_82127_("projectedgerunner").then(((LiteralArgumentBuilder)((LiteralArgumentBuilder)Commands.m_82127_("repair").requires((source) -> source.m_6761_(2))).executes((context) -> {
         Entity patt49758$temp = ((CommandSourceStack)context.getSource()).m_81373_();
         if (patt49758$temp instanceof ServerPlayer player) {
            return repairPlayerData((CommandSourceStack)context.getSource(), player);
         } else {
            return 0;
         }
      })).then(Commands.m_82129_("target", EntityArgument.m_91466_()).executes((context) -> repairPlayerData((CommandSourceStack)context.getSource(), EntityArgument.m_91474_(context, "target"))))));
      event.getDispatcher().register((LiteralArgumentBuilder)Commands.m_82127_("projectedgerunner").then(((LiteralArgumentBuilder)((LiteralArgumentBuilder)((LiteralArgumentBuilder)((LiteralArgumentBuilder)Commands.m_82127_("cyberpsychosis").requires((source) -> source.m_6761_(2))).executes((context) -> {
         Entity patt50709$temp = ((CommandSourceStack)context.getSource()).m_81373_();
         if (patt50709$temp instanceof ServerPlayer player) {
            return showCyberpsychosisStatus((CommandSourceStack)context.getSource(), player);
         } else {
            return 0;
         }
      })).then(((LiteralArgumentBuilder)Commands.m_82127_("get").executes((context) -> {
         Entity patt51139$temp = ((CommandSourceStack)context.getSource()).m_81373_();
         if (patt51139$temp instanceof ServerPlayer player) {
            return showCyberpsychosisStatus((CommandSourceStack)context.getSource(), player);
         } else {
            return 0;
         }
      })).then(Commands.m_82129_("target", EntityArgument.m_91466_()).executes((context) -> showCyberpsychosisStatus((CommandSourceStack)context.getSource(), EntityArgument.m_91474_(context, "target")))))).then(((LiteralArgumentBuilder)((LiteralArgumentBuilder)Commands.m_82127_("symptom").then(Commands.m_82127_("add").then(Commands.m_82129_("id", StringArgumentType.word()).suggests(SYMPTOM_ID_SUGGESTIONS).then(Commands.m_82129_("duration", StringArgumentType.word()).then(((RequiredArgumentBuilder)Commands.m_82129_("intensity", IntegerArgumentType.integer(1, 5)).executes((context) -> {
         ServerPlayer player = requireCommandPlayer((CommandSourceStack)context.getSource());
         return player == null ? 0 : addCyberpsychosisSymptom((CommandSourceStack)context.getSource(), player, StringArgumentType.getString(context, "id"), StringArgumentType.getString(context, "duration"), IntegerArgumentType.getInteger(context, "intensity"));
      })).then(Commands.m_82129_("target", EntityArgument.m_91466_()).executes((context) -> addCyberpsychosisSymptom((CommandSourceStack)context.getSource(), EntityArgument.m_91474_(context, "target"), StringArgumentType.getString(context, "id"), StringArgumentType.getString(context, "duration"), IntegerArgumentType.getInteger(context, "intensity"))))))))).then(((LiteralArgumentBuilder)Commands.m_82127_("get").executes((context) -> {
         ServerPlayer player = requireCommandPlayer((CommandSourceStack)context.getSource());
         return player == null ? 0 : showCyberpsychosisSymptoms((CommandSourceStack)context.getSource(), player);
      })).then(Commands.m_82129_("target", EntityArgument.m_91466_()).executes((context) -> showCyberpsychosisSymptoms((CommandSourceStack)context.getSource(), EntityArgument.m_91474_(context, "target")))))).then(Commands.m_82127_("clear").then(((RequiredArgumentBuilder)Commands.m_82129_("id", StringArgumentType.word()).suggests(SYMPTOM_CLEAR_SUGGESTIONS).executes((context) -> {
         ServerPlayer player = requireCommandPlayer((CommandSourceStack)context.getSource());
         return player == null ? 0 : clearCyberpsychosisSymptom((CommandSourceStack)context.getSource(), player, StringArgumentType.getString(context, "id"));
      })).then(Commands.m_82129_("target", EntityArgument.m_91466_()).executes((context) -> clearCyberpsychosisSymptom((CommandSourceStack)context.getSource(), EntityArgument.m_91474_(context, "target"), StringArgumentType.getString(context, "id")))))))).then(((LiteralArgumentBuilder)((LiteralArgumentBuilder)((LiteralArgumentBuilder)Commands.m_82127_("set").then(Commands.m_82127_("phase").then(((RequiredArgumentBuilder)Commands.m_82129_("value", IntegerArgumentType.integer(0, 5)).executes((context) -> {
         Entity patt56866$temp = ((CommandSourceStack)context.getSource()).m_81373_();
         if (patt56866$temp instanceof ServerPlayer player) {
            return setCyberpsychosisPhase((CommandSourceStack)context.getSource(), player, IntegerArgumentType.getInteger(context, "value"));
         } else {
            return 0;
         }
      })).then(Commands.m_82129_("target", EntityArgument.m_91466_()).executes((context) -> setCyberpsychosisPhase((CommandSourceStack)context.getSource(), EntityArgument.m_91474_(context, "target"), IntegerArgumentType.getInteger(context, "value"))))))).then(Commands.m_82127_("pressure").then(((RequiredArgumentBuilder)Commands.m_82129_("value", IntegerArgumentType.integer(0, 1000)).executes((context) -> {
         Entity patt58222$temp = ((CommandSourceStack)context.getSource()).m_81373_();
         if (patt58222$temp instanceof ServerPlayer player) {
            return setCyberpsychosisPressure((CommandSourceStack)context.getSource(), player, IntegerArgumentType.getInteger(context, "value"));
         } else {
            return 0;
         }
      })).then(Commands.m_82129_("target", EntityArgument.m_91466_()).executes((context) -> setCyberpsychosisPressure((CommandSourceStack)context.getSource(), EntityArgument.m_91474_(context, "target"), IntegerArgumentType.getInteger(context, "value"))))))).then(Commands.m_82127_("degradation").then(((RequiredArgumentBuilder)Commands.m_82129_("value", IntegerArgumentType.integer(0, 1000)).executes((context) -> {
         Entity patt59587$temp = ((CommandSourceStack)context.getSource()).m_81373_();
         if (patt59587$temp instanceof ServerPlayer player) {
            return setCyberpsychosisDegradation((CommandSourceStack)context.getSource(), player, IntegerArgumentType.getInteger(context, "value"));
         } else {
            return 0;
         }
      })).then(Commands.m_82129_("target", EntityArgument.m_91466_()).executes((context) -> setCyberpsychosisDegradation((CommandSourceStack)context.getSource(), EntityArgument.m_91474_(context, "target"), IntegerArgumentType.getInteger(context, "value"))))))).then(((LiteralArgumentBuilder)((LiteralArgumentBuilder)((LiteralArgumentBuilder)((LiteralArgumentBuilder)Commands.m_82127_("debug").then(((LiteralArgumentBuilder)Commands.m_82127_("snapshot").executes((context) -> {
         ServerPlayer player = requireCommandPlayer((CommandSourceStack)context.getSource());
         return player == null ? 0 : showCyberpsychosisFsmSnapshot((CommandSourceStack)context.getSource(), player);
      })).then(Commands.m_82129_("target", EntityArgument.m_91466_()).executes((context) -> showCyberpsychosisFsmSnapshot((CommandSourceStack)context.getSource(), EntityArgument.m_91474_(context, "target")))))).then(((LiteralArgumentBuilder)Commands.m_82127_("trace").executes((context) -> {
         ServerPlayer player = requireCommandPlayer((CommandSourceStack)context.getSource());
         return player == null ? 0 : showCyberpsychosisTrace((CommandSourceStack)context.getSource(), player);
      })).then(Commands.m_82129_("target", EntityArgument.m_91466_()).executes((context) -> showCyberpsychosisTrace((CommandSourceStack)context.getSource(), EntityArgument.m_91474_(context, "target")))))).then(((LiteralArgumentBuilder)Commands.m_82127_("rampage").executes((context) -> {
         ServerPlayer player = requireCommandPlayer((CommandSourceStack)context.getSource());
         return player == null ? 0 : showRampageDebugDump((CommandSourceStack)context.getSource(), player);
      })).then(Commands.m_82129_("target", EntityArgument.m_91466_()).executes((context) -> showRampageDebugDump((CommandSourceStack)context.getSource(), EntityArgument.m_91474_(context, "target")))))).then(((LiteralArgumentBuilder)Commands.m_82127_("freeze").then(((LiteralArgumentBuilder)Commands.m_82127_("on").executes((context) -> {
         Entity patt63913$temp = ((CommandSourceStack)context.getSource()).m_81373_();
         if (patt63913$temp instanceof ServerPlayer player) {
            return setCyberpsychosisFreeze((CommandSourceStack)context.getSource(), player, true);
         } else {
            return 0;
         }
      })).then(Commands.m_82129_("target", EntityArgument.m_91466_()).executes((context) -> setCyberpsychosisFreeze((CommandSourceStack)context.getSource(), EntityArgument.m_91474_(context, "target"), true))))).then(((LiteralArgumentBuilder)Commands.m_82127_("off").executes((context) -> {
         Entity patt64935$temp = ((CommandSourceStack)context.getSource()).m_81373_();
         if (patt64935$temp instanceof ServerPlayer player) {
            return setCyberpsychosisFreeze((CommandSourceStack)context.getSource(), player, false);
         } else {
            return 0;
         }
      })).then(Commands.m_82129_("target", EntityArgument.m_91466_()).executes((context) -> setCyberpsychosisFreeze((CommandSourceStack)context.getSource(), EntityArgument.m_91474_(context, "target"), false)))))).then(((LiteralArgumentBuilder)Commands.m_82127_("forcelock").then(((LiteralArgumentBuilder)Commands.m_82127_("on").executes((context) -> {
         Entity patt66032$temp = ((CommandSourceStack)context.getSource()).m_81373_();
         if (patt66032$temp instanceof ServerPlayer player) {
            return setCyberpsychosisForceLock((CommandSourceStack)context.getSource(), player, true);
         } else {
            return 0;
         }
      })).then(Commands.m_82129_("target", EntityArgument.m_91466_()).executes((context) -> setCyberpsychosisForceLock((CommandSourceStack)context.getSource(), EntityArgument.m_91474_(context, "target"), true))))).then(((LiteralArgumentBuilder)Commands.m_82127_("off").executes((context) -> {
         Entity patt67060$temp = ((CommandSourceStack)context.getSource()).m_81373_();
         if (patt67060$temp instanceof ServerPlayer player) {
            return setCyberpsychosisForceLock((CommandSourceStack)context.getSource(), player, false);
         } else {
            return 0;
         }
      })).then(Commands.m_82129_("target", EntityArgument.m_91466_()).executes((context) -> setCyberpsychosisForceLock((CommandSourceStack)context.getSource(), EntityArgument.m_91474_(context, "target"), false)))))))));
      event.getDispatcher().register((LiteralArgumentBuilder)Commands.m_82127_("projectedgerunner").then(((LiteralArgumentBuilder)Commands.m_82127_("cyberware").requires((source) -> source.m_6761_(2))).then(((LiteralArgumentBuilder)((LiteralArgumentBuilder)Commands.m_82127_("deathmode").executes((ctx) -> {
         boolean mode = EdgerunnerMod.cyberwareDropOnDeath;
         ((CommandSourceStack)ctx.getSource()).m_288197_(() -> Component.m_237115_("text.project_edgerunner.edgerunnercommands.edgerunner_cyberware_death_mode").m_130940_(ChatFormatting.AQUA).m_7220_(Component.m_237113_(mode ? "DROP" : "KEEP").m_130940_(mode ? ChatFormatting.YELLOW : ChatFormatting.GREEN)), false);
         return 1;
      })).then(Commands.m_82127_("keep").executes((ctx) -> {
         EdgerunnerMod.cyberwareDropOnDeath = false;
         ((CommandSourceStack)ctx.getSource()).m_288197_(() -> Component.m_237115_("text.project_edgerunner.edgerunnercommands.edgerunner_cyberware_death_mode_keep").m_130940_(ChatFormatting.GREEN).m_7220_(Component.m_237115_("text.project_edgerunner.edgerunnercommands.cyberware_survives_death").m_130940_(ChatFormatting.GRAY)), true);
         return 1;
      }))).then(Commands.m_82127_("drop").executes((ctx) -> {
         EdgerunnerMod.cyberwareDropOnDeath = true;
         ((CommandSourceStack)ctx.getSource()).m_288197_(() -> Component.m_237115_("text.project_edgerunner.edgerunnercommands.edgerunner_cyberware_death_mode_drop").m_130940_(ChatFormatting.YELLOW).m_7220_(Component.m_237115_("text.project_edgerunner.edgerunnercommands.cyberware_drops_as_items_on_death").m_130940_(ChatFormatting.GRAY)), true);
         return 1;
      })))));
   }
}
