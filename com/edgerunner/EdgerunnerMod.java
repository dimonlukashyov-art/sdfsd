package com.edgerunner;

import com.edgerunner.berserk.BerserkRuntime;
import com.edgerunner.client.EdgerunnerClientSetup;
import com.edgerunner.compat.parcool.ParCoolCompat;
import com.edgerunner.config.EdgerunnerServerConfig;
import com.edgerunner.content.ripperdoc.SuppressorSlotService;
import com.edgerunner.content.ripperdoc.gui.RipperdocMenu;
import com.edgerunner.cyberpsychosis.BloodPumpChargeRuntime;
import com.edgerunner.cyberware.AxolotlRuntime;
import com.edgerunner.cyberware.CyberwarePowerReconcile;
import com.edgerunner.cyberware.CyberwareSyncService;
import com.edgerunner.cyberware.MicrogeneratorRuntime;
import com.edgerunner.epicfight.EpicFightIntegration;
import com.edgerunner.face.FaceCyberwareRuntime;
import com.edgerunner.face.overlay.FaceOverlayServerState;
import com.edgerunner.gorilla.GorillaArmsRuntime;
import com.edgerunner.network.CyberpunkNetwork;
import com.edgerunner.paint.CyberwarePaintServerState;
import com.edgerunner.registry.CyberpunkBlockEntities;
import com.edgerunner.registry.CyberpunkBlocks;
import com.edgerunner.registry.CyberpunkEffects;
import com.edgerunner.registry.CyberpunkItems;
import com.edgerunner.registry.CyberpunkMenus;
import com.edgerunner.registry.CyberpunkPaintingVariants;
import com.edgerunner.registry.CyberpunkParticles;
import com.edgerunner.registry.CyberpunkSounds;
import com.edgerunner.sandevistan.SandevistanController;
import com.edgerunner.sandevistan.SandevistanDescriptors;
import com.edgerunner.sandevistan.SandevistanRuntime;
import java.util.Iterator;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.network.protocol.game.ClientboundStopSoundPacket;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.monster.Enemy;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.entity.projectile.Projectile;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.ItemLike;
import net.minecraft.world.scores.Objective;
import net.minecraft.world.scores.Score;
import net.minecraft.world.scores.Scoreboard;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.common.MinecraftForge;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.event.TickEvent.Phase;
import net.minecraftforge.event.entity.EntityJoinLevelEvent;
import net.minecraftforge.event.entity.living.LivingDeathEvent;
import net.minecraftforge.event.entity.player.PlayerEvent;
import net.minecraftforge.event.server.ServerStartingEvent;
import net.minecraftforge.event.server.ServerStoppingEvent;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.fml.DistExecutor;
import net.minecraftforge.fml.IExtensionPoint;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.javafmlmod.FMLJavaModLoadingContext;
import net.minecraftforge.registries.ForgeRegistries;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import software.bernie.geckolib.GeckoLib;

@Mod("project_edgerunner")
public final class EdgerunnerMod {
   public static final String MODID = "project_edgerunner";
   public static final Logger LOGGER = LogManager.getLogger();
   private static final boolean AXOLOTL_CHAT_DEBUG = false;
   public static volatile boolean cyberwareDropOnDeath = false;
   private static final int CYBERWARE_RESPAWN_DELAY_TICKS = 160;
   private static final int CYBERWARE_LOGIN_ICON_RESYNC_DELAY_TICKS = 2;
   private static final int CYBERWARE_DIMENSION_RESYNC_DELAY_TICKS = 20;
   private static final int RIPPERDOC_POSTFX_EFFECT_DURATION_TICKS = 120;
   private static final int RIPPERDOC_POSTFX_EFFECT_AMPLIFIER = 0;
   private static final Map<UUID, Long> loginGuardUntilTick = new ConcurrentHashMap();
   private static final Map<UUID, Long> cyberwareLoginIconResyncAtTick = new ConcurrentHashMap();
   private static final Map<UUID, Long> cyberwareDimensionResyncAtTick = new ConcurrentHashMap();
   private static final Map<UUID, Long> ripperdocUnlockAtTick = new ConcurrentHashMap();
   private static final Map<UUID, Long> ripperdocSoundAtTick = new ConcurrentHashMap();
   private static final Map<UUID, Long> ripperdocEffectsAtTick = new ConcurrentHashMap();
   private static final Map<UUID, Long> cyberwareRespawnApplyAtTick = new ConcurrentHashMap();
   private static final String RIPPERDOC_SEQUENCE_SEEN = "project_edgerunner_ripperdoc_sequence_seen";

   public static boolean isDeathRespawnProtected(UUID uuid) {
      return cyberwareRespawnApplyAtTick.containsKey(uuid);
   }

   public EdgerunnerMod(FMLJavaModLoadingContext loadingContext) {
      IEventBus modEventBus = loadingContext.getModEventBus();
      GeckoLib.initialize();
      CyberpunkBlocks.register(modEventBus);
      CyberpunkItems.register(modEventBus);
      CyberpunkEffects.register(modEventBus);
      CyberpunkBlockEntities.register(modEventBus);
      CyberpunkMenus.register(modEventBus);
      CyberpunkSounds.register(modEventBus);
      CyberpunkParticles.register(modEventBus);
      CyberpunkPaintingVariants.register(modEventBus);
      DistExecutor.unsafeRunWhenOn(Dist.CLIENT, () -> () -> EdgerunnerClientSetup.register(loadingContext));
      EdgerunnerServerConfig.reload();
      loadingContext.registerExtensionPoint(IExtensionPoint.DisplayTest.class, () -> new IExtensionPoint.DisplayTest(() -> "OHNOES\ud83d\ude31\ud83d\ude31\ud83d\ude31\ud83d\ude31\ud83d\ude31\ud83d\ude31\ud83d\ude31\ud83d\ude31\ud83d\ude31\ud83d\ude31\ud83d\ude31\ud83d\ude31\ud83d\ude31\ud83d\ude31\ud83d\ude31\ud83d\ude31\ud83d\ude31", (remoteVersion, isServer) -> true));
      CyberpunkNetwork.register();
      ParCoolCompat.init(modEventBus);
      modEventBus.addListener((event) -> event.enqueueWork(MicrogeneratorRuntime::registerCompat));
      modEventBus.addListener((event) -> event.enqueueWork(BerserkRuntime::registerCompat));
      MinecraftForge.EVENT_BUS.addListener(EdgerunnerCommands::onRegisterCommands);
      MinecraftForge.EVENT_BUS.addListener(EdgerunnerMod::onLivingDeath);
      MinecraftForge.EVENT_BUS.addListener(EdgerunnerMod::onPlayerLogin);
      MinecraftForge.EVENT_BUS.addListener(EdgerunnerMod::onPlayerLogout);
      MinecraftForge.EVENT_BUS.addListener(EdgerunnerMod::onServerStopping);
      MinecraftForge.EVENT_BUS.addListener(EdgerunnerMod::onServerStarting);
      MinecraftForge.EVENT_BUS.addListener(EdgerunnerMod::onServerTick);
      MinecraftForge.EVENT_BUS.addListener(EdgerunnerMod::onEntityJoinLevel);
      MinecraftForge.EVENT_BUS.addListener(EdgerunnerMod::onPlayerRespawn);
      MinecraftForge.EVENT_BUS.addListener(EdgerunnerMod::onPlayerClone);
      MinecraftForge.EVENT_BUS.addListener(EdgerunnerMod::onPlayerChangedDimension);
      EpicFightIntegration.registerCommon(modEventBus);
      LOGGER.info("Project: Edgerunner loaded");
   }

   private static void onPlayerLogin(PlayerEvent.PlayerLoggedInEvent event) {
      Player var2 = event.getEntity();
      if (var2 instanceof ServerPlayer player) {
         if (!player.m_9236_().f_46443_) {
            SandevistanController.onPlayerLogin(player);
            forcePlayerScore(player, "er_sandy_active", 0);
            forcePlayerScore(player, "er_sandy_exhaust", 0);
            forcePlayerScore(player, "er_face_scan_mode", 0);
            forcePlayerScore(player, "er_face_active_ticks", 0);
            forcePlayerScore(player, "er_face_active_max", 0);
            forcePlayerScore(player, "er_cw_runtime_ready", 0);
            long now = player.m_284548_().m_46467_();
            long lockUntil = now + 80L;
            loginGuardUntilTick.put(player.m_20148_(), lockUntil);
            player.getPersistentData().m_128356_("cyberware_join_lock_until", lockUntil);
            player.getPersistentData().m_128356_("cyberware_os_lock_until", lockUntil);
            CyberwareSyncService.syncInstalledStateAndHud(player);
            grantGuideOnFirstJoin(player);
            cyberwareLoginIconResyncAtTick.put(player.m_20148_(), now + 2L);
            CyberpunkNetwork.sendServerConfigSync(player, EdgerunnerServerConfig.isRipperdocCinematicEnabled(), EdgerunnerServerConfig.getRipperdocSequenceTriggerSlots(), EdgerunnerServerConfig.getAfterimageMaxRenderedSnapshots(), EdgerunnerServerConfig.getAfterimageMaxHistorySnapshots(), EdgerunnerServerConfig.getAfterimageMinSampleIntervalSeconds(), EdgerunnerServerConfig.isTemporalDebugOverlayDefault(), EdgerunnerServerConfig.isCyberwareNaturalRegenerationAllowed(), EdgerunnerServerConfig.isGiveGuideOnFirstJoin(), EdgerunnerServerConfig.isCyberpsychosisEnabled(), EdgerunnerServerConfig.getSandevistanYouSpeedConversion());
            FaceOverlayServerState.syncAllTo(player);
            CyberwarePaintServerState.syncAllTo(player);
            CyberpunkNetwork.sendSandevistanDescriptors(player, SandevistanDescriptors.serverDescriptors());
         }

      }
   }

   private static void onEntityJoinLevel(EntityJoinLevelEvent event) {
      Entity var2 = event.getEntity();
      if (var2 instanceof ServerPlayer player) {
         if (!player.m_9236_().f_46443_) {
            long lockUntil = player.m_284548_().m_46467_() + 80L;
            loginGuardUntilTick.put(player.m_20148_(), lockUntil);
            player.getPersistentData().m_128356_("cyberware_join_lock_until", lockUntil);
            player.getPersistentData().m_128356_("cyberware_os_lock_until", lockUntil);
            CyberwareSyncService.syncInstalledState(player);
            CompoundTag pd = player.getPersistentData();
            LOGGER.debug("[Edgerunner] EntityJoinLevel for {} — GUI={} cyberware={} protected={}", player.m_36316_().getName(), pd.m_128441_("CyberpunkRipperdocGui") ? pd.m_128469_("CyberpunkRipperdocGui").m_128431_() : "<ABSENT>", pd.m_128441_("cyberware") ? pd.m_128469_("cyberware") : "<ABSENT>", isDeathRespawnProtected(player.m_20148_()));
         }
      }
   }

   private static void onPlayerClone(PlayerEvent.Clone event) {
      CompoundTag oldData = event.getOriginal().getPersistentData();
      CompoundTag newData = event.getEntity().getPersistentData();
      if (oldData.m_128425_("cyberware_capacity_profile_base", 99)) {
         newData.m_128405_("cyberware_capacity_profile_base", oldData.m_128451_("cyberware_capacity_profile_base"));
      }

      if (oldData.m_128425_("edgerunner_guide_granted", 1)) {
         newData.m_128379_("edgerunner_guide_granted", oldData.m_128471_("edgerunner_guide_granted"));
      }

      if (!event.isWasDeath() || !cyberwareDropOnDeath) {
         if (oldData.m_128425_("CyberpunkRipperdocGui", 10)) {
            newData.m_128365_("CyberpunkRipperdocGui", oldData.m_128469_("CyberpunkRipperdocGui").m_6426_());
         }

         if (oldData.m_128425_("cyberware", 10)) {
            newData.m_128365_("cyberware", oldData.m_128469_("cyberware").m_6426_());
         }

         LOGGER.debug("[Edgerunner] PlayerClone: copied cyberware data for {} reason={} — GUI={} cyberware={}", event.getEntity().m_6302_(), event.isWasDeath() ? "death" : "dimension", newData.m_128441_("CyberpunkRipperdocGui") ? newData.m_128469_("CyberpunkRipperdocGui").m_128431_() : "<ABSENT>", newData.m_128441_("cyberware") ? newData.m_128469_("cyberware") : "<ABSENT>");
         if (!event.isWasDeath()) {
            Player var4 = event.getEntity();
            if (var4 instanceof ServerPlayer) {
               ServerPlayer player = (ServerPlayer)var4;
               if (!player.m_9236_().f_46443_) {
                  scheduleCyberwareDimensionResync(player);
               }
            }
         }

      }
   }

   private static void onPlayerRespawn(PlayerEvent.PlayerRespawnEvent event) {
      Player var2 = event.getEntity();
      if (var2 instanceof ServerPlayer player) {
         if (!player.m_9236_().f_46443_) {
            if (!cyberwareDropOnDeath) {
               long applyAt = player.m_284548_().m_46467_() + 160L;
               cyberwareRespawnApplyAtTick.put(player.m_20148_(), applyAt);
               CompoundTag pd = player.getPersistentData();
               LOGGER.debug("[Edgerunner] Respawn protection ACTIVATED for {} until tick {} — GUI={} cyberware={}", player.m_36316_().getName(), applyAt, pd.m_128441_("CyberpunkRipperdocGui") ? pd.m_128469_("CyberpunkRipperdocGui").m_128431_() : "<ABSENT>", pd.m_128441_("cyberware") ? pd.m_128469_("cyberware") : "<ABSENT>");
            }

         }
      }
   }

   private static void onPlayerChangedDimension(PlayerEvent.PlayerChangedDimensionEvent event) {
      Player var2 = event.getEntity();
      if (var2 instanceof ServerPlayer player) {
         if (!player.m_9236_().f_46443_) {
            SandevistanController.onPlayerChangedDimension(player);
            CyberwareSyncService.syncInstalledStateAndHud(player);
            scheduleCyberwareDimensionResync(player);
            return;
         }
      }

   }

   private static void onLivingDeath(LivingDeathEvent event) {
      LivingEntity victim = event.getEntity();
      if (victim != null) {
         if (!victim.m_9236_().f_46443_) {
            if (victim instanceof ServerPlayer) {
               ServerPlayer player = (ServerPlayer)victim;
               SandevistanController.onPlayerDeath(player);
               BloodPumpChargeRuntime.forceReset(player);
               GorillaArmsRuntime.forceReset(player);
               FaceCyberwareRuntime.resetPlayer(player);
               forcePlayerScore(player, "er_sandy_active", 0);
               if (cyberwareDropOnDeath) {
                  for(ItemStack drop : RipperdocMenu.collectAndClearCyberwareForDeath(player)) {
                     player.m_36176_(drop, false);
                  }
               } else {
                  CyberwarePowerReconcile.reconcile(player);
                  CompoundTag pd = player.getPersistentData();
                  LOGGER.debug("[Edgerunner] KEEP mode death for {} — GUI={} cyberware={}", player.m_36316_().getName(), pd.m_128441_("CyberpunkRipperdocGui") ? pd.m_128469_("CyberpunkRipperdocGui").m_128431_() : "<ABSENT>", pd.m_128441_("cyberware") ? pd.m_128469_("cyberware") : "<ABSENT>");
               }
            }

            ServerPlayer killer = resolveKillerPlayer(event);
            if (killer != null && !killer.m_9236_().f_46443_) {
               if (!killer.m_20148_().equals(victim.m_20148_())) {
                  int killType = classifyKillType(victim);
                  emitAxolotlKillTrigger(killer, killType);
                  AxolotlRuntime.applyKillProc(killer);
                  AxolotlRuntime.applySandevistanCooldownReduction(killer);
                  AxolotlRuntime.applyBerserkCooldownReduction(killer);
                  SandevistanRuntime.applyNeutralizeProc(killer);
                  String victimId = String.valueOf(ForgeRegistries.ENTITY_TYPES.getKey(victim.m_6095_()));
                  debugAxolotlJava(killer, "kill detected | type=" + killType + " | victim=" + victimId + " | trigger=1");
               }
            }
         }
      }
   }

   private static void emitAxolotlKillTrigger(ServerPlayer killer, int killType) {
      forcePlayerScore(killer, "er_axo_kill_trigger", 1);
      forcePlayerScore(killer, "er_axo_last_type", killType);
      if (killType == 3) {
         incrementPlayerScore(killer, "er_axo_kills_player", 1);
      } else if (killType == 1) {
         incrementPlayerScore(killer, "er_axo_kills_hostile", 1);
      } else {
         incrementPlayerScore(killer, "er_axo_kills_neutral", 1);
      }
   }

   private static void debugAxolotlJava(ServerPlayer player, String text) {
   }

   private static int classifyKillType(LivingEntity victim) {
      if (victim instanceof ServerPlayer) {
         return 3;
      } else {
         return victim instanceof Enemy ? 1 : 2;
      }
   }

   public static ServerPlayer resolveKillerPlayer(LivingDeathEvent event) {
      if (event != null && event.getSource() != null) {
         LivingEntity victim = event.getEntity();
         if (victim != null) {
            LivingEntity var3 = victim.m_21232_();
            if (var3 instanceof ServerPlayer) {
               ServerPlayer player = (ServerPlayer)var3;
               return player;
            }
         }

         Entity var8 = event.getSource().m_7639_();
         if (var8 instanceof ServerPlayer) {
            ServerPlayer player = (ServerPlayer)var8;
            return player;
         } else {
            var8 = event.getSource().m_7640_();
            if (var8 instanceof ServerPlayer) {
               ServerPlayer player = (ServerPlayer)var8;
               return player;
            } else {
               Entity var4 = event.getSource().m_7640_();
               if (var4 instanceof Projectile) {
                  Projectile projectile = (Projectile)var4;
                  var4 = projectile.m_19749_();
                  if (var4 instanceof ServerPlayer) {
                     ServerPlayer player = (ServerPlayer)var4;
                     return player;
                  }
               }

               return null;
            }
         }
      } else {
         return null;
      }
   }

   private static void onPlayerLogout(PlayerEvent.PlayerLoggedOutEvent event) {
      Player var2 = event.getEntity();
      if (var2 instanceof ServerPlayer player) {
         if (!player.m_9236_().f_46443_) {
            SandevistanController.onPlayerLogout(player);
            forcePlayerScore(player, "er_sandy_active", 0);
            forcePlayerScore(player, "er_sandy_exhaust", 0);
            forcePlayerScore(player, "er_face_scan_mode", 0);
            forcePlayerScore(player, "er_face_active_ticks", 0);
            forcePlayerScore(player, "er_face_active_max", 0);
            loginGuardUntilTick.remove(player.m_20148_());
            cyberwareLoginIconResyncAtTick.remove(player.m_20148_());
            ripperdocUnlockAtTick.remove(player.m_20148_());
            ripperdocSoundAtTick.remove(player.m_20148_());
            ripperdocEffectsAtTick.remove(player.m_20148_());
            cyberwareRespawnApplyAtTick.remove(player.m_20148_());
            player.getPersistentData().m_128473_("cyberware_join_lock_until");
            player.getPersistentData().m_128473_("cyberware_os_lock_until");
            player.getPersistentData().m_128473_("ripperdoc_postfx_lock_until");
            player.m_20137_("edgerunner_ripperdoc_lock");
         }

      }
   }

   private static void forcePlayerScore(ServerPlayer player, String objectiveName, int value) {
      Scoreboard scoreboard = player.m_284548_().m_6188_();
      if (scoreboard != null) {
         Objective objective = scoreboard.m_83477_(objectiveName);
         if (objective != null) {
            scoreboard.m_83471_(player.m_6302_(), objective).m_83402_(value);
         }
      }
   }

   private static void incrementPlayerScore(ServerPlayer player, String objectiveName, int increment) {
      Scoreboard scoreboard = player.m_284548_().m_6188_();
      if (scoreboard != null) {
         Objective objective = scoreboard.m_83477_(objectiveName);
         if (objective != null) {
            Score score = scoreboard.m_83471_(player.m_6302_(), objective);
            score.m_83402_(score.m_83400_() + increment);
         }
      }
   }

   private static void onServerStarting(ServerStartingEvent event) {
      EdgerunnerServerConfig.reload();
      loginGuardUntilTick.clear();
      cyberwareLoginIconResyncAtTick.clear();
      cyberwareDimensionResyncAtTick.clear();
      ripperdocUnlockAtTick.clear();
      ripperdocSoundAtTick.clear();
      ripperdocEffectsAtTick.clear();
      cyberwareRespawnApplyAtTick.clear();
      FaceOverlayServerState.clear();
      CyberwarePaintServerState.clear();
      SandevistanController.onServerStopping();
   }

   private static void onServerStopping(ServerStoppingEvent event) {
      loginGuardUntilTick.clear();
      cyberwareLoginIconResyncAtTick.clear();
      cyberwareDimensionResyncAtTick.clear();
      ripperdocUnlockAtTick.clear();
      ripperdocSoundAtTick.clear();
      ripperdocEffectsAtTick.clear();
      cyberwareRespawnApplyAtTick.clear();
      FaceOverlayServerState.clear();
      CyberwarePaintServerState.clear();
      SandevistanController.onServerStopping();
   }

   public static void scheduleRipperdocPostEffects(ServerPlayer player) {
      if (player != null && !player.m_9236_().f_46443_) {
         long now = player.m_284548_().m_46467_();
         long dueTick = now + (EdgerunnerServerConfig.isRipperdocCinematicEnabled() ? 414L : 1L);
         ripperdocEffectsAtTick.put(player.m_20148_(), dueTick);
      }
   }

   public static void triggerRipperdocPostFx(ServerPlayer player) {
      if (player != null && !player.m_9236_().f_46443_) {
         if (!EdgerunnerServerConfig.isRipperdocCinematicEnabled()) {
            ripperdocEffectsAtTick.remove(player.m_20148_());
         } else {
            CompoundTag kept = player.getPersistentData().m_128469_("PlayerPersisted");
            if (EdgerunnerServerConfig.isRipperdocCinematicFirstOnly() && kept.m_128471_("project_edgerunner_ripperdoc_sequence_seen")) {
               ripperdocEffectsAtTick.remove(player.m_20148_());
            } else {
               kept.m_128379_("project_edgerunner_ripperdoc_sequence_seen", true);
               player.getPersistentData().m_128365_("PlayerPersisted", kept);
               scheduleRipperdocPostEffects(player);
               long now = player.m_284548_().m_46467_();
               long lockUntil = now + 434L;
               player.getPersistentData().m_128356_("ripperdoc_postfx_lock_until", lockUntil);
               player.m_20049_("edgerunner_ripperdoc_lock");
               ripperdocUnlockAtTick.put(player.m_20148_(), lockUntil);
               ripperdocSoundAtTick.put(player.m_20148_(), now + 20L);
               CyberpunkNetwork.sendRipperdocPostFx(player);
            }
         }
      }
   }

   public static void cancelRipperdocPostFx(ServerPlayer player) {
      if (player != null && !player.m_9236_().f_46443_) {
         ripperdocUnlockAtTick.remove(player.m_20148_());
         ripperdocSoundAtTick.remove(player.m_20148_());
         ripperdocEffectsAtTick.remove(player.m_20148_());
         player.getPersistentData().m_128473_("ripperdoc_postfx_lock_until");
         player.m_20137_("edgerunner_ripperdoc_lock");
         if (player.f_8906_ != null) {
            player.f_8906_.m_9829_(new ClientboundStopSoundPacket(ResourceLocation.fromNamespaceAndPath("project_edgerunner", "postripperdoc"), SoundSource.PLAYERS));
         }

         CyberpunkNetwork.sendRipperdocPostFxCancel(player);
      }
   }

   private static void grantGuideOnFirstJoin(ServerPlayer player) {
      if (player != null && !player.m_9236_().f_46443_) {
         if (EdgerunnerServerConfig.isGiveGuideOnFirstJoin()) {
            CompoundTag data = player.getPersistentData();
            if (!data.m_128471_("edgerunner_guide_granted")) {
               ItemStack guide = new ItemStack((ItemLike)CyberpunkItems.GUIDE.get());
               if (!player.m_150109_().m_36063_(guide) && !player.m_36356_(guide.m_41777_())) {
                  player.m_36176_(guide, false);
               }

               data.m_128379_("edgerunner_guide_granted", true);
            }
         }
      }
   }

   public static boolean isSandevistanJoinGuardActive(ServerPlayer player) {
      Long until = (Long)loginGuardUntilTick.get(player.m_20148_());
      if (until == null) {
         return false;
      } else {
         long now = player.m_284548_().m_46467_();
         return now <= until;
      }
   }

   public static void releaseSandevistanJoinGuard(ServerPlayer player) {
      if (player != null && !player.m_9236_().f_46443_) {
         loginGuardUntilTick.remove(player.m_20148_());
         player.getPersistentData().m_128473_("cyberware_join_lock_until");
         player.getPersistentData().m_128473_("cyberware_os_lock_until");
      }
   }

   private static void scheduleCyberwareDimensionResync(ServerPlayer player) {
      if (player != null && !player.m_9236_().f_46443_) {
         cyberwareDimensionResyncAtTick.put(player.m_20148_(), player.m_284548_().m_46467_() + 20L);
      }
   }

   private static void onServerTick(TickEvent.ServerTickEvent event) {
      if (event.phase == Phase.END) {
         SandevistanController.onServerTick(event.getServer());
         SuppressorSlotService.tickCooldowns(event.getServer());
         long now = event.getServer().m_129783_().m_46467_();
         Iterator<Map.Entry<UUID, Long>> it = loginGuardUntilTick.entrySet().iterator();

         while(it.hasNext()) {
            Map.Entry<UUID, Long> entry = (Map.Entry)it.next();
            UUID playerId = (UUID)entry.getKey();
            long until = (Long)entry.getValue();
            if (now > until) {
               it.remove();
               ServerPlayer player = event.getServer().m_6846_().m_11259_(playerId);
               if (player != null && !player.m_9236_().f_46443_) {
                  player.getPersistentData().m_128473_("cyberware_join_lock_until");
                  player.getPersistentData().m_128473_("cyberware_os_lock_until");
                  CyberwareSyncService.syncInstalledStateAndHud(player);
               }
            }
         }

         Iterator<Map.Entry<UUID, Long>> cyberwareIconIt = cyberwareLoginIconResyncAtTick.entrySet().iterator();

         while(cyberwareIconIt.hasNext()) {
            Map.Entry<UUID, Long> entry = (Map.Entry)cyberwareIconIt.next();
            if (now >= (Long)entry.getValue()) {
               cyberwareIconIt.remove();
               ServerPlayer player = event.getServer().m_6846_().m_11259_((UUID)entry.getKey());
               if (player != null && !player.m_9236_().f_46443_) {
                  CyberwareSyncService.syncInstalledStateAndHud(player);
               }
            }
         }

         Iterator<Map.Entry<UUID, Long>> cyberwareDimensionIt = cyberwareDimensionResyncAtTick.entrySet().iterator();

         while(cyberwareDimensionIt.hasNext()) {
            Map.Entry<UUID, Long> entry = (Map.Entry)cyberwareDimensionIt.next();
            if (now >= (Long)entry.getValue()) {
               cyberwareDimensionIt.remove();
               ServerPlayer player = event.getServer().m_6846_().m_11259_((UUID)entry.getKey());
               if (player != null && !player.m_9236_().f_46443_) {
                  CyberwareSyncService.syncInstalledStateAndHud(player);
               }
            }
         }

         Iterator<Map.Entry<UUID, Long>> ripperdocUnlockIt = ripperdocUnlockAtTick.entrySet().iterator();

         while(ripperdocUnlockIt.hasNext()) {
            Map.Entry<UUID, Long> entry = (Map.Entry)ripperdocUnlockIt.next();
            if (now >= (Long)entry.getValue()) {
               ripperdocUnlockIt.remove();
               ServerPlayer player = event.getServer().m_6846_().m_11259_((UUID)entry.getKey());
               if (player != null && !player.m_9236_().f_46443_) {
                  player.getPersistentData().m_128473_("ripperdoc_postfx_lock_until");
                  player.m_20137_("edgerunner_ripperdoc_lock");
               }
            }
         }

         Iterator<Map.Entry<UUID, Long>> ripperdocIt = ripperdocEffectsAtTick.entrySet().iterator();

         while(ripperdocIt.hasNext()) {
            Map.Entry<UUID, Long> entry = (Map.Entry)ripperdocIt.next();
            if (now >= (Long)entry.getValue()) {
               ripperdocIt.remove();
               ServerPlayer player = event.getServer().m_6846_().m_11259_((UUID)entry.getKey());
               if (player != null && !player.m_9236_().f_46443_) {
                  player.m_7292_(new MobEffectInstance(MobEffects.f_216964_, 120, 0, false, false, true));
                  player.m_7292_(new MobEffectInstance(MobEffects.f_19604_, 120, 0, false, false, true));
               }
            }
         }

         Iterator<Map.Entry<UUID, Long>> ripperdocSoundIt = ripperdocSoundAtTick.entrySet().iterator();

         while(ripperdocSoundIt.hasNext()) {
            Map.Entry<UUID, Long> entry = (Map.Entry)ripperdocSoundIt.next();
            if (now >= (Long)entry.getValue()) {
               ripperdocSoundIt.remove();
               ServerPlayer player = event.getServer().m_6846_().m_11259_((UUID)entry.getKey());
               if (player != null && !player.m_9236_().f_46443_) {
                  playRipperdocPostSound(player);
               }
            }
         }

         Iterator<Map.Entry<UUID, Long>> respawnCwIt = cyberwareRespawnApplyAtTick.entrySet().iterator();

         while(respawnCwIt.hasNext()) {
            Map.Entry<UUID, Long> entry = (Map.Entry)respawnCwIt.next();
            if (now >= (Long)entry.getValue()) {
               respawnCwIt.remove();
               ServerPlayer player = event.getServer().m_6846_().m_11259_((UUID)entry.getKey());
               if (player != null && !player.m_9236_().f_46443_) {
                  String name = player.m_36316_().getName();
                  CompoundTag pd = player.getPersistentData();
                  LOGGER.debug("[Edgerunner] Respawn protection ENDED for {} — GUI={} cyberware={}", name, pd.m_128441_("CyberpunkRipperdocGui") ? pd.m_128469_("CyberpunkRipperdocGui").m_128431_() : "<ABSENT>", pd.m_128441_("cyberware") ? pd.m_128469_("cyberware") : "<ABSENT>");
                  CyberwarePowerReconcile.reconcile(player);
               }
            }
         }

      }
   }

   private static void playRipperdocPostSound(ServerPlayer player) {
      if (player != null) {
         MinecraftServer server = player.m_20194_();
         if (server != null) {
            String command = "playsound project_edgerunner:postripperdoc player @a[distance=..6] ~ ~ ~";
            server.m_129892_().m_230957_(player.m_20203_().m_81324_().m_81325_(2), command);
         }
      }
   }
}
