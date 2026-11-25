// priority: 60
// Server script: Gorilla Arms cyberware (arms slot).

const GORILLA_ARMS = {
    id: "gorilla_arms",
    name: "Gorilla Arms",
    itemId: "project_edgerunner:gorilla_arms",
    type: "arms",
    bodySlot: "arms",
    activationSlot: "arms",
    activationMode: "manual",
    loadCost: 35,
    tier: 4,
    rarity: "rare"
};

const GORILLA_DAMAGE_TIERS = [12, 23, 35, 46];
const GORILLA_BLEED_BASE_CHANCE = 5;
const GORILLA_BLEED_TIERS = [10, 13, 17, 20];
const GORILLA_UPGRADE_COSTS = [1, 2, 3, 4];
const GORILLA_UPGRADE_TIER_COUNT = GORILLA_DAMAGE_TIERS.length;
const GORILLA_ELEMENT_COST = 5;
const GORILLA_SPECIAL_COST = 2;
// Costs of the nodes the Fury branch and the guard add, in the same tiers as the Mantis side nodes (2, 2, 2, 3, 4).
const GORILLA_GUARD_COST = 2;
const GORILLA_FURY_COST = 2;
const GORILLA_SLAM_COST = GORILLA_SPECIAL_COST;
const GORILLA_STYLE_COST = 2;
const GORILLA_BLOW_COST = 3;
const GORILLA_BREAKER_COST = 4;
const GORILLA_RETUNE_COST = 3;
const GORILLA_INTERNAL_PARTS_ITEM = "project_edgerunner:cyberware_internal_parts_t4";
const GORILLA_ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
const GORILLA_BASE_DAMAGE_UUID = "86f9ce87-b5b2-4dcf-b75a-25c5f79000e9";
const GORILLA_DAMAGE_ATTR_UUIDS = [
    "a8ba8df7-09a6-4e23-a5dc-354f9a058c41",
    "0f3f6858-8262-4c87-9c08-b66010089d8c",
    "f769fb52-8dfa-4b2d-b734-c2f4755a402d",
    "be7d89c5-5d2f-4970-b867-c9bf9d8f7010",
    "96eb708a-4e8a-4269-8fab-8f4b266ea115",
    "3bb6dc83-0ae4-4ad8-9f03-6724498bf7cb"
];

const GORILLA_ELEMENTAL_UPGRADES = [
    {
        id: "thermal",
        value: 1,
        title: "Thermal Upgrade",
        icon: "minecraft:blaze_powder",
        x: -2.25,
        description: "Exclusive. First hit every 15s ignites target for 10s.\nAlso triggers on throw release."
    },
    {
        id: "electric",
        value: 2,
        title: "Electric Upgrade",
        icon: "minecraft:lightning_rod",
        x: -0.75,
        description: "Exclusive. First hit every 15s applies Electroshock for 5s.\nStuns mobs for 2s; also triggers on throw release."
    },
    {
        id: "toxic",
        value: 3,
        title: "Toxic Upgrade",
        icon: "minecraft:slime_ball",
        x: 0.75,
        description: "Exclusive. First hit every 15s applies Poison for 10s.\nAlso triggers on throw release."
    },
    {
        id: "frozen",
        value: 4,
        title: "Frozen Upgrade",
        icon: "minecraft:packed_ice",
        x: 2.25,
        description: "Exclusive. First hit every 15s applies Cryolock for 5s.\nFreezes mobs; also triggers on throw release."
    }
];

// Same shape as the Mantis tree: two trunks (damage left, bleed right) rise from the base row, the side zones hang off
// them at their own heights and the elements close the top. Guard and Grab live on the damage side, Gorilla Fury and
// what it feeds on the bleed side. Nodes are 0.5 wide, so every neighbour is at least 0.75 away.
const GORILLA_TREE_LAYOUT = {
    rootY: 0.375,
    branchX: 0.5,
    specialOffsetX: 1.0,
    baseRowY: -0.375,
    upgradeStepY: 0.56,
    upgradeStartY: -0.935,
    elementRowY: -3.735,
    furyColumnStepX: 0.75
};

function getGorillaSpecialUnlockY() {
    return GORILLA_TREE_LAYOUT.baseRowY;
}

function getGorillaSpecialX(branchX, side) {
    return Number(branchX || 0) + ((side < 0 ? -1 : 1) * GORILLA_TREE_LAYOUT.specialOffsetX);
}

// y of the n-th upgrade tier (1 is just above the base row)
function getGorillaTierY(tierIndex) {
    return GORILLA_TREE_LAYOUT.upgradeStartY - ((tierIndex - 1) * GORILLA_TREE_LAYOUT.upgradeStepY);
}

function gorillaRoman(index) {
    return GORILLA_ROMAN[index - 1] || String(index);
}

function getGorillaUpgradeCost(tierIndex) {
    return Number(GORILLA_UPGRADE_COSTS[tierIndex - 1] || 1);
}

function gorillaUpgradeUnlock(baseId, upgradePrefix, tierIndex) {
    var cost = getGorillaUpgradeCost(tierIndex);
    var unlocking = [
        {
            type: "palladium:ability_unlocked",
            power: "project_edgerunner:gorilla_arms",
            ability: baseId
        }
    ];
    if (tierIndex > 1) {
        unlocking.push({
            type: "palladium:ability_unlocked",
            power: "project_edgerunner:gorilla_arms",
            ability: upgradePrefix + (tierIndex - 1)
        });
    }
    unlocking.push({
        type: "palladium:item_buyable",
        ingredient: {
            item: GORILLA_INTERNAL_PARTS_ITEM
        },
        amount: cost
    });
    return unlocking;
}

function gorillaSingleUnlock(abilityId, cost) {
    return [
        {
            type: "palladium:ability_unlocked",
            power: "project_edgerunner:gorilla_arms",
            ability: abilityId
        },
        {
            type: "palladium:item_buyable",
            ingredient: {
                item: GORILLA_INTERNAL_PARTS_ITEM
            },
            amount: Math.max(1, Number(cost || 1))
        }
    ];
}

function gorillaDependencyUnlock(abilityId) {
    return [
        {
            type: "palladium:ability_unlocked",
            power: "project_edgerunner:gorilla_arms",
            ability: abilityId
        }
    ];
}

function gorillaNodeUnlock(requires, cost) {
    var unlocking = requires.map(function (abilityId) {
        return {
            type: "palladium:ability_unlocked",
            power: "project_edgerunner:gorilla_arms",
            ability: abilityId
        };
    });
    if (cost > 0) {
        unlocking.push({
            type: "palladium:item_buyable",
            ingredient: {
                item: GORILLA_INTERNAL_PARTS_ITEM
            },
            amount: cost
        });
    }
    return unlocking;
}

function gorillaNode(icon, title, description, x, y, unlocking) {
    return {
        type: "palladium:command",
        icon: icon,
        title: title,
        description: description,
        hidden_in_bar: true,
        list_index: -1,
        gui_position: [x, y],
        first_tick_commands: [],
        last_tick_commands: [],
        commands: [],
        conditions: {
            enabling: [{ type: "palladium:true" }],
            unlocking: unlocking
        }
    };
}

function gorillaAbilityNotUnlocked(abilityId) {
    return {
        type: "palladium:not",
        conditions: [{
            type: "palladium:ability_unlocked",
            power: "project_edgerunner:gorilla_arms",
            ability: abilityId
        }]
    };
}

function gorillaScoreCondition(objective, minScore, maxScore) {
    return {
        type: "palladium:objective_score",
        objective: objective,
        min_score: minScore,
        max_score: maxScore
    };
}

function gorillaNotScoreCondition(objective, minScore, maxScore) {
    return {
        type: "palladium:not",
        conditions: [
            gorillaScoreCondition(objective, minScore, maxScore)
        ]
    };
}

function gorillaRenderAbility(renderLayer, scoreObjective, minScore, maxScore, extraEnabling) {
    return {
        type: "palladium:render_layer",
        hidden: true,
        hidden_in_bar: true,
        render_layer: renderLayer,
        conditions: {
            enabling: [
                gorillaScoreCondition(scoreObjective, minScore, maxScore)
            ].concat(extraEnabling || []),
            unlocking: []
        }
    };
}

function buildElementalUnlockConditions(elementId) {
    var conditions = [
        {
            type: "palladium:ability_unlocked",
            power: "project_edgerunner:gorilla_arms",
            ability: "upgrade_damage_" + GORILLA_UPGRADE_TIER_COUNT
        },
        {
            type: "palladium:ability_unlocked",
            power: "project_edgerunner:gorilla_arms",
            ability: "upgrade_bleed_" + GORILLA_UPGRADE_TIER_COUNT
        }
    ];
    GORILLA_ELEMENTAL_UPGRADES.forEach(function (otherElement) {
        if (otherElement.id !== elementId) {
            conditions.push(gorillaAbilityNotUnlocked("upgrade_element_" + otherElement.id));
        }
    });
    conditions.push({
        type: "palladium:item_buyable",
        ingredient: {
            item: GORILLA_INTERNAL_PARTS_ITEM
        },
        amount: GORILLA_ELEMENT_COST
    });
    return conditions;
}

function gorillaTierEnabling(upgradePrefix, tierIndex, maxTier) {
    var enabling = [
        {
            type: "palladium:ability_unlocked",
            power: "project_edgerunner:gorilla_arms",
            ability: upgradePrefix + tierIndex
        }
    ];
    if (tierIndex < maxTier) {
        enabling.push({
            type: "palladium:not",
            conditions: [
                {
                    type: "palladium:ability_unlocked",
                    power: "project_edgerunner:gorilla_arms",
                    ability: upgradePrefix + (tierIndex + 1)
                }
            ]
        });
    }
    return enabling;
}

function buildGorillaAbilities(itemIcon) {
    var activeMoveExclusions = [
        gorillaNotScoreCondition("er_ga_move", 2, 2),
        gorillaNotScoreCondition("er_ga_move", 7, 7)
    ];
    var slamMoveConditions = [
        gorillaScoreCondition("er_ga_move", 2, 2)
    ];
    var slamRecoverMoveConditions = [
        gorillaScoreCondition("er_ga_move", 7, 7)
    ];
    var abilities = {
        gorilla_arms_toggle: {
            type: "kubejs:cyberpunk/gorilla_arms_toggle",
            icon: itemIcon,
            title: "Gorilla Arms",
            description: "Toggle deployment. Existing hand items are stashed and both hands stay empty while active.",
            hidden: false,
            hidden_in_bar: true,
            list_index: 0,
            gui_position: [0, GORILLA_TREE_LAYOUT.rootY],
            conditions: {
                enabling: [
                    {
                        type: "palladium:action",
                        cooldown: 0,
                        key_type: "key_bind",
                        needs_empty_hand: false,
                        allow_scrolling_when_crouching: true
                    }
                ],
                unlocking: []
            }
        },
        // Left arm render layers (gorilla_arm_left.geo.json — canonical correct geometry)
        gorilla_arms_render_idle: gorillaRenderAbility("project_edgerunner:gorilla_arms_idle", "er_ga_state", 0, 0),
        gorilla_arms_render_extender: gorillaRenderAbility("project_edgerunner:gorilla_arms_extender", "er_ga_state", 1, 1),
        gorilla_arms_render_active: gorillaRenderAbility("project_edgerunner:gorilla_arms_active", "er_ga_state", 2, 2, activeMoveExclusions),
        gorilla_arms_render_slam: gorillaRenderAbility("project_edgerunner:gorilla_arms_slam", "er_ga_state", 2, 2, slamMoveConditions),
        gorilla_arms_render_slam_recover: gorillaRenderAbility("project_edgerunner:gorilla_arms_slam", "er_ga_state", 2, 2, slamRecoverMoveConditions),
        gorilla_arms_render_agarrar: gorillaRenderAbility("project_edgerunner:gorilla_arms_agarrar", "er_ga_state", 3, 3),
        gorilla_arms_render_contraer: gorillaRenderAbility("project_edgerunner:gorilla_arms_contraer", "er_ga_state", 4, 4),
        // Right arm render layers (gorilla_arm_right.geo.json — clean mirror of left, no accumulated patch rotations)
        gorilla_arms_right_render_idle: gorillaRenderAbility("project_edgerunner:gorilla_arms_right_idle", "er_ga_state", 0, 0),
        gorilla_arms_right_render_extender: gorillaRenderAbility("project_edgerunner:gorilla_arms_right_extender", "er_ga_state", 1, 1),
        gorilla_arms_right_render_active: gorillaRenderAbility("project_edgerunner:gorilla_arms_right_active", "er_ga_state", 2, 2, activeMoveExclusions),
        gorilla_arms_right_render_slam: gorillaRenderAbility("project_edgerunner:gorilla_arms_right_slam", "er_ga_state", 2, 2, slamMoveConditions),
        gorilla_arms_right_render_slam_recover: gorillaRenderAbility("project_edgerunner:gorilla_arms_right_slam", "er_ga_state", 2, 2, slamRecoverMoveConditions),
        gorilla_arms_right_render_agarrar: gorillaRenderAbility("project_edgerunner:gorilla_arms_right_agarrar", "er_ga_state", 3, 3),
        gorilla_arms_right_render_contraer: gorillaRenderAbility("project_edgerunner:gorilla_arms_right_contraer", "er_ga_state", 4, 4),
        base_damage: {
            type: "palladium:command",
            icon: "minecraft:iron_sword",
            title: "Base Damage",
            description: "Base: +6 attack damage while deployed.\nUpgrades add +12% to +46% melee damage.",
            hidden_in_bar: true,
            list_index: -1,
            gui_position: [-GORILLA_TREE_LAYOUT.branchX, GORILLA_TREE_LAYOUT.baseRowY],
            first_tick_commands: [],
            last_tick_commands: [],
            commands: [],
            conditions: {
                enabling: [{ type: "palladium:true" }],
                unlocking: [{
                    type: "palladium:ability_unlocked",
                    power: "project_edgerunner:gorilla_arms",
                    ability: "gorilla_arms_toggle"
                }]
            }
        },
        base_bleed: {
            type: "palladium:command",
            icon: "minecraft:redstone",
            title: "Base Bleed",
            description: "Base: " + GORILLA_BLEED_BASE_CHANCE + "% chance to apply Bleed on melee hit.\nUpgrades raise Bleed chance to 20%.",
            hidden_in_bar: true,
            list_index: -1,
            gui_position: [GORILLA_TREE_LAYOUT.branchX, GORILLA_TREE_LAYOUT.baseRowY],
            first_tick_commands: [],
            last_tick_commands: [],
            commands: [],
            conditions: {
                enabling: [{ type: "palladium:true" }],
                unlocking: [{
                    type: "palladium:ability_unlocked",
                    power: "project_edgerunner:gorilla_arms",
                    ability: "gorilla_arms_toggle"
                }]
            }
        },
        // Damage side: the guard hangs off Base Damage, the finishers off Damage III.
        upgrade_special_guard: gorillaNode("minecraft:shield", "Guard",
            "Hold use to raise the guard. Frontal hits lose most of their damage, and you walk slower while holding it.\nWith Epic Fight it is the guard key: it costs stamina and plants your feet. Blocked hits feed Fury.",
            getGorillaSpecialX(-GORILLA_TREE_LAYOUT.branchX, -1), GORILLA_TREE_LAYOUT.baseRowY,
            gorillaNodeUnlock(["base_damage"], GORILLA_GUARD_COST)),
        upgrade_unlock_finishers: gorillaNode("minecraft:iron_axe", "Unlock Finishers",
            "Unlock finisher branch. Grab uses RMB on weak targets.",
            getGorillaSpecialX(-GORILLA_TREE_LAYOUT.branchX, -1), getGorillaTierY(3),
            gorillaNodeUnlock(["upgrade_damage_3"], GORILLA_SPECIAL_COST)),
        upgrade_special_finisher: gorillaNode("minecraft:chain", "Grab",
            "Finisher. RMB on a low-health target to grab.",
            getGorillaSpecialX(-GORILLA_TREE_LAYOUT.branchX, -1), getGorillaTierY(4),
            gorillaDependencyUnlock("upgrade_unlock_finishers")),
        // Bleed side: Gorilla Fury sits on the base row next to Base Bleed. Blow and Breaker rise above it, Style and Slam
        // sit to its right, every one of them one step from Fury.
        upgrade_special_fury: gorillaNode("minecraft:fire_charge", "Gorilla Fury",
            "Fills the Fury bar: hits give up to 9% Fury, rush punches up to 14%. Blocking feeds it too.\nHolds 15s, then empties over 20s. Without this node there is no Fury at all.",
            getGorillaSpecialX(GORILLA_TREE_LAYOUT.branchX, 1), GORILLA_TREE_LAYOUT.baseRowY,
            gorillaNodeUnlock(["base_bleed"], GORILLA_FURY_COST)),
        upgrade_special_slam: gorillaNode("minecraft:anvil", "Slam",
            "Hold use in the air from 50% Fury, after a 1.25 block drop.\nDamage: 12-15. Radius: 2-5m. Both scale with Fury.",
            getGorillaSpecialX(GORILLA_TREE_LAYOUT.branchX, 1) + GORILLA_TREE_LAYOUT.furyColumnStepX, getGorillaTierY(1),
            gorillaNodeUnlock(["upgrade_special_fury"], GORILLA_SLAM_COST)),
        upgrade_fury_style: gorillaNode("minecraft:blaze_rod", "Fury Style",
            "At 60% Fury, basic attacks use the Fury set.",
            getGorillaSpecialX(GORILLA_TREE_LAYOUT.branchX, 1) + GORILLA_TREE_LAYOUT.furyColumnStepX, GORILLA_TREE_LAYOUT.baseRowY,
            gorillaNodeUnlock(["upgrade_special_fury"], GORILLA_STYLE_COST)),
        upgrade_fury_blow: gorillaNode("minecraft:piston", "Hydraulic Blow",
            "Hold attack to charge Hydraulic Blow for up to 1.5s. It spends that share of Fury.",
            getGorillaSpecialX(GORILLA_TREE_LAYOUT.branchX, 1), getGorillaTierY(1),
            gorillaNodeUnlock(["upgrade_special_fury"], GORILLA_BLOW_COST)),
        upgrade_fury_breaker: gorillaNode("minecraft:tnt", "Breaker",
            "A full bar spends all Fury. Cone: 6m.\nDamage: 130% of a full Slam, down to 55% at the edge.",
            getGorillaSpecialX(GORILLA_TREE_LAYOUT.branchX, 1), getGorillaTierY(2),
            gorillaNodeUnlock(["upgrade_fury_blow"], GORILLA_BREAKER_COST)),
        gorilla_runtime_fury_unlock: {
            type: "palladium:command",
            hidden: true,
            hidden_in_bar: true,
            first_tick_commands: [],
            last_tick_commands: [],
            commands: [
                "data modify entity @s ForgeData.cyb_ga_fury_unlock set value 1",
                "scoreboard players set @s er_ga_fury_u 1"
            ],
            conditions: {
                enabling: [
                    {
                        type: "palladium:ability_unlocked",
                        power: "project_edgerunner:gorilla_arms",
                        ability: "upgrade_special_fury"
                    }
                ],
                unlocking: []
            }
        },
        gorilla_runtime_fury_unlock_reset: {
            type: "palladium:command",
            hidden: true,
            hidden_in_bar: true,
            first_tick_commands: [],
            last_tick_commands: [],
            commands: [
                "data modify entity @s ForgeData.cyb_ga_fury_unlock set value 0",
                "scoreboard players set @s er_ga_fury_u 0"
            ],
            conditions: {
                enabling: [
                    {
                        type: "palladium:not",
                        conditions: [
                            {
                                type: "palladium:ability_unlocked",
                                power: "project_edgerunner:gorilla_arms",
                                ability: "upgrade_special_fury"
                            }
                        ]
                    }
                ],
                unlocking: []
            }
        },
        gorilla_runtime_finisher_unlock: {
            type: "palladium:command",
            hidden: true,
            hidden_in_bar: true,
            first_tick_commands: [],
            last_tick_commands: [],
            commands: [
                "data modify entity @s ForgeData.cyb_ga_finisher_unlock set value 1",
                "scoreboard players set @s er_ga_fin 1"
            ],
            conditions: {
                enabling: [
                    {
                        type: "palladium:ability_unlocked",
                        power: "project_edgerunner:gorilla_arms",
                        ability: "upgrade_unlock_finishers"
                    }
                ],
                unlocking: []
            }
        },
        gorilla_runtime_finisher_unlock_grab: {
            type: "palladium:command",
            hidden: true,
            hidden_in_bar: true,
            first_tick_commands: [],
            last_tick_commands: [],
            commands: [
                "data modify entity @s ForgeData.cyb_ga_finisher_unlock set value 1",
                "scoreboard players set @s er_ga_fin 1"
            ],
            conditions: {
                enabling: [
                    {
                        type: "palladium:ability_unlocked",
                        power: "project_edgerunner:gorilla_arms",
                        ability: "upgrade_special_finisher"
                    }
                ],
                unlocking: []
            }
        },
        gorilla_runtime_finisher_unlock_reset: {
            type: "palladium:command",
            hidden: true,
            hidden_in_bar: true,
            first_tick_commands: [],
            last_tick_commands: [],
            commands: [
                "data modify entity @s ForgeData.cyb_ga_finisher_unlock set value 0",
                "scoreboard players set @s er_ga_fin 0"
            ],
            conditions: {
                enabling: [
                    {
                        type: "palladium:not",
                        conditions: [
                            {
                                type: "palladium:ability_unlocked",
                                power: "project_edgerunner:gorilla_arms",
                                ability: "upgrade_unlock_finishers"
                            }
                        ]
                    },
                    {
                        type: "palladium:not",
                        conditions: [
                            {
                                type: "palladium:ability_unlocked",
                                power: "project_edgerunner:gorilla_arms",
                                ability: "upgrade_special_finisher"
                            }
                        ]
                    }
                ],
                unlocking: []
            }
        },
        gorilla_runtime_slam_unlock: {
            type: "palladium:command",
            hidden: true,
            hidden_in_bar: true,
            first_tick_commands: [],
            last_tick_commands: [],
            commands: [
                "data modify entity @s ForgeData.cyb_ga_slam_unlock set value 1",
                "scoreboard players set @s er_ga_slam 1"
            ],
            conditions: {
                enabling: [
                    {
                        type: "palladium:ability_unlocked",
                        power: "project_edgerunner:gorilla_arms",
                        ability: "upgrade_special_slam"
                    }
                ],
                unlocking: []
            }
        },
        gorilla_runtime_slam_unlock_reset: {
            type: "palladium:command",
            hidden: true,
            hidden_in_bar: true,
            first_tick_commands: [],
            last_tick_commands: [],
            commands: [
                "data modify entity @s ForgeData.cyb_ga_slam_unlock set value 0",
                "scoreboard players set @s er_ga_slam 0"
            ],
            conditions: {
                enabling: [
                    {
                        type: "palladium:not",
                        conditions: [
                            {
                                type: "palladium:ability_unlocked",
                                power: "project_edgerunner:gorilla_arms",
                                ability: "upgrade_special_slam"
                            }
                        ]
                    }
                ],
                unlocking: []
            }
        }
    };

    abilities.gorilla_damage_base_attr = {
        type: "palladium:attribute_modifier",
        hidden: true,
        hidden_in_bar: true,
        attribute: "minecraft:generic.attack_damage",
        uuid: GORILLA_BASE_DAMAGE_UUID,
        amount: 6,
        operation: 0,
        conditions: {
            enabling: [
                {
                    type: "palladium:objective_score",
                    objective: "er_ga_state",
                    min_score: 2,
                    max_score: 3
                }
            ],
            unlocking: []
        }
    };

    for (var tier = 1; tier <= GORILLA_UPGRADE_TIER_COUNT; tier++) {
        var damageBonus = Number(GORILLA_DAMAGE_TIERS[tier - 1] || 12);
        var bleedChance = Number(GORILLA_BLEED_TIERS[tier - 1] || 10);
        var upgradeCost = getGorillaUpgradeCost(tier);
        abilities["upgrade_damage_" + tier] = {
            type: "palladium:command",
            icon: "minecraft:iron_sword",
            title: "Damage " + gorillaRoman(tier),
            description: "+6 attack damage and +" + damageBonus + "% melee damage while deployed.",
            hidden_in_bar: true,
            list_index: -1,
            gui_position: [
                -GORILLA_TREE_LAYOUT.branchX,
                GORILLA_TREE_LAYOUT.upgradeStartY - ((tier - 1) * GORILLA_TREE_LAYOUT.upgradeStepY)
            ],
            first_tick_commands: [
                "data modify entity @s ForgeData.cyb_ga_dmg_tier set value " + tier
            ],
            last_tick_commands: [],
            commands: [],
            conditions: {
                enabling: [{ type: "palladium:true" }],
                unlocking: gorillaUpgradeUnlock("base_damage", "upgrade_damage_", tier)
            }
        };
        abilities["upgrade_bleed_" + tier] = {
            type: "palladium:command",
            icon: "minecraft:redstone",
            title: "Bleed " + gorillaRoman(tier),
            description: bleedChance + "% chance to apply Bleed on melee hit.",
            hidden_in_bar: true,
            list_index: -1,
            gui_position: [
                GORILLA_TREE_LAYOUT.branchX,
                GORILLA_TREE_LAYOUT.upgradeStartY - ((tier - 1) * GORILLA_TREE_LAYOUT.upgradeStepY)
            ],
            first_tick_commands: [
                "data modify entity @s ForgeData.cyb_ga_bleed_tier set value " + tier
            ],
            last_tick_commands: [],
            commands: [],
            conditions: {
                enabling: [{ type: "palladium:true" }],
                unlocking: gorillaUpgradeUnlock("base_bleed", "upgrade_bleed_", tier)
            }
        };

        var damageTierEnabling = gorillaTierEnabling("upgrade_damage_", tier, GORILLA_UPGRADE_TIER_COUNT);
        var bleedTierEnabling = gorillaTierEnabling("upgrade_bleed_", tier, GORILLA_UPGRADE_TIER_COUNT);

        abilities["gorilla_damage_attr_tier_" + tier] = {
            type: "palladium:attribute_modifier",
            hidden: true,
            hidden_in_bar: true,
            attribute: "minecraft:generic.attack_damage",
            uuid: String(GORILLA_DAMAGE_ATTR_UUIDS[tier - 1]),
            amount: damageBonus / 100,
            operation: 2,
            conditions: {
                enabling: [
                    {
                        type: "palladium:objective_score",
                        objective: "er_ga_state",
                        min_score: 2,
                        max_score: 3
                    }
                ].concat(damageTierEnabling),
                unlocking: []
            }
        };

        abilities["gorilla_runtime_damage_tier_" + tier] = {
            type: "palladium:command",
            hidden: true,
            hidden_in_bar: true,
            first_tick_commands: [],
            last_tick_commands: [],
            commands: [
                "data modify entity @s ForgeData.cyb_ga_dmg_tier set value " + tier
            ],
            conditions: {
                enabling: damageTierEnabling,
                unlocking: []
            }
        };

        abilities["gorilla_runtime_bleed_tier_" + tier] = {
            type: "palladium:command",
            hidden: true,
            hidden_in_bar: true,
            first_tick_commands: [],
            last_tick_commands: [],
            commands: [
                "data modify entity @s ForgeData.cyb_ga_bleed_tier set value " + tier
            ],
            conditions: {
                enabling: bleedTierEnabling,
                unlocking: []
            }
        };
    }

    abilities.gorilla_runtime_damage_tier_reset = {
        type: "palladium:command",
        hidden: true,
        hidden_in_bar: true,
        first_tick_commands: [],
        last_tick_commands: [],
        commands: [
            "data modify entity @s ForgeData.cyb_ga_dmg_tier set value 0"
        ],
        conditions: {
            enabling: [
                {
                    type: "palladium:not",
                    conditions: [
                        {
                            type: "palladium:ability_unlocked",
                            power: "project_edgerunner:gorilla_arms",
                            ability: "upgrade_damage_1"
                        }
                    ]
                }
            ],
            unlocking: []
        }
    };

    abilities.gorilla_runtime_bleed_tier_reset = {
        type: "palladium:command",
        hidden: true,
        hidden_in_bar: true,
        first_tick_commands: [],
        last_tick_commands: [],
        commands: [
            "data modify entity @s ForgeData.cyb_ga_bleed_tier set value 0"
        ],
        conditions: {
            enabling: [
                {
                    type: "palladium:not",
                    conditions: [
                        {
                            type: "palladium:ability_unlocked",
                            power: "project_edgerunner:gorilla_arms",
                            ability: "upgrade_bleed_1"
                        }
                    ]
                }
            ],
            unlocking: []
        }
    };

    for (var e = 0; e < GORILLA_ELEMENTAL_UPGRADES.length; e++) {
        var element = GORILLA_ELEMENTAL_UPGRADES[e];
        var elementFirstTickCommands = [
            "scoreboard players set @s er_ga_aug " + Number(element.value || 0),
            "data modify entity @s ForgeData.cyb_ga_aug_sel set value " + Number(element.value || 0),
            "data modify entity @s ForgeData.cyb_ga_aug set value " + Number(element.value || 0)
        ];
        for (var oe = 0; oe < GORILLA_ELEMENTAL_UPGRADES.length; oe++) {
            var otherElement = GORILLA_ELEMENTAL_UPGRADES[oe];
            var isSelected = otherElement.id === element.id;
            elementFirstTickCommands.push(
                "data modify entity @s ForgeData.cyb_ga_aug_unlock_" + otherElement.id + " set value " + (isSelected ? 1 : 0)
            );
            if (isSelected) {
                continue;
            }
            elementFirstTickCommands.push(
                "ability lock @s project_edgerunner:gorilla_arms upgrade_element_" + otherElement.id
            );
        }
        abilities["upgrade_element_" + element.id] = {
            type: "palladium:command",
            icon: element.icon,
            title: element.title,
            description: element.description,
            hidden_in_bar: true,
            list_index: -1,
            gui_position: [element.x, GORILLA_TREE_LAYOUT.elementRowY],
            first_tick_commands: elementFirstTickCommands,
            last_tick_commands: [],
            commands: [],
            conditions: {
                enabling: [{ type: "palladium:true" }],
                unlocking: buildElementalUnlockConditions(element.id)
            }
        };

        var retuneCommands = [
            "scoreboard players set @s er_ga_aug 0",
            "data modify entity @s ForgeData.cyb_ga_aug_sel set value 0",
            "data modify entity @s ForgeData.cyb_ga_aug set value 0"
        ];
        GORILLA_ELEMENTAL_UPGRADES.forEach(function (candidate) {
            retuneCommands.push("data modify entity @s ForgeData.cyb_ga_aug_unlock_" + candidate.id + " set value 0");
            retuneCommands.push("ability lock @s project_edgerunner:gorilla_arms upgrade_element_" + candidate.id);
            retuneCommands.push("ability lock @s project_edgerunner:gorilla_arms retune_element_" + candidate.id);
        });
        abilities["retune_element_" + element.id] = {
            type: "palladium:command",
            icon: "minecraft:barrier",
            title: "Retune Element",
            description: "Clear the installed elemental branch so another element can be selected. Spent upgrades are not refunded.",
            hidden_in_bar: true,
            list_index: -1,
            gui_position: [element.x, GORILLA_TREE_LAYOUT.elementRowY - GORILLA_TREE_LAYOUT.upgradeStepY],
            first_tick_commands: retuneCommands,
            last_tick_commands: [],
            commands: [],
            conditions: {
                enabling: [{ type: "palladium:true" }],
                unlocking: gorillaSingleUnlock("upgrade_element_" + element.id, GORILLA_RETUNE_COST)
            }
        };
    }

    if (Platform.isLoaded("epicfight")) {
        abilities.upgrade_special_guard.description = { translate: "ability.project_edgerunner.gorilla_arms.guard_learn" };
        abilities.upgrade_special_guard.conditions.unlocking = gorillaDependencyUnlock("base_damage").concat([{
            type: "palladium:objective_score", objective: "er_ga_up", min_score: 8, max_score: 15
        }]);
    } else {
        abilities.upgrade_special_guard.description = { translate: "ability.project_edgerunner.gorilla_arms.guard_vanilla" };
    }
    // The Fury Style and the Breaker are Epic Fight moves: without that mod their nodes are not placed. Nothing hangs
    // off either of them, so no connector is left pointing at a missing node. The Hydraulic Blow also exists as a
    // charged punch in vanilla combat, so it stays.
    if (!Platform.isLoaded("epicfight")) {
        delete abilities.upgrade_fury_style;
        delete abilities.upgrade_fury_breaker;
    }
    return abilities;
}

function buildGorillaPower(itemIcon) {
    var abilities = buildGorillaAbilities(itemIcon);
    var stats = [
        { id: "damage", label: "Melee damage", unit: "PERCENT", values: [0].concat(GORILLA_DAMAGE_TIERS), nodes: GORILLA_DAMAGE_TIERS.map(function (_, i) { return "upgrade_damage_" + (i + 1); }), condition: "While Gorilla Arms are deployed" },
        { id: "bleed", label: "Bleed chance", unit: "PERCENT", values: [GORILLA_BLEED_BASE_CHANCE].concat(GORILLA_BLEED_TIERS), nodes: GORILLA_BLEED_TIERS.map(function (_, i) { return "upgrade_bleed_" + (i + 1); }), condition: "Per hit" },
        { id: "slam_threshold", label: "stat.project_edgerunner.gorilla.slam_threshold", unit: "PERCENT", values: [0, 50], nodes: ["upgrade_special_slam"], condition: "stat.project_edgerunner.gorilla_condition.slam" },
        { id: "fury_hit", label: "stat.project_edgerunner.gorilla.fury_hit", unit: "PERCENT", values: [0, 9], nodes: ["upgrade_special_fury"], condition: "stat.project_edgerunner.gorilla_condition.per_hit" },
        { id: "fury_rush", label: "stat.project_edgerunner.gorilla.fury_rush", unit: "PERCENT", values: [0, 14], nodes: ["upgrade_special_fury"], condition: "stat.project_edgerunner.gorilla_condition.rush" },
        { id: "fury_hold", label: "stat.project_edgerunner.gorilla.fury_hold", unit: "SECONDS", values: [0, 15], nodes: ["upgrade_special_fury"], condition: "stat.project_edgerunner.gorilla_condition.hold" },
        { id: "fury_decay", label: "stat.project_edgerunner.gorilla.fury_decay", unit: "SECONDS", values: [0, 20], nodes: ["upgrade_special_fury"], lower_is_better: true, condition: "stat.project_edgerunner.gorilla_condition.decay" },
        { id: "fury_style", label: "stat.project_edgerunner.gorilla.fury_style", unit: "PERCENT", values: [0, 60], nodes: ["upgrade_fury_style"], condition: "stat.project_edgerunner.gorilla_condition.style" },
        { id: "blow_charge", label: "stat.project_edgerunner.gorilla.blow_charge", unit: "SECONDS", values: [0, 1.5], nodes: ["upgrade_fury_blow"], condition: "stat.project_edgerunner.gorilla_condition.blow" },
        { id: "breaker_reach", label: "stat.project_edgerunner.gorilla.breaker_reach", unit: "BLOCKS", values: [0, 6], nodes: ["upgrade_fury_breaker"], condition: "stat.project_edgerunner.gorilla_condition.breaker" },
        { id: "breaker_damage", label: "stat.project_edgerunner.gorilla.breaker_damage", unit: "PERCENT", values: [0, 130], nodes: ["upgrade_fury_breaker"], condition: "stat.project_edgerunner.gorilla_condition.breaker" }
    ].filter(function (stat) {
        return stat.nodes.every(function (id) { return !!abilities[id]; });
    });
    return {
        name: GORILLA_ARMS.name,
        persistent_data: true,
        background: "minecraft:textures/block/warped_stem.png",
        ability_bar_texture: "project_edgerunner:textures/gui/ability_bar.png",
        icon: itemIcon,
        gui_display_type: "tree",
        edgerunner_stats: stats,
        abilities: abilities
    };
}

const gorillaIcon = "project_edgerunner:textures/item/gorilla_arms_item.png";

ServerEvents.highPriorityData(function (event) {
    global.addLocalizedPowerJson(event, "project_edgerunner:palladium/powers/gorilla_arms", buildGorillaPower(gorillaIcon));
});

if (!global.registerCyberwareInstallComponent) {
    throw new Error("[Cyberpunk/Cyberware] Install registry not loaded before gorilla arms registration.");
}

global.registerCyberwareInstallComponent({
    item: GORILLA_ARMS.itemId,
    name: GORILLA_ARMS.name,
    type: GORILLA_ARMS.type,
    body_slot: GORILLA_ARMS.bodySlot,
    activation_slot: GORILLA_ARMS.activationSlot,
    activation_mode: GORILLA_ARMS.activationMode,
    load_cost: GORILLA_ARMS.loadCost,
    palladium_power: "project_edgerunner:gorilla_arms",
    install_message: "Gorilla Arms installed.",
    remove_message: "Gorilla Arms removed."
});
