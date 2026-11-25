package com.edgerunner.animation;

public record AnimationPoseAdjustment(ArmPoseAdjustment leftArm, ArmPoseAdjustment rightArm, ArmPoseAdjustment item, PoseAdjustmentScope poseScope, ArmVisibilityMode visibilityMode) {
   public static final AnimationPoseAdjustment ZERO;

   public AnimationPoseAdjustment(ArmPoseAdjustment leftArm, ArmPoseAdjustment rightArm, ArmPoseAdjustment item, PoseAdjustmentScope poseScope, ArmVisibilityMode visibilityMode) {
      leftArm = leftArm == null ? ArmPoseAdjustment.ZERO : leftArm;
      rightArm = rightArm == null ? ArmPoseAdjustment.ZERO : rightArm;
      item = item == null ? ArmPoseAdjustment.ZERO : item;
      poseScope = poseScope == null ? PoseAdjustmentScope.BOTH : poseScope;
      visibilityMode = visibilityMode == null ? ArmVisibilityMode.AUTO : visibilityMode;
      this.leftArm = leftArm;
      this.rightArm = rightArm;
      this.item = item;
      this.poseScope = poseScope;
      this.visibilityMode = visibilityMode;
   }

   public AnimationPoseAdjustment withLeftArm(ArmPoseAdjustment adjustment) {
      return new AnimationPoseAdjustment(adjustment, this.rightArm, this.item, this.poseScope, this.visibilityMode);
   }

   public AnimationPoseAdjustment withRightArm(ArmPoseAdjustment adjustment) {
      return new AnimationPoseAdjustment(this.leftArm, adjustment, this.item, this.poseScope, this.visibilityMode);
   }

   public AnimationPoseAdjustment withPoseScope(PoseAdjustmentScope scope) {
      return new AnimationPoseAdjustment(this.leftArm, this.rightArm, this.item, scope == null ? PoseAdjustmentScope.BOTH : scope, this.visibilityMode);
   }

   public AnimationPoseAdjustment withVisibilityMode(ArmVisibilityMode mode) {
      return new AnimationPoseAdjustment(this.leftArm, this.rightArm, this.item, this.poseScope, mode == null ? ArmVisibilityMode.AUTO : mode);
   }

   public ArmPoseAdjustment forTarget(AnimationTarget target) {
      return target == AnimationTarget.ARMOR_RIGHT_ARM ? this.rightArm : this.leftArm;
   }

   public boolean armsAllZero() {
      return this.leftArm.isZero() && this.rightArm.isZero() && this.item.isZero();
   }

   public boolean isDefaultTuning() {
      return this.armsAllZero() && this.poseScope == PoseAdjustmentScope.BOTH && this.visibilityMode == ArmVisibilityMode.AUTO;
   }

   static {
      ZERO = new AnimationPoseAdjustment(ArmPoseAdjustment.ZERO, ArmPoseAdjustment.ZERO, ArmPoseAdjustment.ZERO, PoseAdjustmentScope.BOTH, ArmVisibilityMode.AUTO);
   }
}
