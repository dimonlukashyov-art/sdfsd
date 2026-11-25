package com.edgerunner.animation;

import com.edgerunner.network.CyberAnimationSyncPacket;
import com.edgerunner.network.CyberpunkNetwork;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import javax.annotation.Nullable;
import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.MutableComponent;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraftforge.event.entity.living.LivingDeathEvent;
import net.minecraftforge.event.entity.player.PlayerEvent;
import net.minecraftforge.event.server.ServerStoppingEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod.EventBusSubscriber;
import net.minecraftforge.fml.common.Mod.EventBusSubscriber.Bus;
import net.minecraftforge.server.ServerLifecycleHooks;

@EventBusSubscriber(
   modid = "project_edgerunner",
   bus = Bus.FORGE
)
public final class CyberAnimationSystem {
   private static final Map<UUID, ActiveAnimation> ACTIVE_BY_PLAYER = new ConcurrentHashMap();
   private static final Map<UUID, AnimationPoseAdjustment> ADJUSTMENTS_BY_PLAYER = new ConcurrentHashMap();

   private CyberAnimationSystem() {
   }

   public static ActiveAnimation startPoseTune(ServerPlayer player) {
      if (player == null) {
         return null;
      } else {
         CyberAnimationDefinition definition = CyberAnimationRegistry.poseTuneDefinition();
         AnimationPoseAdjustment adjustment = getAdjustment(player);
         ActiveAnimation active = new ActiveAnimation(player.m_19879_(), player.m_20148_(), definition.id(), definition.target(), player.m_284548_().m_46467_(), definition.phaseDurationTicks(), adjustment);
         ACTIVE_BY_PLAYER.put(player.m_20148_(), active);
         broadcast(active);
         return active;
      }
   }

   public static boolean stopPoseTune(ServerPlayer player) {
      if (player == null) {
         return false;
      } else {
         ActiveAnimation removed = (ActiveAnimation)ACTIVE_BY_PLAYER.remove(player.m_20148_());
         ADJUSTMENTS_BY_PLAYER.remove(player.m_20148_());
         broadcastStop(player);
         return removed != null;
      }
   }

   public static AnimationPoseAdjustment getAdjustment(ServerPlayer player) {
      return player == null ? AnimationPoseAdjustment.ZERO : (AnimationPoseAdjustment)ADJUSTMENTS_BY_PLAYER.getOrDefault(player.m_20148_(), AnimationPoseAdjustment.ZERO);
   }

   public static AnimationPoseAdjustment setLeftArmOffset(ServerPlayer player, double x, double y, double z) {
      AnimationPoseAdjustment current = getAdjustment(player);
      AnimationPoseAdjustment updated = current.withLeftArm(current.leftArm().withOffset(x, y, z));
      return setAdjustment(player, updated);
   }

   public static AnimationPoseAdjustment setLeftArmRotation(ServerPlayer player, double x, double y, double z) {
      AnimationPoseAdjustment current = getAdjustment(player);
      AnimationPoseAdjustment updated = current.withLeftArm(current.leftArm().withRotation(x, y, z));
      return setAdjustment(player, updated);
   }

   public static AnimationPoseAdjustment setRightArmOffset(ServerPlayer player, double x, double y, double z) {
      AnimationPoseAdjustment current = getAdjustment(player);
      AnimationPoseAdjustment updated = current.withRightArm(current.rightArm().withOffset(x, y, z));
      return setAdjustment(player, updated);
   }

   public static AnimationPoseAdjustment setRightArmRotation(ServerPlayer player, double x, double y, double z) {
      AnimationPoseAdjustment current = getAdjustment(player);
      AnimationPoseAdjustment updated = current.withRightArm(current.rightArm().withRotation(x, y, z));
      return setAdjustment(player, updated);
   }

   public static AnimationPoseAdjustment setPoseScope(ServerPlayer player, PoseAdjustmentScope scope) {
      if (player != null && scope != null) {
         AnimationPoseAdjustment current = getAdjustment(player);
         return setAdjustment(player, current.withPoseScope(scope));
      } else {
         return AnimationPoseAdjustment.ZERO;
      }
   }

   public static AnimationPoseAdjustment setVisibilityMode(ServerPlayer player, ArmVisibilityMode mode) {
      if (player != null && mode != null) {
         AnimationPoseAdjustment current = getAdjustment(player);
         return setAdjustment(player, current.withVisibilityMode(mode));
      } else {
         return AnimationPoseAdjustment.ZERO;
      }
   }

   public static AnimationPoseAdjustment resetAdjustment(ServerPlayer player) {
      return setAdjustment(player, AnimationPoseAdjustment.ZERO);
   }

   public static ActiveAnimation snapshot(ServerPlayer player) {
      ActiveAnimation active = (ActiveAnimation)ACTIVE_BY_PLAYER.get(player.m_20148_());
      if (active == null) {
         return null;
      } else {
         AnimationPoseAdjustment adjustment = getAdjustment(player);
         if (active.entityId() == player.m_19879_() && active.adjustment().equals(adjustment)) {
            return active;
         } else {
            ActiveAnimation refreshed = new ActiveAnimation(player.m_19879_(), player.m_20148_(), active.animationId(), active.target(), active.startTick(), active.phaseDurationTicks(), adjustment);
            ACTIVE_BY_PLAYER.put(player.m_20148_(), refreshed);
            return refreshed;
         }
      }
   }

   public static Component describe(ServerPlayer player) {
      ActiveAnimation active = snapshot(player);
      AnimationPoseAdjustment adjustment = getAdjustment(player);
      String session = active == null ? "off" : "on";
      ArmPoseAdjustment left = adjustment.leftArm();
      ArmPoseAdjustment right = adjustment.rightArm();
      String scopeLabel = adjustment.poseScope().id();
      String visibilityLabel = adjustment.visibilityMode().id();
      MutableComponent var10000 = Component.m_237113_("[Edgerunner] ").m_130940_(ChatFormatting.AQUA).m_7220_(Component.m_237115_("text.project_edgerunner.cyberanimationsystem.arms_pose_for").m_130940_(ChatFormatting.WHITE));
      String var10001 = player.m_6302_();
      return var10000.m_7220_(Component.m_237113_(var10001 + " -> ").m_130940_(ChatFormatting.GRAY)).m_7220_(Component.m_237110_("text.project_edgerunner.cyberanimationsystem.session_s", new Object[]{session}).m_130940_(active == null ? ChatFormatting.DARK_GRAY : ChatFormatting.GREEN)).m_7220_(Component.m_237110_("text.project_edgerunner.cyberanimationsystem.view_s", new Object[]{scopeLabel}).m_130940_(ChatFormatting.GREEN)).m_7220_(Component.m_237110_("text.project_edgerunner.cyberanimationsystem.visible_s", new Object[]{visibilityLabel}).m_130940_(ChatFormatting.AQUA)).m_7220_(Component.m_237113_(String.format(Locale.ROOT, " L off=(%.3f,%.3f,%.3f) rot=(%.1f,%.1f,%.1f)", left.offsetX(), left.offsetY(), left.offsetZ(), left.rotationX(), left.rotationY(), left.rotationZ())).m_130940_(ChatFormatting.GOLD)).m_7220_(Component.m_237113_(String.format(Locale.ROOT, " R off=(%.3f,%.3f,%.3f) rot=(%.1f,%.1f,%.1f)", right.offsetX(), right.offsetY(), right.offsetZ(), right.rotationX(), right.rotationY(), right.rotationZ())).m_130940_(ChatFormatting.YELLOW));
   }

   public static void syncAllTo(ServerPlayer receiver) {
      if (receiver != null) {
         for(ActiveAnimation active : List.copyOf(ACTIVE_BY_PLAYER.values())) {
            CyberpunkNetwork.sendAnimationSync(receiver, CyberAnimationSyncPacket.active(active));
         }

      }
   }

   private static AnimationPoseAdjustment setAdjustment(ServerPlayer player, AnimationPoseAdjustment adjustment) {
      if (adjustment != null && !adjustment.isDefaultTuning()) {
         ADJUSTMENTS_BY_PLAYER.put(player.m_20148_(), adjustment);
         CyberAnimationDefinition definition = CyberAnimationRegistry.poseTuneDefinition();
         ActiveAnimation active = (ActiveAnimation)ACTIVE_BY_PLAYER.get(player.m_20148_());
         if (active == null) {
            active = new ActiveAnimation(player.m_19879_(), player.m_20148_(), definition.id(), definition.target(), player.m_284548_().m_46467_(), definition.phaseDurationTicks(), adjustment);
            ACTIVE_BY_PLAYER.put(player.m_20148_(), active);
         } else {
            active = new ActiveAnimation(player.m_19879_(), player.m_20148_(), active.animationId(), active.target(), active.startTick(), active.phaseDurationTicks(), adjustment);
            ACTIVE_BY_PLAYER.put(player.m_20148_(), active);
         }

         broadcast(active);
         return adjustment;
      } else {
         ADJUSTMENTS_BY_PLAYER.remove(player.m_20148_());
         adjustment = AnimationPoseAdjustment.ZERO;
         ActiveAnimation had = (ActiveAnimation)ACTIVE_BY_PLAYER.remove(player.m_20148_());
         if (had != null) {
            broadcastStop(player);
         }

         return adjustment;
      }
   }

   private static void broadcast(ActiveAnimation active) {
      CyberAnimationSyncPacket packet = CyberAnimationSyncPacket.active(active);

      for(ServerPlayer receiver : List.copyOf(activePlayers(active))) {
         CyberpunkNetwork.sendAnimationSync(receiver, packet);
      }

   }

   private static void broadcastStop(ServerPlayer player) {
      CyberAnimationSyncPacket packet = CyberAnimationSyncPacket.stopped(player);

      for(ServerPlayer receiver : List.copyOf(player.f_8924_.m_6846_().m_11314_())) {
         CyberpunkNetwork.sendAnimationSync(receiver, packet);
      }

   }

   private static List<ServerPlayer> activePlayers(ActiveAnimation active) {
      ServerPlayer owner = findPlayer(active.playerId());
      return owner != null && owner.f_8924_ != null ? owner.f_8924_.m_6846_().m_11314_() : List.of();
   }

   @Nullable
   private static ServerPlayer findPlayer(UUID playerId) {
      MinecraftServer server = ServerLifecycleHooks.getCurrentServer();
      return server == null ? null : server.m_6846_().m_11259_(playerId);
   }

   @SubscribeEvent
   public static void onPlayerLogin(PlayerEvent.PlayerLoggedInEvent event) {
      Player var2 = event.getEntity();
      if (var2 instanceof ServerPlayer player) {
         if (!player.m_9236_().f_46443_) {
            syncAllTo(player);
         }
      }

   }

   @SubscribeEvent
   public static void onPlayerLogout(PlayerEvent.PlayerLoggedOutEvent event) {
      Player var2 = event.getEntity();
      if (var2 instanceof ServerPlayer player) {
         if (!player.m_9236_().f_46443_) {
            ACTIVE_BY_PLAYER.remove(player.m_20148_());
            ADJUSTMENTS_BY_PLAYER.remove(player.m_20148_());
            broadcastStop(player);
         }
      }

   }

   @SubscribeEvent
   public static void onLivingDeath(LivingDeathEvent event) {
      LivingEntity var2 = event.getEntity();
      if (var2 instanceof ServerPlayer player) {
         if (!player.m_9236_().f_46443_) {
            stopPoseTune(player);
         }
      }

   }

   @SubscribeEvent
   public static void onServerStopping(ServerStoppingEvent event) {
      ACTIVE_BY_PLAYER.clear();
      ADJUSTMENTS_BY_PLAYER.clear();
   }
}
