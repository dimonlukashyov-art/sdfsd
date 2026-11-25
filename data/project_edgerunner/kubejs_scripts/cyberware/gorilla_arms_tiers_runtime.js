// priority: 18
// Server script: sync Gorilla Arms upgrade tiers into persistentData for Java runtime.
(function () {
const ResourceLocation = Java.loadClass("net.minecraft.resources.ResourceLocation");
const PowerManager = Java.loadClass("net.threetag.palladium.power.PowerManager");

const GORILLA_POWER_ID = new ResourceLocation("project_edgerunner", "gorilla_arms");
const DAMAGE_PREFIX = "upgrade_damage_";
const BLEED_PREFIX = "upgrade_bleed_";
const NBT_POWER_PRESENT = "cyb_ga_power_present";
const NBT_DAMAGE_TIER = "cyb_ga_dmg_tier";
const NBT_BLEED_TIER = "cyb_ga_bleed_tier";
const NBT_AUGMENT = "cyb_ga_aug";
const NBT_AUGMENT_SELECTED = "cyb_ga_aug_sel";
const NBT_FINISHER_UNLOCK = "cyb_ga_finisher_unlock";
const NBT_FURY_UNLOCK = "cyb_ga_fury_unlock";
const NBT_SLAM_UNLOCK = "cyb_ga_slam_unlock";
const NBT_DBG_LAST_DAMAGE = "cyb_ga_dbg_last_dmg";
const NBT_DBG_LAST_BLEED = "cyb_ga_dbg_last_bleed";
const NBT_DBG_LAST_ACTIVE = "cyb_ga_dbg_last_active";
const NBT_DBG_LAST_SELECTED = "cyb_ga_dbg_last_sel";
const NBT_DBG_LAST_FINISHER = "cyb_ga_dbg_last_finisher";
const NBT_DBG_LAST_SLAM = "cyb_ga_dbg_last_slam";
const NBT_RUNTIME_CACHE = "cyb_ga_runtime_cache";
const NBT_RUNTIME_FORCE_UNTIL = "cyb_ga_runtime_force_until";
const GORILLA_DEBUG = false;
const ELEMENT_UPGRADES = [
    { id: "thermal", value: 1, unlockTag: "cyb_ga_aug_unlock_thermal" },
    { id: "electric", value: 2, unlockTag: "cyb_ga_aug_unlock_electric" },
    { id: "toxic", value: 3, unlockTag: "cyb_ga_aug_unlock_toxic" },
    { id: "frozen", value: 4, unlockTag: "cyb_ga_aug_unlock_frozen" }
];
const MAX_TIER = 4;
const GORILLA_RUNTIME_SYNC_INTERVAL = 5;
const GORILLA_RUNTIME_FORCE_SYNC_TICKS = 8;

function getEntity(player) {
    return player && player.minecraftEntity ? player.minecraftEntity : player;
}

function readIntTag(tag, key, fallback) {
    if (!tag) {
        return fallback || 0;
    }
    try {
        if (typeof tag.getInt === "function") {
            return Number(tag.getInt(String(key)) || 0);
        }
    } catch (err) {
    }
    try {
        if (tag[key] !== undefined && tag[key] !== null) {
            return Number(tag[key] || 0);
        }
    } catch (err2) {
    }
    return fallback || 0;
}

function writeIntTag(tag, key, value) {
    if (!tag) {
        return;
    }
    var numeric = Math.floor(Number(value || 0));
    try {
        if (typeof tag.putInt === "function") {
            tag.putInt(String(key), numeric);
            return;
        }
    } catch (err) {
    }
    tag[key] = numeric;
}

function clampInt(value, minValue, maxValue) {
    var numeric = Math.floor(Number(value || 0));
    if (numeric < minValue) {
        return minValue;
    }
    if (numeric > maxValue) {
        return maxValue;
    }
    return numeric;
}

function containsValue(list, value) {
    for (var i = 0; i < list.length; i++) {
        if (Number(list[i]) === Number(value)) {
            return true;
        }
    }
    return false;
}

function resolveElementName(value) {
    var numeric = Number(value || 0);
    for (var i = 0; i < ELEMENT_UPGRADES.length; i++) {
        if (Number(ELEMENT_UPGRADES[i].value) === numeric) {
            return ELEMENT_UPGRADES[i].id;
        }
    }
    return "none";
}

function debugLog(entity, message) {
    if (!GORILLA_DEBUG || !message) {
        return;
    }
    var playerName = "?";
    try {
        if (entity && entity.getScoreboardName) {
            playerName = String(entity.getScoreboardName());
        }
    } catch (ignoreName) {
    }
    console.info("[Cyberpunk/GorillaArms/KJS][" + playerName + "] " + String(message));
}

function resolveServer(entity) {
    if (!entity) {
        return null;
    }
    try {
        if (entity.server) {
            return entity.server;
        }
    } catch (ignoreServerField) {
    }
    try {
        if (entity.level && typeof entity.level.getServer === "function") {
            return entity.level.getServer();
        }
    } catch (ignoreLevelServer) {
    }
    return null;
}

function getGameTime(entity) {
    if (!entity || !entity.level) {
        return 0;
    }
    try {
        return Number(entity.level.gameTime || 0);
    } catch (ignoreTick) {
    }
    return 0;
}

function runServerCommand(server, command) {
    if (!server || !command) {
        return;
    }
    try {
        if (typeof server.runCommandSilent === "function") {
            server.runCommandSilent(command);
            return;
        }
    } catch (ignoreSilent) {
    }
    try {
        if (typeof server.runCommand === "function") {
            server.runCommand(command);
        }
    } catch (ignoreVerbose) {
    }
}

function enforceElementLocks(entity, activeAugment, unlocked) {
    if (!entity || activeAugment <= 0 || !entity.getScoreboardName) {
        return;
    }
    var tag = entity.persistentData;
    var marker = "cyb_ga_lock_marker_" + String(activeAugment);
    if (tag && readIntTag(tag, marker, 0) > 0) {
        return;
    }
    var playerName = String(entity.getScoreboardName());
    var server = resolveServer(entity);
    if (!server || !playerName) {
        return;
    }
    for (var i = 0; i < ELEMENT_UPGRADES.length; i++) {
        var entry = ELEMENT_UPGRADES[i];
        if (entry.value === activeAugment) {
            continue;
        }
        debugLog(
            entity,
            "locking augment ability upgrade_element_" + entry.id
                + " (active=" + resolveElementName(activeAugment) + ", unlocked=" + unlocked.join(",") + ")"
        );
        runServerCommand(
            server,
            "execute as " + playerName + " run ability lock @s project_edgerunner:gorilla_arms upgrade_element_" + entry.id
        );
    }
    if (tag) {
        for (var j = 0; j < ELEMENT_UPGRADES.length; j++) {
            writeIntTag(tag, "cyb_ga_lock_marker_" + String(ELEMENT_UPGRADES[j].value), 0);
        }
        writeIntTag(tag, marker, 1);
    }
}

function getPowerHolder(entity) {
    if (!entity || !entity.level) {
        return null;
    }
    var power = PowerManager.getInstance(entity.level).getPower(GORILLA_POWER_ID);
    if (!power) {
        return null;
    }
    var handlerOptional = PowerManager.getPowerHandler(entity);
    if (!handlerOptional || !handlerOptional.isPresent || !handlerOptional.isPresent()) {
        return null;
    }
    return handlerOptional.get().getPowerHolder(power);
}

function refreshRuntimeCache(entity, forceSyncTicks) {
    if (!entity || !entity.persistentData) {
        return false;
    }
    var holder = getPowerHolder(entity);
    var installed = !!(holder && holder.getAbilities);
    writeIntTag(entity.persistentData, NBT_RUNTIME_CACHE, installed ? 1 : 0);
    var untilTick = 0;
    if (installed && Number(forceSyncTicks || 0) > 0) {
        var nowTick = getGameTime(entity);
        untilTick = (isFinite(nowTick) ? nowTick : 0) + Math.max(1, Math.floor(Number(forceSyncTicks || 0)));
    }
    writeIntTag(entity.persistentData, NBT_RUNTIME_FORCE_UNTIL, untilTick);
    return installed;
}

function isAbilityUnlocked(abilities, abilityId) {
    if (!abilities || !abilityId) {
        return false;
    }
    var candidates = [
        String(abilityId),
        "project_edgerunner:" + String(abilityId),
        "project_edgerunner:gorilla_arms/" + String(abilityId)
    ];
    for (var i = 0; i < candidates.length; i++) {
        try {
            var ability = abilities.get(String(candidates[i]));
            if (ability && ability.isUnlocked && ability.isUnlocked()) {
                return true;
            }
        } catch (ignoreCandidate) {
        }
    }
    return false;
}

function getUnlockedAbilityKeys(abilities) {
    var keys = [];
    if (!abilities || !abilities.entrySet || typeof abilities.entrySet !== "function") {
        return keys;
    }
    try {
        var entries = abilities.entrySet();
        if (!entries || !entries.iterator) {
            return keys;
        }
        var iterator = entries.iterator();
        while (iterator.hasNext()) {
            var entry = iterator.next();
            if (!entry) {
                continue;
            }
            var ability = null;
            try {
                ability = entry.getValue();
            } catch (ignoreValue) {
                ability = null;
            }
            if (!ability || !ability.isUnlocked || !ability.isUnlocked()) {
                continue;
            }
            var keyText = "";
            try {
                keyText = String(entry.getKey() || "");
            } catch (ignoreKey) {
                keyText = "";
            }
            if (keyText) {
                keys.push(keyText);
            }
        }
    } catch (ignoreIter) {
    }
    return keys;
}

function hasUnlockedAbility(abilities, unlockedKeys, abilityId) {
    if (isAbilityUnlocked(abilities, abilityId)) {
        return true;
    }
    var needle = String(abilityId || "");
    if (!needle) {
        return false;
    }
    for (var i = 0; i < unlockedKeys.length; i++) {
        var keyText = String(unlockedKeys[i] || "");
        if (keyText.indexOf(needle) >= 0) {
            return true;
        }
    }
    return false;
}

function readTier(abilities, unlockedKeys, prefix) {
    if (!abilities) {
        return 0;
    }
    var tier = 0;
    for (var i = 1; i <= MAX_TIER; i++) {
        if (hasUnlockedAbility(abilities, unlockedKeys, prefix + i)) {
            tier = i;
        }
    }
    return tier;
}

function getUnlockedElements(abilities, unlockedKeys) {
    var unlocked = [];
    if (!abilities) {
        return unlocked;
    }
    for (var i = 0; i < ELEMENT_UPGRADES.length; i++) {
        var entry = ELEMENT_UPGRADES[i];
        if (hasUnlockedAbility(abilities, unlockedKeys, "upgrade_element_" + entry.id)) {
            unlocked.push(entry.value);
        }
    }
    return unlocked;
}

function getUnlockedElementsFromTags(tag) {
    var unlocked = [];
    if (!tag) {
        return unlocked;
    }
    for (var i = 0; i < ELEMENT_UPGRADES.length; i++) {
        var entry = ELEMENT_UPGRADES[i];
        if (readIntTag(tag, entry.unlockTag, 0) > 0) {
            unlocked.push(entry.value);
        }
    }
    return unlocked;
}

function resolveElementUpgrade(unlocked, selectedValue, activeValue) {
    if (unlocked.length === 0) {
        return 0;
    }
    var selected = clampInt(selectedValue, 0, 4);
    if (containsValue(unlocked, selected)) {
        return selected;
    }
    var active = clampInt(activeValue, 0, 4);
    if (containsValue(unlocked, active)) {
        return active;
    }
    // Fallback determinista: ultimo por prioridad de nodo.
    return unlocked[unlocked.length - 1];
}

global.refreshGorillaArmsRuntimeNow = function (playerOrEntity) {
    if (!playerOrEntity) {
        return;
    }
    var entity = getEntity(playerOrEntity);
    if (!entity || !entity.persistentData) {
        return;
    }
    refreshRuntimeCache(entity, GORILLA_RUNTIME_FORCE_SYNC_TICKS);
};

ServerEvents.tick(function (event) {
    var players = event.server && event.server.players ? event.server.players : [];
    for (var i = 0; i < players.length; i++) {
        var entity = getEntity(players[i]);
        if (!entity || !entity.persistentData) {
            continue;
        }
        var gameTime = 0;
        try {
            gameTime = Number(entity.level && entity.level.gameTime ? entity.level.gameTime : 0);
        } catch (ignoreTick) {
        }
        var tag = entity.persistentData;
        var cached = readIntTag(tag, NBT_RUNTIME_CACHE, -1);
        if (cached < 0) {
            refreshRuntimeCache(entity, 0);
            cached = readIntTag(tag, NBT_RUNTIME_CACHE, 0);
        }
        if (cached <= 0) {
            writeIntTag(tag, NBT_POWER_PRESENT, 0);
            continue;
        }

        var forceUntil = readIntTag(tag, NBT_RUNTIME_FORCE_UNTIL, 0);
        var forceNow = isFinite(gameTime) && gameTime > 0 && forceUntil >= gameTime;
        if (!forceNow && isFinite(gameTime) && gameTime > 0 && (gameTime % GORILLA_RUNTIME_SYNC_INTERVAL) !== 0) {
            continue;
        }

        var holder = getPowerHolder(entity);
        if (!holder || !holder.getAbilities) {
            // No pisar progreso si el holder no esta disponible en este tick.
            writeIntTag(tag, NBT_RUNTIME_CACHE, 0);
            writeIntTag(tag, NBT_POWER_PRESENT, 0);
            continue;
        }

        writeIntTag(tag, NBT_RUNTIME_CACHE, 1);
        if (forceNow) {
            writeIntTag(tag, NBT_RUNTIME_FORCE_UNTIL, 0);
        }

        writeIntTag(tag, NBT_POWER_PRESENT, 1);
        var abilities = holder.getAbilities();
        var unlockedKeys = getUnlockedAbilityKeys(abilities);
        var detectedDamage = readTier(abilities, unlockedKeys, DAMAGE_PREFIX);
        var detectedBleed = readTier(abilities, unlockedKeys, BLEED_PREFIX);
        var currentDamage = clampInt(readIntTag(tag, NBT_DAMAGE_TIER, 0), 0, MAX_TIER);
        var currentBleed = clampInt(readIntTag(tag, NBT_BLEED_TIER, 0), 0, MAX_TIER);
        var currentFinisher = clampInt(readIntTag(tag, NBT_FINISHER_UNLOCK, 0), 0, 1);
        var currentFury = clampInt(readIntTag(tag, NBT_FURY_UNLOCK, 0), 0, 1);
        var currentSlam = clampInt(readIntTag(tag, NBT_SLAM_UNLOCK, 0), 0, 1);
        var damageTier = Math.max(currentDamage, detectedDamage);
        var bleedTier = Math.max(currentBleed, detectedBleed);
        // Special unlocks also have a runtime command fallback in the generated power.
        var finisherUnlocked = hasUnlockedAbility(abilities, unlockedKeys, "upgrade_unlock_finishers")
            || hasUnlockedAbility(abilities, unlockedKeys, "upgrade_special_finisher")
            || currentFinisher > 0;
        // Gorilla Fury is a node of its own now; Slam hangs off it instead of implying it.
        var furyUnlocked = hasUnlockedAbility(abilities, unlockedKeys, "upgrade_special_fury")
            || currentFury > 0;
        var slamUnlocked = hasUnlockedAbility(abilities, unlockedKeys, "upgrade_special_slam") || currentSlam > 0;

        var selectedAugment = clampInt(readIntTag(tag, NBT_AUGMENT_SELECTED, 0), 0, 4);
        var currentAugment = clampInt(readIntTag(tag, NBT_AUGMENT, 0), 0, 4);
        var unlockedElements = getUnlockedElements(abilities, unlockedKeys);
        if (unlockedElements.length === 0) {
            unlockedElements = getUnlockedElementsFromTags(tag);
            if (unlockedElements.length === 0) {
                if (selectedAugment > 0) {
                    unlockedElements.push(selectedAugment);
                } else if (currentAugment > 0) {
                    unlockedElements.push(currentAugment);
                }
            }
        }
        var activeAugment = resolveElementUpgrade(unlockedElements, selectedAugment, currentAugment);
        enforceElementLocks(entity, activeAugment, unlockedElements);
        for (var e = 0; e < ELEMENT_UPGRADES.length; e++) {
            var element = ELEMENT_UPGRADES[e];
            writeIntTag(tag, element.unlockTag, activeAugment > 0 && element.value === activeAugment ? 1 : 0);
        }
        writeIntTag(tag, NBT_AUGMENT_SELECTED, activeAugment);
        writeIntTag(tag, NBT_DAMAGE_TIER, damageTier);
        writeIntTag(tag, NBT_BLEED_TIER, bleedTier);
        writeIntTag(tag, NBT_AUGMENT, activeAugment);
        writeIntTag(tag, NBT_FINISHER_UNLOCK, finisherUnlocked ? 1 : 0);
        writeIntTag(tag, NBT_FURY_UNLOCK, furyUnlocked ? 1 : 0);
        writeIntTag(tag, NBT_SLAM_UNLOCK, slamUnlocked ? 1 : 0);

        var prevDamageDbg = readIntTag(tag, NBT_DBG_LAST_DAMAGE, -1);
        var prevBleedDbg = readIntTag(tag, NBT_DBG_LAST_BLEED, -1);
        var prevSelectedDbg = readIntTag(tag, NBT_DBG_LAST_SELECTED, -1);
        var prevActiveDbg = readIntTag(tag, NBT_DBG_LAST_ACTIVE, -1);
        var prevFinisherDbg = readIntTag(tag, NBT_DBG_LAST_FINISHER, -1);
        var prevSlamDbg = readIntTag(tag, NBT_DBG_LAST_SLAM, -1);
        if (prevDamageDbg !== damageTier || prevBleedDbg !== bleedTier
                || prevSelectedDbg !== selectedAugment || prevActiveDbg !== activeAugment
                || prevFinisherDbg !== (finisherUnlocked ? 1 : 0) || prevSlamDbg !== (slamUnlocked ? 1 : 0)) {
            debugLog(
                entity,
                "tiers dmg=" + damageTier + " bleed=" + bleedTier
                    + " finisher=" + (finisherUnlocked ? 1 : 0)
                    + " slam=" + (slamUnlocked ? 1 : 0)
                    + " | selected=" + selectedAugment + ":" + resolveElementName(selectedAugment)
                    + " | active=" + activeAugment + ":" + resolveElementName(activeAugment)
                    + " | unlocked=" + unlockedElements.join(",")
            );
            writeIntTag(tag, NBT_DBG_LAST_DAMAGE, damageTier);
            writeIntTag(tag, NBT_DBG_LAST_BLEED, bleedTier);
            writeIntTag(tag, NBT_DBG_LAST_SELECTED, selectedAugment);
            writeIntTag(tag, NBT_DBG_LAST_ACTIVE, activeAugment);
            writeIntTag(tag, NBT_DBG_LAST_FINISHER, finisherUnlocked ? 1 : 0);
            writeIntTag(tag, NBT_DBG_LAST_SLAM, slamUnlocked ? 1 : 0);
        }
    }
});
})();
