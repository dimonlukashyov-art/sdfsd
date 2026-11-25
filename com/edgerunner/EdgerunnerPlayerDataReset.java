package com.edgerunner;

import com.edgerunner.content.ripperdoc.gui.RipperdocMenu;
import com.edgerunner.cyberpsychosis.BloodPumpChargeRuntime;
import com.edgerunner.cyberpsychosis.CyberpsychosisRuntime;
import com.edgerunner.face.FaceCyberwareRuntime;
import com.edgerunner.gorilla.GorillaArmsRuntime;
import com.edgerunner.mantis.MantisBladesRuntime;
import com.edgerunner.sandevistan.SandevistanController;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.item.ItemEntity;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.scores.Objective;
import net.minecraft.world.scores.Scoreboard;

public final class EdgerunnerPlayerDataReset {
   private static final String[] PLAYER_SCORE_OBJECTIVES = new String[]{"er_sandy_charge", "er_sandy_active", "er_sandy_exhaust", "er_cw_cd_os", "er_cw_cd_arms", "er_cw_cd_face", "er_cw_cd_circ", "er_cw_cd_extra", "er_cw_runtime_ready", "er_cw_icon_os", "er_cw_icon_arms", "er_cw_icon_face", "er_cw_icon_circ", "er_cw_icon_extra", "er_axo_kill_trigger", "er_axo_last_type", "er_axo_kills_hostile", "er_axo_kills_neutral", "er_axo_kills_player", "er_axo_proc_applied", "er_axo_last_reduction_bp", "er_axo_last_proc_tick", "er_face_implant", "er_face_scan_mode", "er_face_active_ticks", "er_face_active_max", "er_bp_active_ticks", "er_bp_active_max", "er_bp_charges", "er_bp_charges_max", "er_bz_active", "er_bz_active_max", "er_bz_cooldown", "er_bz_cd_max", "er_bz_kills", "er_bz_variant", "er_bz_spec", "er_bz_spec_lv", "er_bz_branch", "er_bz_pressure", "er_bp_dbg_ability_cd", "er_bp_dbg_score_cd", "er_bp_dbg_reduce_before", "er_bp_dbg_reduce_after", "er_ga_state", "er_ga_power", "er_ga_grab_cd", "er_ga_aug", "er_ga_aug_cd", "er_ga_grabbed", "er_ga_fury", "er_ga_move", "er_ga_guard", "er_ga_charge", "er_ga_combo", "er_ga_fin", "er_ga_fury_u", "er_ga_slam", "er_ga_up", "er_ga_slam_r", "er_ga_cfg", "er_mb_state", "er_mb_move", "er_mb_leap_cd", "er_mb_leap_cdm", "er_mb_combo", "er_mb_frenzy", "er_mb_elem", "er_mb_unlocks", "er_anim_debug"};
   private static final String RIPPERDOC_GUI_ROOT = "CyberpunkRipperdocGui";
   private static final String TRACKED_SLOT_POWERS_KEY = "cyberware_granted_slot_powers";

   private EdgerunnerPlayerDataReset() {
   }

   public static WipeResult wipe(ServerPlayer player) {
      if (player != null && !player.m_9236_().m_5776_()) {
         int powersRemoved = EdgerunnerPalladiumCleanup.removeAllKnownPowers(player);
         SandevistanController.deactivate(player);
         SandevistanController.resetDebugStats(player);
         GorillaArmsRuntime.forceReset(player);
         GorillaArmsRuntime.resetUpgradeData(player);
         MantisBladesRuntime.forceReset(player);
         MantisBladesRuntime.resetUpgradeData(player);
         BloodPumpChargeRuntime.forceReset(player);
         CyberpsychosisRuntime.resetPlayer(player);
         FaceCyberwareRuntime.resetPlayer(player);
         List<ItemStack> drops = RipperdocMenu.collectAndClearCyberwareForDeath(player);
         int itemsDropped = dropStacks(player, drops);
         int nbtKeysRemoved = clearModPersistentData(player);
         int scoreObjectivesCleared = clearModScoreboards(player);
         player.m_20137_("edgerunner_sandy_internal");
         player.m_20137_("edgerunner_ripperdoc_lock");
         powersRemoved += EdgerunnerPalladiumCleanup.removeAllKnownPowers(player);
         return new WipeResult(itemsDropped, scoreObjectivesCleared, nbtKeysRemoved, powersRemoved);
      } else {
         return new WipeResult(0, 0, 0, 0);
      }
   }

   private static int dropStacks(ServerPlayer player, List<ItemStack> stacks) {
      int dropped = 0;

      for(ItemStack stack : stacks) {
         if (stack != null && !stack.m_41619_()) {
            ItemStack copy = stack.m_41777_();
            ItemEntity entity = player.m_36176_(copy, false);
            if (entity != null) {
               entity.m_32061_();
               entity.m_266426_(player.m_20148_());
            }

            ++dropped;
         }
      }

      return dropped;
   }

   private static int clearModScoreboards(ServerPlayer player) {
      Scoreboard scoreboard = player.m_284548_().m_6188_();
      if (scoreboard == null) {
         return 0;
      } else {
         String playerName = player.m_6302_();
         int cleared = 0;

         for(String objectiveName : PLAYER_SCORE_OBJECTIVES) {
            Objective objective = scoreboard.m_83477_(objectiveName);
            if (objective != null && scoreboard.m_83461_(playerName, objective)) {
               scoreboard.m_83479_(playerName, objective);
               ++cleared;
            }
         }

         return cleared;
      }
   }

   private static int clearModPersistentData(ServerPlayer player) {
      CompoundTag persistent = player.getPersistentData();
      List<String> keys = new ArrayList(persistent.m_128431_());
      int removed = 0;

      for(String key : keys) {
         if (shouldRemovePersistentKey(key)) {
            persistent.m_128473_(key);
            ++removed;
         }
      }

      return removed;
   }

   private static boolean shouldRemovePersistentKey(String key) {
      if (key != null && !key.isEmpty()) {
         if (!"cyberware".equals(key) && !"CyberpunkRipperdocGui".equals(key) && !"cyberware_granted_slot_powers".equals(key)) {
            return !key.startsWith("cyberware_") && !key.startsWith("cyb_") && !key.startsWith("cyberpsychosis_") && !key.startsWith("er_cyberpsychosis") && !key.startsWith("ripperdoc_") ? isListedModKey(key) : true;
         } else {
            return true;
         }
      } else {
         return false;
      }
   }

   private static boolean isListedModKey(String key) {
      return Set.of("cyberware_join_lock_until", "cyberware_os_lock_until", "cyberware_capacity_profile_base", "ripperdoc_postfx_lock_until", "cyb_ga_toggle_req", "cyb_ga_power_present", "cyb_ga_dmg_tier", "cyb_ga_bleed_tier", "cyb_ga_aug", "cyb_ga_finisher_unlock", "cyb_ga_fury_unlock", "cyb_ga_slam_unlock", "cyb_ga_up", "cyb_ga_hand_stash", "cyb_mb_dmg_tier", "cyb_mb_bleed_tier", "cyb_mb_element", "cyb_mb_deflect", "cyb_mb_climb", "cyb_mb_jailbreak", "cyb_mb_crimson", "cyberpsychosis_stress", "cyberpsychosis_stage", "cyberpsychosis_pressure", "cyberpsychosis_degradation", "cyberpsychosis_phase", "cyberpsychosis_transition_eta", "cyberpsychosis_transition_direction", "cyberpsychosis_terminal_until", "cyberpsychosis_final_rampage_until", "cyberpsychosis_episode_until", "cyberpsychosis_episode_cooldown_until", "cyberpsychosis_render_seed", "edgerunner_guide_granted", "cyb_face_nv_state", "cyb_ga_aug_sel", "cyb_ga_aug_unlock_thermal", "cyb_ga_aug_unlock_electric", "cyb_ga_aug_unlock_toxic", "cyb_ga_aug_unlock_frozen").contains(key);
   }

   public static record WipeResult(int itemsDropped, int scoreObjectivesCleared, int nbtKeysRemoved, int powersRemoved) {
   }
}
