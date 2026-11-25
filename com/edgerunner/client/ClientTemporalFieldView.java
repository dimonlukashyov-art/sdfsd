package com.edgerunner.client;

import com.edgerunner.sandevistan.TemporalBubble;
import com.edgerunner.sandevistan.TemporalLocalState;
import com.edgerunner.sandevistan.TemporalMath;
import com.edgerunner.sandevistan.TemporalObservedPlayerState;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import net.minecraft.client.Minecraft;
import net.minecraft.core.BlockPos;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.resources.ResourceKey;
import net.minecraft.world.level.Level;

public final class ClientTemporalFieldView {
   private static volatile Map<UUID, TemporalBubble> BUBBLES = Map.of();
   private static volatile Map<UUID, TemporalObservedPlayerState> OBSERVED_PLAYERS = Map.of();
   private static volatile TemporalLocalState localState;

   private ClientTemporalFieldView() {
   }

   public static void applyBubbleSnapshot(List<CompoundTag> tags, ResourceKey<Level> fallbackDimension) {
      Map<UUID, TemporalBubble> updated = new LinkedHashMap();

      for(CompoundTag tag : tags) {
         TemporalBubble bubble = TemporalBubble.fromTag(tag, fallbackDimension);
         updated.put(bubble.bubbleId(), bubble);
      }

      if (updated.isEmpty()) {
         BUBBLES = Map.of();
      } else {
         BUBBLES = Collections.unmodifiableMap(updated);
      }

   }

   public static void setLocalState(TemporalLocalState state) {
      localState = state == null ? TemporalLocalState.EMPTY : state;
   }

   public static void applyNearbyPlayerVisualSnapshot(List<TemporalObservedPlayerState> players) {
      if (players == null) {
         OBSERVED_PLAYERS = Map.of();
      } else {
         Map<UUID, TemporalObservedPlayerState> updated = new LinkedHashMap();

         for(TemporalObservedPlayerState state : players) {
            if (state != null && state.playerId() != null) {
               updated.put(state.playerId(), state);
            }
         }

         OBSERVED_PLAYERS = updated.isEmpty() ? Map.of() : Collections.unmodifiableMap(updated);
      }
   }

   public static TemporalLocalState getLocalState() {
      return localState;
   }

   public static TemporalObservedPlayerState getObservedPlayerState(UUID playerId) {
      return playerId == null ? null : (TemporalObservedPlayerState)OBSERVED_PLAYERS.get(playerId);
   }

   public static boolean isEntityTintActive(UUID playerId) {
      if (playerId == null) {
         return false;
      } else {
         TemporalObservedPlayerState state = (TemporalObservedPlayerState)OBSERVED_PLAYERS.get(playerId);
         return state != null && state.entityTintActive();
      }
   }

   public static boolean hasBubbles() {
      return !BUBBLES.isEmpty();
   }

   public static String getOwnedSandevistanPowerId(UUID playerId) {
      for(TemporalBubble bubble : BUBBLES.values()) {
         if (playerId.equals(bubble.ownerId()) && !bubble.sourcePowerId().isBlank()) {
            return bubble.sourcePowerId();
         }
      }

      return "";
   }

   public static double queryWorldSlowPctAt(BlockPos pos) {
      return queryWorldSlowPctAt((double)pos.m_123341_() + (double)0.5F, (double)pos.m_123343_() + (double)0.5F);
   }

   public static double queryWorldSlowPctAt(double x, double z) {
      if (BUBBLES.isEmpty()) {
         return (double)0.0F;
      } else {
         double slow = (double)0.0F;

         for(TemporalBubble bubble : BUBBLES.values()) {
            if (bubble.contains(x, z, 1.0E-4)) {
               slow = Math.max(slow, bubble.slowPct());
            }
         }

         return slow;
      }
   }

   public static double queryWorldSpeedScaleAt(BlockPos pos) {
      return TemporalMath.speedScaleFromSlow(queryWorldSlowPctAt(pos));
   }

   public static double queryWorldSpeedScaleAt(double x, double z) {
      return TemporalMath.speedScaleFromSlow(queryWorldSlowPctAt(x, z));
   }

   public static double queryOwnSlowPctAt(UUID ownerId, BlockPos pos) {
      return queryOwnSlowPctAt(ownerId, (double)pos.m_123341_() + (double)0.5F, (double)pos.m_123343_() + (double)0.5F);
   }

   public static double queryOwnSlowPctAt(UUID ownerId, double x, double z) {
      if (ownerId != null && !BUBBLES.isEmpty()) {
         double slow = (double)0.0F;

         for(TemporalBubble bubble : BUBBLES.values()) {
            if (ownerId.equals(bubble.ownerId()) && bubble.contains(x, z, 1.0E-4)) {
               slow = Math.max(slow, bubble.slowPct());
            }
         }

         return slow;
      } else {
         return (double)0.0F;
      }
   }

   public static double queryEffectiveSlowPctForPlayer(UUID playerId, BlockPos pos) {
      return queryEffectiveSlowPctForPlayer(playerId, (double)pos.m_123341_() + (double)0.5F, (double)pos.m_123343_() + (double)0.5F);
   }

   public static double queryEffectiveSlowPctForPlayer(UUID playerId, double x, double z) {
      TemporalObservedPlayerState observed = getObservedPlayerState(playerId);
      if (observed != null) {
         return observed.playerState().effectiveSlowPct();
      } else {
         return playerId != null && playerId.equals(ClientTemporalFieldView.ClientMinecraftAccess.localPlayerId()) ? localState.effectiveSlowPct() : TemporalMath.resolveEffectiveSlow(queryWorldSlowPctAt(x, z), queryOwnSlowPctAt(playerId, x, z));
      }
   }

   public static double queryEffectiveSpeedScaleForPlayer(UUID playerId, BlockPos pos) {
      return TemporalMath.speedScaleFromSlow(queryEffectiveSlowPctForPlayer(playerId, pos));
   }

   public static double queryEffectiveSpeedScaleForPlayer(UUID playerId, double x, double z) {
      return TemporalMath.speedScaleFromSlow(queryEffectiveSlowPctForPlayer(playerId, x, z));
   }

   public static boolean hasFrozenLocalPlayer() {
      return localState.frozen();
   }

   public static void clear() {
      BUBBLES = Map.of();
      OBSERVED_PLAYERS = Map.of();
      localState = TemporalLocalState.EMPTY;
   }

   static {
      localState = TemporalLocalState.EMPTY;
   }

   private static final class ClientMinecraftAccess {
      private static UUID localPlayerId() {
         Minecraft mc = Minecraft.m_91087_();
         return mc.f_91074_ == null ? null : mc.f_91074_.m_20148_();
      }
   }
}
