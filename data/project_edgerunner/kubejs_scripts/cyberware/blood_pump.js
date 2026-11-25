// priority: 60
// Server script: Blood Pump cyberware (circulatory system).

// ---------------------------
// Config
// ---------------------------
const BLOOD_PUMP = {
    id: "blood_pump",
    name: "Blood Pump",
    itemId: "project_edgerunner:blood_pump",
    type: "circulatory",
    bodySlot: "circulatory_system",
    activationSlot: "circulatory",
    activationMode: "manual",
    loadCost: 24,
    tier: 2,
    rarity: "uncommon",
    cooldownSeconds: 30,
    regenSeconds: 6
};

const BLOOD_PUMP_UPGRADES = {
    baseTier: 2,
    maxTier: 5,
    tierStats: {
        // Tier 1/2 share the same values by design.
        2: { instantPv: 9.0, regenTotalPv: 3.5 },
        3: { instantPv: 13.0, regenTotalPv: 6.5 },
        4: { instantPv: 17.5, regenTotalPv: 10.5 },
        5: { instantPv: 22.0, regenTotalPv: 14.0 }
    }
};

const TICKS_PER_SECOND = 20;
const BLOOD_PUMP_REGEN_TICKS = BLOOD_PUMP.regenSeconds * TICKS_PER_SECOND;
const BLOOD_PUMP_COOLDOWN_TICKS = Math.max(0, Math.round(BLOOD_PUMP.cooldownSeconds * TICKS_PER_SECOND));
const BLOOD_PUMP_INTERNAL_PARTS_ITEM = "project_edgerunner:cyberware_internal_parts_t2";
const BLOOD_PUMP_CHARGE_CAPACITY_1_ABILITY_ID = "charge_capacity_1";
const BLOOD_PUMP_CHARGE_CAPACITY_2_ABILITY_ID = "charge_capacity_2";
const BLOOD_PUMP_CHARGE_CAPACITY_3_ABILITY_ID = "charge_capacity_3";
const BLOOD_PUMP_VISUAL_SLOTS = [
    {
        index: 1,
        capacityAbilityId: BLOOD_PUMP_CHARGE_CAPACITY_1_ABILITY_ID,
        injectAbilityId: "blood_pump_slot_1_inject_visual",
        rechargeAbilityId: "blood_pump_slot_1_recharge_visual",
        idleRenderLayerId: "project_edgerunner:blood_pump_1_idle",
        injectRenderLayerId: "project_edgerunner:blood_pump_1_inject",
        regenRenderLayerId: "project_edgerunner:blood_pump_1_regen"
    },
    {
        index: 2,
        capacityAbilityId: BLOOD_PUMP_CHARGE_CAPACITY_2_ABILITY_ID,
        injectAbilityId: "blood_pump_slot_2_inject_visual",
        rechargeAbilityId: "blood_pump_slot_2_recharge_visual",
        idleRenderLayerId: "project_edgerunner:blood_pump_2_idle",
        injectRenderLayerId: "project_edgerunner:blood_pump_2_inject",
        regenRenderLayerId: "project_edgerunner:blood_pump_2_regen"
    },
    {
        index: 3,
        capacityAbilityId: BLOOD_PUMP_CHARGE_CAPACITY_3_ABILITY_ID,
        injectAbilityId: "blood_pump_slot_3_inject_visual",
        rechargeAbilityId: "blood_pump_slot_3_recharge_visual",
        idleRenderLayerId: "project_edgerunner:blood_pump_3_idle",
        injectRenderLayerId: "project_edgerunner:blood_pump_3_inject",
        regenRenderLayerId: "project_edgerunner:blood_pump_3_regen"
    }
];

global.BLOOD_PUMP_REGEN_TICKS = BLOOD_PUMP_REGEN_TICKS;
global.BLOOD_PUMP_COOLDOWN_TICKS = BLOOD_PUMP_COOLDOWN_TICKS;
global.BLOOD_PUMP_VISUAL_SLOTS = BLOOD_PUMP_VISUAL_SLOTS;
global.BLOOD_PUMP_TIER_STATS = BLOOD_PUMP_UPGRADES.tierStats;

const BLOOD_PUMP_ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
const BLOOD_PUMP_BRANCHES = [
    {
        id: "instant",
        label: "Instant",
        icon: "minecraft:glistering_melon_slice",
        valueKey: "instantPv",
        suffix: " HP",
        xPos: -1.0
    },
    {
        id: "regen",
        label: "Regen",
        icon: "minecraft:ghast_tear",
        valueKey: "regenTotalPv",
        suffix: " HP",
        xPos: 1.0
    }
];

const BLOOD_PUMP_CHARGE_NODES = [
    {
        id: BLOOD_PUMP_CHARGE_CAPACITY_1_ABILITY_ID,
        title: "Base Charges",
        description: "Max charges: 1.",
        maxCharges: 1,
        cost: 0
    },
    {
        id: BLOOD_PUMP_CHARGE_CAPACITY_2_ABILITY_ID,
        title: "Charge Capacity II",
        description: "Max charges: 2.",
        maxCharges: 2,
        cost: 2
    },
    {
        id: BLOOD_PUMP_CHARGE_CAPACITY_3_ABILITY_ID,
        title: "Charge Capacity III",
        description: "Max charges: 3.",
        maxCharges: 3,
        cost: 3
    }
];

// Standard tree layout for cyberware:
// - all base nodes share one Y row
// - each upgrade tier is a separate row above the base row
const BLOOD_PUMP_TREE_LAYOUT = {
    rootY: 0.375,
    baseRowY: -0.375,
    upgradeStepY: 0.56,
    chargeBranchX: 0.0
};

// ---------------------------
// Upgrade helpers
// ---------------------------
function getTierRange() {
    var list = [];
    for (var tier = BLOOD_PUMP_UPGRADES.baseTier; tier <= BLOOD_PUMP_UPGRADES.maxTier; tier++) {
        list.push(tier);
    }
    return list;
}

function getUpgradeCount() {
    return Math.max(0, BLOOD_PUMP_UPGRADES.maxTier - BLOOD_PUMP_UPGRADES.baseTier);
}

function getUpgradeTierByIndex(index) {
    return BLOOD_PUMP_UPGRADES.baseTier + index;
}

function getTierStats(tier) {
    return BLOOD_PUMP_UPGRADES.tierStats[tier];
}

function getRomanNumeral(value) {
    return BLOOD_PUMP_ROMAN_NUMERALS[value - 1] || String(value);
}

function getBranchUpgradeAbilityId(branchId, upgradeIndex) {
    return "upgrade_" + branchId + "_" + upgradeIndex;
}

function getBranchValue(branch, tier) {
    var stats = getTierStats(tier);
    return stats ? stats[branch.valueKey] : 0;
}

function buildBranchValueText(branch, value) {
    return branch.label + ": +" + value + (branch.suffix || "");
}

function buildMainDescription() {
    return [
        "Active implant.",
        "Spend charges to heal instantly and stack regeneration over time.",
        "Each spent charge refills on its own fixed cooldown."
    ].join("\n");
}

function buildBranchTierEnabledConditions(branchId, tier, firstTickOnly) {
    var conditions = [{
        "type": firstTickOnly ? "palladium:ability_first_tick" : "palladium:ability_enabled",
        "ability": "blood_pump"
    }];

    if (tier === BLOOD_PUMP_UPGRADES.baseTier) {
        conditions.push({
            "type": "palladium:not",
            "conditions": [{
                "type": "palladium:ability_unlocked",
                "ability": getBranchUpgradeAbilityId(branchId, 1)
            }]
        });
        return conditions;
    }

    var upgradeIndex = tier - BLOOD_PUMP_UPGRADES.baseTier;
    conditions.push({
        "type": "palladium:ability_unlocked",
        "ability": getBranchUpgradeAbilityId(branchId, upgradeIndex)
    });

    if (tier < BLOOD_PUMP_UPGRADES.maxTier) {
        conditions.push({
            "type": "palladium:not",
            "conditions": [{
                "type": "palladium:ability_unlocked",
                "ability": getBranchUpgradeAbilityId(branchId, upgradeIndex + 1)
            }]
        });
    }

    return conditions;
}

function buildItemBuyableCondition(amount) {
    return {
        "type": "palladium:item_buyable",
        "ingredient": {
            "item": BLOOD_PUMP_INTERNAL_PARTS_ITEM
        },
        "amount": amount
    };
}

// ---------------------------
// Ability builders
// ---------------------------
function buildBaseAbility(itemIcon) {
    return {
        "blood_pump": {
            "type": "palladium:command",
            "icon": itemIcon,
            "title": BLOOD_PUMP.name,
            "description": buildMainDescription(),
            "bar_color": "red",
            "hidden": false,
            "hidden_in_bar": true,
            "list_index": 1,
            "gui_position": [0, BLOOD_PUMP_TREE_LAYOUT.rootY],
            "first_tick_commands": [],
            "commands": [],
            "conditions": {
                "enabling": [{
                    "type": "palladium:activation",
                    "cooldown": 0,
                    "ticks": 1,
                    "key_type": "key_bind",
                    "needs_empty_hand": false,
                    "allow_scrolling_when_crouching": true
                }],
                "unlocking": []
            }
        }
    };
}

function buildVisualSlotUnlockConditions(slot) {
    return [
        {
            "type": "palladium:ability_unlocked",
            "ability": "blood_pump"
        },
        {
            "type": "palladium:ability_unlocked",
            "ability": slot.capacityAbilityId
        }
    ];
}

function buildRuntimeMarkerAbilities(itemIcon) {
    var abilities = {};

    BLOOD_PUMP_VISUAL_SLOTS.forEach(function (slot) {
        abilities[slot.injectAbilityId] = {
            "type": "palladium:command",
            "icon": itemIcon,
            "hidden": true,
            "hidden_in_bar": true,
            "list_index": -1,
            "gui_position": [0, 0],
            "first_tick_commands": [],
            "last_tick_commands": [],
            "commands": [],
            "conditions": {
                "enabling": [{
                    "type": "palladium:activation",
                    "cooldown": 0,
                    "ticks": BLOOD_PUMP_REGEN_TICKS,
                    "key_type": "key_bind",
                    "needs_empty_hand": false,
                    "allow_scrolling_when_crouching": true
                }],
                "unlocking": buildVisualSlotUnlockConditions(slot)
            }
        };

        abilities[slot.rechargeAbilityId] = {
            "type": "palladium:command",
            "icon": itemIcon,
            "hidden": true,
            "hidden_in_bar": true,
            "list_index": -1,
            "gui_position": [0, 0],
            "first_tick_commands": [],
            "last_tick_commands": [],
            "commands": [],
            "conditions": {
                "enabling": [{ "type": "palladium:true" }],
                "unlocking": buildVisualSlotUnlockConditions(slot)
            }
        };
    });

    return abilities;
}

function buildRenderLayerAbilities() {
    var abilities = {};

    BLOOD_PUMP_VISUAL_SLOTS.forEach(function (slot) {
        abilities["blood_pump_render_layer_" + slot.index + "_inject"] = {
            "type": "palladium:render_layer",
            "hidden": true,
            "hidden_in_bar": true,
            "render_layer": slot.injectRenderLayerId,
            "conditions": {
                "enabling": [{
                    "type": "palladium:ability_enabled",
                    "ability": slot.injectAbilityId
                }],
                "unlocking": buildVisualSlotUnlockConditions(slot)
            }
        };

        abilities["blood_pump_render_layer_" + slot.index + "_regen"] = {
            "type": "palladium:render_layer",
            "hidden": true,
            "hidden_in_bar": true,
            "render_layer": slot.regenRenderLayerId,
            "conditions": {
                "enabling": [
                    {
                        "type": "palladium:ability_on_cooldown",
                        "ability": slot.rechargeAbilityId
                    },
                    {
                        "type": "palladium:not",
                        "conditions": [{
                            "type": "palladium:ability_enabled",
                            "ability": slot.injectAbilityId
                        }]
                    }
                ],
                "unlocking": buildVisualSlotUnlockConditions(slot)
            }
        };

        abilities["blood_pump_render_layer_" + slot.index + "_idle"] = {
            "type": "palladium:render_layer",
            "hidden": true,
            "hidden_in_bar": true,
            "render_layer": slot.idleRenderLayerId,
            "conditions": {
                "enabling": [
                    {
                        "type": "palladium:not",
                        "conditions": [{
                            "type": "palladium:ability_enabled",
                            "ability": slot.injectAbilityId
                        }]
                    },
                    {
                        "type": "palladium:not",
                        "conditions": [{
                            "type": "palladium:ability_on_cooldown",
                            "ability": slot.rechargeAbilityId
                        }]
                    }
                ],
                "unlocking": buildVisualSlotUnlockConditions(slot)
            }
        };
    });

    return abilities;
}

function buildBaseStatAbilities() {
    var baseStatsY = BLOOD_PUMP_TREE_LAYOUT.baseRowY;
    return {
        "blood_pump_base_cooldown": {
            "type": "palladium:command",
            "icon": "minecraft:clock",
            "title": "Base Cooldown",
            "description": "Cooldown/charge: " + BLOOD_PUMP.cooldownSeconds + "s (fixed).",
            "list_index": -1,
            "gui_position": [-2.0, baseStatsY],
            "hidden_in_bar": true,
            "first_tick_commands": [],
            "last_tick_commands": [],
            "commands": [],
            "conditions": {
                "enabling": [{ "type": "palladium:true" }],
                "unlocking": [{
                    "type": "palladium:ability_unlocked",
                    "ability": "blood_pump"
                }]
            }
        },
        "blood_pump_base_duration": {
            "type": "palladium:command",
            "icon": "project_edgerunner:textures/gui/upgrades/duration.png",
            "title": "Base Duration",
            "description": "Regen duration/use: " + BLOOD_PUMP.regenSeconds + "s (fixed).",
            "list_index": -1,
            "gui_position": [2.0, baseStatsY],
            "hidden_in_bar": true,
            "first_tick_commands": [],
            "last_tick_commands": [],
            "commands": [],
            "conditions": {
                "enabling": [{ "type": "palladium:true" }],
                "unlocking": [{
                    "type": "palladium:ability_unlocked",
                    "ability": "blood_pump"
                }]
            }
        }
    };
}

function buildChargeNodeAbilities() {
    var abilities = {};
    var baseY = BLOOD_PUMP_TREE_LAYOUT.baseRowY;
    var stepY = BLOOD_PUMP_TREE_LAYOUT.upgradeStepY;
    var xPos = BLOOD_PUMP_TREE_LAYOUT.chargeBranchX;

    BLOOD_PUMP_CHARGE_NODES.forEach(function (node, index) {
        var unlocking = [{
            "type": "palladium:ability_unlocked",
            "ability": "blood_pump"
        }];
        if (index > 0) {
            unlocking.push({
                "type": "palladium:ability_unlocked",
                "ability": BLOOD_PUMP_CHARGE_NODES[index - 1].id
            });
            unlocking.push(buildItemBuyableCondition(node.cost));
        }

        abilities[node.id] = {
            "type": "palladium:command",
            "icon": "minecraft:experience_bottle",
            "title": node.title,
            "description": node.description,
            "list_index": -1,
            "gui_position": [xPos, baseY - (index * stepY)],
            "hidden_in_bar": true,
            "first_tick_commands": [],
            "last_tick_commands": [],
            "commands": [],
            "conditions": {
                "enabling": [{ "type": "palladium:true" }],
                "unlocking": unlocking
            }
        };
    });

    return abilities;
}

function buildBranchNodeAbilities() {
    var abilities = {};
    var upgradeCount = getUpgradeCount();
    var stepY = BLOOD_PUMP_TREE_LAYOUT.upgradeStepY;
    var baseY = BLOOD_PUMP_TREE_LAYOUT.baseRowY;
    var upgradeStartY = baseY - stepY;

    BLOOD_PUMP_BRANCHES.forEach(function (branch) {
        var xPos = Number(branch.xPos || 0);
        var baseId = "base_" + branch.id;
        var baseValue = getBranchValue(branch, BLOOD_PUMP_UPGRADES.baseTier);
        abilities[baseId] = {
            "type": "palladium:command",
            "icon": branch.icon,
            "title": "Base " + branch.label,
            "description": "Base: " + buildBranchValueText(branch, baseValue),
            "list_index": -1,
            "gui_position": [xPos, baseY],
            "hidden_in_bar": true,
            "first_tick_commands": [],
            "last_tick_commands": [],
            "commands": [],
            "conditions": {
                "enabling": [{ "type": "palladium:true" }],
                "unlocking": [{
                    "type": "palladium:ability_unlocked",
                    "ability": "blood_pump"
                }]
            }
        };

        for (var upgradeIndex = 1; upgradeIndex <= upgradeCount; upgradeIndex++) {
            var tier = getUpgradeTierByIndex(upgradeIndex);
            var value = getBranchValue(branch, tier);
            var unlockConditions = [{
                "type": "palladium:ability_unlocked",
                "ability": baseId
            }];
            if (upgradeIndex > 1) {
                unlockConditions.push({
                    "type": "palladium:ability_unlocked",
                    "ability": getBranchUpgradeAbilityId(branch.id, upgradeIndex - 1)
                });
            }
            unlockConditions.push(buildItemBuyableCondition(1));

            abilities[getBranchUpgradeAbilityId(branch.id, upgradeIndex)] = {
                "type": "palladium:command",
                "icon": branch.icon,
                "title": branch.label + " " + getRomanNumeral(upgradeIndex),
                "description": buildBranchValueText(branch, value),
                "list_index": -1,
                "gui_position": [xPos, upgradeStartY - (upgradeIndex - 1) * stepY],
                "hidden_in_bar": true,
                "first_tick_commands": [],
                "last_tick_commands": [],
                "commands": [],
                "conditions": {
                    "enabling": [{ "type": "palladium:true" }],
                    "unlocking": unlockConditions
                }
            };
        }
    });

    return abilities;
}

function buildBloodPumpAbilities(itemIcon) {
    return Object.assign(
        {},
        buildBaseAbility(itemIcon),
        buildRuntimeMarkerAbilities(itemIcon),
        buildRenderLayerAbilities(),
        buildBaseStatAbilities(),
        buildChargeNodeAbilities(),
        buildBranchNodeAbilities()
    );
}

function buildBloodPumpPower(itemIcon) {
    return {
        name: BLOOD_PUMP.name,
        persistent_data: true,
        background: "minecraft:textures/block/warped_stem.png",
        ability_bar_texture: "project_edgerunner:textures/gui/ability_bar.png",
        icon: itemIcon,
        gui_display_type: "tree",
        edgerunner_stats: BLOOD_PUMP_BRANCHES.map(function (branch) {
            return { id: branch.id, label: branch.label === "Instant" ? "Instant healing" : "Regeneration", unit: "HP",
                values: getTierRange().map(function (tier) { return getBranchValue(branch, tier); }),
                nodes: [1, 2, 3].map(function (index) { return getBranchUpgradeAbilityId(branch.id, index); }),
                condition: branch.id === "regen" ? "Over " + BLOOD_PUMP.regenSeconds + "s" : "On injection" };
        }).concat([{ id: "charges", label: "Max charges", unit: "COUNT", values: BLOOD_PUMP_CHARGE_NODES.map(function (node) { return node.maxCharges; }), nodes: [BLOOD_PUMP_CHARGE_CAPACITY_2_ABILITY_ID, BLOOD_PUMP_CHARGE_CAPACITY_3_ABILITY_ID] }]),
        abilities: buildBloodPumpAbilities(itemIcon)
    };
}

// ---------------------------
// Registration
// ---------------------------
const bloodPumpItemName = BLOOD_PUMP.itemId.replace(/^[^:]+:/, "");
const bloodPumpIcon = "project_edgerunner:textures/item/" + bloodPumpItemName + "_item.png";

ServerEvents.highPriorityData(function (event) {
    global.addLocalizedPowerJson(event, "project_edgerunner:palladium/powers/blood_pump", buildBloodPumpPower(bloodPumpIcon));
});

if (!global.registerCyberwareInstallComponent) {
    throw new Error("[Cyberpunk/Cyberware] Install registry not loaded before blood pump registration.");
}

global.registerCyberwareInstallComponent({
    item: BLOOD_PUMP.itemId,
    name: BLOOD_PUMP.name,
    type: BLOOD_PUMP.type,
    body_slot: BLOOD_PUMP.bodySlot,
    activation_slot: BLOOD_PUMP.activationSlot,
    activation_mode: BLOOD_PUMP.activationMode,
    load_cost: BLOOD_PUMP.loadCost,
    palladium_power: "project_edgerunner:blood_pump",
    install_message: "Blood Pump installed.",
    remove_message: "Blood Pump removed."
});
