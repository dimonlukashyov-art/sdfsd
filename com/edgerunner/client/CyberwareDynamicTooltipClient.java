package com.edgerunner.client;

import com.edgerunner.berserk.BerserkVariant;
import com.edgerunner.client.painting.CyberwarePaintPreset;
import com.edgerunner.cyberware.SupportCyberwareCatalog;
import com.edgerunner.cyberware.SupportCyberwareRuntime;
import com.edgerunner.cyberware.load.CyberwareStat;
import com.edgerunner.paint.CyberwarePaintProfile;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import javax.annotation.Nullable;
import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.scores.Objective;
import net.minecraft.world.scores.Scoreboard;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.event.entity.player.ItemTooltipEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod.EventBusSubscriber;
import net.minecraftforge.fml.common.Mod.EventBusSubscriber.Bus;
import net.minecraftforge.registries.ForgeRegistries;
import net.threetag.palladium.power.IPowerHolder;
import net.threetag.palladium.power.Power;
import net.threetag.palladium.power.PowerHandler;
import net.threetag.palladium.power.PowerManager;
import net.threetag.palladium.power.ability.AbilityInstance;

@EventBusSubscriber(
   modid = "project_edgerunner",
   value = {Dist.CLIENT},
   bus = Bus.FORGE
)
public final class CyberwareDynamicTooltipClient {
   private static final String ITEM_BLOOD_PUMP = "project_edgerunner:blood_pump";
   private static final String ITEM_BASIC_KIROSHI = "project_edgerunner:basic_kiroshi_optics";
   private static final String ITEM_AXOLOTL = "project_edgerunner:axolotl";
   private static final String SKELETON_PREFIX = "project_edgerunner:";
   private static final ResourceLocation AXOLOTL_POWER_ID = ResourceLocation.fromNamespaceAndPath("project_edgerunner", "axolotl");
   private static final String AXOLOTL_MAX_REDUCTION_ABILITY_ID = "axolotl_upgrade_cooldown_max";
   private static final double AXOLOTL_BASE_REDUCTION_PERCENT = (double)5.0F;

   private CyberwareDynamicTooltipClient() {
   }

   @SubscribeEvent
   public static void onItemTooltip(ItemTooltipEvent event) {
      Optional<CyberwarePaintProfile> painted = CyberwarePaintProfile.fromStack(event.getItemStack());
      painted.ifPresent((profile) -> {
         String name = CyberwarePaintPreset.tooltipName(profile);
         event.getToolTip().add(name.isBlank() ? Component.m_237115_("tooltip.project_edgerunner.painted").m_130940_(ChatFormatting.AQUA) : Component.m_237110_("tooltip.project_edgerunner.painted_named", new Object[]{name}).m_130940_(ChatFormatting.AQUA));
      });
      if (CyberwareTooltipConfig.isDynamicTooltipsEnabled()) {
         Player player = event.getEntity();
         if (player != null) {
            String itemId = itemId(event.getItemStack());
            SupportCyberwareCatalog.Implant support = SupportCyberwareCatalog.find(itemId);
            if (support != null) {
               List<Component> lines = new ArrayList();

               for(SupportCyberwareCatalog.Stat stat : support.stats()) {
                  double value = SupportCyberwareRuntime.purchasedValue(player, itemId, stat.id());
                  CyberwareStat.Unit unit = CyberwareStat.Unit.valueOf(stat.unit());
                  String number = CyberwareStat.format(value, CyberwareStat.Unit.COUNT);
                  String var10000;
                  switch (unit) {
                     case HP -> var10000 = number + " " + Component.m_237115_("unit.project_edgerunner.health_short").getString();
                     case SECONDS -> var10000 = number + Component.m_237115_("unit.project_edgerunner.seconds_short").getString();
                     case BLOCKS -> var10000 = number + "m";
                     default -> var10000 = CyberwareStat.format(value, unit);
                  }

                  String formatted = var10000;
                  lines.add(attributeLine(Component.m_237110_("stat.project_edgerunner.support." + stat.id(), new Object[]{formatted}).getString()));
               }

               if (!SupportCyberwareCatalog.available(itemId)) {
                  lines.add(Component.m_237115_("message.project_edgerunner.support.requires_tacz").m_130940_(ChatFormatting.RED));
               }

               insertTooltipLines(event.getToolTip(), lines);
            } else {
               BerserkVariant berserk = BerserkVariant.byItemId(itemId);
               if (berserk != null) {
                  appendBerserkTooltip(event.getToolTip(), player, berserk);
               } else if ("project_edgerunner:blood_pump".equals(itemId)) {
                  appendBloodPumpTooltip(event.getToolTip(), player);
               } else if ("project_edgerunner:basic_kiroshi_optics".equals(itemId)) {
                  appendBasicKiroshiTooltip(event.getToolTip());
               } else if ("project_edgerunner:axolotl".equals(itemId)) {
                  appendAxolotlTooltip(event.getToolTip(), player);
               } else {
                  appendSkeletonTooltip(event.getToolTip(), player, itemId);
               }
            }
         }
      }
   }

   private static void appendBloodPumpTooltip(List<Component> tooltip, Player player) {
      int maxCharges = Math.max(1, getScore(player, "er_bp_charges_max"));
      double instantHeal = tiered(player, "blood_pump", "upgrade_instant_", 3, (double)9.0F, (double)13.0F, (double)17.5F, (double)22.0F);
      double regenTotal = tiered(player, "blood_pump", "upgrade_regen_", 3, (double)3.5F, (double)6.5F, (double)10.5F, (double)14.0F);
      insertTooltipLines(tooltip, List.of(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.0", new Object[]{hp(instantHeal)}).getString()), attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.1", new Object[]{hp(regenTotal)}).getString()), attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.2", new Object[]{maxCharges}).getString())));
   }

   private static void appendBerserkTooltip(List<Component> tooltip, Player player, BerserkVariant variant) {
      String powerPath = variant.itemId().substring("project_edgerunner:".length());
      int armorTier = tier(player, powerPath, "upgrade_armor_", variant.maxDamageReductionTier());
      int durationTier = tier(player, powerPath, "upgrade_duration_", variant.maxDurationTier());
      int cooldownTier = tier(player, powerPath, "upgrade_cooldown_", variant.maxCooldownTier());
      int attackSpeedTier = tier(player, powerPath, "upgrade_attack_speed_", variant.maxAttackSpeedTier());
      int critTier = tier(player, powerPath, "upgrade_crit_", variant.maxCritChanceTier());
      int fallTier = tier(player, powerPath, "upgrade_fall_", variant.maxFallReductionTier());
      int movementTier = tier(player, powerPath, "upgrade_movement_", variant.maxMovementSpeedTier());
      List<Component> lines = new ArrayList();
      if (variant.invulnerable()) {
         lines.add(attributeLine(Component.m_237115_("tooltip.project_edgerunner.live.3").getString()));
      } else {
         lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.4", new Object[]{percent(variant.damageReductionPercent(armorTier))}).getString()));
      }

      lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.5", new Object[]{seconds(variant.durationTicks(durationTier)), seconds(variant.cooldownTicks(cooldownTier))}).getString()));
      if (variant.attackSpeedPercent(attackSpeedTier) > (double)0.0F) {
         lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.6", new Object[]{percent(variant.attackSpeedPercent(attackSpeedTier))}).getString()));
      }

      if (variant.critChancePercent(critTier) > (double)0.0F) {
         lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.7", new Object[]{percent(variant.critChancePercent(critTier))}).getString()));
      }

      if (variant.fallReductionPercent(fallTier) > (double)0.0F && !variant.invulnerable()) {
         lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.8", new Object[]{percent(variant.fallReductionPercent(fallTier))}).getString()));
      }

      if (variant.movementSpeedPercent(movementTier) > (double)0.0F) {
         lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.9", new Object[]{percent(variant.movementSpeedPercent(movementTier))}).getString()));
      }

      lines.add(attributeLine(Component.m_237115_("tooltip.project_edgerunner.live.10").getString()));
      Component specialization = resolveBerserkSpecialization(player, powerPath, variant);
      if (specialization != null) {
         lines.add(specialization);
      }

      insertTooltipLines(tooltip, lines);
   }

   @Nullable
   private static Component resolveBerserkSpecialization(Player player, String powerPath, BerserkVariant variant) {
      for(String branchId : variant.specializationIds()) {
         if (isUnlocked(player, powerPath, "specialization_" + branchId)) {
            boolean mastery = isUnlocked(player, powerPath, "specialization_" + branchId + "_mastery");
            String branchName = Component.m_237115_("ability.project_edgerunner." + powerPath + ".specialization_" + branchId + ".title").getString();
            return attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.11", new Object[]{branchName, mastery ? ClientLocalization.text("tooltip.project_edgerunner.mastered") : ""}).getString());
         }
      }

      return null;
   }

   private static void appendBasicKiroshiTooltip(List<Component> tooltip) {
      insertTooltipLines(tooltip, List.of(attributeLine(Component.m_237115_("tooltip.project_edgerunner.live.12").getString()), attributeLine(Component.m_237115_("tooltip.project_edgerunner.live.13").getString())));
   }

   private static void appendAxolotlTooltip(List<Component> tooltip, Player player) {
      double reductionPercent = resolveAxolotlReductionPercent(player);
      insertTooltipLines(tooltip, List.of(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.14", new Object[]{percent(reductionPercent)}).getString())));
   }

   private static void appendSkeletonTooltip(List<Component> tooltip, Player player, String itemId) {
      List<Component> additions = buildSkeletonTooltip(player, itemId);
      if (!additions.isEmpty()) {
         insertTooltipLines(tooltip, additions);
      }

   }

   private static List<Component> buildSkeletonTooltip(Player player, String itemId) {
      String powerPath = itemId.startsWith("project_edgerunner:") ? itemId.substring("project_edgerunner:".length()) : "";
      List<Component> lines = new ArrayList();
      switch (powerPath) {
         case "titanium_bones":
            lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.15", new Object[]{percent(tiered(player, powerPath, "bone_matrix_", 2, (double)8.0F, (double)10.0F, (double)12.0F))}).getString()));
            lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.16", new Object[]{percent(tiered(player, powerPath, "elemental_conduction_", 2, (double)6.0F, (double)9.0F, (double)12.0F))}).getString()));
            lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.17", new Object[]{percent(tiered(player, powerPath, "titanium_stability_", 2, (double)15.0F, (double)18.0F, (double)20.0F))}).getString()));
            lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.18", new Object[]{percent(tiered(player, powerPath, "weighted_frame_", 2, (double)10.0F, (double)15.0F, (double)20.0F))}).getString()));
            if (isUnlocked(player, powerPath, "impact_transfer")) {
               lines.add(attributeLine(Component.m_237115_("tooltip.project_edgerunner.live.19").getString()));
            }
            break;
         case "bionic_joints":
            lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.9", new Object[]{percent(tiered(player, powerPath, "lubrication_", 2, (double)15.0F, (double)18.0F, (double)20.0F))}).getString()));
            lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.8", new Object[]{percent(tiered(player, powerPath, "impact_dampers_", 3, (double)25.0F, (double)30.0F, (double)35.0F, (double)40.0F))}).getString()));
            lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.20", new Object[]{percent(tiered(player, powerPath, "joint_stability_", 2, (double)10.0F, (double)15.0F, (double)20.0F))}).getString()));
            if (isUnlocked(player, powerPath, "reinforced_landing")) {
               lines.add(attributeLine(Component.m_237115_("tooltip.project_edgerunner.live.21").getString()));
            }
            break;
         case "dense_marrow":
            lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.22", new Object[]{percent(tiered(player, powerPath, "compressed_fibers_", 3, (double)20.0F, (double)22.0F, (double)25.0F, (double)27.0F)), percent(tiered(player, powerPath, "compressed_fibers_", 3, (double)25.0F, (double)28.0F, (double)32.0F, (double)35.0F))}).getString()));
            lines.add(attributeLine(Component.m_237115_("tooltip.project_edgerunner.live.23").getString()));
            int conductive = tier(player, powerPath, "conductive_skeleton_", 2);
            if (conductive > 0) {
               lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.24", new Object[]{conductive >= 2 ? "5" : "3"}).getString()));
            }
            break;
         case "epimorphic_skeleton":
            lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.25", new Object[]{percent(tiered(player, powerPath, "bone_structure_", 2, (double)13.0F, (double)15.0F, (double)18.0F))}).getString()));
            lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.26", new Object[]{percent(tiered(player, powerPath, "medical_compatibility_", 2, (double)10.0F, (double)15.0F, (double)20.0F))}).getString()));
            lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.27", new Object[]{percent(tiered(player, powerPath, "chrome_tolerant_", 2, (double)5.0F, (double)7.0F, (double)10.0F)), percent(tiered(player, powerPath, "stable_architecture_", 3, (double)5.0F, (double)7.0F, (double)10.0F, (double)12.0F))}).getString()));
            break;
         case "kinetic_frame":
            int motion = tier(player, powerPath, "motion_calibration_", 2);
            double moving = motion >= 2 ? (double)15.0F : (motion == 1 ? (double)14.0F : (double)12.0F);
            double high = motion >= 2 ? (double)22.0F : (motion == 1 ? (double)20.0F : (double)18.0F);
            lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.28", new Object[]{percent(moving), percent(high)}).getString()));
            lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.29", new Object[]{percent(tiered(player, powerPath, "impact_redirection_", 2, (double)25.0F, (double)30.0F, (double)35.0F))}).getString()));
            lines.add(attributeLine(Component.m_237115_("tooltip.project_edgerunner.live.30").getString()));
            int momentum = tier(player, powerPath, "momentum_recovery_", 3);
            if (momentum > 0) {
               lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.31", new Object[]{percent(momentum >= 3 ? (double)20.0F : (momentum == 2 ? (double)15.0F : (double)10.0F)), momentum >= 3 ? "10" : (momentum == 2 ? "6" : "3")}).getString()));
            }
            break;
         case "para_bellum":
            lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.15", new Object[]{percent(tiered(player, powerPath, "combat_skeleton_", 2, (double)12.0F, (double)13.5F, (double)15.0F))}).getString()));
            lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.32", new Object[]{percent(tiered(player, powerPath, "ballistic_reinforcement_", 2, (double)8.0F, (double)12.0F, (double)15.0F))}).getString()));
            lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.33", new Object[]{percent(tiered(player, powerPath, "blast_hardened_", 2, (double)8.0F, (double)12.0F, (double)15.0F))}).getString()));
            lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.16", new Object[]{percent(tiered(player, powerPath, "insulated_armor_", 2, (double)5.0F, (double)8.0F, (double)10.0F))}).getString()));
            break;
         case "rara_avis":
            lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.34", new Object[]{percent(tiered(player, powerPath, "iconic_reinforcement_", 2, (double)40.0F, (double)45.0F, (double)50.0F)), percent(tiered(player, powerPath, "iconic_reinforcement_", 2, (double)25.0F, (double)28.0F, (double)30.0F))}).getString()));
            lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.35", new Object[]{percent(tiered(player, powerPath, "iconic_insulation_", 2, (double)10.0F, (double)13.0F, (double)15.0F))}).getString()));
            lines.add(attributeLine(Component.m_237115_("tooltip.project_edgerunner.live.36").getString()));
            int redline = tier(player, powerPath, "redline_", 2);
            if (redline > 0) {
               lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.37", new Object[]{redline >= 2 ? "10" : "5"}).getString()));
            }
            break;
         case "scar_coalescer":
            lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.38", new Object[]{percent(tiered(player, powerPath, "scar_tissue_", 2, (double)22.0F, (double)26.0F, (double)30.0F))}).getString()));
            int aggression = tier(player, powerPath, "survival_aggression_", 2);
            if (aggression > 0) {
               lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.39", new Object[]{aggression >= 2 ? "15" : "10"}).getString()));
            }
            break;
         case "scarab":
            lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.40", new Object[]{percent(tiered(player, powerPath, "scarab_plating_", 2, (double)20.0F, (double)24.0F, (double)28.0F))}).getString()));
            lines.add(attributeLine(Component.m_237115_("tooltip.project_edgerunner.live.41").getString()));
            lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.42", new Object[]{percent(tiered(player, powerPath, "grounded_shell_", 2, (double)10.0F, (double)20.0F, (double)30.0F))}).getString()));
            break;
         case "spring_joints":
            lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.43", new Object[]{percent(tiered(player, powerPath, "elastic_fibers_", 2, (double)18.0F, (double)21.0F, (double)24.0F))}).getString()));
            lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.8", new Object[]{percent(tiered(player, powerPath, "fall_springs_", 2, (double)15.0F, (double)22.0F, (double)30.0F))}).getString()));
            int rebound = tier(player, powerPath, "impact_rebound_", 2);
            if (rebound > 0) {
               lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.44", new Object[]{rebound >= 2 ? "15" : "10", blocks(rebound >= 2 ? (double)1.5F : (double)1.0F)}).getString()));
            }
            break;
         case "universal_booster":
            int plating = tier(player, powerPath, "booster_plating_", 2);
            double oneStack = plating >= 2 ? (double)13.0F : (plating == 1 ? (double)12.0F : (double)10.0F);
            double twoStack = plating >= 2 ? (double)18.0F : (plating == 1 ? (double)17.0F : (double)15.0F);
            lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.45", new Object[]{percent(oneStack), percent(twoStack)}).getString()));
            lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.46", new Object[]{5 + tier(player, powerPath, "extended_flow_", 2)}).getString()));
            break;
         case "hollow_bones":
            lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.47", new Object[]{percent(tiered(player, powerPath, "carbon_lattice_", 2, (double)10.0F, (double)12.0F, (double)14.0F)), percent(tiered(player, powerPath, "carbon_lattice_", 2, (double)15.0F, (double)18.0F, (double)20.0F))}).getString()));
            lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.48", new Object[]{percent(tiered(player, powerPath, "featherweight_launch_", 2, (double)15.0F, (double)20.0F, (double)25.0F)), percent(tiered(player, powerPath, "soft_landing_", 2, (double)20.0F, (double)28.0F, (double)35.0F))}).getString()));
            lines.add(attributeLine(Component.m_237110_("tooltip.project_edgerunner.live.49", new Object[]{blocks(tiered(player, powerPath, "featherweight_launch_", 2, (double)1.0F, (double)1.5F, (double)2.0F))}).getString()));
            lines.add(attributeLine(Component.m_237115_("tooltip.project_edgerunner.live.50").getString()));
      }

      return lines;
   }

   private static double resolveAxolotlReductionPercent(Player player) {
      try {
         IPowerHolder holder = getPowerHolder(player, AXOLOTL_POWER_ID);
         if (holder != null) {
            AbilityInstance maxUpgrade = (AbilityInstance)holder.getAbilities().get("axolotl_upgrade_cooldown_max");
            return maxUpgrade != null && maxUpgrade.isUnlocked() ? (double)7.5F : (double)5.0F;
         }
      } catch (Exception var3) {
      }

      int basisPoints = Math.max(0, getScore(player, "er_axo_last_reduction_bp"));
      return basisPoints > 0 ? (double)basisPoints / (double)100.0F : (double)5.0F;
   }

   private static boolean isUnlocked(Player player, String powerPath, String abilityId) {
      ResourceLocation powerId = ResourceLocation.fromNamespaceAndPath("project_edgerunner", powerPath);

      try {
         IPowerHolder holder = getPowerHolder(player, powerId);
         if (holder == null) {
            return false;
         } else {
            AbilityInstance ability = (AbilityInstance)holder.getAbilities().get(abilityId);
            return ability != null && ability.isUnlocked();
         }
      } catch (Exception var6) {
         return false;
      }
   }

   private static int tier(Player player, String powerPath, String abilityPrefix, int maxTier) {
      for(int i = Math.max(1, maxTier); i >= 1; --i) {
         if (isUnlocked(player, powerPath, abilityPrefix + i)) {
            return i;
         }
      }

      return 0;
   }

   private static double tiered(Player player, String powerPath, String abilityPrefix, int maxTier, double... values) {
      int tier = Math.min(tier(player, powerPath, abilityPrefix, maxTier), values.length - 1);
      return values[Math.max(0, tier)];
   }

   private static IPowerHolder getPowerHolder(Player player, ResourceLocation powerId) {
      Power power = PowerManager.getInstance(player.m_9236_()).getPower(powerId);
      if (power == null) {
         return null;
      } else {
         PowerHandler handler = (PowerHandler)PowerManager.getPowerHandler(player).orElse((Object)null);
         return handler == null ? null : handler.getPowerHolder(power);
      }
   }

   private static String itemId(ItemStack stack) {
      if (stack != null && !stack.m_41619_()) {
         ResourceLocation itemId = ForgeRegistries.ITEMS.getKey(stack.m_41720_());
         return itemId == null ? "" : itemId.toString();
      } else {
         return "";
      }
   }

   private static Component attributeLine(String text) {
      return CyberwareTooltipStyles.attribute(text);
   }

   private static void insertTooltipLines(List<Component> tooltip, List<Component> additions) {
      if (additions != null && !additions.isEmpty()) {
         tooltip.addAll(findInsertIndex(tooltip), additions);
      }
   }

   private static int findInsertIndex(List<Component> tooltip) {
      for(int i = 0; i < tooltip.size(); ++i) {
         String text = ((Component)tooltip.get(i)).getString();
         if (ClientLocalization.isTierLoadLine((Component)tooltip.get(i))) {
            return i + 1;
         }
      }

      return tooltip.size();
   }

   private static int getScore(Player player, String objectiveName) {
      Scoreboard scoreboard = player.m_36329_();
      if (scoreboard == null) {
         return 0;
      } else {
         Objective objective = scoreboard.m_83477_(objectiveName);
         return objective != null && scoreboard.m_83461_(player.m_6302_(), objective) ? scoreboard.m_83471_(player.m_6302_(), objective).m_83400_() : 0;
      }
   }

   private static String percent(double value) {
      return Math.abs(value - Math.rint(value)) < 0.001 ? String.format(Locale.ROOT, "%.0f%%", value) : String.format(Locale.ROOT, "%.1f%%", value);
   }

   private static String hp(double value) {
      return Math.abs(value - Math.rint(value)) < 0.001 ? String.format(Locale.ROOT, "%.0f %s", value, ClientLocalization.text("tooltip.project_edgerunner.health_unit")) : String.format(Locale.ROOT, "%.1f %s", value, ClientLocalization.text("tooltip.project_edgerunner.health_unit"));
   }

   private static String blocks(double value) {
      return Math.abs(value - Math.rint(value)) < 0.001 ? String.format(Locale.ROOT, "%.0f%s", value, ClientLocalization.text("tooltip.project_edgerunner.blocks_unit")) : String.format(Locale.ROOT, "%.1f%s", value, ClientLocalization.text("tooltip.project_edgerunner.blocks_unit"));
   }

   private static String seconds(int ticks) {
      double value = (double)ticks / (double)20.0F;
      return Math.abs(value - Math.rint(value)) < 0.001 ? String.format(Locale.ROOT, "%.0f%s", value, ClientLocalization.text("unit.project_edgerunner.seconds_short")) : String.format(Locale.ROOT, "%.1f%s", value, ClientLocalization.text("unit.project_edgerunner.seconds_short"));
   }
}
