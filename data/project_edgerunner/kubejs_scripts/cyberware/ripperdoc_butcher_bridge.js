// priority: 60
// RipperDoc interaction bridge.
// Flow: right-click RipperDoc → sit + open chest GUI (Install/Buy) → close GUI → auto-stand.
console.info("[Cyberpunk] Loaded ripperdoc_butcher_bridge.js");

var RIPPERDOC_SIT_ANIMATION_IDS = [
    "project_edgerunner:ripperdoc_sentarse"
];
var RIPPERDOC_DEBUG = false;
var RIPPERDOC_HIDE_NAME_TEAM = "edgerunner_ripperdoc_hidden";

// State maps (keyed by player UUID)
var cyberpunkRipperdocPoseActive = {};
var cyberpunkRipperdocLockState = {};
var cyberpunkRipperdocLastLockTick = {};
var cyberpunkRipperdocInstallSession = {};
var cyberpunkRipperdocGuiWasOpen = {};
var cyberpunkRipperdocPendingRuntimeRefresh = {};
var RIPPERDOC_INSTALL_SLOT = 4;
var RIPPERDOC_INSTALL_ENDER_SLOT = 13;
var RIPPERDOC_EXIT_EFFECT_SECONDS = 10;
var RIPPERDOC_EXIT_EFFECT_AMPLIFIER = 0;
var RIPPERDOC_POSTFX_LOCK_UNTIL_KEY = "ripperdoc_postfx_lock_until";
var RIPPERDOC_POSTFX_LOCK_TAG = "edgerunner_ripperdoc_lock";

var CYBERPUNK_COMPONENT = Java.loadClass("net.minecraft.network.chat.Component");
var CYBERPUNK_RIPPERDOC_SESSION = Java.loadClass("com.edgerunner.content.ripperdoc.RipperdocSessionService");
var CYBERPUNK_SKELETON_RUNTIME = Java.loadClass("com.edgerunner.cyberware.SkeletonCyberwareRuntime");
var CYBERPUNK_CYBERWARE_SYNC_SERVICE = Java.loadClass("com.edgerunner.cyberware.CyberwareSyncService");
var CYBERPUNK_CYBERWARE_SCRIPT_BRIDGE = Java.loadClass("com.edgerunner.cyberware.CyberwareScriptBridge");

// ─── Utilities ───

function cyberpunkRunCommand(server, command) {
    var output = { ok: false, result: null, error: null };
    try {
        if (server && typeof server.runCommandSilent === "function") {
            output.result = server.runCommandSilent(command);
            output.ok = true;
        } else if (server && typeof server.runCommand === "function") {
            output.result = server.runCommand(command);
            output.ok = true;
        } else {
            output.error = "No runCommand API";
        }
    } catch (err) {
        output.ok = false;
        output.error = String(err);
        console.error("[Cyberpunk] Command failed: " + command + " | " + err);
    }
    return output;
}

function cyberpunkDebugLog(player, message) {
    if (!RIPPERDOC_DEBUG) return;
    console.info("[Cyberpunk][RipperDoc] " + message);
}

function cyberpunkPersistentHolder(player) {
    if (!player) {
        return null;
    }
    if (player.minecraftEntity && player.minecraftEntity.persistentData) {
        return player.minecraftEntity;
    }
    return player;
}

function cyberpunkBridgeSubject(player) {
    return player && player.minecraftEntity ? player.minecraftEntity : player;
}

function cyberpunkClearSavedRipperdocMenu(player) {
    try {
        if (CYBERPUNK_CYBERWARE_SCRIPT_BRIDGE.clearSavedRipperdocMenu(cyberpunkBridgeSubject(player))) {
            return;
        }
    } catch (errBridge) {
    }
    var holder = cyberpunkPersistentHolder(player);
    if (!holder || !holder.persistentData) {
        return;
    }
    try {
        if (typeof holder.persistentData.remove === "function") {
            holder.persistentData.remove("CyberpunkRipperdocGui");
            return;
        }
    } catch (errRemove) {
    }
    try {
        delete holder.persistentData["CyberpunkRipperdocGui"];
    } catch (errDelete) {
    }
}

function cyberpunkReadDebugStringValue(container, key) {
    if (!container || key === null || key === undefined) {
        return "";
    }
    try {
        if (typeof container.getString === "function") {
            return String(container.getString(String(key)) || "");
        }
    } catch (err) {
    }
    try {
        var value = container[String(key)];
        if (value !== undefined && value !== null) {
            return String(value);
        }
    } catch (err2) {
    }
    return "";
}

function cyberpunkReadDebugKeys(container) {
    if (!container) {
        return [];
    }
    try {
        if (typeof container.getAllKeys === "function") {
            var rawKeys = container.getAllKeys();
            var out = [];
            var iterator = rawKeys.iterator();
            while (iterator.hasNext()) {
                out.push(String(iterator.next() || ""));
            }
            return out;
        }
    } catch (err) {
    }
    try {
        return Object.keys(container);
    } catch (err2) {
    }
    return [];
}

function cyberpunkDescribeDebugMap(container) {
    var keys = cyberpunkReadDebugKeys(container).filter(function (key) {
        return String(key || "").length > 0;
    }).sort();
    var pairs = [];
    for (var i = 0; i < keys.length; i++) {
        var key = String(keys[i] || "");
        var value = cyberpunkReadDebugStringValue(container, key);
        if (!value || value === "minecraft:air") {
            continue;
        }
        pairs.push(key + ":" + value);
    }
    return "{" + pairs.join(",") + "}";
}

function cyberpunkDescribePersistentState(player) {
    var holder = cyberpunkPersistentHolder(player);
    if (!holder || !holder.persistentData) {
        return "persistent=<null>";
    }
    var persistent = holder.persistentData;
    var cyberware = persistent.cyberware || null;
    var root = null;
    try {
        root = persistent["CyberpunkRipperdocGui"] || null;
    } catch (err) {
    }
    var os = cyberware ? String(cyberware.installed_os || "") : "";
    var currentLoad = cyberware ? Number(cyberware.current_load || 0) : 0;
    var tracked = String(persistent.cyberware_granted_slot_powers || "");
    var joinLockUntil = cyberpunkToNumber(persistent.cyberware_join_lock_until || 0);
    var osLockUntil = cyberpunkToNumber(persistent.cyberware_os_lock_until || 0);
    var bodySlots = cyberware ? cyberpunkDescribeDebugMap(cyberware.installed_body_slots) : "{}";
    var physical = cyberware ? cyberpunkDescribeDebugMap(cyberware.installed_physical) : "{}";
    var activation = cyberware ? cyberpunkDescribeDebugMap(cyberware.installed_activation_slots) : "{}";
    var rootKeys = cyberpunkReadDebugKeys(root).sort().join(",");
    return "os=" + (os || "-")
        + " load=" + currentLoad
        + " body=" + bodySlots
        + " physical=" + physical
        + " activation=" + activation
        + " tracked=" + (tracked || "-")
        + " join_lock=" + joinLockUntil
        + " os_lock=" + osLockUntil
        + " root_keys=[" + rootKeys + "]";
}

function cyberpunkPlayerKey(player) {
    try {
        if (player && player.uuid) return String(player.uuid);
    } catch (err) {}
    return player ? String(player.username) : "";
}

function cyberpunkToNumber(value) {
    if (value === null || value === undefined) {
        return 0;
    }
    var numeric = Number(value);
    if (!isNaN(numeric)) {
        return numeric;
    }
    try {
        if (typeof value.longValue === "function") {
            var asLong = Number(value.longValue());
            if (!isNaN(asLong)) return asLong;
        }
    } catch (err) {
    }
    try {
        var parsed = parseInt(String(value), 10);
        if (!isNaN(parsed)) return parsed;
    } catch (err2) {
    }
    return 0;
}

function cyberpunkHasOpenGui(player) {
    if (!player) {
        return false;
    }
    try {
        return !!(player.containerMenu && player.inventoryMenu
            && player.containerMenu !== player.inventoryMenu);
    } catch (err) {
    }
    return false;
}

function cyberpunkScheduleRuntimeRefresh(player, delayTicks, options) {
    var key = cyberpunkPlayerKey(player);
    if (!key) {
        return;
    }
    cyberpunkRipperdocPendingRuntimeRefresh[key] = {
        ticks: Math.max(1, Math.floor(Number(delayTicks || 1))),
        options: options || null
    };
    cyberpunkDebugLog(player,
        "schedule-runtime-refresh key=" + key
        + " delay=" + cyberpunkRipperdocPendingRuntimeRefresh[key].ticks
        + " options=" + JSON.stringify(options || {})
        + " state=" + cyberpunkDescribePersistentState(player));
}

function cyberpunkProcessPendingRuntimeRefresh(player) {
    var key = cyberpunkPlayerKey(player);
    if (!key) {
        return;
    }
    var pending = cyberpunkRipperdocPendingRuntimeRefresh[key];
    if (!pending) {
        return;
    }
    if (cyberpunkHasOpenGui(player)) {
        cyberpunkDebugLog(player,
            "pending-runtime-refresh-wait key=" + key
            + " reason=gui_still_open state=" + cyberpunkDescribePersistentState(player));
        return;
    }

    var remaining = Math.max(0, Math.floor(Number(pending.ticks || 0)));
    if (remaining > 1) {
        pending.ticks = remaining - 1;
        cyberpunkDebugLog(player,
            "pending-runtime-refresh-countdown key=" + key
            + " remaining=" + pending.ticks
            + " state=" + cyberpunkDescribePersistentState(player));
        return;
    }

    delete cyberpunkRipperdocPendingRuntimeRefresh[key];
    cyberpunkDebugLog(player,
        "pending-runtime-refresh-fire key=" + key
        + " options=" + JSON.stringify(pending.options || {})
        + " state=" + cyberpunkDescribePersistentState(player));
    cyberpunkRefreshCyberwareRuntime(player, pending.options);
}

function cyberpunkRefreshCyberwareRuntime(player, options) {
    if (!player) {
        return;
    }
    var holder = cyberpunkPersistentHolder(player);
    try {
        var cyberware = cyberpunkInitCyberwareData(player);
        var armsItem = cyberpunkGetInstalledBodyItem(cyberware, "arms");
        var armsCfg = armsItem ? cyberpunkFindComponentConfig(armsItem) : null;
        var exclusivePowers = armsCfg && armsCfg.exclusive_palladium_powers ? armsCfg.exclusive_palladium_powers : [];
        var server = player.server || (player.minecraftEntity ? player.minecraftEntity.server : null);
        for (var ep = 0; ep < exclusivePowers.length; ep++) {
            cyberpunkRemovePower(server, player, String(exclusivePowers[ep] || ""));
        }
    } catch (errExclusive) {
        console.error("[Cyberpunk] Failed to clear exclusive arms powers: " + errExclusive);
    }
    try {
        if (global.recomputeCyberwareCapacityNow) {
            global.recomputeCyberwareCapacityNow(holder || player);
        }
    } catch (err) {
        console.error("[Cyberpunk] Failed to refresh cyberware capacity: " + err);
    }
    try {
        if (global.refreshCyberwarePowerVariantNow) {
            var refreshReason = options && options.reason
                ? String(options.reason)
                : "ripperdoc_close";
            var preferRecoveryFallback = options && options.preferRecoveryFallback !== undefined
                ? !!options.preferRecoveryFallback
                : true;
            cyberpunkDebugLog(player,
                "refresh-runtime-start reason=" + refreshReason
                + " prefer_recovery=" + preferRecoveryFallback
                + " gui_open=" + cyberpunkHasOpenGui(player)
                + " state=" + cyberpunkDescribePersistentState(player));
            global.refreshCyberwarePowerVariantNow(holder || player, {
                reason: refreshReason,
                preferRecoveryFallback: preferRecoveryFallback
            });
            cyberpunkDebugLog(player,
                "refresh-runtime-end reason=" + refreshReason
                + " state=" + cyberpunkDescribePersistentState(player));
        }
    } catch (err2) {
        console.error("[Cyberpunk] Failed to refresh cyberware power variant: " + err2);
    }
    try {
        var entity = player.minecraftEntity ? player.minecraftEntity : player;
        CYBERPUNK_CYBERWARE_SYNC_SERVICE.syncAfterCyberwareMutation(entity);
    } catch (err3) {
        console.error("[Cyberpunk] Failed to sync Java cyberware projections: " + err3);
    }
}

function cyberpunkHasPostFxLockTag(player) {
    if (!player) {
        return false;
    }
    try {
        if (typeof player.getTags === "function") {
            var tags = player.getTags();
            if (tags && typeof tags.contains === "function") {
                return tags.contains(RIPPERDOC_POSTFX_LOCK_TAG);
            }
        }
    } catch (err) {
    }
    try {
        if (player.tags && typeof player.tags.contains === "function") {
            return player.tags.contains(RIPPERDOC_POSTFX_LOCK_TAG);
        }
    } catch (err2) {
    }
    return false;
}

function cyberpunkReadPostFxLockUntil(player) {
    if (!player || !player.persistentData) {
        return 0;
    }
    try {
        if (typeof player.persistentData.getLong === "function") {
            return cyberpunkToNumber(player.persistentData.getLong(RIPPERDOC_POSTFX_LOCK_UNTIL_KEY) || 0);
        }
    } catch (err) {
    }
    try {
        return cyberpunkToNumber(player.persistentData[RIPPERDOC_POSTFX_LOCK_UNTIL_KEY] || 0);
    } catch (err2) {
    }
    return 0;
}

function cyberpunkClearPostFxLockUntil(player) {
    if (!player || !player.persistentData) {
        return;
    }
    try {
        if (typeof player.persistentData.remove === "function") {
            player.persistentData.remove(RIPPERDOC_POSTFX_LOCK_UNTIL_KEY);
        }
    } catch (err) {
    }
    try {
        player.persistentData[RIPPERDOC_POSTFX_LOCK_UNTIL_KEY] = 0;
    } catch (err2) {
    }
    try {
        if (typeof player.removeTag === "function") {
            player.removeTag(RIPPERDOC_POSTFX_LOCK_TAG);
        }
    } catch (err3) {
    }
}

// ─── Multiblock origin math ───

function cyberpunkGetMultiblockOrigin(pos, facing, partX, partY, partZ) {
    var ox = pos.x;
    var oy = pos.y - partY;
    var oz = pos.z;
    if (facing == "north")      { ox -= partX; }
    else if (facing == "south") { ox += partX; }
    else if (facing == "east")  { oz -= partX; }
    else if (facing == "west")  { oz += partX; }
    if (facing == "north")      { oz += partZ; }
    else if (facing == "south") { oz -= partZ; }
    else if (facing == "east")  { ox -= partZ; }
    else if (facing == "west")  { ox += partZ; }
    return { x: ox, y: oy, z: oz };
}

function cyberpunkGetPartWorldPos(origin, facing, lx, ly, lz) {
    var wx = origin.x;
    var wy = origin.y + ly;
    var wz = origin.z;
    if (facing == "north")      { wx += lx; }
    else if (facing == "south") { wx -= lx; }
    else if (facing == "east")  { wz += lx; }
    else if (facing == "west")  { wz -= lx; }
    if (facing == "north")      { wz -= lz; }
    else if (facing == "south") { wz += lz; }
    else if (facing == "east")  { wx += lz; }
    else if (facing == "west")  { wx -= lz; }
    return { x: wx, y: wy, z: wz };
}

function cyberpunkComputeLockStateFromBlock(block) {
    if (!block) return null;
    var facing = "north";
    var partX = 1, partY = 0, partZ = 1;
    try {
        if (block.properties) {
            if (block.properties.facing) facing = String(block.properties.facing);
            if (block.properties.part_x !== undefined) partX = Number(block.properties.part_x);
            if (block.properties.part_y !== undefined) partY = Number(block.properties.part_y);
            if (block.properties.part_z !== undefined) partZ = Number(block.properties.part_z);
        }
    } catch (err) {}
    var origin = cyberpunkGetMultiblockOrigin(
        { x: Number(block.x), y: Number(block.y), z: Number(block.z) },
        facing, partX, partY, partZ
    );
    var seat = cyberpunkGetPartWorldPos(origin, facing, 1, 0, 2);
    var look = cyberpunkGetPartWorldPos(origin, facing, 1, 0, 8);
    return {
        x: seat.x + 0.5, y: seat.y, z: seat.z + 0.5,
        lookX: look.x + 0.5, lookY: look.y + 0.5, lookZ: look.z + 0.5,
        facing: facing
    };
}

// ─── Player lock / nametag ───

// Native RipperdocSessionService owns position, lifecycle and nametag visibility.
// Legacy helper callers must never add a second teleport or mutate scoreboard teams.
function cyberpunkApplyPlayerLock(server, player, lockState, nowTick) {}
function cyberpunkSetPlayerHiddenName(server, player, hidden) {}

function cyberpunkApplyExitDebuffs(server, player) {
    if (!server || !player) return;
    var target = "@a[name=" + player.username + "]";
    cyberpunkRunCommand(
        server,
        "effect give " + target + " minecraft:darkness "
            + RIPPERDOC_EXIT_EFFECT_SECONDS + " "
            + RIPPERDOC_EXIT_EFFECT_AMPLIFIER + " true"
    );
    cyberpunkRunCommand(
        server,
        "effect give " + target + " minecraft:nausea "
            + RIPPERDOC_EXIT_EFFECT_SECONDS + " "
            + RIPPERDOC_EXIT_EFFECT_AMPLIFIER + " true"
    );
}

// ─── Animation ───

function cyberpunkPlaySitAnimation(server, player) {
    // Temporalmente desactivado por estabilidad/UX durante el rediseño del GUI.
    return;
}

function cyberpunkStopSitAnimation(server, player) {
    // Temporalmente desactivado por estabilidad/UX durante el rediseño del GUI.
    return;
}

// ─── Stand up (cleanup) ───

function cyberpunkStandUp(server, player) {
    CYBERPUNK_RIPPERDOC_SESSION.end(cyberpunkBridgeSubject(player), false);
    var key = cyberpunkPlayerKey(player);
    delete cyberpunkRipperdocPoseActive[key];
    delete cyberpunkRipperdocInstallSession[key];
    delete cyberpunkRipperdocLockState[key];
    delete cyberpunkRipperdocLastLockTick[key];
    delete cyberpunkRipperdocGuiWasOpen[key];
}

// ─── Cyberware install helpers ───

function cyberpunkInitCyberwareData(player) {
    try {
        var json = String(CYBERPUNK_CYBERWARE_SCRIPT_BRIDGE.toCyberwareJson(cyberpunkBridgeSubject(player)) || "");
        if (json) {
            var parsed = JSON.parse(json);
            if (parsed && typeof parsed === "object") {
                if (parsed.current_load === undefined || parsed.current_load === null) {
                    parsed.current_load = 0;
                }
                if (parsed.installed_os === undefined) {
                    parsed.installed_os = null;
                }
                parsed.installed_components = parsed.installed_components || {};
                parsed.installed_physical = parsed.installed_physical || {};
                parsed.installed_body_slots = parsed.installed_body_slots || {};
                parsed.installed_activation_slots = parsed.installed_activation_slots || {};
                parsed.installed = parsed.installed || {};
                return parsed;
            }
        }
    } catch (errBridge) {
    }

    var holder = cyberpunkPersistentHolder(player);
    if (!holder || !holder.persistentData) {
        return null;
    }
    if (!holder.persistentData.cyberware) {
        holder.persistentData.cyberware = {
            current_load: 0,
            installed_os: null,
            installed_components: {},
            installed_physical: {},
            installed_body_slots: {},
            installed_activation_slots: {}
        };
    }
    if (!holder.persistentData.cyberware.installed_components) {
        holder.persistentData.cyberware.installed_components = {};
    }
    if (!holder.persistentData.cyberware.installed_physical) {
        holder.persistentData.cyberware.installed_physical = {};
    }
    if (!holder.persistentData.cyberware.installed_body_slots) {
        holder.persistentData.cyberware.installed_body_slots = {};
    }
    if (!holder.persistentData.cyberware.installed_activation_slots) {
        holder.persistentData.cyberware.installed_activation_slots = {};
    }
    if (global.normalizeCyberwareInstalledData) {
        global.normalizeCyberwareInstalledData(holder);
    }
    return holder.persistentData.cyberware;
}

function cyberpunkCommitCyberwareData(player, cyberware) {
    if (!player || !cyberware) {
        return false;
    }
    try {
        var preciseLoad = Number(CYBERPUNK_CYBERWARE_SCRIPT_BRIDGE.calculateLoadTenthsFromJson(cyberpunkBridgeSubject(player), JSON.stringify(cyberware)));
        cyberware.current_load_tenths = Math.max(0, Math.round(preciseLoad));
        cyberware.current_load = Math.ceil(cyberware.current_load_tenths / 10);
        return Boolean(CYBERPUNK_CYBERWARE_SCRIPT_BRIDGE.replaceCyberwareJson(
            cyberpunkBridgeSubject(player),
            JSON.stringify(cyberware)
        ));
    } catch (err) {
        console.error("[Cyberpunk] Failed to commit cyberware data: " + err);
        return false;
    }
}

function cyberpunkPhysicalSlotKey(slotIndex) {
    return "slot_" + String(slotIndex);
}

function cyberpunkEnsureInstalledPhysical(cyberware) {
    if (!cyberware.installed_physical || typeof cyberware.installed_physical !== "object") {
        cyberware.installed_physical = {};
    }
    return cyberware.installed_physical;
}

function cyberpunkSetPhysicalSlot(cyberware, slotIndex, itemId) {
    if (!cyberware) {
        return;
    }
    var id = String(itemId || "");
    if (!id) {
        return;
    }
    var installedPhysical = cyberpunkEnsureInstalledPhysical(cyberware);
    installedPhysical[cyberpunkPhysicalSlotKey(slotIndex)] = id;
}

function cyberpunkClearPhysicalSlot(cyberware, slotIndex) {
    if (!cyberware || !cyberware.installed_physical || typeof cyberware.installed_physical !== "object") {
        return;
    }
    var key = cyberpunkPhysicalSlotKey(slotIndex);
    if (cyberware.installed_physical[key] !== undefined) {
        delete cyberware.installed_physical[key];
    }
}

function cyberpunkResolvePhysicalSlotForType(slotType) {
    var key = String(slotType || "").trim().toLowerCase();
    if (!key) {
        return -1;
    }
    if (global.resolveCyberwarePhysicalSlotForBodySlot) {
        return Number(global.resolveCyberwarePhysicalSlotForBodySlot(key));
    }
    return -1;
}

function cyberpunkEnsureInstalledBodySlots(cyberware) {
    if (!cyberware.installed_body_slots || typeof cyberware.installed_body_slots !== "object") {
        cyberware.installed_body_slots = {};
    }
    return cyberware.installed_body_slots;
}

function cyberpunkEnsureInstalledActivationSlots(cyberware) {
    if (!cyberware.installed_activation_slots || typeof cyberware.installed_activation_slots !== "object") {
        cyberware.installed_activation_slots = {};
    }
    return cyberware.installed_activation_slots;
}

function cyberpunkSetBodySlot(cyberware, bodySlot, itemId) {
    if (!cyberware) {
        return;
    }
    var key = String(bodySlot || "").trim().toLowerCase();
    var id = String(itemId || "");
    if (!key || !id) {
        return;
    }
    cyberpunkEnsureInstalledBodySlots(cyberware)[key] = id;
}

function cyberpunkClearBodySlot(cyberware, bodySlot) {
    if (!cyberware || !cyberware.installed_body_slots || typeof cyberware.installed_body_slots !== "object") {
        return;
    }
    var key = String(bodySlot || "").trim().toLowerCase();
    if (key && cyberware.installed_body_slots[key] !== undefined) {
        delete cyberware.installed_body_slots[key];
    }
}

function cyberpunkSetActivationSlot(cyberware, activationSlot, itemId) {
    if (!cyberware) {
        return;
    }
    var key = String(activationSlot || "").trim().toLowerCase();
    var id = String(itemId || "");
    if (!key || !id) {
        return;
    }
    cyberpunkEnsureInstalledActivationSlots(cyberware)[key] = id;
}

function cyberpunkClearActivationSlot(cyberware, activationSlot) {
    if (!cyberware || !cyberware.installed_activation_slots || typeof cyberware.installed_activation_slots !== "object") {
        return;
    }
    var key = String(activationSlot || "").trim().toLowerCase();
    if (key && cyberware.installed_activation_slots[key] !== undefined) {
        delete cyberware.installed_activation_slots[key];
    }
}

function cyberpunkGetInstalledBodyItem(cyberware, bodySlot) {
    if (!cyberware || !bodySlot) {
        return "";
    }
    if (String(bodySlot) === "os") {
        return String(cyberware.installed_os || "");
    }
    var bodySlots = cyberware.installed_body_slots || {};
    return String(bodySlots[String(bodySlot || "").trim().toLowerCase()] || "");
}

function cyberpunkGetInstalledPhysicalItem(cyberware, slotIndex) {
    if (!cyberware || !cyberware.installed_physical || typeof cyberware.installed_physical !== "object") {
        return "";
    }
    return String(cyberware.installed_physical[cyberpunkPhysicalSlotKey(slotIndex)] || "");
}

function cyberpunkGetInstalledSkeletonEntries(cyberware) {
    var entries = [];
    var slot7 = cyberpunkGetInstalledPhysicalItem(cyberware, 7);
    var slot8 = cyberpunkGetInstalledPhysicalItem(cyberware, 8);
    if (slot7) {
        entries.push({ slotIndex: 7, itemId: slot7 });
    }
    if (slot8 && slot8 !== slot7) {
        entries.push({ slotIndex: 8, itemId: slot8 });
    }
    if (!entries.length) {
        var bodySkeleton = cyberpunkGetInstalledBodyItem(cyberware, "skeleton");
        if (bodySkeleton) {
            entries.push({ slotIndex: 7, itemId: bodySkeleton });
        }
    }
    return entries;
}

function cyberpunkFindSkeletonPhysicalSlot(cyberware, itemId) {
    var target = String(itemId || "");
    var entries = cyberpunkGetInstalledSkeletonEntries(cyberware);
    for (var i = 0; i < entries.length; i++) {
        if (String(entries[i].itemId || "") === target) {
            return Number(entries[i].slotIndex || 7);
        }
    }
    return -1;
}

function cyberpunkFindEmptySkeletonPhysicalSlot(cyberware) {
    if (!cyberpunkGetInstalledPhysicalItem(cyberware, 7)) {
        return 7;
    }
    if (!cyberpunkGetInstalledPhysicalItem(cyberware, 8)) {
        return 8;
    }
    return -1;
}

function cyberpunkRefreshSkeletonBodySlot(cyberware) {
    var slot7 = cyberpunkGetInstalledPhysicalItem(cyberware, 7);
    var slot8 = cyberpunkGetInstalledPhysicalItem(cyberware, 8);
    if (slot7) {
        cyberpunkSetBodySlot(cyberware, "skeleton", slot7);
    } else if (slot8) {
        cyberpunkSetBodySlot(cyberware, "skeleton", slot8);
    } else {
        cyberpunkClearBodySlot(cyberware, "skeleton");
    }
}

function cyberpunkFindSkeletonInstallError(cyberware, itemId) {
    var skeletons = cyberpunkGetInstalledSkeletonEntries(cyberware);
    for (var i = 0; i < skeletons.length; i++) {
        var installedId = String(skeletons[i].itemId || "");
        if (installedId === String(itemId || "")) {
            return "message.project_edgerunner.install.skeleton_duplicate";
        }
        if (CYBERPUNK_SKELETON_RUNTIME.isHardIncompatible(String(itemId || ""), installedId)) {
            return String(CYBERPUNK_SKELETON_RUNTIME.getHardIncompatibilityMessage(String(itemId || ""), installedId));
        }
    }
    if (skeletons.length >= 2) {
        return "message.project_edgerunner.install.skeleton_full";
    }
    return "";
}

function cyberpunkMirrorLegacyComponentSlot(cyberware, legacySlotKey, itemId) {
    if (!cyberware || !legacySlotKey) {
        return;
    }
    if (!cyberware.installed_components || typeof cyberware.installed_components !== "object") {
        cyberware.installed_components = {};
    }
    var key = String(legacySlotKey || "").trim().toLowerCase();
    var id = String(itemId || "");
    if (!key) {
        return;
    }
    if (id) {
        cyberware.installed_components[key] = id;
        return;
    }
    if (cyberware.installed_components[key] !== undefined) {
        delete cyberware.installed_components[key];
    }
}

function cyberpunkGetAllOSConfigs() {
    if (global.getAllCyberwareInstallOsConfigs) {
        return global.getAllCyberwareInstallOsConfigs();
    }
    return [];
}

function cyberpunkGetAllComponentConfigs() {
    if (global.getAllCyberwareInstallComponentConfigs) {
        return global.getAllCyberwareInstallComponentConfigs();
    }
    return [];
}

function cyberpunkFindOSConfig(itemId) {
    if (global.getCyberwareInstallOsConfig) {
        return global.getCyberwareInstallOsConfig(itemId);
    }
    return null;
}

function cyberpunkFindComponentConfig(itemId) {
    if (global.getCyberwareInstallComponentConfig) {
        return global.getCyberwareInstallComponentConfig(itemId);
    }
    return null;
}

function cyberpunkIsInstallableItem(itemId) {
    return !!(cyberpunkFindOSConfig(itemId) || cyberpunkFindComponentConfig(itemId));
}

function cyberpunkGetAllInstallableItemIds() {
    if (global.getAllCyberwareInstallableItemIds) {
        return global.getAllCyberwareInstallableItemIds();
    }
    return [];
}

function cyberpunkPlayerHasItem(server, player, itemId) {
    if (!server || !player || !itemId) {
        return false;
    }
    var check = cyberpunkRunCommand(server, "clear @a[name=" + player.username + "] " + itemId + " 0");
    return !!(check && check.ok && Number(check.result || 0) > 0);
}

function cyberpunkResolveInstallCandidate(server, player, inputSlot) {
    // 1) Slot central (si en algún entorno permite insertar)
    try {
        if (inputSlot && inputSlot.item) {
            var slotId = String(inputSlot.item.id || "");
            if (slotId && slotId !== "minecraft:air" && cyberpunkIsInstallableItem(slotId)) {
                return slotId;
            }
        }
    } catch (err) {
    }

    // 2) Mano principal (rápido para el jugador)
    try {
        var handId = String(player.mainHandItem && player.mainHandItem.id ? player.mainHandItem.id : "");
        if (handId && handId !== "minecraft:air" && cyberpunkIsInstallableItem(handId) && cyberpunkPlayerHasItem(server, player, handId)) {
            return handId;
        }
    } catch (err) {
    }

    // 3) Primer cyberware encontrado en inventario
    var allIds = cyberpunkGetAllInstallableItemIds();
    for (var i = 0; i < allIds.length; i++) {
        var id = allIds[i];
        if (cyberpunkPlayerHasItem(server, player, id)) {
            return id;
        }
    }

    return "";
}

function cyberpunkGetMaxLoad(player, cyberwareData) {
    if (!cyberwareData) {
        return 0;
    }
    if (global.getCyberwareEffectiveMaxCapacity) {
        var effectiveCapacity = Number(global.getCyberwareEffectiveMaxCapacity(player, cyberwareData));
        if (Number.isFinite(effectiveCapacity) && effectiveCapacity > 0) {
            return Math.floor(effectiveCapacity);
        }
    }
    var fromPersistent = Number(cyberwareData.max_capacity || 0);
    if (Number.isFinite(fromPersistent) && fromPersistent > 0) {
        return Math.floor(fromPersistent);
    }
    return 260;
}

function cyberpunkConsumeInstallItem(server, player, inputSlot, itemId) {
    var consumed = false;
    try {
        if (inputSlot && inputSlot.item && String(inputSlot.item.id) === String(itemId)) {
            var currentCount = Number(inputSlot.item.count || 0);
            if (currentCount > 1) {
                inputSlot.item.count = currentCount - 1;
            } else {
                inputSlot.item = "minecraft:air";
            }
            consumed = true;
        }
    } catch (err) {
    }

    if (!consumed && server && player) {
        cyberpunkRunCommand(server, "clear @a[name=" + player.username + "] " + itemId + " 1");
    }
}

function cyberpunkContainerGetItem(container, slotIndex) {
    if (!container) {
        return null;
    }
    try {
        if (typeof container.getItem === "function") {
            return container.getItem(slotIndex);
        }
    } catch (err) {
    }
    try {
        if (typeof container.getStackInSlot === "function") {
            return container.getStackInSlot(slotIndex);
        }
    } catch (err) {
    }
    return null;
}

function cyberpunkContainerSetItem(container, slotIndex, stackObj) {
    if (!container) {
        return false;
    }
    try {
        if (typeof container.setItem === "function") {
            container.setItem(slotIndex, stackObj);
            return true;
        }
    } catch (err) {
    }
    try {
        if (typeof container.setStackInSlot === "function") {
            container.setStackInSlot(slotIndex, stackObj);
            return true;
        }
    } catch (err) {
    }
    return false;
}

function cyberpunkConsumeContainerSlot(container, slotIndex) {
    var current = cyberpunkContainerGetItem(container, slotIndex);
    var info = cyberpunkExtractStackInfo(current);
    if (!info.id || info.id === "minecraft:air" || info.count <= 0) {
        return false;
    }

    if (info.count > 1) {
        return cyberpunkContainerSetItem(container, slotIndex, Item.of(info.id, info.count - 1));
    }

    return cyberpunkContainerSetItem(container, slotIndex, Item.of("minecraft:air"));
}

function cyberpunkInstallFromItemId(server, player, inputSlot, itemId, skipConsume) {
    if (CYBERPUNK_CYBERWARE_SCRIPT_BRIDGE.isBanned(cyberpunkBridgeSubject(player), String(itemId))) {
        player.sendSystemMessage(Text.translate("message.project_edgerunner.cyberware.banned"));
        return false;
    }
    var cyberware = cyberpunkInitCyberwareData(player);
    if (!cyberware) {
        return false;
    }

    var osCfg = cyberpunkFindOSConfig(itemId);
    if (osCfg) {
        if (cyberware.installed_os) {
            player.sendSystemMessage(global.localizedCyberwareMessage("message.project_edgerunner.install.os_occupied", [], "red"));
            return false;
        }

        var osMaxLoad = cyberpunkGetMaxLoad(player, cyberware);
        var osCurrentLoad = Number(cyberware.current_load || 0);

        cyberware.installed_os = String(itemId);
        cyberpunkSetBodySlot(cyberware, "os", itemId);
        if (String(osCfg.activation_mode || "") === "manual" && osCfg.activation_slot) {
            cyberpunkSetActivationSlot(cyberware, osCfg.activation_slot, itemId);
        }

        cyberpunkSetPhysicalSlot(cyberware, 0, itemId);

        if (osCfg.palladium_power) {
            cyberpunkRunCommand(server, "superpower add " + osCfg.palladium_power + " " + player.username);
        }
        if (typeof osCfg.command === "function") {
            try {
                osCfg.command(player);
            } catch (err) {
                console.error("[Cyberpunk] OS command failed for " + itemId + ": " + err);
            }
        }

        if (!skipConsume) {
            cyberpunkConsumeInstallItem(server, player, inputSlot, itemId);
        }
        cyberpunkCommitCyberwareData(player, cyberware);
        cyberpunkClearSavedRipperdocMenu(player);
        if (global.normalizeCyberwareInstalledData) {
            global.normalizeCyberwareInstalledData(player);
        }
        cyberpunkRefreshCyberwareRuntime(player);
        player.sendSystemMessage(global.localizedCyberwareMessage("message.project_edgerunner.install.os_installed", [global.localizedCyberwareName(itemId, osCfg.name), String(cyberware.current_load_tenths / 10), String(osMaxLoad)], "green"));
        return true;
    }

    var compCfg = cyberpunkFindComponentConfig(itemId);
    if (!compCfg) {
        player.sendSystemMessage(global.localizedCyberwareMessage("message.project_edgerunner.install.not_installable", [], "red"));
        return false;
    }

    var bodySlot = String(compCfg.body_slot || "");
    if (!bodySlot) {
        player.sendSystemMessage(global.localizedCyberwareMessage("message.project_edgerunner.install.missing_body_slot", [], "red"));
        return false;
    }

    var installingSkeleton = bodySlot === "skeleton";
    if (installingSkeleton) {
        var skeletonError = cyberpunkFindSkeletonInstallError(cyberware, itemId);
        if (skeletonError) {
            player.sendSystemMessage(global.localizedCyberwareMessage(skeletonError, [], "red"));
            return false;
        }
    } else if (cyberpunkGetInstalledBodyItem(cyberware, bodySlot)) {
        player.sendSystemMessage(global.localizedCyberwareMessage("message.project_edgerunner.install.body_slot_occupied", [bodySlot], "red"));
        return false;
    }

    var maxLoad = cyberpunkGetMaxLoad(player, cyberware);
    var currentLoad = Number(cyberware.current_load || 0);

    if (installingSkeleton) {
        var skeletonSlot = cyberpunkFindEmptySkeletonPhysicalSlot(cyberware);
        if (skeletonSlot < 0) {
            player.sendSystemMessage(global.localizedCyberwareMessage("message.project_edgerunner.install.skeleton_full", [], "red"));
            return false;
        }
        cyberpunkSetPhysicalSlot(cyberware, skeletonSlot, itemId);
        cyberpunkRefreshSkeletonBodySlot(cyberware);
    } else {
        cyberpunkSetBodySlot(cyberware, bodySlot, itemId);
        cyberpunkMirrorLegacyComponentSlot(cyberware, compCfg.legacy_slot_key, itemId);
    }
    if (String(compCfg.activation_mode || "") === "manual" && compCfg.activation_slot) {
        cyberpunkSetActivationSlot(cyberware, compCfg.activation_slot, itemId);
    }
    if (!installingSkeleton) {
        var physicalSlot = cyberpunkResolvePhysicalSlotForType(bodySlot);
        if (physicalSlot >= 0) {
            cyberpunkSetPhysicalSlot(cyberware, physicalSlot, itemId);
        }
    }

    var exclusivePowers = compCfg.exclusive_palladium_powers || [];
    for (var ep = 0; ep < exclusivePowers.length; ep++) {
        cyberpunkRemovePower(server, player, String(exclusivePowers[ep] || ""));
    }

    if (compCfg.palladium_power) {
        cyberpunkRunCommand(server, "superpower add " + compCfg.palladium_power + " " + player.username);
    }

    if (!skipConsume) {
        cyberpunkConsumeInstallItem(server, player, inputSlot, itemId);
    }
    cyberpunkCommitCyberwareData(player, cyberware);
    cyberpunkClearSavedRipperdocMenu(player);
    if (global.normalizeCyberwareInstalledData) {
        global.normalizeCyberwareInstalledData(player);
    }
    cyberpunkRefreshCyberwareRuntime(player);
    player.sendSystemMessage((itemId === "project_edgerunner:mantis_blades" ? global.localizedCyberwareMessage("message.project_edgerunner.install.mantis_installed", [String(cyberware.current_load_tenths / 10), String(maxLoad)], "green") : global.localizedCyberwareMessage("message.project_edgerunner.install.installed", [global.localizedCyberwareName(itemId, compCfg.name), String(cyberware.current_load_tenths / 10), String(maxLoad)], "green")));
    return true;
}

function cyberpunkExtractStackInfo(stackObj) {
    if (!stackObj) {
        return { id: "", count: 0 };
    }
    var id = "";
    var count = 0;
    try {
        id = String(stackObj.id || "");
    } catch (err) {
    }
    try {
        count = Number(stackObj.count || 0);
    } catch (err) {
    }
    if (!id || id === "minecraft:air") {
        try {
            var wrapped = Item.of(stackObj);
            id = String(wrapped.id || "");
            count = Number(wrapped.count || count || 0);
        } catch (err) {
        }
    }
    return {
        id: id,
        count: Math.max(0, Math.floor(Number(count || 0)))
    };
}

function cyberpunkFinalizeInstallSession(server, player) {
    var key = cyberpunkPlayerKey(player);
    var session = key ? cyberpunkRipperdocInstallSession[key] : null;
    if (!session || !session.container) {
        return;
    }

    delete cyberpunkRipperdocInstallSession[key];

    var stack = null;
    try {
        stack = cyberpunkContainerGetItem(session.container, session.slotIndex);
    } catch (err) {
        return;
    }

    var info = cyberpunkExtractStackInfo(stack);
    if (!info.id || info.id === "minecraft:air" || info.count <= 0) {
        return;
    }

    if (!cyberpunkIsInstallableItem(info.id)) {
        player.sendSystemMessage(global.localizedCyberwareMessage("message.project_edgerunner.install.not_installable", [], "red"));
        return;
    }

    var installed = cyberpunkInstallFromItemId(server, player, null, info.id, true);
    if (installed) {
        cyberpunkConsumeContainerSlot(session.container, session.slotIndex);
    }
}

// ─── Open UI (Custom chest GUI) ───

function cyberpunkGetInstalledEntries(player) {
    var cyberware = cyberpunkInitCyberwareData(player);
    if (!cyberware) {
        return [];
    }

    var entries = [];
    if (cyberware.installed_os) {
        entries.push({
            slotType: "os",
            bodySlot: "os",
            itemId: String(cyberware.installed_os),
            isOs: true
        });
    }

    var installed = cyberware.installed_body_slots || {};
    var componentKeys = Object.keys(installed);
    for (var i = 0; i < componentKeys.length; i++) {
        var bodySlot = String(componentKeys[i] || "");
        var itemId = String(installed[bodySlot] || "");
        if (!bodySlot || !itemId || bodySlot === "os" || bodySlot === "supresors" || bodySlot === "skeleton") {
            continue;
        }
        entries.push({
            slotType: bodySlot,
            bodySlot: bodySlot,
            itemId: itemId,
            isOs: false
        });
    }

    var skeletonEntries = cyberpunkGetInstalledSkeletonEntries(cyberware);
    for (var s = 0; s < skeletonEntries.length; s++) {
        var skeletonItemId = String(skeletonEntries[s].itemId || "");
        if (!skeletonItemId) {
            continue;
        }
        entries.push({
            slotType: "skeleton",
            bodySlot: "skeleton",
            itemId: skeletonItemId,
            isOs: false
        });
    }

    return entries;
}

function cyberpunkRemovePower(server, player, powerId) {
    if (!server || !player || !powerId) {
        return;
    }
    cyberpunkRunCommand(server, "superpower remove " + powerId + " " + player.username);
}

function cyberpunkGiveItem(player, itemId) {
    if (!player || !itemId) {
        return;
    }
    try {
        player.give(Item.of(itemId));
    } catch (err) {
        console.error("[Cyberpunk] Failed to return item " + itemId + ": " + err);
    }
}

function cyberpunkUninstallComponent(server, player, bodySlot, itemId, notify) {
    var cyberware = cyberpunkInitCyberwareData(player);
    if (!cyberware) {
        return false;
    }

    var uninstallingSkeleton = String(bodySlot || "") === "skeleton";
    var skeletonPhysicalSlot = uninstallingSkeleton ? cyberpunkFindSkeletonPhysicalSlot(cyberware, itemId) : -1;
    var installedId = uninstallingSkeleton && skeletonPhysicalSlot >= 0
        ? String(itemId || "")
        : String(cyberpunkGetInstalledBodyItem(cyberware, bodySlot) || "");
    if (!installedId || installedId !== String(itemId)) {
        return false;
    }

    var compCfg = cyberpunkFindComponentConfig(installedId);
    if (compCfg && compCfg.palladium_power) {
        cyberpunkRemovePower(server, player, compCfg.palladium_power);
    }

    var currentLoad = Number(cyberware.current_load || 0);

    if (uninstallingSkeleton) {
        cyberpunkClearPhysicalSlot(cyberware, skeletonPhysicalSlot);
        cyberpunkRefreshSkeletonBodySlot(cyberware);
        cyberpunkMirrorLegacyComponentSlot(cyberware, "skeleton", "");
    } else {
        cyberpunkClearBodySlot(cyberware, bodySlot);
        cyberpunkMirrorLegacyComponentSlot(cyberware, compCfg && compCfg.legacy_slot_key ? compCfg.legacy_slot_key : "", "");
    }
    if (compCfg && compCfg.activation_slot) {
        cyberpunkClearActivationSlot(cyberware, compCfg.activation_slot);
    }
    if (!uninstallingSkeleton) {
        var physicalSlot = cyberpunkResolvePhysicalSlotForType(bodySlot);
        if (physicalSlot >= 0) {
            cyberpunkClearPhysicalSlot(cyberware, physicalSlot);
        }
    }

    cyberpunkGiveItem(player, installedId);
    cyberpunkCommitCyberwareData(player, cyberware);
    cyberpunkClearSavedRipperdocMenu(player);
    if (global.normalizeCyberwareInstalledData) {
        global.normalizeCyberwareInstalledData(player);
    }
    cyberpunkRefreshCyberwareRuntime(player);
    if (notify) {
        if (compCfg && compCfg.remove_message) {
            player.sendSystemMessage(global.localizedCyberwareMessage("message.project_edgerunner.install.removed", [global.localizedCyberwareName(installedId, compCfg.name)], "yellow"));
        } else {
            player.sendSystemMessage(global.localizedCyberwareMessage("message.project_edgerunner.install.removed_slot", [bodySlot], "yellow"));
        }
    }
    return true;
}

function cyberpunkUninstallAll(server, player, notify) {
    var cyberware = cyberpunkInitCyberwareData(player);
    if (!cyberware) {
        return false;
    }

    var changed = false;
    var installed = cyberware.installed_body_slots || {};
    var componentKeys = Object.keys(installed);
    for (var i = 0; i < componentKeys.length; i++) {
        var bodySlot = String(componentKeys[i] || "");
        var itemId = String(installed[bodySlot] || "");
        if (!bodySlot || !itemId || bodySlot === "os" || bodySlot === "supresors" || bodySlot === "skeleton") {
            continue;
        }
        if (cyberpunkUninstallComponent(server, player, bodySlot, itemId, false)) {
            changed = true;
        }
    }

    var skeletonEntries = cyberpunkGetInstalledSkeletonEntries(cyberware);
    for (var s = 0; s < skeletonEntries.length; s++) {
        if (cyberpunkUninstallComponent(server, player, "skeleton", skeletonEntries[s].itemId, false)) {
            changed = true;
        }
    }

    var osId = String(cyberware.installed_os || "");
    if (osId) {
        var osCfg = cyberpunkFindOSConfig(osId);
        if (osCfg && osCfg.palladium_power) {
            cyberpunkRemovePower(server, player, osCfg.palladium_power);
        }
        cyberpunkGiveItem(player, osId);
        cyberware.installed_os = null;
        cyberpunkClearBodySlot(cyberware, "os");
        if (osCfg && osCfg.activation_slot) {
            cyberpunkClearActivationSlot(cyberware, osCfg.activation_slot);
        }
        cyberpunkClearPhysicalSlot(cyberware, 0);
        changed = true;
    }

    cyberware.current_load = 0;
    cyberware.installed_components = {};
    cyberware.installed_physical = {};
    cyberware.installed_body_slots = {};
    cyberware.installed_activation_slots = {};
    cyberpunkCommitCyberwareData(player, cyberware);
    cyberpunkClearSavedRipperdocMenu(player);
    if (global.normalizeCyberwareInstalledData) {
        global.normalizeCyberwareInstalledData(player);
    }
    if (changed) {
        cyberpunkRefreshCyberwareRuntime(player);
    }

    if (notify) {
        if (changed) {
            player.sendSystemMessage(global.localizedCyberwareMessage("message.project_edgerunner.install.all_removed", [], "green"));
        } else {
            player.sendSystemMessage(global.localizedCyberwareMessage("message.project_edgerunner.install.none_installed", [], "gray"));
        }
    }

    return changed;
}

function cyberpunkTryOpenUninstallUI(server, player) {
    if (!player || typeof player.openChestGUI !== "function") {
        return false;
    }

    var entries = cyberpunkGetInstalledEntries(player);
    try {
        player.openChestGUI("§8RipperDoc • Uninstall", 3, function (gui) {
            gui.playerSlots = false;

            if (!entries.length) {
                gui.slot(4, 1, function (slot) {
                    slot.item = "minecraft:barrier";
                });
                return;
            }

            var maxDisplay = Math.min(entries.length, 7);
            for (var i = 0; i < maxDisplay; i++) {
                (function (entry, index) {
                    var itemX = index + 1;
                    var itemY = 1;
                    var ejectY = 2;

                    gui.slot(itemX, itemY, function (slot) {
                        slot.item = entry.itemId;
                    });

                    gui.slot(itemX, ejectY, function (slot) {
                        slot.item = "minecraft:shears";
                        slot.leftClicked = function () {
                            if (entry.isOs) {
                                cyberpunkUninstallAll(server, player, true);
                            } else {
                                cyberpunkUninstallComponent(server, player, entry.slotType, entry.itemId, true);
                            }
                            cyberpunkTryOpenUninstallUI(server, player);
                        };
                    });
                })(entries[i], i);
            }

            gui.slot(8, 1, function (slot) {
                slot.item = "minecraft:barrier";
                slot.leftClicked = function () {
                    cyberpunkUninstallAll(server, player, true);
                    cyberpunkTryOpenUninstallUI(server, player);
                };
            });
        });
        return true;
    } catch (err) {
        console.error("[Cyberpunk] Failed to open uninstall UI: " + err);
        return false;
    }
}

function cyberpunkTryOpenInstallUI(server, player) {
    if (!player || typeof player.openInventoryGUI !== "function") {
        return false;
    }
    try {
        // Usamos enderChestInventory (probado estable con openInventoryGUI en este pack).
        var container = player.enderChestInventory;
        if (!container) {
            player.sendSystemMessage(global.localizedCyberwareMessage("message.project_edgerunner.install.no_inventory", [], "red"));
            return false;
        }

        // Leer slot central para validar acceso y evitar crash posterior.
        cyberpunkContainerGetItem(container, RIPPERDOC_INSTALL_ENDER_SLOT);

        var key = cyberpunkPlayerKey(player);
        cyberpunkRipperdocInstallSession[key] = {
            container: container,
            slotIndex: RIPPERDOC_INSTALL_ENDER_SLOT,
            openedAt: Date.now()
        };
        player.openInventoryGUI(container, CYBERPUNK_COMPONENT.literal("RipperDoc - Install"));
        player.sendSystemMessage(global.localizedCyberwareMessage("message.project_edgerunner.install.installation_help", [], "yellow"));
        return true;
    } catch (err) {
        console.error("[Cyberpunk] Failed to open install inventory UI: " + err);
        return false;
    }
}

function cyberpunkTryOpenMainUI(server, player, sourceTag) {
    if (!server || !player) {
        return false;
    }
    try {
        var openCmd = "projectedgerunner ripperdoc " + player.username;
        var result = cyberpunkRunCommand(server, openCmd);
        if (!result || !result.ok) {
            return false;
        }
        cyberpunkDebugLog(player, sourceTag + " openUI ok");
        return true;
    } catch (err) {
        console.error("[Cyberpunk] Failed to open native RipperDoc UI: " + err);
        return false;
    }
}

// ─── Block right-click: sit + open GUI ───

BlockEvents.rightClicked(function (event) {
    if (!event.player || event.hand && String(event.hand) != "MAIN_HAND"
            || event.block.id != "project_edgerunner:ripperdoc") return;
    var subject = cyberpunkBridgeSubject(event.player);
    var bx = Number(event.block.x), by = Number(event.block.y), bz = Number(event.block.z);
    // Someone else is in the chair: they are vulnerable, the clicker operates on them with their own inventory.
    if (CYBERPUNK_RIPPERDOC_SESSION.tryOperate(subject, bx, by, bz)) { event.cancel(); return; }
    if (CYBERPUNK_RIPPERDOC_SESSION.isOccupiedByOther(subject, bx, by, bz)) {
        event.player.sendSystemMessage(CYBERPUNK_COMPONENT.translatable("gui.project_edgerunner.ripperdoc.chair_unavailable"));
        event.cancel();
        return;
    }
    if (!cyberpunkTryOpenMainUI(event.server, event.player, "block")) { event.cancel(); return; }
    var seated = CYBERPUNK_RIPPERDOC_SESSION.begin(cyberpunkBridgeSubject(event.player),
        Number(event.block.x), Number(event.block.y), Number(event.block.z));
    if (!seated) {
        cyberpunkBridgeSubject(event.player).closeContainer();
        event.player.sendSystemMessage(CYBERPUNK_COMPONENT.translatable("gui.project_edgerunner.ripperdoc.chair_unavailable"));
    }
    event.cancel();
});

// ─── Tick: lock position while GUI open + auto-stand when GUI closed ───

ServerEvents.tick(function (event) {
    var players = event.server && event.server.players ? event.server.players : [];
    for (var i = 0; i < players.length; i++) cyberpunkProcessPendingRuntimeRefresh(players[i]);
    // Native Forge tick keeps the chair lock through the menu and confirmed surgery.
});


