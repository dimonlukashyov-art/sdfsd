// priority: 60
// Server script: Axolotl cyberware (Frontal Cortex, passive cooldown reducer on neutralize).

const AXOLOTL = {
    id: "axolotl",
    name: "Axolotl",
    itemId: "project_edgerunner:axolotl",
    type: "frontal_cortex",
    bodySlot: "frontal_cortex",
    activationMode: "passive",
    loadCost: 62,
    tier: 4,
    rarity: "epic",
    minCooldownReductionPercent: 5.0,
    maxCooldownReductionPercent: 7.5
};
const AXOLOTL_INTERNAL_PARTS_ITEM = "project_edgerunner:cyberware_internal_parts_t4";

// Standard tree layout for cyberware:
// - all base nodes share one Y row
// - upgrades are placed above their base node by fixed row steps
const AXOLOTL_TREE_LAYOUT = {
    rootY: 0.375,
    baseRowY: -0.375,
    triggerX: -0.5,
    reductionX: 0.5,
    upgradeStepY: 0.56
};

function buildAxolotlDescription() {
    return [
        "Passive implant.",
        "After neutralizing an enemy, reduces cyberware cooldowns.",
        "Core stats are listed in fixed base nodes."
    ].join("\n");
}

function buildAxolotlBaseStatAbilities() {
    return {
        axolotl_base_trigger: {
            type: "palladium:command",
            icon: "minecraft:iron_sword",
            title: "Base Trigger",
            description: "Effect triggers on enemy neutralization (fixed).",
            list_index: -1,
            gui_position: [AXOLOTL_TREE_LAYOUT.triggerX, AXOLOTL_TREE_LAYOUT.baseRowY],
            hidden_in_bar: true,
            first_tick_commands: [],
            last_tick_commands: [],
            commands: [],
            conditions: {
                enabling: [{ type: "palladium:true" }],
                unlocking: [{
                    type: "palladium:ability_unlocked",
                    ability: "axolotl_core"
                }]
            }
        },
        axolotl_base_cooldown_reduction: {
            type: "palladium:command",
            icon: "minecraft:clock",
            title: "Base Reduction",
            description: "Cooldown reduction: -" + AXOLOTL.minCooldownReductionPercent + "% (fixed).",
            list_index: -1,
            gui_position: [AXOLOTL_TREE_LAYOUT.reductionX, AXOLOTL_TREE_LAYOUT.baseRowY],
            hidden_in_bar: true,
            first_tick_commands: [],
            last_tick_commands: [],
            commands: [],
            conditions: {
                enabling: [{ type: "palladium:true" }],
                unlocking: [{
                    type: "palladium:ability_unlocked",
                    ability: "axolotl_core"
                }]
            }
        }
    };
}

function buildAxolotlUpgradeAbilities() {
    return {
        axolotl_upgrade_cooldown_max: {
            type: "palladium:command",
            icon: "minecraft:clock",
            title: "Cooldown I",
            description: "Upgrade: cooldown reduction becomes -" + AXOLOTL.maxCooldownReductionPercent + "%.",
            list_index: -1,
            gui_position: [
                AXOLOTL_TREE_LAYOUT.reductionX,
                AXOLOTL_TREE_LAYOUT.baseRowY - AXOLOTL_TREE_LAYOUT.upgradeStepY
            ],
            hidden_in_bar: true,
            first_tick_commands: [],
            last_tick_commands: [],
            commands: [],
            conditions: {
                enabling: [{ type: "palladium:true" }],
                unlocking: [
                    {
                        type: "palladium:ability_unlocked",
                        ability: "axolotl_base_cooldown_reduction"
                    },
                    {
                        type: "palladium:item_buyable",
                        ingredient: {
                            item: AXOLOTL_INTERNAL_PARTS_ITEM
                        },
                        amount: 1
                    }
                ]
            }
        }
    };
}

function buildAxolotlAbilities(itemIcon) {
    return Object.assign(
        {
            axolotl_core: {
                type: "palladium:command",
                icon: itemIcon,
                title: AXOLOTL.name,
                description: buildAxolotlDescription(),
                bar_color: "purple",
                hidden: false,
                hidden_in_bar: true,
                list_index: 0,
                gui_position: [0, AXOLOTL_TREE_LAYOUT.rootY],
                first_tick_commands: [],
                commands: [],
                conditions: {
                    enabling: [{ type: "palladium:true" }],
                    unlocking: []
                }
            }
        },
        // Merge fixed base info nodes + real upgrade nodes.
        buildAxolotlBaseStatAbilities(),
        buildAxolotlUpgradeAbilities()
    );
}

function buildAxolotlPower(itemIcon) {
    return {
        name: AXOLOTL.name,
        persistent_data: true,
        background: "minecraft:textures/block/warped_stem.png",
        ability_bar_texture: "project_edgerunner:textures/gui/ability_bar.png",
        icon: itemIcon,
        gui_display_type: "tree",
        edgerunner_stats: [{ id: "cooldown_reduction", label: "Cooldown reduction", unit: "PERCENT",
            values: [AXOLOTL.minCooldownReductionPercent, AXOLOTL.maxCooldownReductionPercent],
            nodes: ["axolotl_upgrade_cooldown_max"], condition: "After enemy neutralization" }],
        abilities: buildAxolotlAbilities(itemIcon)
    };
}

const axolotlItemName = AXOLOTL.itemId.replace(/^[^:]+:/, "");
const axolotlIcon = "project_edgerunner:textures/item/" + axolotlItemName + "_item.png";

ServerEvents.highPriorityData(function (event) {
    global.addLocalizedPowerJson(event, "project_edgerunner:palladium/powers/axolotl", buildAxolotlPower(axolotlIcon));
});

if (!global.registerCyberwareInstallComponent) {
    throw new Error("[Cyberpunk/Cyberware] Install registry not loaded before axolotl registration.");
}

global.registerCyberwareInstallComponent({
    item: AXOLOTL.itemId,
    name: AXOLOTL.name,
    type: AXOLOTL.type,
    body_slot: AXOLOTL.bodySlot,
    activation_mode: AXOLOTL.activationMode,
    load_cost: AXOLOTL.loadCost,
    palladium_power: "project_edgerunner:axolotl",
    install_message: "Axolotl installed.",
    remove_message: "Axolotl removed."
});
