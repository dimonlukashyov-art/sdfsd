// priority: 19
// Server script: pointer cooldown runtime (slot cooldowns + dynamic OS Sandevistan cooldown).
(function () {
const CWP_RUNTIME_RESOURCE_LOCATION = Java.loadClass("net.minecraft.resources.ResourceLocation");
const CWP_RUNTIME_POWER_MANAGER = Java.loadClass("net.threetag.palladium.power.PowerManager");
const CWP_RUNTIME_SUPERPOWER_UTIL = Java.loadClass("net.threetag.palladium.power.SuperpowerUtil");
const BLOOD_PUMP_RUNTIME = Java.loadClass("com.edgerunner.cyberpsychosis.BloodPumpChargeRuntime");
const CWP_CYBERWARE_BRIDGE = Java.loadClass("com.edgerunner.cyberware.CyberwareScriptBridge");

const CW_POINTER_CORE_POWER_ID = "project_edgerunner:cyberware";
const OS_SLOT_ID = "os";
const OS_POINTER_ABILITY_ID = "cyberware_os";
const ARMS_SLOT_ID = "arms";
const ARMS_POINTER_ABILITY_ID = "cyberware_arms";
const FACE_SLOT_ID = "face";
const FACE_POINTER_ABILITY_ID = "cyberware_face";
const FACE_ACTIVE_TICKS_OBJECTIVE = "er_face_active_ticks";
const FACE_ACTIVE_MAX_OBJECTIVE = "er_face_active_max";
const CIRCULATORY_SLOT_ID = "circulatory";
const CIRCULATORY_POINTER_ABILITY_ID = "cyberware_circulatory";
const BLOOD_PUMP_ACTIVE_TICKS_OBJECTIVE = "er_bp_active_ticks";
const BLOOD_PUMP_ACTIVE_MAX_OBJECTIVE = "er_bp_active_max";
const BLOOD_PUMP_CHARGES_OBJECTIVE = "er_bp_charges";
const BLOOD_PUMP_CHARGES_MAX_OBJECTIVE = "er_bp_charges_max";
const EXTRA_SLOT_ID = "extra";
const EXTRA_POINTER_ABILITY_ID = "cyberware_extra";
const SUPPRESSOR_ITEM_ID = "project_edgerunner:inmunosupresores";
const BLOOD_PUMP_POWER_ID = "project_edgerunner:blood_pump";
const BLOOD_PUMP_ABILITY_ID = "blood_pump";
const BLOOD_PUMP_CHARGE_CAPACITY_1_ABILITY_ID = "charge_capacity_1";
const BLOOD_PUMP_CHARGE_CAPACITY_2_ABILITY_ID = "charge_capacity_2";
const BLOOD_PUMP_CHARGE_CAPACITY_3_ABILITY_ID = "charge_capacity_3";
const BLOOD_PUMP_SLOT_COUNT = 3;
const BLOOD_PUMP_NBT_CHARGES = "cyberware_bp_charges";
const BLOOD_PUMP_NBT_RECHARGE_PENDING = "cyberware_bp_recharge_pending";
const BLOOD_PUMP_NBT_RECHARGE_TICKS = "cyberware_bp_recharge_ticks";
const BLOOD_PUMP_NBT_CHARGES_MAX_SEEN = "cyberware_bp_charges_max_seen";
const BLOOD_PUMP_NBT_SLOT_RECHARGE_PREFIX = "cyberware_bp_slot_recharge_";
const BLOOD_PUMP_NBT_SLOT_RECHARGE_MAX_PREFIX = "cyberware_bp_slot_recharge_max_";
const BLOOD_PUMP_NBT_SLOT_INJECT_PREFIX = "cyberware_bp_slot_inject_";
const BLOOD_PUMP_NBT_SLOT_EFFECT_PREFIX = "cyberware_bp_slot_effect_";
const AXOLOTL_ITEM_ID = "project_edgerunner:axolotl";
const AXOLOTL_POWER_ID = "project_edgerunner:axolotl";
const AXOLOTL_CORE_ABILITY_ID = "axolotl_core";
const AXOLOTL_UPGRADE_MAX_ABILITY_ID = "axolotl_upgrade_cooldown_max";
const AXOLOTL_MIN_REDUCTION_PERCENT = 5.0;
const AXOLOTL_MAX_REDUCTION_PERCENT = 7.5;
const AXOLOTL_KILL_TRIGGER_OBJECTIVE = "er_axo_kill_trigger";
const AXOLOTL_LAST_KILL_TYPE_OBJECTIVE = "er_axo_last_type";
const AXOLOTL_PROC_APPLIED_OBJECTIVE = "er_axo_proc_applied";
const AXOLOTL_LAST_REDUCTION_BP_OBJECTIVE = "er_axo_last_reduction_bp";
const AXOLOTL_FORCE_ACTIVE_IN_TEST = false;
const AXOLOTL_CHAT_DEBUG = false;
const AXOLOTL_LAST_PROC_TICK_OBJECTIVE = "er_axo_last_proc_tick";
const AXOLOTL_SANDE_REDUCTION_SERIAL_KEY = "cyberware_axolotl_sande_reduction_serial";
const AXOLOTL_SANDE_REDUCTION_SEEN_SERIAL_KEY = "cyberware_axolotl_sande_reduction_seen_serial";
const BP_DEBUG_ABILITY_COOLDOWN_OBJECTIVE = "er_bp_dbg_ability_cd";
const BP_DEBUG_OBJECTIVE_COOLDOWN_OBJECTIVE = "er_bp_dbg_score_cd";
const BP_DEBUG_LAST_REDUCE_BEFORE_OBJECTIVE = "er_bp_dbg_reduce_before";
const BP_DEBUG_LAST_REDUCE_AFTER_OBJECTIVE = "er_bp_dbg_reduce_after";
const SANDY_MAX_SCORE = 10000;
const DEFAULT_SANDE_ACTIVATION_COST_PERCENT = 0.15;
const DEFAULT_SANDE_COOLDOWN_SECONDS = 30;
const CYBERWARE_POINTER_TICK_INTERVAL = 2;
const CYBERWARE_POINTER_IDLE_ITEM_SCAN_INTERVAL = 5;
const CYBERWARE_POINTER_PRESENCE_CACHE_KEY = "cyberware_pointer_presence_cached";
var cyberwareObjectiveTickCache = {};
var cyberwareObjectiveTickId = -1;
var cyberwarePowerHolderTickCache = {};
var cyberwareNormalizedDataTickCache = {};
var cyberwareResourceLocationCache = {};
// Performance pass 11/11/2026. Results that depend only on installed cyberware, held powers (with their unlocked and
// bought nodes) and ban rules are kept per player while CyberwareScriptBridge.revision is unchanged, instead of being
// rebuilt every tick. cyberwareRevisionTickCache holds that revision as read at the first use in a tick, like the other
// tick caches; a result is only kept when the revision was still the same after computing it, so nothing built from
// data read before a mid-tick install or removal can outlive that tick.
var cyberwareRevisionTickCache = {};
var cyberwareMemoByRevision = {};
var cyberwareSlotIdentityScanState = {};

function cyberwareRuntimeFail(message) {
    if (global.cyberwareFail) {
        global.cyberwareFail(message);
        return;
    }
    throw new Error("[Cyberpunk/Cyberware] " + message);
}

function getEntity(player) {
    return player && player.minecraftEntity ? player.minecraftEntity : player;
}

function readCyberwareDataFromBridge(entity) {
    try {
        var json = String(CWP_CYBERWARE_BRIDGE.toCyberwareJson(getEntity(entity)) || "");
        if (!json) {
            return null;
        }
        var parsed = JSON.parse(json);
        return parsed && typeof parsed === "object" ? parsed : null;
    } catch (err) {
        return null;
    }
}

function resolveEntityCacheKey(entity) {
    if (!entity) {
        return "";
    }
    try {
        if (typeof entity.getStringUUID === "function") {
            var uuidString = String(entity.getStringUUID() || "");
            if (uuidString) {
                return uuidString;
            }
        }
    } catch (err) {
    }
    try {
        if (typeof entity.getUUID === "function") {
            var uuid = entity.getUUID();
            if (uuid) {
                return String(uuid);
            }
        }
    } catch (err2) {
    }
    try {
        if (typeof entity.getScoreboardName === "function") {
            var scoreboardName = String(entity.getScoreboardName() || "");
            if (scoreboardName) {
                return scoreboardName;
            }
        }
    } catch (err3) {
    }
    return "";
}

function sendDebugChat(player, text) {
    if (!AXOLOTL_CHAT_DEBUG) {
        return;
    }
    try {
        if (player && typeof player.sendSystemMessage === "function") {
            player.sendSystemMessage("[AXOLOTL/JS] " + text);
            return;
        }
        var entity = getEntity(player);
        if (entity && typeof entity.sendSystemMessage === "function") {
            entity.sendSystemMessage("[AXOLOTL/JS] " + text);
        }
    } catch (err) {
        console.error("[Cyberpunk/Cyberware] debug chat failed: " + err);
    }
}

function debugAxolotlSnapshot(player, entity, stage, extra) {
    if (!AXOLOTL_CHAT_DEBUG) {
        return;
    }
    var trigger = getObjectiveScore(player, entity, AXOLOTL_KILL_TRIGGER_OBJECTIVE);
    var killType = getObjectiveScore(player, entity, AXOLOTL_LAST_KILL_TYPE_OBJECTIVE);
    var sandy = getObjectiveScore(player, entity, "er_sandy_charge");
    var osCd = getObjectiveScore(player, entity, getCooldownObjective(OS_SLOT_ID));
    var circCd = getObjectiveScore(player, entity, getCooldownObjective(CIRCULATORY_SLOT_ID));
    var text = "stage=" + stage + " | trigger=" + trigger + " | killType=" + killType +
        " | sandy=" + sandy + " | osCd=" + osCd + " | circCd=" + circCd;
    if (extra) {
        text += " | " + extra;
    }
    sendDebugChat(player, text);
}

function debugValueChange(entity, key, value) {
    var last = String(entity.persistentData[key] || "");
    var now = String(value);
    if (last === now) {
        return false;
    }
    entity.persistentData[key] = now;
    return true;
}

function getSlotIds() {
    return global.CYBERWARE_SLOT_IDS || ["os", "arms", "face", "circulatory", "extra"];
}

function getFaceScanDurationTicks() {
    return Math.max(1, Math.floor(Number(global.FACE_SCAN_DURATION_TICKS || 1200)));
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

function getInstalledItem(entity, slotId) {
    var item = getPhysicalInstalledItem(entity, slotId);
    return item && !CWP_CYBERWARE_BRIDGE.isBanned(entity, String(item)) ? item : "";
}
function getPhysicalInstalledItem(entity, slotId) {
    var cyber = normalizeCyberwareData(entity);
    if (!cyber) {
        return "";
    }
    if (global.getCyberwareInstalledItemByActivationSlot) {
        var activationItem = String(global.getCyberwareInstalledItemByActivationSlot(entity, slotId) || "");
        if (activationItem) {
            return activationItem;
        }
    }
    if (slotId === OS_SLOT_ID) {
        if (global.getCyberwareInstalledItemByBodySlot) {
            return String(global.getCyberwareInstalledItemByBodySlot(entity, "os") || "");
        }
        return cyber.installed_os ? String(cyber.installed_os) : "";
    }
    var installed = cyber.installed_components;
    if (!installed) {
        if (slotId === EXTRA_SLOT_ID && global.getCyberwareInstalledItemByBodySlot) {
            return String(global.getCyberwareInstalledItemByBodySlot(entity, "supresors") || "");
        }
        return "";
    }
    var item = getInstalledComponentValue(installed, slotId);
    if (item) {
        return item;
    }
    if (slotId !== EXTRA_SLOT_ID) {
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

function hasOsInstalled(entity) {
    return getInstalledItem(entity, OS_SLOT_ID).length > 0;
}

function hasInstalledCyberwareItem(entity, itemId) {
    if (CWP_CYBERWARE_BRIDGE.isBanned(entity, String(itemId))) return false;
    if (!entity) {
        return false;
    }
    var cyber = normalizeCyberwareData(entity);
    if (!cyber) {
        return false;
    }
    if (itemIdMatches(String(cyber.installed_os || ""), itemId)) {
        return true;
    }
    if (global.getCyberwareInstalledItemByBodySlot && global.CYBERWARE_BODY_SLOT_IDS) {
        var bodySlotIds = global.CYBERWARE_BODY_SLOT_IDS;
        for (var b = 0; b < bodySlotIds.length; b++) {
            if (itemIdMatches(global.getCyberwareInstalledItemByBodySlot(entity, bodySlotIds[b]), itemId)) {
                return true;
            }
        }
    }
    var physical = cyber.installed_physical;
    if (physical) {
        var physicalKeys = getPhysicalKeys(physical);
        for (var p = 0; p < physicalKeys.length; p++) {
            var physicalId = readPhysicalValue(physical, String(physicalKeys[p] || ""));
            if (itemIdMatches(physicalId, itemId)) {
                return true;
            }
        }
    }
    var installed = cyber.installed_components;
    if (!installed) {
        return false;
    }
    var keys = getInstalledComponentKeys(installed);
    for (var i = 0; i < keys.length; i++) {
        if (itemIdMatches(getInstalledComponentValue(installed, String(keys[i] || "")), itemId)) {
            return true;
        }
    }
    return false;
}

function getInstalledComponentValue(installed, key) {
    if (!installed) {
        return "";
    }
    try {
        if (installed[key] !== undefined && installed[key] !== null) {
            return String(installed[key]);
        }
    } catch (err) {
    }
    try {
        if (typeof installed.get === "function") {
            var value = installed.get(String(key));
            if (value !== null && value !== undefined) {
                return String(value);
            }
        }
    } catch (err2) {
    }
    return "";
}

function hasAxolotlInFrontalCortexSlot(entity) {
    if (!entity) {
        return false;
    }
    var cyber = normalizeCyberwareData(entity);
    if (!cyber) {
        return false;
    }
    if (global.getCyberwareInstalledItemByBodySlot) {
        var frontalBodyItem = String(global.getCyberwareInstalledItemByBodySlot(entity, "frontal_cortex") || "");
        if (itemIdMatches(frontalBodyItem, AXOLOTL_ITEM_ID)) {
            return true;
        }
        var faceBodyItem = String(global.getCyberwareInstalledItemByBodySlot(entity, "face") || "");
        if (itemIdMatches(faceBodyItem, AXOLOTL_ITEM_ID)) {
            return true;
        }
    }
    var installed = cyber.installed_components;
    var frontal = getInstalledComponentValue(installed, "frontal_cortex");
    if (itemIdMatches(frontal, AXOLOTL_ITEM_ID)) {
        return true;
    }
    // Legacy fallback for old saves that still store Axolotl in face.
    var legacyFace = getInstalledComponentValue(installed, FACE_SLOT_ID);
    if (itemIdMatches(legacyFace, AXOLOTL_ITEM_ID)) {
        return true;
    }
    var physical = cyber.installed_physical;
    var physicalKeys = getPhysicalKeys(physical);
    for (var i = 0; i < physicalKeys.length; i++) {
        if (itemIdMatches(readPhysicalValue(physical, String(physicalKeys[i] || "")), AXOLOTL_ITEM_ID)) {
            return true;
        }
    }
    return false;
}

function normalizeItemId(raw) {
    var text = String(raw || "").trim().toLowerCase();
    if (!text) {
        return "";
    }
    if (text.indexOf(":") >= 0) {
        return text;
    }
    return "project_edgerunner:" + text;
}

function itemIdMatches(actual, expected) {
    var a = normalizeItemId(actual);
    var e = normalizeItemId(expected);
    if (!a || !e) {
        return false;
    }
    return a === e;
}

// Axolotl active detection priority:
// 1) test override
// 2) Palladium power holder state
// 3) installed item fallback
function hasAxolotlActive(entity) {
    if (AXOLOTL_FORCE_ACTIVE_IN_TEST) {
        return true;
    }
    return memoByRevision(entity, "axolotl_active", function () {
        return computeAxolotlActive(entity);
    });
}

function computeAxolotlActive(entity) {

    if (hasAxolotlInFrontalCortexSlot(entity)) {
        return true;
    }

    try {
        if (entity && CWP_RUNTIME_SUPERPOWER_UTIL.hasSuperpower(entity, parsePowerId(AXOLOTL_POWER_ID))) {
            return true;
        }
    } catch (err) {
        // keep fallbacks below
    }

    var holder = getPowerHolder(entity, AXOLOTL_POWER_ID);
    if (holder) {
        var coreAbility = getAbilityInstance(holder, AXOLOTL_CORE_ABILITY_ID);
        if (!coreAbility) {
            return true;
        }
        if (coreAbility.isUnlocked) {
            return !!coreAbility.isUnlocked();
        }
        return true;
    }
    return hasInstalledCyberwareItem(entity, AXOLOTL_ITEM_ID);
}

function updateAxolotlActiveMarker(entity) {
    if (!entity || !entity.persistentData) {
        return;
    }
    entity.persistentData.cyberware_axolotl_active = hasAxolotlActive(entity) ? 1 : 0;
}

function getCooldownObjective(slotId) {
    var map = global.CYBERWARE_SLOT_COOLDOWN_OBJECTIVES || {};
    var objective = map[slotId];
    if (!objective) {
        cyberwareRuntimeFail("Missing cooldown objective mapping for slot '" + slotId + "'");
    }
    return objective;
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
    cyberwareRuntimeFail("Unable to resolve scoreboard entry name");
}

function getObjective(level, objectiveName) {
    var scoreboard = level && level.getScoreboard ? level.getScoreboard() : null;
    if (!scoreboard) {
        cyberwareRuntimeFail("Scoreboard not available while resolving '" + objectiveName + "'");
    }
    var objective = scoreboard.getObjective(objectiveName);
    if (!objective) {
        cyberwareRuntimeFail("Missing scoreboard objective '" + objectiveName + "'");
    }
    return {
        scoreboard: scoreboard,
        objective: objective
    };
}

function resolveLevelGameTime(level) {
    if (!level) {
        return -1;
    }
    try {
        if (typeof level.getGameTime === "function") {
            return Math.floor(Number(level.getGameTime() || 0));
        }
    } catch (err) {
    }
    try {
        return Math.floor(Number(level.gameTime || 0));
    } catch (err2) {
    }
    return -1;
}

function ensureObjectiveTickCache(entity) {
    var nowTick = resolveLevelGameTime(entity && entity.level ? entity.level : null);
    if (nowTick < 0) {
        cyberwareObjectiveTickCache = {};
        cyberwarePowerHolderTickCache = {};
        cyberwareNormalizedDataTickCache = {};
        cyberwareRevisionTickCache = {};
        cyberwareObjectiveTickId = -1;
        return;
    }
    if (cyberwareObjectiveTickId !== nowTick) {
        cyberwareObjectiveTickCache = {};
        cyberwarePowerHolderTickCache = {};
        cyberwareNormalizedDataTickCache = {};
        cyberwareRevisionTickCache = {};
        cyberwareObjectiveTickId = nowTick;
    }
}

function readFreshRuntimeRevision(entity) {
    try {
        return Number(CWP_CYBERWARE_BRIDGE.revision(getEntity(entity))) || 0;
    } catch (err) {
        return 0;
    }
}

function getTickRuntimeRevision(entity) {
    if (!entity) {
        return 0;
    }
    ensureObjectiveTickCache(entity);
    var key = resolveEntityCacheKey(entity);
    if (!key) {
        return 0;
    }
    if (Object.prototype.hasOwnProperty.call(cyberwareRevisionTickCache, key)) {
        return cyberwareRevisionTickCache[key];
    }
    var revision = readFreshRuntimeRevision(entity);
    cyberwareRevisionTickCache[key] = revision;
    return revision;
}

function memoByRevision(entity, name, compute) {
    var revision = getTickRuntimeRevision(entity);
    var key = revision ? resolveEntityCacheKey(entity) : "";
    if (!key) {
        return compute();
    }
    var memo = cyberwareMemoByRevision[key];
    if (memo && memo.revision === revision && Object.prototype.hasOwnProperty.call(memo.values, name)) {
        return memo.values[name];
    }
    var value = compute();
    if (readFreshRuntimeRevision(entity) === revision) {
        if (!memo || memo.revision !== revision) {
            memo = { revision: revision, values: {} };
            cyberwareMemoByRevision[key] = memo;
        }
        memo.values[name] = value;
    }
    return value;
}

function getObjectiveCacheKey(player, entity, objectiveName) {
    return resolveScoreboardEntryName(player, entity) + "|" + String(objectiveName || "");
}

function getObjectiveScore(player, entity, objectiveName) {
    ensureObjectiveTickCache(entity);
    var cacheKey = getObjectiveCacheKey(player, entity, objectiveName);
    if (Object.prototype.hasOwnProperty.call(cyberwareObjectiveTickCache, cacheKey)) {
        return Number(cyberwareObjectiveTickCache[cacheKey] || 0);
    }
    var state = getObjective(entity.level, objectiveName);
    var scoreName = resolveScoreboardEntryName(player, entity);
    if (!state.scoreboard.hasPlayerScore(scoreName, state.objective)) {
        cyberwareObjectiveTickCache[cacheKey] = 0;
        return 0;
    }
    var value = state.scoreboard.getOrCreatePlayerScore(scoreName, state.objective).getScore();
    cyberwareObjectiveTickCache[cacheKey] = value;
    return value;
}

function setObjectiveScore(player, entity, objectiveName, value) {
    ensureObjectiveTickCache(entity);
    var normalized = Math.floor(value);
    if (!Number.isFinite(normalized)) {
        normalized = 0;
    }
    var cacheKey = getObjectiveCacheKey(player, entity, objectiveName);
    if (Object.prototype.hasOwnProperty.call(cyberwareObjectiveTickCache, cacheKey)
        && Number(cyberwareObjectiveTickCache[cacheKey]) === normalized) {
        return;
    }
    var state = getObjective(entity.level, objectiveName);
    var scoreName = resolveScoreboardEntryName(player, entity);
    var score = state.scoreboard.getOrCreatePlayerScore(scoreName, state.objective);
    if (score.getScore() !== normalized) {
        score.setScore(normalized);
    }
    cyberwareObjectiveTickCache[cacheKey] = normalized;
}

function parsePowerId(powerId) {
    var text = String(powerId || "");
    if (Object.prototype.hasOwnProperty.call(cyberwareResourceLocationCache, text)) {
        return cyberwareResourceLocationCache[text];
    }
    var parts = text.split(":");
    if (parts.length !== 2) {
        cyberwareRuntimeFail("Invalid power id '" + text + "'");
    }
    var parsed = new CWP_RUNTIME_RESOURCE_LOCATION(parts[0], parts[1]);
    cyberwareResourceLocationCache[text] = parsed;
    return parsed;
}

function getPowerHolder(entity, powerId) {
    if (!entity) {
        return null;
    }
    ensureObjectiveTickCache(entity);
    var entityKey = resolveEntityCacheKey(entity);
    var holderCacheKey = entityKey ? (entityKey + "|" + String(powerId || "")) : "";
    if (holderCacheKey && Object.prototype.hasOwnProperty.call(cyberwarePowerHolderTickCache, holderCacheKey)) {
        return cyberwarePowerHolderTickCache[holderCacheKey];
    }

    var level = entity.level;
    if (!level) {
        if (holderCacheKey) {
            cyberwarePowerHolderTickCache[holderCacheKey] = null;
        }
        return null;
    }
    var power = CWP_RUNTIME_POWER_MANAGER.getInstance(level).getPower(parsePowerId(powerId));
    if (!power) {
        if (holderCacheKey) {
            cyberwarePowerHolderTickCache[holderCacheKey] = null;
        }
        return null;
    }
    var handlerOptional = CWP_RUNTIME_POWER_MANAGER.getPowerHandler(entity);
    if (!handlerOptional || !handlerOptional.isPresent || !handlerOptional.isPresent()) {
        if (holderCacheKey) {
            cyberwarePowerHolderTickCache[holderCacheKey] = null;
        }
        return null;
    }
    var holder = handlerOptional.get().getPowerHolder(power);
    if (holderCacheKey) {
        cyberwarePowerHolderTickCache[holderCacheKey] = holder || null;
    }
    return holder;
}

function getAbilityInstance(holder, abilityId) {
    if (!holder) {
        return null;
    }
    var abilities = holder.getAbilities ? holder.getAbilities() : null;
    if (!abilities) {
        return null;
    }
    return abilities.get(String(abilityId));
}

function isSandevistanSlotEntry(slotEntry) {
    return !!(slotEntry && String(slotEntry.ability || "") === "Sandevistan");
}

function isBloodPumpSlotEntry(slotEntry) {
    return !!(slotEntry && String(slotEntry.ability || "") === BLOOD_PUMP_ABILITY_ID);
}

function getOsSlotEntry(entity) {
    return memoByRevision(entity, "slot_entry:os", function () {
        return computeOsSlotEntry(entity);
    });
}

function computeOsSlotEntry(entity) {
    var osItemId = getInstalledItem(entity, OS_SLOT_ID);
    if (osItemId && global.getCyberwareSlotEntry) {
        var registered = global.getCyberwareSlotEntry(OS_SLOT_ID, osItemId);
        if (registered) {
            return registered;
        }
    }
    if (osItemId && osItemId.indexOf("project_edgerunner:sandevistan_") === 0) {
        return {
            item: osItemId,
            power: osItemId,
            ability: "Sandevistan",
            cooldown_ticks: 0
        };
    }
    var variants = global.SANDEVISTAN_VARIANTS || [];
    for (var i = 0; i < variants.length; i++) {
        var variant = variants[i];
        if (!variant) {
            continue;
        }
        var powerId = String(variant.powerId || "");
        if (!powerId) {
            continue;
        }
        if (getPowerHolder(entity, powerId)) {
            return {
                item: String(variant.itemId || powerId),
                power: powerId,
                ability: "Sandevistan",
                cooldown_ticks: 0
            };
        }
    }
    return null;
}

function getOwnedSlotEntry(entity, slotId) {
    if (slotId === OS_SLOT_ID) {
        return getOsSlotEntry(entity);
    }
    return memoByRevision(entity, "slot_entry:" + String(slotId), function () {
        return computeOwnedSlotEntry(entity, slotId);
    });
}

function computeOwnedSlotEntry(entity, slotId) {

    var itemId = getInstalledItem(entity, slotId);
    if (itemId && global.getCyberwareSlotEntry) {
        var byItem = global.getCyberwareSlotEntry(slotId, itemId);
        if (byItem) {
            return byItem;
        }
    }

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
    return null;
}

function normalizeCyberwareData(entity) {
    if (!entity) {
        return null;
    }
    var runtimeEntity = getEntity(entity);
    ensureObjectiveTickCache(runtimeEntity);
    var cacheKey = resolveEntityCacheKey(runtimeEntity);
    if (cacheKey && Object.prototype.hasOwnProperty.call(cyberwareNormalizedDataTickCache, cacheKey)) {
        return cyberwareNormalizedDataTickCache[cacheKey];
    }
    var bridgeCyber = readCyberwareDataFromBridge(runtimeEntity);
    if (bridgeCyber) {
        if (cacheKey) {
            cyberwareNormalizedDataTickCache[cacheKey] = bridgeCyber;
        }
        return bridgeCyber;
    }
    if (!runtimeEntity.persistentData) {
        return null;
    }
    if (global.normalizeCyberwareInstalledData) {
        global.normalizeCyberwareInstalledData(runtimeEntity);
    }
    var cyber = runtimeEntity.persistentData.cyberware;
    if (!cyber) {
        cyber = {
            current_load: 0,
            installed_os: null,
            installed_components: {},
            installed_physical: {},
            installed_body_slots: {},
            installed_activation_slots: {}
        };
        runtimeEntity.persistentData.cyberware = cyber;
    }
    if (cacheKey) {
        cyberwareNormalizedDataTickCache[cacheKey] = cyber;
    }
    return cyber;
}

function readCyberInt(cyber, key) {
    if (!cyber) {
        return 0;
    }
    try {
        if (typeof cyber.getInt === "function") {
            return Math.floor(Number(cyber.getInt(String(key)) || 0));
        }
    } catch (err) {
    }
    try {
        if (cyber[key] !== undefined && cyber[key] !== null) {
            return Math.floor(Number(cyber[key] || 0));
        }
    } catch (err2) {
    }
    return 0;
}

function writeCyberInt(entity, cyber, key, value) {
    if (!entity || !cyber) {
        return;
    }
    var normalized = Math.max(0, Math.floor(Number(value || 0)));
    try {
        if (typeof cyber.putInt === "function") {
            cyber.putInt(String(key), normalized);
        } else {
            cyber[key] = normalized;
        }
    } catch (err) {
        try {
            cyber[key] = normalized;
        } catch (err2) {
        }
    }
    entity.persistentData.cyberware = cyber;
}

function removeCyberKey(entity, cyber, key) {
    if (!entity || !cyber) {
        return;
    }
    try {
        if (typeof cyber.remove === "function") {
            cyber.remove(String(key));
        }
    } catch (err) {
    }
    try {
        delete cyber[key];
    } catch (err2) {
        try {
            cyber[key] = undefined;
        } catch (err3) {
        }
    }
    entity.persistentData.cyberware = cyber;
}

function isAbilityUnlocked(ability) {
    return !!(ability && ability.isUnlocked && ability.isUnlocked());
}

function getBloodPumpSlotKey(prefix, slot) {
    return String(prefix || "") + Math.max(1, Math.floor(Number(slot || 0)));
}

function getBloodPumpSlotRechargeKey(slot) {
    return getBloodPumpSlotKey(BLOOD_PUMP_NBT_SLOT_RECHARGE_PREFIX, slot);
}

function getBloodPumpSlotRechargeMaxKey(slot) {
    return getBloodPumpSlotKey(BLOOD_PUMP_NBT_SLOT_RECHARGE_MAX_PREFIX, slot);
}

function getBloodPumpSlotInjectKey(slot) {
    return getBloodPumpSlotKey(BLOOD_PUMP_NBT_SLOT_INJECT_PREFIX, slot);
}

function getBloodPumpSlotEffectKey(slot) {
    return getBloodPumpSlotKey(BLOOD_PUMP_NBT_SLOT_EFFECT_PREFIX, slot);
}

function resolveBloodPumpMaxCharges(holder, entity) {
    if (holder) {
        if (isAbilityUnlocked(getAbilityInstance(holder, BLOOD_PUMP_CHARGE_CAPACITY_3_ABILITY_ID))) {
            return 3;
        }
        if (isAbilityUnlocked(getAbilityInstance(holder, BLOOD_PUMP_CHARGE_CAPACITY_2_ABILITY_ID))) {
            return 2;
        }
        if (isAbilityUnlocked(getAbilityInstance(holder, BLOOD_PUMP_CHARGE_CAPACITY_1_ABILITY_ID))) {
            return 1;
        }
    }

    var cyber = normalizeCyberwareData(entity);
    var cached = readCyberInt(cyber, BLOOD_PUMP_NBT_CHARGES_MAX_SEEN);
    return Math.max(1, cached || 1);
}

function clearBloodPumpState(entity) {
    var cyber = normalizeCyberwareData(entity);
    if (!cyber) {
        return;
    }
    removeCyberKey(entity, cyber, BLOOD_PUMP_NBT_CHARGES);
    removeCyberKey(entity, cyber, BLOOD_PUMP_NBT_RECHARGE_PENDING);
    removeCyberKey(entity, cyber, BLOOD_PUMP_NBT_RECHARGE_TICKS);
    removeCyberKey(entity, cyber, BLOOD_PUMP_NBT_CHARGES_MAX_SEEN);
    for (var slot = 1; slot <= BLOOD_PUMP_SLOT_COUNT; slot++) {
        removeCyberKey(entity, cyber, getBloodPumpSlotRechargeKey(slot));
        removeCyberKey(entity, cyber, getBloodPumpSlotRechargeMaxKey(slot));
        removeCyberKey(entity, cyber, getBloodPumpSlotInjectKey(slot));
        removeCyberKey(entity, cyber, getBloodPumpSlotEffectKey(slot));
    }
}

function reconcileBloodPumpState(entity, holder) {
    var cyber = normalizeCyberwareData(entity);
    var maxCharges = resolveBloodPumpMaxCharges(holder, entity);
    if (!cyber) {
        return {
            charges: 0,
            nextRechargeTicks: 0,
            activeTicks: 0,
            slotRechargeTicks: [0, 0, 0, 0],
            slotRechargeMaxTicks: [0, 0, 0, 0],
            slotInjectTicks: [0, 0, 0, 0],
            slotEffectTicks: [0, 0, 0, 0],
            maxCharges: maxCharges
        };
    }

    var slotRechargeTicks = [0, 0, 0, 0];
    var slotRechargeMaxTicks = [0, 0, 0, 0];
    var slotInjectTicks = [0, 0, 0, 0];
    var slotEffectTicks = [0, 0, 0, 0];
    var charges = 0;
    var nextRechargeTicks = 0;
    var activeTicks = 0;

    for (var slot = 1; slot <= BLOOD_PUMP_SLOT_COUNT; slot++) {
        if (slot > maxCharges) {
            continue;
        }
        var rechargeTicks = Math.max(0, readCyberInt(cyber, getBloodPumpSlotRechargeKey(slot)));
        var rechargeMaxTicks = 0;
        if (rechargeTicks > 0) {
            var storedRechargeMax = Math.max(0, readCyberInt(cyber, getBloodPumpSlotRechargeMaxKey(slot)));
            var defaultRechargeMax = Math.max(
                rechargeTicks,
                Math.floor(Number(BLOOD_PUMP_RUNTIME.RECHARGE_TICKS || 600))
            );
            rechargeMaxTicks = Math.max(rechargeTicks, storedRechargeMax > 0 ? storedRechargeMax : defaultRechargeMax);
        }
        var injectTicks = Math.max(0, readCyberInt(cyber, getBloodPumpSlotInjectKey(slot)));
        var effectTicks = Math.max(0, readCyberInt(cyber, getBloodPumpSlotEffectKey(slot)));
        slotRechargeTicks[slot] = rechargeTicks;
        slotRechargeMaxTicks[slot] = rechargeMaxTicks;
        slotInjectTicks[slot] = injectTicks;
        slotEffectTicks[slot] = effectTicks;
        if (rechargeTicks <= 0) {
            charges += 1;
        } else if (nextRechargeTicks <= 0 || rechargeTicks < nextRechargeTicks) {
            nextRechargeTicks = rechargeTicks;
        }
        if (effectTicks > activeTicks) {
            activeTicks = effectTicks;
        }
    }

    return {
        charges: charges,
        nextRechargeTicks: nextRechargeTicks,
        activeTicks: activeTicks,
        slotRechargeTicks: slotRechargeTicks,
        slotRechargeMaxTicks: slotRechargeMaxTicks,
        slotInjectTicks: slotInjectTicks,
        slotEffectTicks: slotEffectTicks,
        maxCharges: maxCharges
    };
}

function persistBloodPumpState(entity, state) {
    var cyber = normalizeCyberwareData(entity);
    if (!cyber || !state) {
        return;
    }
    writeCyberInt(entity, cyber, BLOOD_PUMP_NBT_CHARGES, Number(state.charges || 0));
    writeCyberInt(
        entity,
        cyber,
        BLOOD_PUMP_NBT_RECHARGE_PENDING,
        Math.max(0, Number(state.maxCharges || 0) - Number(state.charges || 0))
    );
    writeCyberInt(entity, cyber, BLOOD_PUMP_NBT_RECHARGE_TICKS, Number(state.nextRechargeTicks || 0));
    writeCyberInt(entity, cyber, BLOOD_PUMP_NBT_CHARGES_MAX_SEEN, Math.max(1, Number(state.maxCharges || 1)));
    for (var slot = 1; slot <= BLOOD_PUMP_SLOT_COUNT; slot++) {
        writeCyberInt(entity, cyber, getBloodPumpSlotRechargeKey(slot), Number(state.slotRechargeTicks && state.slotRechargeTicks[slot] || 0));
        writeCyberInt(entity, cyber, getBloodPumpSlotRechargeMaxKey(slot), Number(state.slotRechargeMaxTicks && state.slotRechargeMaxTicks[slot] || 0));
        writeCyberInt(entity, cyber, getBloodPumpSlotInjectKey(slot), Number(state.slotInjectTicks && state.slotInjectTicks[slot] || 0));
        writeCyberInt(entity, cyber, getBloodPumpSlotEffectKey(slot), Number(state.slotEffectTicks && state.slotEffectTicks[slot] || 0));
    }
}

function tickBloodPumpState(entity) {
    var entry = getOwnedSlotEntry(entity, CIRCULATORY_SLOT_ID);
    if (!entry || !isBloodPumpSlotEntry(entry)) {
        return null;
    }
    return reconcileBloodPumpState(entity, getPowerHolder(entity, entry.power));
}

function resolveSandeVariant(slotEntry, osItemId) {
    var variants = global.SANDEVISTAN_VARIANTS || [];
    var powerId = slotEntry && slotEntry.power ? String(slotEntry.power) : "";
    for (var i = 0; i < variants.length; i++) {
        var variant = variants[i];
        if (!variant) {
            continue;
        }
        if (String(variant.itemId || "") === osItemId) {
            return variant;
        }
        if (powerId && String(variant.powerId || "") === powerId) {
            return variant;
        }
    }
    return null;
}

function getUnlockedCooldownTier(powerHolder, tierCount) {
    if (!powerHolder || tierCount <= 0) {
        return 0;
    }
    var tier = 0;
    for (var i = 1; i <= tierCount; i++) {
        var upgradeAbility = getAbilityInstance(powerHolder, "upgrade_cooldown_" + i);
        if (upgradeAbility && upgradeAbility.isUnlocked && upgradeAbility.isUnlocked()) {
            tier = i;
        } else {
            break;
        }
    }
    return tier;
}

function getSandeUpgradeData(variant) {
    var helpers = global.SANDEVISTAN_HELPERS || {};
    if (!helpers.getUpgradeData || !variant || !variant.id) {
        return null;
    }
    try {
        return helpers.getUpgradeData(variant);
    } catch (err) {
        return null;
    }
}

function resolveSandeCooldownSeconds(variant, powerHolder, slotEntry) {
    var cooldownSeconds = Number(variant && variant.cooldownSeconds);
    var upgradeData = getSandeUpgradeData(variant);

    if (upgradeData && upgradeData.cooldown && upgradeData.cooldown.values) {
        var tierCount = Number(upgradeData.cooldown.tierCount || 0);
        var activeTier = getUnlockedCooldownTier(powerHolder, tierCount);
        var tierValue = Number(upgradeData.cooldown.values[activeTier]);
        if (Number.isFinite(tierValue) && tierValue > 0) {
            cooldownSeconds = tierValue;
        }
    }

    if (!Number.isFinite(cooldownSeconds) || cooldownSeconds <= 0) {
        var fromSlotTicks = Number(slotEntry && slotEntry.cooldown_ticks || 0);
        if (Number.isFinite(fromSlotTicks) && fromSlotTicks > 0) {
            cooldownSeconds = fromSlotTicks / 20;
        }
    }

    if (!Number.isFinite(cooldownSeconds) || cooldownSeconds <= 0) {
        cooldownSeconds = DEFAULT_SANDE_COOLDOWN_SECONDS;
    }

    return cooldownSeconds;
}

function resolveSandeActivationCost(variant) {
    var percent = Number(variant && variant.activationCostPercent);
    if (!Number.isFinite(percent)) {
        percent = DEFAULT_SANDE_ACTIVATION_COST_PERCENT;
    }
    if (percent < 0) {
        percent = 0;
    }
    if (percent > 1) {
        percent = 1;
    }
    return Math.max(1, Math.round(SANDY_MAX_SCORE * percent));
}

function computeDynamicOsCooldownTicks(player, entity, slotEntry) {
    if (!isSandevistanSlotEntry(slotEntry)) {
        return null;
    }

    var osItemId = getInstalledItem(entity, OS_SLOT_ID);
    var variant = resolveSandeVariant(slotEntry, osItemId);
    var currentCharge = getObjectiveScore(player, entity, "er_sandy_charge");
    if (currentCharge < 0) {
        currentCharge = 0;
    } else if (currentCharge > SANDY_MAX_SCORE) {
        currentCharge = SANDY_MAX_SCORE;
    }

    var isActive = getObjectiveScore(player, entity, "er_sandy_active") > 0;
    if (isActive) {
        return 0;
    }

    var holder = getPowerHolder(entity, slotEntry.power);
    var cooldownSeconds = resolveSandeCooldownSeconds(variant, holder, slotEntry);
    var cooldownTicks = Math.max(1, Math.round(cooldownSeconds * 20));
    var rechargePerTick = Math.max(1, Math.ceil(SANDY_MAX_SCORE / cooldownTicks));
    var activationCost = resolveSandeActivationCost(variant);
    var deficit = Math.max(0, activationCost - currentCharge);
    return Math.max(0, Math.ceil(deficit / rechargePerTick));
}

function syncPointerCooldownVisual(player, entity, pointerAbilityId, cooldownTicks, cacheKey, options) {
    var holder = getPowerHolder(entity, CW_POINTER_CORE_POWER_ID);
    var ability = getAbilityInstance(holder, pointerAbilityId);
    if (!ability) {
        return;
    }

    var normalized = Math.max(0, Math.floor(cooldownTicks));
    var key = cacheKey;
    var last = Number(entity.persistentData[key]);

    var preferDirectSet = !!(options && options.preferDirectSet);
    if (preferDirectSet) {
        var current = Math.max(0, Math.floor(Number(ability.cooldown || 0)));
        var maxCurrent = Math.max(0, Math.floor(Number(ability.maxCooldown || 0)));
        if (current !== normalized || (normalized === 0 && maxCurrent > 0)) {
            if (normalized <= 0) {
                ability.cooldown = 0;
                ability.maxCooldown = 0;
                syncAbilityStateSafely(ability, entity);
            } else if (maxCurrent <= 0 || current <= 0) {
                // Fresh cooldown: establish both remaining and max for the bar fill ratio.
                if (typeof ability.startCooldown === "function") {
                    ability.startCooldown(entity, normalized);
                } else {
                    ability.cooldown = normalized;
                    ability.maxCooldown = normalized;
                    syncAbilityStateSafely(ability, entity);
                }
            } else {
                // Active cooldown: update remaining without resetting maxCooldown.
                // startCooldown() here would snap the bar back to 100% every sync tick.
                ability.cooldown = normalized;
                if (normalized > maxCurrent) {
                    ability.maxCooldown = normalized;
                }
                syncAbilityStateSafely(ability, entity);
            }
        }
        if (!Number.isFinite(last) || last !== normalized) {
            entity.persistentData[key] = normalized;
        }
        return;
    }

    if (typeof ability.startCooldown !== "function") {
        return;
    }
    if (Number.isFinite(last) && last === normalized) {
        return;
    }
    entity.persistentData[key] = normalized;
    ability.startCooldown(entity, normalized);
}

function syncOsPointerCooldownVisual(player, entity, cooldownTicks) {
    syncPointerCooldownVisual(player, entity, OS_POINTER_ABILITY_ID, cooldownTicks, "cyberware_ui_cd_os");
}

function syncCirculatoryPointerCooldownVisual(player, entity, cooldownTicks) {
    var normalized = Math.max(0, Math.floor(cooldownTicks));
    var key = "cyberware_ui_cd_circulatory_source";
    var pointerHolder = getPowerHolder(entity, CW_POINTER_CORE_POWER_ID);
    var pointerAbility = getAbilityInstance(pointerHolder, CIRCULATORY_POINTER_ABILITY_ID);
    if (pointerAbility) {
        try {
            if (Number(pointerAbility.cooldown || 0) > 0 || Number(pointerAbility.maxCooldown || 0) > 0) {
                pointerAbility.cooldown = 0;
                pointerAbility.maxCooldown = 0;
                if (typeof pointerAbility.syncState === "function") {
                    pointerAbility.syncState(entity);
                }
            }
        } catch (err) {
        }
    }
    if (Number(entity.persistentData.cyberware_ui_cd_circulatory || 0) !== 0) {
        entity.persistentData.cyberware_ui_cd_circulatory = 0;
    }
    if (Number(entity.persistentData[key]) !== normalized) {
        entity.persistentData[key] = normalized;
    }
}

function syncStaticPointerCooldownVisual(player, entity, slotId) {
    var pointerAbilityId = "";
    var cacheKey = "";
    if (slotId === ARMS_SLOT_ID) {
        pointerAbilityId = ARMS_POINTER_ABILITY_ID;
        cacheKey = "cyberware_ui_cd_arms";
    } else if (slotId === FACE_SLOT_ID) {
        pointerAbilityId = FACE_POINTER_ABILITY_ID;
        cacheKey = "cyberware_ui_cd_face";
    } else if (slotId === EXTRA_SLOT_ID) {
        return;
    } else {
        return;
    }
    syncPointerCooldownVisual(
        player,
        entity,
        pointerAbilityId,
        getObjectiveScore(player, entity, getCooldownObjective(slotId)),
        cacheKey,
        { preferDirectSet: true }
    );
}

function updateFaceRuntimeScores(player, entity) {
    var durationTicks = getFaceScanDurationTicks();
    var objective = getCooldownObjective(FACE_SLOT_ID);
    var entry = getOwnedSlotEntry(entity, FACE_SLOT_ID);
    if (!entry || !entry.power || !entry.ability) {
        setObjectiveScore(player, entity, FACE_ACTIVE_TICKS_OBJECTIVE, 0);
        setObjectiveScore(player, entity, FACE_ACTIVE_MAX_OBJECTIVE, 0);
        setObjectiveScore(player, entity, "er_face_scan_mode", 0);
        setObjectiveScore(player, entity, objective, 0);
        syncStaticPointerCooldownVisual(player, entity, FACE_SLOT_ID);
        return;
    }

    var holder = getPowerHolder(entity, entry.power);
    var ability = getAbilityInstance(holder, entry.ability);
    if (!ability) {
        setObjectiveScore(player, entity, FACE_ACTIVE_TICKS_OBJECTIVE, 0);
        setObjectiveScore(player, entity, FACE_ACTIVE_MAX_OBJECTIVE, durationTicks);
        setObjectiveScore(player, entity, "er_face_scan_mode", 0);
        setObjectiveScore(player, entity, objective, 0);
        syncStaticPointerCooldownVisual(player, entity, FACE_SLOT_ID);
        return;
    }

    var enabled = ability.isEnabled ? !!ability.isEnabled() : false;
    var activeTicks = enabled ? Math.max(0, Math.floor(Number(ability.activationTimer || 0))) : 0;
    var internalCooldown = Math.max(0, Math.floor(Number(ability.cooldown || 0)));

    setObjectiveScore(player, entity, FACE_ACTIVE_TICKS_OBJECTIVE, activeTicks);
    setObjectiveScore(player, entity, FACE_ACTIVE_MAX_OBJECTIVE, durationTicks);
    if (!enabled && getObjectiveScore(player, entity, "er_face_scan_mode") > 0) {
        setObjectiveScore(player, entity, "er_face_scan_mode", 0);
    }

    if (enabled && activeTicks > 0) {
        setObjectiveScore(player, entity, objective, 0);
        syncStaticPointerCooldownVisual(player, entity, FACE_SLOT_ID);
        return;
    }

    setObjectiveScore(player, entity, objective, internalCooldown);
    syncStaticPointerCooldownVisual(player, entity, FACE_SLOT_ID);
}

function updateBloodPumpRuntimeScores(player, entity) {
    var durationTicks = Math.max(0, Math.floor(Number(global.BLOOD_PUMP_REGEN_TICKS || BLOOD_PUMP_RUNTIME.EFFECT_TICKS || 0)));
    var entry = getOwnedSlotEntry(entity, CIRCULATORY_SLOT_ID);
    if (!entry || !isBloodPumpSlotEntry(entry)) {
        setObjectiveScore(player, entity, BLOOD_PUMP_ACTIVE_TICKS_OBJECTIVE, 0);
        setObjectiveScore(player, entity, BLOOD_PUMP_ACTIVE_MAX_OBJECTIVE, 0);
        setObjectiveScore(player, entity, BLOOD_PUMP_CHARGES_OBJECTIVE, 0);
        setObjectiveScore(player, entity, BLOOD_PUMP_CHARGES_MAX_OBJECTIVE, 0);
        return;
    }

    var holder = getPowerHolder(entity, entry.power);
    var state = reconcileBloodPumpState(entity, holder);
    setObjectiveScore(player, entity, BLOOD_PUMP_ACTIVE_TICKS_OBJECTIVE, Math.max(0, Math.floor(Number(state.activeTicks || 0))));
    setObjectiveScore(player, entity, BLOOD_PUMP_ACTIVE_MAX_OBJECTIVE, durationTicks);
    setObjectiveScore(player, entity, BLOOD_PUMP_CHARGES_OBJECTIVE, Math.max(0, Math.floor(Number(state.charges || 0))));
    setObjectiveScore(player, entity, BLOOD_PUMP_CHARGES_MAX_OBJECTIVE, Math.max(0, Math.floor(Number(state.maxCharges || 0))));
}

function syncAxolotlProcPointerVisuals(player, entity) {
    // OS pointer remains always spammable by design (kept at 0), so we only sync visible slot pointers.
    syncPointerCooldownVisual(
        player,
        entity,
        ARMS_POINTER_ABILITY_ID,
        getObjectiveScore(player, entity, getCooldownObjective(ARMS_SLOT_ID)),
        "cyberware_ui_cd_arms",
        { preferDirectSet: true }
    );
    syncPointerCooldownVisual(
        player,
        entity,
        FACE_POINTER_ABILITY_ID,
        resolveFaceCooldownTicksForSync(player, entity),
        "cyberware_ui_cd_face",
        { preferDirectSet: true }
    );
    syncCirculatoryPointerCooldownVisual(player, entity, getObjectiveScore(player, entity, getCooldownObjective(CIRCULATORY_SLOT_ID)));
}

function syncAbilityStateSafely(ability, entity) {
    if (!ability || typeof ability.syncState !== "function") {
        return;
    }
    try {
        ability.syncState(entity);
    } catch (err) {
    }
}

function applyAbilityCooldownState(entity, ability, remainingTicks, maxTicks) {
    if (!ability) {
        return false;
    }
    var remaining = Math.max(0, Math.floor(Number(remainingTicks || 0)));
    var max = remaining > 0
        ? Math.max(remaining, Math.floor(Number(maxTicks || remaining)))
        : 0;
    try {
        if (typeof ability.setClientState === "function" && typeof ability.getHolder === "function") {
            var holder = ability.getHolder();
            ability.setClientState(
                entity,
                holder,
                ability.isUnlocked ? !!ability.isUnlocked() : true,
                ability.isEnabled ? !!ability.isEnabled() : false,
                remaining,
                max,
                Math.max(0, Math.floor(Number(ability.activationTimer || 0))),
                Math.max(0, Math.floor(Number(ability.maxActivationTimer || 0)))
            );
            syncAbilityStateSafely(ability, entity);
            return true;
        }
    } catch (err) {
    }
    ability.cooldown = remaining;
    ability.maxCooldown = max;
    syncAbilityStateSafely(ability, entity);
    return true;
}

function resolveFaceCooldownTicksForSync(player, entity) {
    var entry = getOwnedSlotEntry(entity, FACE_SLOT_ID);
    if (entry && entry.power && entry.ability) {
        var holder = getPowerHolder(entity, entry.power);
        var ability = getAbilityInstance(holder, entry.ability);
        if (ability) {
            return Math.max(0, Math.floor(Number(ability.cooldown || 0)));
        }
    }
    return getObjectiveScore(player, entity, getCooldownObjective(FACE_SLOT_ID));
}

function reducePointerAbilityCooldown(entity, pointerAbilityId, reductionFactor) {
    var holder = getPowerHolder(entity, CW_POINTER_CORE_POWER_ID);
    var ability = getAbilityInstance(holder, pointerAbilityId);
    if (!ability) {
        return {
            before: 0,
            after: 0
        };
    }

    var current = Math.max(0, Math.floor(Number(ability.cooldown || 0)));
    if (current <= 0) {
        return {
            before: current,
            after: current
        };
    }

    var normalizedFactor = Math.max(0, Math.min(1, Number(reductionFactor || 0)));
    var reduced = Math.max(0, Math.floor(current * (1 - normalizedFactor)));
    if (reduced === current && current > 0) {
        reduced = current - 1;
    }

    var maxCooldown = Math.max(0, Math.floor(Number(ability.maxCooldown || 0)));
    if (maxCooldown <= 0 && current > 0) {
        maxCooldown = current;
    }
    applyAbilityCooldownState(entity, ability, reduced, reduced > 0 ? maxCooldown : 0);
    return {
        before: current,
        after: reduced
    };
}

function reduceVisiblePointerCooldowns(entity, reductionFactor) {
    // OS stays key-pressable; Blood Pump has its own charge/recharge visual.
    reducePointerAbilityCooldown(entity, ARMS_POINTER_ABILITY_ID, reductionFactor);
    reducePointerAbilityCooldown(entity, FACE_POINTER_ABILITY_ID, reductionFactor);
}

function computeBloodPumpCooldownTicks(entity, slotEntry) {
    if (!isBloodPumpSlotEntry(slotEntry)) {
        return null;
    }
    var holder = getPowerHolder(entity, slotEntry.power);
    var state = reconcileBloodPumpState(entity, holder);
    var charges = Math.max(0, Math.floor(Number(state.charges || 0)));
    var nextRechargeTicks = Math.max(0, Math.floor(Number(state.nextRechargeTicks || 0)));
    try {
        if (BLOOD_PUMP_RUNTIME && typeof BLOOD_PUMP_RUNTIME.sharedPointerCooldownTicks === "function") {
            return Math.max(0, Math.floor(Number(BLOOD_PUMP_RUNTIME.sharedPointerCooldownTicks(charges, nextRechargeTicks)) || 0));
        }
    } catch (errPolicy) {
    }
    return charges > 0 ? 0 : nextRechargeTicks;
}

function resolveAxolotlReductionPercent(entity) {
    var holder = getPowerHolder(entity, AXOLOTL_POWER_ID);
    if (!holder) {
        return AXOLOTL_MIN_REDUCTION_PERCENT;
    }
    var maxUpgrade = getAbilityInstance(holder, AXOLOTL_UPGRADE_MAX_ABILITY_ID);
    if (maxUpgrade && maxUpgrade.isUnlocked && maxUpgrade.isUnlocked()) {
        return AXOLOTL_MAX_REDUCTION_PERCENT;
    }
    return AXOLOTL_MIN_REDUCTION_PERCENT;
}

function reduceObjectiveCooldown(player, entity, objectiveName, reductionFactor) {
    var current = getObjectiveScore(player, entity, objectiveName);
    if (current <= 0) {
        return;
    }
    var reduced = Math.max(0, Math.floor(current * (1 - reductionFactor)));
    if (reduced === current && current > 0) {
        reduced = current - 1;
    }
    setObjectiveScore(player, entity, objectiveName, reduced);
    sendDebugChat(player, "slot_cd " + objectiveName + ": " + current + " -> " + reduced);
}

function reduceDynamicOsCooldown(player, entity, reductionFactor) {
    var osEntry = getOsSlotEntry(entity);
    var isActive = getObjectiveScore(player, entity, "er_sandy_active") > 0;
    if (!isSandevistanSlotEntry(osEntry) && !isActive) {
        return;
    }
    var javaReductionSerial = Math.max(0, Math.floor(Number(entity.persistentData[AXOLOTL_SANDE_REDUCTION_SERIAL_KEY] || 0)));
    var seenReductionSerial = Math.max(0, Math.floor(Number(entity.persistentData[AXOLOTL_SANDE_REDUCTION_SEEN_SERIAL_KEY] || 0)));
    if (javaReductionSerial > seenReductionSerial) {
        entity.persistentData[AXOLOTL_SANDE_REDUCTION_SEEN_SERIAL_KEY] = javaReductionSerial;
        sendDebugChat(player, "sandevistan charge handled by Java | serial=" + javaReductionSerial);
        return;
    }
    var currentCharge = getObjectiveScore(player, entity, "er_sandy_charge");
    if (currentCharge < 0) {
        currentCharge = 0;
    }
    if (currentCharge > SANDY_MAX_SCORE) {
        currentCharge = SANDY_MAX_SCORE;
    }
    var variant = resolveSandeVariant(osEntry, getInstalledItem(entity, OS_SLOT_ID));
    var activationCost = resolveSandeActivationCost(variant);
    if (activationCost <= 0) {
        return;
    }

    // Axolotl rule for Sandevistan: increase er_sandy_charge by the same reduction percent of max bar.
    var chargeGain = Math.max(1, Math.floor(SANDY_MAX_SCORE * reductionFactor));
    var boosted = Math.min(SANDY_MAX_SCORE, currentCharge + chargeGain);
    setObjectiveScore(player, entity, "er_sandy_charge", boosted);
    sendDebugChat(
        player,
        "sandevistan charge: " + currentCharge + " -> " + boosted +
        " | gain=" + chargeGain + " | factor=" + reductionFactor + " | activationCost=" + activationCost + " | active=" + isActive
    );
}

function reduceBloodPumpInternalCooldown(entity, reductionFactor) {
    var runtimeEntity = entity && entity.minecraftEntity ? entity.minecraftEntity : entity;
    var normalizedFactor = Math.max(0, Math.min(1, Number(reductionFactor || 0)));

    try {
        if (BLOOD_PUMP_RUNTIME && typeof BLOOD_PUMP_RUNTIME.reduceRechargeTicks === "function") {
            var reducedPair = BLOOD_PUMP_RUNTIME.reduceRechargeTicks(runtimeEntity, BLOOD_PUMP_POWER_ID, normalizedFactor);
            if (reducedPair) {
                var beforeJava = Math.max(0, Math.floor(Number(reducedPair[0] || 0)));
                var afterJava = Math.max(0, Math.floor(Number(reducedPair[1] || 0)));
                return {
                    before: beforeJava,
                    after: afterJava
                };
            }
        }
    } catch (javaErr) {
    }

    var entry = getOwnedSlotEntry(entity, CIRCULATORY_SLOT_ID);
    if (!entry || !isBloodPumpSlotEntry(entry)) {
        return null;
    }
    var holder = getPowerHolder(entity, entry.power);
    var state = reconcileBloodPumpState(entity, holder);
    var current = Number(state.nextRechargeTicks || 0);
    if (!Number.isFinite(current) || current <= 0) {
        return {
            before: Math.max(0, Math.floor(current || 0)),
            after: Math.max(0, Math.floor(current || 0))
        };
    }
    for (var slot = 1; slot <= Math.max(0, Math.floor(Number(state.maxCharges || 0))); slot++) {
        var slotCurrent = Number(state.slotRechargeTicks && state.slotRechargeTicks[slot] || 0);
        if (!Number.isFinite(slotCurrent) || slotCurrent <= 0) {
            if (state.slotRechargeMaxTicks) {
                state.slotRechargeMaxTicks[slot] = 0;
            }
            continue;
        }
        var slotCurrentMax = Number(state.slotRechargeMaxTicks && state.slotRechargeMaxTicks[slot] || 0);
        if (!Number.isFinite(slotCurrentMax) || slotCurrentMax <= 0) {
            slotCurrentMax = Math.max(slotCurrent, Math.floor(Number(BLOOD_PUMP_RUNTIME.RECHARGE_TICKS || 600)));
        }
        var slotReduced = Math.max(0, Math.floor(slotCurrent * (1 - normalizedFactor)));
        if (slotReduced === slotCurrent && slotCurrent > 0) {
            slotReduced = slotCurrent - 1;
        }
        var slotElapsed = Math.max(0, slotCurrentMax - slotCurrent);
        var slotReducedMax = slotReduced > 0 ? Math.max(slotReduced, slotElapsed + slotReduced) : 0;
        state.slotRechargeTicks[slot] = slotReduced;
        if (state.slotRechargeMaxTicks) {
            state.slotRechargeMaxTicks[slot] = slotReducedMax;
        }
    }
    state.charges = 0;
    state.nextRechargeTicks = 0;
    state.activeTicks = 0;
    for (var slotRecalc = 1; slotRecalc <= Math.max(0, Math.floor(Number(state.maxCharges || 0))); slotRecalc++) {
        var rechargeValue = Math.max(0, Math.floor(Number(state.slotRechargeTicks && state.slotRechargeTicks[slotRecalc] || 0)));
        var rechargeMaxValue = Math.max(0, Math.floor(Number(state.slotRechargeMaxTicks && state.slotRechargeMaxTicks[slotRecalc] || 0)));
        var effectValue = Math.max(0, Math.floor(Number(state.slotEffectTicks && state.slotEffectTicks[slotRecalc] || 0)));
        state.slotRechargeTicks[slotRecalc] = rechargeValue;
        if (state.slotRechargeMaxTicks) {
            state.slotRechargeMaxTicks[slotRecalc] = rechargeValue > 0 ? Math.max(rechargeValue, rechargeMaxValue) : 0;
        }
        if (rechargeValue <= 0) {
            state.charges += 1;
        } else if (state.nextRechargeTicks <= 0 || rechargeValue < state.nextRechargeTicks) {
            state.nextRechargeTicks = rechargeValue;
        }
        if (effectValue > state.activeTicks) {
            state.activeTicks = effectValue;
        }
    }
    persistBloodPumpState(entity, state);
    return {
        before: Math.max(0, Math.floor(current)),
        after: Math.max(0, Math.floor(Number(state.nextRechargeTicks || 0)))
    };
}

function reduceFaceInternalCooldown(entity, reductionFactor) {
    var entry = getOwnedSlotEntry(entity, FACE_SLOT_ID);
    if (!entry || !entry.power || !entry.ability) {
        return null;
    }
    var holder = getPowerHolder(entity, entry.power);
    var ability = getAbilityInstance(holder, entry.ability);
    if (!ability) {
        return null;
    }
    var current = Number(ability.cooldown || 0);
    if (!Number.isFinite(current) || current <= 0) {
        return {
            before: Math.max(0, Math.floor(current || 0)),
            after: Math.max(0, Math.floor(current || 0))
        };
    }
    var reduced = Math.max(0, Math.floor(current * (1 - reductionFactor)));
    if (reduced === current && current > 0) {
        reduced = current - 1;
    }
    var maxCurrent = Math.max(0, Math.floor(Number(ability.maxCooldown || 0)));
    if (maxCurrent <= 0 && current > 0) {
        maxCurrent = Math.max(0, Math.floor(current));
    }
    applyAbilityCooldownState(entity, ability, reduced, reduced > 0 ? maxCurrent : 0);
    return {
        before: Math.max(0, Math.floor(current)),
        after: Math.max(0, Math.floor(reduced))
    };
}

function applyAxolotlKillTrigger(player, entity, killType, trigger) {
    if (!hasAxolotlActive(entity)) {
        debugAxolotlSnapshot(player, entity, "proc_canceled", "reason=axolotl_not_equipped_js");
        return false;
    }

    var reductionPercent = resolveAxolotlReductionPercent(entity);
    var reductionFactor = Math.max(0, Math.min(1, Number(reductionPercent) / 100));
    if (reductionFactor <= 0) {
        debugAxolotlSnapshot(player, entity, "proc_canceled", "reason=invalid_reduction_factor");
        return false;
    }

    debugAxolotlSnapshot(player, entity, "proc_start", "reduction=" + reductionPercent + "% factor=" + reductionFactor);

    setObjectiveScore(player, entity, AXOLOTL_LAST_REDUCTION_BP_OBJECTIVE, Math.floor(reductionFactor * 10000));
    setObjectiveScore(player, entity, AXOLOTL_LAST_PROC_TICK_OBJECTIVE, Math.floor(Number(entity.level.gameTime || 0)));
    setObjectiveScore(
        player,
        entity,
        AXOLOTL_PROC_APPLIED_OBJECTIVE,
        getObjectiveScore(player, entity, AXOLOTL_PROC_APPLIED_OBJECTIVE) + 1
    );

    var slotIds = getSlotIds();
    for (var i = 0; i < slotIds.length; i++) {
        var objective = getCooldownObjective(slotIds[i]);
        reduceObjectiveCooldown(player, entity, objective, reductionFactor);
    }

    reduceDynamicOsCooldown(player, entity, reductionFactor);
    var osEntryAfterReduction = getOsSlotEntry(entity);
    var dynamicOsAfterReduction = computeDynamicOsCooldownTicks(player, entity, osEntryAfterReduction);
    if (dynamicOsAfterReduction !== null) {
        setObjectiveScore(player, entity, getCooldownObjective(OS_SLOT_ID), dynamicOsAfterReduction);
    }

    var bloodPumpReduce = reduceBloodPumpInternalCooldown(entity, reductionFactor);
    if (bloodPumpReduce) {
        setObjectiveScore(player, entity, BP_DEBUG_LAST_REDUCE_BEFORE_OBJECTIVE, Number(bloodPumpReduce.before || 0));
        setObjectiveScore(player, entity, BP_DEBUG_LAST_REDUCE_AFTER_OBJECTIVE, Number(bloodPumpReduce.after || 0));
        setObjectiveScore(player, entity, getCooldownObjective(CIRCULATORY_SLOT_ID), Number(bloodPumpReduce.after || 0));
        sendDebugChat(player, "blood_pump ability cooldown: " + Number(bloodPumpReduce.before || 0) + " -> " + Number(bloodPumpReduce.after || 0));
    }
    var faceReduce = reduceFaceInternalCooldown(entity, reductionFactor);
    if (faceReduce) {
        setObjectiveScore(player, entity, getCooldownObjective(FACE_SLOT_ID), Number(faceReduce.after || 0));
        sendDebugChat(player, "face ability cooldown: " + Number(faceReduce.before || 0) + " -> " + Number(faceReduce.after || 0));
    }

    // Reflect the reduced cooldowns immediately in pointer abilities UI.
    reduceVisiblePointerCooldowns(entity, reductionFactor);
    entity.persistentData.cyberware_ui_cd_face = -1;
    entity.persistentData.cyberware_ui_cd_arms = -1;
    syncAxolotlProcPointerVisuals(player, entity);

    debugAxolotlSnapshot(
        player,
        entity,
        "proc_end",
        "procApplied=" + getObjectiveScore(player, entity, AXOLOTL_PROC_APPLIED_OBJECTIVE)
    );
    return true;
}

function getUnlockedSpecialTier(powerHolder, branch) {
    if (!powerHolder || !branch || !branch.id || Number(branch.tierCount || 0) <= 0) {
        return 0;
    }
    var tier = 0;
    for (var i = 1; i <= Number(branch.tierCount || 0); i++) {
        var upgradeAbility = getAbilityInstance(powerHolder, "upgrade_special_" + branch.id + "_" + i);
        if (upgradeAbility && upgradeAbility.isUnlocked && upgradeAbility.isUnlocked()) {
            tier = i;
        } else {
            break;
        }
    }
    return tier;
}

function resolveSpecialBranchValue(powerHolder, branch) {
    if (!branch || !Array.isArray(branch.values) || branch.values.length === 0) {
        return 0;
    }
    var unlockedTier = getUnlockedSpecialTier(powerHolder, branch);
    if (branch.baseActive) {
        var baseIndex = Math.max(0, Math.min(unlockedTier, branch.values.length - 1));
        return Number(branch.values[baseIndex] || 0);
    }
    if (unlockedTier <= 0) {
        return 0;
    }
    var upgradeIndex = Math.max(0, Math.min(unlockedTier - 1, branch.values.length - 1));
    return Number(branch.values[upgradeIndex] || 0);
}

function extendActiveSandeCharge(player, entity, percentValue) {
    var percent = Number(percentValue || 0);
    if (!Number.isFinite(percent) || percent <= 0) {
        return false;
    }
    if (getObjectiveScore(player, entity, "er_sandy_active") <= 0) {
        return false;
    }
    var currentCharge = getObjectiveScore(player, entity, "er_sandy_charge");
    if (currentCharge <= 0) {
        return false;
    }
    var chargeGain = Math.max(1, Math.floor(SANDY_MAX_SCORE * (percent / 100)));
    var boosted = Math.min(SANDY_MAX_SCORE, currentCharge + chargeGain);
    if (boosted === currentCharge) {
        return false;
    }
    setObjectiveScore(player, entity, "er_sandy_charge", boosted);
    return true;
}

function healEntityByMaxHealthPercent(entity, percentValue) {
    if (!entity) {
        return false;
    }
    var percent = Number(percentValue || 0);
    if (!Number.isFinite(percent) || percent <= 0) {
        return false;
    }
    var maxHealth = Number(entity.getMaxHealth ? entity.getMaxHealth() : 0);
    if (!Number.isFinite(maxHealth) || maxHealth <= 0) {
        return false;
    }
    var amount = maxHealth * (percent / 100);
    if (!Number.isFinite(amount) || amount <= 0) {
        return false;
    }
    if (typeof entity.heal === "function") {
        entity.heal(amount);
        return true;
    }
    return false;
}

function applySandeNeutralizeProc(player, entity) {
    if (getObjectiveScore(player, entity, "er_sandy_active") <= 0) {
        return false;
    }

    var osEntry = getOsSlotEntry(entity);
    if (!isSandevistanSlotEntry(osEntry)) {
        return false;
    }

    var variant = resolveSandeVariant(osEntry, getInstalledItem(entity, OS_SLOT_ID));
    var upgradeData = getSandeUpgradeData(variant);
    var specialTree = upgradeData && upgradeData.specialTree;
    if (!specialTree || !Array.isArray(specialTree.branches) || specialTree.branches.length === 0) {
        return false;
    }

    var powerHolder = getPowerHolder(entity, osEntry.power);
    if (!powerHolder) {
        return false;
    }

    var applied = false;
    specialTree.branches.forEach(function (branch) {
        var activeValue = resolveSpecialBranchValue(powerHolder, branch);
        if (!Number.isFinite(activeValue) || activeValue <= 0) {
            return;
        }
        if (branch.effectType === "duration_extend") {
            if (extendActiveSandeCharge(player, entity, activeValue)) {
                applied = true;
            }
            return;
        }
        if (branch.effectType === "heal_percent_max_health") {
            if (healEntityByMaxHealthPercent(entity, activeValue)) {
                applied = true;
            }
        }
    });
    return applied;
}

function processCyberwareKillTrigger(player, entity) {
    var trigger = getObjectiveScore(player, entity, AXOLOTL_KILL_TRIGGER_OBJECTIVE);
    if (trigger <= 0) {
        return;
    }

    var killType = getObjectiveScore(player, entity, AXOLOTL_LAST_KILL_TYPE_OBJECTIVE);
    debugAxolotlSnapshot(player, entity, "trigger_received", "killType=" + killType + " | raw=" + trigger);

    setObjectiveScore(player, entity, AXOLOTL_KILL_TRIGGER_OBJECTIVE, 0);
    applyAxolotlKillTrigger(player, entity, killType, trigger);
}

function getSlotIdentity(entity, slotId) {
    if (slotId === OS_SLOT_ID) {
        var osItem = getInstalledItem(entity, OS_SLOT_ID);
        if (osItem) {
            return "item:" + osItem;
        }
        var osEntry = getOsSlotEntry(entity);
        if (osEntry && osEntry.power) {
            return "power:" + String(osEntry.power);
        }
        return "";
    }
    var item = getInstalledItem(entity, slotId);
    if (item) {
        return "item:" + item;
    }
    var ownedEntry = getOwnedSlotEntry(entity, slotId);
    if (ownedEntry && ownedEntry.power) {
        return "power:" + String(ownedEntry.power);
    }
    return "";
}

function resetSlotCooldownIfItemChanged(player, entity, slotId) {
    var objective = getCooldownObjective(slotId);
    var nowItem = getSlotIdentity(entity, slotId);
    var key = "cyberware_last_item_" + slotId;
    var lastItem = String(entity.persistentData[key] || "");
    if (nowItem !== lastItem) {
        entity.persistentData[key] = nowItem;
        var currentCooldown = getObjectiveScore(player, entity, objective);
        var preserveSuppressorCooldown = slotId === EXTRA_SLOT_ID
            && !nowItem
            && lastItem === ("item:" + SUPPRESSOR_ITEM_ID)
            && currentCooldown > 0;
        if (!preserveSuppressorCooldown) {
            setObjectiveScore(player, entity, objective, 0);
        }
        if (slotId === OS_SLOT_ID) {
            entity.persistentData.cyberware_ui_cd_os = -1;
        } else if (slotId === CIRCULATORY_SLOT_ID) {
            // On first sync after join, lastItem is often empty; don't wipe authoritative runtime state.
            var hadPrevious = !!lastItem;
            if (hadPrevious) {
                clearBloodPumpState(entity);
            }
            entity.persistentData.cyberware_ui_cd_circulatory = -1;
            entity.persistentData.cyberware_ui_cd_circulatory_source = -1;
        } else if (slotId === EXTRA_SLOT_ID) {
            entity.persistentData.cyberware_ui_cd_extra = -1;
        }
    }
}

function tickStaticCooldown(player, entity, slotId) {
    if (slotId === EXTRA_SLOT_ID) {
        return;
    }
    var objective = getCooldownObjective(slotId);
    var value = getObjectiveScore(player, entity, objective);
    if (value > 0) {
        var decrement = Math.max(1, Math.floor(Number(CYBERWARE_POINTER_TICK_INTERVAL || 1)));
        decrement = Number(CWP_CYBERWARE_BRIDGE.cooldownTimerTicks(entity, decrement, "pointer_" + slotId));
        setObjectiveScore(player, entity, objective, Math.max(0, value - decrement));
    }
}

function hasActivePointerCooldownState(player, entity, slotIds) {
    if (getObjectiveScore(player, entity, "er_sandy_active") > 0) {
        return true;
    }
    if (getObjectiveScore(player, entity, AXOLOTL_KILL_TRIGGER_OBJECTIVE) > 0) {
        return true;
    }
    if (getObjectiveScore(player, entity, FACE_ACTIVE_TICKS_OBJECTIVE) > 0) {
        return true;
    }
    if (getObjectiveScore(player, entity, BLOOD_PUMP_ACTIVE_TICKS_OBJECTIVE) > 0) {
        return true;
    }
    if (Number(entity.persistentData[BLOOD_PUMP_NBT_RECHARGE_PENDING] || 0) > 0) {
        return true;
    }
    for (var i = 0; i < slotIds.length; i++) {
        if (getObjectiveScore(player, entity, getCooldownObjective(slotIds[i])) > 0) {
            return true;
        }
    }
    return false;
}

function hasInstalledCyberwareNow(entity, slotIds) {
    var hasInstalledCyberware = false;
    for (var hsi = 0; hsi < slotIds.length; hsi++) {
        var installedItem = getInstalledItem(entity, slotIds[hsi]);
        if (installedItem && installedItem !== "minecraft:air") {
            hasInstalledCyberware = true;
            break;
        }
    }
    if (!hasInstalledCyberware) {
        for (var hsp = 0; hsp < slotIds.length; hsp++) {
            if (getOwnedSlotEntry(entity, slotIds[hsp])) {
                hasInstalledCyberware = true;
                break;
            }
        }
    }
    return hasInstalledCyberware;
}

function resolveInstalledCyberwarePresence(entity, slotIds, forceScan) {
    if (!entity) {
        return false;
    }
    try {
        if (CWP_CYBERWARE_BRIDGE.hasInstalledCyberware(getEntity(entity))) {
            if (entity.persistentData) {
                entity.persistentData[CYBERWARE_POINTER_PRESENCE_CACHE_KEY] = 1;
            }
            return true;
        }
    } catch (errBridge) {
    }
    if (!entity.persistentData) {
        return false;
    }
    var pd = entity.persistentData;
    var cachedValue = Number(pd[CYBERWARE_POINTER_PRESENCE_CACHE_KEY]);
    var hasCachedValue = cachedValue === 0 || cachedValue === 1;
    if (!forceScan && hasCachedValue) {
        return cachedValue > 0;
    }

    var hasInstalledCyberware = hasInstalledCyberwareNow(entity, slotIds);
    pd[CYBERWARE_POINTER_PRESENCE_CACHE_KEY] = hasInstalledCyberware ? 1 : 0;
    return hasInstalledCyberware;
}

function invalidateInstalledCyberwarePresence(entity) {
    if (!entity || !entity.persistentData) {
        return;
    }
    var pd = entity.persistentData;
    pd[CYBERWARE_POINTER_PRESENCE_CACHE_KEY] = -1;
}

function tickSlotCooldowns(player, forcePresenceScan) {
    var entity = getEntity(player);
    if (!entity || !entity.level) {
        return;
    }
    if (global.normalizeCyberwareInstalledData) {
        global.normalizeCyberwareInstalledData(entity);
    }
    var slotIds = getSlotIds();
    var activeState = hasActivePointerCooldownState(player, entity, slotIds);
    var hasInstalledCyberware = resolveInstalledCyberwarePresence(entity, slotIds, !!forcePresenceScan || activeState);
    if (!hasInstalledCyberware && !activeState) {
        return;
    }
    ensureObjectiveTickCache(entity);

    processCyberwareKillTrigger(player, entity);

    var gameTime = Number(entity.level.gameTime || 0);
    if (!forcePresenceScan
            && CYBERWARE_POINTER_TICK_INTERVAL > 1
            && isFinite(gameTime) && gameTime > 0
            && (gameTime % CYBERWARE_POINTER_TICK_INTERVAL) !== 0) {
        return;
    }

    updateAxolotlActiveMarker(entity);
    var shouldScanSlotIdentity = activeState || CYBERWARE_POINTER_IDLE_ITEM_SCAN_INTERVAL <= 1
            || !isFinite(gameTime) || gameTime <= 0
            || (gameTime % CYBERWARE_POINTER_IDLE_ITEM_SCAN_INTERVAL) === 0;
    // The identity of each slot only depends on installed cyberware, held powers and bans (the revision) and is
    // compared with the cyberware_last_item_* keys (which the hub also writes). When both are exactly as the last full
    // scan left them, every reset below would find nothing to do: skip them (performance pass 11/11/2026).
    var identityKey = shouldScanSlotIdentity ? resolveEntityCacheKey(entity) : "";
    var identityState = identityKey ? readSlotIdentityScanState(entity, slotIds) : "";
    var skipIdentityScan = identityState !== "" && cyberwareSlotIdentityScanState[identityKey] === identityState;
    for (var i = 0; i < slotIds.length; i++) {
        var slotId = slotIds[i];
        if (shouldScanSlotIdentity && !skipIdentityScan) {
            resetSlotCooldownIfItemChanged(player, entity, slotId);
        }

        if (slotId === OS_SLOT_ID) {
            var objective = getCooldownObjective(slotId);
            var osEntry = getOsSlotEntry(entity);
            if (!osEntry) {
                setObjectiveScore(player, entity, objective, 0);
                syncOsPointerCooldownVisual(player, entity, 0);
                continue;
            }

            var dynamicTicks = computeDynamicOsCooldownTicks(player, entity, osEntry);
            if (dynamicTicks !== null) {
                setObjectiveScore(player, entity, objective, dynamicTicks);
                // Keep OS pointer always spammable; visual cooldown here would block action-condition key presses.
                syncOsPointerCooldownVisual(player, entity, 0);
                continue;
            }
        }

        if (slotId === CIRCULATORY_SLOT_ID) {
            var circulatoryObjective = getCooldownObjective(slotId);
            tickBloodPumpState(entity);
            var circulatoryEntry = getOwnedSlotEntry(entity, CIRCULATORY_SLOT_ID);
            var bloodPumpCooldownTicks = computeBloodPumpCooldownTicks(entity, circulatoryEntry);
            if (bloodPumpCooldownTicks !== null) {
                var circulatoryBefore = getObjectiveScore(player, entity, circulatoryObjective);
                setObjectiveScore(player, entity, circulatoryObjective, bloodPumpCooldownTicks);
                setObjectiveScore(player, entity, BP_DEBUG_ABILITY_COOLDOWN_OBJECTIVE, Math.max(0, Math.floor(bloodPumpCooldownTicks)));
                setObjectiveScore(player, entity, BP_DEBUG_OBJECTIVE_COOLDOWN_OBJECTIVE, Math.max(0, Math.floor(circulatoryBefore)));
                if (bloodPumpCooldownTicks > 0 && debugValueChange(entity, "cyberware_dbg_bp_cd_pair", circulatoryBefore + "->" + bloodPumpCooldownTicks)) {
                    sendDebugChat(player, "blood_pump sync score: " + circulatoryBefore + " -> " + bloodPumpCooldownTicks);
                }
                syncCirculatoryPointerCooldownVisual(player, entity, bloodPumpCooldownTicks);
                continue;
            }
            setObjectiveScore(player, entity, circulatoryObjective, 0);
            syncCirculatoryPointerCooldownVisual(player, entity, 0);
            continue;
        }

        // Face cooldown is mirrored from the installed optics ability in updateFaceRuntimeScores().
        if (slotId !== FACE_SLOT_ID) {
            tickStaticCooldown(player, entity, slotId);
            syncStaticPointerCooldownVisual(player, entity, slotId);
        }
    }

    if (identityKey && !skipIdentityScan) {
        // Remember the scan only if nothing it depends on moved while this tick ran.
        var identityStateAfter = readSlotIdentityScanState(entity, slotIds);
        cyberwareSlotIdentityScanState[identityKey] = identityStateAfter !== "" && identityStateAfter === identityState
                && getTickRuntimeRevision(entity) === readFreshRuntimeRevision(entity)
            ? identityStateAfter
            : "";
    }

    if (activeState || shouldScanSlotIdentity) {
        updateFaceRuntimeScores(player, entity);
        updateBloodPumpRuntimeScores(player, entity);
    }
}

function readSlotIdentityScanState(entity, slotIds) {
    var revision = readFreshRuntimeRevision(entity);
    if (!revision || !entity || !entity.persistentData) {
        return "";
    }
    var parts = [String(revision)];
    for (var i = 0; i < slotIds.length; i++) {
        parts.push(String(entity.persistentData["cyberware_last_item_" + slotIds[i]] || ""));
    }
    return parts.join("|");
}

function syncPointerAbilityIconState(entity, abilityId) {
    if (!entity || !abilityId) {
        return;
    }
    var pointerHolder = getPowerHolder(entity, CW_POINTER_CORE_POWER_ID);
    var pointerAbility = getAbilityInstance(pointerHolder, abilityId);
    if (!pointerAbility || typeof pointerAbility.syncState !== "function") {
        return;
    }
    try {
        pointerAbility.syncState(entity);
    } catch (err) {
    }
}

function forceSyncPointerIcons(playerOrEntity, slotId) {
    var entity = getEntity(playerOrEntity);
    if (!entity) {
        return;
    }

    if (!slotId || slotId === OS_SLOT_ID) {
        syncPointerAbilityIconState(entity, OS_POINTER_ABILITY_ID);
    }
    if (!slotId || slotId === ARMS_SLOT_ID) {
        syncPointerAbilityIconState(entity, ARMS_POINTER_ABILITY_ID);
    }
    if (!slotId || slotId === FACE_SLOT_ID) {
        syncPointerAbilityIconState(entity, FACE_POINTER_ABILITY_ID);
    }
    if (!slotId || slotId === CIRCULATORY_SLOT_ID) {
        syncPointerAbilityIconState(entity, CIRCULATORY_POINTER_ABILITY_ID);
    }
    if (!slotId || slotId === EXTRA_SLOT_ID) {
        syncPointerAbilityIconState(entity, EXTRA_POINTER_ABILITY_ID);
    }
}

function resetInstalledFaceOpticsRuntime(player, entity) {
    if (!entity) {
        return;
    }
    var entry = getOwnedSlotEntry(entity, FACE_SLOT_ID);
    if (!entry || !entry.power || !entry.ability) {
        setObjectiveScore(player, entity, FACE_ACTIVE_TICKS_OBJECTIVE, 0);
        setObjectiveScore(player, entity, FACE_ACTIVE_MAX_OBJECTIVE, 0);
        setObjectiveScore(player, entity, "er_face_scan_mode", 0);
        setObjectiveScore(player, entity, getCooldownObjective(FACE_SLOT_ID), 0);
        syncStaticPointerCooldownVisual(player, entity, FACE_SLOT_ID);
        return;
    }

    var holder = getPowerHolder(entity, entry.power);
    var ability = getAbilityInstance(holder, entry.ability);
    if (ability) {
        try {
            ability.keyPressed = false;
        } catch (errKeyPressed) {
        }
        try {
            ability.activationTimer = 0;
            ability.maxActivationTimer = 0;
            ability.cooldown = 0;
            ability.maxCooldown = 0;
            syncAbilityStateSafely(ability, entity);
        } catch (errReset) {
        }
    }

    setObjectiveScore(player, entity, FACE_ACTIVE_TICKS_OBJECTIVE, 0);
    setObjectiveScore(player, entity, FACE_ACTIVE_MAX_OBJECTIVE, Math.max(1, getFaceScanDurationTicks()));
    setObjectiveScore(player, entity, "er_face_scan_mode", 0);
    setObjectiveScore(player, entity, getCooldownObjective(FACE_SLOT_ID), 0);
    syncStaticPointerCooldownVisual(player, entity, FACE_SLOT_ID);
}

global.resetInstalledFaceOpticsRuntime = function (playerOrEntity) {
    if (!playerOrEntity) {
        return;
    }
    var entity = getEntity(playerOrEntity);
    resetInstalledFaceOpticsRuntime(playerOrEntity, entity);
};

global.refreshCyberwarePointerRuntimeNow = function (playerOrEntity) {
    if (!playerOrEntity) {
        return;
    }
    var entity = getEntity(playerOrEntity);
    invalidateInstalledCyberwarePresence(entity);
    tickSlotCooldowns(playerOrEntity, true);
};

global.syncCyberwarePointerAbilityIconNow = function (playerOrEntity, slotId) {
    if (!playerOrEntity) {
        return;
    }
    forceSyncPointerIcons(playerOrEntity, slotId ? String(slotId) : "");
};

ServerEvents.tick(function (event) {
    var players = event.server && event.server.players ? event.server.players : [];
    for (var i = 0; i < players.length; i++) {
        tickSlotCooldowns(players[i], false);
    }
});
})();
