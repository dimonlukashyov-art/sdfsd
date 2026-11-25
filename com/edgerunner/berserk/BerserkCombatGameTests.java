package com.edgerunner.berserk;

import com.edgerunner.cyberware.CyberwareStore;
import com.edgerunner.epicfight.EpicFightIntegration;
import com.edgerunner.mantis.MantisBladesGameTests;
import com.edgerunner.sandevistan.TemporalHooks;
import net.minecraft.gametest.framework.GameTest;
import net.minecraft.gametest.framework.GameTestHelper;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraftforge.gametest.GameTestHolder;
import net.minecraftforge.gametest.PrefixGameTestTemplate;
import yesman.epicfight.api.animation.types.DynamicAnimation;
import yesman.epicfight.world.capabilities.EpicFightCapabilities;
import yesman.epicfight.world.capabilities.entitypatch.LivingEntityPatch;
import yesman.epicfight.world.damagesource.StunType;

@GameTestHolder("project_edgerunner")
@PrefixGameTestTemplate(false)
public final class BerserkCombatGameTests {
   private BerserkCombatGameTests() {
   }

   @GameTest(
      templateNamespace = "project_edgerunner",
      m_177046_ = "mantis_arena",
      m_177042_ = 50
   )
   public static void everyBerserkCanCancelButForcedCannot(GameTestHelper helper) {
      for(BerserkVariant variant : BerserkVariant.values()) {
         ServerPlayer player = MantisBladesGameTests.mockPlayer(helper);
         CyberwareStore.getOrCreateCyberwareTag(player.getPersistentData()).m_128359_("installed_os", variant.itemId());
         BerserkRuntime.requestActivation(player);
         if (!BerserkRuntime.isActive(player)) {
            helper.m_177284_("Failed activation: " + String.valueOf(variant));
            return;
         }

         BerserkRuntime.requestActivation(player);
         if (BerserkRuntime.isActive(player)) {
            helper.m_177284_("Failed cancellation: " + String.valueOf(variant));
            return;
         }

         int cooldown = player.getPersistentData().m_128451_("cyb_bz_cooldown_remaining");
         if (cooldown != BerserkRuntime.manualExitCooldown(variant.cooldownTicks(0), variant.durationTicks(0), variant.durationTicks(0))) {
            helper.m_177284_("Wrong minimum partial cooldown: " + String.valueOf(variant));
            return;
         }

         ServerPlayer forced = MantisBladesGameTests.mockPlayer(helper);
         CyberwareStore.getOrCreateCyberwareTag(forced.getPersistentData()).m_128359_("installed_os", variant.itemId());
         BerserkRuntime.activateForControlLoss(forced);
         BerserkRuntime.requestActivation(forced);
         if (!BerserkRuntime.isActive(forced)) {
            helper.m_177284_("Forced Berserk canceled: " + String.valueOf(variant));
            return;
         }
      }

      helper.m_177412_();
   }

   @GameTest(
      templateNamespace = "project_edgerunner",
      m_177046_ = "mantis_arena",
      m_177042_ = 40
   )
   public static void allVariantsResistKnockbackFromZeroAndPositiveBase(GameTestHelper helper) {
      for(BerserkVariant variant : BerserkVariant.values()) {
         for(double base : new double[]{(double)0.0F, 0.2}) {
            ServerPlayer player = MantisBladesGameTests.mockPlayer(helper);
            CyberwareStore.getOrCreateCyberwareTag(player.getPersistentData()).m_128359_("installed_os", variant.itemId());
            player.m_21051_(Attributes.f_22278_).m_22100_(base);
            BerserkRuntime.requestActivation(player);
            if (!BerserkRuntime.isActive(player)) {
               helper.m_177284_("Could not activate " + String.valueOf(variant));
            }

            double actual = player.m_21133_(Attributes.f_22278_);
            if (Math.abs(actual - (base + (double)0.5F)) > 1.0E-6) {
               helper.m_177284_("Multiplicative/incorrect knockback resistance: " + String.valueOf(variant) + " base=" + base + " actual=" + actual);
            }
         }
      }

      ServerPlayer bastion = MantisBladesGameTests.mockPlayer(helper);
      CyberwareStore.getOrCreateCyberwareTag(bastion.getPersistentData()).m_128359_("installed_os", BerserkVariant.MOORE_TECH.itemId());
      bastion.getPersistentData().m_128405_("cyb_bz_specialization", 1);
      BerserkRuntime.requestActivation(bastion);
      if (bastion.m_21133_(Attributes.f_22278_) < 0.99) {
         helper.m_177284_("Bastion lost its stronger additive resistance");
      }

      helper.m_177412_();
   }

   @GameTest(
      templateNamespace = "project_edgerunner",
      m_177046_ = "mantis_arena",
      m_177042_ = 45
   )
   public static void berserkAcceleratesAttackClockOnceWithoutAcceleratingBodyTimers(GameTestHelper helper) {
      ServerPlayer player = MantisBladesGameTests.mockPlayer(helper);
      CyberwareStore.getOrCreateCyberwareTag(player.getPersistentData()).m_128359_("installed_os", BerserkVariant.ZETATECH.itemId());
      BerserkRuntime.requestActivation(player);
      double multiplier = BerserkRuntime.attackSpeedMultiplier(player);
      if (multiplier <= (double)1.0F) {
         helper.m_177284_("Zetatech attack speed modifier was absent");
      }

      double[] start = new double[2];
      helper.m_177127_(5L, () -> {
         start[0] = TemporalHooks.playerBodyTime(player);
         start[1] = CyberwareAttackClock.time(player);
      });

      for(int tick = 6; tick <= 15; ++tick) {
         helper.m_177127_((long)tick, () -> {
            TemporalHooks.playerBodyTime(player);
            CyberwareAttackClock.time(player);
         });
      }

      helper.m_177127_(16L, () -> {
         double body = TemporalHooks.playerBodyTime(player) - start[0];
         double attack = CyberwareAttackClock.time(player) - start[1];
         if (Math.abs(body - (double)11.0F) > 1.0E-5 || Math.abs(attack - body * multiplier) > 1.0E-5) {
            helper.m_177284_("Attack bonus was missing, duplicated or applied to body time: body=" + body + " attack=" + attack + " bonus=" + multiplier);
         }

         helper.m_177412_();
      });
   }

   @GameTest(
      templateNamespace = "project_edgerunner",
      m_177046_ = "mantis_arena",
      m_177042_ = 45
   )
   public static void epicFightBriefStunIsHalvedAndStrongControlKeepsItsNativeDuration(GameTestHelper helper) {
      if (!EpicFightIntegration.PRESENT) {
         helper.m_177412_();
      } else {
         BerserkCombatGameTests.NativeStun.run(helper);
      }
   }

   private static final class NativeStun {
      static void run(GameTestHelper helper) {
         ServerPlayer normal = MantisBladesGameTests.mockPlayer(helper);
         ServerPlayer active = MantisBladesGameTests.mockPlayer(helper);
         CyberwareStore.getOrCreateCyberwareTag(active.getPersistentData()).m_128359_("installed_os", BerserkVariant.BIODYNE.itemId());
         BerserkRuntime.requestActivation(active);
         helper.m_177127_(12L, () -> {
            LivingEntityPatch control = (LivingEntityPatch)EpicFightCapabilities.getEntityPatch(normal, LivingEntityPatch.class);
            LivingEntityPatch berserk = (LivingEntityPatch)EpicFightCapabilities.getEntityPatch(active, LivingEntityPatch.class);
            if (control != null && berserk != null) {
               for(StunType type : new StunType[]{StunType.SHORT, StunType.LONG, StunType.KNOCKDOWN, StunType.NEUTRALIZE}) {
                  if (!control.applyStun(type, 0.6F) || !berserk.applyStun(type, 0.6F)) {
                     helper.m_177284_("Native stun failed: " + String.valueOf(type));
                     return;
                  }

                  double baseline = (double)((DynamicAnimation)control.getServerAnimator().animationPlayer.getAnimation().get()).getTotalTime();
                  double changed = (double)((DynamicAnimation)berserk.getServerAnimator().animationPlayer.getAnimation().get()).getTotalTime();
                  double expected = type == StunType.SHORT ? baseline * (double)0.5F : baseline;
                  if (Math.abs(changed - expected) > 1.0E-4) {
                     helper.m_177284_("Wrong native stun duration: " + String.valueOf(type) + " baseline=" + baseline + " Berserk=" + changed);
                  }
               }

               helper.m_177412_();
            } else {
               helper.m_177284_("Native Epic Fight player patches are missing");
            }
         });
      }
   }
}
