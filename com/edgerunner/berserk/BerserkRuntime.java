package com.edgerunner.berserk;

import com.edgerunner.client.BerserkClientState;
import com.edgerunner.config.EdgerunnerServerConfig;
import com.edgerunner.cyberpsychosis.dream.DreamRuntime;
import com.edgerunner.cyberware.CyberwareBanService;
import com.edgerunner.network.BerserkFxPacket;
import com.edgerunner.network.CyberpunkNetwork;
import com.edgerunner.registry.CyberpunkEffects;
import com.edgerunner.registry.CyberpunkSounds;
import com.edgerunner.sandevistan.SandevistanStateUtil;
import com.edgerunner.sandevistan.TemporalHooks;
import com.edgerunner.util.CyberwareDataUtil;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import javax.annotation.Nullable;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.core.registries.Registries;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvent;
import net.minecraft.sounds.SoundSource;
import net.minecraft.tags.DamageTypeTags;
import net.minecraft.tags.TagKey;
import net.minecraft.util.Mth;
import net.minecraft.world.damagesource.DamageTypes;
import net.minecraft.world.effect.MobEffect;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.NeutralMob;
import net.minecraft.world.entity.ai.attributes.AttributeInstance;
import net.minecraft.world.entity.ai.attributes.AttributeModifier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.ai.attributes.AttributeModifier.Operation;
import net.minecraft.world.entity.monster.Monster;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.food.FoodData;
import net.minecraft.world.item.AxeItem;
import net.minecraft.world.item.DiggerItem;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.SwordItem;
import net.minecraft.world.item.TridentItem;
import net.minecraft.world.scores.Objective;
import net.minecraft.world.scores.Scoreboard;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.event.TickEvent.Phase;
import net.minecraftforge.event.entity.living.LivingAttackEvent;
import net.minecraftforge.event.entity.living.LivingDamageEvent;
import net.minecraftforge.event.entity.living.LivingDeathEvent;
import net.minecraftforge.event.entity.living.LivingFallEvent;
import net.minecraftforge.event.entity.player.AttackEntityEvent;
import net.minecraftforge.event.entity.player.PlayerEvent;
import net.minecraftforge.event.entity.player.PlayerInteractEvent;
import net.minecraftforge.event.server.ServerStoppingEvent;
import net.minecraftforge.eventbus.api.EventPriority;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.eventbus.api.Event.Result;
import net.minecraftforge.fml.ModList;
import net.minecraftforge.fml.common.Mod.EventBusSubscriber;
import net.minecraftforge.fml.common.Mod.EventBusSubscriber.Bus;

@EventBusSubscriber(
   modid = "project_edgerunner",
   bus = Bus.FORGE
)
public final class BerserkRuntime {
   public static final TagKey<Item> MELEE_WEAPONS;
   private static final UUID ATTACK_SPEED_MODIFIER_ID;
   private static final UUID MOVEMENT_SPEED_MODIFIER_ID;
   private static final UUID KNOCKBACK_RESISTANCE_MODIFIER_ID;
   private static final String LAST_ATTACKER_KEY = "cyb_bz_last_attacker";
   private static final String LAST_ATTACK_TICK_KEY = "cyb_bz_last_attack_tick";
   private static final int ATTRIBUTION_GRACE_TICKS = 100;
   private static final int PRESSURE_SPIKE_MAX = 300;
   private static final Map<UUID, RuntimeState> STATES;

   private BerserkRuntime() {
   }

   public static void requestActivation(Object entityLike) {
      if (entityLike instanceof ServerPlayer player) {
         if (!DreamRuntime.inDream(player)) {
            RuntimeState state = (RuntimeState)STATES.get(player.m_20148_());
            if (state != null && state.activeTicks > 0) {
               if (state.controlLossActivation) {
                  sendFx(player, state, 8, 0.65F, 0);
                  return;
               }

               state.cooldownMax = manualExitCooldown(state.cooldownMax, state.activeMax, state.activeTicks);
               finishActivation(player, state);
            } else {
               activate(player, false);
            }
         }
      }

   }

   public static boolean activateForControlLoss(ServerPlayer player) {
      return activate(player, true);
   }

   public static boolean blocksRangedUse(@Nullable Player player) {
      if (player == null) {
         return false;
      } else {
         return player.m_9236_().f_46443_ ? BerserkClientState.isActive(player) : isActive(player);
      }
   }

   public static void registerCompat() {
      if (ModList.get().isLoaded("tacz")) {
         try {
            Class.forName("com.edgerunner.compat.tacz.TacZBerserkCompat").getMethod("register").invoke((Object)null);
         } catch (ReflectiveOperationException error) {
            throw new IllegalStateException("Cannot initialize TaCZ Berserk integration", error);
         }
      }
   }

   public static boolean isActive(@Nullable Player player) {
      if (player == null) {
         return false;
      } else {
         RuntimeState state = (RuntimeState)STATES.get(player.m_20148_());
         return state != null && state.activeTicks > 0;
      }
   }

   public static int cyberpsychosisPressureBonus(ServerPlayer player) {
      RuntimeState state = player == null ? null : (RuntimeState)STATES.get(player.m_20148_());
      if (state != null && state.activeTicks > 0 && state.variant != null) {
         short var10000;
         switch (state.variant) {
            case MOORE_TECH -> var10000 = 170;
            case BIODYNE -> var10000 = 190;
            case ZETATECH -> var10000 = 210;
            case MILITECH -> var10000 = 260;
            default -> throw new IncompatibleClassChangeError();
         }

         int base = var10000;
         return base + state.pressureSpike;
      } else {
         return 0;
      }
   }

   @SubscribeEvent
   public static void onPlayerTick(TickEvent.PlayerTickEvent event) {
      if (event.phase == Phase.END) {
         Player var2 = event.player;
         if (var2 instanceof ServerPlayer) {
            ServerPlayer player = (ServerPlayer)var2;
            BerserkVariant var5 = resolveInstalledVariant(player);
            RuntimeState state = (RuntimeState)STATES.get(player.m_20148_());
            if (var5 == null) {
               if (state != null) {
                  reset(player, state, false);
               }

               clearScores(player);
               return;
            }

            setScore(player, "er_bz_variant", var5.networkId());
            if (state == null) {
               int persistedCooldown = Math.max(0, player.getPersistentData().m_128451_("cyb_bz_cooldown_remaining"));
               if (persistedCooldown > 0) {
                  state = new RuntimeState();
                  state.variant = var5;
                  state.cooldownTicks = persistedCooldown;
                  state.cooldownMax = Math.max(persistedCooldown, var5.cooldownTicks(tier(player.getPersistentData(), "cyb_bz_cooldown_tier")));
                  STATES.put(player.m_20148_(), state);
                  syncScores(player, state);
               }

               return;
            }

            if (state.variant != var5) {
               reset(player, state, false);
               return;
            }

            if (state.activeTicks > 0) {
               tickActive(player, state);
            } else if (state.cooldownTicks > 0) {
               int ticks = TemporalHooks.playerCyberwareTimerTicks(player, 1, 4413188L);
               state.cooldownTicks = Math.max(0, state.cooldownTicks - ticks);
               player.getPersistentData().m_128405_("cyb_bz_cooldown_remaining", Math.max(0, state.cooldownTicks));
               syncScores(player, state);
               if (state.cooldownTicks <= 0) {
                  sendFx(player, state, 7, 0.7F, 0);
                  STATES.remove(player.m_20148_());
                  player.getPersistentData().m_128473_("cyb_bz_cooldown_remaining");
                  clearRuntimeScores(player, var5.networkId());
               }
            } else {
               STATES.remove(player.m_20148_());
               clearRuntimeScores(player, var5.networkId());
            }

            return;
         }
      }

   }

   public static boolean applyAxolotlCooldownReduction(ServerPlayer player, double reductionPercent) {
      if (player != null && !player.m_9236_().f_46443_ && Double.isFinite(reductionPercent) && !(reductionPercent <= (double)0.0F)) {
         BerserkVariant installed = resolveInstalledVariant(player);
         if (installed == null) {
            return false;
         } else {
            RuntimeState state = (RuntimeState)STATES.get(player.m_20148_());
            if (state == null) {
               int persistedCooldown = Math.max(0, player.getPersistentData().m_128451_("cyb_bz_cooldown_remaining"));
               if (persistedCooldown <= 0) {
                  return false;
               }

               state = new RuntimeState();
               state.variant = installed;
               state.cooldownTicks = persistedCooldown;
               state.cooldownMax = Math.max(persistedCooldown, installed.cooldownTicks(tier(player.getPersistentData(), "cyb_bz_cooldown_tier")));
               STATES.put(player.m_20148_(), state);
            }

            if (state.variant != installed) {
               return false;
            } else {
               boolean active = state.activeTicks > 0;
               int before = active ? state.cooldownMax : state.cooldownTicks;
               if (before <= 0) {
                  return false;
               } else {
                  int after = BerserkCombatMath.reduceCooldownTicks(before, reductionPercent);
                  if (after == before) {
                     return false;
                  } else {
                     if (active) {
                        state.cooldownMax = after;
                     } else {
                        state.cooldownTicks = after;
                     }

                     if (!active && after <= 0) {
                        STATES.remove(player.m_20148_());
                        player.getPersistentData().m_128473_("cyb_bz_cooldown_remaining");
                        clearRuntimeScores(player, installed.networkId());
                     } else {
                        player.getPersistentData().m_128405_("cyb_bz_cooldown_remaining", after);
                        syncScores(player, state);
                     }

                     return true;
                  }
               }
            }
         }
      } else {
         return false;
      }
   }

   @SubscribeEvent(
      priority = EventPriority.HIGHEST
   )
   public static void onRightClickItem(PlayerInteractEvent.RightClickItem event) {
      if (blocksRangedUse(event.getEntity())) {
         event.setCanceled(true);
      }

   }

   @SubscribeEvent(
      priority = EventPriority.HIGHEST
   )
   public static void onEntityInteract(PlayerInteractEvent.EntityInteract event) {
      if (isActive(event.getEntity())) {
         event.setCanceled(true);
      }

   }

   @SubscribeEvent(
      priority = EventPriority.HIGHEST
   )
   public static void onAttackEntity(AttackEntityEvent event) {
      if (isActive(event.getEntity()) && !isAllowedMeleeStack(event.getEntity().m_21205_())) {
         event.setCanceled(true);
      }

   }

   @SubscribeEvent(
      priority = EventPriority.HIGHEST
   )
   public static void onRightClickBlock(PlayerInteractEvent.RightClickBlock event) {
      if (blocksRangedUse(event.getEntity())) {
         event.setUseItem(Result.DENY);
      }

   }

   @SubscribeEvent(
      priority = EventPriority.LOWEST
   )
   public static void onLivingDamage(LivingDamageEvent event) {
      if (!event.isCanceled() && !event.getEntity().m_9236_().f_46443_) {
         applyIncomingDamageRules(event);
         applyOutgoingDamageRules(event);
      }
   }

   @SubscribeEvent(
      priority = EventPriority.HIGHEST
   )
   public static void onLivingAttack(LivingAttackEvent event) {
      LivingEntity var2 = event.getEntity();
      if (var2 instanceof ServerPlayer player) {
         if (!event.getEntity().m_9236_().f_46443_) {
            RuntimeState state = (RuntimeState)STATES.get(player.m_20148_());
            if (state != null && state.activeTicks > 0 && state.variant == BerserkVariant.MILITECH) {
               if (!event.getSource().m_276093_(DamageTypes.f_268724_) && !event.getSource().m_276093_(DamageTypes.f_286979_)) {
                  state.pressureSpike = Math.min(300, state.pressureSpike + Math.min(60, Math.max(1, Mth.m_14167_(event.getAmount() * 3.0F))));
                  sendFx(player, state, 1, Mth.m_14036_(event.getAmount() / 12.0F, 0.35F, 1.25F), Mth.m_14167_(event.getAmount()));
                  event.setCanceled(true);
                  return;
               }

               return;
            }

            return;
         }
      }

   }

   @SubscribeEvent
   public static void onLivingFall(LivingFallEvent event) {
      LivingEntity var2 = event.getEntity();
      if (var2 instanceof ServerPlayer player) {
         RuntimeState state = (RuntimeState)STATES.get(player.m_20148_());
         if (state != null && state.activeTicks > 0 && state.variant == BerserkVariant.ZETATECH && state.specialization == 2 && !(event.getDistance() < 4.0F)) {
            float strength = Mth.m_14036_((event.getDistance() - 3.0F) / 9.0F, 0.25F, 1.0F);
            boolean mastered = state.specializationTier >= 2;
            double radius = (mastered ? (double)3.25F : (double)2.5F) + (double)strength * (mastered ? (double)2.0F : (double)1.5F);

            for(LivingEntity target : player.m_284548_().m_6443_(LivingEntity.class, player.m_20191_().m_82400_(radius), (targetx) -> targetx != player && targetx.m_6084_() && !targetx.m_7307_(player))) {
               target.m_6469_(player.m_269291_().m_269075_(player), (mastered ? 4.0F : 3.0F) + (mastered ? 6.5F : 5.0F) * strength);
               target.m_147207_(new MobEffectInstance(MobEffects.f_19597_, mastered ? 14 : 8, 4, false, false, true), player);
               double dx = target.m_20185_() - player.m_20185_();
               double dz = target.m_20189_() - player.m_20189_();
               target.m_147240_((mastered ? 0.6 : 0.45) + (mastered ? (double)0.75F : 0.55) * (double)strength, -dx, -dz);
            }

            player.m_284548_().m_5594_((Player)null, player.m_20183_(), (SoundEvent)CyberpunkSounds.GROUND_SLAM_STRONG.get(), SoundSource.PLAYERS, 0.75F, 0.82F + strength * 0.16F);
            player.m_284548_().m_8767_(ParticleTypes.f_123762_, player.m_20185_(), player.m_20186_() + 0.15, player.m_20189_(), mastered ? 30 : 20, radius * 0.35, 0.08, radius * 0.35, 0.12);
            sendFx(player, state, 5, 0.55F + strength * 0.7F, Mth.m_14165_(radius * (double)10.0F));
         }
      }
   }

   @SubscribeEvent
   public static void onLivingDeath(LivingDeathEvent event) {
      LivingEntity victim = event.getEntity();
      if (!victim.m_9236_().f_46443_) {
         if (victim instanceof ServerPlayer) {
            ServerPlayer deadPlayer = (ServerPlayer)victim;
            RuntimeState deadState = (RuntimeState)STATES.remove(deadPlayer.m_20148_());
            if (deadState != null) {
               reset(deadPlayer, deadState, false);
            }
         }

         ServerPlayer attacker = resolveAttributedAttacker(victim, event.getSource().m_7639_());
         if (attacker != null && isValidNeutralization(victim)) {
            RuntimeState state = (RuntimeState)STATES.get(attacker.m_20148_());
            if (state != null && state.activeTicks > 0 && state.countedVictims.add(victim.m_20148_())) {
               ++state.kills;
               state.pressureSpike = Math.min(300, state.pressureSpike + 30);
               if (state.variant == BerserkVariant.BIODYNE && state.specialization == 2 && state.specializationTier >= 2) {
                  state.predationReady = true;
               }

               setScore(attacker, "er_bz_kills", state.kills);
               sendFx(attacker, state, 4, Mth.m_14036_(0.65F + (float)state.kills * 0.08F, 0.65F, 1.25F), state.kills);
               playSound(attacker, (SoundEvent)CyberpunkSounds.BERSERK_CRITICAL.get(), 0.48F, 0.78F + Math.min(0.22F, (float)state.kills * 0.025F));
            }
         }
      }
   }

   @SubscribeEvent
   public static void onLogout(PlayerEvent.PlayerLoggedOutEvent event) {
      Player var2 = event.getEntity();
      if (var2 instanceof ServerPlayer player) {
         RuntimeState state = (RuntimeState)STATES.remove(player.m_20148_());
         if (state != null) {
            removeModifiers(player);
            player.getPersistentData().m_128405_("cyb_bz_cooldown_remaining", Math.max(state.cooldownTicks, state.activeTicks > 0 ? state.cooldownMax : 0));
         }

         clearScores(player);
      }

   }

   @SubscribeEvent
   public static void onServerStopping(ServerStoppingEvent event) {
      STATES.clear();
   }

   private static boolean activate(ServerPlayer player, boolean controlLoss) {
      if (player != null && player.m_6084_() && !player.m_5833_()) {
         BerserkVariant variant = resolveInstalledVariant(player);
         if (variant == null) {
            return false;
         } else if (SandevistanStateUtil.isSandevistanActive(player)) {
            CyberpunkNetwork.sendBerserkFx(player, new BerserkFxPacket(8, variant.networkId(), 0.65F, 0));
            return false;
         } else {
            RuntimeState existing = (RuntimeState)STATES.get(player.m_20148_());
            if (existing == null || existing.activeTicks <= 0 && existing.cooldownTicks <= 0) {
               CompoundTag data = player.getPersistentData();
               RuntimeState state = new RuntimeState();
               state.variant = variant;
               state.armorTier = tier(data, "cyb_bz_armor_tier");
               state.durationTier = tier(data, "cyb_bz_duration_tier");
               state.cooldownTier = tier(data, "cyb_bz_cooldown_tier");
               state.attackSpeedTier = tier(data, "cyb_bz_attack_speed_tier");
               state.critTier = tier(data, "cyb_bz_crit_tier");
               state.fallTier = tier(data, "cyb_bz_fall_tier");
               state.moveTier = tier(data, "cyb_bz_move_tier");
               state.specialization = Mth.m_14045_(data.m_128451_("cyb_bz_specialization"), 0, 2);
               state.specializationTier = Mth.m_14045_(data.m_128451_("cyb_bz_specialization_tier"), 0, 2);
               state.activeMax = variant.durationTicks(state.durationTier);
               state.activeTicks = state.activeMax;
               state.cooldownMax = variant.cooldownTicks(state.cooldownTier);
               FoodData food = player.m_36324_();
               state.lockedFoodLevel = food.m_38702_();
               state.lockedSaturation = food.m_38722_();
               state.controlLossActivation = controlLoss;
               data.m_128405_("cyb_bz_cooldown_remaining", state.cooldownMax);
               STATES.put(player.m_20148_(), state);
               applyModifiers(player, state);
               syncScores(player, state);
               playSound(player, activationSound(variant), 1.0F, 0.94F);
               sendFx(player, state, 0, controlLoss ? 1.3F : 1.0F, state.specialization);
               return true;
            } else {
               sendFx(player, existing, 8, 0.65F, Math.max(existing.activeTicks, existing.cooldownTicks));
               return false;
            }
         }
      } else {
         return false;
      }
   }

   private static void tickActive(ServerPlayer player, RuntimeState state) {
      int beforeTicks = state.activeTicks;
      int bodyTicks = TemporalHooks.playerCyberwareTimerTicks(player, 1, 4413195L);
      state.activeTicks = Math.max(0, state.activeTicks - bodyTicks);
      if (player.m_6117_()) {
         player.m_5810_();
      }

      if (state.pressureSpike > 0) {
         state.pressureSpike = Math.max(0, state.pressureSpike - (beforeTicks / 4 - state.activeTicks / 4));
      }

      if (state.activeTicks > 0) {
         BerserkHeatFx.emitServer(player, player.m_284548_());
      }

      FoodData food = player.m_36324_();
      food.m_38705_(Math.max(food.m_38702_(), state.lockedFoodLevel));
      food.m_38717_(Math.max(food.m_38722_(), state.lockedSaturation));
      applyModifiers(player, state);
      syncScores(player, state);
      if (state.activeTicks <= 0) {
         finishActivation(player, state);
      }

   }

   public static int manualExitCooldown(int cooldown, int activeMax, int remaining) {
      return BerserkCombatMath.manualExitCooldown(cooldown, activeMax, remaining);
   }

   private static void finishActivation(ServerPlayer player, RuntimeState state) {
      removeModifiers(player);
      float beforeHealth = player.m_21223_();
      if (state.kills > 0 && player.m_6084_()) {
         float heal = player.m_21233_() * (float)EdgerunnerServerConfig.getBerserkHealPerKill() * (float)state.kills;
         player.m_5634_(heal);
      }

      state.activeTicks = 0;
      state.cooldownTicks = state.cooldownMax;
      player.getPersistentData().m_128405_("cyb_bz_cooldown_remaining", state.cooldownTicks);
      state.pressureSpike = 0;
      syncScores(player, state);
      int restoredHealth = Mth.m_14167_(Math.max(0.0F, player.m_21223_() - beforeHealth));
      playSound(player, exitSound(state.variant), 0.9F, 1.0F);
      if (restoredHealth > 0) {
         player.m_284548_().m_8767_(ParticleTypes.f_123750_, player.m_20185_(), player.m_20186_() + (double)1.0F, player.m_20189_(), Math.min(18, 4 + state.kills * 3), (double)0.5F, 0.7, (double)0.5F, 0.08);
      }

      sendFx(player, state, 6, 0.85F, restoredHealth);
   }

   private static void applyIncomingDamageRules(LivingDamageEvent event) {
      LivingEntity var2 = event.getEntity();
      if (var2 instanceof ServerPlayer player) {
         RuntimeState state = (RuntimeState)STATES.get(player.m_20148_());
         if (state != null && state.activeTicks > 0 && state.variant != null) {
            if (!event.getSource().m_276093_(DamageTypes.f_268724_) && !event.getSource().m_276093_(DamageTypes.f_286979_)) {
               float original = Math.max(0.0F, event.getAmount());
               state.pressureSpike = Math.min(300, state.pressureSpike + Math.min(60, Math.max(1, Mth.m_14167_(original * 3.0F))));
               float reduced;
               if (state.variant.invulnerable()) {
                  reduced = 0.0F;
               } else {
                  double reduction = state.variant.damageReductionPercent(state.armorTier);
                  if (state.variant == BerserkVariant.MOORE_TECH && state.specialization == 1 && state.specializationTier >= 2) {
                     reduction += (double)state.bastionStacks * (double)2.0F;
                     state.bastionStacks = Math.min(5, state.bastionStacks + 1);
                     state.bastionStackTicks = 40;
                  }

                  if (event.getSource().m_269533_(DamageTypeTags.f_268549_)) {
                     reduction = BerserkCombatMath.combineReductions(reduction, state.variant.fallReductionPercent(state.fallTier));
                  }

                  reduced = BerserkCombatMath.reduceDamage(original, reduction);
               }

               float clamped = BerserkCombatMath.clampToHealthFloor(player.m_21223_(), player.m_21233_(), reduced, (float)EdgerunnerServerConfig.getBerserkHealthFloor());
               if (clamped < reduced) {
                  reduced = clamped;
                  state.pressureSpike = Math.min(300, state.pressureSpike + 80);
               }

               event.setAmount(Math.max(0.0F, reduced));
               float absorbed = Math.max(0.0F, original - reduced);
               if (absorbed > 0.2F && player.f_19797_ != state.lastAbsorbFxTick) {
                  state.lastAbsorbFxTick = player.f_19797_;
                  sendFx(player, state, 1, Mth.m_14036_(absorbed / Math.max(2.0F, original), 0.25F, 1.0F), Mth.m_14167_(absorbed));
               }

            }
         }
      }
   }

   private static void applyOutgoingDamageRules(LivingDamageEvent event) {
      Entity sourceEntity = event.getSource().m_7639_();
      Entity directEntity = event.getSource().m_7640_();
      if (sourceEntity instanceof ServerPlayer attacker) {
         if (directEntity == attacker) {
            RuntimeState state = (RuntimeState)STATES.get(attacker.m_20148_());
            if (state != null && state.activeTicks > 0 && state.variant != null) {
               LivingEntity victim = event.getEntity();
               markAttribution(attacker, victim);
               float originalAmount = event.getAmount();
               float amount = originalAmount;
               boolean criticalHit = false;
               boolean poweredHit = false;
               if (state.variant == BerserkVariant.BIODYNE) {
                  double critChance = state.variant.critChancePercent(state.critTier);
                  boolean sameHemorrhageTarget = victim.m_20148_().equals(state.hemorrhageTarget);
                  if (state.specialization == 1 && state.specializationTier >= 2 && sameHemorrhageTarget) {
                     critChance += (double)state.hemorrhageStacks * (double)5.0F;
                  }

                  boolean firstPredationHit = state.specialization == 2 && state.seenPredationTargets.add(victim.m_20148_());
                  if (firstPredationHit) {
                     critChance += (double)10.0F;
                  }

                  boolean critical = state.specialization == 2 && state.specializationTier >= 2 && state.predationReady;
                  if (!critical) {
                     critical = attacker.m_217043_().m_188500_() < critChance / (double)100.0F;
                  }

                  if (critical) {
                     criticalHit = true;
                     amount = originalAmount * 2.0F;
                     playSound(attacker, (SoundEvent)CyberpunkSounds.BERSERK_CRITICAL.get(), 0.65F, 0.92F + attacker.m_217043_().m_188501_() * 0.12F);
                     if (state.specialization == 1) {
                        victim.m_147207_(new MobEffectInstance((MobEffect)CyberpunkEffects.BLEED.get(), 80, 0, false, true, true), attacker);
                        if (!sameHemorrhageTarget) {
                           state.hemorrhageTarget = victim.m_20148_();
                           state.hemorrhageStacks = 1;
                        } else {
                           state.hemorrhageStacks = Math.min(3, state.hemorrhageStacks + 1);
                        }
                     }

                     state.predationReady = false;
                  }
               }

               if (state.variant == BerserkVariant.MOORE_TECH && state.specialization == 2 && attacker.m_36403_(0.5F) >= 0.9F) {
                  poweredHit = true;
                  amount *= state.specializationTier >= 2 ? 1.2F : 1.1F;
                  if (state.specializationTier >= 2) {
                     victim.m_147207_(new MobEffectInstance(MobEffects.f_19597_, 7, 4, false, false, true), attacker);
                  }
               }

               if (state.variant == BerserkVariant.ZETATECH && state.specialization == 1 && state.specializationTier >= 2 && attacker.m_20142_()) {
                  poweredHit = true;
                  amount *= 1.15F;
               }

               if (state.variant == BerserkVariant.MILITECH) {
                  float healthRatio = attacker.m_21223_() / Math.max(1.0F, attacker.m_21233_());
                  if (healthRatio <= 0.2F) {
                     poweredHit = true;
                     amount *= state.specialization == 1 && state.specializationTier >= 2 ? 1.65F : 1.5F;
                  }

                  if (state.specialization == 2 && attacker.m_20142_()) {
                     poweredHit = true;
                     amount *= 1.15F;
                     if (state.specializationTier >= 2) {
                        victim.m_147207_(new MobEffectInstance(MobEffects.f_19597_, 6, 2, false, false, true), attacker);
                     }
                  }
               }

               event.setAmount(amount);
               int cue = criticalHit ? 3 : 2;
               float bonusRatio = originalAmount <= 0.0F ? 0.0F : Math.max(0.0F, amount / originalAmount - 1.0F);
               sendFx(attacker, state, cue, Mth.m_14036_(0.34F + amount / 24.0F + bonusRatio * 0.35F + (poweredHit ? 0.16F : 0.0F), 0.34F, 1.25F), Mth.m_14167_(amount));
               return;
            }

            return;
         }
      }

   }

   private static void applyModifiers(ServerPlayer player, RuntimeState state) {
      double attackSpeed = state.variant.attackSpeedPercent(state.attackSpeedTier) / (double)100.0F;
      double movementSpeed = state.variant.movementSpeedPercent(state.moveTier) / (double)100.0F;
      if (state.variant == BerserkVariant.ZETATECH && state.specialization == 1 && player.m_20142_()) {
         movementSpeed += 0.1;
      }

      replaceModifier(player.m_21051_(Attributes.f_22283_), ATTACK_SPEED_MODIFIER_ID, "Project Edgerunner Berserk attack speed", attackSpeed);
      replaceModifier(player.m_21051_(Attributes.f_22279_), MOVEMENT_SPEED_MODIFIER_ID, "Project Edgerunner Berserk movement speed", movementSpeed);
      replaceModifier(player.m_21051_(Attributes.f_22278_), KNOCKBACK_RESISTANCE_MODIFIER_ID, "Project Edgerunner Berserk Bastion", state.variant == BerserkVariant.MOORE_TECH && state.specialization == 1 ? (double)1.0F : (double)0.5F, Operation.ADDITION);
      if (state.bastionStackTicks > 0) {
         state.bastionStackTicks = Math.max(0, state.bastionStackTicks - TemporalHooks.playerCyberwareTimerTicks(player, 1, 4413196L));
      }

      if (state.bastionStackTicks <= 0) {
         state.bastionStacks = 0;
      }

   }

   private static void replaceModifier(@Nullable AttributeInstance attribute, UUID id, String name, double amount) {
      replaceModifier(attribute, id, name, amount, Operation.MULTIPLY_TOTAL);
   }

   private static void replaceModifier(AttributeInstance attribute, UUID id, String name, double amount, AttributeModifier.Operation operation) {
      if (attribute != null) {
         AttributeModifier current = attribute.m_22111_(id);
         if (Math.abs(amount) <= 1.0E-6) {
            if (current != null) {
               attribute.m_22120_(id);
            }

         } else if (current == null || current.m_22217_() != operation || !(Math.abs(current.m_22218_() - amount) <= 1.0E-6)) {
            attribute.m_22120_(id);
            attribute.m_22118_(new AttributeModifier(id, name, amount, operation));
         }
      }
   }

   public static double attackSpeedMultiplier(Player player) {
      if (player != null && player.m_21204_() != null) {
         AttributeInstance speed = player.m_21051_(Attributes.f_22283_);
         AttributeModifier berserk = speed == null ? null : speed.m_22111_(ATTACK_SPEED_MODIFIER_ID);
         return berserk == null ? (double)1.0F : Math.max((double)1.0F, (double)1.0F + berserk.m_22218_());
      } else {
         return (double)1.0F;
      }
   }

   private static void removeModifiers(ServerPlayer player) {
      AttributeInstance attackSpeed = player.m_21051_(Attributes.f_22283_);
      AttributeInstance movementSpeed = player.m_21051_(Attributes.f_22279_);
      AttributeInstance knockbackResistance = player.m_21051_(Attributes.f_22278_);
      if (attackSpeed != null) {
         attackSpeed.m_22120_(ATTACK_SPEED_MODIFIER_ID);
      }

      if (movementSpeed != null) {
         movementSpeed.m_22120_(MOVEMENT_SPEED_MODIFIER_ID);
      }

      if (knockbackResistance != null) {
         knockbackResistance.m_22120_(KNOCKBACK_RESISTANCE_MODIFIER_ID);
      }

   }

   private static void reset(ServerPlayer player, RuntimeState state, boolean heal) {
      removeModifiers(player);
      if (heal && state.kills > 0 && player.m_6084_()) {
         player.m_5634_(player.m_21233_() * (float)EdgerunnerServerConfig.getBerserkHealPerKill() * (float)state.kills);
      }

      STATES.remove(player.m_20148_());
      clearScores(player);
   }

   private static void markAttribution(ServerPlayer attacker, LivingEntity victim) {
      CompoundTag data = victim.getPersistentData();
      data.m_128362_("cyb_bz_last_attacker", attacker.m_20148_());
      data.m_128356_("cyb_bz_last_attack_tick", attacker.m_284548_().m_46467_());
   }

   @Nullable
   private static ServerPlayer resolveAttributedAttacker(LivingEntity victim, @Nullable Entity source) {
      if (source instanceof ServerPlayer direct) {
         if (isActive(direct)) {
            return direct;
         }
      }

      CompoundTag data = victim.getPersistentData();
      if (data.m_128403_("cyb_bz_last_attacker") && data.m_128425_("cyb_bz_last_attack_tick", 99)) {
         long now = victim.m_9236_().m_46467_();
         if (now - data.m_128454_("cyb_bz_last_attack_tick") > 100L) {
            return null;
         } else {
            return victim.m_20194_() == null ? null : victim.m_20194_().m_6846_().m_11259_(data.m_128342_("cyb_bz_last_attacker"));
         }
      } else {
         return null;
      }
   }

   private static boolean isValidNeutralization(LivingEntity victim) {
      return victim instanceof Player || victim instanceof Monster || victim instanceof NeutralMob;
   }

   public static boolean isAllowedMeleeStack(ItemStack stack) {
      if (stack != null && !stack.m_41619_() && !stack.m_204117_(MELEE_WEAPONS)) {
         Item item = stack.m_41720_();
         return item instanceof SwordItem || item instanceof AxeItem || item instanceof DiggerItem || item instanceof TridentItem;
      } else {
         return true;
      }
   }

   @Nullable
   public static BerserkVariant resolveInstalledVariant(Player player) {
      if (player == null) {
         return null;
      } else {
         CompoundTag cyberware = CyberwareBanService.operationalTag(player);
         String installed = CyberwareDataUtil.getInstalledItemByActivationSlot(cyberware, "os");
         return BerserkVariant.byItemId(installed);
      }
   }

   private static int tier(CompoundTag data, String key) {
      return data.m_128425_(key, 99) ? Math.max(0, data.m_128451_(key)) : 0;
   }

   private static void syncScores(ServerPlayer player, RuntimeState state) {
      setScore(player, "er_bz_active", Math.max(0, state.activeTicks));
      setScore(player, "er_bz_active_max", Math.max(0, state.activeMax));
      setScore(player, "er_bz_cooldown", Math.max(0, state.cooldownTicks));
      setScore(player, "er_bz_cd_max", Math.max(0, state.cooldownMax));
      setScore(player, "er_bz_kills", Math.max(0, state.kills));
      setScore(player, "er_bz_variant", state.variant == null ? 0 : state.variant.networkId());
      setScore(player, "er_bz_spec", Math.max(0, state.specialization));
      setScore(player, "er_bz_spec_lv", Math.max(0, state.specializationTier));
      setScore(player, "er_bz_branch", branchTelemetry(player, state));
      setScore(player, "er_bz_pressure", Mth.m_14045_(Mth.m_14167_((float)state.pressureSpike * 100.0F / 300.0F), 0, 100));
      setScore(player, "er_cw_cd_os", Math.max(0, state.cooldownTicks));
   }

   public static void clearCooldown(ServerPlayer player) {
      if (player != null && !player.m_9236_().m_5776_()) {
         RuntimeState state = (RuntimeState)STATES.get(player.m_20148_());
         player.getPersistentData().m_128473_("cyb_bz_cooldown_remaining");
         if (state != null && state.activeTicks > 0) {
            state.cooldownTicks = 0;
            state.cooldownMax = 0;
            syncScores(player, state);
         } else {
            if (state != null) {
               STATES.remove(player.m_20148_());
            }

            BerserkVariant installed = resolveInstalledVariant(player);
            clearRuntimeScores(player, installed == null ? 0 : installed.networkId());
         }
      }
   }

   private static void clearRuntimeScores(ServerPlayer player, int variantId) {
      setScore(player, "er_bz_active", 0);
      setScore(player, "er_bz_active_max", 0);
      setScore(player, "er_bz_cooldown", 0);
      setScore(player, "er_bz_cd_max", 0);
      setScore(player, "er_bz_kills", 0);
      setScore(player, "er_bz_variant", variantId);
      setScore(player, "er_bz_spec", 0);
      setScore(player, "er_bz_spec_lv", 0);
      setScore(player, "er_bz_branch", 0);
      setScore(player, "er_bz_pressure", 0);
      setScore(player, "er_cw_cd_os", 0);
   }

   private static void clearScores(ServerPlayer player) {
      clearRuntimeScores(player, 0);
   }

   private static void setScore(ServerPlayer player, String objectiveName, int value) {
      Scoreboard scoreboard = player.m_36329_();
      Objective objective = scoreboard.m_83477_(objectiveName);
      if (objective != null) {
         scoreboard.m_83471_(player.m_6302_(), objective).m_83402_(value);
      }

   }

   private static void playSound(ServerPlayer player, SoundEvent sound, float volume, float pitch) {
      player.m_284548_().m_6263_((Player)null, player.m_20185_(), player.m_20186_(), player.m_20189_(), sound, SoundSource.PLAYERS, volume, pitch);
   }

   private static int branchTelemetry(ServerPlayer player, RuntimeState state) {
      if (state.variant != null && state.specialization > 0) {
         int var10000;
         switch (state.variant) {
            case MOORE_TECH -> var10000 = state.specialization == 1 ? state.bastionStacks * 20 : Mth.m_14045_(Mth.m_14167_(player.m_36403_(0.5F) * 100.0F), 0, 100);
            case BIODYNE -> var10000 = state.specialization == 1 ? state.hemorrhageStacks * 33 : (state.predationReady ? 100 : 0);
            case ZETATECH -> var10000 = state.specialization == 1 ? (player.m_20142_() ? 100 : 0) : Mth.m_14045_(Mth.m_14167_(player.f_19789_ * 11.0F), 0, 100);
            case MILITECH -> var10000 = state.specialization == 1 ? Mth.m_14045_(Mth.m_14167_((1.0F - player.m_21223_() / Math.max(1.0F, player.m_21233_())) * 100.0F), 0, 100) : (player.m_20142_() ? 100 : 0);
            default -> throw new IncompatibleClassChangeError();
         }

         return var10000;
      } else {
         return 0;
      }
   }

   private static void sendFx(ServerPlayer player, RuntimeState state, int eventId, float intensity, int value) {
      CyberpunkNetwork.sendBerserkFx(player, new BerserkFxPacket(eventId, state.variant == null ? 0 : state.variant.networkId(), intensity, value));
   }

   private static SoundEvent activationSound(BerserkVariant variant) {
      SoundEvent var10000;
      switch (variant) {
         case MOORE_TECH -> var10000 = (SoundEvent)CyberpunkSounds.BERSERK_MOORE_ACTIVATION.get();
         case BIODYNE -> var10000 = (SoundEvent)CyberpunkSounds.BERSERK_BIODYNE_ACTIVATION.get();
         case ZETATECH -> var10000 = (SoundEvent)CyberpunkSounds.BERSERK_ZETATECH_ACTIVATION.get();
         case MILITECH -> var10000 = (SoundEvent)CyberpunkSounds.BERSERK_MILITECH_ACTIVATION.get();
         default -> throw new IncompatibleClassChangeError();
      }

      return var10000;
   }

   private static SoundEvent exitSound(BerserkVariant variant) {
      SoundEvent var10000;
      switch (variant) {
         case MOORE_TECH -> var10000 = (SoundEvent)CyberpunkSounds.BERSERK_MOORE_EXIT.get();
         case BIODYNE -> var10000 = (SoundEvent)CyberpunkSounds.BERSERK_BIODYNE_EXIT.get();
         case ZETATECH -> var10000 = (SoundEvent)CyberpunkSounds.BERSERK_ZETATECH_EXIT.get();
         case MILITECH -> var10000 = (SoundEvent)CyberpunkSounds.BERSERK_MILITECH_EXIT.get();
         default -> throw new IncompatibleClassChangeError();
      }

      return var10000;
   }

   static {
      MELEE_WEAPONS = TagKey.m_203882_(Registries.f_256913_, ResourceLocation.fromNamespaceAndPath("project_edgerunner", "berserk_melee_weapons"));
      ATTACK_SPEED_MODIFIER_ID = UUID.fromString("5f08f835-b8a2-4d8a-a10a-72bd142e9c31");
      MOVEMENT_SPEED_MODIFIER_ID = UUID.fromString("7de6c427-626c-4f23-a8a4-4cd2d3292f33");
      KNOCKBACK_RESISTANCE_MODIFIER_ID = UUID.fromString("8bcc51bf-e3d7-4575-bdd1-cae1d08792d4");
      STATES = new ConcurrentHashMap();
   }

   private static final class RuntimeState {
      private BerserkVariant variant;
      private int activeTicks;
      private int activeMax;
      private int cooldownTicks;
      private int cooldownMax;
      private int kills;
      private int armorTier;
      private int durationTier;
      private int cooldownTier;
      private int attackSpeedTier;
      private int critTier;
      private int fallTier;
      private int moveTier;
      private int specialization;
      private int specializationTier;
      private int lockedFoodLevel;
      private float lockedSaturation;
      private int pressureSpike;
      private int bastionStacks;
      private int bastionStackTicks;
      private UUID hemorrhageTarget;
      private int hemorrhageStacks;
      private boolean predationReady;
      private boolean controlLossActivation;
      private int lastAbsorbFxTick = Integer.MIN_VALUE;
      private final Set<UUID> seenPredationTargets = ConcurrentHashMap.newKeySet();
      private final Set<UUID> countedVictims = ConcurrentHashMap.newKeySet();
   }
}
