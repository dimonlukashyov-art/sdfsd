package com.edgerunner.animation;

import java.util.Locale;

public enum ArmVisibilityMode {
   AUTO,
   LEFT,
   RIGHT,
   BOTH;

   public String id() {
      return this.name().toLowerCase(Locale.ROOT);
   }

   public boolean forcesLeft() {
      return this == LEFT || this == BOTH;
   }

   public boolean forcesRight() {
      return this == RIGHT || this == BOTH;
   }

   public static ArmVisibilityMode byId(String id) {
      if (id != null && !id.isBlank()) {
         ArmVisibilityMode var10000;
         switch (id.trim().toLowerCase(Locale.ROOT)) {
            case "auto":
            case "default":
            case "vanilla":
               var10000 = AUTO;
               break;
            case "left":
            case "l":
               var10000 = LEFT;
               break;
            case "right":
            case "r":
               var10000 = RIGHT;
               break;
            case "both":
            case "all":
            case "two":
            case "2":
               var10000 = BOTH;
               break;
            default:
               var10000 = AUTO;
         }

         return var10000;
      } else {
         return AUTO;
      }
   }

   // $FF: synthetic method
   private static ArmVisibilityMode[] $values() {
      return new ArmVisibilityMode[]{AUTO, LEFT, RIGHT, BOTH};
   }
}
