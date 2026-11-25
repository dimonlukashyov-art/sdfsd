package com.edgerunner.client;

import net.minecraft.client.KeyMapping;
import net.minecraft.client.Minecraft;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.InputEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod.EventBusSubscriber;
import net.minecraftforge.fml.common.Mod.EventBusSubscriber.Bus;

@EventBusSubscriber(
   modid = "project_edgerunner",
   value = {Dist.CLIENT},
   bus = Bus.FORGE
)
public final class ClientInputTracker {
   private static final long JUMP_BUFFER_NANOS = 150000000L;
   private static volatile long jumpQueuedUntilNanos = 0L;

   private ClientInputTracker() {
   }

   public static boolean consumeJumpBuffer() {
      long now = System.nanoTime();
      if (now <= jumpQueuedUntilNanos) {
         jumpQueuedUntilNanos = 0L;
         return true;
      } else {
         return false;
      }
   }

   public static void clearJumpBuffer() {
      jumpQueuedUntilNanos = 0L;
   }

   private static void queueJump() {
      jumpQueuedUntilNanos = System.nanoTime() + 150000000L;
   }

   @SubscribeEvent
   public static void onKeyInput(InputEvent.Key event) {
      if (event.getAction() == 1 || event.getAction() == 2) {
         Minecraft mc = Minecraft.m_91087_();
         if (mc != null && mc.f_91066_ != null && mc.f_91080_ == null) {
            KeyMapping jump = mc.f_91066_.f_92089_;
            if (jump != null && jump.m_90832_(event.getKey(), event.getScanCode())) {
               queueJump();
            }

         }
      }
   }

   @SubscribeEvent
   public static void onMouseInput(InputEvent.MouseButton event) {
      if (event.getAction() == 1) {
         Minecraft mc = Minecraft.m_91087_();
         if (mc != null && mc.f_91066_ != null && mc.f_91080_ == null) {
            KeyMapping jump = mc.f_91066_.f_92089_;
            if (jump != null && jump.m_90830_(event.getButton())) {
               queueJump();
            }

         }
      }
   }
}
