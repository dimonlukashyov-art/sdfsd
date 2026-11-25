package com.edgerunner.client;

import com.edgerunner.EdgerunnerMod;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonObject;
import java.io.IOException;
import java.io.Reader;
import java.io.Writer;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import net.minecraftforge.fml.loading.FMLPaths;

public final class CyberwareTooltipConfig {
   public static final boolean DEFAULT_ENABLE_DYNAMIC_TOOLTIPS = true;
   private static final String FILE_NAME = "cyberpunk-tooltips.json";
   private static final String KEY_ENABLE_DYNAMIC = "enable_dynamic_tooltips";
   private static final Gson GSON = (new GsonBuilder()).setPrettyPrinting().create();
   private static ConfigData instance;

   private CyberwareTooltipConfig() {
   }

   public static synchronized boolean isDynamicTooltipsEnabled() {
      if (instance == null) {
         instance = load();
      }

      return instance.enableDynamicTooltips;
   }

   public static synchronized void setDynamicTooltipsEnabled(boolean enabled) {
      if (instance == null) {
         instance = load();
      }

      instance.enableDynamicTooltips = enabled;
      write(configPath(), instance);
   }

   private static ConfigData load() {
      Path path = configPath();
      ConfigData data = new ConfigData();
      if (Files.exists(path, new LinkOption[0])) {
         try {
            Reader reader = Files.newBufferedReader(path);

            try {
               JsonObject json = (JsonObject)GSON.fromJson(reader, JsonObject.class);
               if (json != null && json.has("enable_dynamic_tooltips")) {
                  data.enableDynamicTooltips = json.get("enable_dynamic_tooltips").getAsBoolean();
               }
            } catch (Throwable var6) {
               if (reader != null) {
                  try {
                     reader.close();
                  } catch (Throwable var5) {
                     var6.addSuppressed(var5);
                  }
               }

               throw var6;
            }

            if (reader != null) {
               reader.close();
            }
         } catch (IOException ex) {
            EdgerunnerMod.LOGGER.warn("Failed to read tooltip config, using defaults.", ex);
         }
      } else {
         write(path, data);
      }

      return data;
   }

   private static Path configPath() {
      return FMLPaths.CONFIGDIR.get().resolve("cyberpunk-tooltips.json");
   }

   private static void write(Path path, ConfigData data) {
      JsonObject json = new JsonObject();
      json.addProperty("enable_dynamic_tooltips", data.enableDynamicTooltips);

      try {
         Files.createDirectories(path.getParent());
         Writer writer = Files.newBufferedWriter(path);

         try {
            GSON.toJson(json, writer);
         } catch (Throwable var7) {
            if (writer != null) {
               try {
                  writer.close();
               } catch (Throwable var6) {
                  var7.addSuppressed(var6);
               }
            }

            throw var7;
         }

         if (writer != null) {
            writer.close();
         }
      } catch (IOException ex) {
         EdgerunnerMod.LOGGER.warn("Failed to write tooltip config.", ex);
      }

   }

   private static final class ConfigData {
      private boolean enableDynamicTooltips = true;
   }
}
