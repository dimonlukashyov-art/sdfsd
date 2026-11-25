package com.edgerunner.animation.bedrock;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.mojang.logging.LogUtils;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import javax.annotation.Nullable;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.packs.resources.Resource;
import net.minecraft.server.packs.resources.ResourceManager;
import net.minecraft.server.packs.resources.SimplePreparableReloadListener;
import net.minecraft.util.profiling.ProfilerFiller;
import org.slf4j.Logger;

public final class BedrockAnimationManager extends SimplePreparableReloadListener<Map<ResourceLocation, BedrockAnimation>> {
   public static final BedrockAnimationManager INSTANCE = new BedrockAnimationManager();
   private static final Logger LOGGER = LogUtils.getLogger();
   private static final String FOLDER = "animations";
   private static final String SUFFIX = ".animation.json";
   private static final String PLAYER_ANIM_FOLDER = "player_animation";
   private static final String PLAYER_ANIM_SUFFIX = ".json";
   private static final Gson GSON = new Gson();
   private volatile Map<ResourceLocation, BedrockAnimation> animations = Map.of();

   private BedrockAnimationManager() {
   }

   public Optional<BedrockAnimation> get(ResourceLocation id) {
      return Optional.ofNullable((BedrockAnimation)this.animations.get(id));
   }

   public Set<ResourceLocation> ids() {
      return this.animations.keySet();
   }

   @Nullable
   public BedrockAnimation findByLooseId(String raw) {
      return this.findByLooseId(raw, (String)null);
   }

   @Nullable
   public BedrockAnimation findByLooseId(String raw, @Nullable String namespaceFilter) {
      if (raw != null && !raw.isBlank()) {
         String trimmed = raw.trim();
         ResourceLocation direct = ResourceLocation.m_135820_(trimmed);
         if (direct == null || !this.animations.containsKey(direct) || namespaceFilter != null && !namespaceFilter.equals(direct.m_135827_())) {
            String needle = trimmed.toLowerCase(Locale.ROOT);

            for(Map.Entry<ResourceLocation, BedrockAnimation> entry : this.animations.entrySet()) {
               ResourceLocation key = (ResourceLocation)entry.getKey();
               if ((namespaceFilter == null || namespaceFilter.equals(key.m_135827_())) && (key.toString().toLowerCase(Locale.ROOT).equals(needle) || key.m_135815_().toLowerCase(Locale.ROOT).equals(needle) || key.m_135815_().toLowerCase(Locale.ROOT).endsWith("/" + needle))) {
                  return (BedrockAnimation)entry.getValue();
               }
            }

            return null;
         } else {
            return (BedrockAnimation)this.animations.get(direct);
         }
      } else {
         return null;
      }
   }

   protected Map<ResourceLocation, BedrockAnimation> prepare(ResourceManager manager, ProfilerFiller profiler) {
      profiler.m_6180_("edgerunner_bedrock_animations_prepare");
      Map<ResourceLocation, BedrockAnimation> loaded = new HashMap();

      try {
         this.loadInto(loaded, manager, "animations", ".animation.json");
         this.loadInto(loaded, manager, "player_animation", ".json");
      } finally {
         profiler.m_7238_();
      }

      return loaded;
   }

   private void loadInto(Map<ResourceLocation, BedrockAnimation> target, ResourceManager manager, String folder, String suffix) {
      Map<ResourceLocation, Resource> resources = manager.m_214159_(folder, (loc) -> loc.m_135815_().endsWith(suffix));

      for(Map.Entry<ResourceLocation, Resource> entry : resources.entrySet()) {
         ResourceLocation file = (ResourceLocation)entry.getKey();
         ResourceLocation fileId = stripSuffix(file, folder, suffix);
         if (fileId != null) {
            try {
               InputStream stream = ((Resource)entry.getValue()).m_215507_();

               try {
                  BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8));

                  try {
                     JsonObject root = (JsonObject)GSON.fromJson(reader, JsonObject.class);
                     Map<ResourceLocation, BedrockAnimation> parsed = BedrockAnimationParser.parse(fileId, root);
                     target.putAll(parsed);
                  } catch (Throwable var16) {
                     try {
                        reader.close();
                     } catch (Throwable var15) {
                        var16.addSuppressed(var15);
                     }

                     throw var16;
                  }

                  reader.close();
               } catch (Throwable var17) {
                  if (stream != null) {
                     try {
                        stream.close();
                     } catch (Throwable var14) {
                        var17.addSuppressed(var14);
                     }
                  }

                  throw var17;
               }

               if (stream != null) {
                  stream.close();
               }
            } catch (Exception ex) {
               LOGGER.warn("[Edgerunner] Failed to load Bedrock animation file {}: {}", file, ex.toString());
            }
         }
      }

   }

   protected void apply(Map<ResourceLocation, BedrockAnimation> prepared, ResourceManager manager, ProfilerFiller profiler) {
      this.animations = Map.copyOf(prepared);
      LOGGER.info("[Edgerunner] Loaded {} Bedrock animation(s).", this.animations.size());
   }

   private static ResourceLocation stripSuffix(ResourceLocation full, String folder, String suffix) {
      String path = full.m_135815_();
      if (path.startsWith(folder + "/") && path.endsWith(suffix)) {
         String trimmed = path.substring(folder.length() + 1, path.length() - suffix.length());
         return ResourceLocation.fromNamespaceAndPath(full.m_135827_(), trimmed);
      } else {
         return null;
      }
   }
}
