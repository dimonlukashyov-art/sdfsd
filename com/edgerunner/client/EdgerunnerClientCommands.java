package com.edgerunner.client;

import com.edgerunner.EdgerunnerMod;
import com.edgerunner.client.afterimage.AfterImageConfig;
import com.edgerunner.client.afterimage.AfterImageManager;
import com.edgerunner.client.cyberpsychosis.CyberpsychosisAudioClient;
import com.edgerunner.client.cyberpsychosis.CyberpsychosisAudioConfig;
import com.edgerunner.client.cyberpsychosis.dream.KillCaptures;
import com.edgerunner.client.cyberpsychosis.flashback.ApparitionRenderer;
import com.edgerunner.client.cyberpsychosis.flashback.FrameCapture;
import com.mojang.brigadier.arguments.DoubleArgumentType;
import com.mojang.brigadier.arguments.IntegerArgumentType;
import com.mojang.brigadier.builder.LiteralArgumentBuilder;
import java.util.Locale;
import java.util.function.Consumer;
import net.minecraft.ChatFormatting;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.commands.Commands;
import net.minecraft.network.chat.Component;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.RegisterClientCommandsEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod.EventBusSubscriber;
import net.minecraftforge.fml.common.Mod.EventBusSubscriber.Bus;

@EventBusSubscriber(
   modid = "project_edgerunner",
   value = {Dist.CLIENT},
   bus = Bus.FORGE
)
public final class EdgerunnerClientCommands {
   private static final String ROOT_COMMAND = "projectedgerunner";

   private EdgerunnerClientCommands() {
   }

   @SubscribeEvent
   public static void onRegisterClientCommands(RegisterClientCommandsEvent event) {
      event.getDispatcher().register((LiteralArgumentBuilder)Commands.m_82127_("projectedgerunner").then(Commands.m_82127_("cyberpsychosis").then(Commands.m_82127_("sleep").then(((LiteralArgumentBuilder)Commands.m_82127_("memories").then(Commands.m_82127_("count").executes((ctx) -> {
         int count = KillCaptures.count();
         ((CommandSourceStack)ctx.getSource()).m_288197_(() -> Component.m_237110_("commands.project_edgerunner.sleep.memories_count", new Object[]{count}), false);
         return count;
      }))).then(Commands.m_82127_("clear").executes((ctx) -> {
         KillCaptures.clearAll();
         ((CommandSourceStack)ctx.getSource()).m_288197_(() -> Component.m_237115_("commands.project_edgerunner.sleep.memories_cleared"), false);
         return 1;
      }))))));
      event.getDispatcher().register((LiteralArgumentBuilder)Commands.m_82127_("projectedgerunner").then(Commands.m_82127_("flashback").then(Commands.m_82127_("cost").executes((ctx) -> {
         String var10000 = FrameCapture.cost();
         String cost = var10000 + "; " + ApparitionRenderer.cost();
         EdgerunnerMod.LOGGER.info("[FlashbackCost] {}", cost);
         ((CommandSourceStack)ctx.getSource()).m_288197_(() -> Component.m_237110_("commands.project_edgerunner.flashback.cost", new Object[]{cost}), false);
         return 1;
      }))));
      event.getDispatcher().register((LiteralArgumentBuilder)((LiteralArgumentBuilder)((LiteralArgumentBuilder)Commands.m_82127_("projectedgerunner").then(((LiteralArgumentBuilder)((LiteralArgumentBuilder)((LiteralArgumentBuilder)((LiteralArgumentBuilder)((LiteralArgumentBuilder)Commands.m_82127_("afterimage").executes((ctx) -> sendCurrentConfig((CommandSourceStack)ctx.getSource()))).then(Commands.m_82127_("show").executes((ctx) -> sendCurrentConfig((CommandSourceStack)ctx.getSource())))).then(Commands.m_82127_("enable").executes((ctx) -> mutate((CommandSourceStack)ctx.getSource(), (config) -> config.enabled = true)))).then(Commands.m_82127_("disable").executes((ctx) -> mutate((CommandSourceStack)ctx.getSource(), (config) -> config.enabled = false)))).then(Commands.m_82127_("reload").executes((ctx) -> {
         AfterImageConfig.reload();
         AfterImageManager.INSTANCE.clear();
         return sendCurrentConfig((CommandSourceStack)ctx.getSource());
      }))).then(((LiteralArgumentBuilder)((LiteralArgumentBuilder)((LiteralArgumentBuilder)((LiteralArgumentBuilder)((LiteralArgumentBuilder)((LiteralArgumentBuilder)Commands.m_82127_("set").then(Commands.m_82127_("count").then(Commands.m_82129_("value", IntegerArgumentType.integer(1, 400)).executes((ctx) -> mutate((CommandSourceStack)ctx.getSource(), (config) -> config.count = IntegerArgumentType.getInteger(ctx, "value")))))).then(Commands.m_82127_("sampleIntervalSeconds").then(Commands.m_82129_("value", DoubleArgumentType.doubleArg(0.05, (double)1.0F)).executes((ctx) -> mutate((CommandSourceStack)ctx.getSource(), (config) -> config.sampleIntervalSeconds = DoubleArgumentType.getDouble(ctx, "value")))))).then(Commands.m_82127_("maxAgeTicks").then(Commands.m_82129_("value", IntegerArgumentType.integer(1, 200)).executes((ctx) -> mutate((CommandSourceStack)ctx.getSource(), (config) -> config.maxAgeTicks = IntegerArgumentType.getInteger(ctx, "value")))))).then(Commands.m_82127_("baseAlpha").then(Commands.m_82129_("value", DoubleArgumentType.doubleArg((double)0.0F, (double)1.0F)).executes((ctx) -> mutate((CommandSourceStack)ctx.getSource(), (config) -> config.baseAlpha = (float)DoubleArgumentType.getDouble(ctx, "value")))))).then(Commands.m_82127_("maxRenderedSnapshots").then(Commands.m_82129_("value", IntegerArgumentType.integer(1, 200)).executes((ctx) -> mutate((CommandSourceStack)ctx.getSource(), (config) -> config.maxRenderedSnapshots = IntegerArgumentType.getInteger(ctx, "value")))))).then(Commands.m_82127_("minRenderAlpha").then(Commands.m_82129_("value", DoubleArgumentType.doubleArg((double)0.0F, (double)1.0F)).executes((ctx) -> mutate((CommandSourceStack)ctx.getSource(), (config) -> config.minRenderAlpha = (float)DoubleArgumentType.getDouble(ctx, "value")))))).then(Commands.m_82127_("maxRenderDistance").then(Commands.m_82129_("value", DoubleArgumentType.doubleArg((double)0.0F, (double)256.0F)).executes((ctx) -> mutate((CommandSourceStack)ctx.getSource(), (config) -> config.maxRenderDistance = (float)DoubleArgumentType.getDouble(ctx, "value")))))))).then(((LiteralArgumentBuilder)((LiteralArgumentBuilder)((LiteralArgumentBuilder)((LiteralArgumentBuilder)((LiteralArgumentBuilder)Commands.m_82127_("cyberaudio").executes((ctx) -> sendCurrentAudioConfig((CommandSourceStack)ctx.getSource()))).then(Commands.m_82127_("show").executes((ctx) -> sendCurrentAudioConfig((CommandSourceStack)ctx.getSource())))).then(Commands.m_82127_("enable").executes((ctx) -> mutateAudio((CommandSourceStack)ctx.getSource(), (config) -> config.enabled = true)))).then(Commands.m_82127_("disable").executes((ctx) -> mutateAudio((CommandSourceStack)ctx.getSource(), (config) -> config.enabled = false)))).then(Commands.m_82127_("reload").executes((ctx) -> {
         CyberpsychosisAudioConfig.reload();
         CyberpsychosisAudioClient.reset();
         return sendCurrentAudioConfig((CommandSourceStack)ctx.getSource());
      }))).then(Commands.m_82127_("set").then(Commands.m_82127_("volume").then(Commands.m_82129_("value", DoubleArgumentType.doubleArg((double)0.0F, (double)1.0F)).executes((ctx) -> mutateAudio((CommandSourceStack)ctx.getSource(), (config) -> config.masterVolume = (float)DoubleArgumentType.getDouble(ctx, "value")))))))).then(((LiteralArgumentBuilder)((LiteralArgumentBuilder)((LiteralArgumentBuilder)Commands.m_82127_("guiProfiler").executes((ctx) -> sendGuiProfilerStatus((CommandSourceStack)ctx.getSource()))).then(Commands.m_82127_("status").executes((ctx) -> sendGuiProfilerStatus((CommandSourceStack)ctx.getSource())))).then(((LiteralArgumentBuilder)Commands.m_82127_("start").executes((ctx) -> startGuiProfiler((CommandSourceStack)ctx.getSource(), 240))).then(Commands.m_82129_("frames", IntegerArgumentType.integer(1, 2000)).executes((ctx) -> startGuiProfiler((CommandSourceStack)ctx.getSource(), IntegerArgumentType.getInteger(ctx, "frames")))))).then(Commands.m_82127_("stop").executes((ctx) -> stopGuiProfiler((CommandSourceStack)ctx.getSource())))));
   }

   private static int mutate(CommandSourceStack source, Consumer<AfterImageConfig> mutator) {
      AfterImageConfig.mutateAndSave(mutator);
      AfterImageManager.INSTANCE.clear();
      return sendCurrentConfig(source);
   }

   private static int sendCurrentConfig(CommandSourceStack source) {
      AfterImageConfig config = AfterImageConfig.get();
      String summary = String.format(Locale.ROOT, "enabled=%s, count=%d, rendered=%d, sample=%ss, age=%d, alpha=%s, minAlpha=%s, distance=%s", config.enabled, config.count, config.maxRenderedSnapshots, formatFloat((float)config.sampleIntervalSeconds), config.maxAgeTicks, formatFloat(config.baseAlpha), formatFloat(config.minRenderAlpha), formatFloat(config.maxRenderDistance));
      source.m_288197_(() -> Component.m_237113_("[Edgerunner] ").m_130940_(ChatFormatting.AQUA).m_7220_(Component.m_237115_("text.project_edgerunner.edgerunnerclientcommands.afterimage").m_130940_(ChatFormatting.WHITE)).m_7220_(Component.m_237113_(summary).m_130940_(ChatFormatting.YELLOW)), false);
      return 1;
   }

   private static int mutateAudio(CommandSourceStack source, Consumer<CyberpsychosisAudioConfig> mutator) {
      CyberpsychosisAudioConfig.mutateAndSave(mutator);
      return sendCurrentAudioConfig(source);
   }

   private static int sendCurrentAudioConfig(CommandSourceStack source) {
      CyberpsychosisAudioConfig config = CyberpsychosisAudioConfig.get();
      String summary = String.format(Locale.ROOT, "enabled=%s, volume=%s", config.enabled, formatFloat(config.masterVolume));
      source.m_288197_(() -> Component.m_237113_("[Edgerunner] ").m_130940_(ChatFormatting.AQUA).m_7220_(Component.m_237115_("text.project_edgerunner.edgerunnerclientcommands.cyberaudio").m_130940_(ChatFormatting.WHITE)).m_7220_(Component.m_237113_(summary).m_130940_(ChatFormatting.YELLOW)), false);
      return 1;
   }

   private static int startGuiProfiler(CommandSourceStack source, int frames) {
      GuiRenderDebugProfiler.start(frames);
      source.m_288197_(() -> Component.m_237113_("[Edgerunner] ").m_130940_(ChatFormatting.AQUA).m_7220_(Component.m_237110_("text.project_edgerunner.edgerunnerclientcommands.gui_profiler_started_for_s_instrumented_frames", new Object[]{frames}).m_130940_(ChatFormatting.YELLOW)), false);
      return 1;
   }

   private static int stopGuiProfiler(CommandSourceStack source) {
      GuiRenderDebugProfiler.stop("manual");
      source.m_288197_(() -> Component.m_237113_("[Edgerunner] ").m_130940_(ChatFormatting.AQUA).m_7220_(Component.m_237115_("text.project_edgerunner.edgerunnerclientcommands.gui_profiler_stopped_read_latest_log_for_guiprofiler_lines").m_130940_(ChatFormatting.YELLOW)), false);
      return 1;
   }

   private static int sendGuiProfilerStatus(CommandSourceStack source) {
      source.m_288197_(() -> Component.m_237113_("[Edgerunner] ").m_130940_(ChatFormatting.AQUA).m_7220_(Component.m_237110_("text.project_edgerunner.edgerunnerclientcommands.gui_profiler_s", new Object[]{GuiRenderDebugProfiler.status()}).m_130940_(ChatFormatting.YELLOW)), false);
      return 1;
   }

   private static String formatFloat(float value) {
      return String.format(Locale.ROOT, "%.3f", value);
   }
}
