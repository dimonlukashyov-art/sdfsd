package com.edgerunner.animation.bedrock;

import com.edgerunner.network.CyberpunkNetwork;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraftforge.event.entity.living.LivingDeathEvent;
import net.minecraftforge.event.entity.player.PlayerEvent;
import net.minecraftforge.event.server.ServerStoppingEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod.EventBusSubscriber;
import net.minecraftforge.fml.common.Mod.EventBusSubscriber.Bus;

@EventBusSubscriber(
   modid = "project_edgerunner",
   bus = Bus.FORGE
)
public final class BedrockAnimRuntime {
   private static final Map<UUID, ActiveClip> ACTIVE = new ConcurrentHashMap();

   private BedrockAnimRuntime() {
   }

   public static void play(ServerPlayer player, ResourceLocation animationId, boolean loop, float speed) {
      if (player != null && animationId != null) {
         long startTick = player.m_284548_().m_46467_();
         ActiveClip clip = new ActiveClip(animationId, startTick, loop, speed);
         ACTIVE.put(player.m_20148_(), clip);
         broadcast(player, new BedrockAnimSyncPacket(player.m_19879_(), player.m_20148_(), true, animationId, startTick, loop, speed));
      }
   }

   public static boolean stop(ServerPlayer player) {
      if (player == null) {
         return false;
      } else {
         ActiveClip removed = (ActiveClip)ACTIVE.remove(player.m_20148_());
         broadcast(player, BedrockAnimSyncPacket.stopped(player.m_19879_(), player.m_20148_()));
         return removed != null;
      }
   }

   public static ActiveClip current(ServerPlayer player) {
      return player == null ? null : (ActiveClip)ACTIVE.get(player.m_20148_());
   }

   public static void syncAllTo(ServerPlayer receiver) {
      if (receiver != null && receiver.f_8924_ != null) {
         for(Map.Entry<UUID, ActiveClip> entry : ACTIVE.entrySet()) {
            ServerPlayer owner = receiver.f_8924_.m_6846_().m_11259_((UUID)entry.getKey());
            if (owner != null) {
               ActiveClip clip = (ActiveClip)entry.getValue();
               CyberpunkNetwork.sendBedrockAnimSync(receiver, new BedrockAnimSyncPacket(owner.m_19879_(), owner.m_20148_(), true, clip.animationId(), clip.startTick(), clip.loop(), clip.speed()));
            }
         }

      }
   }

   private static void broadcast(ServerPlayer source, BedrockAnimSyncPacket packet) {
      if (source.f_8924_ != null) {
         for(ServerPlayer receiver : List.copyOf(source.f_8924_.m_6846_().m_11314_())) {
            CyberpunkNetwork.sendBedrockAnimSync(receiver, packet);
         }

      }
   }

   @SubscribeEvent
   public static void onLogin(PlayerEvent.PlayerLoggedInEvent event) {
      Player var2 = event.getEntity();
      if (var2 instanceof ServerPlayer player) {
         if (!player.m_9236_().f_46443_) {
            syncAllTo(player);
         }
      }

   }

   @SubscribeEvent
   public static void onLogout(PlayerEvent.PlayerLoggedOutEvent event) {
      Player var2 = event.getEntity();
      if (var2 instanceof ServerPlayer player) {
         if (!player.m_9236_().f_46443_) {
            ACTIVE.remove(player.m_20148_());
            broadcast(player, BedrockAnimSyncPacket.stopped(player.m_19879_(), player.m_20148_()));
         }
      }

   }

   @SubscribeEvent
   public static void onDeath(LivingDeathEvent event) {
      LivingEntity var2 = event.getEntity();
      if (var2 instanceof ServerPlayer player) {
         if (!player.m_9236_().f_46443_) {
            stop(player);
         }
      }

   }

   @SubscribeEvent
   public static void onServerStopping(ServerStoppingEvent event) {
      ACTIVE.clear();
   }

   public static record ActiveClip(ResourceLocation animationId, long startTick, boolean loop, float speed) {
   }
}
