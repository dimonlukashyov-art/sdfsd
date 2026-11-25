// priority: 60
// Server script: face cyberware / optics family.

const FACE_SCAN_DURATION_TICKS = 20 * 60;
const FACE_SCAN_COOLDOWN_TICKS = 20 * 30;
const FACE_OPTICS_ACTIVATE_SOUND = "execute at @s run playsound project_edgerunner:activate_optics player @s ~ ~ ~ 1 1";
const FACE_OPTICS_DEACTIVATE_SOUND = "execute at @s run playsound project_edgerunner:deactivate_optics player @s ~ ~ ~ 1 1";
global.FACE_SCAN_DURATION_TICKS = FACE_SCAN_DURATION_TICKS;
global.FACE_SCAN_COOLDOWN_TICKS = FACE_SCAN_COOLDOWN_TICKS;
const FACE_TREE_LAYOUT = {
    rootY: 0.375,
    sideX: 0.5,
    centerX: 0.0,
    baseRowY: -0.375,
    stepX: 1.0,
    upgradeStepY: 0.56
};
const FACE_TREE_UPPER_ROW_Y = FACE_TREE_LAYOUT.baseRowY;

function getFaceCenteredX(index, count) {
    return (index * FACE_TREE_LAYOUT.stepX) - (((Math.max(0, count - 1)) * FACE_TREE_LAYOUT.stepX) / 2);
}

function faceStat(id, icon, title, description, trackId, unit, value, condition, lower) {
    return {
        id: id,
        icon: icon,
        title: title,
        description: description,
        track: {
            id: trackId,
            label: "stat.project_edgerunner.optics." + trackId,
            unit: unit,
            values: [value],
            lower: !!lower,
            condition: condition || ""
        }
    };
}

function faceZoom(id, steps, maxZoom) {
    return faceStat(id, "minecraft:spyglass", "Zoom", "Zoom: " + steps + ".",
        "max_zoom", "MULTIPLIER", maxZoom, "stat.project_edgerunner.optics_condition." + id);
}

function faceDuration(id) {
    return faceStat(id, "project_edgerunner:textures/gui/upgrades/duration.png", "Duration", "Duration: 60s.",
        "duration", "SECONDS", 60, "stat.project_edgerunner.optics_condition.scan");
}

function faceCooldown(id) {
    return faceStat(id, "minecraft:clock", "Cooldown", "Cooldown: 30s.",
        "cooldown", "SECONDS", 30, "stat.project_edgerunner.optics_condition.after_scan", true);
}

function faceNight(id) {
    return faceStat(id, "minecraft:golden_carrot", "Night Vision", "Night vision: during the scan.",
        "night_vision", "BOOLEAN", 1, "stat.project_edgerunner.optics_condition.during_scan");
}

const FACE_IMPLANTS = [
    {
        id: "basic_kiroshi_optics",
        name: "Basic Kiroshi Optics",
        itemId: "project_edgerunner:basic_kiroshi_optics",
        type: "face",
        bodySlot: "face",
        activationMode: "passive",
        loadCost: 8,
        tier: 2,
        rarity: "uncommon",
        zoomProfile: [2, 4, 6],
        description: ["Passive zoom and a target-health readout."],
        infoNodes: [
            faceZoom("kiroshi_zoom_profile", "2x / 4x / 6x", 6),
            faceStat("kiroshi_hud_profile", "minecraft:glass_pane", "Target Health", "Target health: while aiming.",
                "target_health", "BOOLEAN", 1, "stat.project_edgerunner.optics_condition.while_aiming")
        ]
    },
    {
        id: "clairvoyant",
        name: "Clairvoyant",
        itemId: "project_edgerunner:clairvoyant",
        type: "face",
        bodySlot: "face",
        activationSlot: "face",
        activationMode: "manual",
        abilityId: "clairvoyant_scan",
        scanModeScore: 1,
        cooldownTicks: FACE_SCAN_COOLDOWN_TICKS,
        loadCost: 14,
        tier: 3,
        rarity: "rare",
        zoomProfile: [2, 4, 6, 8],
        enemyRange: 19.5,
        grantsNightVision: true,
        description: ["Scan enemies through cover."],
        infoNodes: [
            faceStat("clairvoyant_range", "minecraft:ender_eye", "Enemy Range", "Enemy range: 19.5m.",
                "enemy_range", "BLOCKS", 19.5, "stat.project_edgerunner.optics_condition.through_cover"),
            faceDuration("clairvoyant_duration"),
            faceCooldown("clairvoyant_cooldown"),
            faceZoom("clairvoyant_zoom", "2x / 4x / 6x / 8x", 8),
            faceNight("clairvoyant_night")
        ]
    },
    {
        id: "doomsayer",
        name: "Doomsayer",
        itemId: "project_edgerunner:doomsayer",
        type: "face",
        bodySlot: "face",
        activationSlot: "face",
        activationMode: "manual",
        abilityId: "doomsayer_scan",
        scanModeScore: 2,
        cooldownTicks: FACE_SCAN_COOLDOWN_TICKS,
        loadCost: 14,
        tier: 3,
        rarity: "rare",
        zoomProfile: [2, 4, 6, 8],
        hazardRange: 29.0,
        description: ["Scan explosives, pistons and sculk."],
        infoNodes: [
            faceStat("doomsayer_hazards", "minecraft:tnt", "Hazard Range", "Hazard range: 29m.",
                "hazard_range", "BLOCKS", 29, "stat.project_edgerunner.optics_condition.hazards"),
            faceDuration("doomsayer_duration"),
            faceCooldown("doomsayer_cooldown"),
            faceZoom("doomsayer_zoom", "2x / 4x / 6x / 8x", 8)
        ]
    },
    {
        id: "stalker",
        name: "Stalker",
        itemId: "project_edgerunner:stalker",
        type: "face",
        bodySlot: "face",
        activationSlot: "face",
        activationMode: "manual",
        abilityId: "stalker_scan",
        scanModeScore: 3,
        cooldownTicks: FACE_SCAN_COOLDOWN_TICKS,
        loadCost: 14,
        tier: 3,
        rarity: "rare",
        zoomProfile: [2, 4, 6, 8],
        enemyRange: 53.0,
        grantsNightVision: true,
        tracksTrails: true,
        description: ["Project fading trails through cover."],
        infoNodes: [
            faceStat("stalker_track", "minecraft:compass", "Track Range", "Track range: 53m.",
                "track_range", "BLOCKS", 53, "stat.project_edgerunner.optics_condition.through_cover"),
            faceDuration("stalker_duration"),
            faceCooldown("stalker_cooldown"),
            faceZoom("stalker_zoom", "2x / 4x / 6x / 8x", 8),
            faceNight("stalker_night")
        ]
    },
    {
        id: "the_oracle",
        name: "The Oracle",
        itemId: "project_edgerunner:the_oracle",
        type: "face",
        bodySlot: "face",
        activationSlot: "face",
        activationMode: "manual",
        abilityId: "oracle_scan",
        scanModeScore: 4,
        cooldownTicks: FACE_SCAN_COOLDOWN_TICKS,
        loadCost: 26,
        tier: 5,
        rarity: "epic",
        zoomProfile: [2, 4, 6, 8, 10, 12],
        enemyRange: 19.5,
        hazardRange: 29.0,
        grantsNightVision: true,
        tracksTrails: true,
        description: ["Scan enemies, hazards and trails."],
        infoNodes: [
            faceStat("oracle_enemy", "minecraft:ender_eye", "Enemy Range", "Enemy range: 19.5m.",
                "enemy_range", "BLOCKS", 19.5, "stat.project_edgerunner.optics_condition.through_cover"),
            faceStat("oracle_hazard", "minecraft:tnt", "Hazard Range", "Hazard range: 29m.",
                "hazard_range", "BLOCKS", 29, "stat.project_edgerunner.optics_condition.hazards"),
            faceStat("oracle_tracking", "minecraft:compass", "Track Range", "Track range: 53m.",
                "track_range", "BLOCKS", 53, "stat.project_edgerunner.optics_condition.through_cover"),
            faceDuration("oracle_duration"),
            faceCooldown("oracle_cooldown"),
            faceZoom("oracle_zoom", "2x / 4x / 6x / 8x / 10x / 12x", 12),
            faceNight("oracle_night")
        ]
    }
];

function getFaceItemIcon(itemId) {
    var itemName = String(itemId || "").replace(/^[^:]+:/, "");
    return "project_edgerunner:textures/item/" + itemName + "_item.png";
}

function buildFaceActivationConditions(cooldownTicks) {
    return [
        {
            type: "palladium:activation",
            cooldown: Number(cooldownTicks || FACE_SCAN_COOLDOWN_TICKS),
            ticks: FACE_SCAN_DURATION_TICKS,
            // Not bound to scroll or the face HUD key; FaceOpticsPointerBridge starts the timer server-side.
            key_type: "key_bind",
            needs_empty_hand: false,
            allow_scrolling_when_crouching: false
        }
    ];
}

function faceStatTracks(definition) {
    var tracks = [];
    (definition.infoNodes || []).forEach(function (node) {
        if (!node.track) return;
        tracks.push({
            id: node.track.id,
            label: node.track.label,
            unit: node.track.unit,
            values: node.track.values,
            nodes: [node.id],
            lower_is_better: !!node.track.lower,
            condition: node.track.condition || ""
        });
    });
    return tracks;
}

// Up to five nodes sit in one centred row, as always. A longer list keeps a row of count - 2 and hangs the last
// two, mirrored, on the row above, each on the node below it, so the tree never grows wider than five columns.
function faceNodeSpot(infoNodes, index, coreAbilityId) {
    var count = infoNodes.length;
    if (count <= 5 || index < count - 2) {
        var width = count <= 5 ? count : count - 2;
        return { x: getFaceCenteredX(index, width), y: FACE_TREE_LAYOUT.baseRowY, parent: coreAbilityId };
    }
    var bottom = count - 2;
    var left = Math.floor((bottom - 1) / 2) - (bottom % 2);
    var host = index === bottom ? left : bottom - 1 - left;
    return { x: getFaceCenteredX(host, bottom), y: FACE_TREE_LAYOUT.baseRowY - FACE_TREE_LAYOUT.upgradeStepY,
        parent: infoNodes[host].id };
}

function buildFaceInfoNodes(definition, coreAbilityId) {
    var nodes = {};
    var infoNodes = definition.infoNodes || [];
    infoNodes.forEach(function (node, index) {
        var spot = faceNodeSpot(infoNodes, index, coreAbilityId);
        nodes[node.id] = {
            type: "palladium:command",
            icon: node.icon,
            title: node.title,
            description: node.description,
            list_index: -1,
            gui_position: [spot.x, spot.y],
            hidden_in_bar: true,
            first_tick_commands: [],
            last_tick_commands: [],
            commands: [],
            conditions: {
                enabling: [{ type: "palladium:true" }],
                unlocking: [{
                    type: "palladium:ability_unlocked",
                    ability: spot.parent
                }]
            }
        };
    });
    return nodes;
}

function buildPassiveFacePower(definition) {
    var itemIcon = getFaceItemIcon(definition.itemId);
    var coreAbilityId = definition.id + "_core";
    var abilities = {};

    abilities[coreAbilityId] = {
        type: "palladium:command",
        icon: itemIcon,
        title: definition.name,
        description: definition.description.join("\n"),
        bar_color: "green",
        hidden: false,
        hidden_in_bar: true,
        list_index: 0,
        gui_position: [0, FACE_TREE_LAYOUT.rootY],
        first_tick_commands: [],
        last_tick_commands: [],
        commands: [],
        conditions: {
            enabling: [{ type: "palladium:true" }],
            unlocking: []
        }
    };

    Object.assign(abilities, buildFaceInfoNodes(definition, coreAbilityId));

    return {
        name: definition.name,
        persistent_data: false,
        background: "minecraft:textures/block/warped_stem.png",
        ability_bar_texture: "project_edgerunner:textures/gui/ability_bar.png",
        icon: itemIcon,
        gui_display_type: "tree",
        edgerunner_stats: faceStatTracks(definition),
        abilities: abilities
    };
}

function buildManualFacePower(definition) {
    var itemIcon = getFaceItemIcon(definition.itemId);
    var coreAbilityId = definition.abilityId;
    var abilities = {};

    abilities[coreAbilityId] = {
        type: "palladium:command",
        icon: itemIcon,
        title: definition.name,
        description: definition.description.join("\n"),
        bar_color: "green",
        hidden: false,
        hidden_in_bar: true,
        list_index: 0,
        gui_position: [0, FACE_TREE_LAYOUT.rootY],
        first_tick_commands: [FACE_OPTICS_ACTIVATE_SOUND],
        last_tick_commands: [FACE_OPTICS_DEACTIVATE_SOUND],
        commands: [],
        conditions: {
            enabling: buildFaceActivationConditions(definition.cooldownTicks),
            unlocking: []
        }
    };

    abilities[definition.id + "_scan_state"] = {
        type: "palladium:command",
        hidden: true,
        hidden_in_bar: true,
        first_tick_commands: [
            "scoreboard players set @s er_face_scan_mode " + Number(definition.scanModeScore || 0)
        ],
        last_tick_commands: [
            "scoreboard players set @s er_face_scan_mode 0"
        ],
        commands: [
            "scoreboard players set @s er_face_scan_mode " + Number(definition.scanModeScore || 0)
        ],
        conditions: {
            enabling: [{
                type: "palladium:ability_enabled",
                power: definition.itemId,
                ability: coreAbilityId
            }],
            unlocking: []
        }
    };

    Object.assign(abilities, buildFaceInfoNodes(definition, coreAbilityId));

    return {
        name: definition.name,
        persistent_data: true,
        background: "minecraft:textures/block/warped_stem.png",
        ability_bar_texture: "project_edgerunner:textures/gui/ability_bar.png",
        icon: itemIcon,
        gui_display_type: "tree",
        edgerunner_stats: faceStatTracks(definition),
        abilities: abilities
    };
}

ServerEvents.highPriorityData(function (event) {
    FACE_IMPLANTS.forEach(function (definition) {
        var power = definition.activationMode === "manual"
            ? buildManualFacePower(definition)
            : buildPassiveFacePower(definition);
        global.addLocalizedPowerJson(event, "project_edgerunner:palladium/powers/" + definition.id, power);
    });
});

if (!global.registerCyberwareInstallComponent) {
    throw new Error("[Cyberpunk/Cyberware] Install registry not loaded before face optics registration.");
}

FACE_IMPLANTS.forEach(function (definition) {
    var config = {
        item: definition.itemId,
        name: definition.name,
        type: definition.type,
        body_slot: definition.bodySlot,
        activation_mode: definition.activationMode,
        load_cost: definition.loadCost,
        palladium_power: definition.itemId,
        install_message: definition.name + " installed.",
        remove_message: definition.name + " removed."
    };
    if (definition.activationSlot) {
        config.activation_slot = definition.activationSlot;
    }
    global.registerCyberwareInstallComponent(config);
});
