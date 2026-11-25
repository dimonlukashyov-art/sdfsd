package com.edgerunner.client;

import com.edgerunner.client.cyberpsychosis.SleepIntrusionClient;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.Objects;
import javax.annotation.Nullable;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.screens.ChatScreen;
import net.minecraft.client.player.LocalPlayer;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.util.Mth;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.RenderGuiEvent;
import net.minecraftforge.client.event.ScreenEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod.EventBusSubscriber;
import net.minecraftforge.fml.common.Mod.EventBusSubscriber.Bus;
import net.threetag.palladium.PalladiumConfig.Client;

@EventBusSubscriber(
   modid = "project_edgerunner",
   value = {Dist.CLIENT},
   bus = Bus.FORGE
)
public final class BloodPumpHudClient {
   private static final ResourceLocation CYBERWARE_POWER_ID = ResourceLocation.fromNamespaceAndPath("project_edgerunner", "cyberware");
   private static final int CIRCULATORY_SLOT_INDEX = 3;
   private static final int ABILITY_BAR_WIDTH = 24;
   private static final int SLOT_OFFSET_X = 3;
   private static final int SLOT_OFFSET_Y = 3;
   private static final int SLOT_STEP = 22;
   private static final int SHUTTER_OFFSET_X = 5;
   private static final int SHUTTER_OFFSET_Y = -23;
   private static final int SHUTTER_EXPAND_X = 1;
   private static final int SHUTTER_EXPAND_Y = 1;
   private static final int COUNTER_SLOT_INDEX = 2;
   private static final int SLOT_PIXEL_SIZE = 16;
   private static final int SHUTTER_PIXEL_SIZE = 18;
   private static final int COUNTER_PADDING_X = 1;
   private static final int COUNTER_OFFSET_X = 4;
   private static final int COUNTER_OFFSET_Y = 3;
   private static final int HUD_TEXT_SHADOW = -1341124592;
   private static final int SHUTTER_COLOR = -1203988225;
   private static final int SHUTTER_COLOR_EMPTY = -800085761;
   private static final String BLOOD_PUMP_ABILITY_ID = "blood_pump";
   private static final String BLOOD_PUMP_POINTER_ABILITY_ID = "cyberware_circulatory";
   @Nullable
   private static Method abilityBarGetSelectedList;
   @Nullable
   private static Field abilityListSimpleField;
   @Nullable
   private static Method abilityListGetPower;
   @Nullable
   private static Method abilityListGetDisplayedAbilities;
   @Nullable
   private static Method powerGetId;
   @Nullable
   private static Method abilityInstanceGetReference;
   @Nullable
   private static Method abilityReferenceGetAbilityId;
   @Nullable
   private static Field abilityInstanceIdField;
   private static boolean palladiumReflectionReady;
   private static boolean palladiumReflectionFailed;

   private BloodPumpHudClient() {
   }

   @SubscribeEvent
   public static void onRenderGuiPost(RenderGuiEvent.Post event) {
      if (!SleepIntrusionClient.hidesHud()) {
         Minecraft mc = Minecraft.m_91087_();
         LocalPlayer player = mc.f_91074_;
         if (player != null && mc.f_91073_ != null && mc.f_91080_ == null) {
            renderBloodPumpOverlay(event.getGuiGraphics(), mc.m_91268_().m_85445_(), mc.m_91268_().m_85446_(), mc, player);
         }
      }
   }

   @SubscribeEvent
   public static void onScreenRenderPost(ScreenEvent.Render.Post event) {
      Minecraft mc = Minecraft.m_91087_();
      LocalPlayer player = mc.f_91074_;
      if (player != null && mc.f_91073_ != null && mc.f_91080_ != null && FaceCyberwareClient.isHudOverlayScreenAllowed(mc.f_91080_)) {
         renderBloodPumpOverlay(event.getGuiGraphics(), mc.m_91268_().m_85445_(), mc.m_91268_().m_85446_(), mc, player);
      }
   }

   private static void renderBloodPumpOverlay(GuiGraphics graphics, int guiWidth, int guiHeight, Minecraft mc, LocalPlayer player) {
      BloodPumpClientStateUtil.State state = BloodPumpClientStateUtil.resolve(player);
      if (state.maxCharges() > 0 && CyberwareAbilityBarPeek.barVisible()) {
         String positionName = resolveAbilityBarPositionName(mc);
         if (positionName != null && !"HIDDEN".equals(positionName)) {
            Object selected = getSelectedAbilityList();
            if (selected != null && !isSimpleList(selected)) {
               if (isCyberwareList(selected)) {
                  renderBloodPumpHud(graphics, mc, player, positionName, state, selected, guiWidth, guiHeight);
               }
            }
         }
      }
   }

   private static void renderBloodPumpHud(GuiGraphics graphics, Minecraft mc, LocalPlayer player, String positionName, BloodPumpClientStateUtil.State state, Object selectedAbilityList, int guiWidth, int guiHeight) {
      Object[] displayedAbilities = resolveDisplayedAbilities(selectedAbilityList);
      int slotCount = resolveVisibleSlotCount(displayedAbilities, player);
      int originX = resolveAbilityBarOriginX(positionName, guiWidth);
      int originY = resolveAbilityBarOriginY(positionName, guiHeight, slotCount);
      int bloodPumpAbilityIndex = resolveBloodPumpAbilityIndex(displayedAbilities, slotCount, player);
      renderRechargeShutter(graphics, originX, originY, state, bloodPumpAbilityIndex);
      renderChargeCounter(graphics, mc, originX, originY, state, bloodPumpAbilityIndex);
   }

   private static void renderRechargeShutter(GuiGraphics graphics, int originX, int originY, BloodPumpClientStateUtil.State state, int bloodPumpAbilityIndex) {
      if (state.currentCharges() <= 0 && state.nextRechargeTicks() > 0) {
         int nextRechargeSlot = state.nextRechargeSlot();
         int nextRechargeMaxTicks = state.slotRechargeMaxTicks(nextRechargeSlot);
         if (nextRechargeSlot > 0 && nextRechargeMaxTicks > 0) {
            float fraction = Mth.m_14036_(1.0F - (float)state.nextRechargeTicks() / (float)nextRechargeMaxTicks, 0.0F, 1.0F);
            int overlayHeight = fraction >= 1.0F ? 18 : Mth.m_14167_(18.0F * fraction);
            if (fraction > 0.0F && overlayHeight <= 0) {
               overlayHeight = 1;
            }

            if (overlayHeight > 0) {
               int iconX = originX + 3 + 5;
               int iconY = originY + 3 + bloodPumpAbilityIndex * 22 + -23;
               int overlayX = iconX - 1;
               int overlayY = iconY - 1;
               int overlayBottom = overlayY + 18;
               int overlayTop = Math.max(overlayY, overlayBottom - overlayHeight);
               int fillColor = state.currentCharges() <= 0 ? -800085761 : -1203988225;
               graphics.m_280509_(overlayX, overlayTop, overlayX + 18, overlayBottom, fillColor);
            }
         }
      }
   }

   private static void renderChargeCounter(GuiGraphics graphics, Minecraft mc, int originX, int originY, BloodPumpClientStateUtil.State state, int bloodPumpAbilityIndex) {
      int currentCharges = Math.max(0, state.currentCharges());
      int maxCharges = Math.max(0, state.maxCharges());
      int counterSlotIndex = Math.max(0, bloodPumpAbilityIndex - 1);
      int slotX = originX + 3 + 4;
      int slotY = originY + 3 + counterSlotIndex * 22 + 3;
      int textColor = resolveCounterColor(currentCharges, maxCharges);
      float scale = 0.75F;
      Objects.requireNonNull(mc.f_91062_);
      int scaledTextHeight = Math.max(1, Math.round(9.0F * scale));
      int drawX = 1;
      int drawY = Math.max(0, 16 - scaledTextHeight);
      ModHudScale.renderAnchored(graphics, slotX + 8, slotY + 8, () -> {
         graphics.m_280168_().m_85836_();
         graphics.m_280168_().m_252880_((float)slotX, (float)slotY, 0.0F);
         graphics.m_280168_().m_85841_(scale, scale, 1.0F);
         graphics.m_280056_(mc.f_91062_, Integer.toString(currentCharges), drawX + 1, drawY + 1, -1341124592, false);
         graphics.m_280056_(mc.f_91062_, Integer.toString(currentCharges), drawX, drawY, textColor, false);
         graphics.m_280168_().m_85849_();
      });
   }

   private static int resolveCounterColor(int currentCharges, int maxCharges) {
      if (currentCharges <= 0) {
         return -494990;
      } else {
         return currentCharges >= maxCharges ? -792102 : -9800;
      }
   }

   @Nullable
   private static String resolveAbilityBarPositionName(Minecraft mc) {
      Object rawPosition = Client.ABILITY_BAR_POSITION.get();
      if (rawPosition == null) {
         return null;
      } else {
         String positionName = String.valueOf(rawPosition);
         if (("TOP_LEFT".equals(positionName) || "TOP_RIGHT".equals(positionName)) && mc.f_91066_.f_92062_) {
            return null;
         } else {
            if (mc.f_91080_ instanceof ChatScreen) {
               if ("BOTTOM_LEFT".equals(positionName)) {
                  return "TOP_LEFT";
               }

               if ("BOTTOM_RIGHT".equals(positionName)) {
                  return "TOP_RIGHT";
               }
            }

            return positionName;
         }
      }
   }

   @Nullable
   private static Object getSelectedAbilityList() {
      if (!ensurePalladiumReflection()) {
         return null;
      } else {
         try {
            return abilityBarGetSelectedList.invoke((Object)null);
         } catch (ReflectiveOperationException var1) {
            return null;
         }
      }
   }

   private static boolean isSimpleList(Object abilityList) {
      if (!ensurePalladiumReflection()) {
         return true;
      } else {
         try {
            return abilityListSimpleField.getBoolean(abilityList);
         } catch (IllegalAccessException var2) {
            return true;
         }
      }
   }

   private static boolean isCyberwareList(Object abilityList) {
      if (!ensurePalladiumReflection()) {
         return false;
      } else {
         try {
            Object power = abilityListGetPower.invoke(abilityList);
            if (power == null) {
               return false;
            } else {
               Object id = powerGetId.invoke(power);
               return CYBERWARE_POWER_ID.equals(id);
            }
         } catch (ReflectiveOperationException var3) {
            return false;
         }
      }
   }

   private static int resolveBloodPumpAbilityIndex(Object[] abilities, int slotCount, LocalPlayer player) {
      if (abilities == null) {
         return 3;
      } else {
         int displayIndex = 0;

         for(int index = 0; index < abilities.length; ++index) {
            Object ability = abilities[index];
            if (ability != null) {
               String abilityId = resolveAbilityId(ability);
               if (CyberwareAbilityBarLayout.isCyberwareAbilityVisible(player, abilityId)) {
                  if ("cyberware_circulatory".equals(abilityId) || "blood_pump".equals(abilityId)) {
                     return displayIndex;
                  }

                  ++displayIndex;
               }
            }
         }

         return slotCount > 0 ? Math.min(3, slotCount - 1) : 3;
      }
   }

   @Nullable
   private static Object[] resolveDisplayedAbilities(Object abilityList) {
      if (ensurePalladiumReflection() && abilityListGetDisplayedAbilities != null) {
         try {
            Object rawDisplayedAbilities = abilityListGetDisplayedAbilities.invoke(abilityList);
            Object[] var10000;
            if (rawDisplayedAbilities instanceof Object[]) {
               Object[] abilities = rawDisplayedAbilities;
               var10000 = abilities;
            } else {
               var10000 = null;
            }

            return var10000;
         } catch (ReflectiveOperationException var3) {
            return null;
         }
      } else {
         return null;
      }
   }

   private static int resolveVisibleSlotCount(@Nullable Object[] abilities, LocalPlayer player) {
      if (abilities == null) {
         return 5;
      } else {
         int count = 0;

         for(Object ability : abilities) {
            if (ability != null && CyberwareAbilityBarLayout.isCyberwareAbilityVisible(player, resolveAbilityId(ability))) {
               ++count;
            }
         }

         return count <= 0 ? 5 : count;
      }
   }

   private static String resolveAbilityId(Object abilityInstance) {
      if (abilityInstanceGetReference != null && abilityReferenceGetAbilityId != null) {
         try {
            Object reference = abilityInstanceGetReference.invoke(abilityInstance);
            if (reference != null) {
               Object abilityId = abilityReferenceGetAbilityId.invoke(reference);
               if (abilityId != null) {
                  return String.valueOf(abilityId);
               }
            }
         } catch (ReflectiveOperationException var4) {
         }
      }

      if (abilityInstanceIdField != null) {
         try {
            Object abilityId = abilityInstanceIdField.get(abilityInstance);
            if (abilityId != null) {
               return String.valueOf(abilityId);
            }
         } catch (IllegalAccessException var3) {
            return "";
         }
      }

      return "";
   }

   private static boolean ensurePalladiumReflection() {
      if (palladiumReflectionReady) {
         return true;
      } else if (palladiumReflectionFailed) {
         return false;
      } else {
         try {
            Class<?> rendererClass = Class.forName("net.threetag.palladium.client.screen.AbilityBarRenderer");
            Class<?> abilityListClass = Class.forName("net.threetag.palladium.client.screen.AbilityBarRenderer$AbilityList");
            Class<?> powerClass = Class.forName("net.threetag.palladium.power.Power");
            Class<?> abilityInstanceClass = Class.forName("net.threetag.palladium.power.ability.AbilityInstance");
            Class<?> abilityReferenceClass = Class.forName("net.threetag.palladium.power.ability.AbilityReference");
            abilityBarGetSelectedList = rendererClass.getMethod("getSelectedList");
            abilityListSimpleField = abilityListClass.getField("simple");
            abilityListGetPower = abilityListClass.getMethod("getPower");
            powerGetId = powerClass.getMethod("getId");

            try {
               abilityListGetDisplayedAbilities = abilityListClass.getMethod("getDisplayedAbilities");
            } catch (ReflectiveOperationException var8) {
               abilityListGetDisplayedAbilities = null;
            }

            try {
               abilityInstanceGetReference = abilityInstanceClass.getMethod("getReference");
               abilityReferenceGetAbilityId = abilityReferenceClass.getMethod("abilityId");
            } catch (ReflectiveOperationException var7) {
               abilityInstanceGetReference = null;
               abilityReferenceGetAbilityId = null;
            }

            try {
               abilityInstanceIdField = abilityInstanceClass.getField("id");
            } catch (ReflectiveOperationException var6) {
               abilityInstanceIdField = null;
            }

            palladiumReflectionReady = true;
            return true;
         } catch (ReflectiveOperationException var9) {
            palladiumReflectionFailed = true;
            return false;
         }
      }
   }

   private static int resolveAbilityBarOriginX(String positionName, int guiWidth) {
      int var10000;
      switch (positionName) {
         case "TOP_RIGHT":
         case "BOTTOM_RIGHT":
            var10000 = guiWidth - 24 - 4;
            break;
         default:
            var10000 = 4;
      }

      return var10000;
   }

   private static int resolveAbilityBarOriginY(String positionName, int guiHeight, int slotCount) {
      int var10000;
      switch (positionName) {
         case "TOP_LEFT":
         case "TOP_RIGHT":
            var10000 = 4 + Math.round(CyberwareAbilityBarPeek.logoShift(true));
            break;
         default:
            var10000 = guiHeight - CyberwareAbilityBarLayout.abilityBarHeightForSlots(slotCount) - 4 + Math.round(CyberwareAbilityBarPeek.logoShift(false));
      }

      return var10000;
   }
}
