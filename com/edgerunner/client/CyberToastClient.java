package com.edgerunner.client;

import com.edgerunner.client.cyberpsychosis.CyberpsychosisHudConfig;
import com.edgerunner.content.painting.gui.CyberTheme;
import com.edgerunner.face.FaceCyberwareProfiles;
import com.edgerunner.face.overlay.FaceOverlayStateResolver;
import com.mojang.blaze3d.systems.RenderSystem;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import javax.annotation.Nullable;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.player.LocalPlayer;
import net.minecraft.locale.Language;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.ClientPlayerNetworkEvent;
import net.minecraftforge.client.event.RenderGuiOverlayEvent;
import net.minecraftforge.client.gui.overlay.VanillaGuiOverlay;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.event.TickEvent.Phase;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod.EventBusSubscriber;
import net.minecraftforge.fml.common.Mod.EventBusSubscriber.Bus;

@EventBusSubscriber(
   modid = "project_edgerunner",
   value = {Dist.CLIENT},
   bus = Bus.FORGE
)
public final class CyberToastClient {
   private static final int READY_TICKS = 60;
   private static final List<Notice> VISIBLE = new ArrayList();
   private static final Map<String, CombatHudModel.StatusCard> LAST = new HashMap();
   private static final Map<String, CombatHudModel.StatusCard> SEEN = new HashMap();
   private static boolean pinned;
   private static float followedBottom;

   private CyberToastClient() {
   }

   public static void show(String text, int color, int ticks) {
      if (allows()) {
         pinned = false;
         offer(text, ticks, reduced());
      }
   }

   static void offer(String text, int requested, boolean calm) {
      if (text != null && !text.isBlank()) {
         CyberToastPopup.Callout callout = CyberToastPopup.parse(text);

         for(Notice notice : VISIBLE) {
            if (notice.callout.slot().equals(callout.slot())) {
               refresh(notice, text, callout, requested);
               return;
            }
         }

         if (VISIBLE.size() >= 3) {
            evictOne();
         }

         Notice notice = new Notice();
         notice.text = text;
         notice.callout = callout;
         notice.calm = calm;
         notice.age = 1;
         notice.life = CyberToastPopup.life(requested);
         VISIBLE.add(notice);
      }
   }

   private static void refresh(Notice notice, String text, CyberToastPopup.Callout callout, int requested) {
      notice.text = text;
      notice.callout = callout;
      notice.title = null;
      notice.source = null;
      notice.life = CyberToastPopup.life(requested);
      if (notice.age > 7) {
         notice.age = 8;
      }

   }

   private static void evictOne() {
      for(int i = 0; i < VISIBLE.size(); ++i) {
         if (!((Notice)VISIBLE.get(i)).callout.warning()) {
            VISIBLE.remove(i);
            return;
         }
      }

      VISIBLE.remove(0);
   }

   static void advance() {
      if (!pinned && !VISIBLE.isEmpty()) {
         for(Notice notice : VISIBLE) {
            ++notice.age;
         }

         VISIBLE.removeIf((noticex) -> noticex.age > noticex.life);
      }
   }

   public static void pinForCapture(String phase) {
      pinned = true;

      for(Notice notice : VISIBLE) {
         int var10001;
         switch (phase) {
            case "enter" -> var10001 = Math.max(1, 4);
            case "leave" -> var10001 = Math.max(8, notice.life - 3);
            default -> var10001 = 15;
         }

         notice.age = var10001;
      }

   }

   public static void clearForCapture() {
      pinned = false;
      VISIBLE.clear();
   }

   static int visibleCount() {
      return VISIBLE.size();
   }

   static String textAt(int index) {
      return ((Notice)VISIBLE.get(index)).text;
   }

   static int ageAt(int index) {
      return ((Notice)VISIBLE.get(index)).age;
   }

   static void resetForTests() {
      VISIBLE.clear();
      LAST.clear();
      SEEN.clear();
   }

   @Nullable
   static String callout(@Nullable CombatHudModel.StatusCard before, CombatHudModel.StatusCard now) {
      if (before == null) {
         return null;
      } else if (before.recovering() && !before.complete() && now.complete()) {
         return name(now.id()) + " READY";
      } else if (!before.draining() && now.draining()) {
         return "OVERDRIVE";
      } else if (before.state() != CombatHudModel.State.MAXIMUM && now.state() == CombatHudModel.State.MAXIMUM) {
         return name(now.id()) + " MAX";
      } else if (now.maxCharges() > 1 && now.charges() > before.charges() && !now.complete()) {
         String var10000 = name(now.id());
         return var10000 + " " + now.charges() + "/" + now.maxCharges();
      } else {
         return null;
      }
   }

   private static String name(String id) {
      String var10000;
      switch (id) {
         case "berserk" -> var10000 = "BERSERK";
         case "sandevistan" -> var10000 = "SANDEVISTAN";
         case "optics_scan" -> var10000 = "SCAN";
         case "blood_pump" -> var10000 = "BLOOD PUMP";
         case "gorilla_fury" -> var10000 = "FURY";
         case "mantis_frenzy" -> var10000 = "CRIMSON DANCE";
         default -> var10000 = id.toUpperCase(Locale.ROOT);
      }

      return var10000;
   }

   @SubscribeEvent
   public static void onClientTick(TickEvent.ClientTickEvent event) {
      if (event.phase == Phase.END) {
         LocalPlayer player = Minecraft.m_91087_().f_91074_;
         if (player == null) {
            VISIBLE.clear();
            LAST.clear();
         } else {
            boolean optics = FaceOverlayStateResolver.hasInstalledFaceCyberware(player);
            boolean enabled = optics && HudModeConfig.get().toasts;
            if (!enabled) {
               VISIBLE.clear();
               LAST.clear();
            } else {
               FaceCyberwareProfiles.FaceProfile profile = FaceOverlayStateResolver.resolveInstalledProfile(player);
               List<CombatHudModel.StatusCard> cards = profile != null && profile.visorHud() ? FaceCyberwareClient.collectCombatStatusCards(player, profile) : List.of();
               SEEN.clear();

               for(CombatHudModel.StatusCard card : cards) {
                  String text = callout((CombatHudModel.StatusCard)LAST.get(card.id()), card);
                  if (text != null) {
                     offer(text, 60, reduced());
                  }

                  SEEN.put(card.id(), card);
               }

               LAST.clear();
               LAST.putAll(SEEN);
               advance();
            }
         }
      }
   }

   private static boolean allows() {
      Minecraft mc = Minecraft.m_91087_();
      LocalPlayer player = mc.f_91074_;
      return player != null && HudModeConfig.get().toasts && FaceOverlayStateResolver.hasInstalledFaceCyberware(player);
   }

   private static boolean reduced() {
      return CyberpsychosisHudConfig.get().reducedFlashes;
   }

   @SubscribeEvent
   public static void onOverlay(RenderGuiOverlayEvent.Post event) {
      if (event.getOverlay() == VanillaGuiOverlay.CROSSHAIR.type() && !VISIBLE.isEmpty()) {
         Minecraft mc = Minecraft.m_91087_();
         if (mc.f_91074_ != null && !mc.f_91066_.f_92062_ && allows()) {
            GuiGraphics g = event.getGuiGraphics();
            float partial = pinned ? 0.0F : event.getPartialTick();
            float delta = mc.m_91297_();
            ModHudScale.render(g, event.getWindow().m_85445_(), event.getWindow().m_85446_(), (width, height) -> draw(g, mc.f_91062_, width, height, partial, delta));
         }
      }
   }

   private static void draw(GuiGraphics g, Font font, int guiW, int guiH, float partial, float delta) {
      HudLayoutConfig.ResolvedPlacement card = HudLayoutConfig.resolve(HudLayoutConfig.HudElement.OPTICS_TARGET_CARD, guiW, guiH, 174, 47);
      int bottom = card.enabled() ? OpticsTargetHudClient.cardBottom() : 0;
      followedBottom += ((float)bottom - followedBottom) * (1.0F - (float)Math.pow(0.6, (double)Math.max(0.1F, delta)));
      CyberToastPopup.Stack stack = CyberToastPopup.stack(card.y(), Math.round(followedBottom) < 4 ? 0 : Math.round(followedBottom), guiH);
      int centre = card.x() + 87;
      HudLayoutConfig.HudElement popupElement = HudLayoutConfig.HudElement.COMBAT_POPUPS;
      HudLayoutConfig.ResolvedPlacement popup = HudLayoutConfig.resolve(popupElement, guiW, guiH, 170, 58);
      if (popup.enabled()) {
         HudLayoutConfig.HudElementPlacement saved = (HudLayoutConfig.HudElementPlacement)HudLayoutConfig.get().elements.get(popupElement.id());
         if (saved != null && (saved.gridX != null || saved.gridY != null)) {
            stack = new CyberToastPopup.Stack(popup.y(), 3);
            centre = popup.x() + 85;
         }

         float hudScale = ModGuiScaleConfig.getScale();
         Language language = Language.m_128107_();
         int y = stack.top();
         RenderSystem.enableBlend();
         RenderSystem.defaultBlendFunc();
         int count = Math.min(VISIBLE.size(), stack.slots());

         for(int i = 0; i < count; ++i) {
            Notice notice = (Notice)VISIBLE.get(i);
            if (notice.title == null) {
               CyberToastPopup.Callout var10001 = notice.callout;
               Objects.requireNonNull(language);
               notice.title = var10001.title(language::m_6834_);
               var10001 = notice.callout;
               Objects.requireNonNull(language);
               notice.source = var10001.source(language::m_6834_);
            }

            int titleW = font.m_92895_(notice.title);
            int sourceW = font.m_92895_(notice.source);
            int w = CyberToastPopup.width(titleW, sourceW);
            int x = centre - w / 2;
            drawPanel(g, font, notice, x, y, w, titleW, sourceW, partial, hudScale);
            y += 20;
         }

      }
   }

   public static void renderPreview(GuiGraphics g, Font font, int x, int y, int width, int height) {
      Language language = Language.m_128107_();
      g.m_280168_().m_85836_();
      g.m_280168_().m_252880_((float)x, (float)y, 0.0F);
      g.m_280168_().m_85841_((float)width / 170.0F, (float)height / 58.0F, 1.0F);
      int rowY = 0;

      for(String raw : new String[]{"LEAP READY", "OVERDRIVE", "FURY MAX"}) {
         Notice sample = new Notice();
         sample.callout = CyberToastPopup.parse(raw);
         sample.age = 15;
         sample.life = 74;
         CyberToastPopup.Callout var10001 = sample.callout;
         Objects.requireNonNull(language);
         sample.title = var10001.title(language::m_6834_);
         var10001 = sample.callout;
         Objects.requireNonNull(language);
         sample.source = var10001.source(language::m_6834_);
         int titleW = font.m_92895_(sample.title);
         int sourceW = font.m_92895_(sample.source);
         int rowW = CyberToastPopup.width(titleW, sourceW);
         drawPanel(g, font, sample, (170 - rowW) / 2, rowY, rowW, titleW, sourceW, 0.0F, 1.0F);
         rowY += 20;
      }

      g.m_280168_().m_85849_();
   }

   private static void drawPanel(GuiGraphics g, Font font, Notice notice, int x, int y, int w, int titleW, int sourceW, float partial, float hudScale) {
      int h = 18;
      float eased = notice.calm ? 1.0F : CyberToastPopup.open(notice.age, notice.life, partial);
      float alpha = notice.calm ? CyberToastPopup.calmAlpha(notice.age, notice.life, partial) : 0.25F + 0.75F * eased;
      if (!(alpha <= 0.01F)) {
         int open = Math.max(2, Math.round((float)h * eased));
         int top = y + (h - open) / 2;
         boolean blind = !notice.calm && eased < 1.0F;
         if (blind) {
            g.m_280588_(Math.round((float)x * hudScale), Math.round((float)top * hudScale), Math.round((float)(x + w + 1) * hudScale), Math.round((float)(top + open) * hudScale));
         }

         CyberTheme.fillCutPanel(g, x, y, w, h, 3, fade(-267380703, alpha));
         CyberTheme.strokeCutPanel(g, x, y, w, h, 3, fade(-13285030, alpha));
         g.m_280656_(x + 3, x + 12, y, fade(notice.callout.color(), alpha));
         if (notice.calm || eased > 0.35F) {
            float textAlpha = notice.calm ? alpha : (eased - 0.35F) / 0.65F;
            Objects.requireNonNull(font);
            int textY = y + (h - 9) / 2 + 1;
            g.m_280056_(font, notice.title, x + 6, textY, fade(-1575169, textAlpha), false);
            if (CyberToastPopup.showsSource(titleW, sourceW)) {
               g.m_280056_(font, notice.source, x + w - 7 - sourceW, textY, fade(-8394241, textAlpha * 0.8F), false);
            }
         }

         if (blind) {
            g.m_280618_();
            g.m_280656_(x, x + w, top, -13903361);
            g.m_280656_(x, x + w, top + open - 1, -13903361);
         }

      }
   }

   private static int fade(int argb, float alpha) {
      int a = Math.max(5, Math.round((float)(argb >>> 24 & 255) * Math.max(0.0F, Math.min(1.0F, alpha))));
      return a << 24 | argb & 16777215;
   }

   @SubscribeEvent
   public static void onLogout(ClientPlayerNetworkEvent.LoggingOut event) {
      VISIBLE.clear();
      LAST.clear();
      followedBottom = 0.0F;
   }

   static final class Notice {
      String text;
      CyberToastPopup.Callout callout;
      @Nullable
      String title;
      @Nullable
      String source;
      int age;
      int life;
      boolean calm;
   }
}
