package com.edgerunner.client;

import java.util.ArrayList;
import java.util.List;

public final class CombatChipModel {
   public static final int SIZE = 22;
   public static final int GAP = 2;
   public static final int READOUT_HEIGHT = 7;
   public static final int READOUT_WIDTH = 26;
   public static final long BLINK_MS = 250L;

   private CombatChipModel() {
   }

   public static boolean ending(CombatHudModel.StatusCard card) {
      if (!card.draining() && card.state() != CombatHudModel.State.WARNING && card.state() != CombatHudModel.State.DANGER) {
         return card.state() == CombatHudModel.State.ACTIVE && card.icon() != CombatHudModel.Icon.FURY && card.fraction() <= 0.25F;
      } else {
         return true;
      }
   }

   public static boolean visible(CombatHudModel.StatusCard card, Show show) {
      boolean var10000;
      switch (show) {
         case ALL -> var10000 = true;
         case ACTIVE -> var10000 = card.state() != CombatHudModel.State.RECOVERY;
         case ALERTS -> var10000 = card.state() == CombatHudModel.State.READY || card.state() == CombatHudModel.State.MAXIMUM || ending(card);
         default -> throw new IncompatibleClassChangeError();
      }

      return var10000;
   }

   public static float blink(CombatHudModel.StatusCard card, long now) {
      return ending(card) && now / 250L % 2L != 0L ? 0.45F : 1.0F;
   }

   public static String readout(CombatHudModel.StatusCard card) {
      if (card.icon() == CombatHudModel.Icon.FRENZY) {
         for(CombatHudModel.Detail detail : card.details()) {
            if (detail.name().equals("CHAIN")) {
               return detail.value();
            }
         }
      }

      return card.readout();
   }

   public static int chipWidth(Flow flow, boolean readout) {
      return flow == CombatChipModel.Flow.COLUMN && readout ? 50 : 22;
   }

   public static int chipHeight(Flow flow, boolean readout) {
      return flow == CombatChipModel.Flow.ROW && readout ? 29 : 22;
   }

   public static CombatHudModel.Layout layout(int count, Flow flow, boolean readout, int screenWidth, int screenHeight) {
      if (count <= 0) {
         return new CombatHudModel.Layout(List.of(), 0, 0);
      } else {
         int width = chipWidth(flow, readout);
         int height = chipHeight(flow, readout);
         int perLine = flow == CombatChipModel.Flow.ROW ? Math.max(1, (Math.max(1, screenWidth) + 2) / (width + 2)) : Math.max(1, (Math.max(1, screenHeight) + 2) / (height + 2));
         List<CombatHudModel.Box> boxes = new ArrayList();
         int maxX = 0;
         int maxY = 0;

         for(int i = 0; i < count; ++i) {
            int along = i % perLine;
            int line = i / perLine;
            int x = (flow == CombatChipModel.Flow.ROW ? along : line) * (width + 2);
            int y = (flow == CombatChipModel.Flow.ROW ? line : along) * (height + 2);
            boxes.add(new CombatHudModel.Box(i, x, y, width, height));
            maxX = Math.max(maxX, x + width);
            maxY = Math.max(maxY, y + height);
         }

         return new CombatHudModel.Layout(List.copyOf(boxes), maxX, maxY);
      }
   }

   public static enum Flow {
      ROW,
      COLUMN;

      // $FF: synthetic method
      private static Flow[] $values() {
         return new Flow[]{ROW, COLUMN};
      }
   }

   public static enum Show {
      ALL,
      ACTIVE,
      ALERTS;

      // $FF: synthetic method
      private static Show[] $values() {
         return new Show[]{ALL, ACTIVE, ALERTS};
      }
   }
}
