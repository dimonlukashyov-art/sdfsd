// priority: 170
// Server script: canonical cyberware slot registry and validation.

const CyberwareScriptBridge = Java.loadClass("com.edgerunner.cyberware.CyberwareScriptBridge");

const CYBERWARE_SLOT_IDS = ["os", "arms", "face", "circulatory", "extra"];
const CYBERWARE_BODY_SLOT_IDS = [
    "os",
    "supresors",
    "frontal_cortex",
    "arms",
    "face",
    "hands",
    "skeleton",
    "nervous_system",
    "circulatory_system",
    "integumentary_system",
    "legs"
];
const CYBERWARE_OS_PREFIX = "project_edgerunner:sandevistan_";
const CYBERWARE_LEGACY_INSTALLED_KEY = "installed";
const CYBERWARE_INSTALLED_PHYSICAL_KEY = "installed_physical";
const CYBERWARE_PHYSICAL_SLOT_PREFIX = "slot_";
const CYBERWARE_PHYSICAL_SLOT_COUNT = 20;
const CYBERWARE_RIPPERDOC_MENU_ROOT_KEY = "CyberpunkRipperdocGui";
const CYBERWARE_RIPPERDOC_MENU_SLOT_PREFIX = "Slot";
const CYBERWARE_BODY_SLOT_DATA_KEY = "installed_body_slots";
const CYBERWARE_ACTIVATION_SLOT_DATA_KEY = "installed_activation_slots";

const CYBERWARE_BODY_SLOT_TO_PHYSICAL_SLOT = {
    os: 0,
    supresors: 19,
    frontal_cortex: 1,
    arms: 5,
    face: 4,
    skeleton: 7,
    circulatory_system: 10,
    legs: 18
};

const CYBERWARE_BODY_SLOT_TO_LEGACY_COMPONENT_KEY = {
    frontal_cortex: "frontal_cortex",
    arms: "arms",
    face: "face",
    circulatory_system: "circulatory",
    legs: "extra"
};

const CYBERWARE_INSTALL_ACTIVATION_MODES = [
    "manual",
    "passive",
    "movement",
    "event"
];

const CYBERWARE_SLOT_COOLDOWN_OBJECTIVES = {
    os: "er_cw_cd_os",
    arms: "er_cw_cd_arms",
    face: "er_cw_cd_face",
    circulatory: "er_cw_cd_circ",
    extra: "er_cw_cd_extra"
};

const CYBERWARE_SLOT_ICON_OBJECTIVES = {
    os: "er_cw_icon_os",
    arms: "er_cw_icon_arms",
    face: "er_cw_icon_face",
    circulatory: "er_cw_icon_circ",
    extra: "er_cw_icon_extra"
};

if (global.CYBERPUNK_DEBUG === undefined) {
    global.CYBERPUNK_DEBUG = false;
}

function cyberwareLogInfo(message) {
    console.info("[Cyberpunk/Cyberware] " + message);
}

function cyberwareLogDebug(message) {
    if (global.CYBERPUNK_DEBUG) {
        console.info("[Cyberpunk/Cyberware/Debug] " + message);
    }
}

function cyberwareFail(message) {
    throw new Error("[Cyberpunk/Cyberware] " + message);
}

function resolveCyberwareDataHolder(playerOrEntity) {
    if (!playerOrEntity) {
        return null;
    }
    if (playerOrEntity.minecraftEntity && playerOrEntity.minecraftEntity.persistentData) {
        return playerOrEntity.minecraftEntity;
    }
    return playerOrEntity;
}

function resolveCyberwareBridgeSubject(playerOrEntity) {
    return playerOrEntity && playerOrEntity.minecraftEntity ? playerOrEntity.minecraftEntity : playerOrEntity;
}

function readCyberwareDataFromBridge(playerOrEntity) {
    try {
        var json = String(CyberwareScriptBridge.toCyberwareJson(resolveCyberwareBridgeSubject(playerOrEntity)) || "");
        if (!json) {
            return null;
        }
        var parsed = JSON.parse(json);
        return parsed && typeof parsed === "object" ? parsed : null;
    } catch (err) {
        return null;
    }
}

function validateResourceLocation(idText, fieldName) {
    var text = String(idText || "");
    if (!/^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(text)) {
        cyberwareFail("Invalid " + fieldName + " resource location: '" + text + "'");
    }
    return text;
}

function validateResourceLocationList(rawList, fieldName) {
    if (!rawList) {
        return [];
    }
    if (!Array.isArray(rawList)) {
        cyberwareFail("Invalid " + fieldName + ": expected an array");
    }
    var out = [];
    for (var i = 0; i < rawList.length; i++) {
        var id = validateResourceLocation(rawList[i], fieldName + "[" + i + "]");
        if (out.indexOf(id) < 0) {
            out.push(id);
        }
    }
    return out;
}

function validateSlotId(slotId) {
    if (CYBERWARE_SLOT_IDS.indexOf(slotId) < 0) {
        cyberwareFail("Unknown slot id '" + slotId + "'");
    }
    return slotId;
}

function validateBodySlotId(bodySlotId) {
    var text = String(bodySlotId || "").trim().toLowerCase();
    if (CYBERWARE_BODY_SLOT_IDS.indexOf(text) < 0) {
        cyberwareFail("Unknown body slot id '" + text + "'");
    }
    return text;
}

function normalizeLegacyBodySlot(rawSlot) {
    var text = String(rawSlot || "").trim().toLowerCase();
    if (!text) {
        return "";
    }
    if (text === "circulatory") {
        return "circulatory_system";
    }
    if (text === "extra" || text === "tendons") {
        return "legs";
    }
    if (text === "frontal") {
        return "frontal_cortex";
    }
    return text;
}

function resolveDefaultBodySlotForActivationSlot(slotId) {
    if (slotId === "os") {
        return "os";
    }
    if (slotId === "arms") {
        return "arms";
    }
    if (slotId === "face") {
        return "face";
    }
    if (slotId === "circulatory") {
        return "circulatory_system";
    }
    return "";
}

function resolveLegacyComponentKey(bodySlot, fallback) {
    var resolvedBodySlot = normalizeLegacyBodySlot(bodySlot);
    var mapped = CYBERWARE_BODY_SLOT_TO_LEGACY_COMPONENT_KEY[resolvedBodySlot];
    if (mapped) {
        return mapped;
    }
    var fallbackText = String(fallback || "").trim().toLowerCase();
    return fallbackText;
}

function normalizeActivationMode(rawMode, fallbackMode) {
    var text = String(rawMode || fallbackMode || "").trim().toLowerCase();
    if (!text) {
        return "passive";
    }
    if (CYBERWARE_INSTALL_ACTIVATION_MODES.indexOf(text) >= 0) {
        return text;
    }
    if (!/^[a-z_]+$/.test(text)) {
        cyberwareFail("Invalid activation_mode '" + text + "'");
    }
    return text;
}

function validateActivationSlotId(slotId, allowEmpty) {
    var text = String(slotId || "").trim().toLowerCase();
    if (!text) {
        if (allowEmpty) {
            return "";
        }
        cyberwareFail("Missing activation slot id");
    }
    return validateSlotId(text);
}

function readConfigMapString(source, key) {
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
    } catch (err1) {
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

function validateEntry(slotId, rawEntry) {
    if (!rawEntry || typeof rawEntry !== "object") {
        cyberwareFail("Entry for slot '" + slotId + "' must be an object");
    }
    var item = validateResourceLocation(rawEntry.item, "item");
    var power = validateResourceLocation(rawEntry.power, "power");
    var ability = String(rawEntry.ability || "").trim();
    if (!ability) {
        cyberwareFail("Missing ability for slot '" + slotId + "' and item '" + item + "'");
    }
    var cooldownTicks = Number(rawEntry.cooldown_ticks || 0);
    if (!Number.isFinite(cooldownTicks) || cooldownTicks < 0) {
        cyberwareFail("Invalid cooldown_ticks for slot '" + slotId + "' and item '" + item + "'");
    }
    cooldownTicks = Math.floor(cooldownTicks);
    var iconIndex = Number(rawEntry.icon_index || 0);
    if (!Number.isFinite(iconIndex) || iconIndex < 0) {
        cyberwareFail("Invalid icon_index for slot '" + slotId + "' and item '" + item + "'");
    }
    iconIndex = Math.floor(iconIndex);
    var iconAlias = String(rawEntry.icon_alias || "").trim().toLowerCase();
    if (iconAlias && !/^[a-z0-9_./-]+$/.test(iconAlias)) {
        cyberwareFail("Invalid icon_alias for slot '" + slotId + "' and item '" + item + "'");
    }
    var bodySlot = String(rawEntry.body_slot || "").trim().toLowerCase();
    if (!bodySlot) {
        bodySlot = resolveDefaultBodySlotForActivationSlot(slotId);
    }
    if (!bodySlot) {
        cyberwareFail("Missing body_slot for slot entry '" + slotId + "' and item '" + item + "'");
    }
    bodySlot = validateBodySlotId(normalizeLegacyBodySlot(bodySlot));
    var activationMode = normalizeActivationMode(rawEntry.activation_mode, "manual");
    return {
        item: item,
        power: power,
        ability: ability,
        cooldown_ticks: cooldownTicks,
        icon_index: iconIndex,
        icon_alias: iconAlias,
        body_slot: bodySlot,
        activation_slot: slotId,
        activation_mode: activationMode
    };
}

global.CYBERWARE_SLOT_IDS = CYBERWARE_SLOT_IDS.slice(0);
global.CYBERWARE_BODY_SLOT_IDS = CYBERWARE_BODY_SLOT_IDS.slice(0);
global.CYBERWARE_SLOT_COOLDOWN_OBJECTIVES = Object.assign({}, CYBERWARE_SLOT_COOLDOWN_OBJECTIVES);
global.CYBERWARE_SLOT_ICON_OBJECTIVES = Object.assign({}, CYBERWARE_SLOT_ICON_OBJECTIVES);
global.CYBERWARE_BODY_SLOT_TO_PHYSICAL_SLOT = Object.assign({}, CYBERWARE_BODY_SLOT_TO_PHYSICAL_SLOT);
global.CYBERWARE_SLOT_CONFIGS = {};
global.CYBERWARE_SLOT_CONFIG_INDEX = {};
global.CYBERWARE_INSTALL_CONFIG = {
    os: {},
    components: {}
};

CYBERWARE_SLOT_IDS.forEach(function (slotId) {
    global.CYBERWARE_SLOT_CONFIGS[slotId] = [];
    global.CYBERWARE_SLOT_CONFIG_INDEX[slotId] = {};
});

global.registerCyberwareSlotEntry = function (slotId, rawEntry) {
    var validatedSlot = validateSlotId(String(slotId || ""));
    var entry = validateEntry(validatedSlot, rawEntry);
    var index = global.CYBERWARE_SLOT_CONFIG_INDEX[validatedSlot];
    if (index[entry.item]) {
        cyberwareFail("Duplicate slot entry for slot '" + validatedSlot + "' and item '" + entry.item + "'");
    }
    index[entry.item] = entry;
    global.CYBERWARE_SLOT_CONFIGS[validatedSlot].push(entry);
    cyberwareLogDebug("Registered slot entry: " + validatedSlot + " -> " + entry.item + " -> " + entry.power + "#" + entry.ability);
    return entry;
};

global.getCyberwareSlotEntry = function (slotId, itemId) {
    if (!itemId) {
        return null;
    }
    var validatedSlot = validateSlotId(String(slotId || ""));
    var textItem = String(itemId);
    var exact = global.CYBERWARE_SLOT_CONFIG_INDEX[validatedSlot][textItem] || null;
    if (exact) {
        return exact;
    }

    // Modular fallback for unknown Sandevistan variants.
    if (validatedSlot === "os" && textItem.indexOf(CYBERWARE_OS_PREFIX) === 0) {
        return {
            item: textItem,
            power: textItem,
            ability: "Sandevistan",
            cooldown_ticks: 0,
            icon_index: 1,
            icon_alias: "sandevistan"
        };
    }

    return null;
};

global.getCyberwareMappedPowers = function () {
    var map = {};
    CYBERWARE_SLOT_IDS.forEach(function (slotId) {
        var list = global.CYBERWARE_SLOT_CONFIGS[slotId] || [];
        for (var i = 0; i < list.length; i++) {
            map[list[i].power] = true;
        }
    });
    return Object.keys(map);
};

function validateInstallOsEntry(rawEntry) {
    if (!rawEntry || typeof rawEntry !== "object") {
        cyberwareFail("OS install entry must be an object");
    }
    var item = validateResourceLocation(rawEntry.item, "os.item");
    var name = String(rawEntry.name || item).trim();
    var loadCost = Number(rawEntry.load_cost !== undefined ? rawEntry.load_cost : rawEntry.max_load || 0);
    if (!Number.isFinite(loadCost) || loadCost < 0) {
        cyberwareFail("Invalid load_cost for OS item '" + item + "'");
    }
    var power = rawEntry.palladium_power ? validateResourceLocation(rawEntry.palladium_power, "os.palladium_power") : "";
    var activationSlot = validateActivationSlotId(rawEntry.activation_slot || "os", false);
    var activationMode = normalizeActivationMode(rawEntry.activation_mode, "manual");
    if (activationMode === "manual" && !activationSlot) {
        cyberwareFail("OS item '" + item + "' requires activation_slot when activation_mode is manual");
    }
    return {
        item: item,
        name: name || item,
        load_cost: Math.floor(loadCost),
        palladium_power: power,
        command: typeof rawEntry.command === "function" ? rawEntry.command : null,
        body_slot: "os",
        activation_slot: activationSlot,
        activation_mode: activationMode,
        legacy_slot_key: ""
    };
}

function validateInstallComponentEntry(rawEntry) {
    if (!rawEntry || typeof rawEntry !== "object") {
        cyberwareFail("Component install entry must be an object");
    }
    var item = validateResourceLocation(rawEntry.item, "component.item");
    var declaredType = String(rawEntry.type || "").trim().toLowerCase();
    var bodySlot = String(rawEntry.body_slot || "").trim().toLowerCase();
    if (!bodySlot) {
        bodySlot = normalizeLegacyBodySlot(declaredType);
    }
    if (!bodySlot) {
        cyberwareFail("Missing component body_slot for item '" + item + "'");
    }
    bodySlot = validateBodySlotId(bodySlot);
    var activationSlot = validateActivationSlotId(rawEntry.activation_slot || "", true);
    var activationMode = normalizeActivationMode(rawEntry.activation_mode, activationSlot ? "manual" : "passive");
    if (activationMode === "manual" && !activationSlot) {
        cyberwareFail("Component item '" + item + "' requires activation_slot when activation_mode is manual");
    }
    var legacySlotKey = String(rawEntry.legacy_slot_key || "").trim().toLowerCase();
    if (!legacySlotKey) {
        legacySlotKey = resolveLegacyComponentKey(bodySlot, declaredType);
    }
    var loadCost = Number(rawEntry.load_cost || 0);
    if (!Number.isFinite(loadCost) || loadCost < 0) {
        cyberwareFail("Invalid load_cost for component item '" + item + "'");
    }
    var power = rawEntry.palladium_power ? validateResourceLocation(rawEntry.palladium_power, "component.palladium_power") : "";
    var exclusivePowers = validateResourceLocationList(rawEntry.exclusive_palladium_powers, "component.exclusive_palladium_powers");
    return {
        item: item,
        name: String(rawEntry.name || item),
        type: declaredType,
        body_slot: bodySlot,
        legacy_slot_key: legacySlotKey,
        activation_slot: activationSlot,
        activation_mode: activationMode,
        load_cost: Math.floor(loadCost),
        palladium_power: power,
        exclusive_palladium_powers: exclusivePowers,
        install_message: String(rawEntry.install_message || "Cyberware installed."),
        remove_message: String(rawEntry.remove_message || "Cyberware removed.")
    };
}

global.registerCyberwareInstallOs = function (rawEntry) {
    var entry = validateInstallOsEntry(rawEntry);
    if (global.CYBERWARE_INSTALL_CONFIG.os[entry.item]) {
        cyberwareFail("Duplicate OS install entry for item '" + entry.item + "'");
    }
    global.CYBERWARE_INSTALL_CONFIG.os[entry.item] = entry;
    cyberwareLogDebug("Registered install OS entry: " + entry.item);
    return entry;
};

global.registerCyberwareInstallComponent = function (rawEntry) {
    var entry = validateInstallComponentEntry(rawEntry);
    if (global.CYBERWARE_INSTALL_CONFIG.components[entry.item]) {
        cyberwareFail("Duplicate component install entry for item '" + entry.item + "'");
    }
    global.CYBERWARE_INSTALL_CONFIG.components[entry.item] = entry;
    cyberwareLogDebug("Registered install component entry: " + entry.item + " -> " + entry.type);
    return entry;
};

global.getCyberwareInstallOsConfig = function (itemId) {
    if (!itemId) {
        return null;
    }
    return global.CYBERWARE_INSTALL_CONFIG.os[String(itemId)] || null;
};

global.getCyberwareInstallComponentConfig = function (itemId) {
    if (!itemId) {
        return null;
    }
    return global.CYBERWARE_INSTALL_CONFIG.components[String(itemId)] || null;
};

global.getAllCyberwareInstallOsConfigs = function () {
    return Object.keys(global.CYBERWARE_INSTALL_CONFIG.os).map(function (itemId) {
        return global.CYBERWARE_INSTALL_CONFIG.os[itemId];
    });
};

global.getAllCyberwareInstallComponentConfigs = function () {
    return Object.keys(global.CYBERWARE_INSTALL_CONFIG.components).map(function (itemId) {
        return global.CYBERWARE_INSTALL_CONFIG.components[itemId];
    });
};

global.getAllCyberwareInstallableItemIds = function () {
    var ids = {};
    Object.keys(global.CYBERWARE_INSTALL_CONFIG.os).forEach(function (itemId) {
        ids[itemId] = true;
    });
    Object.keys(global.CYBERWARE_INSTALL_CONFIG.components).forEach(function (itemId) {
        ids[itemId] = true;
    });
    return Object.keys(ids);
};

global.resolveCyberwarePhysicalSlotForBodySlot = function (bodySlot) {
    var normalized = normalizeLegacyBodySlot(bodySlot);
    return CYBERWARE_BODY_SLOT_TO_PHYSICAL_SLOT[normalized] !== undefined
        ? Number(CYBERWARE_BODY_SLOT_TO_PHYSICAL_SLOT[normalized])
        : -1;
};

global.getCyberwareItemDefinition = function (itemId) {
    var textItem = String(itemId || "");
    if (!textItem) {
        return null;
    }
    var osConfig = global.getCyberwareInstallOsConfig ? global.getCyberwareInstallOsConfig(textItem) : null;
    if (osConfig) {
        return osConfig;
    }
    var componentConfig = global.getCyberwareInstallComponentConfig ? global.getCyberwareInstallComponentConfig(textItem) : null;
    if (componentConfig) {
        return componentConfig;
    }
    var slotConfigs = global.CYBERWARE_SLOT_CONFIGS || {};
    var activationSlots = global.CYBERWARE_SLOT_IDS || [];
    for (var i = 0; i < activationSlots.length; i++) {
        var activationSlot = activationSlots[i];
        var list = slotConfigs[activationSlot] || [];
        for (var j = 0; j < list.length; j++) {
            if (String(list[j].item || "") === textItem) {
                return list[j];
            }
        }
    }
    if (textItem.indexOf(CYBERWARE_OS_PREFIX) === 0) {
        return {
            item: textItem,
            body_slot: "os",
            activation_slot: "os",
            activation_mode: "manual",
            legacy_slot_key: ""
        };
    }
    return null;
};

global.normalizeCyberwareInstalledData = function (playerOrEntity) {
    var holder = resolveCyberwareDataHolder(playerOrEntity);
    if (!holder || !holder.persistentData) {
        return null;
    }

    var cyber = holder.persistentData.cyberware;
    if (!cyber) {
        cyber = {
            current_load: 0,
            installed_os: null,
            installed_components: {},
            installed_physical: {},
            installed_body_slots: {},
            installed_activation_slots: {}
        };
        holder.persistentData.cyberware = cyber;
    }

    function readString(source, key) {
        try {
            if (source && typeof source.getString === "function") {
                return String(source.getString(key) || "");
            }
        } catch (err) {
        }
        try {
            return String(source && source[key] ? source[key] : "");
        } catch (err2) {
            return "";
        }
    }

    function readInt(source, key) {
        try {
            if (source && typeof source.getInt === "function") {
                return Number(source.getInt(key) || 0);
            }
        } catch (err) {
        }
        try {
            return Number(source && source[key] ? source[key] : 0);
        } catch (err2) {
            return 0;
        }
    }

    function readSlotItemId(menuRoot, slotIndex) {
        if (!menuRoot) {
            return "";
        }
        var slotKey = CYBERWARE_RIPPERDOC_MENU_SLOT_PREFIX + String(slotIndex);
        var slotTag = null;
        try {
            if (menuRoot && typeof menuRoot.getCompound === "function") {
                slotTag = menuRoot.getCompound(slotKey);
            }
        } catch (err) {
            slotTag = null;
        }
        try {
            if (!slotTag && menuRoot && menuRoot[slotKey] !== undefined && menuRoot[slotKey] !== null) {
                slotTag = menuRoot[slotKey];
            }
        } catch (err2) {
        }
        if (!slotTag) {
            return "";
        }
        var itemId = readString(slotTag, "id");
        if (!itemId || itemId === "minecraft:air") {
            return "";
        }
        return itemId;
    }

    function firstNonEmptyMenuSlot(menuRoot, slotIds) {
        for (var i = 0; i < slotIds.length; i++) {
            var found = readSlotItemId(menuRoot, slotIds[i]);
            if (found) {
                return found;
            }
        }
        return "";
    }

    function readMenuRoot() {
        function persistentHasMenuRoot() {
            if (!holder.persistentData || typeof holder.persistentData.contains !== "function") {
                return true;
            }
            try {
                return !!holder.persistentData.contains(CYBERWARE_RIPPERDOC_MENU_ROOT_KEY, 10);
            } catch (errTypedContains) {
            }
            try {
                return !!holder.persistentData.contains(CYBERWARE_RIPPERDOC_MENU_ROOT_KEY);
            } catch (errContains) {
            }
            return true;
        }

        try {
            if (!persistentHasMenuRoot()) {
                return null;
            }
        } catch (errHasRoot) {
        }
        try {
            if (holder.persistentData
                    && typeof holder.persistentData.getCompound === "function"
                    && persistentHasMenuRoot()) {
                return holder.persistentData.getCompound(CYBERWARE_RIPPERDOC_MENU_ROOT_KEY);
            }
        } catch (err) {
        }
        try {
            if (holder.persistentData && holder.persistentData[CYBERWARE_RIPPERDOC_MENU_ROOT_KEY] !== undefined) {
                return holder.persistentData[CYBERWARE_RIPPERDOC_MENU_ROOT_KEY];
            }
        } catch (err2) {
        }
        return null;
    }

    function mergeMissing(target, source) {
        if (!target || !source) {
            return false;
        }
        var changedLocal = false;
        var keys = Object.keys(source);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var value = String(source[key] || "");
            if (!value) {
                continue;
            }
            if (!target[key]) {
                target[key] = value;
                changedLocal = true;
            }
        }
        return changedLocal;
    }

    function physicalSlotKey(slotIndex) {
        return CYBERWARE_PHYSICAL_SLOT_PREFIX + String(slotIndex);
    }

    function normalizePhysicalSlotKey(rawKey) {
        var text = String(rawKey || "").trim().toLowerCase();
        if (!text) {
            return "";
        }
        var matched = text.match(/^slot_?(\d+)$/);
        var numericText = matched ? matched[1] : text;
        if (!/^\d+$/.test(numericText)) {
            return "";
        }
        var slotIndex = Number(numericText);
        if (!Number.isFinite(slotIndex) || slotIndex < 0 || slotIndex >= CYBERWARE_PHYSICAL_SLOT_COUNT) {
            return "";
        }
        return physicalSlotKey(Math.floor(slotIndex));
    }

    function toPlainPhysical(physicalSource) {
        var out = {};
        if (!physicalSource) {
            return out;
        }

        var keys = [];
        try {
            if (typeof physicalSource.getAllKeys === "function") {
                keys = physicalSource.getAllKeys();
            } else if (typeof physicalSource === "object") {
                keys = Object.keys(physicalSource);
            }
        } catch (err) {
            keys = [];
        }

        for (var i = 0; i < keys.length; i++) {
            var rawKey = String(keys[i] || "");
            if (!rawKey) {
                continue;
            }
            var normalizedKey = normalizePhysicalSlotKey(rawKey);
            if (!normalizedKey) {
                continue;
            }
            var value = readString(physicalSource, rawKey);
            if (!value || value === "minecraft:air") {
                continue;
            }
            out[normalizedKey] = value;
        }
        return out;
    }

    function setPhysicalSlotIfMissing(physical, slotIndex, itemId) {
        if (!physical) {
            return false;
        }
        var normalizedItem = String(itemId || "");
        if (!normalizedItem || normalizedItem === "minecraft:air") {
            return false;
        }
        var key = physicalSlotKey(slotIndex);
        if (String(physical[key] || "")) {
            return false;
        }
        physical[key] = normalizedItem;
        return true;
    }

    function hasPhysicalItemInAnySlot(physical, slotIndexes) {
        if (!physical || !slotIndexes || !slotIndexes.length) {
            return false;
        }
        for (var i = 0; i < slotIndexes.length; i++) {
            var key = physicalSlotKey(slotIndexes[i]);
            if (String(physical[key] || "")) {
                return true;
            }
        }
        return false;
    }

    function setPhysicalSlotIfGroupEmpty(physical, slotIndex, groupSlotIndexes, itemId) {
        if (hasPhysicalItemInAnySlot(physical, groupSlotIndexes)) {
            return false;
        }
        return setPhysicalSlotIfMissing(physical, slotIndex, itemId);
    }

    function recomputeCurrentLoad(cyberData) {
        if (!cyberData) return 0;
        var tenths = Number(CyberwareScriptBridge.calculateLoadTenthsFromJson(
            resolveCyberwareBridgeSubject(playerOrEntity), JSON.stringify(cyberData)));
        cyberData.current_load_tenths = Math.max(0, Math.round(tenths));
        return Math.ceil(cyberData.current_load_tenths / 10);
    }
    function toPlainComponents(componentsSource) {
        var out = {};
        if (!componentsSource) {
            return out;
        }

        var keys = ["arms", "face", "circulatory", "extra", "legs", "tendons", "frontal_cortex", "skeleton"];
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var value = readString(componentsSource, key);
            if (value) {
                out[key] = value;
            }
        }
        var circulatoryLegacy = readString(componentsSource, "circulatory_system");
        if (circulatoryLegacy && !out.circulatory) {
            out.circulatory = circulatoryLegacy;
        }
        var frontalLegacy = readString(componentsSource, "frontal");
        if (frontalLegacy && !out.frontal_cortex) {
            out.frontal_cortex = frontalLegacy;
        }
        return out;
    }

    function toPlainNamedSlots(source, allowedKeys) {
        var out = {};
        if (!source || !allowedKeys || !allowedKeys.length) {
            return out;
        }
        for (var i = 0; i < allowedKeys.length; i++) {
            var key = String(allowedKeys[i] || "");
            if (!key) {
                continue;
            }
            var value = readString(source, key);
            if (value && value !== "minecraft:air") {
                out[key] = value;
            }
        }
        return out;
    }

    function setNamedSlotIfMissing(target, key, itemId) {
        if (!target) {
            return false;
        }
        var normalizedKey = String(key || "").trim().toLowerCase();
        var normalizedItem = String(itemId || "");
        if (!normalizedKey || !normalizedItem || normalizedItem === "minecraft:air") {
            return false;
        }
        if (String(target[normalizedKey] || "")) {
            return false;
        }
        target[normalizedKey] = normalizedItem;
        return true;
    }

    function setNamedSlot(target, key, itemId) {
        if (!target) {
            return;
        }
        var normalizedKey = String(key || "").trim().toLowerCase();
        var normalizedItem = String(itemId || "");
        if (!normalizedKey || !normalizedItem || normalizedItem === "minecraft:air") {
            return;
        }
        target[normalizedKey] = normalizedItem;
    }

    function resolveBodySlotForItem(itemId, fallbackKey) {
        var normalizedItem = String(itemId || "");
        if (!normalizedItem) {
            return "";
        }
        var definition = global.getCyberwareItemDefinition
            ? global.getCyberwareItemDefinition(normalizedItem)
            : null;
        if (definition && definition.body_slot) {
            return normalizeLegacyBodySlot(definition.body_slot);
        }
        return normalizeLegacyBodySlot(fallbackKey);
    }

    function buildActivationSlotMap(cyberData) {
        var out = {};
        if (!cyberData) {
            return out;
        }
        var bodySlots = cyberData[CYBERWARE_BODY_SLOT_DATA_KEY] || {};
        if (cyberData.installed_os) {
            out.os = String(cyberData.installed_os);
        }
        var bodyKeys = Object.keys(bodySlots);
        for (var i = 0; i < bodyKeys.length; i++) {
            var bodyKey = String(bodyKeys[i] || "");
            var itemId = String(bodySlots[bodyKey] || "");
            if (!itemId) {
                continue;
            }
            var definition = global.getCyberwareItemDefinition
                ? global.getCyberwareItemDefinition(itemId)
                : null;
            if (!definition) {
                continue;
            }
            var mode = normalizeActivationMode(definition.activation_mode, definition.activation_slot ? "manual" : "passive");
            var activationSlot = validateActivationSlotId(definition.activation_slot || "", true);
            if (mode === "manual" && activationSlot) {
                out[activationSlot] = itemId;
            }
        }
        return out;
    }

    if (cyber && typeof cyber.getCompound === "function") {
        var compTag = null;
        var legacyTag = null;
        var physicalTag = null;
        var bodyTag = null;
        var activationTag = null;
        try {
            compTag = cyber.getCompound("installed_components");
        } catch (err) {
            compTag = null;
        }
        try {
            legacyTag = cyber.getCompound(CYBERWARE_LEGACY_INSTALLED_KEY);
        } catch (err2) {
            legacyTag = null;
        }
        try {
            physicalTag = cyber.getCompound(CYBERWARE_INSTALLED_PHYSICAL_KEY);
        } catch (err3) {
            physicalTag = null;
        }
        try {
            bodyTag = cyber.getCompound(CYBERWARE_BODY_SLOT_DATA_KEY);
        } catch (err4) {
            bodyTag = null;
        }
        try {
            activationTag = cyber.getCompound(CYBERWARE_ACTIVATION_SLOT_DATA_KEY);
        } catch (err5) {
            activationTag = null;
        }

        var normalizedComponents = toPlainComponents(compTag);
        mergeMissing(normalizedComponents, toPlainComponents(legacyTag));
        var normalizedPhysical = toPlainPhysical(physicalTag);
        var normalizedOs = readString(cyber, "installed_os");
        if (!normalizedOs) {
            normalizedOs = readString(legacyTag, "os");
        }

        cyber = {
            current_load: Math.max(0, Math.floor(readInt(cyber, "current_load") || 0)),
            installed_os: normalizedOs || null,
            installed_components: normalizedComponents,
            installed_physical: normalizedPhysical,
            installed_body_slots: toPlainNamedSlots(bodyTag, CYBERWARE_BODY_SLOT_IDS),
            installed_activation_slots: toPlainNamedSlots(activationTag, CYBERWARE_SLOT_IDS),
            installed: toPlainComponents(legacyTag)
        };
        holder.persistentData.cyberware = cyber;
    }

    if (cyber.installed_components && typeof cyber.installed_components.getString === "function") {
        cyber.installed_components = toPlainComponents(cyber.installed_components);
    }
    if (cyber.installed && typeof cyber.installed.getString === "function") {
        cyber.installed = toPlainComponents(cyber.installed);
    }
    if (cyber.installed_physical && typeof cyber.installed_physical.getString === "function") {
        cyber.installed_physical = toPlainPhysical(cyber.installed_physical);
    }
    if (cyber[CYBERWARE_BODY_SLOT_DATA_KEY] && typeof cyber[CYBERWARE_BODY_SLOT_DATA_KEY].getString === "function") {
        cyber[CYBERWARE_BODY_SLOT_DATA_KEY] = toPlainNamedSlots(cyber[CYBERWARE_BODY_SLOT_DATA_KEY], CYBERWARE_BODY_SLOT_IDS);
    }
    if (cyber[CYBERWARE_ACTIVATION_SLOT_DATA_KEY] && typeof cyber[CYBERWARE_ACTIVATION_SLOT_DATA_KEY].getString === "function") {
        cyber[CYBERWARE_ACTIVATION_SLOT_DATA_KEY] = toPlainNamedSlots(cyber[CYBERWARE_ACTIVATION_SLOT_DATA_KEY], CYBERWARE_SLOT_IDS);
    }

    if (cyber.current_load === undefined || cyber.current_load === null) {
        cyber.current_load = 0;
    }
    if (cyber.installed_os === undefined || cyber.installed_os === "") {
        cyber.installed_os = null;
    }
    if (!cyber.installed_components || typeof cyber.installed_components !== "object") {
        cyber.installed_components = {};
    }
    if (!cyber.installed || typeof cyber.installed !== "object") {
        cyber.installed = {};
    }
    if (!cyber.installed_physical || typeof cyber.installed_physical !== "object") {
        cyber.installed_physical = {};
    }
    if (!cyber[CYBERWARE_BODY_SLOT_DATA_KEY] || typeof cyber[CYBERWARE_BODY_SLOT_DATA_KEY] !== "object") {
        cyber[CYBERWARE_BODY_SLOT_DATA_KEY] = {};
    }
    if (!cyber[CYBERWARE_ACTIVATION_SLOT_DATA_KEY] || typeof cyber[CYBERWARE_ACTIVATION_SLOT_DATA_KEY] !== "object") {
        cyber[CYBERWARE_ACTIVATION_SLOT_DATA_KEY] = {};
    }

    var installed = cyber.installed_components;
    var physical = cyber.installed_physical;
    var bodySlots = cyber[CYBERWARE_BODY_SLOT_DATA_KEY];
    var changed = false;

    if (mergeMissing(installed, toPlainComponents(cyber.installed))) {
        changed = true;
    }
    if (!cyber.installed_os) {
        var osFromLegacy = readString(cyber.installed, "os");
        if (osFromLegacy) {
            cyber.installed_os = osFromLegacy;
            changed = true;
        }
    }

    var menuRoot = readMenuRoot();
    if (menuRoot) {
        var osFromMenu = readSlotItemId(menuRoot, 0);
        var menuPhysical = {};
        for (var slotIndex = 0; slotIndex < CYBERWARE_PHYSICAL_SLOT_COUNT; slotIndex++) {
            var menuItemId = readSlotItemId(menuRoot, slotIndex);
            if (menuItemId) {
                menuPhysical[physicalSlotKey(slotIndex)] = menuItemId;
            }
        }

        var menuInstalled = {};
        setNamedSlot(menuInstalled, "arms", readSlotItemId(menuRoot, 5));
        var menuFrontalCortex = firstNonEmptyMenuSlot(menuRoot, [1, 2, 3]);
        var menuFace = readSlotItemId(menuRoot, 4);

        if (menuFrontalCortex === "" && menuFace === "project_edgerunner:axolotl") {
            menuFrontalCortex = menuFace;
            menuFace = "";
        }
        setNamedSlot(menuInstalled, "frontal_cortex", menuFrontalCortex);
        setNamedSlot(menuInstalled, "face", menuFace);
        setNamedSlot(menuInstalled, "circulatory", firstNonEmptyMenuSlot(menuRoot, [10, 11, 12]));

        var menuBodySlots = {};
        setNamedSlot(menuBodySlots, "os", osFromMenu);
        setNamedSlot(menuBodySlots, "supresors", readSlotItemId(menuRoot, 19));
        setNamedSlot(menuBodySlots, "frontal_cortex", menuFrontalCortex);
        setNamedSlot(menuBodySlots, "arms", menuInstalled.arms);
        setNamedSlot(menuBodySlots, "face", menuFace);
        setNamedSlot(menuBodySlots, "hands", firstNonEmptyMenuSlot(menuRoot, [6, 9]));
        setNamedSlot(menuBodySlots, "skeleton", firstNonEmptyMenuSlot(menuRoot, [7, 8]));
        setNamedSlot(menuBodySlots, "nervous_system", firstNonEmptyMenuSlot(menuRoot, [13, 14]));
        setNamedSlot(menuBodySlots, "circulatory_system", menuInstalled.circulatory);
        setNamedSlot(menuBodySlots, "integumentary_system", firstNonEmptyMenuSlot(menuRoot, [15, 16, 17]));
        setNamedSlot(menuBodySlots, "legs", readSlotItemId(menuRoot, 18));

        var menuLegacy = {};
        setNamedSlot(menuLegacy, "os", osFromMenu);
        setNamedSlot(menuLegacy, "arms", menuInstalled.arms);
        setNamedSlot(menuLegacy, "frontal_cortex", menuInstalled.frontal_cortex);
        setNamedSlot(menuLegacy, "face", menuInstalled.face);
        setNamedSlot(menuLegacy, "circulatory", menuInstalled.circulatory);

        cyber.installed_os = osFromMenu || null;
        cyber.installed_physical = menuPhysical;
        cyber.installed_components = menuInstalled;
        cyber[CYBERWARE_BODY_SLOT_DATA_KEY] = menuBodySlots;
        cyber.installed = menuLegacy;
        installed = cyber.installed_components;
        physical = cyber.installed_physical;
        bodySlots = cyber[CYBERWARE_BODY_SLOT_DATA_KEY];
        changed = true;
    }

    var legacyTendons = String(installed.tendons || "");
    var legacyLegs = String(installed.legs || "");
    var faceSlot = String(installed.face || "");
    var frontalSlot = String(installed.frontal_cortex || "");

    if (setPhysicalSlotIfMissing(physical, 0, cyber.installed_os)) {
        changed = true;
    }
    if (setPhysicalSlotIfMissing(physical, 5, installed.arms)) {
        changed = true;
    }
    if (setPhysicalSlotIfGroupEmpty(physical, 1, [1, 2, 3], installed.frontal_cortex)) {
        changed = true;
    }
    if (setPhysicalSlotIfMissing(physical, 4, installed.face)) {
        changed = true;
    }
    if (setPhysicalSlotIfGroupEmpty(physical, 10, [10, 11, 12], installed.circulatory)) {
        changed = true;
    }
    var slot10Key = physicalSlotKey(10);
    var slot13Key = physicalSlotKey(13);
    var slot14Key = physicalSlotKey(14);
    var migratedCirculatoryId = String(physical[slot10Key] || "");
    if (!migratedCirculatoryId) {
        var legacyCirculatoryId = String(physical[slot13Key] || physical[slot14Key] || "");
        if (legacyCirculatoryId) {
            physical[slot10Key] = legacyCirculatoryId;
            migratedCirculatoryId = legacyCirculatoryId;
            changed = true;
        }
    }
    if (migratedCirculatoryId) {
        if (String(physical[slot13Key] || "") === migratedCirculatoryId) {
            delete physical[slot13Key];
            changed = true;
        }
        if (String(physical[slot14Key] || "") === migratedCirculatoryId) {
            delete physical[slot14Key];
            changed = true;
        }
    }
    // Legacy migration only: if old data used extra, preserve it into a physical slot.
    if (setPhysicalSlotIfMissing(physical, 18, installed.extra)) {
        changed = true;
    }
    if (setPhysicalSlotIfMissing(physical, 18, legacyLegs)) {
        changed = true;
    } else if (setPhysicalSlotIfMissing(physical, 18, legacyTendons)) {
        changed = true;
    }

    // Keep face as a real slot. Only migrate legacy Axolotl entries out of face.
    if (!frontalSlot && faceSlot === "project_edgerunner:axolotl") {
        installed.frontal_cortex = faceSlot;
        delete installed.face;
        changed = true;
    }

    if (installed.legs !== undefined) {
        delete installed.legs;
        changed = true;
    }
    if (installed.tendons !== undefined) {
        delete installed.tendons;
        changed = true;
    }

    if (setNamedSlotIfMissing(bodySlots, "os", cyber.installed_os)) {
        changed = true;
    }
    if (setNamedSlotIfMissing(bodySlots, "arms", installed.arms)) {
        changed = true;
    }
    if (setNamedSlotIfMissing(bodySlots, "frontal_cortex", installed.frontal_cortex)) {
        changed = true;
    }
    if (setNamedSlotIfMissing(bodySlots, "face", installed.face)) {
        changed = true;
    }
    if (setNamedSlotIfMissing(bodySlots, "circulatory_system", installed.circulatory || installed.circulatory_system)) {
        changed = true;
    }
    if (setNamedSlotIfMissing(bodySlots, "skeleton", physical[physicalSlotKey(7)] || physical[physicalSlotKey(8)] || installed.skeleton)) {
        changed = true;
    }
    if (setNamedSlotIfMissing(bodySlots, resolveBodySlotForItem(installed.extra, "extra"), installed.extra)) {
        changed = true;
    }
    if (setNamedSlotIfMissing(bodySlots, resolveBodySlotForItem(legacyLegs, "legs"), legacyLegs)) {
        changed = true;
    }
    if (setNamedSlotIfMissing(bodySlots, resolveBodySlotForItem(legacyTendons, "legs"), legacyTendons)) {
        changed = true;
    }
    if (setNamedSlotIfMissing(bodySlots, "legs", physical[physicalSlotKey(18)])) {
        changed = true;
    }
    if (setNamedSlotIfMissing(bodySlots, "supresors", physical[physicalSlotKey(19)])) {
        changed = true;
    }

    if (cyber.installed_os) {
        if (String(cyber.installed.os || "") !== String(cyber.installed_os)) {
            cyber.installed.os = String(cyber.installed_os);
            changed = true;
        }
    } else if (cyber.installed.os !== undefined) {
        delete cyber.installed.os;
        changed = true;
    }

    var mirrorKeys = ["arms", "frontal_cortex", "face", "circulatory", "extra", "skeleton"];
    for (var m = 0; m < mirrorKeys.length; m++) {
        var mirrorKey = mirrorKeys[m];
        var mirrorValue = String(installed[mirrorKey] || "");
        if (mirrorValue) {
            if (String(cyber.installed[mirrorKey] || "") !== mirrorValue) {
                cyber.installed[mirrorKey] = mirrorValue;
                changed = true;
            }
        } else if (cyber.installed[mirrorKey] !== undefined) {
            delete cyber.installed[mirrorKey];
            changed = true;
        }
    }

    var nextActivationSlots = buildActivationSlotMap(cyber);
    var currentActivationSlots = cyber[CYBERWARE_ACTIVATION_SLOT_DATA_KEY];
    var activationKeys = CYBERWARE_SLOT_IDS.slice(0);
    for (var a = 0; a < activationKeys.length; a++) {
        var activationKey = activationKeys[a];
        var expectedActivationValue = String(nextActivationSlots[activationKey] || "");
        var currentActivationValue = String(currentActivationSlots[activationKey] || "");
        if (expectedActivationValue) {
            if (currentActivationValue !== expectedActivationValue) {
                currentActivationSlots[activationKey] = expectedActivationValue;
                changed = true;
            }
        } else if (currentActivationSlots[activationKey] !== undefined) {
            delete currentActivationSlots[activationKey];
            changed = true;
        }
    }

    var previousPreciseLoad = Number(cyber.current_load_tenths || 0);
    var expectedLoad = recomputeCurrentLoad(cyber);
    if (previousPreciseLoad !== Number(cyber.current_load_tenths || 0)) changed = true;
    if (Number(cyber.current_load || 0) !== expectedLoad) {
        cyber.current_load = expectedLoad;
        changed = true;
    }

    if (changed) {
        holder.persistentData.cwb_slot_schema_version = 3;
    }

    return cyber;
};

// Parsed bridge snapshots by player, kept while the cyberware tag, saved menu and ban rules are unchanged
// (CyberwareScriptBridge.contentRevision). Only read by the two slot lookups below, never written to.
var cyberwareParsedByRevision = {};

function cyberwareContentRevision(subject) {
    try {
        return Number(CyberwareScriptBridge.contentRevision(subject)) || 0;
    } catch (errRevision) {
        return 0;
    }
}

function cyberwareRevisionKey(subject) {
    try {
        return subject && typeof subject.getStringUUID === "function" ? String(subject.getStringUUID() || "") : "";
    } catch (errKey) {
        return "";
    }
}

function getNormalizedCyberData(playerOrEntity) {
    var subject = resolveCyberwareBridgeSubject(playerOrEntity);
    var revision = cyberwareContentRevision(subject);
    var key = revision ? cyberwareRevisionKey(subject) : "";
    if (key) {
        var hit = cyberwareParsedByRevision[key];
        if (hit && hit.revision === revision) {
            return hit.data;
        }
    }
    var javaCyber = readCyberwareDataFromBridge(playerOrEntity);
    if (javaCyber) {
        if (key) {
            cyberwareParsedByRevision[key] = { revision: cyberwareContentRevision(subject), data: javaCyber };
        }
        return javaCyber;
    }
    var holder = resolveCyberwareDataHolder(playerOrEntity);
    if (!holder || !holder.persistentData) {
        return null;
    }
    if (global.normalizeCyberwareInstalledData) {
        global.normalizeCyberwareInstalledData(holder);
    }
    return holder.persistentData.cyberware || null;
}

global.getCyberwareInstalledItemByBodySlot = function (playerOrEntity, bodySlot) {
    var normalizedBodySlot = normalizeLegacyBodySlot(bodySlot);
    if (!normalizedBodySlot) {
        return "";
    }
    try {
        var bridgeItem = String(CyberwareScriptBridge.getInstalledBodyItem(
            resolveCyberwareBridgeSubject(playerOrEntity),
            normalizedBodySlot
        ) || "");
        if (bridgeItem) {
            return bridgeItem;
        }
    } catch (errBridgeBody) {
    }
    var cyber = getNormalizedCyberData(playerOrEntity);
    if (!cyber) {
        return "";
    }
    if (normalizedBodySlot === "os") {
        return String(cyber.installed_os || "");
    }
    var bodySlots = cyber[CYBERWARE_BODY_SLOT_DATA_KEY] || {};
    return readConfigMapString(bodySlots, normalizedBodySlot);
};

global.getCyberwareInstalledItemByActivationSlot = function (playerOrEntity, activationSlot) {
    var normalizedActivationSlot = String(activationSlot || "").trim().toLowerCase();
    if (!normalizedActivationSlot) {
        return "";
    }
    try {
        var bridgeItem = String(CyberwareScriptBridge.getInstalledActivationItem(
            resolveCyberwareBridgeSubject(playerOrEntity),
            normalizedActivationSlot
        ) || "");
        if (bridgeItem) {
            return bridgeItem;
        }
    } catch (errBridgeActivation) {
    }
    var cyber = getNormalizedCyberData(playerOrEntity);
    if (!cyber) {
        return "";
    }
    if (normalizedActivationSlot === "os") {
        return String(cyber.installed_os || "");
    }
    var activationSlots = cyber[CYBERWARE_ACTIVATION_SLOT_DATA_KEY] || {};
    return readConfigMapString(activationSlots, normalizedActivationSlot);
};

// Performance pass 11/11/2026. The normalisation reads the script-side cyberware data and saved Ripper Doc menu of the
// holder, item definitions, and implant load (installed cyberware, held powers and their unlocked or bought nodes, all
// in CyberwareScriptBridge.revision). Once it has run and none of that changed since, running it again would change
// nothing: skip it. Both script-side tags are compared by content, so a write by any script makes it run again.
(function () {
    var normalizeInstalledDataFully = global.normalizeCyberwareInstalledData;
    function scriptSideInputs(holder) {
        var cyber = holder.persistentData.cyberware;
        var menu = holder.persistentData[CYBERWARE_RIPPERDOC_MENU_ROOT_KEY];
        return [cyber === undefined ? null : cyber, menu === undefined ? null : menu];
    }
    global.normalizeCyberwareInstalledData = function (playerOrEntity) {
        var holder = resolveCyberwareDataHolder(playerOrEntity);
        var subject = resolveCyberwareBridgeSubject(playerOrEntity);
        var cacheable = !!(holder && holder.persistentData);
        if (cacheable) {
            try {
                var before = scriptSideInputs(holder);
                if (CyberwareScriptBridge.isMarked(subject, "normalize_installed", before[0], before[1])) {
                    return holder.persistentData.cyberware;
                }
            } catch (errMarked) {
                cacheable = false;
            }
        }
        var result = normalizeInstalledDataFully(playerOrEntity);
        if (cacheable) {
            try {
                var after = scriptSideInputs(holder);
                CyberwareScriptBridge.mark(subject, "normalize_installed", after[0], after[1]);
            } catch (errMark) {
            }
        }
        return result;
    };
})();

global.cyberwareFail = cyberwareFail;
global.cyberwareLogInfo = cyberwareLogInfo;
global.cyberwareLogDebug = cyberwareLogDebug;

cyberwareLogInfo("Slot registry bootstrap loaded (" + CYBERWARE_SLOT_IDS.join(", ") + ").");
