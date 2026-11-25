package com.edgerunner.client;

import com.edgerunner.config.EdgerunnerServerConfig;
import java.util.List;
import java.util.Locale;
import java.util.Map;

final class EdgerunnerConfigDefaults {
   private EdgerunnerConfigDefaults() {
   }

   static String value(String id) {
      if (id.startsWith("slow_")) {
         Double value = (Double)EdgerunnerServerConfig.DEFAULT_SANDEVISTAN_SLOW_PCT_OVERRIDES.get(id.substring(5));
         if (value == null) {
            throw new IllegalArgumentException("Unknown Sandevistan variant: " + id);
         } else {
            return format(value * (double)100.0F);
         }
      } else if (!id.startsWith("duration_") && !id.startsWith("cooldown_")) {
         if (!id.startsWith("berserk_duration_") && !id.startsWith("berserk_cooldown_") && !id.startsWith("berserk_reduction_")) {
            if (id.startsWith("hud_card_")) {
               return "true";
            } else {
               String var10000;
               switch (id) {
                  case "mantis_audio_bank":
                     var10000 = "CURRENT";
                     break;
                  case "gui_scale":
                     var10000 = "100";
                     break;
                  case "hud_mode":
                  case "cyber_flashbacks":
                     var10000 = "FULL";
                     break;
                  case "hud_bars":
                  case "hud_target":
                  case "hud_prompts":
                  case "hud_ability_bar":
                     var10000 = "AUTO";
                     break;
                  case "hud_chip_layout":
                     var10000 = "ROW";
                     break;
                  case "hud_chip_show":
                     var10000 = "ACTIVE";
                     break;
                  case "hud_inventory":
                  case "hud_toasts":
                     var10000 = "true";
                     break;
                  case "hud_chip_text":
                  case "hud_ability_footer":
                     var10000 = "false";
                     break;
                  case "afterimage_on":
                  case "afterimage_fp":
                  case "held_visible_only":
                  case "cyber_popups":
                  case "cyber_overlay":
                  case "cyber_tremor":
                  case "cyber_tunnel":
                  case "cyber_post":
                  case "cyber_figures":
                  case "cyber_datamosh":
                  case "cyber_tear":
                  case "cyber_drip":
                  case "cyber_heartbeat":
                  case "cyber_focus":
                  case "cyber_threat":
                  case "cyber_fracture":
                  case "cyber_face":
                  case "cyber_flatline":
                  case "cyber_identity":
                  case "cyber_armed":
                  case "cyber_echoes":
                  case "cyber_sky_eye":
                  case "cyber_moon_faint":
                  case "cyber_row_path":
                  case "cyber_audio":
                  case "cyber_steps":
                  case "tips_dynamic":
                  case "world_guide":
                  case "world_psycho":
                  case "assault_break":
                  case "assault_players":
                  case "assault_water":
                  case "assault_ladders":
                  case "assault_doors":
                  case "assault_require_sight":
                  case "assault_require_route":
                  case "ripperdoc_cinematic":
                  case "ripperdoc_cinematic_first_only":
                  case "ripperdoc_hallucinations":
                  case "mantis_blood":
                  case "water_ice":
                     var10000 = "true";
                     break;
                  case "cyber_neon":
                  case "cyber_flash":
                  case "cyber_assault_stable":
                  case "cyber_assault_warning":
                  case "world_regen":
                  case "temporal_debug":
                  case "ripperdoc_reduced_motion":
                     var10000 = "false";
                     break;
                  case "afterimage_count":
                  case "server_afterimage_history":
                     var10000 = "200";
                     break;
                  case "afterimage_rendered":
                  case "server_afterimage_rendered":
                     var10000 = "28";
                     break;
                  case "afterimage_sample":
                  case "server_afterimage_sample":
                     var10000 = "0.05";
                     break;
                  case "afterimage_distance":
                  case "held_distance":
                     var10000 = "48";
                     break;
                  case "afterimage_age":
                     var10000 = "104";
                     break;
                  case "afterimage_fp_distance":
                     var10000 = "1.75";
                     break;
                  case "held_mode":
                     var10000 = "HYBRID";
                     break;
                  case "held_visible":
                  case "assault_episode_min":
                     var10000 = "8";
                     break;
                  case "held_area":
                     var10000 = "0.15";
                     break;
                  case "berserk_flash":
                     var10000 = "72";
                     break;
                  case "berserk_kick":
                     var10000 = "65";
                     break;
                  case "berserk_seam":
                     var10000 = "100";
                     break;
                  case "berserk_feedback":
                  case "cyber_volume":
                     var10000 = "82";
                     break;
                  case "berserk_fov":
                     var10000 = "55";
                     break;
                  case "cyber_assault_distance":
                     var10000 = "5.50";
                     break;
                  case "cyber_assault_side":
                     var10000 = "0.65";
                     break;
                  case "world_duration":
                     var10000 = "1";
                     break;
                  case "assault_first_phase":
                  case "sync_chunks":
                     var10000 = "4";
                     break;
                  case "assault_four_min":
                     var10000 = "60";
                     break;
                  case "assault_four_max":
                     var10000 = "90";
                     break;
                  case "assault_five_min":
                     var10000 = "30";
                     break;
                  case "assault_five_max":
                     var10000 = "45";
                     break;
                  case "assault_episode_max":
                  case "assault_lead":
                  case "assault_recovery":
                  case "assault_replan":
                     var10000 = "12";
                     break;
                  case "assault_final":
                     var10000 = "13";
                     break;
                  case "assault_radius":
                     var10000 = "40";
                     break;
                  case "assault_switch":
                     var10000 = "5";
                     break;
                  case "assault_lost":
                     var10000 = "40";
                     break;
                  case "assault_unreachable":
                     var10000 = "80";
                     break;
                  case "assault_nodes":
                     var10000 = "1100";
                     break;
                  case "assault_stuck":
                     var10000 = "20";
                     break;
                  case "assault_speed":
                     var10000 = "0.30";
                     break;
                  case "assault_hardness":
                     var10000 = "2";
                     break;
                  case "assault_break_rate":
                     var10000 = "10";
                     break;
                  case "kinetic":
                     var10000 = "0";
                     break;
                  case "you_speed_limit":
                     var10000 = format((double)2.0F);
                     break;
                  case "you_time_cost":
                     var10000 = "100";
                     break;
                  case "sandy_fall_slowdown":
                     var10000 = "0";
                     break;
                  case "bubble_radius":
                     var10000 = "24";
                     break;
                  case "berserk_health_floor":
                  case "berserk_heal_per_kill":
                     var10000 = "25";
                     break;
                  default:
                     throw new IllegalArgumentException("Missing factory config value: " + id);
               }

               return var10000;
            }
         } else {
            return "100";
         }
      } else {
         boolean duration = id.startsWith("duration_");
         String stem = id.substring(9);
         int separator = stem.lastIndexOf(95);
         String variant = stem.substring(0, separator);
         int tier = Integer.parseInt(stem.substring(separator + 1));
         Map<String, List<Double>> defaults = duration ? EdgerunnerServerConfig.DEFAULT_SANDEVISTAN_DURATION_SECONDS_OVERRIDES : EdgerunnerServerConfig.DEFAULT_SANDEVISTAN_COOLDOWN_SECONDS_OVERRIDES;
         return format((Double)((List)defaults.get(variant)).get(tier));
      }
   }

   private static String format(double value) {
      return value == Math.rint(value) ? Long.toString((long)value) : String.format(Locale.ROOT, "%.2f", value);
   }
}
