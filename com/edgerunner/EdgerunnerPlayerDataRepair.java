package com.edgerunner;

import com.edgerunner.cyberware.CyberwarePowerReconcile;
import com.edgerunner.cyberware.CyberwareSavedDataHydrator;
import com.edgerunner.cyberware.CyberwareSyncService;
import com.edgerunner.util.CyberwareDataUtil;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.server.level.ServerPlayer;

public final class EdgerunnerPlayerDataRepair {
   private static final String ROOT_TAG = "CyberpunkRipperdocGui";

   private EdgerunnerPlayerDataRepair() {
   }

   public static RepairResult repair(ServerPlayer player) {
      if (player != null && !player.m_9236_().m_5776_()) {
         int powersStripped = EdgerunnerPalladiumCleanup.removeAllKnownPowers(player);
         int menuSlotCount = countSavedMenuSlots(player);
         boolean menuHydrated = CyberwareSavedDataHydrator.hydrateFromSavedMenuIfNeeded(player);
         CyberwarePowerReconcile.reconcile(player);
         CyberwareSyncService.syncInstalledStateAndHud(player);
         return new RepairResult(powersStripped, menuHydrated, menuSlotCount);
      } else {
         return new RepairResult(0, false, 0);
      }
   }

   private static int countSavedMenuSlots(ServerPlayer player) {
      CompoundTag persistent = player.getPersistentData();
      if (!persistent.m_128425_("CyberpunkRipperdocGui", 10)) {
         return 0;
      } else {
         CompoundTag menuRoot = persistent.m_128469_("CyberpunkRipperdocGui");
         int count = 0;

         for(int slot = 0; slot < 20; ++slot) {
            String key = "Slot" + slot;
            if (menuRoot.m_128425_(key, 10)) {
               ++count;
            }
         }

         return count;
      }
   }

   public static boolean hasSavedMenuItems(ServerPlayer player) {
      return countSavedMenuSlots(player) > 0;
   }

   public static boolean hasCanonicalInstallation(ServerPlayer player) {
      return CyberwareDataUtil.hasInstalledCyberware(player.getPersistentData());
   }

   public static record RepairResult(int powersStripped, boolean menuHydrated, int menuSlotCount) {
   }
}
