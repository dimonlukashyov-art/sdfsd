package com.edgerunner.animation;

import java.util.UUID;
import net.minecraft.resources.ResourceLocation;

public record ActiveAnimation(int entityId, UUID playerId, ResourceLocation animationId, AnimationTarget target, long startTick, int phaseDurationTicks, AnimationPoseAdjustment adjustment) {
   public ActiveAnimation(int entityId, UUID playerId, ResourceLocation animationId, AnimationTarget target, long startTick, int phaseDurationTicks, AnimationPoseAdjustment adjustment) {
      phaseDurationTicks = Math.max(1, phaseDurationTicks);
      adjustment = adjustment == null ? AnimationPoseAdjustment.ZERO : adjustment;
      this.entityId = entityId;
      this.playerId = playerId;
      this.animationId = animationId;
      this.target = target;
      this.startTick = startTick;
      this.phaseDurationTicks = phaseDurationTicks;
      this.adjustment = adjustment;
   }

   public String phaseName(long worldTick) {
      return (String)CyberAnimationRegistry.get(this.animationId).map((definition) -> definition.phaseName(worldTick, this.startTick)).orElse("unknown");
   }
}
