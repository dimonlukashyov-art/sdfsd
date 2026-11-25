package com.edgerunner.animation;

import java.util.Collection;
import java.util.Collections;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import net.minecraft.resources.ResourceLocation;

public final class CyberAnimationRegistry {
   public static final ResourceLocation POSE_TUNING_ID = ResourceLocation.fromNamespaceAndPath("project_edgerunner", "pose_tune");
   private static final ResourceLocation PLACEHOLDER_GECKO_LAYER = ResourceLocation.fromNamespaceAndPath("project_edgerunner", "pose_tune_unused_layer");
   private static final Map<ResourceLocation, CyberAnimationDefinition> DEFINITIONS = new LinkedHashMap();

   private CyberAnimationRegistry() {
   }

   private static void register(CyberAnimationDefinition definition) {
      DEFINITIONS.put(definition.id(), definition);
   }

   public static Optional<CyberAnimationDefinition> get(ResourceLocation id) {
      return Optional.ofNullable((CyberAnimationDefinition)DEFINITIONS.get(id));
   }

   public static CyberAnimationDefinition poseTuneDefinition() {
      return (CyberAnimationDefinition)DEFINITIONS.get(POSE_TUNING_ID);
   }

   public static Collection<CyberAnimationDefinition> allDefinitions() {
      return Collections.unmodifiableCollection(DEFINITIONS.values());
   }

   static {
      register(new CyberAnimationDefinition(POSE_TUNING_ID, AnimationTarget.ENTITY, 1000000, PLACEHOLDER_GECKO_LAYER, "main", "idle_a", "idle_b", EnumSet.noneOf(AnimationChannel.class)));
   }
}
