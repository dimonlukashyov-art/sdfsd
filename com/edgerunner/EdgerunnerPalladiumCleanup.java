package com.edgerunner;

import com.edgerunner.cyberware.CyberwareDefinitions;
import com.edgerunner.util.CyberwareDataUtil;
import java.util.LinkedHashSet;
import java.util.Set;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.threetag.palladium.power.PowerManager;

public final class EdgerunnerPalladiumCleanup {
   private static final String LEGACY_NAMESPACE = "cyberpunk";
   private static final String CURRENT_NAMESPACE = "project_edgerunner";
   private static final String TRACKED_SLOT_POWERS_KEY = "cyberware_granted_slot_powers";
   private static final Set<String> KNOWN_POWER_IDS = Set.of("project_edgerunner:cyberware", "project_edgerunner:sandevistan_warp_dancer", "project_edgerunner:sandevistan_zetatech", "project_edgerunner:sandevistan_dynalar", "project_edgerunner:sandevistan_falcon", "project_edgerunner:sandevistan_apogee", "project_edgerunner:berserk_moore_tech", "project_edgerunner:berserk_biodyne", "project_edgerunner:berserk_zetatech", "project_edgerunner:berserk_militech", "project_edgerunner:gorilla_arms", "project_edgerunner:mantis_blades", "project_edgerunner:blood_pump", "project_edgerunner:fortified_ankles", "project_edgerunner:reinforced_tendons", "project_edgerunner:basic_kiroshi_optics", "project_edgerunner:clairvoyant", "project_edgerunner:doomsayer", "project_edgerunner:stalker", "project_edgerunner:the_oracle", "project_edgerunner:axolotl", "project_edgerunner:inmunosupresor_injector", "project_edgerunner:titanium_bones", "project_edgerunner:bionic_joints", "project_edgerunner:dense_marrow", "project_edgerunner:epimorphic_skeleton", "project_edgerunner:kinetic_frame", "project_edgerunner:para_bellum", "project_edgerunner:rara_avis", "project_edgerunner:scar_coalescer", "project_edgerunner:scarab", "project_edgerunner:spring_joints", "project_edgerunner:universal_booster", "project_edgerunner:hollow_bones");

   private EdgerunnerPalladiumCleanup() {
   }

   public static Set<String> knownPowerIds() {
      return KNOWN_POWER_IDS;
   }

   public static Set<String> collectCandidatePowerIds(ServerPlayer player) {
      return collectRemovalTargets(player);
   }

   public static int removeAllKnownPowers(ServerPlayer player) {
      if (player != null && !player.m_9236_().m_5776_()) {
         Set<String> targets = collectRemovalTargets(player);
         int removed = 0;

         for(String powerId : targets) {
            if (runSuperpowerRemove(player, powerId)) {
               ++removed;
            }
         }

         return removed;
      } else {
         return 0;
      }
   }

   private static Set<String> collectRemovalTargets(ServerPlayer player) {
      Set<String> targets = new LinkedHashSet();
      targets.addAll(KNOWN_POWER_IDS);

      for(String powerId : KNOWN_POWER_IDS) {
         targets.add(toLegacyNamespace(powerId));
      }

      PowerManager.getPowerHandler(player).ifPresent((handler) -> {
         for(ResourceLocation held : handler.getPowerHolders().keySet()) {
            if ("project_edgerunner".equals(held.m_135827_()) || "cyberpunk".equals(held.m_135827_())) {
               targets.add(held.toString());
            }
         }

      });
      CompoundTag persistent = player.getPersistentData();
      if (persistent.m_128425_("cyberware_granted_slot_powers", 8)) {
         for(String entry : persistent.m_128461_("cyberware_granted_slot_powers").split(",")) {
            addPowerId(targets, entry);
         }
      }

      if (persistent.m_128425_("cyberware", 10)) {
         collectFromCyberwareTag(persistent.m_128469_("cyberware"), targets);
      }

      return targets;
   }

   private static void collectFromCyberwareTag(CompoundTag cyberware, Set<String> targets) {
      if (cyberware != null && !cyberware.m_128456_()) {
         String installedOs = CyberwareDataUtil.getInstalledOs(cyberware);
         if (!installedOs.isBlank()) {
            addPowerId(targets, CyberwareDefinitions.resolvePowerIdForInstalledItem(installedOs));
         }

         for(String itemId : CyberwareDataUtil.collectInstalledItemsForPowerSnapshot(cyberware)) {
            addPowerId(targets, CyberwareDefinitions.resolvePowerIdForInstalledItem(itemId));
         }

         if (!installedOs.isBlank() || !CyberwareDataUtil.collectInstalledItemsForPowerSnapshot(cyberware).isEmpty()) {
            targets.add("project_edgerunner:cyberware");
         }

      }
   }

   static void addPowerId(Set<String> targets, String raw) {
      if (raw != null) {
         String trimmed = raw.trim();
         if (!trimmed.isEmpty()) {
            targets.add(trimmed);
            if (trimmed.startsWith("project_edgerunner:")) {
               targets.add(toLegacyNamespace(trimmed));
            } else if (trimmed.startsWith("cyberpunk:")) {
               targets.add(toCurrentNamespace(trimmed));
            }

         }
      }
   }

   private static String toLegacyNamespace(String powerId) {
      if (powerId != null && powerId.startsWith("project_edgerunner:")) {
         String var10000 = powerId.substring("project_edgerunner".length() + 1);
         return "cyberpunk:" + var10000;
      } else {
         return powerId;
      }
   }

   private static String toCurrentNamespace(String powerId) {
      if (powerId != null && powerId.startsWith("cyberpunk:")) {
         String var10000 = powerId.substring("cyberpunk".length() + 1);
         return "project_edgerunner:" + var10000;
      } else {
         return powerId;
      }
   }

   private static boolean runSuperpowerRemove(ServerPlayer player, String powerId) {
      if (powerId != null && !powerId.isBlank()) {
         MinecraftServer server = player.m_20194_();
         if (server == null) {
            return false;
         } else {
            int result = server.m_129892_().m_230957_(player.m_20203_().m_81324_().m_81325_(2), "superpower remove " + powerId + " " + player.m_36316_().getName());
            return result > 0;
         }
      } else {
         return false;
      }
   }
}
