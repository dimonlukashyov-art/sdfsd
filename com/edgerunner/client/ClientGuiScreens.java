package com.edgerunner.client;

import com.edgerunner.gui.ClientGuiId;
import java.util.EnumMap;
import java.util.Map;
import java.util.function.Supplier;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.screens.Screen;

public final class ClientGuiScreens {
   private static final Map<ClientGuiId, Supplier<Screen>> FACTORIES = new EnumMap(ClientGuiId.class);

   private ClientGuiScreens() {
   }

   public static void register(ClientGuiId id, Supplier<Screen> factory) {
      if (id != null && factory != null) {
         FACTORIES.put(id, factory);
      }

   }

   public static void open(String rawId) {
      ClientGuiId.find(rawId).ifPresent(ClientGuiScreens::open);
   }

   public static void open(ClientGuiId id) {
      Minecraft minecraft = Minecraft.m_91087_();
      Supplier<Screen> factory = (Supplier)FACTORIES.get(id);
      if (minecraft != null && factory != null) {
         minecraft.m_91152_((Screen)factory.get());
      }
   }

   static {
      register(ClientGuiId.EYES, () -> new FaceOverlayLoadSetupScreen(true));
   }
}
