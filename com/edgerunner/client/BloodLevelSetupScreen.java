package com.edgerunner.client;

import com.edgerunner.client.mantis.MantisBloodFxConfig;
import com.edgerunner.content.painting.gui.CyberTheme;
import com.edgerunner.content.painting.gui.NeonButton;
import java.util.Locale;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;
import net.minecraft.util.Mth;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.event.TickEvent.Phase;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod.EventBusSubscriber;
import net.minecraftforge.fml.common.Mod.EventBusSubscriber.Bus;

public final class BloodLevelSetupScreen extends Screen {
   private static final String TITLE_TEXT = "BLOOD";
   private static final int FRAME_X = 8;
   private static final int FRAME_Y = 6;
   private static final int MARGIN = 16;
   private static final int BUTTON_HEIGHT = 13;
   private static final int CONTINUE_WIDTH = 108;
   private static final int TITLE_Y = 11;
   private static final int LEVEL_WIDTH = 64;
   private static final int LEVEL_GAP = 4;
   private static final int PREVIEW_W = 48;
   private static final int PREVIEW_H = 24;
   private MantisBloodFxConfig.Level selected = MantisBloodFxConfig.get().level();
   private float screenScale = 1.0F;
   private int previewX;
   private int previewY;
   private int previewScale;
   private int levelsY;

   public BloodLevelSetupScreen() {
      super(Component.m_237113_("BLOOD"));
   }

   protected void m_7856_() {
      this.screenScale = ModGuiScaleConfig.fitToScreen(this.f_96543_, this.f_96544_, 320, 240);
      this.f_96543_ = Math.max(1, Mth.m_14143_((float)this.f_96543_ / this.screenScale));
      this.f_96544_ = Math.max(1, Mth.m_14143_((float)this.f_96544_ / this.screenScale));
      this.m_169413_();
      MantisBloodFxConfig.Level[] levels = MantisBloodFxConfig.Level.values();
      int rowWidth = levels.length * 64 + (levels.length - 1) * 4;
      int rowX = Math.max(16, (this.f_96543_ - rowWidth) / 2);
      int descriptionHeight = this.f_96547_.m_239133_(Component.m_237115_("screen.project_edgerunner.blood_setup.description"), Math.min(420, this.f_96543_ - 32));
      this.levelsY = 29 + descriptionHeight + 10;

      for(int i = 0; i < levels.length; ++i) {
         MantisBloodFxConfig.Level level = levels[i];
         this.m_142416_((new NeonButton(rowX + i * 68, this.levelsY, 64, 13, Component.m_237115_(key(level)).getString(), () -> this.selected = level)).highlight(() -> this.selected == level));
      }

      int continueY = this.f_96544_ - 16 - 13;
      int available = continueY - 14 - (this.levelsY + 13 + 34);
      this.previewScale = Mth.m_14045_(Math.min(available / 24, (this.f_96543_ - 32) / 48), 2, 6);
      this.previewX = (this.f_96543_ - 48 * this.previewScale) / 2;
      this.previewY = this.levelsY + 13 + 30;
      this.m_142416_((new NeonButton((this.f_96543_ - 108) / 2, continueY, 108, 13, Component.m_237115_("screen.project_edgerunner.blood_setup.continue").getString(), this::m_7379_)).highlight(() -> true));
   }

   public void m_88315_(GuiGraphics graphics, int mouseX, int mouseY, float partialTick) {
      graphics.m_280168_().m_85836_();
      graphics.m_280168_().m_85841_(this.screenScale, this.screenScale, 1.0F);
      mouseX = (int)((float)mouseX / this.screenScale);
      mouseY = (int)((float)mouseY / this.screenScale);
      graphics.m_280509_(0, 0, this.f_96543_, this.f_96544_, -133756402);
      CyberTheme.drawScreenFrame(graphics, 8, 6, this.f_96543_ - 16, this.f_96544_ - 12);
      int titleWidth = this.f_96547_.m_92895_("BLOOD");
      int titleX = (this.f_96543_ - titleWidth) / 2;
      graphics.m_280056_(this.f_96547_, "BLOOD", titleX, 11, -1575169, false);
      graphics.m_280509_(titleX, 20, titleX + titleWidth, 21, -54675);
      int textWidth = Math.min(420, this.f_96543_ - 32);
      graphics.m_280554_(this.f_96547_, Component.m_237115_("screen.project_edgerunner.blood_setup.description"), (this.f_96543_ - textWidth) / 2, 29, textWidth, -1575169);
      Component detail = Component.m_237115_(key(this.selected) + ".detail");
      int detailWidth = this.f_96547_.m_92852_(detail);
      graphics.m_280614_(this.f_96547_, detail, (this.f_96543_ - detailWidth) / 2, this.levelsY + 13 + 8, -8394241, false);
      this.renderPreview(graphics);
      super.m_88315_(graphics, mouseX, mouseY, partialTick);
      graphics.m_280168_().m_85849_();
   }

   private void renderPreview(GuiGraphics graphics) {
      int s = this.previewScale;
      int w = 48 * s;
      int h = 24 * s;
      CyberTheme.drawInset(graphics, this.previewX - 2, this.previewY - 2, w + 4, h + 4);
      CyberTheme.drawCornerBrackets(graphics, this.previewX - 5, this.previewY - 5, w + 10, h + 10, 6, -15376017);
      double amount = this.selected.amount;

      for(int y = 0; y < 24; ++y) {
         for(int x = 0; x < 48; ++x) {
            int floor = (x / 8 + y / 8 & 1) == 0 ? -8750470 : -9211021;
            float stain = stain(x, y);
            int colour = floor;
            if (amount > (double)0.0F && (double)stain < amount * 0.32) {
               colour = (double)stain < amount * 0.12 ? -10615033 : (hash(x * 7, y * 13) < 0.5F ? -7467249 : -9041398);
            }

            graphics.m_280509_(this.previewX + x * s, this.previewY + y * s, this.previewX + (x + 1) * s, this.previewY + (y + 1) * s, colour);
         }
      }

   }

   static float stain(int x, int y) {
      int[][] centres = new int[][]{{14, 12}, {31, 9}, {38, 17}, {8, 19}};
      double nearest = Double.MAX_VALUE;

      for(int[] c : centres) {
         nearest = Math.min(nearest, Math.hypot((double)(x - c[0]) * 0.9, (double)(y - c[1])));
      }

      return (float)(nearest / (double)22.0F + (double)hash(x, y) * 0.22);
   }

   private static float hash(int x, int y) {
      long h = (long)x * -7046029254386353131L ^ (long)y * -4417276706812531889L;
      h ^= h >>> 31;
      h *= -4658895280553007687L;
      h ^= h >>> 29;
      return (float)(h >>> 40 & 65535L) / 65536.0F;
   }

   private static String key(MantisBloodFxConfig.Level level) {
      String var10000 = level.name();
      return "screen.project_edgerunner.blood_setup.level." + var10000.toLowerCase(Locale.ROOT);
   }

   public void m_7379_() {
      MantisBloodFxConfig.Level chosen = this.selected;
      MantisBloodFxConfig.mutateAndSave((config) -> config.choose(chosen));
      if (this.f_96541_ != null) {
         this.f_96541_.m_91152_((Screen)null);
      }

   }

   public boolean m_7043_() {
      return true;
   }

   @EventBusSubscriber(
      modid = "project_edgerunner",
      value = {Dist.CLIENT},
      bus = Bus.FORGE
   )
   public static final class Gate {
      private Gate() {
      }

      @SubscribeEvent
      public static void tick(TickEvent.ClientTickEvent event) {
         if (event.phase == Phase.END) {
            Minecraft mc = Minecraft.m_91087_();
            if (mc.f_91074_ != null && mc.f_91080_ == null && mc.f_91074_.f_19797_ >= 60 && !MantisBloodFxConfig.get().chosen() && !FaceOverlayOnboardingController.pending() && !Boolean.getBoolean("project_edgerunner.backgroundCapture")) {
               mc.m_91152_(new BloodLevelSetupScreen());
            }
         }
      }
   }
}
