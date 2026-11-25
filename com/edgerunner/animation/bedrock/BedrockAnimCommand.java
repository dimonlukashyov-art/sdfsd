package com.edgerunner.animation.bedrock;

import com.mojang.brigadier.CommandDispatcher;
import com.mojang.brigadier.arguments.BoolArgumentType;
import com.mojang.brigadier.arguments.FloatArgumentType;
import com.mojang.brigadier.arguments.StringArgumentType;
import com.mojang.brigadier.builder.LiteralArgumentBuilder;
import com.mojang.brigadier.builder.RequiredArgumentBuilder;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import net.minecraft.ChatFormatting;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.commands.Commands;
import net.minecraft.commands.arguments.EntityArgument;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.Entity;

public final class BedrockAnimCommand {
   private BedrockAnimCommand() {
   }

   public static void register(CommandDispatcher<CommandSourceStack> dispatcher, String rootCommand) {
      dispatcher.register((LiteralArgumentBuilder)Commands.m_82127_(rootCommand).then(((LiteralArgumentBuilder)((LiteralArgumentBuilder)((LiteralArgumentBuilder)((LiteralArgumentBuilder)Commands.m_82127_("anim").requires((source) -> source.m_6761_(2))).then(playNode())).then(Commands.m_82127_("list").executes((ctx) -> list((CommandSourceStack)ctx.getSource())))).then(((LiteralArgumentBuilder)Commands.m_82127_("stop").executes((ctx) -> stop((CommandSourceStack)ctx.getSource(), requirePlayer((CommandSourceStack)ctx.getSource())))).then(Commands.m_82129_("target", EntityArgument.m_91466_()).executes((ctx) -> stop((CommandSourceStack)ctx.getSource(), EntityArgument.m_91474_(ctx, "target")))))).then(((LiteralArgumentBuilder)Commands.m_82127_("status").executes((ctx) -> status((CommandSourceStack)ctx.getSource(), requirePlayer((CommandSourceStack)ctx.getSource())))).then(Commands.m_82129_("target", EntityArgument.m_91466_()).executes((ctx) -> status((CommandSourceStack)ctx.getSource(), EntityArgument.m_91474_(ctx, "target")))))));
   }

   private static LiteralArgumentBuilder<CommandSourceStack> playNode() {
      return (LiteralArgumentBuilder)Commands.m_82127_("play").then(((RequiredArgumentBuilder)Commands.m_82129_("animationId", StringArgumentType.word()).executes((ctx) -> play((CommandSourceStack)ctx.getSource(), requirePlayer((CommandSourceStack)ctx.getSource()), StringArgumentType.getString(ctx, "animationId"), false, 1.0F))).then(((RequiredArgumentBuilder)Commands.m_82129_("loop", BoolArgumentType.bool()).executes((ctx) -> play((CommandSourceStack)ctx.getSource(), requirePlayer((CommandSourceStack)ctx.getSource()), StringArgumentType.getString(ctx, "animationId"), BoolArgumentType.getBool(ctx, "loop"), 1.0F))).then(((RequiredArgumentBuilder)Commands.m_82129_("speed", FloatArgumentType.floatArg(0.05F, 16.0F)).executes((ctx) -> play((CommandSourceStack)ctx.getSource(), requirePlayer((CommandSourceStack)ctx.getSource()), StringArgumentType.getString(ctx, "animationId"), BoolArgumentType.getBool(ctx, "loop"), FloatArgumentType.getFloat(ctx, "speed")))).then(Commands.m_82129_("target", EntityArgument.m_91466_()).executes((ctx) -> play((CommandSourceStack)ctx.getSource(), EntityArgument.m_91474_(ctx, "target"), StringArgumentType.getString(ctx, "animationId"), BoolArgumentType.getBool(ctx, "loop"), FloatArgumentType.getFloat(ctx, "speed")))))));
   }

   private static int play(CommandSourceStack source, ServerPlayer target, String rawId, boolean loop, float speed) {
      if (target == null) {
         return 0;
      } else {
         String normalizedRaw = rawId == null ? "" : rawId.trim();
         ResourceLocation parsed = resolveAnimationId(normalizedRaw);
         if (parsed == null) {
            source.m_81352_(Component.m_237110_("text.project_edgerunner.bedrockanimcommand.edgerunner_invalid_animation_id_s", new Object[]{rawId}).m_130940_(ChatFormatting.RED));
            return 0;
         } else {
            BedrockAnimRuntime.play(target, parsed, loop, speed);
            source.m_288197_(() -> Component.m_237115_("text.project_edgerunner.bedrockanimcommand.edgerunner_playing_animation").m_130940_(ChatFormatting.AQUA).m_7220_(Component.m_237113_(parsed.toString()).m_130940_(ChatFormatting.GREEN)).m_7220_(Component.m_237113_(loop ? " (loop) " : " (once) ").m_130940_(ChatFormatting.GRAY)).m_7220_(Component.m_237113_("on ").m_130940_(ChatFormatting.WHITE)).m_7220_(Component.m_237113_(target.m_6302_()).m_130940_(ChatFormatting.GOLD)).m_7220_(Component.m_237113_(" @ x" + speed).m_130940_(ChatFormatting.YELLOW)), true);
            return 1;
         }
      }
   }

   private static int list(CommandSourceStack source) {
      List<ResourceLocation> ids = new ArrayList();

      for(ResourceLocation id : BedrockAnimationManager.INSTANCE.ids()) {
         if ("project_edgerunner".equals(id.m_135827_())) {
            ids.add(id);
         }
      }

      ids.sort(Comparator.comparing(ResourceLocation::toString));
      if (ids.isEmpty()) {
         source.m_81352_(Component.m_237110_("text.project_edgerunner.bedrockanimcommand.edgerunner_no_animations_loaded_for_this_mod_namespace_s", new Object[]{"project_edgerunner"}).m_130940_(ChatFormatting.RED));
         return 0;
      } else {
         source.m_288197_(() -> Component.m_237110_("text.project_edgerunner.bedrockanimcommand.edgerunner_loaded_s_animations_s", new Object[]{"project_edgerunner", ids.size()}).m_130940_(ChatFormatting.AQUA), false);
         int shown = Math.min(30, ids.size());

         for(int i = 0; i < shown; ++i) {
            ResourceLocation id = (ResourceLocation)ids.get(i);
            source.m_288197_(() -> Component.m_237113_(" - " + String.valueOf(id)).m_130940_(ChatFormatting.GRAY), false);
         }

         if (ids.size() > shown) {
            source.m_288197_(() -> Component.m_237110_("text.project_edgerunner.bedrockanimcommand.edgerunner_and_s_more", new Object[]{ids.size() - shown}).m_130940_(ChatFormatting.DARK_GRAY), false);
         }

         return 1;
      }
   }

   private static int stop(CommandSourceStack source, ServerPlayer target) {
      if (target == null) {
         return 0;
      } else {
         boolean removed = BedrockAnimRuntime.stop(target);
         source.m_288197_(() -> Component.m_237115_("text.project_edgerunner.bedrockanimcommand.edgerunner_animation").m_130940_(ChatFormatting.AQUA).m_7220_(Component.m_237113_(removed ? "stopped" : "was already off").m_130940_(ChatFormatting.GRAY)).m_7220_(Component.m_237115_("text.project_edgerunner.bedrockanimcommand.for").m_130940_(ChatFormatting.WHITE)).m_7220_(Component.m_237113_(target.m_6302_()).m_130940_(ChatFormatting.GOLD)), true);
         return 1;
      }
   }

   private static int status(CommandSourceStack source, ServerPlayer target) {
      if (target == null) {
         return 0;
      } else {
         BedrockAnimRuntime.ActiveClip clip = BedrockAnimRuntime.current(target);
         if (clip == null) {
            source.m_288197_(() -> Component.m_237115_("text.project_edgerunner.bedrockanimcommand.edgerunner_no_animation_active_for").m_130940_(ChatFormatting.AQUA).m_7220_(Component.m_237113_(target.m_6302_()).m_130940_(ChatFormatting.GOLD)), false);
            return 1;
         } else {
            source.m_288197_(() -> Component.m_237113_("[Edgerunner] ").m_130940_(ChatFormatting.AQUA).m_7220_(Component.m_237113_(target.m_6302_()).m_130940_(ChatFormatting.GOLD)).m_7220_(Component.m_237113_(" -> ").m_130940_(ChatFormatting.GRAY)).m_7220_(Component.m_237113_(clip.animationId().toString()).m_130940_(ChatFormatting.GREEN)).m_7220_(Component.m_237113_(clip.loop() ? " loop" : " once").m_130940_(ChatFormatting.YELLOW)).m_7220_(Component.m_237110_("text.project_edgerunner.bedrockanimcommand.starttick_s", new Object[]{clip.startTick()}).m_130940_(ChatFormatting.GRAY)).m_7220_(Component.m_237110_("text.project_edgerunner.bedrockanimcommand.speed_s", new Object[]{clip.speed()}).m_130940_(ChatFormatting.GRAY)), false);
            return 1;
         }
      }
   }

   private static ServerPlayer requirePlayer(CommandSourceStack source) {
      Entity var2 = source.m_81373_();
      if (var2 instanceof ServerPlayer player) {
         return player;
      } else {
         source.m_81352_(Component.m_237115_("text.project_edgerunner.bedrockanimcommand.edgerunner_this_command_form_requires_a_player_target").m_130940_(ChatFormatting.RED));
         return null;
      }
   }

   private static ResourceLocation resolveAnimationId(String raw) {
      BedrockAnimation loose = BedrockAnimationManager.INSTANCE.findByLooseId(raw, "project_edgerunner");
      if (loose != null) {
         return loose.id();
      } else {
         loose = BedrockAnimationManager.INSTANCE.findByLooseId(raw);
         return loose != null ? loose.id() : ResourceLocation.m_135820_(raw);
      }
   }
}
