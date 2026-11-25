package com.edgerunner.animation;

import java.util.Locale;

public enum AnimationTarget {
   ARMOR_LEFT_ARM("armorLeftArm"),
   ARMOR_RIGHT_ARM("armorRightArm"),
   ENTITY("entity"),
   ITEM("item");

   private final String id;

   private AnimationTarget(String id) {
      this.id = id;
   }

   public String id() {
      return this.id;
   }

   public static AnimationTarget byId(String id) {
      if (id != null && !id.isBlank()) {
         String normalized = id.trim().toLowerCase(Locale.ROOT);

         for(AnimationTarget target : values()) {
            if (target.id.toLowerCase(Locale.ROOT).equals(normalized)) {
               return target;
            }
         }

         return ENTITY;
      } else {
         return ENTITY;
      }
   }

   // $FF: synthetic method
   private static AnimationTarget[] $values() {
      return new AnimationTarget[]{ARMOR_LEFT_ARM, ARMOR_RIGHT_ARM, ENTITY, ITEM};
   }
}
