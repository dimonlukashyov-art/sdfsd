// priority: 150
// Server script: arms slot entries.

if (!global.registerCyberwareSlotEntry) {
    throw new Error("[Cyberpunk/Cyberware] Slot registry bootstrap not loaded before arms slot registry.");
}

global.registerCyberwareSlotEntry("arms", {
    item: "project_edgerunner:gorilla_arms",
    body_slot: "arms",
    activation_mode: "manual",
    power: "project_edgerunner:gorilla_arms",
    ability: "gorilla_arms_toggle",
    cooldown_ticks: 0,
    icon_index: 1,
    icon_alias: "gorilla"
});
