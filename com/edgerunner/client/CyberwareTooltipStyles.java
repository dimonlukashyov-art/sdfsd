package com.edgerunner.client;

import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.Style;
import net.minecraft.network.chat.TextColor;

public final class CyberwareTooltipStyles {
   public static final TextColor DESCRIPTION_COLOR = TextColor.m_131266_(6737151);

   private CyberwareTooltipStyles() {
   }

   public static Component description(String text) {
      return Component.m_237113_(text).m_130948_(Style.f_131099_.m_131148_(DESCRIPTION_COLOR));
   }

   public static Component attribute(String text) {
      return Component.m_237113_(text).m_130940_(ChatFormatting.GRAY);
   }
}
