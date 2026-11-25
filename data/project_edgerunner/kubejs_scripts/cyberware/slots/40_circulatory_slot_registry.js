// priority: 130
// Server script: circulatory slot entries.

if (!global.registerCyberwareSlotEntry) {
    throw new Error("[Cyberpunk/Cyberware] Slot registry bootstrap not loaded before circulatory slot registry.");
}

global.registerCyberwareSlotEntry("circulatory", {
    item: "project_edgerunner:blood_pump",
    body_slot: "circulatory_system",
    activation_mode: "manual",
    power: "project_edgerunner:blood_pump",
    ability: "blood_pump",
    // Each charge keeps its own 30s timer in BloodPumpChargeRuntime. A shared pointer cooldown
    // would ignore the next key press while another charge is still ready.
    cooldown_ticks: 0,
    icon_index: 1,
    icon_alias: "bloodpump"
});
