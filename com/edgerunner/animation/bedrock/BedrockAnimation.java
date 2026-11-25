package com.edgerunner.animation.bedrock;

import java.util.List;
import java.util.Map;
import net.minecraft.resources.ResourceLocation;

public record BedrockAnimation(ResourceLocation id, double lengthSeconds, boolean loopExplicit, Map<String, BoneTrack> bones) {
   public BedrockAnimation(ResourceLocation id, double lengthSeconds, boolean loopExplicit, Map<String, BoneTrack> bones) {
      bones = bones == null ? Map.of() : Map.copyOf(bones);
      lengthSeconds = lengthSeconds <= (double)0.0F ? (double)1.0F : lengthSeconds;
      this.id = id;
      this.lengthSeconds = lengthSeconds;
      this.loopExplicit = loopExplicit;
      this.bones = bones;
   }

   public static record BoneTrack(Vector3Channel position, Vector3Channel rotation, Vector3Channel scale) {
      public BoneTrack(Vector3Channel position, Vector3Channel rotation, Vector3Channel scale) {
         position = position == null ? BedrockAnimation.Vector3Channel.ZERO : position;
         rotation = rotation == null ? BedrockAnimation.Vector3Channel.ZERO : rotation;
         scale = scale == null ? BedrockAnimation.Vector3Channel.ONE : scale;
         this.position = position;
         this.rotation = rotation;
         this.scale = scale;
      }
   }

   public static record Vector3Channel(double[] constant, List<Keyframe> keyframes) {
      public static final Vector3Channel ZERO = new Vector3Channel(new double[]{(double)0.0F, (double)0.0F, (double)0.0F}, List.of());
      public static final Vector3Channel ONE = new Vector3Channel(new double[]{(double)1.0F, (double)1.0F, (double)1.0F}, List.of());

      public Vector3Channel(double[] constant, List<Keyframe> keyframes) {
         keyframes = keyframes == null ? List.of() : List.copyOf(keyframes);
         if (constant == null || constant.length < 3) {
            constant = new double[]{(double)0.0F, (double)0.0F, (double)0.0F};
         }

         this.constant = constant;
         this.keyframes = keyframes;
      }

      public boolean isConstant() {
         return this.keyframes.isEmpty();
      }
   }

   public static record Keyframe(double time, double[] preIn, double[] postOut, String easing, double[] easingArgs) {
      public Keyframe(double time, double[] preIn, double[] postOut) {
         this(time, preIn, postOut, "", new double[0]);
      }

      public Keyframe(double time, double[] preIn, double[] postOut, String easing, double[] easingArgs) {
         if (preIn == null || preIn.length < 3) {
            preIn = new double[]{(double)0.0F, (double)0.0F, (double)0.0F};
         }

         if (postOut == null || postOut.length < 3) {
            postOut = (double[])(([D)preIn).clone();
         }

         easing = easing == null ? "" : easing;
         easingArgs = easingArgs == null ? new double[0] : (double[])(([D)easingArgs).clone();
         this.time = time;
         this.preIn = preIn;
         this.postOut = postOut;
         this.easing = easing;
         this.easingArgs = easingArgs;
      }
   }
}
