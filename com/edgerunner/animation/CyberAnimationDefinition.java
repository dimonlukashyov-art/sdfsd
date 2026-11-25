package com.edgerunner.animation;

import java.util.EnumSet;
import java.util.Set;
import net.minecraft.resources.ResourceLocation;

public record CyberAnimationDefinition(ResourceLocation id, AnimationTarget target, int phaseDurationTicks, ResourceLocation geckoRenderLayer, String geckoController, String geckoPhaseA, String geckoPhaseB, Set<AnimationChannel> channels) {
   public CyberAnimationDefinition(ResourceLocation id, AnimationTarget target, int phaseDurationTicks, ResourceLocation geckoRenderLayer, String geckoController, String geckoPhaseA, String geckoPhaseB, Set<AnimationChannel> channels) {
      phaseDurationTicks = Math.max(1, phaseDurationTicks);
      geckoController = geckoController != null && !geckoController.isBlank() ? geckoController : "main";
      geckoPhaseA = geckoPhaseA != null && !geckoPhaseA.isBlank() ? geckoPhaseA : "idle_a";
      geckoPhaseB = geckoPhaseB != null && !geckoPhaseB.isBlank() ? geckoPhaseB : "idle_b";
      Set<AnimationChannel> var13 = channels != null && !channels.isEmpty() ? EnumSet.copyOf(channels) : EnumSet.noneOf(AnimationChannel.class);
      this.id = id;
      this.target = target;
      this.phaseDurationTicks = phaseDurationTicks;
      this.geckoRenderLayer = geckoRenderLayer;
      this.geckoController = geckoController;
      this.geckoPhaseA = geckoPhaseA;
      this.geckoPhaseB = geckoPhaseB;
      this.channels = var13;
   }

   public String phaseName(long worldTick, long startTick) {
      long elapsed = Math.max(0L, worldTick - startTick);
      long phaseIndex = elapsed / (long)this.phaseDurationTicks % 2L;
      return phaseIndex == 0L ? this.geckoPhaseA : this.geckoPhaseB;
   }
}
