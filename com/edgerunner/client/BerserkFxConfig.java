package com.edgerunner.client;

import com.edgerunner.EdgerunnerMod;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import java.io.IOException;
import java.io.Reader;
import java.io.Writer;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.util.function.Consumer;
import net.minecraft.util.Mth;
import net.minecraftforge.fml.loading.FMLPaths;

public final class BerserkFxConfig {
   private static final Gson GSON = (new GsonBuilder()).setPrettyPrinting().create();
   private static final String FILE_NAME = "project-edgerunner-berserk-client.json";
   private static BerserkFxConfig instance;
   public float activationFlashIntensity = 0.72F;
   public float cameraKickIntensity = 0.65F;
   public float activeSeamBrightness = 1.0F;
   public float combatFeedbackIntensity = 0.82F;
   public float fovPulseIntensity = 0.55F;

   private BerserkFxConfig() {
   }

   public static synchronized BerserkFxConfig get() {
      if (instance == null) {
         instance = load();
      }

      return instance;
   }

   public static synchronized void mutateAndSave(Consumer<BerserkFxConfig> mutator) {
      BerserkFxConfig config = get();
      mutator.accept(config);
      config.activationFlashIntensity = Mth.m_14036_(config.activationFlashIntensity, 0.0F, 1.0F);
      config.cameraKickIntensity = Mth.m_14036_(config.cameraKickIntensity, 0.0F, 1.0F);
      config.activeSeamBrightness = Mth.m_14036_(config.activeSeamBrightness, 0.0F, 1.5F);
      config.combatFeedbackIntensity = Mth.m_14036_(config.combatFeedbackIntensity, 0.0F, 1.0F);
      config.fovPulseIntensity = Mth.m_14036_(config.fovPulseIntensity, 0.0F, 1.0F);
      Path path = FMLPaths.CONFIGDIR.get().resolve("project-edgerunner-berserk-client.json");

      try {
         Files.createDirectories(path.getParent());
         Writer writer = Files.newBufferedWriter(path);

         try {
            GSON.toJson(config, writer);
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
         EdgerunnerMod.LOGGER.warn("Failed to write Berserk client FX config.", ex);
      }

   }

   private static BerserkFxConfig load() {
      Path path = FMLPaths.CONFIGDIR.get().resolve("project-edgerunner-berserk-client.json");
      BerserkFxConfig config = null;
      if (Files.exists(path, new LinkOption[0])) {
         try {
            Reader reader = Files.newBufferedReader(path);

            try {
               config = (BerserkFxConfig)GSON.fromJson(reader, BerserkFxConfig.class);
            } catch (Throwable var9) {
               if (reader != null) {
                  try {
                     reader.close();
                  } catch (Throwable var6) {
                     var9.addSuppressed(var6);
                  }
               }

               throw var9;
            }

            if (reader != null) {
               reader.close();
            }
         } catch (IOException ex) {
            EdgerunnerMod.LOGGER.warn("Failed to load Berserk client FX config.", ex);
         }
      }

      if (config == null) {
         config = new BerserkFxConfig();
      }

      config.activationFlashIntensity = Mth.m_14036_(config.activationFlashIntensity, 0.0F, 1.0F);
      config.cameraKickIntensity = Mth.m_14036_(config.cameraKickIntensity, 0.0F, 1.0F);
      config.activeSeamBrightness = Mth.m_14036_(config.activeSeamBrightness, 0.0F, 1.5F);
      config.combatFeedbackIntensity = Mth.m_14036_(config.combatFeedbackIntensity, 0.0F, 1.0F);
      config.fovPulseIntensity = Mth.m_14036_(config.fovPulseIntensity, 0.0F, 1.0F);
      if (!Files.exists(path, new LinkOption[0])) {
         try {
            Files.createDirectories(path.getParent());
            Writer writer = Files.newBufferedWriter(path);

            try {
               GSON.toJson(config, writer);
            } catch (Throwable var7) {
               if (writer != null) {
                  try {
                     writer.close();
                  } catch (Throwable var5) {
                     var7.addSuppressed(var5);
                  }
               }

               throw var7;
            }

            if (writer != null) {
               writer.close();
            }
         } catch (IOException ex) {
            EdgerunnerMod.LOGGER.warn("Failed to create Berserk client FX config.", ex);
         }
      }

      return config;
   }
}
