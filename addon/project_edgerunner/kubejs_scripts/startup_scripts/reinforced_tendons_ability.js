// Startup script: Reinforced Tendons double-jump ability
// Forge 1.20.1 + Palladium + KubeJS
//
// Triggered by space_bar action, but hidden from manual UI flow.
// Shared state keys are reset/maintained in reinforced_tendons_runtime.js.

// Tuning
var DJ_BOOST_Y = 0.68;             // tuned for ~5 blocks max total with 2-block base jump
var DJ_MIN_AIR_TICKS = 1;          // minimum airborne ticks before allowing air-jump
var DJ_VERTICAL_CANCEL = 1.0;      // fully replace current Y with fixed boost
var DJ_HORIZ_MULTIPLIER = 4.0;     // stronger horizontal feel
var DJ_FORWARD_BONUS = 0.20;       // keeps forward push at low speed
var DJ_FALL_MARGIN_BLOCKS = 4;     // absorbed fall distance after double jump

// PersistentData keys
var DJ_KEY_USED = "cyb_dj_used";
var DJ_KEY_AIR_T = "cyb_dj_air_ticks";
var DJ_KEY_MARGIN = "cyb_dj_fall_margin";
var DJ_KEY_SPACE_HELD = "cyb_dj_space_held";
var DJ_KEY_RAMPAGE = "cyb_dj_rampage";

// ParCool (optional): a jump press that ParCool spends on a wall jump, climb up or vault is not a double jump.
var DJ_PARCOOL_BRIDGE_CLASS = "com.edgerunner.compat.parcool.ParCoolScriptBridge";
var djParCoolBridge = null;
var djParCoolBridgeMissing = false;

function djParCoolOwnsJump(e) {
    if (djParCoolBridgeMissing) return false;
    if (djParCoolBridge === null) {
        try {
            djParCoolBridge = Java.loadClass(DJ_PARCOOL_BRIDGE_CLASS);
        } catch (_) {
            djParCoolBridgeMissing = true;
            return false;
        }
    }
    try {
        return !!djParCoolBridge.ownsAirJump(e);
    } catch (_) {
        return false;
    }
}

function djOnGround(e) {
    try { if (typeof e.onGround === "function") return !!e.onGround(); } catch (_) {}
    try { if (typeof e.isOnGround === "function") return !!e.isOnGround(); } catch (_) {}
    return false;
}

function djCanJump(e) {
    if (!e || djOnGround(e)) return false;
    try { if (typeof e.isPassenger === "function" && e.isPassenger()) return false; } catch (_) {}
    try { if (typeof e.isFallFlying === "function" && e.isFallFlying()) return false; } catch (_) {}
    try { if (typeof e.isInWater === "function" && e.isInWater()) return false; } catch (_) {}
    try { if (typeof e.isSwimming === "function" && e.isSwimming()) return false; } catch (_) {}
    try { if (typeof e.onClimbable === "function" && e.onClimbable()) return false; } catch (_) {}
    try { if (typeof e.isSpectator === "function" && e.isSpectator()) return false; } catch (_) {}
    return true;
}

function djApply(e) {
    var boost = DJ_BOOST_Y;
    var cancel = Math.max(0, Math.min(1, DJ_VERTICAL_CANCEL));
    var hm = DJ_HORIZ_MULTIPLIER;
    var applied = false;

    try {
        var m = e.getDeltaMovement();
        if (!m) throw new Error("null motion");

        var vx = 0, vy = 0, vz = 0;
        try { vx = parseFloat(String(m.x())); } catch (_) {}
        try { vy = parseFloat(String(m.y())); } catch (_) {}
        try { vz = parseFloat(String(m.z())); } catch (_) {}

        var hSpeed = Math.sqrt(vx * vx + vz * vz);

        var yaw = 0;
        try {
            var raw;
            if (typeof e.yHeadRot === "function") raw = e.yHeadRot();
            else if (typeof e.getYHeadRot === "function") raw = e.getYHeadRot();
            else if (typeof e.yRot === "function") raw = e.yRot();
            else if (typeof e.getYRot === "function") raw = e.getYRot();
            yaw = parseFloat(String(raw)) || 0;
        } catch (_) {}

        var DEG2RAD = 0.017453292519943295;
        var yawRad = yaw * DEG2RAD;
        var facingX = -(Math.sin(yawRad));
        var facingZ = Math.cos(yawRad);

        var newH = (hSpeed * hm) + DJ_FORWARD_BONUS;
        var newVx = facingX * newH;
        var newVz = facingZ * newH;
        var newY = (vy * (1 - cancel)) + boost;

        var newVec = m.multiply(0, 0, 0).add(newVx, newY, newVz);
        e.setDeltaMovement(newVec);
        applied = true;
    } catch (_) {}

    if (!applied) {
        try { e.push(0, boost + 0.20, 0); } catch (_) {}
    }

    try { e.fallDistance = 0; } catch (_) {}
    try { e.hasImpulse = true; } catch (_) {}
    try { e.hurtMarked = true; } catch (_) {}

    try {
        var prev = Number(e.persistentData[DJ_KEY_MARGIN] || 0);
        if (!isFinite(prev)) prev = 0;
        e.persistentData[DJ_KEY_MARGIN] = prev + DJ_FALL_MARGIN_BLOCKS;
    } catch (_) {}

    try {
        var srv = e.server;
        if (!srv) return;
        var n = "";
        try { n = e.username; } catch (_) {}
        if (!n) return;

        srv.runCommandSilent("execute at " + n + " run particle minecraft:cloud ~ ~ ~ 0.25 0.05 0.25 0.03 8");
        srv.runCommandSilent("execute at " + n + " run particle minecraft:crit ~ ~0.1 ~ 0.2 0.1 0.2 0.25 6");
        srv.runCommandSilent("execute at " + n + " run playsound minecraft:entity.player.attack.sweep player @a[distance=..16] ~ ~ ~ 0.5 1.5");
        srv.runCommandSilent("execute at " + n + " run playsound minecraft:block.piston.extend player @a[distance=..16] ~ ~ ~ 0.25 1.8");
    } catch (_) {}
}

StartupEvents.registry("palladium:abilities", function (event) {
    event.create("cyberpunk/reinforced_tendons_double_jump")
        .tick(function (entity, entry, holder, enabled) {
            if (!entity || !entity.persistentData) return;
            var pd = entity.persistentData;
            if (!global.isReinforcedTendonsInstalled || !global.isReinforcedTendonsInstalled(entity)) {
                pd[DJ_KEY_SPACE_HELD] = false;
                return;
            }

            var rampageRequest = !!pd[DJ_KEY_RAMPAGE];
            if (rampageRequest) {
                pd[DJ_KEY_RAMPAGE] = false;
            }

            var isSpaceDown = !!enabled;
            var wasSpaceDown = !!pd[DJ_KEY_SPACE_HELD];
            var isFirstSpacePress = isSpaceDown && !wasSpaceDown;
            pd[DJ_KEY_SPACE_HELD] = isSpaceDown;
            if (!isFirstSpacePress && !rampageRequest) return;
            // The press stays unspent: the double jump remains available for this airtime.
            if (!rampageRequest && djParCoolOwnsJump(entity)) return;

            if (djOnGround(entity)) return;
            if (pd[DJ_KEY_USED]) return;
            if (!djCanJump(entity)) return;

            var airT = Number(pd[DJ_KEY_AIR_T] || 0);
            if (!isFinite(airT)) airT = 0;
            if (airT < DJ_MIN_AIR_TICKS) return;

            djApply(entity);
            pd[DJ_KEY_USED] = true;
        });
});

global.applyReinforcedTendonsDoubleJump = function (entity) {
    if (!entity || !entity.persistentData) {
        return false;
    }
    if (djOnGround(entity) || !djCanJump(entity)) {
        return false;
    }
    if (entity.persistentData[DJ_KEY_USED]) {
        return false;
    }
    djApply(entity);
    entity.persistentData[DJ_KEY_USED] = true;
    return true;
};
