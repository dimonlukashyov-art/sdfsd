package com.edgerunner.client;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.function.UnaryOperator;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class CyberToastPopup {
   public static final int ENTER = 7;
   public static final int LEAVE = 7;
   public static final int HOLD = 60;
   public static final int MAX_STACK = 3;
   public static final int PANEL_H = 18;
   public static final int GAP = 2;
   public static final int MIN_W = 100;
   public static final int MAX_W = 170;
   public static final int CARD_GAP = 3;
   public static final int CROSS_CLEAR = 10;
   public static final int HOTBAR_RESERVE = 24;
   public static final int TEXT_X = 6;
   public static final int TEXT_RIGHT = 7;
   public static final int SOURCE_GAP = 10;
   public static final int READY = -13903361;
   public static final int DANGER = -1754806;
   public static final int FURY = -19894;
   public static final int BLOOD = -6089697;
   private static final String KEY = "hud.project_edgerunner.toast.";
   private static final Pattern CHAIN = Pattern.compile("^(?:CRIMSON DANCE|DANZA CARMESÍ|АЛЫЙ ТАНЕЦ) X(\\d+)$");
   private static final Pattern PUMP_CHARGE = Pattern.compile("^BLOOD PUMP (\\d+/\\d+)$");
   private static final Map<String, Callout> KNOWN = new HashMap();

   private CyberToastPopup() {
   }

   private static Callout positive(String slot, int color, String titleKey) {
      return new Callout(slot, false, color, "hud.project_edgerunner.toast." + titleKey, (String)null, "", "");
   }

   private static Callout warning(String slot, int color, String nameKey, String sourceKey) {
      return new Callout(slot, true, color, "hud.project_edgerunner.toast." + nameKey, "hud.project_edgerunner.toast." + sourceKey, "", "");
   }

   private static void known(Callout callout, String... texts) {
      for(String text : texts) {
         KNOWN.put(text, callout);
      }

   }

   static Iterable<Callout> knownCallouts() {
      return KNOWN.values();
   }

   public static Callout parse(String raw) {
      String upper = raw == null ? "" : raw.trim().toUpperCase(Locale.ROOT);
      Callout known = (Callout)KNOWN.get(upper);
      if (known != null) {
         return known;
      } else {
         Matcher chain = CHAIN.matcher(upper);
         if (chain.matches()) {
            return new Callout("dance", true, -1754806, "hud.project_edgerunner.toast.name.dance", "hud.project_edgerunner.toast.band.chain", chain.group(1), "");
         } else {
            Matcher charge = PUMP_CHARGE.matcher(upper);
            return charge.matches() ? new Callout("pump", false, -13903361, "hud.project_edgerunner.toast.pump_charge", (String)null, charge.group(1), "") : new Callout(upper, false, -13903361, (String)null, (String)null, "", upper);
         }
      }
   }

   public static int life(int requested) {
      return 7 + Math.max(60, Math.max(0, requested)) + 7;
   }

   public static boolean entering(int age) {
      return age <= 7;
   }

   public static boolean leaving(int age, int life) {
      return !entering(age) && life - age + 1 <= 7;
   }

   public static float open(int age, int life, float partial) {
      float opening = ((float)(age - 1) + partial) / 7.0F;
      float closing = ((float)(life - age + 1) - partial) / 7.0F;
      float t = Math.max(0.0F, Math.min(1.0F, Math.min(opening, closing)));
      return t < 0.5F ? 4.0F * t * t * t : 1.0F - (float)Math.pow((double)(-2.0F * t + 2.0F), (double)3.0F) / 2.0F;
   }

   public static float calmAlpha(int age, int life, float partial) {
      if (age <= 7) {
         return Math.min(1.0F, ((float)(age - 1) + partial) / 7.0F);
      } else {
         int remaining = life - age + 1;
         return remaining <= 7 ? Math.max(0.0F, Math.min(1.0F, ((float)remaining - partial) / 7.0F)) : 1.0F;
      }
   }

   public static int width(int titleWidth, int sourceWidth) {
      int wide = 6 + titleWidth + (sourceWidth > 0 ? 10 + sourceWidth : 0) + 7;
      return wide <= 170 ? Math.max(100, wide) : Math.min(170, Math.max(100, 6 + titleWidth + 7));
   }

   public static boolean showsSource(int titleWidth, int sourceWidth) {
      return sourceWidth > 0 && 6 + titleWidth + 10 + sourceWidth + 7 <= 170;
   }

   public static Stack stack(int cardY, int cardBottom, int guiHeight) {
      int top = Math.max(cardY + 47 + 3, cardBottom > 0 ? cardBottom + 3 : 0);
      int crossTop = guiHeight / 2 - 10;
      if (top + 18 <= crossTop) {
         return new Stack(top, fit(crossTop - top));
      } else {
         top = Math.max(top, guiHeight / 2 + 10);
         return new Stack(top, fit(guiHeight - 24 - top));
      }
   }

   private static int fit(int room) {
      return Math.max(1, Math.min(3, (room + 2) / 20));
   }

   static {
      known(positive("berserk", -13903361, "berserk_ready"), "BERSERK READY");
      known(positive("sandevistan", -13903361, "sandevistan_ready"), "SANDEVISTAN READY");
      known(positive("scan", -13903361, "scan_ready"), "SCAN READY");
      known(positive("pump", -13903361, "pump_ready"), "BLOOD PUMP READY");
      known(positive("fury", -19894, "fury_ready"), "FURY READY");
      known(positive("dance", -13903361, "dance_ready"), "CRIMSON DANCE READY");
      known(positive("impact", -13903361, "impact_ready"), "SLAM READY", "IMPACT READY", "IMPACTO LISTO", "СЛЭМ ГОТОВ");
      known(positive("leap", -13903361, "leap_ready"), "LEAP READY", "SALTO LISTO", "ПРЫЖОК ГОТОВ");
      known(positive("parry", -13903361, "parry"), "PERFECT PARRY", "PARADA PERFECTA", "ИДЕАЛЬНОЕ ПАРИРОВАНИЕ");
      known(warning("sandevistan", -1754806, "name.sandevistan", "band.overload"), "OVERDRIVE", "OVERLOAD");
      known(warning("fury", -19894, "name.fury", "band.maximum"), "FURY MAX");
      known(warning("dance", -1754806, "name.dance", "band.maximum"), "CRIMSON DANCE MAX");
      known(warning("dance", -1754806, "name.dance", "band.execution"), "CRIMSON DANCE", "DANZA CARMESÍ", "АЛЫЙ ТАНЕЦ");
      known(warning("hemorrhage", -6089697, "name.mantis", "band.hemorrhage"), "HEMORRHAGE", "HEMORRAGIA", "КРОВОИЗЛИЯНИЕ");
   }

   public static record Callout(String slot, boolean warning, int color, String titleKey, String sourceKey, String arg, String literal) {
      String title(UnaryOperator<String> lang) {
         String title = this.titleKey == null ? this.literal : ((String)lang.apply(this.titleKey)).replace("%s", this.arg);
         return title.toUpperCase(Locale.ROOT);
      }

      String source(UnaryOperator<String> lang) {
         return this.sourceKey == null ? "" : ((String)lang.apply(this.sourceKey)).replace("%s", this.arg).toUpperCase(Locale.ROOT);
      }
   }

   public static record Stack(int top, int slots) {
   }
}
