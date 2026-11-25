package com.edgerunner.client;

import com.edgerunner.berserk.BerserkVariant;
import com.edgerunner.util.PlayerScoreHelper;
import javax.annotation.Nullable;
import net.minecraft.world.entity.player.Player;

public final class BerserkClientState {
   private BerserkClientState() {
   }

   @Nullable
   public static BerserkVariant resolveVariant(@Nullable Player player) {
      return BerserkVariant.byNetworkId(score(player, "er_bz_variant"));
   }

   public static boolean isInstalled(@Nullable Player player) {
      return resolveVariant(player) != null;
   }

   public static boolean isActive(@Nullable Player player) {
      return score(player, "er_bz_active") > 0;
   }

   public static int score(@Nullable Player player, String objective) {
      return PlayerScoreHelper.getScore(player, objective);
   }
}
