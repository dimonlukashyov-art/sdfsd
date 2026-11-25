// priority: 140
// Server script: face slot entries.

if (!global.registerCyberwareSlotEntry) {
    throw new Error("[Cyberpunk/Cyberware] Slot registry bootstrap not loaded before face slot registry.");
}

global.registerCyberwareSlotEntry("face", {
    item: "project_edgerunner:clairvoyant",
    body_slot: "face",
    activation_mode: "manual",
    power: "project_edgerunner:clairvoyant",
    ability: "clairvoyant_scan",
    cooldown_ticks: 600,
    icon_index: 1,
    icon_alias: "clairvoyant"
});

global.registerCyberwareSlotEntry("face", {
    item: "project_edgerunner:doomsayer",
    body_slot: "face",
    activation_mode: "manual",
    power: "project_edgerunner:doomsayer",
    ability: "doomsayer_scan",
    cooldown_ticks: 600,
    icon_index: 2,
    icon_alias: "doomsayer"
});

global.registerCyberwareSlotEntry("face", {
    item: "project_edgerunner:stalker",
    body_slot: "face",
    activation_mode: "manual",
    power: "project_edgerunner:stalker",
    ability: "stalker_scan",
    cooldown_ticks: 600,
    icon_index: 3,
    icon_alias: "stalker"
});

global.registerCyberwareSlotEntry("face", {
    item: "project_edgerunner:the_oracle",
    body_slot: "face",
    activation_mode: "manual",
    power: "project_edgerunner:the_oracle",
    ability: "oracle_scan",
    cooldown_ticks: 600,
    icon_index: 4,
    icon_alias: "oracle"
});
