// priority: 20
// Server script: grant/remove pointer + mapped slot powers from slot registry.
(function () {
const ResourceLocation = Java.loadClass("net.minecraft.resources.ResourceLocation");
const PowerManager = Java.loadClass("net.threetag.palladium.power.PowerManager");
const SuperpowerUtil = Java.loadClass("net.threetag.palladium.power.SuperpowerUtil");
const ServerPlayer = Java.loadClass("net.minecraft.server.level.ServerPlayer");
const CyberwareSavedDataHydrator = Java.loadClass("com.edgerunner.cyberware.CyberwareSavedDataHydrator");
const CyberwareScriptBridge = Java.loadClass("com.edgerunner.cyberware.CyberwareScriptBridge");
const FaceOpticsPointerBridge = Java.loadClass("com.edgerunner.face.FaceOpticsPointerBridge");

const CYBERWARE_CORE_POWER_ID = "project_edgerunner:cyberware";
const CYBERWARE_CORE_POWER = new ResourceLocation("project_edgerunner", "cyberware");
const CYBERWARE_LEGACY_NAMESPACE = "cyberpunk";
const CYBERWARE_ACTIVE_NAMESPACE = "project_edgerunner";
const CYBERWARE_POWER_DEBUG = false;
const CYBERWARE_POWER_DEBUG_CHAT = false;
const CYBERWARE_RIPPERDOC_TRACE = false;
// Strict mode purges any mapped power not currently desired by slot data.
// Keep disabled to allow manual superpower grants for debugging/testing.
const CYBERWARE_PRUNE_ALL_MAPPED_POWERS = false;
const CYBERWARE_CORE_RUNTIME_KEY = "cyberware_core_runtime_granted";
const CYBERWARE_JOIN_LOCK_UNTIL_KEY = "cyberware_join_lock_until";
const CYBERWARE_RUNTIME_READY_OBJECTIVE = "er_cw_runtime_ready";
const CYBERWARE_OS_LOCK_UNTIL_KEY = "cyberware_os_lock_until";
const CYBERWARE_RUNTIME_ENTITY_MARKER_KEY = "cyberware_runtime_entity_marker";
const CYBERWARE_RUNTIME_ENTITY_SCAN_INTERVAL = 20;
const CYBERWARE_RECOVERY_DISABLED_SLOTS = {
    extra: true
};
const CYBERWARE_LOGIN_RETRY_REFRESH_STEPS = [
    { key: "cyberware_login_retry_2_at", delay: 2, reason: "login_2" },
    { key: "cyberware_login_retry_20_at", delay: 20, reason: "login_20" },
    { key: "cyberware_login_retry_80_at", delay: 80, reason: "login_80" }
];
var cyberwareRuntimeLocalTick = 0;

function cyberwareFail(message) {
    if (global.cyberwareFail) {
        global.cyberwareFail(message);
        return;
    }
    throw new Error("[Cyberpunk/Cyberware] " + message);
}

function normalizePowerId(powerId) {
    var text = String(powerId || "");
    var parts = text.split(":");
    if (parts.length !== 2) {
        return text;
    }
    if (parts[0] === CYBERWARE_LEGACY_NAMESPACE) {
        return CYBERWARE_ACTIVE_NAMESPACE + ":" + parts[1];
    }
    return text;
}

function normalizeInstalledItemId(itemId) {
    var text = String(itemId || "").trim().toLowerCase();
    if (!text || text === "minecraft:air") {
        return "";
    }
    if (text.indexOf(":") < 0) {
        return CYBERWARE_ACTIVE_NAMESPACE + ":" + text;
    }
    if (text.indexOf(CYBERWARE_LEGACY_NAMESPACE + ":") === 0) {
        return CYBERWARE_ACTIVE_NAMESPACE + ":" + text.substring(CYBERWARE_LEGACY_NAMESPACE.length + 1);
    }
    return text;
}

function buildInstalledItemLookupCandidates(itemId) {
    var out = [];
    var seen = {};

    function pushCandidate(raw) {
        var text = String(raw || "").trim().toLowerCase();
        if (!text || text === "minecraft:air" || seen[text]) {
            return;
        }
        seen[text] = true;
        out.push(text);
    }

    var original = String(itemId || "").trim().toLowerCase();
    pushCandidate(original);

    var normalized = normalizeInstalledItemId(original);
    pushCandidate(normalized);

    if (normalized.indexOf(CYBERWARE_ACTIVE_NAMESPACE + ":") === 0) {
        pushCandidate(CYBERWARE_LEGACY_NAMESPACE + ":" + normalized.substring(CYBERWARE_ACTIVE_NAMESPACE.length + 1));
    }
    if (original.indexOf(":") < 0 && original) {
        pushCandidate(CYBERWARE_LEGACY_NAMESPACE + ":" + original);
    }

    return out;
}

function resolveInstallOsConfig(itemId) {
    if (!global.getCyberwareInstallOsConfig) {
        return null;
    }
    var candidates = buildInstalledItemLookupCandidates(itemId);
    for (var i = 0; i < candidates.length; i++) {
        var config = global.getCyberwareInstallOsConfig(candidates[i]);
        if (config) {
            return config;
        }
    }
    return null;
}

function resolveInstallComponentConfig(itemId) {
    if (!global.getCyberwareInstallComponentConfig) {
        return null;
    }
    var candidates = buildInstalledItemLookupCandidates(itemId);
    for (var i = 0; i < candidates.length; i++) {
        var config = global.getCyberwareInstallComponentConfig(candidates[i]);
        if (config) {
            return config;
        }
    }
    return null;
}

function resolveSlotEntryConfig(slotId, itemId) {
    if (!global.getCyberwareSlotEntry) {
        return null;
    }
    var candidates = buildInstalledItemLookupCandidates(itemId);
    for (var i = 0; i < candidates.length; i++) {
        var entry = global.getCyberwareSlotEntry(slotId, candidates[i]);
        if (entry) {
            return entry;
        }
    }
    return null;
}

function toResourceLocation(powerId) {
    var normalized = normalizePowerId(powerId);
    var parts = String(normalized || "").split(":");
    if (parts.length !== 2) {
        cyberwareFail("Invalid power id '" + String(powerId) + "'");
    }
    return new ResourceLocation(parts[0], parts[1]);
}

function getPowerHolder(entity, powerId) {
    var level = entity && entity.level ? entity.level : null;
    if (!level) {
        return null;
    }
    var power = PowerManager.getInstance(level).getPower(toResourceLocation(powerId));
    if (!power) {
        return null;
    }
    var handlerOptional = PowerManager.getPowerHandler(entity);
    if (!handlerOptional || !handlerOptional.isPresent || !handlerOptional.isPresent()) {
        return null;
    }
    return handlerOptional.get().getPowerHolder(power);
}

function forceDisablePersistedSandevistan(player) {
    var entity = getEntity(player);
    var knownPowers = global.getCyberwareMappedPowers ? global.getCyberwareMappedPowers() : [];
    for (var i = 0; i < knownPowers.length; i++) {
        var holder = getPowerHolder(entity, normalizePowerId(knownPowers[i]));
        if (!holder || !holder.getAbilities) {
            continue;
        }
        var abilities = holder.getAbilities();
        if (!abilities) {
            continue;
        }
        var ability = abilities.get("Sandevistan");
        if (!ability || !ability.isEnabled || !ability.isEnabled()) {
            continue;
        }
        ability.keyPressed(entity, true);
        ability.keyPressed(entity, false);
    }
}

function getEntity(player) {
    return player.minecraftEntity ? player.minecraftEntity : player;
}

function getPersistentTag(player) {
    var entity = getEntity(player);
    try {
        if (entity && typeof entity.getPersistentData === "function") {
            return entity.getPersistentData();
        }
    } catch (errEntityMethod) {
    }
    try {
        if (entity && entity.persistentData) {
            return entity.persistentData;
        }
    } catch (errEntityField) {
    }
    try {
        if (player && typeof player.getPersistentData === "function") {
            return player.getPersistentData();
        }
    } catch (errPlayerMethod) {
    }
    try {
        if (player && player.persistentData) {
            return player.persistentData;
        }
    } catch (errPlayerField) {
    }
    return null;
}

function hydrateSavedCyberwareIfNeeded(player) {
    var entity = getEntity(player);
    if (!entity || !(entity instanceof ServerPlayer)) {
        return;
    }
    try {
        CyberwareSavedDataHydrator.hydrateFromSavedMenuIfNeeded(entity);
    } catch (errHydrate) {
        debugPower(player, "hydrate-saved-menu-error " + String(errHydrate));
    }
}

function getPersistentHolder(player) {
    var entity = getEntity(player);
    var persistentTag = getPersistentTag(player);
    if (!persistentTag) {
        if (entity && entity.persistentData) {
            return entity;
        }
        if (player && player.persistentData) {
            return player;
        }
        return null;
    }
    return {
        minecraftEntity: entity,
        persistentData: persistentTag
    };
}

function getBridgeSubject(player) {
    return getEntity(player);
}

function getCyberDataFromBridge(player) {
    try {
        var json = String(CyberwareScriptBridge.toCyberwareJson(getBridgeSubject(player)) || "");
        if (!json) {
            return null;
        }
        var parsed = JSON.parse(json);
        return parsed && typeof parsed === "object" ? parsed : null;
    } catch (err) {
        return null;
    }
}

function readPersistentStringValue(player, key) {
    try {
        return String(CyberwareScriptBridge.getPersistentString(getBridgeSubject(player), String(key || "")) || "");
    } catch (errBridge) {
    }
    var holder = getPersistentHolder(player);
    return holder && holder.persistentData ? String(holder.persistentData[String(key || "")] || "") : "";
}

function writePersistentStringValue(player, key, value) {
    var textKey = String(key || "");
    if (!textKey) {
        return;
    }
    try {
        CyberwareScriptBridge.putPersistentString(getBridgeSubject(player), textKey, String(value || ""));
        return;
    } catch (errBridge) {
    }
    var holder = getPersistentHolder(player);
    if (holder && holder.persistentData) {
        holder.persistentData[textKey] = String(value || "");
    }
}

function readPersistentIntValue(player, key) {
    try {
        return Math.floor(Number(CyberwareScriptBridge.getPersistentInt(getBridgeSubject(player), String(key || "")) || 0));
    } catch (errBridge) {
    }
    var holder = getPersistentHolder(player);
    return holder && holder.persistentData ? Math.floor(Number(holder.persistentData[String(key || "")] || 0)) : 0;
}

function writePersistentIntValue(player, key, value) {
    var textKey = String(key || "");
    if (!textKey) {
        return;
    }
    var normalized = Math.floor(Number(value || 0));
    try {
        CyberwareScriptBridge.putPersistentInt(getBridgeSubject(player), textKey, normalized);
        return;
    } catch (errBridge) {
    }
    var holder = getPersistentHolder(player);
    if (holder && holder.persistentData) {
        holder.persistentData[textKey] = normalized;
    }
}

function readPersistentLongValue(player, key) {
    try {
        return Number(CyberwareScriptBridge.getPersistentLong(getBridgeSubject(player), String(key || "")) || 0);
    } catch (errBridge) {
    }
    var holder = getPersistentHolder(player);
    return holder && holder.persistentData ? Number(holder.persistentData[String(key || "")] || 0) : 0;
}

function writePersistentLongValue(player, key, value) {
    var textKey = String(key || "");
    if (!textKey) {
        return;
    }
    var normalized = Math.floor(Number(value || 0));
    try {
        CyberwareScriptBridge.putPersistentLong(getBridgeSubject(player), textKey, normalized);
        return;
    } catch (errBridge) {
    }
    var holder = getPersistentHolder(player);
    if (holder && holder.persistentData) {
        holder.persistentData[textKey] = normalized;
    }
}

function debugPower(player, message) {
    if (!CYBERWARE_POWER_DEBUG) {
        return;
    }
    var entity = getEntity(player);
    var tick = resolvePlayerGameTime(entity);
    if (!isFinite(tick) || tick < 0) {
        tick = Number(cyberwareRuntimeLocalTick || 0);
    }
    var playerName = "unknown";
    if (player && player.username) {
        playerName = String(player.username);
    } else if (entity && typeof entity.getScoreboardName === "function") {
        playerName = String(entity.getScoreboardName());
    }
    var line = "[Cyberpunk/Cyberware/PowerVariant] t=" + tick + " p=" + playerName + " | " + String(message || "");
    console.info(line);
    if (!CYBERWARE_POWER_DEBUG_CHAT) {
        return;
    }
    try {
        if (player && typeof player.sendSystemMessage === "function") {
            player.sendSystemMessage(line);
        }
    } catch (err) {
    }
}

function shouldTraceCyberwareReason(reason) {
    if (!CYBERWARE_RIPPERDOC_TRACE) {
        return false;
    }
    var text = String(reason || "");
    return text.indexOf("ripperdoc") === 0 || text.indexOf("login_") === 0;
}

function traceCyberware(player, reason, message) {
    if (!shouldTraceCyberwareReason(reason)) {
        return;
    }
    var entity = getEntity(player);
    var tick = resolvePlayerGameTime(entity);
    if (!isFinite(tick) || tick < 0) {
        tick = Number(cyberwareRuntimeLocalTick || 0);
    }
    var playerName = "unknown";
    if (player && player.username) {
        playerName = String(player.username);
    } else if (entity && typeof entity.getScoreboardName === "function") {
        playerName = String(entity.getScoreboardName());
    }
    console.info(
        "[Cyberpunk/Cyberware/Trace] t=" + tick
        + " p=" + playerName
        + " reason=" + String(reason || "manual")
        + " | " + String(message || "")
    );
}

function getCyberData(player) {
    hydrateSavedCyberwareIfNeeded(player);
    var javaCyber = getCyberDataFromBridge(player);
    if (javaCyber) {
        return javaCyber;
    }
    var holder = getPersistentHolder(player);
    if (!holder || !holder.persistentData) {
        return null;
    }
    if (global.normalizeCyberwareInstalledData) {
        global.normalizeCyberwareInstalledData(holder);
    }
    return holder.persistentData.cyberware || null;
}

function readPhysicalValue(physical, key) {
    if (!physical) {
        return "";
    }
    try {
        return String(physical.getString(String(key)) || "");
    } catch (err) {
    }
    try {
        if (physical[key] !== undefined && physical[key] !== null) {
            return String(physical[key]);
        }
    } catch (err2) {
    }
    try {
        var value = physical.get(String(key));
        if (value !== undefined && value !== null) {
            return String(value);
        }
    } catch (err3) {
    }
    return "";
}

function getPhysicalKeys(physical) {
    if (!physical) {
        return [];
    }
    try {
        var rawKeys = physical.getAllKeys();
        var out = [];
        var iterator = rawKeys.iterator();
        while (iterator.hasNext()) {
            out.push(String(iterator.next() || ""));
        }
        return out;
    } catch (err) {
    }
    try {
        return Object.keys(physical);
    } catch (err2) {
    }
    return [];
}

function getInstalledComponentKeys(installed) {
    if (!installed) {
        return [];
    }
    try {
        return Object.keys(installed);
    } catch (err) {
    }
    try {
        var rawKeys = installed.getAllKeys();
        var out = [];
        var iterator = rawKeys.iterator();
        while (iterator.hasNext()) {
            out.push(String(iterator.next() || ""));
        }
        return out;
    } catch (err2) {
    }
    return [];
}

function getInstalledPhysicalItems(player) {
    var cyber = getCyberData(player);
    if (!cyber) {
        return [];
    }
    var set = {};
    var physical = cyber.installed_physical;
    if (physical) {
        var physicalKeys = getPhysicalKeys(physical);
        for (var i = 0; i < physicalKeys.length; i++) {
            var physicalId = readPhysicalValue(physical, String(physicalKeys[i] || ""));
            if (!physicalId || physicalId === "minecraft:air") {
                continue;
            }
            set[physicalId] = true;
        }
    }
    var bodySlots = cyber.installed_body_slots || {};
    var bodyKeys = getInstalledComponentKeys(bodySlots);
    for (var b = 0; b < bodyKeys.length; b++) {
        var bodyItem = readPhysicalValue(bodySlots, String(bodyKeys[b] || ""));
        if (!bodyItem || bodyItem === "minecraft:air") {
            continue;
        }
        set[bodyItem] = true;
    }
    var activationSlots = cyber.installed_activation_slots || {};
    var activationKeys = getInstalledComponentKeys(activationSlots);
    for (var a = 0; a < activationKeys.length; a++) {
        var activationItem = readPhysicalValue(activationSlots, String(activationKeys[a] || ""));
        if (!activationItem || activationItem === "minecraft:air") {
            continue;
        }
        set[activationItem] = true;
    }
    var legacyInstalled = cyber.installed || {};
    var legacyKeys = getInstalledComponentKeys(legacyInstalled);
    for (var l = 0; l < legacyKeys.length; l++) {
        var legacyItem = readPhysicalValue(legacyInstalled, String(legacyKeys[l] || ""));
        if (!legacyItem || legacyItem === "minecraft:air") {
            continue;
        }
        set[legacyItem] = true;
    }
    var osId = cyber.installed_os ? String(cyber.installed_os) : "";
    if (osId) {
        set[osId] = true;
    }
    if (Object.keys(set).length > 0) {
        return Object.keys(set);
    }

    // Legacy fallback for saves/scripts that still only store logical slots.
    var installed = cyber.installed_components || {};
    var keys = Object.keys(installed);
    for (var k = 0; k < keys.length; k++) {
        var itemId = String(installed[keys[k]] || "");
        if (!itemId || itemId === "minecraft:air") {
            continue;
        }
        set[itemId] = true;
    }
    return Object.keys(set);
}

function getInstalledItemForSlot(player, slotId) {
    var cyber = getCyberData(player);
    if (!cyber) {
        return "";
    }
    if (global.getCyberwareInstalledItemByActivationSlot) {
        var activationItem = String(global.getCyberwareInstalledItemByActivationSlot(player, slotId) || "");
        if (activationItem) {
            return activationItem;
        }
    }
    if (slotId === "os") {
        return cyber.installed_os ? String(cyber.installed_os) : "";
    }
    var installed = cyber.installed_components;
    if (!installed) {
        return "";
    }
    var item = readPhysicalValue(installed, slotId);
    if (item) {
        return String(item);
    }
    if (slotId !== "extra") {
        return "";
    }
    var physical = cyber.installed_physical;
    if (!physical) {
        return "";
    }
    var slot19 = readPhysicalValue(physical, "slot_19");
    if (!slot19) {
        slot19 = readPhysicalValue(physical, "19");
    }
    return slot19 && slot19 !== "minecraft:air" ? slot19 : "";
}

function hasOsInstalled(player) {
    if (global.getCyberwareInstalledItemByBodySlot) {
        return String(global.getCyberwareInstalledItemByBodySlot(player, "os") || "").length > 0;
    }
    return getInstalledItemForSlot(player, "os").length > 0;
}

function hasAnyCyberwareInstalled(player) {
    if (getInstalledPhysicalItems(player).length > 0) {
        return true;
    }
    var slotIds = getSlotIds();
    for (var i = 0; i < slotIds.length; i++) {
        var installedItem = getInstalledItemForSlot(player, slotIds[i]);
        if (installedItem && installedItem !== "minecraft:air") {
            return true;
        }
    }
    return false;
}

function debugMarkerChanged(player, key, marker) {
    if (!CYBERWARE_POWER_DEBUG) {
        return false;
    }
    var textKey = String(key || "");
    var textMarker = String(marker || "");
    if (!textKey) {
        return true;
    }
    if (readPersistentStringValue(player, textKey) === textMarker) {
        return false;
    }
    writePersistentStringValue(player, textKey, textMarker);
    return true;
}

function getSlotIds() {
    return global.CYBERWARE_SLOT_IDS || ["os", "arms", "face", "circulatory", "extra"];
}

function isRecoveryDisabledForSlot(slotId) {
    return !!CYBERWARE_RECOVERY_DISABLED_SLOTS[String(slotId || "")];
}

function clearDebugPersistentMarkers(player) {
    if (CYBERWARE_POWER_DEBUG) {
        return;
    }

    var staticKeys = [
        "cyberware_dbg_keep_core_marker",
        "cyberware_dbg_power_variant_marker",
        "cyberware_dbg_power_variant_error",
        "cyberware_dbg_join_pointer_error",
        "cyberware_dbg_join_legs_error",
        "cyberware_dbg_icon_sync_error",
        "cyberware_dbg_login_icon_error"
    ];
    for (var i = 0; i < staticKeys.length; i++) {
        writePersistentStringValue(player, staticKeys[i], "");
    }

    var slotIds = getSlotIds();
    for (var s = 0; s < slotIds.length; s++) {
        var slotId = slotIds[s];
        writePersistentStringValue(player, "cyberware_dbg_icon_" + slotId, "");
        writePersistentStringValue(player, "cyberware_dbg_slot_missing_" + slotId, "");
        writePersistentStringValue(player, "cyberware_dbg_slot_fallback_" + slotId, "");
    }
}

function getOwnedSlotEntryFallback(player, slotId) {
    var entity = getEntity(player);
    var slotConfigs = global.CYBERWARE_SLOT_CONFIGS || {};
    var entries = slotConfigs[slotId] || [];
    for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        if (!entry || !entry.power) {
            continue;
        }
        if (getPowerHolder(entity, String(entry.power))) {
            return entry;
        }
    }

    if (slotId !== "os") {
        return null;
    }
    if (!getInstalledItemForSlot(player, "os")) {
        return null;
    }

    var variants = global.SANDEVISTAN_VARIANTS || [];
    for (var v = 0; v < variants.length; v++) {
        var variant = variants[v];
        if (!variant) {
            continue;
        }
        var variantPower = normalizePowerId(variant.powerId);
        if (!variantPower || !getPowerHolder(entity, variantPower)) {
            continue;
        }
        return {
            item: String(variant.itemId || variantPower),
            power: variantPower,
            ability: "Sandevistan",
            cooldown_ticks: 0,
            icon_index: v + 1,
            icon_alias: String(variant.id || "sandevistan").replace(/^sandevistan_/, "") || "sandevistan",
            _source: "owned_power_variant"
        };
    }

    var mapped = global.getCyberwareMappedPowers ? global.getCyberwareMappedPowers() : [];
    for (var m = 0; m < mapped.length; m++) {
        var mappedPower = normalizePowerId(mapped[m]);
        if (!mappedPower || mappedPower.indexOf("project_edgerunner:sandevistan_") !== 0) {
            continue;
        }
        if (!getPowerHolder(entity, mappedPower)) {
            continue;
        }
        return {
            item: mappedPower,
            power: mappedPower,
            ability: "Sandevistan",
            cooldown_ticks: 0,
            icon_index: 1,
            icon_alias: "sandevistan",
            _source: "owned_power_mapped"
        };
    }

    return null;
}

function getTrackedSlotEntryFallback(player, slotId) {
    if (isRecoveryDisabledForSlot(slotId)) {
        return null;
    }
    var trackedPowers = readTrackedSlotPowers(player);
    if (!trackedPowers || trackedPowers.length === 0) {
        return null;
    }

    var trackedSet = {};
    for (var t = 0; t < trackedPowers.length; t++) {
        trackedSet[normalizePowerId(trackedPowers[t])] = true;
    }

    var slotConfigs = global.CYBERWARE_SLOT_CONFIGS || {};
    var entries = slotConfigs[slotId] || [];
    for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        if (!entry || !entry.power) {
            continue;
        }
        if (!trackedSet[normalizePowerId(entry.power)]) {
            continue;
        }
        var fallback = {};
        for (var key in entry) {
            if (Object.prototype.hasOwnProperty.call(entry, key)) {
                fallback[key] = entry[key];
            }
        }
        fallback._source = "tracked_power";
        return fallback;
    }

    if (slotId !== "os") {
        return null;
    }

    var variants = global.SANDEVISTAN_VARIANTS || [];
    for (var v = 0; v < variants.length; v++) {
        var variant = variants[v];
        if (!variant) {
            continue;
        }
        var variantPower = normalizePowerId(variant.powerId);
        if (!variantPower || !trackedSet[variantPower]) {
            continue;
        }
        return {
            item: String(variant.itemId || variantPower),
            power: variantPower,
            ability: "Sandevistan",
            cooldown_ticks: 0,
            icon_index: v + 1,
            icon_alias: String(variant.id || "sandevistan").replace(/^sandevistan_/, "") || "sandevistan",
            _source: "tracked_power_variant"
        };
    }

    for (var p = 0; p < trackedPowers.length; p++) {
        var mappedPower = normalizePowerId(trackedPowers[p]);
        if (!mappedPower || mappedPower.indexOf("project_edgerunner:sandevistan_") !== 0) {
            continue;
        }
        return {
            item: mappedPower,
            power: mappedPower,
            ability: "Sandevistan",
            cooldown_ticks: 0,
            icon_index: 1,
            icon_alias: "sandevistan",
            _source: "tracked_power_mapped"
        };
    }

    return null;
}

function getRecoverySlotEntry(player, slotId) {
    return getTrackedSlotEntryFallback(player, slotId);
}

function hasAnyOwnedSlotPower(player) {
    var slotIds = getSlotIds();
    for (var i = 0; i < slotIds.length; i++) {
        if (getOwnedSlotEntryFallback(player, slotIds[i]) || getTrackedSlotEntryFallback(player, slotIds[i])) {
            return true;
        }
    }
    return false;
}

function getOwnedMappedPowerIds(player) {
    var entity = getEntity(player);
    var mappedPowers = global.getCyberwareMappedPowers ? global.getCyberwareMappedPowers() : [];
    var out = [];
    var seen = {};
    for (var i = 0; i < mappedPowers.length; i++) {
        var powerId = normalizePowerId(mappedPowers[i]);
        if (!powerId || seen[powerId]) {
            continue;
        }
        var powerKey = toResourceLocation(powerId);
        if (SuperpowerUtil.hasSuperpower(entity, powerKey)) {
            seen[powerId] = true;
            out.push(powerId);
        }
    }
    return out;
}

function getSlotEntry(player, slotId, allowRecoveryFallback) {
    var allowRecovery = allowRecoveryFallback !== false;
    var itemId = getInstalledItemForSlot(player, slotId);
    if (itemId && global.getCyberwareSlotEntry) {
        var entry = resolveSlotEntryConfig(slotId, itemId);
        if (entry) {
            return entry;
        }
        if (debugMarkerChanged(player, "cyberware_dbg_slot_missing_" + slotId, slotId + "|" + itemId)) {
            debugPower(player, "slot-entry-missing slot=" + slotId + " item=" + itemId);
        }
    }

    if (!allowRecovery) {
        return null;
    }

    var fallback = getRecoverySlotEntry(player, slotId);
    if (fallback && debugMarkerChanged(
        player,
        "cyberware_dbg_slot_fallback_" + slotId,
        slotId + "|" + String(fallback.power || "") + "|" + String(fallback.ability || "")
    )) {
        debugPower(
            player,
            "slot-entry-fallback slot=" + slotId
            + " power=" + String(fallback.power || "")
            + " ability=" + String(fallback.ability || "")
            + " source=" + String(fallback._source || "owned_power")
        );
    }
    return fallback;
}

function getDesiredSlotPowerIds(player, allowRecoveryFallback) {
    var set = {};
    var slotIds = getSlotIds();
    for (var i = 0; i < slotIds.length; i++) {
        var entry = getSlotEntry(player, slotIds[i], allowRecoveryFallback);
        if (entry && entry.power) {
            set[normalizePowerId(entry.power)] = true;
        }
    }
    return Object.keys(set);
}

function getDesiredComponentPowerIds(player) {
    var installedItems = getInstalledPhysicalItems(player);
    if (installedItems.length === 0) {
        return [];
    }
    var set = {};
    for (var i = 0; i < installedItems.length; i++) {
        var itemId = String(installedItems[i] || "");
        if (!itemId || itemId === "minecraft:air") {
            continue;
        }

        var osConfig = resolveInstallOsConfig(itemId);
        if (osConfig && osConfig.palladium_power) {
            set[normalizePowerId(osConfig.palladium_power)] = true;
            continue;
        }

        var installConfig = resolveInstallComponentConfig(itemId);
        if (installConfig && installConfig.palladium_power) {
            set[normalizePowerId(installConfig.palladium_power)] = true;
            continue;
        }

        // Fallback for entries that exist only in slot registry data.
        var installSlotType = installConfig && installConfig.activation_slot ? String(installConfig.activation_slot) : "";
        if (global.getCyberwareSlotEntry && installSlotType && getSlotIds().indexOf(installSlotType) >= 0) {
            var slotEntry = resolveSlotEntryConfig(installSlotType, itemId);
            if (slotEntry && slotEntry.power) {
                set[normalizePowerId(slotEntry.power)] = true;
                continue;
            }
        }

        if (global.getCyberwareSlotEntry) {
            var slotIds = getSlotIds();
            for (var s = 0; s < slotIds.length; s++) {
                var fallbackEntry = resolveSlotEntryConfig(slotIds[s], itemId);
                if (fallbackEntry && fallbackEntry.power) {
                    set[normalizePowerId(fallbackEntry.power)] = true;
                    break;
                }
            }
        }
    }
    return Object.keys(set);
}

function resolveInstallComponentConfigByPower(powerId) {
    if (!powerId || !global.CYBERWARE_INSTALL_CONFIG || !global.CYBERWARE_INSTALL_CONFIG.components) {
        return null;
    }
    var normalized = normalizePowerId(powerId);
    var keys = Object.keys(global.CYBERWARE_INSTALL_CONFIG.components);
    for (var i = 0; i < keys.length; i++) {
        var entry = global.CYBERWARE_INSTALL_CONFIG.components[keys[i]];
        if (entry && entry.palladium_power && normalizePowerId(entry.palladium_power) === normalized) {
            return entry;
        }
    }
    return null;
}

function getDesiredExclusivePowerIds(player) {
    var installedItems = getInstalledPhysicalItems(player);
    var set = {};
    for (var i = 0; i < installedItems.length; i++) {
        var itemId = String(installedItems[i] || "");
        if (!itemId || itemId === "minecraft:air") {
            continue;
        }
        var installConfig = resolveInstallComponentConfig(itemId);
        var exclusivePowers = installConfig && installConfig.exclusive_palladium_powers
            ? installConfig.exclusive_palladium_powers
            : [];
        for (var ep = 0; ep < exclusivePowers.length; ep++) {
            var powerId = normalizePowerId(exclusivePowers[ep]);
            if (powerId) {
                set[powerId] = true;
            }
        }
    }

    if (Object.keys(set).length === 0) {
        // Slot-power fallback for early login hydration.
        var slotPowers = getDesiredSlotPowerIds(player, true);
        for (var sp = 0; sp < slotPowers.length; sp++) {
            var slotPower = slotPowers[sp];
            var slotConfig = resolveInstallComponentConfigByPower(slotPower);
            var slotExclusive = slotConfig && slotConfig.exclusive_palladium_powers
                ? slotConfig.exclusive_palladium_powers
                : [];
            for (var sep = 0; sep < slotExclusive.length; sep++) {
                var slotPowerId = normalizePowerId(slotExclusive[sep]);
                if (slotPowerId) {
                    set[slotPowerId] = true;
                }
            }
        }
    }
    return Object.keys(set);
}

function getCurrentSlotExclusivePowerIds(player) {
    var set = {};
    var slotIds = getSlotIds();
    for (var i = 0; i < slotIds.length; i++) {
        var itemId = getInstalledItemForSlot(player, slotIds[i]);
        if (!itemId || itemId === "minecraft:air") {
            continue;
        }
        var installConfig = resolveInstallComponentConfig(itemId);
        var exclusivePowers = installConfig && installConfig.exclusive_palladium_powers
            ? installConfig.exclusive_palladium_powers
            : [];
        for (var ep = 0; ep < exclusivePowers.length; ep++) {
            var powerId = normalizePowerId(exclusivePowers[ep]);
            if (powerId) {
                set[powerId] = true;
            }
        }
    }
    return Object.keys(set);
}

function readTrackedSlotPowers(player) {
    var raw = readPersistentStringValue(player, "cyberware_granted_slot_powers");
    if (!raw) {
        return [];
    }
    return raw.split(",").filter(function (text) {
        return String(text || "").length > 0;
    }).map(function (text) {
        return normalizePowerId(text);
    });
}

function trackSlotPowers(player, powerIds) {
    writePersistentStringValue(player, "cyberware_granted_slot_powers", (powerIds || []).join(","));
}

function wasCoreGrantedByRuntime(player) {
    return readPersistentIntValue(player, CYBERWARE_CORE_RUNTIME_KEY) > 0;
}

function markCoreGrantedByRuntime(player, granted) {
    writePersistentIntValue(player, CYBERWARE_CORE_RUNTIME_KEY, granted ? 1 : 0);
}

function getObjective(level, objectiveName) {
    var scoreboard = level.getScoreboard ? level.getScoreboard() : null;
    if (!scoreboard) {
        cyberwareFail("Scoreboard not available while setting '" + objectiveName + "'");
    }
    var objective = scoreboard.getObjective(objectiveName);
    if (!objective) {
        cyberwareFail("Missing scoreboard objective '" + objectiveName + "'");
    }
    return {
        scoreboard: scoreboard,
        objective: objective
    };
}

function resolveScoreboardEntryName(player, entity) {
    if (entity && typeof entity.getScoreboardName === "function") {
        var scoreboardName = String(entity.getScoreboardName() || "");
        if (scoreboardName) {
            return scoreboardName;
        }
    }
    if (player && player.username) {
        return String(player.username);
    }
    if (entity && typeof entity.getGameProfile === "function") {
        var profile = entity.getGameProfile();
        if (profile && typeof profile.getName === "function") {
            var profileName = String(profile.getName() || "");
            if (profileName) {
                return profileName;
            }
        }
    }
    if (entity && typeof entity.getName === "function") {
        var nameComponent = entity.getName();
        if (nameComponent && typeof nameComponent.getString === "function") {
            var displayName = String(nameComponent.getString() || "");
            if (displayName) {
                return displayName;
            }
        }
    }
    cyberwareFail("Unable to resolve scoreboard entry name for player");
}

function getScoreboardEntryNames(player, entity) {
    var out = [];
    var seen = {};

    function pushName(name) {
        var text = String(name || "");
        if (!text || seen[text]) {
            return;
        }
        seen[text] = true;
        out.push(text);
    }

    pushName(resolveScoreboardEntryName(player, entity));

    if (entity && typeof entity.getScoreboardName === "function") {
        pushName(entity.getScoreboardName());
    }
    if (player && player.username) {
        pushName(player.username);
    }
    if (entity && typeof entity.getGameProfile === "function") {
        var profile = entity.getGameProfile();
        if (profile && typeof profile.getName === "function") {
            pushName(profile.getName());
        }
    }
    return out;
}

function setObjectiveScoreForPlayer(player, objectiveName, value) {
    var entity = getEntity(player);
    var level = entity.level;
    var resolved = getObjective(level, objectiveName);
    var scoreNames = getScoreboardEntryNames(player, entity);
    var scoreValue = Math.floor(value);
    for (var i = 0; i < scoreNames.length; i++) {
        var score = resolved.scoreboard.getOrCreatePlayerScore(scoreNames[i], resolved.objective);
        score.setScore(scoreValue);
    }
}

function resetCyberwareScoreboards(player) {
    var slotIds = getSlotIds();
    var cooldownObjectives = global.CYBERWARE_SLOT_COOLDOWN_OBJECTIVES || {};
    var iconObjectives = global.CYBERWARE_SLOT_ICON_OBJECTIVES || {};
    for (var i = 0; i < slotIds.length; i++) {
        var slotId = slotIds[i];
        var cooldownObjective = cooldownObjectives[slotId];
        var iconObjective = iconObjectives[slotId];
        if (cooldownObjective) {
            setObjectiveScoreForPlayer(player, cooldownObjective, 0);
        }
        if (iconObjective) {
            setObjectiveScoreForPlayer(player, iconObjective, 0);
        }
    }
}

function updateSlotIconScores(player) {
    var slotIds = getSlotIds();
    var iconObjectives = global.CYBERWARE_SLOT_ICON_OBJECTIVES || {};
    for (var i = 0; i < slotIds.length; i++) {
        var slotId = slotIds[i];
        var iconObjective = iconObjectives[slotId];
        if (!iconObjective) {
            continue;
        }
        var entry = getSlotEntry(player, slotId);
        var iconIndex = entry ? Number(entry.icon_index || 0) : 0;
        setObjectiveScoreForPlayer(player, iconObjective, iconIndex);
        var itemId = getInstalledItemForSlot(player, slotId);
        if (itemId && CyberwareScriptBridge.isBanned(player,String(itemId))) {
            iconIndex = 0;
            setObjectiveScoreForPlayer(player,iconObjective,0);
        }
        var marker = iconObjective
            + "|" + iconIndex
            + "|" + (itemId || "-")
            + "|" + (entry && entry.power ? String(entry.power) : "-")
            + "|" + (entry && entry.ability ? String(entry.ability) : "-");
        if (debugMarkerChanged(player, "cyberware_dbg_icon_" + slotId, marker)) {
            debugPower(
                player,
                "icon-sync slot=" + slotId
                + " objective=" + iconObjective
                + " icon_index=" + iconIndex
                + " item=" + (itemId || "-")
                + " power=" + (entry && entry.power ? String(entry.power) : "-")
                + " ability=" + (entry && entry.ability ? String(entry.ability) : "-")
            );
        }
    }

    // Dynamic textures used by the ability bar can keep stale icon state after login;
    // force a lightweight pointer ability sync after icon objective writes.
    try {
        if (global.syncCyberwarePointerAbilityIconNow) {
            global.syncCyberwarePointerAbilityIconNow(player);
        }
    } catch (errIconSync) {
        if (debugMarkerChanged(player, "cyberware_dbg_icon_sync_error", String(errIconSync))) {
            debugPower(player, "icon-sync-error " + String(errIconSync));
        }
    }
}

function updateLegacyVariantPointer(player) {
    var entry = getSlotEntry(player, "os");
    writePersistentStringValue(player, "cyberware_power_variant", entry && entry.power ? String(entry.power) : "");
}

function clearInstalledComponentsWithoutOs(player) {
    // No auto-clear: components must persist in persistentData even without OS.
}

function describeCyberState(player) {
    var cyber = getCyberData(player);
    if (!cyber) {
        return "cyber=null";
    }
    var os = cyber.installed_os ? String(cyber.installed_os) : "";
    var bodySlots = cyber.installed_body_slots || {};
    var bodyKeys = getInstalledComponentKeys(bodySlots).sort();
    var bodyPairs = [];
    for (var i = 0; i < bodyKeys.length; i++) {
        var bodyKey = String(bodyKeys[i] || "");
        bodyPairs.push(bodyKey + ":" + readPhysicalValue(bodySlots, bodyKey));
    }
    var activationSlots = cyber.installed_activation_slots || {};
    var activationKeys = getInstalledComponentKeys(activationSlots).sort();
    var activationPairs = [];
    for (var a = 0; a < activationKeys.length; a++) {
        var activationKey = String(activationKeys[a] || "");
        activationPairs.push(activationKey + ":" + readPhysicalValue(activationSlots, activationKey));
    }
    var physical = cyber.installed_physical;
    var physicalKeys = getPhysicalKeys(physical).sort();
    var physicalPairs = [];
    for (var p = 0; p < physicalKeys.length; p++) {
        var physicalKey = String(physicalKeys[p] || "");
        physicalPairs.push(physicalKey + ":" + readPhysicalValue(physical, physicalKey));
    }
    return "os=" + (os || "-")
        + " physical={" + physicalPairs.join(",") + "}"
        + " body={" + bodyPairs.join(",") + "}"
        + " activation={" + activationPairs.join(",") + "}"
        + " load=" + Number(cyber.current_load || 0);
}

function ensureCyberwarePowers(player, options) {
    var enableRecoveryFallback = !(options && options.enableRecoveryFallback === false);
    var traceReason = options && options.traceReason ? String(options.traceReason) : "";
    var entity = getEntity(player);
    var joinLockUntil = getJoinLockUntil(player);
    var joinHydrationLockActive = enableRecoveryFallback && isJoinLockActive(player);
    var osInstalled = hasOsInstalled(player);
    var anyCyberwareInstalled = hasAnyCyberwareInstalled(player);
    var allowPowerRecovery = enableRecoveryFallback && joinHydrationLockActive && !anyCyberwareInstalled;
    var desiredSlotPowers = getDesiredSlotPowerIds(player, allowPowerRecovery);
    var desiredComponentPowers = getDesiredComponentPowerIds(player);
    var exclusivePowerIds = getDesiredExclusivePowerIds(player);
    var currentSlotExclusivePowerIds = getCurrentSlotExclusivePowerIds(player);
    for (var cxi = 0; cxi < currentSlotExclusivePowerIds.length; cxi++) {
        if (exclusivePowerIds.indexOf(currentSlotExclusivePowerIds[cxi]) < 0) {
            exclusivePowerIds.push(currentSlotExclusivePowerIds[cxi]);
        }
    }
    var desiredPowerMap = {};
    for (var dsi = 0; dsi < desiredSlotPowers.length; dsi++) {
        desiredPowerMap[desiredSlotPowers[dsi]] = true;
    }
    for (var dci = 0; dci < desiredComponentPowers.length; dci++) {
        desiredPowerMap[desiredComponentPowers[dci]] = true;
    }
    for (var cex = 0; cex < currentSlotExclusivePowerIds.length; cex++) {
        delete desiredPowerMap[currentSlotExclusivePowerIds[cex]];
    }
    var desiredPowerIds = Object.keys(desiredPowerMap);

    // If slot-driven desired powers exist, treat them as install evidence even when
    // physical/body mirrors are temporarily stale during early login hydration.
    if (allowPowerRecovery && !anyCyberwareInstalled && desiredPowerIds.length > 0) {
        anyCyberwareInstalled = true;
    }

    if (allowPowerRecovery && !anyCyberwareInstalled && desiredPowerIds.length === 0) {
        var slotIdsForRecovery = getSlotIds();
        for (var sri = 0; sri < slotIdsForRecovery.length; sri++) {
            var recoveredEntry = getRecoverySlotEntry(player, slotIdsForRecovery[sri]);
            if (recoveredEntry && recoveredEntry.power) {
                var recoveredPower = normalizePowerId(recoveredEntry.power);
                if (currentSlotExclusivePowerIds.indexOf(recoveredPower) < 0) {
                    desiredPowerMap[recoveredPower] = true;
                }
            }
        }
        desiredPowerIds = Object.keys(desiredPowerMap);
        if (desiredPowerIds.length > 0) {
            anyCyberwareInstalled = true;
        }
    }

    var desiredSet = {};
    for (var i = 0; i < desiredPowerIds.length; i++) {
        desiredSet[desiredPowerIds[i]] = true;
    }
    var hydrationUncertain = joinHydrationLockActive && !anyCyberwareInstalled && desiredPowerIds.length === 0;

    var hasCorePower = SuperpowerUtil.hasSuperpower(entity, CYBERWARE_CORE_POWER);
    var coreGrantedByRuntime = wasCoreGrantedByRuntime(player);
    if (anyCyberwareInstalled) {
        if (!hasCorePower) {
            debugPower(player, "add-core reason=any_cyberware_installed " + describeCyberState(player));
            SuperpowerUtil.addSuperpower(entity, CYBERWARE_CORE_POWER);
        }
        markCoreGrantedByRuntime(player, true);
    } else if (hasCorePower) {
        if (hydrationUncertain && coreGrantedByRuntime) {
            debugPower(player,
                "defer-remove-core reason=join_lock_hydration_pending lockUntil=" + joinLockUntil + " "
                + describeCyberState(player));
        } else
        if (coreGrantedByRuntime) {
            debugPower(player, "remove-core reason=no_cyberware_installed runtime_granted=true " + describeCyberState(player));
            SuperpowerUtil.removeSuperpower(entity, CYBERWARE_CORE_POWER);
            markCoreGrantedByRuntime(player, false);
        } else {
            debugPower(player, "keep-core reason=no_cyberware_installed runtime_granted=false(manual_or_external)");
        }
    } else {
        markCoreGrantedByRuntime(player, false);
    }

    var knownSet = {};
    var trackedPowers = readTrackedSlotPowers(player);
    for (var tp = 0; tp < trackedPowers.length; tp++) {
        knownSet[trackedPowers[tp]] = true;
    }
    var mappedPowers = global.getCyberwareMappedPowers ? global.getCyberwareMappedPowers() : [];
    var ownedMappedPowers = getOwnedMappedPowerIds(player);
    for (var op = 0; op < ownedMappedPowers.length; op++) {
        knownSet[ownedMappedPowers[op]] = true;
    }
    if (CYBERWARE_PRUNE_ALL_MAPPED_POWERS) {
        for (var mp = 0; mp < mappedPowers.length; mp++) {
            knownSet[normalizePowerId(mappedPowers[mp])] = true;
        }
    }
    for (var dp = 0; dp < desiredPowerIds.length; dp++) {
        knownSet[desiredPowerIds[dp]] = true;
    }

    traceCyberware(
        player,
        traceReason,
        "ensure begin enable_recovery=" + enableRecoveryFallback
        + " allow_power_recovery=" + allowPowerRecovery
        + " join_lock_active=" + joinHydrationLockActive
        + " join_lock_until=" + joinLockUntil
        + " os_installed=" + osInstalled
        + " any_cyberware_installed=" + anyCyberwareInstalled
        + " desired_slots=[" + desiredSlotPowers.slice(0).sort().join(",") + "]"
        + " desired_components=[" + desiredComponentPowers.slice(0).sort().join(",") + "]"
        + " desired_all=[" + desiredPowerIds.slice(0).sort().join(",") + "]"
        + " exclusive=[" + exclusivePowerIds.slice(0).sort().join(",") + "]"
        + " current_slot_exclusive=[" + currentSlotExclusivePowerIds.slice(0).sort().join(",") + "]"
        + " tracked=[" + trackedPowers.slice(0).sort().join(",") + "]"
        + " owned_mapped=[" + ownedMappedPowers.slice(0).sort().join(",") + "]"
        + " state=" + describeCyberState(player)
    );

    if (CYBERWARE_POWER_DEBUG) {
        var anyOwnedSlotPower = hasAnyOwnedSlotPower(player);
        var marker = "osInstalled=" + osInstalled
            + "|anyCyberwareInstalled=" + anyCyberwareInstalled
            + "|anyOwnedSlotPower=" + anyOwnedSlotPower
            + "|desired_slots=" + desiredSlotPowers.slice(0).sort().join(",")
            + "|desired_components=" + desiredComponentPowers.slice(0).sort().join(",")
            + "|desired_all=" + desiredPowerIds.slice(0).sort().join(",")
            + "|exclusive=" + exclusivePowerIds.slice(0).sort().join(",")
            + "|current_slot_exclusive=" + currentSlotExclusivePowerIds.slice(0).sort().join(",")
            + "|tracked=" + trackedPowers.slice(0).sort().join(",")
            + "|pruneMapped=" + CYBERWARE_PRUNE_ALL_MAPPED_POWERS
            + "|" + describeCyberState(player);
        if (readPersistentStringValue(player, "cyberware_dbg_power_variant_marker") !== marker) {
            writePersistentStringValue(player, "cyberware_dbg_power_variant_marker", marker);
            debugPower(player, "state-change " + marker);
        }
        if (!osInstalled && anyCyberwareInstalled) {
            debugPower(player, "os-missing-but-cyberware-present " + describeCyberState(player));
        }
        if (hydrationUncertain) {
            debugPower(player,
                "defer-destructive reason=join_lock_hydration_pending lockUntil=" + joinLockUntil
                + " tracked=" + trackedPowers.slice(0).sort().join(",")
                + " " + describeCyberState(player));
        }
    }

    if (!hydrationUncertain) {
        for (var xp = 0; xp < exclusivePowerIds.length; xp++) {
            var exclusivePowerId = exclusivePowerIds[xp];
            var forcedExclusive = currentSlotExclusivePowerIds.indexOf(exclusivePowerId) >= 0;
            if (!exclusivePowerId || (desiredSet[exclusivePowerId] && !forcedExclusive)) {
                continue;
            }
            var exclusivePowerKey = toResourceLocation(exclusivePowerId);
            if (SuperpowerUtil.hasSuperpower(entity, exclusivePowerKey)) {
                traceCyberware(
                    player,
                    traceReason,
                    "remove exclusive power=" + exclusivePowerId
                    + " desired=[" + desiredPowerIds.slice(0).sort().join(",") + "]"
                    + " state=" + describeCyberState(player)
                );
                debugPower(player, "remove-power id=" + exclusivePowerId
                    + " reason=exclusive desired=" + desiredPowerIds.join(",")
                    + " " + describeCyberState(player));
                SuperpowerUtil.removeSuperpower(entity, exclusivePowerKey);
            }
        }

        var knownPowers = Object.keys(knownSet);
        for (var kp = 0; kp < knownPowers.length; kp++) {
            var powerId = knownPowers[kp];
            if (!powerId || powerId === CYBERWARE_CORE_POWER_ID || desiredSet[powerId]) {
                continue;
            }
            var powerKey = toResourceLocation(powerId);
            if (SuperpowerUtil.hasSuperpower(entity, powerKey)) {
                traceCyberware(
                    player,
                    traceReason,
                    "remove undesired power=" + powerId
                    + " desired=[" + desiredPowerIds.slice(0).sort().join(",") + "]"
                    + " tracked=[" + trackedPowers.slice(0).sort().join(",") + "]"
                    + " state=" + describeCyberState(player)
                );
                debugPower(player, "remove-power id=" + powerId
                    + " reason=not_desired desired=" + desiredPowerIds.join(",")
                    + " tracked=" + trackedPowers.join(",")
                    + " " + describeCyberState(player));
                SuperpowerUtil.removeSuperpower(entity, powerKey);
            }
        }
    }

    if (anyCyberwareInstalled) {
        for (var ap = 0; ap < desiredPowerIds.length; ap++) {
            var addId = desiredPowerIds[ap];
            var addKey = toResourceLocation(addId);
            if (!SuperpowerUtil.hasSuperpower(entity, addKey)) {
                traceCyberware(
                    player,
                    traceReason,
                    "add missing desired power=" + addId
                    + " desired=[" + desiredPowerIds.slice(0).sort().join(",") + "]"
                    + " state=" + describeCyberState(player)
                );
                debugPower(player, "add-power id=" + addId + " reason=desired " + describeCyberState(player));
                SuperpowerUtil.addSuperpower(entity, addKey);
            }
        }
    }

    if (hydrationUncertain && trackedPowers.length > 0) {
        debugPower(player,
            "keep-tracked-slot-powers reason=join_lock_hydration_pending tracked="
            + trackedPowers.slice(0).sort().join(",") + " lockUntil=" + joinLockUntil);
        traceCyberware(
            player,
            traceReason,
            "keep tracked powers during hydration tracked=[" + trackedPowers.slice(0).sort().join(",") + "]"
            + " state=" + describeCyberState(player)
        );
    } else {
        traceCyberware(
            player,
            traceReason,
            "track slot powers old=[" + trackedPowers.slice(0).sort().join(",") + "]"
            + " new=[" + (anyCyberwareInstalled ? desiredPowerIds.slice(0).sort().join(",") : "") + "]"
        );
        trackSlotPowers(player, anyCyberwareInstalled ? desiredPowerIds : []);
    }
    updateLegacyVariantPointer(player);
}

function syncCyberwareRuntimeState(player, options) {
    var enableRecoveryFallback = !(options && options.enableRecoveryFallback === false);
    var traceReason = options && options.traceReason ? String(options.traceReason) : "";
    var joinHydrationLockActive = enableRecoveryFallback && isJoinLockActive(player);
    var joinLockUntil = getJoinLockUntil(player);
    var anyCyberwareInstalled = hasAnyCyberwareInstalled(player);
    var anyOwnedSlotPower = hasAnyOwnedSlotPower(player);
    traceCyberware(
        player,
        traceReason,
        "runtime-state begin enable_recovery=" + enableRecoveryFallback
        + " join_lock_active=" + joinHydrationLockActive
        + " join_lock_until=" + joinLockUntil
        + " any_cyberware_installed=" + anyCyberwareInstalled
        + " any_owned_slot_power=" + anyOwnedSlotPower
        + " state=" + describeCyberState(player)
    );
    if (!anyCyberwareInstalled && !anyOwnedSlotPower) {
        if (joinHydrationLockActive) {
            debugPower(player, "defer-reset-scoreboards reason=join_lock_hydration_pending lockUntil=" + joinLockUntil);
            traceCyberware(player, traceReason, "runtime-state defer-reset-scoreboards");
        } else {
            resetCyberwareScoreboards(player);
            setObjectiveScoreForPlayer(player, "er_sandy_charge", 0);
            setObjectiveScoreForPlayer(player, "er_sandy_active", 0);
            setObjectiveScoreForPlayer(player, "er_sandy_exhaust", 0);
            traceCyberware(player, traceReason, "runtime-state reset-scoreboards");
        }
    } else {
        updateSlotIconScores(player);
        traceCyberware(player, traceReason, "runtime-state update-icons");
    }
    updateLegacyVariantPointer(player);
}

function handlePlayerUpdate(player, options) {
    try {
        ensureCyberwarePowers(player, options);
        syncCyberwareRuntimeState(player, options);
    } catch (err) {
        if (debugMarkerChanged(player, "cyberware_dbg_power_variant_error", String(err))) {
            debugPower(player, "error " + String(err));
        }
    }
}

function isLoginReason(reason) {
    var text = String(reason || "");
    return text.indexOf("login_") === 0;
}

function shouldAllowRecoveryFallback(reason) {
    var text = String(reason || "");
    return text === "entity_cycle" || isLoginReason(text);
}

function resolvePlayerGameTime(player) {
    var entity = getEntity(player);
    if (!entity) {
        return -1;
    }
    try {
        if (entity.level && typeof entity.level.getGameTime === "function") {
            return Number(entity.level.getGameTime() || 0);
        }
    } catch (errLevelGet) {
    }
    try {
        if (entity.level && entity.level.gameTime !== undefined) {
            return Number(entity.level.gameTime || 0);
        }
    } catch (errLevelField) {
    }
    try {
        var serverObj = entity.server;
        if (!serverObj && typeof entity.getServer === "function") {
            serverObj = entity.getServer();
        }
        if (serverObj && typeof serverObj.overworld === "function") {
            var overworld = serverObj.overworld();
            if (overworld && typeof overworld.getGameTime === "function") {
                return Number(overworld.getGameTime() || 0);
            }
            if (overworld && overworld.gameTime !== undefined) {
                return Number(overworld.gameTime || 0);
            }
        }
    } catch (errServerOverworld) {
    }
    return -1;
}

function readPersistentLong(persistentData, key) {
    if (!persistentData || !key) {
        return 0;
    }
    try {
        if (typeof persistentData.getLong === "function") {
            return Number(persistentData.getLong(String(key)) || 0);
        }
    } catch (errGetLong) {
    }
    try {
        return Number(persistentData[String(key)] || 0);
    } catch (errField) {
    }
    return 0;
}

function getJoinLockUntil(player) {
    var joinLockUntil = readPersistentLongValue(player, CYBERWARE_JOIN_LOCK_UNTIL_KEY);
    var osLockUntil = readPersistentLongValue(player, CYBERWARE_OS_LOCK_UNTIL_KEY);
    return Math.max(joinLockUntil, osLockUntil);
}

function isJoinLockActive(player) {
    var now = resolvePlayerGameTime(player);
    var lockUntil = getJoinLockUntil(player);
    if (!isFinite(now) || now < 0 || !isFinite(lockUntil) || lockUntil <= 0) {
        return false;
    }
    return now <= lockUntil;
}

function syncCyberwareRuntimeReadyFlag(player) {
    if (!player) {
        return;
    }
    var ready = isJoinLockActive(player) ? 0 : 1;
    setObjectiveScoreForPlayer(player, CYBERWARE_RUNTIME_READY_OBJECTIVE, ready);
}

function clearLoginRetryRefreshes(player) {
    for (var i = 0; i < CYBERWARE_LOGIN_RETRY_REFRESH_STEPS.length; i++) {
        writePersistentIntValue(player, CYBERWARE_LOGIN_RETRY_REFRESH_STEPS[i].key, 0);
    }
}

function scheduleLoginRetryRefreshes(player) {
    for (var i = 0; i < CYBERWARE_LOGIN_RETRY_REFRESH_STEPS.length; i++) {
        var step = CYBERWARE_LOGIN_RETRY_REFRESH_STEPS[i];
        writePersistentIntValue(player, step.key, Math.max(1, Math.floor(Number(step.delay || 0))));
    }
}

function consumeLoginRetryRefresh(player) {
    for (var i = 0; i < CYBERWARE_LOGIN_RETRY_REFRESH_STEPS.length; i++) {
        var step = CYBERWARE_LOGIN_RETRY_REFRESH_STEPS[i];
        var remaining = Math.floor(Number(readPersistentIntValue(player, step.key) || 0));
        if (!isFinite(remaining) || remaining <= 0) {
            continue;
        }
        remaining -= 1;
        if (remaining > 0) {
            writePersistentIntValue(player, step.key, remaining);
            continue;
        }
        writePersistentIntValue(player, step.key, 0);
        refreshJoinLikeCyberwareState(player, step.reason);
        return true;
    }
    return false;
}

function resolveEntityRuntimeMarker(player) {
    var entity = getEntity(player);
    if (!entity) {
        return "";
    }
    try {
        if (typeof entity.getId === "function") {
            var id = String(entity.getId() || "");
            if (id) {
                return id;
            }
        }
    } catch (errId) {
    }
    try {
        if (entity.id !== undefined && entity.id !== null) {
            var idField = String(entity.id || "");
            if (idField) {
                return idField;
            }
        }
    } catch (errIdField) {
    }
    return "";
}

function updateEntityRuntimeMarker(player) {
    var entity = getEntity(player);
    if (!entity) {
        return "";
    }
    var marker = resolveEntityRuntimeMarker(entity);
    if (!marker) {
        return "";
    }
    writePersistentStringValue(player, CYBERWARE_RUNTIME_ENTITY_MARKER_KEY, marker);
    return marker;
}

function hasEntityRuntimeMarkerChanged(player) {
    var entity = getEntity(player);
    if (!entity) {
        return false;
    }
    var marker = resolveEntityRuntimeMarker(entity);
    if (!marker) {
        return false;
    }
    return readPersistentStringValue(player, CYBERWARE_RUNTIME_ENTITY_MARKER_KEY) !== marker;
}

function refreshJoinLikeCyberwareState(player, reason) {
    if (!player) {
        return;
    }
    clearDebugPersistentMarkers(player);
    traceCyberware(player, reason, "refresh-start state=" + describeCyberState(player));
    debugPower(player, "refresh-start reason=" + String(reason || "manual") + " " + describeCyberState(player));
    forceDisablePersistedSandevistan(player);
    handlePlayerUpdate(player, {
        enableRecoveryFallback: shouldAllowRecoveryFallback(reason),
        traceReason: String(reason || "")
    });
    if (isLoginReason(reason)) {
        try {
            // Login hydration can lag behind the first refresh; force icon objectives now.
            updateSlotIconScores(player);
            updateLegacyVariantPointer(player);
        } catch (errLoginIcon) {
            if (debugMarkerChanged(player, "cyberware_dbg_login_icon_error", String(errLoginIcon))) {
                debugPower(player, "login-icon-force-sync-error " + String(errLoginIcon));
            }
        }
    }
    if (isLoginReason(reason)) {
        try {
            if (global.resetInstalledFaceOpticsRuntime
                    && FaceOpticsPointerBridge.shouldResetLoginRuntime(getEntity(player), String(reason))) {
                global.resetInstalledFaceOpticsRuntime(player);
            }
        } catch (errFaceReset) {
            if (debugMarkerChanged(player, "cyberware_dbg_login_face_reset_error", String(errFaceReset))) {
                debugPower(player, "login-face-reset-error " + String(errFaceReset));
            }
        }
    }
    try {
        if (global.refreshCyberwarePointerRuntimeNow) {
            global.refreshCyberwarePointerRuntimeNow(player);
        }
    } catch (errPointer) {
        if (debugMarkerChanged(player, "cyberware_dbg_join_pointer_error", String(errPointer))) {
            debugPower(player, "join-pointer-refresh-error " + String(errPointer));
        }
    }
    try {
        if (global.refreshFortifiedAnklesRuntimeNow) {
            global.refreshFortifiedAnklesRuntimeNow(player);
        }
        if (global.refreshReinforcedTendonsRuntimeNow) {
            global.refreshReinforcedTendonsRuntimeNow(player);
        }
        if (global.refreshGorillaArmsRuntimeNow) {
            global.refreshGorillaArmsRuntimeNow(player);
        }
    } catch (errLegs) {
        if (debugMarkerChanged(player, "cyberware_dbg_join_legs_error", String(errLegs))) {
            debugPower(player, "join-legs-refresh-error " + String(errLegs));
        }
    }
    updateEntityRuntimeMarker(player);
    syncCyberwareRuntimeReadyFlag(player);
    traceCyberware(player, reason, "refresh-end state=" + describeCyberState(player));
    debugPower(player, "refresh-end reason=" + String(reason || "manual") + " " + describeCyberState(player));
}

global.refreshCyberwarePowerVariantNow = function (playerOrEntity, options) {
    if (!playerOrEntity) {
        return;
    }
    clearLoginRetryRefreshes(playerOrEntity);
    var reason = options && options.reason ? String(options.reason) : "manual_api";
    var preferRecoveryFallback = !!(options && options.preferRecoveryFallback);
    var joinLockActive = isJoinLockActive(playerOrEntity);
    traceCyberware(
        playerOrEntity,
        reason,
        "refresh-now call prefer_recovery=" + preferRecoveryFallback
        + " join_lock_active=" + joinLockActive
        + " state=" + describeCyberState(playerOrEntity)
    );
    if (preferRecoveryFallback && joinLockActive && !shouldAllowRecoveryFallback(reason)) {
        reason = "entity_cycle";
    }
    traceCyberware(
        playerOrEntity,
        reason,
        "refresh-now resolved-reason join_lock_active=" + joinLockActive
        + " state=" + describeCyberState(playerOrEntity)
    );
    refreshJoinLikeCyberwareState(playerOrEntity, reason);
};

PlayerEvents.loggedIn(function (event) {
    var player = event.player;
    clearLoginRetryRefreshes(player);
    refreshJoinLikeCyberwareState(player, "login_now");
    scheduleLoginRetryRefreshes(player);
});

ServerEvents.tick(function (event) {
    cyberwareRuntimeLocalTick += 1;
    var players = event.server && event.server.players ? event.server.players : [];
    if (!players.length) {
        return;
    }
    for (var p = 0; p < players.length; p++) {
        consumeLoginRetryRefresh(players[p]);
        syncCyberwareRuntimeReadyFlag(players[p]);
    }

    var gameTime = resolvePlayerGameTime(players[0]);
    if (!isFinite(gameTime) || gameTime < 0) {
        gameTime = Number(cyberwareRuntimeLocalTick || 0);
    }
    if (CYBERWARE_RUNTIME_ENTITY_SCAN_INTERVAL > 1
            && isFinite(gameTime) && gameTime > 0
            && (gameTime % CYBERWARE_RUNTIME_ENTITY_SCAN_INTERVAL) !== 0) {
        return;
    }

    for (var i = 0; i < players.length; i++) {
        if (hasEntityRuntimeMarkerChanged(players[i])) {
            refreshJoinLikeCyberwareState(players[i], "entity_cycle");
        }
    }
});
})();
