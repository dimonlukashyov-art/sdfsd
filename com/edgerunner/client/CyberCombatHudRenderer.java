package com.edgerunner.client;

import com.edgerunner.content.painting.gui.CyberIcons;
import com.edgerunner.content.painting.gui.CyberTheme;
import com.edgerunner.sandevistan.SandevistanKineticCompensation;
import com.edgerunner.util.PlayerScoreHelper;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.util.Mth;

public final class CyberCombatHudRenderer {
   public static final int WIDTH = 152;
   public static final int CARD_HEIGHT = 28;
   public static final int CARD_GAP = 3;
   private static final CombatHudModel.Timeline TIMELINE = new CombatHudModel.Timeline();
   private static final Map<String, float[]> POSITIONS = new HashMap();
   private static final Map<String, ResourceLocation> TEXTURES = new HashMap();
   private static List<CombatHudModel.Frame> frames = List.of();
   private static CombatHudModel.Layout current = new CombatHudModel.Layout(List.of(), 0, 0);
   private static boolean chips;
   private static Object owner;
   private static Object world;
   private static long lastFrame;
   private static int lastWidth;
   private static int lastHeight;
   private static int lastOriginX;
   private static int lastOriginY;

   private CyberCombatHudRenderer() {
   }

   public static CombatHudModel.Layout prepare(List<CombatHudModel.StatusCard> cards, int width, int height, Object player) {
      Object level = Minecraft.m_91087_().f_91073_;
      if (owner != player || world != level) {
         clear();
         owner = player;
         world = level;
      }

      long now = System.nanoTime() / 1000000L;
      float delta = lastFrame == 0L ? 1.0F : Mth.m_14036_((float)(now - lastFrame) / 140.0F, 0.0F, 1.0F);
      lastFrame = now;
      if (width != lastWidth || height != lastHeight) {
         POSITIONS.clear();
      }

      lastWidth = width;
      lastHeight = height;
      int axolotlSerial = PlayerScoreHelper.getScore(Minecraft.m_91087_().f_91074_, "er_axo_proc_applied");
      frames = TIMELINE.update(cards, now, axolotlSerial);
      HudModeConfig mode = HudModeConfig.get();
      chips = mode.isCompact(HudModeConfig.Module.COMBAT_BARS);
      if (chips) {
         boolean splitting = SandevistanSplitClient.isPreviewing();
         frames = frames.stream().filter((f) -> CombatChipModel.visible(f.card(), mode.chipShow) || splitting && f.card().icon() == CombatHudModel.Icon.SANDEVISTAN).toList();
         POSITIONS.clear();
         current = chipLayout(frames.size(), width, height);
         return current;
      } else {
         CombatHudModel.Layout target = measure(frames.stream().map(CombatHudModel.Frame::card).toList(), width, height);
         ArrayList<CombatHudModel.Box> boxes = new ArrayList();
         Map<Integer, Integer> columnBottoms = new HashMap();
         int maxX = 0;
         int maxY = 0;

         for(CombatHudModel.Box box : target.boxes()) {
            String id = ((CombatHudModel.Frame)frames.get(box.index())).card().id();
            float[] pos = (float[])POSITIONS.computeIfAbsent(id, (ignored) -> new float[]{(float)box.x(), (float)box.y(), (float)box.width()});
            if (pos[0] != (float)box.x() || pos[2] != (float)box.width()) {
               pos[0] = (float)box.x();
               pos[1] = (float)box.y();
               pos[2] = (float)box.width();
            }

            pos[1] += ((float)box.y() - pos[1]) * delta;
            int gap = target.boxes().stream().filter((b) -> b.x() == box.x() && b.y() > box.y()).mapToInt((b) -> b.y() - box.y() - box.height()).min().orElse(3);
            int remaining = target.boxes().stream().filter((b) -> b.x() == box.x() && b.y() > box.y()).mapToInt((b) -> b.height() + gap).sum();
            int floor = (Integer)columnBottoms.getOrDefault(box.x(), 0);
            int ceiling = Math.max(floor, height - box.height() - remaining);
            pos[1] = Mth.m_14036_(pos[1], (float)floor, (float)ceiling);
            int y = Math.round(pos[1]);
            columnBottoms.put(box.x(), y + box.height() + gap);
            boxes.add(new CombatHudModel.Box(box.index(), box.x(), y, box.width(), box.height()));
            maxX = Math.max(maxX, box.x() + box.width());
            maxY = Math.max(maxY, y + box.height());
         }

         POSITIONS.keySet().retainAll(frames.stream().map((f) -> f.card().id()).toList());
         current = new CombatHudModel.Layout(List.copyOf(boxes), maxX, maxY);
         return current;
      }
   }

   public static CombatHudModel.Layout measure(List<CombatHudModel.StatusCard> cards, int width, int height) {
      Font font = Minecraft.m_91087_().f_91062_;
      CombatHudModel.Layout layout = measure(cards, Math.max(1, width - 24), Math.max(1, height - 24), font);
      if (layout.width() > width - 24 || layout.height() > height - 24) {
         layout = measure(cards, width, height, font);
      }

      return layout;
   }

   private static CombatHudModel.Layout measure(List<CombatHudModel.StatusCard> cards, int width, int height, Font font) {
      return CombatHudModel.layout(cards.size(), width, height, (i, w) -> text((CombatHudModel.StatusCard)cards.get(i), w, font).height());
   }

   private static CombatHudModel.Layout chipLayout(int count, int width, int height) {
      HudModeConfig mode = HudModeConfig.get();
      return CombatChipModel.layout(count, mode.chipLayout, mode.chipReadout, Math.max(1, width - 24), Math.max(1, height - 24));
   }

   public static int renderStack(GuiGraphics graphics, int x, int y) {
      lastOriginX = x;
      lastOriginY = y;
      draw(graphics, x, y, current, frames, chips);
      return y + current.height();
   }

   public static CombatHudModel.Layout detailLayout(List<CombatHudModel.StatusCard> cards, int width, int height) {
      return measure(cards, Math.max(1, width), Math.max(1, height), Minecraft.m_91087_().f_91062_);
   }

   public static void renderDetails(GuiGraphics graphics, int x, int y, CombatHudModel.Layout layout, List<CombatHudModel.StatusCard> cards) {
      draw(graphics, x, y, layout, cards.stream().map((c) -> new CombatHudModel.Frame(c, 1.0F, 0.0F)).toList(), false);
   }

   public static boolean compactBars() {
      return HudModeConfig.compact(HudModeConfig.Module.COMBAT_BARS);
   }

   public static int renderStack(GuiGraphics graphics, int x, int y, List<CombatHudModel.StatusCard> cards) {
      Minecraft mc = Minecraft.m_91087_();
      prepare(cards, mc.m_91268_().m_85445_(), mc.m_91268_().m_85446_(), mc.f_91074_);
      return renderStack(graphics, x, y);
   }

   public static int reservedHeight() {
      return current.height();
   }

   public static CombatHudModel.Layout currentLayout() {
      return current;
   }

   public static void clear() {
      TIMELINE.clear();
      POSITIONS.clear();
      frames = List.of();
      current = new CombatHudModel.Layout(List.of(), 0, 0);
      owner = null;
      world = null;
      lastFrame = 0L;
      lastOriginX = 0;
      lastOriginY = 0;
   }

   public static String hitCardId(double mouseX, double mouseY) {
      if (!frames.isEmpty() && !current.boxes().isEmpty()) {
         for(CombatHudModel.Box box : current.boxes()) {
            int x = lastOriginX + box.x();
            int y = lastOriginY + box.y();
            if (mouseX >= (double)x && mouseX < (double)(x + box.width()) && mouseY >= (double)y && mouseY < (double)(y + box.height())) {
               int index = box.index();
               if (index >= 0 && index < frames.size()) {
                  return ((CombatHudModel.Frame)frames.get(index)).card().id();
               }
            }
         }

         return null;
      } else {
         return null;
      }
   }

   public static List<CombatHudModel.StatusCard> previewCards() {
      return previewCards(false);
   }

   public static List<CombatHudModel.StatusCard> previewCards(boolean showBerserk) {
      double sandyRating = 0.85;
      double sandySplit = SandevistanKineticCompensation.effectiveClientConversion(sandyRating);
      CombatHudModel.StatusCard var10000;
      if (showBerserk) {
         var10000 = CombatHudModel.StatusCard.create("berserk", CombatHudModel.Icon.BERSERK, "BERSERK", 0.2F, CombatHudModel.State.ACTIVE, -1.0F, new CombatHudModel.Detail("MILITECH", "2.4s"), new CombatHudModel.Detail("Kills", "12"), new CombatHudModel.Detail("SHOCK", "80%")).readout("2.4s").hardware("project_edgerunner:berserk_militech");
      } else {
         CombatHudModel.Icon var10001 = CombatHudModel.Icon.SANDEVISTAN;
         CombatHudModel.State var10004 = CombatHudModel.State.ACTIVE;
         CombatHudModel.Detail[] var10006 = new CombatHudModel.Detail[]{new CombatHudModel.Detail("Charge", "65%"), new CombatHudModel.Detail("SLOW", "85%"), null, null, null};
         int var10012 = SandevistanKineticCompensation.worldSlowPercent(sandyRating, sandySplit);
         var10006[2] = new CombatHudModel.Detail("WORLD", var10012 + "%");
         var10006[3] = new CombatHudModel.Detail("YOU", SandevistanKineticCompensation.formatMovementScale(sandyRating, sandySplit));
         var10006[4] = new CombatHudModel.Detail("SPLIT", SandevistanKineticCompensation.toPercent(sandySplit) + "%");
         var10000 = CombatHudModel.StatusCard.create("sandevistan", var10001, "SANDY", 0.65F, var10004, -1.0F, var10006).readout("6.5s").hardware("project_edgerunner:sandevistan_apogee").sandevistanTuning(SandevistanKineticCompensation.controlFraction(sandyRating, sandySplit, EdgerunnerServerConfigClientState.getSandevistanYouSpeedLimit()), SandevistanKineticCompensation.movementScale(sandyRating, SandevistanKineticCompensation.effectiveConversion(sandyRating, (double)1.0F, EdgerunnerServerConfigClientState.getSandevistanYouSpeedLimit())), false);
      }

      return List.of(var10000, CombatHudModel.optics(0, 1200, 248, 600, "Oracle").hardware("project_edgerunner:the_oracle"), CombatHudModel.StatusCard.create("blood_pump", CombatHudModel.Icon.BLOOD, "PUMP", 0.45F, CombatHudModel.State.RECOVERY, -1.0F, new CombatHudModel.Detail("Charges", "1/3")).charges(1, 3).availability(true, false, true).readout("12.0s").lanes(List.of(new CombatHudModel.ChargeLane(0, 600), new CombatHudModel.ChargeLane(240, 600), new CombatHudModel.ChargeLane(480, 600))), CombatHudModel.StatusCard.create("gorilla_fury", CombatHudModel.Icon.FURY, "FURY", 1.0F, CombatHudModel.State.MAXIMUM, 0.5F));
   }

   public static CombatHudModel.Layout previewLayout(int width, int height) {
      return previewLayout(width, height, false);
   }

   public static CombatHudModel.Layout previewLayout(int width, int height, boolean showBerserk) {
      List<CombatHudModel.StatusCard> cards = previewCards(showBerserk);
      return compactBars() ? chipLayout(cards.size(), width, height) : measure(cards, width, height);
   }

   public static void renderPreview(GuiGraphics graphics, int x, int y, int width, int height) {
      renderPreview(graphics, x, y, width, height, false);
   }

   public static void renderPreview(GuiGraphics graphics, int x, int y, int width, int height, boolean showBerserk) {
      List<CombatHudModel.StatusCard> cards = previewCards(showBerserk);
      draw(graphics, x, y, previewLayout(width, height, showBerserk), cards.stream().map((c) -> new CombatHudModel.Frame(c, 1.0F, 0.0F)).toList(), compactBars());
   }

   private static void draw(GuiGraphics g, int x, int y, CombatHudModel.Layout layout, List<CombatHudModel.Frame> contents, boolean asChips) {
      long now = System.nanoTime() / 1000000L;

      for(CombatHudModel.Box box : layout.boxes()) {
         CombatHudModel.Frame frame = (CombatHudModel.Frame)contents.get(box.index());
         if (asChips) {
            renderChip(g, x + box.x(), y + box.y(), box.width(), box.height(), frame, now);
         } else {
            renderCard(g, x + box.x(), y + box.y(), box.width(), frame);
         }
      }

   }

   private static void renderChip(GuiGraphics g, int x, int y, int width, int height, CombatHudModel.Frame frame, long now) {
      CombatHudModel.StatusCard card = frame.card();
      float opacity = frame.opacity() * CombatChipModel.blink(card, now);
      if (!(opacity < 0.02F)) {
         int size = 22;
         boolean idle = card.state() == CombatHudModel.State.ACTIVE || card.state() == CombatHudModel.State.RECOVERY;
         int resource = alpha(identity(card.icon()), opacity);
         int valueColor = alpha(card.draining() ? -1754806 : -8394241, opacity);
         CyberTheme.fillCutPanel(g, x, y, size, size, 3, alpha(-16052460, opacity));
         CyberTheme.strokeCutPanel(g, x, y, size, size, 3, alpha(idle ? -13285030 : accent(card.state()), opacity));
         g.m_280656_(x + 3, x + 9, y, resource);
         CombatHudIcons.Asset asset = CombatHudIcons.resolve(card);
         texture(g, x + 3, y + 1, 16, asset.path(), asset.size(), opacity * (card.state() == CombatHudModel.State.RECOVERY ? 0.45F : 1.0F));
         if (frame.pulse() > 0.0F) {
            CyberTheme.strokeCutPanel(g, x + 1, y + 1, size - 2, size - 2, 2, alpha(accent(card.state()), opacity * frame.pulse()));
         }

         if (frame.axolotl() > 0.0F) {
            CyberTheme.strokeCutPanel(g, x, y, size, size, 3, alpha(-13510515, opacity * Math.min(1.0F, frame.axolotl() * 4.0F)));
         }

         int bx = x + 3;
         int by = y + 18;
         int bw = size - 6;
         g.m_280509_(bx, by, bx + bw, by + 2, alpha(-16118253, opacity));
         List<CombatHudModel.ChargeLane> lanes = card.hardware().lanes();
         if (!lanes.isEmpty()) {
            for(int i = 0; i < lanes.size(); ++i) {
               CombatHudModel.ChargeLane lane = (CombatHudModel.ChargeLane)lanes.get(i);
               int left = bx + i * (bw + 1) / lanes.size();
               int right = bx + (i + 1) * (bw + 1) / lanes.size() - 1;
               int fill = Math.round((float)(right - left) * lane.fraction());
               if (fill > 0) {
                  g.m_280509_(left, by, left + fill, by + 2, alpha(identity(card.icon()), opacity * (!lane.regenerating() && lane.remaining() > 0 ? 0.65F : 1.0F)));
               }
            }
         } else if (card.draining()) {
            g.m_280509_(bx, by, bx + bw, by + 2, alpha(-1754806, opacity));
         } else {
            int fill = Math.round((float)bw * card.fraction());
            if (fill > 0) {
               g.m_280509_(bx, by, bx + fill, by + 2, alpha(identity(card.icon()), opacity * (card.recovering() ? 0.65F : 1.0F)));
            }
         }

         renderSpend(g, card, bx, by, bw, 2, opacity);
         if (card.markerFraction() >= 0.0F) {
            int marker = bx + Math.round((float)(bw - 1) * card.markerFraction());
            g.m_280509_(marker, by - 1, marker + 1, by + 3, alpha(-1575169, opacity));
         }

         if (lanes.isEmpty()) {
            for(int i = 0; i < Math.min(4, card.maxCharges()); ++i) {
               g.m_280509_(x + size - 4, y + 3 + i * 3, x + size - 2, y + 5 + i * 3, i < card.charges() ? resource : alpha(-14405058, opacity));
            }
         }

         boolean sandy = card.icon() == CombatHudModel.Icon.SANDEVISTAN;
         if (sandy) {
            int you = Math.round((float)(bw * splitPercent(card)) / 100.0F);
            g.m_280509_(bx, by + 2, bx + bw - you, by + 3, alpha(-13903361, opacity * 0.8F));
            g.m_280509_(bx + bw - you, by + 2, bx + bw, by + 3, alpha(-19894, opacity));
         }

         if (width > size || height > size) {
            Font font = Minecraft.m_91087_().f_91062_;
            String readout = displayToken(CombatChipModel.readout(card));
            float scale = 0.75F;
            float textX = height > size ? (float)x + ((float)size - (float)font.m_92895_(readout) * scale) / 2.0F : (float)(x + size + 2);
            float var10000;
            if (height > size) {
               var10000 = (float)(y + size + 1);
            } else {
               var10000 = (float)y;
               float var10001 = (float)size;
               Objects.requireNonNull(font);
               var10000 = var10000 + (var10001 - 9.0F * scale) / 2.0F + 1.0F;
            }

            float textY = var10000;
            g.m_280168_().m_85836_();
            g.m_280168_().m_252880_(textX, textY, 0.0F);
            g.m_280168_().m_85841_(scale, scale, 1.0F);
            g.m_280056_(font, readout, 0, 0, valueColor, false);
            g.m_280168_().m_85849_();
         }
      }
   }

   private static String detail(CombatHudModel.StatusCard card, String name) {
      return (String)card.details().stream().filter((d) -> d.name().equals(name)).map(CombatHudModel.Detail::value).findFirst().orElse("");
   }

   private static int splitPercent(CombatHudModel.StatusCard card) {
      if (card.sandevistanTuning().fraction() >= 0.0F) {
         return Math.round(card.sandevistanTuning().fraction() * 100.0F);
      } else {
         try {
            return Mth.m_14045_(Integer.parseInt(detail(card, "SPLIT").replace("%", "")), 0, 100);
         } catch (NumberFormatException var2) {
            return 0;
         }
      }
   }

   private static String stateLabel(CombatHudModel.State state) {
      String var10000;
      switch (state) {
         case ACTIVE -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.active");
         case RECOVERY -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.recharging");
         case WARNING -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.low_reserve");
         case DANGER -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.danger");
         case READY -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.ready");
         case MAXIMUM -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.maximum");
         default -> throw new IncompatibleClassChangeError();
      }

      return var10000;
   }

   private static CombatHudModel.TextLayout text(CombatHudModel.StatusCard card, int width, Font font) {
      CombatHudModel.StatusCard display = new CombatHudModel.StatusCard(card.id(), card.icon(), displayToken(card.label()), card.details(), card.fraction(), card.state(), card.markerFraction(), card.draining(), card.recovering(), card.complete(), card.available(), card.charges(), card.maxCharges(), displayToken(card.readout()), card.hardware(), card.sandevistanTuning(), card.spendFraction());
      Objects.requireNonNull(font);
      Objects.requireNonNull(font);
      return CombatHudModel.textLayout(display, width, 9, font::m_92895_);
   }

   private static int identity(CombatHudModel.Icon icon) {
      int var10000;
      switch (icon) {
         case BERSERK -> var10000 = -947372;
         case SANDEVISTAN -> var10000 = -13903361;
         case SCAN -> var10000 = -5598734;
         case BLOOD -> var10000 = -13510515;
         case FURY -> var10000 = -1715108;
         case FRENZY -> var10000 = -54459;
         default -> throw new IncompatibleClassChangeError();
      }

      return var10000;
   }

   private static void renderCard(GuiGraphics g, int x, int y, int width, CombatHudModel.Frame frame) {
      if (!(frame.opacity() < 0.02F)) {
         CombatHudModel.StatusCard card = frame.card();
         Font font = Minecraft.m_91087_().f_91062_;
         CombatHudModel.TextLayout text = text(card, width, font);
         int height = text.height();
         float opacity = frame.opacity();
         int resource = alpha(identity(card.icon()), opacity);
         int signal = alpha(accent(card.state()), opacity);
         int border = alpha(-13285030, opacity);
         int dark = alpha(-16052460, opacity);
         int valueColor = alpha(card.draining() ? -1754806 : -8394241, opacity);
         CyberTheme.fillCutPanel(g, x, y, 23, height, 5, dark);
         CyberTheme.strokeCutPanel(g, x, y, 23, height, 5, border);
         g.m_280656_(x + 5, x + 12, y, resource);
         g.m_280315_(x, y + 5, y + 11, resource);
         g.m_280656_(x + 23, x + 26, y + 8, border);
         g.m_280656_(x + 23, x + 26, y + height - 9, border);
         CombatHudIcons.Asset asset = CombatHudIcons.resolve(card);
         CombatHudModel.Socket socket = CombatHudModel.socket(height, card.hardware().lanes().isEmpty() ? card.maxCharges() : 0);
         texture(g, x + socket.iconX(), y + socket.iconY(), 20, asset.path(), asset.size(), opacity);
         if (frame.pulse() > 0.0F) {
            CyberTheme.strokeCutPanel(g, x + 1, y + 1, 21, height - 2, 4, alpha(accent(card.state()), opacity * frame.pulse()));
         }

         int cells = card.hardware().lanes().isEmpty() ? card.maxCharges() : 0;
         int lit = card.charges();

         for(int i = 0; i < cells; ++i) {
            int rowCells = Math.min(4, cells - i / 4 * 4);
            int cx = x + (23 - (rowCells * 5 - 1)) / 2 + i % 4 * 5;
            int cy = y + socket.cellsY() + i / 4 * 3;
            g.m_280509_(cx, cy, cx + 4, cy + 2, i < lit ? resource : border);
         }

         CyberTheme.fillCutPanel(g, x + 26, y + 1, width - 26, height - 2, 3, alpha(-267380703, opacity));
         g.m_280656_(x + 30, x + width - 6, y + 1, border);
         g.m_280315_(x + width - 1, y + 4, y + 9, border);
         g.m_280656_(x + width - 12, x + width - 5, y + height - 2, resource);
         int valueX = x + width - 4 - text.readoutWidth();
         int lineY = y + 4;
         boolean titleStart = true;

         for(String line : text.title()) {
            g.m_280056_(font, line, x + 30, lineY, alpha(-1575169, opacity), false);
            if (titleStart && card.icon() == CombatHudModel.Icon.SANDEVISTAN) {
               String slow = (String)card.details().stream().filter((d) -> d.name().equals("WORLD")).map(CombatHudModel.Detail::value).findFirst().orElse("");
               if (!slow.isEmpty()) {
                  g.m_280056_(font, slow, x + 30 + font.m_92895_(line) + 4, lineY, valueColor, false);
               }
            }

            titleStart = false;
            Objects.requireNonNull(font);
            lineY += 9;
         }

         int var10000 = y + 4;
         Objects.requireNonNull(font);
         int statusY = var10000 + (9 - 9) / 2;
         if (frame.axolotl() > 0.0F) {
            texture(g, valueX - 12, statusY - 1, 11, "textures/item/axolotl_item.png", 16, opacity * Math.min(1.0F, frame.axolotl() * 4.0F));
         } else if (card.state() != CombatHudModel.State.ACTIVE) {
            stateIcon(g, valueX - 11, statusY, card.state(), signal);
         }

         lineY = y + 4;

         for(String line : text.readout()) {
            g.m_280056_(font, line, x + width - 4 - font.m_92895_(line), lineY, valueColor, false);
            Objects.requireNonNull(font);
            lineY += 9;
         }

         int bx = x + 30;
         int by = y + 4 + text.headerHeight() + 3;
         int bw = text.barWidth();
         int footerY = by;

         for(String line : text.barReadout()) {
            g.m_280056_(font, line, x + width - 4 - font.m_92895_(line), footerY, valueColor, false);
            Objects.requireNonNull(font);
            footerY += 9;
         }

         if (card.icon() == CombatHudModel.Icon.SANDEVISTAN) {
            renderSandyBars(g, font, card, bx, by, bw, opacity, valueColor, dark, signal, border, resource);
         } else if (!card.hardware().lanes().isEmpty()) {
            List<CombatHudModel.ChargeLane> lanes = card.hardware().lanes();

            for(int i = 0; i < lanes.size(); ++i) {
               CombatHudModel.ChargeLane lane = (CombatHudModel.ChargeLane)lanes.get(i);
               int top = by + i * 9 / lanes.size();
               int bottom = by + (i + 1) * 9 / lanes.size() - 1;
               g.m_280509_(bx, top, bx + bw, bottom, border);
               int fill = Math.round((float)bw * lane.fraction());
               if (fill > 0) {
                  g.m_280509_(bx, top, bx + fill, bottom, alpha(identity(card.icon()), opacity * (!lane.regenerating() && lane.remaining() > 0 ? 0.65F : 1.0F)));
                  if (lane.remaining() > 0) {
                     g.m_280509_(bx + fill - 1, top, bx + fill, bottom, valueColor);
                  }
               }
            }

         } else {
            g.m_280509_(bx, by, bx + bw, by + 8, dark);
            g.m_280509_(bx + 1, by + 1, bx + bw - 1, by + 7, alpha(card.draining() ? -11921888 : -16118253, opacity));
            if (card.draining()) {
               for(int dx = 1; dx < bw - 1; ++dx) {
                  for(int dy = 1; dy < 7; ++dy) {
                     if ((dx + dy) % 8 < 2) {
                        g.m_280509_(bx + dx, by + dy, bx + dx + 1, by + dy + 1, signal);
                     }
                  }
               }
            } else {
               int fill = Math.round((float)(bw - 2) * card.fraction());
               if (fill > 0) {
                  g.m_280509_(bx + 1, by + 1, bx + 1 + fill, by + 7, alpha(identity(card.icon()), opacity * (card.recovering() ? 0.65F : 1.0F)));
                  g.m_280509_(bx + fill, by + 1, bx + fill + 1, by + 7, valueColor);
               }
            }

            renderSpend(g, card, bx + 1, by + 1, bw - 2, 6, opacity);

            for(int i = 1; i < 4; ++i) {
               int tick = bx + Math.round((float)((bw - 1) * i) / 4.0F);
               g.m_280509_(tick, by + 1, tick + 1, by + 7, dark);
            }

            g.m_280656_(bx + 1, bx + bw - 1, by + 7, border);
            if (frame.axolotl() > 0.0F) {
               g.m_280656_(bx, bx + bw - 1, by, alpha(-13510515, opacity * Math.min(1.0F, frame.axolotl() * 4.0F)));
            }

            if (card.markerFraction() >= 0.0F) {
               int marker = bx + 1 + Math.round((float)(bw - 3) * card.markerFraction());
               g.m_280509_(marker, by - 1, marker + 1, by + 9, alpha(-1575169, opacity));
            }

         }
      }
   }

   private static void renderSpend(GuiGraphics graphics, CombatHudModel.StatusCard card, int x, int y, int width, int height, float opacity) {
      if (!(card.spendFraction() <= 0.0F) && width > 0) {
         int start = Math.round((float)width * card.spendStart());
         int end = Math.round((float)width * card.fraction());
         if (end > start) {
            graphics.m_280509_(x + start, y, x + end, y + height, alpha(-19894, opacity));
         }

      }
   }

   private static void renderSandyBars(GuiGraphics g, Font font, CombatHudModel.StatusCard card, int x, int y, int width, float opacity, int valueColor, int dark, int signal, int border, int resource) {
      String you = (String)card.details().stream().filter((d) -> d.name().equals("YOU")).map(CombatHudModel.Detail::value).findFirst().orElse("x1.0");
      int percent = splitPercent(card);
      float multScale = 0.75F;
      int multWidth = Math.max(1, Math.round((float)font.m_92895_(you) * multScale));
      int splitWidth = Math.max(1, width - multWidth - 3);
      int chargeBottom = y + 5;
      g.m_280509_(x, y, x + splitWidth, chargeBottom, dark);
      g.m_280509_(x + 1, y + 1, x + splitWidth - 1, chargeBottom - 1, alpha(card.draining() ? -11921888 : -16118253, opacity));
      if (card.draining()) {
         for(int dx = 1; dx < splitWidth - 1; ++dx) {
            for(int dy = 1; dy < 4; ++dy) {
               if ((dx + dy) % 8 < 2) {
                  g.m_280509_(x + dx, y + dy, x + dx + 1, y + dy + 1, signal);
               }
            }
         }
      } else {
         int fill = Math.round((float)(splitWidth - 2) * card.fraction());
         if (fill > 0) {
            g.m_280509_(x + 1, y + 1, x + 1 + fill, chargeBottom - 1, alpha(resource, opacity * (card.recovering() ? 0.65F : 1.0F)));
            g.m_280509_(x + fill, y + 1, x + fill + 1, chargeBottom - 1, valueColor);
         }
      }

      for(int i = 1; i < 4; ++i) {
         int tick = x + Math.round((float)((splitWidth - 1) * i) / 4.0F);
         g.m_280509_(tick, y + 1, tick + 1, chargeBottom - 1, dark);
      }

      g.m_280656_(x + 1, x + splitWidth - 1, chargeBottom - 1, border);
      int worldColor = alpha(-13903361, opacity);
      int youColor = alpha(-19894, opacity);
      g.m_280509_(x, chargeBottom, x + splitWidth, chargeBottom + 3, alpha(-16118253, opacity));
      g.m_280509_(x + 1, chargeBottom + 1, x + splitWidth - 1, chargeBottom + 2, worldColor);
      int youWidth = Math.round((float)((splitWidth - 2) * percent) / 100.0F);
      if (youWidth > 0) {
         g.m_280509_(x + splitWidth - 1 - youWidth, chargeBottom + 1, x + splitWidth - 1, chargeBottom + 2, youColor);
      }

      int division = x + Math.round((float)((splitWidth - 2) * (100 - percent)) / 100.0F);
      g.m_280509_(division, chargeBottom, division + 1, chargeBottom + 3, alpha(-1575169, opacity));
      g.m_280168_().m_85836_();
      g.m_280168_().m_252880_((float)(x + splitWidth + 3), (float)(y + 1), 0.0F);
      g.m_280168_().m_85841_(multScale, multScale, 1.0F);
      g.m_280056_(font, you, 0, 0, valueColor, false);
      g.m_280168_().m_85849_();
   }

   private static void texture(GuiGraphics g, int x, int y, int size, String path, int sourceSize, float opacity) {
      ResourceLocation texture = (ResourceLocation)TEXTURES.computeIfAbsent(path, (key) -> ResourceLocation.fromNamespaceAndPath("project_edgerunner", key));
      g.m_280246_(1.0F, 1.0F, 1.0F, opacity);

      try {
         g.m_280411_(texture, x, y, size, size, 0.0F, 0.0F, sourceSize, sourceSize, sourceSize, sourceSize);
      } finally {
         g.m_280246_(1.0F, 1.0F, 1.0F, 1.0F);
      }

   }

   public static List<Component> description(CombatHudModel.StatusCard card) {
      String var10000;
      switch (card.icon()) {
         case BERSERK -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.berserk");
         case SANDEVISTAN -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.sandevistan");
         case SCAN -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.kiroshi_optics");
         case BLOOD -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.blood_pump");
         case FURY -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.gorilla_arms_fury");
         case FRENZY -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.mantis_blades_crimson_dance");
         default -> throw new IncompatibleClassChangeError();
      }

      String name = var10000;
      ArrayList<Component> lines = new ArrayList();
      lines.add(Component.m_237113_(name + " / " + stateLabel(card.state())));
      if (card.icon() == CombatHudModel.Icon.SANDEVISTAN) {
         String maximum = SandevistanKineticCompensation.formatSpeed(card.sandevistanTuning().maximum());
         lines.add(Component.m_237110_("text.project_edgerunner.cybercombathudrenderer.top_bar_charge_thin_bar_personal_speed_from_x1_to_s_the_number_i", new Object[]{maximum}));
         lines.add(Component.m_237113_(card.sandevistanTuning().forced() ? ClientLocalization.text("hud.project_edgerunner.presentation.cyberpsychosis_forced_maximum_your_normal_split_returns_when_control_is_restored") : ClientLocalization.text("hud.project_edgerunner.presentation.hold_alt_and_scroll_across_the_full_available_speed_range_the_card_appears_while_you_change_it")));
      }

      lines.add(Component.m_237113_(card.draining() ? ClientLocalization.text("hud.project_edgerunner.presentation.overdrive_draining_health") : (card.icon() == CombatHudModel.Icon.FURY ? ClientLocalization.text("hud.project_edgerunner.presentation.bar_accumulated_fury") : (card.icon() == CombatHudModel.Icon.FRENZY ? ClientLocalization.text("hud.project_edgerunner.presentation.bar_time_left_to_execute_the_next_enemy_and_keep_the_chain") : (card.recovering() ? ClientLocalization.text("hud.project_edgerunner.presentation.bar_recharge_progress") : ClientLocalization.text("hud.project_edgerunner.presentation.bar_remaining_resource"))))));
      lines.add(Component.m_237110_("text.project_edgerunner.cybercombathudrenderer.readout_s", new Object[]{displayToken(card.readout())}));

      for(CombatHudModel.Detail detail : card.details()) {
         if (!detail.text().isBlank()) {
            lines.add(Component.m_237113_(detail.name().isEmpty() ? displayToken(detail.value()) : displayToken(detail.name()) + ": " + displayToken(detail.value())));
         }
      }

      if (card.maxCharges() > 0) {
         lines.add(Component.m_237110_("text.project_edgerunner.cybercombathudrenderer.charges_s_s", new Object[]{card.charges(), card.maxCharges()}));
      }

      if (!card.hardware().lanes().isEmpty()) {
         lines.add(Component.m_237115_("text.project_edgerunner.cybercombathudrenderer.one_bar_per_charge_draining_regeneration_filling_recharge_full_r"));

         for(int i = 0; i < card.hardware().lanes().size(); ++i) {
            CombatHudModel.ChargeLane lane = (CombatHudModel.ChargeLane)card.hardware().lanes().get(i);
            lines.add(Component.m_237110_("hud.project_edgerunner.presentation.charge_s_s", new Object[]{i + 1, lane.regenerating() ? Component.m_237110_("hud.project_edgerunner.presentation.regen_s", new Object[]{CombatHudModel.time(lane.activeTicks())}) : (lane.remaining() <= 0 ? Component.m_237115_("hud.project_edgerunner.presentation.ready") : Component.m_237113_(CombatHudModel.time(lane.remaining())))}));
         }
      }

      return lines;
   }

   private static String displayToken(String value) {
      String var10000;
      switch (value) {
         case "BST" -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.bastion");
         case "BRCH" -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.breach");
         case "HEMO" -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.hemorrhage");
         case "PRED" -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.predation");
         case "MOM" -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.momentum");
         case "SEIS" -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.seismic");
         case "LAST" -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.last_stand");
         case "SHOCK" -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.shock_assault");
         case "RDY" -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.ready");
         case "BERSERK" -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.berserk_2");
         case "SANDY" -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.sandy");
         case "OPTICS" -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.optics");
         case "PUMP" -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.pump");
         case "FURY" -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.fury");
         case "CRIMSON DANCE" -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.crimson_dance");
         case "MANTIS GUARD" -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.mantis_guard");
         case "READY" -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.ready_2");
         case "BROKEN" -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.broken");
         case "HP" -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.hp");
         case "HP DRAIN" -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.hp_drain");
         case "LOW HP" -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.low_hp");
         case "Scan" -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.scan");
         case "Cooldown" -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.cooldown");
         case "Charge" -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.charge");
         case "Charges" -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.charges");
         case "Kills" -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.kills");
         case "K" -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.k");
         case "SLOW" -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.slow");
         case "WORLD" -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.world");
         case "YOU" -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.you");
         case "SPLIT" -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.split");
         case "REGEN" -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.regen");
         case "CHAIN" -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.chain");
         case "STABILITY" -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.stability");
         case "RECOVERY" -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.recovery");
         case "ETA" -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.eta");
         case "OVERUSE" -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.overuse");
         case "12.5/s; 5s after release" -> var10000 = ClientLocalization.text("hud.project_edgerunner.presentation.12_5_s_5s_after_release");
         default -> var10000 = value;
      }

      return var10000;
   }

   private static void pixels(GuiGraphics g, int x, int y, String[] pixels, int color) {
      for(int row = 0; row < pixels.length; ++row) {
         for(int col = 0; col < pixels[row].length(); ++col) {
            if (pixels[row].charAt(col) == '1') {
               g.m_280509_(x + col, y + row, x + col + 1, y + row + 1, color);
            }
         }
      }

   }

   private static void stateIcon(GuiGraphics g, int x, int y, CombatHudModel.State state, int color) {
      if (state == CombatHudModel.State.RECOVERY) {
         CyberIcons.cooldown(g, x, y, color);
      } else {
         String[] var10000;
         switch (state) {
            case ACTIVE -> var10000 = new String[]{"1000000", "1100000", "1110000", "1111000", "1110000", "1100000", "1000000"};
            case RECOVERY -> var10000 = new String[]{"0111110", "1000000", "1000000", "1000001", "1000001", "0000011", "0111111"};
            case WARNING -> var10000 = new String[]{"0001000", "0010100", "0010100", "0100010", "0101010", "1000001", "1111111"};
            case DANGER -> var10000 = new String[]{"0011000", "0011000", "0011000", "0011000", "0000000", "0011000", "0011000"};
            case READY -> var10000 = new String[]{"0000000", "0000001", "0000010", "1000100", "0101000", "0010000", "0000000"};
            case MAXIMUM -> var10000 = new String[]{"1111111", "0000000", "0001000", "0011100", "0111110", "0001000", "0001000"};
            default -> throw new IncompatibleClassChangeError();
         }

         String[] pixels = var10000;
         pixels(g, x + 1, y + 1, pixels, color);
      }
   }

   private static int accent(CombatHudModel.State state) {
      int var10000;
      switch (state) {
         case ACTIVE:
            var10000 = -13903361;
            break;
         case RECOVERY:
            var10000 = -8394241;
            break;
         case WARNING:
            var10000 = -19894;
            break;
         case DANGER:
            var10000 = -1754806;
            break;
         case READY:
         case MAXIMUM:
            var10000 = -13510515;
            break;
         default:
            throw new IncompatibleClassChangeError();
      }

      return var10000;
   }

   private static int alpha(int color, float factor) {
      return Math.round((float)(color >>> 24) * Mth.m_14036_(factor, 0.0F, 1.0F)) << 24 | color & 16777215;
   }
}
