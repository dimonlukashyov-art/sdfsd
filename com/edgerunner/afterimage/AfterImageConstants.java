package com.edgerunner.afterimage;

public final class AfterImageConstants {
   public static final double TICKS_PER_SECOND = (double)20.0F;
   public static final double DEFAULT_SAMPLE_INTERVAL_SECONDS = 0.05;
   public static final double MIN_SAMPLE_INTERVAL_SECONDS = 0.05;

   private AfterImageConstants() {
   }

   public static double sanitizeSampleIntervalSeconds(double value) {
      return Double.isFinite(value) && !(value <= (double)0.0F) ? Math.max(0.05, value) : 0.05;
   }

   public static double ticksToSeconds(int ticks) {
      return (double)Math.max(1, ticks) / (double)20.0F;
   }
}
