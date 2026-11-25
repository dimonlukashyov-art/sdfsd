package com.edgerunner.client;

import com.edgerunner.EdgerunnerMod;
import com.edgerunner.client.afterimage.AfterImageManager;
import com.edgerunner.sandevistan.TemporalClientHooks;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.ClientPlayerNetworkEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod.EventBusSubscriber;

@EventBusSubscriber(
   modid = "project_edgerunner",
   value = {Dist.CLIENT}
)
public final class ClientTickrateEvents {
   private ClientTickrateEvents() {
   }

   @SubscribeEvent
   public static void onClientLogin(ClientPlayerNetworkEvent.LoggingIn event) {
      TemporalClientHooks.clear();
      EdgerunnerMod.LOGGER.debug("[Edgerunner] Temporal client field reset on login");
   }

   @SubscribeEvent
   public static void onClientLogout(ClientPlayerNetworkEvent.LoggingOut event) {
      TemporalClientHooks.clear();
      AfterImageManager.INSTANCE.clear();
   }
}
