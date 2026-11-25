package com.edgerunner.client;

import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.ComponentContents;
import net.minecraft.network.chat.contents.TranslatableContents;

public final class ClientLocalization {
   private ClientLocalization() {
   }

   public static String text(String key, Object... arguments) {
      return Component.m_237110_(key, arguments).getString();
   }

   public static boolean isTierLoadLine(Component component) {
      ComponentContents var2 = component.m_214077_();
      if (var2 instanceof TranslatableContents contents) {
         if (contents.m_237508_().startsWith("tooltip.project_edgerunner.item.") && contents.m_237508_().endsWith(".tier_load")) {
            return true;
         }
      }

      String value = component.getString();
      return value.contains("Tier:") || value.contains("Load:");
   }
}
