// Startup script: pointer ability handlers for cyberware slots.
const ResourceLocation = Java.loadClass("net.minecraft.resources.ResourceLocation");
const PowerManager = Java.loadClass("net.threetag.palladium.power.PowerManager");
const SuperpowerUtil = Java.loadClass("net.threetag.palladium.power.SuperpowerUtil");
const BloodPumpChargeRuntime = Java.loadClass("com.edgerunner.cyberpsychosis.BloodPumpChargeRuntime");
const CyberpsychosisRuntime = Java.loadClass("com.edgerunner.cyberpsychosis.CyberpsychosisRuntime");
const CyberpunkGorillaArmsRuntime = Java.loadClass("com.edgerunner.gorilla.GorillaArmsRuntime");
const SuppressorSlotService = Java.loadClass("com.edgerunner.content.ripperdoc.SuppressorSlotService");
const CyberwareDataUtil = Java.loadClass("com.edgerunner.util.CyberwareDataUtil");
const FaceOpticsPointerBridge = Java.loadClass("com.edgerunner.face.FaceOpticsPointerBridge");
const CyberwareSavedDataHydrator = Java.loadClass("com.edgerunner.cyberware.CyberwareSavedDataHydrator");
const CyberwareScriptBridge = Java.loadClass("com.edgerunner.cyberware.CyberwareScriptBridge");
const MobEffectInstance = Java.loadClass("net.minecraft.world.effect.MobEffectInstance");
const ServerPlayer = Java.loadClass("net.minecraft.server.level.ServerPlayer");
const ForgeRegistries = Java.loadClass("net.minecraftforge.registries.ForgeRegistries");
const CYBERWARE_HUB_DEBUG = !!global.CYBERPUNK_DEBUG;
const SUPPRESSOR_ITEM_ID = "project_edgerunner:inmunosupresores";
const SUPPRESSOR_EFFECT_ID = new ResourceLocation("project_edgerunner", "inmunosupresion");
const SUPPRESSOR_INJECTOR_POWER_ID = new ResourceLocation("project_edgerunner", "inmunosupresor_injector");
const SUPPRESSOR_DURATION_TICKS = 36000;

function cyberwareFail(message) {
    if (global.cyberwareFail) {
        global.cyberwareFail(message);
        return;
    }
    throw new Error("[Cyberpunk/Cyberware] " + message);
}

function cyberwareDebug(message) {
    if (CYBERWARE_HUB_DEBUG) {
        console.info("[Cyberpunk/Cyberware/Debug] " + message);
    }
}

function cyberwareInfo(message) {
    if (CYBERWARE_HUB_DEBUG) {
        console.info("[Cyberpunk/Cyberware/Hub] " + message);
    }
}

function resolveRuntimeEntity(entity) {
    if (entity && entity.minecraftEntity) {
        return entity.minecraftEntity;
    }
    return entity;
}

function resolvePersistentTag(entity) {
    if (!entity) {
        return null;
    }
    if (typeof entity.getPersistentData === "function") {
        return entity.getPersistentData();
    }
    return entity.persistentData || null;
}

function queueGorillaToggleRequest(entity) {
    var tag = resolvePersistentTag(entity);
    if (!tag) {
        return false;
    }
    try {
        if (typeof tag.putInt === "function") {
            tag.putInt("cyb_ga_toggle_req", 1);
            return true;
        }
    } catch (errPut) {
    }
    try {
        tag.cyb_ga_toggle_req = 1;
        return true;
    } catch (errAssign) {
    }
    return false;
}

function getBloodPumpCurrentCharges(entity, powerId) {
    var runtimeEntity = resolveRuntimeEntity(entity);
    if (!runtimeEntity) {
        return 0;
    }
    try {
        return Math.max(0, Math.floor(Number(BloodPumpChargeRuntime.getCurrentCharges(runtimeEntity, String(powerId || "")) || 0)));
    } catch (err) {
        return 0;
    }
}

function getBloodPumpNextRechargeTicks(entity, powerId) {
    var runtimeEntity = resolveRuntimeEntity(entity);
    if (!runtimeEntity) {
        return 0;
    }
    try {
        return Math.max(0, Math.floor(Number(BloodPumpChargeRuntime.getNextRechargeTicks(runtimeEntity, String(powerId || "")) || 0)));
    } catch (err) {
        return 0;
    }
}

function isSuppressorSlotItem(itemId) {
    return String(itemId || "") === SUPPRESSOR_ITEM_ID;
}

function applySuppressorEffect(entity) {
    var effect = ForgeRegistries.MOB_EFFECTS.getValue(SUPPRESSOR_EFFECT_ID);
    if (!effect || !entity || typeof entity.addEffect !== "function") {
        return false;
    }
    entity.addEffect(new MobEffectInstance(effect, SUPPRESSOR_DURATION_TICKS, 0, false, true, true));
    return true;
}

function activateSuppressorSlotDirect(entity, slotEntry, pointerEntry, cooldownObjective) {
    var runtimeEntity = resolveRuntimeEntity(entity);
    if (!runtimeEntity || !(runtimeEntity instanceof ServerPlayer)) {
        pointerLog(entity, "extra", "blocked", "stage=suppressor_server_player_missing");
        return false;
    }

    var remaining = Number(SuppressorSlotService.consumeOne(runtimeEntity));
    if (!Number.isFinite(remaining) || remaining < 0) {
        pointerLog(entity, "extra", "blocked", "stage=suppressor_no_doses");
        return false;
    }

    applySuppressorEffect(runtimeEntity);
    CyberpsychosisRuntime.onSuppressorInjected(runtimeEntity);
    if (global.recomputeCyberwareCapacityNow) {
        global.recomputeCyberwareCapacityNow(runtimeEntity);
    }
    if (remaining === 0) {
        SuperpowerUtil.removeSuperpower(runtimeEntity, SUPPRESSOR_INJECTOR_POWER_ID);
    }

    var serviceCooldownTicks = Math.max(0, Math.floor(Number(SuppressorSlotService.cooldownTicks() || 0)));
    var cooldownTicks = Math.max(serviceCooldownTicks, Math.max(0, Math.floor(Number(slotEntry && slotEntry.cooldown_ticks || 0))));
    if (cooldownTicks > 0) {
        setPointerCooldownForInstalledItem(runtimeEntity, "extra", SUPPRESSOR_ITEM_ID, slotEntry, cooldownObjective, cooldownTicks);
        if (pointerEntry && typeof pointerEntry.startCooldown === "function") {
            pointerEntry.startCooldown(runtimeEntity, cooldownTicks);
        }
    }
    pointerLog(runtimeEntity, "extra", "suppressor-direct-inject", "remaining=" + remaining + " cooldown=" + cooldownTicks);
    return true;
}

function bloodPumpLog(entity, stage, detail) {
    if (!CYBERWARE_HUB_DEBUG) {
        return;
    }
    var runtimeEntity = resolveRuntimeEntity(entity);
    var tick = 0;
    try {
        if (runtimeEntity && runtimeEntity.level && runtimeEntity.level.gameTime !== undefined) {
            tick = Number(runtimeEntity.level.gameTime || 0);
        } else if (runtimeEntity && typeof runtimeEntity.level === "function") {
            var levelObj = runtimeEntity.level();
            tick = levelObj && typeof levelObj.getGameTime === "function" ? Number(levelObj.getGameTime()) : 0;
        }
    } catch (errTick) {
        tick = 0;
    }
    var suffix = detail ? (" " + detail) : "";
    var persistentTag = resolvePersistentTag(runtimeEntity) || resolvePersistentTag(entity);
    if (persistentTag) {
        var markerKey = "cyberware_bp_log_marker";
        var tickKey = "cyberware_bp_log_tick";
        var marker = String(stage || "") + "|" + String(detail || "");
        var lastMarker = String(persistentTag[markerKey] || "");
        var lastTick = Number(persistentTag[tickKey] || 0);
        if (marker === lastMarker && (tick - lastTick) < 10) {
            return;
        }
        persistentTag[markerKey] = marker;
        persistentTag[tickKey] = tick;
    }
    console.info("[Cyberpunk/Cyberware/BloodPump] t=" + tick + " stage=" + stage + suffix);
}

function pointerLog(entity, slotId, reason, detail) {
    var forceArmsLog = CYBERWARE_HUB_DEBUG && slotId === "arms";
    if (!CYBERWARE_HUB_DEBUG && !forceArmsLog) {
        return;
    }
    var runtimeEntity = resolveRuntimeEntity(entity);
    var tick = 0;
    try {
        if (runtimeEntity && runtimeEntity.level && runtimeEntity.level.gameTime !== undefined) {
            tick = Number(runtimeEntity.level.gameTime || 0);
        } else if (runtimeEntity && typeof runtimeEntity.level === "function") {
            var levelObj = runtimeEntity.level();
            tick = levelObj && typeof levelObj.getGameTime === "function" ? Number(levelObj.getGameTime()) : 0;
        } else if (runtimeEntity && typeof runtimeEntity.getLevel === "function") {
            var levelObj2 = runtimeEntity.getLevel();
            tick = levelObj2 && typeof levelObj2.getGameTime === "function" ? Number(levelObj2.getGameTime()) : 0;
        }
    } catch (errTick) {
        tick = 0;
    }
    var suffix = detail ? (" " + detail) : "";
    var persistentTag = resolvePersistentTag(runtimeEntity) || resolvePersistentTag(entity);
    if (!persistentTag) {
        if (forceArmsLog) {
            console.info("[Cyberpunk/Cyberware/Arms] t=" + tick + " slot=" + slotId + " reason=" + reason + suffix);
        } else {
            cyberwareInfo("t=" + tick + " slot=" + slotId + " reason=" + reason + suffix);
        }
        return;
    }
    var key = "cyberware_dbg_pointer_" + slotId;
    var keyTick = key + "_tick";
    var marker = String(reason || "") + "|" + String(detail || "");
    var lastMarker = String(persistentTag[key] || "");
    var lastTick = Number(persistentTag[keyTick] || 0);
    if (marker === lastMarker && (tick - lastTick) < 40) {
        return;
    }
    persistentTag[key] = marker;
    persistentTag[keyTick] = tick;
    if (forceArmsLog) {
        console.info("[Cyberpunk/Cyberware/Arms] t=" + tick + " slot=" + slotId + " reason=" + reason + suffix);
    } else {
        cyberwareInfo("t=" + tick + " slot=" + slotId + " reason=" + reason + suffix);
    }
}

function getSlotIds() {
    return global.CYBERWARE_SLOT_IDS || ["os", "arms", "face", "circulatory", "extra"];
}

function getCooldownObjective(slotId) {
    var map = global.CYBERWARE_SLOT_COOLDOWN_OBJECTIVES || {};
    var objective = map[slotId];
    if (!objective) {
        cyberwareFail("Missing cooldown objective mapping for slot '" + slotId + "'");
    }
    return objective;
}

function getObjectiveState(entity, objectiveName) {
    var scoreboard = entity.level ? entity.level.getScoreboard() : null;
    if (!scoreboard) {
        cyberwareFail("Scoreboard unavailable for objective '" + objectiveName + "'");
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

function resolveScoreboardEntryName(entity) {
    if (entity && typeof entity.getScoreboardName === "function") {
        return String(entity.getScoreboardName());
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
    if (entity && entity.username) {
        return String(entity.username);
    }
    cyberwareFail("Unable to resolve scoreboard entry name");
}

function getObjectiveScore(entity, objectiveName) {
    var state = getObjectiveState(entity, objectiveName);
    var scoreName = resolveScoreboardEntryName(entity);
    if (!state.scoreboard.hasPlayerScore(scoreName, state.objective)) {
        return 0;
    }
    return state.scoreboard.getOrCreatePlayerScore(scoreName, state.objective).getScore();
}

function setObjectiveScore(entity, objectiveName, value) {
    var state = getObjectiveState(entity, objectiveName);
    var scoreName = resolveScoreboardEntryName(entity);
    state.scoreboard.getOrCreatePlayerScore(scoreName, state.objective).setScore(Math.floor(value));
}

function getPointerCooldownIdentity(slotId, itemId, slotEntry) {
    if (itemId) {
        return "item:" + String(itemId);
    }
    if (slotEntry && slotEntry.item) {
        return "item:" + String(slotEntry.item);
    }
    if (slotEntry && slotEntry.power) {
        return "power:" + String(slotEntry.power);
    }
    return "";
}

function readPointerCooldownForInstalledItem(entity, slotId, itemId, slotEntry, objectiveName) {
    var persistentTag = resolvePersistentTag(entity);
    var currentIdentity = getPointerCooldownIdentity(slotId, itemId, slotEntry);
    if (!persistentTag) {
        return getObjectiveScore(entity, objectiveName);
    }
    var key = "cyberware_last_item_" + slotId;
    var previousIdentity = String(persistentTag[key] || "");
    if (currentIdentity !== previousIdentity) {
        persistentTag[key] = currentIdentity;
        setObjectiveScore(entity, objectiveName, 0);
        return 0;
    }
    return getObjectiveScore(entity, objectiveName);
}

function setPointerCooldownForInstalledItem(entity, slotId, itemId, slotEntry, objectiveName, value) {
    var persistentTag = resolvePersistentTag(entity);
    if (persistentTag) {
        persistentTag["cyberware_last_item_" + slotId] = getPointerCooldownIdentity(slotId, itemId, slotEntry);
    }
    setObjectiveScore(entity, objectiveName, value);
}

function readCompoundString(source, key) {
    try {
        if (source && typeof source.getString === "function") {
            return String(source.getString(String(key)) || "");
        }
    } catch (err) {
    }
    try {
        if (source && source[key] !== undefined && source[key] !== null) {
            return String(source[key]);
        }
    } catch (err2) {
    }
    return "";
}

function readMapString(source, key) {
    try {
        if (source && typeof source.getString === "function") {
            return String(source.getString(String(key)) || "");
        }
    } catch (err0) {
    }
    try {
        if (source && source[key] !== undefined && source[key] !== null) {
            return String(source[key]);
        }
    } catch (err) {
    }
    try {
        if (source && typeof source.get === "function") {
            var value = source.get(String(key));
            if (value !== undefined && value !== null) {
                return String(value);
            }
        }
    } catch (err2) {
    }
    return "";
}

function readCompound(source, key) {
    if (!source || !key) {
        return null;
    }
    try {
        if (typeof source.contains === "function" && !source.contains(String(key), 10)) {
            return null;
        }
    } catch (errContains) {
    }
    try {
        if (typeof source.getCompound === "function") {
            return source.getCompound(String(key));
        }
    } catch (errCompound) {
    }
    try {
        if (source[key] !== undefined && source[key] !== null) {
            return source[key];
        }
    } catch (errField) {
    }
    return null;
}

function readPersistentLong(source, key) {
    if (!source || !key) {
        return 0;
    }
    try {
        if (typeof source.getLong === "function") {
            return Number(source.getLong(String(key)) || 0);
        }
    } catch (errLong) {
    }
    try {
        if (source[key] !== undefined && source[key] !== null) {
            return Number(source[key] || 0);
        }
    } catch (errField) {
    }
    return 0;
}

function hydrateSavedCyberwareIfPossible(entity) {
    var runtimeEntity = resolveRuntimeEntity(entity);
    if (!runtimeEntity || !(runtimeEntity instanceof ServerPlayer)) {
        return;
    }
    try {
        CyberwareSavedDataHydrator.hydrateFromSavedMenuIfNeeded(runtimeEntity);
    } catch (errHydrate) {
        pointerLog(runtimeEntity, "os", "hydrate-fail", "err=" + errHydrate);
    }
}

function getInstalledItemFromJavaTag(persistent, slotId) {
    if (!persistent) {
        return "";
    }
    var cyberTag = null;
    try {
        cyberTag = CyberwareDataUtil.getCyberwareTag(persistent);
    } catch (errTag) {
        cyberTag = null;
    }
    if (!cyberTag) {
        return "";
    }
    try {
        if (slotId === "os") {
            return String(CyberwareDataUtil.getInstalledOs(cyberTag) || "");
        }
        var activationItem = String(CyberwareDataUtil.getInstalledItemByActivationSlot(cyberTag, slotId) || "");
        if (activationItem) {
            return activationItem;
        }
        var bodySlot = slotId;
        if (slotId === "circulatory") {
            bodySlot = "circulatory_system";
        } else if (slotId === "extra") {
            bodySlot = "supresors";
        }
        return String(CyberwareDataUtil.getInstalledItemByBodySlot(cyberTag, bodySlot) || "");
    } catch (errRead) {
        return "";
    }
}

function getInstalledItemFromBridge(entity, slotId) {
    var runtimeEntity = resolveRuntimeEntity(entity);
    if (!runtimeEntity) {
        return "";
    }
    try {
        if (slotId === "os") {
            return String(CyberwareScriptBridge.getInstalledOs(runtimeEntity) || "");
        }
        var activationItem = String(CyberwareScriptBridge.getInstalledActivationItem(runtimeEntity, slotId) || "");
        if (activationItem) {
            return activationItem;
        }
        var bodySlot = slotId;
        if (slotId === "circulatory") {
            bodySlot = "circulatory_system";
        } else if (slotId === "extra") {
            bodySlot = "supresors";
        }
        return String(CyberwareScriptBridge.getInstalledBodyItem(runtimeEntity, bodySlot) || "");
    } catch (errBridge) {
        return "";
    }
}

function getInstalledItem(entity, slotId) {
    if (!entity) {
        return "";
    }
    var runtimeEntity = resolveRuntimeEntity(entity);
    hydrateSavedCyberwareIfPossible(runtimeEntity || entity);
    var bridgeItem = getInstalledItemFromBridge(runtimeEntity || entity, slotId);
    if (bridgeItem) {
        return bridgeItem;
    }
    var persistent = resolvePersistentTag(runtimeEntity) || resolvePersistentTag(entity);
    if (!persistent) {
        return "";
    }
    var directItem = getInstalledItemFromJavaTag(persistent, slotId);
    if (directItem) {
        return directItem;
    }
    if (global.normalizeCyberwareInstalledData) {
        global.normalizeCyberwareInstalledData(runtimeEntity || entity);
    }
    if (global.getCyberwareInstalledItemByActivationSlot) {
        var activationItem = String(global.getCyberwareInstalledItemByActivationSlot(runtimeEntity || entity, slotId) || "");
        if (activationItem) {
            return activationItem;
        }
    }
    var cyber = readCompound(persistent, "cyberware");
    if (!cyber) {
        return "";
    }
    if (slotId === "os") {
        if (global.getCyberwareInstalledItemByBodySlot) {
            var bodyOsItem = String(global.getCyberwareInstalledItemByBodySlot(runtimeEntity || entity, "os") || "");
            if (bodyOsItem) {
                return bodyOsItem;
            }
        }
        var osItem = readCompoundString(cyber, "installed_os");
        if (osItem) {
            return osItem;
        }
        var legacyInstalledOs = null;
        try {
            legacyInstalledOs = cyber.installed;
        } catch (errLegacyOs) {
            legacyInstalledOs = null;
        }
        if (!legacyInstalledOs && typeof cyber.getCompound === "function") {
            try {
                legacyInstalledOs = cyber.getCompound("installed");
            } catch (errLegacyOs2) {
                legacyInstalledOs = null;
            }
        }
        return readMapString(legacyInstalledOs, "os");
    }
    var installed = cyber.installed_components;
    if (!installed && typeof cyber.getCompound === "function") {
        try {
            installed = cyber.getCompound("installed_components");
        } catch (err) {
            installed = null;
        }
    }
    if (!installed) {
        if (slotId === "extra" && global.getCyberwareInstalledItemByBodySlot) {
            var suppressorBodyItem = String(global.getCyberwareInstalledItemByBodySlot(runtimeEntity || entity, "supresors") || "");
            if (suppressorBodyItem) {
                return suppressorBodyItem;
            }
        }
        var legacyInstalled = null;
        try {
            legacyInstalled = cyber.installed;
        } catch (errLegacy) {
            legacyInstalled = null;
        }
        if (!legacyInstalled && typeof cyber.getCompound === "function") {
            try {
                legacyInstalled = cyber.getCompound("installed");
            } catch (errLegacy2) {
                legacyInstalled = null;
            }
        }
        return readMapString(legacyInstalled, slotId);
    }
    var value = readMapString(installed, slotId);
    if (value) {
        return value;
    }
    if (slotId === "circulatory") {
        return readMapString(installed, "circulatory_system");
    }
    if (slotId === "extra") {
        var physical = null;
        try {
            physical = cyber.installed_physical;
        } catch (errPhysical) {
            physical = null;
        }
        if (!physical && typeof cyber.getCompound === "function") {
            try {
                physical = cyber.getCompound("installed_physical");
            } catch (errPhysical2) {
                physical = null;
            }
        }
        var suppressorItem = readMapString(physical, "slot_19");
        if (suppressorItem) {
            return suppressorItem;
        }
        return readMapString(physical, "19");
    }
    return value;
}

function hasOsInstalled(entity) {
    return getInstalledItem(entity, "os").length > 0;
}

function getJoinLockUntil(entity) {
    if (!entity) {
        return 0;
    }
    var runtimeEntity = resolveRuntimeEntity(entity);
    try {
        return Math.max(
            Number(CyberwareScriptBridge.getPersistentLong(runtimeEntity, "cyberware_join_lock_until") || 0),
            Number(CyberwareScriptBridge.getPersistentLong(runtimeEntity, "cyberware_os_lock_until") || 0)
        );
    } catch (errBridge) {
    }
    var persistent = resolvePersistentTag(runtimeEntity) || resolvePersistentTag(entity);
    if (!persistent) {
        return 0;
    }
    return Math.max(
        readPersistentLong(persistent, "cyberware_join_lock_until"),
        readPersistentLong(persistent, "cyberware_os_lock_until")
    );
}

function isJoinLocked(entity) {
    var now = entity && entity.level ? Number(entity.level.gameTime) : 0;
    return getJoinLockUntil(entity) > now;
}

function parsePowerId(powerId) {
    var text = String(powerId || "");
    var parts = text.split(":");
    if (parts.length !== 2) {
        cyberwareFail("Invalid power id '" + text + "'");
    }
    return new ResourceLocation(parts[0], parts[1]);
}

function getPowerHolderForId(entity, powerId) {
    var level = entity && entity.level ? entity.level : null;
    if (!level) {
        return null;
    }
    var resourceId = null;
    try {
        resourceId = parsePowerId(powerId);
    } catch (err) {
        return null;
    }
    var power = PowerManager.getInstance(level).getPower(resourceId);
    if (!power) {
        return null;
    }
    var handlerOptional = PowerManager.getPowerHandler(entity);
    if (!handlerOptional || !handlerOptional.isPresent || !handlerOptional.isPresent()) {
        return null;
    }
    return handlerOptional.get().getPowerHolder(power);
}

function ensureMappedPowerPresent(entity, powerId, slotId) {
    try {
        var id = parsePowerId(powerId);
        if (SuperpowerUtil.hasSuperpower(entity, id)) {
            return true;
        }
        SuperpowerUtil.addSuperpower(entity, id);
        pointerLog(entity, slotId, "power-autogrant", "power=" + String(powerId || ""));
        if (slotId === "circulatory") {
            bloodPumpLog(entity, "power_autogrant", "power=" + String(powerId || ""));
        }
        return true;
    } catch (err) {
        pointerLog(entity, slotId, "power-autogrant-fail", "power=" + String(powerId || "") + " err=" + err);
        if (slotId === "circulatory") {
            bloodPumpLog(entity, "power_autogrant_fail", "power=" + String(powerId || "") + " err=" + err);
        }
        return false;
    }
}

function resolveAbilityInstance(entity, powerId, abilityId, slotId) {
    var powerText = String(powerId || "");
    var abilityText = String(abilityId || "");
    var level = entity.level;
    if (!level) {
        pointerLog(entity, slotId, "resolve-fail", "stage=level power=" + powerText + " ability=" + abilityText);
        return null;
    }
    var resourceId = null;
    try {
        resourceId = parsePowerId(powerText);
    } catch (err) {
        pointerLog(entity, slotId, "resolve-fail", "stage=parse power=" + powerText + " err=" + err);
        return null;
    }
    var power = PowerManager.getInstance(level).getPower(resourceId);
    if (!power) {
        pointerLog(entity, slotId, "resolve-fail", "stage=power_not_found power=" + powerText);
        return null;
    }
    var handlerOptional = PowerManager.getPowerHandler(entity);
    if (!handlerOptional || !handlerOptional.isPresent || !handlerOptional.isPresent()) {
        pointerLog(entity, slotId, "resolve-fail", "stage=handler_missing power=" + powerText);
        return null;
    }
    var holder = handlerOptional.get().getPowerHolder(power);
    if (!holder) {
        pointerLog(entity, slotId, "resolve-fail", "stage=holder_missing power=" + powerText);
        return null;
    }
    var abilities = holder.getAbilities ? holder.getAbilities() : null;
    if (!abilities) {
        pointerLog(entity, slotId, "resolve-fail", "stage=abilities_missing power=" + powerText);
        return null;
    }
    var ability = abilities.get(abilityText);
    if (!ability) {
        pointerLog(entity, slotId, "resolve-fail", "stage=ability_missing power=" + powerText + " ability=" + abilityText);
        if (slotId === "circulatory") {
            var keyDump = "";
            try {
                keyDump = String(abilities.keySet ? abilities.keySet() : abilities);
            } catch (errDump) {
                keyDump = "unavailable";
            }
            bloodPumpLog(entity, "resolve_ability_missing", "power=" + powerText + " ability=" + abilityText + " keys=" + keyDump);
        }
        return null;
    }
    if (global.CYBERPUNK_DEBUG) {
        pointerLog(entity, slotId, "resolve-ok", "power=" + powerText + " ability=" + abilityText);
    }
    return ability;
}

function cancelActivationAbility(entity, ability, cooldownTicks) {
    if (!ability) {
        return false;
    }
    var normalizedCooldown = Math.max(0, Math.floor(Number(cooldownTicks || 0)));
    try {
        ability.keyPressed = false;
    } catch (errKeyPressed) {
    }
    try {
        if (typeof ability.setClientState === "function" && typeof ability.getHolder === "function") {
            var holder = ability.getHolder();
            ability.setClientState(
                entity,
                holder,
                ability.isUnlocked ? !!ability.isUnlocked() : true,
                false,
                normalizedCooldown,
                normalizedCooldown,
                0,
                0
            );
            if (typeof ability.syncState === "function") {
                ability.syncState(entity);
            }
            return true;
        }
    } catch (errSetClientState) {
    }
    try {
        ability.activationTimer = 0;
        ability.maxActivationTimer = 0;
        if (normalizedCooldown > 0 && typeof ability.startCooldown === "function") {
            ability.startCooldown(entity, normalizedCooldown);
        } else if (typeof ability.syncState === "function") {
            ability.syncState(entity);
        }
        return true;
    } catch (errFallback) {
    }
    return false;
}

function resolveOsEntryFromOwnedPower(entity) {
    if (!hasOsInstalled(entity)) {
        return null;
    }
    var variants = global.SANDEVISTAN_VARIANTS || [];
    for (var i = 0; i < variants.length; i++) {
        var variant = variants[i];
        if (!variant) {
            continue;
        }
        var variantPowerId = String(variant.powerId || "");
        if (!variantPowerId) {
            continue;
        }
        var holder = getPowerHolderForId(entity, variantPowerId);
        if (!holder) {
            continue;
        }
        return {
            item: String(variant.itemId || variantPowerId),
            power: variantPowerId,
            ability: "Sandevistan",
            cooldown_ticks: 0,
            icon_index: i + 1,
            icon_alias: String(variant.id || "sandevistan").replace(/^sandevistan_/, "") || "sandevistan",
            _source: "owned_power_variant"
        };
    }

    var mapped = global.getCyberwareMappedPowers ? global.getCyberwareMappedPowers() : [];
    for (var j = 0; j < mapped.length; j++) {
        var powerId = String(mapped[j] || "");
        if (!powerId || powerId.indexOf("project_edgerunner:sandevistan_") !== 0) {
            continue;
        }
        var mappedHolder = getPowerHolderForId(entity, powerId);
        if (!mappedHolder) {
            continue;
        }
        return {
            item: powerId,
            power: powerId,
            ability: "Sandevistan",
            cooldown_ticks: 0,
            icon_index: 1,
            icon_alias: "sandevistan",
            _source: "owned_power_mapped"
        };
    }
    return null;
}

function resolveOwnedSlotEntry(entity, slotId) {
    if (slotId === "os") {
        return resolveOsEntryFromOwnedPower(entity);
    }
    var slotConfigs = global.CYBERWARE_SLOT_CONFIGS || {};
    var entries = slotConfigs[slotId] || [];
    for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        if (!entry || !entry.power || !entry.ability) {
            continue;
        }
        if (!getPowerHolderForId(entity, String(entry.power))) {
            continue;
        }
        return {
            item: String(entry.item || ""),
            power: String(entry.power || ""),
            ability: String(entry.ability || ""),
            cooldown_ticks: Number(entry.cooldown_ticks || 0),
            icon_index: Number(entry.icon_index || 0),
            icon_alias: String(entry.icon_alias || ""),
            _source: "owned_power_registry"
        };
    }
    return null;
}

function resolveFallbackSlotEntry(slotId, itemId) {
    if (slotId !== "os") {
        return null;
    }
    var normalizedItem = String(itemId || "");
    if (!normalizedItem) {
        return null;
    }

    var variants = global.SANDEVISTAN_VARIANTS || [];
    for (var i = 0; i < variants.length; i++) {
        var variant = variants[i];
        if (!variant) {
            continue;
        }
        if (String(variant.itemId || "") !== normalizedItem) {
            continue;
        }
        return {
            item: normalizedItem,
            power: String(variant.powerId || normalizedItem),
            ability: "Sandevistan",
            cooldown_ticks: 0,
            icon_index: i + 1,
            icon_alias: String(variant.id || "sandevistan").replace(/^sandevistan_/, "") || "sandevistan",
            _source: "fallback_variant"
        };
    }

    if (normalizedItem.indexOf("project_edgerunner:sandevistan_") === 0) {
        return {
            item: normalizedItem,
            power: normalizedItem,
            ability: "Sandevistan",
            cooldown_ticks: 0,
            icon_index: 1,
            icon_alias: "sandevistan",
            _source: "fallback_prefix"
        };
    }

    return null;
}

function resolveSlotEntry(slotId, itemId) {
    var entry = null;
    if (global.getCyberwareSlotEntry) {
        entry = global.getCyberwareSlotEntry(slotId, itemId);
        if (entry) {
            return entry;
        }
    }
    return resolveFallbackSlotEntry(slotId, itemId);
}

function triggerSlotAbility(entity, entry, slotId) {
    entity = resolveRuntimeEntity(entity);
    if (!entity) {
        pointerLog(entity, slotId, "blocked", "stage=entity_missing");
        return;
    }
    if (isJoinLocked(entity)) {
        pointerLog(entity, slotId, "blocked", "stage=join_lock until=" + getJoinLockUntil(entity));
        if (slotId === "circulatory") {
            bloodPumpLog(entity, "blocked_join_lock", "until=" + getJoinLockUntil(entity));
        }
        return;
    }
    var osInstalled = hasOsInstalled(entity);
    if (slotId === "os" && !osInstalled) {
        pointerLog(entity, slotId, "blocked", "stage=os_not_installed");
        return;
    }

    var itemId = getInstalledItem(entity, slotId);
    if (slotId === "circulatory") {
        bloodPumpLog(entity, "attempt", "item=" + (itemId || "-") + " os_installed=" + osInstalled);
    }
    var slotEntry = null;
    if (itemId) {
        slotEntry = resolveSlotEntry(slotId, itemId);
    }

    if (!slotEntry) {
        slotEntry = resolveOwnedSlotEntry(entity, slotId);
        if (slotEntry) {
            if (!itemId && slotEntry.item) {
                itemId = String(slotEntry.item);
            }
            pointerLog(entity, slotId, "slot_entry_from_power", "source=" + slotEntry._source + " power=" + slotEntry.power);
        }
    }

    if (!slotEntry) {
        if (!itemId) {
            pointerLog(entity, slotId, "blocked", "stage=item_missing");
            if (slotId === "circulatory") {
                bloodPumpLog(entity, "blocked_item_missing", "slot=" + slotId + " os_installed=" + osInstalled);
            }
            return;
        }
        pointerLog(
            entity,
            slotId,
            "blocked",
            "stage=slot_entry_missing item=" + itemId + " registry_available=" + (!!global.getCyberwareSlotEntry) + " os_installed=" + osInstalled
        );
        if (slotId === "circulatory") {
            bloodPumpLog(
                entity,
                "blocked_slot_entry_missing",
                "item=" + itemId + " registry_available=" + (!!global.getCyberwareSlotEntry) + " os_installed=" + osInstalled
            );
        }
        return;
    }
    if (slotEntry._source) {
        pointerLog(entity, slotId, "slot_entry_fallback", "source=" + slotEntry._source + " item=" + itemId);
    }
    if (slotId === "circulatory") {
        bloodPumpLog(entity, "slot_entry", "item=" + itemId + " mapped=" + slotEntry.power + "#" + slotEntry.ability);
    }

    var cooldownObjective = getCooldownObjective(slotId);
    var cooldown = readPointerCooldownForInstalledItem(entity, slotId, itemId, slotEntry, cooldownObjective);
    if (slotId === "extra" && isSuppressorSlotItem(itemId)) {
        if (cooldown > 0) {
            pointerLog(entity, slotId, "blocked", "stage=cooldown objective=" + cooldownObjective + " value=" + cooldown);
            return;
        }
        activateSuppressorSlotDirect(entity, slotEntry, entry, cooldownObjective);
        return;
    }

    // Berserk owns both the toggle and its cooldown on the server. Never let the
    // generic Palladium timer swallow cancellation or start a second cooldown.
    if (slotId === "os" && String(slotEntry.ability || "") === "Berserk") {
        Java.loadClass("com.edgerunner.berserk.BerserkRuntime").requestActivation(resolveRuntimeEntity(entity));
        return;
    }
    var ability = resolveAbilityInstance(entity, slotEntry.power, slotEntry.ability, slotId);
    if (!ability) {
        ensureMappedPowerPresent(entity, slotEntry.power, slotId);
        ability = resolveAbilityInstance(entity, slotEntry.power, slotEntry.ability, slotId);
    }
    if (!ability) {
        if (slotId === "circulatory") {
            bloodPumpLog(entity, "trigger_abort_no_ability", "item=" + itemId + " mapped=" + slotEntry.power + "#" + slotEntry.ability);
        }
        return;
    }
    if (slotId === "face") {
        // Tell the Java fallback this press is already ours, or it would read it as a second press and cancel.
        FaceOpticsPointerBridge.markScriptHandled(resolveRuntimeEntity(entity));
    }
    var wasEnabled = ability.isEnabled ? ability.isEnabled() : false;
    var isSandevistanPointer = slotId === "os" && String(slotEntry.ability || "") === "Sandevistan";
    var isBloodPumpPointer = slotId === "circulatory" && String(slotEntry.ability || "") === "blood_pump";
    var armsAbilityId = String(slotEntry.ability || "");
    var isArmsRuntimePointer = slotId === "arms" && armsAbilityId === "gorilla_arms_toggle";
    var bloodPumpCurrentCharges = isBloodPumpPointer ? getBloodPumpCurrentCharges(entity, String(slotEntry.power || "")) : 0;
    var bloodPumpNextRechargeTicks = isBloodPumpPointer ? getBloodPumpNextRechargeTicks(entity, String(slotEntry.power || "")) : 0;
    // Arms cyberware uses a dedicated Java runtime toggle, so the pointer must stay re-triggerable
    // while that runtime owns the deployed/holstered state and its animation cooldown.
    var bypassPointerCooldownBlock = isSandevistanPointer
        || isArmsRuntimePointer
        || (isBloodPumpPointer && bloodPumpCurrentCharges > 0);
    if (isBloodPumpPointer && bloodPumpCurrentCharges <= 0) {
        setPointerCooldownForInstalledItem(entity, slotId, itemId, slotEntry, cooldownObjective, Math.max(cooldown, bloodPumpNextRechargeTicks));
        pointerLog(
            entity,
            slotId,
            "blocked",
            "stage=no_charges objective=" + cooldownObjective + " value=" + cooldown + " recharge=" + bloodPumpNextRechargeTicks
        );
        bloodPumpLog(
            entity,
            "blocked_no_charges",
            "objective=" + cooldownObjective + " value=" + cooldown + " recharge=" + bloodPumpNextRechargeTicks
        );
        return;
    }
    if (cooldown > 0 && !wasEnabled && !bypassPointerCooldownBlock) {
        pointerLog(entity, slotId, "blocked", "stage=cooldown objective=" + cooldownObjective + " value=" + cooldown);
        return;
    }

    if (slotId === "face" && wasEnabled) {
        var cancelCooldownTicks = Math.max(
            0,
            Math.floor(
                Math.max(
                    Number(slotEntry.cooldown_ticks || 0),
                    Number(ability.cooldown || 0)
                )
            )
        );
        var canceled = cancelActivationAbility(entity, ability, cancelCooldownTicks);
        pointerLog(
            entity,
            slotId,
            canceled ? "face-cancel" : "face-cancel-fail",
            "mapped=" + slotEntry.power + "#" + slotEntry.ability + " cooldown=" + cancelCooldownTicks
        );
        setObjectiveScore(entity, "er_face_scan_mode", 0);
        setObjectiveScore(entity, "er_face_active_ticks", 0);
        setObjectiveScore(entity, "er_face_active_max", Math.max(1, Math.floor(Number(global.FACE_SCAN_DURATION_TICKS || 1200))));
        setPointerCooldownForInstalledItem(entity, slotId, itemId, slotEntry, cooldownObjective, cancelCooldownTicks);
        if (entry && typeof entry.startCooldown === "function" && cancelCooldownTicks > 0) {
            entry.startCooldown(entity, cancelCooldownTicks);
        }
        return;
    }

    if (isArmsRuntimePointer) {
        var invoked = false;
        var runtimeEntity = resolveRuntimeEntity(entity);
        try {
            if (CyberpunkGorillaArmsRuntime) {
                // Call the Java runtime directly to avoid wrapper persistentData desync.
                CyberpunkGorillaArmsRuntime.requestToggle(runtimeEntity);
                invoked = true;
                pointerLog(entity, slotId, "gorilla-toggle-java-request", "source=cyberware_hub");
            }
        } catch (errJavaToggle) {
            pointerLog(entity, slotId, "gorilla-toggle-java-fail", "err=" + errJavaToggle);
        }
        if (!invoked) {
            var queued = queueGorillaToggleRequest(runtimeEntity || entity);
            pointerLog(entity, slotId, queued ? "gorilla-toggle-direct-request" : "gorilla-toggle-direct-fail", "source=cyberware_hub");
        }
    }

    var beforeActivationTimer = Number(ability.activationTimer || 0);
    var beforeInternalCooldown = Number(ability.cooldown || 0);
    var afterActivationTimer = beforeActivationTimer;
    var afterInternalCooldown = beforeInternalCooldown;
    var bloodPumpTriggered = true;
    // Arms toggles are handled by Java runtime directly; avoid secondary ability toggles.
    if (isBloodPumpPointer) {
        bloodPumpTriggered = BloodPumpChargeRuntime.tryActivate(entity, String(slotEntry.power || ""), String(slotEntry.ability || ""));
        afterActivationTimer = Number(ability.activationTimer || 0);
        afterInternalCooldown = Number(ability.cooldown || 0);
        if (!bloodPumpTriggered) {
            pointerLog(entity, slotId, "blocked", "stage=no_charges");
            bloodPumpLog(
                entity,
                "blocked_no_charges",
                "objective=" + cooldownObjective + " value=" + cooldown + " act=" + afterActivationTimer + " cd=" + afterInternalCooldown
            );
            return;
        }
        bloodPumpCurrentCharges = getBloodPumpCurrentCharges(entity, String(slotEntry.power || ""));
        bloodPumpNextRechargeTicks = getBloodPumpNextRechargeTicks(entity, String(slotEntry.power || ""));
        var sharedPointerCooldown = bloodPumpCurrentCharges > 0 ? 0 : Math.max(0, bloodPumpNextRechargeTicks);
        try {
            if (BloodPumpChargeRuntime && typeof BloodPumpChargeRuntime.sharedPointerCooldownTicks === "function") {
                sharedPointerCooldown = Math.max(0, Math.floor(Number(
                    BloodPumpChargeRuntime.sharedPointerCooldownTicks(bloodPumpCurrentCharges, bloodPumpNextRechargeTicks)
                ) || 0));
            }
        } catch (errPointerPolicy) {
        }
        setPointerCooldownForInstalledItem(entity, slotId, itemId, slotEntry, cooldownObjective, sharedPointerCooldown);
        // The pointer is an action ability: any cooldown on it swallows the next press.
        if (entry) {
            try {
                entry.cooldown = 0;
                entry.maxCooldown = 0;
                if (typeof entry.syncState === "function") {
                    entry.syncState(entity);
                }
            } catch (errPointerCooldown) {
            }
        }
    } else if (!isArmsRuntimePointer) {
        ability.keyPressed(entity, true);
        ability.keyPressed(entity, false);
        afterActivationTimer = Number(ability.activationTimer || 0);
        afterInternalCooldown = Number(ability.cooldown || 0);
    }
    var nowEnabled = ability.isEnabled ? ability.isEnabled() : false;
    var triggerDetail = "item=" + itemId
        + " mapped=" + slotEntry.power + "#" + slotEntry.ability
        + " cooldown=" + cooldown
        + " internal_cd_before=" + beforeInternalCooldown
        + " internal_cd_after=" + afterInternalCooldown
        + " act_before=" + beforeActivationTimer
        + " act_after=" + afterActivationTimer
        + " enabled_before=" + wasEnabled
        + " enabled_after=" + nowEnabled;
    if (slotId === "os") {
        try {
            triggerDetail += " er_sandy_charge=" + getObjectiveScore(entity, "er_sandy_charge");
        } catch (err) {
            triggerDetail += " er_sandy_charge=err";
        }
        try {
            triggerDetail += " active_score=" + getObjectiveScore(entity, "er_sandy_active");
        } catch (err2) {
            triggerDetail += " active_score=err";
        }
    }
    pointerLog(
        entity,
        slotId,
        "triggered",
        triggerDetail
    );
    if (slotId === "circulatory") {
        bloodPumpLog(entity, "triggered", triggerDetail);
    }

    // Some abilities use deferred cooldown timing managed in server tick runtime.
    var usesDeferredCooldown = bypassPointerCooldownBlock;
    var cooldownTicks = Number(slotEntry.cooldown_ticks || 0);
    var pointerCooldownTicks = cooldownTicks;
    if (slotId === "face") {
        if (nowEnabled) {
            // Face scans stay cancelable while active; cooldown starts only after end/cancel.
            setPointerCooldownForInstalledItem(entity, slotId, itemId, slotEntry, cooldownObjective, 0);
            return;
        }

        if (wasEnabled) {
            pointerCooldownTicks = Math.max(pointerCooldownTicks, Math.floor(afterInternalCooldown));
        } else if (afterInternalCooldown > 0) {
            pointerCooldownTicks = Math.max(pointerCooldownTicks, Math.floor(afterInternalCooldown));
        } else {
            return;
        }

        pointerCooldownTicks = Math.max(0, Math.floor(pointerCooldownTicks));
        if (pointerCooldownTicks > 0) {
            setPointerCooldownForInstalledItem(entity, slotId, itemId, slotEntry, cooldownObjective, Math.max(cooldown, pointerCooldownTicks));
            if (entry && typeof entry.startCooldown === "function") {
                entry.startCooldown(entity, pointerCooldownTicks);
            }
        }
        return;
    }

    pointerCooldownTicks = Math.max(0, Math.floor(pointerCooldownTicks));
    if (isBloodPumpPointer) {
        return;
    }
    if (!usesDeferredCooldown && !wasEnabled && pointerCooldownTicks > 0) {
        setPointerCooldownForInstalledItem(entity, slotId, itemId, slotEntry, cooldownObjective, Math.max(cooldown, pointerCooldownTicks));
        if (entry && typeof entry.startCooldown === "function") {
            entry.startCooldown(entity, pointerCooldownTicks);
        }
    }
}

function registerPointerAbility(event, id, slotId, iconItem) {
    event.create(id)
        .icon(palladium.createItemIcon(iconItem))
        .firstTick(function (entity, entry, holder, enabled) {
            if (enabled === false) {
                return;
            }
            triggerSlotAbility(entity, entry, slotId);
        });
}

cyberwareInfo("startup loaded (slot_pointer_fallback_owned_power=enabled)");

StartupEvents.registry("palladium:abilities", function (event) {
    registerPointerAbility(event, "cyberpunk/cyberware_os", "os", "minecraft:nether_star");
    registerPointerAbility(event, "cyberpunk/cyberware_arms", "arms", "minecraft:iron_sword");
    registerPointerAbility(event, "cyberpunk/cyberware_face", "face", "minecraft:carved_pumpkin");
    registerPointerAbility(event, "cyberpunk/cyberware_circulatory", "circulatory", "minecraft:ghast_tear");
    registerPointerAbility(event, "cyberpunk/cyberware_extra", "extra", "minecraft:ender_eye");
});
