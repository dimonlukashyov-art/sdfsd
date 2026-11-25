// priority: 59
// Server script: Fortified Ankles passive runtime.
//
// This runtime handles:
// 1) Shift charge while crouching on ground
// 2) Hold charge after releasing Shift, then gradual decay
// 3) Additive charged jump boost on takeoff (consumes charge)
// 4) Fall-damage margin draining while airborne

// Tuning: charge state
var FA_RT_MAX_CHARGE_TICKS = 20;   // 1.0s to reach 100%
var FA_RT_DECAY_GRACE_TICKS = 60;  // 3.0s hold after releasing Shift before decay
var FA_RT_DECAY_PER_TICK = 1;      // charge lost per tick after grace

// Tuning: charged jump profile
var FA_RT_MIN_CHARGED_Y = 0.525;
var FA_RT_MAX_CHARGED_Y = 1.00;        // ~6 blocks at full charge
var FA_RT_MIN_FORWARD_BONUS = 0.06;    // subtle horizontal movement on low charged jumps
var FA_RT_MAX_FORWARD_BONUS = 0.16;    // keep charged jump mostly vertical (not leap-like)
var FA_RT_MIN_HSPEED_FOR_BOOST = 0.03; // no horizontal assist from standstill
var FA_RT_MIN_TAKEOFF_Y = 0.30;        // avoid boosting when just walking off edges
var FA_RT_MIN_LATE_TAKEOFF_Y = 0.08;   // tolerate Palladium/input ordering by a few server ticks
var FA_RT_MIN_CHARGED_RELEASE_TICKS = 6; // ignore tiny accidental crouch taps
var FA_RT_JUMP_REQUEST_GRACE_TICKS = 4;

// Tuning: charged jump fall mitigation
var FA_RT_FALL_MARGIN_BASE = 5; // any charged jump
var FA_RT_FALL_MARGIN_EXTRA = 5; // extra at full charge

// PersistentData keys
var FA_RT_KEY_CHARGE = "cyb_fa_charge_ticks";
var FA_RT_KEY_FULL_SFX = "cyb_fa_full_sfx";
var FA_RT_KEY_DECAY_GRACE = "cyb_fa_decay_grace";
var FA_RT_KEY_WAS_CROUCH = "cyb_fa_was_crouching";
var FA_RT_KEY_FALL_MARGIN = "cyb_fa_fall_margin";
var FA_RT_KEY_LAST_GROUND = "cyb_fa_last_on_ground";
var FA_RT_KEY_JUMP_REQUESTED = "cyb_fa_jump_requested";
var FA_RT_KEY_JUMP_PENDING_TICKS = "cyb_fa_jump_pending_ticks";
var FA_RT_KEY_SPACE_HELD = "cyb_fa_space_held";

var FA_RT_ITEM_ID = "project_edgerunner:fortified_ankles";
var FA_RT_POWER_ID = "project_edgerunner:fortified_ankles";
var FA_RT_SUPERPOWER_UTIL = Java.loadClass("net.threetag.palladium.power.SuperpowerUtil");
var FA_RT_RESOURCE_LOC = Java.loadClass("net.minecraft.resources.ResourceLocation");
var FA_RT_CYBERWARE_BRIDGE = Java.loadClass("com.edgerunner.cyberware.CyberwareScriptBridge");
var FA_RT_KEY_INSTALLED_CACHE = "cyb_fa_installed_cache";
var FA_RT_KEY_INSTALL_SCAN = "cyb_fa_next_install_scan";
var FA_RT_INSTALL_SCAN_INTERVAL = 20;

// ParCool (optional): slides, crawls and rolls hold sneak without charging; ParCool leaps keep their own launch.
var FA_RT_PARCOOL_BRIDGE_CLASS = "com.edgerunner.compat.parcool.ParCoolScriptBridge";
var faRtParCoolBridge = null;
var faRtParCoolBridgeMissing = false;

function faRtParCool(method, e) {
    if (faRtParCoolBridgeMissing) return false;
    if (faRtParCoolBridge === null) {
        try {
            faRtParCoolBridge = Java.loadClass(FA_RT_PARCOOL_BRIDGE_CLASS);
        } catch (_) {
            faRtParCoolBridgeMissing = true;
            return false;
        }
    }
    try {
        return !!faRtParCoolBridge[method](e);
    } catch (_) {
        return false;
    }
}

function faRtOnGround(e) {
    try { if (typeof e.onGround === "function") return !!e.onGround(); } catch (_) {}
    try { if (typeof e.isOnGround === "function") return !!e.isOnGround(); } catch (_) {}
    return false;
}

function faRtCanUse(e) {
    if (!e) return false;
    try { if (typeof e.isPassenger === "function" && e.isPassenger()) return false; } catch (_) {}
    try { if (typeof e.isFallFlying === "function" && e.isFallFlying()) return false; } catch (_) {}
    try { if (typeof e.isInWater === "function" && e.isInWater()) return false; } catch (_) {}
    try { if (typeof e.isSwimming === "function" && e.isSwimming()) return false; } catch (_) {}
    try { if (typeof e.onClimbable === "function" && e.onClimbable()) return false; } catch (_) {}
    try { if (typeof e.isSpectator === "function" && e.isSpectator()) return false; } catch (_) {}
    return true;
}

function faRtLegacyPowerId(modernPowerId) {
    var text = String(modernPowerId || "");
    if (text.indexOf("project_edgerunner:") !== 0) {
        return text;
    }
    return "cyberpunk:" + text.substring("project_edgerunner:".length);
}

function faRtResolvePowerId(powerIdText) {
    try {
        if (typeof FA_RT_RESOURCE_LOC.tryParse === "function") {
            var parsed = FA_RT_RESOURCE_LOC.tryParse(powerIdText);
            if (parsed) {
                return parsed;
            }
        }
    } catch (_) {}
    try {
        var split = String(powerIdText || "").split(":");
        if (split.length === 2 && typeof FA_RT_RESOURCE_LOC.fromNamespaceAndPath === "function") {
            return FA_RT_RESOURCE_LOC.fromNamespaceAndPath(split[0], split[1]);
        }
    } catch (_) {}
    return null;
}

function faRtNormalizeItemId(itemId) {
    var text = String(itemId || "");
    if (text.indexOf("cyberpunk:") === 0) {
        return "project_edgerunner:" + text.substring("cyberpunk:".length);
    }
    return text;
}

function faRtItemMatches(itemId) {
    return faRtNormalizeItemId(itemId) === FA_RT_ITEM_ID;
}

function faRtHasRuntimePower(e) {
    try {
        var modern = faRtResolvePowerId(FA_RT_POWER_ID);
        if (modern && FA_RT_SUPERPOWER_UTIL.hasSuperpower(e, modern)) {
            return true;
        }
        var legacy = faRtResolvePowerId(faRtLegacyPowerId(FA_RT_POWER_ID));
        return !!(legacy && FA_RT_SUPERPOWER_UTIL.hasSuperpower(e, legacy));
    } catch (_) {
        return false;
    }
}

function faRtReadString(source, key) {
    try {
        if (source && typeof source.getString === "function") {
            return String(source.getString(key) || "");
        }
    } catch (_) {}
    try {
        if (source && source[key] !== undefined && source[key] !== null) {
            return String(source[key]);
        }
    } catch (_) {}
    return "";
}

function faRtHasAnyKey(source) {
    if (!source) return false;
    try {
        if (typeof source.getAllKeys === "function") {
            var keys = source.getAllKeys();
            try { return keys && keys.length > 0; } catch (_) {}
            try { return keys && keys.size && keys.size() > 0; } catch (_) {}
            try { return keys && keys.iterator && keys.iterator().hasNext(); } catch (_) {}
        }
    } catch (_) {}
    try {
        return typeof source === "object" && Object.keys(source).length > 0;
    } catch (_) {}
    return false;
}

function faRtHasCanonicalSlotProjection(cyber) {
    if (!cyber) return false;
    return faRtHasAnyKey(cyber.installed_physical)
        || faRtHasAnyKey(cyber.installed_body_slots)
        || faRtHasAnyKey(cyber.installed_activation_slots);
}

function faRtHasFortifiedAnkles(e) {
    if (!e) return false;
    try {
        if (FA_RT_CYBERWARE_BRIDGE.isInstalledBodyItem(e, "legs", FA_RT_ITEM_ID)
                || FA_RT_CYBERWARE_BRIDGE.hasInstalledItem(e, FA_RT_ITEM_ID)) {
            return true;
        }
    } catch (_) {}
    if (global.getCyberwareInstalledItemByBodySlot) {
        var legsItem = String(global.getCyberwareInstalledItemByBodySlot(e, "legs") || "");
        if (faRtItemMatches(legsItem)) {
            return true;
        }
    }
    if (!e.persistentData) return faRtHasRuntimePower(e);
    if (global.normalizeCyberwareInstalledData) {
        global.normalizeCyberwareInstalledData(e);
    }
    var cyber = e.persistentData.cyberware;
    if (!cyber) return faRtHasRuntimePower(e);

    function hasPhysicalItem(physicalSource) {
        if (!physicalSource) return false;
        try {
            if (typeof physicalSource.getAllKeys === "function") {
                var nbtKeys = physicalSource.getAllKeys();
                for (var i = 0; i < nbtKeys.length; i++) {
                    if (faRtItemMatches(faRtReadString(physicalSource, String(nbtKeys[i] || "")))) {
                        return true;
                    }
                }
            }
        } catch (_) {}
        try {
            if (typeof physicalSource === "object") {
                var keys = Object.keys(physicalSource);
                for (var j = 0; j < keys.length; j++) {
                    if (faRtItemMatches(faRtReadString(physicalSource, keys[j]))) {
                        return true;
                    }
                }
            }
        } catch (_) {}
        return false;
    }

    if (hasPhysicalItem(cyber.installed_physical)) {
        return true;
    }

    var bodySlots = cyber.installed_body_slots || {};
    if (faRtItemMatches(faRtReadString(bodySlots, "legs"))) {
        return true;
    }

    // Legacy fallback only for old saves that have not been normalized into canonical slots.
    var installed = cyber.installed_components || {};
    if (!faRtHasCanonicalSlotProjection(cyber)) {
        if (faRtItemMatches(faRtReadString(installed, "extra"))
                || faRtItemMatches(faRtReadString(installed, "legs"))
                || faRtItemMatches(faRtReadString(installed, "tendons"))) {
            return true;
        }
    }

    return false;
}

function faRtIsCrouching(e) {
    try { if (typeof e.isCrouching === "function") return !!e.isCrouching(); } catch (_) {}
    try { if (typeof e.isShiftKeyDown === "function") return !!e.isShiftKeyDown(); } catch (_) {}
    return false;
}

function faRtGetFacingVector(e) {
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
    return {
        x: -(Math.sin(yawRad)),
        z: Math.cos(yawRad)
    };
}

function faRtGetMotion(e) {
    try {
        var m = e.getDeltaMovement();
        if (!m) return null;
        var vx = 0, vy = 0, vz = 0;
        try { vx = parseFloat(String(m.x())); } catch (_) {}
        try { vy = parseFloat(String(m.y())); } catch (_) {}
        try { vz = parseFloat(String(m.z())); } catch (_) {}
        return {
            vec: m,
            vx: vx,
            vy: vy,
            vz: vz
        };
    } catch (_) {}
    return null;
}

function faRtPlayFullChargeFx(e) {
    try {
        var srv = e.server;
        if (!srv) return;
        var n = "";
        try { n = e.username; } catch (_) {}
        if (!n) return;

        srv.runCommandSilent("execute at " + n + " run particle minecraft:electric_spark ~ ~1 ~ 0.15 0.05 0.15 0.01 6");
        srv.runCommandSilent("execute at " + n + " run playsound minecraft:block.beacon.power_select player @a[distance=..16] ~ ~ ~ 0.35 1.2");
    } catch (_) {}
}

function faRtPlayChargeParticles(e, ratio) {
    try {
        var srv = e.server;
        if (!srv) return;
        var n = "";
        try { n = e.username; } catch (_) {}
        if (!n) return;

        var spread = 0.05 + (0.10 * ratio);
        var count = 1 + Math.floor(3 * ratio);
        srv.runCommandSilent("execute at " + n + " run particle minecraft:poof ~ ~0.05 ~ " + spread + " 0.02 " + spread + " 0.0 " + count);
    } catch (_) {}
}

function faRtPlayReleaseFx(e) {
    try {
        var srv = e.server;
        if (!srv) return;
        var n = "";
        try { n = e.username; } catch (_) {}
        if (!n) return;
        srv.runCommandSilent("execute at " + n + " run playsound minecraft:entity.player.attack.sweep player @a[distance=..16] ~ ~ ~ 0.45 1.45");
        srv.runCommandSilent("execute at " + n + " run playsound minecraft:block.piston.extend player @a[distance=..16] ~ ~ ~ 0.35 1.70");
    } catch (_) {}
}

function faRtApplyJumpBoost(e, ratio, grantFallMargin) {
    ratio = Math.max(0, Math.min(1, Number(ratio || 0)));
    // Added on top of the vanilla jump velocity at takeoff.
    var chargeBonusY = FA_RT_MIN_CHARGED_Y + ((FA_RT_MAX_CHARGED_Y - FA_RT_MIN_CHARGED_Y) * ratio);
    var fwdBonus = FA_RT_MIN_FORWARD_BONUS + ((FA_RT_MAX_FORWARD_BONUS - FA_RT_MIN_FORWARD_BONUS) * ratio);

    var applied = false;
    try {
        var motion = faRtGetMotion(e);
        if (!motion || !motion.vec) throw new Error("null motion");

        var hSpeed = Math.sqrt(motion.vx * motion.vx + motion.vz * motion.vz);
        var newVx = motion.vx;
        var newVz = motion.vz;
        if (hSpeed >= FA_RT_MIN_HSPEED_FOR_BOOST) {
            var facing = faRtGetFacingVector(e);
            newVx = motion.vx + (facing.x * fwdBonus);
            newVz = motion.vz + (facing.z * fwdBonus);
        }

        var newVy = motion.vy + chargeBonusY;
        var newVec = motion.vec.multiply(0, 0, 0).add(newVx, newVy, newVz);
        e.setDeltaMovement(newVec);
        applied = true;
    } catch (_) {}

    if (!applied) {
        try { e.push(0, chargeBonusY, 0); } catch (_) {}
    }

    try { e.fallDistance = 0; } catch (_) {}
    try { e.hasImpulse = true; } catch (_) {}
    try { e.hurtMarked = true; } catch (_) {}

    if (grantFallMargin) {
        try {
            var prev = Number(e.persistentData[FA_RT_KEY_FALL_MARGIN] || 0);
            if (!isFinite(prev)) prev = 0;
            var grant = FA_RT_FALL_MARGIN_BASE + (FA_RT_FALL_MARGIN_EXTRA * ratio);
            e.persistentData[FA_RT_KEY_FALL_MARGIN] = prev + grant;
        } catch (_) {}
    }

    faRtPlayReleaseFx(e);
}

function faRtReset(pd, onGroundNow) {
    pd[FA_RT_KEY_CHARGE] = 0;
    pd[FA_RT_KEY_FULL_SFX] = false;
    pd[FA_RT_KEY_DECAY_GRACE] = 0;
    pd[FA_RT_KEY_WAS_CROUCH] = false;
    pd[FA_RT_KEY_FALL_MARGIN] = 0;
    pd[FA_RT_KEY_JUMP_REQUESTED] = false;
    pd[FA_RT_KEY_JUMP_PENDING_TICKS] = 0;
    pd[FA_RT_KEY_SPACE_HELD] = false;
    pd[FA_RT_KEY_LAST_GROUND] = !!onGroundNow;
}

function faRtResetIfActive(pd, onGroundNow) {
    if (!pd) {
        return;
    }
    var charge = Number(pd[FA_RT_KEY_CHARGE] || 0);
    var decayGrace = Number(pd[FA_RT_KEY_DECAY_GRACE] || 0);
    var margin = Number(pd[FA_RT_KEY_FALL_MARGIN] || 0);
    var wasCrouching = !!pd[FA_RT_KEY_WAS_CROUCH];
    var fullSfx = !!pd[FA_RT_KEY_FULL_SFX];
    var jumpRequested = !!pd[FA_RT_KEY_JUMP_REQUESTED];
    var pendingTicks = Number(pd[FA_RT_KEY_JUMP_PENDING_TICKS] || 0);
    var spaceHeld = !!pd[FA_RT_KEY_SPACE_HELD];
    if ((!isFinite(charge) || charge <= 0)
            && (!isFinite(decayGrace) || decayGrace <= 0)
            && (!isFinite(margin) || margin <= 0)
            && (!isFinite(pendingTicks) || pendingTicks <= 0)
            && !wasCrouching
            && !fullSfx
            && !jumpRequested
            && !spaceHeld) {
        return;
    }
    faRtReset(pd, !!onGroundNow);
}

function faRtHasTransientRuntimeState(pd) {
    if (!pd) {
        return false;
    }
    var charge = Number(pd[FA_RT_KEY_CHARGE] || 0);
    var decayGrace = Number(pd[FA_RT_KEY_DECAY_GRACE] || 0);
    var margin = Number(pd[FA_RT_KEY_FALL_MARGIN] || 0);
    var wasCrouching = !!pd[FA_RT_KEY_WAS_CROUCH];
    var fullSfx = !!pd[FA_RT_KEY_FULL_SFX];
    var jumpRequested = !!pd[FA_RT_KEY_JUMP_REQUESTED];
    var pendingTicks = Number(pd[FA_RT_KEY_JUMP_PENDING_TICKS] || 0);
    var spaceHeld = !!pd[FA_RT_KEY_SPACE_HELD];
    return (isFinite(charge) && charge > 0)
        || (isFinite(decayGrace) && decayGrace > 0)
        || (isFinite(margin) && margin > 0)
        || (isFinite(pendingTicks) && pendingTicks > 0)
        || wasCrouching
        || fullSfx
        || jumpRequested
        || spaceHeld;
}

function faRtRefreshInstalledCache(entity, pd) {
    if (!entity || !pd) {
        return false;
    }
    var installed = faRtHasFortifiedAnkles(entity);
    pd[FA_RT_KEY_INSTALLED_CACHE] = installed ? 1 : 0;
    return installed;
}

function faRtResolveInstalledState(entity, pd) {
    if (!entity || !pd) {
        return false;
    }
    var installed = faRtHasFortifiedAnkles(entity);
    var cached = Number(pd[FA_RT_KEY_INSTALLED_CACHE] || 0) > 0;
    if (installed !== cached) {
        pd[FA_RT_KEY_INSTALLED_CACHE] = installed ? 1 : 0;
        if (!installed) {
            faRtResetIfActive(pd, false);
        }
    }
    return installed;
}

function faRtPendingJumpTicks(pd) {
    var pending = Number(pd[FA_RT_KEY_JUMP_PENDING_TICKS] || 0);
    return isFinite(pending) && pending > 0 ? Math.floor(pending) : 0;
}

function faRtHasJumpRequest(pd) {
    return !!pd[FA_RT_KEY_JUMP_REQUESTED] && faRtPendingJumpTicks(pd) > 0;
}

function faRtSetJumpRequest(pd) {
    pd[FA_RT_KEY_JUMP_REQUESTED] = true;
    pd[FA_RT_KEY_JUMP_PENDING_TICKS] = FA_RT_JUMP_REQUEST_GRACE_TICKS;
}

function faRtClearJumpRequest(pd) {
    pd[FA_RT_KEY_JUMP_REQUESTED] = false;
    pd[FA_RT_KEY_JUMP_PENDING_TICKS] = 0;
}

function faRtAgeJumpRequest(pd) {
    var pending = faRtPendingJumpTicks(pd);
    if (pending <= 0) {
        faRtClearJumpRequest(pd);
        return;
    }
    pending--;
    pd[FA_RT_KEY_JUMP_PENDING_TICKS] = pending;
    if (pending <= 0) {
        faRtClearJumpRequest(pd);
    }
}

function tickFortifiedAnklesRuntime(entity) {
    if (!entity || !entity.persistentData) return;
    var pd = entity.persistentData;

    if (!faRtResolveInstalledState(entity, pd)) {
        faRtResetIfActive(pd, false);
        return;
    }

    var onGround = faRtOnGround(entity);
    var wasOnGround = !!pd[FA_RT_KEY_LAST_GROUND];
    pd[FA_RT_KEY_LAST_GROUND] = onGround;

    if (!faRtCanUse(entity)) {
        faRtResetIfActive(pd, onGround);
        return;
    }

    // Airborne: apply jump boost on takeoff, then drain fall-margin credit.
    if (!onGround) {
        var motionAir = faRtGetMotion(entity);
        var vyAir = motionAir ? Number(motionAir.vy || 0) : 0;
        var hasTakeoffVelocity = isFinite(vyAir) && vyAir >= FA_RT_MIN_TAKEOFF_Y;
        var jumpRequested = faRtHasJumpRequest(pd);
        var tookOff = wasOnGround && hasTakeoffVelocity;
        var lateRequestedTakeoff = jumpRequested && isFinite(vyAir) && vyAir >= FA_RT_MIN_LATE_TAKEOFF_Y;
        if (tookOff || lateRequestedTakeoff) {
            var chargeTakeoff = Number(pd[FA_RT_KEY_CHARGE] || 0);
            if (!isFinite(chargeTakeoff) || chargeTakeoff < 0) chargeTakeoff = 0;

            var isChargedJump = false;
            if (!faRtIsCrouching(entity) && chargeTakeoff >= FA_RT_MIN_CHARGED_RELEASE_TICKS) {
                if (jumpRequested || hasTakeoffVelocity) {
                    isChargedJump = true;
                }
            }

            if (isChargedJump && faRtParCool("ownsTakeoff", entity)) {
                // Charge is kept (and keeps decaying) for the next plain jump.
                isChargedJump = false;
            }

            if (isChargedJump) {
                var chargeRatio = Math.max(0, Math.min(1, chargeTakeoff / FA_RT_MAX_CHARGE_TICKS));
                faRtApplyJumpBoost(entity, chargeRatio, true);
                pd[FA_RT_KEY_CHARGE] = 0;
                pd[FA_RT_KEY_FULL_SFX] = false;
                pd[FA_RT_KEY_DECAY_GRACE] = 0;
                pd[FA_RT_KEY_WAS_CROUCH] = false;
                faRtClearJumpRequest(pd);
            } else if (jumpRequested) {
                faRtAgeJumpRequest(pd);
            }
        } else if (jumpRequested) {
            faRtAgeJumpRequest(pd);
        }

        var marginAir = Number(pd[FA_RT_KEY_FALL_MARGIN] || 0);
        if (isFinite(marginAir) && marginAir > 0) {
            var fd = 0;
            try { fd = Number(entity.fallDistance || 0); } catch (_) {}
            if (isFinite(fd) && fd > 0) {
                var absorb = Math.min(marginAir, fd);
                try { entity.fallDistance = fd - absorb; } catch (_) {}
                pd[FA_RT_KEY_FALL_MARGIN] = marginAir - absorb;
            }
        }
        return;
    }

    // Grounded: clear margin and process Shift charge state.
    pd[FA_RT_KEY_FALL_MARGIN] = 0;

    var crouching = faRtIsCrouching(entity) && !faRtParCool("blocksCrouchCharge", entity);
    var wasCrouching = !!pd[FA_RT_KEY_WAS_CROUCH];
    var charge = Number(pd[FA_RT_KEY_CHARGE] || 0);
    if (!isFinite(charge) || charge < 0) charge = 0;

    var decayGrace = Number(pd[FA_RT_KEY_DECAY_GRACE] || 0);
    if (!isFinite(decayGrace) || decayGrace < 0) decayGrace = 0;

    if (crouching) {
        faRtClearJumpRequest(pd);
        charge = Math.min(FA_RT_MAX_CHARGE_TICKS, charge + 1);
        pd[FA_RT_KEY_CHARGE] = charge;
        pd[FA_RT_KEY_WAS_CROUCH] = true;

        var ratio = charge / FA_RT_MAX_CHARGE_TICKS;
        faRtPlayChargeParticles(entity, ratio);

        if (charge >= FA_RT_MAX_CHARGE_TICKS && !pd[FA_RT_KEY_FULL_SFX]) {
            pd[FA_RT_KEY_FULL_SFX] = true;
            faRtPlayFullChargeFx(entity);
        }
        return;
    }

    // Releasing Shift keeps charge during grace, then decay begins.
    if (wasCrouching) {
        pd[FA_RT_KEY_DECAY_GRACE] = FA_RT_DECAY_GRACE_TICKS;
        pd[FA_RT_KEY_WAS_CROUCH] = false;
        return;
    }

    if (decayGrace > 0) {
        pd[FA_RT_KEY_DECAY_GRACE] = decayGrace - 1;
        faRtAgeJumpRequest(pd);
        return;
    }

    if (charge > 0) {
        charge = Math.max(0, charge - FA_RT_DECAY_PER_TICK);
        pd[FA_RT_KEY_CHARGE] = charge;
        if (charge <= 0) {
            pd[FA_RT_KEY_FULL_SFX] = false;
        }
    }
    faRtAgeJumpRequest(pd);
}

global.isFortifiedAnklesInstalled = function (playerOrEntity) {
    if (!playerOrEntity) {
        return false;
    }
    var entity = playerOrEntity.minecraftEntity ? playerOrEntity.minecraftEntity : playerOrEntity;
    return faRtHasFortifiedAnkles(entity);
};

global.requestFortifiedAnklesJump = function (playerOrEntity) {
    if (!playerOrEntity) {
        return false;
    }
    var entity = playerOrEntity.minecraftEntity ? playerOrEntity.minecraftEntity : playerOrEntity;
    if (!entity || !entity.persistentData) {
        return false;
    }
    var pd = entity.persistentData;
    var charge = Number(pd[FA_RT_KEY_CHARGE] || 0);
    if (!isFinite(charge) || charge < FA_RT_MIN_CHARGED_RELEASE_TICKS) {
        return false;
    }
    if (faRtIsCrouching(entity)) {
        return false;
    }
    faRtSetJumpRequest(pd);
    return true;
};

global.refreshFortifiedAnklesRuntimeNow = function (playerOrEntity) {
    if (!playerOrEntity) {
        return;
    }
    var entity = playerOrEntity.minecraftEntity ? playerOrEntity.minecraftEntity : playerOrEntity;
    if (!entity || !entity.persistentData) {
        return;
    }
    var pd = entity.persistentData;
    var installed = faRtRefreshInstalledCache(entity, pd);
    if (!installed) {
        faRtResetIfActive(pd, false);
        return;
    }
    tickFortifiedAnklesRuntime(entity);
};

ServerEvents.tick(function (event) {
    var players = event.server && event.server.players ? event.server.players : [];
    for (var i = 0; i < players.length; i++) {
        var entity = players[i] && players[i].minecraftEntity ? players[i].minecraftEntity : players[i];
        if (!entity || !entity.persistentData) {
            continue;
        }
        // In a dream no implant answers (see DreamRuntime): nothing of this runs there.
        var dreamDim = entity.level.dimension;
        if (String(dreamDim && typeof dreamDim.location === 'function' ? dreamDim.location() : dreamDim) === 'project_edgerunner:dream') {
            continue;
        }
        var pd = entity.persistentData;
        var nextScan = Number(pd[FA_RT_KEY_INSTALL_SCAN] || 0);
        if (nextScan <= 0) {
            faRtRefreshInstalledCache(entity, pd);
            pd[FA_RT_KEY_INSTALL_SCAN] = FA_RT_INSTALL_SCAN_INTERVAL;
        } else {
            pd[FA_RT_KEY_INSTALL_SCAN] = nextScan - 1;
        }
        var installedCached = Number(pd[FA_RT_KEY_INSTALLED_CACHE] || 0) > 0;
        if (!installedCached && !faRtHasTransientRuntimeState(pd)) {
            continue;
        }
        tickFortifiedAnklesRuntime(entity);
    }
});
