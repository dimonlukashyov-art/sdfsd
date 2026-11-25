// priority: 60
// Server script: Reinforced Tendons cyberware.

const REINFORCED_TENDONS = {
    id: "reinforced_tendons",
    name: "Reinforced Tendons",
    itemId: "project_edgerunner:reinforced_tendons",
    type: "extra",
    bodySlot: "legs",
    activationMode: "movement",
    loadCost: 28,
    tier: 2,
    rarity: "rare"
};

function buildReinforcedTendonsPower(itemIcon) {
    return {
        name: REINFORCED_TENDONS.name,
        persistent_data: true,
        background: "minecraft:textures/block/warped_hyphae.png",
        ability_bar_texture: "project_edgerunner:textures/gui/ability_bar.png",
        icon: itemIcon,
        gui_display_type: "list",
        abilities: {
            reinforced_tendons_double_jump: {
                type: "kubejs:cyberpunk/reinforced_tendons_double_jump",
                icon: itemIcon,
                title: REINFORCED_TENDONS.name,
                description: "Press jump again in midair to perform a double jump.",
                hidden: true,
                hidden_in_bar: true,
                list_index: 0,
                gui_position: [0, 0],
                conditions: {
                    enabling: [{
                        type: "palladium:action",
                        cooldown: 0,
                        key_type: "space_bar",
                        needs_empty_hand: false,
                        allow_scrolling_when_crouching: true
                    }],
                    unlocking: []
                }
            },
            reinforced_tendons_render_layer: {
                type: "palladium:render_layer",
                hidden: true,
                hidden_in_bar: true,
                render_layer: "project_edgerunner:reinforced_tendons_placeholder",
                conditions: {
                    enabling: [{
                        type: "palladium:true"
                    }],
                    unlocking: [{
                        type: "palladium:ability_unlocked",
                        ability: "reinforced_tendons_double_jump"
                    }]
                }
            }
        }
    };
}

const reinforcedTendonsItemName = REINFORCED_TENDONS.itemId.replace(/^[^:]+:/, "");
const reinforcedTendonsIcon = "project_edgerunner:textures/item/" + reinforcedTendonsItemName + "_item.png";

ServerEvents.highPriorityData(function (event) {
    global.addLocalizedPowerJson(event, "project_edgerunner:palladium/powers/reinforced_tendons", buildReinforcedTendonsPower(reinforcedTendonsIcon));
});

if (!global.registerCyberwareInstallComponent) {
    throw new Error("[Cyberpunk/Cyberware] Install registry not loaded before reinforced tendons registration.");
}

global.registerCyberwareInstallComponent({
    item: REINFORCED_TENDONS.itemId,
    name: REINFORCED_TENDONS.name,
    type: REINFORCED_TENDONS.type,
    body_slot: REINFORCED_TENDONS.bodySlot,
    activation_mode: REINFORCED_TENDONS.activationMode,
    load_cost: REINFORCED_TENDONS.loadCost,
    palladium_power: "project_edgerunner:reinforced_tendons",
    install_message: "Reinforced Tendons installed.",
    remove_message: "Reinforced Tendons removed."
});
