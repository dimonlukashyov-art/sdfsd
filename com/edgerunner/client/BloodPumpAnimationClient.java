package com.edgerunner.client;

import java.util.UUID;
import javax.annotation.Nullable;
import net.minecraft.client.Minecraft;
import net.minecraft.client.player.LocalPlayer;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.util.Mth;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.ClientPlayerNetworkEvent;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.event.TickEvent.Phase;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod.EventBusSubscriber;
import net.minecraftforge.fml.common.Mod.EventBusSubscriber.Bus;
import net.threetag.palladium.client.renderer.renderlayer.IPackRenderLayer;
import net.threetag.palladium.client.renderer.renderlayer.PackRenderLayerManager;
import net.threetag.palladium.client.renderer.renderlayer.RenderLayerStates;
import net.threetag.palladium.compat.geckolib.renderlayer.GeckoLayerState;
import net.threetag.palladium.entity.PalladiumLivingEntityExtension;
import software.bernie.geckolib.core.animation.AnimationController;

@EventBusSubscriber(
   modid = "project_edgerunner",
   value = {Dist.CLIENT},
   bus = Bus.FORGE
)
public final class BloodPumpAnimationClient {
   private static final double MIN_SPEED = 0.05;
   private static final double MAX_SPEED = (double)8.0F;
   private static final ResourceLocation[] REGEN_RENDER_LAYER_IDS = new ResourceLocation[]{null, ResourceLocation.fromNamespaceAndPath("project_edgerunner", "blood_pump_1_regen"), ResourceLocation.fromNamespaceAndPath("project_edgerunner", "blood_pump_2_regen"), ResourceLocation.fromNamespaceAndPath("project_edgerunner", "blood_pump_3_regen")};
   private static final SlotAnimationTracker[] SLOT_TRACKERS = new SlotAnimationTracker[]{null, new SlotAnimationTracker(), new SlotAnimationTracker(), new SlotAnimationTracker()};
   @Nullable
   private static UUID trackedPlayerUuid;

   private BloodPumpAnimationClient() {
   }

   @SubscribeEvent
   public static void onClientTick(TickEvent.ClientTickEvent event) {
      if (event.phase == Phase.END) {
         Minecraft mc = Minecraft.m_91087_();
         LocalPlayer player = mc.f_91074_;
         if (player != null && mc.f_91073_ != null) {
            if (trackedPlayerUuid != null && !trackedPlayerUuid.equals(player.m_20148_())) {
               clearTrackers();
            }

            trackedPlayerUuid = player.m_20148_();
            BloodPumpClientStateUtil.State state = BloodPumpClientStateUtil.resolve(player);
            if (state.maxCharges() <= 0) {
               clearTrackers();
            } else {
               for(int slot = 1; slot <= 3; ++slot) {
                  syncSlotAnimation(player, state, slot);
               }

            }
         }
      }
   }

   @SubscribeEvent
   public static void onClientLogout(ClientPlayerNetworkEvent.LoggingOut event) {
      clearTrackers();
   }

   @SubscribeEvent
   public static void onClientLogin(ClientPlayerNetworkEvent.LoggingIn event) {
      clearTrackers();
   }

   private static void syncSlotAnimation(LocalPlayer player, BloodPumpClientStateUtil.State state, int slot) {
      SlotAnimationTracker tracker = SLOT_TRACKERS[slot];
      if (tracker != null) {
         int remainingRechargeTicks = slot <= state.maxCharges() ? state.slotRechargeTicks(slot) : 0;
         int currentRechargeMaxTicks = slot <= state.maxCharges() ? state.slotRechargeMaxTicks(slot) : 0;
         int injectTicks = slot <= state.maxCharges() ? state.slotInjectTicks(slot) : 0;
         boolean regenVisible = remainingRechargeTicks > 0 && injectTicks <= 0;
         AnimationController<GeckoLayerState> controller = getRegenController(player, slot);
         if (!regenVisible) {
            if (controller != null) {
               controller.setAnimationSpeed((double)1.0F);
            }

            tracker.reset();
         } else {
            long gameTime = player.m_9236_().m_46467_();
            if (tracker.active && remainingRechargeTicks <= tracker.lastRechargeTicks) {
               if (tracker.lastGameTime >= 0L && gameTime > tracker.lastGameTime) {
                  double elapsedTicks = (double)(gameTime - tracker.lastGameTime);
                  tracker.visualRemainingTicks = Math.max((double)0.0F, tracker.visualRemainingTicks - tracker.lastAppliedSpeed * elapsedTicks);
               }
            } else {
               tracker.start(gameTime, remainingRechargeTicks, currentRechargeMaxTicks);
               if (controller != null) {
                  controller.forceAnimationReset();
               }
            }

            double speed = tracker.visualRemainingTicks / Math.max((double)1.0F, (double)remainingRechargeTicks);
            speed = Mth.m_14008_(speed, 0.05, (double)8.0F);
            tracker.active = true;
            tracker.lastGameTime = gameTime;
            tracker.lastRechargeTicks = remainingRechargeTicks;
            tracker.lastAppliedSpeed = speed;
            if (controller != null) {
               controller.setAnimationSpeed(speed);
            }

         }
      }
   }

   @Nullable
   private static AnimationController<GeckoLayerState> getRegenController(LocalPlayer player, int slot) {
      if (player instanceof PalladiumLivingEntityExtension extension) {
         IPackRenderLayer layer = PackRenderLayerManager.getInstance().getLayer(REGEN_RENDER_LAYER_IDS[slot]);
         if (layer == null) {
            return null;
         } else {
            RenderLayerStates states = extension.palladium$getRenderLayerStates();
            if (states == null) {
               return null;
            } else {
               RenderLayerStates.State state = states.getOrCreate(layer);
               if (state instanceof GeckoLayerState) {
                  GeckoLayerState geckoState = (GeckoLayerState)state;
                  return geckoState.getController("main");
               } else {
                  return null;
               }
            }
         }
      } else {
         return null;
      }
   }

   private static void clearTrackers() {
      trackedPlayerUuid = null;

      for(int slot = 1; slot <= 3; ++slot) {
         if (SLOT_TRACKERS[slot] != null) {
            SLOT_TRACKERS[slot].reset();
         }
      }

   }

   private static final class SlotAnimationTracker {
      private boolean active;
      private long lastGameTime = -1L;
      private int lastRechargeTicks;
      private double lastAppliedSpeed = (double)1.0F;
      private double visualRemainingTicks = (double)600.0F;

      private void start(long gameTime, int rechargeTicks, int rechargeMaxTicks) {
         this.active = true;
         this.lastGameTime = gameTime;
         this.lastRechargeTicks = Math.max(0, rechargeTicks);
         this.lastAppliedSpeed = (double)1.0F;
         this.visualRemainingTicks = (double)Math.max(Math.max(1, rechargeTicks), rechargeMaxTicks > 0 ? rechargeMaxTicks : 600);
      }

      private void reset() {
         this.active = false;
         this.lastGameTime = -1L;
         this.lastRechargeTicks = 0;
         this.lastAppliedSpeed = (double)1.0F;
         this.visualRemainingTicks = (double)600.0F;
      }
   }
}
