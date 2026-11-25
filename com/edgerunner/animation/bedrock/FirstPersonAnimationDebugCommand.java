package com.edgerunner.animation.bedrock;

import com.edgerunner.network.CyberpunkNetwork;
import com.edgerunner.network.FirstPersonAnimationDebugSyncPacket;
import com.mojang.brigadier.CommandDispatcher;
import com.mojang.brigadier.arguments.DoubleArgumentType;
import com.mojang.brigadier.arguments.StringArgumentType;
import com.mojang.brigadier.builder.ArgumentBuilder;
import com.mojang.brigadier.builder.LiteralArgumentBuilder;
import com.mojang.brigadier.builder.RequiredArgumentBuilder;
import com.mojang.brigadier.suggestion.SuggestionProvider;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import net.minecraft.ChatFormatting;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.commands.Commands;
import net.minecraft.commands.SharedSuggestionProvider;
import net.minecraft.commands.arguments.EntityArgument;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.Entity;

public final class FirstPersonAnimationDebugCommand {
   private static final List<String> PART_IDS = List.of("arms", "geo", "cyberware");
   private static final List<String> PART_AND_ALL_IDS = List.of("arms", "geo", "cyberware", "all");
   private static final double OFFSET_MIN = (double)-16.0F;
   private static final double OFFSET_MAX = (double)16.0F;
   private static final Map<UUID, DebugOffsets> OFFSETS_BY_PLAYER = new HashMap();
   private static final SuggestionProvider<CommandSourceStack> PART_SUGGESTIONS = (context, builder) -> SharedSuggestionProvider.m_82970_(PART_AND_ALL_IDS, builder);

   private FirstPersonAnimationDebugCommand() {
   }

   public static void register(CommandDispatcher<CommandSourceStack> dispatcher, String rootCommand) {
      dispatcher.register((LiteralArgumentBuilder)Commands.m_82127_(rootCommand).then(((LiteralArgumentBuilder)((LiteralArgumentBuilder)((LiteralArgumentBuilder)((LiteralArgumentBuilder)Commands.m_82127_("fpanimdebug").requires((source) -> source.m_6761_(2))).then(adjustNode("set", false))).then(adjustNode("add", true))).then(resetNode())).then(((LiteralArgumentBuilder)Commands.m_82127_("status").executes((ctx) -> status((CommandSourceStack)ctx.getSource(), requirePlayer((CommandSourceStack)ctx.getSource())))).then(Commands.m_82129_("target", EntityArgument.m_91466_()).executes((ctx) -> status((CommandSourceStack)ctx.getSource(), EntityArgument.m_91474_(ctx, "target")))))));
   }

   private static ArgumentBuilder<CommandSourceStack, ?> adjustNode(String literal, boolean add) {
      return Commands.m_82127_(literal).then(Commands.m_82129_("part", StringArgumentType.word()).suggests(PART_SUGGESTIONS).then(Commands.m_82129_("x", DoubleArgumentType.doubleArg((double)-16.0F, (double)16.0F)).then(Commands.m_82129_("y", DoubleArgumentType.doubleArg((double)-16.0F, (double)16.0F)).then(((RequiredArgumentBuilder)Commands.m_82129_("z", DoubleArgumentType.doubleArg((double)-16.0F, (double)16.0F)).executes((ctx) -> adjust((CommandSourceStack)ctx.getSource(), requirePlayer((CommandSourceStack)ctx.getSource()), normalizePart(StringArgumentType.getString(ctx, "part")), add, DoubleArgumentType.getDouble(ctx, "x"), DoubleArgumentType.getDouble(ctx, "y"), DoubleArgumentType.getDouble(ctx, "z")))).then(Commands.m_82129_("target", EntityArgument.m_91466_()).executes((ctx) -> adjust((CommandSourceStack)ctx.getSource(), EntityArgument.m_91474_(ctx, "target"), normalizePart(StringArgumentType.getString(ctx, "part")), add, DoubleArgumentType.getDouble(ctx, "x"), DoubleArgumentType.getDouble(ctx, "y"), DoubleArgumentType.getDouble(ctx, "z"))))))));
   }

   private static ArgumentBuilder<CommandSourceStack, ?> resetNode() {
      return Commands.m_82127_("reset").then(((RequiredArgumentBuilder)Commands.m_82129_("part", StringArgumentType.word()).suggests(PART_SUGGESTIONS).executes((ctx) -> reset((CommandSourceStack)ctx.getSource(), requirePlayer((CommandSourceStack)ctx.getSource()), normalizePart(StringArgumentType.getString(ctx, "part"))))).then(Commands.m_82129_("target", EntityArgument.m_91466_()).executes((ctx) -> reset((CommandSourceStack)ctx.getSource(), EntityArgument.m_91474_(ctx, "target"), normalizePart(StringArgumentType.getString(ctx, "part"))))));
   }

   private static int adjust(CommandSourceStack source, ServerPlayer target, String part, boolean add, double x, double y, double z) {
      if (target != null && validatePart(source, part, true)) {
         DebugOffsets offsets = offsetsFor(target);
         if (add) {
            offsets.add(part, x, y, z);
         } else {
            offsets.set(part, x, y, z);
         }

         syncOffsets(target, offsets, part);
         source.m_288197_(() -> Component.m_237115_("text.project_edgerunner.firstpersonanimationdebugcommand.edgerunner_fp_animation_debug").m_130940_(ChatFormatting.AQUA).m_7220_(Component.m_237113_(add ? "added " : "set ").m_130940_(ChatFormatting.WHITE)).m_7220_(Component.m_237113_(part).m_130940_(ChatFormatting.GREEN)).m_7220_(Component.m_237115_("text.project_edgerunner.firstpersonanimationdebugcommand.for").m_130940_(ChatFormatting.GRAY)).m_7220_(Component.m_237113_(target.m_6302_()).m_130940_(ChatFormatting.GOLD)).m_7220_(Component.m_237113_(String.format(Locale.ROOT, " -> %.3f %.3f %.3f", x, y, z)).m_130940_(ChatFormatting.YELLOW)), true);
         source.m_288197_(() -> statusLine(target), false);
         return 1;
      } else {
         return 0;
      }
   }

   private static int reset(CommandSourceStack source, ServerPlayer target, String part) {
      if (target != null && validatePart(source, part, true)) {
         offsetsFor(target).reset(part);
         syncOffsets(target, offsetsFor(target), part);
         source.m_288197_(() -> Component.m_237115_("text.project_edgerunner.firstpersonanimationdebugcommand.edgerunner_reset_fp_animation_debug").m_130940_(ChatFormatting.AQUA).m_7220_(Component.m_237113_(part).m_130940_(ChatFormatting.GREEN)).m_7220_(Component.m_237115_("text.project_edgerunner.firstpersonanimationdebugcommand.for").m_130940_(ChatFormatting.GRAY)).m_7220_(Component.m_237113_(target.m_6302_()).m_130940_(ChatFormatting.GOLD)), true);
         source.m_288197_(() -> statusLine(target), false);
         return 1;
      } else {
         return 0;
      }
   }

   private static int status(CommandSourceStack source, ServerPlayer target) {
      if (target == null) {
         return 0;
      } else {
         source.m_288197_(() -> statusLine(target), false);
         return 1;
      }
   }

   private static void syncOffsets(ServerPlayer target, DebugOffsets offsets, String changedPart) {
      if (target != null && offsets != null) {
         if (!"all".equals(changedPart)) {
            syncOffset(target, changedPart, offsets.get(changedPart));
         } else {
            for(String part : PART_IDS) {
               syncOffset(target, part, offsets.get(part));
            }

         }
      }
   }

   private static void syncOffset(ServerPlayer target, String part, Offset offset) {
      if (offset == null) {
         offset = FirstPersonAnimationDebugCommand.Offset.ZERO;
      }

      CyberpunkNetwork.sendFirstPersonAnimationDebug(target, FirstPersonAnimationDebugSyncPacket.set(part, offset.x(), offset.y(), offset.z()));
   }

   private static Component statusLine(ServerPlayer target) {
      return Component.m_237115_("text.project_edgerunner.firstpersonanimationdebugcommand.edgerunner_fp_animation_debug").m_130940_(ChatFormatting.AQUA).m_7220_(Component.m_237113_(target.m_6302_()).m_130940_(ChatFormatting.GOLD)).m_7220_(Component.m_237113_(" -> ").m_130940_(ChatFormatting.GRAY)).m_7220_(Component.m_237113_(offsetsFor(target).describe()).m_130940_(ChatFormatting.YELLOW));
   }

   private static boolean validatePart(CommandSourceStack source, String part, boolean allowAll) {
      boolean valid = PART_IDS.contains(part) || allowAll && "all".equals(part);
      if (!valid) {
         source.m_81352_(Component.m_237110_("text.project_edgerunner.firstpersonanimationdebugcommand.edgerunner_unknown_fp_animation_debug_part_s", new Object[]{part}).m_130940_(ChatFormatting.RED));
      }

      return valid;
   }

   private static String normalizePart(String part) {
      return part == null ? "" : part.trim().toLowerCase(Locale.ROOT);
   }

   private static DebugOffsets offsetsFor(ServerPlayer player) {
      return (DebugOffsets)OFFSETS_BY_PLAYER.computeIfAbsent(player.m_20148_(), (ignored) -> FirstPersonAnimationDebugCommand.DebugOffsets.empty());
   }

   private static ServerPlayer requirePlayer(CommandSourceStack source) {
      Entity var2 = source.m_81373_();
      if (var2 instanceof ServerPlayer player) {
         return player;
      } else {
         source.m_81352_(Component.m_237115_("text.project_edgerunner.firstpersonanimationdebugcommand.edgerunner_this_command_form_requires_a_player_target").m_130940_(ChatFormatting.RED));
         return null;
      }
   }

   private static final class DebugOffsets {
      private final Map<String, Offset> offsets = new HashMap();

      private static DebugOffsets empty() {
         DebugOffsets result = new DebugOffsets();

         for(String part : FirstPersonAnimationDebugCommand.PART_IDS) {
            result.offsets.put(part, FirstPersonAnimationDebugCommand.Offset.ZERO);
         }

         return result;
      }

      private void set(String part, double x, double y, double z) {
         if (!"all".equals(part)) {
            this.offsets.put(part, new Offset(x, y, z));
         } else {
            for(String selected : FirstPersonAnimationDebugCommand.PART_IDS) {
               this.set(selected, x, y, z);
            }

         }
      }

      private void add(String part, double x, double y, double z) {
         if (!"all".equals(part)) {
            this.offsets.put(part, this.get(part).add(x, y, z));
         } else {
            for(String selected : FirstPersonAnimationDebugCommand.PART_IDS) {
               this.add(selected, x, y, z);
            }

         }
      }

      private void reset(String part) {
         if (!"all".equals(part)) {
            this.offsets.put(part, FirstPersonAnimationDebugCommand.Offset.ZERO);
         } else {
            for(String selected : FirstPersonAnimationDebugCommand.PART_IDS) {
               this.reset(selected);
            }

         }
      }

      private Offset get(String part) {
         return (Offset)this.offsets.getOrDefault(part, FirstPersonAnimationDebugCommand.Offset.ZERO);
      }

      private String describe() {
         StringBuilder builder = new StringBuilder();

         for(String part : FirstPersonAnimationDebugCommand.PART_IDS) {
            if (builder.length() > 0) {
               builder.append(", ");
            }

            builder.append(part).append("=").append(this.get(part).format());
         }

         return builder.toString();
      }
   }

   private static record Offset(double x, double y, double z) {
      private static final Offset ZERO = new Offset((double)0.0F, (double)0.0F, (double)0.0F);

      private Offset add(double addX, double addY, double addZ) {
         return new Offset(this.x + addX, this.y + addY, this.z + addZ);
      }

      private String format() {
         return String.format(Locale.ROOT, "%.3f %.3f %.3f", this.x, this.y, this.z);
      }
   }
}
