package com.edgerunner.animation;

public record ArmPoseAdjustment(double offsetX, double offsetY, double offsetZ, double rotationX, double rotationY, double rotationZ) {
   public static final ArmPoseAdjustment ZERO = new ArmPoseAdjustment((double)0.0F, (double)0.0F, (double)0.0F, (double)0.0F, (double)0.0F, (double)0.0F);

   public ArmPoseAdjustment withOffset(double x, double y, double z) {
      return new ArmPoseAdjustment(x, y, z, this.rotationX, this.rotationY, this.rotationZ);
   }

   public ArmPoseAdjustment withRotation(double x, double y, double z) {
      return new ArmPoseAdjustment(this.offsetX, this.offsetY, this.offsetZ, x, y, z);
   }

   public boolean isZero() {
      return this.offsetX == (double)0.0F && this.offsetY == (double)0.0F && this.offsetZ == (double)0.0F && this.rotationX == (double)0.0F && this.rotationY == (double)0.0F && this.rotationZ == (double)0.0F;
   }
}
