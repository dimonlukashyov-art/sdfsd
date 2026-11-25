package com.edgerunner.client;

import java.util.Objects;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.util.Mth;

public final class CapacityGauge {
   public static final int IMMUNO = -4587562;
   public static final int IMMUNO_DIM = -15321816;
   public static final int NOTCH = 1;

   private CapacityGauge() {
   }

   public static Layout layout(int barHeight, int stable, int maximum, boolean unlimited) {
      int span = Math.max(1, barHeight - 2);
      if (!unlimited && stable > 0 && maximum > stable && span > 3) {
         int usable = span - 1;
         int permanent = Mth.m_14045_(Math.round((float)(usable * stable) / (float)maximum), 1, usable - 1);
         return new Layout(permanent, 1, usable - permanent);
      } else {
         return new Layout(span, 0, 0);
      }
   }

   public static Fill fill(Layout layout, float used, int stable, int maximum, boolean unlimited) {
      if (used <= 0.0F) {
         return new Fill(0, 0);
      } else if (!layout.hasImmuno()) {
         float ratio = unlimited ? Mth.m_14036_(used / Math.max(used, (float)Math.max(1, maximum)), 0.0F, 1.0F) : Mth.m_14036_(used / (float)Math.max(1, maximum), 0.0F, 1.0F);
         return new Fill(Math.max(1, (int)((float)layout.permanent() * ratio)), 0);
      } else if (used <= (float)stable) {
         return new Fill(Math.max(1, (int)((float)layout.permanent() * used / (float)stable)), 0);
      } else {
         float into = Mth.m_14036_((used - (float)stable) / (float)(maximum - stable), 0.0F, 1.0F);
         return new Fill(layout.permanent(), Math.round((float)layout.immuno() * into));
      }
   }

   public static void draw(GuiGraphics g, int x, int y, int w, int h, int stable, int maximum, float used, boolean unlimited, int normal, int over, int overWell) {
      Objects.requireNonNull(g);
      paint(g::m_280509_, x, y, w, h, stable, maximum, used, unlimited, normal, over, overWell);
   }

   public static void paint(Painter g, int x, int y, int w, int h, int stable, int maximum, float used, boolean unlimited, int normal, int over, int overWell) {
      if (w > 2 && h > 2) {
         Layout layout = layout(h, stable, maximum, unlimited);
         boolean overloaded = !unlimited && maximum > 0 && used > (float)maximum;
         int left = x + 1;
         int right = x + w - 1;
         int bottom = y + h - 1;
         int top = y + 1;
         int permanentTop = bottom - layout.permanent();
         int immunoBottom = permanentTop - layout.notch();
         if (!layout.hasImmuno()) {
            if (overloaded) {
               g.fill(x, y, x + w, y + h, overWell);
            }
         } else {
            if (overloaded) {
               g.fill(x, y, x + w, immunoBottom, overWell);
               g.fill(x, permanentTop, x + w, y + h, overWell);
            }

            g.fill(left, top, right, immunoBottom, overloaded ? overWell : -15321816);
         }

         Fill fill = fill(layout, used, stable, maximum, unlimited);
         if (fill.permanent() > 0) {
            g.fill(left, bottom - fill.permanent(), right, bottom, overloaded ? over : normal);
         }

         if (fill.immuno() > 0) {
            g.fill(left, immunoBottom - fill.immuno(), right, immunoBottom, overloaded ? over : -4587562);
         }

      }
   }

   public static record Layout(int permanent, int notch, int immuno) {
      public boolean hasImmuno() {
         return this.immuno > 0;
      }
   }

   public static record Fill(int permanent, int immuno) {
      public int total() {
         return this.permanent + this.immuno;
      }
   }

   @FunctionalInterface
   public interface Painter {
      void fill(int var1, int var2, int var3, int var4, int var5);
   }
}
