package com.edgerunner.client;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.ToIntFunction;

public final class CombatHudModel {
   public static final int WIDTH = 152;
   public static final int CARD_HEIGHT = 28;
   public static final int GAP = 3;
   public static final int IMPLANT_ICON_SIZE = 20;
   public static final long READY_MS = 2000L;
   public static final long PULSE_MS = 600L;
   public static final long TRANSITION_MS = 140L;
   private static final List<String> ORDER = List.of("berserk", "sandevistan", "optics_scan", "blood_pump", "gorilla_fury", "mantis_frenzy");

   private CombatHudModel() {
   }

   private static float unit(float n) {
      return Float.isFinite(n) ? Math.max(0.0F, Math.min(1.0F, n)) : 0.0F;
   }

   public static StatusCard optics(int active, int activeMax, int cooldown, int cooldownMax, String name) {
      if (active > 0) {
         float fraction = (float)active / (float)Math.max(active, activeMax);
         return CombatHudModel.StatusCard.create("optics_scan", CombatHudModel.Icon.SCAN, "OPTICS", fraction, fraction <= 0.25F ? CombatHudModel.State.WARNING : CombatHudModel.State.ACTIVE, -1.0F, new Detail("Scan", name)).readout(time(active));
      } else {
         return cooldown > 0 ? CombatHudModel.StatusCard.create("optics_scan", CombatHudModel.Icon.SCAN, "OPTICS", 1.0F - (float)cooldown / (float)Math.max(cooldown, cooldownMax), CombatHudModel.State.RECOVERY, -1.0F, new Detail("Scan", name), new Detail("Cooldown", time(cooldown))).availability(true, false, false).readout(time(cooldown)).cooldown(cooldown, cooldownMax) : CombatHudModel.StatusCard.create("optics_scan", CombatHudModel.Icon.SCAN, "OPTICS", 1.0F, CombatHudModel.State.READY, -1.0F, new Detail("Scan", name)).availability(false, true, true).readout("READY").cooldown(0, cooldownMax);
      }
   }

   private static int order(String id) {
      int i = ORDER.indexOf(id);
      return i < 0 ? ORDER.size() : i;
   }

   static float pulse(long now, long start) {
      if (start >= 0L && now >= start && now - start < 600L) {
         double wave = Math.sin((Math.PI * 2D) * (double)(now - start) / (double)600.0F);
         return (float)(wave * wave);
      } else {
         return 0.0F;
      }
   }

   public static List<String> wrap(String text, int width, ToIntFunction<String> measure) {
      List<String> lines = new ArrayList();
      StringBuilder line = new StringBuilder();

      for(String word : text.split("\\s+")) {
         if (!word.isEmpty()) {
            if (!line.isEmpty()) {
               String var10001 = String.valueOf(line);
               if (measure.applyAsInt(var10001 + " " + word) <= width) {
                  line.append(' ').append(word);
                  continue;
               }
            }

            if (!line.isEmpty()) {
               lines.add(line.toString());
               line.setLength(0);
            }

            for(int cp : word.codePoints().toArray()) {
               String next = new String(Character.toChars(cp));
               if (!line.isEmpty()) {
                  String var14 = String.valueOf(line);
                  if (measure.applyAsInt(var14 + next) > width) {
                     lines.add(line.toString());
                     line.setLength(0);
                  }
               }

               line.append(next);
            }
         }
      }

      if (!line.isEmpty()) {
         lines.add(line.toString());
      }

      return lines;
   }

   public static String effectReadout(StatusCard card) {
      return "";
   }

   public static TextLayout textLayout(StatusCard card, int width, int lineHeight, ToIntFunction<String> measure) {
      String effect = effectReadout(card);
      String primary = effect.isEmpty() ? card.readout() : effect;
      int titleReserve = Math.min(measure.applyAsInt(card.label()), Math.max(12, (width - 48) / 2));
      int readoutWidth = Math.min(Math.max(24, measure.applyAsInt(primary)), Math.max(24, width - 48 - titleReserve));
      List<String> readout = wrap(primary, readoutWidth, measure);
      List<String> title = wrap(card.label(), Math.max(12, width - 48 - readoutWidth), measure);
      int header = Math.max(9, Math.max(title.size(), readout.size()) * lineHeight);
      int footerWidth = effect.isEmpty() ? 0 : Math.min(Math.max(measure.applyAsInt("00.0s"), measure.applyAsInt(card.readout())), Math.max(12, (width - 40) / 2));
      List<String> footer = effect.isEmpty() ? List.of() : wrap(card.readout(), footerWidth, measure);
      int socketHeight = card.maxCharges() > 0 ? 24 + (card.maxCharges() + 3) / 4 * 3 : 28;
      int baseHeight = Math.max(socketHeight, Math.max(28, 4 + header + 3 + Math.max(8, footer.size() * lineHeight) + 3));
      return new TextLayout(title, readout, readoutWidth, header, baseHeight, footer, width - 34 - (effect.isEmpty() ? 0 : footerWidth + 5));
   }

   public static Socket socket(int height, int charges) {
      int rows = (Math.max(0, charges) + 3) / 4;
      int groupHeight = 20 + rows * 3;
      int top = (height - groupHeight) / 2;
      return new Socket(1, top, top + 20 + 1);
   }

   public static String time(int ticks) {
      int safe = Math.max(0, ticks);
      if (safe < 1200) {
         return String.format(Locale.ROOT, "%.1fs", (double)safe / (double)20.0F);
      } else {
         int seconds = (int)(((long)safe + 19L) / 20L);
         return seconds < 3600 ? String.format(Locale.ROOT, "%d:%02d", seconds / 60, seconds % 60) : seconds / 3600 + "h";
      }
   }

   public static Layout layout(int count, int screenWidth, int screenHeight, HeightMeasure measure) {
      if (count == 0) {
         return new Layout(List.of(), 0, 0);
      } else {
         int availableWidth = Math.max(1, screenWidth);
         int availableHeight = Math.max(1, screenHeight);
         Layout fallback = null;

         for(int columns = 1; columns <= count; ++columns) {
            for(int gap : new int[]{3, 2}) {
               int width = Math.min(152, (availableWidth - gap * (columns - 1)) / columns);
               if (width < 96 && columns > 1) {
                  break;
               }

               width = Math.max(1, width);
               List<Box> boxes = new ArrayList();
               int column = 0;
               int y = 0;
               int maxY = 0;

               for(int i = 0; i < count; ++i) {
                  int height = measure.height(i, width);
                  if (y > 0 && y + height > availableHeight) {
                     ++column;
                     y = 0;
                  }

                  boxes.add(new Box(i, column * (width + gap), y, width, height));
                  y += height + gap;
                  maxY = Math.max(maxY, y - gap);
               }

               Layout candidate = new Layout(List.copyOf(boxes), (column + 1) * width + column * gap, maxY);
               if (fallback == null || (long)candidate.width() * (long)candidate.height() < (long)fallback.width() * (long)fallback.height()) {
                  fallback = candidate;
               }

               if (column < columns && candidate.width() <= availableWidth && candidate.height() <= availableHeight) {
                  return candidate;
               }
            }
         }

         return fallback;
      }
   }

   public static enum Icon {
      BERSERK,
      SANDEVISTAN,
      SCAN,
      BLOOD,
      FURY,
      FRENZY;

      // $FF: synthetic method
      private static Icon[] $values() {
         return new Icon[]{BERSERK, SANDEVISTAN, SCAN, BLOOD, FURY, FRENZY};
      }
   }

   public static enum State {
      ACTIVE,
      RECOVERY,
      WARNING,
      DANGER,
      READY,
      MAXIMUM;

      // $FF: synthetic method
      private static State[] $values() {
         return new State[]{ACTIVE, RECOVERY, WARNING, DANGER, READY, MAXIMUM};
      }
   }

   public static record Detail(String name, String value) {
      public String text() {
         return this.name.isEmpty() ? this.value : this.name + ": " + this.value;
      }
   }

   public static record ChargeLane(int remaining, int maximum, int activeTicks, int activeMaxTicks) {
      public ChargeLane(int remaining, int maximum) {
         this(remaining, maximum, 0, 0);
      }

      public boolean regenerating() {
         return this.activeTicks > 0;
      }

      public float fraction() {
         if (this.regenerating()) {
            return CombatHudModel.unit((float)this.activeTicks / (float)Math.max(this.activeTicks, this.activeMaxTicks));
         } else {
            return this.remaining <= 0 ? 1.0F : CombatHudModel.unit(1.0F - (float)this.remaining / (float)Math.max(this.remaining, this.maximum));
         }
      }
   }

   public static record Hardware(String itemId, int remaining, int maximum, List<ChargeLane> lanes) {
      public Hardware(String itemId, int remaining, int maximum, List<ChargeLane> lanes) {
         lanes = List.copyOf(lanes);
         this.itemId = itemId;
         this.remaining = remaining;
         this.maximum = maximum;
         this.lanes = lanes;
      }

      public Hardware(String itemId, int remaining, int maximum) {
         this(itemId, remaining, maximum, List.of());
      }
   }

   public static record SandevistanTuning(float fraction, double maximum, boolean forced) {
      public static final SandevistanTuning NONE = new SandevistanTuning(-1.0F, (double)1.0F, false);

      public SandevistanTuning(float fraction, double maximum, boolean forced) {
         fraction = fraction < 0.0F ? -1.0F : CombatHudModel.unit(fraction);
         maximum = Double.isFinite(maximum) ? Math.max((double)1.0F, maximum) : (double)1.0F;
         this.fraction = fraction;
         this.maximum = maximum;
         this.forced = forced;
      }
   }

   public static record StatusCard(String id, Icon icon, String label, List<Detail> details, float fraction, State state, float markerFraction, boolean draining, boolean recovering, boolean complete, boolean available, int charges, int maxCharges, String readout, Hardware hardware, SandevistanTuning sandevistanTuning, float spendFraction) {
      public StatusCard(String id, Icon icon, String label, List<Detail> details, float fraction, State state, float markerFraction, boolean draining, boolean recovering, boolean complete, boolean available, int charges, int maxCharges, String readout, Hardware hardware, SandevistanTuning sandevistanTuning, float spendFraction) {
         details = List.copyOf(details);
         fraction = CombatHudModel.unit(fraction);
         markerFraction = !(markerFraction < 0.0F) && Float.isFinite(markerFraction) ? CombatHudModel.unit(markerFraction) : -1.0F;
         maxCharges = Math.max(0, maxCharges);
         charges = Math.max(0, Math.min(charges, maxCharges));
         sandevistanTuning = sandevistanTuning == null ? CombatHudModel.SandevistanTuning.NONE : sandevistanTuning;
         spendFraction = Math.min(fraction, CombatHudModel.unit(spendFraction));
         this.id = id;
         this.icon = icon;
         this.label = label;
         this.details = details;
         this.fraction = fraction;
         this.state = state;
         this.markerFraction = markerFraction;
         this.draining = draining;
         this.recovering = recovering;
         this.complete = complete;
         this.available = available;
         this.charges = charges;
         this.maxCharges = maxCharges;
         this.readout = readout;
         this.hardware = hardware;
         this.sandevistanTuning = sandevistanTuning;
         this.spendFraction = spendFraction;
      }

      public StatusCard(String id, Icon icon, String label, List<Detail> details, float fraction, State state, float markerFraction, boolean draining, boolean recovering, boolean complete, boolean available, int charges, int maxCharges, String readout, Hardware hardware, SandevistanTuning sandevistanTuning) {
         this(id, icon, label, details, fraction, state, markerFraction, draining, recovering, complete, available, charges, maxCharges, readout, hardware, sandevistanTuning, 0.0F);
      }

      public StatusCard(String id, Icon icon, String label, List<Detail> details, float fraction, State state, float markerFraction, boolean draining, boolean recovering, boolean complete, boolean available, int charges, int maxCharges, String readout, Hardware hardware) {
         this(id, icon, label, details, fraction, state, markerFraction, draining, recovering, complete, available, charges, maxCharges, readout, hardware, CombatHudModel.SandevistanTuning.NONE);
      }

      public StatusCard spend(float spend) {
         return new StatusCard(this.id, this.icon, this.label, this.details, this.fraction, this.state, this.markerFraction, this.draining, this.recovering, this.complete, this.available, this.charges, this.maxCharges, this.readout, this.hardware, this.sandevistanTuning, spend);
      }

      public float spendStart() {
         return Math.max(0.0F, this.fraction - this.spendFraction);
      }

      public static StatusCard create(String id, Icon icon, String label, float fraction, State state, float marker, Detail... details) {
         return new StatusCard(id, icon, label, List.of(details), fraction, state, marker, false, false, false, false, 0, 0, Math.round(CombatHudModel.unit(fraction) * 100.0F) + "%", new Hardware("", -1, 0));
      }

      public StatusCard availability(boolean recovering, boolean complete, boolean available) {
         return new StatusCard(this.id, this.icon, this.label, this.details, this.fraction, this.state, this.markerFraction, this.draining, recovering, complete, available, this.charges, this.maxCharges, this.readout, this.hardware, this.sandevistanTuning, this.spendFraction);
      }

      public StatusCard charges(int charges, int maxCharges) {
         return new StatusCard(this.id, this.icon, this.label, this.details, this.fraction, this.state, this.markerFraction, this.draining, this.recovering, this.complete, this.available, charges, maxCharges, this.readout, this.hardware, this.sandevistanTuning, this.spendFraction);
      }

      public StatusCard readout(String value) {
         return new StatusCard(this.id, this.icon, this.label, this.details, this.fraction, this.state, this.markerFraction, this.draining, this.recovering, this.complete, this.available, this.charges, this.maxCharges, value, this.hardware, this.sandevistanTuning, this.spendFraction);
      }

      public StatusCard hardware(String itemId) {
         return this.withHardware(new Hardware(itemId, this.hardware.remaining(), this.hardware.maximum(), this.hardware.lanes()));
      }

      public StatusCard cooldown(int remaining, int maximum) {
         return this.withHardware(new Hardware(this.hardware.itemId(), Math.max(0, remaining), Math.max(0, maximum), this.hardware.lanes()));
      }

      public StatusCard lanes(List<ChargeLane> lanes) {
         return this.withHardware(new Hardware(this.hardware.itemId(), this.hardware.remaining(), this.hardware.maximum(), lanes));
      }

      private StatusCard withHardware(Hardware value) {
         return new StatusCard(this.id, this.icon, this.label, this.details, this.fraction, this.state, this.markerFraction, this.draining, this.recovering, this.complete, this.available, this.charges, this.maxCharges, this.readout, value, this.sandevistanTuning, this.spendFraction);
      }

      StatusCard progress(float value) {
         return new StatusCard(this.id, this.icon, this.label, this.details, value, this.state, this.markerFraction, this.draining, this.recovering, this.complete, this.available, this.charges, this.maxCharges, this.readout, this.hardware, this.sandevistanTuning, this.spendFraction);
      }

      public StatusCard drain() {
         return new StatusCard(this.id, this.icon, this.label, this.details, 0.0F, CombatHudModel.State.DANGER, -1.0F, true, this.recovering, this.complete, this.available, this.charges, this.maxCharges, "HP", this.hardware, this.sandevistanTuning);
      }

      StatusCard ready() {
         return new StatusCard(this.id, this.icon, this.label, this.details, 1.0F, CombatHudModel.State.READY, this.markerFraction, false, false, true, true, this.charges, this.maxCharges, "READY", this.hardware, this.sandevistanTuning);
      }

      public StatusCard sandevistanTuning(double fraction, double maximum, boolean forced) {
         return new StatusCard(this.id, this.icon, this.label, this.details, this.fraction, this.state, this.markerFraction, this.draining, this.recovering, this.complete, this.available, this.charges, this.maxCharges, this.readout, this.hardware, new SandevistanTuning((float)fraction, maximum, forced));
      }
   }

   public static record Frame(StatusCard card, float opacity, float pulse, float axolotl) {
      public Frame(StatusCard card, float opacity, float pulse) {
         this(card, opacity, pulse, 0.0F);
      }
   }

   private static final class Entry {
      StatusCard previous;
      StatusCard display;
      long readyUntil = -1L;
      long pulseAt = -1L;
      float opacity;
      int baseline;
      int boostSerial = -1;
      int[] laneBaselines = new int[0];
      long sampleAt;
      long benefitAt = -10000L;
      long boostAt = -10000L;
   }

   public static final class Timeline {
      private final Map<String, Entry> entries = new LinkedHashMap();
      private long last = -1L;
      private int lastProc = -1;
      private long procAt = -10000L;

      public void clear() {
         this.entries.clear();
         this.last = -1L;
         this.lastProc = -1;
         this.procAt = -10000L;
      }

      public List<Frame> update(List<StatusCard> input, long now) {
         return this.update(input, now, 0);
      }

      public List<Frame> update(List<StatusCard> input, long now, int axolotlSerial) {
         if (this.lastProc >= 0 && axolotlSerial > this.lastProc) {
            this.procAt = now;
         }

         this.lastProc = axolotlSerial;
         float step = this.last < 0L ? 1.0F : Math.max(0.0F, Math.min(1.0F, (float)(now - this.last) / 140.0F));
         this.last = now;
         Map<String, StatusCard> incoming = new LinkedHashMap();

         for(StatusCard card : input) {
            incoming.put(card.id(), card);
         }

         for(StatusCard card : incoming.values()) {
            Entry e = (Entry)this.entries.computeIfAbsent(card.id(), (ignored) -> new Entry());
            StatusCard old = e.previous;
            if (old != null && !old.hardware().itemId().equals(card.hardware().itemId())) {
               e = new Entry();
               this.entries.put(card.id(), e);
               old = null;
            }

            int remaining = card.hardware().remaining();
            if (old != null && remaining >= 0 && old.hardware().remaining() >= 0) {
               int before = old.hardware().remaining();
               if (remaining != before) {
                  long naturalDrain = card.icon() == CombatHudModel.Icon.BERSERK && card.state() == CombatHudModel.State.ACTIVE ? 0L : Math.max(0L, now - e.sampleAt) / 50L + 2L;
                  if ((long)before - (long)remaining > naturalDrain) {
                     e.benefitAt = now;
                  }

                  e.sampleAt = now;
               }

               if (now - this.procAt <= 700L && now - e.benefitAt <= 700L && e.boostSerial != axolotlSerial) {
                  e.boostAt = now;
                  e.boostSerial = axolotlSerial;
                  e.benefitAt = -10000L;
               }
            } else {
               e.sampleAt = now;
            }

            if (card.state() == CombatHudModel.State.RECOVERY && remaining >= 0) {
               boolean newCycle = old == null || old.state() != CombatHudModel.State.RECOVERY || remaining > old.hardware().remaining() || card.charges() != old.charges();
               if (newCycle) {
                  e.baseline = Math.max(remaining, card.hardware().maximum());
               } else {
                  e.baseline = Math.max(e.baseline, card.hardware().maximum());
               }
            } else {
               e.baseline = 0;
            }

            if (old == null && (card.state() == CombatHudModel.State.WARNING || card.state() == CombatHudModel.State.DANGER || card.state() == CombatHudModel.State.MAXIMUM)) {
               e.pulseAt = now;
            }

            if (old != null && old.recovering() && card.complete() && !old.complete()) {
               e.readyUntil = now + 2000L;
               e.pulseAt = now;
            }

            if (!card.complete()) {
               e.readyUntil = -1L;
            }

            if (old != null && (!old.available() && card.available() || card.charges() > old.charges() || old.state() != card.state() && (card.state() == CombatHudModel.State.WARNING || card.state() == CombatHudModel.State.DANGER || card.state() == CombatHudModel.State.MAXIMUM))) {
               e.pulseAt = now;
            }

            e.previous = card;
            e.display = card.complete() && now < e.readyUntil ? card.ready() : card;
            if (e.baseline > 0 && card.state() == CombatHudModel.State.RECOVERY) {
               e.display = e.display.progress(1.0F - (float)remaining / (float)e.baseline);
            }

            List<ChargeLane> lanes = card.hardware().lanes();
            if (e.laneBaselines.length != lanes.size()) {
               e.laneBaselines = new int[lanes.size()];
            }

            ArrayList<ChargeLane> displayedLanes = new ArrayList();

            for(int i = 0; i < lanes.size(); ++i) {
               ChargeLane lane = (ChargeLane)lanes.get(i);
               ChargeLane before = old != null && old.hardware().lanes().size() > i ? (ChargeLane)old.hardware().lanes().get(i) : null;
               if (before != null && before.regenerating() && !lane.regenerating()) {
                  e.laneBaselines[i] = lane.remaining();
               } else if (before != null && lane.remaining() > 0 && lane.remaining() <= before.remaining()) {
                  if (lane.maximum() > before.maximum()) {
                     int[] var10000 = e.laneBaselines;
                     var10000[i] += lane.maximum() - before.maximum();
                  }
               } else {
                  e.laneBaselines[i] = Math.max(lane.remaining(), lane.maximum() - lane.activeMaxTicks());
               }

               displayedLanes.add(new ChargeLane(lane.remaining(), e.laneBaselines[i], lane.activeTicks(), lane.activeMaxTicks()));
            }

            if (!lanes.isEmpty()) {
               e.display = e.display.lanes(displayedLanes);
            }
         }

         List<Frame> result = new ArrayList();
         Iterator<Map.Entry<String, Entry>> iterator = this.entries.entrySet().iterator();

         while(iterator.hasNext()) {
            Map.Entry<String, Entry> item = (Map.Entry)iterator.next();
            Entry e = (Entry)item.getValue();
            boolean present = incoming.containsKey(item.getKey());
            boolean visible = present && (!e.previous.complete() || now < e.readyUntil);
            if (present && e.previous.complete()) {
               e.opacity = visible ? Math.min(1.0F, (float)(e.readyUntil - now) / 140.0F) : 0.0F;
            } else {
               e.opacity = visible ? Math.min(1.0F, e.opacity + step) : Math.max(0.0F, e.opacity - step);
            }

            if (e.opacity > 0.0F) {
               result.add(new Frame(e.display, e.opacity, CombatHudModel.pulse(now, e.pulseAt), Math.max(0.0F, 1.0F - (float)(now - e.boostAt) / 900.0F)));
            }

            if (!present) {
               e.previous = null;
               e.readyUntil = -1L;
               if (e.opacity == 0.0F) {
                  iterator.remove();
               }
            }
         }

         result.sort(Comparator.comparingInt((f) -> CombatHudModel.order(f.card().id())));
         return List.copyOf(result);
      }
   }

   public static record TextLayout(List<String> title, List<String> readout, int readoutWidth, int headerHeight, int height, List<String> barReadout, int barWidth) {
   }

   public static record Socket(int iconX, int iconY, int cellsY) {
   }

   public static record Box(int index, int x, int y, int width, int height) {
   }

   public static record Layout(List<Box> boxes, int width, int height) {
   }

   @FunctionalInterface
   public interface HeightMeasure {
      int height(int var1, int var2);
   }
}
