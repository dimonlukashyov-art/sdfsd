package com.edgerunner.berserk;

import com.edgerunner.sandevistan.TemporalBodyClock;
import com.edgerunner.sandevistan.TemporalHooks;
import com.edgerunner.sandevistan.TemporalTickClock;
import java.util.HashMap;
import java.util.Map;
import java.util.WeakHashMap;
import net.minecraft.server.level.ServerPlayer;

public final class CyberwareAttackClock {
   private static final Map<ServerPlayer, State> CLOCKS = new WeakHashMap();

   private CyberwareAttackClock() {
   }

   public static double rate(ServerPlayer player) {
      return TemporalHooks.getBodyActionSpeedScale(player) * BerserkRuntime.attackSpeedMultiplier(player);
   }

   public static double time(ServerPlayer player) {
      return ((State)CLOCKS.computeIfAbsent(player, (p) -> new State())).timeline.advance(rate(player), player.m_284548_().m_46467_());
   }

   public static double delta(ServerPlayer player) {
      time(player);
      return ((State)CLOCKS.get(player)).timeline.delta();
   }

   public static int ticks(ServerPlayer player, long salt) {
      return ((TemporalTickClock)((State)CLOCKS.computeIfAbsent(player, (p) -> new State())).ticks.computeIfAbsent(salt, (id) -> new TemporalTickClock())).advance(rate(player), player.m_284548_().m_46467_(), 1);
   }

   private static final class State {
      final TemporalBodyClock timeline = new TemporalBodyClock();
      final Map<Long, TemporalTickClock> ticks = new HashMap();
   }
}
