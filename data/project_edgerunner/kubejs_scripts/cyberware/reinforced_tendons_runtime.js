// priority: 59
// Server script: Reinforced Tendons passive runtime.
//
// This runtime handles:
// 1) Air-time tracking / one-double-jump reset on landing
// 2) Fall-damage margin draining while airborne

// PersistentData keys (shared with reinforced_tendons_ability.js)
var DJ_RT_KEY_USED = "cyb_dj_used";
var DJ_RT_KEY_AIR_T = "cyb_dj_air_ticks";
var DJ_RT_KEY_MARGIN = "cyb_dj_fall_margin";
var DJ_RT_KEY_SPACE_HELD = "cyb_dj_space_held";
var DJ_RT_KEY_RAMPAGE = "cyb_dj_rampage";

var DJ_RT_ITEM_ID = "project_edgerunner:reinforced_tendons";
var DJ_RT_POWER_ID = "project_edgerunner:reinforced_tendons";
var DJ_RT_SUPERPOWER_UTIL = Java.loadClass("net.threetag.palladium.power.SuperpowerUtil");
var DJ_RT_RESOURCE_LOC = Java.loadClass("net.minecraft.resources.ResourceLocation");
var DJ_RT_CYBERWARE_BRIDGE = Java.loadClass("com.edgerunner.cyberware.CyberwareScriptBridge");
var DJ_RT_KEY_INSTALLED_CACHE = "cyb_dj_installed_cache";
var DJ_RT_KEY_INSTALL_SCAN = "cyb_dj_next_install_scan";
var DJ_RT_INSTALL_SCAN_INTERVAL = 20;

function djRtOnGround(p) {
    try { if (typeof p.onGround === "function") return !!p.onGround(); } catch (_) {}
    try { if (typeof p.isOnGround === "function") return !!p.isOnGround(); } catch (_) {}
    return false;
}

function djRtCanUse(p) {
    if (!p) return false;
    try { if (typeof p.isPassenger === "function" && p.isPassenger()) return false; } catch (_) {}
    try { if (typeof p.isFallFlying === "function" && p.isFallFlying()) return false; } catch (_) {}
    try { if (typeof p.isInWater === "function" && p.isInWater()) return false; } catch (_) {}
    try { if (typeof p.isSwimming === "function" && p.isSwimming()) return false; } catch (_) {}
    try { if (typeof p.onClimbable === "function" && p.onClimbable()) return false; } catch (_) {}
    try { if (typeof p.isSpectator === "function" && p.isSpectator()) return false; } catch (_) {}
    return true;
}

function djRtLegacyPowerId(modernPowerId) {
    var text = String(modernPowerId || "");
    if (text.indexOf("project_edgerunner:") !== 0) {
        return text;
    }
    return "cyberpunk:" + text.substring("project_edgerunner:".length);
}

function djRtResolvePowerId(powerIdText) {
    try {
        if (typeof DJ_RT_RESOURCE_LOC.tryParse === "function") {
            var parsed = DJ_RT_RESOURCE_LOC.tryParse(powerIdText);
            if (parsed) {
                return parsed;
            }
        }
    } catch (_) {}
    try {
        var split = String(powerIdText || "").split(":");
        if (split.length === 2 && typeof DJ_RT_RESOURCE_LOC.fromNamespaceAndPath === "function") {
            return DJ_RT_RESOURCE_LOC.fromNamespaceAndPath(split[0], split[1]);
        }
    } catch (_) {}
    return null;
}

function djRtHasRuntimePower(e) {
    try {
        var modern = djRtResolvePowerId(DJ_RT_POWER_ID);
        if (modern && DJ_RT_SUPERPOWER_UTIL.hasSuperpower(e, modern)) {
            return true;
        }
        var legacy = djRtResolvePowerId(djRtLegacyPowerId(DJ_RT_POWER_ID));
        return !!(legacy && DJ_RT_SUPERPOWER_UTIL.hasSuperpower(e, legacy));
    } catch (_) {
        return false;
    }
}

function djRtReadString(source, key) {
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

function djRtHasAnyKey(source) {
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

function djRtHasCanonicalSlotProjection(cyber) {
    if (!cyber) return false;
    return djRtHasAnyKey(cyber.installed_physical)
        || djRtHasAnyKey(cyber.installed_body_slots)
        || djRtHasAnyKey(cyber.installed_activation_slots);
}

function djRtHasReinforcedTendons(e) {
    if (!e) return false;
    try {
        if (DJ_RT_CYBERWARE_BRIDGE.isInstalledBodyItem(e, "legs", DJ_RT_ITEM_ID)
                || DJ_RT_CYBERWARE_BRIDGE.hasInstalledItem(e, DJ_RT_ITEM_ID)) {
            return true;
        }
    } catch (_) {}
    if (global.getCyberwareInstalledItemByBodySlot) {
        var legsItem = String(global.getCyberwareInstalledItemByBodySlot(e, "legs") || "");
        if (legsItem === DJ_RT_ITEM_ID) {
            return true;
        }
    }
    if (!e.persistentData) return false;
    if (global.normalizeCyberwareInstalledData) {
        global.normalizeCyberwareInstalledData(e);
    }
    var cyber = e.persistentData.cyberware;
    if (!cyber) return false;

    function hasPhysicalItem(physicalSource) {
        if (!physicalSource) return false;
        try {
            if (typeof physicalSource.getAllKeys === "function") {
                var nbtKeys = physicalSource.getAllKeys();
                for (var i = 0; i < nbtKeys.length; i++) {
                    if (djRtReadString(physicalSource, String(nbtKeys[i] || "")) === DJ_RT_ITEM_ID) {
                        return true;
                    }
                }
            }
        } catch (_) {}
        try {
            if (typeof physicalSource === "object") {
                var keys = Object.keys(physicalSource);
                for (var j = 0; j < keys.length; j++) {
                    if (djRtReadString(physicalSource, keys[j]) === DJ_RT_ITEM_ID) {
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
    if (djRtReadString(bodySlots, "legs") === DJ_RT_ITEM_ID) {
        return true;
    }

    var installed = cyber.installed_components || {};
    if (!djRtHasCanonicalSlotProjection(cyber)) {
        if (djRtReadString(installed, "legs") === DJ_RT_ITEM_ID
                || djRtReadString(installed, "tendons") === DJ_RT_ITEM_ID
                || djRtReadString(installed, "extra") === DJ_RT_ITEM_ID) {
            return true;
        }
    }

    return false;
}

function djRtReset(pd) {
    pd[DJ_RT_KEY_USED] = false;
    pd[DJ_RT_KEY_AIR_T] = 0;
    pd[DJ_RT_KEY_MARGIN] = 0;
    pd[DJ_RT_KEY_SPACE_HELD] = false;
}

function djRtResetIfActive(pd) {
    if (!pd) {
        return;
    }
    var used = !!pd[DJ_RT_KEY_USED];
    var airT = Number(pd[DJ_RT_KEY_AIR_T] || 0);
    var margin = Number(pd[DJ_RT_KEY_MARGIN] || 0);
    var spaceHeld = !!pd[DJ_RT_KEY_SPACE_HELD];
    if (!used && (!isFinite(airT) || airT <= 0) && (!isFinite(margin) || margin <= 0) && !spaceHeld) {
        return;
    }
    djRtReset(pd);
}

function djRtHasTransientRuntimeState(pd) {
    if (!pd) {
        return false;
    }
    var used = !!pd[DJ_RT_KEY_USED];
    var airT = Number(pd[DJ_RT_KEY_AIR_T] || 0);
    var margin = Number(pd[DJ_RT_KEY_MARGIN] || 0);
    var spaceHeld = !!pd[DJ_RT_KEY_SPACE_HELD];
    return used
        || (isFinite(airT) && airT > 0)
        || (isFinite(margin) && margin > 0)
        || spaceHeld;
}

function djRtRefreshInstalledCache(entity, pd) {
    if (!entity || !pd) {
        return false;
    }
    var installed = djRtHasReinforcedTendons(entity);
    pd[DJ_RT_KEY_INSTALLED_CACHE] = installed ? 1 : 0;
    return installed;
}

function djRtResolveInstalledState(entity, pd) {
    if (!entity || !pd) {
        return false;
    }
    var installed = djRtHasReinforcedTendons(entity);
    var cached = Number(pd[DJ_RT_KEY_INSTALLED_CACHE] || 0) > 0;
    if (installed !== cached) {
        pd[DJ_RT_KEY_INSTALLED_CACHE] = installed ? 1 : 0;
        if (!installed) {
            djRtResetIfActive(pd);
        }
    }
    return installed;
}

function tickReinforcedTendonsRuntime(p) {
    if (!p || !p.persistentData) return;
    var pd = p.persistentData;

    if (!djRtResolveInstalledState(p, pd)) {
        djRtResetIfActive(pd);
        return;
    }

    if (!djRtCanUse(p)) {
        djRtResetIfActive(pd);
        return;
    }

    var onGround = djRtOnGround(p);

    if (onGround) {
        pd[DJ_RT_KEY_USED] = false;
        pd[DJ_RT_KEY_AIR_T] = 0;
        pd[DJ_RT_KEY_MARGIN] = 0;
        return;
    }

    var airT = Number(pd[DJ_RT_KEY_AIR_T] || 0);
    if (!isFinite(airT)) airT = 0;
    pd[DJ_RT_KEY_AIR_T] = airT + 1;

    if (pd[DJ_RT_KEY_RAMPAGE]) {
        pd[DJ_RT_KEY_RAMPAGE] = false;
        if (!pd[DJ_RT_KEY_USED] && (airT + 1) >= 1 && global.applyReinforcedTendonsDoubleJump) {
            global.applyReinforcedTendonsDoubleJump(p);
        }
    }

    var margin = Number(pd[DJ_RT_KEY_MARGIN] || 0);
    if (!isFinite(margin) || margin <= 0) return;

    var fd = 0;
    try { fd = Number(p.fallDistance || 0); } catch (_) {}
    if (!isFinite(fd) || fd <= 0) return;

    var absorb = Math.min(margin, fd);
    try { p.fallDistance = fd - absorb; } catch (_) {}
    pd[DJ_RT_KEY_MARGIN] = margin - absorb;
}

global.isReinforcedTendonsInstalled = function (playerOrEntity) {
    if (!playerOrEntity) {
        return false;
    }
    var entity = playerOrEntity.minecraftEntity ? playerOrEntity.minecraftEntity : playerOrEntity;
    return djRtHasReinforcedTendons(entity);
};

global.refreshReinforcedTendonsRuntimeNow = function (playerOrEntity) {
    if (!playerOrEntity) {
        return;
    }
    var entity = playerOrEntity.minecraftEntity ? playerOrEntity.minecraftEntity : playerOrEntity;
    if (!entity || !entity.persistentData) {
        return;
    }
    var pd = entity.persistentData;
    var installed = djRtRefreshInstalledCache(entity, pd);
    if (!installed) {
        djRtResetIfActive(pd);
        return;
    }
    tickReinforcedTendonsRuntime(entity);
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
        var nextScan = Number(pd[DJ_RT_KEY_INSTALL_SCAN] || 0);
        if (nextScan <= 0) {
            djRtRefreshInstalledCache(entity, pd);
            pd[DJ_RT_KEY_INSTALL_SCAN] = DJ_RT_INSTALL_SCAN_INTERVAL;
        } else {
            pd[DJ_RT_KEY_INSTALL_SCAN] = nextScan - 1;
        }
        var installedCached = Number(pd[DJ_RT_KEY_INSTALLED_CACHE] || 0) > 0;
        if (!installedCached && !djRtHasTransientRuntimeState(pd)) {
            continue;
        }
        tickReinforcedTendonsRuntime(entity);
    }
});
