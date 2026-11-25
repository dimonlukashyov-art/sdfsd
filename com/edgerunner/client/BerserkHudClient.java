package com.edgerunner.client;

import com.edgerunner.berserk.BerserkVariant;
import com.edgerunner.client.particle.ParticleTemporalRuntime;
import com.edgerunner.face.overlay.FaceOverlayStateResolver;
import com.edgerunner.network.BerserkFxPacket;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.player.LocalPlayer;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.util.Mth;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.ComputeFovModifierEvent;
import net.minecraftforge.client.event.RenderGuiOverlayEvent;
import net.minecraftforge.client.event.ViewportEvent;
import net.minecraftforge.client.gui.overlay.VanillaGuiOverlay;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.event.TickEvent.Phase;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod.EventBusSubscriber;
import net.minecraftforge.fml.common.Mod.EventBusSubscriber.Bus;

@EventBusSubscriber(
   modid = "project_edgerunner",
   value = {Dist.CLIENT},
   bus = Bus.FORGE
)
public final class BerserkHudClient {
   private static final ResourceLocation HEARTS = ResourceLocation.fromNamespaceAndPath("project_edgerunner", "textures/gui/berserk_protected_hearts.png");
   private static final int ENTER_FLASH_DURATION = 14;
   private static final int EXIT_FLASH_DURATION = 12;
   private static final float ACTIVE_TINT_ALPHA = 52.0F;
   private static final float ACTIVE_EDGE_ALPHA = 96.0F;
   private static int previousActiveTicks;
   private static int flashTicks;
   private static int flashDuration;
   private static int flashRgb = 13114392;
   private static int cameraTicks;
   private static int cameraDuration = 1;
   private static float cameraStrength;
   private static int fovTicks;
   private static int fovDuration = 1;
   private static float fovStrength;
   private static int impactTicks;
   private static int impactDuration = 1;
   private static int impactEvent = -1;
   private static float impactStrength;
   private static int eventVariantId;
   private static int seismicWaveTicks;
   private static int seismicWaveDuration = 1;
   private static double seismicWaveX;
   private static double seismicWaveY;
   private static double seismicWaveZ;
   private static float seismicWaveRadius;

   private BerserkHudClient() {
   }

   public static int renderStatusHud(GuiGraphics graphics, LocalPlayer player, int x, int y) {
      Optional<CombatHudModel.StatusCard> card = createStatusCard(player);
      return card.isEmpty() ? y : CyberCombatHudRenderer.renderStack(graphics, x, y, List.of((CombatHudModel.StatusCard)card.get()));
   }

   public static Optional<CombatHudModel.StatusCard> createStatusCard(LocalPlayer player) {
      if (player != null && FaceOverlayStateResolver.hasInstalledFaceCyberware(player)) {
         BerserkVariant variant = BerserkClientState.resolveVariant(player);
         if (variant == null) {
            return Optional.empty();
         } else {
            int active = score(player, "er_bz_active");
            int activeMax = score(player, "er_bz_active_max");
            int cooldown = score(player, "er_bz_cooldown");
            int cooldownMax = score(player, "er_bz_cd_max");
            int kills = score(player, "er_bz_kills");
            int specialization = score(player, "er_bz_spec");
            int branchState = score(player, "er_bz_branch");
            if (active > 0 && activeMax > 0) {
               String branch = branchName(variant, specialization);
               return Optional.of(CombatHudModel.StatusCard.create("berserk", CombatHudModel.Icon.BERSERK, "BERSERK", (float)active / (float)activeMax, CombatHudModel.State.ACTIVE, -1.0F, new CombatHudModel.Detail(manufacturer(variant), seconds(active)), new CombatHudModel.Detail("K", Integer.toString(kills)), new CombatHudModel.Detail(branch, branch.isEmpty() ? "" : branchValue(variant, specialization, branchState))).readout(CombatHudModel.time(active)).hardware(variant.itemId()).cooldown(cooldownMax, cooldownMax));
            } else {
               return cooldown > 0 && cooldownMax > 0 ? Optional.of(CombatHudModel.StatusCard.create("berserk", CombatHudModel.Icon.BERSERK, "BERSERK", 1.0F - (float)cooldown / (float)cooldownMax, CombatHudModel.State.RECOVERY, -1.0F, new CombatHudModel.Detail(manufacturer(variant), seconds(cooldown))).availability(true, false, false).readout(CombatHudModel.time(cooldown)).hardware(variant.itemId()).cooldown(cooldown, cooldownMax)) : Optional.of(CombatHudModel.StatusCard.create("berserk", CombatHudModel.Icon.BERSERK, "BERSERK", 1.0F, CombatHudModel.State.READY, -1.0F).availability(false, true, true).hardware(variant.itemId()).cooldown(0, cooldownMax));
            }
         }
      } else {
         return Optional.empty();
      }
   }

   public static int reservedHudHeight(LocalPlayer player) {
      return CyberCombatHudRenderer.reservedHeight();
   }

   public static void handleFx(BerserkFxPacket packet) {
      if (packet != null) {
         eventVariantId = packet.variantId();
         float strength = packet.intensity() * BerserkFxConfig.get().combatFeedbackIntensity;
         switch (packet.eventId()) {
            case 0:
               startFlash(14, accent(packet.variantId()));
               kick(12, strength, 10, 0.052F * strength);
               break;
            case 1:
               startImpact(packet.eventId(), 5, strength);
               kick(4, 0.26F * strength, 4, -0.014F * strength);
               break;
            case 2:
               startImpact(packet.eventId(), 5, strength);
               kick(4, 0.32F * strength, 4, -0.018F * strength);
               break;
            case 3:
               startImpact(packet.eventId(), 9, Math.max(0.85F, strength));
               kick(7, 0.72F * strength, 6, -0.035F * strength);
               break;
            case 4:
               startImpact(packet.eventId(), 10, Math.max(0.85F, strength));
               kick(7, 0.66F * strength, 7, 0.026F * strength);
               break;
            case 5:
               startImpact(packet.eventId(), 12, strength);
               kick(10, 1.05F * strength, 9, -0.045F * strength);
               LocalPlayer player = Minecraft.m_91087_().f_91074_;
               if (player != null) {
                  seismicWaveDuration = 11;
                  seismicWaveTicks = seismicWaveDuration;
                  seismicWaveX = player.m_20185_();
                  seismicWaveY = player.m_20186_() + 0.08;
                  seismicWaveZ = player.m_20189_();
                  seismicWaveRadius = Mth.m_14036_((float)packet.value() / 10.0F, 2.5F, 5.5F);
               }
               break;
            case 6:
               startFlash(12, 16773336);
               kick(7, 0.38F * strength, 7, -0.022F * strength);
               break;
            case 7:
               startImpact(packet.eventId(), 4, 0.14F);
               break;
            case 8:
               startImpact(packet.eventId(), 7, 0.45F);
               kick(4, 0.18F, 4, -0.01F);
         }

      }
   }

   @SubscribeEvent
   public static void onClientTick(TickEvent.ClientTickEvent event) {
      if (event.phase == Phase.END) {
         LocalPlayer player = Minecraft.m_91087_().f_91074_;
         int active = player == null ? 0 : score(player, "er_bz_active");
         if (active > 0 && previousActiveTicks <= 0 && flashTicks <= 0) {
            eventVariantId = player == null ? 0 : score(player, "er_bz_variant");
            startFlash(14, accent(eventVariantId));
            kick(9, 0.7F, 8, 0.035F);
         } else if (previousActiveTicks > 0 && active <= 0 && flashTicks <= 0) {
            startFlash(12, 15399935);
         }

         previousActiveTicks = active;
         if (flashTicks > 0) {
            --flashTicks;
         }

         if (cameraTicks > 0) {
            --cameraTicks;
         }

         if (fovTicks > 0) {
            --fovTicks;
         }

         if (impactTicks > 0) {
            --impactTicks;
         }

         if (seismicWaveTicks > 0 && player != null) {
            spawnSeismicWave(player);
            --seismicWaveTicks;
         }

      }
   }

   @SubscribeEvent
   public static void onRenderOverlay(RenderGuiOverlayEvent.Post event) {
      LocalPlayer player = Minecraft.m_91087_().f_91074_;
      if (player != null) {
         if (event.getOverlay() == VanillaGuiOverlay.PLAYER_HEALTH.type() && score(player, "er_bz_active") > 0) {
            renderProtectedHearts(event.getGuiGraphics(), event.getWindow().m_85445_(), event.getWindow().m_85446_(), player);
         }

         if (event.getOverlay() == VanillaGuiOverlay.CHAT_PANEL.type()) {
            int width = event.getWindow().m_85445_();
            int height = event.getWindow().m_85446_();
            int variantId = score(player, "er_bz_variant");
            if (BerserkClientState.isActive(player)) {
               renderActiveTint(event.getGuiGraphics(), width, height, player.f_19797_, variantId);
            }

            ModHudScale.render(event.getGuiGraphics(), width, height, (logicalWidth, logicalHeight) -> renderEventFeedback(event.getGuiGraphics(), logicalWidth, logicalHeight));
            if (flashTicks > 0) {
               float progress = 1.0F - (float)flashTicks / (float)Math.max(1, flashDuration);
               float pulse = Mth.m_14031_((float)Math.PI * Mth.m_14036_(progress, 0.0F, 1.0F));
               int alpha = Mth.m_14045_(Math.round(117.3F * pulse * BerserkFxConfig.get().activationFlashIntensity), 0, 255);
               event.getGuiGraphics().m_280509_(0, 0, width, height, alpha << 24 | flashRgb);
            }

         }
      }
   }

   @SubscribeEvent
   public static void onCameraAngles(ViewportEvent.ComputeCameraAngles event) {
      if (cameraTicks > 0) {
         float remaining = (float)cameraTicks / (float)Math.max(1, cameraDuration);
         float intensity = BerserkFxConfig.get().cameraKickIntensity * cameraStrength * remaining;
         double phase = (double)(cameraDuration - cameraTicks) * 1.9;
         event.setPitch(event.getPitch() - (float)(Math.sin(phase) * 1.9 * (double)intensity));
         event.setRoll(event.getRoll() + (float)(Math.sin(phase * 0.63) * 1.05 * (double)intensity));
      }
   }

   @SubscribeEvent
   public static void onComputeFovModifier(ComputeFovModifierEvent event) {
      Minecraft minecraft = Minecraft.m_91087_();
      if (fovTicks > 0 && minecraft.f_91074_ != null && event.getPlayer() == minecraft.f_91074_) {
         float remaining = (float)fovTicks / (float)Math.max(1, fovDuration);
         float pulse = fovStrength * Mth.m_14031_(remaining * (float)Math.PI * 0.5F) * BerserkFxConfig.get().fovPulseIntensity;
         event.setNewFovModifier(Mth.m_14036_(event.getNewFovModifier() * (1.0F + pulse), 0.02F, 2.0F));
      }
   }

   private static void renderProtectedHearts(GuiGraphics graphics, int width, int height, LocalPlayer player) {
      float maxHealth = (float)Math.max((double)1.0F, player.m_21133_(Attributes.f_22276_));
      int protectedHealthPoints = Mth.m_14167_(maxHealth * 0.25F);
      int protectedHearts = Mth.m_14167_((float)protectedHealthPoints / 2.0F);
      int rows = Mth.m_14167_((float)Mth.m_14167_(maxHealth / 2.0F) / 10.0F);
      int rowHeight = Math.max(10 - (rows - 2), 3);
      int left = width / 2 - 91;
      int top = height - 39;

      for(int i = 0; i < protectedHearts; ++i) {
         int x = left + i % 10 * 8;
         int y = top - i / 10 * rowHeight;
         boolean half = (protectedHealthPoints & 1) == 1 && i == protectedHearts - 1;
         graphics.m_280163_(HEARTS, x, y, half ? 9.0F : 0.0F, 0.0F, 9, 9, 18, 9);
      }

   }

   private static void renderActiveTint(GuiGraphics graphics, int width, int height, int ticks, int variantId) {
      int depth = Math.max(12, Math.min(42, Math.min(width, height) / 7));
      float pulse = 0.88F + 0.12F * Mth.m_14031_((float)ticks * 0.17F);
      float intensity = Mth.m_14036_(BerserkFxConfig.get().activeSeamBrightness, 0.0F, 1.0F);
      int accent = accent(variantId);
      int tintAlpha = Mth.m_14045_(Math.round(52.0F * pulse * intensity), 0, 255);
      graphics.m_280509_(0, 0, width, height, tintAlpha << 24 | blendRgb(7997200, accent, 0.18F));

      for(int inset = 0; inset < depth; ++inset) {
         float edge = 1.0F - (float)inset / (float)depth;
         int alpha = Mth.m_14045_(Math.round(96.0F * edge * edge * pulse * intensity), 0, 255);
         if (alpha > 0) {
            int color = alpha << 24 | blendRgb(13766680, accent, inset < 3 ? 0.65F : 0.18F);
            graphics.m_280509_(inset, inset, width - inset, inset + 1, color);
            graphics.m_280509_(inset, height - inset - 1, width - inset, height - inset, color);
            graphics.m_280509_(inset, inset + 1, inset + 1, height - inset - 1, color);
            graphics.m_280509_(width - inset - 1, inset + 1, width - inset, height - inset - 1, color);
         }
      }

      int seam = Mth.m_14045_(Math.round(150.0F * pulse * intensity), 0, 255) << 24 | accent;
      graphics.m_280509_(0, height / 3, Math.min(23, width / 10), height / 3 + 1, seam);
      graphics.m_280509_(width - Math.min(31, width / 8), height * 2 / 3, width, height * 2 / 3 + 1, seam);
   }

   private static void renderEventFeedback(GuiGraphics graphics, int width, int height) {
      if (impactTicks > 0) {
         float pulse = (float)impactTicks / (float)Math.max(1, impactDuration);
         int rgb = impactEvent == 1 ? 16773336 : (impactEvent == 3 ? 16774096 : accent(eventVariantId));
         int color = Mth.m_14045_(Math.round(205.0F * pulse * impactStrength), 0, 220) << 24 | rgb;
         int cx = width / 2;
         int cy = height / 2;
         int reach = impactEvent == 5 ? 18 : 11;
         graphics.m_280656_(cx - reach, cx - 4, cy, color);
         graphics.m_280656_(cx + 4, cx + reach, cy, color);
         graphics.m_280315_(cx, cy - reach, cy - 4, color);
         graphics.m_280315_(cx, cy + 4, cy + reach, color);
      }

   }

   private static void spawnSeismicWave(LocalPlayer player) {
      try (ParticleTemporalRuntime.Scope ignored = ParticleTemporalRuntime.decorative(player)) {
         int elapsed = seismicWaveDuration - seismicWaveTicks + 1;
         float progress = Mth.m_14036_((float)elapsed / (float)seismicWaveDuration, 0.0F, 1.0F);
         float eased = 1.0F - (1.0F - progress) * (1.0F - progress);
         double radius = 0.35 + (double)(seismicWaveRadius * eased);
         int points = 18 + Mth.m_14165_(radius * (double)5.0F);

         for(int i = 0; i < points; ++i) {
            double angle = (Math.PI * 2D) * (double)i / (double)points + (double)elapsed * 0.035;
            double cosine = Math.cos(angle);
            double sine = Math.sin(angle);
            player.m_9236_().m_7106_(ParticleTypes.f_123796_, seismicWaveX + cosine * radius, seismicWaveY + Math.sin(angle * (double)3.0F) * 0.025, seismicWaveZ + sine * radius, cosine * 0.018, 0.008, sine * 0.018);
         }
      }

   }

   private static void startFlash(int duration, int rgb) {
      flashDuration = Math.max(1, duration);
      flashTicks = flashDuration;
      flashRgb = rgb & 16777215;
   }

   private static void startImpact(int eventId, int duration, float strength) {
      impactEvent = eventId;
      impactDuration = Math.max(1, duration);
      impactTicks = impactDuration;
      impactStrength = Mth.m_14036_(strength, 0.0F, 1.5F);
   }

   private static void kick(int duration, float camera, int fovDurationTicks, float fov) {
      cameraDuration = Math.max(1, duration);
      cameraTicks = cameraDuration;
      cameraStrength = Mth.m_14036_(camera, 0.0F, 1.5F);
      fovDuration = Math.max(1, fovDurationTicks);
      fovTicks = fovDuration;
      fovStrength = Mth.m_14036_(fov, -0.1F, 0.1F);
   }

   private static String manufacturer(BerserkVariant variant) {
      String var10000;
      switch (variant) {
         case MOORE_TECH -> var10000 = "MOORE";
         case BIODYNE -> var10000 = "BIODYNE";
         case ZETATECH -> var10000 = "ZETATECH";
         case MILITECH -> var10000 = "MILITECH";
         default -> throw new IncompatibleClassChangeError();
      }

      return var10000;
   }

   private static String manufacturer(int variantId) {
      BerserkVariant variant = BerserkVariant.byNetworkId(variantId);
      return variant == null ? "BERSERK" : manufacturer(variant);
   }

   private static String branchName(BerserkVariant variant, int specialization) {
      if (specialization <= 0) {
         return "";
      } else {
         String var10000;
         switch (variant) {
            case MOORE_TECH -> var10000 = specialization == 1 ? "BST" : "BRCH";
            case BIODYNE -> var10000 = specialization == 1 ? "HEMO" : "PRED";
            case ZETATECH -> var10000 = specialization == 1 ? "MOM" : "SEIS";
            case MILITECH -> var10000 = specialization == 1 ? "LAST" : "SHOCK";
            default -> throw new IncompatibleClassChangeError();
         }

         return var10000;
      }
   }

   private static String branchValue(BerserkVariant variant, int specialization, int value) {
      if (variant == BerserkVariant.BIODYNE && specialization == 2 || variant == BerserkVariant.ZETATECH && specialization == 1 || variant == BerserkVariant.MILITECH && specialization == 2) {
         return value >= 100 ? "RDY" : "--";
      } else {
         return Mth.m_14045_(value, 0, 100) + "%";
      }
   }

   private static int accent(int variantId) {
      int var10000;
      switch (variantId) {
         case 1 -> var10000 = 16742938;
         case 2 -> var10000 = 16766911;
         case 3 -> var10000 = 16766238;
         case 4 -> var10000 = 16724040;
         default -> var10000 = 16726088;
      }

      return var10000;
   }

   private static int blendRgb(int from, int to, float amount) {
      float t = Mth.m_14036_(amount, 0.0F, 1.0F);
      int r = Mth.m_14143_(Mth.m_14179_(t, (float)(from >> 16 & 255), (float)(to >> 16 & 255)));
      int g = Mth.m_14143_(Mth.m_14179_(t, (float)(from >> 8 & 255), (float)(to >> 8 & 255)));
      int b = Mth.m_14143_(Mth.m_14179_(t, (float)(from & 255), (float)(to & 255)));
      return r << 16 | g << 8 | b;
   }

   private static int score(LocalPlayer player, String objective) {
      return BerserkClientState.score(player, objective);
   }

   private static String seconds(int ticks) {
      return String.format(Locale.ROOT, "%.1fs", (double)ticks / (double)20.0F);
   }
}
