// priority: 58
// Server script: Gorilla Arms runtime config bridge (scoreboard fake players).

const GORILLA_ARMS_CONFIG = {
    threshold_pct: 25,
    grab_max_ticks: 120,
    grab_cooldown_ticks: 80,
    grab_lift_ticks: 14,
    throw_anticipation_ticks: 8,
    throw_horizontal_x100: 180,
    throw_vertical_x100: 55,
    collision_bonus_x100: 240,
    collision_min_speed_x100: 90,
    finisher_range_x100: 350,
    toggle_anim_ticks: 35,
    augment_cooldown_ticks: 300
};

global.GORILLA_ARMS_CONFIG = Object.assign({}, GORILLA_ARMS_CONFIG);

function gorillaCfgRun(server, command) {
    try {
        if (server && typeof server.runCommandSilent === "function") {
            server.runCommandSilent(command);
            return true;
        }
        if (server && typeof server.runCommand === "function") {
            server.runCommand(command);
            return true;
        }
    } catch (err) {
        console.error("[Cyberpunk/GorillaArms] Config command failed: " + command + " -> " + err);
    }
    return false;
}

function gorillaCfgEnsureObjective(server, objective) {
    if (!server) {
        return;
    }
    var scoreboard = null;
    try {
        scoreboard = typeof server.getScoreboard === "function" ? server.getScoreboard() : server.scoreboard;
    } catch (err) {
        scoreboard = null;
    }
    if (!scoreboard || !scoreboard.getObjective || scoreboard.getObjective(objective) != null) {
        return;
    }
    gorillaCfgRun(server, "scoreboard objectives add " + objective + " dummy");
}

ServerEvents.loaded(function (event) {
    var objective = "er_ga_cfg";
    gorillaCfgEnsureObjective(event.server, objective);
    Object.keys(GORILLA_ARMS_CONFIG).forEach(function (key) {
        var value = Math.floor(Number(GORILLA_ARMS_CONFIG[key] || 0));
        gorillaCfgRun(event.server, "scoreboard players set $" + key + " " + objective + " " + value);
    });
});
