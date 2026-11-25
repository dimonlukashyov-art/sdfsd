package com.edgerunner.client;

import net.minecraft.client.gui.screens.Screen;

public final class CyberwareModifierKeys {
   private CyberwareModifierKeys() {
   }

   public static boolean isHeld() {
      return Screen.m_96639_();
   }
}
