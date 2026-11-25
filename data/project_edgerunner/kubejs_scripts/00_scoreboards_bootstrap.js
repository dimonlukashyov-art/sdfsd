// priority: 200
// Server script: ensure required scoreboards exist once per world load.

const CYBERPUNK_SCOREBOARD_OBJECTIVES = [
    "er_sandy_charge",
    "er_sandy_active",
    "er_sandy_exhaust",
    "er_cw_cd_os",
    "er_cw_cd_arms",
    "er_cw_cd_face",
    "er_cw_cd_circ",
    "er_cw_cd_extra",
    "er_cw_runtime_ready",
    "er_cw_icon_os",
    "er_cw_icon_arms",
    "er_cw_icon_face",
    "er_cw_icon_circ",
    "er_cw_icon_extra",
    "er_axo_kill_trigger",
    "er_axo_last_type",
    "er_axo_kills_hostile",
    "er_axo_kills_neutral",
    "er_axo_kills_player",
    "er_axo_proc_applied",
    "er_axo_last_reduction_bp",
    "er_axo_last_proc_tick",
    "er_face_implant",
    "er_face_scan_mode",
    "er_face_active_ticks",
    "er_face_active_max",
    "er_bp_active_ticks",
    "er_bp_active_max",
    "er_bp_charges",
    "er_bp_charges_max",
    "er_bp_dbg_ability_cd",
    "er_bp_dbg_score_cd",
    "er_bp_dbg_reduce_before",
    "er_bp_dbg_reduce_after",
    "er_ga_state",
    "er_ga_power",
    "er_ga_grab_cd",
    "er_ga_aug",
    "er_ga_aug_cd",
    "er_ga_grabbed",
    "er_ga_fury",
    "er_ga_move",
    "er_ga_guard",
    "er_ga_charge",
    "er_ga_combo",
    "er_ga_fin",
    "er_ga_fury_u",
    "er_ga_slam",
    "er_ga_up",
    "er_ga_slam_r",
    "er_ga_cfg",
    "er_anim_debug"
    ,"er_bz_active"
    ,"er_bz_active_max"
    ,"er_bz_cooldown"
    ,"er_bz_cd_max"
    ,"er_bz_kills"
    ,"er_bz_variant"
    ,"er_bz_spec"
    ,"er_bz_spec_lv"
    ,"er_bz_branch"
    ,"er_bz_pressure"
    ,"er_mb_state"
    ,"er_mb_move"
    ,"er_mb_leap_cd"
    ,"er_mb_leap_cdm"
    ,"er_mb_combo"
    ,"er_mb_frenzy"
    ,"er_mb_elem"
    ,"er_mb_unlocks"
];

function cyberpunkRunServerCommand(server, command) {
    try {
        if (server && typeof server.runCommandSilent === "function") {
            server.runCommandSilent(command);
            return;
        }
        if (server && typeof server.runCommand === "function") {
            server.runCommand(command);
            return;
        }
        console.error("[Cyberpunk/KubeJS] Unable to run bootstrap command: " + command);
    } catch (err) {
        console.error("[Cyberpunk/KubeJS] Scoreboard bootstrap command failed: " + command + " -> " + err);
    }
}

function cyberpunkGetScoreboard(server) {
    if (!server) {
        return null;
    }
    if (typeof server.getScoreboard === "function") {
        return server.getScoreboard();
    }
    return server.scoreboard || null;
}

function cyberpunkHasObjective(server, objective) {
    try {
        var scoreboard = cyberpunkGetScoreboard(server);
        if (!scoreboard || typeof scoreboard.getObjective !== "function") {
            return false;
        }
        return scoreboard.getObjective(objective) != null;
    } catch (err) {
        console.error("[Cyberpunk/KubeJS] Objective lookup failed for " + objective + ": " + err);
        return false;
    }
}

ServerEvents.loaded(event => {
    CYBERPUNK_SCOREBOARD_OBJECTIVES.forEach(function (objective) {
        if (cyberpunkHasObjective(event.server, objective)) {
            return;
        }
        cyberpunkRunServerCommand(event.server, "scoreboard objectives add " + objective + " dummy");
    });
});
