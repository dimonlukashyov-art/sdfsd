package com.edgerunner.client;

import com.edgerunner.EdgerunnerMod;
import com.edgerunner.animation.bedrock.BedrockAnimationManager;
import com.edgerunner.client.compat.parcool.ParCoolClientCompat;
import com.edgerunner.client.cyberpsychosis.CyberpsychosisEyeRenderLayer;
import com.edgerunner.client.cyberpsychosis.CyberpsychosisHeadGlitchRenderLayer;
import com.edgerunner.client.cyberpsychosis.SkyEyeShader;
import com.edgerunner.client.cyberpsychosis.dream.DreamSkyEffects;
import com.edgerunner.client.cyberpsychosis.flashback.ApparitionRenderer;
import com.edgerunner.client.effect.CyberwareStatusEffectRenderLayer;
import com.edgerunner.client.epicfight.EpicFightRenderLayerRegistrar;
import com.edgerunner.client.mantis.BloodResolvedPass;
import com.edgerunner.client.painting.CyberwarePaintingStationBlockRenderer;
import com.edgerunner.client.particle.BerserkEmberParticle;
import com.edgerunner.client.particle.BerserkHeatParticle;
import com.edgerunner.client.ripperdoc.RipperDocBlockRenderer;
import com.edgerunner.content.painting.gui.CyberwarePaintingStationScreen;
import com.edgerunner.content.ripperdoc.gui.RipperdocScreen;
import com.edgerunner.epicfight.EpicFightIntegration;
import com.edgerunner.epicfight.GorillaMovesetClientFx;
import com.edgerunner.registry.CyberpunkBlockEntities;
import com.edgerunner.registry.CyberpunkMenus;
import com.edgerunner.registry.CyberpunkParticles;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import net.minecraft.client.RecipeBookCategories;
import net.minecraft.client.gui.screens.MenuScreens;
import net.minecraft.client.model.EntityModel;
import net.minecraft.client.renderer.entity.EntityRenderer;
import net.minecraft.client.renderer.entity.LivingEntityRenderer;
import net.minecraft.client.renderer.entity.player.PlayerRenderer;
import net.minecraft.core.particles.ParticleType;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.inventory.MenuType;
import net.minecraft.world.item.crafting.RecipeType;
import net.minecraft.world.level.block.entity.BlockEntityType;
import net.minecraftforge.client.ConfigScreenHandler;
import net.minecraftforge.client.event.EntityRenderersEvent;
import net.minecraftforge.client.event.RegisterClientReloadListenersEvent;
import net.minecraftforge.client.event.RegisterParticleProvidersEvent;
import net.minecraftforge.client.event.RegisterRecipeBookCategoriesEvent;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.fml.event.lifecycle.FMLClientSetupEvent;
import net.minecraftforge.fml.javafmlmod.FMLJavaModLoadingContext;
import net.minecraftforge.registries.ForgeRegistries;

public final class EdgerunnerClientSetup {
   private EdgerunnerClientSetup() {
   }

   public static void register(FMLJavaModLoadingContext loadingContext) {
      IEventBus modEventBus = loadingContext.getModEventBus();
      loadingContext.registerExtensionPoint(ConfigScreenHandler.ConfigScreenFactory.class, () -> new ConfigScreenHandler.ConfigScreenFactory((minecraft, parent) -> new EdgerunnerConfigScreen(parent)));
      modEventBus.addListener(EdgerunnerClientSetup::onRegisterRenderers);
      modEventBus.addListener(EdgerunnerClientSetup::onAddLayers);
      modEventBus.addListener(EdgerunnerClientSetup::onClientSetup);
      modEventBus.addListener(EdgerunnerClientSetup::onRegisterRecipeBookCategories);
      modEventBus.addListener(EdgerunnerClientSetup::onRegisterClientReloadListeners);
      modEventBus.addListener(EdgerunnerClientSetup::onRegisterParticleProviders);
      modEventBus.addListener(FaceCyberwareClient::onRegisterKeyMappings);
      modEventBus.addListener(SkyEyeShader::register);
      modEventBus.addListener(BloodResolvedPass::register);
      modEventBus.addListener(ApparitionRenderer::register);
      modEventBus.addListener(DreamSkyEffects::register);
      if (EpicFightIntegration.PRESENT) {
         EpicFightRenderLayerRegistrar.register(modEventBus);
         GorillaMovesetClientFx.registerListeners();
      }

   }

   private static void onRegisterParticleProviders(RegisterParticleProvidersEvent event) {
      event.registerSpriteSet((ParticleType)CyberpunkParticles.BERSERK_HEAT.get(), BerserkHeatParticle.Provider::new);
      event.registerSpriteSet((ParticleType)CyberpunkParticles.BERSERK_EMBER.get(), BerserkEmberParticle.Provider::new);
   }

   private static void onRegisterClientReloadListeners(RegisterClientReloadListenersEvent event) {
      event.registerReloadListener(BedrockAnimationManager.INSTANCE);
   }

   private static void onRegisterRenderers(EntityRenderersEvent.RegisterRenderers event) {
      event.registerBlockEntityRenderer((BlockEntityType)CyberpunkBlockEntities.RIPPERDOC.get(), RipperDocBlockRenderer::new);
      event.registerBlockEntityRenderer((BlockEntityType)CyberpunkBlockEntities.CYBERWARE_PAINTING_STATION.get(), CyberwarePaintingStationBlockRenderer::new);
   }

   private static void onAddLayers(EntityRenderersEvent.AddLayers event) {
      for(String skin : event.getSkins()) {
         PlayerRenderer renderer = (PlayerRenderer)event.getPlayerSkin(skin);
         if (renderer != null) {
            renderer.m_115326_(new FaceOverlayRenderLayer(renderer));
            renderer.m_115326_(new CyberpsychosisHeadGlitchRenderLayer(renderer));
            renderer.m_115326_(new CyberpsychosisEyeRenderLayer(renderer));
            addCyberwareStatusLayer(renderer);
         }
      }

      for(EntityType<?> entityType : ForgeRegistries.ENTITY_TYPES.getValues()) {
         if (entityType != EntityType.f_20532_) {
            addCyberwareStatusLayer(event, entityType);
         }
      }

   }

   private static <T extends LivingEntity, M extends EntityModel<T>> void addCyberwareStatusLayer(LivingEntityRenderer<T, M> renderer) {
      renderer.m_115326_(new CyberwareStatusEffectRenderLayer(renderer));
   }

   private static void addCyberwareStatusLayer(EntityRenderersEvent.AddLayers event, EntityType<?> entityType) {
      EntityRenderer<?> renderer = event.getEntityRenderer(entityType);
      if (renderer instanceof LivingEntityRenderer<?, ?> livingRenderer) {
         addCyberwareStatusLayer(livingRenderer);
      }

   }

   private static void onClientSetup(FMLClientSetupEvent event) {
      ParCoolClientCompat.install();
      event.enqueueWork(() -> {
         MenuScreens.m_96206_((MenuType)CyberpunkMenus.RIPPERDOC.get(), RipperdocScreen::new);
         MenuScreens.m_96206_((MenuType)CyberpunkMenus.CYBERWARE_PAINTING_STATION.get(), CyberwarePaintingStationScreen::new);
      });
   }

   private static void onRegisterRecipeBookCategories(RegisterRecipeBookCategoriesEvent event) {
      try {
         Class<?> serializersClass = Class.forName("net.threetag.palladium.item.recipe.PalladiumRecipeSerializers");
         Field tailoringField = serializersClass.getField("TAILORING");
         Object registrySupplier = tailoringField.get((Object)null);
         Method getMethod = registrySupplier.getClass().getMethod("get");
         Object recipeType = getMethod.invoke(registrySupplier);
         if (recipeType instanceof RecipeType<?> resolvedRecipeType) {
            event.registerRecipeCategoryFinder(resolvedRecipeType, (recipe) -> RecipeBookCategories.CRAFTING_MISC);
         }
      } catch (ClassNotFoundException var7) {
      } catch (ReflectiveOperationException exception) {
         EdgerunnerMod.LOGGER.warn("Failed to register recipe category finder for Palladium tailoring", exception);
      }

   }
}
