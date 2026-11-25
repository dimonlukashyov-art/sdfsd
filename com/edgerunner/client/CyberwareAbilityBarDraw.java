package com.edgerunner.client;

import com.mojang.blaze3d.platform.Lighting;
import com.mojang.blaze3d.systems.RenderSystem;
import com.mojang.blaze3d.vertex.PoseStack;
import java.util.List;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.screens.ChatScreen;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;
import net.threetag.palladium.client.PalladiumKeyMappings;
import net.threetag.palladium.client.screen.AbilityBarRenderer;
import net.threetag.palladium.power.ability.Ability;
import net.threetag.palladium.power.ability.AbilityColor;
import net.threetag.palladium.power.ability.AbilityConfiguration;
import net.threetag.palladium.power.ability.AbilityInstance;
import net.threetag.palladium.power.ability.AbilityConfiguration.KeyType;
import net.threetag.palladium.util.context.DataContext;
import net.threetag.palladium.util.icon.IIcon;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

public final class CyberwareAbilityBarDraw {
   private static final int SLOT_BACKGROUND_U = 60;
   private static final int SLOT_BACKGROUND_V = 56;
   private static final int SLOT_STATE_DISABLED_U = 24;
   private static final int SLOT_STATE_ENABLED_U = 42;
   private static final int SLOT_STATE_UNLOCKED_V = 56;
   private static final int SLOT_STATE_LOCKED_V = 74;
   private static final int SLOT_COOLDOWN_U = 60;
   private static final int SLOT_COOLDOWN_V = 74;
   private static final int SLOT_LOCK_U = 42;
   private static final int SLOT_LOCK_V = 74;
   private static final int SLOT_OVERLAY_U = 0;
   private static final int SLOT_OVERLAY_V = 168;
   private static final int SLOT_X = 3;
   private static final int SLOT_Y = 3;
   private static final int SLOT_SIZE = 18;
   private static final int OVERLAY_SIZE = 24;
   private static AbilityBarRenderer.AbilityList lastList;

   private CyberwareAbilityBarDraw() {
   }

   public static AbilityBarRenderer.AbilityList lastList() {
      return lastList;
   }

   public static void background(Minecraft minecraft, GuiGraphics graphics, PoseStack poseStack, AbilityBarRenderer.Position position, AbilityBarRenderer.AbilityList abilityList, ResourceLocation texture, boolean simple, CallbackInfo ci) {
      lastList = abilityList;
      if (CyberwareAbilityBarLayout.isCyberwareList(abilityList)) {
         if (!CyberwareAbilityBarPeek.barVisible()) {
            ci.cancel();
         } else {
            List<CyberwareAbilityBarLayout.VisibleAbility> visible = CyberwareAbilityBarLayout.visibleAbilities(abilityList, abilityList.getDisplayedAbilities());
            int slotCount = CyberwareAbilityBarLayout.visibleSlotCount(visible);
            if (slotCount <= 0) {
               ci.cancel();
            } else {
               poseStack.m_85836_();
               if (!simple && !CyberwareAbilityBarLayout.isTopPosition(position)) {
                  poseStack.m_252880_(0.0F, (float)CyberwareAbilityBarLayout.bottomAnchorShift(slotCount), 0.0F);
               }

               if (!simple) {
                  poseStack.m_252880_(0.0F, CyberwareAbilityBarPeek.logoShift(CyberwareAbilityBarLayout.isTopPosition(position)), 0.0F);
               }

               try {
                  renderCompactBackground(minecraft, graphics, poseStack, position, visible, texture);
               } finally {
                  poseStack.m_85849_();
               }

               ci.cancel();
            }
         }
      }
   }

   public static void overlay(Minecraft minecraft, GuiGraphics graphics, PoseStack poseStack, AbilityBarRenderer.Position position, AbilityBarRenderer.AbilityList abilityList, ResourceLocation texture, boolean simple, CallbackInfo ci) {
      if (CyberwareAbilityBarLayout.isCyberwareList(abilityList)) {
         if (!CyberwareAbilityBarPeek.barVisible()) {
            ci.cancel();
         } else {
            List<CyberwareAbilityBarLayout.VisibleAbility> visible = CyberwareAbilityBarLayout.visibleAbilities(abilityList, abilityList.getDisplayedAbilities());
            int slotCount = CyberwareAbilityBarLayout.visibleSlotCount(visible);
            if (slotCount <= 0) {
               ci.cancel();
            } else {
               poseStack.m_85836_();
               if (!simple && !CyberwareAbilityBarLayout.isTopPosition(position)) {
                  poseStack.m_252880_(0.0F, (float)CyberwareAbilityBarLayout.bottomAnchorShift(slotCount), 0.0F);
               }

               if (!simple) {
                  poseStack.m_252880_(0.0F, CyberwareAbilityBarPeek.logoShift(CyberwareAbilityBarLayout.isTopPosition(position)), 0.0F);
               }

               try {
                  renderCompactOverlay(minecraft, graphics, poseStack, visible, texture);
               } finally {
                  poseStack.m_85849_();
               }

               ci.cancel();
            }
         }
      }
   }

   private static void renderCompactBackground(Minecraft minecraft, GuiGraphics graphics, PoseStack poseStack, AbilityBarRenderer.Position position, List<CyberwareAbilityBarLayout.VisibleAbility> visible, ResourceLocation texture) {
      boolean chatOpen = minecraft.f_91080_ instanceof ChatScreen;

      for(int displayIndex = 0; displayIndex < visible.size(); ++displayIndex) {
         AbilityInstance ability = ((CyberwareAbilityBarLayout.VisibleAbility)visible.get(displayIndex)).ability();
         if (ability != null) {
            int slotY = displayIndex * 22;
            Lighting.m_84931_();
            RenderSystem.enableBlend();
            RenderSystem.setShaderColor(1.0F, 1.0F, 1.0F, 1.0F);
            graphics.m_280218_(texture, 3, slotY + 3, 60, 56, 18, 18);
            renderAbilityState(graphics, ability, texture, slotY);
            if (ability.cooldown > 0 && ability.maxCooldown > 0) {
               int cooldownWidth = Math.max(1, Math.round((float)ability.cooldown / (float)ability.maxCooldown * 18.0F));
               graphics.m_280218_(texture, 3, slotY + 3, 60, 74, cooldownWidth, 18);
            }

            if (!ability.isUnlocked()) {
               graphics.m_280218_(texture, 3, slotY + 3, 42, 74, 18, 18);
            } else {
               IIcon icon = (IIcon)ability.getProperty(Ability.ICON);
               if (icon != null && minecraft.f_91074_ != null) {
                  icon.draw(minecraft, graphics, DataContext.forAbility(minecraft.f_91074_, ability), 4, slotY + 3 + 1);
               }
            }

            if (chatOpen) {
               renderAbilityTooltip(minecraft, graphics, position, ability, displayIndex);
            }
         }
      }

   }

   private static void renderAbilityState(GuiGraphics graphics, AbilityInstance ability, ResourceLocation texture, int slotY) {
      if (ability.isEnabled() && ability.activationTimer > 0 && ability.maxActivationTimer > 0) {
         int activationHeight = Math.max(1, Math.round((float)ability.activationTimer / (float)ability.maxActivationTimer * 18.0F));
         graphics.m_280218_(texture, 3, slotY + 3, 24, 56, 18, 18);
         graphics.m_280218_(texture, 3, slotY + 3 + 18 - activationHeight, 42, 74 - activationHeight, 18, activationHeight);
      } else {
         int stateU = ability.isEnabled() ? 42 : 24;
         int stateV = ability.isUnlocked() ? 56 : 74;
         graphics.m_280218_(texture, 3, slotY + 3, stateU, stateV, 18, 18);
      }
   }

   private static void renderCompactOverlay(Minecraft minecraft, GuiGraphics graphics, PoseStack poseStack, List<CyberwareAbilityBarLayout.VisibleAbility> visible, ResourceLocation texture) {
      RenderSystem.setShaderColor(1.0F, 1.0F, 1.0F, 1.0F);

      for(int displayIndex = 0; displayIndex < visible.size(); ++displayIndex) {
         CyberwareAbilityBarLayout.VisibleAbility visibleAbility = (CyberwareAbilityBarLayout.VisibleAbility)visible.get(displayIndex);
         AbilityInstance ability = visibleAbility.ability();
         if (ability != null) {
            int slotY = displayIndex * 22;
            graphics.m_280218_(texture, 0, slotY, 0, 168, 24, 24);
            RenderSystem.setShaderColor(1.0F, 1.0F, 1.0F, 1.0F);
            Lighting.m_84931_();
            RenderSystem.enableBlend();
            if (!ability.isUnlocked()) {
               graphics.m_280218_(texture, 3, slotY + 3, 42, 74, 18, 18);
            }

            AbilityColor color = (AbilityColor)ability.getProperty(Ability.COLOR);
            if (color != null) {
               graphics.m_280218_(texture, 0, slotY, color.getX(), color.getY(), 24, 24);
            }

            renderKeyHint(minecraft, graphics, poseStack, ability, visibleAbility.originalIndex(), slotY, texture);
         }
      }

      RenderSystem.setShaderColor(1.0F, 1.0F, 1.0F, 1.0F);
   }

   private static void renderKeyHint(Minecraft minecraft, GuiGraphics graphics, PoseStack poseStack, AbilityInstance ability, int originalIndex, int slotY, ResourceLocation texture) {
      if (minecraft.f_91074_ != null && ability.getConfiguration().needsKey() && ability.isUnlocked()) {
         AbilityConfiguration.KeyType keyType = ability.getConfiguration().getKeyType();
         poseStack.m_85836_();
         poseStack.m_252880_(0.0F, 0.0F, 200.0F);

         try {
            if (keyType == KeyType.KEY_BIND && originalIndex < PalladiumKeyMappings.ABILITY_KEYS.length) {
               Component key = PalladiumKeyMappings.ABILITY_KEYS[originalIndex].m_90863_();
               int keyWidth = minecraft.f_91062_.m_92852_(key);
               graphics.m_280614_(minecraft.f_91062_, key, 22 - keyWidth, slotY + 12, 16777215, false);
            } else if (keyType == KeyType.LEFT_CLICK) {
               graphics.m_280218_(texture, 16, slotY + 13, 24, 92, 5, 7);
            } else if (keyType == KeyType.RIGHT_CLICK) {
               graphics.m_280218_(texture, 16, slotY + 13, 29, 92, 5, 7);
            } else if (keyType == KeyType.SPACE_BAR) {
               graphics.m_280218_(texture, 11, slotY + 15, 34, 92, 10, 5);
            } else if (keyType == KeyType.SCROLL_UP) {
               graphics.m_280218_(texture, 16, slotY + 9, 24, 99, 5, 11);
            } else if (keyType == KeyType.SCROLL_DOWN) {
               graphics.m_280218_(texture, 16, slotY + 9, 29, 99, 5, 11);
            } else if (keyType == KeyType.SCROLL_EITHER) {
               graphics.m_280218_(texture, 16, slotY + 7, 34, 99, 5, 13);
            }
         } finally {
            poseStack.m_85849_();
         }

      }
   }

   private static void renderAbilityTooltip(Minecraft minecraft, GuiGraphics graphics, AbilityBarRenderer.Position position, AbilityInstance ability, int index) {
      Component displayName = ability.getConfiguration().getDisplayName();
      int textWidth = minecraft.f_91062_.m_92852_(displayName);
      boolean left = String.valueOf(position).endsWith("LEFT");
      int boxX = left ? 24 : -textWidth - 10;
      int textX = left ? 29 : -textWidth - 5;
      int y = index * 22;
      graphics.m_280509_(boxX, y + 5, boxX + textWidth + 10, y + 19, Integer.MIN_VALUE);
      graphics.m_280614_(minecraft.f_91062_, displayName, textX, y + 8, 16777215, false);
   }
}
