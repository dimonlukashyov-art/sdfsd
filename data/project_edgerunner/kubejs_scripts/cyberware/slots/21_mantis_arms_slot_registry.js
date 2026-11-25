// priority: 150
// Server script: Mantis Blades arms slot entry.

if (!global.registerCyberwareSlotEntry) {
    throw new Error("[Cyberpunk/Cyberware] Slot registry bootstrap not loaded before Mantis Blades slot registry.");
}

global.registerCyberwareSlotEntry("arms", {
    item: "project_edgerunner:mantis_blades",
    body_slot: "arms",
    activation_mode: "manual",
    power: "project_edgerunner:mantis_blades",
    ability: "mantis_blades_toggle",
    cooldown_ticks: 0,
    icon_index: 2,
    icon_alias: "mantis"
});
