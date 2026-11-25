package com.edgerunner.client;

import com.mojang.blaze3d.platform.InputConstants;
import com.mojang.blaze3d.platform.InputConstants.Type;
import net.minecraft.client.KeyMapping;
import net.minecraft.client.Minecraft;
import net.minecraft.network.chat.Component;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.event.TickEvent.Phase;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod.EventBusSubscriber;
import net.minecraftforge.fml.common.Mod.EventBusSubscriber.Bus;
import net.threetag.palladium.client.PalladiumKeyMappings;

@EventBusSubscriber(
   modid = "project_edgerunner",
   value = {Dist.CLIENT},
   bus = Bus.FORGE
)
public final class CyberwareAbilityBarPeek {
   static final long PEEK_MS = 3000L;
   private static long lastInteraction = -3000L;
   public static final KeyMapping TOGGLE_KEY;
   private static final float LOGO_GAP = 27.0F;

   private CyberwareAbilityBarPeek() {
   }

   @SubscribeEvent
   public static void onClientTick(TickEvent.ClientTickEvent event) {
      if (event.phase == Phase.END && Minecraft.m_91087_().f_91074_ != null) {
         while(TOGGLE_KEY.m_90859_()) {
            boolean show = !barVisible();
            HudModeConfig.mutateAndSave((config) -> config.abilityBar = show ? HudModeConfig.AbilityBar.ALWAYS : HudModeConfig.AbilityBar.HIDDEN);
            Minecraft.m_91087_().f_91065_.m_93063_(Component.m_237113_(show ? "CYBERWARE BAR ON" : "CYBERWARE BAR OFF"), false);
         }

         for(KeyMapping key : PalladiumKeyMappings.ABILITY_KEYS) {
            if (key != null && key.m_90857_()) {
               lastInteraction = now();
               return;
            }
         }

      }
   }

   public static boolean barVisible() {
      return visible(HudModeConfig.get().abilityBarPolicy(), Minecraft.m_91087_().f_91080_ != null, now() - lastInteraction);
   }

   static boolean visible(HudModeConfig.AbilityBar policy, boolean screenOpen, long idleMs) {
      boolean var10000;
      switch (policy) {
         case AUTO:
         case ALWAYS:
            var10000 = true;
            break;
         case HIDDEN:
            var10000 = false;
            break;
         case PEEK:
            var10000 = screenOpen || idleMs < 3000L;
            break;
         default:
            throw new IncompatibleClassChangeError();
      }

      return var10000;
   }

   public static float logoShift(boolean top) {
      return HudModeConfig.get().hidesAbilityBarLogo() ? (top ? -27.0F : 27.0F) : 0.0F;
   }

   private static long now() {
      return System.nanoTime() / 1000000L;
   }

   static {
      TOGGLE_KEY = new KeyMapping("key.project_edgerunner.ability_bar", Type.KEYSYM, InputConstants.f_84822_.m_84873_(), "key.categories.project_edgerunner");
   }
}
