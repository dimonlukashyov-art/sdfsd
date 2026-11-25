package com.edgerunner.animation.bedrock;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;
import com.mojang.logging.LogUtils;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import net.minecraft.resources.ResourceLocation;
import org.slf4j.Logger;

public final class BedrockAnimationParser {
   private static final Logger LOGGER = LogUtils.getLogger();

   private BedrockAnimationParser() {
   }

   public static Map<ResourceLocation, BedrockAnimation> parse(ResourceLocation fileId, JsonObject root) {
      Map<ResourceLocation, BedrockAnimation> out = new LinkedHashMap();
      if (root != null && root.has("animations")) {
         JsonObject animations = root.getAsJsonObject("animations");

         for(Map.Entry<String, JsonElement> entry : animations.entrySet()) {
            String shortName = (String)entry.getKey();
            if (((JsonElement)entry.getValue()).isJsonObject()) {
               try {
                  BedrockAnimation animation = parseSingle(toClipId(fileId, shortName), ((JsonElement)entry.getValue()).getAsJsonObject());
                  out.put(animation.id(), animation);
               } catch (RuntimeException ex) {
                  LOGGER.warn("[Edgerunner] Failed to parse Bedrock animation '{}' from {}: {}", new Object[]{shortName, fileId, ex.toString()});
               }
            }
         }

         return out;
      } else {
         return out;
      }
   }

   private static ResourceLocation toClipId(ResourceLocation fileId, String shortName) {
      String safeShort = shortName.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9_./-]", "_");
      String var10000 = fileId.m_135827_();
      String var10001 = fileId.m_135815_();
      return ResourceLocation.fromNamespaceAndPath(var10000, var10001 + "/" + safeShort);
   }

   private static BedrockAnimation parseSingle(ResourceLocation id, JsonObject node) {
      double length = optDouble(node, "animation_length", (double)1.0F);
      boolean loop = optBool(node, "loop", false);
      Map<String, BedrockAnimation.BoneTrack> bones = new LinkedHashMap();
      if (node.has("bones") && node.get("bones").isJsonObject()) {
         JsonObject bonesObj = node.getAsJsonObject("bones");

         for(Map.Entry<String, JsonElement> e : bonesObj.entrySet()) {
            if (((JsonElement)e.getValue()).isJsonObject()) {
               bones.put((String)e.getKey(), parseBone(((JsonElement)e.getValue()).getAsJsonObject()));
            }
         }
      }

      return new BedrockAnimation(id, length, loop, bones);
   }

   private static BedrockAnimation.BoneTrack parseBone(JsonObject node) {
      BedrockAnimation.Vector3Channel position = parseChannel(node.get("position"), (double)0.0F);
      BedrockAnimation.Vector3Channel rotation = parseChannel(node.get("rotation"), (double)0.0F);
      BedrockAnimation.Vector3Channel scale = parseChannel(node.get("scale"), (double)1.0F);
      return new BedrockAnimation.BoneTrack(position, rotation, scale);
   }

   private static BedrockAnimation.Vector3Channel parseChannel(JsonElement node, double defaultComponent) {
      if (node != null && !node.isJsonNull()) {
         if (node.isJsonArray()) {
            return new BedrockAnimation.Vector3Channel(parseVec3(node, defaultComponent), List.of());
         } else if (node.isJsonPrimitive()) {
            return new BedrockAnimation.Vector3Channel(parseVec3(node, defaultComponent), List.of());
         } else if (node.isJsonObject()) {
            JsonObject obj = node.getAsJsonObject();
            if (obj.has("vector") && !obj.has("0.0") && obj.size() == 1) {
               return new BedrockAnimation.Vector3Channel(parseVec3(obj.get("vector"), defaultComponent), List.of());
            } else {
               List<BedrockAnimation.Keyframe> kfs = new ArrayList();

               for(Map.Entry<String, JsonElement> entry : obj.entrySet()) {
                  Double time = tryParseDouble((String)entry.getKey());
                  if (time != null) {
                     kfs.add(parseKeyframe(time, (JsonElement)entry.getValue(), defaultComponent));
                  }
               }

               kfs.sort(Comparator.comparingDouble(BedrockAnimation.Keyframe::time));
               if (kfs.isEmpty()) {
                  return new BedrockAnimation.Vector3Channel(new double[]{defaultComponent, defaultComponent, defaultComponent}, List.of());
               } else {
                  return new BedrockAnimation.Vector3Channel(((BedrockAnimation.Keyframe)kfs.get(0)).preIn(), kfs);
               }
            }
         } else {
            return new BedrockAnimation.Vector3Channel(new double[]{defaultComponent, defaultComponent, defaultComponent}, List.of());
         }
      } else {
         return new BedrockAnimation.Vector3Channel(new double[]{defaultComponent, defaultComponent, defaultComponent}, List.of());
      }
   }

   private static BedrockAnimation.Keyframe parseKeyframe(double time, JsonElement node, double defaultComponent) {
      if (!node.isJsonArray() && !node.isJsonPrimitive()) {
         if (node.isJsonObject()) {
            JsonObject o = node.getAsJsonObject();
            String easing = optString(o, "easing", "");
            double[] easingArgs = parseDoubleArray(o.get("easingArgs"));
            if (o.has("pre") || o.has("post")) {
               double[] pre = o.has("pre") ? parseVec3(o.get("pre"), defaultComponent) : null;
               double[] post = o.has("post") ? parseVec3(o.get("post"), defaultComponent) : null;
               if (pre == null) {
                  pre = post != null ? (double[])(([D)post).clone() : new double[]{defaultComponent, defaultComponent, defaultComponent};
               }

               if (post == null) {
                  post = (double[])(([D)pre).clone();
               }

               return new BedrockAnimation.Keyframe(time, pre, post, easing, easingArgs);
            }

            if (o.has("vector")) {
               double[] v = parseVec3(o.get("vector"), defaultComponent);
               return new BedrockAnimation.Keyframe(time, v, v, easing, easingArgs);
            }
         }

         return new BedrockAnimation.Keyframe(time, new double[]{defaultComponent, defaultComponent, defaultComponent}, new double[]{defaultComponent, defaultComponent, defaultComponent});
      } else {
         double[] v = parseVec3(node, defaultComponent);
         return new BedrockAnimation.Keyframe(time, v, v);
      }
   }

   private static double[] parseVec3(JsonElement node, double defaultComponent) {
      double[] out = new double[]{defaultComponent, defaultComponent, defaultComponent};
      if (node == null) {
         return out;
      } else if (node.isJsonPrimitive()) {
         double scalar = toDoubleSafe(node, defaultComponent);
         return new double[]{scalar, scalar, scalar};
      } else if (node.isJsonObject() && node.getAsJsonObject().has("vector")) {
         return parseVec3(node.getAsJsonObject().get("vector"), defaultComponent);
      } else if (!node.isJsonArray()) {
         return out;
      } else {
         JsonArray arr = node.getAsJsonArray();

         for(int i = 0; i < Math.min(3, arr.size()); ++i) {
            out[i] = toDoubleSafe(arr.get(i), defaultComponent);
         }

         return out;
      }
   }

   private static double toDoubleSafe(JsonElement element, double fallback) {
      if (element != null && !element.isJsonNull()) {
         if (element.isJsonPrimitive()) {
            JsonPrimitive prim = element.getAsJsonPrimitive();
            if (prim.isNumber()) {
               return prim.getAsDouble();
            }

            if (prim.isString()) {
               Double parsed = tryParseDouble(prim.getAsString());
               return parsed != null ? parsed : (double)0.0F;
            }
         }

         return fallback;
      } else {
         return fallback;
      }
   }

   private static Double tryParseDouble(String raw) {
      if (raw == null) {
         return null;
      } else {
         try {
            return Double.parseDouble(raw);
         } catch (NumberFormatException var2) {
            return null;
         }
      }
   }

   private static double optDouble(JsonObject node, String key, double fallback) {
      return node.has(key) && node.get(key).isJsonPrimitive() && node.get(key).getAsJsonPrimitive().isNumber() ? node.get(key).getAsDouble() : fallback;
   }

   private static boolean optBool(JsonObject node, String key, boolean fallback) {
      if (!node.has(key)) {
         return fallback;
      } else {
         JsonElement el = node.get(key);
         if (el.isJsonPrimitive()) {
            JsonPrimitive prim = el.getAsJsonPrimitive();
            if (prim.isBoolean()) {
               return prim.getAsBoolean();
            }

            if (prim.isString()) {
               String v = prim.getAsString().toLowerCase(Locale.ROOT);
               return v.equals("true") || v.equals("loop") || v.equals("hold_on_last_frame");
            }
         }

         return fallback;
      }
   }

   private static String optString(JsonObject node, String key, String fallback) {
      if (node.has(key) && node.get(key).isJsonPrimitive()) {
         JsonPrimitive prim = node.get(key).getAsJsonPrimitive();
         if (prim.isString()) {
            return prim.getAsString();
         }
      }

      return fallback;
   }

   private static double[] parseDoubleArray(JsonElement node) {
      if (node != null && node.isJsonArray()) {
         JsonArray array = node.getAsJsonArray();
         double[] out = new double[array.size()];

         for(int i = 0; i < array.size(); ++i) {
            out[i] = toDoubleSafe(array.get(i), (double)0.0F);
         }

         return out;
      } else {
         return new double[0];
      }
   }
}
