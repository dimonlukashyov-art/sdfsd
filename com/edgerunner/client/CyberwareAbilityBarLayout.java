package com.edgerunner.client;

import com.edgerunner.util.CyberwareDataUtil;
import com.edgerunner.util.PlayerScoreHelper;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;
import javax.annotation.Nullable;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.screens.ChatScreen;
import net.minecraft.client.player.LocalPlayer;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.resources.ResourceLocation;
import net.threetag.palladium.PalladiumConfig.Client;
import net.threetag.palladium.client.screen.AbilityBarRenderer;
import net.threetag.palladium.power.ability.AbilityInstance;

public final class CyberwareAbilityBarLayout {
   public static final int MAX_SLOTS = 5;
   public static final int SLOT_STEP = 22;
   public static final int SLOT_AREA_PADDING = 2;
   public static final int DEFAULT_BAR_HEIGHT = 112;
   private static final ResourceLocation CYBERWARE_POWER_ID = ResourceLocation.fromNamespaceAndPath("project_edgerunner", "cyberware");
   @Nullable
   private static Method abilityInstanceGetReference;
   @Nullable
   private static Method abilityReferenceGetAbilityId;
   @Nullable
   private static Field abilityInstanceIdField;
   private static boolean palladiumReflectionReady;
   private static boolean palladiumReflectionFailed;

   private CyberwareAbilityBarLayout() {
   }

   public static boolean isCyberwareList(@Nullable AbilityBarRenderer.AbilityList abilityList) {
      return abilityList != null && abilityList.getPower() != null && CYBERWARE_POWER_ID.equals(abilityList.getPower().getId());
   }

   public static List<VisibleAbility> visibleAbilities(@Nullable AbilityBarRenderer.AbilityList abilityList, @Nullable AbilityInstance[] original) {
      List<VisibleAbility> visible = new ArrayList();
      if (original != null && isCyberwareList(abilityList)) {
         LocalPlayer player = Minecraft.m_91087_().f_91074_;
         if (player == null) {
            return visible;
         } else {
            for(int originalIndex = 0; originalIndex < original.length; ++originalIndex) {
               AbilityInstance ability = original[originalIndex];
               if (ability != null && isCyberwareSlotInUse(player, ability)) {
                  visible.add(new VisibleAbility(ability, originalIndex));
               }
            }

            return visible;
         }
      } else {
         return visible;
      }
   }

   public static int visibleSlotCount(@Nullable List<VisibleAbility> visibleAbilities) {
      return visibleAbilities == null ? 0 : visibleAbilities.size();
   }

   public static int abilityBarHeightForSlots(int slotCount) {
      return slotCount <= 0 ? 0 : Math.min(slotCount, 5) * 22 + 2;
   }

   public static int bottomAnchorShift(int slotCount) {
      int height = abilityBarHeightForSlots(slotCount);
      return height <= 0 ? 0 : Math.max(0, 112 - height);
   }

   public static boolean isTopPosition(Object position) {
      String name = String.valueOf(position);
      return name.startsWith("TOP");
   }

   public static int compactedOriginY(String positionName, int guiHeight, int slotCount) {
      return slotsOriginY(positionName, guiHeight, slotCount, !HudModeConfig.get().hidesAbilityBarLogo(), false);
   }

   public static int slotsOriginY(String position, int guiHeight, int slots, boolean footer, boolean simple) {
      boolean top = position == null || position.startsWith("TOP");
      int logo = footer && !simple ? 27 : 0;
      return top ? logo : guiHeight - abilityBarHeightForSlots(slots) - logo;
   }

   public static List<HudCollisionLayout.Rect> occupiedBounds(int guiWidth, int guiHeight) {
      Minecraft minecraft = Minecraft.m_91087_();
      if (minecraft.f_91074_ != null && CyberwareAbilityBarPeek.barVisible()) {
         AbilityBarRenderer.AbilityList list = AbilityBarRenderer.getSelectedList();
         if (!isCyberwareList(list)) {
            return List.of();
         } else {
            String position = String.valueOf(Client.ABILITY_BAR_POSITION.get());
            if (!"HIDDEN".equals(position) && (!position.startsWith("TOP") || !minecraft.f_91066_.f_92063_)) {
               if (minecraft.f_91080_ instanceof ChatScreen) {
                  position = position.endsWith("LEFT") ? "TOP_LEFT" : "TOP_RIGHT";
               }

               int slots = visibleSlotCount(visibleAbilities(list, list.getDisplayedAbilities()));
               if (slots <= 0) {
                  return List.of();
               } else {
                  boolean simple = list.simple && AbilityBarRenderer.ABILITY_LISTS.size() <= 1;
                  boolean footer = !HudModeConfig.get().hidesAbilityBarLogo() && !simple;
                  int x = position.endsWith("LEFT") ? 0 : guiWidth - 24;
                  List<HudCollisionLayout.Rect> result = new ArrayList();
                  result.add(new HudCollisionLayout.Rect(x, slotsOriginY(position, guiHeight, slots, footer, simple), 24, abilityBarHeightForSlots(slots)));
                  if (footer) {
                     result.add(new HudCollisionLayout.Rect(position.endsWith("LEFT") ? 0 : guiWidth - 52, position.startsWith("TOP") ? 0 : guiHeight - 28, 52, 28));
                  }

                  return List.copyOf(result);
               }
            } else {
               return List.of();
            }
         }
      } else {
         return List.of();
      }
   }

   public static String abilityId(@Nullable AbilityInstance ability) {
      if (ability == null) {
         return "";
      } else {
         if (ensurePalladiumReflection()) {
            if (abilityInstanceGetReference != null && abilityReferenceGetAbilityId != null) {
               try {
                  Object reference = abilityInstanceGetReference.invoke(ability);
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
                  Object abilityId = abilityInstanceIdField.get(ability);
                  if (abilityId != null) {
                     return String.valueOf(abilityId);
                  }
               } catch (IllegalAccessException var3) {
                  return "";
               }
            }
         }

         return "";
      }
   }

   private static boolean ensurePalladiumReflection() {
      if (palladiumReflectionReady) {
         return true;
      } else if (palladiumReflectionFailed) {
         return false;
      } else {
         try {
            Class<?> abilityInstanceClass = Class.forName("net.threetag.palladium.power.ability.AbilityInstance");
            Class<?> abilityReferenceClass = Class.forName("net.threetag.palladium.power.ability.AbilityReference");

            try {
               abilityInstanceGetReference = abilityInstanceClass.getMethod("getReference");
               abilityReferenceGetAbilityId = resolveAbilityIdAccessor(abilityReferenceClass);
            } catch (ReflectiveOperationException var4) {
               abilityInstanceGetReference = null;
               abilityReferenceGetAbilityId = null;
            }

            try {
               abilityInstanceIdField = abilityInstanceClass.getField("id");
            } catch (ReflectiveOperationException var3) {
               abilityInstanceIdField = null;
            }

            palladiumReflectionReady = true;
            return true;
         } catch (ReflectiveOperationException var5) {
            palladiumReflectionFailed = true;
            return false;
         }
      }
   }

   @Nullable
   private static Method resolveAbilityIdAccessor(Class<?> abilityReferenceClass) {
      for(String methodName : List.of("abilityId", "getAbilityId")) {
         try {
            return abilityReferenceClass.getMethod(methodName);
         } catch (ReflectiveOperationException var4) {
         }
      }

      return null;
   }

   public static boolean isCyberwareAbilityVisible(@Nullable LocalPlayer player, String abilityId) {
      if (player != null && abilityId != null && !abilityId.isBlank()) {
         String slotId = activationSlotForAbility(abilityId);
         if (slotId.isBlank()) {
            return true;
         } else if ("extra".equals(slotId)) {
            return SuppressorHudClientState.hasInstalledSuppressor();
         } else {
            CompoundTag cyberware = CyberwareDataUtil.getCyberwareTag(player.getPersistentData());
            String installedItem = CyberwareDataUtil.getInstalledItemByActivationSlot(cyberware, slotId);
            if (installedItem != null && !installedItem.isBlank()) {
               return true;
            } else {
               String objectiveName = iconObjectiveForSlot(slotId);
               return !objectiveName.isBlank() && PlayerScoreHelper.hasPositiveScore(player, objectiveName);
            }
         }
      } else {
         return false;
      }
   }

   private static boolean isCyberwareSlotInUse(LocalPlayer player, AbilityInstance ability) {
      return isCyberwareAbilityVisible(player, abilityId(ability));
   }

   private static String activationSlotForAbility(String abilityId) {
      String var10000;
      switch (abilityId) {
         case "cyberware_os" -> var10000 = "os";
         case "cyberware_arms" -> var10000 = "arms";
         case "cyberware_face" -> var10000 = "face";
         case "cyberware_circulatory" -> var10000 = "circulatory";
         case "cyberware_extra" -> var10000 = "extra";
         default -> var10000 = "";
      }

      return var10000;
   }

   private static String iconObjectiveForSlot(String slotId) {
      String var10000;
      switch (slotId) {
         case "os" -> var10000 = "er_cw_icon_os";
         case "arms" -> var10000 = "er_cw_icon_arms";
         case "face" -> var10000 = "er_cw_icon_face";
         case "circulatory" -> var10000 = "er_cw_icon_circ";
         case "extra" -> var10000 = "er_cw_icon_extra";
         default -> var10000 = "";
      }

      return var10000;
   }

   public static record VisibleAbility(AbilityInstance ability, int originalIndex) {
   }
}
