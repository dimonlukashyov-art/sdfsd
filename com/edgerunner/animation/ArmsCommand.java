package com.edgerunner.animation;

import com.mojang.brigadier.CommandDispatcher;
import com.mojang.brigadier.arguments.DoubleArgumentType;
import com.mojang.brigadier.builder.ArgumentBuilder;
import com.mojang.brigadier.builder.LiteralArgumentBuilder;
import com.mojang.brigadier.builder.RequiredArgumentBuilder;
import java.util.Locale;
import net.minecraft.ChatFormatting;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.commands.Commands;
import net.minecraft.commands.arguments.EntityArgument;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.Entity;

public final class ArmsCommand {
   private static final double OFFSET_MIN = (double)-64.0F;
   private static final double OFFSET_MAX = (double)64.0F;
   private static final double ROTATION_MIN = (double)-3600.0F;
   private static final double ROTATION_MAX = (double)3600.0F;

   private ArmsCommand() {
   }

   public static void register(CommandDispatcher<CommandSourceStack> dispatcher, String rootCommand) {
      dispatcher.register((LiteralArgumentBuilder)Commands.m_82127_(rootCommand).then(((LiteralArgumentBuilder)((LiteralArgumentBuilder)((LiteralArgumentBuilder)((LiteralArgumentBuilder)((LiteralArgumentBuilder)((LiteralArgumentBuilder)Commands.m_82127_("arms").requires((source) -> source.m_6761_(2))).then(visibleNode())).then(viewNode())).then(armAdjustmentNode("offset", true))).then(armAdjustmentNode("rotation", false))).then(((LiteralArgumentBuilder)Commands.m_82127_("reset").executes((ctx) -> reset((CommandSourceStack)ctx.getSource(), requirePlayer((CommandSourceStack)ctx.getSource())))).then(Commands.m_82129_("target", EntityArgument.m_91466_()).executes((ctx) -> reset((CommandSourceStack)ctx.getSource(), EntityArgument.m_91474_(ctx, "target")))))).then(((LiteralArgumentBuilder)Commands.m_82127_("status").executes((ctx) -> status((CommandSourceStack)ctx.getSource(), requirePlayer((CommandSourceStack)ctx.getSource())))).then(Commands.m_82129_("target", EntityArgument.m_91466_()).executes((ctx) -> status((CommandSourceStack)ctx.getSource(), EntityArgument.m_91474_(ctx, "target")))))));
   }

   private static LiteralArgumentBuilder<CommandSourceStack> visibleNode() {
      LiteralArgumentBuilder<CommandSourceStack> root = Commands.m_82127_("visible");

      for(ArmVisibilityMode mode : ArmVisibilityMode.values()) {
         root = (LiteralArgumentBuilder)root.then(((LiteralArgumentBuilder)Commands.m_82127_(mode.id()).executes((ctx) -> setVisibility((CommandSourceStack)ctx.getSource(), requirePlayer((CommandSourceStack)ctx.getSource()), mode))).then(Commands.m_82129_("target", EntityArgument.m_91466_()).executes((ctx) -> setVisibility((CommandSourceStack)ctx.getSource(), EntityArgument.m_91474_(ctx, "target"), mode))));
      }

      return root;
   }

   private static LiteralArgumentBuilder<CommandSourceStack> viewNode() {
      return (LiteralArgumentBuilder)((LiteralArgumentBuilder)((LiteralArgumentBuilder)Commands.m_82127_("view").then(((LiteralArgumentBuilder)Commands.m_82127_("first").executes((ctx) -> setView((CommandSourceStack)ctx.getSource(), requirePlayer((CommandSourceStack)ctx.getSource()), PoseAdjustmentScope.FIRST_PERSON))).then(Commands.m_82129_("target", EntityArgument.m_91466_()).executes((ctx) -> setView((CommandSourceStack)ctx.getSource(), EntityArgument.m_91474_(ctx, "target"), PoseAdjustmentScope.FIRST_PERSON))))).then(((LiteralArgumentBuilder)Commands.m_82127_("third").executes((ctx) -> setView((CommandSourceStack)ctx.getSource(), requirePlayer((CommandSourceStack)ctx.getSource()), PoseAdjustmentScope.THIRD_PERSON))).then(Commands.m_82129_("target", EntityArgument.m_91466_()).executes((ctx) -> setView((CommandSourceStack)ctx.getSource(), EntityArgument.m_91474_(ctx, "target"), PoseAdjustmentScope.THIRD_PERSON))))).then(((LiteralArgumentBuilder)Commands.m_82127_("both").executes((ctx) -> setView((CommandSourceStack)ctx.getSource(), requirePlayer((CommandSourceStack)ctx.getSource()), PoseAdjustmentScope.BOTH))).then(Commands.m_82129_("target", EntityArgument.m_91466_()).executes((ctx) -> setView((CommandSourceStack)ctx.getSource(), EntityArgument.m_91474_(ctx, "target"), PoseAdjustmentScope.BOTH))));
   }

   private static LiteralArgumentBuilder<CommandSourceStack> armAdjustmentNode(String literal, boolean offset) {
      return (LiteralArgumentBuilder)((LiteralArgumentBuilder)Commands.m_82127_(literal).then(Commands.m_82127_("left").then(xyzArguments(offset, false)))).then(Commands.m_82127_("right").then(xyzArguments(offset, true)));
   }

   private static ArgumentBuilder<CommandSourceStack, ?> xyzArguments(boolean offset, boolean rightArm) {
      double min = offset ? (double)-64.0F : (double)-3600.0F;
      double max = offset ? (double)64.0F : (double)3600.0F;
      return Commands.m_82129_("x", DoubleArgumentType.doubleArg(min, max)).then(Commands.m_82129_("y", DoubleArgumentType.doubleArg(min, max)).then(((RequiredArgumentBuilder)Commands.m_82129_("z", DoubleArgumentType.doubleArg(min, max)).executes((ctx) -> adjust((CommandSourceStack)ctx.getSource(), requirePlayer((CommandSourceStack)ctx.getSource()), offset, rightArm, DoubleArgumentType.getDouble(ctx, "x"), DoubleArgumentType.getDouble(ctx, "y"), DoubleArgumentType.getDouble(ctx, "z")))).then(Commands.m_82129_("target", EntityArgument.m_91466_()).executes((ctx) -> adjust((CommandSourceStack)ctx.getSource(), EntityArgument.m_91474_(ctx, "target"), offset, rightArm, DoubleArgumentType.getDouble(ctx, "x"), DoubleArgumentType.getDouble(ctx, "y"), DoubleArgumentType.getDouble(ctx, "z"))))));
   }

   private static int status(CommandSourceStack source, ServerPlayer target) {
      if (target == null) {
         return 0;
      } else {
         source.m_288197_(() -> CyberAnimationSystem.describe(target), false);
         return 1;
      }
   }

   private static int reset(CommandSourceStack source, ServerPlayer target) {
      if (target == null) {
         return 0;
      } else {
         CyberAnimationSystem.resetAdjustment(target);
         source.m_288197_(() -> Component.m_237115_("text.project_edgerunner.armscommand.edgerunner_reset_arm_pose_and_visibility_for").m_130940_(ChatFormatting.AQUA).m_7220_(Component.m_237113_(target.m_6302_()).m_130940_(ChatFormatting.GOLD)), true);
         source.m_288197_(() -> CyberAnimationSystem.describe(target), false);
         return 1;
      }
   }

   private static int setVisibility(CommandSourceStack source, ServerPlayer target, ArmVisibilityMode mode) {
      if (target == null) {
         return 0;
      } else {
         CyberAnimationSystem.setVisibilityMode(target, mode);
         source.m_288197_(() -> Component.m_237115_("text.project_edgerunner.armscommand.edgerunner_first_person_arm_visibility").m_130940_(ChatFormatting.AQUA).m_7220_(Component.m_237113_(mode.id()).m_130940_(ChatFormatting.GREEN)).m_7220_(Component.m_237115_("text.project_edgerunner.armscommand.for").m_130940_(ChatFormatting.GRAY)).m_7220_(Component.m_237113_(target.m_6302_()).m_130940_(ChatFormatting.GOLD)), true);
         return 1;
      }
   }

   private static int setView(CommandSourceStack source, ServerPlayer target, PoseAdjustmentScope scope) {
      if (target == null) {
         return 0;
      } else {
         CyberAnimationSystem.setPoseScope(target, scope);
         source.m_288197_(() -> Component.m_237115_("text.project_edgerunner.armscommand.edgerunner_pose_view_scope").m_130940_(ChatFormatting.AQUA).m_7220_(Component.m_237113_(scope.id()).m_130940_(ChatFormatting.GREEN)).m_7220_(Component.m_237115_("text.project_edgerunner.armscommand.for").m_130940_(ChatFormatting.GRAY)).m_7220_(Component.m_237113_(target.m_6302_()).m_130940_(ChatFormatting.GOLD)), true);
         return 1;
      }
   }

   private static int adjust(CommandSourceStack source, ServerPlayer target, boolean offset, boolean rightArm, double x, double y, double z) {
      if (target == null) {
         return 0;
      } else {
         if (offset) {
            if (rightArm) {
               CyberAnimationSystem.setRightArmOffset(target, x, y, z);
            } else {
               CyberAnimationSystem.setLeftArmOffset(target, x, y, z);
            }
         } else if (rightArm) {
            CyberAnimationSystem.setRightArmRotation(target, x, y, z);
         } else {
            CyberAnimationSystem.setLeftArmRotation(target, x, y, z);
         }

         String label = (rightArm ? "right" : "left") + " " + (offset ? "offset" : "rotation");
         source.m_288197_(() -> Component.m_237110_("text.project_edgerunner.armscommand.edgerunner_arm_s_for", new Object[]{label}).m_130940_(ChatFormatting.AQUA).m_7220_(Component.m_237113_(target.m_6302_()).m_130940_(ChatFormatting.GOLD)).m_7220_(Component.m_237113_(String.format(Locale.ROOT, " -> %.3f %.3f %.3f", x, y, z)).m_130940_(ChatFormatting.YELLOW)), true);
         return 1;
      }
   }

   private static ServerPlayer requirePlayer(CommandSourceStack source) {
      Entity var2 = source.m_81373_();
      if (var2 instanceof ServerPlayer player) {
         return player;
      } else {
         source.m_81352_(Component.m_237115_("text.project_edgerunner.armscommand.edgerunner_this_command_form_requires_a_player_target").m_130940_(ChatFormatting.RED));
         return null;
      }
   }
}
