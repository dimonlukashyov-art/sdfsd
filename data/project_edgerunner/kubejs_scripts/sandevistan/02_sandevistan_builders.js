// priority: 80
// Server script: Sandevistan power/item builders.
const helpers = global.SANDEVISTAN_HELPERS || {};
const helperBuildBranches = helpers.buildBranches;
const helperBuildBranchTierDescription = helpers.buildBranchTierDescription;
const helperBuildBaseDescription = helpers.buildBaseDescription;
const helperBuildSpecialBranchTierDescription = helpers.buildSpecialBranchTierDescription;
const helperBuildSpecialBaseDescription = helpers.buildSpecialBaseDescription;
const helperGetBaseUpgradeValue = helpers.getBaseUpgradeValue;
const helperGetBranchTierConditions = helpers.getBranchTierConditions;
const helperGetCenteredBranchX = helpers.getCenteredBranchX;
const helperBuildBaseTitle = helpers.buildBaseTitle;
const helperBuildTierTitle = helpers.buildTierTitle;
const helperBuildUnlockTitle = helpers.buildUnlockTitle;
const helperGetCyberwareVisualLayout = helpers.getCyberwareVisualLayout;
const helperGetRomanNumeral = helpers.getRomanNumeral;
const helperGetUpgradeData = helpers.getUpgradeData;
const SANDEVISTAN_VISUAL_LAYOUT = helperGetCyberwareVisualLayout
    ? helperGetCyberwareVisualLayout()
    : { rootY: 0.375, baseRowY: -0.375, stepX: 1.0, stepY: 0.56, specialUnlockY: 0.625, specialTierStartOffset: 0.56 };
const SANDEVISTAN_SPEED_FOV_SAFE_UUID = "93142d2b-ec75-4865-a4c4-4d6e4b445fbf";
const SANDEVISTAN_ENERGY_TIMEBASE_TPS = 20;
const SANDEVISTAN_SPARKS_BURST_TICKS = 10;

const SANDEVISTAN_DIRECT_STAT_BINDINGS = {
    damage: {
        attribute: "minecraft:generic.attack_damage",
        operation: 1,
        toAmount: function (value) { return value / 100; }
    },
    // Canonical stat id.
    knockback_resistance: {
        attribute: "minecraft:generic.knockback_resistance",
        operation: 0,
        toAmount: function (value) { return Math.min(1, Math.max(0, value / 100)); }
    },
    // Legacy alias to avoid hard breaks in older data/saves.
    mitigation_chance: {
        attribute: "minecraft:generic.knockback_resistance",
        operation: 0,
        toAmount: function (value) { return Math.min(1, Math.max(0, value / 100)); }
    },
    mitigation_strength: {
        attribute: "minecraft:generic.armor_toughness",
        operation: 0,
        toAmount: function (value) { return value / 4; }
    }
};

function getInternalPartsItemId(tier) {
    var safeTier = Math.max(1, Math.min(5, Number(tier) || 1));
    return "project_edgerunner:cyberware_internal_parts_t" + safeTier;
}

function hash32(text, seed) {
    var h = (0x811c9dc5 ^ seed) >>> 0;
    for (var i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
}

function toHex8(num) {
    var hex = (num >>> 0).toString(16);
    return ("00000000" + hex).slice(-8);
}

function sandevistanStableUuid(seed) {
    var text = String(seed || "");
    var h1 = hash32(text, 0x00000000);
    var h2 = hash32(text, 0x9e3779b9);
    var h3 = hash32(text, 0x85ebca6b);
    var h4 = hash32(text, 0xc2b2ae35);

    var p1 = toHex8(h1);
    var p2 = toHex8(h2);
    var p3 = toHex8(h3);
    var p4 = toHex8(h4);

    return p1 + "-" + p2.slice(0, 4) + "-" + p2.slice(4, 8) + "-" + p3.slice(0, 4) + "-" + p3.slice(4, 8) + p4;
}

function getSpecialUpgradeAbilityId(branchId, tierIndex) {
    return "upgrade_special_" + branchId + "_" + tierIndex;
}

function buildSpecialBranchTitle(branch, tierIndex) {
    if ((branch.tierCount || 0) > 1) {
        return helperBuildTierTitle ? helperBuildTierTitle(branch.label, tierIndex) : branch.label + " " + helperGetRomanNumeral(tierIndex);
    }
    return branch.label;
}

function getBaseRowSpecialBalance(specialTree) {
    var balance = {
        left: 0,
        right: 0
    };
    var branches = (specialTree && specialTree.branches) || [];
    branches.forEach(function (branch) {
        if (String(branch && branch.anchorMode || "") !== "base_branch") {
            return;
        }
        var side = Number(branch.anchorSide || 0);
        if (side < 0) {
            balance.left++;
        } else if (side > 0) {
            balance.right++;
        }
    });
    return balance;
}

function getMainBranchOffset(branches, specialTree, stepX) {
    var count = (branches || []).length;
    if (count <= 0 || (count % 2) !== 0) {
        return 0;
    }
    var balance = getBaseRowSpecialBalance(specialTree);
    var delta = balance.left - balance.right;
    if (Math.abs(delta) !== 1) {
        return 0;
    }
    return delta > 0 ? (stepX / 2) : -(stepX / 2);
}

function getMainBranchLayouts(branches, specialTree) {
    var layouts = {};
    var stepX = SANDEVISTAN_VISUAL_LAYOUT.stepX;
    var stepY = SANDEVISTAN_VISUAL_LAYOUT.stepY;
    var baseY = SANDEVISTAN_VISUAL_LAYOUT.baseRowY;
    var upgradeStartY = baseY - stepY;
    var mainBranchOffset = getMainBranchOffset(branches, specialTree, stepX);

    (branches || []).forEach(function (branch, branchIndex) {
        var xPos = helperGetCenteredBranchX
            ? helperGetCenteredBranchX(branchIndex, branches.length, stepX)
            : ((branchIndex * stepX) - (((branches.length - 1) * stepX) / 2));
        xPos += mainBranchOffset;
        layouts[branch.id] = {
            xPos: xPos,
            tierCount: Number(branch.tierCount || 0),
            baseY: baseY,
            upgradeStartY: upgradeStartY
        };
    });

    return layouts;
}

function getMainBranchRange(branchLayouts) {
    var hasValue = false;
    var minX = 0;
    var maxX = 0;
    Object.keys(branchLayouts || {}).forEach(function (branchId) {
        var layout = branchLayouts[branchId];
        if (!layout) {
            return;
        }
        var xPos = Number(layout.xPos || 0);
        if (!hasValue) {
            minX = xPos;
            maxX = xPos;
            hasValue = true;
            return;
        }
        minX = Math.min(minX, xPos);
        maxX = Math.max(maxX, xPos);
    });
    return {
        hasValue: hasValue,
        minX: minX,
        maxX: maxX
    };
}

function resolveSpecialBranchLayout(branch, branchLayouts, branchIndex, branchCount) {
    var stepX = SANDEVISTAN_VISUAL_LAYOUT.stepX;
    var stepY = SANDEVISTAN_VISUAL_LAYOUT.stepY;
    var baseY = SANDEVISTAN_VISUAL_LAYOUT.baseRowY;
    var branchRange = getMainBranchRange(branchLayouts);
    var anchorLayout = branch && branch.anchorBranchId ? branchLayouts[branch.anchorBranchId] : null;

    if (String(branch && branch.anchorMode || "") === "base_branch" && branchRange.hasValue) {
        var branchSide = Number(branch.anchorSide || 0);
        if (branchSide === 0) {
            branchSide = -1;
        }
        branchSide = branchSide < 0 ? -1 : 1;
        var branchOrder = Math.max(1, Number(branch.branchOrder || 1));
        return {
            xPos: branchSide < 0
                ? branchRange.minX - (branchOrder * stepX)
                : branchRange.maxX + (branchOrder * stepX),
            unlockY: baseY
        };
    }

    if (anchorLayout) {
        var anchorTier = Math.max(0, Number(branch.anchorTier || 0));
        var maxAnchorTier = Math.max(0, Number(anchorLayout.tierCount || 0));
        if (maxAnchorTier > 0) {
            anchorTier = Math.min(Math.max(1, anchorTier || 1), maxAnchorTier);
        } else {
            anchorTier = 0;
        }

        var anchorSide = Number(branch.anchorSide || 0);
        if (anchorSide === 0) {
            anchorSide = anchorLayout.xPos <= 0 ? -1 : 1;
        }
        anchorSide = anchorSide < 0 ? -1 : 1;

        return {
            xPos: anchorLayout.xPos + (anchorSide * (stepX / 2)),
            unlockY: anchorTier <= 0
                ? baseY
                : anchorLayout.upgradeStartY - ((anchorTier - 1) * stepY)
        };
    }

    return {
        xPos: helperGetCenteredBranchX
            ? helperGetCenteredBranchX(branchIndex, branchCount, stepX)
            : ((branchIndex * stepX) - (((branchCount - 1) * stepX) / 2)),
        unlockY: baseY - stepY
    };
}

function buildSpecialStandaloneNodes(abilities, variant, specialTree, regularBranchCount, internalPartsItem, branchLayouts) {
    var branches = (specialTree && specialTree.branches) || [];
    if (branches.length === 0) {
        return;
    }

    var stepY = SANDEVISTAN_VISUAL_LAYOUT.stepY;

    branches.forEach(function (branch, branchIndex) {
        var layout = resolveSpecialBranchLayout(branch, branchLayouts, branchIndex, branches.length);
        var xPos = layout.xPos;
        var unlockY = layout.unlockY;
        var unlockId = "unlock_special_" + branch.id;
        var anchorAbility = unlockId;
        var firstTierY = unlockY - stepY;

        abilities[unlockId] = {
            "type": "palladium:command",
            "icon": branch.icon,
            "title": helperBuildUnlockTitle ? helperBuildUnlockTitle(branch.label) : ("Unlock " + branch.label),
            "description": branch.baseActive
                ? helperBuildSpecialBaseDescription(branch)
                : (branch.unlockDescription || ("Unlock " + branch.label + ".")),
            "list_index": -1,
            "gui_position": [xPos, unlockY],
            "hidden_in_bar": true,
            "first_tick_commands": [],
            "last_tick_commands": [],
            "commands": [],
            "conditions": {
                "enabling": [
                    { "type": "palladium:true" }
                ],
                "unlocking": [
                    {
                        "type": "palladium:ability_unlocked",
                        "power": variant.powerId,
                        "ability": "Sandevistan"
                    }
                ]
            }
        };

        for (var tierIndex = 1; tierIndex <= (branch.tierCount || 0); tierIndex++) {
            var unlockConditions = [{
                "type": "palladium:ability_unlocked",
                "power": variant.powerId,
                "ability": anchorAbility
            }];
            if (tierIndex > 1) {
                unlockConditions.push({
                    "type": "palladium:ability_unlocked",
                    "power": variant.powerId,
                    "ability": getSpecialUpgradeAbilityId(branch.id, tierIndex - 1)
                });
            }
            unlockConditions.push({
                "type": "palladium:item_buyable",
                "ingredient": {
                    "item": internalPartsItem
                },
                "amount": 1
            });
            abilities[getSpecialUpgradeAbilityId(branch.id, tierIndex)] = {
                "type": "palladium:command",
                "icon": branch.icon,
                "title": buildSpecialBranchTitle(branch, tierIndex),
                "description": helperBuildSpecialBranchTierDescription(branch, tierIndex),
                "list_index": -1,
                "gui_position": [xPos, firstTierY - ((tierIndex - 1) * stepY)],
                "hidden_in_bar": true,
                "first_tick_commands": [],
                "last_tick_commands": [],
                "commands": [],
                "conditions": {
                    "enabling": [
                        { "type": "palladium:true" }
                    ],
                    "unlocking": unlockConditions
                }
            };
        }
    });
}

function buildSpecialTreeNodes(abilities, variant, specialTree, regularBranchCount, internalPartsItem, branchLayouts) {
    if (!specialTree || !specialTree.branches || specialTree.branches.length === 0) {
        return;
    }
    buildSpecialStandaloneNodes(abilities, variant, specialTree, regularBranchCount, internalPartsItem, branchLayouts);
}

function buildVariants(rawVariants) {
    return (rawVariants || [])
        .map(function (v) {
            const baseDurationSeconds = helperGetBaseUpgradeValue(v.id, "durationSeconds", v.durationSeconds);
            const baseCooldownSeconds = helperGetBaseUpgradeValue(v.id, "cooldownSeconds", v.cooldownSeconds);
            const computed = {
                tickrate: 20,
                // Cooldown siempre a velocidad normal (20 ticks/s)
                baseCooldownSeconds: baseCooldownSeconds,
                cooldownTicks: (baseCooldownSeconds !== undefined) ? Math.round(baseCooldownSeconds * 20) : 600,
                // Duracion energetica en ticks efectivos del Sandevistan.
                baseDurationSeconds: baseDurationSeconds,
                durationTicks: (baseDurationSeconds !== undefined) ? Math.round(baseDurationSeconds * SANDEVISTAN_ENERGY_TIMEBASE_TPS) : 60
            };
            return Object.assign({}, v, computed);
        })
        .filter(function (v) { return v.powerId && v.itemId; });
}

function buildPower(variant) {
    const upgradeData = helperGetUpgradeData(variant);
    const internalPartsItem = getInternalPartsItemId(variant.tier);
    // ========== SISTEMA DE ENERGIA CON SCOREBOARD ==========
    // Escala: 0 a 10000 (representa 0% a 100%)
    const maxScore = 10000;
    const activationCostPercent = (variant.activationCostPercent !== undefined) ? variant.activationCostPercent : 0.15;
    const activationCost = Math.round(maxScore * activationCostPercent);
    const energyAfterActivation = maxScore - activationCost;

    // Condiciones para activar el Sandevistan
    var enablingConditions = [
        {
            "type": "palladium:action",
            "cooldown": 0,
            "key_type": "key_bind",
            "needs_empty_hand": false,
            "allow_scrolling_when_crouching": true
        }
    ];

    // Informacion tecnica para la descripcion
    const slowPercent = Math.round((variant.slowPercent || 0) * 100);
    const itemName = variant.itemId.replace(/^[^:]+:/, '');
    const itemIcon = "project_edgerunner:textures/item/" + itemName + "_item.png";
    const sandevistanRenderLayer = "project_edgerunner:" + itemName;

    var descriptionLines = [
        "Activate the Sandevistan and slow time.",
        "Check the tree for stats and upgrades."
    ];
    var abilities = {
        // ========== HABILIDAD PRINCIPAL ==========
        "Sandevistan": {
            "type": "kubejs:cyberpunk/sandevistan_toggle",
            "list_index": 0,
            "icon": itemIcon,
            "title": "Sandevistan",
            "hidden_in_bar": true,
            "description": descriptionLines.join("\n"),
            "commands": [],
            "gui_position": [0, SANDEVISTAN_VISUAL_LAYOUT.rootY],
            "conditions": {
                "enabling": enablingConditions,
                "unlocking": []
            }
        },
        // ========== INICIALIZACION DEL SCOREBOARD ==========
        "energy_init": {
            "type": "palladium:command",
            "hidden": true,
            "hidden_in_bar": true,
            "first_tick_commands": [
                "execute unless score @s er_sandy_charge matches -2147483648..2147483647 run scoreboard players set @s er_sandy_charge " + maxScore
            ],
            "commands": [],
            "conditions": {
                "enabling": [
                    { "type": "palladium:true" }
                ],
                "unlocking": []
            }
        },
        // ========== LEGACY ENTRIES (removed at the end of the builder) ==========
        "sandevistan_tickrate": {
            "type": "palladium:command",
            "hidden": true,
            "hidden_in_bar": true,
            "first_tick_commands": [],
            "last_tick_commands": [],
            "commands": [],
            "conditions": {
                "enabling": [
                    {
                        "type": "palladium:ability_enabled",
                        "power": "null",
                        "ability": "Sandevistan"
                    }
                ],
                "unlocking": []
            }
        },
        // ========== EFECTOS DE ACTIVACION (sonido, energia, etc.) ==========
        "sandevistan_effects": {
            "type": "palladium:command",
            "hidden": true,
            "hidden_in_bar": true,
            "first_tick_commands": [
                // Si NO tienes suficiente energia: dano
                "execute if score @s er_sandy_charge matches .." + (activationCost - 1) + " run effect give @s minecraft:instant_damage 1 0 true",
                // Coste de activacion: se descuenta siempre al activar
                "scoreboard players remove @s er_sandy_charge " + activationCost,
                "execute if score @s er_sandy_charge matches ..-1 run scoreboard players set @s er_sandy_charge 0",
                "tag @s add er_sandy_sparks_burst"
            ],
            "last_tick_commands": [
                "tag @s add er_sandy_sparks_burst",
                "scoreboard players set @s er_sandy_exhaust 20"
            ],
            "commands": [],
            "conditions": {
                "enabling": [
                    {
                        "type": "palladium:ability_enabled",
                        "power": "null",
                        "ability": "Sandevistan"
                    }
                ],
                "unlocking": []
            }
        },
        "sandevistan_speed": {
            "type": "palladium:attribute_modifier",
            "icon": "minecraft:sugar",
            "title": "Sandevistan Speed",
            "hidden": true,
            "hidden_in_bar": true,
            "description": "Boosted movement speed while Sandevistan is active.",
            "attribute": "minecraft:generic.movement_speed",
            "uuid": SANDEVISTAN_SPEED_FOV_SAFE_UUID,
            "amount": 0,
            "operation": 1,
            "conditions": {
                "enabling": [
                    {
                        "type": "palladium:ability_enabled",
                        "power": variant.powerId,
                        "ability": "Sandevistan"
                    }
                ],
                "unlocking": []
            }
        },
        "sandevistan_attack_speed": {
            "type": "palladium:attribute_modifier",
            "icon": "minecraft:golden_sword",
            "title": "Sandevistan Attack Speed",
            "hidden": true,
            "hidden_in_bar": true,
            "description": "Boosted attack speed while Sandevistan is active.",
            "attribute": "minecraft:generic.attack_speed",
            "uuid": sandevistanStableUuid(variant.powerId + "|sandevistan_attack_speed|minecraft:generic.attack_speed"),
            "amount": 0,
            "operation": 1,
            "conditions": {
                "enabling": [
                    {
                        "type": "palladium:ability_enabled",
                        "power": variant.powerId,
                        "ability": "Sandevistan"
                    }
                ],
                "unlocking": []
            }
        },
        "sandevistan_lightning_sparks": {
            "type": "palladium:render_layer",
            "hidden": true,
            "hidden_in_bar": true,
            "render_layer": "project_edgerunner:sandevistan_lightning_sparks",
            "conditions": {
                "enabling": [
                    {
                        "type": "palladium:has_tag",
                        "tag": "er_sandy_sparks_burst"
                    }
                ],
                "unlocking": []
            }
        },
        "sandevistan_lightning_sparks_window": {
            "type": "palladium:command",
            "hidden": true,
            "hidden_in_bar": true,
            "first_tick_commands": [],
            "last_tick_commands": [],
            "commands": [],
            "conditions": {
                "enabling": [
                    {
                        "type": "palladium:has_tag",
                        "tag": "er_sandy_sparks_burst"
                    }
                ],
                "unlocking": []
            }
        },
        "sandevistan_lightning_sparks_cleanup": {
            "type": "palladium:command",
            "hidden": true,
            "hidden_in_bar": true,
            "first_tick_commands": [],
            "last_tick_commands": [],
            "commands": [
                "tag @s remove er_sandy_sparks_burst"
            ],
            "conditions": {
                "enabling": [
                    {
                        "type": "palladium:has_tag",
                        "tag": "er_sandy_sparks_burst"
                    },
                    {
                        "type": "palladium:ability_ticks",
                        "power": variant.powerId,
                        "ability": "sandevistan_lightning_sparks_window",
                        "min": SANDEVISTAN_SPARKS_BURST_TICKS,
                        "max": 2147483647
                    }
                ],
                "unlocking": []
            }
        },
        "render": {
            "type": "palladium:render_layer",
            "icon": "minecraft:blaze_rod",
            "title": "Sandevistan Render",
            "bar_color": "light_gray",
            "hidden": true,
            "hidden_in_bar": true,
            "list_index": -1,
            "gui_position": [0, 0],
            "description": "",
            "render_layer": sandevistanRenderLayer,
            "conditions": {
                "enabling": [],
                "unlocking": []
            }
        },
        "sandevistan_exhaust_timer_tick": {
            "type": "palladium:command",
            "hidden": true,
            "hidden_in_bar": true,
            "first_tick_commands": [],
            "last_tick_commands": [],
            "commands": [],
            "conditions": {
                "enabling": [
                    {
                        "type": "palladium:true"
                    }
                ],
                "unlocking": []
            }
        },
        "sandevistan_exhaust_core": {
            "type": "palladium:particles",
            "hidden": true,
            "hidden_in_bar": true,
            "particle_type": "minecraft:cloud",
            "options": "",
            "emitter": [
                "project_edgerunner:sandevistan_exhaust_core"
            ],
            "conditions": {
                "enabling": [
                    {
                        "type": "palladium:objective_score",
                        "objective": "er_sandy_exhaust",
                        "min_score": 1
                    }
                ],
                "unlocking": []
            }
        }
    };

    abilities["sandevistan_afterimage_score"] = {
        "type": "palladium:command",
        "hidden": true,
        "hidden_in_bar": true,
        "first_tick_commands": [
            "scoreboard players set @s er_sandy_active 1"
        ],
        "last_tick_commands": [
            "scoreboard players set @s er_sandy_active 0"
        ],
        "commands": [
            "scoreboard players set @s er_sandy_active 1"
        ],
        "conditions": {
            "enabling": [
                {
                    "type": "palladium:ability_enabled",
                    "power": variant.powerId,
                    "ability": "Sandevistan"
                }
            ],
            "unlocking": []
        }
    };

    var durationTierCount = upgradeData.duration.tierCount;
    for (var tier = 0; tier <= durationTierCount; tier++) {
        var durationSeconds = upgradeData.duration.values[tier];
        var timebaseTicks = Math.max(1, Math.round(durationSeconds * SANDEVISTAN_ENERGY_TIMEBASE_TPS));
        var baseDrainPerTick = energyAfterActivation / timebaseTicks;
        var drainPerTick = Math.max(1, Math.ceil(baseDrainPerTick));
        var tierConditions = helperGetBranchTierConditions(variant.powerId, "duration", tier, durationTierCount);
        var drainEnabling = [{
            "type": "palladium:ability_enabled",
            "power": variant.powerId,
            "ability": "Sandevistan"
        }].concat(tierConditions);

        abilities["energy_drain_duration_tier_" + tier] = {
            "type": "palladium:command",
            "hidden": true,
            "hidden_in_bar": true,
            "commands": [
                "scoreboard players remove @s er_sandy_charge " + drainPerTick,
                "execute if score @s er_sandy_charge matches ..-1 run scoreboard players set @s er_sandy_charge 0"
            ],
            "conditions": {
                "enabling": drainEnabling,
                "unlocking": []
            }
        };
    }

    var cooldownTierCount = upgradeData.cooldown.tierCount;
    for (var cooldownTier = 0; cooldownTier <= cooldownTierCount; cooldownTier++) {
        var cooldownSeconds = upgradeData.cooldown.values[cooldownTier];
        var cooldownTicks = Math.max(1, Math.round(cooldownSeconds * 20));
        var rechargePerTick = Math.max(1, Math.ceil(maxScore / cooldownTicks));
        var cooldownConditions = helperGetBranchTierConditions(variant.powerId, "cooldown", cooldownTier, cooldownTierCount);
        var rechargeEnabling = [{
            "type": "palladium:not",
            "conditions": [
                {
                    "type": "palladium:ability_enabled",
                    "power": variant.powerId,
                    "ability": "Sandevistan"
                }
            ]
        }].concat(cooldownConditions);

        abilities["energy_recharge_cooldown_tier_" + cooldownTier] = {
            "type": "palladium:command",
            "hidden": true,
            "hidden_in_bar": true,
            "commands": [
                "execute if score @s er_sandy_charge matches .." + (maxScore - 1) + " run scoreboard players add @s er_sandy_charge " + rechargePerTick,
                "execute if score @s er_sandy_charge matches " + (maxScore + 1) + ".. run scoreboard players set @s er_sandy_charge " + maxScore
            ],
            "conditions": {
                "enabling": rechargeEnabling,
                "unlocking": []
            }
        };
    }

    // Bind upgrade stats that have a direct vanilla attribute mapping.
    upgradeData.stats.forEach(function (stat) {
        var binding = SANDEVISTAN_DIRECT_STAT_BINDINGS[stat.id];
        if (!binding) {
            return;
        }
        var maxTier = stat.tierCount;
        for (var statTier = 0; statTier <= maxTier; statTier++) {
            var statValue = stat.values[statTier];
            var amount = binding.toAmount(statValue);
            var abilityId = "upgrade_attr_" + stat.id + "_tier_" + statTier;
            var enabling = [{
                "type": "palladium:ability_enabled",
                "power": variant.powerId,
                "ability": "Sandevistan"
            }].concat(helperGetBranchTierConditions(variant.powerId, "stat_" + stat.id, statTier, maxTier));

            abilities[abilityId] = {
                "type": "palladium:attribute_modifier",
                "hidden": true,
                "hidden_in_bar": true,
                "attribute": binding.attribute,
                "uuid": sandevistanStableUuid(variant.powerId + "|" + abilityId + "|" + binding.attribute),
                "amount": amount,
                "operation": binding.operation,
                "conditions": {
                    "enabling": enabling,
                    "unlocking": []
                }
            };
        }
    });

    var branches = helperBuildBranches(upgradeData, slowPercent);
    var branchLayouts = getMainBranchLayouts(branches, upgradeData.specialTree);
    if (branches.length > 0) {
        var stepX = SANDEVISTAN_VISUAL_LAYOUT.stepX;
        var stepY = SANDEVISTAN_VISUAL_LAYOUT.stepY;
        var baseY = SANDEVISTAN_VISUAL_LAYOUT.baseRowY;
        var upgradeStartY = baseY - stepY;
        var mainBranchOffset = getMainBranchOffset(branches, upgradeData.specialTree, stepX);
        branches.forEach(function (branch, branchIndex) {
            var xPos = helperGetCenteredBranchX
                ? helperGetCenteredBranchX(branchIndex, branches.length, stepX)
                : ((branchIndex * stepX) - (((branches.length - 1) * stepX) / 2));
            xPos += mainBranchOffset;
            var baseId = "base_" + branch.id;
            abilities[baseId] = {
                "type": "palladium:command",
                "icon": branch.icon,
                "title": helperBuildBaseTitle ? helperBuildBaseTitle(branch.label) : ("Base " + branch.label),
                "description": helperBuildBaseDescription(branch),
                "list_index": -1,
                "gui_position": [xPos, baseY],
                "hidden_in_bar": true,
                "first_tick_commands": [],
                "last_tick_commands": [],
                "commands": [],
                "conditions": {
                    "enabling": [
                        { "type": "palladium:true" }
                    ],
                    "unlocking": [
                        {
                            "type": "palladium:ability_unlocked",
                            "power": variant.powerId,
                            "ability": "Sandevistan"
                        }
                    ]
                }
            };
            for (var tierIndex = 1; tierIndex <= branch.tierCount; tierIndex++) {
                var unlockConditions = [
                    {
                        "type": "palladium:ability_unlocked",
                        "power": variant.powerId,
                        "ability": baseId
                    }
                ];
                if (tierIndex > 1) {
                    unlockConditions.push({
                        "type": "palladium:ability_unlocked",
                        "power": variant.powerId,
                        "ability": "upgrade_" + branch.id + "_" + (tierIndex - 1)
                    });
                }
                unlockConditions.push({
                    "type": "palladium:item_buyable",
                    "ingredient": {
                        "item": internalPartsItem
                    },
                    "amount": 1
                });
                abilities["upgrade_" + branch.id + "_" + tierIndex] = {
                    "type": "palladium:command",
                    "icon": branch.icon,
                    "title": helperBuildTierTitle ? helperBuildTierTitle(branch.label, tierIndex) : (branch.label + " " + helperGetRomanNumeral(tierIndex)),
                    "description": helperBuildBranchTierDescription(branch, tierIndex),
                    "list_index": -1,
                    "gui_position": [xPos, upgradeStartY - (tierIndex - 1) * stepY],
                    "hidden_in_bar": true,
                    "first_tick_commands": [],
                    "last_tick_commands": [],
                    "commands": [],
                    "conditions": {
                        "enabling": [
                            { "type": "palladium:true" }
                        ],
                        "unlocking": unlockConditions
                    }
                };
            }
        });
    }

    buildSpecialTreeNodes(
        abilities,
        variant,
        upgradeData.specialTree,
        branches.length,
        internalPartsItem,
        branchLayouts,
    );

    var powerExtras = (global.CYBERPUNK_POWER_ABILITIES && global.CYBERPUNK_POWER_ABILITIES[variant.powerId]) || null;
    if (powerExtras) {
        Object.keys(powerExtras).forEach(function (abilityId) {
            abilities[abilityId] = powerExtras[abilityId];
        });
    }

    delete abilities["sandevistan_tickrate"];
    delete abilities["sandevistan_effects"];
    delete abilities["sandevistan_speed"];
    delete abilities["sandevistan_attack_speed"];
    delete abilities["sandevistan_afterimage_score"];
    delete abilities["sandevistan_lightning_sparks_window"];
    delete abilities["sandevistan_lightning_sparks_cleanup"];
    Object.keys(abilities).forEach(function (abilityId) {
        if (abilityId.startsWith("energy_drain_duration_tier_") || abilityId.startsWith("energy_recharge_cooldown_tier_")) {
            delete abilities[abilityId];
        }
    });

    return {
        name: variant.powerTitle,
        persistent_data: true,
        background: "minecraft:textures/block/warped_stem.png",
        ability_bar_texture: "project_edgerunner:textures/gui/ability_bar.png",
        icon: itemIcon,
        gui_display_type: "tree",
        abilities: abilities
    };
}

function buildRuntimeDescriptor(variant) {
    const upgradeData = helperGetUpgradeData(variant);
    const descriptor = {
        variantId: variant.id,
        powerId: variant.powerId,
        itemId: variant.itemId,
        slowPct: (variant.slowPercent !== undefined) ? variant.slowPercent : 0,
        slowPercent: Math.round((variant.slowPercent || 0) * 100),
        activationCostPercent: (variant.activationCostPercent !== undefined) ? variant.activationCostPercent : 0.15,
        tickrate: variant.tickrate || 20,
        duration: {
            tierCount: upgradeData.duration.tierCount,
            decimals: upgradeData.duration.decimals,
            suffix: "s",
            values: upgradeData.duration.values
        },
        cooldown: {
            tierCount: upgradeData.cooldown.tierCount,
            decimals: upgradeData.cooldown.decimals,
            suffix: "s",
            values: upgradeData.cooldown.values
        },
        stats: upgradeData.stats.map(function (stat) {
            return {
                id: stat.id,
                label: stat.label,
                decimals: stat.decimals || 0,
                suffix: stat.suffix || "",
                tierCount: stat.tierCount,
                values: stat.values
            };
        }),
        specialBranches: ((upgradeData.specialTree && upgradeData.specialTree.branches) || []).map(function (branch) {
            return {
                id: branch.id,
                effectType: branch.effectType || "",
                baseActive: !!branch.baseActive,
                tierCount: Number(branch.tierCount || 0),
                values: Array.isArray(branch.values) ? branch.values.slice(0) : []
            };
        }),
        specialLines: upgradeData.specialLines.slice(0)
    };
    return descriptor;
}

global.SANDEVISTAN_BUILDERS = {
    buildVariants: buildVariants,
    buildPower: buildPower,
    buildRuntimeDescriptor: buildRuntimeDescriptor
};
