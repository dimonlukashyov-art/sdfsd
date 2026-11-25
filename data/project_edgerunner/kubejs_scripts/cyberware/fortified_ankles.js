// priority: 60
// Server script: Fortified Ankles cyberware.

const FORTIFIED_ANKLES = {
    id: "fortified_ankles",
    name: "Fortified Ankles",
    itemId: "project_edgerunner:fortified_ankles",
    type: "extra",
    bodySlot: "legs",
    activationMode: "movement",
    loadCost: 12,
    tier: 1,
    rarity: "rare"
};

function buildFortifiedAnklesPower(itemIcon) {
    return {
        name: FORTIFIED_ANKLES.name,
        persistent_data: true,
        background: "minecraft:textures/block/warped_hyphae.png",
        ability_bar_texture: "project_edgerunner:textures/gui/ability_bar.png",
        icon: itemIcon,
        gui_display_type: "list",
        abilities: {
            fortified_ankles_charge_jump: {
                type: "kubejs:cyberpunk/fortified_ankles_charge_jump",
                icon: itemIcon,
                title: FORTIFIED_ANKLES.name,
                description: "Crouch to charge, release Shift, then jump before the charge fades.",
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
            // ── Render layer: CHARGING (crouching on ground) ──
            fortified_ankles_render_layer_charging: {
                type: "palladium:render_layer",
                hidden: true,
                hidden_in_bar: true,
                render_layer: "project_edgerunner:fortified_ankles_charging",
                conditions: {
                    enabling: [
                        { type: "palladium:crouching" },
                        { type: "palladium:on_ground" }
                    ],
                    unlocking: []
                }
            },
            // ── Render layer: JUMP (airborne) ──
            fortified_ankles_render_layer_jump: {
                type: "palladium:render_layer",
                hidden: true,
                hidden_in_bar: true,
                render_layer: "project_edgerunner:fortified_ankles_jump",
                conditions: {
                    enabling: [{
                        type: "palladium:not",
                        conditions: [{ type: "palladium:on_ground" }]
                    }],
                    unlocking: []
                }
            },
            // ── Render layer: IDLE (on ground, not crouching) ──
            fortified_ankles_render_layer_idle: {
                type: "palladium:render_layer",
                hidden: true,
                hidden_in_bar: true,
                render_layer: "project_edgerunner:fortified_ankles_idle",
                conditions: {
                    enabling: [{
                        type: "palladium:not",
                        conditions: [
                            { type: "palladium:crouching" }
                        ]
                    },
                    { type: "palladium:on_ground" }],
                    unlocking: []
                }
            }
        }
    };
}

const fortifiedAnklesIcon = "project_edgerunner:textures/item/fortified_ankles_item.png";

ServerEvents.highPriorityData(function (event) {
    global.addLocalizedPowerJson(event, "project_edgerunner:palladium/powers/fortified_ankles", buildFortifiedAnklesPower(fortifiedAnklesIcon));
});

if (!global.registerCyberwareInstallComponent) {
    throw new Error("[Cyberpunk/Cyberware] Install registry not loaded before fortified ankles registration.");
}

global.registerCyberwareInstallComponent({
    item: FORTIFIED_ANKLES.itemId,
    name: FORTIFIED_ANKLES.name,
    type: FORTIFIED_ANKLES.type,
    body_slot: FORTIFIED_ANKLES.bodySlot,
    activation_mode: FORTIFIED_ANKLES.activationMode,
    load_cost: FORTIFIED_ANKLES.loadCost,
    palladium_power: "project_edgerunner:fortified_ankles",
    install_message: "Fortified Ankles installed.",
    remove_message: "Fortified Ankles removed."
});
