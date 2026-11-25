package com.edgerunner.client;

import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import net.minecraft.ChatFormatting;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.ComponentContents;
import net.minecraft.network.chat.Style;
import net.minecraft.network.chat.TextColor;
import net.minecraft.network.chat.contents.TranslatableContents;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.item.ItemStack;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.event.entity.player.ItemTooltipEvent;
import net.minecraftforge.eventbus.api.EventPriority;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod.EventBusSubscriber;
import net.minecraftforge.fml.common.Mod.EventBusSubscriber.Bus;
import net.minecraftforge.registries.ForgeRegistries;

@EventBusSubscriber(
   modid = "project_edgerunner",
   value = {Dist.CLIENT},
   bus = Bus.FORGE
)
public final class CyberwareTooltipFoldClient {
   private static final Pattern TITLE_WITH_SLOT_SUFFIX = Pattern.compile("^(.+) \\(([^()]+)\\)\\s*$");
   private static final TextColor SHIFT_KEY_HINT_COLOR = TextColor.m_131266_(13684944);

   private CyberwareTooltipFoldClient() {
   }

   @SubscribeEvent(
      priority = EventPriority.LOWEST
   )
   public static void onItemTooltip(ItemTooltipEvent event) {
      ItemStack stack = event.getItemStack();
      if (!stack.m_41619_()) {
         ResourceLocation itemId = ForgeRegistries.ITEMS.getKey(stack.m_41720_());
         if (itemId != null && "project_edgerunner".equals(itemId.m_135827_())) {
            List<Component> tooltip = event.getToolTip();
            if (tooltip.size() >= 3) {
               String subtitle = ((Component)tooltip.get(1)).getString();
               Component tierLoad = (Component)tooltip.get(2);
               Optional<String> slotLabel = parseSlotFromSubtitle(subtitle);
               if (!slotLabel.isEmpty() && hasTierAndLoad(tierLoad)) {
                  tooltip.set(1, Component.m_237110_("tooltip.project_edgerunner.cyberware_slot", new Object[]{slotLabel.get()}).m_130940_(ChatFormatting.GRAY));
                  if (!Screen.m_96638_()) {
                     List<Component> paintLines = tooltip.stream().filter((line) -> {
                        ComponentContents patt2997$temp = line.m_214077_();
                        boolean var10000;
                        if (patt2997$temp instanceof TranslatableContents t) {
                           if (t.m_237508_().startsWith("tooltip.project_edgerunner.painted")) {
                              var10000 = true;
                              return var10000;
                           }
                        }

                        var10000 = false;
                        return var10000;
                     }).toList();
                     if (tooltip.size() > 3) {
                        tooltip.subList(3, tooltip.size()).clear();
                     }

                     tooltip.addAll(paintLines);
                     Component shiftKey = Component.m_237115_("text.project_edgerunner.cyberwaretooltipfoldclient.shift").m_130948_(Style.f_131099_.m_131148_(SHIFT_KEY_HINT_COLOR));
                     tooltip.add(Component.m_237110_("tooltip.project_edgerunner.hold_shift_for_summary", new Object[]{shiftKey}).m_130940_(ChatFormatting.DARK_GRAY));
                  }
               }
            }
         }
      }
   }

   private static Optional<String> parseSlotFromSubtitle(String line) {
      Matcher m = TITLE_WITH_SLOT_SUFFIX.matcher(line);
      return !m.matches() ? Optional.empty() : Optional.of(m.group(2).trim());
   }

   private static boolean hasTierAndLoad(Component line) {
      return ClientLocalization.isTierLoadLine(line);
   }
}
