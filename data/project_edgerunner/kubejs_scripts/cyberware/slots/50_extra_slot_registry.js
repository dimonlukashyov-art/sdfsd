// priority: 120
// Server script: extra slot entries.

if (!global.registerCyberwareSlotEntry) {
    throw new Error("[Cyberpunk/Cyberware] Slot registry bootstrap not loaded before extra slot registry.");
}

global.registerCyberwareSlotEntry("extra", {
    item: "project_edgerunner:inmunosupresores",
    body_slot: "supresors",
    activation_mode: "manual",
    power: "project_edgerunner:inmunosupresor_injector",
    ability: "inmunosupresor_inject",
    cooldown_ticks: 40,
    icon_index: 1,
    icon_alias: "inmunosupresor"
});

// Passive cyberware (Reinforced Tendons / Fortified Ankles) intentionally
// does not register pointer slots in the Cyberware bar.
