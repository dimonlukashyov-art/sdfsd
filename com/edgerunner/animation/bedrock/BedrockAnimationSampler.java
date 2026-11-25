package com.edgerunner.animation.bedrock;

import java.util.List;

public final class BedrockAnimationSampler {
   private BedrockAnimationSampler() {
   }

   public static double[] sample(BedrockAnimation.Vector3Channel channel, double timeSeconds, double[] out) {
      if (channel == null) {
         out[0] = (double)0.0F;
         out[1] = (double)0.0F;
         out[2] = (double)0.0F;
         return out;
      } else if (channel.isConstant()) {
         double[] c = channel.constant();
         out[0] = c[0];
         out[1] = c[1];
         out[2] = c[2];
         return out;
      } else {
         List<BedrockAnimation.Keyframe> keys = channel.keyframes();
         BedrockAnimation.Keyframe first = (BedrockAnimation.Keyframe)keys.get(0);
         if (timeSeconds <= first.time()) {
            double[] v = first.preIn();
            out[0] = v[0];
            out[1] = v[1];
            out[2] = v[2];
            return out;
         } else {
            BedrockAnimation.Keyframe last = (BedrockAnimation.Keyframe)keys.get(keys.size() - 1);
            if (timeSeconds >= last.time()) {
               double[] v = last.postOut();
               out[0] = v[0];
               out[1] = v[1];
               out[2] = v[2];
               return out;
            } else {
               int lo = 0;
               int hi = keys.size() - 1;

               while(lo + 1 < hi) {
                  int mid = lo + hi >>> 1;
                  if (((BedrockAnimation.Keyframe)keys.get(mid)).time() <= timeSeconds) {
                     lo = mid;
                  } else {
                     hi = mid;
                  }
               }

               BedrockAnimation.Keyframe a = (BedrockAnimation.Keyframe)keys.get(lo);
               BedrockAnimation.Keyframe b = (BedrockAnimation.Keyframe)keys.get(hi);
               double span = b.time() - a.time();
               if (span <= 1.0E-6) {
                  double[] v = b.preIn();
                  out[0] = v[0];
                  out[1] = v[1];
                  out[2] = v[2];
                  return out;
               } else {
                  double frac = (timeSeconds - a.time()) / span;
                  frac = applyEasing(b, frac);
                  double[] aOut = a.postOut();
                  double[] bIn = b.preIn();
                  out[0] = aOut[0] + (bIn[0] - aOut[0]) * frac;
                  out[1] = aOut[1] + (bIn[1] - aOut[1]) * frac;
                  out[2] = aOut[2] + (bIn[2] - aOut[2]) * frac;
                  return out;
               }
            }
         }
      }
   }

   private static double applyEasing(BedrockAnimation.Keyframe target, double t) {
      t = clamp01(t);
      if (target != null && target.easing() != null && !target.easing().isBlank()) {
         double var10000;
         switch (target.easing()) {
            case "easeInExpo":
               var10000 = t == (double)0.0F ? (double)0.0F : Math.pow((double)2.0F, (double)10.0F * t - (double)10.0F);
               break;
            case "easeOutExpo":
               var10000 = t == (double)1.0F ? (double)1.0F : (double)1.0F - Math.pow((double)2.0F, (double)-10.0F * t);
               break;
            case "easeInOutExpo":
               var10000 = t != (double)0.0F && t != (double)1.0F ? (t < (double)0.5F ? Math.pow((double)2.0F, (double)20.0F * t - (double)10.0F) / (double)2.0F : ((double)2.0F - Math.pow((double)2.0F, (double)-20.0F * t + (double)10.0F)) / (double)2.0F) : t;
               break;
            case "easeInCirc":
               var10000 = (double)1.0F - Math.sqrt((double)1.0F - t * t);
               break;
            case "easeOutCirc":
               var10000 = Math.sqrt((double)1.0F - Math.pow(t - (double)1.0F, (double)2.0F));
               break;
            case "easeInOutCirc":
               var10000 = t < (double)0.5F ? ((double)1.0F - Math.sqrt((double)1.0F - Math.pow((double)2.0F * t, (double)2.0F))) / (double)2.0F : (Math.sqrt((double)1.0F - Math.pow((double)-2.0F * t + (double)2.0F, (double)2.0F)) + (double)1.0F) / (double)2.0F;
               break;
            case "easeInBack":
               double c1 = easingArg(target, 0, 1.70158);
               var10000 = (c1 + (double)1.0F) * t * t * t - c1 * t * t;
               break;
            case "easeOutBack":
               double c1 = easingArg(target, 0, 1.70158);
               var10000 = (double)1.0F + (c1 + (double)1.0F) * Math.pow(t - (double)1.0F, (double)3.0F) + c1 * Math.pow(t - (double)1.0F, (double)2.0F);
               break;
            case "easeInOutBack":
               double c1 = easingArg(target, 0, 1.70158);
               double c2 = c1 * 1.525;
               var10000 = t < (double)0.5F ? Math.pow((double)2.0F * t, (double)2.0F) * ((c2 + (double)1.0F) * (double)2.0F * t - c2) / (double)2.0F : (Math.pow((double)2.0F * t - (double)2.0F, (double)2.0F) * ((c2 + (double)1.0F) * (t * (double)2.0F - (double)2.0F) + c2) + (double)2.0F) / (double)2.0F;
               break;
            default:
               var10000 = t;
         }

         return var10000;
      } else {
         return t;
      }
   }

   private static double easingArg(BedrockAnimation.Keyframe keyframe, int index, double fallback) {
      double[] args = keyframe.easingArgs();
      return args.length > index ? args[index] : fallback;
   }

   private static double clamp01(double value) {
      if (value <= (double)0.0F) {
         return (double)0.0F;
      } else {
         return value >= (double)1.0F ? (double)1.0F : value;
      }
   }
}
