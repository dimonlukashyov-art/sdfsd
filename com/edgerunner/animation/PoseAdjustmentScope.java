package com.edgerunner.animation;

import java.util.Locale;

public enum PoseAdjustmentScope {
   FIRST_PERSON,
   THIRD_PERSON,
   BOTH;

   public boolean affectsFirstPerson() {
      return this == FIRST_PERSON || this == BOTH;
   }

   public boolean affectsThirdPerson() {
      return this == THIRD_PERSON || this == BOTH;
   }

   public String id() {
      return this.name().toLowerCase(Locale.ROOT);
   }

   public static PoseAdjustmentScope byId(String id) {
      if (id != null && !id.isBlank()) {
         PoseAdjustmentScope var10000;
         switch (id.trim().toLowerCase(Locale.ROOT)) {
            case "firstperson":
            case "1p":
            case "fp":
               var10000 = FIRST_PERSON;
               break;
            case "thirdperson":
            case "3p":
            case "tp":
               var10000 = THIRD_PERSON;
               break;
            case "both":
            case "all":
               var10000 = BOTH;
               break;
            default:
               var10000 = BOTH;
         }

         return var10000;
      } else {
         return BOTH;
      }
   }

   // $FF: synthetic method
   private static PoseAdjustmentScope[] $values() {
      return new PoseAdjustmentScope[]{FIRST_PERSON, THIRD_PERSON, BOTH};
   }
}
