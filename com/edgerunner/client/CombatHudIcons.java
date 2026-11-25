package com.edgerunner.client;

public final class CombatHudIcons {
   private CombatHudIcons() {
   }

   public static Asset resolve(CombatHudModel.StatusCard card) {
      String var10000;
      switch (card.hardware().itemId()) {
         case "project_edgerunner:berserk_moore_tech":
            var10000 = "os_berserk_moore_tech";
            break;
         case "project_edgerunner:berserk_biodyne":
            var10000 = "os_berserk_biodyne";
            break;
         case "project_edgerunner:berserk_zetatech":
            var10000 = "os_berserk_zetatech";
            break;
         case "project_edgerunner:berserk_militech":
            var10000 = "os_berserk_militech";
            break;
         case "project_edgerunner:sandevistan_zetatech":
            var10000 = "os_zetatech";
            break;
         case "project_edgerunner:sandevistan_dynalar":
            var10000 = "os_dynalar";
            break;
         case "project_edgerunner:sandevistan_warp_dancer":
            var10000 = "os_warp_dancer";
            break;
         case "project_edgerunner:sandevistan_falcon":
            var10000 = "os_falcon";
            break;
         case "project_edgerunner:sandevistan_apogee":
            var10000 = "os_apogee";
            break;
         case "project_edgerunner:clairvoyant":
            var10000 = "face_clairvoyant";
            break;
         case "project_edgerunner:doomsayer":
            var10000 = "face_doomsayer";
            break;
         case "project_edgerunner:stalker":
            var10000 = "face_stalker";
            break;
         case "project_edgerunner:the_oracle":
            var10000 = "face_oracle";
            break;
         case "project_edgerunner:mantis_blades":
            var10000 = "arms_mantis";
            break;
         default:
            switch (card.icon()) {
               case BERSERK:
               case SANDEVISTAN:
                  var10000 = "os";
                  break;
               case SCAN:
                  var10000 = "face_none";
                  break;
               case BLOOD:
                  var10000 = "circulatory_bloodpump";
                  break;
               case FURY:
                  var10000 = "arms_gorilla";
                  break;
               case FRENZY:
                  var10000 = "arms_mantis";
                  break;
               default:
                  throw new IncompatibleClassChangeError();
            }
      }

      String name = var10000;
      return new Asset("textures/icons/" + name + ".png", name.equals("circulatory_bloodpump") ? 32 : 16);
   }

   public static record Asset(String path, int size) {
   }
}
